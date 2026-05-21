const leftInput = document.getElementById('left-input');
const rightInput = document.getElementById('right-input');
const leftKeySelect = document.getElementById('left-key');
const rightKeySelect = document.getElementById('right-key');
const joinModeSelect = document.getElementById('join-mode');
const statusEl = document.getElementById('status');
const joinPostureEl = document.getElementById('join-posture');
const matchedKeysEl = document.getElementById('matched-keys');
const leftOnlyEl = document.getElementById('left-only');
const rightOnlyEl = document.getElementById('right-only');
const leftDuplicatesEl = document.getElementById('left-duplicates');
const rightDuplicatesEl = document.getElementById('right-duplicates');
const riskBoardEl = document.getElementById('risk-board');
const schemaBoardEl = document.getElementById('schema-board');
const leftOnlyListEl = document.getElementById('left-only-list');
const rightOnlyListEl = document.getElementById('right-only-list');
const previewHeadEl = document.getElementById('preview-head');
const previewBodyEl = document.getElementById('preview-body');
const analyzeJoinButton = document.getElementById('analyze-join');
const copySummaryButton = document.getElementById('copy-summary');
const exportReportButton = document.getElementById('export-report');
const loadSampleButton = document.getElementById('load-sample');

const appState = {
  left: null,
  right: null,
  lastReport: null,
};

function setStatus(message) {
  statusEl.textContent = message;
}

function detectDelimiter(text) {
  const sample = text.split(/\r?\n/).slice(0, 4).join('\n');
  const options = [
    { delimiter: ',', score: (sample.match(/,/g) || []).length },
    { delimiter: '\t', score: (sample.match(/\t/g) || []).length },
    { delimiter: '|', score: (sample.match(/\|/g) || []).length },
  ].sort((a, b) => b.score - a.score);
  return options[0]?.score ? options[0].delimiter : ',';
}

function parseDelimited(text) {
  const delimiter = detectDelimiter(text);
  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        i += 1;
      }
      row.push(field);
      if (row.some((cell) => cell.trim() !== '')) {
        rows.push(row);
      }
      field = '';
      row = [];
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((cell) => cell.trim() !== '')) {
    rows.push(row);
  }

  if (rows.length < 2) {
    throw new Error('Need a header row and at least one data row.');
  }

  const headers = rows[0].map((header, index) => (header.trim() ? header.trim() : `column_${index + 1}`));
  const data = rows.slice(1).map((cells) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = (cells[index] || '').trim();
    });
    return record;
  });

  return { delimiter, headers, rows: data };
}

function populateKeySelect(selectEl, headers) {
  selectEl.innerHTML = headers.map((header) => `<option value="${header}">${header}</option>`).join('');
}

function parseInputs() {
  appState.left = parseDelimited(leftInput.value.trim());
  appState.right = parseDelimited(rightInput.value.trim());
  populateKeySelect(leftKeySelect, appState.left.headers);
  populateKeySelect(rightKeySelect, appState.right.headers);
}

function groupByKey(rows, key) {
  const map = new Map();
  rows.forEach((row) => {
    const rawValue = row[key];
    const value = rawValue === undefined || rawValue === '' ? '(blank)' : rawValue;
    if (!map.has(value)) {
      map.set(value, []);
    }
    map.get(value).push(row);
  });
  return map;
}

function summarizeDuplicates(grouped) {
  return [...grouped.entries()].filter(([, rows]) => rows.length > 1);
}

function classifyRisk(report) {
  const duplicatePressure = report.leftDuplicateGroups.length + report.rightDuplicateGroups.length;
  if (duplicatePressure >= 3) {
    return 'High risk: duplicate keys can multiply rows and silently distort aggregates.';
  }
  if (report.leftOnlyKeys.length || report.rightOnlyKeys.length) {
    return 'Medium risk: unmatched keys will drop or hollow out records depending on join mode.';
  }
  return 'Low risk: keys mostly align and duplicate pressure looks contained.';
}

