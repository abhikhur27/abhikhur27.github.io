const scenarioSelect = document.getElementById('scenario-select');
const safeguardList = document.getElementById('safeguard-list');
const scenarioTitle = document.getElementById('scenario-title');
const scenarioSummary = document.getElementById('scenario-summary');
const scenarioChips = document.getElementById('scenario-chips');
const budgetMeter = document.getElementById('budget-meter');
const launchBtn = document.getElementById('launch-btn');
const resetBtn = document.getElementById('reset-btn');
const copyBriefBtn = document.getElementById('copy-brief-btn');
const statusEl = document.getElementById('status');
const speedScoreEl = document.getElementById('speed-score');
const trustScoreEl = document.getElementById('trust-score');
const recoveryScoreEl = document.getElementById('recovery-score');
const blastScoreEl = document.getElementById('blast-score');
const policyTitleEl = document.getElementById('policy-title');
const policySummaryEl = document.getElementById('policy-summary');
const pressureTitleEl = document.getElementById('pressure-title');
const pressureSummaryEl = document.getElementById('pressure-summary');
const postmortemTitleEl = document.getElementById('postmortem-title');
const postmortemSummaryEl = document.getElementById('postmortem-summary');
const historyListEl = document.getElementById('history-list');

const MAX_BUDGET = 5;
const scenarios = [
  { id: 'account-delete', title: 'Self-Serve Account Deletion', summary: 'Users want instant control, but a mistaken deletion is public, emotional, and often irreversible.', risk: 74, visibility: 82, reversibility: 28, urgency: 52, blast: 68 },
  { id: 'invoice-send', title: 'Bulk Invoice Send', summary: 'Speed matters for finance operations, but one malformed send fans errors across many customers at once.', risk: 63, visibility: 71, reversibility: 46, urgency: 76, blast: 84 },
  { id: 'permissions-edit', title: 'Admin Permission Editor', summary: 'Operators need low friction, but one bad permission change creates invisible security debt before anyone notices.', risk: 69, visibility: 44, reversibility: 58, urgency: 66, blast: 79 },
  { id: 'content-publish', title: 'High-Reach Content Publish', summary: 'The team wants a quick publish path, but bad content ships instantly and reputational repair is slower than deletion.', risk: 58, visibility: 91, reversibility: 34, urgency: 88, blast: 72 },
];
const safeguards = [
  { id: 'confirm', label: 'Confirmation Step', cost: 1, summary: 'Asks the user to commit twice before the risky action fires.', speed: -10, trust: 6, recovery: 2, blast: -8 },
  { id: 'undo', label: 'Undo Window', cost: 2, summary: 'Keeps a short recovery window where the action can be reversed cleanly.', speed: -4, trust: 12, recovery: 24, blast: -16 },
  { id: 'staged', label: 'Staged Rollout', cost: 2, summary: 'Limits early exposure so failure is discovered before the whole audience absorbs it.', speed: -12, trust: 8, recovery: 8, blast: -24 },
  { id: 'audit', label: 'Audit Trail', cost: 1, summary: 'Improves operator visibility so the team can explain and reverse the blast faster.', speed: -3, trust: 5, recovery: 12, blast: -6 },
  { id: 'preview', label: 'Preview Mode', cost: 1, summary: 'Shows the exact effect before commit so obvious mistakes are caught early.', speed: -8, trust: 7, recovery: 4, blast: -10 },
  { id: 'optimistic', label: 'Optimistic UI', cost: 1, summary: 'Makes the action feel instant, but raises trust debt if the back end later disagrees.', speed: 16, trust: -8, recovery: -6, blast: 6 },
  { id: 'human-review', label: 'Human Review Gate', cost: 2, summary: 'Adds deliberate friction before the action can hit users or production state.', speed: -16, trust: 12, recovery: 6, blast: -18 },
];

const state = { scenarioId: scenarios[0].id, selectedSafeguards: new Set(), history: [] };

function currentScenario() {
  return scenarios.find((scenario) => scenario.id === state.scenarioId) || scenarios[0];
}

function selectedSafeguards() {
  return safeguards.filter((item) => state.selectedSafeguards.has(item.id));
}

function usedBudget() {
  return selectedSafeguards().reduce((sum, item) => sum + item.cost, 0);
}

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function computePolicyMetrics() {
  const scenario = currentScenario();
  const metrics = selectedSafeguards().reduce((acc, item) => ({
    speed: acc.speed + item.speed,
    trust: acc.trust + item.trust,
    recovery: acc.recovery + item.recovery,
    blast: acc.blast + item.blast,
  }), {
    speed: 100 - scenario.urgency * 0.45,
    trust: 42 + scenario.visibility * 0.22 - scenario.risk * 0.14,
    recovery: 20 + scenario.reversibility * 0.55,
    blast: scenario.blast,
  });

  return {
    speed: clamp(metrics.speed - (selectedSafeguards().length >= 4 ? 6 : 0)),
    trust: clamp(metrics.trust),
    recovery: clamp(metrics.recovery),
    blast: clamp(metrics.blast),
  };
}

