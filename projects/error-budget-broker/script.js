const budgetValue = document.getElementById('budget-value');
const trustValue = document.getElementById('trust-value');
const growthValue = document.getElementById('growth-value');
const strainValue = document.getElementById('strain-value');
const statusEl = document.getElementById('status');
const dayTitle = document.getElementById('day-title');
const dayMeta = document.getElementById('day-meta');
const requestList = document.getElementById('request-list');
const briefTitle = document.getElementById('brief-title');
const briefSummary = document.getElementById('brief-summary');
const briefPoints = document.getElementById('brief-points');
const eventLog = document.getElementById('event-log');
const verdictEl = document.getElementById('verdict');
const resetBtn = document.getElementById('reset-btn');
const copyBriefBtn = document.getElementById('copy-brief-btn');

const requestDeck = [
  {
    id: 'checkout',
    title: 'Checkout speed rewrite',
    lane: 'Growth',
    prompt: 'Product wants to push a faster checkout path before Friday campaign traffic.',
    budgetCost: 16,
    trustDelta: -2,
    growthDelta: 18,
    strainDelta: 5,
    holdText: 'Deferring slows campaign upside but keeps headroom intact.',
  },
  {
    id: 'retry',
    title: 'Retry storm fix',
    lane: 'Reliability',
    prompt: 'Platform found a queue retry loop that will amplify any downstream wobble.',
    budgetCost: 6,
    trustDelta: 9,
    growthDelta: 2,
    strainDelta: -10,
    holdText: 'Deferring keeps the latent blast radius on the board for later days.',
  },
  {
    id: 'search',
    title: 'Search relevance launch',
    lane: 'Growth',
    prompt: 'Search ranking improvements are ready, but they add new cache invalidation paths.',
    budgetCost: 12,
    trustDelta: -1,
    growthDelta: 13,
    strainDelta: 4,
    holdText: 'Deferring leaves conversion on the table but avoids fresh cache churn.',
  },
  {
    id: 'alerting',
    title: 'Noisy alert cleanup',
    lane: 'Ops',
    prompt: 'On-call is burning time on low-value pages and wants one day to clean the alert bundle.',
    budgetCost: 4,
    trustDelta: 4,
    growthDelta: 0,
    strainDelta: -7,
    holdText: 'Deferring means another day of pager fatigue and slower incident reads.',
  },
  {
    id: 'partner',
    title: 'Partner API contract shift',
    lane: 'Revenue',
    prompt: 'A partner integration will unlock revenue, but the fallback path is barely tested.',
    budgetCost: 18,
    trustDelta: -5,
    growthDelta: 20,
    strainDelta: 7,
    holdText: 'Deferring frustrates the partner team but preserves operational room.',
  },
  {
    id: 'rollout',
    title: 'Feature-flag cleanup',
    lane: 'Platform',
    prompt: 'Old flags are stacking up and hiding which behavior is truly live in production.',
    budgetCost: 5,
    trustDelta: 5,
    growthDelta: 1,
    strainDelta: -6,
    holdText: 'Deferring keeps cognitive debt in the system and makes incident reads noisier.',
  },
  {
    id: 'copy',
    title: 'Promise-setting status page refresh',
    lane: 'Trust',
    prompt: 'Support wants clearer incident copy and more honest recovery ETAs before the next wobble.',
    budgetCost: 3,
    trustDelta: 7,
    growthDelta: 0,
    strainDelta: -2,
    holdText: 'Deferring risks another trust hit if customers feel surprised during the next issue.',
  },
  {
    id: 'autoscale',
    title: 'Autoscaling floor increase',
    lane: 'Capacity',
    prompt: 'Infra proposes more baseline capacity to blunt tail spikes during uncertain traffic.',
    budgetCost: 8,
    trustDelta: 5,
    growthDelta: 3,
    strainDelta: -4,
    holdText: 'Deferring saves budget now but keeps the spike risk concentrated in peak windows.',
  },
];

const state = {
  day: 1,
  budget: 42,
  trust: 66,
  growth: 12,
  strain: 28,
  requests: [],
  log: ['Week opened with 42 minutes of error budget and one release slot per day.'],
  finished: false,
};

