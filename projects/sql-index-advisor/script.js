const tableNameInput = document.getElementById('table-name');
const columnsInput = document.getElementById('columns');
const queryInput = document.getElementById('query');
const analyzeBtn = document.getElementById('analyze-btn');
const loadJoinSampleBtn = document.getElementById('load-join-sample-btn');
const patternList = document.getElementById('pattern-list');
const recommendationsRoot = document.getElementById('recommendations');
const emptyState = document.getElementById('empty-state');

function uniq(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

function normalizeSql(sql) {
  return sql.replace(/\s+/g, ' ').trim();
}

function parseColumns(rawColumns) {
  return uniq(
    rawColumns
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter((value) => /^[a-z_][a-z0-9_]*$/i.test(value))
  );
}

function extractColumnsFromSegment(segment, tableColumns) {
  const hits = [];
  for (const column of tableColumns) {
    const re = new RegExp(`\\b${column}\\b`, 'gi');
    if (re.test(segment)) {
      hits.push(column);
    }
  }
  return uniq(hits);
}

function parseQuery(sql, tableColumns) {
  const normalized = normalizeSql(sql.toLowerCase());

  const whereMatch = normalized.match(/\bwhere\b(.*?)(\border by\b|\bgroup by\b|\blimit\b|$)/i);
  const orderByMatch = normalized.match(/\border by\b(.*?)(\blimit\b|$)/i);
  const groupByMatch = normalized.match(/\bgroup by\b(.*?)(\border by\b|\blimit\b|$)/i);
  const joinMatches = Array.from(normalized.matchAll(/\bjoin\b\s+[a-z0-9_."`]+\s+\bon\b(.*?)(\bjoin\b|\bwhere\b|\border by\b|\bgroup by\b|\blimit\b|$)/gi));

  const whereColumns = extractColumnsFromSegment(whereMatch?.[1] || '', tableColumns);
  const orderByColumns = extractColumnsFromSegment(orderByMatch?.[1] || '', tableColumns);
  const groupByColumns = extractColumnsFromSegment(groupByMatch?.[1] || '', tableColumns);
  const joinColumns = uniq(
    joinMatches.flatMap((match) => extractColumnsFromSegment(match[1] || '', tableColumns))
  );

  return { whereColumns, orderByColumns, groupByColumns, joinColumns };
}

function buildRecommendations(tableName, tableColumns, queryPattern) {
  const candidates = [];
  const where = queryPattern.whereColumns;
  const orderBy = queryPattern.orderByColumns;
  const groupBy = queryPattern.groupByColumns;
  const join = queryPattern.joinColumns;

  if (where.length > 0) {
    candidates.push({
      name: 'Filter Index',
      columns: where,
      score: Math.min(90, 60 + where.length * 10),
      why: `Targets WHERE filtering on ${where.join(', ')}.`,
    });
  }

  if (where.length > 0 && orderBy.length > 0) {
    const composite = uniq([...where, ...orderBy]);
    candidates.push({
      name: 'Filter + Sort Composite',
      columns: composite,
      score: Math.min(96, 72 + composite.length * 6),
      why: `Supports WHERE filtering and ORDER BY on one access path.`,
    });
  }

  if (join.length > 0) {
    candidates.push({
      name: 'Join Key Index',
      columns: join,
      score: Math.min(92, 68 + join.length * 8),
      why: `Reduces lookup cost for JOIN predicates using ${join.join(', ')}.`,
    });
  }

  if (groupBy.length > 0) {
    candidates.push({
      name: 'Grouping Index',
      columns: groupBy,
      score: Math.min(88, 64 + groupBy.length * 7),
      why: `Improves grouping path for GROUP BY columns.`,
    });
  }

  const fallbackColumns = where.length ? where : tableColumns.slice(0, 1);
  if (!candidates.length && fallbackColumns.length) {
    candidates.push({
      name: 'Baseline Access Index',
      columns: fallbackColumns,
      score: 55,
      why: 'No obvious filter/sort keys found. Baseline index may still aid point lookups.',
    });
  }

  return candidates.map((item, index) => {
    const safeName = item.columns.join('_');
    const ddl = `CREATE INDEX idx_${tableName}_${safeName}_${index + 1} ON ${tableName} (${item.columns.join(', ')});`;
    return { ...item, ddl };
  });
}

function renderPattern(queryPattern) {
  const lines = [
    `WHERE columns: ${queryPattern.whereColumns.length ? queryPattern.whereColumns.join(', ') : 'None detected'}`,
    `ORDER BY columns: ${queryPattern.orderByColumns.length ? queryPattern.orderByColumns.join(', ') : 'None detected'}`,
    `GROUP BY columns: ${queryPattern.groupByColumns.length ? queryPattern.groupByColumns.join(', ') : 'None detected'}`,
    `JOIN columns: ${queryPattern.joinColumns.length ? queryPattern.joinColumns.join(', ') : 'None detected'}`,
  ];

  patternList.innerHTML = '';
  for (const line of lines) {
    const li = document.createElement('li');
    li.textContent = line;
    patternList.appendChild(li);
  }
}

function renderRecommendations(items) {
  recommendationsRoot.innerHTML = '';
  emptyState.style.display = items.length ? 'none' : 'block';

  for (const item of items) {
    const card = document.createElement('article');
    card.className = 'recommendation-card';

    const title = document.createElement('h3');
    title.textContent = item.name;

    const score = document.createElement('span');
    score.className = 'score';
    score.textContent = `${item.score}/100`;
    title.appendChild(score);

    const why = document.createElement('p');
    why.textContent = item.why;

    const cols = document.createElement('p');
    cols.textContent = `Columns: ${item.columns.join(', ')}`;

    const ddl = document.createElement('pre');
    ddl.className = 'ddl';
    ddl.textContent = item.ddl;

    card.appendChild(title);
    card.appendChild(why);
    card.appendChild(cols);
    card.appendChild(ddl);
    recommendationsRoot.appendChild(card);
  }
}

function runAnalysis() {
  const tableName = (tableNameInput.value || '').trim().toLowerCase() || 'table_name';
  const tableColumns = parseColumns(columnsInput.value || '');
  const query = queryInput.value || '';

  const queryPattern = parseQuery(query, tableColumns);
  const recommendations = buildRecommendations(tableName, tableColumns, queryPattern);
  renderPattern(queryPattern);
  renderRecommendations(recommendations);
}

analyzeBtn.addEventListener('click', runAnalysis);
loadJoinSampleBtn.addEventListener('click', () => {
  tableNameInput.value = 'orders';
  columnsInput.value = 'order_id, customer_id, status, created_at, region_id, sales_rep_id, total_amount';
  queryInput.value = `SELECT o.order_id, o.total_amount, c.customer_id
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
WHERE o.status = 'paid'
  AND o.region_id = 2
ORDER BY o.created_at DESC;`;
  runAnalysis();
});

runAnalysis();
