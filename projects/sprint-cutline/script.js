const roundTitleEl = document.getElementById('round-title');
const roundMetaEl = document.getElementById('round-meta');
const eventTitleEl = document.getElementById('event-title');
const eventBodyEl = document.getElementById('event-body');
const postureSummaryEl = document.getElementById('posture-summary');
const choiceListEl = document.getElementById('choice-list');
const resultCardEl = document.getElementById('result-card');
const timelineEl = document.getElementById('timeline');
const finalOutcomeEl = document.getElementById('final-outcome');
const nextBtn = document.getElementById('next-btn');
const restartBtn = document.getElementById('restart-btn');

const metrics = {
  trust: { valueEl: document.getElementById('metric-trust'), barEl: document.getElementById('bar-trust') },
  stability: { valueEl: document.getElementById('metric-stability'), barEl: document.getElementById('bar-stability') },
  scope: { valueEl: document.getElementById('metric-scope'), barEl: document.getElementById('bar-scope') },
  clarity: { valueEl: document.getElementById('metric-clarity'), barEl: document.getElementById('bar-clarity') },
};

const initialState = {
  round: 0,
  trust: 68,
  stability: 72,
  scope: 74,
  clarity: 61,
  selectedChoice: null,
  log: [],
};

const rounds = [
  {
    title: 'Round 1',
    shock: 'Payments edge case opens in QA',
    body: 'A late QA pass found a refund-state bug that only appears when two promo systems overlap on the same cart.',
    choices: [
      {
        title: 'Cut the loyalty-tier badge from the release',
        body: 'You free engineers to isolate the refund bug and tell product the cosmetic badge can slip one sprint.',
        effects: { trust: 4, stability: 10, scope: -12, clarity: 6 },
        result: 'The team believes you are protecting the release instead of bluffing. Marketing is annoyed, but the room understands the trade.',
      },
      {
        title: 'Keep scope and ask QA to narrow the repro',
        body: 'You hope the bug only affects a thin segment and try to preserve the launch story.',
        effects: { trust: -3, stability: -9, scope: 4, clarity: -4 },
        result: 'Scope stays intact for now, but people notice you are negotiating with uncertainty instead of absorbing it.',
      },
      {
        title: 'Ship both, add a manual refund runbook',
        body: 'You accept the defect and compensate with support instructions plus a post-launch patch promise.',
        effects: { trust: -7, stability: -12, scope: 6, clarity: 2 },
        result: 'You technically preserve the launch, but everyone now knows the release depends on ops heroics.',
      },
    ],
  },
  {
    title: 'Round 2',
    shock: 'Sales promised a screenshot to a design partner',
    body: 'A strategic customer wants one unreleased admin filter in their Monday status deck, even if the backend is not fully hardened.',
    choices: [
      {
        title: 'Mock the filter in a demo-only branch',
        body: 'You protect the real release and give sales something truthful enough for a screenshot without turning it on for production.',
        effects: { trust: 3, stability: 5, scope: -5, clarity: 8 },
        result: 'Sales grumbles, but the release stops carrying accidental demo debt.',
      },
      {
        title: 'Rush the filter behind a flag',
        body: 'You add the UI and a thin backend path, assuming the flag will absorb the risk.',
        effects: { trust: -2, stability: -6, scope: 5, clarity: -2 },
        result: 'You bought short-term peace, but engineering now owns another conditional branch with weak test coverage.',
      },
      {
        title: 'Say no and offer a narrative slide instead',
        body: 'You refuse the screenshot and write a stronger explanation of the roadmap tradeoff instead.',
        effects: { trust: 1, stability: 6, scope: -7, clarity: 5 },
        result: 'The external story is thinner, but internally the rules of reality still hold.',
      },
    ],
  },
  {
    title: 'Round 3',
    shock: 'The analytics event schema changed again',
    body: 'Growth wants cleaner funnel names, but the rename will break every dashboard already wired for launch monitoring.',
    choices: [
      {
        title: 'Freeze the schema until after launch',
        body: 'You preserve continuity for launch ops and defer naming cleanup to the first hardening sprint.',
        effects: { trust: 5, stability: 4, scope: -3, clarity: -1 },
        result: 'The dashboards stay legible, but you accept a little naming ugliness to keep the launch observable.',
      },
      {
        title: 'Dual-write old and new events',
        body: 'You absorb implementation overhead to keep reporting continuity while letting growth rename things.',
        effects: { trust: 2, stability: -3, scope: -2, clarity: 6 },
        result: 'The compromise is clever, but the release gets one more moving part at exactly the wrong time.',
      },
      {
        title: 'Rename now and update dashboards later',
        body: 'You treat naming cleanliness as more important than launch-week continuity.',
        effects: { trust: -5, stability: -7, scope: 4, clarity: 3 },
        result: 'The vocabulary looks cleaner, but your launch room is now half blind.',
      },
    ],
  },
  {
    title: 'Round 4',
    shock: 'An engineer asks for one extra day',
    body: 'The highest-risk service owner wants a short delay to finish migration cleanup they believe nobody else fully understands.',
    choices: [
      {
        title: 'Take the day and announce a narrower launch',
        body: 'You cut a secondary bundle and use the time on cleanup plus documentation.',
        effects: { trust: 7, stability: 8, scope: -10, clarity: 4 },
        result: 'The ship date hurts a little, but the team sees that you will spend political capital to protect fragile work.',
      },
      {
        title: 'Hold the date and pair them with another engineer',
        body: 'You keep the launch line fixed and try to buy redundancy with a crash handoff.',
        effects: { trust: 1, stability: -2, scope: 2, clarity: 6 },
        result: 'You gain some shared context, but the room still feels rushed and partially synthetic.',
      },
      {
        title: 'Tell them to land it after launch',
        body: 'You protect schedule at the cost of knowingly leaving cleanup debt near the release boundary.',
        effects: { trust: -6, stability: -8, scope: 5, clarity: -2 },
        result: 'Everyone hears the subtext: speed matters more than owning fragile edges.',
      },
    ],
  },
  {
    title: 'Round 5',
    shock: 'Leadership wants a confident release note tonight',
    body: 'The note has to tell a coherent story, but the sprint now contains visible cuts, safeguards, and compromises that could either look disciplined or panicked.',
    choices: [
      {
        title: 'Write the note around the cutline itself',
        body: 'You explicitly frame what made the release, what was deferred, and why the line was drawn there.',
        effects: { trust: 6, stability: 2, scope: -2, clarity: 10 },
        result: 'The story is smaller, but the release feels deliberate instead of magical.',
      },
      {
        title: 'Polish the biggest wins and hide the cuts',
        body: 'You aim for a cleaner narrative and hope nobody asks why the edges feel blurry next week.',
        effects: { trust: -4, stability: -3, scope: 4, clarity: -8 },
        result: 'The note sounds exciting, but it breaks alignment between the external promise and internal reality.',
      },
      {
        title: 'Split the note into “shipping now” and “landing next”',
        body: 'You keep momentum while protecting future scope from being mistaken as committed.',
        effects: { trust: 4, stability: 3, scope: 0, clarity: 8 },
        result: 'It is less cinematic, but the release stops pretending every thread resolved cleanly.',
      },
    ],
  },
];

