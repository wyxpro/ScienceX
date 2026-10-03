const { setTimeout: delay } = require('node:timers/promises');
const { createHash } = require('node:crypto');
class AIError extends Error {
  constructor(message, code = 'AI_ERROR', { status, retryable = false } = {}) {
    super(message);
    Object.assign(this, { code, status, retryable });
  }
}
function httpError(status) {
  return new AIError(`上游服务返回 HTTP ${status}`, `UPSTREAM_${status}`, { status, retryable: status === 429 || status === 408 || status >= 500 });
}
function isRetryable(error) {
  if (error.name === 'AbortError' || error.sentDelta) return false;
  return error.retryable ?? (error.name === 'TypeError' || error.name === 'TimeoutError' || ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN', 'UND_ERR_SOCKET'].includes(error.code));
}
function errorPayload(error, degraded = false) {
  return { code: error.code || 'AI_UNAVAILABLE', message: error.message || '模型服务暂不可用', retryable: isRetryable(error), degraded };
}
async function withRetry(fn, { retries = Number(process.env.AI_RETRIES ?? 2), baseMs = Number(process.env.AI_RETRY_BASE_MS ?? 300), signal } = {}) {
  const count = Math.max(0, Math.min(5, Number.isFinite(retries) ? retries : 2));
  for (let attempt = 0; ; attempt++) {
    signal?.throwIfAborted();
    try { return await fn(attempt); } catch (error) {
      if (signal?.aborted || attempt >= count || !isRetryable(error)) throw error;
      await delay(Math.min(10000, baseMs * 2 ** attempt) * (0.8 + Math.random() * 0.4), undefined, { signal });
    }
  }
}
const circuits = new Map();
function circuitKey(endpoint, key = '') { return createHash('sha256').update(`${endpoint}:${key}`).digest('hex'); }
async function withCircuit(key, fn, { threshold = Number(process.env.AI_CIRCUIT_FAILURES || 3), cooldownMs = Number(process.env.AI_CIRCUIT_COOLDOWN_MS || 30000) } = {}) {
  let state = circuits.get(key);
  if (!state) {
    if (circuits.size >= 1000) circuits.delete(circuits.keys().next().value);
    state = { failures: 0, until: 0, probing: false };
    circuits.set(key, state);
  }
  if (state.until > Date.now() || state.probing) throw new AIError('模型暂时熔断，请稍后重试', 'CIRCUIT_OPEN', { retryable: true });
  if (state.until) state.probing = true;
  try {
    const result = await fn();
    state.failures = 0; state.until = 0;
    return result;
  } catch (error) {
    if (isRetryable(error) && ++state.failures >= threshold) state.until = Date.now() + cooldownMs;
    throw error;
  } finally { state.probing = false; }
}
async function fetchBody(url, init, consume, timeoutMs = 30000) {
  const controller = new AbortController();
  const abort = () => controller.abort(init.signal?.reason);
  if (init.signal?.aborted) abort();
  else init.signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(() => controller.abort(new AIError('上游请求超时', 'AI_TIMEOUT', { retryable: true })), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, redirect: 'error' });
    if (!response.ok) { await response.body?.cancel(); throw httpError(response.status); }
    return await consume(response);
  } catch (error) {
    if (controller.signal.aborted) {
      const reason = controller.signal.reason;
      if (error.sentDelta) reason.sentDelta = true;
      throw reason;
    }
    throw error;
  } finally { clearTimeout(timeout); init.signal?.removeEventListener('abort', abort); }
}
module.exports = { AIError, httpError, isRetryable, errorPayload, withRetry, withCircuit, circuitKey, fetchBody };
