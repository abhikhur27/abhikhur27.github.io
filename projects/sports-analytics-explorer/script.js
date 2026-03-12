const payload = window.NBA_OFFENSE_DATA;
const seasonSelect = document.getElementById('season-select');

const weightKeys = ['w-efg', 'w-tov', 'w-orb', 'w-ftr'];
const sliders = Object.fromEntries(weightKeys.map((key) => [key, document.getElementById(key)]));
const labels = Object.fromEntries(weightKeys.map((key) => [`${key}-label`, document.getElementById(`${key}-label`)]));

const resetBtn = document.getElementById('reset');
const exportBtn = document.getElementById('export');
const statusEl = document.getElementById('status');
const sourceNoteEl = document.getElementById('source-note');
const useZEl = document.getElementById('use-z');

const compareA = document.getElementById('compare-a');
const compareB = document.getElementById('compare-b');
const compareBreakdownEl = document.getElementById('compare-breakdown');
const seasonTrendEl = document.getElementById('season-trend');

const tableBody = document.getElementById('table-body');
const factorBarsEl = document.getElementById('factor-bars');

const topCustomEl = document.getElementById('top-custom');
const topOffRtgEl = document.getElementById('top-offrtg');
const topPaceEl = document.getElementById('top-pace');

const presetButtons = Array.from(document.querySelectorAll('.preset'));

const canvas = document.getElementById('chart');
const ctx = canvas.getContext('2d');

const seasons = Object.keys(payload?.seasons || {}).sort((a, b) => Number(b.slice(0, 4)) - Number(a.slice(0, 4)));
let activeSeason = seasons[0] || null;

let chartPoints = [];
let latestRanked = [];
let seasonStats = null;