let state = { ...initialState };

function clamp(value) {
  return Math.max(0, Math.min(100, value));
}

function applyMetrics() {
  Object.entries(metrics).forEach(([key, refs]) => {
    refs.valueEl.textContent = String(state[key]);
    refs.barEl.style.width = `${state[key]}%`;
  });
}

function currentRound() {
  return rounds[state.round];
}

function postureSummary() {
  const average = (state.trust + state.stability + state.scope + state.clarity) / 4;
  if (average >= 72) {
    return 'You still have room to protect quality, but every “just squeeze it in” call now risks looking unserious.';
  }
  if (average >= 56) {
    return 'The release still works, but your margin is gone. Every decision now teaches the org what kind of leader you are under compression.';
  }
  return 'You are no longer balancing priorities. You are actively choosing which failure mode the launch will remember.';
}

function renderChoices() {
  const round = currentRound();
  choiceListEl.innerHTML = round.choices
    .map(
      (choice, index) => `
        <article class="choice-card ${state.selectedChoice === index ? 'selected' : ''}">
          <p class="eyebrow">Option ${index + 1}</p>
          <h3>${choice.title}</h3>
          <p>${choice.body}</p>
          <div class="delta-row">
            ${Object.entries(choice.effects)
              .map(([key, value]) => `<span class="delta-pill">${key} ${value > 0 ? '+' : ''}${value}</span>`)
              .join('')}
          </div>
          <button type="button" data-choice-index="${index}">${state.selectedChoice === index ? 'Selected' : 'Choose This Response'}</button>
        </article>
      `
    )
    .join('');

  choiceListEl.querySelectorAll('button[data-choice-index]').forEach((button) => {
    button.addEventListener('click', () => chooseOption(Number(button.dataset.choiceIndex)));
  });
}

