// Optional shared metrics. Secrets stay server-side; static reading never depends on Redis.
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { SITE } from '../site.config.mjs';

export const MUTATE = `
local requests = redis.call('INCR', KEYS[4])
if requests == 1 then redis.call('EXPIRE', KEYS[4], 60) end
if requests > 30 then return {-1, -1, -1} end
if ARGV[1] == 'view' then
  if redis.call('SET', KEYS[3], '1', 'EX', 86400, 'NX') then redis.call('INCR', KEYS[1]) end
elseif ARGV[1] == 'like' then redis.call('SADD', KEYS[2], ARGV[2])
elseif ARGV[1] == 'unlike' then redis.call('SREM', KEYS[2], ARGV[2]) end
return {tonumber(redis.call('GET', KEYS[1]) or '0'), redis.call('SCARD', KEYS[2]), redis.call('SISMEMBER', KEYS[2], ARGV[2])}
`;
const READ = `
local requests = redis.call('INCR', KEYS[3])
if requests == 1 then redis.call('EXPIRE', KEYS[3], 60) end
if requests > 60 then return {-1, -1, -1} end
return {tonumber(redis.call('GET', KEYS[1]) or '0'), redis.call('SCARD', KEYS[2]), redis.call('SISMEMBER', KEYS[2], ARGV[1])}`;
const COOKIE = SITE.engagement.cookie;
const sign = (value, secret) => createHmac('sha256', secret).update(value).digest('hex');
function identity(req, res, secret) {
  const cookie = (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(`${COOKIE}=`));
  const [id, signature] = (cookie ? cookie.slice(COOKIE.length + 1) : '').split('.');
  if (/^[a-f0-9-]{36}$/.test(id || '') && /^[a-f0-9]{64}$/.test(signature || '')) {
    const expected = sign(id, secret);
    if (timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return sign(`reader:${id}`, secret);
  }
  const next = randomUUID();
  res.setHeader('Set-Cookie', `${COOKIE}=${next}.${sign(next, secret)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`);
  return sign(`reader:${next}`, secret);
}
export function createHandler({ env = process.env, fetcher = fetch, validSlug = slug => existsSync(join(process.cwd(), 'content', 'posts', `${slug}.md`)) } = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Vary', 'Cookie');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const send = (status, value) => res.status(status).json(value);
    if (!['GET', 'POST'].includes(req.method)) { res.setHeader('Allow', 'GET, POST'); return send(405, { error: 'method' }); }
    const slug = req.query?.slug;
    if (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120 || !validSlug(slug)) return send(404, { error: 'post' });
    if (env.ENGAGEMENT_ENABLED === 'false') return send(200, { enabled: false });
    const base = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
    const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
    const secret = env.ENGAGEMENT_COOKIE_SECRET;
    if (!base || !token || !secret || secret.length < 32) return send(200, { enabled: false });
    let action;
    if (req.method === 'POST') {
      // Fixed origins, never trust Host or arbitrary preview domains.
      const origins = [SITE.url, env.ENGAGEMENT_ALLOWED_ORIGIN].filter(Boolean);
      if (!origins.includes(req.headers.origin)) return send(403, { error: 'origin' });
      if (!(req.headers['content-type'] || '').startsWith('application/json')) return send(415, { error: 'content-type' });
      let body;
      try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch { return send(400, { error: 'body' }); }
      action = body?.action;
      if (!['view', 'like', 'unlike'].includes(action)) return send(400, { error: 'action' });
      if (/bot|crawler|spider|headless/i.test(req.headers['user-agent'] || '')) return send(403, { error: 'automated' });
    }
    const reader = identity(req, res, secret);
    const prefix = `${SITE.engagement.keyPrefix}:${slug}`;
    const keys = [`${prefix}:views`, `${prefix}:likes`];
    // UTC day boundary; a short-lived per-browser rate key caps ordinary repeated clicks.
    const day = new Date().toISOString().slice(0, 10);
    const command = action ? ['EVAL', MUTATE, 4, ...keys, `${prefix}:view:${day}:${reader}`, `${SITE.engagement.keyPrefix}:rate:${reader}`, action, reader]
      : ['EVAL', READ, 3, ...keys, `${SITE.engagement.keyPrefix}:read-rate:${reader}`, reader];
    try {
      const response = await fetcher(base, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(command), signal: AbortSignal.timeout(4000),
      });
      if (!response.ok) throw new Error('store');
      const data = await response.json();
      if (data.error || !Array.isArray(data.result) || data.result.length !== 3) throw new Error('response');
      const [views, likes, liked] = data.result.map(Number);
      if (views === -1) { res.setHeader('Retry-After', '60'); return send(429, { error: 'rate' }); }
      if (![views, likes].every(n => Number.isSafeInteger(n) && n >= 0) || ![0, 1].includes(liked)) throw new Error('counts');
      return send(200, { enabled: true, views, likes, liked: liked === 1 });
    } catch { return send(503, { enabled: false, error: 'unavailable' }); }
  };
}
export default createHandler();
