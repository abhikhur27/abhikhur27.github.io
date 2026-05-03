const roundLabel = document.getElementById('round-label');
const scenarioType = document.getElementById('scenario-type');
const trustMetric = document.getElementById('trust-metric');
const supportMetric = document.getElementById('support-metric');
const slackMetric = document.getElementById('slack-metric');
const strainMetric = document.getElementById('strain-metric');
const expectationBoard = document.getElementById('expectation-board');
const debtBoard = document.getElementById('debt-board');
const policyBoard = document.getElementById('policy-board');
const scenarioTitle = document.getElementById('scenario-title');
const scenarioSummary = document.getElementById('scenario-summary');
const scenarioPressure = document.getElementById('scenario-pressure');
const scenarioTags = document.getElementById('scenario-tags');
const promiseOptions = document.getElementById('promise-options');
const feedbackOptions = document.getElementById('feedback-options');
const recoveryOptions = document.getElementById('recovery-options');
const selectionSummary = document.getElementById('selection-summary');
const resolveBtn = document.getElementById('resolve-btn');
const resultCard = document.getElementById('result-card');
const historyList = document.getElementById('history-list');
const summaryCard = document.getElementById('summary-card');
const restartBtn = document.getElementById('restart-btn');
const copyBriefBtn = document.getElementById('copy-brief-btn');

const scenarios = [
  {
    lane: 'Autosave reliability',
    title: 'Warm-start autosave rollout',
    summary: 'A collaborative note editor now autosaves every few seconds, but the write queue still stalls under campus Wi-Fi spikes.',
    pressure: 'Design wants the feature to feel magical. Support has already warned that silent save failures destroy confidence faster than visible delay.',
    tags: ['trust-sensitive', 'student work', 'flaky network'],
    volatility: 18,
  },
  {
    lane: 'Search relevance',
    title: 'AI search answers with thin retrieval coverage',
    summary: 'A campus knowledge bot can usually answer routine questions instantly, but rare edge cases quietly miss the right policy document.',
    pressure: 'Leadership wants the assistant to look finished before orientation week, even though the tail of the corpus is still noisy.',
    tags: ['hallucination risk', 'exec pressure', 'public-facing'],
    volatility: 14,
  },
  {
    lane: 'Order tracking',
    title: 'Delivery ETA surface with shaky downstream feeds',
    summary: 'The app can show package status changes in near-real time, but carrier webhooks are irregular and backfill out of order.',
    pressure: 'Users care more about broken certainty than slow truth. Product keeps asking for tighter ETAs anyway.',
    tags: ['status drift', 'customer support', 'latency optics'],
    volatility: 16,
  },
  {
    lane: 'Queueing flow',
    title: 'Office-hours reservation board during peak week',
    summary: 'Students can reserve office-hour slots, but demand spikes create waitlist churn and intermittent stale availability.',
    pressure: 'The queue needs to feel fair, but the engineering shortcut is to oversell scarce capacity and reconcile later.',
    tags: ['fairness pressure', 'backlog visibility', 'manual ops'],
    volatility: 17,
  },
  {
    lane: 'Payments flow',
    title: 'Fast checkout with delayed fraud review',
    summary: 'You can confirm orders instantly, but some payments will still bounce after downstream review and require follow-up.',
    pressure: 'Growth wants fewer abandoned carts. Finance wants zero surprise reversals. Both think their downside is the real one.',
    tags: ['rollback risk', 'money trust', 'cross-team tension'],
    volatility: 20,
  },
  {
    lane: 'Campus transit',
    title: 'Shuttle arrival board with inconsistent GPS cadence',
    summary: 'The board can estimate bus arrivals, but stale location pings make the map look precise when it really is not.',
    pressure: 'Commuters would rather hear “not sure” than stand outside because the UI pretended to know more than it did.',
    tags: ['public trust', 'sensor drift', 'visible disappointment'],
    volatility: 15,
  },
];

const promiseChoices = [
  {
    id: 'conservative',
    label: 'Conservative framing',
    detail: 'Promise capability carefully and name the uncertainty up front.',
    hint: 'Trust survives misses better, but launch excitement lands softer.',
    effects: { trust: 7, support: -5, slack: -3, strain: -4, debt: -8 },
  },
  {
    id: 'optimistic',
    label: 'Polished confidence',
    detail: 'Sell a smooth story and assume the rough edges will stay rare enough.',
    hint: 'Adoption jumps, but expectation debt starts compounding immediately.',
    effects: { trust: 2, support: 3, slack: 4, strain: 3, debt: 6 },
  },
  {
    id: 'aggressive',
    label: 'Aggressive promise',
    detail: 'Market it as solved behavior before the underlying system is really stable.',
    hint: 'This buys a strong launch headline and a fragile next week.',
    effects: { trust: -6, support: 8, slack: 8, strain: 7, debt: 12 },
  },
];

