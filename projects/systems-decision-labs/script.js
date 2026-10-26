const scenarioListEl = document.getElementById('scenario-list');
const scenarioMetaEl = document.getElementById('scenario-meta');
const roundTitleEl = document.getElementById('round-title');
const roundSceneEl = document.getElementById('round-scene');
const pressureTagsEl = document.getElementById('pressure-tags');
const choiceListEl = document.getElementById('choice-list');
const statusCopyEl = document.getElementById('status-copy');
const eventLogEl = document.getElementById('event-log');
const debriefEl = document.getElementById('debrief');
const debriefTitleEl = document.getElementById('debrief-title');
const debriefSummaryEl = document.getElementById('debrief-summary');
const startRunBtn = document.getElementById('start-run');
const resetRunBtn = document.getElementById('reset-run');

const metricEls = {
  trust: document.getElementById('metric-trust'),
  throughput: document.getElementById('metric-throughput'),
  resilience: document.getElementById('metric-resilience'),
  load: document.getElementById('metric-load'),
};

const baseline = { trust: 68, throughput: 61, resilience: 72, load: 57 };

const scenarios = [
  {
    id: 'incident',
    title: 'Incident Command Lab',
    tag: 'Network outage',
    summary: 'Handle a university network outage with limited staff and an unclear cause.',
    differentiator: 'Decide when to send updates and which repair to attempt first.',
    rounds: [
      {
        title: 'Wireless core is unstable',
        scene: 'Students report outages in several buildings. The network team is still checking whether the problem is crowded local equipment or a failed central controller.',
        tags: ['Incomplete monitoring data', 'Leaders want updates', 'Rumors spreading'],
        choices: [
          { label: 'Send a campus-wide caution notice immediately.', impact: { trust: 8, throughput: -4, resilience: 2, load: 5 } },
          { label: 'Wait to send an update until the cause is clearer.', impact: { trust: -10, throughput: 5, resilience: 4, load: -2 } },
          { label: 'Split the team between diagnosis and faculty-facing updates.', impact: { trust: 4, throughput: 3, resilience: -3, load: 8 } },
        ],
      },
      {
        title: 'One building is failing harder',
        scene: 'Engineering has lost its network connection while nearby halls have slow service. Fixing Engineering first leaves the other buildings waiting.',
        tags: ['Uneven impact', 'Fairness tradeoff', 'Visible hotspot'],
        choices: [
          { label: 'Concentrate crews on the worst building.', impact: { trust: 2, throughput: 7, resilience: -2, load: 4 } },
          { label: 'Spread crews to restore partial service everywhere.', impact: { trust: 6, throughput: -6, resilience: 5, load: 3 } },
          { label: 'Escalate vendor support and freeze local changes.', impact: { trust: -3, throughput: -2, resilience: 8, load: -4 } },
        ],
      },
      {
        title: 'The fix window opens',
        scene: 'You can push a risky rollback now, or hold for a narrower but cleaner maintenance window while the campus stays partly degraded.',
        tags: ['Rollback risk', 'Change control', 'Time pressure'],
        choices: [
          { label: 'Push the rollback now.', impact: { trust: 5, throughput: 8, resilience: -7, load: 6 } },
          { label: 'Wait for the cleaner window.', impact: { trust: -4, throughput: -3, resilience: 10, load: -3 } },
          { label: 'Stage the rollback in one segment first.', impact: { trust: 3, throughput: 2, resilience: 5, load: 2 } },
        ],
      },
    ],
  },
  {
    id: 'transit',
    title: 'Detour Dispatch',
    tag: 'Transit operations',
    summary: 'Re-route a shuttle network through closures, surges, and accessibility constraints.',
    differentiator: 'Choose which stops to cover when a detour slows the route.',
    rounds: [
      {
        title: 'A closure wipes out your clean loop',
        scene: 'A road closure breaks the fastest loop right before a crowd surge from an event venue.',
        tags: ['Route break', 'Event spillover', 'Coverage risk'],
        choices: [
          { label: 'Protect accessibility stops even if headways get worse.', impact: { trust: 7, throughput: -7, resilience: 5, load: 4 } },
          { label: 'Shorten the route and temporarily skip outlying stops.', impact: { trust: -9, throughput: 9, resilience: -2, load: 1 } },
          { label: 'Run a split pattern with extra dispatcher coordination.', impact: { trust: 4, throughput: 4, resilience: 2, load: 7 } },
        ],
      },
      {
        title: 'Drivers are losing the board',
        scene: 'The detour changes keep confusing drivers and riders. More changes could reduce the queues but create more mistakes.',
        tags: ['Operator fatigue', 'Confusing routing', 'Communication gap'],
        choices: [
          { label: 'Freeze the map and publish one simple rider pattern.', impact: { trust: 5, throughput: -3, resilience: 6, load: -2 } },
          { label: 'Keep optimizing in real time for every queue spike.', impact: { trust: -5, throughput: 7, resilience: -6, load: 8 } },
          { label: 'Assign one dispatcher only to operator support.', impact: { trust: 3, throughput: -2, resilience: 4, load: 4 } },
        ],
      },
      {
        title: 'Event release hits all at once',
        scene: 'The event ends earlier than expected and a giant outbound wave forms faster than your staging plan assumed.',
        tags: ['Sudden crowd', 'Fairness in the queue', 'Missed riders'],
        choices: [
          { label: 'Hold buses for full loads before departure.', impact: { trust: -4, throughput: 8, resilience: 1, load: 2 } },
          { label: 'Dispatch partially filled trips to calm visible queues.', impact: { trust: 7, throughput: -5, resilience: 3, load: 4 } },
          { label: 'Create a priority boarding lane for long-distance riders.', impact: { trust: 1, throughput: 3, resilience: 4, load: 5 } },
        ],
      },
    ],
  },
  {
    id: 'grid',
    title: 'Campus Grid Blackout',
    tag: 'Energy resilience',
    summary: 'Operate a campus microgrid through a cascading blackout with batteries and critical-building priorities.',
    differentiator: 'Choose which buildings keep power and how much battery to save.',
    rounds: [
      {
        title: 'Main feeder is out',
        scene: 'A feeder trip knocks out multiple academic buildings and battery reserves are lower than the dashboard forecast implied.',
        tags: ['Reserve uncertainty', 'Critical load triage', 'Silent degradation'],
        choices: [
          { label: 'Protect lab and health-critical loads first.', impact: { trust: 4, throughput: -6, resilience: 8, load: 3 } },
          { label: 'Spread power thinly to keep more buildings partially alive.', impact: { trust: 6, throughput: 3, resilience: -5, load: 5 } },
          { label: 'Shed nonessential buildings aggressively.', impact: { trust: -7, throughput: -2, resilience: 10, load: -2 } },
        ],
      },
      {
        title: 'Battery decay is faster than planned',
        scene: 'The batteries are draining faster than expected. There may only be enough power left for one more major action.',
        tags: ['Battery burn', 'One-shot decision', 'Confidence collapse'],
        choices: [
          { label: 'Save battery power to keep essential systems running longer.', impact: { trust: -3, throughput: -4, resilience: 9, load: -1 } },
          { label: 'Spend reserves to recover the highest-traffic zone now.', impact: { trust: 7, throughput: 6, resilience: -8, load: 5 } },
          { label: 'Announce rolling restoration blocks.', impact: { trust: 5, throughput: 1, resilience: 4, load: 2 } },
        ],
      },
      {
        title: 'A second fault appears',
        scene: 'A second fault appears while crews are still working on the first. You can investigate it, continue the first repair, or split the crew.',
        tags: ['Cascading fault', 'Crew stretch', 'Public patience'],
        choices: [
          { label: 'Finish the first restoration path before pivoting.', impact: { trust: 2, throughput: 5, resilience: -3, load: 4 } },
          { label: 'Pivot immediately and contain the cascade.', impact: { trust: -5, throughput: -2, resilience: 9, load: 3 } },
          { label: 'Split crews and accept slower progress everywhere.', impact: { trust: 3, throughput: -4, resilience: 4, load: 8 } },
        ],
      },
    ],
  },
  {
    id: 'patch',
    title: 'Patch Window Commander',
    tag: 'Patch night',
    summary: 'Decide which software updates to finish during a short maintenance window.',
    differentiator: 'Compare the risk of delaying a security fix with the risk of breaking a working service.',
    rounds: [
      {
        title: 'The first window is already slipping',
        scene: 'Prechecks are slower than expected and the opening maintenance slot is shrinking while vulnerable services remain exposed.',
        tags: ['Unpatched services', 'Time running out', 'Slow checks'],
        choices: [
          { label: 'Cut scope and patch only the highest-risk systems.', impact: { trust: 1, throughput: 4, resilience: 6, load: -1 } },
          { label: 'Press on with the full original scope.', impact: { trust: -5, throughput: 7, resilience: -7, load: 8 } },
          { label: 'Delay the window and do another validation pass.', impact: { trust: -2, throughput: -4, resilience: 8, load: 2 } },
        ],
      },
      {
        title: 'Monitoring starts to flicker',
        scene: 'One patched subsystem is behaving strangely, but reverting it would blow the rest of the schedule apart.',
        tags: ['Partial instability', 'Rollback temptation', 'Schedule risk'],
        choices: [
          { label: 'Rollback the subsystem immediately.', impact: { trust: 4, throughput: -7, resilience: 7, load: 4 } },
          { label: 'Keep going and watch for broader impact.', impact: { trust: -6, throughput: 6, resilience: -5, load: 5 } },
          { label: 'Pause the next stage and isolate the issue.', impact: { trust: 2, throughput: -3, resilience: 5, load: 2 } },
        ],
      },
      {
        title: 'Dawn is coming',
        scene: 'You have one final slot before users wake up. You can squeeze in the last change, accept residual exposure, or hand off a partial state.',
        tags: ['Unfinished updates', 'Staff fatigue', 'Morning users affected'],
        choices: [
          { label: 'Ship the last change before sunrise.', impact: { trust: 1, throughput: 5, resilience: -6, load: 7 } },
          { label: 'Stop now and carry residual risk into the day.', impact: { trust: -3, throughput: -1, resilience: 6, load: -3 } },
          { label: 'Hand off a staged partial rollout.', impact: { trust: 3, throughput: 2, resilience: 4, load: 2 } },
        ],
      },
    ],
  },
  {
    id: 'registration',
    title: 'Registration Rush Commander',
    tag: 'Registration launch',
    summary: 'Handle queues and support requests when course registration opens.',
    differentiator: 'Balance a faster queue with equal access for students.',
    rounds: [
      {
        title: 'The launch gate opens unevenly',
        scene: 'Some students are reaching the system early and screenshots are already spreading, triggering fairness complaints before the queue has stabilized.',
        tags: ['Fairness panic', 'Screenshot evidence', 'Burst demand'],
        choices: [
          { label: 'Pause new sessions and equalize the gate.', impact: { trust: 9, throughput: -8, resilience: 4, load: 3 } },
          { label: 'Leave the gate open and keep processing as many requests as possible.', impact: { trust: -10, throughput: 9, resilience: -2, load: 2 } },
          { label: 'Publish a precise fairness explainer while leaving traffic flowing.', impact: { trust: 4, throughput: 2, resilience: 2, load: 5 } },
        ],
      },
      {
        title: 'Advising is flooding your support lane',
        scene: 'Students are mixing policy questions with live registration failures, and support queues are now as important as the application queue.',
        tags: ['Mixed queues', 'Policy confusion', 'Support drag'],
        choices: [
          { label: 'Split support by issue type immediately.', impact: { trust: 5, throughput: 4, resilience: 1, load: 5 } },
          { label: 'Keep one queue so nobody feels deprioritized.', impact: { trust: 3, throughput: -5, resilience: 4, load: 3 } },
          { label: 'Answer policy questions in follow-up messages.', impact: { trust: -4, throughput: 6, resilience: 2, load: -1 } },
        ],
      },
      {
        title: 'Capacity is finally stabilizing',
        scene: 'The system is settling, but a final risky optimization could clear the last visible queue before students lose patience again.',
        tags: ['Stability window', 'Optimization temptation', 'Public patience'],
        choices: [
          { label: 'Take the optimization risk.', impact: { trust: 2, throughput: 7, resilience: -7, load: 4 } },
          { label: 'Hold the stable state and let the queue drain naturally.', impact: { trust: 4, throughput: -2, resilience: 6, load: -2 } },
          { label: 'Throttle new sessions while support catches up.', impact: { trust: 3, throughput: -4, resilience: 5, load: 1 } },
        ],
      },
    ],
  },
  {
    id: 'office-hours',
    title: 'Office Hours Overflow',
    tag: 'Teaching operations',
    summary: 'Handle a long CS office-hours queue with limited teaching assistants.',
    differentiator: 'Choose between helping more students and spending longer on a difficult question.',
    rounds: [
      {
        title: 'The room overloads immediately',
        scene: 'The autograder reopened and a full wall of students arrives at once with a mix of quick syntax fixes and true conceptual failures.',
        tags: ['Queue spike', 'Mixed ticket depth', 'Visible line'],
        choices: [
          { label: 'Open a fast triage lane for obvious blockers.', impact: { trust: -3, throughput: 8, resilience: 3, load: 2 } },
          { label: 'Keep one line so the process feels fair.', impact: { trust: 7, throughput: -6, resilience: 2, load: 4 } },
          { label: 'Use peer helpers for setup-only issues.', impact: { trust: 2, throughput: 4, resilience: 4, load: -3 } },
        ],
      },
      {
        title: 'The same concept is breaking everyone',
        scene: 'A recursion bug pattern keeps repeating and your staff can either teach the room once or keep moving one student at a time.',
        tags: ['Repeat concept gap', 'Teaching opportunity', 'Line pressure'],
        choices: [
          { label: 'Pause for a mini-lecture.', impact: { trust: 4, throughput: -7, resilience: 6, load: 1 } },
          { label: 'Keep serving one-on-one to preserve motion.', impact: { trust: -2, throughput: 6, resilience: -5, load: 5 } },
          { label: 'Write a shared debugging checklist and keep the line moving.', impact: { trust: 3, throughput: 2, resilience: 4, load: -1 } },
        ],
      },
      {
        title: 'One student needs a full rescue',
        scene: 'A panicked student clearly needs ten minutes of deep help while a long visible queue keeps growing behind them.',
        tags: ['High-emotion case', 'Depth tradeoff', 'Fairness optics'],
        choices: [
          { label: 'Stay until they truly understand the bug.', impact: { trust: -5, throughput: -8, resilience: 7, load: 6 } },
          { label: 'Stabilize them and promise a second pass.', impact: { trust: 4, throughput: 1, resilience: 3, load: 2 } },
          { label: 'Escalate to instructor backup now.', impact: { trust: -2, throughput: 4, resilience: 2, load: -2 } },
        ],
      },
    ],
  },
  {
    id: 'dispatch',
    title: 'Midnight Dispatch Desk',
    tag: 'Systems fiction',
    summary: 'Assign a small overnight team to several fictional city service problems.',
    differentiator: 'Decide which requests can wait when several arrive at once.',
    rounds: [
      {
        title: 'The city starts noisy',
        scene: 'Three moderate incidents arrive at once. None are catastrophic alone, but all are competing for the same thin overnight staff.',
        tags: ['Thin staffing', 'Simultaneous incidents', 'Cascade risk'],
        choices: [
          { label: 'Concentrate on the highest-risk incident first.', impact: { trust: 1, throughput: 3, resilience: 6, load: 3 } },
          { label: 'Touch all incidents quickly to calm every queue.', impact: { trust: 5, throughput: -3, resilience: -4, load: 5 } },
          { label: 'Hold one incident in queue while you stabilize the other two.', impact: { trust: -4, throughput: 4, resilience: 4, load: -1 } },
        ],
      },
      {
        title: 'A false signal wastes time',
        scene: 'One report turned out to be exaggerated. Checking it took time away from other requests.',
        tags: ['Incorrect report', 'Time lost', 'Trust falling'],
        choices: [
          { label: 'Check reports more carefully before sending staff.', impact: { trust: 3, throughput: -5, resilience: 5, load: 2 } },
          { label: 'Accept some noise and preserve dispatch speed.', impact: { trust: -3, throughput: 5, resilience: -2, load: 3 } },
          { label: 'Assign a dedicated triage operator.', impact: { trust: 4, throughput: 1, resilience: 3, load: 6 } },
        ],
      },
      {
        title: 'The last hour gets weird',
        scene: 'A new incident arrives near the end of the shift, when the team has little time or energy left.',
        tags: ['Late shock', 'Little room for another problem', 'Fatigue'],
        choices: [
          { label: 'Use the remaining staff time to handle it now.', impact: { trust: 6, throughput: 1, resilience: -6, load: 7 } },
          { label: 'Let lower-priority queues absorb the hit.', impact: { trust: -7, throughput: 4, resilience: 3, load: -1 } },
          { label: 'Switch city services to reduced operations.', impact: { trust: 2, throughput: -2, resilience: 6, load: 2 } },
        ],
      },
    ],
  },
];

