import { visitorConfig } from './visitor-config.mjs';

const storageKey = 'abhikhur:visitor-mark:v1';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readMark(storage) {
  try {
    const record = JSON.parse(storage.getItem(storageKey));
    return record && uuidPattern.test(record.id)
      ? { id: record.id, marked: record.marked === true }
      : null;
  } catch {
    return null;
  }
}

// Dependencies are explicit so failure states can be tested without a network.
export function createVisitorMark({ button, count, status, storage, randomUUID, request, config, exclusive = action => action() }) {
  let record = readMark(storage);
  let busy = false;
  let storageAvailable = false;
  let latestCount = -1;

  try {
    const probe = `${storageKey}:check`;
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    storageAvailable = true;
  } catch {
    // Reading the public count still works when browser storage is blocked.
  }

  function renderButton() {
    button.disabled = busy || !storageAvailable || record?.marked === true;
    button.setAttribute('aria-pressed', String(record?.marked === true));
    button.setAttribute('aria-busy', String(busy));
    button.textContent = record?.marked ? 'You were here' : busy ? 'Saving…' : 'I was here';
  }

  function renderCount(value) {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error('Invalid count');
    // A slow initial read must not replace a newer write receipt.
    latestCount = Math.max(latestCount, value);
    count.textContent = `${latestCount.toLocaleString('en-US')} anonymous ${latestCount === 1 ? 'mark' : 'marks'}`;
  }

  async function call(method, body) {
    const response = await request(config.endpoint, {
      method,
      headers: { apikey: config.publishableKey, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) {
      const error = new Error('Counter unavailable');
      error.rateLimited = response.status === 429;
      throw error;
    }
    return response.json();
  }

  async function load() {
    renderButton();
    try {
      const result = await call('GET');
      renderCount(result.count);
      status.textContent = record?.marked ? 'Thanks for stopping by.' : '';
    } catch {
      count.textContent = 'Shared count unavailable';
      status.textContent = 'The counter is taking a break. Please try again later.';
    } finally {
      if (!storageAvailable) {
        status.textContent = 'Allow browser storage to leave one anonymous mark. You can still see the shared count.';
      }
      renderButton();
    }
  }

  async function mark() {
    if (busy || !storageAvailable || record?.marked) return;
    // Another tab may have saved after this page loaded.
    record = readMark(storage) || record;
    if (record?.marked) {
      status.textContent = 'Thanks for stopping by.';
      renderButton();
      return;
    }
    busy = true;
    status.textContent = 'Saving your mark…';
    renderButton();
    try {
      if (!record) {
        const id = randomUUID();
        if (!uuidPattern.test(id)) throw new Error('No anonymous identifier');
        record = { id, marked: false };
      }
      // Persist before sending. A timed-out request can be retried idempotently.
      storage.setItem(storageKey, JSON.stringify(record));
      const result = await call('POST', { visitorId: record.id });
      if (result.marked !== true) throw new Error('Missing save receipt');
      renderCount(result.count);
      record.marked = true;
      try { storage.setItem(storageKey, JSON.stringify(record)); } catch { /* Server receipt is authoritative. */ }
      status.textContent = 'Thanks for stopping by.';
    } catch (error) {
      status.textContent = error.rateLimited
        ? 'Too many marks from this network. Please try again later.'
        : "Couldn't confirm your mark. Try again; retries won't add duplicates.";
    } finally {
      busy = false;
      renderButton();
    }
  }

  button.addEventListener('click', () => exclusive(mark));
  return { load, mark };
}

if (typeof document !== 'undefined') {
  const button = document.getElementById('visitor-mark-button');
  const count = document.getElementById('visitor-mark-count');
  const status = document.getElementById('visitor-mark-status');
  if (button && count && status) {
    let storage;
    try { storage = window.localStorage; } catch { /* Storage can be blocked by browser policy. */ }
    const counter = createVisitorMark({
      button, count, status, storage,
      randomUUID: () => window.crypto.randomUUID(),
      request: window.fetch.bind(window),
      config: visitorConfig,
      exclusive: action => window.navigator.locks
        ? window.navigator.locks.request(storageKey, action)
        : action(),
    });
    counter.load();
  }
}
