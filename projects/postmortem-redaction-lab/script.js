const scenarioSelect = document.getElementById('scenario-select');
const surpriseBtn = document.getElementById('surprise-btn');
const resetBtn = document.getElementById('reset-btn');
const publishBtn = document.getElementById('publish-btn');
const copyBriefBtn = document.getElementById('copy-brief-btn');
const statusEl = document.getElementById('status');
const scenarioTitleEl = document.getElementById('scenario-title');
const scenarioSummaryEl = document.getElementById('scenario-summary');
const scenarioPressureEl = document.getElementById('scenario-pressure');
const trustScoreEl = document.getElementById('trust-score');
const learningScoreEl = document.getElementById('learning-score');
const riskScoreEl = document.getElementById('risk-score');
const coverageScoreEl = document.getElementById('coverage-score');
const coachSummaryEl = document.getElementById('coach-summary');
const scorecardListEl = document.getElementById('scorecard-list');
const factBankMetaEl = document.getElementById('fact-bank-meta');
const factBankEl = document.getElementById('fact-bank');
const publicMetaEl = document.getElementById('public-meta');
const internalMetaEl = document.getElementById('internal-meta');
const publicListEl = document.getElementById('public-list');
const internalListEl = document.getElementById('internal-list');
const outcomeSummaryEl = document.getElementById('outcome-summary');
const outcomeTagsEl = document.getElementById('outcome-tags');

const PUBLIC_LIMIT = 5;
const INTERNAL_LIMIT = 4;

const scenarios = [
  {
    id: 'auth-cache',
    title: 'Campus Auth Cache Flush',
    summary: 'A bad identity cache invalidation pushed 18 minutes of login failures across the student portal during course registration.',
    pressures: ['Students locked out', 'Registration window live', 'Vendor dependency involved'],
    facts: [
      { id: 'impact', text: '18 minutes of login failures blocked registration and account access for roughly 11,000 sessions.', category: 'impact', trust: 26, learning: 6, risk: 10 },
      { id: 'cause', text: 'A cache invalidation rollout accepted stale auth claims after a schema mismatch with the upstream identity provider.', category: 'cause', trust: 14, learning: 20, risk: 22 },
      { id: 'detect', text: 'We noticed the outage through student complaints before our alerting crossed the threshold.', category: 'detection', trust: 15, learning: 18, risk: 14 },
      { id: 'mitigation', text: 'Operators drained the bad cache tier, pinned the previous config, and restored sign-in before the registration peak hit.', category: 'mitigation', trust: 22, learning: 11, risk: 8 },
      { id: 'guardrail', text: 'Future schema changes will require a compatibility canary and synthetic login checks before any cache rollout.', category: 'guardrail', trust: 18, learning: 15, risk: 5 },
      { id: 'ownership', text: 'The rollout path lacked an explicit owner for cross-vendor contract checks.', category: 'ownership', trust: 9, learning: 17, risk: 12 },
      { id: 'sensitive', text: 'Specific tenant mappings exposed which administrative accounts bypassed the broken cache path.', category: 'sensitive', trust: 4, learning: 12, risk: 28 },
    ],
  },
  {
    id: 'payments-dup',
    title: 'Duplicate Charge Incident',
    summary: 'A retry storm replayed successful payment writes after a queue timeout, creating visible duplicate charges before reconciliation.',
    pressures: ['Money movement', 'Angry customers', 'Compliance review'],
    facts: [
      { id: 'impact', text: '427 customers saw duplicate authorizations for between 14 and 46 minutes before reversals propagated.', category: 'impact', trust: 27, learning: 7, risk: 12 },
      { id: 'cause', text: 'A worker retried charge creation after timeout without checking the idempotency record on the persistence path.', category: 'cause', trust: 15, learning: 23, risk: 18 },
      { id: 'timeline', text: 'The queue timeout began after a database failover increased p95 write latency by 6x.', category: 'timeline', trust: 10, learning: 14, risk: 9 },
      { id: 'mitigation', text: 'We paused the retry worker, replayed the idempotency ledger, and reversed duplicate charges before settlement.', category: 'mitigation', trust: 21, learning: 13, risk: 7 },
      { id: 'guardrail', text: 'The charge path now treats timeouts as unknown outcomes and checks the ledger before any replay.', category: 'guardrail', trust: 19, learning: 15, risk: 5 },
      { id: 'ownership', text: 'Payments engineering owns a follow-up to test retries against failover conditions every release.', category: 'ownership', trust: 8, learning: 16, risk: 8 },
      { id: 'sensitive', text: 'The internal reconciliation runbook lists a manual reversal endpoint that should not be exposed publicly.', category: 'sensitive', trust: 3, learning: 10, risk: 30 },
    ],
  },
  {
    id: 'analytics-lag',
    title: 'Analytics Pipeline Drift',
    summary: 'A late-night schema change silently dropped event fields, leaving customer dashboards wrong for half a day.',
    pressures: ['Silent data loss', 'Executive visibility', 'Partner dashboards wrong'],
    facts: [
      { id: 'impact', text: 'Customer-facing dashboards undercounted conversions for 11 hours and misreported campaign performance.', category: 'impact', trust: 24, learning: 6, risk: 8 },
      { id: 'cause', text: 'A producer shipped a nullable field rename without the compatibility shim expected by the downstream consumer.', category: 'cause', trust: 12, learning: 21, risk: 16 },
      { id: 'detect', text: 'We lacked a schema drift alert and only caught the issue after a partner questioned the dashboard delta.', category: 'detection', trust: 14, learning: 18, risk: 10 },
      { id: 'mitigation', text: 'We backfilled the lost events, restored the old contract, and published corrected totals after verification.', category: 'mitigation', trust: 22, learning: 10, risk: 6 },
      { id: 'guardrail', text: 'The pipeline now blocks producer deploys until consumer fixtures pass a contract suite.', category: 'guardrail', trust: 18, learning: 14, risk: 4 },
      { id: 'ownership', text: 'Data platform and product analytics now share one contract owner instead of passing schema responsibility implicitly.', category: 'ownership', trust: 8, learning: 14, risk: 7 },
      { id: 'sensitive', text: 'The internal dashboard listed which enterprise accounts had the largest revenue deltas.', category: 'sensitive', trust: 2, learning: 9, risk: 26 },
    ],
  },
];

