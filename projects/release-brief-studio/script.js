const releaseNameInput = document.getElementById('release-name');
const audienceSelect = document.getElementById('audience');
const releaseTypeSelect = document.getElementById('release-type');
const changesInput = document.getElementById('changes');
const risksInput = document.getElementById('risks');
const checksInput = document.getElementById('checks');
const rolloutInput = document.getElementById('rollout');
const summaryBoard = document.getElementById('summary-board');
const qaBoard = document.getElementById('qa-board');
const rollbackBoard = document.getElementById('rollback-board');
const stakeholderBoard = document.getElementById('stakeholder-board');
const statusEl = document.getElementById('status');
const presetCampusBtn = document.getElementById('preset-campus');
const presetCommerceBtn = document.getElementById('preset-commerce');
const copyLinkBtn = document.getElementById('copy-link');
const copySummaryBtn = document.getElementById('copy-summary');
const copyQaBtn = document.getElementById('copy-qa');
const copyRollbackBtn = document.getElementById('copy-rollback');
const copyStakeholderBtn = document.getElementById('copy-stakeholder');

function parseLines(value) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function setStatus(message) {
  statusEl.textContent = message;
}

function buildState() {
  return {
    releaseName: releaseNameInput.value.trim() || 'Untitled release',
    audience: audienceSelect.value,
    releaseType: releaseTypeSelect.value,
    changes: parseLines(changesInput.value),
    risks: parseLines(risksInput.value),
    checks: parseLines(checksInput.value),
    rollout: parseLines(rolloutInput.value),
  };
}

function syncUrlState() {
  const state = buildState();
  const params = new URLSearchParams();
  params.set('name', state.releaseName);
  params.set('audience', state.audience);
  params.set('type', state.releaseType);
  params.set('changes', changesInput.value);
  params.set('risks', risksInput.value);
  params.set('checks', checksInput.value);
  params.set('rollout', rolloutInput.value);
  const nextUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, '', nextUrl);
}

function hydrateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const mapping = [
    ['name', releaseNameInput],
    ['audience', audienceSelect],
    ['type', releaseTypeSelect],
    ['changes', changesInput],
    ['risks', risksInput],
    ['checks', checksInput],
    ['rollout', rolloutInput],
  ];

  mapping.forEach(([key, element]) => {
    const value = params.get(key);
    if (value !== null) {
      element.value = value;
    }
  });
}

function renderList(items) {
  if (!items.length) {
    return '<p>No items yet.</p>';
  }
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function buildSummaryText(state) {
  const highestRisk = state.risks[0] || 'No explicit risk called out yet.';
  const checksCount = state.checks.length;
  return [
    `${state.releaseName} (${state.releaseType})`,
    '',
    `Audience: ${state.audience}`,
    `Change count: ${state.changes.length}`,
    `Highest visible risk: ${highestRisk}`,
    `Evidence attached: ${checksCount} check${checksCount === 1 ? '' : 's'}`,
  ].join('\n');
}

function buildQaText(state) {
  const qaLines = state.checks.length ? state.checks : ['List the concrete smoke tests or verification steps before sharing this brief.'];
  return [
    `${state.releaseName} QA Checklist`,
    '',
    ...qaLines.map((line, index) => `${index + 1}. ${line}`),
    '',
    `Focus risks: ${(state.risks[0] || 'No primary risk listed yet.')}`,
  ].join('\n');
}

function buildRollbackText(state) {
  const rollbackLines = state.rollout.length ? state.rollout : ['Define who rolls back, which artifact reverts, and which signal triggers it.'];
  return [
    `${state.releaseName} Rollback Plan`,
    '',
    ...rollbackLines.map((line, index) => `${index + 1}. ${line}`),
    '',
    `Watch first: ${state.risks[0] || 'No first-watch risk listed yet.'}`,
  ].join('\n');
}

function buildStakeholderText(state) {
  const firstChange = state.changes[0] || 'No release changes listed yet.';
  const firstRisk = state.risks[0] || 'No explicit risk called out yet.';
  const tone =
    state.audience === 'customer'
      ? 'This update improves reliability and reduces known friction points.'
      : state.audience === 'product'
        ? 'This release is small enough to ship quickly but still needs explicit post-deploy watching.'
        : 'Ship summary should stay concrete and evidence-backed so reviewers know what changed and what to watch.';

  return [
    `${state.releaseName}`,
    '',
    tone,
    `Primary change: ${firstChange}`,
    `Primary watch item: ${firstRisk}`,
    `Checks completed: ${state.checks.length ? state.checks.join('; ') : 'Add verification steps before sharing.'}`,
  ].join('\n');
}

function renderBoards() {
  const state = buildState();
  syncUrlState();

  summaryBoard.innerHTML = [
    `<p><strong>${escapeHtml(state.releaseName)}</strong> is currently framed as a ${escapeHtml(state.releaseType)} for ${escapeHtml(state.audience)} readers.</p>`,
    `<p><strong>Core changes:</strong></p>`,
    renderList(state.changes),
    `<p><strong>Risk concentration:</strong> ${escapeHtml(state.risks[0] || 'Add one explicit risk so the brief has a monitoring angle.')}</p>`,
  ].join('');

  qaBoard.innerHTML = [
    `<p><strong>Verification posture:</strong> ${state.checks.length ? `${state.checks.length} explicit check${state.checks.length === 1 ? '' : 's'} listed.` : 'No checks listed yet.'}</p>`,
    renderList(state.checks),
  ].join('');

  rollbackBoard.innerHTML = [
    `<p><strong>Rollback priority:</strong> ${escapeHtml(state.risks[0] || 'Name the first failure signal to watch after deploy.')}</p>`,
    renderList(state.rollout),
  ].join('');

  stakeholderBoard.innerHTML = [
    `<p><strong>Audience tone:</strong> ${escapeHtml(state.audience)} readers currently get a ${escapeHtml(state.releaseType)}-style summary.</p>`,
    `<p>${escapeHtml(buildStakeholderText(state).split('\n').slice(2).join(' '))}</p>`,
  ].join('');
}

async function copyText(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    setStatus(`Copied ${label}.`);
  } catch {
    setStatus(`Clipboard copy failed for ${label}.`);
  }
}

