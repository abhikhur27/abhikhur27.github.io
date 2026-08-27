const startSelect = document.getElementById('start-station');
const endSelect = document.getElementById('end-station');
const runButton = document.getElementById('run-route');
const statusEl = document.getElementById('status');
const objectiveSelect = document.getElementById('route-objective');
const routePolicySummaryEl = document.getElementById('route-policy-summary');

const minutesEl = document.getElementById('metric-minutes');
const stopsEl = document.getElementById('metric-stops');
const transfersEl = document.getElementById('metric-transfers');
const distanceEl = document.getElementById('metric-distance');
const stepsEl = document.getElementById('route-steps');
const resilienceSummaryEl = document.getElementById('resilience-summary');
const resilienceExposureEl = document.getElementById('resilience-exposure');
const resilienceBackupEl = document.getElementById('resilience-backup');
const resilienceWeakLinkEl = document.getElementById('resilience-weak-link');

const newStopInput = document.getElementById('new-stop-name');
const addStopButton = document.getElementById('add-stop');
const lineNameInput = document.getElementById('line-name');
const lineColorInput = document.getElementById('line-color');
const lineSpeedInput = document.getElementById('line-speed');
const editorStatusEl = document.getElementById('editor-status');

const modeDragButton = document.getElementById('mode-drag');
const modeConnectButton = document.getElementById('mode-connect');
const modeDeleteButton = document.getElementById('mode-delete');
const selectedStopLabel = document.getElementById('selected-stop-label');
const selectedSegmentLabel = document.getElementById('selected-segment-label');
const deleteSelectedStopButton = document.getElementById('delete-selected-stop');
const deleteSelectedSegmentButton = document.getElementById('delete-selected-segment');
const segmentCurveInput = document.getElementById('segment-curve');

const addObstacleButton = document.getElementById('add-obstacle');
const addLakeButton = document.getElementById('add-lake');
const addRiverButton = document.getElementById('add-river');
const clearTerrainButton = document.getElementById('clear-terrain');
const randomCityButton = document.getElementById('random-city');

const networkSvg = document.getElementById('network');
const legendEl = document.getElementById('line-legend');

const {
  ROUTE_OBJECTIVES,
  analyzeNetworkReliability,
  computeRoute: computeNetworkRoute,
  computeRouteBundle: computeNetworkRouteBundle,
  computeSegmentRiskIndex,
} = window.TransitRouting;
const transferPenaltyMinutes = 2;
const riverPenaltyMinutes = 3;
const OBJECTIVE_KEY = 'transit_lab_objective';
let stationCounter = 0;
let segmentCounter = 0;
let terrainCounter = 0;

const stations = [
  { id: 'UN', name: 'Union', x: 90, y: 260 },
  { id: 'MU', name: 'Museum', x: 220, y: 150 },
  { id: 'CE', name: 'Central', x: 390, y: 260 },
  { id: 'HA', name: 'Harbor', x: 560, y: 360 },
  { id: 'AP', name: 'Airport', x: 740, y: 250 },
  { id: 'TE', name: 'Tech Park', x: 390, y: 90 },
  { id: 'ST', name: 'Stadium', x: 390, y: 430 },
  { id: 'RI', name: 'Riverfront', x: 560, y: 150 },
];

const lineCatalog = {
  blue: { color: '#2563eb', speed: 24 },
  red: { color: '#dc2626', speed: 21 },
  green: { color: '#16a34a', speed: 22 },
};

const terrain = [];

const segments = [
  { id: nextSegmentId(), from: 'UN', to: 'CE', line: 'blue' },
  { id: nextSegmentId(), from: 'CE', to: 'AP', line: 'blue' },
  { id: nextSegmentId(), from: 'AP', to: 'RI', line: 'blue' },
  { id: nextSegmentId(), from: 'MU', to: 'CE', line: 'red' },
  { id: nextSegmentId(), from: 'CE', to: 'HA', line: 'red' },
  { id: nextSegmentId(), from: 'MU', to: 'RI', line: 'red' },
  { id: nextSegmentId(), from: 'TE', to: 'CE', line: 'green' },
  { id: nextSegmentId(), from: 'CE', to: 'ST', line: 'green' },
  { id: nextSegmentId(), from: 'ST', to: 'HA', line: 'green' },
  { id: nextSegmentId(), from: 'TE', to: 'MU', line: 'green' },
];

let currentRoute = null;
let selectedStopId = null;
let selectedSegmentId = null;
let connectAnchorId = null;
let draggingStationId = null;
let dragMoved = false;
let editMode = 'drag';
let currentRouteBundle = null;
let routeRiskCache = { signature: '', index: new Map() };
let networkReliabilityCache = { signature: '', analysis: null };

let routeObjective = localStorage.getItem(OBJECTIVE_KEY) || 'fastest';

if (!ROUTE_OBJECTIVES[routeObjective]) {
  routeObjective = 'fastest';
}

objectiveSelect.value = routeObjective;

