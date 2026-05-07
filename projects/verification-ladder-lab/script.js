const scenarioSelect = document.getElementById('scenario-select');
const scenarioCard = document.getElementById('scenario-card');
const budgetStatus = document.getElementById('budget-status');
const actionGrid = document.getElementById('action-grid');
const evidenceScoreEl = document.getElementById('evidence-score');
const trustScoreEl = document.getElementById('trust-score');
const exposureScoreEl = document.getElementById('exposure-score');
const speedScoreEl = document.getElementById('speed-score');
const ledgerBoard = document.getElementById('ledger-board');
const verificationLens = document.getElementById('verification-lens');
const shipCue = document.getElementById('ship-cue');
const resultCard = document.getElementById('result-card');
const copyBriefBtn = document.getElementById('copy-brief');
const resetRunBtn = document.getElementById('reset-run');
const shipButtons = Array.from(document.querySelectorAll('.ship-btn'));

const scenarios = [
  {
    id: 'outage',
    title: 'Campus Outage Rumor',
    claim: 'The outage was caused by a single bad deploy.',
    audience: 'Internal engineering channel',
    deadline: '10 minutes',
    note: 'People want an immediate explanation, but the first rumor came from a stressed responder.',
    truthNeed: { primary: true, second: true, hedge: false, expert: false, narrow: true },
  },
  {
    id: 'policy',
    title: 'Department Policy Change',
    claim: 'Students will need an extra approval step next semester.',
    audience: 'Public student-facing post',
    deadline: '30 minutes',
    note: 'One screenshot suggests the policy changed, but the published handbook has not updated yet.',
    truthNeed: { primary: true, second: false, hedge: true, expert: true, narrow: false },
  },
  {
    id: 'benchmark',
    title: 'Model Benchmark Win',
    claim: 'A new model clearly beats the prior system across realistic workloads.',
    audience: 'Portfolio writeup',
    deadline: 'Same day',
    note: 'The benchmark looks strong, but one workload family was removed from the summary slide.',
    truthNeed: { primary: true, second: true, hedge: true, expert: false, narrow: true },
  },
];

const actions = [
  { id: 'primary', label: 'Check primary source', detail: 'Read the closest authoritative artifact instead of the summary.', effect: { evidence: 28, trust: 8, exposure: -14, speed: -18 } },
  { id: 'second', label: 'Get independent confirmation', detail: 'Cross-check with a second source that could disagree.', effect: { evidence: 22, trust: 10, exposure: -12, speed: -16 } },
  { id: 'expert', label: 'Ask the domain owner', detail: 'Trade time for a sharper interpretation of what the evidence actually means.', effect: { evidence: 20, trust: 9, exposure: -10, speed: -20 } },
  { id: 'narrow', label: 'Narrow the claim', detail: 'Reduce scope so the statement only says what the evidence clearly supports.', effect: { evidence: 8, trust: 12, exposure: -20, speed: -8 } },
  { id: 'hedge', label: 'Draft hedge language', detail: 'Prepare uncertainty language before the claim goes public.', effect: { evidence: 0, trust: 8, exposure: -16, speed: -6 } },
  { id: 'timeline', label: 'Rebuild the timeline', detail: 'Check whether the story still holds when the order of events is explicit.', effect: { evidence: 16, trust: 6, exposure: -10, speed: -14 } },
];

let state = {};

function currentScenario() {
  return scenarios.find((scenario) => scenario.id === state.scenarioId) || scenarios[0];
}

function resetRun() {
  state = {
    scenarioId: scenarioSelect.value || scenarios[0].id,
    budget: 4,
    used: [],
    evidence: 0,
    trust: 50,
    exposure: 65,
    speed: 100,
    result: null,
  };
  render();
}

function useAction(actionId) {
  if (state.budget <= 0 || state.used.includes(actionId)) return;
  const action = actions.find((entry) => entry.id === actionId);
  if (!action) return;
  state.used.push(actionId);
  state.budget -= 1;
  state.evidence = Math.min(100, state.evidence + action.effect.evidence);
  state.trust = Math.min(100, state.trust + action.effect.trust);
  state.exposure = Math.max(0, state.exposure + action.effect.exposure);
  state.speed = Math.max(0, state.speed + action.effect.speed);
  state.result = null;
  render();
}