let selectedScenarioId = scenarios[0].id;
let activeScenario = scenarios[0];
let currentRoundIndex = -1;
let metrics = { ...baseline };
let logEntries = [];

function clampMetric(value) {
  return Math.max(0, Math.min(100, value));
}

function renderMetrics() {
  Object.entries(metricEls).forEach(([key, el]) => {
    el.textContent = String(metrics[key]);
  });
}

function renderScenarioList() {
  scenarioListEl.innerHTML = scenarios
    .map(
      (scenario) => `
        <button class="scenario-chip ${scenario.id === selectedScenarioId ? 'active' : ''}" type="button" data-scenario="${scenario.id}">
          <strong>${scenario.title}</strong>
          <span>${scenario.tag}</span>
        </button>
      `
    )
    .join('');

  scenarioListEl.querySelectorAll('[data-scenario]').forEach((button) => {
    button.addEventListener('click', () => {
      selectedScenarioId = button.dataset.scenario;
      activeScenario = scenarios.find((scenario) => scenario.id === selectedScenarioId) || scenarios[0];
      resetRun();
      renderScenarioList();
      renderScenarioMeta();
    });
  });
}

function renderScenarioMeta() {
  scenarioMetaEl.innerHTML = `
    <p><strong>${activeScenario.title}</strong></p>
    <p>${activeScenario.summary}</p>
    <p>${activeScenario.differentiator}</p>
    <p>Scenario length: ${activeScenario.rounds.length} rounds</p>
  `;
}

