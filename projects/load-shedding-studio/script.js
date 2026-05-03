const laneGrid = document.getElementById('lane-grid');
const roundLabel = document.getElementById('round-label');
const scenarioCopy = document.getElementById('scenario-copy');
const degradeCount = document.getElementById('degrade-count');
const protectCount = document.getElementById('protect-count');
const commsCount = document.getElementById('comms-count');
const trustValue = document.getElementById('trust-value');
const uptimeValue = document.getElementById('uptime-value');
const burnValue = document.getElementById('burn-value');
const trustMeter = document.getElementById('trust-meter');
const uptimeMeter = document.getElementById('uptime-meter');
const burnMeter = document.getElementById('burn-meter');
const trustMeterLabel = document.getElementById('trust-meter-label');
const uptimeMeterLabel = document.getElementById('uptime-meter-label');
const burnMeterLabel = document.getElementById('burn-meter-label');
const policyRead = document.getElementById('policy-read');
const timeline = document.getElementById('timeline');
const statusText = document.getElementById('status-text');
const resolveBtn = document.getElementById('resolve-btn');
const resetBtn = document.getElementById('reset-btn');
const endingCard = document.getElementById('ending-card');

const waveDeck = [
  {
    title: 'Checkout traffic doubles after a promo push.',
    prompt: 'Protect payment and auth, but decide which discovery and analytics traffic can absorb degradation.',
    resources: { degrade: 3, protect: 2, comms: 1 },
    lanes: [
      { id: 'payments', name: 'Payments', criticality: 5, visibility: 4, elasticity: 1 },
      { id: 'search', name: 'Search', criticality: 3, visibility: 5, elasticity: 3 },
      { id: 'analytics', name: 'Analytics', criticality: 2, visibility: 1, elasticity: 5 },
    ],
  },
  {
    title: 'A dependency starts timing out on cold cache misses.',
    prompt: 'Keep the user-facing spine alive without burning every protection token on background work.',
    resources: { degrade: 2, protect: 2, comms: 1 },
    lanes: [
      { id: 'auth', name: 'Auth API', criticality: 5, visibility: 4, elasticity: 1 },
      { id: 'catalog', name: 'Catalog Reads', criticality: 4, visibility: 4, elasticity: 2 },
      { id: 'feeds', name: 'Recommendation Feeds', criticality: 2, visibility: 3, elasticity: 4 },
    ],
  },
  {
    title: 'Mobile clients start replaying failed requests.',
    prompt: 'Limit the amplification loop before retries turn a slowdown into a self-inflicted outage.',
    resources: { degrade: 3, protect: 1, comms: 2 },
    lanes: [
      { id: 'media', name: 'Media Uploads', criticality: 3, visibility: 4, elasticity: 4 },
      { id: 'orders', name: 'Order Mutations', criticality: 5, visibility: 5, elasticity: 1 },
      { id: 'notifications', name: 'Notification Fanout', criticality: 2, visibility: 2, elasticity: 5 },
    ],
  },
  {
    title: 'A regional failover leaves less headroom than expected.',
    prompt: 'Gracefully degrade features that can bend while preserving one clean customer story.',
    resources: { degrade: 3, protect: 2, comms: 1 },
    lanes: [
      { id: 'maps', name: 'Maps + Tiles', criticality: 4, visibility: 5, elasticity: 2 },
      { id: 'chat', name: 'Support Chat', criticality: 3, visibility: 4, elasticity: 3 },
      { id: 'reports', name: 'Exports + Reports', criticality: 2, visibility: 2, elasticity: 5 },
    ],
  },
  {
    title: 'Internal queues back up behind a database hot partition.',
    prompt: 'Protect the smallest set of write paths that keeps the business coherent and shed everything else honestly.',
    resources: { degrade: 2, protect: 2, comms: 2 },
    lanes: [
      { id: 'writes', name: 'Core Writes', criticality: 5, visibility: 4, elasticity: 1 },
      { id: 'history', name: 'History Views', criticality: 3, visibility: 4, elasticity: 3 },
      { id: 'experiments', name: 'Experiment Logging', criticality: 1, visibility: 1, elasticity: 5 },
    ],
  },
  {
    title: 'Recovery headroom appears, but the burn has accumulated.',
    prompt: 'Finish the incident without overcorrecting into another wave of user-visible instability.',
    resources: { degrade: 1, protect: 3, comms: 1 },
    lanes: [
      { id: 'billing', name: 'Billing Jobs', criticality: 4, visibility: 3, elasticity: 2 },
      { id: 'sessions', name: 'Session Refresh', criticality: 5, visibility: 5, elasticity: 1 },
      { id: 'feeds', name: 'Feed Personalization', criticality: 2, visibility: 3, elasticity: 4 },
    ],
  },
];