function nextSegmentId() {
  segmentCounter += 1;
  return `seg-${segmentCounter}`;
}

function stationById(id) {
  return stations.find((station) => station.id === id);
}

function segmentById(id) {
  return segments.find((segment) => segment.id === id);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value).replace(/[&<>"']/g, (character) => entities[character]);
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function selectedObjective() {
  return ROUTE_OBJECTIVES[routeObjective] ? routeObjective : 'fastest';
}

function makeStationId(name) {
  const letters = name
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 2)
    .padEnd(2, 'X');
  stationCounter += 1;
  return `${letters}${stationCounter}`;
}

function nextTerrainId() {
  terrainCounter += 1;
  return `terrain-${terrainCounter}`;
}

function segmentControlPoint(segment) {
  const from = stationById(segment.from);
  const to = stationById(segment.to);
  if (!from || !to) return null;

  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  const nx = -dy / length;
  const ny = dx / length;
  const curve = segment.curve || 0;
  return { x: midX + nx * curve, y: midY + ny * curve };
}

function segmentPathD(segment) {
  const from = stationById(segment.from);
  const to = stationById(segment.to);
  const control = segmentControlPoint(segment);
  if (!from || !to || !control) return '';
  return `M ${from.x} ${from.y} Q ${control.x} ${control.y} ${to.x} ${to.y}`;
}

function sampleSegmentPoints(segment, count = 24) {
  const from = stationById(segment.from);
  const to = stationById(segment.to);
  const control = segmentControlPoint(segment);
  if (!from || !to || !control) return [];

  const output = [];
  for (let i = 0; i <= count; i += 1) {
    const t = i / count;
    const inv = 1 - t;
    const x = inv * inv * from.x + 2 * inv * t * control.x + t * t * to.x;
    const y = inv * inv * from.y + 2 * inv * t * control.y + t * t * to.y;
    output.push({ x, y });
  }
  return output;
}

function pointInsideEllipse(point, shape) {
  const rx = Math.max(1, shape.rx);
  const ry = Math.max(1, shape.ry);
  const dx = (point.x - shape.x) / rx;
  const dy = (point.y - shape.y) / ry;
  return dx * dx + dy * dy <= 1;
}

function distanceToLine(point, a, b) {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const wx = point.x - a.x;
  const wy = point.y - a.y;
  const len2 = vx * vx + vy * vy;
  if (len2 === 0) return Math.sqrt(wx * wx + wy * wy);

  const t = clamp((wx * vx + wy * vy) / len2, 0, 1);
  const px = a.x + vx * t;
  const py = a.y + vy * t;
  const dx = point.x - px;
  const dy = point.y - py;
  return Math.sqrt(dx * dx + dy * dy);
}

function pointNearRiver(point, shape) {
  const dist = distanceToLine(point, { x: shape.x1, y: shape.y1 }, { x: shape.x2, y: shape.y2 });
  return dist <= (shape.width || 18) / 2;
}

function segmentTerrainInfo(segment) {
  const points = sampleSegmentPoints(segment, 24);
  if (!points.length) return { blocked: false, riverHits: 0 };

  let blocked = false;
  let riverHits = 0;

  terrain.forEach((shape) => {
    if (shape.type === 'obstacle' || shape.type === 'lake') {
      if (points.some((point) => pointInsideEllipse(point, shape))) {
        blocked = true;
      }
      return;
    }

    if (shape.type === 'river' && points.some((point) => pointNearRiver(point, shape))) {
      riverHits += 1;
    }
  });

  return { blocked, riverHits };
}

function segmentDistance(segment) {
  const points = sampleSegmentPoints(segment, 24);
  if (!points.length) return 0;

  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

function segmentMinutes(segment) {
  const lineInfo = lineCatalog[segment.line] || { speed: 20 };
  const distance = segmentDistance(segment);
  const terrainInfo = segmentTerrainInfo(segment);
  return Math.max(1, Math.round(distance / lineInfo.speed + 1)) + terrainInfo.riverHits * riverPenaltyMinutes;
}

function routeRiskSignature() {
  return JSON.stringify({
    stations: stations.map((station) => [station.id, station.x, station.y]),
    segments: segments.map((segment) => [segment.id, segment.from, segment.to, segment.line, Math.round(segment.curve || 0)]),
    terrain: terrain.map((shape) => Object.values(shape)),
    lines: Object.entries(lineCatalog)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, info]) => [name, info.color, info.speed]),
  });
}

function formatDistance(distance) {
  return `${Math.round(distance)} px`;
}

function formatExposureMinutes(exposure) {
  return `${Math.round(exposure)}m`;
}

