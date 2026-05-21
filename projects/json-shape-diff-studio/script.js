const leftInput = document.getElementById('left-json');
const rightInput = document.getElementById('right-json');
const compareBtn = document.getElementById('compare-btn');
const swapBtn = document.getElementById('swap-btn');
const copySummaryBtn = document.getElementById('copy-summary-btn');
const summaryText = document.getElementById('summary-text');
const filterSelect = document.getElementById('change-filter');
const diffBody = document.getElementById('diff-body');

const countEls = {
  total: document.getElementById('total-count'),
  added: document.getElementById('added-count'),
  removed: document.getElementById('removed-count'),
  type: document.getElementById('type-count'),
  value: document.getElementById('value-count'),
  unchanged: document.getElementById('unchanged-count'),
};

const presetButtons = Array.from(document.querySelectorAll('.preset-btn'));

const presets = {
  api: {
    left: {
      user: {
        id: 42,
        name: 'Abhi',
        roles: ['admin', 'editor'],
        profile: {
          timezone: 'America/Chicago',
          emailVerified: true,
        },
      },
      featureFlags: {
        blog: false,
        betaSearch: true,
      },
    },
    right: {
      user: {
        id: '42',
        name: 'Abhi',
        roles: ['admin', 'editor', 'writer'],
        profile: {
          timezone: 'America/Chicago',
          emailVerified: true,
          avatarUrl: '/avatars/42.png',
        },
      },
      featureFlags: {
        blog: true,
        betaSearch: true,
      },
      audit: {
        updatedAt: '2026-05-21T00:00:00Z',
      },
    },
  },
  config: {
    left: {
      app: {
        name: 'portfolio',
        retries: 3,
        theme: {
          accent: '#88d498',
          motion: true,
        },
      },
      deploy: {
        target: 'github-pages',
        branch: 'main',
      },
    },
    right: {
      app: {
        name: 'portfolio',
        retries: 5,
        theme: {
          accent: ['#88d498', '#4dc7b6'],
          motion: false,
        },
      },
      deploy: {
        target: 'github-pages',
      },
      checks: {
        html: true,
        links: false,
      },
    },
  },
};

let lastDiffRows = [];

function formatJson(value) {
  return JSON.stringify(value, null, 2);
}

function getNodeType(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function previewValue(value) {
  if (typeof value === 'string') {
    return value.length > 42 ? `${value.slice(0, 39)}...` : value;
  }

  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `[${value.length} item${value.length === 1 ? '' : 's'}]`;
  }

  if (typeof value === 'object') {
    return `{${Object.keys(value).length} key${Object.keys(value).length === 1 ? '' : 's'}}`;
  }

  return String(value);
}

function flattenJson(value, basePath = '$', output = new Map()) {
  output.set(basePath, {
    type: getNodeType(value),
    preview: previewValue(value),
  });

  if (Array.isArray(value)) {
    value.forEach((entry, index) => flattenJson(entry, `${basePath}[${index}]`, output));
    return output;
  }

  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, entry]) => flattenJson(entry, `${basePath}.${key}`, output));
  }

  return output;
}

function safeParse(raw, label) {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch (error) {
    summaryText.textContent = `${label} JSON is invalid: ${error.message}`;
    return { ok: false, value: null };
  }
}

function compareMaps(leftMap, rightMap) {
  const paths = Array.from(new Set([...leftMap.keys(), ...rightMap.keys()])).sort();
  return paths.map((path) => {
    const left = leftMap.get(path);
    const right = rightMap.get(path);

    if (!left) {
      return { path, status: 'added', left: '-', right: right.type, preview: right.preview };
    }

    if (!right) {
      return { path, status: 'removed', left: left.type, right: '-', preview: left.preview };
    }

    if (left.type !== right.type) {
      return {
        path,
        status: 'type-changed',
        left: left.type,
        right: right.type,
        preview: `${left.preview} -> ${right.preview}`,
      };
    }

    if (left.preview !== right.preview) {
      return {
        path,
        status: 'value-changed',
        left: left.type,
        right: right.type,
        preview: `${left.preview} -> ${right.preview}`,
      };
    }

    return { path, status: 'unchanged', left: left.type, right: right.type, preview: left.preview };
  });
}

function setCounts(rows) {
  const counts = {
    total: rows.length,
    added: rows.filter((row) => row.status === 'added').length,
    removed: rows.filter((row) => row.status === 'removed').length,
    type: rows.filter((row) => row.status === 'type-changed').length,
    value: rows.filter((row) => row.status === 'value-changed').length,
    unchanged: rows.filter((row) => row.status === 'unchanged').length,
  };

  Object.entries(counts).forEach(([key, value]) => {
    countEls[key].textContent = String(value);
  });
}

function renderRows(rows) {
  const activeFilter = filterSelect.value;
  const visibleRows = activeFilter === 'all'
    ? rows
    : rows.filter((row) => row.status === activeFilter);

  if (!visibleRows.length) {
    diffBody.innerHTML = '<tr><td colspan="5" class="empty-row">No paths match this filter.</td></tr>';
    return;
  }

  diffBody.innerHTML = visibleRows.map((row) => `
    <tr data-status="${row.status}">
      <td><code>${row.path}</code></td>
      <td>${row.status}</td>
      <td>${row.left}</td>
      <td>${row.right}</td>
      <td><code>${row.preview}</code></td>
    </tr>
  `).join('');
}

function runDiff() {
  const leftParsed = safeParse(leftInput.value, 'Left');
  if (!leftParsed.ok) return;

  const rightParsed = safeParse(rightInput.value, 'Right');
  if (!rightParsed.ok) return;

  const rows = compareMaps(flattenJson(leftParsed.value), flattenJson(rightParsed.value));
  lastDiffRows = rows;
  setCounts(rows);
  renderRows(rows);

  const changedCount = rows.filter((row) => row.status !== 'unchanged').length;
  summaryText.textContent = changedCount
    ? `${changedCount} path-level changes detected across ${rows.length} tracked nodes.`
    : `No path-level changes detected across ${rows.length} tracked nodes.`;
}

async function copySummary() {
  if (!lastDiffRows.length) {
    summaryText.textContent = 'Run a diff first so there is something useful to copy.';
    return;
  }

  const lines = [
    'JSON Shape Diff Studio',
    summaryText.textContent,
    `Added: ${countEls.added.textContent}`,
    `Removed: ${countEls.removed.textContent}`,
    `Type drift: ${countEls.type.textContent}`,
    `Value changes: ${countEls.value.textContent}`,
  ];

  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    summaryText.textContent = 'Copied the summary counts to your clipboard.';
  } catch {
    summaryText.textContent = 'Clipboard copy failed in this environment.';
  }
}

function loadPreset(name) {
  const preset = presets[name];
  if (!preset) return;
  leftInput.value = formatJson(preset.left);
  rightInput.value = formatJson(preset.right);
  runDiff();
}

compareBtn.addEventListener('click', runDiff);
swapBtn.addEventListener('click', () => {
  const nextLeft = rightInput.value;
  rightInput.value = leftInput.value;
  leftInput.value = nextLeft;
  runDiff();
});
copySummaryBtn.addEventListener('click', copySummary);
filterSelect.addEventListener('change', () => renderRows(lastDiffRows));
presetButtons.forEach((button) => {
  button.addEventListener('click', () => loadPreset(button.dataset.preset));
});

loadPreset('api');
