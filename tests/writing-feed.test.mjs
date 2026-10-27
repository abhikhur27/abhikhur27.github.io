import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  normalizeWriting, excerptText, formatPostDate, resolveWritingRoute, renderWritingFeed, loadWritingFeed,
} from '../writing-feed.mjs';

const post = (id, source, publishedAt, extra = {}) => ({
  id, source, publishedAt, title: `Post ${id}`, excerpt: 'The first few lines.', body: 'The whole post.',
  url: source === 'blog' ? `/blog/?post=${id}` : `https://www.linkedin.com/posts/abhimanyu-${id}`,
  ...extra,
});
const feed = posts => ({ schemaVersion: 1, updatedAt: '2026-10-27T01:00:00Z', posts });

class FakeNode {
  constructor(tagName, document) {
    this.tagName = tagName;
    this.ownerDocument = document;
    this.children = [];
    this.hidden = false;
    this.attributes = {};
    this.dataset = {};
    this._text = '';
    this.selectors = {};
  }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  set innerHTML(_) { throw new Error('Untrusted HTML must never be interpreted'); }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this._text = ''; this.children = [...nodes]; }
  setAttribute(key, value) { this.attributes[key] = value; }
  querySelector(selector) { return this.selectors[selector] ?? null; }
}

function fakeRoot(view = 'latest') {
  const document = {
    createElement: tag => new FakeNode(tag, document),
    createTextNode: text => {
      const node = new FakeNode('#text', document);
      node.textContent = text;
      return node;
    },
    querySelector: () => null,
  };
  const root = new FakeNode('div', document);
  root.dataset = { view, src: '/data/writing.json' };
  for (const selector of ['[data-writing-items]', '[data-writing-message]', '[data-writing-reader]']) {
    root.selectors[selector] = new FakeNode('div', document);
  }
  return { root, document };
}

test('writing mixes sources newest-first with deterministic ties and no source mutation', () => {
  const input = feed([
    post('older', 'blog', '2026-10-20T13:00:00Z'),
    post('z', 'linkedin', '2026-10-26T18:00:00Z'),
    post('a', 'blog', '2026-10-26T18:00:00Z'),
  ]);
  assert.deepEqual(normalizeWriting(input).posts.map(entry => entry.id), ['a', 'z', 'older']);
  assert.equal(input.posts[0].id, 'older');
  assert.deepEqual(Object.keys(normalizeWriting(input).posts[0]),
    ['id', 'source', 'title', 'publishedAt', 'url', 'excerpt', 'body']);
});

test('writing rejects malformed dates, repeated identities, wrong sources, and oversized content', () => {
  const good = post('valid', 'blog', '2026-10-26T18:00:00Z');
  for (const invalid of [
    null, { ...feed([]), schemaVersion: 2 }, { ...feed([]), updatedAt: 'yesterday' },
    feed([good, good]), feed([{ ...good, publishedAt: '2026-02-30' }]),
    feed([{ ...good, publishedAt: '2026-10-26T13:00:00' }]),
    feed([{ ...good, source: 'twitter' }]), feed([{ ...good, id: '../../other' }]),
    feed([{ ...good, title: '' }]), feed([{ ...good, body: 'a'.repeat(200001) }]),
  ]) assert.throws(() => normalizeWriting(invalid));
});

test('source links reject executable URLs, lookalike hosts, credentials, and arbitrary local routes', () => {
  const linked = post('linked', 'linkedin', '2026-10-26');
  for (const url of [
    'javascript:alert(1)', 'http://www.linkedin.com/posts/test',
    'https://www.linkedin.com.evil.test/posts/test', 'https://user:pass@www.linkedin.com/posts/test',
    'https://www.linkedin.com:8443/posts/test', 'https://www.linkedin.com/in/someone',
  ]) assert.throws(() => normalizeWriting(feed([{ ...linked, url }])));
  assert.throws(() => normalizeWriting(feed([post('blog', 'blog', '2026-10-26', { url: '/admin/' })])));
  assert.equal(normalizeWriting(feed([{ ...linked, url: 'https://www.linkedin.com/feed/update/urn:li:activity:123/' }])).posts[0].source, 'linkedin');
});

test('date display preserves date-only publication and uses Central time for timestamps', () => {
  assert.equal(formatPostDate('2026-10-26'), 'Oct 26, 2026');
  assert.equal(formatPostDate('2026-10-27T01:00:00Z'), 'Oct 26, 2026');
  assert.equal(formatPostDate('2026-10-26T20:00:00-05:00'), 'Oct 26, 2026');
  assert.throws(() => formatPostDate('later'));
});

