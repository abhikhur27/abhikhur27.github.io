const startSelect = document.getElementById('start-station');
const endSelect = document.getElementById('end-station');
const runButton = document.getElementById('run-route');
const statusEl = document.getElementById('status');

const minutesEl = document.getElementById('metric-minutes');
const stopsEl = document.getElementById('metric-stops');
const transfersEl = document.getElementById('metric-transfers');
const stepsEl = document.getElementById('route-steps');

const newStopInput = document.getElementById('new-stop-name');
const addStopButton = document.getElementById('add-stop');
const lineFromSelect = document.getElementById('line-from');
const lineToSelect = document.getElementById('line-to');
const lineNameInput = document.getElementById('line-name');
const lineColorInput = document.getElementById('line-color');
const lineSpeedInput = document.getElementById('line-speed');
const addLineButton = document.getElementById('add-line');
const editorStatusEl = document.getElementById('editor-status');

const newChallengeButton = document.getElementById('new-challenge');
const challengeTextEl = document.getElementById('challenge-text');
const challengeScoreEl = document.getElementById('challenge-score');

const networkSvg = document.getElementById('network');
const legendEl = document.getElementById('line-legend');

let stationCounter = 0;
let segmentCounter = 0;

const transferPenaltyMinutes = 2;

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
let draggingStationId = null;
let challenge = null;
let challengeScore = Number(localStorage.getItem('transit_lab_score') || '0');

challengeScoreEl.textContent = String(challengeScore);

function nextSegmentId() {
  segmentCounter += 1;
  return `seg-${segmentCounter}`;
}

