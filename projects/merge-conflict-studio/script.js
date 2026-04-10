const scenarioSelect = document.getElementById('scenario-select');
const scenarioTitle = document.getElementById('scenario-title');
const scenarioSummary = document.getElementById('scenario-summary');
const constraintList = document.getElementById('constraint-list');
const baseIntent = document.getElementById('base-intent');
const oursIntent = document.getElementById('ours-intent');
const theirsIntent = document.getElementById('theirs-intent');
const baseCode = document.getElementById('base-code');
const oursCode = document.getElementById('ours-code');
const theirsCode = document.getElementById('theirs-code');
const resolutionEditor = document.getElementById('resolution-editor');
const useOursButton = document.getElementById('use-ours');
const useTheirsButton = document.getElementById('use-theirs');
const blendBothButton = document.getElementById('blend-both');
const resetResolutionButton = document.getElementById('reset-resolution');
const scoreResolutionButton = document.getElementById('score-resolution');
const showAnswerButton = document.getElementById('show-answer');
const statusEl = document.getElementById('status');
const scoreEl = document.getElementById('score');
const passedChecksEl = document.getElementById('passed-checks');
const lineMatchEl = document.getElementById('line-match');
const feedbackList = document.getElementById('feedback-list');

const scenarios = [
  {
    id: 'analytics-banner',
    title: 'Consent Banner Instrumentation',
    summary: 'Your branch adds richer telemetry while the incoming branch adds accessibility and a softer banner. The merge must keep both.',
    intents: {
      base: 'Simple dismiss-only banner with no analytics and weak accessibility.',
      ours: 'Emit analytics when the banner is accepted or dismissed.',
      theirs: 'Improve copy and add an explicit close label for screen readers.',
    },
    base: `export function renderBanner(root) {
  root.innerHTML = \`
    <div class="banner">
      <p>We use cookies.</p>
      <button id="accept">OK</button>
    </div>
  \`;
}
`,
    ours: `import { track } from './analytics.js';

export function renderBanner(root) {
  root.innerHTML = \`
    <div class="banner">
      <p>We use cookies.</p>
      <button id="accept">OK</button>
    </div>
  \`;

  root.querySelector('#accept')?.addEventListener('click', () => {
    track('banner_accept');
  });
}
`,
    theirs: `export function renderBanner(root) {
  root.innerHTML = \`
    <div class="banner soft">
      <p>We use cookies to keep campus tools stable.</p>
      <button id="accept" aria-label="Accept cookie banner">Accept</button>
    </div>
  \`;
}
`,
    blend: `import { track } from './analytics.js';

export function renderBanner(root) {
  root.innerHTML = \`
    <div class="banner soft">
      <p>We use cookies to keep campus tools stable.</p>
      <button id="accept" aria-label="Accept cookie banner">Accept</button>
    </div>
  \`;

  root.querySelector('#accept')?.addEventListener('click', () => {
    track('banner_accept');
  });
}
`,
    checks: [
      { label: 'Keep analytics tracking', type: 'includes', value: "track('banner_accept')" },
      { label: 'Keep the accessibility label', type: 'includes', value: 'aria-label="Accept cookie banner"' },
      { label: 'Preserve the softer copy', type: 'includes', value: 'keep campus tools stable' },
    ],
  },
  {
    id: 'fetch-client',
    title: 'Abortable Search Client',
    summary: 'One branch adds timeout protection while the other fixes cache headers. The merged fetch helper must keep both behaviors without duplicating options.',
    intents: {
      base: 'Single fetch helper with minimal headers.',
      ours: 'Add timeout-based abort control so stale searches stop burning bandwidth.',
      theirs: 'Normalize cache control headers for revalidation-safe GET requests.',
    },
    base: `export async function fetchResults(query) {
  const response = await fetch(\`/api/search?q=\${encodeURIComponent(query)}\`, {
    headers: {
      Accept: 'application/json',
    },
  });

  return response.json();
}
`,
    ours: `export async function fetchResults(query) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  const response = await fetch(\`/api/search?q=\${encodeURIComponent(query)}\`, {
    signal: controller.signal,
    headers: {
      Accept: 'application/json',
    },
  });

  clearTimeout(timeout);
  return response.json();
}
`,
    theirs: `export async function fetchResults(query) {
  const response = await fetch(\`/api/search?q=\${encodeURIComponent(query)}\`, {
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-store',
    },
  });

  return response.json();
}
`,
    blend: `export async function fetchResults(query) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  const response = await fetch(\`/api/search?q=\${encodeURIComponent(query)}\`, {
    signal: controller.signal,
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-store',
    },
  });

  clearTimeout(timeout);
  return response.json();
}
`,
    checks: [
      { label: 'Keep AbortController timeout', type: 'includes', value: 'AbortController' },
      { label: 'Keep the abort signal on fetch', type: 'includes', value: 'signal: controller.signal' },
      { label: 'Keep cache control header', type: 'includes', value: "'Cache-Control': 'no-store'" },
    ],
  },
  {
    id: 'status-pill',
    title: 'Status Pill Refactor',
    summary: 'One branch makes status mapping explicit while the other makes the component readable to screen readers. Resolve it without regressing styling or semantics.',
    intents: {
      base: 'Status pill renders classes directly from a bare status string.',
      ours: 'Map statuses through a stable token object so styling is harder to break.',
      theirs: 'Add screen-reader context and humanized labels.',
    },
    base: `export function renderStatus(status) {
  return \`<span class="pill \${status}">\${status}</span>\`;
}
`,
    ours: `const STATUS_CLASS = {
  healthy: 'is-healthy',
  warning: 'is-warning',
  critical: 'is-critical',
};

export function renderStatus(status) {
  return \`<span class="pill \${STATUS_CLASS[status] || 'is-unknown'}">\${status}</span>\`;
}
`,
    theirs: `export function renderStatus(status) {
  const label = status[0].toUpperCase() + status.slice(1);
  return \`<span class="pill \${status}" aria-label="System status: \${label}">\${label}</span>\`;
}
`,
    blend: `const STATUS_CLASS = {
  healthy: 'is-healthy',
  warning: 'is-warning',
  critical: 'is-critical',
};

export function renderStatus(status) {
  const label = status[0].toUpperCase() + status.slice(1);
  return \`<span class="pill \${STATUS_CLASS[status] || 'is-unknown'}" aria-label="System status: \${label}">\${label}</span>\`;
}
`,
    checks: [
      { label: 'Keep explicit status mapping', type: 'includes', value: 'STATUS_CLASS' },
      { label: 'Keep accessible status label', type: 'includes', value: 'aria-label="System status:' },
      { label: 'Humanize visible text', type: 'includes', value: 'const label =' },
    ],
  },
];

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function currentScenario() {
  return scenarios.find((scenario) => scenario.id === scenarioSelect.value) || scenarios[0];
}

