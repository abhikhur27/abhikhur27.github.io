import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
const fakePublishable = 'sb_publishable_TEST_ONLY_NOT_A_REAL_KEY';
const fakeSecret = 'sb_secret_TEST_ONLY_NOT_A_REAL_KEY';
globalThis.Deno = { serve() {}, env: { get(name) { return {
  SUPABASE_PUBLISHABLE_KEYS: JSON.stringify({ default: fakePublishable }),
  SUPABASE_SECRET_KEYS: JSON.stringify({ default: fakeSecret }),
  SUPABASE_URL: 'https://test.invalid',
}[name]; } } };
const { handler } = await import('../functions/visitor-marks/index.ts');
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const uuid = 'c8f4f935-8888-4a59-8888-1260e700b97f';
const request = (method='GET', init={}) => new Request('https://test.invalid/visitor-marks', {
  method, headers: { apikey: fakePublishable, Origin:'https://abhikhur.com', 'Content-Type':'application/json' }, ...init,
});

test('public read returns only count without creating a visitor', async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://test.invalid/rest/v1/rpc/portfolio_mark_count');
    assert.equal(options.headers.apikey, fakeSecret);
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.body, '{}');
    return Response.json({ count: 8 });
  };
  const response = await handler(request());
  assert.equal(response.status,200); assert.deepEqual(await response.json(), {count:8});
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://abhikhur.com');
});
test('write hashes visitor and network, no raw IDs sent to database', async () => {
  globalThis.fetch = async (url, options) => {
    assert.ok(url.endsWith('/portfolio_record_mark'));
    const payload = JSON.parse(options.body);
    assert.match(payload.p_visitor_hash,/^[0-9a-f]{64}$/);
    assert.match(payload.p_network_hash,/^[0-9a-f]{64}$/);
    assert.ok(!options.body.includes(uuid) && !options.body.includes('192.0.2.1'));
    return Response.json({count:9,marked:true,alreadyMarked:false});
  };
  const response = await handler(request('POST',{body:JSON.stringify({visitorId:uuid}),headers:{apikey:fakePublishable,Origin:'https://abhikhur.com','Content-Type':'application/json','cf-connecting-ip':'192.0.2.1'}}));
  assert.equal(response.status,200); assert.equal((await response.json()).marked,true);
});
test('untrusted origin and absent key rejected before database access', async () => {
  globalThis.fetch=()=>{throw new Error('must not fetch');};
  assert.equal((await handler(request('POST',{headers:{apikey:fakePublishable,Origin:'https://attacker.invalid'}}))).status,403);
  assert.equal((await handler(request('GET',{headers:{Origin:'https://abhikhur.com'}}))).status,401);
  assert.equal((await handler(request('POST',{headers:{apikey:fakePublishable}}))).status,403);
});
test('shape, UUID, size and type are validated', async () => {
  for (const body of ['null','[]','{}','{"visitorId":"wrong"}',JSON.stringify({visitorId:uuid,extra:true})]) {
    assert.equal((await handler(request('POST',{body}))).status,400);
  }
  assert.equal((await handler(request('POST',{body:'x'.repeat(257)}))).status,413);
  assert.equal((await handler(request('POST',{headers:{apikey:fakePublishable,Origin:'https://abhikhur.com','Content-Type':'text/plain'},body:uuid}))).status,415);
});
test('allowed preflight works without credentials and disallowed one does not', async () => {
  assert.equal((await handler(request('OPTIONS',{headers:{Origin:'http://127.0.0.1:8765'}}))).status,204);
  assert.equal((await handler(request('OPTIONS',{headers:{Origin:'http://127.0.0.1:8766'}}))).status,403);
});
test('quota is a retryable failure, never successful mark', async () => {
  globalThis.fetch=async()=>Response.json({error:'rate_limit',retryAfter:3600});
  const response=await handler(request('POST',{body:JSON.stringify({visitorId:uuid})}));
  assert.equal(response.status,429); assert.equal(response.headers.get('retry-after'),'3600');
  assert.equal((await response.json()).marked,undefined);
});
test('upstream errors and invalid counts fail closed without error details', async () => {
  globalThis.fetch=async()=>Response.json({message:fakeSecret},{status:500});
  let response=await handler(request()); assert.equal(response.status,503); assert.ok(!(await response.text()).includes(fakeSecret));
  globalThis.fetch=async()=>Response.json({count:-1});
  response=await handler(request()); assert.equal(response.status,503);
});
