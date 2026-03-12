const nodeCountInput = document.getElementById('node-count');
const dampingInput = document.getElementById('damping');
const thresholdInput = document.getElementById('threshold');
const randomizeButton = document.getElementById('randomize-graph');
const injectPulseButton = document.getElementById('inject-pulse');
const toggleRunButton = document.getElementById('toggle-run');
const statusEl = document.getElementById('status');

const nodeCountLabel = document.getElementById('node-count-label');
const dampingLabel = document.getElementById('damping-label');
const thresholdLabel = document.getElementById('threshold-label');

const metricActive = document.getElementById('metric-active');
const metricPeak = document.getElementById('metric-peak');
const metricEnergy = document.getElementById('metric-energy');
const svg = document.getElementById('network');

let nodes = [];
let edges = [];
let running = true;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomGraph(nodeCount) {
  const graphNodes = [];
  const graphEdges = [];
  const radius = 205;
  const cx = 470;
  const cy = 280;

  for (let i = 0; i < nodeCount; i += 1) {
    const angle = (i / nodeCount) * Math.PI * 2;
    graphNodes.push({
      id: `N${i + 1}`,
      x: cx + Math.cos(angle) * radius + randomBetween(-26, 26),
      y: cy + Math.sin(angle) * radius + randomBetween(-26, 26),
      signal: randomBetween(0.05, 0.35),
    });
  }

  for (let from = 0; from < nodeCount; from += 1) {
    const connectionCount = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < connectionCount; i += 1) {
      const to = Math.floor(Math.random() * nodeCount);
      if (to === from) continue;
      graphEdges.push({
        from,
        to,
        weight: randomBetween(0.2, 1.15),
      });
    }
  }

  return { graphNodes, graphEdges };
}

function updateLabels() {
  nodeCountLabel.textContent = `${nodeCountInput.value} nodes`;
  dampingLabel.textContent = Number(dampingInput.value).toFixed(2);
  thresholdLabel.textContent = Number(thresholdInput.value).toFixed(2);
}

function signalColor(signal) {
  const clamped = clamp(signal, 0, 1.2);
  const hue = 220 - clamped * 150;
  const light = 72 - clamped * 24;
  return `hsl(${hue} 72% ${light}%)`;
}

function edgeColor(weight) {
  const hue = 210 + weight * 40;
  return `hsl(${hue} 66% 62%)`;
}

function draw() {
  const edgeMarkup = edges
    .map((edge) => {
      const from = nodes[edge.from];
      const to = nodes[edge.to];
      if (!from || !to) return '';
      const mx = (from.x + to.x) / 2 + (to.y - from.y) * 0.09;
      const my = (from.y + to.y) / 2 - (to.x - from.x) * 0.09;
      return `<path class="edge" d="M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}" stroke="${edgeColor(
        edge.weight
      )}" />`;
    })
    .join('');

  const nodeMarkup = nodes
    .map((node) => {
      const radius = 12 + node.signal * 9;
      return `
        <g>
          <circle class="node" cx="${node.x}" cy="${node.y}" r="${radius}" fill="${signalColor(node.signal)}"></circle>
          <text class="node-label" x="${node.x}" y="${node.y}">${node.id}</text>
        </g>
      `;
    })
    .join('');

  svg.innerHTML = `${edgeMarkup}${nodeMarkup}`;
}

function tick() {
  const damping = Number(dampingInput.value);
  const threshold = Number(thresholdInput.value);
  const next = nodes.map((node) => node.signal * damping * 0.62);

  edges.forEach((edge) => {
    const source = nodes[edge.from];
    if (!source) return;
    next[edge.to] += source.signal * edge.weight * damping * 0.48;
  });

  for (let i = 0; i < nodes.length; i += 1) {
    const boost = next[i] > threshold ? 0.05 : 0;
    nodes[i].signal = clamp(next[i] + boost, 0, 1.2);
  }

  const active = nodes.filter((node) => node.signal >= threshold).length;
  const peak = Math.max(...nodes.map((node) => node.signal), 0);
  const energy = nodes.reduce((sum, node) => sum + node.signal, 0);

  metricActive.textContent = String(active);
  metricPeak.textContent = peak.toFixed(2);
  metricEnergy.textContent = energy.toFixed(2);

  draw();
}

function loop() {
  if (running) {
    tick();
  }
  requestAnimationFrame(loop);
}

function createGraph() {
  const count = Number(nodeCountInput.value);
  const generated = randomGraph(count);
  nodes = generated.graphNodes;
  edges = generated.graphEdges;
  statusEl.textContent = `Generated graph with ${count} nodes and ${edges.length} directed links.`;
  draw();
}

function injectPulse() {
  if (!nodes.length) return;
  const index = Math.floor(Math.random() * nodes.length);
  nodes[index].signal = 1.2;
  statusEl.textContent = `Pulse injected at ${nodes[index].id}.`;
  draw();
}

randomizeButton.addEventListener('click', createGraph);
injectPulseButton.addEventListener('click', injectPulse);

toggleRunButton.addEventListener('click', () => {
  running = !running;
  toggleRunButton.textContent = running ? 'Pause' : 'Resume';
  statusEl.textContent = running ? 'Running continuous propagation.' : 'Simulation paused.';
});

nodeCountInput.addEventListener('input', () => {
  updateLabels();
  createGraph();
});

dampingInput.addEventListener('input', updateLabels);
thresholdInput.addEventListener('input', updateLabels);

updateLabels();
createGraph();
loop();
