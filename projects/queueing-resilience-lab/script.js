const crewBoard = document.getElementById('crew-board');
const incidentBoard = document.getElementById('incident-board');
const shiftLog = document.getElementById('shift-log');
const turnBrief = document.getElementById('turn-brief');

const turnCountEl = document.getElementById('turn-count');
const trustScoreEl = document.getElementById('trust-score');
const fatigueScoreEl = document.getElementById('fatigue-score');
const backlogScoreEl = document.getElementById('backlog-score');

const nextTurnButton = document.getElementById('next-turn');
const surgeButton = document.getElementById('surge-button');
const resetButton = document.getElementById('reset-button');

const crews = [
  { id: 'alpha', name: 'Alpha Transit', specialty: 'transit' },
  { id: 'bravo', name: 'Bravo Grid', specialty: 'power' },
  { id: 'charlie', name: 'Charlie Care', specialty: 'medical' },
];

const incidentTemplates = [
  {
    title: 'Platform crowding spike',
    type: 'transit',
    district: 'North Loop',
    severity: 4,
    cascade: 3,
    note: 'If ignored, spillover delays hit the next two stations.',
  },
  {
    title: 'Transformer heat alert',
    type: 'power',
    district: 'Canal Ward',
    severity: 5,
    cascade: 4,
    note: 'Failure risks a rolling outage into nearby housing blocks.',
  },
  {
    title: 'ER intake surge',
    type: 'medical',
    district: 'South Harbor',
    severity: 5,
    cascade: 5,
    note: 'Delay pushes ambulances into longer turnaround loops.',
  },
  {
    title: 'Signal timing fault',
    type: 'transit',
    district: 'Old Market',
    severity: 3,
    cascade: 2,
    note: 'Small now, but likely to poison the whole corridor by dawn.',
  },
  {
    title: 'Substation moisture leak',
    type: 'power',
    district: 'Riverside',
    severity: 4,
    cascade: 5,
    note: 'Looks minor on paper. Becomes ugly if the weather turns.',
  },
  {
    title: 'Clinic refrigeration failure',
    type: 'medical',
    district: 'West End',
    severity: 3,
    cascade: 4,
    note: 'Cold-chain loss triggers a broader service outage tomorrow.',
  },
  {
    title: 'Bridge choke point jam',
    type: 'transit',
    district: 'Glass Crossing',
    severity: 5,
    cascade: 4,
    note: 'One blocked artery can trap the whole night network.',
  },
  {
    title: 'Battery bank instability',
    type: 'power',
    district: 'Warehouse Strip',
    severity: 3,
    cascade: 3,
    note: 'Low attention item until one extra spike tips it over.',
  },
  {
    title: 'Oxygen delivery delay',
    type: 'medical',
    district: 'Hill Clinic',
    severity: 4,
    cascade: 5,
    note: 'A logistics problem that becomes clinical very quickly.',
  },
];

let state;

function initialState() {
  return {
    turn: 1,
    maxTurns: 8,
    trust: 100,
    fatigue: 0,
    surgeUsed: false,
    surgeActive: false,
    incidents: [],
    assignments: {},
    log: ['Shift opened. The city looks quiet, which usually means it is lying.'],
  };
}

function sampleIncidents(turn) {
  const rotation = (turn - 1) * 2;
  const chosen = [];

  for (let index = 0; index < 4; index += 1) {
    const base = incidentTemplates[(rotation + index) % incidentTemplates.length];
    chosen.push({
      id: `turn-${turn}-incident-${index}`,
      title: base.title,
      type: base.type,
      district: base.district,
      severity: Math.min(5, base.severity + (turn > 4 && index === 0 ? 1 : 0)),
      cascade: Math.min(5, base.cascade + (turn > 5 && index === 1 ? 1 : 0)),
      note: base.note,
      age: 0,
      assignedCrew: null,
    });
  }

  return chosen;
}

function pushLog(message) {
  state.log.unshift(message);
  state.log = state.log.slice(0, 12);
}

function crewBonus(crew, incident) {
  return crew.specialty === incident.type ? 2 : 0;
}

function responseImpact(crew, incident) {
  return incident.severity + incident.cascade + crewBonus(crew, incident) - Math.floor(state.fatigue / 20);
}

function renderCrews() {
  crewBoard.innerHTML = crews
    .map((crew) => {
      const assignedIncident = state.incidents.find((incident) => incident.assignedCrew === crew.id);
      return `
        <article class="crew-card">
          <p class="eyebrow">${crew.specialty}</p>
          <h3>${crew.name}</h3>
          <p>${assignedIncident ? `Assigned to ${assignedIncident.title}` : 'Available this turn.'}</p>
        </article>
      `;
    })
    .join('');
}

function assignCrew(incidentId, crewId) {
  state.incidents.forEach((incident) => {
    if (incident.assignedCrew === crewId) {
      incident.assignedCrew = null;
    }
  });

  const incident = state.incidents.find((entry) => entry.id === incidentId);
  if (!incident) return;

  incident.assignedCrew = incident.assignedCrew === crewId ? null : crewId;
  renderAll();
}

