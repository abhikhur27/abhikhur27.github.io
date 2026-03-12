const controls = {
  length: document.getElementById('length'),
  trains: document.getElementById('trains'),
  speed: document.getElementById('speed'),
  dwell: document.getElementById('dwell'),
};

const labels = {
  length: document.getElementById('length-label'),
  trains: document.getElementById('trains-label'),
  speed: document.getElementById('speed-label'),
  dwell: document.getElementById('dwell-label'),
};

const roundTripEl = document.getElementById('roundtrip');
const headwayEl = document.getElementById('headway');
const waitEl = document.getElementById('wait');
const tphEl = document.getElementById('tph');
const pphEl = document.getElementById('pph');
const insightEl = document.getElementById('insight');
const challengeEl = document.getElementById('challenge');
const newChallengeBtn = document.getElementById('new-challenge');

const canvas = document.getElementById('corridor-canvas');
const ctx = canvas.getContext('2d');
const spacingEl = document.getElementById('sim-spacing');
const toggleAnimationBtn = document.getElementById('toggle-animation');
const simSpeedInput = document.getElementById('sim-speed');
const simSpeedLabel = document.getElementById('sim-speed-label');

let challenge = null;
const carCapacity = 180;
const carsPerTrain = 6;

let latestMetrics = null;
let animationRunning = true;
let animationPhase = 0;
let lastFrameTime = performance.now();

function fmt(num, unit = '') {
  return `${num.toFixed(1)}${unit}`;
}

function currentInput() {
  return {
    lengthKm: Number(controls.length.value),
    trains: Number(controls.trains.value),
    speedKmh: Number(controls.speed.value),
    dwellSec: Number(controls.dwell.value),
  };
}

function computeMetrics({ lengthKm, trains, speedKmh, dwellSec }) {
  const oneWayRunMin = (lengthKm / speedKmh) * 60;
  const stopsPerDirection = Math.max(6, Math.round(lengthKm / 2));
  const oneWayDwellMin = (stopsPerDirection * dwellSec) / 60;
  const turnbackMin = 3.5;
  const roundTripMin = (oneWayRunMin + oneWayDwellMin + turnbackMin) * 2;

  const headwayMin = roundTripMin / trains;
  const expectedWaitMin = headwayMin / 2;
  const tphPerDirection = 60 / headwayMin;
  const pphpd = tphPerDirection * carsPerTrain * carCapacity;

  return {
    roundTripMin,
    headwayMin,
    expectedWaitMin,
    tphPerDirection,
    pphpd,
    stopsPerDirection,
  };
}

function buildInsight(metrics) {
  if (metrics.expectedWaitMin <= 3 && metrics.pphpd >= 14000) {
    return 'High-frequency and high-capacity profile. This behaves like a premium rapid corridor.';
  }

  if (metrics.expectedWaitMin > 6) {
    return 'Waiting time is dominating the user experience. Add trains or reduce cycle time.';
  }

  if (metrics.pphpd < 9000) {
    return 'Throughput is constrained. Consider larger consists or tighter dispatch intervals.';
  }

  return 'Balanced profile. Next leverage point is dwell-time discipline at busy stations.';
}

function evaluateChallenge(metrics) {
  if (!challenge || challenge.completed) return;

  if (metrics.expectedWaitMin <= challenge.maxWait && metrics.pphpd >= challenge.minCapacity) {
    challenge.completed = true;
    challengeEl.textContent = `Challenge cleared: wait ${metrics.expectedWaitMin.toFixed(2)} min, capacity ${Math.round(
      metrics.pphpd
    )} pphpd.`;
  }
}

function drawBackground(width, height, lineY) {
  ctx.fillStyle = '#0f1420';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#263049';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(36, lineY);
  ctx.lineTo(width - 36, lineY);
  ctx.stroke();

  ctx.strokeStyle = '#1f283d';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(36, lineY - 20);
  ctx.lineTo(width - 36, lineY - 20);
  ctx.moveTo(36, lineY + 20);
  ctx.lineTo(width - 36, lineY + 20);
  ctx.stroke();
}

function drawStations(width, lineY, stationCount) {
  const startX = 50;
  const endX = width - 50;
  const span = endX - startX;

  for (let i = 0; i < stationCount; i += 1) {
    const ratio = i / Math.max(1, stationCount - 1);
    const x = startX + span * ratio;

    ctx.fillStyle = '#9aa7c7';
    ctx.beginPath();
    ctx.arc(x, lineY, 5, 0, Math.PI * 2);
    ctx.fill();

    if (i % 2 === 0) {
      ctx.fillStyle = '#6f7e9f';
      ctx.font = '10px JetBrains Mono';
      ctx.fillText(String(i + 1), x - 3, lineY + 18);
    }
  }
}

function loopPosition(trainIndex, trainCount, phase, lineLengthPx) {
  const offset = (trainIndex / trainCount) * 2 * lineLengthPx;
  return (phase + offset) % (2 * lineLengthPx);
}