function stationById(id) {
  return stations.find((station) => station.id === id);
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

function segmentDistance(segment) {
  const from = stationById(segment.from);
  const to = stationById(segment.to);
  if (!from || !to) return 0;
  const dx = from.x - to.x;
  const dy = from.y - to.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function segmentMinutes(segment) {
  const lineInfo = lineCatalog[segment.line] || { speed: 20 };
  const distance = segmentDistance(segment);
  return Math.max(1, Math.round(distance / lineInfo.speed + 1));
}

function populateSelect(selectElement) {
  const previous = selectElement.value;
  selectElement.innerHTML = '';

  stations.forEach((station) => {
    const option = document.createElement('option');
    option.value = station.id;
    option.textContent = station.name;
    selectElement.appendChild(option);
  });

  if (previous && stations.some((station) => station.id === previous)) {
    selectElement.value = previous;
  }
}

function syncAllSelects() {
  [startSelect, endSelect, lineFromSelect, lineToSelect].forEach(populateSelect);

  if (!startSelect.value && stations[0]) {
    startSelect.value = stations[0].id;
  }

  if (!endSelect.value && stations[1]) {
    endSelect.value = stations[1].id;
  }
}

function lineBadge(lineName) {
  const line = lineCatalog[lineName];
  if (!line) return '';
  return `<span><i style="background:${line.color}"></i>${lineName.toUpperCase()} (${line.speed}px/min)</span>`;
}

function renderLegend() {
  legendEl.innerHTML = Object.keys(lineCatalog)
    .sort()
    .map(lineBadge)
    .join('');
}

function buildAdjacency() {
  const adjacency = new Map();
  stations.forEach((station) => {
    adjacency.set(station.id, []);
  });

  segments.forEach((segment) => {
    const time = segmentMinutes(segment);
    adjacency.get(segment.from).push({ ...segment, to: segment.to, minutes: time });
    adjacency.get(segment.to).push({ ...segment, from: segment.to, to: segment.from, minutes: time });
  });

  return adjacency;
}

function stateKey(stationId, line) {
  return `${stationId}|${line || 'none'}`;
}

function computeRoute(startId, endId) {
  if (!startId || !endId || startId === endId) return null;

  const adjacency = buildAdjacency();
  const startKey = stateKey(startId, null);

  const distances = new Map([[startKey, 0]]);
  const previous = new Map();
  const queue = [{ key: startKey, stationId: startId, line: null, cost: 0 }];
  let bestEndState = null;

  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift();

    if (current.cost > distances.get(current.key)) continue;

    if (current.stationId === endId) {
      bestEndState = current;
      break;
    }

    const neighbors = adjacency.get(current.stationId) || [];
    neighbors.forEach((edge) => {
      const transferCost = current.line && current.line !== edge.line ? transferPenaltyMinutes : 0;
      const newCost = current.cost + edge.minutes + transferCost;
      const nextKey = stateKey(edge.to, edge.line);

      if (!distances.has(nextKey) || newCost < distances.get(nextKey)) {
        distances.set(nextKey, newCost);
        previous.set(nextKey, {
          prevKey: current.key,
          from: edge.from,
          to: edge.to,
          line: edge.line,
          minutes: edge.minutes,
          transferCost,
        });

        queue.push({ key: nextKey, stationId: edge.to, line: edge.line, cost: newCost });
      }
    });
  }

  if (!bestEndState) return null;

  const routeSegments = [];
  let cursor = bestEndState.key;

  while (cursor !== startKey) {
    const step = previous.get(cursor);
    if (!step) break;
    routeSegments.push(step);
    cursor = step.prevKey;
  }

  routeSegments.reverse();

  const stationPath = [startId, ...routeSegments.map((segment) => segment.to)];
  const transferCount = routeSegments.reduce((count, segment) => count + (segment.transferCost > 0 ? 1 : 0), 0);

  return {
    startId,
    endId,
    totalMinutes: bestEndState.cost,
    transferCount,
    stationPath,
    segments: routeSegments,
  };
}

function renderMetrics(route) {
  if (!route) {
    minutesEl.textContent = '-';
    stopsEl.textContent = '-';
    transfersEl.textContent = '-';
    stepsEl.innerHTML = '';
    return;
  }

  minutesEl.textContent = `${route.totalMinutes}m`;
  stopsEl.textContent = String(route.stationPath.length - 1);
  transfersEl.textContent = String(route.transferCount);

  stepsEl.innerHTML = route.segments
    .map((segment, index) => {
      const fromName = stationById(segment.from)?.name || segment.from;
      const toName = stationById(segment.to)?.name || segment.to;
      const transferText = segment.transferCost > 0 ? ` +${segment.transferCost}m transfer` : '';
      return `<li>${index + 1}. ${fromName} -> ${toName} via ${segment.line.toUpperCase()} (${segment.minutes}m${transferText})</li>`;
    })
    .join('');
}

function activeEdgeSet(route) {
  const set = new Set();
  if (!route) return set;

  route.segments.forEach((segment) => {
    const edgeKey = [segment.from, segment.to, segment.line].sort().join('|');
    set.add(edgeKey);
  });

  return set;
}

function renderMap(route) {
  const activeStations = new Set(route ? route.stationPath : []);
  const activeEdges = activeEdgeSet(route);

  const edgeMarkup = segments
    .map((segment) => {
      const from = stationById(segment.from);
      const to = stationById(segment.to);
      if (!from || !to) return '';

      const line = lineCatalog[segment.line] || { color: '#6b7280' };
      const key = [segment.from, segment.to, segment.line].sort().join('|');
      const activeClass = activeEdges.has(key) ? 'active' : '';

      return `<line class="edge ${activeClass}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${line.color}" data-segment-id="${segment.id}" />`;
    })
    .join('');

  const stationMarkup = stations
    .map((station) => {
      const activeClass = activeStations.has(station.id) ? 'active' : '';
      const draggingClass = draggingStationId === station.id ? 'dragging' : '';
      return `
        <g>
          <circle class="station ${activeClass} ${draggingClass}" cx="${station.x}" cy="${station.y}" r="13" data-station-id="${station.id}"></circle>
          <text class="station-label" x="${station.x + 16}" y="${station.y + 4}">${station.name}</text>
        </g>
      `;
    })
    .join('');

  networkSvg.innerHTML = `${edgeMarkup}${stationMarkup}`;

  Array.from(networkSvg.querySelectorAll('[data-station-id]')).forEach((circle) => {
    circle.addEventListener('pointerdown', (event) => {
      draggingStationId = circle.dataset.stationId;
      circle.setPointerCapture(event.pointerId);
    });
  });
}

function svgCoordinates(event) {
  const point = networkSvg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;
  return point.matrixTransform(networkSvg.getScreenCTM().inverse());
}

function rerouteAndRender(autoMode) {
  const startId = startSelect.value;
  const endId = endSelect.value;

  currentRoute = computeRoute(startId, endId);
  renderMetrics(currentRoute);
  renderMap(currentRoute);

  if (!currentRoute) {
    statusEl.textContent = 'No valid route for current network.';
  } else if (!autoMode) {
    const startName = stationById(startId)?.name || startId;
    const endName = stationById(endId)?.name || endId;
    statusEl.textContent = `Fastest route from ${startName} to ${endName}.`;
  }

  evaluateChallenge(currentRoute);
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
    x: 400 + Math.random() * 90 - 45,
    y: 260 + Math.random() * 90 - 45,
  });

  syncAllSelects();
  newStopInput.value = '';
  editorStatusEl.textContent = `Added stop: ${rawName}.`;
  rerouteAndRender(true);
}