const state = {
  scenarioId: scenarios[0].id,
  publicFacts: [],
  internalFacts: [],
  lastOutcome: null,
};

function getScenario() {
  return scenarios.find((scenario) => scenario.id === state.scenarioId) || scenarios[0];
}

function getFactById(factId) {
  return getScenario().facts.find((fact) => fact.id === factId);
}

function setStatus(message) {
  statusEl.textContent = message;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function renderScenarioOptions() {
  scenarioSelect.innerHTML = scenarios
    .map((scenario) => `<option value="${scenario.id}">${scenario.title}</option>`)
    .join('');
  scenarioSelect.value = state.scenarioId;
}

function resetSelections(message) {
  state.publicFacts = [];
  state.internalFacts = [];
  state.lastOutcome = null;
  renderAll();
  if (message) {
    setStatus(message);
  }
}

function toggleSelection(listKey, factId, limit) {
  const list = state[listKey];
  const existingIndex = list.indexOf(factId);
  if (existingIndex >= 0) {
    list.splice(existingIndex, 1);
    state.lastOutcome = null;
    renderAll();
    return;
  }

  if (list.length >= limit) {
    setStatus(`${listKey === 'publicFacts' ? 'Public note' : 'Internal note'} is full. Remove one fact before adding another.`);
    return;
  }

  if (listKey === 'publicFacts' && state.internalFacts.includes(factId)) {
    state.internalFacts = state.internalFacts.filter((id) => id !== factId);
  }
  if (listKey === 'internalFacts' && state.publicFacts.includes(factId)) {
    state.publicFacts = state.publicFacts.filter((id) => id !== factId);
  }

  list.push(factId);
  state.lastOutcome = null;
  renderAll();
}

function renderScenarioHeader() {
  const scenario = getScenario();
  scenarioTitleEl.textContent = scenario.title;
  scenarioSummaryEl.textContent = scenario.summary;
  scenarioPressureEl.innerHTML = scenario.pressures.map((item) => `<span>${item}</span>`).join('');
}

function renderFactBank() {
  const scenario = getScenario();
  factBankMetaEl.textContent = `${scenario.facts.length} facts loaded.`;
  factBankEl.innerHTML = scenario.facts
    .map((fact) => {
      const publicSelected = state.publicFacts.includes(fact.id);
      const internalSelected = state.internalFacts.includes(fact.id);
      return `
        <article class="fact-card">
          <h3>${fact.text}</h3>
          <div class="fact-meta">
            <span>${fact.category}</span>
            <span>Trust +${fact.trust}</span>
            <span>Learning +${fact.learning}</span>
            <span>Risk +${fact.risk}</span>
          </div>
          <div class="fact-actions">
            <button type="button" data-fact-id="${fact.id}" data-target="public">${publicSelected ? 'Remove From Public' : 'Add To Public'}</button>
            <button type="button" data-fact-id="${fact.id}" data-target="internal">${internalSelected ? 'Remove From Internal' : 'Add To Internal'}</button>
          </div>
        </article>
      `;
    })
    .join('');

  factBankEl.querySelectorAll('button[data-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const factId = button.dataset.factId;
      const target = button.dataset.target;
      if (target === 'public') toggleSelection('publicFacts', factId, PUBLIC_LIMIT);
      if (target === 'internal') toggleSelection('internalFacts', factId, INTERNAL_LIMIT);
    });
  });
}

