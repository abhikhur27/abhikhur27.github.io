const scenarios = [
  {
    id: 'likes',
    title: 'Double-like race',
    context: 'A user hammers the like button on a high-latency connection. Two POST requests leave the browser before the first acknowledgement returns.',
    symptom: 'The counter jumps twice, then occasionally snaps back after a refresh.',
    pressure: 'Fast feedback matters because this is a social action, but trust falls apart if the count lies.',
    priority: 'Keep the UI responsive without letting duplicate writes leak into the final count.',
    timeline: [
      't+0 ms: first like request leaves the client.',
      't+80 ms: user taps again because the button still looks active.',
      't+210 ms: second request reaches the API before the first commit clears.',
      't+420 ms: both responses return and the product state diverges.'
    ],
    options: [
      {
        label: 'Disable the button until the first request resolves',
        tag: 'UI lock',
        impact: { correctness: 3, latency: -1, complexity: 2, trust: 2 },
        verdict: 'Safe and boring.',
        detail: 'A temporary UI lock prevents duplicate writes cleanly, but it slows down the interaction and can feel sticky on poor connections.',
        notes: ['Best when repeat taps are not meaningful.', 'Good baseline if you do not need instant affordances.'],
      },
      {
        label: 'Use an idempotency key for the action',
        tag: 'Write guard',
        impact: { correctness: 4, latency: 1, complexity: 1, trust: 3 },
        verdict: 'Best fit.',
        detail: 'The request stays fast for the user, and the backend collapses duplicates into one write. This is the strongest trust-preserving choice here.',
        notes: ['Needs server support.', 'Still allows optimistic feedback without duplicate persistence.'],
      },
      {
        label: 'Let both requests through and reconcile later',
        tag: 'Eventually consistent',
        impact: { correctness: -3, latency: 2, complexity: -2, trust: -3 },
        verdict: 'Too risky.',
        detail: 'The interaction feels immediate, but the user sees a count they cannot trust. “Fix it later” is not a real strategy for a visible counter.',
        notes: ['Creates avoidable trust debt.', 'Makes analytics harder to reason about too.'],
      },
    ],
  },
  {
    id: 'search',
    title: 'Out-of-order search results',
    context: 'A typeahead sends a new request on every keystroke. Slower responses for earlier queries arrive after newer ones.',
    symptom: 'The UI shows results for an older term after the user has already typed something more specific.',
    pressure: 'Search should feel instant, but stale results are jarring and hard to notice in logs.',
    priority: 'Guarantee that only the latest intent is allowed to paint the UI.',
    timeline: [
      't+0 ms: query “ra” goes out.',
      't+50 ms: user types again and query “race” leaves the client.',
      't+190 ms: “race” returns first and renders.',
      't+310 ms: “ra” resolves later and overwrites the list.'
    ],
    options: [
      {
        label: 'Track a request token and ignore stale responses',
        tag: 'Latest wins',
        impact: { correctness: 4, latency: 2, complexity: 1, trust: 3 },
        verdict: 'Best fit.',
        detail: 'A monotonic token makes the render layer deterministic. The user keeps snappy feedback and stale results cannot repaint the interface.',
        notes: ['Great for read-only queries.', 'Pairs well with abortable fetches for extra efficiency.'],
      },
      {
        label: 'Debounce input by 400 ms',
        tag: 'Traffic reduction',
        impact: { correctness: 2, latency: -2, complexity: 2, trust: 1 },
        verdict: 'Helps, but incomplete.',
        detail: 'Debouncing reduces request volume, but it does not fully solve stale paints if multiple in-flight requests still exist.',
        notes: ['Good supporting tactic, not the only guardrail.', 'Can make the UI feel sluggish if overused.'],
      },
      {
        label: 'Accept whichever response arrives last on the network',
        tag: 'No ordering',
        impact: { correctness: -4, latency: 2, complexity: 0, trust: -3 },
        verdict: 'Incorrect.',
        detail: 'Network order is not intent order. This choice guarantees a confusing, flickering interface under real latency variance.',
        notes: ['Fails exactly when the network gets noisy.', 'Turns search relevance into a race.'],
      },
    ],
  },
  {
    id: 'seats',
    title: 'Reservation overlap',
    context: 'Two students try to grab the last office-hours seat. The frontend shows availability optimistically, but the backend commit is not atomic.',
    symptom: 'Both users see a success toast, then one booking disappears later.',
    pressure: 'A little friction is acceptable; false confirmations are not.',
    priority: 'Make the reservation outcome authoritative at write time.',
    timeline: [
      't+0 ms: seat count shows “1 left” to both users.',
      't+90 ms: both clients submit reserve requests.',
      't+180 ms: the database accepts both before the counter sync catches up.',
      't+450 ms: one reservation is rolled back after conflict detection.'
    ],
    options: [
      {
        label: 'Use a server-side mutex or transaction guard',
        tag: 'Critical section',
        impact: { correctness: 4, latency: 0, complexity: 1, trust: 4 },
        verdict: 'Best fit.',
        detail: 'The write path becomes authoritative. The user might wait a little longer, but the system never promises a seat it cannot hold.',
        notes: ['The right answer when inventory is scarce.', 'Prefer correctness over cosmetic speed.'],
      },
      {
        label: 'Optimistically reserve and show an apology if it fails',
        tag: 'Rollback',
        impact: { correctness: 0, latency: 2, complexity: -1, trust: -2 },
        verdict: 'Too fragile.',
        detail: 'This keeps the flow feeling fast, but a false success message is costly when the user believes the seat is theirs.',
        notes: ['Usable for low-stakes actions, not for scarce inventory.', 'Apology UX does not erase trust loss.'],
      },
      {
        label: 'Refresh inventory every second and hope collisions are rare',
        tag: 'Polling',
        impact: { correctness: -3, latency: 1, complexity: 0, trust: -2 },
        verdict: 'Not enough.',
        detail: 'Polling reduces obvious staleness, but it never prevents simultaneous writes against the same resource.',
        notes: ['Good for read freshness, not write serialization.', 'The bug still exists.'],
      },
    ],
  },
  {
    id: 'autosave',
    title: 'Autosave conflict',
    context: 'A notes editor autosaves in the background while the same document is open on another device.',
    symptom: 'Edits silently overwrite one another depending on which autosave lands last.',
    pressure: 'People want continuous saving, but silent loss is worse than a visible interruption.',
    priority: 'Protect user work and make conflicts explicit before destructive writes commit.',
    timeline: [
      't+0 ms: laptop and tablet both load version 12 of the note.',
      't+25 s: laptop autosaves version 13 with a paragraph rewrite.',
      't+28 s: tablet autosaves an old draft fragment built from version 12.',
      't+29 s: the server accepts the older base without surfacing the conflict.'
    ],
    options: [
      {
        label: 'Require a version check and show a merge prompt on conflict',
        tag: 'Versioned write',
        impact: { correctness: 4, latency: -1, complexity: 1, trust: 4 },
        verdict: 'Best fit.',
        detail: 'A version gate keeps saves safe. Users may need one extra merge step, but the product does not silently destroy work.',
        notes: ['The most honest choice for collaborative or multi-device editing.', 'Protects the user’s mental model of autosave.'],
      },
      {
        label: 'Always accept the latest timestamp as the winner',
        tag: 'Last write wins',
        impact: { correctness: -3, latency: 2, complexity: 2, trust: -4 },
        verdict: 'Fast but dangerous.',
        detail: 'Timestamp ordering is easy to implement and feels invisible until it burns someone. Silent overwrite is a severe trust failure for writing tools.',
        notes: ['Common, but usually the wrong default for authored content.', 'Only acceptable when data can be recomputed cheaply.'],
      },
      {
        label: 'Queue autosaves locally and retry forever',
        tag: 'Offline queue',
        impact: { correctness: 0, latency: 1, complexity: 0, trust: 0 },
        verdict: 'Incomplete.',
        detail: 'A queue helps resilience during disconnects, but without version checks it still replays stale writes into newer content.',
        notes: ['Useful complement, not sufficient conflict policy.', 'Solve ordering before retry policy.'],
      },
    ],
  },
];

