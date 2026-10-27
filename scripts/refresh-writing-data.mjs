// Import only curated public LinkedIn originals and local plain-text Markdown.
import { createHash } from 'node:crypto';
import { readFile, readdir, mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROFILE_URL = 'https://www.linkedin.com/in/abhimanyu-khurana-64821b185/';
export const LINKEDIN_PATH = 'data/linkedin-posts.json';
export const WRITING_PATH = 'data/writing.json';
export const REGISTRY_PATH = 'content/linkedin-posts.json';
const root = fileURLToPath(new URL('../', import.meta.url));
const postKeys = ['body', 'excerpt', 'id', 'publishedAt', 'source', 'title', 'url'].join(',');
const slug = /^[a-z0-9][a-z0-9_-]{0,99}$/;
const stable = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
const exactKeys = (value, keys) => value && Object.keys(value).sort().join(',') === keys.sort().join(',');
const plain = (value, limit) => typeof value === 'string' && value.trim().length > 0 && value.length <= limit
  && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value) && !/<\/?[a-z][^>]*>/i.test(value);
const comparePosts = (left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt) || left.id.localeCompare(right.id, 'en');

export function isoDate(value, dateOnly = false) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)
    || (!dateOnly && value.length === 10)) throw new Error('Invalid verified publication date');
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) !== value.slice(0, 10)) throw new Error('Invalid calendar date');
  const result = new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value);
  if (!Number.isFinite(result.getTime())) throw new Error('Invalid verified publication date');
  if (value.length !== 10) return value;
  // Resolve Chicago wall-clock midnight, including the midnight before a DST change.
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const target = result.getTime();
  let instant = target;
  for (let attempt = 0; attempt < 4; attempt++) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
    const represented = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const correction = target - represented;
    if (!correction) return new Date(instant).toISOString();
    instant += correction;
  }
  throw new Error('Chicago publication date could not be resolved');
}

export function canonicalLinkedInUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !['linkedin.com', 'www.linkedin.com'].includes(url.hostname)
    || url.username || url.password || url.port || !/^\/(?:posts|feed\/update|pulse)\/.+/.test(url.pathname)) throw new Error('Not a public LinkedIn post URL');
  const activity = url.pathname.match(/(?:activity[-:]|urn:li:activity:)(\d{10,30})(?:[-/]|$)/)?.[1];
  return activity ? `https://www.linkedin.com/feed/update/urn:li:activity:${activity}/`
    : `https://www.linkedin.com${url.pathname.replace(/\/$/, '')}/`;
}

function profileMatches(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['linkedin.com', 'www.linkedin.com'].includes(url.hostname)
      && url.pathname.replace(/\/$/, '') === new URL(PROFILE_URL).pathname.replace(/\/$/, '') && !url.username && !url.password;
  } catch { return false; }
}

function validatePosts(posts, linkedinOnly = false) {
  if (!Array.isArray(posts) || posts.length > 1000) throw new Error('Invalid writing posts');
  const ids = new Set();
  const urls = new Set();
  for (const post of posts) {
    if (!post || Object.keys(post).sort().join(',') !== postKeys || !slug.test(post.id) || ids.has(post.id)
      || !['linkedin', 'blog'].includes(post.source) || (linkedinOnly && post.source !== 'linkedin')
      || !plain(post.title, 500) || !plain(post.excerpt, 1000) || !plain(post.body, 100000)) throw new Error('Invalid public writing post');
    isoDate(post.publishedAt);
    if (post.source === 'linkedin') {
      if (canonicalLinkedInUrl(post.url) !== post.url) throw new Error('Noncanonical LinkedIn post URL');
    } else if (post.url !== `/blog/?post=${post.id}`) throw new Error('Invalid local blog URL');
    if (urls.has(post.url)) throw new Error('Duplicate public writing URL');
    ids.add(post.id); urls.add(post.url);
  }
  if (posts.some((post, index) => index && comparePosts(posts[index - 1], post) > 0)) throw new Error('Writing posts must be newest first');
}

export function validateWritingData(value) {
  if (!exactKeys(value, ['schemaVersion', 'updatedAt', 'posts']) || value.schemaVersion !== 1) throw new Error('Invalid writing feed');
  isoDate(value.updatedAt); validatePosts(value.posts);
  return value;
}

export function validateLinkedInSnapshot(value) {
  if (!exactKeys(value, ['schemaVersion', 'updatedAt', 'profileUrl', 'posts']) || value.schemaVersion !== 1 || value.profileUrl !== PROFILE_URL) throw new Error('Invalid public LinkedIn snapshot');
  isoDate(value.updatedAt); validatePosts(value.posts, true);
  return value;
}

