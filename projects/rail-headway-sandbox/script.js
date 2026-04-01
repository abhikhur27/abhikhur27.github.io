const stationTableBody = document.querySelector('#station-table tbody');
const dispatchCanvas = document.getElementById('dispatch-canvas');
const dispatchCtx = dispatchCanvas.getContext('2d');
const corridorCanvas = document.getElementById('corridor-canvas');
const corridorCtx = corridorCanvas.getContext('2d');
const heatstripCanvas = document.getElementById('heatstrip-canvas');
const heatstripCtx = heatstripCanvas.getContext('2d');

const speedPresetEl = document.getElementById('speed-preset');
const turnbackEl = document.getElementById('turnback');
const capacityPresetEl = document.getElementById('capacity-preset');

const addStationBtn = document.getElementById('add-station');
const removeStationBtn = document.getElementById('remove-station');
const resetRouteBtn = document.getElementById('reset-route');

const headwayTemplateEl = document.getElementById('headway-template');
const applyTemplateBtn = document.getElementById('apply-template');
const clearDispatchBtn = document.getElementById('clear-dispatch');
const dispatchSummaryEl = document.getElementById('dispatch-summary');

const incidentStartEl = document.getElementById('incident-start');
const incidentDurationEl = document.getElementById('incident-duration');
const incidentSpeedEl = document.getElementById('incident-speed');
const incidentDwellEl = document.getElementById('incident-dwell');
const addIncidentBtn = document.getElementById('add-incident');
const addRandomIncidentBtn = document.getElementById('add-random-incident');
const clearIncidentsBtn = document.getElementById('clear-incidents');
const incidentListEl = document.getElementById('incident-list');

const saveSnapshotBtn = document.getElementById('save-snapshot');
const toggleSimBtn = document.getElementById('toggle-sim');
const snapshotTableBody = document.querySelector('#snapshot-table tbody');
const insightEl = document.getElementById('insight');

const metricEls = {
  roundtrip: document.getElementById('metric-roundtrip'),
  headway: document.getElementById('metric-headway'),
  p95: document.getElementById('metric-p95'),
  wait: document.getElementById('metric-wait'),
  otp: document.getElementById('metric-otp'),
  capacity: document.getElementById('metric-capacity'),
  utilization: document.getElementById('metric-utilization'),
  bunching: document.getElementById('metric-bunching'),
};

const DISPATCH_PAD = 34;
const DISPATCH_MINUTE_STEP = 0.5;
const MIN_STATIONS = 3;

const defaultStations = () => [
  { name: 'Harbor', spacingKm: 0, dwellSec: 35, demandWeight: 1.2 },
  { name: 'Canal', spacingKm: 1.4, dwellSec: 28, demandWeight: 1.0 },
  { name: 'Museum', spacingKm: 1.8, dwellSec: 30, demandWeight: 1.1 },
  { name: 'Midtown', spacingKm: 2.1, dwellSec: 32, demandWeight: 1.35 },
  { name: 'Union', spacingKm: 1.7, dwellSec: 27, demandWeight: 1.25 },
  { name: 'North Tech', spacingKm: 2.3, dwellSec: 25, demandWeight: 0.92 },
  { name: 'Terminal', spacingKm: 1.9, dwellSec: 36, demandWeight: 1.05 },
];

