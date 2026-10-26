// Live smoke test. Adds four synthetic marks. Run only with admin test cleanup
// available; stdout includes their exact hashes so no real visitor is removed.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { visitorConfig as config } from '../../visitor-config.mjs';

const origin = 'https://abhikhur.com';
const headers = { apikey: config.publishableKey, Origin: origin };
const request = (method = 'GET', overrides = {}) => fetch(config.endpoint, {
  method, headers, ...overrides,
});
const count = async () => {
  const response = await request(); assert.equal(response.status, 200);
  return (await response.json()).count;
};
const post = id => request('POST', {
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify({ visitorId: id }),
});
const ids = Array.from({ length: 4 }, randomUUID);
console.log(JSON.stringify({ cleanupVisitorHashes: ids.map(id =>
  createHash('sha256').update(`portfolio-mark-v1:${id}`).digest('hex')) }));
const baseline = await count();
const concurrentDuplicate = await Promise.all(Array.from({ length: 8 }, () => post(ids[0])));
const receipts = await Promise.all(concurrentDuplicate.map(async response => {
  assert.equal(response.status, 200); return response.json();
}));
assert.equal(receipts.filter(receipt => !receipt.alreadyMarked).length, 1);
assert.ok(receipts.every(receipt => receipt.marked === true && receipt.count === baseline + 1));
assert.equal(await count(), baseline + 1);
const different = await Promise.all(ids.slice(1).map(post));
assert.ok(different.every(response => response.status === 200));
assert.equal(await count(), baseline + 4);
assert.equal((await post(ids[0])).status, 200);
assert.equal(await count(), baseline + 4);

assert.equal((await request('GET', { headers: { Origin: origin } })).status, 401);
assert.equal((await request('GET', { headers: { ...headers, Origin: 'https://example.com' } })).status, 403);
assert.equal((await request('POST', { headers: { apikey: config.publishableKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ visitorId: randomUUID() }) })).status, 403);
assert.equal((await request('POST', { headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ visitorId: randomUUID(), name: 'not accepted' }) })).status, 400);
assert.equal((await request('POST', { headers: { ...headers, 'Content-Type': 'application/json' }, body: 'x'.repeat(257) })).status, 413);
assert.equal((await request('POST', { headers: { ...headers, 'Content-Type': 'application/json' }, body: '{"visitorId":"no"}' })).status, 400);
assert.equal((await request('PUT')).status, 405);
const preflight = await request('OPTIONS', { headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'apikey,content-type' } });
assert.equal(preflight.status, 204);
assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
assert.equal(await count(), baseline + 4, 'invalid requests never increment');

const base = new URL(config.endpoint).origin;
const direct = await fetch(`${base}/rest/v1/rpc/portfolio_record_mark`, { method:'POST', headers: { apikey: config.publishableKey, 'Content-Type':'application/json' }, body: JSON.stringify({ p_visitor_hash: 'a'.repeat(64), p_network_hash: 'b'.repeat(64) }) });
assert.ok([401,403,404].includes(direct.status), `direct public RPC denied: ${direct.status}`);
const privateTable = await fetch(`${base}/rest/v1/visitor_marks?select=*`, { headers: { apikey: config.publishableKey, 'Accept-Profile': 'portfolio_private' } });
assert.ok([401,403,404,406].includes(privateTable.status), `private table denied: ${privateTable.status}`);
console.log(JSON.stringify({ passed: true, baseline, syntheticMarksAdded: 4, finalCount: await count(), directRpcStatus: direct.status, privateTableStatus: privateTable.status }));