const feedbackChoices = [
  {
    id: 'ack',
    label: 'Acknowledge early',
    detail: 'Show pending feedback immediately so users know the action landed.',
    hint: 'Honest pending states protect trust when the tail gets slow.',
    effects: { trust: 5, support: -3, slack: -2, strain: -1, debt: -2 },
  },
  {
    id: 'optimistic-ui',
    label: 'Optimistic UI',
    detail: 'Commit the visible state instantly and clean up if the backend disagrees.',
    hint: 'Feels fast until reversals become socially expensive.',
    effects: { trust: 1, support: 2, slack: 4, strain: 2, debt: 5 },
  },
  {
    id: 'silent',
    label: 'Silent wait',
    detail: 'Keep the interface calm and hope the operation returns before doubt appears.',
    hint: 'When this misses, users assume the system forgot them.',
    effects: { trust: -5, support: 4, slack: 2, strain: 3, debt: 6 },
  },
];

const recoveryChoices = [
  {
    id: 'status',
    label: 'Visible status page',
    detail: 'Own the miss publicly, explain the blast radius, and give users a stable reference point.',
    hint: 'Support volume drops, but the incident is impossible to hide.',
    effects: { trust: 6, support: -6, slack: -2, strain: -2, debt: -4 },
  },
  {
    id: 'manual',
    label: 'Manual backstop',
    detail: 'Route failures to human cleanup and protect the user from the ugliest edge cases.',
    hint: 'Trust holds, but operator strain rises fast.',
    effects: { trust: 4, support: -2, slack: -6, strain: 7, debt: -1 },
  },
  {
    id: 'quiet-fix',
    label: 'Quiet patch',
    detail: 'Patch silently and avoid drawing attention unless users complain first.',
    hint: 'Looks calm in the dashboard and dangerous in the inbox.',
    effects: { trust: -4, support: 5, slack: 3, strain: 4, debt: 7 },
  },
];

const initialState = {
  trust: 72,
  support: 28,
  slack: 64,
  strain: 22,
  debt: 18,
};

let stats = { ...initialState };
let roundIndex = 0;
let history = [];
let selections = {
  promise: null,
  feedback: null,
  recovery: null,
};

function clamp(value) {
  return Math.max(0, Math.min(100, value));
}

function currentScenario() {
  return scenarios[roundIndex];
}

function scoreClass(value, highGood = true) {
  if (highGood) {
    if (value >= 70) return 'good';
    if (value >= 40) return 'warn';
    return 'bad';
  }

  if (value <= 30) return 'good';
  if (value <= 60) return 'warn';
  return 'bad';
}

function renderMetrics() {
  trustMetric.textContent = String(stats.trust);
  trustMetric.className = scoreClass(stats.trust, true);
  supportMetric.textContent = String(stats.support);
  supportMetric.className = scoreClass(stats.support, false);
  slackMetric.textContent = String(stats.slack);
  slackMetric.className = scoreClass(stats.slack, true);
  strainMetric.textContent = String(stats.strain);
  strainMetric.className = scoreClass(stats.strain, false);
}

function renderBoards() {
  expectationBoard.innerHTML = `<p><strong>Expectation debt:</strong> ${stats.debt <= 20 ? 'Low and manageable.' : stats.debt <= 45 ? 'Accumulating but still serviceable.' : 'Dangerously high; future misses will cost more trust than usual.'}</p>`;
  debtBoard.innerHTML = `<p><strong>Current posture:</strong> ${stats.trust >= 70 && stats.debt <= 30 ? 'Promises and reality are mostly aligned.' : stats.support >= 55 || stats.strain >= 60 ? 'The system is surviving by spending operator and support capacity.' : 'You are trading headline smoothness against future credibility.'}</p>`;
  policyBoard.innerHTML = `<p><strong>Operator cue:</strong> ${stats.slack <= 30 ? 'Delivery slack is thin, so avoid promise shapes that require hidden heroics.' : stats.support >= 50 ? 'Support is becoming the buffer for product optimism.' : 'You still have room to repay trust with transparent behavior.'}</p>`;
}