function prefixRightRow(row, leftHeaders) {
  const output = {};
  Object.entries(row).forEach(([header, value]) => {
    const key = leftHeaders.includes(header) ? `right_${header}` : header;
    output[key] = value;
  });
  return output;
}

function buildJoinedPreview(report, joinMode) {
  const preview = [];
  const joinKeys = new Set([
    ...report.matchedKeys,
    ...(joinMode === 'left' || joinMode === 'full' ? report.leftOnlyKeys : []),
    ...(joinMode === 'full' ? report.rightOnlyKeys : []),
  ]);

  joinKeys.forEach((key) => {
    const leftRows = report.leftGroups.get(key) || [];
    const rightRows = report.rightGroups.get(key) || [];

    if (leftRows.length && rightRows.length) {
      leftRows.forEach((leftRow) => {
        rightRows.forEach((rightRow) => {
          preview.push({ joinKey: key, ...leftRow, ...prefixRightRow(rightRow, report.leftHeaders) });
        });
      });
      return;
    }

    if ((joinMode === 'left' || joinMode === 'full') && leftRows.length) {
      leftRows.forEach((leftRow) => preview.push({ joinKey: key, ...leftRow }));
    }

    if (joinMode === 'full' && rightRows.length) {
      rightRows.forEach((rightRow) => preview.push({ joinKey: key, ...prefixRightRow(rightRow, report.leftHeaders) }));
    }
  });

  return preview.slice(0, 12);
}

function renderKeyList(element, keys) {
  element.innerHTML = '';
  if (!keys.length) {
    element.innerHTML = '<li>None</li>';
    return;
  }
  keys.slice(0, 10).forEach((key) => {
    const item = document.createElement('li');
    item.textContent = key;
    element.appendChild(item);
  });
}

function renderPreview(rows) {
  if (!rows.length) {
    previewHeadEl.innerHTML = '';
    previewBodyEl.innerHTML = '<tr><td>No rows survive the current join mode and key pairing.</td></tr>';
    return;
  }

  const headers = Object.keys(rows[0]);
  previewHeadEl.innerHTML = `<tr>${headers.map((header) => `<th>${header}</th>`).join('')}</tr>`;
  previewBodyEl.innerHTML = rows.map((row) => `<tr>${headers.map((header) => `<td>${row[header] || ''}</td>`).join('')}</tr>`).join('');
}

function analyzeJoin() {
  try {
    parseInputs();
  } catch (error) {
    setStatus(error.message);
    return;
  }

  const leftKey = leftKeySelect.value;
  const rightKey = rightKeySelect.value;
  const joinMode = joinModeSelect.value;

  const leftGroups = groupByKey(appState.left.rows, leftKey);
  const rightGroups = groupByKey(appState.right.rows, rightKey);
  const leftKeys = [...leftGroups.keys()];
  const rightKeys = [...rightGroups.keys()];
  const matchedKeys = leftKeys.filter((key) => rightGroups.has(key));
  const leftOnlyKeys = leftKeys.filter((key) => !rightGroups.has(key));
  const rightOnlyKeys = rightKeys.filter((key) => !leftGroups.has(key));
  const leftDuplicateGroups = summarizeDuplicates(leftGroups);
  const rightDuplicateGroups = summarizeDuplicates(rightGroups);

  const report = {
    joinMode,
    leftKey,
    rightKey,
    leftHeaders: appState.left.headers,
    rightHeaders: appState.right.headers,
    matchedKeys,
    leftOnlyKeys,
    rightOnlyKeys,
    leftDuplicateGroups,
    rightDuplicateGroups,
    leftGroups,
    rightGroups,
    preview: [],
  };

  report.preview = buildJoinedPreview(report, joinMode);
  appState.lastReport = report;

  const posture =
    leftDuplicateGroups.length || rightDuplicateGroups.length
      ? 'Many-to-many pressure'
      : leftOnlyKeys.length || rightOnlyKeys.length
        ? 'Partial key overlap'
        : 'Clean one-to-one / one-to-many posture';

  joinPostureEl.textContent = posture;
  matchedKeysEl.textContent = String(matchedKeys.length);
  leftOnlyEl.textContent = String(leftOnlyKeys.length);
  rightOnlyEl.textContent = String(rightOnlyKeys.length);
  leftDuplicatesEl.textContent = leftDuplicateGroups.length ? `${leftDuplicateGroups.length} key groups` : 'None';
  rightDuplicatesEl.textContent = rightDuplicateGroups.length ? `${rightDuplicateGroups.length} key groups` : 'None';

  riskBoardEl.textContent = classifyRisk(report);
  const sharedHeaders = appState.left.headers.filter((header) => appState.right.headers.includes(header) && header !== rightKey);
  const leftExclusive = appState.left.headers.filter((header) => !appState.right.headers.includes(header));
  const rightExclusive = appState.right.headers.filter((header) => !appState.left.headers.includes(header));
  schemaBoardEl.textContent = `Shared columns: ${sharedHeaders.length ? sharedHeaders.join(', ') : 'none besides the join key.'} Left-only columns: ${leftExclusive.length ? leftExclusive.join(', ') : 'none.'} Right-only columns: ${rightExclusive.length ? rightExclusive.join(', ') : 'none.'}`;

  renderKeyList(leftOnlyListEl, leftOnlyKeys);
  renderKeyList(rightOnlyListEl, rightOnlyKeys);
  renderPreview(report.preview);
  setStatus(`Analyzed ${appState.left.rows.length} left rows against ${appState.right.rows.length} right rows using ${leftKey} -> ${rightKey}.`);
}

