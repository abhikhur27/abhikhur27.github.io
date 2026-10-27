// Run from the existing desktop autopilot. No token is read or written by this script.
import { execFile } from 'node:child_process';
import { readFile, writeFile, rename, mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { fetchWithTimeout, mapConcurrent, parseRepositoryUrl, publicApiRepository, validCount } from '../github-stats.mjs';

const run = promisify(execFile);
const root = fileURLToPath(new URL('../', import.meta.url));
const login = 'abhikhur27';
const dayPattern = /^\d{4}-\d{2}-\d{2}$/;

export function extractRepositoryKeys(html) {
  const cards = [...html.matchAll(/<article\b[^>]*class=["'][^"']*\bproject-card\b[^"']*["'][^>]*>([\s\S]*?)<\/article>/gi)];
  return [...new Set(cards.flatMap(([, card]) => [...card.matchAll(/\bhref=["']([^"']+)["']/gi)].map(([, url]) => parseRepositoryUrl(url)).filter(Boolean)))].sort();
}

export function normalizeDays(days) {
  if (!Array.isArray(days) || days.length < 300 || days.length > 371) throw new Error('Incomplete contribution calendar');
  const clean = days.map(day => ({ date: day.date, count: day.count ?? day.contributionCount }));
  if (clean.some(day => !dayPattern.test(day.date) || !validCount(day.count))) throw new Error('Invalid public contribution day');
  clean.sort((a, b) => a.date.localeCompare(b.date));
  if (new Set(clean.map(day => day.date)).size !== clean.length) throw new Error('Duplicate contribution day');
  for (let i = 1; i < clean.length; i++) {
    if (Date.parse(`${clean[i].date}T00:00:00Z`) - Date.parse(`${clean[i - 1].date}T00:00:00Z`) !== 86400000) throw new Error('Gap in contribution calendar');
  }
  return { from: clean[0].date, to: clean.at(-1).date, days: clean, total: clean.reduce((sum, day) => sum + day.count, 0) };
}

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'))?.[1];
}

export function parsePublicContributionHtml(html) {
  const tooltips = new Map([...html.matchAll(/<tool-tip\b([^>]*)>([\s\S]*?)<\/tool-tip>/gi)].map(([, attrs, content]) => {
    const text = content.replace(/<[^>]*>/g, '').trim();
    const match = text.match(/^(No|[\d,]+) contributions? on /i);
    return [attribute(attrs, 'for'), match ? (match[1].toLowerCase() === 'no' ? 0 : Number(match[1].replaceAll(',', ''))) : null];
  }));
  const days = [...html.matchAll(/<(?:td|rect)\b([^>]*\bdata-date=["'][^"']+["'][^>]*)>/gi)].map(([, attrs]) => ({ date: attribute(attrs, 'data-date'), count: tooltips.get(attribute(attrs, 'id')) }));
  if (days.some(day => day.count === null || day.count === undefined)) throw new Error('Public calendar tooltip format changed');
  return normalizeDays(days);
}

export function equivalentSnapshot(left, right) {
  if (!left || !right) return false;
  const withoutTimestamp = snapshot => JSON.stringify({ schemaVersion: snapshot.schemaVersion, login: snapshot.login, repositories: snapshot.repositories, contributions: snapshot.contributions });
  return withoutTimestamp(left) === withoutTimestamp(right);
}

export async function atomicWriteSnapshot(output, snapshot, previous) {
  if (equivalentSnapshot(previous, snapshot)) return false;
  await mkdir(path.dirname(output), { recursive: true });
  const temporary = `${output}.${process.pid}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    await rename(temporary, output);
  } finally { await unlink(temporary).catch(() => {}); }
  return true;
}

async function publicCalendar(request) {
  const response = await fetchWithTimeout(request, `https://github.com/users/${login}/contributions`, { headers: { Accept: 'text/html', 'Accept-Language': 'en-US', 'User-Agent': 'abhikhur-portfolio-public-snapshot' } }, 15000);
  if (!response.ok) throw new Error('Public contribution calendar unavailable');
  return parsePublicContributionHtml(await response.text());
}

export async function loadContributionCalendar({ request = globalThis.fetch, gh = run } = {}) {
  try {
    const query = `query { user(login:"${login}") { contributionsCollection { restrictedContributionsCount contributionCalendar { weeks { contributionDays { date contributionCount } } } } } }`;
    const { stdout } = await gh('gh', ['api', 'graphql', '-f', `query=${query}`], { timeout: 20000, windowsHide: true, maxBuffer: 1024 * 1024 });
    const result = JSON.parse(stdout);
    const collection = result?.data?.user?.contributionsCollection;
    // Authenticated owner queries can see more activity than a public visitor.
    // When restricted activity exists, use the already-public profile chart instead.
    if (!result.errors && collection?.restrictedContributionsCount === 0) {
      return { calendar: normalizeDays(collection.contributionCalendar.weeks.flatMap(week => week.contributionDays)), source: 'GitHub GraphQL public calendar' };
    }
  } catch { /* gh may be unavailable or signed out; public HTML needs no credentials. */ }
  return { calendar: await publicCalendar(request), source: 'GitHub public profile calendar' };
}

export async function refreshSnapshot({ siteRoot = root, output = path.join(siteRoot, 'data/github-activity.json'), request = globalThis.fetch, gh = run, now = new Date(), dryRun = false } = {}) {
  const keys = extractRepositoryKeys(await readFile(path.join(siteRoot, 'index.html'), 'utf8'));
  if (!keys.length) throw new Error('No public project repository links found; previous snapshot preserved');
  let previous;
  try { previous = JSON.parse(await readFile(output, 'utf8')); } catch { /* First refresh. */ }
  const repositoryRows = await mapConcurrent(keys, 3, async key => {
    try {
      const response = await fetchWithTimeout(request, `https://api.github.com/repos/${key}`, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'abhikhur-portfolio-public-snapshot' } });
      if (!response.ok) throw new Error('Public repository unavailable');
      const value = publicApiRepository(await response.json(), key);
      if (!value) throw new Error('Repository response was not public metadata');
      return [key, value];
    } catch {
      throw new Error(`Could not refresh public counts for ${key}; previous snapshot preserved`);
    }
  });
  const { calendar, source } = await loadContributionCalendar({ request, gh });
  const snapshot = { schemaVersion: 1, login, updatedAt: now.toISOString(), repositories: Object.fromEntries(repositoryRows), contributions: calendar };
  const changed = !equivalentSnapshot(previous, snapshot);
  if (!dryRun && changed) await atomicWriteSnapshot(output, snapshot, previous);
  return { changed, written: changed && !dryRun, repositories: keys.length, days: calendar.days.length, contributions: calendar.total, source, updatedAt: changed ? snapshot.updatedAt : previous.updatedAt };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  refreshSnapshot({ dryRun: process.argv.includes('--dry-run') || process.argv.includes('--check') }).then(result => process.stdout.write(`${JSON.stringify(result)}\n`)).catch(() => {
    // Errors intentionally omit raw API/CLI output and anything from local auth.
    process.stderr.write('GitHub refresh failed. The previous public snapshot was left unchanged.\n');
    process.exitCode = 1;
  });
}
