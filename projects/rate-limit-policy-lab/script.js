const patternInput = document.getElementById('pattern');
const durationInput = document.getElementById('duration');
const baselineInput = document.getElementById('baseline');
const burstRateInput = document.getElementById('burst-rate');
const burstSecondsInput = document.getElementById('burst-seconds');
const windowLimitInput = document.getElementById('window-limit');
const windowSecondsInput = document.getElementById('window-seconds');
const tokenCapacityInput = document.getElementById('token-capacity');
const tokenRefillInput = document.getElementById('token-refill');
const runBtn = document.getElementById('run-btn');
const copyBriefBtn = document.getElementById('copy-brief-btn');
const timelinePolicySelect = document.getElementById('timeline-policy');
const statusEl = document.getElementById('status');
const verdictSummaryEl = document.getElementById('verdict-summary');
const winnerNameEl = document.getElementById('winner-name');
const winnerAdmittedEl = document.getElementById('winner-admitted');
const winnerDroppedEl = document.getElementById('winner-dropped');
const winnerBurstLossEl = document.getElementById('winner-burst-loss');
const recommendationBoardEl = document.getElementById('recommendation-board');
const resultsBody = document.getElementById('results-body');
const timelineEl = document.getElementById('timeline');

let lastRun = null;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function readNumber(input, fallback, min, max) {
  const parsed = Number.parseInt(input.value, 10);
  return Number.isFinite(parsed) ? clamp(parsed, min, max) : fallback;
}

function buildTrafficSeries() {
  const duration = readNumber(durationInput, 60, 10, 180);
  const baseline = readNumber(baselineInput, 18, 1, 200);
  const burstRate = readNumber(burstRateInput, 64, 1, 400);
  const burstSeconds = readNumber(burstSecondsInput, 10, 1, 60);
  const pattern = patternInput.value;
  const rows = [];

  for (let second = 0; second < duration; second += 1) {
    let requests = baseline;
    if (pattern === 'burst') {
      requests = second < burstSeconds ? burstRate : baseline;
    } else if (pattern === 'spiky') {
      requests = baseline + (second % 9 === 0 ? burstRate : second % 5 === 0 ? Math.round(burstRate * 0.45) : 0);
    }
    rows.push({ second, requests });
  }

  return rows;
}

function summarizePolicy(label, admitted, dropped, perSecond, series) {
  const totalRequests = series.reduce((sum, row) => sum + row.requests, 0);
  let worstBurstLoss = 0;
  let largestFiveSecondAdmit = 0;

  for (let start = 0; start < perSecond.length; start += 1) {
    const slice = perSecond.slice(start, start + 5);
    const requests = slice.reduce((sum, row) => sum + row.requests, 0);
    const accepted = slice.reduce((sum, row) => sum + row.admitted, 0);
    const lossPct = requests ? Math.round(((requests - accepted) / requests) * 100) : 0;
    worstBurstLoss = Math.max(worstBurstLoss, lossPct);
    largestFiveSecondAdmit = Math.max(largestFiveSecondAdmit, accepted);
  }

  return {
    key: label.toLowerCase().replace(/\s+/g, '-'),
    label,
    admitted,
    dropped,
    admitRate: totalRequests ? Math.round((admitted / totalRequests) * 100) : 0,
    worstBurstLoss,
    largestFiveSecondAdmit,
    perSecond,
  };
}

function simulateFixedWindow(series, limit, windowSeconds) {
  let admitted = 0;
  let dropped = 0;
  let bucket = 0;
  let activeWindow = -1;
  const perSecond = [];

  for (const row of series) {
    const windowIndex = Math.floor(row.second / windowSeconds);
    if (windowIndex !== activeWindow) {
      activeWindow = windowIndex;
      bucket = 0;
    }

    const available = Math.max(0, limit - bucket);
    const allow = Math.min(row.requests, available);
    const reject = row.requests - allow;
    bucket += allow;
    admitted += allow;
    dropped += reject;
    perSecond.push({ second: row.second, admitted: allow, dropped: reject, requests: row.requests });
  }

  return summarizePolicy('Fixed Window', admitted, dropped, perSecond, series);
}

function simulateSlidingWindow(series, limit, windowSeconds) {
  const acceptedRequests = [];
  let admitted = 0;
  let dropped = 0;
  const perSecond = [];

  for (const row of series) {
    let allow = 0;
    let reject = 0;

    for (let i = 0; i < row.requests; i += 1) {
      const requestTime = row.second + i / Math.max(row.requests, 1);
      while (acceptedRequests.length && acceptedRequests[0] <= requestTime - windowSeconds) {
        acceptedRequests.shift();
      }

      if (acceptedRequests.length < limit) {
        acceptedRequests.push(requestTime);
        allow += 1;
      } else {
        reject += 1;
      }
    }

    admitted += allow;
    dropped += reject;
    perSecond.push({ second: row.second, admitted: allow, dropped: reject, requests: row.requests });
  }

  return summarizePolicy('Sliding Window', admitted, dropped, perSecond, series);
}

function simulateTokenBucket(series, capacity, refillPerSecond) {
  let tokens = capacity;
  let admitted = 0;
  let dropped = 0;
  const perSecond = [];

  for (const row of series) {
    tokens = Math.min(capacity, tokens + refillPerSecond);
    const allow = Math.min(row.requests, Math.floor(tokens));
    const reject = row.requests - allow;
    tokens -= allow;
    admitted += allow;
    dropped += reject;
    perSecond.push({ second: row.second, admitted: allow, dropped: reject, requests: row.requests });
  }

  return summarizePolicy('Token Bucket', admitted, dropped, perSecond, series);
}

