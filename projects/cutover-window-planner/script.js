const scenarioTitle = document.getElementById('scenario-title');
const scenarioBadge = document.getElementById('scenario-badge');
const scenarioSummary = document.getElementById('scenario-summary');
const scenarioPressure = document.getElementById('scenario-pressure');
const scenarioSuccess = document.getElementById('scenario-success');
const scenarioNote = document.getElementById('scenario-note');
const prepSummary = document.getElementById('prep-summary');
const prepGrid = document.getElementById('prep-grid');
const taskList = document.getElementById('task-list');
const sequenceSummary = document.getElementById('sequence-summary');
const dependencyBoard = document.getElementById('dependency-board');
const rollbackBoard = document.getElementById('rollback-board');
const windowBoard = document.getElementById('window-board');
const timeLeftEl = document.getElementById('time-left');
const readinessScoreEl = document.getElementById('readiness-score');
const rollbackScoreEl = document.getElementById('rollback-score');
const trustScoreEl = document.getElementById('trust-score');
const resultSummary = document.getElementById('result-summary');
const actionLog = document.getElementById('action-log');
const nextScenarioButton = document.getElementById('next-scenario');
const resetScenarioButton = document.getElementById('reset-scenario');
const copyPlanBriefButton = document.getElementById('copy-plan-brief');
const simulatePlanButton = document.getElementById('simulate-plan');

