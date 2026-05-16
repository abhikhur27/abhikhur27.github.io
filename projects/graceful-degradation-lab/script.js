const scenarioList = document.getElementById('scenario-list');
const scenarioSummary = document.getElementById('scenario-summary');
const surfaceList = document.getElementById('surface-list');
const policySummary = document.getElementById('policy-summary');
const verdictBoard = document.getElementById('verdict-board');
const capacityBoard = document.getElementById('capacity-board');
const trustBoard = document.getElementById('trust-board');
const operatorBoard = document.getElementById('operator-board');
const timelineList = document.getElementById('timeline-list');
const timelineSummary = document.getElementById('timeline-summary');
const statusEl = document.getElementById('status');
const runSimulationBtn = document.getElementById('run-simulation');
const copyBriefBtn = document.getElementById('copy-brief');
const copyLinkBtn = document.getElementById('copy-link');

const surfaces = [
  { id: 'search', title: 'Search', note: 'Discovery surface that users still expect to feel present during stress.' },
  { id: 'media', title: 'Media Feed', note: 'High-bandwidth content where partial service may be better than pretending everything is normal.' },
  { id: 'checkout', title: 'Checkout', note: 'Critical path where queue honesty can be better than hidden retries.' },
  { id: 'analytics', title: 'Analytics', note: 'Internal visibility surface that can often degrade first to protect user paths.' },
];

const modeCatalog = {
  full: { label: 'Keep Full', capacity: 1, trustPenalty: 0, operatorLoad: 2, revenueShare: 1, queuePenalty: 0 },
  cached: { label: 'Cached Read', capacity: 1.45, trustPenalty: 4, operatorLoad: 1, revenueShare: 0.86, queuePenalty: 6 },
  queue: { label: 'Queue Gate', capacity: 1.2, trustPenalty: 2, operatorLoad: 3, revenueShare: 0.93, queuePenalty: 2 },
  disable: { label: 'Disable Cleanly', capacity: 2.05, trustPenalty: 11, operatorLoad: 0, revenueShare: 0.35, queuePenalty: 0 },
};

const scenarios = [
  {
    id: 'registration-rush',
    title: 'Registration Rush',
    pressure: 'Burst traffic + anxious students',
    description: 'Enrollment traffic spikes across discovery, carting, and final checkout while support lines are already thin.',
    events: [
      { minute: 8, surface: 'search', title: 'Course search surge', demand: 8, users: 180, revenue: 18, pain: 8, severity: 3 },
      { minute: 16, surface: 'checkout', title: 'Seat lock contention', demand: 10, users: 120, revenue: 38, pain: 12, severity: 8 },
      { minute: 31, surface: 'analytics', title: 'Dashboards lag under retry load', demand: 7, users: 35, revenue: 4, pain: 4, severity: 6 },
      { minute: 44, surface: 'media', title: 'Help-content image CDN drag', demand: 6, users: 90, revenue: 7, pain: 6, severity: 4 },
    ],
  },
  {
    id: 'ticket-drop',
    title: 'Ticket Drop',
    pressure: 'High-conversion path with brutal queue optics',
    description: 'A one-time ticket release punishes unclear waiting states and makes graceful queuing more important than raw page richness.',
    events: [
      { minute: 5, surface: 'media', title: 'Promo media bursts first', demand: 7, users: 150, revenue: 9, pain: 5, severity: 3 },
      { minute: 12, surface: 'search', title: 'Seat-map search flood', demand: 9, users: 220, revenue: 20, pain: 9, severity: 5 },
      { minute: 18, surface: 'checkout', title: 'Payment path overload', demand: 11, users: 140, revenue: 44, pain: 13, severity: 9 },
      { minute: 33, surface: 'analytics', title: 'Internal dashboards starve event routing', demand: 6, users: 22, revenue: 3, pain: 3, severity: 4 },
    ],
  },
  {
    id: 'mobile-release',
    title: 'Mobile Release Day',
    pressure: 'Noisy rollout with one critical customer path',
    description: 'A new app version causes mixed signal quality. The right degraded path should protect the purchase funnel without blinding the team.',
    events: [
      { minute: 6, surface: 'analytics', title: 'Crash dashboards ingest duplicate events', demand: 8, users: 28, revenue: 3, pain: 4, severity: 6 },
      { minute: 14, surface: 'search', title: 'App feed query fanout spikes', demand: 7, users: 170, revenue: 11, pain: 7, severity: 4 },
      { minute: 23, surface: 'checkout', title: 'Upgrade flow auth loop', demand: 10, users: 100, revenue: 34, pain: 12, severity: 8 },
      { minute: 37, surface: 'media', title: 'Remote image fetches back up', demand: 6, users: 130, revenue: 6, pain: 5, severity: 3 },
    ],
  },
];

