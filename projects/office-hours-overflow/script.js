const metricEls = {
  learning: document.getElementById('metric-learning'),
  fairness: document.getElementById('metric-fairness'),
  stamina: document.getElementById('metric-stamina'),
  queue: document.getElementById('metric-queue'),
};

const roundTitleEl = document.getElementById('round-title');
const roundSceneEl = document.getElementById('round-scene');
const pressureTagsEl = document.getElementById('pressure-tags');
const choiceListEl = document.getElementById('choice-list');
const statusCopyEl = document.getElementById('status-copy');
const eventLogEl = document.getElementById('event-log');
const debriefEl = document.getElementById('debrief');
const debriefTitleEl = document.getElementById('debrief-title');
const debriefSummaryEl = document.getElementById('debrief-summary');
const debriefPointsEl = document.getElementById('debrief-points');
const startRunBtn = document.getElementById('start-run');
const resetRunBtn = document.getElementById('reset-run');

const rounds = [
  {
    title: 'Round 1: The warm-up that was not a warm-up',
    scene:
      'Thirty students arrive in twelve minutes because the autograder just reopened. Half the line wants conceptual help, the other half wants one missing semicolon located right now.',
    tags: ['Queue spike', 'Mixed difficulty', 'Tense room'],
    choices: [
      {
        label: 'Open a fast triage lane for syntax errors and setup blockers.',
        detail: 'You split the room into quick-fix and deep-help paths. It keeps motion high but some students feel categorized too aggressively.',
        impact: { queue: -16, fairness: -6, learning: -4, stamina: -2 },
      },
      {
        label: 'Keep a single line and force every student through the same intake.',
        detail: 'The process feels fair and legible, but the line slows immediately.',
        impact: { fairness: 8, queue: 10, stamina: -4, learning: 3 },
      },
      {
        label: 'Ask the strongest waiting students to help peers with environment issues.',
        detail: 'Peer help opens space quickly, though the answers are uneven.',
        impact: { queue: -10, learning: 5, fairness: -2, stamina: 4 },
      },
    ],
  },
  {
    title: 'Round 2: The recursive bug parade',
    scene:
      'Now the queue is full of the same recursion mistake. You can either repeat the explanation twelve times or pause the room and teach the pattern once.',
    tags: ['High duplication', 'Concept gap', 'Broadcast opportunity'],
    choices: [
      {
        label: 'Pause the room for a three-minute whiteboard explanation.',
        detail: 'You teach the base-case pattern publicly. The line stops moving, but many students actually understand what broke.',
        impact: { learning: 16, queue: 8, fairness: 4, stamina: -3 },
      },
      {
        label: 'Stay one-on-one and optimize for line velocity.',
        detail: 'Students get through faster, but the same misunderstanding keeps returning to the queue.',
        impact: { queue: -12, learning: -8, fairness: 1, stamina: -5 },
      },
      {
        label: 'Write a minimal checklist and pin it at the front table.',
        detail: 'It is less powerful than teaching live, but it absorbs repeat questions with low staff cost.',
        impact: { queue: -6, learning: 8, stamina: 6, fairness: 2 },
      },
    ],
  },
  {
    title: 'Round 3: One student is drowning',
    scene:
      'A visibly panicked student needs deep help on linked-list pointer bugs and will take ten minutes minimum. Behind them is a line of quicker tickets getting restless.',
    tags: ['High-emotion case', 'Visible fairness test', 'Time sink'],
    choices: [
      {
        label: 'Stay with the student until the bug is fully understood.',
        detail: 'It is the strongest teaching move for that student, but everyone behind them sees the queue freeze.',
        impact: { learning: 12, fairness: -12, queue: 12, stamina: -8 },
      },
      {
        label: 'Stabilize them for two minutes, then schedule a return pass.',
        detail: 'You preserve motion without fully abandoning depth, though the student leaves only partially reassured.',
        impact: { fairness: 6, queue: -4, learning: 4, stamina: -2 },
      },
      {
        label: 'Escalate the case to instructor backup immediately.',
        detail: 'You keep the line moving, but students start seeing the staff as fragmented.',
        impact: { queue: -10, stamina: 5, fairness: -4, learning: -2 },
      },
    ],
  },
  {
    title: 'Round 4: Closing pressure',
    scene:
      'The room is about to close, but six unfinished students remain. You can stretch the shift, cut scope hard, or leave a structured exit path.',
    tags: ['Deadline pressure', 'Burnout risk', 'Trust test'],
    choices: [
      {
        label: 'Extend office hours and absorb the overtime.',
        detail: 'Trust spikes because nobody gets abandoned, but the staff pays the price immediately.',
        impact: { fairness: 14, learning: 8, stamina: -18, queue: -10 },
      },
      {
        label: 'Convert the last ten minutes into a rapid unblock-only pass.',
        detail: 'Everyone gets touched, but the learning depth falls off sharply.',
        impact: { queue: -14, fairness: 4, learning: -10, stamina: -4 },
      },
      {
        label: 'End on time and post a structured follow-up triage plan.',
        detail: 'The room stays bounded, and students at least know where the next help path is.',
        impact: { stamina: 10, fairness: -5, learning: 2, queue: 6 },
      },
    ],
  },
];

