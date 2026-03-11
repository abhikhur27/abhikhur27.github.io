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

let challenge = null;
const carCapacity = 180;
const carsPerTrain = 6;

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
  };
}

function buildInsight(metrics) {
  if (metrics.expectedWaitMin <= 3 && metrics.pphpd >= 14000) {
    return 'This service pattern is competitive: short waits and high corridor throughput.';
  }

  if (metrics.expectedWaitMin > 6) {
    return 'Waiting time is dominating rider experience. Add trains or reduce round-trip time.';
  }

  if (metrics.pphpd < 9000) {
    return 'Capacity is constrained. Consider larger trains or tighter headways.';
  }

  return 'Balanced profile. You can push further by trimming dwell times or increasing speed.';
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

function render() {
  const input = currentInput();
  const metrics = computeMetrics(input);

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

newChallengeBtn.addEventListener('click', newChallenge);

newChallenge();
render();