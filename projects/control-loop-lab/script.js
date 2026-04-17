const gainInput = document.getElementById('gain');
const delayInput = document.getElementById('delay');
const dampingInput = document.getElementById('damping');
const burstInput = document.getElementById('burst');
const demandInput = document.getElementById('demand');
const capacityInput = document.getElementById('capacity');
const runButton = document.getElementById('run-simulation');
const shareButton = document.getElementById('share-state');
const presetButtons = Array.from(document.querySelectorAll('.preset-btn'));
const chartEl = document.getElementById('trace-chart');

const valueEls = {
  gain: document.getElementById('gain-value'),
  delay: document.getElementById('delay-value'),
  damping: document.getElementById('damping-value'),
  burst: document.getElementById('burst-value'),
  demand: document.getElementById('demand-value'),
  capacity: document.getElementById('capacity-value'),
};

const outputEls = {
  postureTitle: document.getElementById('posture-title'),
  postureSummary: document.getElementById('posture-summary'),
  heroQueue: document.getElementById('hero-queue'),
  heroOvershoot: document.getElementById('hero-overshoot'),
  heroSettle: document.getElementById('hero-settle'),
  controllerNote: document.getElementById('controller-note'),
  failureCue: document.getElementById('failure-cue'),
  oscillationCount: document.getElementById('oscillation-count'),
  queueSpill: document.getElementById('queue-spill'),
  recoveryScore: document.getElementById('recovery-score'),
  utilizationBand: document.getElementById('utilization-band'),
  decisionTitle: document.getElementById('decision-title'),
  decisionBody: document.getElementById('decision-body'),
  nextMove: document.getElementById('next-move'),
  scenarioStory: document.getElementById('scenario-story'),
};

const presets = {
  balanced: { gain: 1.3, delay: 2, damping: 0.35, burst: 1.4, demand: 70, capacity: 72 },
  laggy: { gain: 1.4, delay: 5, damping: 0.2, burst: 1.5, demand: 74, capacity: 72 },
  twitchy: { gain: 2.4, delay: 3, damping: 0.1, burst: 1.3, demand: 68, capacity: 70 },
  burst: { gain: 1.5, delay: 2, damping: 0.25, burst: 2.2, demand: 78, capacity: 74 },
};

function formatValue(key, value) {
  if (key === 'burst') return `${Number(value).toFixed(1)}x`;
  if (key === 'gain' || key === 'damping') return Number(value).toFixed(2).replace(/0$/, '');
  return String(value);
}

function syncValueLabels() {
  valueEls.gain.textContent = formatValue('gain', gainInput.value);
  valueEls.delay.textContent = String(delayInput.value);
  valueEls.damping.textContent = formatValue('damping', dampingInput.value);
  valueEls.burst.textContent = formatValue('burst', burstInput.value);
  valueEls.demand.textContent = String(demandInput.value);
  valueEls.capacity.textContent = String(capacityInput.value);
}

function readConfig() {
  return {
    gain: Number(gainInput.value),
    delay: Number(delayInput.value),
    damping: Number(dampingInput.value),
    burst: Number(burstInput.value),
    demand: Number(demandInput.value),
    capacity: Number(capacityInput.value),
  };
}

function applyPreset(key) {
  const preset = presets[key];
  if (!preset) return;

  gainInput.value = String(preset.gain);
  delayInput.value = String(preset.delay);
  dampingInput.value = String(preset.damping);
  burstInput.value = String(preset.burst);
  demandInput.value = String(preset.demand);
  capacityInput.value = String(preset.capacity);

  presetButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.preset === key);
  });

  syncValueLabels();
  runSimulation();
}

