const scenarioTitle = document.getElementById('scenario-title');
const roundLabel = document.getElementById('round-label');
const scenarioCopy = document.getElementById('scenario-copy');
const signalFacts = document.getElementById('signal-facts');
const signalMood = document.getElementById('signal-mood');
const signalPressure = document.getElementById('signal-pressure');
const signalWindow = document.getElementById('signal-window');
const scenarioChange = document.getElementById('scenario-change');
const toneOptions = document.getElementById('tone-options');
const certaintyOptions = document.getElementById('certainty-options');
const timeOptions = document.getElementById('time-options');
const actionOptions = document.getElementById('action-options');
const messagePreview = document.getElementById('message-preview');
const sendUpdateButton = document.getElementById('send-update');
const nextRoundButton = document.getElementById('next-round');
const resetRoundButton = document.getElementById('reset-round');
const copyBriefButton = document.getElementById('copy-brief');
const metricTrust = document.getElementById('metric-trust');
const metricClarity = document.getElementById('metric-clarity');
const metricTickets = document.getElementById('metric-tickets');
const metricCalm = document.getElementById('metric-calm');
const verdictTag = document.getElementById('verdict-tag');
const roundVerdict = document.getElementById('round-verdict');
const voiceCoach = document.getElementById('voice-coach');
const eventLog = document.getElementById('event-log');
const finalSummary = document.getElementById('final-summary');

const optionSets = {
  tone: [
    { id: 'steady', label: 'Steady', detail: 'Calm and plainspoken without over-selling confidence.', message: 'We are working through the issue and keeping updates plain and current.', trust: 6, clarity: 4, tickets: -4, calm: 5 },
    { id: 'apology', label: 'Apologetic', detail: 'Leans into empathy and user pain.', message: 'We know this disruption is frustrating and we are sorry for the impact.', trust: 4, clarity: 2, tickets: -2, calm: -2 },
    { id: 'defensive', label: 'Defensive', detail: 'Tries to narrow blame or minimize the event.', message: 'Only a subset of users are affected and the broader platform remains stable.', trust: -6, clarity: -2, tickets: 5, calm: -4 },
  ],
  certainty: [
    { id: 'confirm', label: 'Confirmed impact', detail: 'States what is known and what is not.', message: 'We have confirmed elevated failures and are tracing the failure path now.', trust: 5, clarity: 5, tickets: -3, calm: 2 },
    { id: 'investigating', label: 'Investigating', detail: 'Signals uncertainty but stays explicit.', message: 'We are investigating reports and validating scope before naming a root cause.', trust: 3, clarity: 3, tickets: -1, calm: 3 },
    { id: 'premature', label: 'Premature cause', detail: 'Names a likely cause before the evidence is firm.', message: 'This appears to be isolated to one dependency and should be straightforward to resolve.', trust: -5, clarity: 1, tickets: 3, calm: -5 },
  ],
  time: [
    { id: 'checkpoint', label: 'Next checkpoint', detail: 'Promises the next update time, not the fix time.', message: 'We will post the next update in 20 minutes even if the fix is still in progress.', trust: 6, clarity: 4, tickets: -5, calm: 3 },
    { id: 'eta', label: 'Firm ETA', detail: 'Promises a recovery window.', message: 'We expect recovery within the next 15 minutes.', trust: 2, clarity: 5, tickets: -1, calm: -3 },
    { id: 'none', label: 'No timing', detail: 'Avoids any time anchor.', message: 'We will share more as we learn more.', trust: -3, clarity: -2, tickets: 4, calm: 1 },
  ],
  action: [
    { id: 'wait', label: 'Wait on us', detail: 'Asks users to watch the page and avoid duplicate tickets.', message: 'Please follow this page for updates instead of opening duplicate support threads.', trust: 4, clarity: 4, tickets: -6, calm: 2 },
    { id: 'workaround', label: 'Offer workaround', detail: 'Provides a temporary escape hatch.', message: 'If your work is blocked, switch to the lightweight fallback flow until recovery is confirmed.', trust: 5, clarity: 5, tickets: -4, calm: 1 },
    { id: 'vague', label: 'No action', detail: 'Leaves users without a concrete next move.', message: 'We appreciate your patience while we continue to monitor the situation.', trust: -4, clarity: -3, tickets: 5, calm: 0 },
  ],
};

