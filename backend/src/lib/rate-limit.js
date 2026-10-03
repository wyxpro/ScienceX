const crypto = require('node:crypto');
const { fail } = require('./respond');
const { getLogger } = require('./logger');
function backendName() {
  return process.env.RATE_LIMIT_BACKEND || (process.env.UPSTASH_REDIS_REST_URL ? 'upstash' : process.env.REDIS_URL ? 'redis' : 'memory');
}
function assertRateLimitConfig() {
  const backend = backendName();
  if (!['memory', 'redis', 'upstash'].includes(backend)) throw new Error('RATE_LIMIT_BACKEND 必须是 memory / redis / upstash');
  if (backend === 'upstash' && (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN)) throw new Error('Upstash 限流必须配置 REST URL 与 Token');
  if (backend === 'redis' && !process.env.REDIS_URL) throw new Error('Redis 限流必须配置 REDIS_URL');
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL && backend === 'memory') throw new Error('Vercel 生产环境必须配置共享限流');
}
function createMemoryLimiter({ max, windowMs, now = Date.now }) {
  const buckets = new Map();
  return { async consume(key) {
    const time = now();
    for (const [id, bucket] of buckets) if (bucket.expires <= time) buckets.delete(id);
    let bucket = buckets.get(key);
    if (!bucket) {
      if (buckets.size >= 10000) throw new Error('限流容量已满');
      bucket = { count: 0, expires: time + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    return { allowed: bucket.count <= max, remaining: Math.max(0, max - bucket.count), retryMs: bucket.expires - time };
  } };
}
// 一条 Lua 指令原子完成计数及 TTL，多实例共享。
const SCRIPT = "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end; return {n,redis.call('PTTL',KEYS[1])}";
function createUpstashLimiter({ max, windowMs, url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN, fetchImpl = fetch }) {
  if (!/^https:\/\//.test(url || '')) throw new Error('Upstash 必须使用 HTTPS');
  return { async consume(key) {
    const response = await fetchImpl(url, { method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['EVAL', SCRIPT, 1, key, windowMs]), signal: AbortSignal.timeout(3000), redirect: 'error' });
    if (!response.ok) throw new Error('共享限流响应异常');
    const payload = await response.json();
    const [count, ttl] = payload.result || [];
    if (payload.error || !Number.isFinite(count) || !Number.isFinite(ttl) || ttl < 0) throw new Error('共享限流计数无效');
    return { allowed: count <= max, remaining: Math.max(0, max - count), retryMs: ttl };
  } };
}
let redisClient;
let connecting;
async function getRedisClient() {
  if (!redisClient) {
    redisClient = require('redis').createClient({ url: process.env.REDIS_URL, socket: { connectTimeout: 3000, reconnectStrategy: false } });
    redisClient.on('error', () => getLogger().error({ event: 'redis_error' }, '共享限流连接失败'));
  }
  if (!redisClient.isReady) {
    if (!connecting) connecting = redisClient.connect().finally(() => { connecting = null; });
    await connecting;
  }
  return redisClient;
}
function createRedisLimiter({ max, windowMs }) {
  let limiter;
  return { async consume(key) {
    const client = await getRedisClient();
    if (!limiter) limiter = new (require('rate-limiter-flexible').RateLimiterRedis)({
      storeClient: client, useRedisPackage: true, keyPrefix: 'sx-rate', points: max, duration: windowMs / 1000 });
    try {
      const result = await limiter.consume(key);
      return { allowed: true, remaining: result.remainingPoints, retryMs: result.msBeforeNext };
    } catch (result) {
      if (result instanceof Error || !Number.isFinite(result.msBeforeNext)) throw result;
      return { allowed: false, remaining: 0, retryMs: result.msBeforeNext };
    }
  } };
}
function rateLimit({ windowMs = 60000, max = 120, scope = 'api', limiter, key } = {}) {
  assertRateLimitConfig();
  const backend = backendName();
  const counter = limiter || (backend === 'upstash' ? createUpstashLimiter({ max, windowMs }) : backend === 'redis' ? createRedisLimiter({ max, windowMs }) : createMemoryLimiter({ max, windowMs }));
  return async (req, res, next) => {
    const identity = key ? key(req) : req.user ? `user:${req.user.id}` : `ip:${req.ip || 'anonymous'}`;
    const bucketKey = `sx:${crypto.createHash('sha256').update(`${scope}:${identity}`).digest('hex')}`;
    try {
      const result = await counter.consume(bucketKey);
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(result.remaining));
      res.setHeader('X-RateLimit-Reset', String(Math.ceil((Date.now() + result.retryMs) / 1000)));
      if (!result.allowed) {
        res.setHeader('Retry-After', String(Math.max(1, Math.ceil(result.retryMs / 1000))));
        return fail(res, 429, 42901, '请求过于频繁，请稍后重试');
      }
      next();
    } catch (error) {
      getLogger().error({ event: 'rate_limit_unavailable', backend, error_name: error?.name });
      return fail(res, 503, 50003, '限流服务暂不可用，请稍后重试');
    }
  };
}
async function closeRateLimiter() { if (redisClient?.isOpen) await redisClient.quit(); }
module.exports = { rateLimit, assertRateLimitConfig, createMemoryLimiter, createUpstashLimiter, createRedisLimiter, closeRateLimiter };