const scenarios = [
  {
    title: 'Campus Identity Provider Cutover',
    lane: 'Student login infrastructure',
    summary: 'Move campus authentication traffic onto a new identity stack during one maintenance window without stranding students, advisors, or helpdesk.',
    pressure: 'Morning registration opens in a few hours, and the helpdesk still remembers the last login outage.',
    success: 'Students can log in on first attempt, rollback stays realistic, and operators can explain what changed if something degrades.',
    note: 'The cutover fails if traffic moves before synthetic checks and staff comms cover the ugly edge cases.',
    hours: 8,
    prepBudget: 2,
    prepOptions: [
      { id: 'synthetic', label: 'Synthetic login rehearsal', effect: 'Reduces blind spots around SSO and role mapping.', readiness: 8, rollback: 1, trust: 0, timeCost: 1 },
      { id: 'comms', label: 'Support desk briefing', effect: 'Pre-aligns support and keeps trust intact if the first hour is noisy.', readiness: 1, rollback: 0, trust: 8, timeCost: 1 },
      { id: 'rollback', label: 'Rollback drill', effect: 'Makes reversal real instead of symbolic if auth starts to wobble.', readiness: 2, rollback: 10, trust: 1, timeCost: 1 },
      { id: 'canary', label: 'Faculty canary cohort', effect: 'Lets you move one smaller population before the campus-wide switch.', readiness: 6, rollback: 2, trust: 3, timeCost: 1 },
    ],
    tasks: [
      { id: 'replica', label: 'Warm session replication', duration: 1, coverage: 16, risk: 5, rollback: 4, needsPrep: [], mustPrecede: ['traffic'], watch: 'If this slips, rollback will look much cleaner on paper than in production.' },
      { id: 'sync', label: 'Run role-mapping diff', duration: 2, coverage: 20, risk: 6, rollback: 1, needsPrep: ['synthetic'], mustPrecede: ['traffic'], watch: 'Role drift is the kind of bug support will hear before telemetry does.' },
      { id: 'traffic', label: 'Shift live login traffic', duration: 2, coverage: 36, risk: 14, rollback: -2, needsPrep: ['canary'], mustFollow: ['replica', 'sync'], watch: 'Traffic movement is the headline move. Everything before it either bought confidence or only looked busy.' },
      { id: 'retire', label: 'Freeze legacy admin writes', duration: 1, coverage: 12, risk: 4, rollback: 5, needsPrep: ['rollback'], mustFollow: ['traffic'], watch: 'Retiring the legacy path too early converts a reversible launch into a hostage situation.' },
    ],
  },
  {
    title: 'Payments Gateway Vendor Swap',
    lane: 'Commerce infrastructure',
    summary: 'Swap payment routing to a new gateway during a low-traffic window while refunds, fraud review, and receipts all still need to work the next morning.',
    pressure: 'Finance wants fee relief now, but every failed charge writes itself into customer memory.',
    success: 'Charges authorize cleanly, refunds stay possible, and the support queue does not discover the edge case first.',
    note: 'This window goes sideways when teams optimize the cutover headline and forget post-cutover reversibility.',
    hours: 7,
    prepBudget: 2,
    prepOptions: [
      { id: 'synthetic', label: 'Replay synthetic charge set', effect: 'Surfaces tax, receipt, and fraud mismatches before customers do.', readiness: 9, rollback: 1, trust: 1, timeCost: 1 },
      { id: 'comms', label: 'Merchant support script', effect: 'Gives agents a real answer if receipts or refunds go sideways.', readiness: 1, rollback: 0, trust: 7, timeCost: 1 },
      { id: 'rollback', label: 'Refund reversal path', effect: 'Keeps rollback credible once settlement and refunds start crossing systems.', readiness: 2, rollback: 9, trust: 1, timeCost: 1 },
      { id: 'audit', label: 'Ledger reconciliation audit', effect: 'Lowers the chance of silent accounting drift after the visible cutover.', readiness: 7, rollback: 3, trust: 1, timeCost: 1 },
    ],
    tasks: [
      { id: 'webhooks', label: 'Validate settlement webhooks', duration: 1, coverage: 15, risk: 4, rollback: 3, needsPrep: ['audit'], mustPrecede: ['traffic'], watch: 'If webhooks trail behind the cutover, finance sees breakage later than support does.' },
      { id: 'refunds', label: 'Verify refund and void flows', duration: 2, coverage: 20, risk: 6, rollback: 4, needsPrep: ['rollback'], mustPrecede: ['traffic'], watch: 'Refunds are the true test of whether reversal is operational or imaginary.' },
      { id: 'traffic', label: 'Move charge authorization traffic', duration: 2, coverage: 38, risk: 15, rollback: -1, needsPrep: ['synthetic'], mustFollow: ['webhooks', 'refunds'], watch: 'Traffic movement buys nothing if reconciliation and refund paths are still guessed.' },
      { id: 'receipts', label: 'Switch receipt and receipt-failure messaging', duration: 1, coverage: 11, risk: 5, rollback: 2, needsPrep: ['comms'], mustFollow: ['traffic'], watch: 'Customer trust burns fast when money leaves before the receipt explains itself.' },
    ],
  },
  {
    title: 'Telemetry Pipeline Migration',
    lane: 'Observability platform',
    summary: 'Move a fragmented service graph onto a new telemetry pipeline without leaving the incident team blind during the next real outage.',
    pressure: 'Platform wants cost savings, but on-call wants proof the new stack still catches the weird failures.',
    success: 'Golden signals still fire, dashboards stay legible, and rollback does not depend on operators remembering undocumented collector flags.',
    note: 'The migration is dangerous when the team treats observability like a background service instead of the thing that proves the rest of the stack is healthy.',
    hours: 6,
    prepBudget: 2,
    prepOptions: [
      { id: 'synthetic', label: 'Golden-signal replay', effect: 'Confirms the new pipeline still catches the signatures you actually debug from.', readiness: 8, rollback: 0, trust: 1, timeCost: 1 },
      { id: 'comms', label: 'On-call handoff brief', effect: 'Keeps the next responder from learning the migration under live fire.', readiness: 1, rollback: 0, trust: 6, timeCost: 1 },
      { id: 'rollback', label: 'Collector fallback scripts', effect: 'Turns rollback into one motion instead of a scavenger hunt.', readiness: 2, rollback: 10, trust: 0, timeCost: 1 },
      { id: 'audit', label: 'Dashboard dependency inventory', effect: 'Reduces the chance that a hidden board quietly goes dark after cutover.', readiness: 6, rollback: 2, trust: 1, timeCost: 1 },
    ],
    tasks: [
      { id: 'inventory', label: 'Map critical dashboard dependencies', duration: 1, coverage: 14, risk: 4, rollback: 2, needsPrep: ['audit'], mustPrecede: ['traffic'], watch: 'Unmapped dashboards are how teams discover missing telemetry in front of executives.' },
      { id: 'alerts', label: 'Validate alert fanout and paging', duration: 1, coverage: 18, risk: 5, rollback: 2, needsPrep: ['comms'], mustPrecede: ['traffic'], watch: 'A pipeline that records data but misses pages still fails the operator.' },
      { id: 'traffic', label: 'Switch collectors and traces', duration: 2, coverage: 37, risk: 13, rollback: -2, needsPrep: ['synthetic'], mustFollow: ['inventory', 'alerts'], watch: 'Collector cutover before replay validation turns every quiet chart into false confidence.' },
      { id: 'legacy', label: 'Drain legacy retention jobs', duration: 1, coverage: 13, risk: 4, rollback: 5, needsPrep: ['rollback'], mustFollow: ['traffic'], watch: 'Retaining the legacy jobs too long burns cost; killing them too early burns proof.' },
    ],
  },
];