const state = {
  stations: defaultStations(),
  departures: [],
  incidents: [],
  snapshots: [],
  selectedDeparture: null,
  draggingDeparture: null,
  animationRunning: true,
  animationMinutes: 0,
  results: null,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundStep(value, step) {
  return Math.round(value / step) * step;
}

function formatMin(minValue) {
  if (!Number.isFinite(minValue)) return '-';
  return `${minValue.toFixed(2)} min`;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return '-';
  return `${value.toFixed(1)}%`;
}

function quantile(sortedValues, q) {
  if (!sortedValues.length) return 0;
  const pos = (sortedValues.length - 1) * q;
  const lower = Math.floor(pos);
  const upper = Math.ceil(pos);
  if (lower === upper) return sortedValues[lower];
  const weight = pos - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function stdDev(values, valuesMean = mean(values)) {
  if (!values.length) return 0;
  const variance = mean(values.map((value) => (value - valuesMean) ** 2));
  return Math.sqrt(variance);
}

function deterministicNoise(seedA, seedB) {
  const raw = Math.sin(seedA * 12.9898 + seedB * 78.233) * 43758.5453;
  return raw - Math.floor(raw);
}

function sanitizeStations(rawStations) {
  const cleaned = rawStations
    .map((station, index) => ({
      name: String(station.name || `Station ${index + 1}`).trim() || `Station ${index + 1}`,
      spacingKm: index === 0 ? 0 : clamp(Number(station.spacingKm) || 0.8, 0.4, 6.5),
      dwellSec: clamp(Number(station.dwellSec) || 20, 10, 120),
      demandWeight: clamp(Number(station.demandWeight) || 1, 0.2, 3),
    }))
    .slice(0, 18);

  while (cleaned.length < MIN_STATIONS) {
    cleaned.push({
      name: `Station ${cleaned.length + 1}`,
      spacingKm: cleaned.length === 0 ? 0 : 1.5,
      dwellSec: 25,
      demandWeight: 1,
    });
  }

  cleaned[0].spacingKm = 0;
  return cleaned;
}

function sanitizeDepartures(rawDepartures) {
  const normalized = rawDepartures
    .map((value) => roundStep(clamp(Number(value) || 0, 0, 59.5), DISPATCH_MINUTE_STEP))
    .filter((value) => Number.isFinite(value));

  const unique = Array.from(new Set(normalized));
  unique.sort((left, right) => left - right);
  return unique;
}

function buildEvenPattern(headway) {
  const spacing = clamp(Number(headway) || 4, 2, 15);
  const departures = [];
  for (let minute = 0; minute < 60; minute += spacing) {
    departures.push(roundStep(minute, DISPATCH_MINUTE_STEP));
  }
  return sanitizeDepartures(departures);
}

function minuteToX(minute) {
  const width = dispatchCanvas.width - DISPATCH_PAD * 2;
  return DISPATCH_PAD + (minute / 60) * width;
}

function xToMinute(x) {
  const width = dispatchCanvas.width - DISPATCH_PAD * 2;
  const ratio = clamp((x - DISPATCH_PAD) / width, 0, 0.9999);
  return roundStep(ratio * 60, DISPATCH_MINUTE_STEP);
}

function stationDistancePrefix(stations) {
  const prefix = [0];
  for (let i = 1; i < stations.length; i += 1) {
    prefix.push(prefix[i - 1] + stations[i].spacingKm);
  }
  return prefix;
}

function activeIncidentEffects(timeMin) {
  let minSpeedFactor = 1;
  let dwellPenaltySec = 0;

  state.incidents.forEach((incident) => {
    const start = incident.startMin;
    const end = incident.startMin + incident.durationMin;
    if (timeMin >= start && timeMin <= end) {
      minSpeedFactor = Math.min(minSpeedFactor, incident.speedFactor);
      dwellPenaltySec += incident.dwellPenaltySec;
    }
  });

  return {
    speedFactor: clamp(minSpeedFactor, 0.35, 1.3),
    dwellPenaltySec,
  };
}

function simulateOperations() {
  const stations = sanitizeStations(state.stations);
  const departures = sanitizeDepartures(state.departures.length ? state.departures : buildEvenPattern(4));
  const speedKmh = clamp(Number(speedPresetEl.value) || 38, 20, 70);
  const turnbackMin = clamp(Number(turnbackEl.value) || 3.5, 1.5, 15);
  const trainCapacity = clamp(Number(capacityPresetEl.value) || 1080, 700, 2000);

  state.stations = stations;
  state.departures = departures;

  const segmentDistances = stations.slice(1).map((station) => station.spacingKm);
  const totalLineKm = segmentDistances.reduce((sum, value) => sum + value, 0);
  const stationCount = stations.length;
  const centerStationIndex = Math.floor(stationCount / 2);

  const idealOneWayMin = segmentDistances.reduce((total, distance, segIndex) => {
    const travel = (distance / speedKmh) * 60;
    const dwell = segIndex < segmentDistances.length - 1 ? stations[segIndex + 1].dwellSec / 60 : 0;
    return total + travel + dwell;
  }, 0);

  const stationDepartureGuards = Array(stationCount).fill(-Infinity);
  const runs = [];
  const centerArrivals = [];

  departures.forEach((departure, runIndex) => {
    let currentTime = departure;
    const arrivals = [departure];
    const departuresAtStations = [departure];
    let holdingMin = 0;

    for (let seg = 0; seg < segmentDistances.length; seg += 1) {
      const effects = activeIncidentEffects(currentTime % 60);
      const baseTravel = (segmentDistances[seg] / speedKmh) * 60;
      const jitter = (deterministicNoise(runIndex + 1, seg + 11) - 0.5) * 0.09;
      const travelMin = Math.max(0.18, (baseTravel * (1 + jitter)) / effects.speedFactor);

      currentTime += travelMin;
      arrivals.push(currentTime);

      if (seg < segmentDistances.length - 1) {
        const baseDwell = stations[seg + 1].dwellSec / 60;
        const dwellWithPenalty = baseDwell + effects.dwellPenaltySec / 60;
        const candidateDeparture = currentTime + dwellWithPenalty;

        const minSep = 0.75;
        const heldDeparture = Math.max(candidateDeparture, stationDepartureGuards[seg + 1] + minSep);
        holdingMin += Math.max(0, heldDeparture - candidateDeparture);

        stationDepartureGuards[seg + 1] = heldDeparture;
        currentTime = heldDeparture;
      }

      departuresAtStations.push(currentTime);
    }

    const oneWayMin = currentTime - departure;
    const terminalDeltaMin = oneWayMin - idealOneWayMin;

    centerArrivals.push(arrivals[centerStationIndex]);

    runs.push({
      departure,
      arrivals,
      departuresAtStations,
      oneWayMin,
      holdingMin,
      terminalDeltaMin,
    });
  });

  const scheduleHeadways = departures.map((departure, idx) => {
    const next = departures[(idx + 1) % departures.length] + (idx === departures.length - 1 ? 60 : 0);
    return next - departure;
  });

  const meanHeadway = mean(scheduleHeadways);
  const sortedHeadways = [...scheduleHeadways].sort((a, b) => a - b);
  const p95Headway = quantile(sortedHeadways, 0.95);
  const headwayStd = stdDev(scheduleHeadways, meanHeadway);
  const expectedWait = (meanHeadway / 2) * (1 + (headwayStd / Math.max(meanHeadway, 0.001)) ** 2);

  const centerSorted = [...centerArrivals].sort((a, b) => a - b);
  const centerHeadways = [];
  for (let i = 1; i < centerSorted.length; i += 1) {
    centerHeadways.push(centerSorted[i] - centerSorted[i - 1]);
  }
  const bunchingThreshold = meanHeadway * 0.65;
  const bunchingEvents = centerHeadways.filter((gap) => gap < bunchingThreshold).length;

  const avgOneWay = mean(runs.map((run) => run.oneWayMin));
  const roundTripMin = 2 * (avgOneWay + turnbackMin);
  const tph = 60 / Math.max(meanHeadway, 0.01);
  const corridorCapacity = tph * trainCapacity;
  const corridorDemand = stations.reduce((sum, station) => sum + station.demandWeight * 245, 0);
  const utilization = corridorDemand / Math.max(corridorCapacity, 1);

  const otp =
    (runs.filter((run) => Math.abs(run.terminalDeltaMin) <= 2).length / Math.max(runs.length, 1)) * 100;

  const fleetRequired = Math.ceil(roundTripMin / Math.max(meanHeadway, 0.1));
  const reliabilityIndex =
    100 -
    (p95Headway - meanHeadway) * 4.5 -
    bunchingEvents * 3.8 -
    mean(runs.map((run) => run.holdingMin)) * 5.4;

  return {
    stations,
    departures,
    runs,
    scheduleHeadways,
    meanHeadway,
    p95Headway,
    expectedWait,
    roundTripMin,
    tph,
    corridorCapacity,
    corridorDemand,
    utilization,
    otp,
    bunchingEvents,
    fleetRequired,
    reliabilityIndex,
    turnbackMin,
    speedKmh,
    trainCapacity,
    stationDistanceKm: stationDistancePrefix(stations),
    totalLineKm,
    centerStationIndex,
  };
}

function drawDispatchTimeline() {
  dispatchCtx.clearRect(0, 0, dispatchCanvas.width, dispatchCanvas.height);

  dispatchCtx.fillStyle = '#0c1422';
  dispatchCtx.fillRect(0, 0, dispatchCanvas.width, dispatchCanvas.height);

  const trackY = 78;
  dispatchCtx.strokeStyle = '#2b3f5d';
  dispatchCtx.lineWidth = 2;
  dispatchCtx.beginPath();
  dispatchCtx.moveTo(DISPATCH_PAD, trackY);
  dispatchCtx.lineTo(dispatchCanvas.width - DISPATCH_PAD, trackY);
  dispatchCtx.stroke();

  dispatchCtx.lineWidth = 1;
  for (let minute = 0; minute <= 60; minute += 5) {
    const x = minuteToX(minute);
    dispatchCtx.strokeStyle = minute % 10 === 0 ? '#3c547b' : '#263750';
    dispatchCtx.beginPath();
    dispatchCtx.moveTo(x, 22);
    dispatchCtx.lineTo(x, 102);
    dispatchCtx.stroke();

    if (minute % 10 === 0) {
      dispatchCtx.fillStyle = '#94a6cb';
      dispatchCtx.font = '11px JetBrains Mono';
      dispatchCtx.textAlign = 'center';
      dispatchCtx.fillText(`${minute}m`, x, 116);
    }
  }

  state.incidents.forEach((incident) => {
    const startX = minuteToX(incident.startMin);
    const endX = minuteToX(Math.min(60, incident.startMin + incident.durationMin));
    dispatchCtx.fillStyle = 'rgba(234, 143, 149, 0.2)';
    dispatchCtx.fillRect(startX, 26, Math.max(2, endX - startX), 68);
  });

  state.departures.forEach((departure, index) => {
    const x = minuteToX(departure);
    const selected = index === state.selectedDeparture;

    dispatchCtx.fillStyle = selected ? '#d9e6ff' : '#8fb0ff';
    dispatchCtx.beginPath();
    dispatchCtx.arc(x, trackY, selected ? 8 : 6, 0, Math.PI * 2);
    dispatchCtx.fill();

    dispatchCtx.fillStyle = selected ? '#f1f5ff' : '#b9c8ea';
    dispatchCtx.font = '11px JetBrains Mono';
    dispatchCtx.textAlign = 'center';
    dispatchCtx.fillText(departure.toFixed(1), x, 56);
  });
}

function drawCorridor(results) {
  corridorCtx.clearRect(0, 0, corridorCanvas.width, corridorCanvas.height);
  corridorCtx.fillStyle = '#0c1423';
  corridorCtx.fillRect(0, 0, corridorCanvas.width, corridorCanvas.height);

  const startX = 44;
  const endX = corridorCanvas.width - 44;
  const lineY = Math.floor(corridorCanvas.height / 2);

  corridorCtx.strokeStyle = '#2d4262';
  corridorCtx.lineWidth = 3;
  corridorCtx.beginPath();
  corridorCtx.moveTo(startX, lineY);
  corridorCtx.lineTo(endX, lineY);
  corridorCtx.stroke();

  const totalKm = Math.max(results.totalLineKm, 0.01);
  results.stations.forEach((station, stationIndex) => {
    const ratio = results.stationDistanceKm[stationIndex] / totalKm;
    const x = startX + ratio * (endX - startX);

    corridorCtx.fillStyle = '#dbe6ff';
    corridorCtx.beginPath();
    corridorCtx.arc(x, lineY, 5, 0, Math.PI * 2);
    corridorCtx.fill();

    corridorCtx.fillStyle = '#9caed2';
    corridorCtx.font = '11px JetBrains Mono';
    corridorCtx.textAlign = 'center';
    corridorCtx.fillText(station.name, x, lineY + (stationIndex % 2 === 0 ? 22 : -14));
  });

  const cycleMin = Math.max(results.roundTripMin, 1);
  results.runs.forEach((run, runIndex) => {
    const loopPhase = (state.animationMinutes - run.departure + cycleMin * 5000) % cycleMin;
    const outboundWindow = run.oneWayMin;
    const holdWindow = results.turnbackMin;

    let ratio = 0;
    let direction = 1;

    if (loopPhase < outboundWindow) {
      ratio = loopPhase / Math.max(outboundWindow, 0.001);
      direction = 1;
    } else if (loopPhase < outboundWindow + holdWindow) {
      ratio = 1;
      direction = 0;
    } else if (loopPhase < outboundWindow + holdWindow + outboundWindow) {
      const backPhase = loopPhase - outboundWindow - holdWindow;
      ratio = 1 - backPhase / Math.max(outboundWindow, 0.001);
      direction = -1;
    } else {
      ratio = 0;
      direction = 0;
    }

    const x = startX + ratio * (endX - startX);
    const y = lineY - 16 + (runIndex % 6) * 6;

    corridorCtx.fillStyle = direction === 0 ? '#f3c879' : direction === 1 ? '#8fb0ff' : '#75d1b2';
    corridorCtx.fillRect(x - 7, y - 4, 14, 8);
  });

  corridorCtx.fillStyle = '#9eb0d5';
  corridorCtx.font = '11px JetBrains Mono';
  corridorCtx.textAlign = 'left';
  corridorCtx.fillText(`Cycle ${results.roundTripMin.toFixed(1)}m | Fleet needed ${results.fleetRequired}`, 12, 16);
  corridorCtx.textAlign = 'right';
  corridorCtx.fillText(`Simulation clock ${state.animationMinutes.toFixed(1)}m`, corridorCanvas.width - 12, 16);
}

function drawHeatstrip(results) {
  heatstripCtx.clearRect(0, 0, heatstripCanvas.width, heatstripCanvas.height);
  heatstripCtx.fillStyle = '#0c1423';
  heatstripCtx.fillRect(0, 0, heatstripCanvas.width, heatstripCanvas.height);

  const leftPad = 102;
  const topPad = 16;
  const width = heatstripCanvas.width - leftPad - 16;
  const rowHeight = (heatstripCanvas.height - topPad - 18) / results.stations.length;
  const bins = 60;
  const cellW = width / bins;

  const matrix = Array.from({ length: results.stations.length }, () => Array(bins).fill(0));

  results.runs.forEach((run) => {
    run.arrivals.forEach((arrival, stationIdx) => {
      const minuteMod = ((arrival % 60) + 60) % 60;
      const bin = Math.floor(minuteMod);
      const delayWeight = clamp(Math.abs(run.terminalDeltaMin) / 4, 0.2, 2.2);
      matrix[stationIdx][bin] += delayWeight;
    });
  });

  const maxValue = Math.max(0.8, ...matrix.flat());

  for (let s = 0; s < results.stations.length; s += 1) {
    const y = topPad + s * rowHeight;

    heatstripCtx.fillStyle = '#9dafd3';
    heatstripCtx.font = '11px JetBrains Mono';
    heatstripCtx.textAlign = 'left';
    heatstripCtx.fillText(results.stations[s].name, 8, y + rowHeight * 0.63);

    for (let minute = 0; minute < bins; minute += 1) {
      const value = matrix[s][minute] / maxValue;
      const shade = Math.round(25 + value * 160);
      heatstripCtx.fillStyle = `rgb(${shade}, ${Math.round(shade * 0.9)}, ${Math.round(160 + value * 70)})`;
      heatstripCtx.fillRect(leftPad + minute * cellW, y + 2, Math.max(cellW - 0.5, 0.5), rowHeight - 3);
    }
  }

  for (let minute = 0; minute <= 60; minute += 10) {
    const x = leftPad + (minute / 60) * width;
    heatstripCtx.strokeStyle = '#2d4262';
    heatstripCtx.beginPath();
    heatstripCtx.moveTo(x, topPad);
    heatstripCtx.lineTo(x, heatstripCanvas.height - 8);
    heatstripCtx.stroke();

    heatstripCtx.fillStyle = '#90a5ce';
    heatstripCtx.font = '11px JetBrains Mono';
    heatstripCtx.textAlign = 'center';
    heatstripCtx.fillText(`${minute}`, x, heatstripCanvas.height - 2);
  }
}

function buildInsight(results) {
  const lines = [];

  if (results.utilization > 1.05) {
    lines.push('Demand is outrunning offered capacity. Increase dispatch frequency or trainset size first.');
  } else if (results.utilization < 0.65) {
    lines.push('Service is over-provisioned for current demand assumptions. You can recover operating cost without major wait penalties.');
  } else {
    lines.push('Capacity and demand are in a workable band. Focus next on reliability and bunching suppression.');
  }

  if (results.bunchingEvents > 2) {
    lines.push('Bunching risk is elevated at the corridor midpoint. Stabilize headways with schedule offsets and tighter turnback discipline.');
  }

  if (results.otp < 85) {
    lines.push('On-time performance is weak under this pattern. Consider trimming dwell variance and reducing incident exposure windows.');
  }

  if (results.p95Headway > results.meanHeadway * 1.6) {
    lines.push('Tail headways are too wide versus median. Riders will perceive this as random service even if average frequency looks acceptable.');
  }

  return lines.join(' ');
}

function renderMetrics(results) {
  metricEls.roundtrip.textContent = formatMin(results.roundTripMin);
  metricEls.headway.textContent = formatMin(results.meanHeadway);
  metricEls.p95.textContent = formatMin(results.p95Headway);
  metricEls.wait.textContent = formatMin(results.expectedWait);
  metricEls.otp.textContent = formatPercent(results.otp);
  metricEls.capacity.textContent = `${Math.round(results.corridorCapacity).toLocaleString()} pphpd`;
  metricEls.utilization.textContent = formatPercent(results.utilization * 100);
  metricEls.bunching.textContent = String(results.bunchingEvents);

  insightEl.textContent = buildInsight(results);
}

function renderDispatchSummary(results) {
  const departuresText = results.departures
    .map((departure) => departure.toFixed(1))
    .slice(0, 14)
    .join(', ');

  dispatchSummaryEl.textContent = `Departures (${results.departures.length}/hour): ${departuresText}${
    results.departures.length > 14 ? ', ...' : ''
  } | ${results.tph.toFixed(1)} tph | Fleet target ${results.fleetRequired}`;
}

function renderIncidentList() {
  if (!state.incidents.length) {
    incidentListEl.innerHTML = '<li>No active incidents. Baseline operation only.</li>';
    return;
  }

  incidentListEl.innerHTML = state.incidents
    .map((incident) => {
      return `<li>
        <strong>${incident.startMin.toFixed(1)}m-${(incident.startMin + incident.durationMin).toFixed(1)}m</strong>
        | speed x${incident.speedFactor.toFixed(2)} | +${incident.dwellPenaltySec}s dwell
        <button class="small-remove" data-incident-id="${incident.id}" type="button">Remove</button>
      </li>`;
    })
    .join('');
}

function renderStationTable() {
  stationTableBody.innerHTML = state.stations
    .map((station, index) => {
      const removable = state.stations.length > MIN_STATIONS;
      return `<tr>
        <td><input data-station-index="${index}" data-field="name" type="text" value="${station.name}"></td>
        <td><input data-station-index="${index}" data-field="spacingKm" type="number" min="${index === 0 ? 0 : 0.4}" max="6.5" step="0.1" value="${station.spacingKm.toFixed(1)}" ${
          index === 0 ? 'disabled' : ''
        }></td>
        <td><input data-station-index="${index}" data-field="dwellSec" type="number" min="10" max="120" step="1" value="${Math.round(station.dwellSec)}"></td>
        <td><input data-station-index="${index}" data-field="demandWeight" type="number" min="0.2" max="3" step="0.05" value="${station.demandWeight.toFixed(2)}"></td>
        <td><button class="small-btn ghost" data-remove-station="${index}" type="button" ${
          removable ? '' : 'disabled'
        }>Delete</button></td>
      </tr>`;
    })
    .join('');
}

function renderSnapshots() {
  if (!state.snapshots.length) {
    snapshotTableBody.innerHTML = '<tr><td colspan="7" class="empty">No snapshots saved yet.</td></tr>';
    return;
  }

  snapshotTableBody.innerHTML = state.snapshots
    .map((snapshot) => {
      return `<tr>
        <td>${snapshot.label}</td>
        <td>${snapshot.headway.toFixed(2)}m</td>
        <td>${snapshot.p95.toFixed(2)}m</td>
        <td>${snapshot.wait.toFixed(2)}m</td>
        <td>${snapshot.otp.toFixed(1)}%</td>
        <td>${Math.round(snapshot.capacity).toLocaleString()}</td>
        <td>${(snapshot.utilization * 100).toFixed(1)}%</td>
      </tr>`;
    })
    .join('');
}

function recomputeAndRender() {
  state.results = simulateOperations();

  renderMetrics(state.results);
  renderStationTable();
  renderIncidentList();
  renderDispatchSummary(state.results);
  drawDispatchTimeline();
  drawCorridor(state.results);
  drawHeatstrip(state.results);
  renderSnapshots();
}

function findDepartureAtPosition(mouseX, mouseY) {
  const targetY = 78;
  if (Math.abs(mouseY - targetY) > 12) return null;

  for (let i = 0; i < state.departures.length; i += 1) {
    const x = minuteToX(state.departures[i]);
    if (Math.abs(x - mouseX) <= 8) {
      return i;
    }
  }

  return null;
}

function handleDispatchPointerDown(event) {
  const rect = dispatchCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const existingIndex = findDepartureAtPosition(x, y);

  if (existingIndex !== null) {
    state.selectedDeparture = existingIndex;
    state.draggingDeparture = existingIndex;
    drawDispatchTimeline();
    return;
  }

  const minute = xToMinute(x);
  state.departures = sanitizeDepartures([...state.departures, minute]);
  state.selectedDeparture = state.departures.findIndex((value) => value === minute);
  recomputeAndRender();
}

function handleDispatchPointerMove(event) {
  if (state.draggingDeparture === null) return;

  const rect = dispatchCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const minute = xToMinute(x);

  state.departures[state.draggingDeparture] = minute;
  state.departures = sanitizeDepartures(state.departures);
  state.selectedDeparture = state.departures.findIndex((value) => value === minute);

  recomputeAndRender();
}

function handleDispatchPointerUp() {
  state.draggingDeparture = null;
}

function handleDispatchDoubleClick(event) {
  const rect = dispatchCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const index = findDepartureAtPosition(x, y);

  if (index === null) return;

  state.departures.splice(index, 1);
  state.departures = sanitizeDepartures(state.departures);
  state.selectedDeparture = null;
  recomputeAndRender();
}

function addIncidentFromInputs() {
  const startMin = clamp(Number(incidentStartEl.value) || 0, 0, 59);
  const durationMin = clamp(Number(incidentDurationEl.value) || 8, 2, 30);
  const speedFactor = clamp(Number(incidentSpeedEl.value) || 0.8, 0.35, 1.2);
  const dwellPenaltySec = clamp(Number(incidentDwellEl.value) || 0, 0, 90);

  state.incidents.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    startMin,
    durationMin,
    speedFactor,
    dwellPenaltySec,
  });

  recomputeAndRender();
}