const scenarioMap = Object.fromEntries(scenarios.map((scenario) => [scenario.id, scenario]));

const defaultPolicy = {
  search: 'cached',
  media: 'cached',
  checkout: 'queue',
  analytics: 'disable',
};

const state = loadState();

function loadState() {
  const params = new URLSearchParams(window.location.search);
  const scenarioId = scenarioMap[params.get('scenario')] ? params.get('scenario') : scenarios[0].id;
  const policy = { ...defaultPolicy };

  surfaces.forEach((surface) => {
    const mode = params.get(surface.id);
    if (modeCatalog[mode]) policy[surface.id] = mode;
  });

  return {
    scenarioId,
    policy,
    lastRun: null,
  };
}

function saveState() {
  const params = new URLSearchParams(window.location.search);
  params.set('scenario', state.scenarioId);
  surfaces.forEach((surface) => params.set(surface.id, state.policy[surface.id]));
  window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
}

function currentScenario() {
  return scenarioMap[state.scenarioId];
}

function renderScenarios() {
  const scenario = currentScenario();
  scenarioSummary.textContent = `${scenario.pressure} | ${scenario.description}`;
  scenarioList.innerHTML = scenarios
    .map((item) => `
      <button class="scenario-card ${item.id === state.scenarioId ? 'active' : 'secondary'}" type="button" data-scenario-id="${item.id}">
        <h3>${item.title}</h3>
        <p class="scenario-copy">${item.description}</p>
        <div class="scenario-meta">
          <span class="pill">${item.pressure}</span>
          <span class="pill">${item.events.length} stress events</span>
        </div>
      </button>
    `)
    .join('');

  scenarioList.querySelectorAll('[data-scenario-id]').forEach((button) => {
    button.addEventListener('click', () => {
      state.scenarioId = button.dataset.scenarioId;
      state.lastRun = null;
      saveState();
      statusEl.textContent = `Switched to ${currentScenario().title.toLowerCase()}.`;
      render();
    });
  });
}

function renderPolicy() {
  surfaceList.innerHTML = surfaces
    .map((surface) => `
      <article class="scenario-card active">
        <div class="clause-head">
          <div>
            <h3>${surface.title}</h3>
            <p class="scenario-copy">${surface.note}</p>
          </div>
          <span class="pill">${modeCatalog[state.policy[surface.id]].label}</span>
        </div>
        <div class="scenario-meta">
          <label class="pill">Mode
            <select data-surface-id="${surface.id}">
              ${Object.entries(modeCatalog)
                .map(([key, mode]) => `<option value="${key}" ${state.policy[surface.id] === key ? 'selected' : ''}>${mode.label}</option>`)
                .join('')}
            </select>
          </label>
        </div>
      </article>
    `)
    .join('');

  surfaceList.querySelectorAll('select[data-surface-id]').forEach((control) => {
    control.addEventListener('change', (event) => {
      state.policy[event.target.dataset.surfaceId] = event.target.value;
      state.lastRun = null;
      saveState();
      renderSummary();
      statusEl.textContent = `Updated the ${event.target.dataset.surfaceId} fallback mode.`;
    });
  });
}

