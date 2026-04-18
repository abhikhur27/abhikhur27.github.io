const scenarioButtonsEl = document.getElementById('scenario-buttons');
const scenarioSummaryEl = document.getElementById('scenario-summary');
const scenarioRiskEl = document.getElementById('scenario-risk');
const candidateListEl = document.getElementById('candidate-list');
const selectedListEl = document.getElementById('selected-list');
const briefMetaEl = document.getElementById('brief-meta');
const coverageBoardEl = document.getElementById('coverage-board');
const missedCuesEl = document.getElementById('missed-cues');
const shiftRiskEl = document.getElementById('shift-risk');
const qualityTitleEl = document.getElementById('quality-title');
const qualitySummaryEl = document.getElementById('quality-summary');
const briefScoreEl = document.getElementById('brief-score');
const coverageScoreEl = document.getElementById('coverage-score');
const loadScoreEl = document.getElementById('load-score');
const copyLinkButton = document.getElementById('copy-link');
const copyBriefButton = document.getElementById('copy-brief');

const scenarios = {
  db_failover: {
    label: 'Database failover',
    summary: 'Primary database is flapping. The next shift needs enough context to protect writes and know who owns the failover path.',
    risk: 'Risk cue: a vague handoff here creates split ownership and duplicated recovery work.',
    required: ['status', 'owner', 'risk', 'next'],
    items: [
      { id: 'status-failover', title: 'Primary region is in manual failover', body: 'Writes are pinned to the secondary cluster and the primary is still rejecting promotion checks.', categories: ['status'], weight: 18 },
      { id: 'owner-dba', title: 'DBA owns promotion approval', body: 'Rina is the approver for any role change and must sign off before traffic is restored.', categories: ['owner', 'decision'], weight: 17 },
      { id: 'customer-impact', title: 'Signup writes are degraded', body: 'New account creation is delayed, but reads and existing sessions are still healthy.', categories: ['customer'], weight: 14 },
      { id: 'risk-replay', title: 'Replay lag is still 90 seconds', body: 'Restoring writes too early risks replay collisions and user-visible duplication.', categories: ['risk'], weight: 19 },
      { id: 'next-check', title: 'Next check is at :20 past the hour', body: 'Validate replication lag, then decide whether to keep the manual failover posture.', categories: ['next'], weight: 18 },
      { id: 'noise-spec', title: 'A speculative kernel theory is circulating', body: 'One engineer suspects a host kernel bug, but no evidence has been collected yet.', categories: ['noise'], weight: 4 },
      { id: 'metric-qps', title: 'Current write rate is 38% of normal peak', body: 'Load is lower than mid-day traffic, which reduces immediate customer pressure.', categories: ['metric'], weight: 9 },
    ],
  },
  auth_rollback: {
    label: 'Auth rollback',
    summary: 'A new auth deploy has been partially rolled back. The handoff needs clear ownership, blast radius, and the next decision gate.',
    risk: 'Risk cue: if rollback state is unclear, the next shift may ship a second bad deploy or revert the wrong service.',
    required: ['status', 'decision', 'owner', 'next'],
    items: [
      { id: 'status-half', title: 'Web clients are rolled back, mobile is not', body: 'Traffic split means the bad token-refresh path is still live for mobile-only sessions.', categories: ['status', 'risk'], weight: 18 },
      { id: 'owner-auth', title: 'Auth team owns next deploy gate', body: 'Diego is coordinating the patch branch and should be paged before any release resumes.', categories: ['owner'], weight: 17 },
      { id: 'decision-freeze', title: 'Release freeze is active until patch review', body: 'No downstream teams should deploy auth-adjacent changes until the patch branch is signed off.', categories: ['decision'], weight: 17 },
      { id: 'next-patch', title: 'Next step is mobile rollback or hotfix by 02:00', body: 'The oncoming shift must choose rollback or targeted fix after log review completes.', categories: ['next'], weight: 18 },
      { id: 'customer-support', title: 'Support queue has 23 account lockout tickets', body: 'The customer signal is rising, but the issue is still concentrated in mobile refresh flows.', categories: ['customer'], weight: 12 },
      { id: 'metric-error', title: '401 spike has stabilized but not cleared', body: 'Errors are down from peak, but still 2.3x above the pre-deploy baseline.', categories: ['metric'], weight: 10 },
      { id: 'noise-brand', title: 'Brand team asked whether login copy should change', body: 'Not operationally relevant for the handoff window.', categories: ['noise'], weight: 3 },
    ],
  },
  campus_outage: {
    label: 'Campus network outage',
    summary: 'A building-level outage is bouncing between access and core paths. The handoff needs physical scope, owner handoff, and recheck timing.',
    risk: 'Risk cue: weak scope language here turns one-building isolation into a campus-wide rumor mill.',
    required: ['status', 'owner', 'customer', 'next'],
    items: [
      { id: 'status-building', title: 'Only the ECSW building is dark', body: 'The outage is isolated to one distribution path; other academic buildings are stable.', categories: ['status', 'customer'], weight: 18 },
      { id: 'owner-netops', title: 'NetOps owns switch replacement logistics', body: 'The oncoming shift should page Mei if the spare switch does not arrive by 01:30.', categories: ['owner'], weight: 16 },
      { id: 'next-fiber', title: 'Fiber light-level recheck scheduled for 01:10', body: 'That recheck is the next hard decision point for replacement vs reroute.', categories: ['next'], weight: 18 },
      { id: 'risk-rumor', title: 'Do not describe this as a campus-wide outage', body: 'Wider wording will trigger unnecessary escalations and duplicate comms.', categories: ['risk', 'decision'], weight: 17 },
      { id: 'metric-classrooms', title: 'Nine classrooms and two labs are affected', body: 'This is large enough to matter, but still bounded enough for targeted comms.', categories: ['metric'], weight: 9 },
      { id: 'customer-faculty', title: 'Faculty were told to fall back to hotspot kits', body: 'Support and classroom operations already have the temporary workaround.', categories: ['customer'], weight: 14 },
      { id: 'noise-weather', title: 'Someone mentioned yesterday’s storm in chat', body: 'There is no evidence yet that weather caused the current fault.', categories: ['noise'], weight: 4 },
    ],
  },
};

