const store = require('./store');
const { decryptSecret } = require('./security');
const { canAccess } = require('./access');

function resolveModel(modelId, userId) {
  const custom = store.customModels.filter((model) => canAccess(model, userId));
  const all = [...custom, ...store.builtinModels];
  return all.find((model) => model.id === modelId || model.model_name === modelId || model.name === modelId) || custom.find((model) => model.enabled) || null;
}

function gatewayConfig(modelId, userId) {
  const model = resolveModel(modelId, userId);
  const baseUrl = model?.base_url || process.env.OPENAI_BASE_URL || '';
  const apiKey = (model?.api_key_encrypted ? decryptSecret(model.api_key_encrypted) : '') || process.env.OPENAI_API_KEY || '';
  const modelName = model?.model_name || process.env.OPENAI_MODEL || model?.name || modelId;
  return { model, baseUrl: baseUrl.replace(/\/$/, ''), apiKey, modelName };
}

function enabled(modelId, userId) {
  const { baseUrl, apiKey, modelName } = gatewayConfig(modelId, userId);
  return Boolean(baseUrl && apiKey && modelName);
}

async function complete(messages, { model, temperature = 0.2, signal, userId } = {}) {
  const config = gatewayConfig(model, userId);
  if (!enabled(model, userId)) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.OPENAI_TIMEOUT_MS || 30000));
  const abortFromCaller = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', abortFromCaller, { once: true });
  }
  let response;
  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({ model: config.modelName, messages, temperature, stream: false }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
    if (signal) signal.removeEventListener('abort', abortFromCaller);
  }
  if (!response.ok) throw new Error(`模型网关响应 ${response.status}`);
  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('模型网关返回内容为空');
  return { text: content, model: config.modelName, usage: payload.usage || {} };
}

module.exports = { complete, enabled, gatewayConfig };
