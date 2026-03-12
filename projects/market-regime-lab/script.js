const controls = {
  simulations: document.getElementById('simulations'),
  horizon: document.getElementById('horizon'),
  bullDrift: document.getElementById('bull-drift'),
  bearDrift: document.getElementById('bear-drift'),
  bullVol: document.getElementById('bull-vol'),
  bearVol: document.getElementById('bear-vol'),
  pBull: document.getElementById('p-bull'),
  pBear: document.getElementById('p-bear'),
  sizingPolicy: document.getElementById('sizing-policy'),
  exposure: document.getElementById('exposure'),
};

const labels = {
  simulations: document.getElementById('simulations-label'),
  horizon: document.getElementById('horizon-label'),
  bullDrift: document.getElementById('bull-drift-label'),
  bearDrift: document.getElementById('bear-drift-label'),
  bullVol: document.getElementById('bull-vol-label'),
  bearVol: document.getElementById('bear-vol-label'),
  pBull: document.getElementById('p-bull-label'),
  pBear: document.getElementById('p-bear-label'),
  exposure: document.getElementById('exposure-label'),
};

const runBtn = document.getElementById('run');
const rerollBtn = document.getElementById('reroll');
const togglePathsBtn = document.getElementById('toggle-paths');
const statusEl = document.getElementById('status');
const insightEl = document.getElementById('insight');
const distributionEl = document.getElementById('distribution');
const presetButtons = Array.from(document.querySelectorAll('.preset'));

const metricEls = {
  cagr: document.getElementById('metric-cagr'),
  drawdown: document.getElementById('metric-drawdown'),
  loss: document.getElementById('metric-loss'),
  switches: document.getElementById('metric-switches'),
};

const canvas = document.getElementById('path-chart');
const ctx = canvas.getContext('2d');

const STORAGE_KEY = 'market_regime_lab_settings_v1';

const defaultConfig = {
  simulations: 350,
  horizon: 252,
  bullDrift: 0.07,
  bearDrift: -0.1,
  bullVol: 0.9,
  bearVol: 1.9,
  pBull: 92,
  pBear: 82,
  sizingPolicy: 'fixed',
  exposure: 100,
};

