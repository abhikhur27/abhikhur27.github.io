const arrivalRate = document.getElementById('arrival-rate');
const serviceRate = document.getElementById('service-rate');
const burstFactor = document.getElementById('burst-factor');
const slackFactor = document.getElementById('slack-factor');

const arrivalValue = document.getElementById('arrival-value');
const serviceValue = document.getElementById('service-value');
const burstValue = document.getElementById('burst-value');
const slackValue = document.getElementById('slack-value');

const utilizationEl = document.getElementById('utilization');
const waitTimeEl = document.getElementById('wait-time');
const queueLengthEl = document.getElementById('queue-length');
const riskBandEl = document.getElementById('risk-band');
const narrativeEl = document.getElementById('narrative');
const demandBars = document.getElementById('demand-bars');

function setPreset(arrival, service, burst, slack) {
  arrivalRate.value = String(arrival);
  serviceRate.value = String(service);
  burstFactor.value = String(burst);
  slackFactor.value = String(slack);
  renderLab();
}

function riskLabel(utilization) {
  if (utilization >= 1) return 'Unstable';
  if (utilization >= 0.9) return 'Fragile';
  if (utilization >= 0.75) return 'Tight';
  return 'Healthy';
}

function renderLab() {
  const lambda = Number(arrivalRate.value) * Number(burstFactor.value);
  const mu = Number(serviceRate.value) * (1 + Number(slackFactor.value) / 100);
  const utilization = lambda / mu;
  const safeUtilization = Math.min(utilization, 0.999);
  const expectedWait = utilization >= 1 ? Infinity : 1 / (mu - lambda);
  const expectedQueue = utilization >= 1 ? Infinity : (safeUtilization * safeUtilization) / (1 - safeUtilization);

  arrivalValue.textContent = arrivalRate.value;
  serviceValue.textContent = serviceRate.value;
  burstValue.textContent = `${Number(burstFactor.value).toFixed(1)}x`;
  slackValue.textContent = `${slackFactor.value}%`;

  utilizationEl.textContent = `${(utilization * 100).toFixed(1)}%`;
  waitTimeEl.textContent = Number.isFinite(expectedWait) ? `${(expectedWait * 60).toFixed(1)} min` : 'Explodes';
  queueLengthEl.textContent = Number.isFinite(expectedQueue) ? expectedQueue.toFixed(2) : 'Unbounded';
  riskBandEl.textContent = riskLabel(utilization);

  narrativeEl.textContent =
    utilization >= 1
      ? 'Arrival pressure exceeds effective service capacity. The queue will keep growing until demand falls or capacity rises.'
      : utilization >= 0.9
        ? 'The system is still technically stable, but even small bursts produce long waits and visible queue growth.'
        : utilization >= 0.75
          ? 'This is workable but sensitive. Short disruptions or staffing dips will produce noticeable delays.'
          : 'The system has room to absorb bursts. Wait times should stay controlled under normal variation.';

  const bars = [];
  for (let step = 1; step <= 12; step += 1) {
    const demand = Number(arrivalRate.value) * (0.6 + step * 0.08);
    const stressUtilization = demand / mu;
    const height = Math.max(12, Math.min(100, stressUtilization * 82));
    bars.push(`<span class="${stressUtilization >= 1 ? 'overload' : ''}" style="height:${height}%"></span>`);
  }
  demandBars.innerHTML = bars.join('');
}

document.getElementById('preset-balanced').addEventListener('click', () => setPreset(12, 18, 1.1, 15));
document.getElementById('preset-peak').addEventListener('click', () => setPreset(16, 18, 1.5, 10));
document.getElementById('preset-failure').addEventListener('click', () => setPreset(18, 16, 1.8, 0));

[arrivalRate, serviceRate, burstFactor, slackFactor].forEach((input) => {
  input.addEventListener('input', renderLab);
});

renderLab();
