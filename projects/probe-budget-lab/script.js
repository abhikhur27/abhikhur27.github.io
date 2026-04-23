const scenarioTitle = document.getElementById('scenario-title');
const scenarioContext = document.getElementById('scenario-context');
const budgetPill = document.getElementById('budget-pill');
const serviceGrid = document.getElementById('service-grid');
const runIncidentBtn = document.getElementById('run-incident');
const resetProbesBtn = document.getElementById('reset-probes');
const nextScenarioBtn = document.getElementById('next-scenario');
const signalList = document.getElementById('signal-list');
const blindSpotNote = document.getElementById('blind-spot-note');
const coveragePill = document.getElementById('coverage-pill');
const suspectOptions = document.getElementById('suspect-options');
const actionOptions = document.getElementById('action-options');
const coverageScore = document.getElementById('coverage-score');
const diagnosisScore = document.getElementById('diagnosis-score');
const actionScore = document.getElementById('action-score');
const confidenceScore = document.getElementById('confidence-score');
const scoreSummary = document.getElementById('score-summary');
const copyBriefBtn = document.getElementById('copy-brief');

const services = [
  { id: 'edge', label: 'Edge Gateway', note: 'Ingress and rate-limit telemetry.' },
  { id: 'auth', label: 'Auth Service', note: 'Tokens, refresh, and identity checks.' },
  { id: 'api', label: 'Public API', note: 'Request fan-out and response shaping.' },
  { id: 'queue', label: 'Job Queue', note: 'Backlog depth and retry posture.' },
  { id: 'worker', label: 'Worker Fleet', note: 'Background execution and retries.' },
  { id: 'db', label: 'Primary DB', note: 'Write latency, lock pressure, and replica health.' },
];

const scenarios = [
  {
    title: 'Token Refresh Storm',
    context: 'Users are being logged out during checkout spikes. The incident started after a client-side retry patch landed, and you only have budget for three probes before the next wave starts.',
    budget: 3,
    culprit: 'auth',
    bestAction: 'Throttle refresh retries and quarantine the bad client build.',
    suspects: ['edge', 'auth', 'api', 'db'],
    actions: [
      'Throttle refresh retries and quarantine the bad client build.',
      'Scale the worker fleet and drain the queue harder.',
      'Raise the database connection pool ceiling immediately.',
    ],
    signals: {
      edge: 'Traffic is up, but request volume is normal once you collapse retries by session.',
      auth: 'Refresh-token validation is spiking 7x and the same client version is requesting new tokens every few seconds.',
      api: 'Checkout requests are mostly failing because upstream auth calls time out after repeated refresh attempts.',
      queue: 'Background queue depth is stable; nothing points to async backlog.',
      worker: 'Workers are healthy and idle.',
      db: 'Write latency is flat; the database is noisy but not the primary fault line.',
    },
    essential: ['auth', 'api'],
  },
  {
    title: 'Poison Job Backlog',
    context: 'A burst of media-processing jobs is timing out customer uploads. You can afford three probes before the support queue doubles again.',
    budget: 3,
    culprit: 'worker',
    bestAction: 'Pause the poison partition, isolate the bad payload family, and drain the healthy jobs separately.',
    suspects: ['queue', 'worker', 'api', 'db'],
    actions: [
      'Pause the poison partition, isolate the bad payload family, and drain the healthy jobs separately.',
      'Add more edge instances to reduce upload latency.',
      'Invalidate caches so the API can refetch clean job state.',
    ],
    signals: {
      edge: 'Ingress is normal; uploads are accepted quickly before failing later in the pipeline.',
      auth: 'No unusual token or session behavior.',
      api: 'Requests succeed, but status polling is stuck behind slow completion updates.',
      queue: 'One partition has runaway retries and the same payload hash keeps reappearing.',
      worker: 'A narrow worker pool is burning CPU on repeated decode failures and never finishing the batch.',
      db: 'Write throughput is down only because completed jobs are scarce.',
    },
    essential: ['queue', 'worker'],
  },
  {
    title: 'Replica Drift After Cache Flush',
    context: 'The team flushed caches during a deploy rollback. Read-heavy pages now disagree with admin edits, and you only get three probes before leadership asks for a root-cause call.',
    budget: 3,
    culprit: 'db',
    bestAction: 'Route consistency-sensitive reads to primary and pause the broad cache invalidation loop.',
    suspects: ['edge', 'api', 'queue', 'db'],
    actions: [
      'Route consistency-sensitive reads to primary and pause the broad cache invalidation loop.',
      'Scale up the queue consumers so replicas can catch up.',
      'Force every client to refresh and rebuild local state.',
    ],
    signals: {
      edge: 'Traffic looks ordinary; the problem is not a raw traffic surge.',
      auth: 'Identity flows are healthy.',
      api: 'Read endpoints disagree with recent writes depending on which read path they take.',
      queue: 'Async queues are mostly quiet.',
      worker: 'Workers are not the bottleneck.',
      db: 'Replica lag jumps after each cache flush and stale reads cluster around consistency-sensitive endpoints.',
    },
    essential: ['api', 'db'],
  },
];

const state = {
  scenarioIndex: 0,
  selectedProbes: new Set(),
  ran: false,
  selectedSuspect: '',
  selectedAction: '',
};

function currentScenario() {
  return scenarios[state.scenarioIndex];
}

function updateBudget() {
  budgetPill.textContent = `${state.selectedProbes.size} / ${currentScenario().budget} probes`;
}

