const trafficInput = document.getElementById('traffic');
const hitRateInput = document.getElementById('hit-rate');
const ttlInput = document.getElementById('ttl');
const staleWindowInput = document.getElementById('stale-window');
const originLatencyInput = document.getElementById('origin-latency');
const payloadSizeInput = document.getElementById('payload-size');

const trafficValue = document.getElementById('traffic-value');
const hitRateValue = document.getElementById('hit-rate-value');
const ttlValue = document.getElementById('ttl-value');
const staleWindowValue = document.getElementById('stale-window-value');
const originLatencyValue = document.getElementById('origin-latency-value');
const payloadSizeValue = document.getElementById('payload-size-value');

const edgeLatencyEl = document.getElementById('edge-latency');
const originCallsEl = document.getElementById('origin-calls');
const bandwidthEl = document.getElementById('bandwidth');
const staleRiskEl = document.getElementById('stale-risk');
const policyBriefEl = document.getElementById('policy-brief');

const hitBar = document.getElementById('hit-bar');
const staleBar = document.getElementById('stale-bar');
const missBar = document.getElementById('miss-bar');

const presets = {
  api: { traffic: 900, hitRate: 52, ttl: 90, staleWindow: 30, originLatency: 520, payloadSize: 32 },
  news: { traffic: 1800, hitRate: 76, ttl: 120, staleWindow: 180, originLatency: 340, payloadSize: 64 },
  catalog: { traffic: 420, hitRate: 88, ttl: 480, staleWindow: 240, originLatency: 260, payloadSize: 140 },
};

function percent(value) {
  return `${value.toFixed(0)}%`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function applyPreset(name) {
  const preset = presets[name];
  if (!preset) return;

  trafficInput.value = String(preset.traffic);
  hitRateInput.value = String(preset.hitRate);
  ttlInput.value = String(preset.ttl);
  staleWindowInput.value = String(preset.staleWindow);
  originLatencyInput.value = String(preset.originLatency);
  payloadSizeInput.value = String(preset.payloadSize);
  render();
}

function render() {
  const traffic = Number(trafficInput.value);
  const hitRate = Number(hitRateInput.value) / 100;
  const ttl = Number(ttlInput.value);
  const staleWindow = Number(staleWindowInput.value);
  const originLatency = Number(originLatencyInput.value);
  const payloadSize = Number(payloadSizeInput.value);

  trafficValue.textContent = `${traffic} rpm`;
  hitRateValue.textContent = percent(hitRate * 100);
  ttlValue.textContent = `${ttl} s`;
  staleWindowValue.textContent = `${staleWindow} s`;
  originLatencyValue.textContent = `${originLatency} ms`;
  payloadSizeValue.textContent = `${payloadSize} KB`;

  const staleShare = clamp((staleWindow / Math.max(ttl, 1)) * 0.18, 0, 0.26);
  const effectiveHitRate = clamp(hitRate + Math.min(0.16, ttl / 2400), 0.12, 0.97);
  const missShare = clamp(1 - effectiveHitRate - staleShare, 0.02, 0.82);
  const normalizedTotal = effectiveHitRate + staleShare + missShare;
  const normalizedHit = effectiveHitRate / normalizedTotal;
  const normalizedStale = staleShare / normalizedTotal;
  const normalizedMiss = missShare / normalizedTotal;

  const originCalls = traffic * (normalizedMiss + normalizedStale * 0.35);
  const edgeLatency = normalizedHit * 36 + normalizedStale * 92 + normalizedMiss * originLatency;
  const bandwidth = (originCalls * payloadSize) / 1024;
  const staleRisk = clamp(normalizedStale * 100 + ttl / 24, 3, 74);

  edgeLatencyEl.textContent = `${edgeLatency.toFixed(0)} ms`;
  originCallsEl.textContent = `${originCalls.toFixed(0)}`;
  bandwidthEl.textContent = `${bandwidth.toFixed(1)} MB`;
  staleRiskEl.textContent = percent(staleRisk);

  hitBar.style.width = `${normalizedHit * 100}%`;
  staleBar.style.width = `${normalizedStale * 100}%`;
  missBar.style.width = `${normalizedMiss * 100}%`;

  let brief = 'The current policy is balanced enough for general-purpose traffic.';
  if (normalizedMiss >= 0.34 || edgeLatency >= 220) {
    brief = 'Origin misses are still expensive here. Raise TTL or improve hit rate before this traffic pattern scales.';
  } else if (staleRisk >= 42) {
    brief = 'The latency profile is strong, but stale-read exposure is rising. Tighten the stale window before using this policy for correctness-sensitive views.';
  } else if (normalizedHit >= 0.82 && edgeLatency <= 90) {
    brief = 'This is a strong cache policy for read-heavy traffic: low edge latency, limited origin pressure, and controlled stale exposure.';
  }

  policyBriefEl.textContent = brief;
}

document.getElementById('preset-api').addEventListener('click', () => applyPreset('api'));
document.getElementById('preset-news').addEventListener('click', () => applyPreset('news'));
document.getElementById('preset-catalog').addEventListener('click', () => applyPreset('catalog'));

[trafficInput, hitRateInput, ttlInput, staleWindowInput, originLatencyInput, payloadSizeInput].forEach((input) => {
  input.addEventListener('input', render);
});

render();
