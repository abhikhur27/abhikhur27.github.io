const csvInput = document.getElementById('csv-input');
const delimiterSelect = document.getElementById('delimiter-select');
const headerCheckbox = document.getElementById('header-checkbox');
const analyzeBtn = document.getElementById('analyze-btn');
const loadSampleBtn = document.getElementById('load-sample-btn');
const clearBtn = document.getElementById('clear-btn');
const copyBriefBtn = document.getElementById('copy-brief-btn');
const exportReportBtn = document.getElementById('export-report-btn');
const statusText = document.getElementById('status-text');
const summaryRows = document.getElementById('summary-rows');
const summaryColumns = document.getElementById('summary-columns');
const summaryDuplicates = document.getElementById('summary-duplicates');
const summaryMissing = document.getElementById('summary-missing');
const readinessSummary = document.getElementById('readiness-summary');
const issueList = document.getElementById('issue-list');
const profileBody = document.getElementById('profile-body');

const SAMPLE_DATA = `order_id,customer,status,total,discount_code,signup_date,last_seen,priority_score
1001,Ada,paid,42.50,,2026-05-01,2026-05-20,0.91
1002,Ben,pending,18.25,SPRING10,2026-05-02,2026-05-21,0.41
1003,Cam,refunded,-18.25,SPRING10,2026-05-02,,0.37
1004,Dia,paid,0,,2026-05-03,2026-05-21,high
1005,Eli,paid,67.10,VIP,2026-05-03,2026-05-21,0.97
1005,Eli,paid,67.10,VIP,2026-05-03,2026-05-21,0.97`;

let lastProfile = null;

function detectDelimiter(input) {
  const firstLine = input.split(/\r?\n/).find((line) => line.trim().length);
  if (!firstLine) return ',';

  const candidates = [',', ';', '\t', '|'];
  let best = ',';
  let bestCount = -1;

  candidates.forEach((candidate) => {
    const count = firstLine.split(candidate).length;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  });

  return best;
}

function parseCsv(text, delimiter) {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
      row.push(value);
      value = '';
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') {
        i += 1;
      }
      row.push(value);
      if (row.some((cell) => cell.trim() !== '')) {
        rows.push(row);
      }
      row = [];
      value = '';
      continue;
    }

    value += char;
  }

  row.push(value);
  if (row.some((cell) => cell.trim() !== '')) {
    rows.push(row);
  }

  return rows;
}

function normalizeRows(rows, hasHeader) {
  if (!rows.length) {
    return { headers: [], records: [] };
  }

  const width = Math.max(...rows.map((row) => row.length));
  const padded = rows.map((row) => Array.from({ length: width }, (_, index) => (row[index] ?? '').trim()));
  const headers = hasHeader
    ? padded[0].map((value, index) => value || `column_${index + 1}`)
    : Array.from({ length: width }, (_, index) => `column_${index + 1}`);
  const dataRows = hasHeader ? padded.slice(1) : padded;

  return {
    headers,
    records: dataRows.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? '']))),
  };
}

function inferCellType(value) {
  const trimmed = value.trim();
  if (!trimmed) return 'empty';
  if (/^(true|false)$/i.test(trimmed)) return 'boolean';
  if (!Number.isNaN(Number(trimmed)) && trimmed !== '') return 'number';
  if (!Number.isNaN(Date.parse(trimmed)) && /[-/:]/.test(trimmed)) return 'date';
  return 'text';
}

function inferColumnType(typeCounts) {
  const entries = [...typeCounts.entries()].filter(([key]) => key !== 'empty');
  if (!entries.length) return 'empty';
  if (entries.length === 1) return entries[0][0];
  return 'mixed';
}

