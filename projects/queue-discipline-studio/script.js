const trustScoreEl = document.getElementById('trust-score');
const backlogScoreEl = document.getElementById('backlog-score');
const abandonScoreEl = document.getElementById('abandon-score');
const servedScoreEl = document.getElementById('served-score');
const roundLabelEl = document.getElementById('round-label');
const scenarioTitleEl = document.getElementById('scenario-title');
const scenarioCopyEl = document.getElementById('scenario-copy');
const scenarioMeta1El = document.getElementById('scenario-meta-1');
const scenarioMeta2El = document.getElementById('scenario-meta-2');
const scenarioMeta3El = document.getElementById('scenario-meta-3');
const summaryTextEl = document.getElementById('summary-text');
const milestoneListEl = document.getElementById('milestone-list');
const logEl = document.getElementById('log');
const briefStatusEl = document.getElementById('brief-status');
const fcfsBtn = document.getElementById('fcfs-btn');
const shortBtn = document.getElementById('short-btn');
const priorityBtn = document.getElementById('priority-btn');
const restartBtn = document.getElementById('restart-btn');
const copyBriefBtn = document.getElementById('copy-brief-btn');

const scenarios = [
  {
    title: 'Registration desk opens with a lopsided line',
    copy: 'A mixed queue forms immediately: one urgent exception case, several short tasks, and one long complaint that will eat a full slot if you take it now.',
    vip: 1,
    long: 1,
    short: 4,
  },
  {
    title: 'VIP pressure arrives while standard wait is already visible',
    copy: 'A staff member asks you to pull one special case forward while regular visitors can see the jump.',
    vip: 2,
    long: 0,
    short: 3,
  },
  {
    title: 'Backlog is climbing and a few quick requests could clear fast',
    copy: 'The room feels slow, but a fast lane would visibly skip longer issues that were here first.',
    vip: 0,
    long: 2,
    short: 5,
  },
  {
    title: 'One complex edge case is blocking a crowded hallway',
    copy: 'You can resolve the long case now and prove fairness, or keep the line moving and risk someone giving up.',
    vip: 1,
    long: 2,
    short: 2,
  },
  {
    title: 'Queue optics matter more than raw speed',
    copy: 'People are watching who gets helped first. The technically efficient move may still look arbitrary from the line.',
    vip: 1,
    long: 1,
    short: 4,
  },
  {
    title: 'Final rush before the desk closes',
    copy: 'You need one last policy call: preserve fairness, squeeze throughput, or protect urgent exceptions before the line rolls into tomorrow.',
    vip: 2,
    long: 1,
    short: 3,
  },
];

const initialState = () => ({
  round: 0,
  trust: 64,
  backlog: 18,
  abandonment: 0,
  served: 0,
  fifoWins: 0,
  shortWins: 0,
  priorityWins: 0,
  log: ['Shift initialized.'],
});

let state = initialState();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function currentScenario() {
  return scenarios[state.round];
}

function renderMilestones() {
  const targets = [
    { label: 'Trust survives the rush', check: state.trust >= 55 },
    { label: 'Backlog stays under control', check: state.backlog <= 28 },
    { label: 'Abandonment stays survivable', check: state.abandonment <= 8 },
  ];

  milestoneListEl.innerHTML = targets
    .map((target) => `<li>${target.check ? 'Cleared' : 'Open'}: ${target.label}</li>`)
    .join('');
}

function renderLog() {
  logEl.innerHTML = state.log.slice(0, 8).map((entry) => `<p>${entry}</p>`).join('');
}

