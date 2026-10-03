const { AsyncLocalStorage } = require('node:async_hooks');
const context = new AsyncLocalStorage();
async function recordUsage(result, options = {}) {
  const owner = options.userId || context.getStore()?.userId;
  if (!owner) return;
  const store = require('../lib/store');
  const usage = result.usage || {};
  const tokens = (value) => Number.isFinite(Number(value)) && Number(value) >= 0 ? Math.floor(Number(value)) : 0;
  let prices = {};
  try { prices = JSON.parse(process.env.AI_PRICES_JSON || '{}'); } catch { /* Unknown price stays unknown. */ }
  const price = prices[result.model];
  const measured = Number.isFinite(usage.prompt_tokens) && Number.isFinite(usage.completion_tokens) && !usage.estimated;
  const priced = measured && price && [price.input, price.output].every((v) => Number.isFinite(v) && v >= 0) && (!price.currency || price.currency === 'CNY');
  const prompt_tokens = tokens(usage.prompt_tokens), completion_tokens = tokens(usage.completion_tokens);
  store.usageRecords.unshift({
    id: store.id('usage'), owner_id: owner, date: store.now().slice(0, 10), created_at: store.now(),
    scene: options.scene || context.getStore()?.scene || 'chat', model: result.model,
    prompt_tokens, completion_tokens, calls: 1, source: 'live', usage_status: measured ? 'reported' : 'unreported',
    cost: priced ? (prompt_tokens * price.input + completion_tokens * price.output) / 1e6 : null,
    currency: 'CNY', cost_status: priced ? 'estimated' : 'unknown',
  });
  await store.persist();
}
module.exports = { context, recordUsage };