const scenarios = [
  {
    title: 'Campus login outage at registration open',
    copy: 'The sign-in edge is flapping right as course registration opens. Students are refreshing aggressively and support is already getting screenshots.',
    facts: 'Auth failures confirmed, root cause still uncertain.',
    mood: 'Impatient and escalating fast.',
    pressure: 'Ticket flood risk.',
    window: 'You can name symptoms, not cause.',
    change: 'A rollback is in progress, but the auth team is not ready to promise recovery time.',
    modifiers: { steady: { trust: 2 }, apology: { calm: -1 }, defensive: { tickets: 3 }, confirm: { trust: 2 }, premature: { trust: -4, calm: -2 }, checkpoint: { trust: 2, tickets: -2 }, eta: { trust: -4 }, wait: { tickets: -2 }, workaround: { clarity: 2 } },
  },
  {
    title: 'Payments degraded after a dependency deploy',
    copy: 'Card authorization is timing out intermittently. Revenue pressure is high and leadership wants the status page to sound stable.',
    facts: 'Intermittent payment failures, rollback path exists.',
    mood: 'Anxious, high-stakes, executive attention.',
    pressure: 'Trust vs conversion tension.',
    window: 'You can confirm impact and next step.',
    change: 'The rollback is underway, but queue drain will keep failures visible for a while.',
    modifiers: { steady: { calm: 2 }, apology: { trust: 2 }, defensive: { trust: -5, tickets: 2 }, confirm: { clarity: 3 }, premature: { trust: -3 }, checkpoint: { trust: 1 }, eta: { trust: -2 }, wait: { trust: -2 }, workaround: { trust: 3, clarity: 3 } },
  },
  {
    title: 'Search is slow but not fully down',
    copy: 'Most requests still complete, but the slow tail is stretching past ten seconds. Users are confused about whether retrying helps.',
    facts: 'Partial degradation, no full outage.',
    mood: 'Confused more than angry.',
    pressure: 'Ambiguity and retry storms.',
    window: 'You can frame behavior expectations.',
    change: 'The backend is shedding heavy requests and the simple search path is healthier.',
    modifiers: { steady: { trust: 1 }, apology: { tickets: 1 }, defensive: { trust: -4 }, confirm: { clarity: 2 }, premature: { trust: -2 }, checkpoint: { tickets: -1 }, eta: { clarity: -1 }, wait: { tickets: 2 }, workaround: { tickets: -3, trust: 2, clarity: 3 } },
  },
  {
    title: 'Data export incident with compliance attention',
    copy: 'Exports are delayed and a handful may have included stale rows. Legal wants precision. Customers want reassurance immediately.',
    facts: 'Potential data correctness issue, scope still bounded.',
    mood: 'High sensitivity and low tolerance for spin.',
    pressure: 'Precision vs panic.',
    window: 'You must stay accurate under compliance scrutiny.',
    change: 'Engineering has stopped fresh exports, but historical integrity checks are still running.',
    modifiers: { steady: { trust: 2 }, apology: { trust: 1 }, defensive: { trust: -7, calm: -3 }, confirm: { clarity: 3 }, premature: { trust: -6 }, checkpoint: { trust: 2 }, eta: { trust: -5 }, wait: { tickets: -1 }, workaround: { clarity: 1 } },
  },
];

const state = {
  round: 0,
  totals: { trust: 50, clarity: 50, tickets: 50, calm: 50 },
  selections: { tone: 'steady', certainty: 'investigating', time: 'checkpoint', action: 'wait' },
  submittedRounds: [],
};

