import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { CACHE_TTL_MS, REPO_CACHE_KEY, fetchWithTimeout, initGitHubStats, loadPublicSnapshot, normalizeRepository, parseRepositoryUrl, publicApiRepository, readRepositoryCache, resolveRepositoryStats, validCount } from '../github-stats.mjs';
import { atomicWriteSnapshot, equivalentSnapshot, extractRepositoryKeys, loadContributionCalendar, normalizeDays, parsePublicContributionHtml, refreshSnapshot } from '../scripts/refresh-github-data.mjs';

const key = 'abhikhur27/gridirondex';
const repo = { stars: 0, forks: 2, url: `https://github.com/${key}` };
const apiRepo = { private: false, html_url: repo.url, stargazers_count: 0, forks_count: 2 };
const now = Date.parse('2026-10-26T18:00:00Z');
const snapshot = { schemaVersion: 1, login: 'abhikhur27', updatedAt: '2026-10-25T00:00:00Z', repositories: { [key]: repo } };
const storage = initial => {
  const values = new Map(initial ? [[REPO_CACHE_KEY, JSON.stringify(initial)]] : []);
  return { getItem: name => values.get(name), setItem: (name, value) => values.set(name, value), values };
};
const calendarDays = Array.from({ length: 366 }, (_, index) => ({ date: new Date(Date.UTC(2025, 9, 26 + index)).toISOString().slice(0, 10), count: index % 7 }));
const calendarHtml = () => calendarDays.map((day, index) => `<td id="day-${index}" data-date="${day.date}"></td><tool-tip for="day-${index}">${day.count || 'No'} contribution${day.count === 1 ? '' : 's'} on October 26th.</tool-tip>`).join('');
const ghPublic = async () => ({ stdout: JSON.stringify({ data: { user: { contributionsCollection: { restrictedContributionsCount: 0, contributionCalendar: { weeks: [{ contributionDays: calendarDays.map(day => ({ date: day.date, contributionCount: day.count })) }] } } } } }) });

test('repository links normalize Code/Docs/source links without accepting profiles or spoofed hosts', () => {
  assert.equal(parseRepositoryUrl('https://github.com/AbhiKhur27/GridironDEX#readme'), key);
  assert.equal(parseRepositoryUrl('https://github.com/abhikhur27/gridirondex/tree/main'), key);
  assert.equal(parseRepositoryUrl('https://github.com/abhikhur27/gridirondex.git'), key);
  for (const url of ['https://github.com/abhikhur27', 'https://github.com/', 'https://github.com.evil.test/owner/repo', 'http://github.com/owner/repo', 'https://github.com:8443/owner/repo', 'https://github.com/topics/ai', 'https://token@github.com/owner/repo', 'javascript:alert(1)', 'https://github.com/a/%3Cscript%3E']) assert.equal(parseRepositoryUrl(url), null, url);
});

test('valid counts include real zero but never absent, negative, fractional, or private metadata', () => {
  for (const value of [0, 1, 5000]) assert.equal(validCount(value), true);
  for (const value of [null, undefined, '0', NaN, -1, 1.5, Infinity]) assert.equal(validCount(value), false);
  assert.deepEqual(publicApiRepository(apiRepo, key), repo);
  assert.equal(publicApiRepository({ ...apiRepo, private: true }, key), null);
  assert.equal(publicApiRepository({ ...apiRepo, stargazers_count: undefined }, key), null);
  assert.equal(normalizeRepository(repo, 'other/name'), null);
});

test('discovery stays within existing cards, deduplicates links and rejects the profile', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const keys = extractRepositoryKeys(html);
  assert.equal(keys.length, 11);
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(keys.includes(key));
  assert.ok(keys.includes('abhikhur27/algorithm-visualizer'));
  assert.ok(keys.every(value => !/rollback-call|incident-handoff-builder|lease-decision-guide|csv-column-profiler/.test(value)));
});

