const scenarioTitle = document.getElementById('scenario-title');
const scenarioBadge = document.getElementById('scenario-badge');
const scenarioSummary = document.getElementById('scenario-summary');
const scenarioRequest = document.getElementById('scenario-request');
const scenarioPressure = document.getElementById('scenario-pressure');
const scenarioSuccess = document.getElementById('scenario-success');
const meetingPosture = document.getElementById('meeting-posture');
const questionSummary = document.getElementById('question-summary');
const questionGrid = document.getElementById('question-grid');
const answerLog = document.getElementById('answer-log');
const blindSpotBoard = document.getElementById('blind-spot-board');
const promiseBoard = document.getElementById('promise-board');
const coachBoard = document.getElementById('coach-board');
const decisionGrid = document.getElementById('decision-grid');
const decisionResult = document.getElementById('decision-result');
const questionsLeftEl = document.getElementById('questions-left');
const clarityScoreEl = document.getElementById('clarity-score');
const riskScoreEl = document.getElementById('risk-score');
const trustScoreEl = document.getElementById('trust-score');
const nextScenarioButton = document.getElementById('next-scenario');
const resetScenarioButton = document.getElementById('reset-scenario');

const scenarios = [
  {
    title: 'Campus Waitlist Autopromote',
    lane: 'Registration system',
    summary: 'Student success wants automatic seat releases, but every shortcut changes fairness optics, notification timing, and advisor workload.',
    request: '"Can we auto-enroll students from the waitlist whenever a seat opens so advisors stop doing manual cleanup?"',
    pressure: 'The dean wants it live before the next registration wave, but support staff are already overloaded.',
    success: 'Students feel the process is fair, advisors can explain edge cases, and accidental schedule conflicts stay low.',
    hiddenRisk: 'Fairness and policy ambiguity',
    questions: [
      {
        label: 'Who gets skipped if a student has a schedule conflict?',
        category: 'Fairness',
        answer: 'Conflicting students are supposed to keep priority, but ops has no escalation rule yet.',
        clarity: 4,
        risk: -1,
        trust: 1,
      },
      {
        label: 'Do students need time to accept the seat before it moves on?',
        category: 'Commitment window',
        answer: 'Yes. Policy says every student should have a short response window before forfeiting the seat.',
        clarity: 3,
        risk: -2,
        trust: 2,
      },
      {
        label: 'What happens if autopromote breaks prerequisite rules?',
        category: 'Validation',
        answer: 'Prereq failures currently route to advisors manually. Silent failures would create angry support tickets.',
        clarity: 4,
        risk: -1,
        trust: 1,
      },
      {
        label: 'How visible does the queue logic need to be to students?',
        category: 'Trust',
        answer: 'Very visible. The current manual flow is tolerated because advisors can explain every exception.',
        clarity: 2,
        risk: -1,
        trust: 3,
      },
      {
        label: 'Is there already telemetry on seat-release timing?',
        category: 'Instrumentation',
        answer: 'No. If this ships without event logs, ops will not know why someone was skipped.',
        clarity: 2,
        risk: -2,
        trust: 1,
      },
      {
        label: 'Can we just start with one department instead of the full campus?',
        category: 'Rollout',
        answer: 'Pilot scope is allowed, but product had not volunteered that option yet.',
        clarity: 3,
        risk: -2,
        trust: 2,
      },
    ],
    decisions: [
      {
        label: 'Promise full autopromote now',
        posture: 'Aggressive scope',
        result: 'You hit the deadline headline, but skipped the acceptance-window nuance. Enrollment disputes spike immediately.',
        score: { risk: 4 },
      },
      {
        label: 'Pilot by department with acceptance windows',
        posture: 'Narrowed rollout',
        result: 'You preserved fairness optics, learned where queue exceptions break, and still shipped something concrete.',
        score: { risk: -2 },
      },
      {
        label: 'Hold until policy and telemetry are explicit',
        posture: 'Protect trust',
        result: 'You avoided a messy launch, but the team now needs a crisp discovery memo so "not yet" does not become drift.',
        score: { risk: -3 },
      },
    ],
  },
  {
    title: 'Study Group AI Notes',
    lane: 'Learning product',
    summary: 'A class note assistant sounds simple until citation quality, hallucinations, and attribution all become social risks.',
    request: '"Can we summarize any study group transcript into polished notes by finals week?"',
    pressure: 'Students are already sharing unofficial prompts and want a first-party tool quickly.',
    success: 'The notes save time without fabricating facts, flattening speaker attribution, or embarrassing the product in class.',
    hiddenRisk: 'Citation quality and trust',
    questions: [
      {
        label: 'Do notes need citations back to exact transcript lines?',
        category: 'Evidence',
        answer: 'Yes. Without source traces, teaching staff will not trust the output and students cannot audit mistakes.',
        clarity: 4,
        risk: -2,
        trust: 3,
      },
      {
        label: 'Can users edit the draft before it is shared?',
        category: 'Control',
        answer: 'They can, and product is comfortable requiring human review before export.',
        clarity: 3,
        risk: -1,
        trust: 2,
      },
      {
        label: 'What kinds of transcripts are dirtiest?',
        category: 'Input quality',
        answer: 'Messy multi-speaker audio dumps are the failure case. Clean lecture text is much safer.',
        clarity: 3,
        risk: -1,
        trust: 1,
      },
      {
        label: 'Is "polished notes" about brevity, structure, or correctness?',
        category: 'Output contract',
        answer: 'Correctness first, structure second, brevity third. That priority had not been written down yet.',
        clarity: 4,
        risk: -1,
        trust: 1,
      },
      {
        label: 'Can we scope this to lecture transcripts before open chat logs?',
        category: 'Scope',
        answer: 'Yes. Lecture transcripts are the safest launch surface and already have staff demand.',
        clarity: 3,
        risk: -2,
        trust: 2,
      },
      {
        label: 'What happens when the model is unsure?',
        category: 'Failure mode',
        answer: 'The current expectation is unclear. Shipping without an "uncertain" state would push false confidence onto students.',
        clarity: 3,
        risk: -2,
        trust: 3,
      },
    ],
    decisions: [
      {
        label: 'Ship open-ended note generation for all transcripts',
        posture: 'Wide promise',
        result: 'Usage spikes, but the first garbled transcript produces confident nonsense and support loses credibility.',
        score: { risk: 4 },
      },
      {
        label: 'Launch lecture-mode with citations and review',
        posture: 'Guardrailed launch',
        result: 'The feature lands slower than the loudest request, but the product can defend its output and learn from real classes.',
        score: { risk: -2 },
      },
      {
        label: 'Pause and write an uncertainty policy first',
        posture: 'Policy-first',
        result: 'You buy trust and reduce nonsense, but you must now prove the delay turns into a narrower, testable contract.',
        score: { risk: -3 },
      },
    ],
  },
  {
    title: 'Residence Hall Maintenance Feed',
    lane: 'Operations communication',
    summary: 'Residents want real-time updates, but one vague "maintenance feed" request can hide privacy, escalation, and false-certainty problems.',
    request: '"Can we give every dorm a live maintenance status feed so students stop asking the front desk what is happening?"',
    pressure: 'Facilities leadership wants fewer calls, while resident assistants want clearer guidance during outages.',
    success: 'Students know what is happening, support load drops, and the app does not overpromise restoration times.',
    hiddenRisk: 'False certainty during live incidents',
    questions: [
      {
        label: 'Who is allowed to post live updates during an outage?',
        category: 'Ownership',
        answer: 'Only facilities supervisors should publish updates, but that role has no existing tooling.',
        clarity: 4,
        risk: -1,
        trust: 2,
      },
      {
        label: 'Are estimates optional when teams do not know the fix time?',
        category: 'Uncertainty',
        answer: 'They need to be optional. Forced ETAs would create false promises during messy repairs.',
        clarity: 4,
        risk: -2,
        trust: 3,
      },
      {
        label: 'Does every incident need resident-facing language?',
        category: 'Audience',
        answer: 'No. Some updates are internal until the issue is confirmed and scoped.',
        clarity: 2,
        risk: -1,
        trust: 1,
      },
      {
        label: 'Can the first version focus on outages, not every maintenance task?',
        category: 'Scope',
        answer: 'Yes. Residents mostly care about high-impact outages and safety notices.',
        clarity: 3,
        risk: -2,
        trust: 1,
      },
      {
        label: 'What happens if the posted status is wrong?',
        category: 'Recovery',
        answer: 'There must be an update log and correction history. Otherwise the app looks like it is hiding mistakes.',
        clarity: 3,
        risk: -1,
        trust: 3,
      },
      {
        label: 'How quickly does the front desk need the same information?',
        category: 'Coordination',
        answer: 'Immediately. A resident feed that gets ahead of support staff would create more chaos, not less.',
        clarity: 3,
        risk: -1,
        trust: 2,
      },
    ],
    decisions: [
      {
        label: 'Ship a full live feed with ETA fields required',
        posture: 'Operational overpromise',
        result: 'The interface looks impressive until the first uncertain outage forces fake ETAs and contradictory desk guidance.',
        score: { risk: 4 },
      },
      {
        label: 'Launch outage-only updates with corrections and shared staff view',
        posture: 'Coordinated scope',
        result: 'The feed solves the most painful cases first and keeps resident trust aligned with staff reality.',
        score: { risk: -2 },
      },
      {
        label: 'Keep the request in discovery until ownership is clear',
        posture: 'Governance-first',
        result: 'You avoid a brittle launch, but now the next step is an explicit operating model, not another generic brainstorm.',
        score: { risk: -3 },
      },
    ],
  },
];

