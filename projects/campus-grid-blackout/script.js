const districtGrid = document.getElementById('district-grid');
const shiftLabel = document.getElementById('shift-label');
const incidentCopy = document.getElementById('incident-copy');
const crewCount = document.getElementById('crew-count');
const batteryCount = document.getElementById('battery-count');
const messageCount = document.getElementById('message-count');
const trustValue = document.getElementById('trust-value');
const uptimeValue = document.getElementById('uptime-value');
const riskValue = document.getElementById('risk-value');
const trustMeter = document.getElementById('trust-meter');
const uptimeMeter = document.getElementById('uptime-meter');
const riskMeter = document.getElementById('risk-meter');
const trustMeterLabel = document.getElementById('trust-meter-label');
const uptimeMeterLabel = document.getElementById('uptime-meter-label');
const riskMeterLabel = document.getElementById('risk-meter-label');
const timeline = document.getElementById('timeline');
const statusText = document.getElementById('status-text');
const resolveBtn = document.getElementById('resolve-btn');
const resetBtn = document.getElementById('reset-btn');
const endingCard = document.getElementById('ending-card');

const incidentDeck = [
  {
    title: 'Substation A trips after a storm front.',
    prompt: 'Keep medical, residential, and compute loads online while the first outage wave spreads.',
    resources: { crews: 2, battery: 3, messages: 1 },
    districts: [
      { id: 'clinic', name: 'Clinic Block', severity: 4, impact: 'Medical refrigeration and ER lights' },
      { id: 'residence', name: 'Residence Halls', severity: 3, impact: 'Students lose cooling and elevator access' },
      { id: 'labs', name: 'Research Labs', severity: 4, impact: 'Wet labs and sample freezers are at risk' },
    ],
  },
  {
    title: 'Diesel delivery is delayed and battery charge falls faster than planned.',
    prompt: 'You cannot protect everything. Choose what gets scarce backup power and what gets the clearest communication.',
    resources: { crews: 2, battery: 2, messages: 2 },
    districts: [
      { id: 'library', name: 'Library + Study Core', severity: 2, impact: 'Exam week traffic spikes across campus' },
      { id: 'network', name: 'Campus Network', severity: 4, impact: 'Wi-Fi and card readers drop in and out' },
      { id: 'residence', name: 'Residence Halls', severity: 3, impact: 'Students need charging, cooling, and updates' },
    ],
  },
  {
    title: 'Cooling strain hits the data center.',
    prompt: 'A heat spike forces you to decide between research continuity and broader public-facing stability.',
    resources: { crews: 1, battery: 3, messages: 1 },
    districts: [
      { id: 'compute', name: 'High Performance Compute', severity: 5, impact: 'Long-running jobs and storage arrays are exposed' },
      { id: 'network', name: 'Campus Network', severity: 3, impact: 'Backhaul becomes unreliable under load shedding' },
      { id: 'library', name: 'Library + Study Core', severity: 2, impact: 'Overflow study demand is building' },
    ],
  },
  {
    title: 'A water leak disables one of the backup switch rooms.',
    prompt: 'Repairs now compete directly with battery needs. Public trust starts moving faster than the equipment.',
    resources: { crews: 2, battery: 2, messages: 1 },
    districts: [
      { id: 'labs', name: 'Research Labs', severity: 4, impact: 'Fume hoods and refrigeration are unstable' },
      { id: 'athletics', name: 'Athletics + Events', severity: 2, impact: 'Shelter traffic and public crowding increase' },
      { id: 'clinic', name: 'Clinic Block', severity: 3, impact: 'Outpatient operations need predictable service' },
    ],
  },
  {
    title: 'Student rumors outrun the official outage map.',
    prompt: 'The infrastructure picture is mixed, but communication choices can still reduce panic and unsafe movement.',
    resources: { crews: 1, battery: 1, messages: 3 },
    districts: [
      { id: 'residence', name: 'Residence Halls', severity: 3, impact: 'Confusion about food, charging, and shelter' },
      { id: 'athletics', name: 'Athletics + Events', severity: 2, impact: 'Crowding surges near ad hoc cooling stations' },
      { id: 'library', name: 'Library + Study Core', severity: 3, impact: 'Students need credible status updates' },
    ],
  },
  {
    title: 'Grid operators offer a narrow restoration window.',
    prompt: 'Your final shift is about sequencing. Stabilize the places where one failure will spill into the whole campus.',
    resources: { crews: 2, battery: 2, messages: 1 },
    districts: [
      { id: 'compute', name: 'High Performance Compute', severity: 4, impact: 'Graceful recovery requires careful sequencing' },
      { id: 'clinic', name: 'Clinic Block', severity: 4, impact: 'Clinical uptime is still non-negotiable' },
      { id: 'network', name: 'Campus Network', severity: 4, impact: 'Everything else depends on this backbone' },
    ],
  },
];