function addRandomIncident() {
  const startMin = roundStep(Math.random() * 50, DISPATCH_MINUTE_STEP);
  const durationMin = Math.round(4 + Math.random() * 16);
  const speedFactor = Number((0.5 + Math.random() * 0.35).toFixed(2));
  const dwellPenaltySec = Math.round(8 + Math.random() * 35);

  state.incidents.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    startMin,
    durationMin,
    speedFactor,
    dwellPenaltySec,
  });

  recomputeAndRender();
}

function saveSnapshot() {
  if (!state.results) return;

  const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  state.snapshots.unshift({
    label: `Run ${state.snapshots.length + 1} (${stamp})`,
    headway: state.results.meanHeadway,
    p95: state.results.p95Headway,
    wait: state.results.expectedWait,
    otp: state.results.otp,
    capacity: state.results.corridorCapacity,
    utilization: state.results.utilization,
  });

  state.snapshots = state.snapshots.slice(0, 9);
  renderSnapshots();
}

function animate(now) {
  if (!animate.last) animate.last = now;
  const deltaMs = now - animate.last;
  animate.last = now;

  if (state.animationRunning && state.results) {
    state.animationMinutes = (state.animationMinutes + deltaMs * 0.0012) % Math.max(state.results.roundTripMin, 1);
    drawCorridor(state.results);
  }

  requestAnimationFrame(animate);
}

