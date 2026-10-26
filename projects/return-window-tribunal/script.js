const cases = [
  {
    title: 'Opened Headset, Real Audio Fault',
    summary: 'A student buyer opened the headset two days ago, recorded a channel imbalance video, and says support chat already burned an hour asking for cable resets.',
    facts: [
      'Purchase age: 2 days',
      'Clear defect evidence attached',
      'Launch-week queue already has a long wait time',
      'Customer is asking for a replacement, not cash back',
    ],
    stakes: {
      trust: 'High if denied',
      abuse: 'Low fraud signal',
      support: 'Each extra back-and-forth multiplies ticket load',
      margin: 'Replacement cost is real but defensible',
    },
    decisions: [
      {
        label: 'Approve instant exchange',
        note: 'Replace the faulty headset and reduce the time spent on the support request.',
        effect: { trust: 12, abuse: -4, support: -8, margin: -7 },
      },
      {
        label: 'Offer store credit first',
        note: 'Keep the sale as store credit, although the customer asked for a replacement.',
        effect: { trust: -4, abuse: 2, support: 6, margin: 3 },
      },
      {
        label: 'Escalate for engineering review',
        note: 'Get another review of the fault while the customer waits.',
        effect: { trust: -6, abuse: -2, support: 9, margin: 5 },
      },
    ],
  },
  {
    title: 'Gift Return Without Receipt',
    summary: 'A parent bought the device as a gift. The recipient wants a return three weeks later without the receipt, but the serial number is valid and unopened.',
    facts: [
      'Purchase age: 21 days',
      'Box still sealed',
      'Valid serial number found',
      'Support notes show no prior claims on the serial',
    ],
    stakes: {
      trust: 'The gift recipient wants a usable return option',
      abuse: 'Medium because receipt is missing',
      support: 'A clear answer avoids repeated support messages',
      margin: 'A refund costs more cash than an exchange',
    },
    decisions: [
      {
        label: 'Approve store credit with serial verification',
        note: 'Verify the serial number and offer credit for the unopened device.',
        effect: { trust: 8, abuse: -1, support: -4, margin: 4 },
      },
      {
        label: 'Deny without receipt',
        note: 'Apply the receipt requirement even though the device is unopened.',
        effect: { trust: -10, abuse: -5, support: 3, margin: 8 },
      },
      {
        label: 'Allow exchange only',
        note: 'Offer a different product instead of returning the money.',
        effect: { trust: 2, abuse: -2, support: -1, margin: 6 },
      },
    ],
  },
  {
    title: 'Heavy User, Cosmetic Damage, Viral Thread',
    summary: 'A known enthusiast has visible wear after 45 days, but a hinge crack photo is spreading on social media and your queue can see the thread.',
    facts: [
      'Purchase age: 45 days',
      'Usage is heavy and visible',
      'A public thread is accelerating the story',
      'The crack might be design-related, not abuse-related',
    ],
    stakes: {
      trust: 'Other buyers are following the public complaint',
      abuse: 'Medium because wear complicates fault',
      support: 'A bad ruling creates repeat contacts and quote screenshots',
      margin: 'A replacement costs money; denying it may upset other buyers',
    },
    decisions: [
      {
        label: 'Grant one-time exception replacement',
        note: 'Replace the worn device as an exception and inspect the reported crack.',
        effect: { trust: 10, abuse: 6, support: -5, margin: -8 },
      },
      {
        label: 'Offer discounted replacement',
        note: 'Share the replacement cost with the buyer while the cause remains unclear.',
        effect: { trust: 1, abuse: 1, support: 4, margin: 2 },
      },
      {
        label: 'Deny as wear and tear',
        note: 'Treat the damage as normal wear. The buyer may continue the public complaint.',
        effect: { trust: -12, abuse: -4, support: 8, margin: 7 },
      },
    ],
  },
  {
    title: 'Repeat Returner, Suspicious Pattern',
    summary: 'An account has filed three premium returns this quarter. The new request claims battery drift, but diagnostics are inconclusive and accessories are missing.',
    facts: [
      'Prior high-value returns on the same account',
      'Current claim is hard to verify remotely',
      'Accessories missing from the box',
      'Chargeback threat mentioned in chat',
    ],
    stakes: {
      trust: 'Another approval may do little to change this relationship',
      abuse: 'Repeated claims and missing accessories need checking',
      support: 'A disputed decision may need a senior review',
      margin: 'Potential direct abuse loss is high',
    },
    decisions: [
      {
        label: 'Require mail-in inspection',
        note: 'Inspect the device before deciding on another high-value return.',
        effect: { trust: -2, abuse: -8, support: 5, margin: 7 },
      },
      {
        label: 'Approve immediately to avoid escalation',
        note: 'Close the request quickly despite the unclear fault and previous returns.',
        effect: { trust: 3, abuse: 10, support: -3, margin: -10 },
      },
      {
        label: 'Deny and cite missing accessories',
        note: 'Apply the accessories requirement. The customer may dispute the charge.',
        effect: { trust: -7, abuse: -4, support: 7, margin: 8 },
      },
    ],
  },
  {
    title: 'Campus Bulk Order, Wrong Color Shipment',
    summary: 'A student org ordered ten devices for an event, but fulfillment sent the wrong color variant. The event is in four days and the boxes are still sealed.',
    facts: [
      'Bulk order with visible campus use case',
      'Issue is yours, not customer-caused',
      'Timing is tight before the event',
      'The group may order again if the shipment is corrected',
    ],
    stakes: {
      trust: 'High because the buyer may place future group orders',
      abuse: 'Very low',
      support: 'One answer can prevent ten separate support requests',
      margin: 'Shipping speed becomes the main cost, not the refund itself',
    },
    decisions: [
      {
        label: 'Expedite exchange and cover return labels',
        note: 'Pay for faster shipping to correct the wrong-color shipment before the event.',
        effect: { trust: 11, abuse: -3, support: -7, margin: -6 },
      },
      {
        label: 'Offer partial refund to keep the shipment',
        note: 'Offer a discount if the group can use the wrong-color devices.',
        effect: { trust: -1, abuse: 0, support: 2, margin: 4 },
      },
      {
        label: 'Ask the org to wait for standard replacement timing',
        note: 'Use standard shipping even though the replacements may miss the event.',
        effect: { trust: -9, abuse: -2, support: 8, margin: 6 },
      },
    ],
  },
  {
    title: 'Last-Day Return Window, Honest Regret',
    summary: 'A customer on day 30 simply says the product never clicked. The device is clean, complete, and fully functional, but there is no defect claim to hide behind.',
    facts: [
      'Return is within the written window',
      'No defect evidence',
      'Device condition is clean and complete',
      'The question is whether to honor a return for a working product',
    ],
    stakes: {
      trust: 'Moderate if the promise is genuine',
      abuse: 'Medium because leniency becomes precedent',
      support: 'Simple, clear rules keep this lane cheap',
      margin: 'Refunding regret can become an expensive habit',
    },
    decisions: [
      {
        label: 'Honor the full refund',
        note: 'Accept the return within the stated window.',
        effect: { trust: 9, abuse: 4, support: -4, margin: -8 },
      },
      {
        label: 'Offer exchange or credit only',
        note: 'Keep the money as store credit even though the request is within the return window.',
        effect: { trust: -3, abuse: 0, support: 3, margin: 5 },
      },
      {
        label: 'Charge a restocking fee',
        note: 'Refund part of the purchase and keep a restocking fee.',
        effect: { trust: -6, abuse: -1, support: 4, margin: 6 },
      },
    ],
  },
];

