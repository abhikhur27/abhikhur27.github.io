const metricList = document.getElementById('metric-list');
const roundLabel = document.getElementById('round-label');
const pressureLabel = document.getElementById('pressure-label');
const scenarioTitle = document.getElementById('scenario-title');
const scenarioCopy = document.getElementById('scenario-copy');
const choiceList = document.getElementById('choice-list');
const eventLog = document.getElementById('event-log');
const endingPanel = document.getElementById('ending-panel');
const endingTitle = document.getElementById('ending-title');
const endingCopy = document.getElementById('ending-copy');
const restartBtn = document.getElementById('restart-btn');

const scenarios = [
  {
    title: 'Advising holds jam the queue before 9 AM.',
    copy: 'Thousands of students are hitting the portal, but the advising-hold resolver is timing out. Advisors want manual overrides. Security wants tighter controls.',
    pressure: 'Students are piling into virtual wait rooms before registration opens.',
    choices: [
      {
        label: 'Open a temporary self-service appeal lane',
        detail: 'Relieves immediate queue pressure, but some edge cases will slip through.',
        effects: { throughput: 14, fairness: -4, trust: 6, strain: 3 },
      },
      {
        label: 'Keep manual advisor approval only',
        detail: 'Preserves policy integrity, but the queue will crawl.',
        effects: { throughput: -10, fairness: 8, trust: -6, strain: 6 },
      },
      {
        label: 'Throttle low-credit-hour registrations for 20 minutes',
        detail: 'Stabilizes the system at the cost of perceived fairness.',
        effects: { throughput: 8, fairness: -10, trust: -8, strain: -2 },
      },
    ],
  },
  {
    title: 'A viral post claims seniors cannot get into the system.',
    copy: 'The claim is half true: one shard is slower than the rest. Communications wants a simple answer, engineering wants time, and leadership wants the dashboard green.',
    pressure: 'Trust is now as fragile as the infrastructure.',
    choices: [
      {
        label: 'Publish a blunt incident note with ETA uncertainty',
        detail: 'Honest messaging protects trust, but execs hate admitting uncertainty.',
        effects: { throughput: 0, fairness: 4, trust: 12, strain: 2 },
      },
      {
        label: 'Say only that the team is monitoring performance',
        detail: 'Buys optics in the short term, but students read vagueness as spin.',
        effects: { throughput: 0, fairness: 0, trust: -10, strain: -1 },
      },
      {
        label: 'Force traffic into a single simplified status page',
        detail: 'Reduces rumor spread and server load, but blocks some real actions.',
        effects: { throughput: 6, fairness: -3, trust: 5, strain: -4 },
      },
    ],
  },
  {
    title: 'The database team offers one risky optimization window.',
    copy: 'You can apply a write-path patch that might lift throughput, but rollback during peak would be brutal. The safer option is to keep the queue longer and absorb the complaints.',
    pressure: 'This is the highest-variance decision in the launch.',
    choices: [
      {
        label: 'Take the patch window immediately',
        detail: 'A bold move: large upside if it holds, heavy downside if it does not.',
        effects: { throughput: 18, fairness: 2, trust: -4, strain: 10 },
      },
      {
        label: 'Hold the current release and add queue estimates',
        detail: 'No dramatic gain, but the operation stays legible.',
        effects: { throughput: -4, fairness: 5, trust: 8, strain: -3 },
      },
      {
        label: 'Split majors into staggered release cohorts',
        detail: 'Caps surge load while making fairness debates unavoidable.',
        effects: { throughput: 10, fairness: -8, trust: -2, strain: -1 },
      },
    ],
  },
  {
    title: 'The final hour collides with class-seat scarcity.',
    copy: 'The platform is still standing, but the hardest classes are near capacity. Students want transparency on seat release logic. Advisors want protected reserves. Your last move will define the narrative.',
    pressure: 'You are no longer optimizing the stack alone. You are deciding what kind of launch this was.',
    choices: [
      {
        label: 'Expose real-time seat reserves and release rules',
        detail: 'The fairest explanation, even if it creates visible disappointment.',
        effects: { throughput: 2, fairness: 14, trust: 10, strain: 2 },
      },
      {
        label: 'Silently reallocate reserves to highest-demand courses',
        detail: 'Improves seat fill, but students notice inconsistent behavior fast.',
        effects: { throughput: 9, fairness: -9, trust: -8, strain: 1 },
      },
      {
        label: 'Freeze changes and announce a second adjustment window',
        detail: 'Buys time and reduces operator strain, but extends uncertainty.',
        effects: { throughput: -6, fairness: 6, trust: 4, strain: -8 },
      },
    ],
  },
];