function simulateScenario() {
  const scenario = currentScenario();
  const timeline = scenario.events.map((event) => {
    const modeKey = state.policy[event.surface];
    const mode = modeCatalog[modeKey];
    const servedShare = Math.min(1, mode.capacity / event.demand);
    const deferredUsers = Math.round(event.users * (1 - servedShare));
    const protectedRevenue = Math.round(event.revenue * mode.revenueShare * servedShare);
    const trustHit = Math.round(event.pain * mode.trustPenalty + deferredUsers / 18 + mode.queuePenalty);
    const operatorLoad = mode.operatorLoad + Math.round(event.severity * (servedShare < 0.9 ? 0.7 : 0.3));
    const posture = servedShare >= 0.95 ? 'absorbed cleanly' : servedShare >= 0.75 ? 'contained with visible compromise' : 'shed too much user pain';

    return {
      ...event,
      modeKey,
      modeLabel: mode.label,
      servedShare,
      deferredUsers,
      protectedRevenue,
      trustHit,
      operatorLoad,
      posture,
    };
  });

  const totalRevenue = scenario.events.reduce((sum, event) => sum + event.revenue, 0);
  const preservedRevenue = timeline.reduce((sum, event) => sum + event.protectedRevenue, 0);
  const deferredUsers = timeline.reduce((sum, event) => sum + event.deferredUsers, 0);
  const trust = Math.max(0, 86 - timeline.reduce((sum, event) => sum + event.trustHit, 0));
  const operatorLoad = timeline.reduce((sum, event) => sum + event.operatorLoad, 0);
  const throughput = totalRevenue ? Math.round((preservedRevenue / totalRevenue) * 100) : 0;
  const cleanEvents = timeline.filter((event) => event.servedShare >= 0.9).length;
  const queueHeavy = timeline.filter((event) => event.modeKey === 'queue').length;
  const disabledSurfaces = Object.values(state.policy).filter((mode) => mode === 'disable').length;
  const stance =
    trust >= 66 && throughput >= 72 && operatorLoad <= 19
      ? 'Defensible degraded path'
      : trust >= 50 && throughput >= 60
        ? 'Conditional degraded path'
        : 'Trust-burning degraded path';

  return {
    scenario,
    timeline,
    throughput,
    preservedRevenue,
    deferredUsers,
    trust,
    operatorLoad,
    cleanEvents,
    queueHeavy,
    disabledSurfaces,
    stance,
  };
}

function renderSummary() {
  const cachedCount = Object.values(state.policy).filter((mode) => mode === 'cached').length;
  const queueCount = Object.values(state.policy).filter((mode) => mode === 'queue').length;
  const disabledCount = Object.values(state.policy).filter((mode) => mode === 'disable').length;
  policySummary.textContent = `${cachedCount} cached | ${queueCount} queue-gated | ${disabledCount} disabled surface${disabledCount === 1 ? '' : 's'}.`;
}

