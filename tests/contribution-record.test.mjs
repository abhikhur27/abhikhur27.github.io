import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { normalizeDays, starMapGeometry, closestDay, mountRecord, initRecord } from '../contribution-record.mjs';

const days = [{ date: '2026-10-24', count: 0 }, { date: '2026-10-25', count: 3 }, { date: '2026-10-26', count: 20 }];

test('star map sorts real dates without mutating the source', () => {
  const reversed = [...days].reverse();
  assert.deepEqual(normalizeDays(reversed), days);
  assert.equal(reversed[0].date, '2026-10-26');
});

test('star map rejects invented counts, duplicate dates, and malformed history', () => {
  for (const input of [[], null, [...days, days[0]], [{ date: '2026-02-30', count: 1 }],
    [{ date: '2026-10-26', count: -1 }], [{ date: '2026-10-26', count: '3' }],
    [{ date: '2026-10-26', count: 0.5 }], [{ date: '2026-10-26', count: Number.MAX_SAFE_INTEGER + 1 }]]) {
    assert.throws(() => normalizeDays(input));
  }
});

test('star map encodes positive point area proportionally and zero as a separate hollow marker', () => {
  const points = starMapGeometry(days);
  assert.equal(points.length, 3);
  const area = p => Math.PI * p.radius ** 2;
  assert.ok(points[2].radius > points[1].radius);
  assert.ok(Math.abs(area(points[2]) / area(points[1]) - 20 / 3) < 1e-10);
  assert.equal(points[0].count, 0);
  assert.equal(points[0].radius, 0.8);
});

test('star map has chronological elapsed-date positions and deterministic count-independent spacing', () => {
  const sparse = [days[0], days[1], { date: '2026-10-28', count: 3 }];
  const points = starMapGeometry(sparse);
  assert.ok(points[0].x < points[1].x && points[1].x < points[2].x);
  assert.equal(points[1].radius, points[2].radius);
  assert.ok(Math.abs((points[2].x - points[1].x) / (points[1].x - points[0].x) - 3) < 1e-10);
  assert.deepEqual(starMapGeometry(sparse), points);
  const changed = starMapGeometry(sparse.map(day => ({ ...day, count: day.count + 10 })));
  assert.deepEqual(changed.map(({ x, y }) => [x, y]), points.map(({ x, y }) => [x, y]));
  assert.equal(closestDay(points, points[1].x, points[1].y), 1);
  assert.equal(closestDay([], 0, 0), -1);
  assert.equal(closestDay(points, NaN, 0), -1);
  assert.equal(closestDay(points, 0, Infinity), -1);
  assert.equal(starMapGeometry([days[0]])[0].x, 400);
});

test('star map accepts a week-padded year and keeps every point and selection ring inside desktop and mobile bounds', () => {
  const padded = Array.from({ length: 371 }, (_, i) => ({
    date: new Date(Date.UTC(2025, 9, 26) + i * 86400000).toISOString().slice(0, 10), count: i % 3
  }));
  for (const layout of [{ width: 800, height: 240 }, { width: 335, height: 190 }, { width: 240, height: 120 }]) {
    const points = starMapGeometry(padded, layout);
    assert.equal(points.length, 371);
    assert.equal(new Set(points.map(point => `${point.x},${point.y}`)).size, points.length);
    for (const point of points) {
      const ring = point.radius + 3;
      assert.ok([point.x, point.y, point.radius].every(Number.isFinite));
      assert.ok(point.x - ring > 0 && point.x + ring < layout.width);
      assert.ok(point.y - ring > 0 && point.y + ring < layout.height - 25);
    }
  }
  assert.throws(() => normalizeDays([...padded, { date: '2026-11-01', count: 0 }]));
  assert.throws(() => starMapGeometry(days, { width: 0, height: 240 }));
  assert.throws(() => starMapGeometry(days, { width: 800, height: NaN }));
});

class FakeNode {
  constructor(tag, document) {
    this.tag = tag;
    this.ownerDocument = document;
    this.attributes = {};
    this.children = [];
    this.listeners = new Map();
    this.selectors = {};
    this.textContent = '';
    this.hidden = false;
    this.disabled = true;
    this.classes = new Set();
    this.classList = { add: name => this.classes.add(name), remove: name => this.classes.delete(name) };
    this.rect = { left: 40, top: 80, width: 800, height: 240 };
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children.flatMap(child => child.tag === '#fragment' ? child.children : [child]); }
  querySelector(selector) { return this.selectors[selector] ?? null; }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  getBoundingClientRect() { return this.rect; }
}

