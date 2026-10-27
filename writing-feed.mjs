const SOURCES = Object.freeze({ linkedin: 'LinkedIn', blog: 'Blog' });
const POST_LIMIT = 5000;
const shortDate = new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Chicago',
});
const dateOnly = new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
});

function validDate(value) {
  if (typeof value !== 'string') return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return false;
  const parsed = new Date(value);
  const calendarDay = value.slice(0, 10);
  return Number.isFinite(parsed.getTime()) && validDate(calendarDay);
}

function safePostUrl(post) {
  if (typeof post.url !== 'string') throw new Error('Invalid post URL');
  if (post.source === 'blog') {
    const expected = `/blog/?post=${encodeURIComponent(post.id)}`;
    if (post.url !== expected) throw new Error('Invalid blog URL');
    return expected;
  }
  let parsed;
  try { parsed = new URL(post.url); } catch { throw new Error('Invalid LinkedIn URL'); }
  if (parsed.protocol !== 'https:' || !['linkedin.com', 'www.linkedin.com'].includes(parsed.hostname) ||
      parsed.username || parsed.password || parsed.port ||
      !/^\/(?:posts\/|feed\/update\/|pulse\/)/.test(parsed.pathname)) {
    throw new Error('Invalid LinkedIn URL');
  }
  return parsed.href;
}

/** Only public text and approved source links reach the page. No HTML is interpreted. */
export function normalizeWriting(input) {
  if (!input || input.schemaVersion !== 1 || !validDate(input.updatedAt) ||
      !Array.isArray(input.posts) || input.posts.length > POST_LIMIT) {
    throw new Error('Invalid writing feed');
  }
  const ids = new Set();
  const posts = input.posts.map(post => {
    if (!post || typeof post.id !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,99}$/.test(post.id) ||
        ids.has(post.id) || !Object.hasOwn(SOURCES, post.source) || !validDate(post.publishedAt) ||
        typeof post.title !== 'string' || !post.title.trim() || post.title.length > 500 ||
        typeof post.excerpt !== 'string' || post.excerpt.length > 5000 ||
        typeof post.body !== 'string' || post.body.length > 200000) {
      throw new Error('Invalid or repeated post');
    }
    ids.add(post.id);
    return {
      id: post.id,
      source: post.source,
      title: post.title.trim(),
      publishedAt: post.publishedAt,
      url: safePostUrl(post),
      excerpt: post.excerpt.trim(),
      body: post.body.trim(),
    };
  }).sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt) || left.id.localeCompare(right.id));
  return { schemaVersion: 1, updatedAt: input.updatedAt, posts };
}

export function excerptText(post) {
  return (post.excerpt || post.body).replace(/\s+/g, ' ').trim();
}

export function formatPostDate(value) {
  if (!validDate(value)) throw new Error('Invalid post date');
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? dateOnly.format(new Date(`${value}T00:00:00Z`))
    : shortDate.format(new Date(value));
}

export function resolveWritingRoute(posts, search = '') {
  const params = new URLSearchParams(search);
  if (!params.has('post')) return { type: 'archive' };
  const id = params.get('post');
  const post = posts.find(entry => entry.id === id && entry.source === 'blog');
  return post ? { type: 'post', post } : { type: 'missing' };
}

