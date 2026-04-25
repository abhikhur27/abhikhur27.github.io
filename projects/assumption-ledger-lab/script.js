const scenarios = {
  payments: {
    title: 'Payments cutover',
    copy: 'A payment provider migration is scheduled for Friday. The team has good docs, but hidden contract assumptions can drift faster than anyone admits.',
    assumptions: [
      { id: 'webhook-order', label: 'Webhook ordering still arrives in sequence', owner: 'Platform', confidence: 70, drift: 8, impact: 18, validateCost: 2 },
      { id: 'refund-queue', label: 'Refund queue latency will stay under support SLA', owner: 'Ops', confidence: 66, drift: 7, impact: 16, validateCost: 2 },
      { id: 'tax-mapping', label: 'Tax-region mappings cover every active merchant', owner: 'Finance', confidence: 72, drift: 5, impact: 14, validateCost: 1 },
      { id: 'partner-retry', label: 'Partner retry behavior matches staging', owner: 'Integrations', confidence: 61, drift: 9, impact: 19, validateCost: 3 },
    ],
  },
  campus: {
    title: 'Campus login surge',
    copy: 'Course registration opens in five days. Authentication, downstream APIs, and support scripts all depend on assumptions that were true last semester.',
    assumptions: [
      { id: 'sso-cache', label: 'SSO cache invalidation still behaves under burst login', owner: 'Identity', confidence: 68, drift: 8, impact: 17, validateCost: 2 },
      { id: 'seat-sync', label: 'Seat counts stay consistent between registrar and portal', owner: 'Registrar', confidence: 64, drift: 7, impact: 18, validateCost: 2 },
      { id: 'help-desk', label: 'Help desk macros still match current recovery flow', owner: 'Support', confidence: 74, drift: 4, impact: 12, validateCost: 1 },
      { id: 'rate-limit', label: 'Per-student rate limiting is high enough for peak refresh spam', owner: 'Infra', confidence: 59, drift: 10, impact: 20, validateCost: 3 },
    ],
  },
  robotics: {
    title: 'Field robotics rollout',
    copy: 'A student robotics demo is moving from lab to field conditions. Sensor drift, battery behavior, and recovery scripts were only partially tested outside the building.',
    assumptions: [
      { id: 'gps-noise', label: 'GPS correction remains stable near reflective surfaces', owner: 'Navigation', confidence: 63, drift: 8, impact: 18, validateCost: 2 },
      { id: 'battery-curve', label: 'Battery discharge curve still matches the lab model', owner: 'Embedded', confidence: 67, drift: 7, impact: 17, validateCost: 2 },
      { id: 'failover-script', label: 'Recovery script still works after packet loss', owner: 'Runtime', confidence: 60, drift: 9, impact: 19, validateCost: 3 },
      { id: 'operator-playbook', label: 'Field operators remember the manual override steps', owner: 'Operations', confidence: 77, drift: 4, impact: 11, validateCost: 1 },
    ],
  },
};

const scenarioSelect = document.getElementById('scenario-select');
const scenarioTitle = document.getElementById('scenario-title');
const scenarioCopy = document.getElementById('scenario-copy');
const dayLabel = document.getElementById('day-label');
const hoursLabel = document.getElementById('hours-label');
const trustLabel = document.getElementById('trust-label');
const velocityLabel = document.getElementById('velocity-label');
const riskLabel = document.getElementById('risk-label');
const priorityLabel = document.getElementById('priority-label');
const coachCard = document.getElementById('coach-card');
const ledgerGrid = document.getElementById('ledger-grid');
const reportCard = document.getElementById('report-card');
const finalCard = document.getElementById('final-card');
const eventLog = document.getElementById('event-log');
const endDayBtn = document.getElementById('end-day-btn');
const resetBtn = document.getElementById('reset-btn');

const maxDay = 5;
let state = createState(scenarioSelect.value);