let chartState = {
  p10: [100],
  p50: [100],
  p90: [100],
  sampledPaths: [],
  minY: 90,
  maxY: 110,
  progress: 1,
  showAllPaths: false,
  animationFrame: null,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomNormal() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function percentile(sortedValues, q) {
  if (!sortedValues.length) return 0;
  const position = (sortedValues.length - 1) * q;
  const base = Math.floor(position);
  const rest = position - base;
  const next = sortedValues[base + 1] ?? sortedValues[base];
  return sortedValues[base] + (next - sortedValues[base]) * rest;
}

function readConfig() {
  return {
    simulations: Number(controls.simulations.value),
    horizon: Number(controls.horizon.value),
    bullDrift: Number(controls.bullDrift.value) / 100,
    bearDrift: Number(controls.bearDrift.value) / 100,
    bullVol: Number(controls.bullVol.value) / 100,
    bearVol: Number(controls.bearVol.value) / 100,
    pBull: Number(controls.pBull.value) / 100,
    pBear: Number(controls.pBear.value) / 100,
    sizingPolicy: controls.sizingPolicy.value,
    exposure: Number(controls.exposure.value) / 100,
  };
}

function writeConfigToControls(config) {
  controls.simulations.value = String(config.simulations);
  controls.horizon.value = String(config.horizon);
  controls.bullDrift.value = String(config.bullDrift);
  controls.bearDrift.value = String(config.bearDrift);
  controls.bullVol.value = String(config.bullVol);
  controls.bearVol.value = String(config.bearVol);
  controls.pBull.value = String(config.pBull);
  controls.pBear.value = String(config.pBear);
  controls.sizingPolicy.value = config.sizingPolicy;
  controls.exposure.value = String(config.exposure);
  renderLabels();
}

function saveConfig() {
  const snapshot = {
    simulations: Number(controls.simulations.value),
    horizon: Number(controls.horizon.value),
    bullDrift: Number(controls.bullDrift.value),
    bearDrift: Number(controls.bearDrift.value),
    bullVol: Number(controls.bullVol.value),
    bearVol: Number(controls.bearVol.value),
    pBull: Number(controls.pBull.value),
    pBear: Number(controls.pBear.value),
    sizingPolicy: controls.sizingPolicy.value,
    exposure: Number(controls.exposure.value),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

function loadSavedConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return defaultConfig;
    return { ...defaultConfig, ...saved };
  } catch (error) {
    return defaultConfig;
  }
}

function renderLabels() {
  labels.simulations.textContent = controls.simulations.value;
  labels.horizon.textContent = controls.horizon.value;
  labels.bullDrift.textContent = Number(controls.bullDrift.value).toFixed(2);
  labels.bearDrift.textContent = Number(controls.bearDrift.value).toFixed(2);
  labels.bullVol.textContent = Number(controls.bullVol.value).toFixed(1);
  labels.bearVol.textContent = Number(controls.bearVol.value).toFixed(1);
  labels.pBull.textContent = controls.pBull.value;
  labels.pBear.textContent = controls.pBear.value;
  labels.exposure.textContent = controls.exposure.value;
}

function policyLeverage(policy, exposure, rollingVol, currentDrawdown) {
  if (policy === 'vol_target') {
    const targetVol = 0.012;
    const volScale = clamp(targetVol / Math.max(0.002, rollingVol), 0.4, 1.9);
    return exposure * volScale;
  }

  if (policy === 'drawdown') {
    const drawdownScale = clamp(1 - currentDrawdown * 1.85, 0.25, 1.35);
    return exposure * drawdownScale;
  }

  return exposure;
}

function simulatePath(config) {
  const path = [100];
  let equity = 100;
  let peak = 100;
  let maxDrawdown = 0;
  let rollingVol = config.bullVol;
  let switches = 0;
  let regime = Math.random() < 0.65 ? 'bull' : 'bear';

  for (let day = 1; day <= config.horizon; day += 1) {
    if (regime === 'bull' && Math.random() > config.pBull) {
      regime = 'bear';
      switches += 1;
    } else if (regime === 'bear' && Math.random() > config.pBear) {
      regime = 'bull';
      switches += 1;
    }

    const drift = regime === 'bull' ? config.bullDrift : config.bearDrift;
    const volatility = regime === 'bull' ? config.bullVol : config.bearVol;

    const rawReturn = drift + volatility * randomNormal();
    rollingVol = rollingVol * 0.93 + Math.abs(rawReturn) * 0.07;

    const drawdownNow = (peak - equity) / peak;
    const leverage = policyLeverage(config.sizingPolicy, config.exposure, rollingVol, drawdownNow);
    const adjustedReturn = rawReturn * leverage;

    equity *= Math.max(0.1, 1 + adjustedReturn);
    peak = Math.max(peak, equity);

    maxDrawdown = Math.max(maxDrawdown, (peak - equity) / peak);
    path.push(equity);
  }

  return {
    path,
    finalEquity: equity,
    maxDrawdown,
    switches,
  };
}

function buildEnvelope(paths, horizon) {
  const p10 = [];
  const p50 = [];
  const p90 = [];

  for (let day = 0; day <= horizon; day += 1) {
    const values = paths.map((item) => item.path[day]).sort((a, b) => a - b);
    p10.push(percentile(values, 0.1));
    p50.push(percentile(values, 0.5));
    p90.push(percentile(values, 0.9));
  }

  const minY = Math.min(...p10, 100) * 0.92;
  const maxY = Math.max(...p90, 100) * 1.08;

  return { p10, p50, p90, minY, maxY };
}

function drawGrid(width, height, margin, minY, maxY) {
  ctx.fillStyle = '#0e1321';
  ctx.fillRect(0, 0, width, height);

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  ctx.strokeStyle = '#27314b';
  ctx.lineWidth = 1;

  for (let i = 0; i <= 4; i += 1) {
    const y = margin.top + (innerHeight * i) / 4;
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(width - margin.right, y);
    ctx.stroke();

    const value = maxY - ((maxY - minY) * i) / 4;
    ctx.fillStyle = '#7e8ba9';
    ctx.font = '11px JetBrains Mono';
    ctx.fillText(`${((value - 100) / 100 * 100).toFixed(0)}%`, 8, y + 4);
  }

  ctx.strokeStyle = '#394766';
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, height - margin.bottom);
  ctx.lineTo(width - margin.right, height - margin.bottom);
  ctx.stroke();

  const baseY = margin.top + (1 - (100 - minY) / (maxY - minY)) * innerHeight;
  ctx.strokeStyle = 'rgba(220, 230, 255, 0.35)';
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(margin.left, baseY);
  ctx.lineTo(width - margin.right, baseY);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawLine(series, color, width, progress, bounds, alpha = 1) {
  const { margin, innerWidth, innerHeight, minY, maxY } = bounds;
  const visibleCount = Math.max(2, Math.floor(series.length * progress));

  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();

  for (let i = 0; i < visibleCount; i += 1) {
    const x = margin.left + (i / (series.length - 1)) * innerWidth;
    const ratio = (series[i] - minY) / (maxY - minY);
    const y = margin.top + innerHeight * (1 - ratio);

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawSamplePaths(progress, bounds) {
  if (!chartState.showAllPaths || !chartState.sampledPaths.length) return;

  chartState.sampledPaths.forEach((series, index) => {
    const hue = (index * 29) % 360;
    const color = `hsl(${hue} 70% 64%)`;
    drawLine(series, color, 1.1, progress, bounds, 0.18);
  });
}

function samplePaths(paths, maxCount) {
  if (paths.length <= maxCount) {
    return paths.map((item) => item.path);
  }

  const output = [];
  const step = paths.length / maxCount;
  for (let i = 0; i < maxCount; i += 1) {
    output.push(paths[Math.floor(i * step)].path);
  }
  return output;
}

function drawChart() {
  const width = canvas.width;
  const height = canvas.height;
  const margin = { top: 20, right: 18, bottom: 32, left: 55 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  drawGrid(width, height, margin, chartState.minY, chartState.maxY);

  const bounds = {
    margin,
    innerWidth,
    innerHeight,
    minY: chartState.minY,
    maxY: chartState.maxY,
  };

  drawSamplePaths(chartState.progress, bounds);
  drawLine(chartState.p10, '#4562a1', 2, chartState.progress, bounds);
  drawLine(chartState.p50, '#d7defe', 2.5, chartState.progress, bounds);
  drawLine(chartState.p90, '#a4f2d0', 2, chartState.progress, bounds);

  ctx.fillStyle = '#8b9ab8';
  ctx.font = '11px JetBrains Mono';
  ctx.fillText('Start', margin.left - 10, height - 10);
  ctx.fillText('Horizon', width - margin.right - 44, height - 10);
}

function animateChart() {
  cancelAnimationFrame(chartState.animationFrame);
  chartState.progress = 0;

  const start = performance.now();
  const duration = 820;

  function frame(now) {
    const elapsed = now - start;
    chartState.progress = clamp(elapsed / duration, 0, 1);
    drawChart();

    if (chartState.progress < 1) {
      chartState.animationFrame = requestAnimationFrame(frame);
    }
  }

  chartState.animationFrame = requestAnimationFrame(frame);
}

function renderDistribution(finals) {
  const returns = finals.map((value) => ((value - 100) / 100) * 100);
  const min = Math.min(...returns);
  const max = Math.max(...returns);
  const binCount = 10;
  const span = Math.max(1, max - min);
  const bins = Array.from({ length: binCount }, () => 0);

  returns.forEach((value) => {
    const index = Math.min(binCount - 1, Math.floor(((value - min) / span) * binCount));
    bins[index] += 1;
  });

  const maxBin = Math.max(...bins, 1);
  distributionEl.innerHTML = bins
    .map((count, index) => {
      const low = min + (span * index) / binCount;
      const high = min + (span * (index + 1)) / binCount;
      const label = index === 0 || index === 5 || index === 9 ? `${low.toFixed(0)}..${high.toFixed(0)}%` : '';
      return `<div class="bin" style="height:${Math.max(8, (count / maxBin) * 100)}%;" data-label="${label}"></div>`;
    })
    .join('');
}

function renderMetrics(paths, config) {
  const finalsSorted = paths.map((path) => path.finalEquity).sort((a, b) => a - b);
  const medianFinal = percentile(finalsSorted, 0.5);
  const annualized = Math.pow(medianFinal / 100, 252 / config.horizon) - 1;

  const worstDrawdown = Math.max(...paths.map((path) => path.maxDrawdown));
  const lossProbability = paths.filter((path) => path.finalEquity < 100).length / paths.length;
  const avgSwitches = paths.reduce((sum, path) => sum + path.switches, 0) / paths.length;

  metricEls.cagr.textContent = `${(annualized * 100).toFixed(2)}%`;
  metricEls.drawdown.textContent = `${(worstDrawdown * 100).toFixed(1)}%`;
  metricEls.loss.textContent = `${(lossProbability * 100).toFixed(1)}%`;
  metricEls.switches.textContent = avgSwitches.toFixed(1);

  renderDistribution(finalsSorted);

  if (lossProbability > 0.45 || worstDrawdown > 0.55) {
    insightEl.textContent = 'Regime exposure is fragile in this setup. The distribution shows substantial left-tail risk; consider lower baseline exposure or drawdown-aware sizing.';
    return;
  }

  if (annualized > 0.12 && lossProbability < 0.25) {
    insightEl.textContent = 'This configuration balances upside and risk well. Median growth remains strong while downside probability is contained.';
    return;
  }

  insightEl.textContent = 'The profile is mixed: downside risk is manageable, but CAGR is modest. Improve robustness by tightening bear volatility or increasing bull persistence.';
}

function runSimulation() {
  runBtn.disabled = true;
  statusEl.textContent = 'Running Monte Carlo paths...';

  requestAnimationFrame(() => {
    const config = readConfig();
    const paths = [];

    for (let i = 0; i < config.simulations; i += 1) {
      paths.push(simulatePath(config));
    }

    const envelope = buildEnvelope(paths, config.horizon);
    chartState = {
      ...chartState,
      ...envelope,
      sampledPaths: samplePaths(paths, 120),
      progress: 0,
    };

    renderMetrics(paths, config);
    animateChart();

    statusEl.textContent = `Simulated ${config.simulations} paths over ${config.horizon} trading days using ${controls.sizingPolicy.selectedOptions[0].textContent.toLowerCase()}.`;
    saveConfig();
    runBtn.disabled = false;
  });
}

function applyPreset(preset) {
  if (preset === 'trend') {
    writeConfigToControls({
      simulations: 420,
      horizon: 378,
      bullDrift: 0.11,
      bearDrift: -0.08,
      bullVol: 0.8,
      bearVol: 1.6,
      pBull: 94,
      pBear: 75,
      sizingPolicy: 'vol_target',
      exposure: 120,
    });
  } else if (preset === 'stress') {
    writeConfigToControls({
      simulations: 500,
      horizon: 252,
      bullDrift: 0.04,
      bearDrift: -0.2,
      bullVol: 1.4,
      bearVol: 3.1,
      pBull: 84,
      pBear: 91,
      sizingPolicy: 'drawdown',
      exposure: 85,
    });
  } else {
    writeConfigToControls(defaultConfig);
  }

  runSimulation();
}

function randomizeInputs() {
  controls.bullDrift.value = (0.02 + Math.random() * 0.12).toFixed(2);
  controls.bearDrift.value = (-0.02 - Math.random() * 0.22).toFixed(2);
  controls.bullVol.value = (0.6 + Math.random() * 1.4).toFixed(1);
  controls.bearVol.value = (1.2 + Math.random() * 3.2).toFixed(1);
  controls.pBull.value = String(78 + Math.floor(Math.random() * 20));
  controls.pBear.value = String(58 + Math.floor(Math.random() * 36));
  controls.exposure.value = String(55 + Math.floor(Math.random() * 120));
  controls.horizon.value = String(126 + Math.floor(Math.random() * 500));
  controls.simulations.value = String(200 + Math.floor(Math.random() * 550));

  const policies = ['fixed', 'vol_target', 'drawdown'];
  controls.sizingPolicy.value = policies[Math.floor(Math.random() * policies.length)];

  renderLabels();
  runSimulation();
}

Object.values(controls).forEach((control) => {
  control.addEventListener('input', renderLabels);
  control.addEventListener('change', saveConfig);
});

presetButtons.forEach((button) => {
  button.addEventListener('click', () => applyPreset(button.dataset.preset || 'balanced'));
});

runBtn.addEventListener('click', runSimulation);
rerollBtn.addEventListener('click', randomizeInputs);
togglePathsBtn.addEventListener('click', () => {
  chartState.showAllPaths = !chartState.showAllPaths;
  togglePathsBtn.textContent = chartState.showAllPaths ? 'Hide All Paths' : 'Show All Paths';
  drawChart();
});

writeConfigToControls(loadSavedConfig());
runSimulation();