export function writingFingerprint(value, linkedin = false) {
  (linkedin ? validateLinkedInSnapshot : validateWritingData)(value);
  const { updatedAt: _updatedAt, ...meaningful } = value;
  return createHash('sha256').update(stable(meaningful)).digest('hex');
}

const excerptFrom = body => {
  const compact = body.replace(/\s+/g, ' ').trim();
  return compact.length > 220 ? `${compact.slice(0, 217).trimEnd()}...` : compact;
};

export function parseLinkedInPost(html, requestedUrl) {
  const requested = canonicalLinkedInUrl(requestedUrl);
  const candidates = [];
  const visit = value => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== 'object') return;
    if (value['@graph']) visit(value['@graph']);
    if (['SocialMediaPosting', 'Article', 'BlogPosting'].includes(value['@type'])) candidates.push(value);
  };
  for (const [, attributes, json] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!/\btype\s*=\s*["']application\/ld\+json["']/i.test(attributes)) continue;
    try { visit(JSON.parse(json)); } catch { /* Ignore unrelated invalid JSON-LD. */ }
  }
  const matches = candidates.filter(post => {
    if (!post.author || Array.isArray(post.author) || post.author['@type'] !== 'Person' || !profileMatches(post.author.url)
      || post.isBasedOn || post.sharedContent || post.repostOf) return false;
    try { return canonicalLinkedInUrl(post['@id'] ?? post.url) === requested; } catch { return false; }
  });
  if (matches.length !== 1) throw new Error('Public original post and exact author were not verified');
  const source = matches[0];
  if (typeof source.articleBody !== 'string') throw new Error('Full public post body is unavailable');
  const body = source.articleBody.replaceAll('\r\n', '\n').trim();
  const activity = requested.match(/urn:li:activity:(\d+)/)?.[1];
  const id = `linkedin-${activity ?? createHash('sha256').update(requested).digest('hex').slice(0, 24)}`;
  const post = { id, source: 'linkedin', title: typeof source.headline === 'string' && source.headline.trim() ? source.headline.trim() : body.split('\n')[0].slice(0, 180),
    publishedAt: isoDate(source.datePublished), url: requested, excerpt: excerptFrom(body), body };
  validatePosts([post], true);
  return post;
}

export function parseBlogPost(markdown) {
  const match = markdown.replaceAll('\r\n', '\n').match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error('Blog post requires title, date and id frontmatter');
  const metadata = {};
  for (const line of match[1].split('\n')) {
    const field = line.match(/^(title|date|id):\s*(.+)$/);
    if (!field || metadata[field[1]]) throw new Error('Unsupported or duplicate blog frontmatter');
    let value = field[2].trim();
    if (value.startsWith('"')) { try { value = JSON.parse(value); } catch { throw new Error('Invalid quoted blog frontmatter'); } }
    else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1).replaceAll("''", "'");
    metadata[field[1]] = value;
  }
  if (Object.keys(metadata).length !== 3 || !slug.test(metadata.id)) throw new Error('Missing blog frontmatter');
  const body = match[2].trim();
  const post = { id: metadata.id, source: 'blog', title: metadata.title, publishedAt: isoDate(metadata.date, true),
    url: `/blog/?post=${metadata.id}`, excerpt: excerptFrom(body), body };
  validatePosts([post]);
  return post;
}

async function readJson(filename, optional = false) {
  try {
    const bytes = await readFile(filename);
    if (bytes.length > 2 * 1024 * 1024) throw new Error('Public writing input exceeds size limit');
    return JSON.parse(bytes.toString('utf8'));
  } catch (error) { if (optional && error.code === 'ENOENT') return null; throw error; }
}