function syncRouteSelects() {
  const previousStart = startSelect.value;
  const previousEnd = endSelect.value;

  const options = stations.map((station) => `<option value="${station.id}">${escapeHtml(station.name)}</option>`).join('');
  startSelect.innerHTML = options;
  endSelect.innerHTML = options;

  if (stations.some((station) => station.id === previousStart)) {
    startSelect.value = previousStart;
  }

  if (stations.some((station) => station.id === previousEnd)) {
    endSelect.value = previousEnd;
  }

  if (!startSelect.value && stations[0]) {
    startSelect.value = stations[0].id;
  }

  if (!endSelect.value && stations[1]) {
    endSelect.value = stations[1].id;
  }

  if (startSelect.value === endSelect.value && stations.length > 1) {
    const fallback = stations.find((station) => station.id !== startSelect.value);
    if (fallback) {
      endSelect.value = fallback.id;
    }
  }
}

function lineBadge(lineName) {
  const line = lineCatalog[lineName];
  if (!line) return '';
  return `<span><i style="background:${line.color}"></i>${escapeHtml(lineName.toUpperCase())} (${line.speed}px/min)</span>`;
}

function renderLegend() {
  const entries = Object.keys(lineCatalog)
    .sort()
    .map(lineBadge);

  entries.push('<span><i style="background:rgba(185,100,68,0.65)"></i>Obstacle</span>');
  entries.push('<span><i style="background:rgba(49,130,206,0.65)"></i>Water</span>');
  legendEl.innerHTML = entries.join('');
}

function getSegmentRiskIndex() {
  const signature = routeRiskSignature();
  if (routeRiskCache.signature === signature) {
    return routeRiskCache.index;
  }

  const index = computeSegmentRiskIndex(routingNetwork(), { transferPenaltyMinutes });

  routeRiskCache = { signature, index };
  return index;
}

function getNetworkReliability() {
  const signature = routeRiskSignature();
  if (networkReliabilityCache.signature === signature) {
    return networkReliabilityCache.analysis;
  }

  const analysis = analyzeNetworkReliability(routingNetwork());
  networkReliabilityCache = { signature, analysis };
  return analysis;
}

function routingNetwork() {
  return {
    stations: stations.map((station) => station.id),
    segments: segments.map((segment) => {
      const terrainInfo = segmentTerrainInfo(segment);
      return {
        id: segment.id,
        from: segment.from,
        to: segment.to,
        line: segment.line,
        minutes: segmentMinutes(segment),
        distance: segmentDistance(segment),
        terrainPenalty: terrainInfo.riverHits * riverPenaltyMinutes,
        blocked: terrainInfo.blocked,
      };
    }),
  };
}

function computeRouteCore(startId, endId, options = {}) {
  const includeRisk = options.includeRisk !== false;
  return computeNetworkRoute(routingNetwork(), startId, endId, {
    ...options,
    includeRisk,
    riskIndex: includeRisk ? getSegmentRiskIndex() : undefined,
    transferPenaltyMinutes,
  });
}

function computeRoute(startId, endId, options = {}) {
  return computeRouteCore(startId, endId, {
    ...options,
    objective: options.objective || selectedObjective(),
  });
}

function computeRouteBundle(startId, endId) {
  return computeNetworkRouteBundle(routingNetwork(), startId, endId, {
    objective: selectedObjective(),
    riskIndex: getSegmentRiskIndex(),
    transferPenaltyMinutes,
  });
}

function renderPolicySummary(bundle) {
  if (!bundle || !bundle.activeRoute) {
    routePolicySummaryEl.textContent = 'Compute a route to compare time, transfer, and outage tradeoffs.';
    return;
  }

  const route = bundle.activeRoute;
  if (route.objective === 'fastest') {
    const resilientDelta = bundle.resilient ? bundle.resilient.totalMinutes - route.totalMinutes : 0;
    const exposureDrop = bundle.resilient ? route.totalRiskExposure - bundle.resilient.totalRiskExposure : 0;
    routePolicySummaryEl.textContent = bundle.resilient
      ? `Fastest policy active. Most resilient alternative adds ${Math.max(0, resilientDelta)}m and cuts closure exposure by ${formatExposureMinutes(
          Math.max(0, exposureDrop)
        )}.`
      : 'Fastest policy active.';
    return;
  }

  if (route.objective === 'transfers') {
    const fastestDelta = bundle.fastest ? route.totalMinutes - bundle.fastest.totalMinutes : 0;
    routePolicySummaryEl.textContent = bundle.fastest
      ? `Low-transfer policy active. It uses ${route.transferCount} transfers and costs ${Math.max(0, fastestDelta)}m versus the fastest option.`
      : 'Low-transfer policy active.';
    return;
  }

  const fastestDelta = bundle.fastest ? route.totalMinutes - bundle.fastest.totalMinutes : 0;
  const exposureDrop = bundle.fastest ? bundle.fastest.totalRiskExposure - route.totalRiskExposure : 0;
  routePolicySummaryEl.textContent = bundle.fastest
    ? `Resilience policy active. It adds ${Math.max(0, fastestDelta)}m versus fastest and lowers closure exposure by ${formatExposureMinutes(
        Math.max(0, exposureDrop)
      )}.`
    : 'Resilience policy active.';
}