function cloneRequest(base) {
  return { ...base };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pickRequests() {
  const offset = (state.day - 1) * 2;
  return [
    cloneRequest(requestDeck[offset % requestDeck.length]),
    cloneRequest(requestDeck[(offset + 3) % requestDeck.length]),
    cloneRequest(requestDeck[(offset + 5) % requestDeck.length]),
  ];
}

function renderStats() {
  budgetValue.textContent = `${state.budget} min`;
  trustValue.textContent = String(state.trust);
  growthValue.textContent = String(state.growth);
  strainValue.textContent = String(state.strain);
}

function renderBrief() {
  const safest = [...state.requests].sort((a, b) => a.budgetCost - b.budgetCost)[0];
  const biggestGrowth = [...state.requests].sort((a, b) => b.growthDelta - a.growthDelta)[0];
  const trustShield = [...state.requests].sort((a, b) => b.trustDelta - a.trustDelta)[0];
  const riskBand = state.budget <= 12 || state.trust <= 45 ? 'tight-rope week' : state.strain >= 45 ? 'ops-heavy week' : 'still maneuverable';

  briefTitle.textContent = `Day ${state.day} is a ${riskBand}.`;
  briefSummary.textContent = 'Each funded request spends error budget immediately. Deferred pressure comes back later through trust decay, strain, or missed growth.';
  briefPoints.innerHTML = [
    `<li>Safest spend: <strong>${safest.title}</strong> costs ${safest.budgetCost} budget minutes.</li>`,
    `<li>Biggest upside: <strong>${biggestGrowth.title}</strong> adds ${biggestGrowth.growthDelta} growth points if it lands cleanly.</li>`,
    `<li>Trust protection: <strong>${trustShield.title}</strong> gives the strongest customer-facing cover.</li>`,
    `<li>Headroom rule: once budget falls below 10, every extra strain spike starts converting into direct trust loss.</li>`,
  ].join('');
}

function renderRequests() {
  dayTitle.textContent = `Day ${state.day} Requests`;
  dayMeta.textContent = state.finished
    ? 'Week closed. Review the final tradeoffs below.'
    : 'Choose one request to fund. The other two defer into later pressure.';

  requestList.innerHTML = state.requests
    .map(
      (request) => `
        <article class="request-card">
          <p class="eyebrow">${request.lane}</p>
          <h3>${request.title}</h3>
          <p>${request.prompt}</p>
          <div class="chip-row">
            <span class="chip">Budget ${request.budgetCost}</span>
            <span class="chip gain">Growth +${request.growthDelta}</span>
            <span class="chip ${request.trustDelta >= 0 ? 'gain' : 'risk'}">Trust ${request.trustDelta >= 0 ? '+' : ''}${request.trustDelta}</span>
            <span class="chip ${request.strainDelta <= 0 ? 'gain' : 'risk'}">Strain ${request.strainDelta >= 0 ? '+' : ''}${request.strainDelta}</span>
          </div>
          <p class="meta">If deferred: ${request.holdText}</p>
          <div class="request-actions">
            <button type="button" data-action="fund" data-id="${request.id}" ${state.finished ? 'disabled' : ''}>Fund This</button>
            <button type="button" data-action="defer" data-id="${request.id}" ${state.finished ? 'disabled' : ''}>Defer It</button>
          </div>
        </article>
      `
    )
    .join('');

  requestList.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => handleRequestAction(button.dataset.id, button.dataset.action));
  });
}

function renderLog() {
  eventLog.innerHTML = state.log.slice(0, 8).map((entry) => `<p>${entry}</p>`).join('');
}

function renderVerdict() {
  if (!state.finished) {
    verdictEl.textContent = 'Finish the week to generate a final operating read.';
    return;
  }

  const outcome =
    state.trust >= 72 && state.growth >= 45 && state.budget >= 0
      ? 'Strong week: you shipped without spending customer trust like a disposable resource.'
      : state.trust < 45
        ? 'Trust burn week: growth may have moved, but the org taught customers to expect turbulence.'
        : state.budget < 0
          ? 'Budget blowout: you spent more reliability headroom than the week could safely carry.'
          : 'Mixed week: some gains landed, but the org still leaked confidence or operator calm.';

  verdictEl.innerHTML = `
    <p><strong>${outcome}</strong></p>
    <p>Final scoreline: trust ${state.trust}, growth ${state.growth}, ops strain ${state.strain}, budget ${state.budget}.</p>
    <p>Best demos happen when you compare one aggressive week against one defensive week and explain why the budget moved first or trust moved first.</p>
  `;
}

