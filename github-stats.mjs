// Public counts only. The checked-in snapshot keeps this useful when GitHub is busy.
export const REPO_CACHE_KEY = 'abhikhur:github-repos:v1';
export const CACHE_TTL_MS = 60 * 60 * 1000;
const reservedOwners = new Set(['about', 'apps', 'collections', 'contact', 'enterprise', 'events', 'explore', 'features', 'issues', 'login', 'marketplace', 'new', 'notifications', 'orgs', 'pricing', 'pulls', 'search', 'security', 'settings', 'site', 'sponsors', 'topics', 'trending', 'users']);

export function parseRepositoryUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'github.com' || url.username || url.password || url.port) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length < 2 || reservedOwners.has(parts[0].toLowerCase())) return null;
    const [owner, rawName] = parts;
    const name = rawName.replace(/\.git$/i, '');
    if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(owner) || !/^[a-z\d_.-]{1,100}$/i.test(name) || /^\.{1,2}$/.test(name)) return null;
    // A source/readme/issues link still refers to this repository, not another badge.
    return `${owner}/${name}`.toLowerCase();
  } catch { return null; }
}

export function validCount(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

export function normalizeRepository(value, key) {
  if (!value || parseRepositoryUrl(value.url) !== key || !validCount(value.stars) || !validCount(value.forks)) return null;
  return { stars: value.stars, forks: value.forks, url: `https://github.com/${key}` };
}

export function publicApiRepository(value, key) {
  if (!value || value.private !== false || parseRepositoryUrl(value.html_url) !== key) return null;
  return normalizeRepository({ stars: value.stargazers_count, forks: value.forks_count, url: value.html_url }, key);
}

export function readRepositoryCache(storage, now = Date.now()) {
  try {
    const parsed = JSON.parse(storage?.getItem(REPO_CACHE_KEY) || '{}');
    if (!parsed || typeof parsed !== 'object') return {};
    return Object.fromEntries(Object.entries(parsed).flatMap(([key, entry]) => {
      const repo = normalizeRepository(entry, key);
      return repo && Number.isFinite(entry.fetchedAt) && entry.fetchedAt > 0 && entry.fetchedAt <= now
        ? [[key, { ...repo, fetchedAt: entry.fetchedAt }]] : [];
    }));
  } catch { return {}; }
}

export async function fetchWithTimeout(request, url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new Error('Request timed out')); }, timeoutMs);
  });
  try { return await Promise.race([request(url, { ...options, signal: controller.signal }), timeout]); }
  finally { clearTimeout(timer); }
}

export async function mapConcurrent(items, concurrency, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await mapper(items[index], index);
    }
  }));
  return results;
}

export async function loadPublicSnapshot(request = globalThis.fetch, url = './data/github-activity.json') {
  try {
    const response = await fetchWithTimeout(request, url, { credentials: 'omit', cache: 'no-cache' });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.schemaVersion === 1 && data.login === 'abhikhur27' && data.repositories && typeof data.repositories === 'object' ? data : null;
  } catch { return null; }
}

export async function resolveRepositoryStats(keys, { snapshot, request = globalThis.fetch, storage, now = Date.now(), onUpdate = () => {} } = {}) {
  const cache = readRepositoryCache(storage, now);
  const resolved = {};
  const uniqueKeys = [...new Set(keys)].filter(key => parseRepositoryUrl(`https://github.com/${key}`) === key);
  for (const key of uniqueKeys) {
    const saved = normalizeRepository(snapshot?.repositories?.[key], key);
    const entry = cache[key];
    const snapshotTime = Date.parse(snapshot?.updatedAt);
    const value = entry && (!saved || entry.fetchedAt >= snapshotTime) ? normalizeRepository(entry, key) : saved;
    if (value) { resolved[key] = value; onUpdate(key, value); }
  }
  let rateLimited = false;
  await mapConcurrent(uniqueKeys, 3, async key => {
    if (cache[key] && now - cache[key].fetchedAt < CACHE_TTL_MS) return;
    if (rateLimited) return;
    try {
      const response = await fetchWithTimeout(request, `https://api.github.com/repos/${key}`, { credentials: 'omit', headers: { Accept: 'application/vnd.github+json' } });
      if (response.status === 403 || response.status === 429) rateLimited = true;
      if (!response.ok) return;
      const value = publicApiRepository(await response.json(), key);
      if (!value) return;
      resolved[key] = value;
      cache[key] = { ...value, fetchedAt: now };
      onUpdate(key, value);
    } catch { /* A stale real count is more useful than an invented zero. */ }
  });
  try { storage?.setItem(REPO_CACHE_KEY, JSON.stringify(cache)); } catch { /* Private browsing can block storage. */ }
  return resolved;
}

export function discoverCardRepositories(document) {
  const result = new Map();
  for (const card of document.querySelectorAll('.project-card')) {
    const keys = new Set([...card.querySelectorAll('a[href]')].map(link => parseRepositoryUrl(link.href)).filter(Boolean));
    for (const key of keys) {
      if (!result.has(key)) result.set(key, []);
      result.get(key).push(card);
    }
  }
  return result;
}

export async function initGitHubStats(document = globalThis.document, options = {}) {
  if (!document) return;
  const cards = discoverCardRepositories(document);
  const pairs = new Map();
  for (const [key, targets] of cards) {
    pairs.set(key, targets.map(card => {
      const group = document.createElement('span');
      group.className = 'repo-stats';
      group.dataset.repository = key;
      group.setAttribute('aria-label', `${key} on GitHub`);
      const star = document.createElement('a');
      star.className = 'repo-stat'; star.href = `https://github.com/${key}/stargazers`;
      star.title = 'GitHub stars';
      star.target = '_blank'; star.rel = 'noreferrer';
      const fork = document.createElement('a');
      fork.className = 'repo-stat'; fork.href = `https://github.com/${key}/forks`;
      fork.title = 'GitHub forks';
      fork.target = '_blank'; fork.rel = 'noreferrer';
      group.append(star, fork);
      group.hidden = true;
      (card.querySelector('.card-actions') || card).append(group);
      return { group, star, fork };
    }));
  }
  const request = options.request || globalThis.fetch;
  const snapshot = options.snapshot ?? await loadPublicSnapshot(request);
  let storage = options.storage;
  if (storage === undefined) { try { storage = globalThis.localStorage; } catch { storage = null; } }
  return resolveRepositoryStats([...cards.keys()], { snapshot, request, storage, now: options.now, onUpdate(key, value) {
    for (const { group, star, fork } of pairs.get(key) || []) {
      star.textContent = `☆ ${value.stars.toLocaleString('en-US')}`;
      star.setAttribute('aria-label', `${value.stars} ${value.stars === 1 ? 'star' : 'stars'} on ${key}`);
      fork.textContent = `⑂ ${value.forks.toLocaleString('en-US')}`;
      fork.setAttribute('aria-label', `${value.forks} ${value.forks === 1 ? 'fork' : 'forks'} of ${key}`);
      group.hidden = false;
    }
  } });
}

if (typeof document !== 'undefined') void initGitHubStats();