function initialState() {
  return {
    waveIndex: 0,
    trust: 74,
    uptime: 82,
    burn: 24,
    selections: {},
    history: [],
  };
}

let state = initialState();

function clamp(value) {
  return Math.max(0, Math.min(100, value));
}

function currentWave() {
  return waveDeck[state.waveIndex];
}

function laneSelection(id) {
  return state.selections[id] || { degrade: 0, protect: 0, comms: 0 };
}

function spent(resource) {
  return currentWave().lanes.reduce((sum, lane) => sum + laneSelection(lane.id)[resource], 0);
}

function remaining(resource) {
  return Math.max(0, currentWave().resources[resource] - spent(resource));
}

function setSelection(laneId, resource, delta) {
  const current = laneSelection(laneId);
  const nextValue = Math.max(0, current[resource] + delta);
  const resourceDelta = nextValue - current[resource];
  if (resourceDelta > remaining(resource)) {
    statusText.textContent = `No ${resource} tokens left this wave.`;
    return;
  }
  state.selections[laneId] = { ...current, [resource]: nextValue };
  statusText.textContent = `Updated ${resource} on ${laneId}.`;
  render();
}

function scoreLane(lane) {
  const selection = laneSelection(lane.id);
  const protection = selection.protect * 3 + selection.comms;
  const degradationRelief = selection.degrade * Math.max(1, lane.elasticity);
  const loadGap = Math.max(0, lane.criticality * 2 - protection - degradationRelief);
  const trustDelta = selection.comms ? 3 : lane.visibility >= 4 && selection.degrade ? -5 : loadGap >= 5 ? -6 : -2;
  const uptimeDelta = protection * 2 + degradationRelief - loadGap * 2;
  const burnDelta = loadGap * 3 + selection.protect - selection.degrade;

  return {
    trustDelta,
    uptimeDelta,
    burnDelta,
    summary:
      loadGap <= 1
        ? `${lane.name} stayed coherent under load.`
        : `${lane.name} leaked pressure with a gap of ${loadGap}, so the wave still hurt users or operators.`,
  };
}

function resolveWave() {
  const wave = currentWave();
  const results = wave.lanes.map(scoreLane);

  state.trust = clamp(state.trust + results.reduce((sum, result) => sum + result.trustDelta, 0));
  state.uptime = clamp(state.uptime + results.reduce((sum, result) => sum + result.uptimeDelta, 0));
  state.burn = clamp(state.burn + results.reduce((sum, result) => sum + result.burnDelta, 0));
  state.history.unshift({
    wave: state.waveIndex + 1,
    title: wave.title,
    result: results.map((result) => result.summary).join(' '),
  });

  if (state.waveIndex === waveDeck.length - 1) {
    resolveBtn.disabled = true;
    statusText.textContent = 'Scenario complete. Review the final service posture.';
    renderEnding();
    render();
    return;
  }

  state.waveIndex += 1;
  state.selections = {};
  endingCard.classList.add('hidden');
  statusText.textContent = 'Wave resolved. The next overload pattern is live.';
  render();
}

function renderEnding() {
  let title = 'You preserved graceful degradation.';
  let note = 'Core flows stayed upright and the degraded lanes were honest enough that users could still predict the system.';

  if (state.trust <= 45 || state.burn >= 65) {
    title = 'The incident turned into trust burn.';
    note = 'Too many visible cuts landed without a clean policy story, so the platform survived technically but not reputationally.';
  } else if (state.uptime >= 88 && state.burn <= 34) {
    title = 'You ran a disciplined overload playbook.';
    note = 'The protected lanes were small, the degradations were intentional, and the recovery runway stayed intact.';
  }

  endingCard.innerHTML = `<h3>${title}</h3><p>${note}</p>`;
  endingCard.classList.remove('hidden');
}

