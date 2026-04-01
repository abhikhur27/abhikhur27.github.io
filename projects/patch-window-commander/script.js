const securityRiskEl = document.getElementById('security-risk');
const userTrustEl = document.getElementById('user-trust');
const crewFatigueEl = document.getElementById('crew-fatigue');
const patchBacklogEl = document.getElementById('patch-backlog');
const roundLabelEl = document.getElementById('round-label');
const scenarioTitleEl = document.getElementById('scenario-title');
const scenarioCopyEl = document.getElementById('scenario-copy');
const scenarioContextEl = document.getElementById('scenario-context');
const choicesEl = document.getElementById('choices');
const decisionLogEl = document.getElementById('decision-log');
const summaryTextEl = document.getElementById('summary-text');
const statusTextEl = document.getElementById('status-text');
const restartBtn = document.getElementById('restart-btn');

const scenarios = [
  {
    title: 'Domain controllers need an urgent auth patch',
    copy:
      'A critical auth patch closes an exploit path, but the identity cluster is already carrying the morning login surge from late-night labs.',
    context: 'Security wants full coverage tonight. Student services wants zero authentication downtime at 7 a.m.',
    choices: [
      {
        label: 'Patch every controller in one coordinated window',
        detail: 'Best security outcome, but a bad reboot sequence could create a campus-wide lockout.',
        impact: { securityRisk: -18, userTrust: -14, crewFatigue: +10, patchBacklog: -16 },
        result: 'You crushed the auth exposure, but a reboot wobble triggered noisy support calls before the cluster stabilized.',
      },
      {
        label: 'Canary one controller and monitor for fifteen minutes',
        detail: 'Slower, but limits blast radius if replication gets weird.',
        impact: { securityRisk: -10, userTrust: +6, crewFatigue: +4, patchBacklog: -8 },
        result: 'The staged rollout bought confidence. Security grumbles about the remaining exposure, but users barely noticed.',
      },
      {
        label: 'Delay auth patch until the weekend',
        detail: 'Maximum stability tonight, maximum audit pain tomorrow.',
        impact: { securityRisk: +12, userTrust: +8, crewFatigue: -4, patchBacklog: +10 },
        result: 'Operations stayed calm tonight, but you carried a known exploit window into the rest of the week.',
      },
    ],
  },
  {
    title: 'The VPN concentrator also needs a firmware restart',
    copy:
      'Remote students are still online, and the VPN appliance has a memory leak that gets worse under patch activity elsewhere.',
    context: 'You can either sequence the firmware cleanly now or risk the appliance failing under load later.',
    choices: [
      {
        label: 'Reboot the concentrator immediately after auth patching',
        detail: 'Cleans up the device, but stacks another visible disruption onto an already tense window.',
        impact: { securityRisk: -8, userTrust: -10, crewFatigue: +8, patchBacklog: -10 },
        result: 'The concentrator came back healthy, but late-night users noticed the stacked downtime and trust dipped.',
      },
      {
        label: 'Shift remote users to the backup gateway, then patch',
        detail: 'More operator work, better continuity, and less panic if failover holds.',
        impact: { securityRisk: -6, userTrust: +7, crewFatigue: +9, patchBacklog: -7 },
        result: 'The backup path held. It took more coordination, but the operation looked deliberate instead of chaotic.',
      },
      {
        label: 'Accept the leak and preserve continuity',
        detail: 'Avoids a deliberate outage, but leaves a brittle point in the middle of the run.',
        impact: { securityRisk: +7, userTrust: +4, crewFatigue: -3, patchBacklog: +8 },
        result: 'Nothing exploded tonight, but you left a fragile service in place and the backlog got uglier.',
      },
    ],
  },
  {
    title: 'A database replica begins lagging during the window',
    copy:
      'Patch jobs are competing with replication and the read replica is drifting. You can stabilize data, keep patching, or drop non-critical services.',
    context: 'This is where fatigue starts to matter. The crew is now trading clean sequencing against the temptation to power through.',
    choices: [
      {
        label: 'Pause patching and recover replication before anything else',
        detail: 'Protects data integrity, but leaves patch coverage incomplete for longer.',
        impact: { securityRisk: +6, userTrust: +5, crewFatigue: +5, patchBacklog: +9 },
        result: 'You protected the database layer, but the patch queue thickened and security exposure stayed live.',
      },
      {
        label: 'Take low-priority read services offline and keep patching core systems',
        detail: 'Sacrifice convenience to keep the critical path clean.',
        impact: { securityRisk: -10, userTrust: -6, crewFatigue: +7, patchBacklog: -9 },
        result: 'The run stayed on schedule, but some user-facing services disappeared and trust took a hit.',
      },
      {
        label: 'Keep all services online and hope lag recovers naturally',
        detail: 'Looks calm in the moment, but creates the biggest chance of a messy rebound later.',
        impact: { securityRisk: +11, userTrust: -8, crewFatigue: +2, patchBacklog: +6 },
        result: 'The lag did not self-heal. By preserving surface continuity, you increased hidden operational risk.',
      },
    ],
  },
  {
    title: 'Sunrise is close and a final endpoint patch wave remains',
    copy:
      'You can finish strong, hand off a smaller queue, or stop and protect the team. This last call decides whether the run looks disciplined or ragged.',
    context: 'Security, fatigue, and trust are now all visible. Pick what story tomorrow morning will tell.',
    choices: [
      {
        label: 'Push through the remaining endpoint wave before classes begin',
        detail: 'Reduces backlog aggressively, but pushes the crew into the danger zone.',
        impact: { securityRisk: -12, userTrust: -7, crewFatigue: +14, patchBacklog: -15 },
        result: 'Coverage improved, but the team crossed into exhaustion and the morning handoff feels brittle.',
      },
      {
        label: 'Complete only high-risk endpoints and document a clean day shift handoff',
        detail: 'Balanced close: not perfect, but stable and defensible.',
        impact: { securityRisk: -8, userTrust: +8, crewFatigue: +4, patchBacklog: -9 },
        result: 'The night ended with a coherent handoff, lower risk, and fewer surprises for the next shift.',
      },
      {
        label: 'Freeze changes and protect uptime at all costs',
        detail: 'Best short-term calm, worst long-tail exposure.',
        impact: { securityRisk: +8, userTrust: +6, crewFatigue: -6, patchBacklog: +12 },
        result: 'The morning looked calm, but the unresolved backlog now owns the next incident review.',
      },
    ],
  },
];