let scenarioIndex = 0;
let remainingQuestions = 3;
let revealedAnswers = [];
let committedDecision = null;

function getScenario() {
  return scenarios[scenarioIndex];
}

function currentTotals() {
  return revealedAnswers.reduce(
    (totals, item) => {
      totals.clarity += item.clarity;
      totals.risk += item.risk;
      totals.trust += item.trust;
      return totals;
    },
    { clarity: 0, risk: 0, trust: 0 }
  );
}

function renderScenario() {
  const scenario = getScenario();
  const totals = currentTotals();
  scenarioTitle.textContent = scenario.title;
  scenarioBadge.textContent = `${scenario.lane} | Hidden risk: ${scenario.hiddenRisk}`;
  scenarioSummary.textContent = scenario.summary;
  scenarioRequest.textContent = scenario.request;
  scenarioPressure.textContent = scenario.pressure;
  scenarioSuccess.textContent = scenario.success;
  questionsLeftEl.textContent = String(remainingQuestions);
  clarityScoreEl.textContent = String(totals.clarity);
  riskScoreEl.textContent = String(Math.max(0, 6 - totals.risk));
  trustScoreEl.textContent = String(Math.max(0, totals.trust));
  questionSummary.textContent = `${remainingQuestions} question${remainingQuestions === 1 ? '' : 's'} available`;
  meetingPosture.textContent =
    remainingQuestions === 0
      ? 'Question budget exhausted. Commit to a delivery posture with the constraints you uncovered.'
      : `The meeting is still live. ${revealedAnswers.length} of ${scenario.questions.length} constraints have been surfaced.`;
}

