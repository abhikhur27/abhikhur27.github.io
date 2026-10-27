import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { canonicalLinkedInUrl, isoDate, LINKEDIN_PATH, parseBlogPost, parseLinkedInPost, PROFILE_URL, refreshWritingData,
  REGISTRY_PATH, validateLinkedInSnapshot, validateWritingData, WRITING_PATH, writingFingerprint } from '../scripts/refresh-writing-data.mjs';

const firstUrl = 'https://www.linkedin.com/feed/update/urn:li:activity:7520663480509689856/';
const secondUrl = 'https://www.linkedin.com/feed/update/urn:li:activity:7512377790130843648/';
const now = new Date('2026-10-27T02:00:00.000Z');
function source(url = firstUrl, extra = {}) {
  return { '@type': 'SocialMediaPosting', '@id': url, author: { '@type': 'Person', url: PROFILE_URL },
    datePublished: url === firstUrl ? '2026-10-27T01:51:40.923Z' : '2026-10-04T05:07:18.396Z',
    headline: 'My original public words', articleBody: 'First paragraph.\n\nThe exact second paragraph, with my punctuation.', ...extra };
}
const html = value => `<html><script type="application/ld+json">${JSON.stringify(value)}</script></html>`;
const blog = (id = 'local-post', date = '2026-10-28') => `---\ntitle: "A local post: exact words"\ndate: ${date}\nid: ${id}\n---\nThe local text.\n\nAnother paragraph.\n`;
async function fixture() {
  const siteRoot = await mkdtemp(path.join(os.tmpdir(), 'portfolio-writing-'));
  await mkdir(path.join(siteRoot, 'content/blog'), { recursive: true });
  const registry = { schemaVersion: 1, profileUrl: PROFILE_URL, urls: [firstUrl, secondUrl] };
  await writeFile(path.join(siteRoot, REGISTRY_PATH), JSON.stringify(registry));
  const requests = [];
  const options = { siteRoot, now, request: async (url, options) => {
    requests.push({ url, options }); return { ok: true, text: async () => html(source(url)) };
  } };
  return { siteRoot, registry, requests, options,
    json: async relative => JSON.parse(await readFile(path.join(siteRoot, relative), 'utf8')),
    bytes: relative => readFile(path.join(siteRoot, relative), 'utf8'),
    writeRegistry: value => writeFile(path.join(siteRoot, REGISTRY_PATH), JSON.stringify(value)),
  };
}

test('public JSON-LD imports the full original body, exact author and verified date', () => {
  const post = parseLinkedInPost(html(source()), firstUrl);
  assert.equal(post.body, source().articleBody);
  assert.equal(post.publishedAt, '2026-10-27T01:51:40.923Z');
  assert.equal(post.id, 'linkedin-7520663480509689856');
  assert.equal(post.url, firstUrl);
  assert.equal(parseLinkedInPost(html({ '@graph': [source()] }), firstUrl).id, post.id);
});

test('other authors, reposts, missing full text, ambiguous roots and unverified dates are rejected', () => {
  const cases = [source(firstUrl, { author: { '@type': 'Person', url: 'https://www.linkedin.com/in/other/' } }),
    source(firstUrl, { repostOf: 'another-post' }), source(firstUrl, { articleBody: undefined }),
    source(firstUrl, { datePublished: '1w' }), source(firstUrl, { datePublished: '2026-02-30T00:00:00Z' }),
    source(firstUrl, { articleBody: '<script>not plain public text</script>' }), [source(), source()]];
  for (const value of cases) assert.throws(() => parseLinkedInPost(html(value), firstUrl));
  const nestedComment = source(firstUrl, { author: { '@type': 'Person', url: 'https://www.linkedin.com/in/other/' }, comment: source() });
  assert.throws(() => parseLinkedInPost(html(nestedComment), firstUrl));
});

test('canonical URL validation deduplicates post aliases without accepting other hosts or credentials', () => {
  assert.equal(canonicalLinkedInUrl('https://www.linkedin.com/posts/abhimanyu-khurana-64821b185_words-activity-7520663480509689856-abc?tracking=1'), firstUrl);
  for (const url of ['https://www.linkedin.com.evil.invalid/posts/a', 'https://user:secret@linkedin.com/posts/a',
    'http://linkedin.com/posts/a', 'https://linkedin.com/messaging/thread/a', 'https://linkedin.com:444/posts/a']) assert.throws(() => canonicalLinkedInUrl(url));
});

