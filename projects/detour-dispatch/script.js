const serviceScoreEl = document.getElementById('service-score');
const trustScoreEl = document.getElementById('trust-score');
const strainScoreEl = document.getElementById('strain-score');
const accessScoreEl = document.getElementById('access-score');
const roundLabelEl = document.getElementById('round-label');
const scenarioTitleEl = document.getElementById('scenario-title');
const scenarioCopyEl = document.getElementById('scenario-copy');
const scenarioContextEl = document.getElementById('scenario-context');
const choicesEl = document.getElementById('choices');
const decisionLogEl = document.getElementById('decision-log');
const summaryTextEl = document.getElementById('summary-text');
const statusTextEl = document.getElementById('status-text');
const restartBtn = document.getElementById('restart-btn');

const scenarios = [
  {
    title: 'Student union protest blocks the central loop',
    copy: 'The highest-ridership stop is unusable for the next 45 minutes, and classes are letting out now.',
    context: 'Operations wants fast throughput. Student affairs wants you to avoid stranding mobility-device riders on the outer edge of campus.',
    choices: [
      {
        label: 'Split the route and post two short-turn shuttles',
        detail: 'Preserves frequency near demand but burns operator attention and layover slack.',
        delta: { service: 8, trust: 5, strain: 11, access: 3 },
      },
      {
        label: 'Run a single outer detour around the blockade',
        detail: 'Simple to explain, but everyone rides longer and bunching risk rises.',
        delta: { service: -4, trust: 3, strain: 2, access: -5 },
      },
      {
        label: 'Hold departures for a coordinated relaunch',
        detail: 'Reduces chaos later, but the platform crowds immediately.',
        delta: { service: -8, trust: -6, strain: -2, access: 0 },
      },
    ],
  },
  {
    title: 'A lightning strike knocks out passenger screens',
    copy: 'Buses are still moving, but riders have lost the live arrival boards and stop announcements are inconsistent.',
    context: 'The next 20 minutes will decide whether the detour feels managed or random.',
    choices: [
      {
        label: 'Assign staff to hand-held wayfinding at three key stops',
        detail: 'Costs labor, but restores confidence where confusion is highest.',
        delta: { service: -1, trust: 9, strain: 5, access: 6 },
      },
      {
        label: 'Push one simple text alert to the whole campus',
        detail: 'Cheap and fast, but low-detail messaging leaves edge-case riders stranded.',
        delta: { service: 2, trust: 2, strain: 0, access: -6 },
      },
      {
        label: 'Keep drivers on schedule and skip manual interventions',
        detail: 'Throughput holds for now, but riders feel abandoned.',
        delta: { service: 5, trust: -8, strain: -1, access: -7 },
      },
    ],
  },
  {
    title: 'A stadium event ends 25 minutes early',
    copy: 'An unexpected surge hits two stops at once while your detour pattern is still fragile.',
    context: 'This is where crowding, wait times, and operator fatigue start fighting each other directly.',
    choices: [
      {
        label: 'Send spare vans for surge relief only',
        detail: 'Relieves the hottest queue but leaves the main route thin everywhere else.',
        delta: { service: 4, trust: 4, strain: 8, access: -2 },
      },
      {
        label: 'Convert one loop into an express overlay',
        detail: 'Cuts wait time for the largest crowd but reduces neighborhood coverage.',
        delta: { service: 7, trust: 1, strain: 4, access: -8 },
      },
      {
        label: 'Throttle boarding to keep the loop evenly paced',
        detail: 'Operationally calm, politically rough.',
        delta: { service: -3, trust: -7, strain: -3, access: 1 },
      },
    ],
  },
  {
    title: 'Drivers are nearing the end of their safe shift window',
    copy: 'The network can finish the day, but not every choice leaves tomorrow intact.',
    context: 'This final move decides whether you protect resilience or borrow from the next service day.',
    choices: [
      {
        label: 'Shorten the final hour and protect relief breaks',
        detail: 'Some riders wait longer now, but you avoid a burnout spiral.',
        delta: { service: -5, trust: -2, strain: -12, access: 0 },
      },
      {
        label: 'Push full service to the end of the peak',
        detail: 'Looks strong tonight and leaves the operator side brittle tomorrow.',
        delta: { service: 7, trust: 4, strain: 14, access: 2 },
      },
      {
        label: 'Preserve only the accessible and dorm-bound trips',
        detail: 'The network gets narrower, but the highest-stakes riders keep coverage.',
        delta: { service: -2, trust: 3, strain: -4, access: 10 },
      },
    ],
  },
];