test('fresh one-hour cache avoids API requests, stale cache refreshes and writes real zero', async () => {
  let calls = 0;
  const fresh = storage({ [key]: { ...repo, fetchedAt: now - 1000 } });
  await resolveRepositoryStats([key, key], { storage: fresh, now, request: async () => { calls++; throw new Error('should not call'); } });
  assert.equal(calls, 0);
  const stale = storage({ [key]: { ...repo, stars: 5, fetchedAt: now - CACHE_TTL_MS - 1 } });
  const result = await resolveRepositoryStats([key], { storage: stale, now, request: async () => { calls++; return { ok: true, json: async () => apiRepo }; } });
  assert.equal(calls, 1);
  assert.equal(result[key].stars, 0);
  assert.equal(JSON.parse(stale.values.get(REPO_CACHE_KEY))[key].fetchedAt, now);
});

test('404, 429, network failure and storage denial retain a real snapshot instead of invented zeros', async () => {
  for (const status of [404, 429]) {
    const result = await resolveRepositoryStats([key, 'abhikhur27/missing'], { snapshot, now, request: async () => ({ ok: false, status }), storage: { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } } });
    assert.deepEqual(result[key], repo);
    assert.equal(result['abhikhur27/missing'], undefined);
  }
  const result = await resolveRepositoryStats([key], { snapshot, now, request: async () => { throw new Error('offline'); } });
  assert.deepEqual(result[key], repo);
  assert.deepEqual(readRepositoryCache(storage({ [key]: { ...repo, fetchedAt: now + 1 } }), now), {});
});

test('snapshot fetch failures are quiet and invalid schemas are rejected', async () => {
  assert.equal(await loadPublicSnapshot(async () => { throw new Error('offline'); }), null);
  assert.equal(await loadPublicSnapshot(async () => ({ ok: true, json: async () => ({ ...snapshot, schemaVersion: 2 }) })), null);
  assert.deepEqual(await loadPublicSnapshot(async () => ({ ok: true, json: async () => snapshot })), snapshot);
});

test('one safe-DOM pair is inserted for duplicate links and unknown counts stay hidden', async () => {
  const elements = [];
  const element = tag => ({ tag, className: '', dataset: {}, children: [], attributes: {}, textContent: '', append(...children) { this.children.push(...children); }, setAttribute(name, value) { this.attributes[name] = value; } });
  const actions = element('div');
  const cards = [{ querySelectorAll() { return [{ href: repo.url }, { href: `${repo.url}#readme` }]; }, querySelector() { return actions; } }];
  const document = { querySelectorAll() { return cards; }, createElement(tag) { const result = element(tag); elements.push(result); return result; } };
  await initGitHubStats(document, { snapshot, now, storage: null, request: async () => ({ ok: false, status: 429 }) });
  assert.equal(actions.children.length, 1);
  const [group] = actions.children;
  assert.equal(group.hidden, false);
  assert.deepEqual(group.children.map(child => child.textContent), ['☆ 0', '⑂ 2']);
  assert.equal(group.children[0].href, `${repo.url}/stargazers`);
  assert.match(group.children[1].attributes['aria-label'], /2 forks/);
  actions.children = [];
  await initGitHubStats(document, { snapshot: { ...snapshot, repositories: {} }, now, storage: null, request: async () => { throw new Error('offline'); } });
  assert.equal(actions.children[0].hidden, true);
  assert.equal(actions.children[0].children[0].textContent, '');
});

test('public API requests are bounded to three and never carry authentication', async () => {
  let active = 0, maximum = 0;
  const keys = Array.from({ length: 7 }, (_, i) => `owner/repo-${i}`);
  await resolveRepositoryStats(keys, { request: async (url, options) => {
    active++; maximum = Math.max(active, maximum);
    assert.equal(options.credentials, 'omit');
    assert.equal(options.headers.Authorization, undefined);
    await new Promise(resolve => setTimeout(resolve, 5));
    active--;
    return { ok: true, json: async () => ({ private: false, html_url: url.replace('api.github.com/repos', 'github.com'), stargazers_count: 3, forks_count: 1 }) };
  } });
  assert.equal(maximum, 3);
});