function addLineSegment() {
  const from = lineFromSelect.value;
  const to = lineToSelect.value;
  const lineName = lineNameInput.value.trim().toLowerCase();
  const color = lineColorInput.value;
  const speed = Number(lineSpeedInput.value);

  if (!from || !to || from === to) {
    editorStatusEl.textContent = 'Select two different stops for a line segment.';
    return;
  }

  if (!lineName) {
    editorStatusEl.textContent = 'Provide a line name.';
    return;
  }

  if (!Number.isFinite(speed) || speed <= 0) {
    editorStatusEl.textContent = 'Line speed must be a positive number.';
    return;
  }

  const duplicate = segments.some((segment) => {
    const sameDirection = segment.from === from && segment.to === to;
    const reverseDirection = segment.from === to && segment.to === from;
    return (sameDirection || reverseDirection) && segment.line === lineName;
  });

  if (duplicate) {
    editorStatusEl.textContent = 'That segment already exists for this line.';
    return;
  }

  lineCatalog[lineName] = { color, speed };
  segments.push({ id: nextSegmentId(), from, to, line: lineName });

  editorStatusEl.textContent = `Added ${lineName.toUpperCase()} segment.`;
  renderLegend();
  rerouteAndRender(true);
}

function randomPair() {
  if (stations.length < 2) return null;
  const first = Math.floor(Math.random() * stations.length);
  let second = Math.floor(Math.random() * stations.length);
  while (second === first) {
    second = Math.floor(Math.random() * stations.length);
  }
  return [stations[first].id, stations[second].id];
}

function newChallenge() {
  const pair = randomPair();
  if (!pair) return;

  const [startId, endId] = pair;
  startSelect.value = startId;
  endSelect.value = endId;

  const baseline = computeRoute(startId, endId);
  if (!baseline) {
    challengeTextEl.textContent = 'Challenge generation failed (no route). Edit the network and retry.';
    return;
  }

  challenge = {
    startId,
    endId,
    targetMinutes: Math.max(4, baseline.totalMinutes - (2 + Math.floor(Math.random() * 4))),
    maxTransfers: baseline.transferCount,
    completed: false,
  };

  challengeTextEl.textContent = `Challenge: ${stationById(startId).name} -> ${stationById(endId).name}. Keep total <= ${
    challenge.targetMinutes
  }m and transfers <= ${challenge.maxTransfers}.`;

  rerouteAndRender(true);
}

function evaluateChallenge(route) {
  if (!challenge || challenge.completed || !route) return;

  if (route.startId !== challenge.startId || route.endId !== challenge.endId) return;

  if (route.totalMinutes <= challenge.targetMinutes && route.transferCount <= challenge.maxTransfers) {
    challenge.completed = true;
    challengeScore += 1;
    localStorage.setItem('transit_lab_score', String(challengeScore));
    challengeScoreEl.textContent = String(challengeScore);

    challengeTextEl.textContent = `Solved: ${route.totalMinutes}m, ${route.transferCount} transfers. Nice optimization.`;
  }
}

runButton.addEventListener('click', () => rerouteAndRender(false));
addStopButton.addEventListener('click', addStop);
addLineButton.addEventListener('click', addLineSegment);
newChallengeButton.addEventListener('click', newChallenge);
startSelect.addEventListener('change', () => rerouteAndRender(true));
endSelect.addEventListener('change', () => rerouteAndRender(true));

networkSvg.addEventListener('pointermove', (event) => {
  if (!draggingStationId) return;

  const station = stationById(draggingStationId);
  if (!station) return;

  const point = svgCoordinates(event);
  station.x = Math.max(24, Math.min(816, point.x));
  station.y = Math.max(24, Math.min(496, point.y));

  rerouteAndRender(true);
});

networkSvg.addEventListener('pointerup', () => {
  draggingStationId = null;
  rerouteAndRender(true);
});

networkSvg.addEventListener('pointerleave', () => {
  draggingStationId = null;
});

syncAllSelects();
renderLegend();
rerouteAndRender(true);
statusEl.textContent = 'Drag any stop to live-update route time and transfers.';
challengeTextEl.textContent = 'Press "New Challenge" to generate an optimization goal.';