const state = {
  scenarioIndex: 0,
  selectedPreps: new Set(),
  tasks: [],
};

function cloneTasks(tasks) {
  return tasks.map((task) => ({ ...task }));
}

function currentScenario() {
  return scenarios[state.scenarioIndex];
}

function loadScenario(index) {
  state.scenarioIndex = index;
  state.selectedPreps = new Set();
  state.tasks = cloneTasks(currentScenario().tasks);
  render();
}

function moveTask(index, delta) {
  const nextIndex = index + delta;
  if (nextIndex < 0 || nextIndex >= state.tasks.length) return;
  const reordered = [...state.tasks];
  const [task] = reordered.splice(index, 1);
  reordered.splice(nextIndex, 0, task);
  state.tasks = reordered;
  render();
}

function togglePrep(prepId) {
  const selected = new Set(state.selectedPreps);
  if (selected.has(prepId)) {
    selected.delete(prepId);
  } else {
    if (selected.size >= currentScenario().prepBudget) return;
    selected.add(prepId);
  }
  state.selectedPreps = selected;
  render();
}

function buildPreview() {
  const scenario = currentScenario();
  const prepIds = state.selectedPreps;
  const selectedPreps = scenario.prepOptions.filter((prep) => prepIds.has(prep.id));
  const completed = [];
  const log = [];
  const issues = [];
  let timeLeft = scenario.hours;
  let readiness = 42;
  let rollback = 36;
  let trust = 56;
  let exposure = 18;
  let coverage = 0;

  selectedPreps.forEach((prep) => {
    timeLeft -= prep.timeCost;
    readiness += prep.readiness;
    rollback += prep.rollback;
    trust += prep.trust;
    log.push(`Prep: ${prep.label} (${prep.effect})`);
  });

  state.tasks.forEach((task, index) => {
    timeLeft -= task.duration;
    readiness += 4;
    rollback += task.rollback;
    coverage += task.coverage;
    exposure += task.risk;
    trust += 1;

    const missingPreps = (task.needsPrep || []).filter((prepId) => !prepIds.has(prepId));
    if (missingPreps.length) {
      const penalty = missingPreps.length * 5;
      exposure += penalty;
      trust -= missingPreps.length * 3;
      issues.push(`${task.label} is running without ${missingPreps.join(', ')}.`);
      log.push(`Task ${index + 1}: ${task.label} landed without the intended guardrail.`);
    } else {
      exposure -= 4;
      log.push(`Task ${index + 1}: ${task.label} is supported by the intended prep.`);
    }

    const requiredEarlier = (task.mustFollow || []).filter((requiredId) => !completed.includes(requiredId));
    if (requiredEarlier.length) {
      exposure += 8;
      rollback -= 4;
      trust -= 5;
      issues.push(`${task.label} is sequenced before ${requiredEarlier.join(', ')} is actually safe.`);
      log.push(`Ordering fault: ${task.label} is moving before its safe predecessor.`);
    }

    const futureConstraint = (task.mustPrecede || []).filter((laterId) => {
      const laterIndex = state.tasks.findIndex((item) => item.id === laterId);
      return laterIndex !== -1 && laterIndex < index;
    });
    if (futureConstraint.length) {
      exposure += 6;
      readiness -= 2;
      issues.push(`${task.label} is late relative to ${futureConstraint.join(', ')}.`);
      log.push(`Sequence drag: ${task.label} arrived after the task it was supposed to protect.`);
    }

    if (task.id === 'traffic' && index === 0) {
      exposure += 10;
      trust -= 6;
      issues.push('Live traffic is moving before the safer proving steps.');
      log.push('Traffic was scheduled first, which converts the whole window into live discovery.');
    }

    completed.push(task.id);
  });

  if (timeLeft < 0) {
    exposure += Math.abs(timeLeft) * 4;
    trust -= Math.abs(timeLeft) * 2;
    issues.push(`The plan overruns the window by ${Math.abs(timeLeft)} hour${Math.abs(timeLeft) === 1 ? '' : 's'}.`);
    log.push('Window overrun: the team is still cutting when stakeholder patience is already gone.');
  }

  const status =
    timeLeft >= 0 && exposure <= 34 && rollback >= 50
      ? 'Controlled cutover'
      : timeLeft >= 0 && exposure <= 48
        ? 'Manageable but exposed'
        : 'Fragile cutover';

  const recommendation =
    status === 'Controlled cutover'
      ? 'This window looks believable. Keep the plan tight and do not add scope.'
      : status === 'Manageable but exposed'
        ? 'One ordering or guardrail mistake is still too visible. Tighten the handoff around the noisiest task.'
        : 'The plan is asking the window to discover what prep work should already know.';

  return {
    timeLeft,
    readiness: Math.max(0, readiness),
    rollback: Math.max(0, rollback),
    trust: Math.max(0, trust),
    exposure: Math.max(0, exposure),
    coverage,
    issues,
    log,
    status,
    recommendation,
  };
}