stationTableBody.addEventListener('input', (event) => {
  const target = event.target;
  const index = Number(target.dataset.stationIndex);
  const field = target.dataset.field;

  if (!Number.isInteger(index) || !field || !state.stations[index]) return;

  if (field === 'name') {
    state.stations[index].name = target.value;
  } else if (field === 'spacingKm') {
    state.stations[index].spacingKm = Number(target.value);
  } else if (field === 'dwellSec') {
    state.stations[index].dwellSec = Number(target.value);
  } else if (field === 'demandWeight') {
    state.stations[index].demandWeight = Number(target.value);
  }

  state.stations = sanitizeStations(state.stations);
  recomputeAndRender();
});

stationTableBody.addEventListener('click', (event) => {
  const target = event.target;
  const removeIndex = target.getAttribute('data-remove-station');
  if (removeIndex === null) return;

  const parsed = Number(removeIndex);
  if (!Number.isInteger(parsed)) return;

  if (state.stations.length <= MIN_STATIONS) return;
  state.stations.splice(parsed, 1);
  state.stations = sanitizeStations(state.stations);
  recomputeAndRender();
});

dispatchCanvas.addEventListener('mousedown', handleDispatchPointerDown);
dispatchCanvas.addEventListener('mousemove', handleDispatchPointerMove);
window.addEventListener('mouseup', handleDispatchPointerUp);
dispatchCanvas.addEventListener('mouseleave', handleDispatchPointerUp);
dispatchCanvas.addEventListener('dblclick', handleDispatchDoubleClick);