function renderBoards() {
  const result = state.lastRun;
  if (!result) {
    verdictBoard.innerHTML = '<p>Run a scenario to score the degraded path.</p>';
    capacityBoard.innerHTML = '<p>Throughput and deferred-user posture will appear here.</p>';
    trustBoard.innerHTML = '<p>Trust pressure will appear here once the fallback policy is exercised.</p>';
    operatorBoard.innerHTML = '<p>Operator load and policy bias will appear here.</p>';
    timelineSummary.textContent = 'Run the scenario to generate timeline consequences.';
    timelineList.innerHTML = '';
    return;
  }

  verdictBoard.innerHTML = `
    <p><strong>${result.stance}</strong></p>
    <p>${result.cleanEvents}/${result.timeline.length} stress events stayed near-absorbed under the current fallback policy.</p>
    <p>${result.disabledSurfaces ? `${result.disabledSurfaces} surface${result.disabledSurfaces === 1 ? '' : 's'} were disabled outright, so honesty may be better than pretending full service still exists.` : 'No surface was hard-disabled, so the policy is betting on partial service instead of explicit shutdown.'}</p>
  `;

  capacityBoard.innerHTML = `
    <p><strong>Throughput:</strong> ${result.throughput}% of scenario revenue stayed protected.</p>
    <p><strong>Deferred users:</strong> ${result.deferredUsers} people were pushed into waits, retries, or dead ends.</p>
    <p>${result.queueHeavy ? `Queue-gating shows up on ${result.queueHeavy} event${result.queueHeavy === 1 ? '' : 's'}, which is often cleaner than silent failure if the copy is honest.` : 'No queue-heavy path was chosen, so the policy is favoring immediacy over explicit waiting.'}</p>
  `;

  trustBoard.innerHTML = `
    <p><strong>Trust budget:</strong> ${result.trust}/86.</p>
    <p><strong>Biggest trust burn:</strong> ${[...result.timeline].sort((a, b) => b.trustHit - a.trustHit)[0].title}.</p>
    <p>${result.trust >= 66 ? 'The degraded path is still socially defensible.' : result.trust >= 50 ? 'The policy works, but users will notice the compromise and need clearer framing.' : 'The fallback policy is preserving some capacity by spending too much visible trust.'}</p>
  `;

  operatorBoard.innerHTML = `
    <p><strong>Operator load:</strong> ${result.operatorLoad} points.</p>
    <p><strong>Hottest surface:</strong> ${[...result.timeline].sort((a, b) => b.operatorLoad - a.operatorLoad)[0].surface}.</p>
    <p>${result.operatorLoad <= 19 ? 'The team can probably keep up with this degraded path without panic routing.' : 'This policy keeps some user capacity alive, but it is shifting too much cleanup and context-switching burden onto operators.'}</p>
  `;

  timelineSummary.textContent = `${result.scenario.title}: ${result.stance.toLowerCase()} with trust ${result.trust}/86 and throughput ${result.throughput}%.`;
  timelineList.innerHTML = result.timeline
    .map((event) => `
      <article class="scenario-card active">
        <h3>${event.minute} min - ${event.title}</h3>
        <p class="scenario-copy">${event.surface} ran in <strong>${event.modeLabel}</strong> mode and ${event.posture}.</p>
        <div class="scenario-meta">
          <span class="pill">Deferred users ${event.deferredUsers}</span>
          <span class="pill">Revenue kept ${event.protectedRevenue}</span>
          <span class="pill">Trust hit ${event.trustHit}</span>
          <span class="pill">Operator load ${event.operatorLoad}</span>
        </div>
      </article>
    `)
    .join('');
}

function buildBrief() {
  if (!state.lastRun) {
    return 'Graceful Degradation Lab\n\nRun a scenario first to generate a fallback-policy brief.';
  }

  const lines = [
    'Graceful Degradation Lab Brief',
    '',
    `Scenario: ${state.lastRun.scenario.title}`,
    `Stance: ${state.lastRun.stance}`,
    `Trust budget: ${state.lastRun.trust}/86`,
    `Throughput protected: ${state.lastRun.throughput}%`,
    `Deferred users: ${state.lastRun.deferredUsers}`,
    `Operator load: ${state.lastRun.operatorLoad}`,
    '',
    'Surface policy:',
    ...surfaces.map((surface) => `- ${surface.title}: ${modeCatalog[state.policy[surface.id]].label}`),
    '',
    'Timeline:',
    ...state.lastRun.timeline.map((event) => `- ${event.minute} min | ${event.title} | ${event.modeLabel} | deferred ${event.deferredUsers} | trust hit ${event.trustHit}`),
  ];

  return lines.join('\n');
}

function render() {
  renderScenarios();
  renderPolicy();
  renderSummary();
  renderBoards();
}

runSimulationBtn.addEventListener('click', () => {
  state.lastRun = simulateScenario();
  saveState();
  statusEl.textContent = 'Scenario simulation complete.';
  renderBoards();
});

copyBriefBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(buildBrief());
    statusEl.textContent = 'Copied the degradation brief.';
  } catch (error) {
    statusEl.textContent = 'Clipboard copy failed in this environment.';
  }
});

copyLinkBtn.addEventListener('click', async () => {
  saveState();
  try {
    await navigator.clipboard.writeText(window.location.href);
    statusEl.textContent = 'Copied the share link with the current scenario and fallback policy.';
  } catch (error) {
    statusEl.textContent = 'Clipboard copy failed in this environment.';
  }
});

render();
