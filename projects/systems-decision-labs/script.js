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
    summary: 'Handle a university outage with crew limits, uncertain root cause, and visible stakeholder pressure.',
    differentiator: 'Most about communications discipline and sequencing.',
    rounds: [
      {
        title: 'Wireless core is unstable',
        scene: 'Students are reporting outages across multiple buildings, but the NOC still cannot prove whether the fault is access-layer congestion or a collapsed upstream controller.',
        tags: ['Partial telemetry', 'Leadership pressure', 'Fast rumor spread'],
        choices: [
          { label: 'Send a campus-wide caution notice immediately.', impact: { trust: 8, throughput: -4, resilience: 2, load: 5 } },
          { label: 'Stay quiet until the fault tree is cleaner.', impact: { trust: -10, throughput: 5, resilience: 4, load: -2 } },
          { label: 'Split the team between diagnosis and faculty-facing updates.', impact: { trust: 4, throughput: 3, resilience: -3, load: 8 } },
        ],
      },
      {
        title: 'One building is failing harder',
        scene: 'Engineering is fully dark while nearby halls are only degraded. Fixing the worst building first leaves the broader campus simmering.',
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
    differentiator: 'Most about coverage and rider trust under route disruption.',
    rounds: [
      {
        title: 'A closure wipes out your clean loop',
        scene: 'A road closure breaks the fastest loop right before a crowd surge from an event venue.',
        tags: ['Route break', 'Event spillover', 'Coverage risk'],
        choices: [
          { label: 'Protect accessibility stops even if headways get worse.', impact: { trust: 7, throughput: -7, resilience: 5, load: 4 } },
          { label: 'Optimize the loop for speed and drop edge stops temporarily.', impact: { trust: -9, throughput: 9, resilience: -2, load: 1 } },
          { label: 'Run a split pattern with extra dispatcher coordination.', impact: { trust: 4, throughput: 4, resilience: 2, load: 7 } },
        ],
      },
      {
        title: 'Drivers are losing the board',
        scene: 'The detour map is changing faster than operators can internalize it, and mistakes are now compounding rider confusion.',
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
        tags: ['Burst demand', 'Queue legitimacy', 'Missed riders'],
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
    differentiator: 'Most about infrastructure prioritization and reserve management.',
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
        scene: 'Your reserve curve is collapsing faster than the original runtime estimate, and you may only get one more major intervention.',
        tags: ['Battery burn', 'One-shot decision', 'Confidence collapse'],
        choices: [
          { label: 'Conserve for a longer tail.', impact: { trust: -3, throughput: -4, resilience: 9, load: -1 } },
          { label: 'Spend reserves to recover the highest-traffic zone now.', impact: { trust: 7, throughput: 6, resilience: -8, load: 5 } },
          { label: 'Announce rolling restoration blocks.', impact: { trust: 5, throughput: 1, resilience: 4, load: 2 } },
        ],
      },
      {
        title: 'A second fault appears',
        scene: 'While crews are stabilizing the first issue, a second downstream fault forces you to choose between deeper diagnosis and visible recovery.',
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
    summary: 'Run a fragile maintenance night across multiple risk-heavy windows.',
    differentiator: 'Most about change sequencing and security-vs-stability tradeoffs.',
    rounds: [
      {
        title: 'The first window is already slipping',
        scene: 'Prechecks are slower than expected and the opening maintenance slot is shrinking while vulnerable services remain exposed.',
        tags: ['Security pressure', 'Time loss', 'Precheck drag'],
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
        tags: ['Residual risk', 'Operator fatigue', 'Morning blast radius'],
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
    summary: 'Keep a university registration launch standing through queue spikes and fairness pressure.',
    differentiator: 'Most about legitimacy and timing under burst demand.',
    rounds: [
      {
        title: 'The launch gate opens unevenly',
        scene: 'Some students are reaching the system early and screenshots are already spreading, triggering fairness complaints before the queue has stabilized.',
        tags: ['Fairness panic', 'Screenshot evidence', 'Burst demand'],
        choices: [
          { label: 'Pause new sessions and equalize the gate.', impact: { trust: 9, throughput: -8, resilience: 4, load: 3 } },
          { label: 'Leave the gate open and prioritize raw throughput.', impact: { trust: -10, throughput: 9, resilience: -2, load: 2 } },
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
          { label: 'Push policy questions out to async channels.', impact: { trust: -4, throughput: 6, resilience: 2, load: -1 } },
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
    summary: 'Manage a CS help queue without collapsing fairness, comprehension, or TA stamina.',
    differentiator: 'Most about line movement versus teaching depth.',
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
    summary: 'Coordinate a fictional overnight city dispatch room where local triage decisions cascade across services.',
    differentiator: 'Most about cross-system knock-on effects and narrative pressure.',
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
        scene: 'One event was exaggerated by bad intake, but discovering that cost precious attention while real queues kept moving.',
        tags: ['Bad telemetry', 'Attention waste', 'Trust decay'],
        choices: [
          { label: 'Tighten intake verification before dispatching.', impact: { trust: 3, throughput: -5, resilience: 5, load: 2 } },
          { label: 'Accept some noise and preserve dispatch speed.', impact: { trust: -3, throughput: 5, resilience: -2, load: 3 } },
          { label: 'Assign a dedicated triage operator.', impact: { trust: 4, throughput: 1, resilience: 3, load: 6 } },
        ],
      },
      {
        title: 'The last hour gets weird',
        scene: 'An unexpected late incident threatens to invalidate the careful balance you built across the shift.',
        tags: ['Late shock', 'Fragile equilibrium', 'Fatigue'],
        choices: [
          { label: 'Spend your remaining slack to absorb it cleanly.', impact: { trust: 6, throughput: 1, resilience: -6, load: 7 } },
          { label: 'Let lower-priority queues absorb the hit.', impact: { trust: -7, throughput: 4, resilience: 3, load: -1 } },
          { label: 'Trigger a citywide simplification protocol.', impact: { trust: 2, throughput: -2, resilience: 6, load: 2 } },
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
    <p>Distinct angle: ${activeScenario.differentiator}</p>
    <p>Scenario length: ${activeScenario.rounds.length} rounds</p>
  `;
}

function formatImpact(impact) {
  const labels = {
    trust: 'Trust',
    throughput: 'Throughput',
    resilience: 'Resilience',
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

  if (metrics.trust <= 40) notes.push('Trust is fragile. The system may still function, but people no longer believe the process is fair.');
  else if (metrics.trust >= 78) notes.push('Trust is strong. Stakeholders can see the logic of your operating choices.');
  else notes.push('Trust is holding, but one visibly unfair decision could tip it.');

  if (metrics.throughput <= 40) notes.push('Throughput is dragging. The queue is becoming part of the problem.');
  else if (metrics.throughput >= 78) notes.push('Flow is strong. The system is still moving even under stress.');

  if (metrics.resilience <= 40) notes.push('You are consuming the system faster than it can recover.');
  else if (metrics.resilience >= 78) notes.push('The system still has recovery capacity if another shock lands.');

  if (metrics.load >= 75) notes.push('Team load is high. You are solving the incident by leaning hard on staff capacity.');
  else if (metrics.load <= 35) notes.push('Team load is manageable. You still have room for a slower, cleaner move if needed.');

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
  let summary = 'You kept the system legible enough to survive the run.';

  if (metrics.trust >= 75 && metrics.resilience >= 75) {
    title = 'Strong operational finish.';
    summary = 'You protected legitimacy and long-run recoverability instead of just chasing the next visible queue.';
  } else if (metrics.throughput >= 75 && metrics.trust <= 45) {
    title = 'Fast, but politically expensive.';
    summary = 'You moved the system quickly, but people probably experienced the process as arbitrary or brutal.';
  } else if (metrics.load >= 78) {
    title = 'You saved the system by overloading the team.';
    summary = 'The run ended standing, but the operating model is not sustainable.';
  } else if (metrics.resilience <= 40) {
    title = 'You spent too much system slack.';
    summary = 'The run solved short-term pain by burning long-term recovery capacity.';
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
    choiceListEl.innerHTML = '<p class="scene-copy">Scenario complete. Reset or switch packs to run another system through the same engine.</p>';
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
    'The combined game keeps the mechanic constant and changes the operating context. Pick a pack on the left to begin.';
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