test('local Markdown has explicit frontmatter, plain body and a stable blog URL', () => {
  const post = parseBlogPost(blog());
  assert.equal(post.title, 'A local post: exact words');
  assert.equal(post.publishedAt, '2026-10-28T05:00:00.000Z');
  assert.equal(post.url, '/blog/?post=local-post');
  assert.equal(post.body, 'The local text.\n\nAnother paragraph.');
  for (const invalid of ['No metadata.', blog().replace('id: local-post', 'id: ../private'), blog().replace('2026-10-28', 'last Tuesday'),
    blog().replace('id: local-post', 'draft: true'), blog().replace('The local text.', '<iframe src="x"></iframe>')]) assert.throws(() => parseBlogPost(invalid));
});

test('date-only blog dates mean Chicago midnight with correct winter, summer and DST boundary offsets', () => {
  for (const [date, expected] of [
    ['2026-01-15', '2026-01-15T06:00:00.000Z'], ['2026-07-15', '2026-07-15T05:00:00.000Z'],
    ['2026-10-27', '2026-10-27T05:00:00.000Z'], ['2026-03-08', '2026-03-08T06:00:00.000Z'],
    ['2026-03-09', '2026-03-09T05:00:00.000Z'], ['2026-11-01', '2026-11-01T05:00:00.000Z'],
    ['2026-11-02', '2026-11-02T06:00:00.000Z'],
  ]) assert.equal(parseBlogPost(blog('dated', date)).publishedAt, expected);
  const explicit = '2026-10-27T16:30:00-05:00';
  assert.equal(parseBlogPost(blog('explicit', explicit)).publishedAt, explicit);
});

test('IDs start with an alphanumeric and titles match the UI 500-character boundary', () => {
  for (const id of ['-bad', '_bad', 'a'.repeat(101)]) assert.throws(() => parseBlogPost(blog(id)));
  assert.equal(parseBlogPost(blog(`a${'_-'.repeat(49)}z`)).id.length, 100);
  const post = parseLinkedInPost(html(source()), firstUrl);
  const feed = posts => ({ schemaVersion: 1, updatedAt: now.toISOString(), posts });
  assert.doesNotThrow(() => validateWritingData(feed([{ ...post, title: 't'.repeat(500) }])));
  assert.throws(() => validateWritingData(feed([{ ...post, title: 't'.repeat(501) }])));
  for (const id of ['-bad', '_bad']) assert.throws(() => validateWritingData(feed([{ ...post, id }])));
});

test('feed validation rejects duplicate IDs, unsafe URLs, extra private fields and wrong chronological order', () => {
  const post = parseLinkedInPost(html(source()), firstUrl);
  const value = { schemaVersion: 1, updatedAt: now.toISOString(), posts: [post] };
  assert.equal(validateWritingData(value), value);
  for (const posts of [[post, post], [{ ...post, url: 'javascript:alert(1)' }], [{ ...post, token: 'never public' }],
    [parseLinkedInPost(html(source(secondUrl)), secondUrl), post]]) assert.throws(() => validateWritingData({ ...value, posts }));
  assert.throws(() => validateLinkedInSnapshot({ ...value, profileUrl: 'https://linkedin.com/in/other/' }));
  assert.throws(() => isoDate('2026-10-27'));
  assert.equal(writingFingerprint(value), writingFingerprint({ ...value, updatedAt: '2026-11-01T00:00:00.000Z' }));
});

test('refresh merges real sources newest first and leaves unchanged bytes and timestamps alone', async () => {
  const f = await fixture();
  await writeFile(path.join(f.siteRoot, 'content/blog/local.md'), blog());
  await f.writeRegistry({ ...f.registry, urls: [...f.registry.urls, `${firstUrl}?tracking=1`] });
  const result = await refreshWritingData(f.options);
  assert.equal(result.posts, 3); assert.equal(result.linkedinPosts, 2); assert.equal(result.blogPosts, 1);
  assert.equal(f.requests.length, 2);
  assert.equal(f.requests.every(({ options }) => options.redirect === 'error' && !options.headers.Cookie && !options.headers.Authorization), true);
  assert.deepEqual((await f.json(WRITING_PATH)).posts.map(post => post.source), ['blog', 'linkedin', 'linkedin']);
  const before = await f.bytes(WRITING_PATH);
  const linkedin = await f.bytes(LINKEDIN_PATH);
  assert.equal((await refreshWritingData({ ...f.options, now: new Date('2026-10-29T00:00:00Z') })).changed, false);
  assert.equal(await f.bytes(WRITING_PATH), before); assert.equal(await f.bytes(LINKEDIN_PATH), linkedin);
});

