const trustScoreEl = document.getElementById('trust-score');
const deliveryScoreEl = document.getElementById('delivery-score');
const incidentScoreEl = document.getElementById('incident-score');
const budgetScoreEl = document.getElementById('budget-score');
const roundLabelEl = document.getElementById('round-label');
const scenarioTitleEl = document.getElementById('scenario-title');
const scenarioSummaryEl = document.getElementById('scenario-summary');
const clientMixEl = document.getElementById('client-mix');
const schemaChangeEl = document.getElementById('schema-change');
const failureModeEl = document.getElementById('failure-mode');
const pressureChipEl = document.getElementById('pressure-chip');
const decisionButtonsEl = document.getElementById('decision-buttons');
const decisionNoteEl = document.getElementById('decision-note');
const doctrineBoardEl = document.getElementById('doctrine-board');
const historyListEl = document.getElementById('history-list');
const endingPanelEl = document.getElementById('ending-panel');
const endingTitleEl = document.getElementById('ending-title');
const endingSummaryEl = document.getElementById('ending-summary');
const endingHighlightsEl = document.getElementById('ending-highlights');
const restartButton = document.getElementById('restart-button');

const scenarios = [
  {
    title: 'Enum Expansion Lands Without Warning',
    pressure: 'Moderate pressure',
    summary: 'The billing API adds a new `status=paused_review` enum two days before partner reporting closes.',
    clientMix: 'Legacy dashboard, internal ETL, one partner webhook consumer.',
    change: 'Strict enum parser starts throwing on an unknown value.',
    failure: 'Partner analytics drop the new records entirely.',
    actions: [
      {
        label: 'Ship a compatibility shim',
        detail: 'Map the new status into the old set while publishing migration notes.',
        cost: 1,
        effects: { trust: 6, delivery: 3, incidents: -4, budget: -1 },
        outcome: 'You buy breathing room and keep downstream consumers online, but you spend scarce shim capacity.',
      },
      {
        label: 'Force the new enum immediately',
        detail: 'Reject legacy parsing and require clients to update this week.',
        cost: 0,
        effects: { trust: -8, delivery: 8, incidents: 10, budget: 0 },
        outcome: 'The platform moves fast, but brittle clients light up with incident noise.',
      },
      {
        label: 'Freeze the upstream rollout',
        detail: 'Block the new value until contract governance catches up.',
        cost: 0,
        effects: { trust: -3, delivery: -5, incidents: -2, budget: 0 },
        outcome: 'You avoid immediate breakage, but platform momentum stalls and the upstream team is irritated.',
      },
    ],
  },
  {
    title: 'Optional Field Starts Carrying Real Meaning',
    pressure: 'High pressure',
    summary: 'A new nullable `reason_code` field is now required for dispute workflows, but half the mobile fleet still omits it.',
    clientMix: 'Two mobile versions, support tooling, risk-service consumer.',
    change: 'Workflows now branch on a field that old clients never send.',
    failure: 'Missing values produce silent queue misroutes.',
    actions: [
      {
        label: 'Dual-write defaults server-side',
        detail: 'Infer a fallback reason code and log every synthetic fill.',
        cost: 1,
        effects: { trust: 4, delivery: 1, incidents: -3, budget: -1 },
        outcome: 'Support stays functional, and the logs tell you exactly how much legacy traffic still needs cleanup.',
      },
      {
        label: 'Accept partial payloads and pray',
        detail: 'Keep the old contract alive without enforcement.',
        cost: 0,
        effects: { trust: -5, delivery: 2, incidents: 8, budget: 0 },
        outcome: 'Nothing breaks loudly, but queue integrity starts eroding underneath you.',
      },
      {
        label: 'Make the field mandatory today',
        detail: 'Reject clients that cannot populate the new workflow attribute.',
        cost: 0,
        effects: { trust: -7, delivery: 7, incidents: 5, budget: 0 },
        outcome: 'The schema becomes cleaner, but operations inherits a sharp migration cliff.',
      },
    ],
  },
  {
    title: 'Nested Object Replaces Flat Keys',
    pressure: 'Critical pressure',
    summary: 'Identity services collapse several flat address keys into a nested object right before a major partner integration test.',
    clientMix: 'Partner SDK, admin dashboard exports, fraud review notebooks.',
    change: 'Flat parsers now deserialize empty payloads.',
    failure: 'Address validation and audit exports drift apart.',
    actions: [
      {
        label: 'Build a translation edge',
        detail: 'Serve both shapes at the boundary and meter which clients still need the legacy format.',
        cost: 1,
        effects: { trust: 7, delivery: -1, incidents: -6, budget: -1 },
        outcome: 'It is extra work, but you turn a chaotic migration into an observable one.',
      },
      {
        label: 'Cut the old keys completely',
        detail: 'Declare the nested object canonical and remove the flat contract.',
        cost: 0,
        effects: { trust: -10, delivery: 9, incidents: 12, budget: 0 },
        outcome: 'The platform gets the shape it wants, while every stale consumer breaks at once.',
      },
      {
        label: 'Defer the structure change',
        detail: 'Tell the upstream team to wait for the next release train.',
        cost: 0,
        effects: { trust: -4, delivery: -6, incidents: -2, budget: 0 },
        outcome: 'You reduce chaos, but the team now carries a messy temporary model for another cycle.',
      },
    ],
  },
  {
    title: 'Version Header Is Inconsistent Across Clients',
    pressure: 'High pressure',
    summary: 'The gateway is supposed to branch by `X-Contract-Version`, but some SDKs send stale headers while others send none.',
    clientMix: 'Three partner SDKs, one manual CSV import lane, internal replay workers.',
    change: 'Version detection is no longer trustworthy.',
    failure: 'New validators hit old payloads and produce false incident spikes.',
    actions: [
      {
        label: 'Infer version from payload shape',
        detail: 'Add a tolerant detector that falls back to structural clues when headers lie.',
        cost: 0,
        effects: { trust: 5, delivery: 0, incidents: -4, budget: 0 },
        outcome: 'You stabilize the edge and learn which clients actually misreport their contract version.',
      },
      {
        label: 'Trust the header anyway',
        detail: 'Keep routing strictly on the declared version and let failures surface.',
        cost: 0,
        effects: { trust: -6, delivery: 4, incidents: 7, budget: 0 },
        outcome: 'Routing stays simple, but the wrong payloads keep falling into the wrong validators.',
      },
      {
        label: 'Pause partner rollout for a header fix',
        detail: 'Stop new traffic until every SDK emits a clean version contract.',
        cost: 0,
        effects: { trust: -2, delivery: -5, incidents: -1, budget: 0 },
        outcome: 'You limit breakage, but the release calendar slips and commercial teams complain loudly.',
      },
    ],
  },
  {
    title: 'Sunset Window Arrives',
    pressure: 'Launch pressure',
    summary: 'The old schema must be turned off tonight unless you want to carry both worlds into another quarter.',
    clientMix: 'Mostly migrated fleet, one major partner still lagging, internal tools halfway cleaned up.',
    change: 'You need a final posture: extend, cut over, or stage the last exception.',
    failure: 'Either partner trust or internal velocity will take the hit.',
    actions: [
      {
        label: 'Grant one last controlled exception',
        detail: 'Keep one narrow compatibility lane alive while everything else moves to the new contract.',
        cost: 1,
        effects: { trust: 6, delivery: 2, incidents: -2, budget: -1 },
        outcome: 'You preserve the relationship and keep the platform mostly clean, but only if you still have shim budget left.',
      },
      {
        label: 'Sunset the old schema tonight',
        detail: 'Take the short-term pain and force the final migration.',
        cost: 0,
        effects: { trust: -9, delivery: 10, incidents: 6, budget: 0 },
        outcome: 'The platform sheds baggage fast, though the last lagging partner absorbs the shock.',
      },
      {
        label: 'Extend dual support another quarter',
        detail: 'Carry both contracts longer and absorb the operational drag.',
        cost: 0,
        effects: { trust: 2, delivery: -8, incidents: 3, budget: 0 },
        outcome: 'Relationships stay calm, but the platform remains split-brain and slows every future release.',
      },
    ],
  },
];

