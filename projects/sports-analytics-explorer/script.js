const teams = [
  { team: 'Celtics', pace: 99.4, offrtg: 122.7, efg: 58.9, tov: 12.0, orb: 24.5, ftr: 0.248 },
  { team: 'Thunder', pace: 100.8, offrtg: 121.1, efg: 57.6, tov: 11.4, orb: 25.8, ftr: 0.226 },
  { team: 'Nuggets', pace: 97.8, offrtg: 119.8, efg: 57.0, tov: 12.7, orb: 28.2, ftr: 0.249 },
  { team: 'Bucks', pace: 100.2, offrtg: 120.5, efg: 58.1, tov: 13.2, orb: 27.4, ftr: 0.264 },
  { team: 'Knicks', pace: 96.9, offrtg: 118.4, efg: 55.5, tov: 12.5, orb: 31.0, ftr: 0.266 },
  { team: 'Pacers', pace: 102.7, offrtg: 121.9, efg: 58.4, tov: 13.5, orb: 27.1, ftr: 0.212 },
  { team: 'Kings', pace: 100.1, offrtg: 117.3, efg: 56.0, tov: 12.8, orb: 26.0, ftr: 0.235 },
  { team: 'Suns', pace: 98.6, offrtg: 118.9, efg: 57.3, tov: 13.9, orb: 24.1, ftr: 0.258 },
  { team: 'Lakers', pace: 100.6, offrtg: 116.8, efg: 55.4, tov: 14.1, orb: 25.9, ftr: 0.290 },
  { team: 'Heat', pace: 95.8, offrtg: 114.9, efg: 54.7, tov: 12.2, orb: 23.8, ftr: 0.246 },
];

const weightKeys = ['w-efg', 'w-tov', 'w-orb', 'w-ftr'];
const sliders = Object.fromEntries(weightKeys.map((key) => [key, document.getElementById(key)]));
const labels = Object.fromEntries(weightKeys.map((key) => [`${key}-label`, document.getElementById(`${key}-label`)]));

const resetBtn = document.getElementById('reset');
const statusEl = document.getElementById('status');
const tableBody = document.getElementById('table-body');
const canvas = document.getElementById('chart');
const ctx = canvas.getContext('2d');

let chartPoints = [];

function clamp01(value) {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function minMax(metric) {
  const values = teams.map((team) => team[metric]);
  return { min: Math.min(...values), max: Math.max(...values) };
}

const bounds = {
  efg: minMax('efg'),
  tov: minMax('tov'),
  orb: minMax('orb'),
  ftr: minMax('ftr'),
  pace: minMax('pace'),
  offrtg: minMax('offrtg'),
};

function normalize(value, min, max) {
  if (max === min) return 0.5;
  return clamp01((value - min) / (max - min));
}

function currentWeights() {
  const raw = {
    efg: Number(sliders['w-efg'].value),
    tov: Number(sliders['w-tov'].value),
    orb: Number(sliders['w-orb'].value),
    ftr: Number(sliders['w-ftr'].value),
  };

  const total = raw.efg + raw.tov + raw.orb + raw.ftr;
  return {
    efg: raw.efg / total,
    tov: raw.tov / total,
    orb: raw.orb / total,
    ftr: raw.ftr / total,
    raw,
  };
}

function scoreTeams() {
  const weights = currentWeights();

  const ranked = teams.map((team) => {
    const efgNorm = normalize(team.efg, bounds.efg.min, bounds.efg.max);
    const tovNorm = normalize(team.tov, bounds.tov.min, bounds.tov.max);
    const orbNorm = normalize(team.orb, bounds.orb.min, bounds.orb.max);
    const ftrNorm = normalize(team.ftr, bounds.ftr.min, bounds.ftr.max);

    const score =
      100 *
      (weights.efg * efgNorm +
        weights.tov * (1 - tovNorm) +
        weights.orb * orbNorm +
        weights.ftr * ftrNorm);

    return { ...team, score };
  });

  ranked.sort((a, b) => b.score - a.score);
  return { ranked, weights };
}

function scoreColor(score) {
  const ratio = clamp01(score / 100);
  const red = Math.round(220 - 140 * ratio);
  const green = Math.round(70 + 150 * ratio);
  const blue = Math.round(90 + 70 * ratio);
  return `rgb(${red}, ${green}, ${blue})`;
}

function drawChart(ranked) {
  const width = canvas.width;
  const height = canvas.height;
  const margin = { top: 24, right: 20, bottom: 42, left: 54 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#f8fbff';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, height - margin.bottom);
  ctx.lineTo(width - margin.right, height - margin.bottom);
  ctx.stroke();

  ctx.fillStyle = '#475569';
  ctx.font = '12px JetBrains Mono';
  ctx.fillText('Pace', width / 2 - 16, height - 12);
  ctx.save();
  ctx.translate(16, height / 2 + 20);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Offensive Rating', 0, 0);
  ctx.restore();

  chartPoints = ranked.map((team) => {
    const xNorm = normalize(team.pace, bounds.pace.min, bounds.pace.max);
    const yNorm = normalize(team.offrtg, bounds.offrtg.min, bounds.offrtg.max);

    const x = margin.left + xNorm * innerWidth;
    const y = margin.top + (1 - yNorm) * innerHeight;
    const radius = 5 + team.score / 18;

    ctx.beginPath();
    ctx.fillStyle = scoreColor(team.score);
    ctx.globalAlpha = 0.88;
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#0f172a';
    ctx.font = '11px JetBrains Mono';
    ctx.fillText(team.team.slice(0, 3).toUpperCase(), x - 12, y - radius - 5);

    return { ...team, x, y, radius };
  });
}

function renderTable(ranked) {
  tableBody.innerHTML = ranked
    .map(
      (team, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${team.team}</td>
          <td class="mono">${team.score.toFixed(2)}</td>
          <td>${team.efg.toFixed(1)}</td>
          <td>${team.tov.toFixed(1)}</td>
          <td>${team.orb.toFixed(1)}</td>
          <td>${team.ftr.toFixed(3)}</td>
          <td>${team.offrtg.toFixed(1)}</td>
        </tr>
      `
    )
    .join('');
}

function updateLabels(rawWeights) {
  labels['w-efg-label'].textContent = String(rawWeights.efg);
  labels['w-tov-label'].textContent = String(rawWeights.tov);
  labels['w-orb-label'].textContent = String(rawWeights.orb);
  labels['w-ftr-label'].textContent = String(rawWeights.ftr);
}

function render() {
  const { ranked, weights } = scoreTeams();
  updateLabels(weights.raw);
  drawChart(ranked);
  renderTable(ranked);

  statusEl.textContent = `Top offense by current model: ${ranked[0].team} (${ranked[0].score.toFixed(2)})`;
}

function resetWeights() {
  sliders['w-efg'].value = '40';
  sliders['w-tov'].value = '25';
  sliders['w-orb'].value = '20';
  sliders['w-ftr'].value = '15';
  render();
}

weightKeys.forEach((key) => {
  sliders[key].addEventListener('input', render);
});

resetBtn.addEventListener('click', resetWeights);

canvas.addEventListener('mousemove', (event) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;

  const hit = chartPoints.find((point) => {
    const dx = x - point.x;
    const dy = y - point.y;
    return Math.sqrt(dx * dx + dy * dy) <= point.radius + 3;
  });

  if (hit) {
    statusEl.textContent = `${hit.team}: score ${hit.score.toFixed(2)}, pace ${hit.pace.toFixed(1)}, OffRtg ${hit.offrtg.toFixed(1)}`;
  }
});

canvas.addEventListener('mouseleave', render);

render();