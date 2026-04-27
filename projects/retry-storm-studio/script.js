const fields = {
  requests: document.getElementById('requests'),
  failureRate: document.getElementById('failure-rate'),
  retryCount: document.getElementById('retry-count'),
  timeoutOverlap: document.getElementById('timeout-overlap'),
  fanout: document.getElementById('fanout'),
  jitter: document.getElementById('jitter'),
  idempotency: document.getElementById('idempotency'),
  breaker: document.getElementById('breaker'),
};

const labels = {
  requests: document.getElementById('requests-value'),
  failureRate: document.getElementById('failure-value'),
  retryCount: document.getElementById('retries-value'),
  timeoutOverlap: document.getElementById('overlap-value'),
  fanout: document.getElementById('fanout-value'),
  jitter: document.getElementById('jitter-value'),
  idempotency: document.getElementById('idempotency-value'),
  breaker: document.getElementById('breaker-value'),
};

const expectedAttemptsEl = document.getElementById('expected-attempts');
const peakLoadEl = document.getElementById('peak-load');
const duplicateRiskEl = document.getElementById('duplicate-risk');
const stormScoreEl = document.getElementById('storm-score');
const stormSummaryEl = document.getElementById('storm-summary');
const controlStackEl = document.getElementById('control-stack');
const operatorReadEl = document.getElementById('operator-read');
const actionPlanEl = document.getElementById('action-plan');
const failureWalkthroughEl = document.getElementById('failure-walkthrough');
const statusEl = document.getElementById('status');
const presetButtons = Array.from(document.querySelectorAll('.preset-btn'));
const copyReportButton = document.getElementById('copy-report');
const copyLinkButton = document.getElementById('copy-link');

const presets = {
  login: { requests: 900, failureRate: 18, retryCount: 2, timeoutOverlap: 35, fanout: 2, jitter: 50, idempotency: 70, breaker: 60 },
  mobile: { requests: 700, failureRate: 34, retryCount: 3, timeoutOverlap: 70, fanout: 2, jitter: 20, idempotency: 55, breaker: 40 },
  payments: { requests: 350, failureRate: 28, retryCount: 4, timeoutOverlap: 65, fanout: 3, jitter: 25, idempotency: 30, breaker: 35 },
};

function formatLabels() {
  labels.requests.textContent = fields.requests.value;
  labels.failureRate.textContent = `${fields.failureRate.value}%`;
  labels.retryCount.textContent = fields.retryCount.value;
  labels.timeoutOverlap.textContent = `${fields.timeoutOverlap.value}%`;
  labels.fanout.textContent = `${fields.fanout.value} hop${Number(fields.fanout.value) === 1 ? '' : 's'}`;
  labels.jitter.textContent = `${fields.jitter.value}%`;
  labels.idempotency.textContent = `${fields.idempotency.value}%`;
  labels.breaker.textContent = `${fields.breaker.value}%`;
}

function readState() {
  return {
    requests: Number(fields.requests.value),
    failureRate: Number(fields.failureRate.value) / 100,
    retryCount: Number(fields.retryCount.value),
    timeoutOverlap: Number(fields.timeoutOverlap.value) / 100,
    fanout: Number(fields.fanout.value),
    jitter: Number(fields.jitter.value) / 100,
    idempotency: Number(fields.idempotency.value) / 100,
    breaker: Number(fields.breaker.value) / 100,
  };
}

function expectedAttemptsPerRequest(failureRate, retryCount) {
  if (failureRate === 1) return retryCount + 1;
  return (1 - (failureRate ** (retryCount + 1))) / (1 - failureRate);
}

