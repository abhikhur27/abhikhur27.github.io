const scenarios = [
  {
    title: 'Checkout latency spike',
    context: 'A checkout service is slow during a promotion. The next operator has ninety seconds to understand current state and avoid repeating failed mitigations.',
    facts: [
      { text: 'P95 checkout latency is 4.8s, up from a 1.2s baseline since 14:07.', role: 'state' },
      { text: 'Payment capture success rate is normal; cart creation is the slow path.', role: 'scope' },
      { text: 'The last deploy was 11 hours ago and does not line up with the spike.', role: 'risk' },
      { text: 'Marketing says the promotion email went out at 14:00.', role: 'impact' },
      { text: 'A cache warmup was attempted at 14:18 and did not move P95.', role: 'history' },
      { text: 'Next action: sample slow traces for inventory lookups before scaling web workers.', role: 'action' },
      { text: 'The dashboard theme was changed to high contrast yesterday.', role: 'noise' },
      { text: 'One user in chat says the site feels cursed today.', role: 'noise' },
    ],
  },
  {
    title: 'Course registration queue',
    context: 'Registration opens, waitlists are moving, and student support is escalating inconsistent seat counts.',
    facts: [
      { text: 'Seat count updates are delayed by 45-70 seconds between registrar and student portal.', role: 'state' },
      { text: 'Writes are succeeding; stale reads are the visible failure mode.', role: 'scope' },
      { text: 'CS 3345 and MATH 2418 account for 63% of support tickets.', role: 'impact' },
      { text: 'Manual refreshes increase read load and make lag worse.', role: 'risk' },
      { text: 'A banner already tells students not to submit duplicate tickets.', role: 'history' },
      { text: 'Next action: enable the shorter cache TTL only for high-demand course IDs.', role: 'action' },
      { text: 'The registrar office closes at 5pm.', role: 'noise' },
      { text: 'A spreadsheet export still has the old column order.', role: 'noise' },
    ],
  },
];

const scenarioTitle = document.getElementById('scenario-title');
const scenarioContext = document.getElementById('scenario-context');
const factList = document.getElementById('fact-list');
const budgetPill = document.getElementById('budget-pill');
const coverageScore = document.getElementById('coverage-score');
const noiseScore = document.getElementById('noise-score');
const riskScore = document.getElementById('risk-score');
const actionScore = document.getElementById('action-score');
const scoreSummary = document.getElementById('score-summary');
const briefList = document.getElementById('brief-list');
const critique = document.getElementById('critique');
const resetButton = document.getElementById('reset-drill');
const nextButton = document.getElementById('next-scenario');
const copyButton = document.getElementById('copy-brief');

let scenarioIndex = 0;
let selected = new Set();
const requiredRoles = ['state', 'scope', 'risk', 'impact', 'action'];

function currentScenario() {
  return scenarios[scenarioIndex];
}

function renderScenario() {
  const scenario = currentScenario();
  scenarioTitle.textContent = scenario.title;
  scenarioContext.textContent = scenario.context;
  factList.innerHTML = scenario.facts.map((fact, index) => `
    <article class="fact-card ${fact.role === 'noise' ? 'noise' : ''} ${selected.has(index) ? 'selected' : ''}">
      <span class="tag">${fact.role}</span>
      <p>${fact.text}</p>
      <button type="button" data-index="${index}">${selected.has(index) ? 'Remove from packet' : 'Add to packet'}</button>
    </article>
  `).join('');

  factList.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => toggleFact(Number(button.dataset.index)));
  });
  renderScores();
}

function toggleFact(index) {
  if (selected.has(index)) {
    selected.delete(index);
  } else if (selected.size < 5) {
    selected.add(index);
  }
  renderScenario();
}

function renderScores() {
  const facts = [...selected].map((index) => currentScenario().facts[index]);
  const roles = new Set(facts.map((fact) => fact.role));
  const covered = requiredRoles.filter((role) => roles.has(role));
  const noise = facts.filter((fact) => fact.role === 'noise').length;

  budgetPill.textContent = `${selected.size} / 5 facts`;
  coverageScore.textContent = `${Math.round((covered.length / requiredRoles.length) * 100)}%`;
  noiseScore.textContent = String(noise);
  riskScore.textContent = roles.has('risk') ? 'Covered' : 'Missing';
  actionScore.textContent = roles.has('action') ? 'Covered' : 'Missing';

  briefList.innerHTML = facts.length
    ? facts.map((fact) => `<li>${fact.text}</li>`).join('')
    : '<li>No facts selected yet.</li>';

  const missing = requiredRoles.filter((role) => !roles.has(role));
  if (!facts.length) {
    scoreSummary.textContent = 'Select up to five facts to build the next-shift packet.';
    critique.textContent = 'A useful handoff should preserve current state, scope, risk, customer impact, and the next action.';
  } else if (noise > 0) {
    scoreSummary.textContent = 'The packet contains noise. Replace low-signal facts before handing off.';
    critique.textContent = `Drop ${noise} noisy fact${noise === 1 ? '' : 's'} and recover missing roles: ${missing.join(', ') || 'none'}.`;
  } else if (missing.length) {
    scoreSummary.textContent = 'The packet is clean but incomplete.';
    critique.textContent = `Missing handoff role${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}.`;
  } else {
    scoreSummary.textContent = 'Strong packet. It is compact, complete, and actionable.';
    critique.textContent = 'This handoff gives the next operator enough state to continue without replaying the whole incident timeline.';
  }
}

function resetDrill() {
  selected = new Set();
  renderScenario();
}

async function copyBrief() {
  const scenario = currentScenario();
  const facts = [...selected].map((index) => scenario.facts[index].text);
  const text = [`State Compression Drill: ${scenario.title}`, ...facts.map((fact) => `- ${fact}`), '', critique.textContent].join('\n');
  try {
    await navigator.clipboard.writeText(text);
    scoreSummary.textContent = 'Copied handoff brief.';
  } catch (error) {
    scoreSummary.textContent = 'Clipboard copy failed.';
  }
}

resetButton.addEventListener('click', resetDrill);
nextButton.addEventListener('click', () => {
  scenarioIndex = (scenarioIndex + 1) % scenarios.length;
  resetDrill();
});
copyButton.addEventListener('click', copyBrief);

renderScenario();
