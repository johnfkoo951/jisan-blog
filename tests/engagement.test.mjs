import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '../api/engagement.js';
import { SITE } from '../site.config.mjs';
const env = { UPSTASH_REDIS_REST_URL: 'https://example.invalid', UPSTASH_REDIS_REST_TOKEN: 'test-only', ENGAGEMENT_COOKIE_SECRET: 'test-only-cookie-signing-secret-32-characters' };
async function run({ method = 'GET', slug = 'test', body, headers = {}, config = env, fetcher = async () => ({ ok: true, json: async () => ({ result: [5, 2, 1] }) }) } = {}) {
  const response = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(n) { this.code = n; return this; }, json(v) { this.body = v; return this; } };
  await createHandler({ env: config, fetcher, validSlug: slug => slug === 'test' })({ method, query: { slug }, body, headers }, response);
  return response;
}
const headers = { origin: SITE.url, 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0' };
test('missing store hides metrics, not fake zero', async () => { assert.deepEqual((await run({ config: {} })).body, { enabled: false }); });
test('reject unknown slug and traversal', async () => { for (const slug of ['unknown', '../test', ['test']]) assert.equal((await run({ slug })).code, 404); });
test('read issues secure signed cookie and private cache', async () => { const r = await run(); assert.equal(r.code, 200); assert.equal(r.body.views, 5); assert.match(r.headers['Set-Cookie'], /HttpOnly; Secure; SameSite=Lax/); assert.match(r.headers['Cache-Control'], /no-store/); });
test('valid cookie reused; tampered cookie replaced', async () => { const first = await run(); const cookie = first.headers['Set-Cookie'].split(';')[0]; assert.equal((await run({ headers: { cookie } })).headers['Set-Cookie'], undefined); assert.ok((await run({ headers: { cookie: cookie + 'x' } })).headers['Set-Cookie']); });
test('mutation requires explicit same origin and JSON', async () => { assert.equal((await run({ method: 'POST', body: { action: 'like' } })).code, 403); assert.equal((await run({ method: 'POST', headers: { origin: headers.origin } })).code, 415); });
test('reject invalid actions, malformed body, bots and methods', async () => { for (const body of ['{', { action: 'delete' }]) assert.equal((await run({ method: 'POST', headers, body })).code, 400); assert.equal((await run({ method: 'POST', headers: { ...headers, 'user-agent': 'Googlebot' }, body: { action: 'view' } })).code, 403); assert.equal((await run({ method: 'DELETE' })).code, 405); });
test('mutations use one atomic script with distinct view and like keys', async () => { let command; const r = await run({ method: 'POST', headers, body: { action: 'like' }, fetcher: async (_, opts) => { command = JSON.parse(opts.body); return { ok: true, json: async () => ({ result: [5, 3, 1] }) }; } }); assert.equal(r.code, 200); assert.equal(command[0], 'EVAL'); assert.equal(command[2], 4); assert.equal(command[7], 'like'); assert.match(command[1], /SADD/); assert.match(command[1], /NX/); });
test('rate rejection and storage failures return honest errors', async () => { assert.equal((await run({ fetcher: async () => ({ ok: true, json: async () => ({ result: [-1, -1, -1] }) }) })).code, 429); assert.equal((await run({ fetcher: async () => { throw new Error('offline'); } })).code, 503); assert.equal((await run({ fetcher: async () => ({ ok: true, json: async () => ({ result: ['NaN', 0, 0] }) }) })).code, 503); });

test('kill switch skips Redis and cookie creation for reads and mutations', async () => {
  for (const method of ['GET', 'POST']) {
    let called = false;
    const r = await run({ method, headers, body: { action: 'like' }, config: { ...env, ENGAGEMENT_ENABLED: 'false' }, fetcher: async () => { called = true; throw new Error('must not connect'); } });
    assert.equal(r.code, 200); assert.deepEqual(r.body, { enabled: false });
    assert.equal(called, false); assert.equal(r.headers['Set-Cookie'], undefined);
  }
});
test('read rate limiter is atomic and rate response has retry hint', async () => {
  let command;
  const r = await run({ fetcher: async (_, opts) => { command = JSON.parse(opts.body); return { ok: true, json: async () => ({ result: [-1, -1, -1] }) }; } });
  assert.equal(command[2], 3); assert.ok(command[5].startsWith(`${SITE.engagement.keyPrefix}:read-rate:`));
  assert.match(command[1], /requests > 60/); assert.match(command[1], /EXPIRE/);
  assert.equal(r.code, 429); assert.equal(r.headers['Retry-After'], '60');
});
