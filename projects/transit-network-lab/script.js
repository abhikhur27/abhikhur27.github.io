const stations = [
  { id: 'UN', name: 'Union', x: 78, y: 230 },
  { id: 'MU', name: 'Museum', x: 186, y: 118 },
  { id: 'CE', name: 'Central', x: 330, y: 230 },
  { id: 'HA', name: 'Harbor', x: 480, y: 332 },
  { id: 'AP', name: 'Airport', x: 650, y: 230 },
  { id: 'TE', name: 'Tech Park', x: 330, y: 78 },
  { id: 'ST', name: 'Stadium', x: 330, y: 392 },
  { id: 'RI', name: 'Riverfront', x: 480, y: 126 },
];

const edges = [
  { from: 'UN', to: 'CE', line: 'blue', time: 6 },
  { from: 'CE', to: 'AP', line: 'blue', time: 7 },
  { from: 'AP', to: 'RI', line: 'blue', time: 4 },
  { from: 'MU', to: 'CE', line: 'red', time: 5 },
  { from: 'CE', to: 'HA', line: 'red', time: 6 },
  { from: 'MU', to: 'RI', line: 'red', time: 6 },
  { from: 'TE', to: 'CE', line: 'green', time: 4 },
  { from: 'CE', to: 'ST', line: 'green', time: 5 },
  { from: 'ST', to: 'HA', line: 'green', time: 4 },
  { from: 'TE', to: 'MU', line: 'green', time: 4 },
];

const lineColors = {
  blue: '#2563eb',
  red: '#dc2626',
  green: '#16a34a',
};

const transferPenalty = 2;
const adjacency = new Map();

const startSelect = document.getElementById('start-station');
const endSelect = document.getElementById('end-station');
const runButton = document.getElementById('run-route');
const statusEl = document.getElementById('status');
const stepsEl = document.getElementById('route-steps');
const minutesEl = document.getElementById('metric-minutes');
const stopsEl = document.getElementById('metric-stops');
const transfersEl = document.getElementById('metric-transfers');
const networkSvg = document.getElementById('network');

stations.forEach((station) => {
  adjacency.set(station.id, []);
});

edges.forEach((edge) => {
  adjacency.get(edge.from).push(edge);
  adjacency.get(edge.to).push({ ...edge, from: edge.to, to: edge.from });
});

function stationById(id) {
  return stations.find((station) => station.id === id);
}

function populateSelects() {
  stations.forEach((station, index) => {
    const optionStart = document.createElement('option');
    optionStart.value = station.id;
    optionStart.textContent = station.name;

    const optionEnd = document.createElement('option');
    optionEnd.value = station.id;
    optionEnd.textContent = station.name;

    startSelect.appendChild(optionStart);
    endSelect.appendChild(optionEnd);

    if (index === 0) startSelect.value = station.id;
    if (index === stations.length - 1) endSelect.value = station.id;
  });
}

function keyFor(stationId, line) {
  return `${stationId}|${line || 'none'}`;
}

function dijkstra(startId, endId) {
  const startKey = keyFor(startId, null);
  const dist = new Map([[startKey, 0]]);
  const previous = new Map();
  const queue = [{ key: startKey, stationId: startId, line: null, cost: 0 }];

  let bestEnd = null;

  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift();

    const currentBest = dist.get(current.key);
    if (current.cost > currentBest) continue;

    if (current.stationId === endId) {
      bestEnd = current;
      break;
    }

    const neighbors = adjacency.get(current.stationId) || [];
    neighbors.forEach((edge) => {
      const transferCost = current.line && current.line !== edge.line ? transferPenalty : 0;
      const nextCost = current.cost + edge.time + transferCost;
      const nextKey = keyFor(edge.to, edge.line);

      if (!dist.has(nextKey) || nextCost < dist.get(nextKey)) {
        dist.set(nextKey, nextCost);
        previous.set(nextKey, {
          prevKey: current.key,
          from: edge.from,
          to: edge.to,
          line: edge.line,
          time: edge.time,
          transferCost,
        });

        queue.push({
          key: nextKey,
          stationId: edge.to,
          line: edge.line,
          cost: nextCost,
        });
      }
    });
  }

  if (!bestEnd) {
    return null;
  }

  const segments = [];
  let cursorKey = bestEnd.key;

  while (cursorKey !== startKey) {
    const step = previous.get(cursorKey);
    if (!step) break;
    segments.push(step);
    cursorKey = step.prevKey;
  }

  segments.reverse();

  const transfers = segments.reduce((count, segment) => count + (segment.transferCost > 0 ? 1 : 0), 0);
  const stationPath = [startId, ...segments.map((segment) => segment.to)];

  return {
    totalMinutes: bestEnd.cost,
    transfers,
    stationPath,
    segments,
  };
}

function renderNetwork(route = null) {
  const activeStationSet = new Set(route ? route.stationPath : []);
  const activeEdgeSet = new Set();

  if (route) {
    route.segments.forEach((segment) => {
      activeEdgeSet.add([segment.from, segment.to, segment.line].sort().join('|'));
    });
  }

  const edgeSvg = edges
    .map((edge) => {
      const from = stationById(edge.from);
      const to = stationById(edge.to);
      const edgeKey = [edge.from, edge.to, edge.line].sort().join('|');
      const activeClass = activeEdgeSet.has(edgeKey) ? 'active' : '';

      return `<line class="edge ${activeClass}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="${lineColors[edge.line]}" />`;
    })
    .join('');

  const stationSvg = stations
    .map((station) => {
      const activeClass = activeStationSet.has(station.id) ? 'active' : '';
      return `
        <g>
          <circle class="station ${activeClass}" cx="${station.x}" cy="${station.y}" r="12"></circle>
          <text class="station-label" x="${station.x + 15}" y="${station.y + 4}">${station.name}</text>
        </g>
      `;
    })
    .join('');

  networkSvg.innerHTML = `${edgeSvg}${stationSvg}`;
}

function renderRouteDetails(route) {
  minutesEl.textContent = `${route.totalMinutes}m`;
  stopsEl.textContent = String(route.stationPath.length - 1);
  transfersEl.textContent = String(route.transfers);

  stepsEl.innerHTML = '';
  route.segments.forEach((segment, index) => {
    const fromName = stationById(segment.from).name;
    const toName = stationById(segment.to).name;

    const step = document.createElement('li');
    const transferText = segment.transferCost > 0 ? ` +${segment.transferCost}m transfer` : '';
    step.textContent = `${index + 1}. ${fromName} -> ${toName} via ${segment.line.toUpperCase()} (${segment.time}m${transferText})`;
    stepsEl.appendChild(step);
  });
}

function clearRouteDetails() {
  minutesEl.textContent = '-';
  stopsEl.textContent = '-';
  transfersEl.textContent = '-';
  stepsEl.innerHTML = '';
}

function runRoute() {
  const startId = startSelect.value;
  const endId = endSelect.value;

  if (startId === endId) {
    statusEl.textContent = 'Start and destination must be different stations.';
    clearRouteDetails();
    renderNetwork();
    return;
  }

  const result = dijkstra(startId, endId);
  if (!result) {
    statusEl.textContent = 'No route found.';
    clearRouteDetails();
    renderNetwork();
    return;
  }

  const startName = stationById(startId).name;
  const endName = stationById(endId).name;

  statusEl.textContent = `Fastest route from ${startName} to ${endName}.`;
  renderRouteDetails(result);
  renderNetwork(result);
}

runButton.addEventListener('click', runRoute);

populateSelects();
renderNetwork();
statusEl.textContent = 'Select two stations and compute a route.';