function createInitialState() {
  return {
    round: 0,
    trust: 70,
    delivery: 72,
    incidents: 18,
    budget: 2,
    history: [],
  };
}

let state = createInitialState();

function clamp(value) {
  return Math.max(0, Math.min(100, value));
}

function renderMetrics() {
  trustScoreEl.textContent = String(Math.round(state.trust));
  deliveryScoreEl.textContent = String(Math.round(state.delivery));
  incidentScoreEl.textContent = String(Math.round(state.incidents));
  budgetScoreEl.textContent = String(state.budget);
}

function renderDoctrine() {
  const stabilityBias = state.history.filter((entry) => entry.effects.incidents <= 0).length;
  const forceBias = state.history.filter((entry) => entry.effects.delivery >= 7).length;
  const trustBias = state.history.filter((entry) => entry.effects.trust > 0).length;

  const cards = [
    {
      title: 'Migration posture',
      detail:
        forceBias >= 2
          ? 'You are leaning toward hard cutovers and platform cleanliness.'
          : stabilityBias >= 2
            ? 'You are favoring controlled compatibility and gradual migration.'
            : 'Your doctrine is still mixed; the next round will reveal whether you optimize for speed or resilience.',
    },
    {
      title: 'Partner stance',
      detail:
        trustBias >= 2
          ? 'You are protecting partner trust even when it costs some short-term velocity.'
          : 'You are willing to spend relationship capital when contract discipline looks more important.',
    },
    {
      title: 'Operational load',
      detail:
        state.incidents <= 20
          ? 'Incident pressure is contained enough to keep making deliberate choices.'
          : state.incidents <= 40
            ? 'Incident pressure is climbing, so every aggressive move now compounds operational pain.'
            : 'Operations are hot; another careless cutover could collapse trust outright.',
    },
  ];

  doctrineBoardEl.innerHTML = cards
    .map((card) => `<article><h3>${card.title}</h3><p>${card.detail}</p></article>`)
    .join('');
}