const trustScoreEl = document.getElementById('trust-score');
const abuseScoreEl = document.getElementById('abuse-score');
const supportScoreEl = document.getElementById('support-score');
const marginScoreEl = document.getElementById('margin-score');
const caseTitleEl = document.getElementById('case-title');
const caseRoundEl = document.getElementById('case-round');
const caseSummaryEl = document.getElementById('case-summary');
const caseFactsEl = document.getElementById('case-facts');
const stakeMapEl = document.getElementById('stake-map');
const decisionGridEl = document.getElementById('decision-grid');
const statusLineEl = document.getElementById('status-line');
const policyTitleEl = document.getElementById('policy-title');
const policySummaryEl = document.getElementById('policy-summary');
const policyWatchEl = document.getElementById('policy-watch');
const precedentTitleEl = document.getElementById('precedent-title');
const precedentSummaryEl = document.getElementById('precedent-summary');
const precedentWatchEl = document.getElementById('precedent-watch');
const verdictTitleEl = document.getElementById('verdict-title');
const verdictSummaryEl = document.getElementById('verdict-summary');
const verdictWatchEl = document.getElementById('verdict-watch');
const decisionLogEl = document.getElementById('decision-log');
const restartBtn = document.getElementById('restart-btn');
const copyBriefBtn = document.getElementById('copy-brief-btn');

