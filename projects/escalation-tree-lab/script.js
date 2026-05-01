const scenarioTitleEl = document.getElementById('scenario-title');
const scenarioTagEl = document.getElementById('scenario-tag');
const scenarioSummaryEl = document.getElementById('scenario-summary');
const signalListEl = document.getElementById('signal-list');
const choiceGridEl = document.getElementById('choice-grid');
const timelineEl = document.getElementById('timeline');
const statusTextEl = document.getElementById('status-text');
const containmentScoreEl = document.getElementById('containment-score');
const trustScoreEl = document.getElementById('trust-score');
const fatigueScoreEl = document.getElementById('fatigue-score');
const blastScoreEl = document.getElementById('blast-score');
const decisionReadEl = document.getElementById('decision-read');
const mixReadEl = document.getElementById('mix-read');
const debriefReadEl = document.getElementById('debrief-read');
const startRunBtn = document.getElementById('start-run');
const resetRunBtn = document.getElementById('reset-run');
const copyBriefBtn = document.getElementById('copy-brief');

const scenarios = [
  {
    title: 'Checkout errors spike after a deploy',
    tag: 'Deploy Window',
    summary: 'Payment retries are climbing and support sees duplicate charge complaints, but infrastructure dashboards still look mostly green.',
    signals: ['App logs show payment callback mismatches.', 'Latency is elevated only on checkout routes.', 'Support has 6 fresh duplicate-charge tickets.'],
    options: [
      { team: 'Application Engineer', why: 'Best first page when behavior looks route-specific and deploy-adjacent.', impact: { containment: 16, trust: 8, fatigue: 7, blast: -12 }, note: 'The app owner isolates the rollback path quickly.' },
      { team: 'Platform On-Call', why: 'Broad but premature if infra is only indirectly involved.', impact: { containment: 6, trust: -4, fatigue: 13, blast: -4 }, note: 'You paged wide before confirming an infrastructure signature.' },
      { team: 'Support Lead', why: 'Good for customer triage, weak as the first technical escalation.', impact: { containment: 3, trust: 5, fatigue: 4, blast: 4 }, note: 'Customers get calmer, but the root issue keeps running.' },
    ],
  },
  {
    title: 'Campus Wi-Fi drops in one library wing',
    tag: 'Network Edge',
    summary: 'Students report intermittent disconnects near one access-point cluster while core campus traffic remains stable.',
    signals: ['Only one building zone is affected.', 'Signal quality graphs wobble before disconnects.', 'Authentication services are normal.'],
    options: [
      { team: 'Network Engineer', why: 'The blast radius is local and radio-specific.', impact: { containment: 15, trust: 7, fatigue: 6, blast: -11 }, note: 'The wireless engineer retunes and drains the hotspot quickly.' },
      { team: 'Identity Team', why: 'Authentication is tempting, but the evidence says otherwise.', impact: { containment: 2, trust: -5, fatigue: 10, blast: 3 }, note: 'You chased the wrong layer and lost time.' },
      { team: 'Facilities Manager', why: 'Useful if there is a physical outage, but not the first best page yet.', impact: { containment: 5, trust: 2, fatigue: 5, blast: -1 }, note: 'You buy local context, but technical containment lags.' },
    ],
  },
  {
    title: 'Search index serves stale catalog entries',
    tag: 'Data Drift',
    summary: 'The app is up, but newly added items are missing while deleted items still appear in search results.',
    signals: ['Writes succeed in the primary database.', 'Queue lag for indexing jobs is climbing.', 'No user-facing 500s are reported.'],
    options: [
      { team: 'Data Pipeline Owner', why: 'The evidence points to sync lag, not app traffic or DB failure.', impact: { containment: 14, trust: 6, fatigue: 5, blast: -10 }, note: 'The pipeline owner replays the stuck jobs and narrows stale exposure.' },
      { team: 'Database Admin', why: 'Safer than app paging, but still too deep in the stack for the first move.', impact: { containment: 6, trust: -1, fatigue: 8, blast: -2 }, note: 'You verified the wrong subsystem first.' },
      { team: 'Marketing Ops', why: 'Useful for messaging, not for root-cause containment.', impact: { containment: 1, trust: 4, fatigue: 3, blast: 5 }, note: 'Communication improves while stale results continue to leak.' },
    ],
  },
  {
    title: 'Suspicious admin logins appear after hours',
    tag: 'Security Signal',
    summary: 'A handful of privileged logins came from unfamiliar IP ranges and one account changed MFA settings.',
    signals: ['The account activity is real, not a parser glitch.', 'Production traffic is still normal.', 'You do not yet know whether data was touched.'],
    options: [
      { team: 'Security Response', why: 'This is the right first page when account integrity is in doubt.', impact: { containment: 18, trust: 9, fatigue: 9, blast: -15 }, note: 'Security freezes the account and preserves evidence.' },
      { team: 'Application Engineer', why: 'They may help later, but they are not first-call for credential compromise.', impact: { containment: 5, trust: -6, fatigue: 9, blast: 6 }, note: 'You pulled in the wrong owner before the compromised account was contained.' },
      { team: 'Executive Stakeholder', why: 'Escalating leadership first creates noise without reducing exposure.', impact: { containment: 0, trust: -10, fatigue: 6, blast: 9 }, note: 'You widened visibility before controlling the threat.' },
    ],
  },
  {
    title: 'Student portal slows only during registration hour',
    tag: 'Capacity Pressure',
    summary: 'CPU is moderate, but queue time on a few portal endpoints spikes exactly when registration opens.',
    signals: ['Traffic surge is expected but steeper than last term.', 'The heaviest pain is on one enrollment workflow.', 'Background jobs are also running on shared workers.'],
    options: [
      { team: 'Capacity / SRE On-Call', why: 'Shared-worker contention and burst shaping need an operator view first.', impact: { containment: 15, trust: 6, fatigue: 8, blast: -12 }, note: 'The on-call shifts worker posture and protects the hot path.' },
      { team: 'Registrar Product Owner', why: 'Good for prioritization context, not the first technical response.', impact: { containment: 4, trust: 5, fatigue: 4, blast: 1 }, note: 'You learn business priority but lose technical time.' },
      { team: 'Database Admin', why: 'Possible later partner, but the current evidence points at shared capacity first.', impact: { containment: 6, trust: -2, fatigue: 7, blast: -1 }, note: 'You stabilize a layer that was not the first bottleneck.' },
    ],
  },
];