function renderQuestions() {
  const scenario = getScenario();
  questionGrid.innerHTML = scenario.questions
    .map((question, index) => {
      const used = revealedAnswers.some((item) => item.index === index);
      return `
        <article class="question-card ${used ? 'used' : ''}">
          <span class="question-chip">${question.category}</span>
          <h3>${question.label}</h3>
          <p>${used ? question.answer : 'Spend one meeting slot to reveal what this question actually changes.'}</p>
          <button type="button" class="ghost ask-btn" data-index="${index}" ${used || remainingQuestions === 0 || committedDecision ? 'disabled' : ''}>
            ${used ? 'Answered' : 'Ask this question'}
          </button>
        </article>
      `;
    })
    .join('');

  questionGrid.querySelectorAll('.ask-btn').forEach((button) => {
    button.addEventListener('click', () => revealQuestion(Number.parseInt(button.dataset.index || '-1', 10)));
  });
}

function renderAnswers() {
  if (!revealedAnswers.length) {
    answerLog.innerHTML = '<article class="answer-card"><h3>No constraints revealed yet</h3><p>Start with the question that collapses the most downstream ambiguity.</p></article>';
    return;
  }

  answerLog.innerHTML = revealedAnswers
    .map(
      (item, index) => `
        <article class="answer-card">
          <h3>${index + 1}. ${item.label}</h3>
          <p>${item.answer}</p>
          <p><strong>Effect:</strong> clarity +${item.clarity}, risk ${item.risk <= 0 ? item.risk : `+${item.risk}`}, trust ${item.trust >= 0 ? `+${item.trust}` : item.trust}.</p>
        </article>
      `
    )
    .join('');
}