const startingScores = {
  trust: 50,
  abuse: 50,
  support: 50,
  margin: 50,
};

let state = buildInitialState();

function buildInitialState() {
  return {
    index: 0,
    trust: startingScores.trust,
    abuse: startingScores.abuse,
    support: startingScores.support,
    margin: startingScores.margin,
    decisions: [],
  };
}

function clampScore(value) {
  return Math.max(0, Math.min(100, value));
}

function scoreRead(value, inverse = false) {
  const adjusted = inverse ? 100 - value : value;
  if (adjusted >= 70) return 'Strong';
  if (adjusted >= 45) return 'Mixed';
  return 'Fragile';
}

function updateScoreboard() {
  trustScoreEl.textContent = `${state.trust}`;
  abuseScoreEl.textContent = `${state.abuse}`;
  supportScoreEl.textContent = `${state.support}`;
  marginScoreEl.textContent = `${state.margin}`;
}

function renderCase() {
  updateScoreboard();
  renderPolicyBoards();
  renderLog();

  const currentCase = cases[state.index];
  if (!currentCase) {
    renderFinishedState();
    return;
  }

  caseTitleEl.textContent = currentCase.title;
  caseRoundEl.textContent = `Case ${state.index + 1} / ${cases.length}`;
  caseSummaryEl.textContent = currentCase.summary;
  caseFactsEl.innerHTML = currentCase.facts.map((fact) => `<li>${fact}</li>`).join('');
  stakeMapEl.innerHTML = Object.entries(currentCase.stakes)
    .map(
      ([key, value]) => `
        <article class="stake-card">
          <span>${key[0].toUpperCase()}${key.slice(1)}</span>
          <strong>${value}</strong>
        </article>
      `
    )
    .join('');
  decisionGridEl.innerHTML = currentCase.decisions
    .map(
      (decision, index) => `
        <button class="decision-card" type="button" data-index="${index}">
          <strong>${decision.label}</strong>
          <span>${decision.note}</span>
          <div class="delta">
            ${Object.entries(decision.effect)
              .map(([key, value]) => {
                const tone = value > 0 ? 'delta-good' : value < 0 ? 'delta-bad' : 'delta-warn';
                return `<span class="delta-chip ${tone}">${key}: ${value > 0 ? '+' : ''}${value}</span>`;
              })
              .join('')}
          </div>
        </button>
      `
    )
    .join('');
  statusLineEl.textContent = 'Pick a ruling to move the queue forward.';

  decisionGridEl.querySelectorAll('.decision-card').forEach((button) => {
    button.addEventListener('click', () => applyDecision(Number(button.dataset.index)));
  });
}

function renderPolicyBoards() {
  const exceptionCount = state.decisions.filter((item) => item.label.includes('Approve') || item.label.includes('exception')).length;
  const denialCount = state.decisions.filter((item) => item.label.includes('Deny')).length;
  const policyMode = state.trust >= 62 && state.margin < 48
    ? 'More generous returns'
    : state.margin >= 62 && state.trust < 48
      ? 'Stricter cost control'
      : 'Mixed return choices';

  policyTitleEl.textContent = policyMode;
  policySummaryEl.textContent = `Customer trust: ${scoreRead(state.trust)}. Cost control: ${scoreRead(state.margin)}. Fraud-risk result: ${scoreRead(state.abuse, true)}. Support-workload result: ${scoreRead(state.support, true)}.`;
  policyWatchEl.textContent = state.trust < 40
    ? 'Customer trust is below 40 in this run.'
    : state.margin < 40
      ? 'Cost control is below 40 in this run.'
      : 'Trust and cost control are both at 40 or higher.';

  precedentTitleEl.textContent = state.decisions.length
    ? `${exceptionCount} exception-style ruling${exceptionCount === 1 ? '' : 's'} vs ${denialCount} hard denial${denialCount === 1 ? '' : 's'}`
    : 'No precedent yet';
  precedentSummaryEl.textContent = state.decisions.length
    ? `Your decisions lean toward ${exceptionCount > denialCount ? 'exceptions' : denialCount > exceptionCount ? 'denials' : 'an equal count of exceptions and denials'}.`
    : 'Make a decision to start the count.';
  precedentWatchEl.textContent = state.decisions.length
    ? 'This count summarizes your choices. It does not change later cases.'
    : 'All six cases use fixed choices and score changes.';

  if (state.index < cases.length) {
    verdictTitleEl.textContent = 'Queue still in progress';
    verdictSummaryEl.textContent = 'Finish the remaining cases to see the combined result.';
    verdictWatchEl.textContent = 'Higher trust and cost control help the final score. Lower fraud risk and workload help too.';
    return;
  }

  const total = state.trust + state.margin + (100 - state.abuse) + (100 - state.support);
  const verdict =
    total >= 230
      ? 'Higher combined score'
      : total >= 185
        ? 'Middle combined score'
        : 'Lower combined score';
  verdictTitleEl.textContent = verdict;
  verdictSummaryEl.textContent = `Final scores: trust ${state.trust}, fraud risk ${state.abuse}, support workload ${state.support}, cost control ${state.margin}.`;
  verdictWatchEl.textContent = total >= 230
    ? 'Your combined score reached at least 230 under the game rules.'
    : total >= 185
      ? 'Your combined score was between 185 and 229 under the game rules.'
      : 'Your combined score was below 185 under the game rules.';
}