const baseline = { learning: 70, fairness: 68, stamina: 72, queue: 62 };
let metrics = { ...baseline };
let roundIndex = -1;
let logEntries = [];
let runStarted = false;

function clampMetric(value) {
  return Math.max(0, Math.min(100, value));
}

function renderMetrics() {
  Object.entries(metricEls).forEach(([key, el]) => {
    el.textContent = String(metrics[key]);
  });
}

function renderLog() {
  if (!logEntries.length) {
    eventLogEl.innerHTML = '<li>No decisions logged yet.</li>';
    return;
  }

  eventLogEl.innerHTML = logEntries
    .map((entry) => `<li><strong>${entry.title}:</strong> ${entry.detail}</li>`)
    .join('');
}

function buildStatusCopy() {
  const lines = [];

  if (metrics.queue >= 78) lines.push('Queue pressure is now visible from the doorway. Students are making line decisions based on perceived fairness.');
  else if (metrics.queue <= 38) lines.push('Queue load is under control. You have a little room to choose depth instead of pure speed.');
  else lines.push('The queue is moving, but one bad round can still turn it into a visible bottleneck.');

  if (metrics.learning >= 78) lines.push('Students are leaving with actual conceptual traction, not just patch fixes.');
  else if (metrics.learning <= 42) lines.push('Too many students are leaving with surface-level fixes. The same bugs will likely return.');

  if (metrics.stamina <= 38) lines.push('Staff stamina is dangerously low. One more hero move could backfire into worse triage later.');
  else if (metrics.stamina >= 76) lines.push('The staff still has enough energy to choose a higher-touch intervention if needed.');

  statusCopyEl.innerHTML = lines.map((line) => `<p>${line}</p>`).join('');
}

function renderRound() {
  const round = rounds[roundIndex];
  if (!round) return;

  roundTitleEl.textContent = round.title;
  roundSceneEl.textContent = round.scene;
  pressureTagsEl.innerHTML = round.tags.map((tag) => `<span>${tag}</span>`).join('');

  choiceListEl.innerHTML = round.choices
    .map(
      (choice, index) => `
        <button class="choice-card" type="button" data-choice-index="${index}">
          <strong>${choice.label}</strong>
          <span>${choice.detail}</span>
          <div class="choice-impact">${formatImpact(choice.impact)}</div>
        </button>
      `
    )
    .join('');

  choiceListEl.querySelectorAll('[data-choice-index]').forEach((button) => {
    button.addEventListener('click', () => applyChoice(Number(button.dataset.choiceIndex)));
  });
}