function formatImpact(impact) {
  const labels = {
    trust: 'Trust',
    throughput: 'Work completed',
    resilience: 'Recovery capacity',
    load: 'Team Load',
  };

  return Object.entries(impact)
    .map(([key, value]) => {
      const className = value >= 0 ? 'trend-up' : 'trend-down';
      const prefix = value >= 0 ? '+' : '';
      return `<span class="${className}">${labels[key]} ${prefix}${value}</span>`;
    })
    .join(' | ');
}

function renderLog() {
  if (!logEntries.length) {
    eventLogEl.innerHTML = '<li>No actions yet.</li>';
    return;
  }

  eventLogEl.innerHTML = logEntries
    .map((entry) => `<li><strong>${entry.round}</strong>: ${entry.choice}</li>`)
    .join('');
}

function renderStatus() {
  const notes = [];

  if (metrics.trust <= 40) notes.push('Public trust is low in this run.');
  else if (metrics.trust >= 78) notes.push('Public trust is high in this run.');
  else notes.push('Public trust is in the middle range.');

  if (metrics.throughput <= 40) notes.push('The work-completed score is low. Requests are backing up in the scenario.');
  else if (metrics.throughput >= 78) notes.push('The work-completed score is high.');

  if (metrics.resilience <= 40) notes.push('Little recovery capacity remains in the game.');
  else if (metrics.resilience >= 78) notes.push('Recovery capacity is high.');

  if (metrics.load >= 75) notes.push('Staff workload is high in this run.');
  else if (metrics.load <= 35) notes.push('Staff workload is low in this run.');

  statusCopyEl.innerHTML = notes.map((note) => `<p>${note}</p>`).join('');
}