function renderMetrics(route, bundle) {
  if (!route) {
    minutesEl.textContent = '-';
    stopsEl.textContent = '-';
    transfersEl.textContent = '-';
    distanceEl.textContent = '-';
    stepsEl.innerHTML = '';
    renderPolicySummary(null);
    renderResilience(null, null, getNetworkReliability());
    return;
  }

  minutesEl.textContent = `${route.totalMinutes}m`;
  stopsEl.textContent = String(route.stationPath.length - 1);
  transfersEl.textContent = String(route.transferCount);
  distanceEl.textContent = formatDistance(route.totalDistance);

  stepsEl.innerHTML = route.segments
    .map((segment) => {
      const fromName = stationById(segment.from)?.name || segment.from;
      const toName = stationById(segment.to)?.name || segment.to;
      const transferText = segment.transferCost > 0 ? ` +${segment.transferCost}m transfer` : '';
      const terrainText = segment.terrainPenalty > 0 ? ` +${segment.terrainPenalty}m water` : '';
      return `<li>${escapeHtml(fromName)} -> ${escapeHtml(toName)} via ${escapeHtml(segment.line.toUpperCase())} (${segment.minutes}m, ${formatDistance(
        segment.distance
      )}${transferText}${terrainText})</li>`;
    })
    .join('');

  renderPolicySummary(bundle);
  renderResilience(analyzeRouteResilience(route), route, getNetworkReliability());
}

function formatDeltaMinutes(delta) {
  if (!Number.isFinite(delta) || delta <= 0) return 'no added delay';
  return `+${delta}m`;
}

function formatTransferDelta(delta) {
  if (!delta) return '';
  const absDelta = Math.abs(delta);
  const label = absDelta === 1 ? 'transfer' : 'transfers';
  return delta > 0 ? `, +${absDelta} ${label}` : `, -${absDelta} ${label}`;
}

function segmentDisplayName(segment) {
  const fromName = stationById(segment.from)?.name || segment.from;
  const toName = stationById(segment.to)?.name || segment.to;
  return `${fromName} -> ${toName}`;
}

function analyzeRouteResilience(route) {
  if (!route || !route.segments.length) {
    return null;
  }

  let bestBackup = null;
  let weakestLink = null;
  let disconnectedCount = 0;

  route.segments.forEach((segment) => {
    const alternate = computeRoute(route.startId, route.endId, {
      excludedSegmentIds: new Set([segment.id]),
      objective: route.objective,
    });
    const delay = alternate ? alternate.totalMinutes - route.totalMinutes : Number.POSITIVE_INFINITY;
    const disruption = {
      segment,
      alternate,
      delay,
    };

    if (alternate) {
      if (!bestBackup || alternate.totalMinutes < bestBackup.alternate.totalMinutes) {
        bestBackup = disruption;
      }
    } else {
      disconnectedCount += 1;
    }

    if (
      !weakestLink ||
      disruption.delay > weakestLink.delay ||
      (disruption.delay === weakestLink.delay &&
        !disruption.alternate &&
        Boolean(weakestLink.alternate))
    ) {
      weakestLink = disruption;
    }
  });

  return {
    bestBackup,
    weakestLink,
    disconnectedCount,
    routeSegmentCount: route.segments.length,
  };
}

function renderResilience(analysis, route, networkReliability) {
  const networkCoverage = Math.round((networkReliability?.minimumRetainedPairRatio ?? 1) * 100);
  const baselineCoverage = Math.round((networkReliability?.baselineCoverageRatio ?? 1) * 100);
  const criticalLabel = networkReliability?.criticalSegmentCount === 1 ? 'link' : 'links';

  if (networkReliability && !networkReliability.baselineConnected) {
    resilienceSummaryEl.textContent = `Network starts partially disconnected: ${baselineCoverage}% station-pair coverage; ${networkReliability.criticalSegmentCount} additional critical ${criticalLabel}.`;
  } else if (networkReliability?.nMinusOnePass) {
    resilienceSummaryEl.textContent = 'Network N-1 check passes: every station pair remains connected after any single link failure.';
  } else if (networkReliability) {
    resilienceSummaryEl.textContent = `Network N-1 check fails: ${networkReliability.criticalSegmentCount} critical ${criticalLabel}; worst outage retains ${networkCoverage}% of station pairs.`;
  }

  if (!analysis) {
    resilienceExposureEl.textContent = 'Exposure: -';
    resilienceBackupEl.textContent = 'Backup: -';
    resilienceWeakLinkEl.textContent = 'Weak link: -';
    return;
  }

  resilienceExposureEl.textContent = `Exposure: ${formatExposureMinutes(route.totalRiskExposure)} cumulative closure delay across the chosen path.`;

  if (!analysis.bestBackup || !analysis.bestBackup.alternate) {
    resilienceBackupEl.textContent = 'Backup: none available if any route link fails.';
  } else {
    const backup = analysis.bestBackup;
    const transferDelta = backup.alternate.transferCount - route.transferCount;
    const transferText = formatTransferDelta(transferDelta);
    resilienceBackupEl.textContent = `Backup: if ${segmentDisplayName(backup.segment)} fails, reroute in ${backup.alternate.totalMinutes}m (${formatDeltaMinutes(
      backup.delay
    )}${transferText}).`;
  }

  if (!analysis.weakestLink) {
    resilienceWeakLinkEl.textContent = 'Weak link: -';
    return;
  }

  if (!analysis.weakestLink.alternate) {
    resilienceWeakLinkEl.textContent = `Weak link: losing ${segmentDisplayName(
      analysis.weakestLink.segment
    )} disconnects the trip entirely.`;
    return;
  }

  const extraTransfers = analysis.weakestLink.alternate.transferCount - route.transferCount;
  const extraTransferText = formatTransferDelta(extraTransfers).replace(',', ' and');
  resilienceWeakLinkEl.textContent = `Weak link: losing ${segmentDisplayName(
    analysis.weakestLink.segment
  )} forces ${formatDeltaMinutes(analysis.weakestLink.delay)}${extraTransferText}.`;
}