const initialState = {
  securityRisk: 58,
  userTrust: 64,
  crewFatigue: 32,
  patchBacklog: 71,
};

let metrics = { ...initialState };
let roundIndex = 0;
let decisionLog = [];

function clamp(value) {
  return Math.max(0, Math.min(100, value));
}

function renderMetrics() {
  securityRiskEl.textContent = String(metrics.securityRisk);
  userTrustEl.textContent = String(metrics.userTrust);
  crewFatigueEl.textContent = String(metrics.crewFatigue);
  patchBacklogEl.textContent = String(metrics.patchBacklog);
}

function scoreRun() {
  return (100 - metrics.securityRisk) + metrics.userTrust + (100 - metrics.crewFatigue) + (100 - metrics.patchBacklog);
}

function buildSummary() {
  const score = scoreRun();
  if (score >= 255) {
    return 'You ran a disciplined patch night: security moved down, trust held, and the crew did not get sacrificed to the schedule.';
  }
  if (score >= 210) {
    return 'The run was credible but tense. You reduced some real risk, though at least one part of the system will still feel fragile tomorrow.';
  }
  return 'This patch night stayed reactive. Either the backlog remained too high, fatigue got out of hand, or users absorbed too much instability.';
}

function renderDecisionLog() {
  if (!decisionLog.length) {
    decisionLogEl.innerHTML = '<li>No choices yet. The first maintenance window is waiting.</li>';
    return;
  }

  decisionLogEl.innerHTML = decisionLog
    .map(
      (entry) =>
        `<li><strong>${entry.window}:</strong> ${entry.choice}. <span class="${entry.tone}">${entry.result}</span></li>`
    )
    .join('');
}