async function optionalBytes(filename) {
  try { return await readFile(filename); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function replaceFile(filename, bytes) {
  await mkdir(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.${process.pid}.tmp`;
  try { await writeFile(temporary, bytes, { flag: 'wx' }); await rename(temporary, filename); }
  finally { await unlink(temporary).catch(() => {}); }
}

export async function refreshWritingData({ siteRoot = root, request = globalThis.fetch, now = new Date(), dryRun = false } = {}) {
  const updatedAt = isoDate(now.toISOString());
  const registry = await readJson(path.join(siteRoot, REGISTRY_PATH));
  if (!exactKeys(registry, ['schemaVersion', 'profileUrl', 'urls']) || registry.schemaVersion !== 1 || registry.profileUrl !== PROFILE_URL
    || !Array.isArray(registry.urls) || registry.urls.length > 200) throw new Error('Invalid curated LinkedIn URL registry');
  const urls = [...new Set(registry.urls.map(canonicalLinkedInUrl))].sort();
  const initialBytes = Object.fromEntries(await Promise.all([LINKEDIN_PATH, WRITING_PATH].map(async relative => [relative, await optionalBytes(path.join(siteRoot, relative))])));
  if (Object.values(initialBytes).some(bytes => bytes && bytes.length > 2 * 1024 * 1024)) throw new Error('Public writing input exceeds size limit');
  const previous = initialBytes[LINKEDIN_PATH] ? JSON.parse(initialBytes[LINKEDIN_PATH].toString('utf8')) : null;
  if (previous) validateLinkedInSnapshot(previous);
  const previousWriting = initialBytes[WRITING_PATH] ? JSON.parse(initialBytes[WRITING_PATH].toString('utf8')) : null;
  if (previousWriting) validateWritingData(previousWriting);
  const posts = new Map((previous?.posts ?? []).map(post => [post.url, post]));
  const source = { attempted: urls.length, verified: 0, retained: 0, unavailable: 0, discovery: 'curated-public-urls' };
  for (const url of urls) {
    try {
      const response = await request(url, { redirect: 'error', signal: AbortSignal.timeout(10000), headers: { Accept: 'text/html', 'User-Agent': 'abhikhur-portfolio-public-writing/1.0' } });
      if (!response.ok) throw new Error('Public LinkedIn source unavailable');
      const html = await response.text();
      if (html.length > 2 * 1024 * 1024) throw new Error('Public LinkedIn response too large');
      posts.set(url, parseLinkedInPost(html, url)); source.verified++;
    } catch {
      source.unavailable++;
      if (posts.has(url)) source.retained++;
    }
  }
  source.status = source.unavailable ? 'retained-last-verified' : 'verified';
  if (!previous && urls.length && !source.verified) throw new Error('Initial public LinkedIn import was not verified');
  // Source errors never delete previously verified originals, even if a URL is removed.
  const linkedin = { schemaVersion: 1, updatedAt, profileUrl: PROFILE_URL, posts: [...posts.values()].sort(comparePosts) };
  validateLinkedInSnapshot(linkedin);
  let entries = [];
  try { entries = await readdir(path.join(siteRoot, 'content/blog'), { withFileTypes: true }); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const blogs = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    if (!/\.md$/i.test(entry.name)) continue;
    if (!entry.isFile()) throw new Error('Blog input must be a regular local Markdown file');
    const bytes = await readFile(path.join(siteRoot, 'content/blog', entry.name));
    if (bytes.length > 100000) throw new Error('Blog post exceeds size limit');
    blogs.push(parseBlogPost(bytes.toString('utf8')));
  }
  const writing = { schemaVersion: 1, updatedAt, posts: [...linkedin.posts, ...blogs].sort(comparePosts) };
  validateWritingData(writing);
  const plans = [];
  for (const [relative, value, isLinkedIn] of [[LINKEDIN_PATH, linkedin, true], [WRITING_PATH, writing, false]]) {
    const filename = path.join(siteRoot, relative);
    const old = isLinkedIn ? previous : previousWriting;
    if (old && writingFingerprint(old, isLinkedIn) === writingFingerprint(value, isLinkedIn)) continue;
    plans.push({ filename, relative, before: initialBytes[relative], after: Buffer.from(`${JSON.stringify(value, null, 2)}\n`) });
  }
  const written = [];
  if (!dryRun) {
    try {
      for (const plan of plans) {
        const current = await optionalBytes(plan.filename);
        if (current === null ? plan.before !== null : plan.before === null || !current.equals(plan.before)) throw new Error('Concurrent writing change preserved');
        await replaceFile(plan.filename, plan.after); written.push(plan);
      }
    } catch (error) {
      // Roll back only bytes written by this invocation, never a concurrent user edit.
      for (const plan of written.reverse()) {
        if (!(await readFile(plan.filename)).equals(plan.after)) throw new Error('Concurrent writing change preserved');
        if (plan.before) await replaceFile(plan.filename, plan.before); else await unlink(plan.filename);
      }
      throw error;
    }
  }
  const outputHashes = Object.fromEntries([LINKEDIN_PATH, WRITING_PATH].map(relative => {
    const plan = plans.find(item => item.relative === relative);
    const bytes = plan ? plan.after : initialBytes[relative];
    return [relative, createHash('sha256').update(bytes.toString('utf8').replaceAll('\r\n', '\n')).digest('hex')];
  }));
  return { ok: true, changed: plans.length > 0, written: !dryRun && plans.length > 0, outputHashes,
    changedPaths: plans.map(plan => plan.relative), linkedinPosts: linkedin.posts.length, blogPosts: blogs.length, posts: writing.posts.length, source };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.slice(2).some(arg => !['--check', '--dry-run'].includes(arg))) throw new Error('Unsupported writing refresh argument');
    console.log(JSON.stringify(await refreshWritingData({ dryRun: process.argv.length > 2 })));
  } catch { console.log(JSON.stringify({ ok: false, code: 'WRITING_REFRESH_FAILED', previousSnapshotPreserved: true })); process.exitCode = 1; }
}
