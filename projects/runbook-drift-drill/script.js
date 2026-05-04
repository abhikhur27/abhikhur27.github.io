const scenarioTitle = document.getElementById('scenario-title');
const scenarioSummary = document.getElementById('scenario-summary');
const scenarioRole = document.getElementById('scenario-role');
const scenarioPressure = document.getElementById('scenario-pressure');
const scenarioRisk = document.getElementById('scenario-risk');
const evidenceList = document.getElementById('evidence-list');
const auditPrompt = document.getElementById('audit-prompt');
const stepsList = document.getElementById('steps-list');
const reviewAuditButton = document.getElementById('review-audit');
const nextScenarioButton = document.getElementById('next-scenario');
const correctCount = document.getElementById('correct-count');
const trustScore = document.getElementById('trust-score');
const timeBurned = document.getElementById('time-burned');
const auditVerdict = document.getElementById('audit-verdict');
const operatorRead = document.getElementById('operator-read');
const driftPattern = document.getElementById('drift-pattern');
const nextFix = document.getElementById('next-fix');

const scenarios = [
  {
    title: 'Campus Auth Storm',
    role: 'Incident commander on student login outage',
    pressure: 'Advising appointments start in 40 minutes',
    risk: 'Trust loss if the wrong escalation path burns time',
    summary: 'The SSO login path is failing for some users, while the runbook still assumes only one identity provider and one cache path.',
    prompt: 'Mark each runbook step as still safe, worth verifying before use, or stale enough that it should not be trusted without repair.',
    evidence: [
      'Error spike appears only on the new mobile login surface.',
      'Desktop sessions already holding tokens continue to work.',
      'The last platform migration moved session validation behind a regional edge cache.',
    ],
    steps: [
      {
        text: 'Flush the central Redis session store first because all auth failures must originate there.',
        expected: 'stale',
        note: 'The new mobile path fails before the legacy Redis-backed validation step, so this assumption is outdated.',
      },
      {
        text: 'Verify whether only freshly issued tokens are failing while already-issued sessions remain healthy.',
        expected: 'safe',
        note: 'This check directly tests whether the break sits on token issuance rather than global session validity.',
      },
      {
        text: 'Page the identity vendor immediately before checking whether only one client surface is affected.',
        expected: 'verify',
        note: 'Escalation may still be needed, but the evidence first suggests a client or edge-specific path.',
      },
      {
        text: 'Confirm whether the regional edge cache path diverged from the desktop validation path after the migration.',
        expected: 'safe',
        note: 'The evidence explicitly points to a topology change the older runbook does not fully cover.',
      },
    ],
    takeaways: {
      safe: 'The strongest operators check whether the failure domain actually matches the old runbook assumption before running expensive fixes.',
      pattern: 'Topology drift: the service graph changed, but the runbook still talks like the old path is universal.',
      fix: 'Split the auth runbook by client surface and by pre-token vs post-token failure domain.',
    },
  },
  {
    title: 'Payments Retry Loop',
    role: 'Responder on checkout double-charge report',
    pressure: 'Support queue is filling with conflicting refund requests',
    risk: 'A stale mitigation can worsen duplicate writes',
    summary: 'A payments worker was recently moved behind idempotency keys, but one runbook section still recommends replaying the whole dead-letter queue manually.',
    prompt: 'Classify the runbook steps before replaying anything that could touch customer money.',
    evidence: [
      'Duplicate ledger entries share the same client request id.',
      'The queue consumer was redeployed with at-least-once delivery last week.',
      'Refund webhooks are delayed but not failing outright.',
    ],
    steps: [
      {
        text: 'Replay the entire dead-letter queue immediately to catch any stranded successful payments.',
        expected: 'stale',
        note: 'That advice predates idempotency and at-least-once replay risk; blind replay can multiply duplicates.',
      },
      {
        text: 'Verify whether duplicate ledger rows already map to one idempotency key before replaying any worker messages.',
        expected: 'safe',
        note: 'This tests whether the failure is retry behavior or true payment loss.',
      },
      {
        text: 'Check whether webhook delay is only affecting refund visibility rather than initial charge authorization.',
        expected: 'verify',
        note: 'Useful, but it should not outrank the duplicate-write check.',
      },
      {
        text: 'Pause the affected consumer shard if replay keeps creating the same request id.',
        expected: 'safe',
        note: 'Containing the duplicate writer is safer than replaying first.',
      },
    ],
    takeaways: {
      safe: 'Strong audits slow down before replaying money-moving queues and test identity first.',
      pattern: 'Behavior drift: the system now retries differently than the runbook assumes.',
      fix: 'Replace blanket replay guidance with an idempotency-first duplicate check and a containment branch.',
    },
  },
  {
    title: 'Search Cluster Saturation',
    role: 'Primary on-call for a product search incident',
    pressure: 'Executives are watching cart conversion fall',
    risk: 'Outdated scaling advice can hide the real bottleneck',
    summary: 'Search latency exploded after a schema update, but the runbook still assumes CPU is the first failure mode and recommends scaling stateless API pods first.',
    prompt: 'Treat the runbook as suspect. Which steps still help, and which ones point at yesterday’s bottleneck?',
    evidence: [
      'API pods are under 35% CPU and returning quickly once they get a search response.',
      'Search shard heap usage and GC pause time both spiked after the index mapping change.',
      'Only faceted queries with the new attributes are timing out.',
    ],
    steps: [
      {
        text: 'Scale the API tier horizontally before checking shard memory pressure because stateless pods are easiest to add.',
        expected: 'stale',
        note: 'The evidence shows the bottleneck is deeper in the search tier, not the API edge.',
      },
      {
        text: 'Verify whether the schema update changed heap pressure or field-cardinality behavior on the affected shard family.',
        expected: 'safe',
        note: 'This targets the newest system change and the most visible saturation signal.',
      },
      {
        text: 'Temporarily disable the new faceted attributes if they are responsible for the runaway heap pattern.',
        expected: 'safe',
        note: 'That is a concrete containment move tied to the observed degraded query shape.',
      },
      {
        text: 'Page the networking team before checking whether only faceted queries are timing out.',
        expected: 'verify',
        note: 'Networking is not impossible, but the evidence is too query-shape-specific to make it the first move.',
      },
    ],
    takeaways: {
      safe: 'Good audits privilege the newest change and the deepest saturated layer, not the easiest layer to scale.',
      pattern: 'Capacity drift: the runbook kept an old bottleneck model after the data path changed.',
      fix: 'Make the search runbook branch on shard memory and query-shape evidence before any generic scale-out advice.',
    },
  },
];