function render() {
  formatLabels();
  const state = readState();
  const expectedAttempts = expectedAttemptsPerRequest(state.failureRate, state.retryCount);
  const overlapMultiplier = 1 + (state.timeoutOverlap * state.retryCount * 0.35);
  const fanoutMultiplier = 1 + ((state.fanout - 1) * 0.22);
  const jitterRelief = 1 - (state.jitter * 0.28);
  const breakerRelief = 1 - (state.breaker * 0.24);
  const loadMultiplier = expectedAttempts * overlapMultiplier * fanoutMultiplier * jitterRelief * breakerRelief;
  const peakAttempts = Math.round(state.requests * loadMultiplier);
  const duplicateWrites = Math.round(state.requests * state.failureRate * state.retryCount * (1 - state.idempotency) * 0.32);
  const stormScore = Math.max(0, Math.min(100, Math.round((loadMultiplier - 1) * 26 + duplicateWrites / 18)));

  expectedAttemptsEl.textContent = `${expectedAttempts.toFixed(2)}x/request`;
  peakLoadEl.textContent = `${peakAttempts} attempts`;
  duplicateRiskEl.textContent = `${duplicateWrites} risky writes`;
  stormScoreEl.textContent = `${stormScore}/100`;

  const posture =
    stormScore >= 70 ? 'Retry storm likely' : stormScore >= 40 ? 'Guarded but risky' : 'Contained';
  stormSummaryEl.textContent = `${posture}: ${state.requests} incoming requests expand to roughly ${peakAttempts} downstream attempts under the current policy.`;

  controlStackEl.innerHTML = [
    `<p><strong>Jitter relief:</strong> ${(state.jitter * 28).toFixed(0)}% of the overlap pressure is being shaved off.</p>`,
    `<p><strong>Breaker relief:</strong> ${(state.breaker * 24).toFixed(0)}% of the storm front is being clipped before it fans out.</p>`,
    `<p><strong>Idempotency shield:</strong> ${(state.idempotency * 100).toFixed(0)}% coverage keeps duplicate writes from becoming user-visible damage.</p>`,
  ].join('');

  operatorReadEl.innerHTML = [
    `<p><strong>Amplifier:</strong> timeout overlap and fanout are multiplying the initial failure by ${(overlapMultiplier * fanoutMultiplier).toFixed(2)}x before mitigations.</p>`,
    `<p><strong>Weak link:</strong> ${state.idempotency < 0.5 ? 'duplicate writes are still too easy to trigger' : 'write safety is decent, but concurrency pressure still needs attention'}.</p>`,
    `<p><strong>Best demo angle:</strong> show how ${state.jitter >= 0.4 ? 'jitter smooths the surge' : 'lack of jitter keeps retries synchronized'} while fanout spreads the pain.</p>`,
  ].join('');

  const actions = [];
  if (state.timeoutOverlap > 0.5) actions.push('Tighten client deadlines or use hedging more selectively before overlap stacks.');
  if (state.jitter < 0.35) actions.push('Raise jitter coverage so retries stop landing in synchronized waves.');
  if (state.idempotency < 0.6) actions.push('Add request keys or dedupe windows before allowing aggressive retries on writes.');
  if (state.breaker < 0.45) actions.push('Trip faster or shed load sooner so retries do not keep hitting a failing path.');
  if (!actions.length) actions.push('The control stack is reasonable; the next step is validating these assumptions under one harsher preset.');
  actionPlanEl.innerHTML = actions.map((action, index) => `<p><strong>${index + 1}.</strong> ${action}</p>`).join('');

  failureWalkthroughEl.innerHTML = [
    `<p><strong>Step 1:</strong> ${Math.round(state.requests * state.failureRate)} requests fail on the first pass.</p>`,
    `<p><strong>Step 2:</strong> retry policy expands those misses into about ${Math.round((expectedAttempts - 1) * state.requests)} extra attempts.</p>`,
    `<p><strong>Step 3:</strong> overlap and fanout lift peak pressure to roughly ${peakAttempts} live attempts.</p>`,
    `<p><strong>Step 4:</strong> mitigations leave ${duplicateWrites} plausible duplicate-write moments to explain or eliminate.</p>`,
  ].join('');

  const params = new URLSearchParams();
  Object.entries(fields).forEach(([key, input]) => params.set(key, input.value));
  history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
}

function buildReport() {
  return [
    'Retry Storm Studio Report',
    '',
    `Requests: ${fields.requests.value}`,
    `Base failure rate: ${fields.failureRate.value}%`,
    `Retry count: ${fields.retryCount.value}`,
    `Timeout overlap: ${fields.timeoutOverlap.value}%`,
    `Fanout: ${fields.fanout.value}`,
    `Jitter: ${fields.jitter.value}%`,
    `Idempotency: ${fields.idempotency.value}%`,
    `Circuit breaker: ${fields.breaker.value}%`,
    '',
    `Storm summary: ${stormSummaryEl.textContent}`,
    `Control stack: ${(controlStackEl.textContent || '').replace(/\s+/g, ' ').trim()}`,
    `Action plan: ${(actionPlanEl.textContent || '').replace(/\s+/g, ' ').trim()}`,
    `Share link: ${window.location.href}`,
  ].join('\n');
}

function applyPreset(name) {
  const preset = presets[name];
  if (!preset) return;
  Object.entries(preset).forEach(([key, value]) => {
    fields[key].value = String(value);
  });
  render();
  statusEl.textContent = `Loaded ${name} preset.`;
}

function hydrateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  Object.entries(fields).forEach(([key, input]) => {
    const raw = params.get(key);
    if (raw !== null && raw !== '') input.value = raw;
  });
}

Object.values(fields).forEach((input) => input.addEventListener('input', render));
presetButtons.forEach((button) => button.addEventListener('click', () => applyPreset(button.dataset.preset)));
copyReportButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(buildReport());
    statusEl.textContent = 'Copied the current retry-storm report.';
  } catch (error) {
    statusEl.textContent = 'Clipboard copy failed in this environment.';
  }
});
copyLinkButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(window.location.href);
    statusEl.textContent = 'Copied the current scenario link.';
  } catch (error) {
    statusEl.textContent = 'Clipboard copy failed in this environment.';
  }
});

hydrateFromUrl();
render();