function showRound() {
  const round = activeScenario.rounds[currentRoundIndex];
  if (!round) return;

  debriefEl.classList.add('hidden');
  roundTitleEl.textContent = round.title;
  roundSceneEl.textContent = round.scene;
  pressureTagsEl.innerHTML = round.tags.map((tag) => `<span>${tag}</span>`).join('');
  choiceListEl.innerHTML = round.choices
    .map(
      (choice, index) => `
        <button class="choice-card" type="button" data-choice="${index}">
          <strong>${choice.label}</strong>
          <span class="choice-impact">${formatImpact(choice.impact)}</span>
        </button>
      `
    )
    .join('');

  choiceListEl.querySelectorAll('[data-choice]').forEach((button) => {
    button.addEventListener('click', () => applyChoice(Number(button.dataset.choice)));
  });
}

function showDebrief() {
  debriefEl.classList.remove('hidden');

  let title = 'Scenario stabilized.';
  let summary = 'Review the final scores to compare the tradeoffs in your three choices.';

  if (metrics.trust >= 75 && metrics.resilience >= 75) {
    title = 'High trust and recovery scores.';
    summary = 'Trust and recovery capacity both ended at 75 or higher under the game rules.';
  } else if (metrics.throughput >= 75 && metrics.trust <= 45) {
    title = 'More work completed, lower trust.';
    summary = 'Work completed reached 75 or higher while trust ended at 45 or lower.';
  } else if (metrics.load >= 78) {
    title = 'High staff workload.';
    summary = 'Staff workload ended at 78 or higher. Try a different set of choices to compare the result.';
  } else if (metrics.resilience <= 40) {
    title = 'Low recovery capacity.';
    summary = 'Recovery capacity ended at 40 or lower under the game rules.';
  }

  debriefTitleEl.textContent = title;
  debriefSummaryEl.textContent = summary;
}