const initialState = () => ({
  started: false,
  index: 0,
  containment: 70,
  trust: 70,
  fatigue: 20,
  blast: 30,
  pages: [],
});

let state = initialState();

function clamp(value) {
  return Math.max(0, Math.min(100, value));
}

function currentScenario() {
  return scenarios[state.index] || null;
}

function renderScores() {
  containmentScoreEl.textContent = String(state.containment);
  trustScoreEl.textContent = String(state.trust);
  fatigueScoreEl.textContent = String(state.fatigue);
  blastScoreEl.textContent = String(state.blast);
}

function renderReadouts() {
  if (!state.pages.length) {
    decisionReadEl.textContent = 'Wide paging is safe only when the evidence actually says the incident is cross-cutting.';
    mixReadEl.textContent = 'No pages sent yet.';
  } else {
    const lastPage = state.pages[state.pages.length - 1];
    const uniqueTeams = [...new Set(state.pages.map((page) => page.team))];
    const broadPaging = uniqueTeams.length >= 4 ? 'You have paged broadly enough that fatigue is now a real cost center.' : 'Your escalation footprint is still focused.';
    decisionReadEl.textContent = `${lastPage.team} was the last page. ${lastPage.note}`;
    mixReadEl.textContent = `${uniqueTeams.length} responder lane${uniqueTeams.length === 1 ? '' : 's'} used so far. ${broadPaging}`;
  }

  if (state.started && state.index >= scenarios.length) {
    const score = state.containment + state.trust - state.fatigue - state.blast;
    const verdict =
      score >= 110 ? 'Strong routing shift: you kept escalation narrow without missing the real owners.' :
      score >= 80 ? 'Mostly solid shift: a few pages were noisy, but containment stayed ahead of exposure.' :
      'Noisy shift: the incident was eventually handled, but routing cost trust or time.';
    debriefReadEl.textContent = verdict;
  } else {
    debriefReadEl.textContent = 'Finish the shift to get the routing verdict.';
  }
}