function clampMetric(value) {
  return Math.max(0, Math.min(100, value));
}

function currentScenario() {
  return scenarios[state.round];
}

function selectedOption(type) {
  return optionSets[type].find((option) => option.id === state.selections[type]);
}

function scoreRound() {
  const scenario = currentScenario();
  const tone = selectedOption('tone');
  const certainty = selectedOption('certainty');
  const time = selectedOption('time');
  const action = selectedOption('action');
  const picked = { tone, certainty, time, action };
  const totals = { trust: 0, clarity: 0, tickets: 0, calm: 0 };

  Object.entries(picked).forEach(([key, option]) => {
    totals.trust += option.trust;
    totals.clarity += option.clarity;
    totals.tickets += option.tickets;
    totals.calm += option.calm;
    const modifier = scenario.modifiers[option.id];
    if (modifier) {
      totals.trust += modifier.trust || 0;
      totals.clarity += modifier.clarity || 0;
      totals.tickets += modifier.tickets || 0;
      totals.calm += modifier.calm || 0;
    }
  });

  return totals;
}

function buildPreview() {
  const tone = selectedOption('tone');
  const certainty = selectedOption('certainty');
  const time = selectedOption('time');
  const action = selectedOption('action');
  return `${tone.message} ${certainty.message} ${time.message} ${action.message}`;
}

function renderOptions(type, container) {
  container.innerHTML = optionSets[type]
    .map((option) => `
      <button class="option-btn ${state.selections[type] === option.id ? 'active' : ''}" type="button" data-type="${type}" data-id="${option.id}">
        <strong>${option.label}</strong>
        <span>${option.detail}</span>
      </button>
    `)
    .join('');

  container.querySelectorAll('.option-btn').forEach((button) => {
    button.addEventListener('click', () => {
      state.selections[type] = button.dataset.id;
      renderComposer();
    });
  });
}

function renderScenario() {
  const scenario = currentScenario();
  scenarioTitle.textContent = scenario.title;
  roundLabel.textContent = `Round ${state.round + 1} / ${scenarios.length}`;
  scenarioCopy.textContent = scenario.copy;
  signalFacts.textContent = scenario.facts;
  signalMood.textContent = scenario.mood;
  signalPressure.textContent = scenario.pressure;
  signalWindow.textContent = scenario.window;
  scenarioChange.textContent = scenario.change;
}

function renderComposer() {
  renderOptions('tone', toneOptions);
  renderOptions('certainty', certaintyOptions);
  renderOptions('time', timeOptions);
  renderOptions('action', actionOptions);
  messagePreview.textContent = buildPreview();
}

function renderScoreboard() {
  metricTrust.textContent = String(state.totals.trust);
  metricClarity.textContent = String(state.totals.clarity);
  metricTickets.textContent = String(state.totals.tickets);
  metricCalm.textContent = String(state.totals.calm);
}

function renderLog() {
  eventLog.innerHTML = state.submittedRounds.length
    ? state.submittedRounds.map((round) => `<li><strong>${round.title}:</strong> ${round.verdict}</li>`).join('')
    : '<li>No public update published yet.</li>';
}