function renderScenario() {
  const scenario = currentScenario();
  scenarioTitle.textContent = scenario.title;
  scenarioBadge.textContent = scenario.lane;
  scenarioSummary.textContent = scenario.summary;
  scenarioPressure.textContent = scenario.pressure;
  scenarioSuccess.textContent = scenario.success;
  scenarioNote.textContent = scenario.note;
}

function renderPrepCards() {
  const scenario = currentScenario();
  prepSummary.textContent = `${state.selectedPreps.size} of ${scenario.prepBudget} prep moves selected`;
  prepGrid.innerHTML = scenario.prepOptions
    .map((prep) => {
      const selected = state.selectedPreps.has(prep.id);
      return `
        <article class="prep-card ${selected ? 'is-selected' : ''}">
          <div>
            <p class="eyebrow">Guardrail</p>
            <h3>${prep.label}</h3>
            <p>${prep.effect}</p>
          </div>
          <div class="prep-points">
            <span>Readiness +${prep.readiness}</span>
            <span>Rollback +${prep.rollback}</span>
            <span>Trust +${prep.trust}</span>
            <span>${prep.timeCost}h prep</span>
          </div>
          <button type="button" data-prep-id="${prep.id}" class="ghost">${selected ? 'Selected' : 'Select prep'}</button>
        </article>
      `;
    })
    .join('');

  prepGrid.querySelectorAll('[data-prep-id]').forEach((button) => {
    button.addEventListener('click', () => togglePrep(button.dataset.prepId || ''));
  });
}

function renderTasks(preview) {
  sequenceSummary.textContent =
    preview.timeLeft >= 0
      ? `${preview.timeLeft} hour${preview.timeLeft === 1 ? '' : 's'} remain after current prep and sequence.`
      : `Current plan overruns by ${Math.abs(preview.timeLeft)} hour${Math.abs(preview.timeLeft) === 1 ? '' : 's'}.`;

  taskList.innerHTML = state.tasks
    .map((task, index) => `
      <article class="task-card">
        <div class="task-order">
          <span class="task-rank">Step ${index + 1}</span>
          <div>
            <h3>${task.label}</h3>
            <p>${task.watch}</p>
          </div>
          <div class="task-meta">
            <span>${task.duration}h</span>
            <span>Coverage +${task.coverage}</span>
            <span>Base risk +${task.risk}</span>
            <span>Rollback ${task.rollback >= 0 ? '+' : ''}${task.rollback}</span>
          </div>
        </div>
        <div class="move-controls">
          <button type="button" class="move-btn" data-move-index="${index}" data-direction="-1" ${index === 0 ? 'disabled' : ''}>Move Earlier</button>
          <button type="button" class="move-btn" data-move-index="${index}" data-direction="1" ${index === state.tasks.length - 1 ? 'disabled' : ''}>Move Later</button>
        </div>
      </article>
    `)
    .join('');

  taskList.querySelectorAll('[data-move-index]').forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.moveIndex);
      const direction = Number(button.dataset.direction);
      moveTask(index, direction);
    });
  });
}