function renderLanes() {
  const wave = currentWave();
  laneGrid.innerHTML = wave.lanes.map((lane) => {
    const selection = laneSelection(lane.id);
    const cardClasses = [
      'lane-card',
      selection.protect ? 'is-protected' : '',
      selection.degrade ? 'is-degraded' : '',
    ].filter(Boolean).join(' ');
    return `
      <article class="${cardClasses}">
        <header>
          <div>
            <h3>${lane.name}</h3>
            <p class="status">Criticality ${lane.criticality} | Visibility ${lane.visibility} | Elasticity ${lane.elasticity}</p>
          </div>
          <span class="pill">Protect ${selection.protect} | Degrade ${selection.degrade}</span>
        </header>
        <p class="incident-copy">${lane.elasticity >= 4 ? 'Elastic lane: good candidate for graceful degradation.' : lane.criticality >= 5 ? 'Core lane: outages here will define the incident.' : 'Shared lane: protect only if it preserves a bigger customer story.'}</p>
        <div class="allocation-row">
          <button type="button" data-lane="${lane.id}" data-resource="protect" data-delta="1">+ Protect</button>
          <button type="button" data-lane="${lane.id}" data-resource="protect" data-delta="-1">- Protect</button>
          <button type="button" data-lane="${lane.id}" data-resource="degrade" data-delta="1">+ Degrade</button>
          <button type="button" data-lane="${lane.id}" data-resource="degrade" data-delta="-1">- Degrade</button>
          <button type="button" data-lane="${lane.id}" data-resource="comms" data-delta="1">+ Comms</button>
          <button type="button" data-lane="${lane.id}" data-resource="comms" data-delta="-1">- Comms</button>
        </div>
      </article>
    `;
  }).join('');

  laneGrid.querySelectorAll('button[data-lane]').forEach((button) => {
    button.addEventListener('click', () => {
      setSelection(button.dataset.lane, button.dataset.resource, Number.parseInt(button.dataset.delta, 10));
    });
  });
}

function renderTimeline() {
  timeline.innerHTML = state.history.map((entry) => `<li><strong>Wave ${entry.wave}:</strong> ${entry.title} ${entry.result}</li>`).join('');
}

function renderPolicyRead() {
  const wave = currentWave();
  const mostCritical = [...wave.lanes].sort((a, b) => b.criticality - a.criticality)[0];
  const mostElastic = [...wave.lanes].sort((a, b) => b.elasticity - a.elasticity)[0];
  policyRead.textContent = `Protect ${mostCritical.name}, shed pressure from ${mostElastic.name}, and spend comms only when the degraded lane is customer-visible enough to trigger confusion.`;
}

function renderMeters() {
  trustValue.textContent = String(state.trust);
  uptimeValue.textContent = String(state.uptime);
  burnValue.textContent = String(state.burn);
  trustMeter.style.width = `${state.trust}%`;
  uptimeMeter.style.width = `${state.uptime}%`;
  burnMeter.style.width = `${state.burn}%`;
  trustMeterLabel.textContent = `${state.trust}%`;
  uptimeMeterLabel.textContent = `${state.uptime}%`;
  burnMeterLabel.textContent = `${state.burn}%`;
}

function renderResources() {
  const wave = currentWave();
  roundLabel.textContent = `Wave ${state.waveIndex + 1} of ${waveDeck.length}`;
  scenarioCopy.textContent = `${wave.title} ${wave.prompt}`;
  degradeCount.textContent = String(remaining('degrade'));
  protectCount.textContent = String(remaining('protect'));
  commsCount.textContent = String(remaining('comms'));
}

function render() {
  renderResources();
  renderMeters();
  renderPolicyRead();
  renderLanes();
  renderTimeline();
}

resolveBtn.addEventListener('click', resolveWave);
resetBtn.addEventListener('click', () => {
  state = initialState();
  resolveBtn.disabled = false;
  endingCard.classList.add('hidden');
  statusText.textContent = 'Scenario reset. Choose how this overload wave gets absorbed.';
  render();
});

render();