let state = createInitialState();

function createInitialState() {
  return {
    shiftIndex: 0,
    trust: 72,
    uptime: 76,
    risk: 28,
    history: [],
    allocations: {},
  };
}

function clamp(value) {
  return Math.max(0, Math.min(100, value));
}

function getCurrentShift() {
  return incidentDeck[state.shiftIndex];
}

function currentAllocationFor(districtId) {
  return state.allocations[districtId] || { crews: 0, battery: 0, messages: 0 };
}

function spendable(resource) {
  const shift = getCurrentShift();
  const used = shift.districts.reduce((sum, district) => sum + currentAllocationFor(district.id)[resource], 0);
  return Math.max(0, shift.resources[resource] - used);
}

function adjustAllocation(districtId, resource, delta) {
  const current = currentAllocationFor(districtId);
  const nextValue = Math.max(0, current[resource] + delta);
  const deltaNeeded = nextValue - current[resource];
  if (deltaNeeded > spendable(resource)) {
    statusText.textContent = `No ${resource} remaining this shift.`;
    return;
  }

  state.allocations[districtId] = {
    ...current,
    [resource]: nextValue,
  };
  statusText.textContent = `Updated ${resource} allocation for ${districtId}.`;
  render();
}

function scoreDistrict(district) {
  const allocation = currentAllocationFor(district.id);
  const totalSupport = allocation.crews * 2 + allocation.battery + allocation.messages;
  const gap = Math.max(0, district.severity - totalSupport);

  return {
    trustDelta: allocation.messages ? 4 : gap > 1 ? -5 : -2,
    uptimeDelta: allocation.battery * 3 + allocation.crews * 4 - gap * 4,
    riskDelta: gap * 6 - allocation.crews * 4 - allocation.battery * 2,
    summary:
      gap <= 0
        ? `${district.name} was stabilized with enough support to avoid knock-on failures.`
        : `${district.name} stayed partially exposed, leaving a severity gap of ${gap}.`,
  };
}

function resolveShift() {
  const shift = getCurrentShift();
  const evaluations = shift.districts.map(scoreDistrict);

  state.trust = clamp(state.trust + evaluations.reduce((sum, item) => sum + item.trustDelta, 0));
  state.uptime = clamp(state.uptime + evaluations.reduce((sum, item) => sum + item.uptimeDelta, 0));
  state.risk = clamp(state.risk + evaluations.reduce((sum, item) => sum + item.riskDelta, 0));

  state.history.unshift({
    shift: state.shiftIndex + 1,
    title: shift.title,
    result: evaluations.map((item) => item.summary).join(' '),
  });

  if (state.shiftIndex === incidentDeck.length - 1) {
    renderEnding();
    resolveBtn.disabled = true;
    statusText.textContent = 'Scenario complete. Review the system outcome.';
    render();
    return;
  }

  state.shiftIndex += 1;
  state.allocations = {};
  endingCard.classList.add('hidden');
  statusText.textContent = 'Shift resolved. The next incident wave is live.';
  render();
}