function clamp01(value) {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function std(values) {
  const avg = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function normalizeMinMax(value, min, max) {
  if (max === min) return 0.5;
  return clamp01((value - min) / (max - min));
}

function normalizeZ(value, metric) {
  const stats = seasonStats.zStats[metric];
  const z = (value - stats.mean) / Math.max(0.0001, stats.std);
  return clamp01(0.5 + z / 6);
}

function currentTeams() {
  return payload?.seasons?.[activeSeason] || [];
}

function buildSeasonStats(teams) {
  function minMax(metric) {
    const values = teams.map((team) => team[metric]);
    return { min: Math.min(...values), max: Math.max(...values) };
  }

  return {
    bounds: {
      efg: minMax('efg'),
      tov: minMax('tov'),
      orb: minMax('orb'),
      ftr: minMax('ftr'),
      pace: minMax('pace'),
      offrtg: minMax('offrtg'),
    },
    zStats: {
      efg: { mean: mean(teams.map((team) => team.efg)), std: std(teams.map((team) => team.efg)) },
      tov: { mean: mean(teams.map((team) => team.tov)), std: std(teams.map((team) => team.tov)) },
      orb: { mean: mean(teams.map((team) => team.orb)), std: std(teams.map((team) => team.orb)) },
      ftr: { mean: mean(teams.map((team) => team.ftr)), std: std(teams.map((team) => team.ftr)) },
    },
  };
}

function metricNorm(team, metric, useZMode) {
  if (useZMode) {
    return normalizeZ(team[metric], metric);
  }

  const { min, max } = seasonStats.bounds[metric];
  return normalizeMinMax(team[metric], min, max);
}

function currentWeights() {
  const raw = {
    efg: Number(sliders['w-efg'].value),
    tov: Number(sliders['w-tov'].value),
    orb: Number(sliders['w-orb'].value),
    ftr: Number(sliders['w-ftr'].value),
  };

  const total = Math.max(1, raw.efg + raw.tov + raw.orb + raw.ftr);

  return {
    efg: raw.efg / total,
    tov: raw.tov / total,
    orb: raw.orb / total,
    ftr: raw.ftr / total,
    raw,
  };
}

function scoreTeams(teams) {
  const weights = currentWeights();
  const useZMode = useZEl.checked;

  const ranked = teams.map((team) => {
    const efgNorm = metricNorm(team, 'efg', useZMode);
    const tovNorm = metricNorm(team, 'tov', useZMode);
    const orbNorm = metricNorm(team, 'orb', useZMode);
    const ftrNorm = metricNorm(team, 'ftr', useZMode);

    const contributions = {
      efg: weights.efg * efgNorm,
      tov: weights.tov * (1 - tovNorm),
      orb: weights.orb * orbNorm,
      ftr: weights.ftr * ftrNorm,
    };

    const score = 100 * (contributions.efg + contributions.tov + contributions.orb + contributions.ftr);

    return {
      ...team,
      score,
      contributions,
      normalized: { efgNorm, tovNorm, orbNorm, ftrNorm },
    };
  });

  ranked.sort((a, b) => b.score - a.score);
  return { ranked, weights };
}

function scoreColor(score) {
  const ratio = clamp01(score / 100);
  const red = Math.round(190 - 120 * ratio);
  const green = Math.round(70 + 160 * ratio);
  const blue = Math.round(110 + 85 * ratio);
  return `rgb(${red}, ${green}, ${blue})`;
}

function drawChart(ranked) {
  const width = canvas.width;
  const height = canvas.height;
  const margin = { top: 22, right: 18, bottom: 44, left: 58 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#0f1420';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#2a3346';
  ctx.lineWidth = 1;

  for (let i = 0; i <= 4; i += 1) {
    const y = margin.top + (innerHeight * i) / 4;
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(width - margin.right, y);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(margin.left, margin.top);
  ctx.lineTo(margin.left, height - margin.bottom);
  ctx.lineTo(width - margin.right, height - margin.bottom);
  ctx.stroke();

  ctx.fillStyle = '#95a3c0';
  ctx.font = '12px JetBrains Mono';
  ctx.fillText('Pace', width / 2 - 16, height - 14);
  ctx.save();
  ctx.translate(17, height / 2 + 25);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Offensive Rating', 0, 0);
  ctx.restore();

  chartPoints = ranked.map((team) => {
    const xNorm = normalizeMinMax(team.pace, seasonStats.bounds.pace.min, seasonStats.bounds.pace.max);
    const yNorm = normalizeMinMax(team.offrtg, seasonStats.bounds.offrtg.min, seasonStats.bounds.offrtg.max);

    const x = margin.left + xNorm * innerWidth;
    const y = margin.top + (1 - yNorm) * innerHeight;
    const radius = 4 + team.score / 16;

    ctx.beginPath();
    ctx.fillStyle = scoreColor(team.score);
    ctx.globalAlpha = 0.9;
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#d9e4ff';
    ctx.font = '10px JetBrains Mono';
    ctx.fillText(team.team.slice(0, 3).toUpperCase(), x - 11, y - radius - 5);

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
          <td>${team.ftr.toFixed(2)}</td>
          <td>${team.ts.toFixed(1)}</td>
          <td>${team.threepar.toFixed(2)}</td>
          <td>${team.pace.toFixed(2)}</td>
          <td>${team.offrtg.toFixed(1)}</td>
        </tr>
      `
    )
    .join('');
}

function renderFactorBars(team) {
  if (!team) {
    factorBarsEl.innerHTML = '';
    return;
  }

  const items = [
    { key: 'efg', label: 'eFG Impact', value: team.contributions.efg },
    { key: 'tov', label: 'Ball Security Impact', value: team.contributions.tov },
    { key: 'orb', label: 'ORB Impact', value: team.contributions.orb },
    { key: 'ftr', label: 'FTr Impact', value: team.contributions.ftr },
  ];

  const maxValue = Math.max(...items.map((item) => item.value), 0.0001);

  factorBarsEl.innerHTML = items
    .map((item) => {
      const pct = (item.value / maxValue) * 100;
      return `
        <div class="factor-row">
          <span class="label">${item.label}</span>
          <span class="bar-track"><span class="bar-fill" style="width:${pct.toFixed(1)}%"></span></span>
          <span class="value">${(item.value * 100).toFixed(1)}</span>
        </div>
      `;
    })
    .join('');
}

function updateLabels(rawWeights) {
  labels['w-efg-label'].textContent = String(rawWeights.efg);
  labels['w-tov-label'].textContent = String(rawWeights.tov);
  labels['w-orb-label'].textContent = String(rawWeights.orb);
  labels['w-ftr-label'].textContent = String(rawWeights.ftr);
}

function populateSeasonSelect() {
  seasonSelect.innerHTML = seasons.map((season) => `<option value="${season}">${season}</option>`).join('');
  seasonSelect.value = activeSeason;
}

function populateCompareTeams() {
  const teams = currentTeams();
  const prevA = compareA.value;
  const prevB = compareB.value;

  compareA.innerHTML = '';
  compareB.innerHTML = '';

  teams.forEach((team, index) => {
    const optionA = document.createElement('option');
    optionA.value = team.team;
    optionA.textContent = team.team;
    compareA.appendChild(optionA);

    const optionB = document.createElement('option');
    optionB.value = team.team;
    optionB.textContent = team.team;
    compareB.appendChild(optionB);

    if (index === 0 && !prevA) compareA.value = team.team;
    if (index === 1 && !prevB) compareB.value = team.team;
  });

  if (teams.some((team) => team.team === prevA)) compareA.value = prevA;
  if (teams.some((team) => team.team === prevB)) compareB.value = prevB;

  if (compareA.value === compareB.value && teams.length > 1) {
    compareB.value = teams[1].team;
  }
}

function renderCompare() {
  if (!latestRanked.length) return;

  const a = latestRanked.find((team) => team.team === compareA.value);
  const b = latestRanked.find((team) => team.team === compareB.value);
  if (!a || !b) return;

  const rows = [
    { label: 'Custom Score', delta: a.score - b.score },
    { label: 'eFG%', delta: a.efg - b.efg },
    { label: 'TOV% (lower better)', delta: b.tov - a.tov },
    { label: 'ORB%', delta: a.orb - b.orb },
    { label: 'FTr', delta: a.ftr - b.ftr },
    { label: 'TS%', delta: a.ts - b.ts },
    { label: '3PA/FGA', delta: a.threepar - b.threepar },
    { label: 'OffRtg', delta: a.offrtg - b.offrtg },
    { label: 'Pace', delta: a.pace - b.pace },
  ];

  compareBreakdownEl.innerHTML = rows
    .map((row) => {
      const sign = row.delta >= 0 ? '+' : '';
      return `
        <article>
          <h3>${row.label}</h3>
          <p>${a.team} vs ${b.team}: ${sign}${row.delta.toFixed(2)}</p>
        </article>
      `;
    })
    .join('');

  renderSeasonTrend(a.team);
}

function renderSeasonTrend(teamName) {
  const weights = currentWeights();
  const useZMode = useZEl.checked;

  const cards = seasons
    .map((season) => {
      const teams = payload.seasons[season] || [];
      const stats = buildSeasonStats(teams);
      const team = teams.find((entry) => entry.team === teamName);
      if (!team) return null;

      const efgNorm = useZMode
        ? clamp01(0.5 + ((team.efg - stats.zStats.efg.mean) / Math.max(stats.zStats.efg.std, 0.0001)) / 6)
        : normalizeMinMax(team.efg, stats.bounds.efg.min, stats.bounds.efg.max);
      const tovNorm = useZMode
        ? clamp01(0.5 + ((team.tov - stats.zStats.tov.mean) / Math.max(stats.zStats.tov.std, 0.0001)) / 6)
        : normalizeMinMax(team.tov, stats.bounds.tov.min, stats.bounds.tov.max);
      const orbNorm = useZMode
        ? clamp01(0.5 + ((team.orb - stats.zStats.orb.mean) / Math.max(stats.zStats.orb.std, 0.0001)) / 6)
        : normalizeMinMax(team.orb, stats.bounds.orb.min, stats.bounds.orb.max);
      const ftrNorm = useZMode
        ? clamp01(0.5 + ((team.ftr - stats.zStats.ftr.mean) / Math.max(stats.zStats.ftr.std, 0.0001)) / 6)
        : normalizeMinMax(team.ftr, stats.bounds.ftr.min, stats.bounds.ftr.max);

      const score =
        100 * (weights.efg * efgNorm + weights.tov * (1 - tovNorm) + weights.orb * orbNorm + weights.ftr * ftrNorm);

      return { season, score };
    })
    .filter(Boolean);

  seasonTrendEl.innerHTML = cards
    .map(
      (card) => `
        <article>
          <h3>${teamName} | ${card.season}</h3>
          <p>Model score: ${card.score.toFixed(2)}</p>
        </article>
      `
    )
    .join('');
}

function updateSummaryCards(ranked) {
  const topCustom = ranked[0];
  const topOff = [...ranked].sort((a, b) => b.offrtg - a.offrtg)[0];
  const topPace = [...ranked].sort((a, b) => b.pace - a.pace)[0];

  topCustomEl.textContent = `${topCustom.team} (${topCustom.score.toFixed(2)})`;
  topOffRtgEl.textContent = `${topOff.team} (${topOff.offrtg.toFixed(1)})`;
  topPaceEl.textContent = `${topPace.team} (${topPace.pace.toFixed(2)})`;
}

function renderSourceNote() {
  const sourceName = payload?.source || 'StatMuse';
  const retrievedAt = payload?.retrieved_at || 'unknown date';
  sourceNoteEl.textContent = `Data source: ${sourceName}. Seasons loaded: ${seasons.join(', ')}. Retrieved ${retrievedAt}.`;
}

function render() {
  const teams = currentTeams();
  if (!teams.length) {
    statusEl.textContent = 'No season data loaded.';
    return;
  }

  seasonStats = buildSeasonStats(teams);
  const { ranked, weights } = scoreTeams(teams);
  latestRanked = ranked;

  updateLabels(weights.raw);
  drawChart(ranked);
  renderTable(ranked);
  renderFactorBars(ranked[0]);
  updateSummaryCards(ranked);
  renderCompare();

  const leagueAvgTS = mean(teams.map((team) => team.ts)).toFixed(2);
  const leagueAvg3PAr = mean(teams.map((team) => team.threepar)).toFixed(2);

  statusEl.textContent = `Season ${activeSeason}: top model team ${ranked[0].team} (${ranked[0].score.toFixed(
    2
  )}). League TS% ${leagueAvgTS}, league 3PA/FGA ${leagueAvg3PAr}. Mode: ${useZEl.checked ? 'z-score' : 'min-max'}.`;
}

function setWeights(efg, tov, orb, ftr) {
  sliders['w-efg'].value = String(efg);
  sliders['w-tov'].value = String(tov);
  sliders['w-orb'].value = String(orb);
  sliders['w-ftr'].value = String(ftr);
  render();
}

function resetWeights() {
  setWeights(40, 25, 20, 15);
}

function applyPreset(name) {
  if (name === 'shotmaking') {
    setWeights(60, 20, 10, 10);
  } else if (name === 'physicality') {
    setWeights(22, 18, 30, 30);
  } else {
    resetWeights();
  }
}

function exportCsv() {
  if (!latestRanked.length) return;

  const rows = [
    ['Season', 'Rank', 'Team', 'CustomScore', 'eFG', 'TOV', 'ORB', 'FTr', 'TS', '3PA/FGA', 'Pace', 'OffRtg'].join(','),
    ...latestRanked.map((team, index) =>
      [
        activeSeason,
        index + 1,
        team.team,
        team.score.toFixed(2),
        team.efg.toFixed(1),
        team.tov.toFixed(1),
        team.orb.toFixed(1),
        team.ftr.toFixed(2),
        team.ts.toFixed(1),
        team.threepar.toFixed(2),
        team.pace.toFixed(2),
        team.offrtg.toFixed(1),
      ].join(',')
    ),
  ];

  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nba-offense-model-${activeSeason}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

weightKeys.forEach((key) => {
  sliders[key].addEventListener('input', render);
});

seasonSelect.addEventListener('change', () => {
  activeSeason = seasonSelect.value;
  populateCompareTeams();
  render();
});

useZEl.addEventListener('change', render);
resetBtn.addEventListener('click', resetWeights);
exportBtn.addEventListener('click', exportCsv);
compareA.addEventListener('change', renderCompare);
compareB.addEventListener('change', renderCompare);

presetButtons.forEach((button) => {
  button.addEventListener('click', () => applyPreset(button.dataset.preset || 'balanced'));
});

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
    statusEl.textContent = `${activeSeason} ${hit.team}: score ${hit.score.toFixed(2)}, pace ${hit.pace.toFixed(
      2
    )}, OffRtg ${hit.offrtg.toFixed(1)}, TS ${hit.ts.toFixed(1)}%, 3PA/FGA ${hit.threepar.toFixed(2)}.`;
  }
});

canvas.addEventListener('mouseleave', render);

populateSeasonSelect();
populateCompareTeams();
renderSourceNote();
render();
