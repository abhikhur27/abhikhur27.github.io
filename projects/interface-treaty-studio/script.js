const scenarioList = document.getElementById('scenario-list');
const clauseList = document.getElementById('clause-list');
const scenarioSummary = document.getElementById('scenario-summary');
const budgetSummary = document.getElementById('budget-summary');
const postureBoard = document.getElementById('posture-board');
const ledgerBoard = document.getElementById('ledger-board');
const failureBoard = document.getElementById('failure-board');
const personaBoard = document.getElementById('persona-board');
const treatySummary = document.getElementById('treaty-summary');
const treatyChips = document.getElementById('treaty-chips');
const statusEl = document.getElementById('status');
const copyBriefBtn = document.getElementById('copy-brief');
const copyLinkBtn = document.getElementById('copy-link');

const budgetLimit = 9;
const scenarios = [
  {
    id: 'bulk-delete',
    title: 'Bulk Delete Workspace',
    pressure: 'High irreversibility',
    description: 'A power user is deleting many records at once and wants speed without accidental destruction.',
    base: { speed: 56, trust: 40, control: 42, calm: 38, support: 36 },
    required: ['undo', 'confirm-risk'],
    preferred: ['activity-log', 'instant-feedback'],
  },
  {
    id: 'autosave-notes',
    title: 'Autosave Field Notes',
    pressure: 'Silent background work',
    description: 'A note-taking tool wants edits to feel instant while making failures and rollback behavior understandable.',
    base: { speed: 62, trust: 46, control: 45, calm: 47, support: 42 },
    required: ['local-draft', 'visible-progress'],
    preferred: ['instant-feedback', 'activity-log'],
  },
  {
    id: 'schedule-builder',
    title: 'Shared Schedule Builder',
    pressure: 'Conflicting edits',
    description: 'A planner is coordinating many moving parts, so users need clarity about what changed and what can be undone.',
    base: { speed: 48, trust: 51, control: 54, calm: 43, support: 44 },
    required: ['activity-log', 'undo'],
    preferred: ['visible-progress', 'automation-explain'],
  },
  {
    id: 'moderation-queue',
    title: 'Moderation Queue Triage',
    pressure: 'Automation trust',
    description: 'Reviewers want automation help, but only if the system makes its confidence and intervention boundaries obvious.',
    base: { speed: 51, trust: 44, control: 49, calm: 41, support: 39 },
    required: ['automation-explain', 'activity-log'],
    preferred: ['confirm-risk', 'quiet-mode'],
  },
];

const clauses = [
  {
    id: 'instant-feedback',
    title: 'Immediate acknowledgement',
    cost: 1,
    description: 'The interface confirms the click instantly, even before the longer operation settles.',
    effects: { speed: 18, trust: 6, control: 2, calm: 4, support: 2 },
  },
  {
    id: 'visible-progress',
    title: 'Visible progress and state',
    cost: 2,
    description: 'Users can see what is pending, what completed, and what is still uncertain.',
    effects: { speed: -2, trust: 14, control: 6, calm: 14, support: 6 },
  },
  {
    id: 'undo',
    title: 'Explicit undo window',
    cost: 2,
    description: 'Risky actions stay reversible for a short, obvious window.',
    effects: { speed: -4, trust: 16, control: 18, calm: 10, support: 10 },
  },
  {
    id: 'confirm-risk',
    title: 'Confirm only the dangerous step',
    cost: 2,
    description: 'The interface spends friction only when the blast radius is real.',
    effects: { speed: -6, trust: 12, control: 12, calm: 8, support: 8 },
  },
  {
    id: 'activity-log',
    title: 'Visible decision ledger',
    cost: 1,
    description: 'Actions leave an inspectable trail instead of disappearing into silent state.',
    effects: { speed: -1, trust: 10, control: 9, calm: 6, support: 12 },
  },
  {
    id: 'automation-explain',
    title: 'Explain automation posture',
    cost: 1,
    description: 'The system states what was automatic, what was suggested, and where confidence stops.',
    effects: { speed: 0, trust: 14, control: 10, calm: 7, support: 10 },
  },
  {
    id: 'local-draft',
    title: 'Keep a local fallback draft',
    cost: 2,
    description: 'Edits survive network weirdness even before the canonical save finishes.',
    effects: { speed: 8, trust: 12, control: 10, calm: 12, support: 6 },
  },
  {
    id: 'quiet-mode',
    title: 'Quiet background mode',
    cost: 1,
    description: 'Low-risk work stays lightweight instead of covering the interface in ceremony.',
    effects: { speed: 8, trust: 2, control: 0, calm: 10, support: -2 },
  },
];

const scenarioMap = Object.fromEntries(scenarios.map((scenario) => [scenario.id, scenario]));
const clauseMap = Object.fromEntries(clauses.map((clause) => [clause.id, clause]));

