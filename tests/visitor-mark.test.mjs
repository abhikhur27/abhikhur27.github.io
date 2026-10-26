import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createVisitorMark } from '../visitor-mark.mjs';

const id = '761cfbe1-d234-4123-8567-123456789abc';
const storageKey = 'abhikhur:visitor-mark:v1';
const config = { endpoint: 'https://counter.example/visitor-mark', publishableKey: 'public-test-key' };

function element() {
  return { textContent: '', disabled: false, attributes: {}, setAttribute(key, value) { this.attributes[key] = value; }, addEventListener() {} };
}

function setup({ initial, blocked = false, request } = {}) {
  const values = new Map(initial ? [[storageKey, initial]] : []);
  const storage = {
    getItem(key) { if (blocked) throw new Error('Blocked'); return values.get(key) ?? null; },
    setItem(key, value) { if (blocked) throw new Error('Blocked'); values.set(key, value); },
    removeItem(key) { values.delete(key); },
  };
  const button = element(), count = element(), status = element();
  const calls = [];
  const counter = createVisitorMark({ button, count, status, storage, randomUUID: () => id, config, request: async (...args) => {
    calls.push(args);
    return request ? request(...args) : { ok: true, json: async () => ({ count: 5, marked: true }) };
  } });
  return { counter, button, count, status, calls, values };
}

test('loads the real shared count without generating an identifier or incrementing', async () => {
  const env = setup();
  await env.counter.load();
  assert.equal(env.count.textContent, '5 marks');
  assert.equal(env.calls[0][1].method, 'GET');
  assert.equal(env.values.has(storageKey), false);
  assert.equal(env.button.disabled, false);
});

test('saves once from a receipt; repeat clicks and reload do not post again', async () => {
  const env = setup();
  await env.counter.load();
  await env.counter.mark();
  await env.counter.mark();
  assert.equal(env.calls.filter(([, options]) => options.method === 'POST').length, 1);
  assert.equal(env.button.attributes['aria-pressed'], 'true');
  assert.equal(env.button.disabled, true);
  assert.equal(env.button.textContent, 'You were here');
  const reload = setup({ initial: env.values.get(storageKey) });
  await reload.counter.load();
  await reload.counter.mark();
  assert.equal(reload.calls.length, 1);
  assert.equal(reload.calls[0][1].method, 'GET');
});

test('failed POST retains the same identifier for a safe retry', async () => {
  let attempts = 0;
  const env = setup({ request: async () => {
    if (++attempts === 1) throw new Error('Timeout after save');
    return { ok: true, json: async () => ({ count: 1, marked: true }) };
  } });
  await env.counter.mark();
  assert.equal(env.button.disabled, false);
  assert.equal(env.button.attributes['aria-pressed'], 'false');
  assert.match(env.status.textContent, /Couldn't confirm/);
  await env.counter.mark();
  assert.equal(env.calls[0][1].body, env.calls[1][1].body);
  assert.equal(env.count.textContent, '1 mark');
});

test('does not claim success from an invalid or unconfirmed receipt', async () => {
  for (const result of [{ count: 4 }, { count: -1, marked: true }, { count: 1.5, marked: true }]) {
    const env = setup({ request: async () => ({ ok: true, json: async () => result }) });
    await env.counter.mark();
    assert.equal(env.button.attributes['aria-pressed'], 'false');
    assert.equal(JSON.parse(env.values.get(storageKey)).marked, false);
  }
});

test('storage denial keeps public read available, but prevents repeatable writes', async () => {
  const env = setup({ blocked: true });
  await env.counter.load();
  await env.counter.mark();
  assert.equal(env.calls.length, 1);
  assert.equal(env.button.disabled, true);
  assert.equal(env.count.textContent, '5 marks');
  assert.match(env.status.textContent, /Allow browser storage/);
});

test('concurrent clicks are serialized', async () => {
  let finish;
  const env = setup({ request: () => new Promise(resolve => { finish = resolve; }) });
  const first = env.counter.mark();
  await env.counter.mark();
  assert.equal(env.calls.length, 1);
  finish({ ok: true, json: async () => ({ count: 6, marked: true }) });
  await first;
  assert.equal(env.count.textContent, '6 marks');
});

test('a delayed GET cannot roll back a confirmed count', async () => {
  let finishRead;
  const env = setup({ request: async (_, { method }) => method === 'GET'
    ? new Promise(resolve => { finishRead = resolve; })
    : { ok: true, json: async () => ({ count: 10, marked: true }) } });
  const read = env.counter.load();
  await env.counter.mark();
  finishRead({ ok: true, json: async () => ({ count: 9 }) });
  await read;
  assert.equal(env.count.textContent, '10 marks');
});

test('rate limits and outages are visible, never displayed as zero or success', async () => {
  const env = setup({ request: async () => ({ ok: false, status: 429 }) });
  await env.counter.load();
  assert.equal(env.count.textContent, 'Shared count unavailable');
  await env.counter.mark();
  assert.match(env.status.textContent, /Too many marks/);
  assert.equal(env.button.attributes['aria-pressed'], 'false');
});

test('invalid persisted values are ignored, not sent as a visitor ID', async () => {
  const env = setup({ initial: '{"id":"<script>","marked":true}' });
  await env.counter.mark();
  assert.equal(JSON.parse(env.calls[0][1].body).visitorId, id);
});

test('a mark saved by another tab after load is respected', async () => {
  const env = setup();
  await env.counter.load();
  env.values.set(storageKey, JSON.stringify({ id, marked: true }));
  await env.counter.mark();
  assert.equal(env.calls.length, 1);
  assert.equal(env.button.attributes['aria-pressed'], 'true');
});