function blendScenarioText(scenario) {
  const oursLines = scenario.ours.trim().split('\n');
  const theirsLines = scenario.theirs.trim().split('\n');
  const merged = [];
  const seen = new Set();

  [...oursLines, ...theirsLines].forEach((line) => {
    if (!seen.has(line)) {
      merged.push(line);
      seen.add(line);
    }
  });

  return `${merged.join('\n')}\n`;
}

function renderScenario() {
  const scenario = currentScenario();
  scenarioTitle.textContent = scenario.title;
  scenarioSummary.textContent = scenario.summary;
  baseIntent.textContent = scenario.intents.base;
  oursIntent.textContent = scenario.intents.ours;
  theirsIntent.textContent = scenario.intents.theirs;
  baseCode.innerHTML = escapeHtml(scenario.base);
  oursCode.innerHTML = escapeHtml(scenario.ours);
  theirsCode.innerHTML = escapeHtml(scenario.theirs);
  resolutionEditor.value = scenario.base;
  scoreEl.textContent = '-';
  passedChecksEl.textContent = `0 / ${scenario.checks.length}`;
  lineMatchEl.textContent = '-';
  statusEl.textContent = 'Blend the conflict and then score it against the scenario constraints.';
  feedbackList.innerHTML = '<article class="feedback-card"><strong>Waiting on review</strong><p>Score the resolution to see which constraints still fail.</p></article>';
  constraintList.innerHTML = scenario.checks
    .map((check) => `<article class="constraint-card"><strong>${check.label}</strong><p>${check.type === 'includes' ? `Resolution must include: ${check.value}` : `Resolution must avoid: ${check.value}`}</p></article>`)
    .join('');
}

function scoreResolution() {
  const scenario = currentScenario();
  const resolution = resolutionEditor.value;
  const feedback = [];
  let passed = 0;

  scenario.checks.forEach((check) => {
    const ok = check.type === 'includes' ? resolution.includes(check.value) : !resolution.includes(check.value);
    if (ok) passed += 1;
    feedback.push({
      ok,
      title: check.label,
      detail: ok ? 'Constraint preserved in the merged file.' : `Missing merge requirement: ${check.value}`,
    });
  });

  const resolutionLines = resolution.trim().split('\n').map((line) => line.trim()).filter(Boolean);
  const answerLines = scenario.blend.trim().split('\n').map((line) => line.trim()).filter(Boolean);
  const matchingLines = answerLines.filter((line) => resolutionLines.includes(line)).length;
  const lineMatch = answerLines.length ? Math.round((matchingLines / answerLines.length) * 100) : 0;
  const score = Math.round(((passed / scenario.checks.length) * 70) + lineMatch * 0.3);

  scoreEl.textContent = `${score}%`;
  passedChecksEl.textContent = `${passed} / ${scenario.checks.length}`;
  lineMatchEl.textContent = `${lineMatch}%`;
  statusEl.textContent = score >= 85 ? 'This merge would likely survive review.' : 'The merge still drops important branch behavior.';
  feedbackList.innerHTML = feedback
    .map((item) => `<article class="feedback-card ${item.ok ? 'pass' : 'fail'}"><strong>${item.ok ? 'Pass' : 'Fail'} | ${item.title}</strong><p>${item.detail}</p></article>`)
    .join('');
}

scenarioSelect.innerHTML = scenarios
  .map((scenario) => `<option value="${scenario.id}">${scenario.title}</option>`)
  .join('');

scenarioSelect.addEventListener('change', renderScenario);
useOursButton.addEventListener('click', () => {
  resolutionEditor.value = currentScenario().ours;
  statusEl.textContent = 'Loaded your branch version into the merge editor.';
});
useTheirsButton.addEventListener('click', () => {
  resolutionEditor.value = currentScenario().theirs;
  statusEl.textContent = 'Loaded the incoming branch version into the merge editor.';
});
blendBothButton.addEventListener('click', () => {
  resolutionEditor.value = blendScenarioText(currentScenario());
  statusEl.textContent = 'Built a naive blend. Now tighten it before scoring.';
});
resetResolutionButton.addEventListener('click', () => {
  resolutionEditor.value = currentScenario().base;
  statusEl.textContent = 'Reset the merge editor back to the base file.';
});
scoreResolutionButton.addEventListener('click', scoreResolution);
showAnswerButton.addEventListener('click', () => {
  resolutionEditor.value = currentScenario().blend;
  statusEl.textContent = 'Loaded the reference merge for study.';
});

renderScenario();