function publishRound() {
  const delta = scoreRound();
  state.totals.trust = clampMetric(state.totals.trust + delta.trust);
  state.totals.clarity = clampMetric(state.totals.clarity + delta.clarity);
  state.totals.tickets = clampMetric(state.totals.tickets + delta.tickets);
  state.totals.calm = clampMetric(state.totals.calm + delta.calm);

  const pressureScore = delta.trust + delta.clarity - delta.tickets + delta.calm;
  const verdict =
    pressureScore >= 12
      ? 'Strong update: it kept the truth window honest while lowering panic.'
      : pressureScore >= 2
        ? 'Usable update: it mostly helped, but one wording choice still created avoidable pressure.'
        : 'Weak update: it sounded either too vague or too confident for the evidence window.';
  const coach =
    delta.trust < 0
      ? 'Trust dropped because the message promised more certainty than the incident could currently support.'
      : delta.tickets > 0
        ? 'Ticket pressure rose because the message still left users without a concrete expectation or action.'
        : 'This update worked because it paired plain language with a credible next checkpoint.';

  roundVerdict.textContent = verdict;
  voiceCoach.textContent = coach;

  verdictTag.textContent = pressureScore >= 12 ? 'Strong' : pressureScore >= 2 ? 'Mixed' : 'Risky';
  verdictTag.className = `tag ${pressureScore >= 12 ? 'good' : pressureScore >= 2 ? 'warn' : 'bad'}`;

  state.submittedRounds[state.round] = {
    title: currentScenario().title,
    verdict,
    preview: buildPreview(),
  };

  renderScoreboard();
  renderLog();
  renderFinalSummary();
}

function resetRoundSelections() {
  state.selections = { tone: 'steady', certainty: 'investigating', time: 'checkpoint', action: 'wait' };
  renderComposer();
}

function renderFinalSummary() {
  if (state.submittedRounds.length < scenarios.length) {
    finalSummary.textContent = `Rounds completed: ${state.submittedRounds.length}/${scenarios.length}. Trust ${state.totals.trust}, clarity ${state.totals.clarity}, ticket load ${state.totals.tickets}, operator calm ${state.totals.calm}.`;
    return;
  }

  const trustRead = state.totals.trust >= 70 ? 'Users would likely believe the next update.' : 'Trust is shaky; the wording probably outpaced the evidence at least once.';
  const clarityRead = state.totals.clarity >= 70 ? 'The incident story stayed understandable.' : 'Some updates likely sounded too abstract or too overloaded with qualifiers.';
  const ticketRead = state.totals.tickets <= 45 ? 'Ticket pressure stayed controlled.' : 'Support demand likely rose because the page left users searching for certainty elsewhere.';
  const calmRead = state.totals.calm >= 60 ? 'Operators got room to work.' : 'The public voice likely made the incident feel hotter than it needed to.';

  finalSummary.textContent = `Final posture: ${trustRead} ${clarityRead} ${ticketRead} ${calmRead}`;
}

function moveToNextRound() {
  if (state.round < scenarios.length - 1) {
    state.round += 1;
    resetRoundSelections();
    renderScenario();
    roundVerdict.textContent = 'Publish the next update to see how this incident beat reacts.';
    voiceCoach.textContent = 'Every new beat changes the truth window. Reuse tone only if the evidence still supports it.';
    verdictTag.textContent = 'Waiting';
    verdictTag.className = 'tag neutral';
  }
}

async function copyDecisionBrief() {
  const lines = [
    'Status Page Voice Lab Brief',
    '',
    ...state.submittedRounds.map((round, index) => `${index + 1}. ${round.title} - ${round.verdict}`),
    '',
    `Trust ${state.totals.trust} | Clarity ${state.totals.clarity} | Ticket Load ${state.totals.tickets} | Operator Calm ${state.totals.calm}`,
    `Current route: ${window.location.href}`,
  ];

  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    voiceCoach.textContent = 'Copied the current communication brief.';
  } catch (error) {
    voiceCoach.textContent = 'Clipboard copy failed in this environment.';
  }
}

sendUpdateButton.addEventListener('click', publishRound);
nextRoundButton.addEventListener('click', moveToNextRound);
resetRoundButton.addEventListener('click', () => {
  resetRoundSelections();
  roundVerdict.textContent = 'Round reset. Rebuild the update and publish it again.';
  voiceCoach.textContent = 'Try changing one clause at a time so you can see which wording shift moves the outcome.';
});
copyBriefButton.addEventListener('click', copyDecisionBrief);

renderScenario();
renderComposer();
renderScoreboard();
renderLog();
renderFinalSummary();
