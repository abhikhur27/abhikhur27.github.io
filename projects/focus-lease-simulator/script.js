const focusScoreEl = document.getElementById('focus-score');
const energyScoreEl = document.getElementById('energy-score');
const debtScoreEl = document.getElementById('debt-score');
const deepWorkScoreEl = document.getElementById('deep-work-score');
const blockLabelEl = document.getElementById('block-label');
const eventTitleEl = document.getElementById('event-title');
const eventCopyEl = document.getElementById('event-copy');
const eventUrgencyEl = document.getElementById('event-urgency');
const eventCostEl = document.getElementById('event-cost');
const summaryTextEl = document.getElementById('summary-text');
const milestoneListEl = document.getElementById('milestone-list');
const logEl = document.getElementById('log');
const briefStatusEl = document.getElementById('brief-status');
const acceptBtn = document.getElementById('accept-btn');
const deferBtn = document.getElementById('defer-btn');
const protectBtn = document.getElementById('protect-btn');
const restartBtn = document.getElementById('restart-btn');
const copyBriefBtn = document.getElementById('copy-brief-btn');

const events = [
  { title: 'Slack ping during warm-up', copy: 'A teammate wants a quick answer before they move on. It lands exactly when you were starting to settle in.', urgency: 18, residue: 8 },
  { title: 'Friend asks for a fast code review', copy: 'The diff is probably small, but it will pull your brain into someone else’s problem space.', urgency: 22, residue: 12 },
  { title: 'Club logistics message', copy: 'You can ignore it for now, but tomorrow gets worse if nobody picks it up.', urgency: 16, residue: 7 },
  { title: 'Professor follow-up window', copy: 'The reply is time-sensitive and useful, but it breaks the most valuable part of your current block.', urgency: 26, residue: 14 },
  { title: 'Build error curiosity spiral', copy: 'You found something interesting that is not today’s main objective. It is tempting and dangerous.', urgency: 14, residue: 10 },
  { title: 'Home interruption', copy: 'A practical task appears with no warning. It is real, not optional, and still expensive.', urgency: 24, residue: 13 },
  { title: 'Inbox backlog guilt', copy: 'Nothing is burning, but you can feel the unread pile bending your attention away from deep work.', urgency: 20, residue: 9 },
  { title: 'Last-block fatigue wobble', copy: 'The day is almost over. Protecting the final block is hard precisely because the obvious choice is to coast.', urgency: 12, residue: 11 },
];

const initialState = () => ({
  block: 0,
  focus: 58,
  energy: 72,
  debt: 12,
  deepWork: 0,
  streak: 0,
  accepted: 0,
  deferred: 0,
  protected: 0,
  log: ['Day initialized.'],
});

let state = initialState();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function currentEvent() {
  return events[state.block];
}

function deepWorkGain() {
  return Math.max(8, Math.round(state.focus * 0.18) + (state.streak * 4) + Math.round(state.energy * 0.05) - Math.round(state.debt * 0.08));
}

function milestoneRows() {
  const targets = [
    { label: 'Draft outline shipped', threshold: 60 },
    { label: 'Core implementation block protected', threshold: 135 },
    { label: 'Meaningful day captured', threshold: 220 },
  ];

  return targets.map((target) => {
    const cleared = state.deepWork >= target.threshold;
    return `<li>${cleared ? 'Cleared' : 'Open'}: ${target.label} (${target.threshold} deep-work points)</li>`;
  }).join('');
}

function renderLog() {
  logEl.innerHTML = state.log.slice(0, 8).map((entry) => `<p>${entry}</p>`).join('');
}