function chooseWinner(results) {
  return [...results].sort((a, b) =>
    b.admitted - a.admitted ||
    a.dropped - b.dropped ||
    a.worstBurstLoss - b.worstBurstLoss ||
    b.largestFiveSecondAdmit - a.largestFiveSecondAdmit
  )[0];
}

function renderResults(results) {
  const winner = chooseWinner(results);
  const runnerUp = [...results]
    .filter((result) => result.key !== winner.key)
    .sort((a, b) => b.admitted - a.admitted || a.worstBurstLoss - b.worstBurstLoss)[0];

  resultsBody.innerHTML = results.map((result) => `
    <tr>
      <td>${result.label}</td>
      <td>${result.admitted}</td>
      <td>${result.dropped}</td>
      <td>${result.admitRate}%</td>
      <td>${result.worstBurstLoss}%</td>
      <td>${result.largestFiveSecondAdmit}</td>
    </tr>
  `).join('');

  verdictSummaryEl.textContent = `${winner.label} handled this traffic shape best. ${runnerUp ? `${runnerUp.label} stays close enough to mention as the fallback policy.` : ''}`;
  winnerNameEl.textContent = winner.label;
  winnerAdmittedEl.textContent = String(winner.admitted);
  winnerDroppedEl.textContent = String(winner.dropped);
  winnerBurstLossEl.textContent = `${winner.worstBurstLoss}%`;
  recommendationBoardEl.innerHTML = `
    <p><strong>Recommendation:</strong> ${winner.label} is the cleanest fit for the current traffic story because it admits ${winner.admitRate}% of requests while keeping worst five-second burst loss to ${winner.worstBurstLoss}%.</p>
    <p><strong>Watch-out:</strong> ${winner.label === 'Token Bucket'
      ? 'Token buckets are forgiving on short bursts, so call out refill settings whenever someone assumes they are strict per-window caps.'
      : winner.label === 'Sliding Window'
        ? 'Sliding windows smooth edge effects well, but they are harder to explain than a hard threshold.'
        : 'Fixed windows are easy to explain, but the window boundary can create harsher drop cliffs than the average throughput suggests.'}</p>
  `;
}

function renderTimeline(result) {
  timelineEl.innerHTML = '';

  result.perSecond.forEach((row) => {
    const node = document.createElement('article');
    node.className = 'timeline-bar';
    node.innerHTML = `
      <div class="timeline-meta">
        <span>T+${row.second}s</span>
        <span>${row.admitted} admitted / ${row.dropped} dropped</span>
      </div>
      <div class="bar-stack">
        <span class="bar-good"></span>
        <span class="bar-bad"></span>
      </div>
    `;
    const stack = node.querySelector('.bar-stack');
    stack.style.setProperty('--admitted', `${row.admitted}fr`);
    stack.style.setProperty('--dropped', `${row.dropped}fr`);
    if (row.requests === 0) {
      stack.style.setProperty('--admitted', '1fr');
      stack.style.setProperty('--dropped', '0fr');
    }
    timelineEl.append(node);
  });
}

function runSimulation() {
  const series = buildTrafficSeries();
  const fixed = simulateFixedWindow(
    series,
    readNumber(windowLimitInput, 30, 1, 400),
    readNumber(windowSecondsInput, 5, 1, 60)
  );
  const sliding = simulateSlidingWindow(
    series,
    readNumber(windowLimitInput, 30, 1, 400),
    readNumber(windowSecondsInput, 5, 1, 60)
  );
  const token = simulateTokenBucket(
    series,
    readNumber(tokenCapacityInput, 60, 1, 400),
    readNumber(tokenRefillInput, 6, 1, 200)
  );

  lastRun = { results: [fixed, sliding, token] };
  renderResults(lastRun.results);
  const selected = lastRun.results.find((result) => result.key === timelinePolicySelect.value) || token;
  renderTimeline(selected);
  statusEl.textContent = `Compared ${series.length} seconds of ${patternInput.value} traffic across all three policies.`;
}

function buildBrief() {
  if (!lastRun) {
    return 'Run the lab first.';
  }

  const winner = chooseWinner(lastRun.results);
  const lines = [
    'Rate Limit Policy Lab Brief',
    '',
    `Traffic pattern: ${patternInput.value}`,
    `Duration: ${durationInput.value}s`,
    `Baseline req/s: ${baselineInput.value}`,
    `Burst req/s: ${burstRateInput.value} for ${burstSecondsInput.value}s`,
    `Winner: ${winner.label}`,
  ];

  lastRun.results.forEach((result) => {
    lines.push(`${result.label}: admitted ${result.admitted}, dropped ${result.dropped}, admit rate ${result.admitRate}%, worst burst loss ${result.worstBurstLoss}%`);
  });

  lines.push(`Verdict: ${verdictSummaryEl.textContent}`);
  return lines.join('\n');
}

runBtn.addEventListener('click', runSimulation);
timelinePolicySelect.addEventListener('change', () => {
  if (!lastRun) return;
  const selected = lastRun.results.find((result) => result.key === timelinePolicySelect.value);
  if (selected) renderTimeline(selected);
});
copyBriefBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(buildBrief());
    statusEl.textContent = 'Copied a rate-limit policy brief.';
  } catch (error) {
    statusEl.textContent = 'Clipboard copy failed in this environment.';
  }
});

runSimulation();