function describeImpact(impact) {
  return [
    `Security ${impact.securityRisk > 0 ? '+' : ''}${impact.securityRisk}`,
    `Trust ${impact.userTrust > 0 ? '+' : ''}${impact.userTrust}`,
    `Fatigue ${impact.crewFatigue > 0 ? '+' : ''}${impact.crewFatigue}`,
    `Backlog ${impact.patchBacklog > 0 ? '+' : ''}${impact.patchBacklog}`,
  ];
}

function applyChoice(choice) {
  metrics = {
    securityRisk: clamp(metrics.securityRisk + choice.impact.securityRisk),
    userTrust: clamp(metrics.userTrust + choice.impact.userTrust),
    crewFatigue: clamp(metrics.crewFatigue + choice.impact.crewFatigue),
    patchBacklog: clamp(metrics.patchBacklog + choice.impact.patchBacklog),
  };

  const tone =
    choice.impact.securityRisk <= 0 && choice.impact.patchBacklog <= 0 && choice.impact.userTrust >= 0 ? 'positive' : choice.impact.userTrust < 0 ? 'negative' : 'neutral';

  decisionLog.unshift({
    window: `Window ${roundIndex + 1}`,
    choice: choice.label,
    result: choice.result,
    tone,
  });

  roundIndex += 1;
  renderMetrics();
  renderDecisionLog();

  if (roundIndex >= scenarios.length) {
    roundLabelEl.textContent = 'Run complete';
    scenarioTitleEl.textContent = 'Dawn handoff';
    scenarioCopyEl.textContent = 'The maintenance window is over. What remains is the story your metrics and choices tell.';
    scenarioContextEl.textContent = `Final score: ${scoreRun()} / 400`;
    choicesEl.innerHTML = '';
    summaryTextEl.textContent = buildSummary();
    statusTextEl.textContent = 'Run complete. Restart to try a different operating philosophy.';
    return;
  }

  summaryTextEl.textContent = buildSummary();
  statusTextEl.textContent = choice.result;
  renderScenario();
}

function renderScenario() {
  const scenario = scenarios[roundIndex];
  roundLabelEl.textContent = `Window ${roundIndex + 1} of ${scenarios.length}`;
  scenarioTitleEl.textContent = scenario.title;
  scenarioCopyEl.textContent = scenario.copy;
  scenarioContextEl.textContent = scenario.context;

  choicesEl.innerHTML = scenario.choices
    .map((choice, index) => {
      const impactTags = describeImpact(choice.impact)
        .map((item) => `<span>${item}</span>`)
        .join('');

      return `
        <article class="choice-card">
          <p class="eyebrow">Option ${index + 1}</p>
          <h3>${choice.label}</h3>
          <p>${choice.detail}</p>
          <div class="choice-impact">${impactTags}</div>
          <button type="button" data-choice-index="${index}">Commit to this plan</button>
        </article>
      `;
    })
    .join('');

  Array.from(choicesEl.querySelectorAll('button')).forEach((button) => {
    button.addEventListener('click', () => {
      const choiceIndex = Number(button.dataset.choiceIndex);
      applyChoice(scenario.choices[choiceIndex]);
    });
  });
}

function restartRun() {
  metrics = { ...initialState };
  roundIndex = 0;
  decisionLog = [];
  renderMetrics();
  renderDecisionLog();
  summaryTextEl.textContent = 'Your final readout will appear here after the fourth window.';
  statusTextEl.textContent = 'Choose an action to begin the patch night.';
  renderScenario();
}

restartBtn.addEventListener('click', restartRun);
restartRun();