function renderEnding() {
  let title = 'Campus held together under pressure.';
  let note = 'You kept enough trust and uptime online to make the outage feel managed instead of chaotic.';

  if (state.risk >= 58 || state.trust <= 45) {
    title = 'The outage became a legitimacy crisis.';
    note = 'Technical fixes landed too unevenly, so confidence and coordination collapsed before full recovery.';
  } else if (state.uptime >= 82 && state.risk <= 32) {
    title = 'You built a strong recovery corridor.';
    note = 'Critical services stayed stable, and the campus had clear signals about what would recover next.';
  }

  endingCard.innerHTML = `<h3>${title}</h3><p>${note}</p>`;
  endingCard.classList.remove('hidden');
}

function renderDistricts() {
  const shift = getCurrentShift();
  districtGrid.innerHTML = shift.districts
    .map((district) => {
      const allocation = currentAllocationFor(district.id);
      return `
        <article class="district-card">
          <header>
            <div>
              <h3>${district.name}</h3>
              <p>${district.impact}</p>
            </div>
            <span class="pill">Severity ${district.severity}</span>
          </header>
          <div class="district-meta">
            <span class="pill">Crews ${allocation.crews}</span>
            <span class="pill">Battery ${allocation.battery}</span>
            <span class="pill">Messages ${allocation.messages}</span>
          </div>
          <div class="allocation-row">
            <button type="button" data-district="${district.id}" data-resource="crews" data-delta="1">+ Crew</button>
            <button type="button" data-district="${district.id}" data-resource="crews" data-delta="-1">- Crew</button>
            <button type="button" data-district="${district.id}" data-resource="battery" data-delta="1">+ Battery</button>
            <button type="button" data-district="${district.id}" data-resource="battery" data-delta="-1">- Battery</button>
            <button type="button" data-district="${district.id}" data-resource="messages" data-delta="1">+ Message</button>
            <button type="button" data-district="${district.id}" data-resource="messages" data-delta="-1">- Message</button>
          </div>
        </article>
      `;
    })
    .join('');

  districtGrid.querySelectorAll('button[data-district]').forEach((button) => {
    button.addEventListener('click', () => {
      const districtId = button.dataset.district;
      const resourceKey = button.dataset.resource;
      adjustAllocation(districtId, resourceKey, Number(button.dataset.delta));
    });
  });
}

function renderTimeline() {
  if (!state.history.length) {
    timeline.innerHTML = '<li><time>Shift log</time><p>No resolved shifts yet. Start allocating crews and battery support.</p></li>';
    return;
  }

  timeline.innerHTML = state.history
    .map(
      (entry) => `
        <li>
          <time>Shift ${entry.shift}</time>
          <strong>${entry.title}</strong>
          <p>${entry.result}</p>
        </li>
      `
    )
    .join('');
}

function renderMeters() {
  trustValue.textContent = String(state.trust);
  uptimeValue.textContent = String(state.uptime);
  riskValue.textContent = String(state.risk);
  trustMeter.style.width = `${state.trust}%`;
  uptimeMeter.style.width = `${state.uptime}%`;
  riskMeter.style.width = `${state.risk}%`;
  trustMeterLabel.textContent = `${state.trust}%`;
  uptimeMeterLabel.textContent = `${state.uptime}%`;
  riskMeterLabel.textContent = `${state.risk}%`;
}

function renderResources() {
  crewCount.textContent = String(spendable('crews'));
  batteryCount.textContent = String(spendable('battery'));
  messageCount.textContent = String(spendable('messages'));
}

function render() {
  const shift = getCurrentShift();
  shiftLabel.textContent = `Shift ${state.shiftIndex + 1} of ${incidentDeck.length}`;
  incidentCopy.textContent = `${shift.title} ${shift.prompt}`;
  renderResources();
  renderMeters();
  renderDistricts();
  renderTimeline();
}

resolveBtn.addEventListener('click', resolveShift);
resetBtn.addEventListener('click', () => {
  state = createInitialState();
  resolveBtn.disabled = false;
  endingCard.classList.add('hidden');
  statusText.textContent = 'Scenario reset. Stabilize the first outage wave.';
  render();
});

render();