function renderSelectionList(targetEl, listKey, limit, emptyLabel) {
  const items = state[listKey].map((factId) => getFactById(factId)).filter(Boolean);
  targetEl.innerHTML = items.length
    ? items
        .map(
          (fact) => `
            <article class="selection-card">
              <p class="selection-label">${listKey === 'publicFacts' ? 'Public Note' : 'Internal Note'}</p>
              <h3>${fact.text}</h3>
              <p class="results-meta">Category: ${fact.category} | Trust +${fact.trust} | Learning +${fact.learning} | Risk +${fact.risk}</p>
              <div class="selection-actions">
                <button type="button" data-remove-id="${fact.id}" data-remove-target="${listKey}">Remove</button>
              </div>
            </article>
          `
        )
        .join('')
    : `<div class="empty-state">${emptyLabel}</div>`;

  targetEl.querySelectorAll('button[data-remove-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.removeTarget;
      const factId = button.dataset.removeId;
      state[target] = state[target].filter((id) => id !== factId);
      state.lastOutcome = null;
      renderAll();
    });
  });

  const metaEl = listKey === 'publicFacts' ? publicMetaEl : internalMetaEl;
  metaEl.textContent = `${items.length} / ${limit} selected`;
}

function computeOutcome() {
  const publicFacts = state.publicFacts.map((id) => getFactById(id)).filter(Boolean);
  const internalFacts = state.internalFacts.map((id) => getFactById(id)).filter(Boolean);
  const publicCategories = new Set(publicFacts.map((fact) => fact.category));
  const internalCategories = new Set(internalFacts.map((fact) => fact.category));
  const totalTrust = publicFacts.reduce((sum, fact) => sum + fact.trust, 0);
  const totalLearning = internalFacts.reduce((sum, fact) => sum + fact.learning, 0) + publicFacts.reduce((sum, fact) => sum + Math.round(fact.learning * 0.35), 0);
  const totalRisk = publicFacts.reduce((sum, fact) => sum + fact.risk, 0) + internalFacts.reduce((sum, fact) => sum + Math.round(fact.risk * 0.2), 0);

  let trust = totalTrust;
  let learning = totalLearning;
  let risk = totalRisk;

  if (!publicCategories.has('impact')) trust -= 20;
  if (!publicCategories.has('mitigation')) trust -= 14;
  if (!publicCategories.has('guardrail')) trust -= 10;
  if (!internalCategories.has('cause')) learning -= 16;
  if (!internalCategories.has('ownership')) learning -= 8;
  if (publicCategories.has('sensitive')) risk += 24;
  if (publicFacts.length < 3) trust -= 8;
  if (!state.internalFacts.length) learning -= 12;

  const coverage = clamp(publicCategories.size * 12 + internalCategories.size * 10, 0, 100);
  trust = clamp(trust, 0, 100);
  learning = clamp(learning, 0, 100);
  risk = clamp(risk, 0, 100);

  let posture = 'Balanced disclosure';
  if (trust < 45 && learning >= 55) posture = 'Operator-complete but publicly evasive';
  else if (trust >= 60 && learning < 45) posture = 'Customer-facing but weak for internal learning';
  else if (risk >= 65) posture = 'Over-disclosed and legally noisy';

  const highlights = [
    publicCategories.has('impact') ? 'Named customer impact clearly.' : 'Missed explicit customer impact.',
    publicCategories.has('mitigation') ? 'Explained how service was restored.' : 'Did not explain mitigation clearly.',
    internalCategories.has('cause') ? 'Internal note captured root cause detail.' : 'Internal note is thin on root cause.',
    risk >= 65 ? 'Public note leaks too much sensitive detail.' : 'Sensitive implementation detail stayed mostly contained.',
  ];

  return { trust, learning, risk, coverage, posture, highlights };
}

