const offerBody = document.getElementById('offer-body');
const addOfferButton = document.getElementById('add-offer');
const recalculateButton = document.getElementById('recalculate');
const loadSampleButton = document.getElementById('load-sample');
const copyBriefButton = document.getElementById('copy-brief');
const commuteValueInput = document.getElementById('commute-value');
const tripsPerWeekInput = document.getElementById('trips-per-week');
const riskWeightInput = document.getElementById('risk-weight');
const statusEl = document.getElementById('status');
const winnerNameEl = document.getElementById('winner-name');
const winnerCostEl = document.getElementById('winner-cost');
const winnerCashEl = document.getElementById('winner-cash');
const trapSummaryEl = document.getElementById('trap-summary');
const decisionSummaryEl = document.getElementById('decision-summary');
const resultsEl = document.getElementById('results');

const riskOptions = [
  { key: 'strict', label: 'Strict renewal risk', weight: 1 },
  { key: 'sublet', label: 'Weak sublet flexibility', weight: 1 },
  { key: 'maintenance', label: 'Maintenance trust issue', weight: 2 },
];

const sampleOffers = [
  {
    name: 'Northside Unit A',
    rent: 1425,
    months: 12,
    moveInCash: 1700,
    monthlyExtras: 165,
    concession: 700,
    commuteMinutes: 26,
    risks: ['sublet'],
  },
  {
    name: 'Station Lofts',
    rent: 1495,
    months: 12,
    moveInCash: 1100,
    monthlyExtras: 95,
    concession: 1200,
    commuteMinutes: 14,
    risks: [],
  },
  {
    name: 'Creekline Flats',
    rent: 1360,
    months: 10,
    moveInCash: 2100,
    monthlyExtras: 180,
    concession: 0,
    commuteMinutes: 34,
    risks: ['strict', 'maintenance'],
  },
];

let offers = [];

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function setStatus(message) {
  statusEl.textContent = message;
}

function cloneOffers(source) {
  return source.map((offer) => ({ ...offer, risks: [...offer.risks] }));
}

function renderOffers() {
  offerBody.innerHTML = offers
    .map(
      (offer, index) => `
        <tr>
          <td><input data-field="name" data-index="${index}" value="${offer.name}"></td>
          <td><input data-field="rent" data-index="${index}" type="number" min="0" step="1" value="${offer.rent}"></td>
          <td><input data-field="months" data-index="${index}" type="number" min="1" step="1" value="${offer.months}"></td>
          <td><input data-field="moveInCash" data-index="${index}" type="number" min="0" step="1" value="${offer.moveInCash}"></td>
          <td><input data-field="monthlyExtras" data-index="${index}" type="number" min="0" step="1" value="${offer.monthlyExtras}"></td>
          <td><input data-field="concession" data-index="${index}" type="number" min="0" step="1" value="${offer.concession}"></td>
          <td><input data-field="commuteMinutes" data-index="${index}" type="number" min="0" step="1" value="${offer.commuteMinutes}"></td>
          <td class="risk-cell">
            ${riskOptions
              .map(
                (risk) => `
                  <label class="risk-option">
                    <input data-risk="${risk.key}" data-index="${index}" type="checkbox" ${offer.risks.includes(risk.key) ? 'checked' : ''}>
                    <span>${risk.label}</span>
                  </label>
                `
              )
              .join('')}
          </td>
        </tr>
      `
    )
    .join('');
}

function getAssumptions() {
  return {
    commuteValue: Number(commuteValueInput.value) || 0,
    tripsPerWeek: Number(tripsPerWeekInput.value) || 0,
    riskWeight: Number(riskWeightInput.value) || 0,
  };
}

function computeOfferMetrics(offer, assumptions) {
  const commuteHoursPerMonth = (offer.commuteMinutes * assumptions.tripsPerWeek * 4.33) / 60;
  const commuteCost = commuteHoursPerMonth * assumptions.commuteValue;
  const concessionMonthly = offer.concession / Math.max(1, offer.months);
  const riskPenalty = offer.risks.reduce((sum, key) => {
    const risk = riskOptions.find((entry) => entry.key === key);
    return sum + (risk ? risk.weight * assumptions.riskWeight : 0);
  }, 0);
  const trueMonthly = offer.rent + offer.monthlyExtras + commuteCost + riskPenalty - concessionMonthly;

  return {
    ...offer,
    commuteCost,
    concessionMonthly,
    riskPenalty,
    trueMonthly,
  };
}

function computeResults() {
  const assumptions = getAssumptions();
  return offers
    .map((offer) => computeOfferMetrics(offer, assumptions))
    .sort((left, right) => left.trueMonthly - right.trueMonthly);
}