function summarizeColumn(header, values, rowCount) {
  const nonEmpty = values.filter((value) => value.trim() !== '');
  const typeCounts = new Map();

  values.forEach((value) => {
    const type = inferCellType(value);
    typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
  });

  const inferredType = inferColumnType(typeCounts);
  const nullPct = rowCount ? (values.length - nonEmpty.length) / rowCount : 0;
  const uniquePct = nonEmpty.length ? new Set(nonEmpty).size / nonEmpty.length : 0;
  const samples = [...new Set(nonEmpty)].slice(0, 3);

  const numericValues = nonEmpty
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  const details = [];
  if (numericValues.length === nonEmpty.length && numericValues.length) {
    details.push(`min ${Math.min(...numericValues)}`);
    details.push(`max ${Math.max(...numericValues)}`);
    const mean = numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
    details.push(`mean ${mean.toFixed(2)}`);
  }

  const watchParts = [];
  if (inferredType === 'mixed') watchParts.push('Mixed field types');
  if (nullPct >= 0.3) watchParts.push('Null-heavy');
  if (uniquePct <= 0.15 && nonEmpty.length >= 5) watchParts.push('Low-cardinality');
  if (!watchParts.length && details.length) watchParts.push(details.join(' | '));
  if (!watchParts.length) watchParts.push('Looks stable');

  const risk = inferredType === 'mixed' || nullPct >= 0.4 ? 'danger' : nullPct >= 0.2 ? 'warning' : 'ok';

  return {
    header,
    inferredType,
    nullPct,
    uniquePct,
    samples,
    risk,
    watch: watchParts.join(' | '),
  };
}

function analyzeCsv() {
  const raw = csvInput.value.trim();
  if (!raw) {
    statusText.textContent = 'Paste CSV data first.';
    return;
  }

  const delimiter = delimiterSelect.value === 'auto'
    ? detectDelimiter(raw)
    : delimiterSelect.value === 'tab'
      ? '\t'
      : delimiterSelect.value;

  const parsedRows = parseCsv(raw, delimiter);
  const { headers, records } = normalizeRows(parsedRows, headerCheckbox.checked);

  if (!headers.length || !records.length) {
    statusText.textContent = 'The CSV parsed, but there were no data rows to profile.';
    return;
  }

  const profiles = headers.map((header) => summarizeColumn(header, records.map((record) => record[header] || ''), records.length))
    .sort((a, b) => {
      const score = { danger: 0, warning: 1, ok: 2 };
      return score[a.risk] - score[b.risk];
    });

  const duplicateRows = records.length - new Set(records.map((record) => JSON.stringify(record))).size;
  const missingCells = headers.reduce(
    (total, header) => total + records.filter((record) => !(record[header] || '').trim()).length,
    0,
  );

  const issues = [];
  const mixedColumns = profiles.filter((profile) => profile.inferredType === 'mixed');
  const sparseColumns = profiles.filter((profile) => profile.nullPct >= 0.3);
  const lowCardinality = profiles.filter((profile) => profile.uniquePct <= 0.15 && profile.inferredType !== 'empty');

  if (mixedColumns.length) {
    issues.push(`Mixed-type columns: ${mixedColumns.map((profile) => profile.header).join(', ')}.`);
  }
  if (sparseColumns.length) {
    issues.push(`Null-heavy columns: ${sparseColumns.map((profile) => profile.header).join(', ')}.`);
  }
  if (duplicateRows > 0) {
    issues.push(`${duplicateRows} duplicate row${duplicateRows === 1 ? '' : 's'} detected.`);
  }
  if (!issues.length && lowCardinality.length) {
    issues.push(`Stable categorical fields detected: ${lowCardinality.map((profile) => profile.header).join(', ')}.`);
  }
  if (!issues.length) {
    issues.push('No major import blockers detected in the current sample.');
  }

  lastProfile = {
    rowCount: records.length,
    columnCount: headers.length,
    duplicateRows,
    missingCells,
    issues,
    profiles,
  };

  renderProfile(lastProfile);
  statusText.textContent = `Profiled ${records.length} row${records.length === 1 ? '' : 's'} across ${headers.length} column${headers.length === 1 ? '' : 's'}.`;
}