function setup() {
  let resize;
  const observer = { observed: null, disconnected: false, observe(node) { this.observed = node; }, disconnect() { this.disconnected = true; } };
  const document = { defaultView: { ResizeObserver: class { constructor(callback) { resize = callback; return observer; } } } };
  document.createElementNS = (_, tag) => new FakeNode(tag, document);
  document.createDocumentFragment = () => new FakeNode('#fragment', document);
  const root = new FakeNode('div', document);
  for (const id of ['activity-record-svg', 'activity-stars', 'activity-months', 'activity-day', 'activity-total', 'activity-period', 'activity-updated', 'activity-date', 'activity-count']) {
    root.selectors[`#${id}`] = new FakeNode(id === 'activity-day' ? 'input' : 'g', document);
  }
  return { root, observer, resize: () => resize(), node: id => root.querySelector(`#${id}`) };
}

const snapshot = input => ({ updatedAt: '2026-10-27T01:00:00Z', contributions: { days: input } });

test('star map renders each real date without paths, fake connections, or per-day tab stops', () => {
  const env = setup();
  const controller = mountRecord(env.root, snapshot(days));
  const stars = env.node('activity-stars').children;
  assert.equal(stars.length, days.length + 1);
  assert.ok(stars.every(star => star.tag === 'circle' && !('tabindex' in star.attributes)));
  assert.match(stars[0].attributes.class, /activity-star--quiet/);
  assert.equal(stars[0].children[0].textContent, '2026-10-24: 0 contributions');
  assert.equal(env.node('activity-total').textContent, '23 contributions');
  assert.equal(env.node('activity-period').textContent, 'Oct 24, 2026 to Oct 26, 2026');
  assert.equal(env.node('activity-day').max, '2');
  assert.equal(env.node('activity-day').disabled, false);
  assert.equal(env.node('activity-day').value, '2');
  assert.equal(env.node('activity-day').attributes['aria-valuetext'], 'October 26, 2026, 20 contributions');
  assert.equal(env.root.attributes['aria-busy'], 'false');
  assert.equal(env.observer.observed, env.node('activity-record-svg'));
  controller.disconnect();
  assert.equal(env.observer.disconnected, true);
});

test('date selection clamps boundaries and preserves true zero and singular counts', () => {
  const env = setup();
  const controller = mountRecord(env.root, snapshot([...days, { date: '2026-10-27', count: 1 }]));
  controller.select(-100);
  assert.equal(env.node('activity-date').textContent, 'October 24, 2026');
  assert.equal(env.node('activity-count').textContent, '0 contributions');
  controller.select(Infinity);
  assert.equal(env.node('activity-count').textContent, '1 contribution');
  env.node('activity-day').value = '1';
  env.node('activity-day').listeners.get('input')();
  assert.equal(env.node('activity-date').textContent, 'October 25, 2026');
  controller.select('invalid');
  assert.equal(env.node('activity-day').value, '0');
});

test('pointer taps and hover inspect exact days while touch scrolling does not change selection', () => {
  const env = setup();
  mountRecord(env.root, snapshot(days));
  const svg = env.node('activity-record-svg');
  const points = starMapGeometry(days);
  const eventAt = (index, extra = {}) => ({ clientX: points[index].x + svg.rect.left, clientY: points[index].y + svg.rect.top, ...extra });
  svg.listeners.get('pointerdown')(eventAt(0, { pointerType: 'touch' }));
  assert.equal(env.node('activity-day').value, '0');
  svg.listeners.get('pointermove')(eventAt(1, { pointerType: 'touch', buttons: 0 }));
  assert.equal(env.node('activity-day').value, '0');
  svg.listeners.get('pointermove')(eventAt(1, { pointerType: 'mouse', buttons: 0 }));
  assert.equal(env.node('activity-day').value, '1');
  svg.listeners.get('pointerdown')(eventAt(2, { pointerType: 'touch' }));
  assert.equal(env.node('activity-day').value, '2');
});