function exportReport() {
  if (!appState.lastReport) {
    setStatus('Run an analysis before exporting a report.');
    return;
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    joinMode: appState.lastReport.joinMode,
    leftKey: appState.lastReport.leftKey,
    rightKey: appState.lastReport.rightKey,
    matchedKeys: appState.lastReport.matchedKeys,
    leftOnlyKeys: appState.lastReport.leftOnlyKeys,
    rightOnlyKeys: appState.lastReport.rightOnlyKeys,
    leftDuplicateGroups: appState.lastReport.leftDuplicateGroups.map(([key, rows]) => ({ key, count: rows.length })),
    rightDuplicateGroups: appState.lastReport.rightDuplicateGroups.map(([key, rows]) => ({ key, count: rows.length })),
    preview: appState.lastReport.preview,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'csv-join-sentinel-report.json';
  anchor.click();
  URL.revokeObjectURL(url);
  setStatus('Exported the current join report JSON.');
}

async function copySummary() {
  if (!appState.lastReport) {
    setStatus('Analyze a join before copying a summary.');
    return;
  }

  const lines = [
    'CSV Join Sentinel Summary',
    `Mode: ${appState.lastReport.joinMode}`,
    `Keys: ${appState.lastReport.leftKey} -> ${appState.lastReport.rightKey}`,
    `Posture: ${joinPostureEl.textContent}`,
    `Matched keys: ${matchedKeysEl.textContent}`,
    `Left only: ${leftOnlyEl.textContent}`,
    `Right only: ${rightOnlyEl.textContent}`,
    `Risk: ${riskBoardEl.textContent}`,
    `Schema: ${schemaBoardEl.textContent}`,
  ].join('\n');

  try {
    await navigator.clipboard.writeText(lines);
    setStatus('Copied the current join summary.');
  } catch (error) {
    setStatus('Clipboard copy failed in this environment.');
  }
}

function loadSample() {
  leftInput.value = `customer_id,name,tier\n101,Avery,Gold\n102,Briar,Silver\n103,Cam,Gold\n103,Cam Duplicate,Gold\n105,Eli,Bronze`;
  rightInput.value = `customer_id,last_order,status\n101,2026-05-18,active\n103,2026-05-19,active\n104,2026-05-20,paused\n103,2026-05-21,vip`;
  analyzeJoin();
}

analyzeJoinButton.addEventListener('click', analyzeJoin);
copySummaryButton.addEventListener('click', copySummary);
exportReportButton.addEventListener('click', exportReport);
loadSampleButton.addEventListener('click', loadSample);

loadSample();