function activeEdgeSet(route) {
  const set = new Set();
  if (!route) return set;

  route.segments.forEach((segment) => set.add(segment.id));

  return set;
}

function updateSelectionLabels() {
  selectedStopLabel.textContent = selectedStopId ? stationById(selectedStopId)?.name || selectedStopId : 'None';

  if (!selectedSegmentId || !segmentById(selectedSegmentId)) {
    selectedSegmentLabel.textContent = 'None';
    segmentCurveInput.value = '0';
    segmentCurveInput.disabled = true;
  } else {
    const segment = segmentById(selectedSegmentId);
    const fromName = stationById(segment.from)?.name || segment.from;
    const toName = stationById(segment.to)?.name || segment.to;
    const terrainInfo = segmentTerrainInfo(segment);
    selectedSegmentLabel.textContent = `${segment.line.toUpperCase()} ${fromName} -> ${toName}${
      terrainInfo.blocked ? ' (blocked)' : ''
    }`;
    segmentCurveInput.disabled = false;
    segmentCurveInput.value = String(Math.round(segment.curve || 0));
  }
}

function renderMap(route) {
  const activeStations = new Set(route ? route.stationPath : []);
  const activeEdges = activeEdgeSet(route);
  const terrainMarkup = terrain
    .map((shape) => {
      if (shape.type === 'obstacle') {
        return `<ellipse class="terrain-obstacle" cx="${shape.x}" cy="${shape.y}" rx="${shape.rx}" ry="${shape.ry}"></ellipse>`;
      }
      if (shape.type === 'lake') {
        return `<ellipse class="terrain-lake" cx="${shape.x}" cy="${shape.y}" rx="${shape.rx}" ry="${shape.ry}"></ellipse>`;
      }
      if (shape.type === 'river') {
        const controlX = (shape.x1 + shape.x2) / 2 + shape.curve;
        const controlY = (shape.y1 + shape.y2) / 2 - shape.curve * 0.2;
        return `<path class="terrain-river" d="M ${shape.x1} ${shape.y1} Q ${controlX} ${controlY} ${shape.x2} ${shape.y2}" style="stroke-width:${shape.width}"></path>`;
      }
      return '';
    })
    .join('');

  const edgeMarkup = segments
    .map((segment) => {
      const line = lineCatalog[segment.line] || { color: '#6b7280' };
      const classes = ['edge'];
      if (activeEdges.has(segment.id)) classes.push('active');
      if (selectedSegmentId === segment.id) classes.push('selected');
      if (segmentTerrainInfo(segment).blocked) classes.push('blocked');

      const fromName = stationById(segment.from)?.name || segment.from;
      const toName = stationById(segment.to)?.name || segment.to;
      return `<path class="${classes.join(' ')}" d="${segmentPathD(segment)}" stroke="${line.color}" data-segment-id="${segment.id}" role="button" tabindex="0" aria-label="${escapeHtml(
        `${segment.line} connection from ${fromName} to ${toName}`
      )}" />`;
    })
    .join('');

  const stationMarkup = stations
    .map((station) => {
      const classes = ['station'];
      if (activeStations.has(station.id)) classes.push('active');
      if (draggingStationId === station.id) classes.push('dragging');
      if (selectedStopId === station.id) classes.push('selected');

      return `
        <g>
          <circle class="${classes.join(' ')}" cx="${station.x}" cy="${station.y}" r="13" data-station-id="${station.id}" role="button" tabindex="0" aria-label="${escapeHtml(
            `Select ${station.name} stop`
          )}"></circle>
          <text class="station-label" x="${station.x + 16}" y="${station.y + 4}">${escapeHtml(station.name)}</text>
        </g>
      `;
    })
    .join('');

  networkSvg.innerHTML = `${terrainMarkup}${edgeMarkup}${stationMarkup}`;

  Array.from(networkSvg.querySelectorAll('[data-segment-id]')).forEach((line) => {
    line.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      handleSegmentInteraction(line.dataset.segmentId);
    });
    line.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      handleSegmentInteraction(line.dataset.segmentId);
    });
  });

  Array.from(networkSvg.querySelectorAll('[data-station-id]')).forEach((circle) => {
    circle.addEventListener('pointerdown', (event) => {
      event.stopPropagation();
      handleStationInteraction(circle.dataset.stationId, event.pointerId, circle);
    });
    circle.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      handleStationInteraction(circle.dataset.stationId, null, circle);
    });
  });
}