const baselineMetrics = {
  throughput: 62,
  fairness: 58,
  trust: 60,
  strain: 28,
};

let state = createFreshState();

function createFreshState() {
  return {
    roundIndex: 0,
    metrics: { ...baselineMetrics },
    log: ['Launch initialized. Registration traffic is building.'],
  };
}

function clamp(value) {
  return Math.max(0, Math.min(100, value));
}

function metricTone(key, value) {
  if (key === 'strain') {
    if (value <= 35) return 'var(--good)';
    if (value <= 60) return 'var(--warn)';
    return 'var(--bad)';
  }

  if (value >= 70) return 'var(--good)';
  if (value >= 45) return 'var(--warn)';
  return 'var(--bad)';
}

function renderMetrics() {
  const labels = {
    throughput: 'Queue Throughput',
    fairness: 'Fairness',
    trust: 'Student Trust',
    strain: 'Operator Strain',
  };

  metricList.innerHTML = Object.entries(state.metrics)
    .map(([key, value]) => {
      const width = key === 'strain' ? value : value;
      return `
        <article class="metric-card">
          <header>
            <h3>${labels[key]}</h3>
            <p>${value}</p>
          </header>
          <div class="meter"><span style="width:${width}%; background:${metricTone(key, value)};"></span></div>
        </article>
      `;
    })
    .join('');
}

function renderLog() {
  eventLog.innerHTML = state.log
    .slice()
    .reverse()
    .map((entry) => `<li>${entry}</li>`)
    .join('');
}

function renderScenario() {
  if (state.roundIndex >= scenarios.length) {
    scenarioTitle.textContent = 'Launch complete.';
    scenarioCopy.textContent = 'Review the outcome and run another launch with a different policy mix.';
    roundLabel.textContent = 'Postmortem';
    pressureLabel.textContent = 'Your final mix of trust, fairness, throughput, and strain determines the ending.';
    choiceList.innerHTML = '';
    renderEnding();
    return;
  }

  const scenario = scenarios[state.roundIndex];
  roundLabel.textContent = `Round ${state.roundIndex + 1} of ${scenarios.length}`;
  pressureLabel.textContent = scenario.pressure;
  scenarioTitle.textContent = scenario.title;
  scenarioCopy.textContent = scenario.copy;
  choiceList.innerHTML = scenario.choices
    .map(
      (choice, index) => `
        <button class="choice-card" type="button" data-choice="${index}">
          <strong>${choice.label}</strong>
          <span>${choice.detail}</span>
        </button>
      `
    )
    .join('');

  choiceList.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => applyChoice(Number(button.dataset.choice)));
  });
}

function buildEnding() {
  const score = state.metrics.throughput + state.metrics.fairness + state.metrics.trust - state.metrics.strain;

  if (score >= 190 && state.metrics.trust >= 65 && state.metrics.fairness >= 60) {
    return {
      title: 'Trusted launch recovery',
      copy: 'Students still felt the squeeze, but the operation stayed legible. You protected fairness, kept the queue moving, and did not hide the tradeoffs.',
    };
  }

  if (state.metrics.throughput >= 75 && state.metrics.strain >= 55) {
    return {
      title: 'Brute-force throughput win',
      copy: 'You shoved the queue through, but the system paid for it in operator fatigue and rough edges. It worked, though nobody wants to relive it.',
    };
  }

  if (state.metrics.trust < 45 || state.metrics.fairness < 45) {
    return {
      title: 'Technically live, politically damaged',
      copy: 'The platform never fully collapsed, but students walked away convinced the process was stacked or opaque. The next launch starts with a credibility deficit.',
    };
  }

  return {
    title: 'Mixed launch with deferred pain',
    copy: 'You stabilized the rush without a headline failure, but the result was a compromise. Some pressure moved out of the launch window and into follow-up clean-up.',
  };
}

function renderEnding() {
  const ending = buildEnding();
  endingTitle.textContent = ending.title;
  endingCopy.textContent = ending.copy;
  endingPanel.classList.remove('hidden');
}

function applyChoice(choiceIndex) {
  const scenario = scenarios[state.roundIndex];
  const choice = scenario.choices[choiceIndex];
  if (!choice) return;

  Object.entries(choice.effects).forEach(([key, delta]) => {
    state.metrics[key] = clamp(state.metrics[key] + delta);
  });

  state.log.push(`${scenario.title} -> ${choice.label}`);
  state.roundIndex += 1;
  renderMetrics();
  renderLog();
  renderScenario();
}

restartBtn.addEventListener('click', () => {
  state = createFreshState();
  endingPanel.classList.add('hidden');
  renderMetrics();
  renderLog();
  renderScenario();
});

renderMetrics();
renderLog();
renderScenario();