const scenarioTitle = document.getElementById('scenario-title');
const scenarioProgress = document.getElementById('scenario-progress');
const scenarioContext = document.getElementById('scenario-context');
const scenarioSymptom = document.getElementById('scenario-symptom');
const scenarioPressure = document.getElementById('scenario-pressure');
const scenarioPriority = document.getElementById('scenario-priority');
const scenarioTimeline = document.getElementById('scenario-timeline');
const optionsGrid = document.getElementById('options-grid');
const scoreCorrectness = document.getElementById('score-correctness');
const scoreLatency = document.getElementById('score-latency');
const scoreComplexity = document.getElementById('score-complexity');
const scoreTrust = document.getElementById('score-trust');
const scoreSummary = document.getElementById('score-summary');
const resultTitle = document.getElementById('result-title');
const resultDetail = document.getElementById('result-detail');
const decisionLog = document.getElementById('decision-log');
const finalBrief = document.getElementById('final-brief');
const resetLabButton = document.getElementById('reset-lab');
const copyLabReportButton = document.getElementById('copy-lab-report');

let currentScenarioIndex = 0;
let totals = defaultTotals();
let decisions = [];

function defaultTotals() {
  return { correctness: 0, latency: 0, complexity: 0, trust: 0 };
}

function renderScenario() {
  const scenario = scenarios[currentScenarioIndex];
  if (!scenario) {
    renderFinalBrief();
    return;
  }

  scenarioTitle.textContent = scenario.title;
  scenarioProgress.textContent = `Round ${currentScenarioIndex + 1} / ${scenarios.length}`;
  scenarioContext.textContent = scenario.context;
  scenarioSymptom.textContent = scenario.symptom;
  scenarioPressure.textContent = scenario.pressure;
  scenarioPriority.textContent = scenario.priority;
  scenarioTimeline.innerHTML = scenario.timeline.map((item) => `<li>${item}</li>`).join('');
  optionsGrid.innerHTML = scenario.options
    .map(
      (option, index) => `
        <article class="option-card">
          <p class="tag">${option.tag}</p>
          <h3>${option.label}</h3>
          <p>${option.detail}</p>
          <ul>
            ${option.notes.map((note) => `<li>${note}</li>`).join('')}
          </ul>
          <button type="button" data-option-index="${index}">Ship This Guardrail</button>
        </article>
      `
    )
    .join('');

  optionsGrid.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => commitDecision(Number.parseInt(button.dataset.optionIndex || '0', 10)));
  });
}

