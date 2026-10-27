import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { normalizeDays, recordGeometry, closestDay, initRecord } from '../contribution-record.mjs';

const days = [{ date: '2026-10-24', count: 0 }, { date: '2026-10-25', count: 3 }, { date: '2026-10-26', count: 20 }];

test('record sorts real dates without mutating the source', () => {
  const reversed = [...days].reverse();
  assert.deepEqual(normalizeDays(reversed), days);
  assert.equal(reversed[0].date, '2026-10-26');
});

test('record rejects invented counts, duplicate dates, and malformed history', () => {
  for (const input of [[], null, [...days, days[0]], [{ date: '2026-02-30', count: 1 }],
    [{ date: '2026-10-26', count: -1 }], [{ date: '2026-10-26', count: '3' }]]) {
    assert.throws(() => normalizeDays(input));
  }
});

test('record encodes every day as a distinct notch with more activity visibly longer', () => {
  const points = recordGeometry(days);
  assert.equal(points.length, 3);
  const length = p => Math.hypot(p.x2 - p.x1, p.y2 - p.y1);
  assert.ok(length(points[2]) > length(points[1]));
  assert.ok(length(points[1]) > length(points[0]));
  for (const p of points) {
    assert.ok([p.x, p.y, p.x1, p.x2, p.y1, p.y2].every(Number.isFinite));
    assert.ok(p.x1 > 10 && p.x2 < 390 && p.y1 > 10 && p.y2 < 390);
  }
  assert.equal(closestDay(points, points[1].x, points[1].y), 1);
  assert.equal(closestDay([], 0, 0), -1);
  assert.equal(recordGeometry([days[0]]).length, 1);
});

test('record accepts GitHub week-padded years of up to 371 days', () => {
  const padded = Array.from({ length: 371 }, (_, i) => ({
    date: new Date(Date.UTC(2025, 9, 26) + i * 86400000).toISOString().slice(0, 10), count: i % 3
  }));
  assert.equal(recordGeometry(padded).length, 371);
  assert.throws(() => normalizeDays([...padded, { date: '2026-11-01', count: 0 }]));
});

test('record fails to an honest GitHub link rather than a fake empty chart', async () => {
  const root = { hidden: false, setAttribute() {} };
  const fallback = { hidden: true };
  const doc = { querySelector: selector => selector === '#contribution-record' ? root : fallback };
  await initRecord(doc, async () => { throw new Error('offline'); });
  assert.equal(root.hidden, true);
  assert.equal(fallback.hidden, false);
});

test('homepage keeps the portrait, an empty blog, and accessible date control', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /id="blog"/);
  assert.match(html, /tbd\. yes, i know this is empty\./);
  assert.match(html, /id="activity-day"[^>]*type="range"/);
  assert.match(html, /id="portrait-button"[^>]*type="button"/);
  assert.match(html, /class="portrait" src="preview-image.png"/);
  assert.match(html, /id="portrait-status"[^>]*role="status"/);
});