function renderProfile(profile) {
  summaryRows.textContent = String(profile.rowCount);
  summaryColumns.textContent = String(profile.columnCount);
  summaryDuplicates.textContent = String(profile.duplicateRows);
  summaryMissing.textContent = String(profile.missingCells);

  readinessSummary.textContent = profile.issues[0];
  issueList.innerHTML = '';
  profile.issues.forEach((issue) => {
    const item = document.createElement('li');
    item.textContent = issue;
    issueList.append(item);
  });

  profileBody.innerHTML = '';
  profile.profiles.forEach((column) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${escapeHtml(column.header)}</strong></td>
      <td><span class="type-chip">${column.inferredType}</span></td>
      <td>${(column.nullPct * 100).toFixed(0)}%</td>
      <td>${(column.uniquePct * 100).toFixed(0)}%</td>
      <td class="mono">${escapeHtml(column.samples.join(' | ') || 'No non-empty samples')}</td>
      <td><span class="risk-chip ${column.risk}">${column.watch}</span></td>
    `;
    profileBody.append(row);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function buildBrief() {
  if (!lastProfile) {
    return 'No CSV profile available yet.';
  }

  const flagged = lastProfile.profiles.filter((profile) => profile.risk !== 'ok').slice(0, 4);
  const lines = [
    'CSV Column Profiler Brief',
    `Rows: ${lastProfile.rowCount}`,
    `Columns: ${lastProfile.columnCount}`,
    `Duplicate rows: ${lastProfile.duplicateRows}`,
    `Missing cells: ${lastProfile.missingCells}`,
    `Primary read: ${lastProfile.issues[0]}`,
  ];

  if (flagged.length) {
    lines.push('Flagged columns:');
    flagged.forEach((profile) => {
      lines.push(`- ${profile.header}: ${profile.inferredType}, ${(profile.nullPct * 100).toFixed(0)}% null, ${(profile.uniquePct * 100).toFixed(0)}% unique, ${profile.watch}`);
    });
  }

  return lines.join('\n');
}

async function copyBrief() {
  const brief = buildBrief();
  try {
    await navigator.clipboard.writeText(brief);
    statusText.textContent = 'Copied the profiling brief.';
  } catch {
    statusText.textContent = 'Clipboard copy failed for the profiling brief.';
  }
}

function exportReport() {
  if (!lastProfile) {
    statusText.textContent = 'Analyze a CSV before exporting a report.';
    return;
  }

  const rows = [
    '# CSV Column Profiler Report',
    '',
    buildBrief(),
    '',
    '## Column table',
    '| Column | Type | Null % | Unique % | Watch-out |',
    '| --- | --- | ---: | ---: | --- |',
    ...lastProfile.profiles.map((profile) => `| ${profile.header} | ${profile.inferredType} | ${(profile.nullPct * 100).toFixed(0)}% | ${(profile.uniquePct * 100).toFixed(0)}% | ${profile.watch} |`),
  ];

  const blob = new Blob([rows.join('\n')], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'csv-column-profiler-report.md';
  link.click();
  URL.revokeObjectURL(url);
  statusText.textContent = 'Exported the profiling report.';
}

function clearAll() {
  csvInput.value = '';
  lastProfile = null;
  summaryRows.textContent = '-';
  summaryColumns.textContent = '-';
  summaryDuplicates.textContent = '-';
  summaryMissing.textContent = '-';
  readinessSummary.textContent = 'Analyze a dataset to score its current QA posture.';
  issueList.innerHTML = '<li>No issues yet. Run an analysis first.</li>';
  profileBody.innerHTML = '<tr><td colspan="6" class="empty">Analyze a CSV to inspect column-level profiles.</td></tr>';
  statusText.textContent = 'Cleared the profiler workspace.';
}

loadSampleBtn.addEventListener('click', () => {
  csvInput.value = SAMPLE_DATA;
  statusText.textContent = 'Loaded a sample order-export dataset.';
  analyzeCsv();
});
analyzeBtn.addEventListener('click', analyzeCsv);
clearBtn.addEventListener('click', clearAll);
copyBriefBtn.addEventListener('click', copyBrief);
exportReportBtn.addEventListener('click', exportReport);