const state = loadState();

function defaultState() {
  return {
    scenarioId: scenarios[0].id,
    selectedClauses: ['instant-feedback', 'visible-progress', 'undo'],
  };
}

function loadState() {
  const params = new URLSearchParams(window.location.search);
  const scenarioId = params.get('scenario');
  const selectedClauses = (params.get('clauses') || '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => clauseMap[value]);
  return {
    scenarioId: scenarioMap[scenarioId] ? scenarioId : defaultState().scenarioId,
    selectedClauses: selectedClauses.length ? selectedClauses : defaultState().selectedClauses,
  };
}

function saveState() {
  const params = new URLSearchParams(window.location.search);
  params.set('scenario', state.scenarioId);
  params.set('clauses', state.selectedClauses.join(','));
  window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
}

function currentScenario() {
  return scenarioMap[state.scenarioId];
}

function selectedClauseObjects() {
  return state.selectedClauses.map((id) => clauseMap[id]).filter(Boolean);
}

function spentBudget() {
  return selectedClauseObjects().reduce((sum, clause) => sum + clause.cost, 0);
}

function computeOutcome() {
  const scenario = currentScenario();
  const selected = selectedClauseObjects();
  const metrics = { ...scenario.base };

  selected.forEach((clause) => {
    Object.entries(clause.effects).forEach(([key, value]) => {
      metrics[key] += value;
    });
  });

  const failures = [];
  scenario.required.forEach((requiredId) => {
    if (!state.selectedClauses.includes(requiredId)) {
      failures.push(`Missing ${clauseMap[requiredId].title.toLowerCase()} leaves the scenario exposed.`);
      metrics.trust -= 18;
      metrics.control -= 10;
      metrics.support -= 8;
    }
  });

  scenario.preferred.forEach((preferredId) => {
    if (!state.selectedClauses.includes(preferredId)) {
      metrics.calm -= 5;
      failures.push(`${clauseMap[preferredId].title} is absent, so the flow still feels rough around the edges.`);
    }
  });

  if (!state.selectedClauses.includes('quiet-mode') && metrics.speed < 60) {
    failures.push('The treaty is honest, but it may feel ceremonious on low-risk actions.');
  }
  if (!state.selectedClauses.includes('activity-log')) {
    failures.push('Operators lose forensic clarity when nothing leaves a durable action trail.');
  }
  if (!state.selectedClauses.includes('automation-explain') && scenario.id === 'moderation-queue') {
    failures.push('Automation without an explanation layer reads like hidden policy, not assistance.');
  }

  Object.keys(metrics).forEach((key) => {
    metrics[key] = Math.max(0, Math.min(100, metrics[key]));
  });

  return { metrics, failures };
}

function renderScenarios() {
  const scenario = currentScenario();
  scenarioSummary.textContent = `${scenario.pressure} | ${scenario.description}`;
  scenarioList.innerHTML = scenarios.map((item) => `
    <button class="scenario-card ${item.id === state.scenarioId ? 'active' : 'secondary'}" type="button" data-scenario-id="${item.id}">
      <h3>${item.title}</h3>
      <p class="scenario-copy">${item.description}</p>
      <div class="scenario-meta">
        <span class="pill">${item.pressure}</span>
        <span class="pill">Needs ${item.required.length} hard promises</span>
      </div>
    </button>
  `).join('');

  scenarioList.querySelectorAll('[data-scenario-id]').forEach((button) => {
    button.addEventListener('click', () => {
      state.scenarioId = button.dataset.scenarioId;
      saveState();
      render();
    });
  });
}

function renderClauses() {
  const spent = spentBudget();
  budgetSummary.textContent = `${spent}/${budgetLimit} points spent. ${budgetLimit - spent} points left.`;
  clauseList.innerHTML = clauses.map((clause) => {
    const active = state.selectedClauses.includes(clause.id);
    return `
      <button class="clause-card ${active ? 'active' : 'secondary'}" type="button" data-clause-id="${clause.id}">
        <div class="clause-head">
          <div>
            <h3>${clause.title}</h3>
            <p class="clause-copy">${clause.description}</p>
          </div>
          <span class="pill">${clause.cost} pt${clause.cost === 1 ? '' : 's'}</span>
        </div>
        <div class="clause-meta">
          <span class="pill">Trust ${clause.effects.trust >= 0 ? '+' : ''}${clause.effects.trust}</span>
          <span class="pill">Control ${clause.effects.control >= 0 ? '+' : ''}${clause.effects.control}</span>
          <span class="pill">Calm ${clause.effects.calm >= 0 ? '+' : ''}${clause.effects.calm}</span>
        </div>
      </button>
    `;
  }).join('');

  clauseList.querySelectorAll('[data-clause-id]').forEach((button) => {
    button.addEventListener('click', () => toggleClause(button.dataset.clauseId));
  });
}

function toggleClause(clauseId) {
  const active = state.selectedClauses.includes(clauseId);
  if (active) {
    state.selectedClauses = state.selectedClauses.filter((id) => id !== clauseId);
    statusEl.textContent = `Removed ${clauseMap[clauseId].title.toLowerCase()} from the treaty.`;
  } else {
    const nextSpend = spentBudget() + clauseMap[clauseId].cost;
    if (nextSpend > budgetLimit) {
      statusEl.textContent = `Budget exceeded. Remove another clause before adding ${clauseMap[clauseId].title.toLowerCase()}.`;
      return;
    }
    state.selectedClauses = [...state.selectedClauses, clauseId];
    statusEl.textContent = `Added ${clauseMap[clauseId].title.toLowerCase()} to the treaty.`;
  }
  saveState();
  render();
}

function renderOutcome() {
  const scenario = currentScenario();
  const selected = selectedClauseObjects();
  const { metrics, failures } = computeOutcome();
  const spent = spentBudget();
  const total = Math.round((metrics.speed + metrics.trust + metrics.control + metrics.calm + metrics.support) / 5);
  const label = total >= 74 ? 'Defensible treaty' : total >= 58 ? 'Conditional treaty' : 'Brittle treaty';
  const strongest = Object.entries(metrics).sort((a, b) => b[1] - a[1])[0];
  const weakest = Object.entries(metrics).sort((a, b) => a[1] - b[1])[0];

  postureBoard.innerHTML = `
    <p><strong>${label}</strong></p>
    <p>Overall posture ${total}/100 for ${scenario.title.toLowerCase()}.</p>
    <p>Budget remaining: ${budgetLimit - spent}.</p>
  `;

  ledgerBoard.innerHTML = `
    <p><strong>Strongest promise:</strong> ${strongest[0]} at ${strongest[1]}.</p>
    <p><strong>Weakest promise:</strong> ${weakest[0]} at ${weakest[1]}.</p>
    <p><strong>Clause density:</strong> ${selected.length} promise${selected.length === 1 ? '' : 's'} carrying the treaty.</p>
  `;

  failureBoard.innerHTML = failures.length
    ? failures.slice(0, 3).map((failure) => `<p>${failure}</p>`).join('')
    : '<p>No major treaty break is obvious. The remaining tradeoff is mostly how much friction the team wants to spend.</p>';

  const firstTimer =
    metrics.calm >= 68 && metrics.trust >= 68
      ? 'A first-time user is likely to feel oriented rather than ambushed.'
      : 'A first-time user may still wonder whether the system really has their back.';
  const expert =
    metrics.speed >= 68 && metrics.control >= 62
      ? 'A power user keeps enough velocity without feeling trapped.'
      : 'A power user may feel either slowed down or under-protected.';
  const operator =
    metrics.support >= 64
      ? 'Operators inherit enough traceability to debug the aftermath.'
      : 'Operators are still missing the paper trail they need after something goes wrong.';

  personaBoard.innerHTML = `
    <p><strong>First-timer:</strong> ${firstTimer}</p>
    <p><strong>Power user:</strong> ${expert}</p>
    <p><strong>Operator:</strong> ${operator}</p>
  `;

  treatySummary.textContent = `${selected.length} clauses selected for ${scenario.title.toLowerCase()}.`;
  treatyChips.innerHTML = selected.length
    ? selected.map((clause) => `<span class="chip">${clause.title} · ${clause.cost} pt${clause.cost === 1 ? '' : 's'}</span>`).join('')
    : '<span class="chip">No clauses selected.</span>';
}

function buildBrief() {
  const scenario = currentScenario();
  const { metrics, failures } = computeOutcome();
  return [
    'Interface Treaty Studio Brief',
    '',
    `Scenario: ${scenario.title}`,
    `Pressure: ${scenario.pressure}`,
    `Selected clauses: ${selectedClauseObjects().map((clause) => clause.title).join(', ') || 'none'}`,
    `Budget: ${spentBudget()}/${budgetLimit}`,
    `Metrics: speed ${metrics.speed}, trust ${metrics.trust}, control ${metrics.control}, calm ${metrics.calm}, support ${metrics.support}`,
    `Likely breaks: ${failures.slice(0, 3).join(' | ') || 'No obvious major treaty break.'}`,
    `Share link: ${window.location.href}`,
  ].join('\n');
}

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
    statusEl.textContent = successMessage;
  } catch (error) {
    statusEl.textContent = 'Clipboard access failed in this environment.';
  }
}

function render() {
  renderScenarios();
  renderClauses();
  renderOutcome();
}

copyBriefBtn.addEventListener('click', () => copyText(buildBrief(), 'Copied the current treaty brief.'));
copyLinkBtn.addEventListener('click', () => copyText(window.location.href, 'Copied the share link.'));

render();