function simulateDeferredPressure(chosenId) {
  state.requests
    .filter((request) => request.id !== chosenId)
    .forEach((request) => {
      state.trust = clamp(state.trust - Math.max(1, Math.round((request.growthDelta + Math.max(0, -request.trustDelta)) / 8)), 0, 100);
      state.strain = clamp(state.strain + Math.max(1, Math.round(request.budgetCost / 5)), 0, 100);
    });
}

function simulateIncident() {
  const stressIndex = state.strain + Math.max(0, 12 - state.budget);
  if (stressIndex < 38) {
    state.log.unshift(`Day ${state.day}: no incident fired. Headroom held.`);
    return;
  }

  if (stressIndex >= 62) {
    state.budget -= 8;
    state.trust = clamp(state.trust - 9, 0, 100);
    state.strain = clamp(state.strain + 6, 0, 100);
    state.log.unshift(`Day ${state.day}: a major incident hit once strain outran headroom. Budget -8, trust -9.`);
    return;
  }

  state.budget -= 4;
  state.trust = clamp(state.trust - 4, 0, 100);
  state.strain = clamp(state.strain + 2, 0, 100);
  state.log.unshift(`Day ${state.day}: a minor wobble consumed budget and chipped trust.`);
}

function nextDay() {
  if (state.day >= 5) {
    state.finished = true;
    statusEl.textContent = 'Week complete. Review the verdict and copy the brief for a shareable walkthrough.';
    render();
    return;
  }

  state.day += 1;
  state.requests = pickRequests();
  statusEl.textContent = `Day ${state.day}. Choose one request to fund.`;
  render();
}

function handleRequestAction(requestId, action) {
  if (state.finished) return;
  const request = state.requests.find((entry) => entry.id === requestId);
  if (!request) return;

  if (action === 'defer') {
    state.trust = clamp(state.trust - 2, 0, 100);
    state.strain = clamp(state.strain + 3, 0, 100);
    state.log.unshift(`Day ${state.day}: deferred ${request.title}. Short-term caution cost a little trust and operator patience.`);
    statusEl.textContent = `${request.title} deferred. Pick one request to actually fund today.`;
    render();
    return;
  }

  state.budget -= request.budgetCost;
  state.trust = clamp(state.trust + request.trustDelta, 0, 100);
  state.growth = clamp(state.growth + request.growthDelta, 0, 100);
  state.strain = clamp(state.strain + request.strainDelta, 0, 100);
  state.log.unshift(
    `Day ${state.day}: funded ${request.title}. Budget ${request.budgetCost}, trust ${request.trustDelta >= 0 ? '+' : ''}${request.trustDelta}, growth +${request.growthDelta}, strain ${request.strainDelta >= 0 ? '+' : ''}${request.strainDelta}.`
  );
  simulateDeferredPressure(request.id);
  simulateIncident();
  nextDay();
}

function buildWeekBrief() {
  return [
    'Error Budget Broker Week Brief',
    '',
    `Day reached: ${state.day}`,
    `Budget left: ${state.budget}`,
    `Trust: ${state.trust}`,
    `Growth shipped: ${state.growth}`,
    `Ops strain: ${state.strain}`,
    `Status: ${verdictEl.textContent || 'Week in progress'}`,
    '',
    'Recent consequence tape:',
    ...state.log.slice(0, 6).map((entry) => `- ${entry}`),
  ].join('\n');
}

function resetState() {
  state.day = 1;
  state.budget = 42;
  state.trust = 66;
  state.growth = 12;
  state.strain = 28;
  state.finished = false;
  state.log = ['Week opened with 42 minutes of error budget and one release slot per day.'];
  state.requests = pickRequests();
  statusEl.textContent = 'Day 1. Choose one request to fund.';
  render();
}

function render() {
  renderStats();
  renderBrief();
  renderRequests();
  renderLog();
  renderVerdict();
}

resetBtn.addEventListener('click', resetState);
copyBriefBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(buildWeekBrief());
    statusEl.textContent = 'Copied the current week brief.';
  } catch (error) {
    statusEl.textContent = 'Clipboard copy failed in this environment.';
  }
});

resetState();
