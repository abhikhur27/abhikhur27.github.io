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
        note: 'Protect trust fast and convert the case into a product-fix signal instead of a support war.',
        effect: { trust: 12, abuse: -4, support: -8, margin: -7 },
      },
      {
        label: 'Offer store credit first',
        note: 'Preserve some margin, but risk teaching the customer that obvious defects still need negotiation.',
        effect: { trust: -4, abuse: 2, support: 6, margin: 3 },
      },
      {
        label: 'Escalate for engineering review',
        note: 'You gather more certainty, but you are also asking the customer to wait through internal caution.',
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
      trust: 'Moderate social trust issue',
      abuse: 'Medium because receipt is missing',
      support: 'Fast rule clarity keeps this queue moving',
      margin: 'Refund versus exchange changes loss shape',
    },
    decisions: [
      {
        label: 'Approve store credit with serial verification',
        note: 'You preserve some discipline while still rewarding a clean unopened return.',
        effect: { trust: 8, abuse: -1, support: -4, margin: 4 },
      },
      {
        label: 'Deny without receipt',
        note: 'The rule is clear, but it teaches the queue that unopened gifts still get punished by paperwork gaps.',
        effect: { trust: -10, abuse: -5, support: 3, margin: 8 },
      },
      {
        label: 'Allow exchange only',
        note: 'You keep revenue in-system, but the recipient may feel boxed into inventory they did not choose.',
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
      trust: 'High public precedent pressure',
      abuse: 'Medium because wear complicates fault',
      support: 'A bad ruling creates repeat contacts and quote screenshots',
      margin: 'Exception cost is visible but brand damage may cost more',
    },
    decisions: [
      {
        label: 'Grant one-time exception replacement',
        note: 'You absorb some abuse risk to stop a public trust spiral and gather field-failure evidence.',
        effect: { trust: 10, abuse: 6, support: -5, margin: -8 },
      },
      {
        label: 'Offer discounted replacement',
        note: 'You split the burden, but the customer may read the compromise as half-belief in the defect.',
        effect: { trust: 1, abuse: 1, support: 4, margin: 2 },
      },
      {
        label: 'Deny as wear and tear',
        note: 'You defend the written policy while risking a louder public narrative about evasive support.',
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
      trust: 'Low incremental trust upside',
      abuse: 'High risk of teaching the wrong customers the loophole',
      support: 'A messy escalation will consume senior time',
      margin: 'Potential direct abuse loss is high',
    },
    decisions: [
      {
        label: 'Require mail-in inspection',
        note: 'You slow the case down, but you force evidence before another high-value exception lands.',
        effect: { trust: -2, abuse: -8, support: 5, margin: 7 },
      },
      {
        label: 'Approve immediately to avoid escalation',
        note: 'You buy short-term calm while telling the queue that pressure still works against weak evidence.',
        effect: { trust: 3, abuse: 10, support: -3, margin: -10 },
      },
      {
        label: 'Deny and cite missing accessories',
        note: 'The rule is defensible, but a hard denial may amplify chargeback and manual review work.',
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
      'A clean logistics fix could preserve a long-term buyer',
    ],
    stakes: {
      trust: 'High because the buyer may place future group orders',
      abuse: 'Very low',
      support: 'Fast clarity prevents ten parallel tickets',
      margin: 'Shipping speed becomes the main cost, not the refund itself',
    },
    decisions: [
      {
        label: 'Expedite exchange and cover return labels',
        note: 'You spend money fast, but you protect the obvious long-term relationship and reduce support duplication.',
        effect: { trust: 11, abuse: -3, support: -7, margin: -6 },
      },
      {
        label: 'Offer partial refund to keep the shipment',
        note: 'This saves logistics pain, but the buyer still eats a product mismatch you caused.',
        effect: { trust: -1, abuse: 0, support: 2, margin: 4 },
      },
      {
        label: 'Ask the org to wait for standard replacement timing',
        note: 'This protects shipping cost but quietly tells the customer your internal cadence matters more than their event.',
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
      'This is a policy philosophy case more than a fraud case',
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
        note: 'You treat the written promise as real and keep policy trust intact.',
        effect: { trust: 9, abuse: 4, support: -4, margin: -8 },
      },
      {
        label: 'Offer exchange or credit only',
        note: 'You preserve some margin while quietly rewriting the promise after purchase.',
        effect: { trust: -3, abuse: 0, support: 3, margin: 5 },
      },
      {
        label: 'Charge a restocking fee',
        note: 'You keep some discipline, but the queue now learns that “allowed” still comes with friction.',
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
    ? 'Trust-forward queue'
    : state.margin >= 62 && state.trust < 48
      ? 'Discipline-forward queue'
      : 'Balanced but contested queue';

  policyTitleEl.textContent = policyMode;
  policySummaryEl.textContent = `Trust is ${scoreRead(state.trust)} while margin discipline is ${scoreRead(state.margin)}. Abuse pressure reads ${scoreRead(state.abuse, true)} and support load reads ${scoreRead(state.support, true)}.`;
  policyWatchEl.textContent = state.trust < 40
    ? 'Customers are starting to learn that the written promise bends against them under pressure.'
    : state.margin < 40
      ? 'The queue feels generous, but abuse and precedent risk are getting easier to justify later.'
      : 'The queue is still defensible, but one more lopsided ruling could snap the posture into a stronger identity.';

  precedentTitleEl.textContent = state.decisions.length
    ? `${exceptionCount} exception-style ruling${exceptionCount === 1 ? '' : 's'} vs ${denialCount} hard denial${denialCount === 1 ? '' : 's'}`
    : 'No precedent yet';
  precedentSummaryEl.textContent = state.decisions.length
    ? `The queue now expects ${exceptionCount > denialCount ? 'flexibility' : denialCount > exceptionCount ? 'strict proof' : 'case-by-case judgment'} because those are the rulings you have repeated most.`
    : 'Repeated exceptions or denials will change what the later cases can defend.';
  precedentWatchEl.textContent = state.decisions.length
    ? 'Consistency helps only if the precedent still matches the facts of the next case in line.'
    : 'The first few rulings matter disproportionately because they set the emotional contract for the rest of the queue.';

  if (state.index < cases.length) {
    verdictTitleEl.textContent = 'Queue still in progress';
    verdictSummaryEl.textContent = 'Finish the remaining cases to turn the full ruling set into a policy verdict.';
    verdictWatchEl.textContent = 'Watch for the score you are saving and the score you are quietly spending.';
    return;
  }

  const total = state.trust + state.margin + (100 - state.abuse) + (100 - state.support);
  const verdict =
    total >= 230
      ? 'Defensible launch policy'
      : total >= 185
        ? 'Conditional policy win'
        : 'Policy drift under pressure';
  verdictTitleEl.textContent = verdict;
  verdictSummaryEl.textContent = `Final read: trust ${state.trust}, abuse pressure ${state.abuse}, support load ${state.support}, margin discipline ${state.margin}.`;
  verdictWatchEl.textContent = total >= 230
    ? 'You protected both customer dignity and operator sanity without making abuse the easiest route in the room.'
    : total >= 185
      ? 'The queue is survivable, but one metric is clearly subsidizing the others.'
      : 'The rulings solved individual cases, but the overall return contract became harder to defend.';
}

function renderLog() {
  if (!state.decisions.length) {
    decisionLogEl.innerHTML = '<li>No rulings yet. The queue is waiting for its first precedent.</li>';
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
    <li>Abuse pressure ended at ${state.abuse}.</li>
    <li>Support load ended at ${state.support}.</li>
    <li>Margin discipline ended at ${state.margin}.</li>
  `;
  stakeMapEl.innerHTML = '';
  decisionGridEl.innerHTML = '';
  statusLineEl.textContent = 'Queue closed. Copy the brief to capture the policy story you just wrote.';
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
    `Abuse pressure: ${state.abuse}`,
    `Support load: ${state.support}`,
    `Margin discipline: ${state.margin}`,
    '',
    `Policy read: ${policyTitleEl.textContent}`,
    `Policy summary: ${policySummaryEl.textContent}`,
    `Precedent pressure: ${precedentTitleEl.textContent}`,
    `Queue verdict: ${verdictTitleEl.textContent}`,
    '',
    'Ruling tape:',
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
    statusLineEl.textContent = 'Copied the current tribunal brief.';
  } catch {
    statusLineEl.textContent = 'Clipboard copy failed in this environment.';
  }
});

renderCase();