function renderRound() {
  const round = currentRound();
  roundTitleEl.textContent = round.title;
  roundMetaEl.textContent = `${state.round + 1} / ${rounds.length}`;
  eventTitleEl.textContent = round.shock;
  eventBodyEl.textContent = round.body;
  postureSummaryEl.textContent = postureSummary();
  applyMetrics();
  renderChoices();
}

function chooseOption(index) {
  state.selectedChoice = index;
  const choice = currentRound().choices[index];
  resultCardEl.classList.remove('hidden');
  resultCardEl.innerHTML = `
    <p class="eyebrow">Locked Read</p>
    <h3>${choice.title}</h3>
    <p>${choice.result}</p>
  `;
  nextBtn.disabled = false;
  renderChoices();
}

function renderTimeline() {
  timelineEl.innerHTML = state.log.length
    ? state.log
        .map(
          (entry, index) => `
            <article class="timeline-entry">
              <strong>Round ${index + 1}: ${entry.choice}</strong>
              <p>${entry.result}</p>
            </article>
          `
        )
        .join('')
    : '<p>No decisions logged yet. Pick a response to start the release trail.</p>';
}

function finalVerdict() {
  const total = state.trust + state.stability + state.scope + state.clarity;
  if (state.stability < 40 || state.trust < 40) {
    return {
      title: 'Launch shipped, but the room stopped trusting the line',
      body: 'You preserved parts of the release, but the team now reads your promises as negotiable. The next sprint starts in debt, not momentum.',
    };
  }
  if (total >= 280) {
    return {
      title: 'Disciplined launch with a credible cutline',
      body: 'You shipped less than the maximal fantasy, but the release story remained coherent and the team still believes the tradeoffs were real.',
    };
  }
  return {
    title: 'Mixed launch: technically out, strategically bruised',
    body: 'You kept enough of the train on the rails to launch, but the release now carries obvious compromises that the org will have to explain later.',
  };
}

function finishRun() {
  const verdict = finalVerdict();
  finalOutcomeEl.classList.remove('hidden');
  finalOutcomeEl.innerHTML = `
    <p class="eyebrow">Final Outcome</p>
    <h3>${verdict.title}</h3>
    <p>${verdict.body}</p>
  `;
  choiceListEl.innerHTML = '<p>The release has crossed the cutline. Restart to try a different leadership posture.</p>';
  resultCardEl.classList.add('hidden');
  nextBtn.disabled = true;
}

function advanceRound() {
  if (state.selectedChoice === null) return;

  const round = currentRound();
  const choice = round.choices[state.selectedChoice];
  Object.entries(choice.effects).forEach(([key, delta]) => {
    state[key] = clamp(state[key] + delta);
  });

  state.log.push({ choice: choice.title, result: choice.result });
  renderTimeline();
  state.selectedChoice = null;
  resultCardEl.classList.add('hidden');
  nextBtn.disabled = true;
  state.round += 1;

  if (state.round >= rounds.length) {
    finishRun();
    applyMetrics();
    return;
  }

  renderRound();
}

function restart() {
  state = { ...initialState, log: [] };
  finalOutcomeEl.classList.add('hidden');
  finalOutcomeEl.innerHTML = '';
  resultCardEl.classList.add('hidden');
  resultCardEl.innerHTML = '';
  nextBtn.disabled = true;
  renderTimeline();
  renderRound();
}

nextBtn.addEventListener('click', advanceRound);
restartBtn.addEventListener('click', restart);

restart();