function renderHistory() {
  historyListEl.innerHTML = state.history.length
    ? state.history
        .map(
          (entry, index) => `
            <article class="history-item">
              <h3>Round ${index + 1}: ${entry.label}</h3>
              <p>${entry.outcome}</p>
              <p>Trust ${entry.effects.trust >= 0 ? '+' : ''}${entry.effects.trust} | Delivery ${entry.effects.delivery >= 0 ? '+' : ''}${entry.effects.delivery} | Incidents ${entry.effects.incidents >= 0 ? '+' : ''}${entry.effects.incidents}</p>
            </article>
          `
        )
        .join('')
    : '<p>No decisions yet. Start the campaign to build a migration doctrine.</p>';
}

function renderScenario() {
  renderMetrics();
  renderDoctrine();
  renderHistory();

  if (state.round >= scenarios.length) {
    renderEnding();
    return;
  }

  endingPanelEl.classList.add('hidden');
  const scenario = scenarios[state.round];
  roundLabelEl.textContent = String(state.round + 1);
  scenarioTitleEl.textContent = scenario.title;
  scenarioSummaryEl.textContent = scenario.summary;
  clientMixEl.textContent = scenario.clientMix;
  schemaChangeEl.textContent = scenario.change;
  failureModeEl.textContent = scenario.failure;
  pressureChipEl.textContent = scenario.pressure;

  decisionButtonsEl.innerHTML = scenario.actions
    .map(
      (action, index) => `
        <button class="decision-btn" type="button" data-action-index="${index}">
          <strong>${action.label}</strong>
          <span>${action.detail}</span>
          <span>${action.cost ? `Shim budget cost: ${action.cost}` : 'No shim budget required'}</span>
        </button>
      `
    )
    .join('');
}

function renderEnding() {
  endingPanelEl.classList.remove('hidden');
  decisionButtonsEl.innerHTML = '';
  pressureChipEl.textContent = 'Campaign complete';
  scenarioTitleEl.textContent = 'Final platform posture locked in';
  scenarioSummaryEl.textContent = 'The migration campaign is over. Your operating style now has consequences.';
  clientMixEl.textContent = 'All major consumers saw the doctrine you chose.';
  schemaChangeEl.textContent = 'The platform remembers whether you optimized for discipline, compatibility, or delay.';
  failureModeEl.textContent = 'Use the verdict to judge whether you built a migration culture worth repeating.';
  decisionNoteEl.textContent = 'Review the outcome, then restart to explore a different doctrine.';

  const score = state.trust + state.delivery - state.incidents + state.budget * 8;
  const title =
    score >= 145
      ? 'Trusted Migration Operator'
      : score >= 120
        ? 'Pragmatic Compatibility Lead'
        : 'Contract Shock Survivor';
  const summary =
    score >= 145
      ? 'You preserved partner trust without letting the platform drift into permanent dual-support chaos.'
      : score >= 120
        ? 'You kept the platform moving, but several choices traded long-term cleanliness for short-term stability.'
        : 'The migration technically finished, but operations and partner trust paid for the inconsistency.';

  endingTitleEl.textContent = title;
  endingSummaryEl.textContent = summary;
  endingHighlightsEl.innerHTML = `
    <article class="history-item"><h3>Final trust</h3><p>${Math.round(state.trust)}</p></article>
    <article class="history-item"><h3>Final delivery tempo</h3><p>${Math.round(state.delivery)}</p></article>
    <article class="history-item"><h3>Final incident pressure</h3><p>${Math.round(state.incidents)}</p></article>
  `;
}

function applyAction(action) {
  if (action.cost > state.budget) {
    decisionNoteEl.textContent = 'You do not have enough shim budget left for that move. Pick a leaner migration tactic.';
    return;
  }

  state.trust = clamp(state.trust + action.effects.trust);
  state.delivery = clamp(state.delivery + action.effects.delivery);
  state.incidents = clamp(state.incidents + action.effects.incidents);
  state.budget = Math.max(0, state.budget + action.effects.budget);
  state.history.push({
    label: action.label,
    outcome: action.outcome,
    effects: action.effects,
  });
  decisionNoteEl.textContent = action.outcome;
  state.round += 1;
  renderScenario();
}

decisionButtonsEl.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action-index]');
  if (!button) return;

  const scenario = scenarios[state.round];
  const action = scenario?.actions[Number(button.dataset.actionIndex)];
  if (!action) return;
  applyAction(action);
});

restartButton.addEventListener('click', () => {
  state = createInitialState();
  decisionNoteEl.textContent = 'Choose a response. Each move shifts trust, delivery, incidents, and your remaining shim budget.';
  renderScenario();
});

renderScenario();