function renderOutcome(outcome) {
  trustScoreEl.textContent = String(outcome.trust);
  learningScoreEl.textContent = String(outcome.learning);
  riskScoreEl.textContent = String(outcome.risk);
  coverageScoreEl.textContent = String(outcome.coverage);

  scorecardListEl.innerHTML = outcome.highlights
    .map((item) => `<li>${item}</li>`)
    .join('');

  coachSummaryEl.textContent =
    outcome.trust >= 60 && outcome.learning >= 60 && outcome.risk <= 55
      ? 'This disclosure reads credible in public and still leaves the operator team with enough detail to improve the system.'
      : outcome.risk >= 65
        ? 'You disclosed enough to help engineers, but too much of it belongs in the internal packet rather than the public writeup.'
        : outcome.learning < 45
          ? 'The public note may calm people down, but the internal follow-up still lacks the detail needed to prevent a repeat.'
          : 'The draft is directionally sound, but it still under-explains either public impact or internal ownership.';

  outcomeSummaryEl.textContent = `${outcome.posture}. Trust ${outcome.trust}, learning ${outcome.learning}, risk ${outcome.risk}, coverage ${outcome.coverage}.`;
  outcomeTagsEl.innerHTML = [
    `<span class="${outcome.trust >= 60 ? 'positive' : 'warning'}">Trust ${outcome.trust >= 60 ? 'holding' : 'fragile'}</span>`,
    `<span class="${outcome.learning >= 60 ? 'positive' : 'warning'}">Learning ${outcome.learning >= 60 ? 'usable' : 'thin'}</span>`,
    `<span class="${outcome.risk >= 65 ? 'negative' : 'positive'}">Risk ${outcome.risk >= 65 ? 'elevated' : 'contained'}</span>`,
  ].join('');
}

function renderNeutralState() {
  trustScoreEl.textContent = '0';
  learningScoreEl.textContent = '0';
  riskScoreEl.textContent = '0';
  coverageScoreEl.textContent = '0';
  scorecardListEl.innerHTML = '<li>Build both notes, then publish to inspect the tradeoff.</li>';
  outcomeSummaryEl.textContent = 'Publish the postmortem to read how your disclosure posture lands.';
  outcomeTagsEl.innerHTML = '';
  coachSummaryEl.textContent = 'Balanced postmortems name customer impact, mitigation, and next safeguards without turning into a denial memo.';
}

function renderAll() {
  renderScenarioOptions();
  renderScenarioHeader();
  renderFactBank();
  renderSelectionList(publicListEl, 'publicFacts', PUBLIC_LIMIT, 'No public facts selected yet.');
  renderSelectionList(internalListEl, 'internalFacts', INTERNAL_LIMIT, 'No internal follow-up facts selected yet.');

  if (state.lastOutcome) {
    renderOutcome(state.lastOutcome);
  } else {
    renderNeutralState();
  }
}

function publishPostmortem() {
  state.lastOutcome = computeOutcome();
  renderAll();
  setStatus(`Published ${getScenario().title}. ${state.lastOutcome.posture}.`);
}

function buildDisclosureBrief() {
  const outcome = state.lastOutcome || computeOutcome();
  const publicFacts = state.publicFacts.map((id) => getFactById(id)?.text).filter(Boolean);
  const internalFacts = state.internalFacts.map((id) => getFactById(id)?.text).filter(Boolean);
  return [
    `Scenario: ${getScenario().title}`,
    `Posture: ${outcome.posture}`,
    `Scores: trust ${outcome.trust} | learning ${outcome.learning} | risk ${outcome.risk} | coverage ${outcome.coverage}`,
    '',
    'Public note:',
    ...publicFacts.map((fact, index) => `${index + 1}. ${fact}`),
    '',
    'Internal follow-up:',
    ...internalFacts.map((fact, index) => `${index + 1}. ${fact}`),
  ].join('\n');
}

scenarioSelect.addEventListener('change', () => {
  state.scenarioId = scenarioSelect.value;
  resetSelections(`Loaded ${getScenario().title}.`);
});

surpriseBtn.addEventListener('click', () => {
  const options = scenarios.filter((scenario) => scenario.id !== state.scenarioId);
  state.scenarioId = options[Math.floor(Math.random() * options.length)].id;
  resetSelections(`Switched to ${getScenario().title}.`);
});

resetBtn.addEventListener('click', () => {
  resetSelections('Cleared both notes for the current scenario.');
});

publishBtn.addEventListener('click', publishPostmortem);

copyBriefBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(buildDisclosureBrief());
    setStatus('Copied a disclosure brief with the current public and internal note split.');
  } catch (error) {
    setStatus('Clipboard copy failed in this environment.');
  }
});

renderAll();
setStatus(`Loaded ${getScenario().title}. Build the public and internal notes, then publish.`);