function updateScoreboard() {
  scoreCorrectness.textContent = String(totals.correctness);
  scoreLatency.textContent = String(totals.latency);
  scoreComplexity.textContent = String(totals.complexity);
  scoreTrust.textContent = String(totals.trust);

  const strongest = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
  if (!strongest) {
    scoreSummary.textContent = 'Pick a strategy to see how the tradeoff changes.';
    return;
  }

  const label = strongest[0][0].toUpperCase() + strongest[0].slice(1);
  scoreSummary.textContent = `${label} is currently your strongest axis. The lab rewards fixes that preserve both correctness and user trust under overlap.`;
}

function commitDecision(optionIndex) {
  const scenario = scenarios[currentScenarioIndex];
  const option = scenario?.options?.[optionIndex];
  if (!scenario || !option) return;

  totals.correctness += option.impact.correctness;
  totals.latency += option.impact.latency;
  totals.complexity += option.impact.complexity;
  totals.trust += option.impact.trust;
  decisions.push({
    scenario: scenario.title,
    option: option.label,
    verdict: option.verdict,
    detail: option.detail,
  });

  resultTitle.textContent = `${scenario.title}: ${option.verdict}`;
  resultDetail.textContent = option.detail;
  decisionLog.innerHTML = decisions
    .map(
      (entry) =>
        `<li><strong>${entry.scenario}</strong><br>${entry.option}<br>${entry.verdict}. ${entry.detail}</li>`
    )
    .join('');

  currentScenarioIndex += 1;
  updateScoreboard();
  renderScenario();
}

function buildRunReport() {
  const lines = ['Race Condition Lab Report', ''];
  decisions.forEach((entry, index) => {
    lines.push(`${index + 1}. ${entry.scenario}`);
    lines.push(`Choice: ${entry.option}`);
    lines.push(`Verdict: ${entry.verdict}`);
    lines.push(`Why: ${entry.detail}`);
    lines.push('');
  });
  lines.push(`Correctness: ${totals.correctness}`);
  lines.push(`Latency: ${totals.latency}`);
  lines.push(`Complexity: ${totals.complexity}`);
  lines.push(`User Trust: ${totals.trust}`);
  return lines.join('\n');
}

function renderFinalBrief() {
  optionsGrid.innerHTML = '';
  finalBrief.classList.remove('hidden');
  const ranked = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const topAxis = ranked[0]?.[0] || 'correctness';
  const weakAxis = ranked[ranked.length - 1]?.[0] || 'latency';
  finalBrief.innerHTML = `
    <h3>Final brief</h3>
    <p><strong>Strongest axis:</strong> ${topAxis[0].toUpperCase()}${topAxis.slice(1)}.</p>
    <p><strong>Weakest axis:</strong> ${weakAxis[0].toUpperCase()}${weakAxis.slice(1)}. The best concurrency fixes usually spend a little complexity to buy correctness and trust back.</p>
    <p><strong>Takeaway:</strong> request ordering bugs are product bugs. The right guardrail depends on whether the surface is read-heavy, inventory-constrained, or collaborative.</p>
  `;
  resultTitle.textContent = 'Lab complete.';
  resultDetail.textContent = 'Copy the report or restart the scenarios to compare a different concurrency posture.';
  scoreSummary.textContent = 'The run is complete. Re-run the lab to test a different balance of speed, complexity, and trust.';
  scenarioTitle.textContent = 'Run finished';
  scenarioProgress.textContent = 'Complete';
  scenarioContext.textContent = 'You have seen four common async failure patterns. Compare how different guardrails shift the product cost.';
  scenarioSymptom.textContent = 'Use the decision log as a study sheet.';
  scenarioPressure.textContent = 'Concurrency choices are UX choices in disguise.';
  scenarioPriority.textContent = 'Protect user trust where overlap can destroy correctness.';
  scenarioTimeline.innerHTML = [
    'Review the decision log.',
    'Copy the run report.',
    'Restart the lab and try a different policy posture.'
  ].map((item) => `<li>${item}</li>`).join('');
}

function resetLab() {
  currentScenarioIndex = 0;
  totals = defaultTotals();
  decisions = [];
  decisionLog.innerHTML = '';
  finalBrief.classList.add('hidden');
  resultTitle.textContent = 'No strategy selected yet.';
  resultDetail.textContent = 'The lab will explain why a guardrail helped or hurt once you commit to a path.';
  updateScoreboard();
  renderScenario();
}

copyLabReportButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(buildRunReport());
    scoreSummary.textContent = 'Copied the run report to the clipboard.';
  } catch (error) {
    scoreSummary.textContent = 'Clipboard copy failed in this environment.';
  }
});

resetLabButton.addEventListener('click', resetLab);

resetLab();
