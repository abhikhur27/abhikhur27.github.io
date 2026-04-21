const budgetHours = 18;
const cards = Array.from(document.querySelectorAll('.package-card'));
const hoursLeftEl = document.getElementById('hours-left');
const riskRemovedEl = document.getElementById('risk-removed');
const breakageLoadEl = document.getElementById('breakage-load');
const decisionGradeEl = document.getElementById('decision-grade');
const briefTitleEl = document.getElementById('brief-title');
const briefCopyEl = document.getElementById('brief-copy');
const chosenListEl = document.getElementById('chosen-list');
const resetBtn = document.getElementById('reset-btn');

function selectedPackages() {
  return cards.filter((card) => card.classList.contains('selected'));
}

function scoreSelection() {
  const chosen = selectedPackages();
  const totals = chosen.reduce((sum, card) => {
    sum.hours += Number(card.dataset.hours);
    sum.risk += Number(card.dataset.risk);
    sum.breakage += Number(card.dataset.breakage);
    return sum;
  }, { hours: 0, risk: 0, breakage: 0 });

  const hoursLeft = budgetHours - totals.hours;
  const net = totals.risk - totals.breakage;
  const grade = hoursLeft < 0
    ? 'Overloaded'
    : net >= 38
      ? 'Ship'
      : totals.risk >= 45 && totals.breakage <= 42
        ? 'Review'
        : 'Thin';

  hoursLeftEl.textContent = String(hoursLeft);
  riskRemovedEl.textContent = String(totals.risk);
  breakageLoadEl.textContent = String(totals.breakage);
  decisionGradeEl.textContent = grade;

  if (!chosen.length) {
    briefTitleEl.textContent = 'No package selected yet.';
    briefCopyEl.textContent = 'Select upgrades until the release window is full enough to matter but not overloaded with compatibility risk.';
  } else if (hoursLeft < 0) {
    briefTitleEl.textContent = 'The window is overbooked.';
    briefCopyEl.textContent = 'Drop the lowest-risk or highest-breakage item before this turns into a release freeze.';
  } else if (grade === 'Ship') {
    briefTitleEl.textContent = 'This is a defensible maintenance slice.';
    briefCopyEl.textContent = 'The selected set removes more risk than it creates and still leaves room for verification.';
  } else {
    briefTitleEl.textContent = 'The tradeoff is still soft.';
    briefCopyEl.textContent = 'Add a security-heavy item or remove a compatibility-heavy item to sharpen the release story.';
  }

  chosenListEl.innerHTML = chosen.length
    ? chosen.map((card) => `<span>${card.dataset.lane}: ${card.dataset.name}</span>`).join('')
    : '<span>Waiting for package choices</span>';
}

cards.forEach((card) => {
  const button = card.querySelector('button');
  button.addEventListener('click', () => {
    card.classList.toggle('selected');
    button.textContent = card.classList.contains('selected') ? 'Selected' : 'Select';
    scoreSelection();
  });
});

resetBtn.addEventListener('click', () => {
  cards.forEach((card) => {
    card.classList.remove('selected');
    card.querySelector('button').textContent = 'Select';
  });
  scoreSelection();
});

scoreSelection();