test('the reader opens only real local Blog entries, not external posts or invented IDs', () => {
  const posts = [post('local', 'blog', '2026-10-26'), post('external', 'linkedin', '2026-10-26')];
  assert.equal(resolveWritingRoute(posts).type, 'archive');
  assert.equal(resolveWritingRoute(posts, '?post=local').post.id, 'local');
  assert.equal(resolveWritingRoute(posts, '?post=external').type, 'missing');
  assert.equal(resolveWritingRoute(posts, '?post=missing').type, 'missing');
  assert.equal(excerptText({ excerpt: ' One\n two   three ', body: 'ignored' }), 'One two three');
  assert.equal(excerptText({ excerpt: '', body: 'Body\n here' }), 'Body here');
});

test('homepage renders the latest three with real source labels and protected external links', () => {
  const { root } = fakeRoot();
  const input = feed(Array.from({ length: 5 }, (_, i) => post(`p${i}`, i % 2 ? 'blog' : 'linkedin', `2026-10-${20 + i}`)));
  assert.deepEqual(renderWritingFeed(root, input), { count: 3, route: 'latest' });
  const list = root.querySelector('[data-writing-items]');
  assert.equal(list.children.length, 3);
  assert.equal(list.children[0].textContent.includes('Post p4'), true);
  assert.equal(list.children[0].textContent.includes('LinkedIn'), true);
  const link = list.children[0].children[0].children[0];
  assert.equal(link.target, '_blank');
  assert.equal(link.rel, 'noopener noreferrer');
  assert.equal(root.attributes['aria-busy'], 'false');
});

test('archive includes every post and local posts render all paragraphs as inert text', () => {
  const { root, document } = fakeRoot('archive');
  const hostile = '<img src=x onerror=alert(1)> & <script>bad()</script>';
  const input = feed([post('local', 'blog', '2026-10-26', { title: hostile, body: `${hostile}\n\nSecond paragraph.` }),
    post('external', 'linkedin', '2026-10-25')]);
  assert.deepEqual(renderWritingFeed(root, input), { count: 2, route: 'archive' });
  assert.equal(root.querySelector('[data-writing-items]').children.length, 2);
  renderWritingFeed(root, input, { document, search: '?post=local' });
  const reader = root.querySelector('[data-writing-reader]');
  assert.equal(reader.hidden, false);
  assert.equal(reader.textContent.includes(hostile), true);
  assert.equal(reader.textContent.includes('Second paragraph.'), true);
  const article = reader.children[0];
  assert.equal(article.children[2].children.length, 2);
  assert.equal(article.children[2].children[0].tagName, 'p');
});

test('empty and failed loads remain honest instead of showing fake articles', async () => {
  const { root } = fakeRoot();
  assert.deepEqual(renderWritingFeed(root, feed([])), { count: 0, route: 'latest' });
  assert.match(root.querySelector('[data-writing-message]').textContent, /tbd\. yes, i know this is empty\./);
  let request;
  const result = await loadWritingFeed(root, { fetch: async (url, options) => {
    request = { url, options };
    throw new Error('A private server error that should not appear');
  } });
  assert.deepEqual(result, { count: 0, route: 'error' });
  assert.equal(root.querySelector('[data-writing-items]').hidden, true);
  const message = root.querySelector('[data-writing-message]');
  assert.match(message.textContent, /Couldn't load the posts/);
  assert.doesNotMatch(message.textContent, /private server error/);
  assert.equal(message.children.at(-1).href.includes('/recent-activity/all/'), true);
  assert.equal(request.options.credentials, 'omit');
  assert.equal(root.attributes['aria-busy'], 'false');
});

test('homepage and full archive use the shared feed and keep source previews accessible', async () => {
  const [home, archive, css] = await Promise.all(['index.html', 'blog/index.html', 'writing-feed.css']
    .map(path => readFile(new URL(`../${path}`, import.meta.url), 'utf8')));
  assert.match(home, /href="\/blog\/"/);
  assert.match(home, /data-writing-feed data-view="latest"/);
  assert.match(home, /data-writing-message role="status"/);
  assert.match(archive, /data-writing-feed data-view="archive"/);
  assert.match(archive, /aria-label="All posts, newest first"/);
  assert.match(archive, /data-writing-reader hidden/);
  assert.match(css, /flex: 0 0 83%/);
  assert.match(css, /scroll-snap-type: x proximity/);
  assert.match(css, /-webkit-line-clamp: 4/);
  assert.doesNotMatch(css, /box-shadow:|transform:|animation:|transition:/);
});