function render() {
  trustScoreEl.textContent = String(state.trust);
  backlogScoreEl.textContent = String(state.backlog);
  abandonScoreEl.textContent = String(state.abandonment);
  servedScoreEl.textContent = String(state.served);
  renderMilestones();
  renderLog();

  if (state.round >= scenarios.length) {
    roundLabelEl.textContent = 'Shift Complete';
    scenarioTitleEl.textContent = 'The desk closes with your policy record visible.';
    scenarioCopyEl.textContent = 'Review the final tradeoff: throughput, trust, and queue fairness almost never all improve together.';
    scenarioMeta1El.textContent = `FIFO rounds: ${state.fifoWins}`;
    scenarioMeta2El.textContent = `Fast-lane rounds: ${state.shortWins}`;
    scenarioMeta3El.textContent = `Priority rounds: ${state.priorityWins}`;
    fcfsBtn.disabled = true;
    shortBtn.disabled = true;
    priorityBtn.disabled = true;

    if (state.trust >= 62 && state.abandonment <= 6) {
      summaryTextEl.textContent = 'You held the line together. The policy stayed legible enough that speed gains did not destroy fairness.';
    } else if (state.served >= 28 && state.backlog <= 18) {
      summaryTextEl.textContent = 'You optimized hard for throughput. The desk moved, but some queue politics probably got harsher than the metrics admit.';
    } else {
      summaryTextEl.textContent = 'The shift stayed afloat, but the policy tradeoffs are mixed: some people were protected, others felt skipped, and backlog still leaked forward.';
    }

    briefStatusEl.textContent = 'Run complete. The policy brief is ready to copy.';
    return;
  }

  const scenario = currentScenario();
  roundLabelEl.textContent = `Shift ${state.round + 1} / ${scenarios.length}`;
  scenarioTitleEl.textContent = scenario.title;
  scenarioCopyEl.textContent = scenario.copy;
  scenarioMeta1El.textContent = `VIP load: ${scenario.vip}`;
  scenarioMeta2El.textContent = `Long jobs: ${scenario.long}`;
  scenarioMeta3El.textContent = `Short jobs: ${scenario.short}`;
  fcfsBtn.disabled = false;
  shortBtn.disabled = false;
  priorityBtn.disabled = false;
  summaryTextEl.textContent = 'Policy read: faster is not always fairer. The strongest choice is the one you can defend to the people still waiting.';
  briefStatusEl.textContent = 'Finish the shift to generate a reusable policy summary.';
}

function applyDecision(mode) {
  const scenario = currentScenario();
  if (!scenario) return;

  if (mode === 'fcfs') {
    state.fifoWins += 1;
    state.trust = clamp(state.trust + 5 - scenario.vip, 0, 100);
    state.backlog = clamp(state.backlog + scenario.long - 1, 0, 100);
    state.abandonment = clamp(state.abandonment + Math.max(0, scenario.short - 3), 0, 100);
    state.served += Math.max(2, scenario.short + 1);
    state.log.unshift(`Held FIFO during "${scenario.title}" to preserve fairness optics even though the line moved slower.`);
  } else if (mode === 'short') {
    state.shortWins += 1;
    state.trust = clamp(state.trust - 2 - scenario.long, 0, 100);
    state.backlog = clamp(state.backlog - Math.max(2, scenario.short - 1), 0, 100);
    state.abandonment = clamp(state.abandonment + scenario.vip, 0, 100);
    state.served += scenario.short + 2;
    state.log.unshift(`Fast-laned short jobs during "${scenario.title}" and traded visible fairness for throughput.`);
  } else {
    state.priorityWins += 1;
    state.trust = clamp(state.trust + 1 - Math.max(0, scenario.short - 2), 0, 100);
    state.backlog = clamp(state.backlog + scenario.long - scenario.vip, 0, 100);
    state.abandonment = clamp(state.abandonment + Math.max(0, scenario.long - 1), 0, 100);
    state.served += scenario.vip + 2;
    state.log.unshift(`Escalated priority cases during "${scenario.title}" and accepted that the rest of the line would feel the skip.`);
  }

  state.round += 1;
  render();
}

function buildBrief() {
  return [
    'Queue Discipline Studio Brief',
    '',
    `Trust: ${state.trust}`,
    `Backlog: ${state.backlog}`,
    `Abandonment: ${state.abandonment}`,
    `People served: ${state.served}`,
    `FIFO rounds: ${state.fifoWins}`,
    `Fast-lane rounds: ${state.shortWins}`,
    `Priority rounds: ${state.priorityWins}`,
    `Readout: ${summaryTextEl.textContent}`,
  ].join('\n');
}

fcfsBtn.addEventListener('click', () => applyDecision('fcfs'));
shortBtn.addEventListener('click', () => applyDecision('short'));
priorityBtn.addEventListener('click', () => applyDecision('priority'));
restartBtn.addEventListener('click', () => {
  state = initialState();
  render();
});
copyBriefBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(buildBrief());
    briefStatusEl.textContent = 'Copied the shift brief to the clipboard.';
  } catch (error) {
    briefStatusEl.textContent = 'Clipboard copy failed in this environment.';
  }
});

render();