function renderResults() {
  const results = computeResults();
  if (!results.length) {
    resultsEl.innerHTML = '<p class="warning">Add at least one offer to compare.</p>';
    return;
  }

  const winner = results[0];
  const runnerUp = results[1];
  const hiddenCostLeader = [...results].sort((left, right) => right.commuteCost + right.riskPenalty - (left.commuteCost + left.riskPenalty))[0];

  winnerNameEl.textContent = winner.name;
  winnerCostEl.textContent = formatMoney(winner.trueMonthly);
  winnerCashEl.textContent = formatMoney(winner.moveInCash);
  trapSummaryEl.textContent = `${hiddenCostLeader.name}: ${formatMoney(hiddenCostLeader.commuteCost + hiddenCostLeader.riskPenalty)}/mo hidden drag`;

  decisionSummaryEl.innerHTML = `
    <strong>${winner.name}</strong> is the current winner because its effective monthly cost is ${formatMoney(winner.trueMonthly)}
    ${runnerUp ? `, beating ${runnerUp.name} by ${formatMoney(runnerUp.trueMonthly - winner.trueMonthly)}/month.` : '.'}
    ${winner.moveInCash > 1800 ? `<span class="warning">Watch the move-in cash hit.</span>` : 'Its upfront cash hit stays relatively contained.'}
  `;

  resultsEl.innerHTML = results
    .map(
      (result, index) => `
        <article class="result-card ${index === 0 ? 'top' : ''}">
          <div class="result-head">
            <div>
              <h3>${index + 1}. ${result.name}</h3>
              <p class="result-notes">Sticker rent ${formatMoney(result.rent)} over ${result.months} months.</p>
            </div>
            <div class="result-money">${formatMoney(result.trueMonthly)}/mo</div>
          </div>
          <div class="result-metrics">
            <span class="result-pill">Move-in cash ${formatMoney(result.moveInCash)}</span>
            <span class="result-pill">Commute drag ${formatMoney(result.commuteCost)}/mo</span>
            <span class="result-pill">Monthly extras ${formatMoney(result.monthlyExtras)}</span>
            <span class="result-pill">Concession relief ${formatMoney(result.concessionMonthly)}/mo</span>
            <span class="result-pill">Risk penalty ${formatMoney(result.riskPenalty)}/mo</span>
          </div>
        </article>
      `
    )
    .join('');
}

function recalculate() {
  renderResults();
  setStatus('Updated the lease ranking using the current assumptions.');
}

function loadSampleOffers() {
  offers = cloneOffers(sampleOffers);
  renderOffers();
  renderResults();
  setStatus('Loaded a three-offer lease comparison sample.');
}

function readOfferInputs() {
  offerBody.querySelectorAll('input[data-field]').forEach((input) => {
    const index = Number(input.dataset.index);
    const field = input.dataset.field;
    if (!offers[index]) return;
    offers[index][field] = field === 'name' ? input.value.trim() || `Offer ${index + 1}` : Number(input.value) || 0;
  });

  offerBody.querySelectorAll('input[data-risk]').forEach((input) => {
    const index = Number(input.dataset.index);
    const riskKey = input.dataset.risk;
    if (!offers[index]) return;
    const nextRisks = new Set(offers[index].risks);
    if (input.checked) {
      nextRisks.add(riskKey);
    } else {
      nextRisks.delete(riskKey);
    }
    offers[index].risks = [...nextRisks];
  });
}

function addOffer() {
  readOfferInputs();
  offers.push({
    name: `Offer ${offers.length + 1}`,
    rent: 1400,
    months: 12,
    moveInCash: 1200,
    monthlyExtras: 120,
    concession: 0,
    commuteMinutes: 20,
    risks: [],
  });
  renderOffers();
  setStatus('Added a blank offer row.');
}

function buildDecisionBrief() {
  const results = computeResults();
  if (!results.length) {
    return 'Lease Decision Guide\n\nAdd at least one offer to compare.';
  }

  return [
    'Lease Decision Guide',
    '',
    `Generated: ${new Date().toLocaleString()}`,
    `Winner: ${results[0].name} at ${formatMoney(results[0].trueMonthly)}/mo true monthly cost`,
    '',
    ...results.map(
      (result, index) =>
        `${index + 1}. ${result.name} | true monthly ${formatMoney(result.trueMonthly)} | move-in cash ${formatMoney(result.moveInCash)} | commute drag ${formatMoney(result.commuteCost)}/mo | risk penalty ${formatMoney(result.riskPenalty)}/mo`
    ),
  ].join('\n');
}

offerBody.addEventListener('input', () => {
  readOfferInputs();
  renderResults();
});

addOfferButton.addEventListener('click', addOffer);
recalculateButton.addEventListener('click', () => {
  readOfferInputs();
  recalculate();
});
loadSampleButton.addEventListener('click', loadSampleOffers);
copyBriefButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(buildDecisionBrief());
    setStatus('Copied the lease decision brief.');
  } catch (error) {
    setStatus('Clipboard copy failed in this environment.');
  }
});
[commuteValueInput, tripsPerWeekInput, riskWeightInput].forEach((input) => {
  input.addEventListener('input', recalculate);
});

loadSampleOffers();