function svgCoordinates(event) {
  const point = networkSvg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(networkSvg.getScreenCTM().inverse());
}

function setMode(mode) {
  editMode = mode;
  connectAnchorId = null;

  modeDragButton.classList.toggle('active', mode === 'drag');
  modeConnectButton.classList.toggle('active', mode === 'connect');
  modeDeleteButton.classList.toggle('active', mode === 'delete');

  if (mode === 'drag') {
    editorStatusEl.textContent = 'Drag mode active: drag stops directly on the map.';
  } else if (mode === 'connect') {
    editorStatusEl.textContent = 'Connect mode active: click two stops to create a new segment.';
  } else {
    editorStatusEl.textContent = 'Delete mode active: click a line to remove that connection.';
  }

  renderMap(currentRoute);
}

function rerouteAndRender(autoMode) {
  const startId = startSelect.value;
  const endId = endSelect.value;

  currentRouteBundle = computeRouteBundle(startId, endId);
  currentRoute = currentRouteBundle.activeRoute;
  renderMetrics(currentRoute, currentRouteBundle);
  renderMap(currentRoute);
  updateSelectionLabels();

  if (!currentRoute) {
    statusEl.textContent = 'No valid route for current network.';
  } else {
    const startName = stationById(startId)?.name || startId;
    const endName = stationById(endId)?.name || endId;
    const networkDistance = segments.reduce((sum, segment) => sum + segmentDistance(segment), 0);

    statusEl.textContent = `${currentRoute.objectiveLabel} route from ${startName} to ${endName}. Network distance: ${formatDistance(networkDistance)}.`;
  }

}

function cleanupUnusedLines() {
  Object.keys(lineCatalog).forEach((lineName) => {
    const inUse = segments.some((segment) => segment.line === lineName);
    if (!inUse) {
      delete lineCatalog[lineName];
    }
  });
}

function removeRouteSegmentById(segmentId, fromDeleteMode = false) {
  const index = segments.findIndex((segment) => segment.id === segmentId);
  if (index === -1) return false;

  const removed = segments[index];
  segments.splice(index, 1);

  if (selectedSegmentId === segmentId) {
    selectedSegmentId = null;
  }

  cleanupUnusedLines();
  renderLegend();
  rerouteAndRender(true);

  editorStatusEl.textContent = fromDeleteMode
    ? `Deleted ${removed.line.toUpperCase()} connection from map.`
    : `Removed ${removed.line.toUpperCase()} selected connection.`;

  return true;
}

function removeSelectedStop() {
  if (!selectedStopId) {
    editorStatusEl.textContent = 'Select a stop on the map first.';
    return;
  }

  if (stations.length <= 2) {
    editorStatusEl.textContent = 'Keep at least two stops in the network.';
    return;
  }

  const stopId = selectedStopId;
  const stationIndex = stations.findIndex((station) => station.id === stopId);
  if (stationIndex === -1) return;

  const removedName = stations[stationIndex].name;
  stations.splice(stationIndex, 1);

  for (let i = segments.length - 1; i >= 0; i -= 1) {
    if (segments[i].from === stopId || segments[i].to === stopId) {
      segments.splice(i, 1);
    }
  }

  cleanupUnusedLines();
  syncRouteSelects();
  renderLegend();

  selectedStopId = null;
  selectedSegmentId = null;
  connectAnchorId = null;

  editorStatusEl.textContent = `Deleted stop: ${removedName}.`;
  rerouteAndRender(true);
}

function addStop() {
  const rawName = newStopInput.value.trim();
  if (!rawName) {
    editorStatusEl.textContent = 'Type a stop name first.';
    return;
  }

  const id = makeStationId(rawName);
  stations.push({
    id,
    name: rawName,
    x: 400 + Math.random() * 80 - 40,
    y: 260 + Math.random() * 80 - 40,
  });

  selectedStopId = id;
  syncRouteSelects();
  newStopInput.value = '';
  editorStatusEl.textContent = `Added stop: ${rawName}.`;

  rerouteAndRender(true);
}

function addObstacle() {
  terrain.push({
    id: nextTerrainId(),
    type: 'obstacle',
    x: randomBetween(120, 780),
    y: randomBetween(100, 460),
    rx: randomBetween(35, 70),
    ry: randomBetween(25, 60),
  });
  rerouteAndRender(true);
}