const baseline = {
  service: 68,
  trust: 61,
  strain: 37,
  access: 74,
};

const state = {
  roundIndex: 0,
  metrics: { ...baseline },
  decisions: [],
};

function clamp(value) {
  return Math.max(0, Math.min(100, value));
}

function renderMetrics() {
  serviceScoreEl.textContent = String(state.metrics.service);
  trustScoreEl.textContent = String(state.metrics.trust);
  strainScoreEl.textContent = String(state.metrics.strain);
  accessScoreEl.textContent = String(state.metrics.access);
}

function renderLog() {
  decisionLogEl.innerHTML = state.decisions.length
    ? state.decisions.map((item) => `<li><strong>${item.title}:</strong> ${item.label}. ${item.detail}</li>`).join('')
    : '<li>No dispatch moves logged yet.</li>';
}

function summarizeRun() {
  const { service, trust, strain, access } = state.metrics;
  if (service >= 70 && trust >= 65 && strain <= 45 && access >= 70) {
    return 'You ran a resilient detour shift: the service stayed legible, rider confidence mostly held, and the operator side did not implode.';
  }

  if (access < 55) {
    return 'You kept some buses moving, but accessibility coverage collapsed too often. The network looked alive while the highest-stakes riders got cut out.';
  }

  if (strain > 65) {
    return 'You protected tonight at the expense of tomorrow. The route survived, but the driver side is carrying an unsustainable share of the cost.';
  }

  if (trust < 50) {
    return 'The detour technically functioned, but riders experienced it as chaos. Communication and visible wayfinding were the gap.';
  }

  return 'A mixed shift: you avoided a full breakdown, but the network kept trading one pressure pocket for another instead of finding a stable rhythm.';
}

function renderScenario() {
  renderMetrics();
  renderLog();

  if (state.roundIndex >= scenarios.length) {
    roundLabelEl.textContent = 'Run complete';
    scenarioTitleEl.textContent = 'Final operations brief';
    scenarioCopyEl.textContent = 'The disruption window is over. Review the shape of the run and decide what you would protect differently next time.';
    scenarioContextEl.textContent = 'Transit operations is usually about what survives the tradeoff, not whether a tradeoff exists.';
    choicesEl.innerHTML = '';
    summaryTextEl.textContent = summarizeRun();
    statusTextEl.textContent = 'Run complete. Restart to explore a different detour philosophy.';
    return;
  }

  const scenario = scenarios[state.roundIndex];
  roundLabelEl.textContent = `Round ${state.roundIndex + 1} of ${scenarios.length}`;
  scenarioTitleEl.textContent = scenario.title;
  scenarioCopyEl.textContent = scenario.copy;
  scenarioContextEl.textContent = scenario.context;
  summaryTextEl.textContent = 'Finish all four rounds to get the final transit operations brief.';

  choicesEl.innerHTML = scenario.choices
    .map(
      (choice, index) => `
        <button class="choice-btn" type="button" data-choice-index="${index}">
          <strong>${choice.label}</strong>
          <span>${choice.detail}</span>
        </button>
      `
    )
    .join('');

  Array.from(choicesEl.querySelectorAll('.choice-btn')).forEach((button) => {
    button.addEventListener('click', () => applyChoice(Number(button.dataset.choiceIndex)));
  });
}

function applyChoice(choiceIndex) {
  const scenario = scenarios[state.roundIndex];
  const choice = scenario.choices[choiceIndex];
  if (!scenario || !choice) return;

  state.metrics.service = clamp(state.metrics.service + choice.delta.service);
  state.metrics.trust = clamp(state.metrics.trust + choice.delta.trust);
  state.metrics.strain = clamp(state.metrics.strain + choice.delta.strain);
  state.metrics.access = clamp(state.metrics.access + choice.delta.access);
  state.decisions.push({
    title: scenario.title,
    label: choice.label,
    detail: choice.detail,
  });
  state.roundIndex += 1;
  statusTextEl.textContent = `${choice.label} locked in. Rebalancing the network...`;
  renderScenario();
}

function restartRun() {
  state.roundIndex = 0;
  state.metrics = { ...baseline };
  state.decisions = [];
  statusTextEl.textContent = 'Choose a dispatch move to begin the disruption run.';
  renderScenario();
}

restartBtn.addEventListener('click', restartRun);

restartRun();