function createState(key) {
  const scenario = scenarios[key];
  return {
    key,
    day: 1,
    hoursLeft: 6,
    trust: 72,
    velocity: 100,
    risk: 18,
    finished: false,
    assumptions: scenario.assumptions.map((item) => ({
      ...item,
      age: 0,
      guardrail: 0,
      validatedToday: false,
    })),
    log: ['Release week opened. Every unchecked assumption is now aging against reality.'],
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function riskScore(assumption) {
  return (100 - assumption.confidence) + assumption.age * 7 + assumption.drift * 2 + assumption.impact - assumption.guardrail * 6;
}

function appendLog(text) {
  state.log.unshift(text);
  state.log = state.log.slice(0, 7);
}

function getPriorityAssumption() {
  return [...state.assumptions].sort((a, b) => riskScore(b) - riskScore(a))[0];
}

function render() {
  const scenario = scenarios[state.key];
  scenarioTitle.textContent = scenario.title;
  scenarioCopy.textContent = scenario.copy;
  dayLabel.textContent = `${Math.min(state.day, maxDay)} / ${maxDay}`;
  hoursLabel.textContent = String(state.hoursLeft);
  trustLabel.textContent = String(Math.round(state.trust));
  velocityLabel.textContent = String(Math.round(state.velocity));
  riskLabel.textContent = String(Math.round(state.risk));

  const priority = getPriorityAssumption();
  priorityLabel.textContent = priority
    ? `Highest risk right now: ${priority.label}`
    : 'All assumptions resolved.';

  coachCard.innerHTML = `
    <p><strong>Coach read:</strong> ${state.finished
      ? 'The release is closed. Read the final posture and reset to try a different scenario.'
      : `You have ${state.hoursLeft} validation hour${state.hoursLeft === 1 ? '' : 's'} left on day ${state.day}. If you ignore ${priority.label.toLowerCase()}, it will age into the riskiest part of the release.`}</p>
    <p><strong>Operating rule:</strong> validation buys confidence, guardrails buy smaller blast radius, and neglect buys incident debt.</p>
  `;

  ledgerGrid.innerHTML = state.assumptions
    .map((assumption) => `
      <article class="assumption-card">
        <div class="assumption-head">
          <div>
            <strong>${assumption.label}</strong>
            <p class="body-copy">Owner: ${assumption.owner}</p>
          </div>
          <span class="badge">Risk ${Math.round(riskScore(assumption))}</span>
        </div>
        <div class="bar"><span style="width:${clamp(assumption.confidence, 0, 100)}%"></span></div>
        <div class="assumption-meta">
          <span>Confidence ${Math.round(assumption.confidence)}%</span>
          <span>Age ${assumption.age} day${assumption.age === 1 ? '' : 's'}</span>
          <span>Drift ${assumption.drift}</span>
          <span>Impact ${assumption.impact}</span>
          <span>Guardrails ${assumption.guardrail}</span>
        </div>
        <div class="assumption-actions">
          <button type="button" data-action="validate" data-id="${assumption.id}" ${state.finished ? 'disabled' : ''}>Validate (${assumption.validateCost}h)</button>
          <button type="button" data-action="guardrail" data-id="${assumption.id}" ${state.finished ? 'disabled' : ''}>Add Guardrail (2h)</button>
        </div>
      </article>
    `)
    .join('');

  reportCard.innerHTML = `
    <p><strong>Release trust:</strong> ${state.trust >= 78 ? 'The team still believes the release story.' : state.trust >= 60 ? 'Trust is holding, but some assumptions are visibly soft.' : 'Trust is eroding because too many claims are being carried on faith.'}</p>
    <p><strong>Delivery pace:</strong> ${state.velocity >= 90 ? 'Momentum is healthy.' : state.velocity >= 72 ? 'Validation work is slowing the schedule but still feels intentional.' : 'The team is burning pace faster than it is reducing uncertainty.'}</p>
    <p><strong>Incident debt:</strong> ${state.risk <= 24 ? 'Risk is contained.' : state.risk <= 42 ? 'A couple of stale assumptions could still flare into support pain.' : 'The release is carrying enough hidden debt to surprise the team in production.'}</p>
  `;

  eventLog.innerHTML = state.log.map((entry) => `<p>${entry}</p>`).join('');
}

function validateAssumption(id) {
  const assumption = state.assumptions.find((item) => item.id === id);
  if (!assumption || state.finished) return;
  if (state.hoursLeft < assumption.validateCost) {
    appendLog(`Not enough hours left to validate "${assumption.label}".`);
    render();
    return;
  }

  state.hoursLeft -= assumption.validateCost;
  assumption.confidence = clamp(assumption.confidence + 16 - assumption.age * 2, 0, 100);
  assumption.age = 0;
  assumption.validatedToday = true;
  state.trust = clamp(state.trust + 4, 0, 100);
  state.velocity = clamp(state.velocity - assumption.validateCost * 1.5, 0, 100);
  appendLog(`Validated "${assumption.label}" and reset its age before it drifted further.`);
  render();
}

function guardrailAssumption(id) {
  const assumption = state.assumptions.find((item) => item.id === id);
  if (!assumption || state.finished) return;
  if (state.hoursLeft < 2) {
    appendLog(`Not enough hours left to guardrail "${assumption.label}".`);
    render();
    return;
  }

  state.hoursLeft -= 2;
  assumption.guardrail = clamp(assumption.guardrail + 1, 0, 3);
  assumption.confidence = clamp(assumption.confidence + 5, 0, 100);
  state.velocity = clamp(state.velocity - 3, 0, 100);
  appendLog(`Added a guardrail to "${assumption.label}" so drift hurts less if it breaks later.`);
  render();
}

function closeDay() {
  if (state.finished) return;

  state.assumptions.forEach((assumption) => {
    if (!assumption.validatedToday) {
      assumption.age += 1;
      assumption.confidence = clamp(
        assumption.confidence - (assumption.drift + assumption.age * 1.5 - assumption.guardrail * 2),
        0,
        100
      );
    }

    if (assumption.confidence < 55) {
      state.risk = clamp(state.risk + Math.max(4, assumption.impact - assumption.guardrail * 4), 0, 100);
      state.trust = clamp(state.trust - 3, 0, 100);
    }

    if (assumption.confidence < 38) {
      state.risk = clamp(state.risk + Math.max(3, assumption.impact - assumption.guardrail * 5), 0, 100);
      state.velocity = clamp(state.velocity - 4, 0, 100);
      appendLog(`"${assumption.label}" drifted hard enough to create visible incident debt.`);
    }

    assumption.validatedToday = false;
  });

  state.day += 1;
  state.hoursLeft = 6;

  if (state.day > maxDay) {
    finishScenario();
  } else {
    appendLog(`Closed day ${state.day - 1}. The ledger rolled forward and unchecked assumptions aged another step.`);
    render();
  }
}

function finishScenario() {
  state.finished = true;
  endDayBtn.disabled = true;
  const grade = state.risk <= 22 && state.trust >= 75
    ? 'Controlled release'
    : state.risk <= 38 && state.trust >= 60
      ? 'Shippable with scars'
      : 'Debt-heavy launch';

  finalCard.classList.remove('hidden');
  finalCard.innerHTML = `
    <p class="eyebrow">Final posture</p>
    <h2>${grade}</h2>
    <p><strong>Trust:</strong> ${Math.round(state.trust)} | <strong>Velocity:</strong> ${Math.round(state.velocity)} | <strong>Incident debt:</strong> ${Math.round(state.risk)}</p>
    <p>${grade === 'Controlled release'
      ? 'You spent validation hours where they actually mattered and kept quiet assumptions from becoming production surprises.'
      : grade === 'Shippable with scars'
        ? 'The release still moves, but some assumptions were carried on optimism long enough to leave support pain behind.'
        : 'Too many claims were trusted after they should have been re-checked, so the launch now owes future operators a messy week.'}</p>
  `;
  appendLog(`Release closed with a "${grade}" posture.`);
  render();
}

ledgerGrid.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const { action, id } = target.dataset;
  if (!action || !id) return;

  if (action === 'validate') validateAssumption(id);
  if (action === 'guardrail') guardrailAssumption(id);
});

scenarioSelect.addEventListener('change', () => {
  state = createState(scenarioSelect.value);
  finalCard.classList.add('hidden');
  finalCard.innerHTML = '';
  endDayBtn.disabled = false;
  render();
});

endDayBtn.addEventListener('click', closeDay);
resetBtn.addEventListener('click', () => {
  state = createState(state.key);
  finalCard.classList.add('hidden');
  finalCard.innerHTML = '';
  endDayBtn.disabled = false;
  render();
});

render();