function drawTrain(x, y, direction) {
  ctx.save();
  ctx.translate(x, y);

  if (direction === -1) {
    ctx.scale(-1, 1);
  }

  ctx.fillStyle = '#d7defe';
  ctx.fillRect(-11, -6, 22, 12);
  ctx.fillStyle = '#7f93c4';
  ctx.fillRect(-7, -4, 4, 8);
  ctx.fillRect(-1, -4, 4, 8);
  ctx.fillRect(5, -4, 4, 8);

  ctx.restore();
}

function drawSimulation(input, metrics) {
  const width = canvas.width;
  const height = canvas.height;
  const lineY = Math.floor(height / 2);
  const startX = 50;
  const endX = width - 50;
  const lineLengthPx = endX - startX;

  drawBackground(width, height, lineY);
  drawStations(width, lineY, metrics.stopsPerDirection);

  const secondsPerLoop = metrics.roundTripMin * 60;
  const pxPerSecond = (2 * lineLengthPx) / Math.max(1, secondsPerLoop);
  const speedFactor = Number(simSpeedInput.value);
  const effectivePxPerSecond = pxPerSecond * speedFactor;

  spacingEl.textContent = `${(metrics.headwayMin * 60).toFixed(0)}s headway | ${Math.round(lineLengthPx / input.trains)}px average spacing`;

  for (let i = 0; i < input.trains; i += 1) {
    const distance = loopPosition(i, input.trains, animationPhase, lineLengthPx);
    let x;
    let direction;

    if (distance <= lineLengthPx) {
      x = startX + distance;
      direction = 1;
    } else {
      x = endX - (distance - lineLengthPx);
      direction = -1;
    }

    const sway = Math.sin((animationPhase + i * 28) / 40) * 1.6;
    drawTrain(x, lineY + sway, direction);
  }

  ctx.fillStyle = '#7d8ba9';
  ctx.font = '11px JetBrains Mono';
  ctx.fillText(`Round trip ${metrics.roundTripMin.toFixed(1)} min`, 12, 16);
  ctx.fillText(`Animation speed ~ ${effectivePxPerSecond.toFixed(1)} px/s`, width - 214, 16);
}

function render() {
  const input = currentInput();
  const metrics = computeMetrics(input);
  latestMetrics = { input, metrics };

  labels.length.textContent = String(input.lengthKm);
  labels.trains.textContent = String(input.trains);
  labels.speed.textContent = String(input.speedKmh);
  labels.dwell.textContent = String(input.dwellSec);

  roundTripEl.textContent = fmt(metrics.roundTripMin, ' min');
  headwayEl.textContent = fmt(metrics.headwayMin, ' min');
  waitEl.textContent = fmt(metrics.expectedWaitMin, ' min');
  tphEl.textContent = fmt(metrics.tphPerDirection, ' tph');
  pphEl.textContent = `${Math.round(metrics.pphpd).toLocaleString()} pphpd`;

  insightEl.textContent = buildInsight(metrics);
  evaluateChallenge(metrics);
  drawSimulation(input, metrics);
}

function animate(now) {
  const delta = now - lastFrameTime;
  lastFrameTime = now;

  if (animationRunning && latestMetrics) {
    const loopPx = (canvas.width - 100) * 2;
    const loopSeconds = latestMetrics.metrics.roundTripMin * 60;
    const speedFactor = Number(simSpeedInput.value);
    const pxPerMs = (loopPx / Math.max(1000, loopSeconds * 1000)) * speedFactor;
    animationPhase = (animationPhase + delta * pxPerMs) % loopPx;

    drawSimulation(latestMetrics.input, latestMetrics.metrics);
  }

  requestAnimationFrame(animate);
}

function newChallenge() {
  challenge = {
    maxWait: 2.5 + Math.random() * 2.5,
    minCapacity: 12000 + Math.floor(Math.random() * 4500),
    completed: false,
  };

  challengeEl.textContent = `Challenge: keep expected wait <= ${challenge.maxWait.toFixed(
    1
  )} min and capacity >= ${challenge.minCapacity.toLocaleString()} pphpd.`;

  render();
}

Object.values(controls).forEach((control) => {
  control.addEventListener('input', render);
});

simSpeedInput.addEventListener('input', () => {
  simSpeedLabel.textContent = simSpeedInput.value;
  render();
});

toggleAnimationBtn.addEventListener('click', () => {
  animationRunning = !animationRunning;
  toggleAnimationBtn.textContent = animationRunning ? 'Pause Animation' : 'Resume Animation';
  if (animationRunning && latestMetrics) {
    drawSimulation(latestMetrics.input, latestMetrics.metrics);
  }
});

newChallengeBtn.addEventListener('click', newChallenge);

newChallenge();
simSpeedLabel.textContent = simSpeedInput.value;
render();
requestAnimationFrame(animate);