function renderBoards(preview) {
  timeLeftEl.textContent = String(preview.timeLeft);
  readinessScoreEl.textContent = String(preview.readiness);
  rollbackScoreEl.textContent = String(preview.rollback);
  trustScoreEl.textContent = String(preview.trust);

  dependencyBoard.textContent = preview.issues[0]
    ? `${preview.issues[0]} Highest current exposure score: ${preview.exposure}.`
    : 'Dependencies are lined up cleanly right now. The plan is not asking traffic to discover hidden prerequisites.';

  rollbackBoard.textContent =
    preview.rollback >= 56
      ? `Rollback posture is believable at ${preview.rollback}. This plan can reverse without turning the window into improvisation.`
      : `Rollback posture is only ${preview.rollback}. One noisy step could trap the team in forward-only recovery.`;

  windowBoard.textContent =
    preview.timeLeft >= 2
      ? `Time posture is stable with ${preview.timeLeft} hours left. The window still has room for the first surprise.`
      : preview.timeLeft >= 0
        ? `Time posture is thin with only ${preview.timeLeft} hours left. A single messy handoff will eat the buffer.`
        : `The window is already overspent by ${Math.abs(preview.timeLeft)} hours. This plan turns maintenance into public discovery.`;
}

function renderResult(preview, simulated = false) {
  if (!simulated) {
    resultSummary.innerHTML = `
      <h3>No simulation run yet</h3>
      <p>Preview status: ${preview.status}. ${preview.recommendation}</p>
    `;
    actionLog.innerHTML = '';
    return;
  }

  const statusClass = preview.status === 'Controlled cutover' ? 'status-healthy' : 'status-risky';
  resultSummary.innerHTML = `
    <h3 class="${statusClass}">${preview.status}</h3>
    <p>${preview.recommendation}</p>
    <p class="meta-line">Coverage ${preview.coverage} | Exposure ${preview.exposure} | Time left ${preview.timeLeft}</p>
  `;

  actionLog.innerHTML = preview.log
    .map((line, index) => `
      <article class="log-card">
        <h3>Checkpoint ${index + 1}</h3>
        <p>${line}</p>
      </article>
    `)
    .join('');
}

function buildPlanBrief(preview) {
  const scenario = currentScenario();
  const prepLabels = scenario.prepOptions
    .filter((prep) => state.selectedPreps.has(prep.id))
    .map((prep) => prep.label);

  return [
    'Cutover Window Brief',
    '',
    `Scenario: ${scenario.title}`,
    `Lane: ${scenario.lane}`,
    `Status: ${preview.status}`,
    `Hours left: ${preview.timeLeft}`,
    `Readiness: ${preview.readiness}`,
    `Rollback: ${preview.rollback}`,
    `Trust: ${preview.trust}`,
    `Exposure: ${preview.exposure}`,
    '',
    `Selected prep: ${prepLabels.length ? prepLabels.join(', ') : 'None'}`,
    'Task order:',
    ...state.tasks.map((task, index) => `${index + 1}. ${task.label}`),
    '',
    `Recommendation: ${preview.recommendation}`,
  ].join('\n');
}

async function copyPlanBrief() {
  const preview = buildPreview();
  try {
    await navigator.clipboard.writeText(buildPlanBrief(preview));
    sequenceSummary.textContent = 'Copied the current cutover brief.';
  } catch (error) {
    sequenceSummary.textContent = 'Clipboard copy failed for the current cutover brief.';
  }
}

function render(simulated = false) {
  renderScenario();
  renderPrepCards();
  const preview = buildPreview();
  renderTasks(preview);
  renderBoards(preview);
  renderResult(preview, simulated);
}

nextScenarioButton.addEventListener('click', () => {
  const nextIndex = (state.scenarioIndex + 1) % scenarios.length;
  loadScenario(nextIndex);
});

resetScenarioButton.addEventListener('click', () => loadScenario(state.scenarioIndex));
copyPlanBriefButton.addEventListener('click', copyPlanBrief);
simulatePlanButton.addEventListener('click', () => render(true));

loadScenario(0);
