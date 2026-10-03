const pino = require('pino');
const { AsyncLocalStorage } = require('node:async_hooks');

const context = new AsyncLocalStorage();
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'sciencex-backend' },
  redact: {
    paths: ['authorization', 'token', 'refresh_token', 'password', 'api_key', 'api_key_encrypted', 'headers.authorization'],
    censor: '[REDACTED]',
  },
});

function getLogger() { return context.getStore()?.logger || logger; }

// 只记录计量元信息，不记录论文、提示词、正文或密钥。
async function observeAI(provider, model, operation) {
  const started = performance.now();
  try {
    const result = await operation();
    getLogger().info({ event: 'ai_call', provider, model: result?.model || model,
      duration_ms: Math.round(performance.now() - started), usage: result?.usage || {}, outcome: 'success' });
    return result;
  } catch (err) {
    getLogger().error({ event: 'ai_call', provider, model,
      duration_ms: Math.round(performance.now() - started), error_name: err.name, outcome: 'failed' });
    throw err;
  }
}

module.exports = { logger, getLogger, context, observeAI };