function simulate(config) {
  const demandTrace = [];
  const capacityTrace = [];
  const queueTrace = [];
  const delayedErrors = Array(config.delay + 1).fill(0);
  const baseCapacity = config.capacity;
  let dynamicCapacity = baseCapacity;
  let queue = 0;
  let previousQueue = 0;
  let oscillations = 0;
  let totalUtilization = 0;

  for (let step = 0; step < 20; step += 1) {
    const burstWindow = step >= 4 && step <= 8 ? config.burst : 1;
    const demand = config.demand * burstWindow;
    const currentError = queue;
    delayedErrors.push(currentError);
    const staleError = delayedErrors.shift() || 0;
    const controlAction = staleError * config.gain;

    dynamicCapacity = dynamicCapacity + controlAction - config.damping * (dynamicCapacity - baseCapacity);
    dynamicCapacity = Math.max(28, dynamicCapacity);
    queue = Math.max(0, queue + demand - dynamicCapacity);

    if ((queue > previousQueue && previousQueue < (queueTrace[queueTrace.length - 2] || previousQueue)) || (queue < previousQueue && previousQueue > (queueTrace[queueTrace.length - 2] || previousQueue))) {
      oscillations += 1;
    }

    demandTrace.push(demand);
    capacityTrace.push(dynamicCapacity);
    queueTrace.push(queue);
    totalUtilization += Math.min(1.4, demand / Math.max(1, dynamicCapacity));
    previousQueue = queue;
  }

  const peakQueue = Math.max(...queueTrace);
  const baselineDemand = config.demand;
  const peakCapacity = Math.max(...capacityTrace);
  const overshoot = Math.max(0, ((peakCapacity - baselineDemand) / Math.max(1, baselineDemand)) * 100);
  const settleStep = queueTrace.findIndex((value, index) => index > 8 && value <= baselineDemand * 0.08);
  const queueSpill = queueTrace.reduce((sum, value) => sum + value, 0);
  const recoveryScore = Math.max(0, 100 - peakQueue * 0.42 - overshoot * 0.55 - oscillations * 8);
  const utilization = totalUtilization / demandTrace.length;

  return {
    demandTrace,
    capacityTrace,
    queueTrace,
    peakQueue,
    overshoot,
    settleStep: settleStep >= 0 ? settleStep + 1 : null,
    oscillations,
    queueSpill,
    recoveryScore,
    utilization,
  };
}

