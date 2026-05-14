const scenarioList = document.getElementById('scenario-list');
const scenarioSummary = document.getElementById('scenario-summary');
const charterSummary = document.getElementById('charter-summary');
const ruleList = document.getElementById('rule-list');
const verdictBoard = document.getElementById('verdict-board');
const pagerBoard = document.getElementById('pager-board');
const missBoard = document.getElementById('miss-board');
const operatorBoard = document.getElementById('operator-board');
const timelineList = document.getElementById('timeline-list');
const timelineSummary = document.getElementById('timeline-summary');
const statusEl = document.getElementById('status');
const runShiftBtn = document.getElementById('run-shift');
const copyBriefBtn = document.getElementById('copy-brief');
const copyLinkBtn = document.getElementById('copy-link');

const signals = [
  { id: 'latency', title: 'Latency', note: 'Customer-facing slowness and stalls.' },
  { id: 'errors', title: 'Error Rate', note: 'Explicit request failures and broken flows.' },
  { id: 'queue', title: 'Queue Backlog', note: 'Work building faster than the system drains it.' },
  { id: 'saturation', title: 'Saturation', note: 'Host or worker pressure before users fully feel it.' },
];

const thresholdValues = {
  tight: 3,
  balanced: 5,
  loose: 7,
};

const routeDelay = {
  pager: 2,
  slack: 8,
  digest: 18,
};

const routeLabels = {
  pager: 'Pager now',
  slack: 'Slack triage',
  digest: 'Digest only',
};

const scenarios = [
  {
    id: 'registration-rush',
    title: 'Registration Rush',
    pressure: 'Flash congestion + student frustration',
    description: 'Burst traffic creates a mix of queue spikes, visible slowness, and a few real failures while support lines fill up.',
    events: [
      { minute: 7, title: 'Warm-up spike', type: 'noise', signal: 'latency', intensity: 4, severity: 2 },
      { minute: 14, title: 'Queue spill into checkout', type: 'incident', signal: 'queue', intensity: 8, severity: 8 },
      { minute: 22, title: 'Retry burst', type: 'incident', signal: 'errors', intensity: 7, severity: 7 },
      { minute: 35, title: 'Lab jobs steal CPU', type: 'noise', signal: 'saturation', intensity: 5, severity: 3 },
      { minute: 46, title: 'Search endpoint slows', type: 'incident', signal: 'latency', intensity: 6, severity: 6 },
    ],
  },
  {
    id: 'overnight-etl',
    title: 'Overnight ETL Window',
    pressure: 'Few users, high operator cost for bad pages',
    description: 'The pipeline matters, but false pages at 2 a.m. spend trust fast unless the signal is unmistakable.',
    events: [
      { minute: 9, title: 'Batch fanout wobble', type: 'noise', signal: 'queue', intensity: 4, severity: 2 },
      { minute: 18, title: 'Warehouse lock contention', type: 'incident', signal: 'saturation', intensity: 8, severity: 7 },
      { minute: 31, title: 'Transient upstream 500s', type: 'noise', signal: 'errors', intensity: 5, severity: 3 },
      { minute: 44, title: 'Backfill backlog escape', type: 'incident', signal: 'queue', intensity: 7, severity: 6 },
      { minute: 58, title: 'Join query regression', type: 'incident', signal: 'latency', intensity: 7, severity: 8 },
    ],
  },
  {
    id: 'mobile-release',
    title: 'Mobile Release Day',
    pressure: 'Sensitive customer path + noisy rollout telemetry',
    description: 'A new release creates small blips and one ugly failure path. The charter has to separate real breakage from deployment chatter.',
    events: [
      { minute: 5, title: 'Cold-start CPU spike', type: 'noise', signal: 'saturation', intensity: 4, severity: 2 },
      { minute: 17, title: 'Auth token loop', type: 'incident', signal: 'errors', intensity: 8, severity: 9 },
      { minute: 27, title: 'Feed render jank', type: 'noise', signal: 'latency', intensity: 5, severity: 3 },
      { minute: 38, title: 'Retry queue buildup', type: 'incident', signal: 'queue', intensity: 6, severity: 6 },
      { minute: 49, title: 'Gradual API slowdown', type: 'incident', signal: 'latency', intensity: 7, severity: 7 },
    ],
  },
];

const scenarioMap = Object.fromEntries(scenarios.map((scenario) => [scenario.id, scenario]));

const defaultRules = Object.fromEntries(
  signals.map((signal) => [
    signal.id,
    {
      threshold: signal.id === 'errors' ? 'balanced' : 'loose',
      route: signal.id === 'errors' ? 'pager' : 'slack',
    },
  ])
);

const state = loadState();

function loadState() {
  const params = new URLSearchParams(window.location.search);
  const scenarioId = scenarioMap[params.get('scenario')] ? params.get('scenario') : scenarios[0].id;
  const rules = structuredClone(defaultRules);

  signals.forEach((signal) => {
    const threshold = params.get(`${signal.id}-threshold`);
    const route = params.get(`${signal.id}-route`);
    if (thresholdValues[threshold]) {
      rules[signal.id].threshold = threshold;
    }
    if (routeLabels[route]) {
      rules[signal.id].route = route;
    }
  });

  return {
    scenarioId,
    rules,
    lastRun: null,
  };
}