let scenarioIndex = 0;
let selections = {};

function resetSelections() {
  selections = {};
}

function currentScenario() {
  return scenarios[scenarioIndex];
}

function setChoice(stepIndex, choice) {
  selections[stepIndex] = choice;
  renderSteps();
}

function renderScenario() {
  const scenario = currentScenario();
  scenarioTitle.textContent = scenario.title;
  scenarioSummary.textContent = scenario.summary;
  scenarioRole.textContent = scenario.role;
  scenarioPressure.textContent = scenario.pressure;
  scenarioRisk.textContent = scenario.risk;
  auditPrompt.textContent = scenario.prompt;
  evidenceList.innerHTML = scenario.evidence.map((item) => `<li>${item}</li>`).join('');
  resetSelections();
  correctCount.textContent = `0 / ${scenario.steps.length}`;
  trustScore.textContent = '100';
  timeBurned.textContent = '0 min';
  auditVerdict.textContent = 'Waiting for review';
  operatorRead.textContent = 'Classify the steps to see which instinct the scenario rewards.';
  driftPattern.textContent = 'The review will surface whether the danger was stale configuration, changed topology, or outdated escalation logic.';
  nextFix.textContent = 'The project will recommend the smallest runbook repair that would have prevented the mismatch.';
  renderSteps();
}

function renderSteps(reviewMode = false) {
  const scenario = currentScenario();
  stepsList.innerHTML = scenario.steps
    .map((step, index) => {
      const selected = selections[index] || '';
      const reviewLine = reviewMode
        ? `<p class="judgment-line"><strong>Expected:</strong> ${step.expected.toUpperCase()} | ${step.note}</p>`
        : '<p class="judgment-line">Pick Safe, Verify, or Stale before reviewing.</p>';

      return `
        <article class="step-card ${reviewMode ? 'is-reviewed' : ''}">
          <h3>Step ${index + 1}</h3>
          <p>${step.text}</p>
          <div class="choice-row">
            <button class="choice-btn ${selected === 'safe' ? 'is-active' : ''}" data-index="${index}" data-choice="safe" type="button">Safe</button>
            <button class="choice-btn ${selected === 'verify' ? 'is-active' : ''}" data-index="${index}" data-choice="verify" type="button">Verify</button>
            <button class="choice-btn ${selected === 'stale' ? 'is-active' : ''}" data-index="${index}" data-choice="stale" type="button">Stale</button>
          </div>
          ${reviewLine}
        </article>
      `;
    })
    .join('');

  stepsList.querySelectorAll('.choice-btn').forEach((button) => {
    button.addEventListener('click', () => setChoice(Number(button.dataset.index), button.dataset.choice));
  });
}

function reviewAudit() {
  const scenario = currentScenario();
  let correct = 0;
  let trust = 100;
  let minutes = 0;

  scenario.steps.forEach((step, index) => {
    const selected = selections[index];
    if (selected === step.expected) {
      correct += 1;
      return;
    }

    if (!selected) {
      trust -= 10;
      minutes += 6;
      return;
    }

    if (step.expected === 'stale' && selected === 'safe') {
      trust -= 28;
      minutes += 18;
    } else if (step.expected === 'safe' && selected === 'stale') {
      trust -= 12;
      minutes += 10;
    } else {
      trust -= 18;
      minutes += 12;
    }
  });

  correctCount.textContent = `${correct} / ${scenario.steps.length}`;
  trustScore.textContent = String(Math.max(0, trust));
  timeBurned.textContent = `${minutes} min`;
  auditVerdict.textContent =
    correct === scenario.steps.length
      ? 'Runbook reality matched cleanly'
      : correct >= scenario.steps.length - 1
        ? 'Mostly sound, but one branch drifted'
        : 'Drift was already operationally dangerous';
  operatorRead.textContent = scenario.takeaways.safe;
  driftPattern.textContent = scenario.takeaways.pattern;
  nextFix.textContent = scenario.takeaways.fix;
  renderSteps(true);
}

reviewAuditButton.addEventListener('click', reviewAudit);
nextScenarioButton.addEventListener('click', () => {
  scenarioIndex = (scenarioIndex + 1) % scenarios.length;
  renderScenario();
});

renderScenario();