let activeScenarioKey = 'db_failover';
let selectedIds = [];

function readUrlState() {
  const params = new URLSearchParams(window.location.search);
  const scenario = params.get('scenario');
  const picks = params.get('picks');
  if (scenario && scenarios[scenario]) activeScenarioKey = scenario;
  if (picks) selectedIds = picks.split(',').filter(Boolean);
}

function syncUrlState() {
  const params = new URLSearchParams();
  params.set('scenario', activeScenarioKey);
  if (selectedIds.length) params.set('picks', selectedIds.join(','));
  const nextUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, '', nextUrl);
}

function currentScenario() {
  return scenarios[activeScenarioKey];
}

function candidateById(id) {
  return currentScenario().items.find((item) => item.id === id);
}

function renderScenarioButtons() {
  scenarioButtonsEl.innerHTML = Object.entries(scenarios)
    .map(([key, scenario]) => `<button class="preset-btn ${key === activeScenarioKey ? 'active' : ''}" data-scenario="${key}" type="button">${scenario.label}</button>`)
    .join('');

  scenarioButtonsEl.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      activeScenarioKey = button.dataset.scenario;
      selectedIds = [];
      render();
    });
  });
}

function toggleSelection(id) {
  if (selectedIds.includes(id)) {
    selectedIds = selectedIds.filter((item) => item !== id);
    render();
    return;
  }

  if (selectedIds.length >= 5) {
    qualitySummaryEl.textContent = 'Five bullets max. Remove one item before adding a new update.';
    return;
  }

  selectedIds = [...selectedIds, id];
  render();
}

function evaluateSelection() {
  const scenario = currentScenario();
  const selected = selectedIds.map(candidateById).filter(Boolean);
  const covered = new Set(selected.flatMap((item) => item.categories));
  const missing = scenario.required.filter((category) => !covered.has(category));
  const totalWeight = selected.reduce((sum, item) => sum + item.weight, 0);
  const totalWords = selected.reduce((sum, item) => sum + item.body.split(/\s+/).length, 0);
  const overload = Math.max(0, Math.min(100, Math.round((totalWords / 75) * 100)));
  const noiseCount = selected.filter((item) => item.categories.includes('noise')).length;
  const score = Math.max(0, Math.min(100, totalWeight + covered.size * 8 - missing.length * 16 - noiseCount * 12 - (overload > 88 ? 8 : 0)));

  let title = 'Balanced handoff';
  let summary = 'Cover status, ownership, risk, and next steps without flooding the oncoming shift.';
  if (missing.length >= 2) {
    title = 'Fragile handoff';
    summary = 'Critical context is missing, so the next shift will inherit ambiguity instead of a usable brief.';
  } else if (overload >= 90 || selected.length === 5) {
    title = 'Dense handoff';
    summary = 'Coverage is decent, but the brief is close to overload and may hide the real decision points.';
  } else if (score >= 82) {
    title = 'Shift-ready handoff';
    summary = 'The packet is tight enough to move the incident forward without forcing the next shift to reconstruct context.';
  }

  return { selected, covered, missing, overload, score, title, summary };
}