function renderIncidents() {
  incidentBoard.innerHTML = state.incidents
    .map((incident) => {
      const severityLabel = '■'.repeat(incident.severity);
      const cascadeLabel = '▲'.repeat(incident.cascade);

      return `
        <article class="incident-card ${incident.age > 0 ? 'aged' : ''}">
          <div class="incident-top">
            <div>
              <p class="eyebrow">${incident.type} / ${incident.district}</p>
              <h3>${incident.title}</h3>
            </div>
            <p class="age-pill">Age ${incident.age}</p>
          </div>
          <p class="incident-note">${incident.note}</p>
          <p class="incident-meta">Severity ${severityLabel} | Cascade ${cascadeLabel}</p>
          <div class="assign-row">
            ${crews
              .map((crew) => {
                const active = incident.assignedCrew === crew.id;
                return `<button class="${active ? 'active' : ''}" type="button" data-incident="${incident.id}" data-crew="${crew.id}">
                  ${crew.name}
                </button>`;
              })
              .join('')}
          </div>
        </article>
      `;
    })
    .join('');

  incidentBoard.querySelectorAll('button[data-incident]').forEach((button) => {
    button.addEventListener('click', () => assignCrew(button.dataset.incident, button.dataset.crew));
  });
}

function renderLog() {
  shiftLog.innerHTML = state.log.map((entry) => `<li>${entry}</li>`).join('');
}

function renderBrief() {
  const oldest = [...state.incidents].sort((a, b) => b.age - a.age)[0];
  const highestCascade = [...state.incidents].sort((a, b) => b.cascade - a.cascade)[0];

  turnBrief.innerHTML = `
    <p>Oldest pressure point: <strong>${oldest.title}</strong> in ${oldest.district}.</p>
    <p>Highest cascade risk: <strong>${highestCascade.title}</strong>.</p>
    <p>Current strategic problem: ${state.fatigue >= 35 ? 'crews are tired, so mismatched assignments are expensive.' : 'you still have enough capacity to prevent tomorrow’s problems, not just tonight’s fires.'}</p>
  `;
}

function renderScores() {
  turnCountEl.textContent = `${Math.min(state.turn, state.maxTurns)} / ${state.maxTurns}`;
  trustScoreEl.textContent = String(Math.max(0, state.trust));
  fatigueScoreEl.textContent = String(state.fatigue);
  backlogScoreEl.textContent = String(state.incidents.length);
  surgeButton.disabled = state.surgeUsed || state.surgeActive;
  surgeButton.textContent = state.surgeUsed ? 'Surge Protocol Used' : state.surgeActive ? 'Surge Active' : 'Activate Surge Protocol';
  nextTurnButton.textContent = state.turn > state.maxTurns ? 'Shift Complete' : 'Resolve Turn';
  nextTurnButton.disabled = state.turn > state.maxTurns;
}

function renderAll() {
  renderScores();
  renderCrews();
  renderIncidents();
  renderLog();
  renderBrief();
}

function resolveTurn() {
  if (state.turn > state.maxTurns) return;

  let trustDelta = 0;
  let fatigueDelta = state.surgeActive ? 12 : 6;
  const remaining = [];
  const crewsAvailable = state.surgeActive ? [...crews, { id: 'surge', name: 'Surge Contractor', specialty: 'any' }] : crews;

  state.incidents.forEach((incident) => {
    if (!incident.assignedCrew) {
      incident.age += 1;
      const penalty = incident.severity + incident.cascade + incident.age;
      trustDelta -= penalty;
      if (incident.age >= 2) {
        incident.severity = Math.min(5, incident.severity + 1);
        incident.cascade = Math.min(5, incident.cascade + 1);
      }
      remaining.push(incident);
      pushLog(`${incident.title} was deferred. Trust -${penalty}.`);
      return;
    }

    const crew = crewsAvailable.find((entry) => entry.id === incident.assignedCrew) || { specialty: 'any', name: 'Surge Contractor' };
    const impact = responseImpact(crew, incident);

    if (impact >= incident.severity + incident.cascade) {
      trustDelta += 4 + crewBonus(crew, incident);
      pushLog(`${crew.name} contained ${incident.title} cleanly. Trust +${4 + crewBonus(crew, incident)}.`);
    } else {
      const damage = incident.cascade + Math.max(1, incident.severity - impact);
      trustDelta -= damage;
      fatigueDelta += 2;
      pushLog(`${crew.name} stabilized ${incident.title}, but the city still felt it. Trust -${damage}.`);
    }
  });

  state.trust += trustDelta;
  state.fatigue = Math.min(100, state.fatigue + fatigueDelta);
  state.turn += 1;
  state.surgeUsed = state.surgeUsed || state.surgeActive;
  state.surgeActive = false;

  if (state.turn <= state.maxTurns) {
    state.incidents = [...remaining, ...sampleIncidents(state.turn)];
    state.incidents.forEach((incident) => {
      incident.assignedCrew = null;
    });
    pushLog(`Turn ${state.turn - 1} closed. New night incidents rolled in.`);
  } else {
    state.incidents = remaining.map((incident) => ({ ...incident, assignedCrew: null }));
    const ending =
      state.trust >= 95
        ? 'You kept the city weirdly calm. This was elite triage.'
        : state.trust >= 70
          ? 'You held the shift together. Not pretty, but resilient.'
          : 'The city survived, but it will remember the rough night.';
    pushLog(`Shift complete. ${ending}`);
  }

  renderAll();
}

function activateSurge() {
  if (state.surgeUsed || state.surgeActive) return;
  state.surgeActive = true;
  pushLog('Surge Protocol activated. One extra response is available this turn, but tomorrow gets harder.');
  renderAll();
}

function resetShift() {
  state = initialState();
  state.incidents = sampleIncidents(1);
  renderAll();
}

nextTurnButton.addEventListener('click', resolveTurn);
surgeButton.addEventListener('click', activateSurge);
resetButton.addEventListener('click', resetShift);

resetShift();