function formatImpact(impact) {
  const labels = {
    learning: 'Comprehension',
    fairness: 'Fairness',
    stamina: 'TA Energy',
    queue: 'Queue Load',
  };

  return Object.entries(impact)
    .map(([key, value]) => {
      const className = value >= 0 ? 'trend-up' : 'trend-down';
      const prefix = value >= 0 ? '+' : '';
      return `<span class="${className}">${labels[key]} ${prefix}${value}</span>`;
    })
    .join(' | ');
}

function applyChoice(choiceIndex) {
  const round = rounds[roundIndex];
  const choice = round?.choices[choiceIndex];
  if (!choice) return;

  Object.entries(choice.impact).forEach(([key, delta]) => {
    metrics[key] = clampMetric(metrics[key] + delta);
  });

  logEntries.unshift({
    title: round.title,
    detail: choice.label,
  });
  logEntries = logEntries.slice(0, 6);

  renderMetrics();
  renderLog();
  buildStatusCopy();

  if (roundIndex === rounds.length - 1) {
    showDebrief();
    choiceListEl.innerHTML = '<p class="scene-copy">Shift complete. Reset to try a different philosophy.</p>';
    pressureTagsEl.innerHTML = '';
    return;
  }

  roundIndex += 1;
  renderRound();
}

function showDebrief() {
  debriefEl.classList.remove('hidden');

  let title = 'You held the room together.';
  let summary = 'The shift ended with enough legitimacy that students would probably come back to this team next week.';

  if (metrics.learning >= 78 && metrics.fairness >= 70) {
    title = 'You ran a teaching-centered queue.';
    summary = 'Students left understanding more than they brought in, and the room still felt meaningfully fair.';
  } else if (metrics.queue <= 35 && metrics.learning <= 48) {
    title = 'You optimized for velocity over learning.';
    summary = 'The line moved, but too many students were merely unblocked instead of taught.';
  } else if (metrics.stamina <= 35) {
    title = 'You saved the room by burning the staff.';
    summary = 'The shift survived, but the operating model is not sustainable for a full semester.';
  } else if (metrics.fairness <= 40) {
    title = 'Students likely saw the queue as arbitrary.';
    summary = 'Even strong interventions felt uneven, which is exactly how office hours lose trust.';
  }

  debriefTitleEl.textContent = title;
  debriefSummaryEl.textContent = summary;
  debriefPointsEl.innerHTML = [
    {
      title: 'What you protected',
      detail:
        metrics.learning >= metrics.queue
          ? 'Teaching depth stayed more intact than raw throughput.'
          : 'The visible line moved faster than the deeper learning outcomes.',
    },
    {
      title: 'Main failure mode',
      detail:
        metrics.stamina < 50
          ? 'Staff energy became the hidden bottleneck.'
          : metrics.fairness < 50
            ? 'Students could not predict how help was being allocated.'
            : 'Queue pressure kept forcing compromises away from ideal teaching.',
    },
    {
      title: 'Next experiment',
      detail:
        metrics.learning < 60
          ? 'Try one public teaching intervention earlier in the shift.'
          : 'Try preserving fairness while still carving out one high-depth rescue path.',
    },
  ]
    .map(
      (point) => `
        <article>
          <strong>${point.title}</strong>
          <p>${point.detail}</p>
        </article>
      `
    )
    .join('');
}

function startRun() {
  if (runStarted) return;
  runStarted = true;
  roundIndex = 0;
  debriefEl.classList.add('hidden');
  renderMetrics();
  renderLog();
  buildStatusCopy();
  renderRound();
}

function resetRun() {
  metrics = { ...baseline };
  roundIndex = -1;
  logEntries = [];
  runStarted = false;
  roundTitleEl.textContent = 'Shift briefing';
  roundSceneEl.textContent = 'Start the shift to draw the first queue event.';
  pressureTagsEl.innerHTML = '';
  choiceListEl.innerHTML = '';
  debriefEl.classList.add('hidden');
  renderMetrics();
  renderLog();
  buildStatusCopy();
}

startRunBtn.addEventListener('click', startRun);
resetRunBtn.addEventListener('click', resetRun);

renderMetrics();
renderLog();
buildStatusCopy();