function saveState() {
  const params = new URLSearchParams(window.location.search);
  params.set('scenario', state.scenarioId);

  signals.forEach((signal) => {
    params.set(`${signal.id}-threshold`, state.rules[signal.id].threshold);
    params.set(`${signal.id}-route`, state.rules[signal.id].route);
  });

  window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
}

function currentScenario() {
  return scenarioMap[state.scenarioId];
}

function renderScenarios() {
  const scenario = currentScenario();
  scenarioSummary.textContent = `${scenario.pressure} | ${scenario.description}`;
  scenarioList.innerHTML = scenarios
    .map((item) => {
      const incidents = item.events.filter((event) => event.type === 'incident').length;
      return `
        <button class="scenario-card ${item.id === state.scenarioId ? 'active' : 'secondary'}" type="button" data-scenario-id="${item.id}">
          <h3>${item.title}</h3>
          <p class="scenario-copy">${item.description}</p>
          <div class="scenario-meta">
            <span class="pill">${item.pressure}</span>
            <span class="pill">${incidents} real incidents</span>
          </div>
        </button>
      `;
    })
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

function renderRules() {
  ruleList.innerHTML = signals
    .map((signal) => {
      const rule = state.rules[signal.id];
      return `
        <article class="clause-card active">
          <div class="clause-head">
            <div>
              <h3>${signal.title}</h3>
              <p class="clause-copy">${signal.note}</p>
            </div>
            <span class="pill">${routeLabels[rule.route]}</span>
          </div>
          <div class="scenario-meta">
            <label class="pill">Threshold
              <select data-signal-id="${signal.id}" data-control="threshold">
                <option value="tight" ${rule.threshold === 'tight' ? 'selected' : ''}>Tight</option>
                <option value="balanced" ${rule.threshold === 'balanced' ? 'selected' : ''}>Balanced</option>
                <option value="loose" ${rule.threshold === 'loose' ? 'selected' : ''}>Loose</option>
              </select>
            </label>
            <label class="pill">Route
              <select data-signal-id="${signal.id}" data-control="route">
                <option value="pager" ${rule.route === 'pager' ? 'selected' : ''}>Pager</option>
                <option value="slack" ${rule.route === 'slack' ? 'selected' : ''}>Slack</option>
                <option value="digest" ${rule.route === 'digest' ? 'selected' : ''}>Digest</option>
              </select>
            </label>
          </div>
        </article>
      `;
    })
    .join('');

  ruleList.querySelectorAll('select[data-signal-id]').forEach((control) => {
    control.addEventListener('change', (event) => {
      const signalId = event.target.dataset.signalId;
      const field = event.target.dataset.control;
      state.rules[signalId][field] = event.target.value;
      state.lastRun = null;
      saveState();
      renderSummary();
      statusEl.textContent = `Updated the ${signalId} charter.`;
    });
  });
}

function simulateShift() {
  const scenario = currentScenario();
  const timeline = scenario.events.map((event) => {
    const rule = state.rules[event.signal];
    const threshold = thresholdValues[rule.threshold];
    const detected = event.intensity >= threshold;
    const delay = detected ? routeDelay[rule.route] : null;
    const isFalsePositive = event.type === 'noise' && detected;
    const isMiss = event.type === 'incident' && (!detected || rule.route === 'digest');
    const responsePenalty = detected ? Math.max(0, delay - 2) : 20;

    return {
      ...event,
      threshold: rule.threshold,
      route: rule.route,
      detected,
      delay,
      isFalsePositive,
      isMiss,
      responsePenalty,
    };
  });

  const truePages = timeline.filter((event) => event.detected && event.route === 'pager' && event.type === 'incident').length;
  const noisyPages = timeline.filter((event) => event.isFalsePositive && event.route === 'pager').length;
  const misses = timeline.filter((event) => event.isMiss).length;
  const medianDelaySource = timeline.filter((event) => event.detected && event.type === 'incident').map((event) => event.delay).sort((a, b) => a - b);
  const medianDelay = medianDelaySource.length ? medianDelaySource[Math.floor(medianDelaySource.length / 2)] : null;

  const fatigue = Math.max(0, noisyPages * 18 + timeline.filter((event) => event.isFalsePositive).length * 8 - truePages * 4);
  const trust = Math.max(0, 82 - noisyPages * 12 - misses * 14);
  const response = Math.max(0, 86 - (medianDelay || 18) * 2 - misses * 9);
  const stance = trust >= 70 && response >= 70 ? 'Defensible charter' : trust >= 55 && response >= 55 ? 'Conditional charter' : 'Pager debt charter';

  return {
    scenario,
    timeline,
    truePages,
    noisyPages,
    misses,
    medianDelay,
    fatigue,
    trust,
    response,
    stance,
  };
}

function renderSummary() {
  const summaryParts = signals.map((signal) => {
    const rule = state.rules[signal.id];
    return `${signal.title}: ${rule.threshold}/${rule.route}`;
  });
  charterSummary.textContent = summaryParts.join(' | ');
}

function renderBoards() {
  const run = state.lastRun;

  if (!run) {
    verdictBoard.innerHTML = '<p>No shift simulated yet. Author the charter, then run the day.</p>';
    pagerBoard.innerHTML = '<p>No paging economics yet.</p>';
    missBoard.innerHTML = '<p>No missed-incident read yet.</p>';
    operatorBoard.innerHTML = '<p>No operator posture yet.</p>';
    timelineSummary.textContent = 'Run the shift to generate event consequences.';
    timelineList.innerHTML = '';
    return;
  }

  verdictBoard.innerHTML = `
    <p><strong>${run.stance}</strong></p>
    <p>Response ${run.response}/100 | Trust ${run.trust}/100 | Fatigue ${run.fatigue}/100.</p>
    <p>Median incident detection delay: ${run.medianDelay ?? 'none'} minutes.</p>
  `;

  pagerBoard.innerHTML = `
    <p><strong>True pages:</strong> ${run.truePages}</p>
    <p><strong>Noisy pages:</strong> ${run.noisyPages}</p>
    <p><strong>Pager cue:</strong> ${run.noisyPages > run.truePages ? 'Noise is spending more pager trust than the real incidents are earning back.' : 'Most pages still map to real work.'}</p>
  `;

  missBoard.innerHTML = `
    <p><strong>Missed incidents:</strong> ${run.misses}</p>
    <p><strong>Blind spot:</strong> ${run.timeline.filter((event) => event.isMiss).map((event) => event.title).join(', ') || 'None obvious.'}</p>
    <p><strong>Watch:</strong> ${run.misses ? 'Digest-only routing is hiding at least one event that should have interrupted somebody.' : 'The charter is catching the real incidents without a glaring blind lane.'}</p>
  `;

  operatorBoard.innerHTML = `
    <p><strong>First responder:</strong> ${run.response >= 72 ? 'Gets a usable page quickly enough to stay ahead.' : 'Loses too many minutes before the alert becomes actionable.'}</p>
    <p><strong>On-call trust:</strong> ${run.trust >= 68 ? 'The team can still believe the pager means something.' : 'False positives and misses are both eroding confidence.'}</p>
    <p><strong>Shift posture:</strong> ${run.fatigue >= 55 ? 'The charter is creating operator debt.' : 'The shift still has room to absorb surprise.'}</p>
  `;

  timelineSummary.textContent = `${run.timeline.length} events evaluated for ${run.scenario.title.toLowerCase()}.`;
  timelineList.innerHTML = run.timeline
    .map((event) => {
      const outcome = event.isMiss
        ? 'Missed or delayed past usefulness'
        : event.isFalsePositive
          ? 'False positive'
          : event.detected
            ? `Detected in ${event.delay} min via ${routeLabels[event.route].toLowerCase()}`
            : 'Stayed below the charter threshold';
      return `
        <article class="scenario-card ${event.isMiss ? 'secondary' : 'active'}">
          <h3>${event.minute}m · ${event.title}</h3>
          <p class="scenario-copy">${event.type === 'incident' ? 'Real incident' : 'Noise event'} on ${event.signal} at intensity ${event.intensity}/10.</p>
          <div class="scenario-meta">
            <span class="pill">${event.threshold} threshold</span>
            <span class="pill">${routeLabels[event.route]}</span>
            <span class="pill">${outcome}</span>
          </div>
        </article>
      `;
    })
    .join('');
}

function buildBrief() {
  const run = state.lastRun || simulateShift();
  const activeRules = signals.map((signal) => {
    const rule = state.rules[signal.id];
    return `${signal.title}: ${rule.threshold}/${rule.route}`;
  });

  return [
    'Alert Charter Studio Brief',
    '',
    `Shift: ${run.scenario.title}`,
    `Pressure: ${run.scenario.pressure}`,
    `Alert charter: ${activeRules.join(' | ')}`,
    `Verdict: ${run.stance}`,
    `True pages: ${run.truePages}`,
    `Noisy pages: ${run.noisyPages}`,
    `Missed incidents: ${run.misses}`,
    `Median detection delay: ${run.medianDelay ?? 'none'} minutes`,
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

function runShift() {
  state.lastRun = simulateShift();
  statusEl.textContent = `${state.lastRun.stance} generated for ${state.lastRun.scenario.title.toLowerCase()}.`;
  renderBoards();
}

function render() {
  renderScenarios();
  renderRules();
  renderSummary();
  renderBoards();
}

runShiftBtn.addEventListener('click', runShift);
copyBriefBtn.addEventListener('click', () => copyText(buildBrief(), 'Copied the current shift brief.'));
copyLinkBtn.addEventListener('click', () => copyText(window.location.href, 'Copied the share link.'));

saveState();
render();