function renderTimeline() {
  if (!state.pages.length) {
    timelineEl.innerHTML = '<article class="timeline-card"><strong>Shift empty.</strong><p>Your escalation history will appear here after the first decision.</p></article>';
    return;
  }

  timelineEl.innerHTML = state.pages.map((page, index) => `
    <article class="timeline-card">
      <strong>Round ${index + 1}: ${page.title}</strong>
      <p>Paged: ${page.team}</p>
      <p>${page.note}</p>
      <p>Containment ${formatDelta(page.impact.containment)} | Trust ${formatDelta(page.impact.trust)} | Fatigue ${formatDelta(page.impact.fatigue)} | Blast ${formatDelta(page.impact.blast)}</p>
    </article>
  `).join('');
}

function formatDelta(value) {
  return value > 0 ? `+${value}` : `${value}`;
}

function renderScenario() {
  renderScores();
  renderReadouts();
  renderTimeline();

  const scenario = currentScenario();
  if (!state.started) {
    scenarioTitleEl.textContent = 'Waiting for first scenario';
    scenarioTagEl.textContent = 'Round 0';
    scenarioSummaryEl.textContent = 'Press Start Shift to begin the escalation deck.';
    signalListEl.innerHTML = '';
    choiceGridEl.innerHTML = '';
    return;
  }

  if (!scenario) {
    scenarioTitleEl.textContent = 'Shift complete';
    scenarioTagEl.textContent = `${state.pages.length} rounds`;
    scenarioSummaryEl.textContent = 'Use the timeline and debrief to see whether you escalated too wide, too late, or to the wrong specialty.';
    signalListEl.innerHTML = '';
    choiceGridEl.innerHTML = '';
    return;
  }

  scenarioTitleEl.textContent = scenario.title;
  scenarioTagEl.textContent = `${scenario.tag} | Round ${state.index + 1}/${scenarios.length}`;
  scenarioSummaryEl.textContent = scenario.summary;
  signalListEl.innerHTML = scenario.signals.map((signal) => `<article class="signal">${signal}</article>`).join('');
  choiceGridEl.innerHTML = scenario.options.map((option, index) => `
    <article class="choice-card">
      <div class="choice-head">
        <div>
          <p class="eyebrow">Choice ${index + 1}</p>
          <h3>${option.team}</h3>
        </div>
      </div>
      <p>${option.why}</p>
      <p class="impact">Containment ${formatDelta(option.impact.containment)} | Trust ${formatDelta(option.impact.trust)} | Fatigue ${formatDelta(option.impact.fatigue)} | Blast ${formatDelta(option.impact.blast)}</p>
      <button type="button" data-choice="${index}">Page ${option.team}</button>
    </article>
  `).join('');

  choiceGridEl.querySelectorAll('button[data-choice]').forEach((button) => {
    button.addEventListener('click', () => applyChoice(Number.parseInt(button.dataset.choice || '0', 10)));
  });
}

function applyChoice(choiceIndex) {
  const scenario = currentScenario();
  const option = scenario?.options?.[choiceIndex];
  if (!scenario || !option) return;

  state.containment = clamp(state.containment + option.impact.containment);
  state.trust = clamp(state.trust + option.impact.trust);
  state.fatigue = clamp(state.fatigue + option.impact.fatigue);
  state.blast = clamp(state.blast + option.impact.blast);
  state.pages.push({
    title: scenario.title,
    team: option.team,
    note: option.note,
    impact: option.impact,
  });
  state.index += 1;
  statusTextEl.textContent = `${option.team} paged. ${option.note}`;
  renderScenario();
}

function resetRun() {
  state = initialState();
  statusTextEl.textContent = 'Ready to route the first escalation.';
  renderScenario();
}

async function copyBrief() {
  const summary = [
    'Escalation Tree Lab Brief',
    `Containment ${state.containment} | Trust ${state.trust} | Fatigue ${state.fatigue} | Blast ${state.blast}`,
    state.pages.length
      ? state.pages.map((page, index) => `Round ${index + 1}: ${page.title} -> ${page.team} | ${page.note}`).join('\n')
      : 'No escalation choices made yet.',
    debriefReadEl.textContent,
  ].join('\n');

  try {
    await navigator.clipboard.writeText(summary);
    statusTextEl.textContent = 'Copied the shift briefing.';
  } catch (error) {
    statusTextEl.textContent = 'Clipboard copy failed for the shift briefing.';
  }
}

startRunBtn.addEventListener('click', () => {
  state = initialState();
  state.started = true;
  statusTextEl.textContent = 'Shift started. Pick the first escalation path.';
  renderScenario();
});

resetRunBtn.addEventListener('click', resetRun);
copyBriefBtn.addEventListener('click', copyBrief);

renderScenario();
