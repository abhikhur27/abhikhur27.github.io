const seedWordsInput = document.getElementById('seed-words');
const branchARulesEl = document.getElementById('branch-a-rules');
const branchBRulesEl = document.getElementById('branch-b-rules');
const runModelBtn = document.getElementById('run-model');
const swapBranchesBtn = document.getElementById('swap-branches');
const copySummaryBtn = document.getElementById('copy-summary');
const loadDemoBtn = document.getElementById('load-demo');
const statusEl = document.getElementById('status');
const rootCountEl = document.getElementById('root-count');
const distanceScoreEl = document.getElementById('distance-score');
const closestPairEl = document.getElementById('closest-pair');
const widestSplitEl = document.getElementById('widest-split');
const insightCopyEl = document.getElementById('insight-copy');
const resultsBody = document.getElementById('results-body');

const soundRules = [
  {
    id: 'grimms-law',
    label: 'Stops Fray',
    detail: 'Initial p/t/k soften toward fricatives, pulling the branch away from harder stop systems.',
    apply: (word) => word.replace(/^p/g, 'f').replace(/^t/g, 'th').replace(/^k/g, 'h'),
  },
  {
    id: 'vowel-fronting',
    label: 'Front Vowels',
    detail: 'Back vowels shift forward after coronal consonants.',
    apply: (word) => word.replace(/([tdsnlr])e/g, '$1i').replace(/([tdsnlr])o/g, '$1e'),
  },
  {
    id: 'final-drop',
    label: 'Trim Finals',
    detail: 'Final vowels erode, leaving tighter codas and shorter words.',
    apply: (word) => word.replace(/[aeiou]$/g, ''),
  },
  {
    id: 'palatal-glide',
    label: 'Palatal Glide',
    detail: 'k and g before front vowels glide toward softer affricates.',
    apply: (word) => word.replace(/k(?=[ie])/g, 'ch').replace(/g(?=[ie])/g, 'j'),
  },
  {
    id: 's-cluster',
    label: 'Simplify s-clusters',
    detail: 'Initial sk/sp/st clusters collapse into smoother starts.',
    apply: (word) => word.replace(/^sk/g, 'sh').replace(/^sp/g, 'f').replace(/^st/g, 'th'),
  },
  {
    id: 'nasal-coloring',
    label: 'Nasal Coloring',
    detail: 'Vowels before n or m lower and broaden.',
    apply: (word) => word.replace(/a(?=[nm])/g, 'o').replace(/e(?=[nm])/g, 'a'),
  },
];

let branchASelection = ['grimms-law', 'final-drop', 'palatal-glide'];
let branchBSelection = ['vowel-fronting', 's-cluster', 'nasal-coloring'];
let lastResults = [];

function renderRuleOptions(container, selection, branchName) {
  container.innerHTML = soundRules
    .map(
      (rule) => `
        <label class="rule-option">
          <input type="checkbox" value="${rule.id}" ${selection.includes(rule.id) ? 'checked' : ''} data-branch="${branchName}">
          <span>
            <strong>${rule.label}</strong>
            <span>${rule.detail}</span>
          </span>
        </label>
      `
    )
    .join('');
}

function syncRuleSelections() {
  branchASelection = Array.from(branchARulesEl.querySelectorAll('input:checked')).map((input) => input.value);
  branchBSelection = Array.from(branchBRulesEl.querySelectorAll('input:checked')).map((input) => input.value);
}

function parseSeedWords() {
  return seedWordsInput.value
    .split(/\r?\n/)
    .map((word) => word.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 24);
}

function applyRulePipeline(word, selection) {
  return selection.reduce((current, ruleId) => {
    const rule = soundRules.find((entry) => entry.id === ruleId);
    return rule ? rule.apply(current) : current;
  }, word);
}

function editDistance(a, b) {
  const rows = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) rows[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) rows[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
    }
  }

  return rows[a.length][b.length];
}