test('a hard timeout also bounds a fetch implementation that ignores AbortSignal', async () => {
  await assert.rejects(fetchWithTimeout(() => new Promise(() => {}), 'https://example.test', {}, 5), /timed out/);
});

test('public profile tooltip parser preserves every exact day and total', () => {
  const parsed = parsePublicContributionHtml(calendarHtml());
  assert.equal(parsed.days.length, 366);
  assert.equal(parsed.from, '2025-10-26');
  assert.equal(parsed.to, '2026-10-26');
  assert.equal(parsed.total, calendarDays.reduce((sum, day) => sum + day.count, 0));
  assert.deepEqual(parsed.days[0], calendarDays[0]);
  assert.throws(() => normalizeDays(calendarDays.slice(1, 20)), /Incomplete/);
  assert.throws(() => normalizeDays(calendarDays.map((day, i) => i === 1 ? calendarDays[0] : day)), /Duplicate/);
  assert.throws(() => parsePublicContributionHtml(calendarHtml().replace('No contributions on', 'unknown on')), /format changed/);
});

test('GraphQL restricted activity triggers the unauthenticated public profile fallback', async () => {
  let publicRequests = 0;
  const gh = async () => ({ stdout: JSON.stringify({ data: { user: { contributionsCollection: { restrictedContributionsCount: 500, contributionCalendar: { weeks: [] } } } } }) });
  const result = await loadContributionCalendar({ gh, request: async (url, options) => { publicRequests++; assert.match(url, /github.com\/users\/abhikhur27\/contributions$/); assert.equal(options.headers.Authorization, undefined); return { ok: true, text: async () => calendarHtml() }; } });
  assert.equal(publicRequests, 1);
  assert.match(result.source, /public profile/);
  const direct = await loadContributionCalendar({ gh: ghPublic, request: () => { throw new Error('must not need HTTP'); } });
  assert.match(direct.source, /GraphQL/);
});

test('atomic snapshot write ignores timestamp-only changes and keeps old file on pipeline failure', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'portfolio-github-test-'));
  try {
    await mkdir(path.join(directory, 'data'));
    await writeFile(path.join(directory, 'index.html'), `<article class="project-card"><a href="${repo.url}">Code</a></article>`);
    const output = path.join(directory, 'data/github-activity.json');
    const saved = { ...snapshot, contributions: normalizeDays(calendarDays) };
    assert.equal(await atomicWriteSnapshot(output, saved), true);
    assert.equal(equivalentSnapshot(saved, { ...saved, updatedAt: '2026-10-26T18:00:00Z' }), true);
    assert.equal(await atomicWriteSnapshot(output, { ...saved, updatedAt: '2026-10-26T18:00:00Z' }, saved), false);
    const before = await readFile(output, 'utf8');
    await assert.rejects(refreshSnapshot({ siteRoot: directory, gh: ghPublic, request: async () => ({ ok: false, status: 429 }) }), /preserved/);
    assert.equal(await readFile(output, 'utf8'), before);
    const result = await refreshSnapshot({ siteRoot: directory, gh: ghPublic, now: new Date(now), dryRun: true, request: async () => ({ ok: true, json: async () => ({ ...apiRepo, stargazers_count: 1 }) }) });
    assert.equal(result.changed, true);
    assert.equal(result.written, false);
    assert.equal(await readFile(output, 'utf8'), before);
    const written = await refreshSnapshot({ siteRoot: directory, gh: ghPublic, now: new Date(now), request: async () => ({ ok: true, json: async () => ({ ...apiRepo, stargazers_count: 1 }) }) });
    assert.equal(written.written, true);
    assert.equal(JSON.parse(await readFile(output, 'utf8')).repositories[key].stars, 1);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