function applyChoice(choiceIndex) {
  const round = activeScenario.rounds[currentRoundIndex];
  const choice = round?.choices[choiceIndex];
  if (!choice) return;

  Object.entries(choice.impact).forEach(([key, delta]) => {
    metrics[key] = clampMetric(metrics[key] + delta);
  });

  logEntries.unshift({
    round: round.title,
    choice: choice.label,
  });
  logEntries = logEntries.slice(0, 6);

  renderMetrics();
  renderLog();
  renderStatus();

  if (currentRoundIndex >= activeScenario.rounds.length - 1) {
    choiceListEl.innerHTML = '<p class="scene-copy">Scenario complete. Reset to try other choices, or pick another scenario.</p>';
    pressureTagsEl.innerHTML = '';
    showDebrief();
    return;
  }

  currentRoundIndex += 1;
  showRound();
}

function startRun() {
  metrics = { ...baseline };
  logEntries = [];
  currentRoundIndex = 0;
  renderMetrics();
  renderLog();
  renderStatus();
  showRound();
}

function resetRun() {
  metrics = { ...baseline };
  logEntries = [];
  currentRoundIndex = -1;
  renderMetrics();
  renderLog();
  renderStatus();
  debriefEl.classList.add('hidden');
  roundTitleEl.textContent = 'Choose a scenario pack';
  roundSceneEl.textContent =
    'Pick a scenario on the left, then select Start Scenario.';
  pressureTagsEl.innerHTML = '';
  choiceListEl.innerHTML = '';
}

startRunBtn.addEventListener('click', startRun);
resetRunBtn.addEventListener('click', resetRun);

renderScenarioList();
renderScenarioMeta();
renderMetrics();
renderLog();
renderStatus();