function addLake() {
  terrain.push({
    id: nextTerrainId(),
    type: 'lake',
    x: randomBetween(120, 780),
    y: randomBetween(100, 460),
    rx: randomBetween(45, 90),
    ry: randomBetween(30, 74),
  });
  rerouteAndRender(true);
}

function addRiver() {
  terrain.push({
    id: nextTerrainId(),
    type: 'river',
    x1: randomBetween(70, 210),
    y1: randomBetween(70, 500),
    x2: randomBetween(640, 840),
    y2: randomBetween(70, 500),
    curve: randomBetween(-130, 130),
    width: randomBetween(14, 24),
  });
  rerouteAndRender(true);
}

function clearTerrain() {
  terrain.length = 0;
  rerouteAndRender(true);
}

function randomLineName() {
  const names = Object.keys(lineCatalog);
  return names[Math.floor(Math.random() * names.length)];
}

function randomCity() {
  stations.length = 0;
  segments.length = 0;
  terrain.length = 0;

  const palette = {
    blue: { color: '#2563eb', speed: 24 },
    red: { color: '#dc2626', speed: 21 },
    green: { color: '#16a34a', speed: 22 },
    amber: { color: '#d97706', speed: 20 },
  };
  Object.keys(lineCatalog).forEach((line) => delete lineCatalog[line]);
  Object.assign(lineCatalog, palette);

  const count = 8 + Math.floor(Math.random() * 5);
  for (let i = 0; i < count; i += 1) {
    stations.push({
      id: `S${i + 1}`,
      name: `Stop ${i + 1}`,
      x: randomBetween(88, 812),
      y: randomBetween(86, 492),
    });
  }

  const obstacleCount = 2 + Math.floor(Math.random() * 3);
  const lakeCount = 1 + Math.floor(Math.random() * 2);
  const riverCount = 1 + Math.floor(Math.random() * 2);

  for (let i = 0; i < obstacleCount; i += 1) {
    terrain.push({
      id: nextTerrainId(),
      type: 'obstacle',
      x: randomBetween(120, 780),
      y: randomBetween(100, 460),
      rx: randomBetween(35, 70),
      ry: randomBetween(25, 60),
    });
  }
  for (let i = 0; i < lakeCount; i += 1) {
    terrain.push({
      id: nextTerrainId(),
      type: 'lake',
      x: randomBetween(120, 780),
      y: randomBetween(100, 460),
      rx: randomBetween(45, 90),
      ry: randomBetween(30, 74),
    });
  }
  for (let i = 0; i < riverCount; i += 1) {
    terrain.push({
      id: nextTerrainId(),
      type: 'river',
      x1: randomBetween(70, 210),
      y1: randomBetween(70, 500),
      x2: randomBetween(640, 840),
      y2: randomBetween(70, 500),
      curve: randomBetween(-130, 130),
      width: randomBetween(14, 24),
    });
  }

  const sortedStations = [...stations].sort((a, b) => a.x - b.x);
  for (let i = 1; i < sortedStations.length; i += 1) {
    segments.push({
      id: nextSegmentId(),
      from: sortedStations[i - 1].id,
      to: sortedStations[i].id,
      line: randomLineName(),
      curve: randomBetween(-45, 45),
    });
  }

  for (let i = 0; i < stations.length * 2; i += 1) {
    const a = stations[Math.floor(Math.random() * stations.length)];
    const b = stations[Math.floor(Math.random() * stations.length)];
    if (!a || !b || a.id === b.id) continue;

    const duplicate = segments.some((segment) => {
      const same = segment.from === a.id && segment.to === b.id;
      const reverse = segment.from === b.id && segment.to === a.id;
      return same || reverse;
    });
    if (duplicate) continue;

    segments.push({
      id: nextSegmentId(),
      from: a.id,
      to: b.id,
      line: randomLineName(),
      curve: randomBetween(-60, 60),
    });
  }

  selectedStopId = null;
  selectedSegmentId = null;
  connectAnchorId = null;

  syncRouteSelects();
  renderLegend();
  rerouteAndRender(true);
  editorStatusEl.textContent = 'Generated random city with terrain and curved routes.';
}

function createRouteSegment(from, to) {
  const lineName = lineNameInput.value.trim().toLowerCase();
  const color = lineColorInput.value;
  const speed = Number(lineSpeedInput.value);

  if (!from || !to || from === to) {
    editorStatusEl.textContent = 'Choose two different stops.';
    return false;
  }

  if (!lineName) {
    editorStatusEl.textContent = 'Provide a line name.';
    return false;
  }

  if (!Number.isFinite(speed) || speed <= 0) {
    editorStatusEl.textContent = 'Line speed must be a positive number.';
    return false;
  }

  const duplicate = segments.some((segment) => {
    const sameDirection = segment.from === from && segment.to === to;
    const reverseDirection = segment.from === to && segment.to === from;
    return (sameDirection || reverseDirection) && segment.line === lineName;
  });

  if (duplicate) {
    editorStatusEl.textContent = 'That connection already exists on this line.';
    return false;
  }

  lineCatalog[lineName] = { color, speed };
  const newSegment = { id: nextSegmentId(), from, to, line: lineName, curve: randomBetween(-32, 32) };
  segments.push(newSegment);
  selectedSegmentId = newSegment.id;

  renderLegend();
  rerouteAndRender(true);

  editorStatusEl.textContent = `Connected ${stationById(from)?.name} and ${stationById(to)?.name} on ${lineName.toUpperCase()}.`;
  return true;
}