function renderCandidates() {
  const scenario = currentScenario();
  candidateListEl.innerHTML = scenario.items
    .map((item) => `
      <article class="candidate-card ${selectedIds.includes(item.id) ? 'is-selected' : ''}">
        <header>
          <h3>${item.title}</h3>
          <span class="mono">${item.weight} pts</span>
        </header>
        <p>${item.body}</p>
        <div class="tag-row">${item.categories.map((category) => `<span class="tag">${category}</span>`).join('')}</div>
        <button type="button" data-item-id="${item.id}">${selectedIds.includes(item.id) ? 'Remove from brief' : 'Add to brief'}</button>
      </article>
    `)
    .join('');

  candidateListEl.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => toggleSelection(button.dataset.itemId));
  });
}

function renderSelected(evaluation) {
  briefMetaEl.textContent = `${evaluation.selected.length} / 5 bullets selected.`;
  selectedListEl.innerHTML = evaluation.selected.length
    ? evaluation.selected.map((item) => `<li class="selected-card"><header><h3>${item.title}</h3><span class="mono">${item.categories.join(', ')}</span></header><p>${item.body}</p></li>`).join('')
    : '<li class="selected-card">No briefing bullets selected yet.</li>';
}

function renderAnalysis(evaluation) {
  const scenario = currentScenario();
  qualityTitleEl.textContent = evaluation.title;
  qualitySummaryEl.textContent = evaluation.summary;
  briefScoreEl.textContent = String(evaluation.score);
  coverageScoreEl.textContent = `${scenario.required.length - evaluation.missing.length}/${scenario.required.length}`;
  loadScoreEl.textContent = `${evaluation.overload}%`;

  coverageBoardEl.innerHTML = scenario.required
    .map((category) => `<p class="${evaluation.covered.has(category) ? 'good' : 'danger'}">${evaluation.covered.has(category) ? 'Covered' : 'Missing'}: ${category}</p>`)
    .join('');

  missedCuesEl.innerHTML = evaluation.missing.length
    ? evaluation.missing.map((category) => `<p class="danger">${category} is still missing from the handoff.</p>`).join('')
    : '<p class="good">All required cue types are represented in the brief.</p>';

  const riskLines = [];
  if (evaluation.overload >= 90) riskLines.push('The brief is close to cognitive overload. Tighten wording or remove one lower-signal update.');
  if (evaluation.selected.some((item) => item.categories.includes('noise'))) riskLines.push('Speculative or low-signal bullets are still in the packet and may distract the next shift.');
  if (!evaluation.missing.length && evaluation.overload < 90) riskLines.push('The handoff is compact enough to survive a real shift change without forcing context reconstruction.');
  shiftRiskEl.innerHTML = riskLines.map((line) => `<p>${line}</p>`).join('');
}

function renderScenarioCopy() {
  const scenario = currentScenario();
  scenarioSummaryEl.textContent = scenario.summary;
  scenarioRiskEl.textContent = scenario.risk;
}

function copyBrief() {
  const evaluation = evaluateSelection();
  const text = evaluation.selected.map((item, index) => `${index + 1}. ${item.title} - ${item.body}`).join('\n');
  return navigator.clipboard.writeText(text || 'No briefing bullets selected.');
}

function render() {
  renderScenarioButtons();
  renderScenarioCopy();
  renderCandidates();
  const evaluation = evaluateSelection();
  renderSelected(evaluation);
  renderAnalysis(evaluation);
  syncUrlState();
}

copyLinkButton.addEventListener('click', async () => {
  syncUrlState();
  await navigator.clipboard.writeText(window.location.href);
  qualitySummaryEl.textContent = 'Share link copied with the current scenario and selected briefing bullets.';
});

copyBriefButton.addEventListener('click', async () => {
  await copyBrief();
  qualitySummaryEl.textContent = 'Brief copied for the next shift.';
});

readUrlState();
render();