function applyPreset(preset) {
  const entries = {
    campus: {
      releaseName: 'Campus Portal Patch 1.6',
      audience: 'product',
      releaseType: 'feature',
      changes: ['Improved login timeout handling', 'Fixed stale dashboard cache after course registration', 'Added admin warning for duplicate roster imports'],
      risks: ['Session expiry edge cases', 'Dashboard data freshness', 'Admin CSV import validation'],
      checks: ['Manual login/logout smoke test', 'Dashboard cache invalidation check', 'CSV import with duplicate and malformed rows'],
      rollout: ['Deploy during low-traffic campus window', 'Monitor login failures for 30 minutes', 'Keep prior import job version ready for rollback'],
    },
    commerce: {
      releaseName: 'Checkout Hotfix 4.2.3',
      audience: 'internal',
      releaseType: 'hotfix',
      changes: ['Fixed coupon double-apply bug on mobile checkout', 'Restored tax recalculation after shipping method changes', 'Added guardrail for stale payment intent retries'],
      risks: ['Payment confirmation edge cases', 'Tax totals after address edits', 'Coupon reuse during retry flows'],
      checks: ['Mobile Safari coupon smoke test', 'Shipping-method switch with tax recalculation', 'Retry payment flow with expired intent'],
      rollout: ['Deploy outside peak order volume', 'Watch checkout conversion and payment declines for 20 minutes', 'Rollback to prior checkout bundle if payment retries spike'],
    },
  }[preset];

  if (!entries) return;
  releaseNameInput.value = entries.releaseName;
  audienceSelect.value = entries.audience;
  releaseTypeSelect.value = entries.releaseType;
  changesInput.value = entries.changes.join('\n');
  risksInput.value = entries.risks.join('\n');
  checksInput.value = entries.checks.join('\n');
  rolloutInput.value = entries.rollout.join('\n');
  renderBoards();
  setStatus(`Loaded ${entries.releaseName} preset.`);
}

[releaseNameInput, audienceSelect, releaseTypeSelect, changesInput, risksInput, checksInput, rolloutInput].forEach((element) => {
  element.addEventListener('input', renderBoards);
  element.addEventListener('change', renderBoards);
});

presetCampusBtn.addEventListener('click', () => applyPreset('campus'));
presetCommerceBtn.addEventListener('click', () => applyPreset('commerce'));
copyLinkBtn.addEventListener('click', async () => {
  syncUrlState();
  await copyText(window.location.href, 'share link');
});
copySummaryBtn.addEventListener('click', () => copyText(buildSummaryText(buildState()), 'release summary'));
copyQaBtn.addEventListener('click', () => copyText(buildQaText(buildState()), 'QA checklist'));
copyRollbackBtn.addEventListener('click', () => copyText(buildRollbackText(buildState()), 'rollback plan'));
copyStakeholderBtn.addEventListener('click', () => copyText(buildStakeholderText(buildState()), 'stakeholder update'));

hydrateFromUrl();
renderBoards();