function handleStationInteraction(stationId, pointerId, element) {
  selectedStopId = stationId;
  selectedSegmentId = null;
  updateSelectionLabels();

  if (editMode === 'drag') {
    if (pointerId === null) {
      editorStatusEl.textContent = `${stationById(stationId)?.name || 'Stop'} selected. Pointer drag changes its position.`;
      renderMap(currentRoute);
      return;
    }
    draggingStationId = stationId;
    dragMoved = false;
    element.setPointerCapture(pointerId);
    renderMap(currentRoute);
    return;
  }

  if (editMode === 'connect') {
    if (!connectAnchorId) {
      connectAnchorId = stationId;
      editorStatusEl.textContent = `Connect mode: anchor set to ${stationById(stationId)?.name}. Select a second stop.`;
    } else if (connectAnchorId === stationId) {
      connectAnchorId = null;
      editorStatusEl.textContent = 'Connect mode: anchor cleared. Select a first stop.';
    } else {
      const added = createRouteSegment(connectAnchorId, stationId);
      connectAnchorId = null;
      if (!added) {
        renderMap(currentRoute);
      }
    }
    return;
  }

  if (editMode === 'delete') {
    editorStatusEl.textContent = `Delete mode: selected stop ${stationById(stationId)?.name}. Use "Delete Selected Stop" to remove it.`;
    renderMap(currentRoute);
    return;
  }

  renderMap(currentRoute);
}

function handleSegmentInteraction(segmentId) {
  selectedSegmentId = segmentId;
  selectedStopId = null;
  updateSelectionLabels();

  if (editMode === 'delete') {
    removeRouteSegmentById(segmentId, true);
    return;
  }

  editorStatusEl.textContent = 'Connection selected. Use Delete Selected Link to remove it.';
  renderMap(currentRoute);
}

runButton.addEventListener('click', () => rerouteAndRender(false));
addStopButton.addEventListener('click', addStop);
addObstacleButton.addEventListener('click', addObstacle);
addLakeButton.addEventListener('click', addLake);
addRiverButton.addEventListener('click', addRiver);
clearTerrainButton.addEventListener('click', clearTerrain);
randomCityButton.addEventListener('click', randomCity);

modeDragButton.addEventListener('click', () => setMode('drag'));
modeConnectButton.addEventListener('click', () => setMode('connect'));
modeDeleteButton.addEventListener('click', () => setMode('delete'));

deleteSelectedStopButton.addEventListener('click', removeSelectedStop);
deleteSelectedSegmentButton.addEventListener('click', () => {
  if (!selectedSegmentId) {
    editorStatusEl.textContent = 'Select a connection on the map first.';
    return;
  }
  removeRouteSegmentById(selectedSegmentId, false);
});

startSelect.addEventListener('change', () => rerouteAndRender(true));
endSelect.addEventListener('change', () => rerouteAndRender(true));
objectiveSelect.addEventListener('change', () => {
  routeObjective = objectiveSelect.value;
  localStorage.setItem(OBJECTIVE_KEY, routeObjective);
  rerouteAndRender(false);
});

segmentCurveInput.addEventListener('input', () => {
  if (!selectedSegmentId) return;
  const segment = segmentById(selectedSegmentId);
  if (!segment) return;
  segment.curve = Number(segmentCurveInput.value);
  rerouteAndRender(true);
});

networkSvg.addEventListener('pointermove', (event) => {
  if (!draggingStationId || editMode !== 'drag') return;

  const station = stationById(draggingStationId);
  if (!station) return;

  const point = svgCoordinates(event);
  station.x = Math.max(24, Math.min(816, point.x));
  station.y = Math.max(24, Math.min(496, point.y));

  dragMoved = true;
  rerouteAndRender(true);
});

networkSvg.addEventListener('pointerup', () => {
  if (draggingStationId && dragMoved) {
    editorStatusEl.textContent = `Moved ${stationById(draggingStationId)?.name || 'stop'}; route and reliability metrics updated.`;
  }

  draggingStationId = null;
  dragMoved = false;
  rerouteAndRender(true);
});

networkSvg.addEventListener('pointerleave', () => {
  draggingStationId = null;
  dragMoved = false;
});

syncRouteSelects();
renderLegend();
setMode('drag');
rerouteAndRender(true);
statusEl.textContent = 'Drag stops to live-update travel time, transfers, and outage exposure.';
updateSelectionLabels();