function buildInsight(results) {
  if (!results.length) {
    return 'Add seed words to compare the branches.';
  }

  const averageDistance = results.reduce((sum, entry) => sum + entry.distance, 0) / results.length;
  if (averageDistance >= 4) {
    return 'The branches now read like clearly separate daughter languages. Multiple sound changes are compounding instead of cancelling out.';
  }
  if (averageDistance >= 2) {
    return 'The branches are related but audibly diverging. One or two more high-impact rules would likely produce a much sharper split.';
  }
  return 'The branches still sound close. Right now the model is preserving family resemblance more than forcing a dramatic break.';
}

function renderResults() {
  const seeds = parseSeedWords();
  rootCountEl.textContent = String(seeds.length);

  if (!seeds.length) {
    resultsBody.innerHTML = '<tr><td colspan="4" class="empty">Enter at least one seed word to compute descendants.</td></tr>';
    distanceScoreEl.textContent = '0';
    closestPairEl.textContent = '-';
    widestSplitEl.textContent = '-';
    insightCopyEl.textContent = 'Add seed words to compare the branches.';
    statusEl.textContent = 'No seeds loaded yet.';
    lastResults = [];
    return;
  }

  lastResults = seeds.map((seed) => {
    const branchA = applyRulePipeline(seed, branchASelection);
    const branchB = applyRulePipeline(seed, branchBSelection);
    return {
      seed,
      branchA,
      branchB,
      distance: editDistance(branchA, branchB),
    };
  });

  const totalDistance = lastResults.reduce((sum, entry) => sum + entry.distance, 0);
  const closest = [...lastResults].sort((a, b) => a.distance - b.distance)[0];
  const widest = [...lastResults].sort((a, b) => b.distance - a.distance)[0];

  distanceScoreEl.textContent = (totalDistance / Math.max(1, lastResults.length)).toFixed(1);
  closestPairEl.textContent = `${closest.seed}: ${closest.branchA} / ${closest.branchB}`;
  widestSplitEl.textContent = `${widest.seed}: ${widest.branchA} / ${widest.branchB}`;
  insightCopyEl.textContent = buildInsight(lastResults);

  resultsBody.innerHTML = lastResults
    .map(
      (entry) => `
        <tr>
          <td>${entry.seed}</td>
          <td>${entry.branchA}</td>
          <td>${entry.branchB}</td>
          <td>${entry.distance}</td>
        </tr>
      `
    )
    .join('');

  statusEl.textContent = `Computed ${lastResults.length} descendant pair${lastResults.length === 1 ? '' : 's'}.`;
}

runModelBtn.addEventListener('click', () => {
  syncRuleSelections();
  renderResults();
});

swapBranchesBtn.addEventListener('click', () => {
  const nextA = [...branchBSelection];
  const nextB = [...branchASelection];
  branchASelection = nextA;
  branchBSelection = nextB;
  renderRuleOptions(branchARulesEl, branchASelection, 'a');
  renderRuleOptions(branchBRulesEl, branchBSelection, 'b');
  renderResults();
});

copySummaryBtn.addEventListener('click', async () => {
  const summary = lastResults.length
    ? lastResults.map((entry) => `${entry.seed}: ${entry.branchA} | ${entry.branchB} | distance ${entry.distance}`).join('\n')
    : 'No modeled descendants yet.';

  try {
    await navigator.clipboard.writeText(summary);
    statusEl.textContent = 'Copied the current branch summary.';
  } catch (error) {
    statusEl.textContent = 'Clipboard copy failed in this browser.';
  }
});

loadDemoBtn.addEventListener('click', () => {
  seedWordsInput.value = ['pater', 'treyes', 'kor', 'genu', 'kaput', 'sker', 'domus', 'mel'].join('\n');
  renderResults();
});

branchARulesEl.addEventListener('change', renderResults);
branchBRulesEl.addEventListener('change', renderResults);
seedWordsInput.addEventListener('input', renderResults);

renderRuleOptions(branchARulesEl, branchASelection, 'a');
renderRuleOptions(branchBRulesEl, branchBSelection, 'b');
renderResults();