function renderOptions(target, lane, choices) {
  target.innerHTML = choices
    .map((choice) => `
      <button class="option-card${selections[lane]?.id === choice.id ? ' is-selected' : ''}" type="button" data-lane="${lane}" data-choice="${choice.id}">
        <strong>${choice.label}</strong>
        <p>${choice.detail}</p>
        <span class="delta">${choice.hint}</span>
      </button>
    `)
    .join('');

  target.querySelectorAll('[data-choice]').forEach((button) => {
    button.addEventListener('click', () => {
      selections[lane] = choices.find((choice) => choice.id === button.dataset.choice) || null;
      renderRound();
    });
  });
}

function renderSelectionSummary() {
  const missing = ['promise', 'feedback', 'recovery'].filter((lane) => !selections[lane]);
  if (missing.length) {
    selectionSummary.textContent = `Still missing: ${missing.join(', ')}. Pick one option from each lane to resolve the round.`;
    resolveBtn.disabled = true;
    return;
  }

  selectionSummary.textContent = `${selections.promise.label} + ${selections.feedback.label} + ${selections.recovery.label}. Resolve to see whether the promise compounds or repays debt.`;
  resolveBtn.disabled = false;
}

function renderRound() {
  const scenario = currentScenario();
  roundLabel.textContent = `Round ${roundIndex + 1} of ${scenarios.length}`;
  scenarioType.textContent = scenario.lane;
  scenarioTitle.textContent = scenario.title;
  scenarioSummary.textContent = scenario.summary;
  scenarioPressure.textContent = scenario.pressure;
  scenarioTags.innerHTML = scenario.tags.map((tag) => `<span class="tag">${tag}</span>`).join('');
  renderMetrics();
  renderBoards();
  renderOptions(promiseOptions, 'promise', promiseChoices);
  renderOptions(feedbackOptions, 'feedback', feedbackChoices);
  renderOptions(recoveryOptions, 'recovery', recoveryChoices);
  renderSelectionSummary();
}

function applyRoundEffects() {
  const scenario = currentScenario();
  const promise = selections.promise.effects;
  const feedback = selections.feedback.effects;
  const recovery = selections.recovery.effects;
  const volatilityPenalty = scenario.volatility;
  const overPromisePenalty = Math.max(0, promise.debt + feedback.debt - recovery.debt);

  const trustDelta = promise.trust + feedback.trust + recovery.trust - Math.round((volatilityPenalty + overPromisePenalty) / 8);
  const supportDelta = promise.support + feedback.support + recovery.support + Math.round(volatilityPenalty / 9);
  const slackDelta = promise.slack + feedback.slack + recovery.slack - Math.round(volatilityPenalty / 10);
  const strainDelta = promise.strain + feedback.strain + recovery.strain + Math.round(overPromisePenalty / 7);
  const debtDelta = promise.debt + feedback.debt + recovery.debt + Math.round(volatilityPenalty / 5) - Math.round(recovery.trust / 3);

  stats = {
    trust: clamp(stats.trust + trustDelta),
    support: clamp(stats.support + supportDelta),
    slack: clamp(stats.slack + slackDelta),
    strain: clamp(stats.strain + strainDelta),
    debt: clamp(stats.debt + debtDelta),
  };

  const verdict =
    trustDelta >= 4 && debtDelta <= 3
      ? 'Trust repaired faster than debt accumulated.'
      : trustDelta < 0 && debtDelta >= 8
        ? 'You bought a smoother story by pushing the real cost into the future.'
        : 'The round stayed survivable, but the system paid for the calm somewhere.';

  history.unshift({
    round: roundIndex + 1,
    title: scenario.title,
    combo: `${selections.promise.label} / ${selections.feedback.label} / ${selections.recovery.label}`,
    verdict,
    deltas: { trustDelta, supportDelta, slackDelta, strainDelta, debtDelta },
  });
}