test('responsive redraw preserves selected date and area mapping without overlapping month labels', () => {
  const env = setup();
  const year = Array.from({ length: 367 }, (_, i) => ({ date: new Date(Date.UTC(2025, 9, 26) + i * 86400000).toISOString().slice(0, 10), count: i % 20 }));
  const controller = mountRecord(env.root, snapshot(year));
  controller.select(100);
  const before = env.node('activity-day').attributes['aria-valuetext'];
  env.node('activity-record-svg').rect = { left: 0, top: 0, width: 335, height: 190 };
  env.resize();
  assert.equal(env.node('activity-record-svg').attributes.viewBox, '0 0 335 190');
  assert.equal(env.node('activity-day').attributes['aria-valuetext'], before);
  const points = starMapGeometry(year, { width: 335, height: 190 });
  const marker = env.node('activity-stars').children.at(-1);
  assert.equal(Number(marker.attributes.cx), points[100].x);
  assert.equal(Number(marker.attributes.cy), points[100].y);
  const labels = env.node('activity-months').children;
  assert.ok(labels.length >= 2 && labels.length <= 6);
  assert.match(labels[0].textContent, /'25$/);
  assert.match(labels.at(-1).textContent, /'26$/);
  for (let i = 1; i < labels.length; i += 1) assert.ok(Number(labels[i].attributes.x) - Number(labels[i - 1].attributes.x) >= 58);
});

test('an all-zero history stays hollow with a real zero total and no invented activity', () => {
  const env = setup();
  mountRecord(env.root, snapshot(days.map(day => ({ ...day, count: 0 }))));
  assert.equal(env.node('activity-total').textContent, '0 contributions');
  assert.equal(env.node('activity-count').textContent, '0 contributions');
  assert.ok(env.node('activity-stars').children.slice(0, -1).every(star => star.attributes.class.includes('activity-star--quiet')));
});

test('star map fails to an honest GitHub link rather than a fake empty chart', async () => {
  const root = { hidden: false, setAttribute() {} };
  const fallback = { hidden: true };
  const doc = { querySelector: selector => selector === '#contribution-record' ? root : fallback };
  await initRecord(doc, async () => { throw new Error('offline'); });
  assert.equal(root.hidden, true);
  assert.equal(fallback.hidden, false);
});

test('HTTP failures and malformed snapshots keep the fallback honest', async () => {
  for (const fetcher of [async () => ({ ok: false }), async () => ({ ok: true, json: async () => snapshot([]) })]) {
    const env = setup();
    const fallback = { hidden: true };
    const doc = { querySelector: selector => selector === '#contribution-record' ? env.root : fallback };
    await initRecord(doc, fetcher);
    assert.equal(env.root.hidden, true);
    assert.equal(fallback.hidden, false);
  }
  assert.throws(() => mountRecord(setup().root, snapshot([{ date: '2026-10-26', count: Number.MAX_SAFE_INTEGER }, { date: '2026-10-27', count: 1 }])));
  const missing = setup();
  delete missing.root.selectors['#activity-stars'];
  assert.throws(() => mountRecord(missing.root, snapshot(days)));
});

test('homepage describes actual star-map semantics rather than the old vinyl metaphor', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /A year of making things/);
  assert.match(html, /id="activity-stars"/);
  assert.match(html, /id="activity-months"/);
  assert.match(html, /Filled point area is proportional/);
  assert.match(html, /Vertical position is only for visual spacing/);
  assert.doesNotMatch(html, /record-grooves|record-spindle|record-label|SIDE A|etched into a record/);
  const css = await readFile(new URL('../portfolio-extras.css', import.meta.url), 'utf8');
  assert.match(css, /\.record-slider\s*\{[^}]*height: 44px/);
  assert.doesNotMatch(css, /@keyframes|animation\s*:|filter\s*:\s*blur/);
});

test('homepage keeps the portrait, mixed writing feed, and accessible date control', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /id="blog"/);
  assert.match(html, /data-writing-feed/);
  assert.match(html, /href="\/blog\/"/);
  assert.match(html, /src="writing-feed\.mjs"/);
  assert.match(html, /id="activity-day"[^>]*type="range"/);
  assert.match(html, /id="portrait-button"[^>]*type="button"/);
  assert.match(html, /class="portrait" src="preview-image.png"/);
  assert.match(html, /id="portrait-status"[^>]*role="status"/);
});