function renderScenario() {
  const scenario = currentScenario();
  scenarioTitle.textContent = scenario.title;
  scenarioSummary.textContent = scenario.summary;
  scenarioChips.innerHTML = [`Risk ${scenario.risk}`, `Visibility ${scenario.visibility}`, `Reversibility ${scenario.reversibility}`, `Blast ${scenario.blast}`].map((label) => `<span>${label}</span>`).join('');
}

function renderSafeguards() {
  const budget = usedBudget();
  budgetMeter.textContent = `${budget} / ${MAX_BUDGET} budget used`;
  safeguardList.innerHTML = safeguards.map((item) => {
    const checked = state.selectedSafeguards.has(item.id);
    const wouldOverflow = !checked && budget + item.cost > MAX_BUDGET;
    return `
      <article class="safeguard-card">
        <div class="safeguard-top">
          <div>
            <h3>${item.label}</h3>
            <p class="safeguard-copy">${item.summary}</p>
          </div>
          <strong>${item.cost} pt${item.cost === 1 ? '' : 's'}</strong>
        </div>
        <div class="chip-row">
          <span>Speed ${item.speed > 0 ? '+' : ''}${item.speed}</span>
          <span>Trust ${item.trust > 0 ? '+' : ''}${item.trust}</span>
          <span>Recovery ${item.recovery > 0 ? '+' : ''}${item.recovery}</span>
          <span>Blast ${item.blast > 0 ? '+' : ''}${item.blast}</span>
        </div>
        <div class="toggle-row">
          <label><input type="checkbox" data-safeguard="${item.id}" ${checked ? 'checked' : ''} ${wouldOverflow ? 'disabled' : ''}> Include safeguard</label>
          <span>${wouldOverflow ? 'Over budget' : checked ? 'Selected' : 'Available'}</span>
        </div>
      </article>
    `;
  }).join('');

  safeguardList.querySelectorAll('input[type="checkbox"]').forEach((input) => {
    input.addEventListener('change', () => {
      if (input.checked) state.selectedSafeguards.add(input.dataset.safeguard);
      else state.selectedSafeguards.delete(input.dataset.safeguard);
      render();
    });
  });
}

function renderPolicyRead() {
  const scenario = currentScenario();
  const metrics = computePolicyMetrics();
  const picked = selectedSafeguards();
  const posture =
    metrics.recovery >= 70 && metrics.blast <= 45 ? 'recovery-first' :
    metrics.speed >= 70 && metrics.trust < 50 ? 'speed-first' :
    metrics.trust >= 65 && metrics.speed >= 45 ? 'balanced-trust' :
    'fragile-middle';
  const summary =
    posture === 'recovery-first'
      ? 'This policy is explicitly buying reversibility before convenience.'
      : posture === 'speed-first'
        ? 'This policy is chasing throughput and hoping clean rollback will not be the real story.'
        : posture === 'balanced-trust'
          ? 'This policy protects trust without fully freezing operator momentum.'
          : 'This policy is paying meaningful friction without yet buying strong recovery depth.';

  speedScoreEl.textContent = `${metrics.speed}/100`;
  trustScoreEl.textContent = `${metrics.trust}/100`;
  recoveryScoreEl.textContent = `${metrics.recovery}/100`;
  blastScoreEl.textContent = `${metrics.blast}/100`;
  policyTitleEl.textContent = `${scenario.title}: ${posture.replace('-', ' ')}`;
  policySummaryEl.textContent = `${summary} ${picked.length ? `Safeguards in play: ${picked.map((item) => item.label).join(', ')}.` : 'No safeguards selected yet, so the product is mostly relying on luck and operator caution.'}`;
  pressureTitleEl.textContent = metrics.blast <= 45 ? 'Blast radius is meaningfully constrained.' : metrics.recovery >= 70 ? 'Failure would still hurt, but the team has a real way back.' : 'One bad launch would still fan outward faster than the safeguards contain it.';
  pressureSummaryEl.textContent = metrics.speed >= 70 && metrics.trust < 50 ? 'The policy is visibly optimized for flow speed, so the burden shifts onto perfect execution.' : metrics.speed <= 35 ? 'The policy is intentionally heavy, which may be correct for this action but will require a product rationale.' : 'The current mix is trading moderate friction for moderate recovery instead of choosing one side cleanly.';
}