addStationBtn.addEventListener('click', () => {
  state.stations.push({
    name: `Station ${state.stations.length + 1}`,
    spacingKm: 1.6,
    dwellSec: 26,
    demandWeight: 1,
  });
  state.stations = sanitizeStations(state.stations);
  recomputeAndRender();
});

removeStationBtn.addEventListener('click', () => {
  if (state.stations.length <= MIN_STATIONS) return;
  state.stations.pop();
  state.stations = sanitizeStations(state.stations);
  recomputeAndRender();
});

resetRouteBtn.addEventListener('click', () => {
  state.stations = defaultStations();
  recomputeAndRender();
});

applyTemplateBtn.addEventListener('click', () => {
  state.departures = buildEvenPattern(Number(headwayTemplateEl.value));
  recomputeAndRender();
});

clearDispatchBtn.addEventListener('click', () => {
  state.departures = [];
  recomputeAndRender();
});

addIncidentBtn.addEventListener('click', addIncidentFromInputs);
addRandomIncidentBtn.addEventListener('click', addRandomIncident);
clearIncidentsBtn.addEventListener('click', () => {
  state.incidents = [];
  recomputeAndRender();
});

incidentListEl.addEventListener('click', (event) => {
  const target = event.target;
  const incidentId = target.getAttribute('data-incident-id');
  if (!incidentId) return;

  state.incidents = state.incidents.filter((incident) => incident.id !== incidentId);
  recomputeAndRender();
});

saveSnapshotBtn.addEventListener('click', saveSnapshot);

toggleSimBtn.addEventListener('click', () => {
  state.animationRunning = !state.animationRunning;
  toggleSimBtn.textContent = state.animationRunning ? 'Pause Animation' : 'Resume Animation';
});

[speedPresetEl, turnbackEl, capacityPresetEl].forEach((element) => {
  element.addEventListener('input', recomputeAndRender);
  element.addEventListener('change', recomputeAndRender);
});

state.departures = buildEvenPattern(Number(headwayTemplateEl.value));
recomputeAndRender();
requestAnimationFrame(animate);