function textElement(document, tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function postMeta(document, post) {
  const meta = textElement(document, 'div', 'post-meta');
  meta.append(textElement(document, 'span', 'post-source', SOURCES[post.source]));
  const time = textElement(document, 'time', 'post-date', formatPostDate(post.publishedAt));
  time.dateTime = post.publishedAt;
  meta.append(time);
  return meta;
}

function postLink(document, post, label) {
  const link = textElement(document, 'a', '', label);
  link.href = post.url;
  if (post.source === 'linkedin') {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  return link;
}

function previewCard(document, post, archive) {
  const item = textElement(document, 'li', archive ? 'writing-list-item' : 'writing-preview-item');
  const article = textElement(document, 'article', archive ? 'writing-entry' : 'post-card');
  const link = postLink(document, post);
  link.className = archive ? 'writing-entry-link' : 'post-card-link';
  link.append(postMeta(document, post));
  link.append(textElement(document, archive ? 'h2' : 'h3', 'post-title', post.title));
  link.append(textElement(document, 'p', 'post-excerpt', excerptText(post)));
  link.append(textElement(document, 'span', 'post-read', post.source === 'linkedin' ? 'Read on LinkedIn ↗' : 'Read post ↗'));
  article.append(link);
  item.append(article);
  return item;
}

function showMessage(root, text) {
  const message = root.querySelector('[data-writing-message]');
  message.textContent = text;
  message.hidden = false;
  const list = root.querySelector('[data-writing-items]');
  list.replaceChildren();
  list.hidden = true;
}

function showBlogPost(root, post, document) {
  const list = root.querySelector('[data-writing-items]');
  list.hidden = true;
  const reader = root.querySelector('[data-writing-reader]');
  const article = textElement(document, 'article', 'blog-post');
  article.append(postMeta(document, post));
  article.append(textElement(document, 'h1', 'blog-post-title', post.title));
  const body = textElement(document, 'div', 'blog-post-body');
  for (const paragraph of (post.body || post.excerpt).split(/\r?\n\s*\r?\n/).filter(Boolean)) {
    body.append(textElement(document, 'p', '', paragraph));
  }
  article.append(body);
  reader.replaceChildren(article);
  reader.hidden = false;
  root.querySelector('[data-writing-message]').hidden = true;
  const archiveHeading = document.querySelector('[data-writing-archive-heading]');
  if (archiveHeading) archiveHeading.hidden = true;
  document.title = `${post.title} | Abhi Khurana`;
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.href = `https://abhikhur.com${post.url}`;
}

export function renderWritingFeed(root, input, options = {}) {
  const document = options.document ?? root.ownerDocument;
  const { posts } = normalizeWriting(input);
  const archive = root.dataset.view === 'archive';
  const route = archive ? resolveWritingRoute(posts, options.search ?? '') : { type: 'latest' };
  const reader = root.querySelector('[data-writing-reader]');
  if (reader) { reader.replaceChildren(); reader.hidden = true; }
  const back = document.querySelector('[data-writing-back]');
  if (back) back.hidden = !['post', 'missing'].includes(route.type);
  root.setAttribute('aria-busy', 'false');
  if (route.type === 'post') {
    showBlogPost(root, route.post, document);
    return { count: 1, route: 'post' };
  }
  if (route.type === 'missing') {
    showMessage(root, "That post isn't here. Use All posts above to see the full list.");
    return { count: 0, route: 'missing' };
  }
  if (!posts.length) {
    showMessage(root, 'tbd. yes, i know this is empty.');
    return { count: 0, route: route.type };
  }
  const selected = archive ? posts : posts.slice(0, 3);
  const list = root.querySelector('[data-writing-items]');
  list.replaceChildren(...selected.map(post => previewCard(document, post, archive)));
  list.hidden = false;
  root.querySelector('[data-writing-message]').hidden = true;
  return { count: selected.length, route: route.type };
}

export async function loadWritingFeed(root, options = {}) {
  const fetcher = options.fetch ?? globalThis.fetch;
  root.setAttribute('aria-busy', 'true');
  try {
    const response = await fetcher(root.dataset.src || '/data/writing.json', {
      cache: 'no-cache', credentials: 'omit', headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error('Writing request failed');
    return renderWritingFeed(root, await response.json(), options);
  } catch {
    showMessage(root, "Couldn't load the posts. Try refreshing, or read them on LinkedIn.");
    root.setAttribute('aria-busy', 'false');
    const document = options.document ?? root.ownerDocument;
    const message = root.querySelector('[data-writing-message]');
    const fallback = textElement(document, 'a', 'writing-fallback-link', 'Read on LinkedIn ↗');
    fallback.href = 'https://www.linkedin.com/in/abhimanyu-khurana-64821b185/recent-activity/all/';
    fallback.target = '_blank';
    fallback.rel = 'noopener noreferrer';
    message.append(document.createTextNode(' '), fallback);
    return { count: 0, route: 'error' };
  }
}

if (typeof document !== 'undefined') {
  document.querySelectorAll('[data-writing-feed]').forEach(root => {
    loadWritingFeed(root, { search: globalThis.location?.search ?? '' });
  });
}