test('public source failures retain verified originals while new local blog content still builds', async () => {
  const f = await fixture();
  await refreshWritingData(f.options);
  const before = await f.bytes(LINKEDIN_PATH);
  await writeFile(path.join(f.siteRoot, 'content/blog/new.md'), blog('new-blog'));
  const result = await refreshWritingData({ ...f.options, request: async () => ({ ok: false, status: 999 }) });
  assert.equal(result.source.retained, 2); assert.equal(result.source.status, 'retained-last-verified');
  assert.equal(result.blogPosts, 1); assert.equal(await f.bytes(LINKEDIN_PATH), before);
  assert.equal((await f.json(WRITING_PATH)).posts.length, 3);
});

test('a newly supplied other-author URL never enters an established feed', async () => {
  const f = await fixture();
  await refreshWritingData(f.options);
  const other = 'https://www.linkedin.com/feed/update/urn:li:activity:7500000000000000000/';
  await f.writeRegistry({ ...f.registry, urls: [...f.registry.urls, other] });
  const result = await refreshWritingData({ ...f.options, request: async url => ({ ok: true, text: async () => html(url === other
    ? source(other, { author: { '@type': 'Person', url: 'https://linkedin.com/in/someone-else' } }) : source(url)) }) });
  assert.equal(result.source.unavailable, 1); assert.equal(result.linkedinPosts, 2);
  assert.equal((await f.json(LINKEDIN_PATH)).posts.some(post => post.url === other), false);
});

test('invalid blog inputs fail before either generated snapshot changes', async () => {
  const f = await fixture();
  await refreshWritingData(f.options);
  const before = [await f.bytes(LINKEDIN_PATH), await f.bytes(WRITING_PATH)];
  await writeFile(path.join(f.siteRoot, 'content/blog/bad.md'), blog().replace('2026-10-28', '2026-02-30'));
  await assert.rejects(refreshWritingData(f.options));
  assert.deepEqual([await f.bytes(LINKEDIN_PATH), await f.bytes(WRITING_PATH)], before);
});

test('dry run writes no snapshots and a failed initial import cannot fabricate an empty success', async () => {
  const f = await fixture();
  assert.equal((await refreshWritingData({ ...f.options, dryRun: true })).written, false);
  await assert.rejects(f.bytes(WRITING_PATH), { code: 'ENOENT' });
  await assert.rejects(refreshWritingData({ ...f.options, request: async () => { throw new Error('private-secret-detail'); } }));
  await assert.rejects(f.bytes(LINKEDIN_PATH), { code: 'ENOENT' });
});

test('concurrent edits are preserved and any earlier output from this invocation is rolled back', async () => {
  const f = await fixture();
  await refreshWritingData(f.options);
  const linkedin = await f.bytes(LINKEDIN_PATH);
  let edited = false;
  const userBytes = JSON.stringify({ schemaVersion: 1, updatedAt: now.toISOString(), posts: [] });
  await assert.rejects(refreshWritingData({ ...f.options, request: async url => {
    if (!edited) { await writeFile(path.join(f.siteRoot, WRITING_PATH), userBytes); edited = true; }
    return { ok: true, text: async () => html(source(url, { articleBody: 'Updated exact public text.' })) };
  } }));
  assert.equal(await f.bytes(WRITING_PATH), userBytes); assert.equal(await f.bytes(LINKEDIN_PATH), linkedin);
});

test('invalid registry URLs are rejected before any request', async () => {
  const f = await fixture();
  await f.writeRegistry({ ...f.registry, urls: ['https://private.invalid/internal'] });
  await assert.rejects(refreshWritingData(f.options));
  assert.equal(f.requests.length, 0);
});
