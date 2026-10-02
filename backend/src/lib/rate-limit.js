const { fail } = require('./respond');

const buckets = new Map();

function rateLimit({ windowMs = 60000, max = 120, key = (req) => req.ip || 'anonymous' } = {}) {
  return (req, res, next) => {
    const now = Date.now();
    const bucketKey = `${key(req)}:${req.path}`;
    const previous = buckets.get(bucketKey);
    const bucket = previous && now - previous.startedAt < windowMs
      ? previous
      : { startedAt: now, count: 0 };
    bucket.count += 1;
    buckets.set(bucketKey, bucket);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
    if (bucket.count > max) {
      fail(res, 429, 42901, '请求过于频繁，请稍后重试');
      return;
    }
    next();
  };
}

module.exports = { rateLimit };