function scorePosture(posture) {
  const need = currentScenario().truthNeed;
  const used = new Set(state.used);
  let score = state.trust + state.evidence + state.speed - state.exposure;

  if (need.primary && !used.has('primary')) score -= 28;
  if (need.second && !used.has('second')) score -= 18;
  if (need.expert && !used.has('expert')) score -= 16;
  if (need.narrow && !used.has('narrow')) score -= 14;
  if (need.hedge && !used.has('hedge') && posture !== 'hold') score -= 12;

  if (posture === 'publish') {
    score += state.speed >= 60 ? 8 : -4;
    score -= state.exposure >= 45 ? 18 : 0;
  } else if (posture === 'hedge') {
    score += 10 + (used.has('hedge') ? 8 : 0);
    score -= state.evidence < 30 ? 10 : 0;
  } else {
    score += state.evidence < 45 ? 12 : -6;
    score -= state.speed >= 70 ? 10 : 0;
  }

  const verdict = score >= 155 ? 'Strong call' : score >= 120 ? 'Defensible' : score >= 90 ? 'Shaky' : 'Risky';
  const cue =
    posture === 'publish'
      ? 'You chose speed. This only works when the evidence stack is already sturdy.'
      : posture === 'hedge'
        ? 'You bought trust with uncertainty language, but the hedge still needs real evidence behind it.'
        : 'You protected trust, but holding can still cost credibility if the audience needed timely guidance.';

  state.result = { posture, score, verdict, cue };
  render();
}

function buildBrief() {
  const scenario = currentScenario();
  return [
    'Verification Ladder Lab Brief',
    '',
    `Scenario: ${scenario.title}`,
    `Claim: ${scenario.claim}`,
    `Audience: ${scenario.audience}`,
    `Deadline: ${scenario.deadline}`,
    `Checks used: ${state.used.length ? state.used.join(', ') : 'none'}`,
    `Evidence ${state.evidence} | Trust ${state.trust} | Exposure ${state.exposure} | Speed ${state.speed}`,
    state.result ? `Verdict: ${state.result.verdict} (${state.result.score})` : 'Verdict: pending ship decision',
  ].join('\n');
}

async function copyBrief() {
  try {
    await navigator.clipboard.writeText(buildBrief());
    resultCard.innerHTML = '<p><strong>Brief copied.</strong> You can paste the current verification posture into notes or a portfolio walkthrough.</p>';
  } catch (error) {
    resultCard.innerHTML = '<p><strong>Clipboard failed.</strong> The current run is still visible on screen.</p>';
  }
}

function render() {
  const scenario = currentScenario();
  scenarioCard.innerHTML = `
    <p><strong>${scenario.title}</strong></p>
    <p>${scenario.claim}</p>
    <p><strong>Audience:</strong> ${scenario.audience}</p>
    <p><strong>Deadline:</strong> ${scenario.deadline}</p>
    <p>${scenario.note}</p>
  `;

  budgetStatus.textContent = `${state.budget} check${state.budget === 1 ? '' : 's'} remaining`;
  evidenceScoreEl.textContent = String(state.evidence);
  trustScoreEl.textContent = String(state.trust);
  exposureScoreEl.textContent = String(state.exposure);
  speedScoreEl.textContent = String(state.speed);

  actionGrid.innerHTML = actions.map((action) => `
    <button class="action-btn${state.used.includes(action.id) ? ' used' : ''}" type="button" data-action="${action.id}" ${state.used.includes(action.id) || state.budget <= 0 ? 'disabled' : ''}>
      <strong>${action.label}</strong><br>${action.detail}
    </button>
  `).join('');
  actionGrid.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', () => useAction(button.getAttribute('data-action')));
  });

  ledgerBoard.innerHTML = `
    <p><strong>Verification ledger</strong></p>
    <p>${state.used.length ? `Checks spent on ${state.used.join(', ')}.` : 'No checks spent yet.'}</p>
    <p>${state.evidence >= 45 ? 'Your evidence stack is starting to earn a public-facing claim.' : 'You still have more confidence theater than confidence.'}</p>
  `;
  verificationLens.innerHTML = `
    <p><strong>Verification lens</strong></p>
    <p>${state.exposure <= 25 ? 'Exposure is now relatively contained.' : 'Exposure is still high enough that one wrong sentence could outgrow the deadline win.'}</p>
    <p>${state.speed >= 55 ? 'You still have enough speed left to justify publishing today.' : 'You are buying certainty with time, so the hold option is becoming more rational.'}</p>
  `;
  shipCue.innerHTML = `
    <p><strong>Ship cue</strong></p>
    <p>${state.evidence >= 55 && state.exposure <= 28 ? 'Publishing is plausible if the audience truly needs a fast answer.' : state.evidence >= 32 ? 'A hedged release is currently the safest aggressive move.' : 'Holding for more evidence is still the least embarrassing outcome.'}</p>
  `;
  resultCard.innerHTML = state.result
    ? `<p><strong>${state.result.verdict}</strong> on a ${state.result.posture} posture.</p><p>Score ${state.result.score}.</p><p>${state.result.cue}</p>`
    : '<p><strong>No ship decision yet.</strong> Spend checks, then compare publish, hedge, and hold postures.</p>';
}

scenarioSelect.innerHTML = scenarios.map((scenario) => `<option value="${scenario.id}">${scenario.title}</option>`).join('');
scenarioSelect.addEventListener('change', () => {
  state.scenarioId = scenarioSelect.value;
  resetRun();
});
shipButtons.forEach((button) => button.addEventListener('click', () => scorePosture(button.dataset.posture)));
copyBriefBtn.addEventListener('click', copyBrief);
resetRunBtn.addEventListener('click', resetRun);
resetRun();