function render() {
  focusScoreEl.textContent = String(state.focus);
  energyScoreEl.textContent = String(state.energy);
  debtScoreEl.textContent = String(state.debt);
  deepWorkScoreEl.textContent = String(state.deepWork);
  milestoneListEl.innerHTML = milestoneRows();
  renderLog();

  if (state.block >= events.length) {
    blockLabelEl.textContent = 'Day Complete';
    eventTitleEl.textContent = 'No more interruptions are arriving.';
    eventCopyEl.textContent = 'Read the summary, copy the brief, or restart with a different interruption strategy.';
    eventUrgencyEl.textContent = `Accepted: ${state.accepted}`;
    eventCostEl.textContent = `Protected: ${state.protected}`;
    acceptBtn.disabled = true;
    deferBtn.disabled = true;
    protectBtn.disabled = true;
    summaryTextEl.textContent = state.deepWork >= 220
      ? 'You protected enough high-quality time to turn the day into real output without letting debt explode.'
      : state.debt >= 70
        ? 'The day never fully collapsed, but deferred pressure now owns tomorrow.'
        : 'You kept the day afloat, but the best blocks leaked into interruption management.';
    briefStatusEl.textContent = 'Run complete. The day brief is ready to copy.';
    return;
  }

  const event = currentEvent();
  blockLabelEl.textContent = `Block ${state.block + 1} / ${events.length}`;
  eventTitleEl.textContent = event.title;
  eventCopyEl.textContent = event.copy;
  eventUrgencyEl.textContent = `Urgency: ${event.urgency}`;
  eventCostEl.textContent = `Residue hit: ${event.residue}`;
  acceptBtn.disabled = false;
  deferBtn.disabled = false;
  protectBtn.disabled = false;
  summaryTextEl.textContent = `Current streak: ${state.streak} protected block${state.streak === 1 ? '' : 's'}. Deep work grows fastest when you protect consecutive blocks.`;
  briefStatusEl.textContent = 'Finish the run to generate a reusable summary.';
}

function advanceDay(decision) {
  const event = currentEvent();
  if (!event) return;

  if (decision === 'accept') {
    state.accepted += 1;
    state.focus = clamp(state.focus - event.residue - 6, 0, 100);
    state.energy = clamp(state.energy - 8, 0, 100);
    state.debt = clamp(state.debt - Math.round(event.urgency * 0.4), 0, 100);
    state.streak = 0;
    state.log.unshift(`Accepted "${event.title}" and paid the context-switch cost immediately.`);
  } else if (decision === 'defer') {
    state.deferred += 1;
    state.focus = clamp(state.focus - Math.round(event.residue * 0.55), 0, 100);
    state.energy = clamp(state.energy - 4, 0, 100);
    state.debt = clamp(state.debt + Math.round(event.urgency * 0.65), 0, 100);
    state.streak = Math.max(0, state.streak - 1);
    state.log.unshift(`Deferred "${event.title}" and pushed urgency forward into later blocks.`);
  } else {
    state.protected += 1;
    state.focus = clamp(state.focus + 8 - Math.round(event.urgency * 0.1), 0, 100);
    state.energy = clamp(state.energy + 3, 0, 100);
    state.debt = clamp(state.debt + Math.round(event.urgency * 0.8), 0, 100);
    state.streak += 1;
    state.log.unshift(`Protected focus against "${event.title}" and extended the uninterrupted streak.`);
  }

  const gain = deepWorkGain();
  state.deepWork += gain;

  if (state.debt >= 70) {
    state.focus = clamp(state.focus - 6, 0, 100);
    state.energy = clamp(state.energy - 3, 0, 100);
    state.log.unshift('Debt overload triggered extra attention leak in the next block.');
  }

  state.block += 1;
  render();
}

function buildBrief() {
  return [
    'Focus Lease Simulator Brief',
    '',
    `Deep work shipped: ${state.deepWork}`,
    `Blocks protected: ${state.protected}`,
    `Interruptions accepted immediately: ${state.accepted}`,
    `Interruptions deferred: ${state.deferred}`,
    `Ending debt: ${state.debt}`,
    `Ending focus: ${state.focus}`,
    `Readout: ${summaryTextEl.textContent}`,
  ].join('\n');
}

acceptBtn.addEventListener('click', () => advanceDay('accept'));
deferBtn.addEventListener('click', () => advanceDay('defer'));
protectBtn.addEventListener('click', () => advanceDay('protect'));
restartBtn.addEventListener('click', () => {
  state = initialState();
  render();
});
copyBriefBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(buildBrief());
    briefStatusEl.textContent = 'Copied the day brief to the clipboard.';
  } catch (error) {
    briefStatusEl.textContent = 'Clipboard copy failed in this environment.';
  }
});

render();