function renderHistory() {
  if (!state.history.length) {
    historyListEl.innerHTML = '<p class="empty">No launch history yet.</p>';
    return;
  }

  historyListEl.innerHTML = state.history.map((entry) => `
    <article class="history-row">
      <p><strong>${entry.outcome}</strong> on ${entry.scenario}</p>
      <p>${entry.summary}</p>
      <p>Speed ${entry.metrics.speed} | Trust ${entry.metrics.trust} | Recovery ${entry.metrics.recovery} | Blast ${entry.metrics.blast}</p>
    </article>
  `).join('');
}

function launchPolicy() {
  const scenario = currentScenario();
  const metrics = computePolicyMetrics();
  const incidentProbability = Math.max(8, Math.min(92, scenario.risk - metrics.blast * 0.35 - metrics.recovery * 0.2 + (100 - metrics.trust) * 0.12));
  const incident = Math.random() * 100 < incidentProbability;

  let title = 'Clean launch';
  let summary = 'The action shipped without a visible incident, and the safeguards mostly read as deliberate rather than bureaucratic.';
  if (incident && metrics.recovery >= 70) {
    title = 'Incident, but reversible';
    summary = 'The action still failed, but the rollback path was real. Users felt friction, yet the team contained the blast before trust fully collapsed.';
  } else if (incident && metrics.speed >= 70 && metrics.recovery < 50) {
    title = 'Fast launch, expensive fallout';
    summary = 'The policy bought speed by underfunding recovery. Once the action failed, the team had to explain why the rollback story was thinner than the launch promise.';
  } else if (!incident && metrics.speed <= 35) {
    title = 'Safe but heavy';
    summary = 'Nothing went wrong, but the safeguard stack is expensive enough that the product now needs a clear argument for why this action deserves so much ceremony.';
  } else if (incident) {
    title = 'Containment struggle';
    summary = 'The safeguards softened some damage, but recovery depth and blast control were still misaligned with the scenario risk.';
  }

  postmortemTitleEl.textContent = title;
  postmortemSummaryEl.textContent = summary;
  state.history.unshift({ scenario: scenario.title, outcome: title, summary, metrics });
  state.history = state.history.slice(0, 5);
  renderHistory();
  statusEl.textContent = `${title}. ${incident ? 'The scenario did trigger failure pressure.' : 'The policy held this time.'}`;
}

function resetPolicy() {
  state.selectedSafeguards.clear();
  postmortemTitleEl.textContent = 'Waiting for a run.';
  postmortemSummaryEl.textContent = 'The lab will explain what failed first: user trust, recovery depth, operator control, or launch speed.';
  statusEl.textContent = 'Policy reset for the active scenario.';
  render();
}

function buildBrief() {
  const scenario = currentScenario();
  const metrics = computePolicyMetrics();
  return [
    'Rollback Budget Lab Policy Brief',
    '',
    `Scenario: ${scenario.title}`,
    `Pressure: risk ${scenario.risk}, visibility ${scenario.visibility}, reversibility ${scenario.reversibility}, blast ${scenario.blast}`,
    `Safeguards: ${selectedSafeguards().length ? selectedSafeguards().map((item) => `${item.label} (${item.cost})`).join(', ') : 'None selected'}`,
    `Budget used: ${usedBudget()} / ${MAX_BUDGET}`,
    `Metrics: speed ${metrics.speed}, trust ${metrics.trust}, recovery ${metrics.recovery}, blast radius ${metrics.blast}`,
    `Pre-launch read: ${policySummaryEl.textContent || '-'}`,
    `Pressure test: ${pressureSummaryEl.textContent || '-'}`,
    `Latest postmortem: ${postmortemSummaryEl.textContent || 'Launch the policy to generate a postmortem.'}`,
  ].join('\n');
}

function render() {
  renderScenario();
  renderSafeguards();
  renderPolicyRead();
}

scenarioSelect.innerHTML = scenarios.map((scenario) => `<option value="${scenario.id}">${scenario.title}</option>`).join('');
scenarioSelect.addEventListener('change', () => {
  state.scenarioId = scenarioSelect.value;
  resetPolicy();
});
launchBtn.addEventListener('click', launchPolicy);
resetBtn.addEventListener('click', resetPolicy);
copyBriefBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(buildBrief());
    statusEl.textContent = 'Copied the current policy brief.';
  } catch {
    statusEl.textContent = 'Clipboard copy failed in this environment.';
  }
});

scenarioSelect.value = state.scenarioId;
render();
renderHistory();