function renderBoards() {
  const totals = currentTotals();
  const scenario = getScenario();
  const categories = new Set(revealedAnswers.map((item) => item.category));
  const blindSpots = scenario.questions.filter((question) => !categories.has(question.category));

  blindSpotBoard.textContent = blindSpots.length
    ? `Still blind on ${blindSpots[0].category.toLowerCase()}. ${blindSpots[0].label}`
    : 'The revealed questions cover multiple risk dimensions. You can now justify a narrower or more confident scope decision.';

  promiseBoard.textContent =
    remainingQuestions === 0 && totals.clarity < 8
      ? 'Low clarity with no questions left means a wide promise is mostly theater.'
      : totals.trust >= 5 && totals.clarity >= 8
        ? 'You have enough contract detail to promise a guarded first version.'
        : 'You have some evidence, but a full-scope promise would still lean on unstated assumptions.';

  const nextQuestion = scenario.questions.find((question, index) => !revealedAnswers.some((item) => item.index === index));
  coachBoard.textContent = nextQuestion
    ? `Best next probe: ${nextQuestion.label}`
    : 'No questions remain. Use the decision buttons to turn this discovery posture into a concrete scope call.';
}

function renderDecisions() {
  const scenario = getScenario();
  decisionGrid.innerHTML = scenario.decisions
    .map(
      (decision, index) => `
        <button type="button" class="decision-btn" data-index="${index}" ${committedDecision ? 'disabled' : ''}>
          ${decision.label}
          <span>${decision.posture}</span>
        </button>
      `
    )
    .join('');

  decisionGrid.querySelectorAll('.decision-btn').forEach((button) => {
    button.addEventListener('click', () => commitDecision(Number.parseInt(button.dataset.index || '-1', 10)));
  });
}

function renderDecisionResult() {
  if (!committedDecision) {
    decisionResult.className = 'result-card';
    decisionResult.innerHTML = '<h3>No decision committed yet</h3><p>Interrogate the request, then choose how aggressively to promise delivery.</p>';
    return;
  }

  const totals = currentTotals();
  const clarityFloor = totals.clarity >= 8 ? 'high' : totals.clarity >= 5 ? 'partial' : 'thin';
  const trustState = totals.trust >= 5 ? 'trust-preserving' : totals.trust >= 2 ? 'mixed-trust' : 'fragile-trust';
  const severity = committedDecision.score.risk >= 3 ? 'danger' : committedDecision.score.risk >= 0 ? 'warn' : 'success';

  decisionResult.className = `result-card ${severity}`;
  decisionResult.innerHTML = `
    <h3>${committedDecision.label}</h3>
    <p>${committedDecision.result}</p>
    <p><strong>Negotiation read:</strong> You committed with ${clarityFloor} clarity and a ${trustState} setup. ${
      remainingQuestions > 0
        ? `${remainingQuestions} unused question${remainingQuestions === 1 ? '' : 's'} remain, which means you left some discovery value on the table.`
        : 'You spent the full meeting budget before choosing.'
    }</p>
  `;
}

function revealQuestion(index) {
  const scenario = getScenario();
  const question = scenario.questions[index];
  if (!question || remainingQuestions === 0 || committedDecision) return;
  if (revealedAnswers.some((item) => item.index === index)) return;

  remainingQuestions -= 1;
  revealedAnswers.push({ index, ...question });
  renderAll();
}

function commitDecision(index) {
  const scenario = getScenario();
  const decision = scenario.decisions[index];
  if (!decision || committedDecision) return;
  committedDecision = decision;
  renderAll();
}

function resetScenario() {
  remainingQuestions = 3;
  revealedAnswers = [];
  committedDecision = null;
  renderAll();
}

function renderAll() {
  renderScenario();
  renderQuestions();
  renderAnswers();
  renderBoards();
  renderDecisions();
  renderDecisionResult();
}

nextScenarioButton.addEventListener('click', () => {
  scenarioIndex = (scenarioIndex + 1) % scenarios.length;
  resetScenario();
});

resetScenarioButton.addEventListener('click', resetScenario);

renderAll();