function renderLog() {
  if (!state.decisions.length) {
    decisionLogEl.innerHTML = '<li>Your decisions will appear here.</li>';
    return;
  }

  decisionLogEl.innerHTML = state.decisions
    .map(
      (item) => `
        <li>
          <strong>${item.caseTitle}</strong> -> ${item.label}
          <div>${item.note}</div>
        </li>
      `
    )
    .join('');
}

function renderFinishedState() {
  caseTitleEl.textContent = 'Queue complete';
  caseRoundEl.textContent = `Resolved ${cases.length} / ${cases.length}`;
  caseSummaryEl.textContent = 'You have ruled on every queued case. Restart the launch queue or copy the policy brief.';
  caseFactsEl.innerHTML = `
    <li>Trust ended at ${state.trust}.</li>
    <li>Fraud risk ended at ${state.abuse}.</li>
    <li>Support load ended at ${state.support}.</li>
    <li>Cost control ended at ${state.margin}.</li>
  `;
  stakeMapEl.innerHTML = '';
  decisionGridEl.innerHTML = '';
  statusLineEl.textContent = 'All six cases are complete. Copy the results or restart to try other choices.';
}

function applyDecision(decisionIndex) {
  const currentCase = cases[state.index];
  const decision = currentCase?.decisions?.[decisionIndex];
  if (!decision) return;

  state.trust = clampScore(state.trust + decision.effect.trust);
  state.abuse = clampScore(state.abuse + decision.effect.abuse);
  state.support = clampScore(state.support + decision.effect.support);
  state.margin = clampScore(state.margin + decision.effect.margin);
  state.decisions.unshift({
    caseTitle: currentCase.title,
    label: decision.label,
    note: decision.note,
  });
  state.index += 1;
  statusLineEl.textContent = `${decision.label} recorded. Queue moved forward with trust ${state.trust}, abuse ${state.abuse}, support ${state.support}, margin ${state.margin}.`;
  renderCase();
}

function buildSessionBrief() {
  return [
    'Return Window Tribunal Session Brief',
    '',
    `Cases resolved: ${Math.min(state.index, cases.length)} / ${cases.length}`,
    `Trust: ${state.trust}`,
    `Fraud risk: ${state.abuse}`,
    `Support load: ${state.support}`,
    `Cost control: ${state.margin}`,
    '',
    `Choices so far: ${policyTitleEl.textContent}`,
    `Policy summary: ${policySummaryEl.textContent}`,
    `Exceptions and denials: ${precedentTitleEl.textContent}`,
    `Queue verdict: ${verdictTitleEl.textContent}`,
    '',
    'Decision log:',
    ...state.decisions.map((item, index) => `${index + 1}. ${item.caseTitle} -> ${item.label}`),
  ].join('\n');
}

restartBtn.addEventListener('click', () => {
  state = buildInitialState();
  renderCase();
});

copyBriefBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(buildSessionBrief());
    statusLineEl.textContent = 'Copied the current results.';
  } catch {
    statusLineEl.textContent = 'Clipboard copy failed in this environment.';
  }
});

renderCase();