function renderServices() {
  serviceGrid.innerHTML = services
    .map(
      (service) => `
        <button class="service-card ${state.selectedProbes.has(service.id) ? 'selected' : ''}" type="button" data-service="${service.id}">
          <h3>${service.label}</h3>
          <p>${service.note}</p>
        </button>
      `
    )
    .join('');

  serviceGrid.querySelectorAll('[data-service]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.service;
      if (state.selectedProbes.has(id)) {
        state.selectedProbes.delete(id);
      } else if (state.selectedProbes.size < currentScenario().budget) {
        state.selectedProbes.add(id);
      }
      state.ran = false;
      render();
    });
  });
}

function renderSignals() {
  const scenario = currentScenario();
  const visibleSignalCount = scenario.essential.filter((id) => state.selectedProbes.has(id)).length;
  const coverage = Math.round((visibleSignalCount / scenario.essential.length) * 100);
  coveragePill.textContent = `Coverage: ${coverage}%`;
  coverageScore.textContent = `${coverage}%`;

  signalList.innerHTML = services
    .map((service) => {
      const visible = state.ran && state.selectedProbes.has(service.id);
      return `
        <article class="signal-card ${visible ? '' : 'hidden-signal'}">
          <h3>${service.label}</h3>
          <p>${visible ? scenario.signals[service.id] : 'No probe placed here. This part of the graph stays dark.'}</p>
        </article>
      `;
    })
    .join('');

  blindSpotNote.textContent = state.ran
    ? `You revealed ${visibleSignalCount} of ${scenario.essential.length} decisive clue lanes. Missing probe coverage lowers operator confidence even if you guess correctly.`
    : 'Run the scenario to see which clues landed and which parts of the graph stayed dark.';
}

function renderDecisionOptions() {
  const scenario = currentScenario();
  suspectOptions.innerHTML = scenario.suspects
    .map(
      (id) => `
        <button class="decision-card ${state.selectedSuspect === id ? 'selected' : ''}" type="button" data-suspect="${id}">
          <h3>${services.find((service) => service.id === id)?.label || id}</h3>
          <p>Pin the likely source of the incident.</p>
        </button>
      `
    )
    .join('');

  suspectOptions.querySelectorAll('[data-suspect]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedSuspect = button.dataset.suspect;
      renderScore();
      renderDecisionOptions();
    });
  });

  actionOptions.innerHTML = scenario.actions
    .map(
      (action) => `
        <button class="decision-card ${state.selectedAction === action ? 'selected' : ''}" type="button" data-action="${encodeURIComponent(action)}">
          <h3>${action}</h3>
          <p>Pick the next operator move.</p>
        </button>
      `
    )
    .join('');

  actionOptions.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => {
      state.selectedAction = decodeURIComponent(button.dataset.action);
      renderScore();
      renderDecisionOptions();
    });
  });
}

function renderScore() {
  const scenario = currentScenario();
  const visibleSignalCount = scenario.essential.filter((id) => state.selectedProbes.has(id)).length;
  const coverage = Math.round((visibleSignalCount / scenario.essential.length) * 100);
  const diagnosisCorrect = state.selectedSuspect === scenario.culprit;
  const actionCorrect = state.selectedAction === scenario.bestAction;

  diagnosisScore.textContent = diagnosisCorrect ? 'Correct' : state.selectedSuspect ? 'Off target' : 'Pending';
  actionScore.textContent = actionCorrect ? 'Correct' : state.selectedAction ? 'Risky' : 'Pending';

  const confidence =
    !state.ran
      ? 'Low'
      : coverage === 100 && diagnosisCorrect && actionCorrect
        ? 'High'
        : coverage >= 50 && (diagnosisCorrect || actionCorrect)
          ? 'Medium'
          : 'Low';

  confidenceScore.textContent = confidence;

  scoreSummary.textContent = !state.ran
    ? 'Pick probes, run the incident, then choose the culprit and the next operator move.'
    : `${diagnosisCorrect ? 'Diagnosis landed.' : 'Diagnosis is still shaky.'} ${actionCorrect ? 'Mitigation is aligned with the real fault line.' : 'The current mitigation would burn time on the wrong layer.'}`;
}

function renderScenario() {
  const scenario = currentScenario();
  scenarioTitle.textContent = scenario.title;
  scenarioContext.textContent = scenario.context;
}

function render() {
  renderScenario();
  updateBudget();
  renderServices();
  renderSignals();
  renderDecisionOptions();
  renderScore();
}

function resetScenarioState() {
  state.selectedProbes = new Set();
  state.ran = false;
  state.selectedSuspect = '';
  state.selectedAction = '';
}

function runIncident() {
  state.ran = true;
  render();
}

function nextScenario() {
  state.scenarioIndex = (state.scenarioIndex + 1) % scenarios.length;
  resetScenarioState();
  render();
}

async function copyBrief() {
  const scenario = currentScenario();
  const lines = [
    'Probe Budget Lab Run Brief',
    '',
    `Scenario: ${scenario.title}`,
    `Selected probes: ${[...state.selectedProbes].map((id) => services.find((service) => service.id === id)?.label || id).join(', ') || 'None'}`,
    `Coverage: ${coverageScore.textContent}`,
    `Likely culprit: ${services.find((service) => service.id === state.selectedSuspect)?.label || 'Pending'}`,
    `Best next action: ${state.selectedAction || 'Pending'}`,
    `Confidence: ${confidenceScore.textContent}`,
    `Summary: ${scoreSummary.textContent}`,
  ];

  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    scoreSummary.textContent = 'Copied the current run brief.';
  } catch (error) {
    scoreSummary.textContent = 'Clipboard copy failed in this environment.';
  }
}

runIncidentBtn.addEventListener('click', runIncident);
resetProbesBtn.addEventListener('click', () => {
  resetScenarioState();
  render();
});
nextScenarioBtn.addEventListener('click', nextScenario);
copyBriefBtn.addEventListener('click', copyBrief);

render();