function renderHistory() {
  historyList.innerHTML = history
    .map((entry) => `
      <article class="history-entry">
        <p><strong>Round ${entry.round}:</strong> ${entry.title}</p>
        <p>${entry.combo}</p>
        <p>${entry.verdict}</p>
        <p>Trust ${entry.deltas.trustDelta >= 0 ? '+' : ''}${entry.deltas.trustDelta} | Support ${entry.deltas.supportDelta >= 0 ? '+' : ''}${entry.deltas.supportDelta} | Slack ${entry.deltas.slackDelta >= 0 ? '+' : ''}${entry.deltas.slackDelta} | Strain ${entry.deltas.strainDelta >= 0 ? '+' : ''}${entry.deltas.strainDelta}</p>
      </article>
    `)
    .join('');
}

function renderResultCard() {
  const latest = history[0];
  if (!latest) {
    resultCard.innerHTML = '<p>Resolve the first round to see how the promise lands.</p>';
    return;
  }

  resultCard.innerHTML = `
    <p><strong>Latest result:</strong> ${latest.verdict}</p>
    <p>${latest.combo}</p>
    <p><strong>Expectation debt change:</strong> ${latest.deltas.debtDelta >= 0 ? '+' : ''}${latest.deltas.debtDelta}</p>
  `;
}

function renderSummaryCard() {
  if (roundIndex < scenarios.length) {
    summaryCard.innerHTML = '<p>Final posture will appear here after round six.</p>';
    return;
  }

  const profile =
    stats.trust >= 70 && stats.debt <= 35
      ? 'Credible operator'
      : stats.support >= 55 || stats.strain >= 60
        ? 'Human buffer addict'
        : stats.debt >= 60
          ? 'Promise balloonist'
          : 'Patchy pragmatist';

  summaryCard.innerHTML = `
    <p><strong>Final archetype:</strong> ${profile}</p>
    <p>Trust ${stats.trust}, support load ${stats.support}, delivery slack ${stats.slack}, operator strain ${stats.strain}, expectation debt ${stats.debt}.</p>
    <p>${profile === 'Credible operator' ? 'You kept promises close to what the system could actually sustain.' : profile === 'Human buffer addict' ? 'Users stayed somewhat protected, but hidden human effort became the real product surface.' : profile === 'Promise balloonist' ? 'The interface kept borrowing certainty that the backend could not pay back.' : 'You survived, but the product story still leaks operational cost into the future.'}</p>
  `;
}

function resolveRound() {
  if (!selections.promise || !selections.feedback || !selections.recovery) return;
  applyRoundEffects();
  renderHistory();
  renderResultCard();
  roundIndex += 1;

  if (roundIndex >= scenarios.length) {
    promiseOptions.innerHTML = '';
    feedbackOptions.innerHTML = '';
    recoveryOptions.innerHTML = '';
    selectionSummary.textContent = 'Run complete. Review the ledger or restart with a cleaner promise posture.';
    resolveBtn.disabled = true;
    roundLabel.textContent = `Run complete`;
    scenarioType.textContent = 'Portfolio brief ready';
  } else {
    selections = { promise: null, feedback: null, recovery: null };
    renderRound();
  }

  renderMetrics();
  renderBoards();
  renderSummaryCard();
}

function resetRun() {
  stats = { ...initialState };
  roundIndex = 0;
  history = [];
  selections = { promise: null, feedback: null, recovery: null };
  renderHistory();
  renderResultCard();
  renderSummaryCard();
  renderRound();
}

function buildBrief() {
  const lines = [
    'Expectation Debt Studio Brief',
    '',
    `Rounds resolved: ${history.length}/${scenarios.length}`,
    `Trust ${stats.trust} | Support ${stats.support} | Slack ${stats.slack} | Strain ${stats.strain} | Expectation debt ${stats.debt}`,
    summaryCard.textContent.replace(/\s+/g, ' ').trim(),
    '',
    'Round tape:',
  ];

  history
    .slice()
    .reverse()
    .forEach((entry) => {
      lines.push(`Round ${entry.round}: ${entry.title}`);
      lines.push(`${entry.combo}`);
      lines.push(entry.verdict);
      lines.push('');
    });

  return lines.join('\n');
}

resolveBtn.addEventListener('click', resolveRound);
restartBtn.addEventListener('click', resetRun);
copyBriefBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(buildBrief());
    copyBriefBtn.textContent = 'Brief Copied';
    window.setTimeout(() => {
      copyBriefBtn.textContent = 'Copy Session Brief';
    }, 1200);
  } catch (error) {
    copyBriefBtn.textContent = 'Clipboard Unavailable';
    window.setTimeout(() => {
      copyBriefBtn.textContent = 'Copy Session Brief';
    }, 1200);
  }
});

resetRun();