function linePath(values, xStep, height, maxValue) {
  return values
    .map((value, index) => {
      const x = 70 + xStep * index;
      const y = height - (value / maxValue) * 220;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

function renderChart(result) {
  const width = 900;
  const height = 300;
  const maxValue = Math.max(...result.demandTrace, ...result.capacityTrace, ...result.queueTrace, 10);
  const xStep = 760 / Math.max(1, result.demandTrace.length - 1);
  const gridLines = Array.from({ length: 5 }, (_, index) => {
    const y = 40 + index * 55;
    return `<line class="grid-line" x1="70" y1="${y}" x2="840" y2="${y}"></line>`;
  }).join('');

  chartEl.innerHTML = `
    ${gridLines}
    ${[0, 1, 2, 3, 4].map((index) => {
      const value = Math.round(maxValue - (maxValue / 4) * index);
      return `<text class="axis-label" x="18" y="${44 + index * 55}">${value}</text>`;
    }).join('')}
    ${result.demandTrace.map((_, index) => `<text class="axis-label" x="${70 + xStep * index}" y="286">${index + 1}</text>`).join('')}
    <path class="trace-line demand-line" d="${linePath(result.demandTrace, xStep, height, maxValue)}"></path>
    <path class="trace-line capacity-line" d="${linePath(result.capacityTrace, xStep, height, maxValue)}"></path>
    <path class="trace-line queue-line" d="${linePath(result.queueTrace, xStep, height, maxValue)}"></path>
    <text class="legend" x="70" y="24">Demand</text>
    <text class="legend" x="170" y="24">Capacity</text>
    <text class="legend" x="292" y="24">Queue</text>
  `;
}

function describeResult(config, result) {
  let postureTitle = 'Balanced recovery';
  let postureSummary = 'The loop should recover with modest overshoot and low queue spill.';
  let decisionTitle = 'Balanced controller';
  let decisionBody = 'This setup should absorb the burst without building a persistent queue.';
  let nextMove = 'If you want faster recovery, raise gain only after checking whether delay is still forcing stale decisions into the system.';
  let failureCue = 'Watch for delayed action plus high gain. That pair creates oscillation faster than raw demand does.';
  let controllerNote = 'Moderate gain with some lag is usually safe if damping is high enough to absorb a burst.';

  if (result.peakQueue >= config.demand * 2 || result.queueSpill >= config.demand * 10) {
    postureTitle = 'Queue spiral risk';
    postureSummary = 'Capacity is reacting too late or too weakly. Backlog compounds instead of clearing.';
    decisionTitle = 'Under-damped recovery';
    decisionBody = 'This loop lets the queue build faster than the controller can erase it, so the service never really catches up.';
    nextMove = 'Raise damping only a little, then either reduce delay or increase baseline capacity before touching gain again.';
    controllerNote = 'The controller is spending too long reading stale queue information, so every correction lands late.';
  } else if (result.overshoot >= 28 || result.oscillations >= 4) {
    postureTitle = 'Oscillation danger';
    postureSummary = 'The loop is clearing the burst, but it is doing so with visible overcorrection and unstable swings.';
    decisionTitle = 'Overcorrecting controller';
    decisionBody = 'This configuration reacts aggressively to stale error, so it keeps pushing capacity past what the system needs.';
    nextMove = 'Lower gain or shorten the feedback delay. Damping alone will not fully save a twitchy controller.';
    failureCue = 'Oscillation shows up when delayed control keeps solving yesterday’s queue instead of today’s.';
    controllerNote = 'High gain is only safe when feedback is fresh and damping is strong enough to absorb the correction.';
  }

  const utilizationBand =
    result.utilization >= 1.05
      ? 'Overloaded'
      : result.utilization >= 0.9
        ? 'Hot'
        : result.utilization >= 0.7
          ? 'Healthy'
          : 'Slack';

  return {
    postureTitle,
    postureSummary,
    decisionTitle,
    decisionBody,
    nextMove,
    failureCue,
    controllerNote,
    utilizationBand,
    story:
      utilizationBand === 'Healthy'
        ? 'Think of this as an ops loop with enough headroom to survive a burst without thrashing.'
        : utilizationBand === 'Hot'
          ? 'This looks like a service operating close to the edge, where one burst or one stale decision creates visible user pain.'
          : 'This is the kind of loop where staffing, autoscaling, or retry policy can feel stable until a burst reveals the lag.',
  };
}

function syncUrlState() {
  const config = readConfig();
  const params = new URLSearchParams();
  Object.entries(config).forEach(([key, value]) => params.set(key, String(value)));
  window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
}

function hydrateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  ['gain', 'delay', 'damping', 'burst', 'demand', 'capacity'].forEach((key) => {
    const value = params.get(key);
    if (value !== null) {
      const target = document.getElementById(key);
      if (target) target.value = value;
    }
  });
}

function runSimulation() {
  const config = readConfig();
  const result = simulate(config);
  const description = describeResult(config, result);

  renderChart(result);
  outputEls.postureTitle.textContent = description.postureTitle;
  outputEls.postureSummary.textContent = description.postureSummary;
  outputEls.heroQueue.textContent = result.peakQueue.toFixed(0);
  outputEls.heroOvershoot.textContent = `${result.overshoot.toFixed(0)}%`;
  outputEls.heroSettle.textContent = result.settleStep ? String(result.settleStep) : 'No settle';
  outputEls.controllerNote.textContent = description.controllerNote;
  outputEls.failureCue.textContent = description.failureCue;
  outputEls.oscillationCount.textContent = String(result.oscillations);
  outputEls.queueSpill.textContent = result.queueSpill.toFixed(0);
  outputEls.recoveryScore.textContent = result.recoveryScore.toFixed(0);
  outputEls.utilizationBand.textContent = description.utilizationBand;
  outputEls.decisionTitle.textContent = description.decisionTitle;
  outputEls.decisionBody.textContent = description.decisionBody;
  outputEls.nextMove.textContent = description.nextMove;
  outputEls.scenarioStory.textContent = description.story;
  syncUrlState();
}

[gainInput, delayInput, dampingInput, burstInput, demandInput, capacityInput].forEach((input) => {
  input.addEventListener('input', () => {
    syncValueLabels();
    runSimulation();
  });
});

presetButtons.forEach((button) => {
  button.addEventListener('click', () => applyPreset(button.dataset.preset || 'balanced'));
});

runButton.addEventListener('click', runSimulation);
shareButton.addEventListener('click', async () => {
  try {
    syncUrlState();
    await navigator.clipboard.writeText(window.location.href);
    outputEls.postureSummary.textContent = 'Share link copied with the current control-loop setup.';
  } catch (error) {
    outputEls.postureSummary.textContent = 'Clipboard copy failed in this environment.';
  }
});

hydrateFromUrl();
syncValueLabels();
runSimulation();
