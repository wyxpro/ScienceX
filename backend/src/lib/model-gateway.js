const store = require('./store');
const { decryptSecret } = require('./security');

function resolveModel(modelId) {
  const all = [...store.customModels, ...store.builtinModels];
  return all.find((model) => model.id === modelId || model.model_name === modelId || model.name === modelId) || store.customModels.find((model) => model.enabled) || null;
}

function gatewayConfig(modelId) {
  const model = resolveModel(modelId);
  const baseUrl = model?.base_url || process.env.OPENAI_BASE_URL || '';
  const apiKey = (model?.api_key_encrypted ? decryptSecret(model.api_key_encrypted) : '') || process.env.OPENAI_API_KEY || '';
  const modelName = model?.model_name || process.env.OPENAI_MODEL || model?.name || modelId;
  return { model, baseUrl: baseUrl.replace(/\/$/, ''), apiKey, modelName };
}

function enabled(modelId) {
  const { baseUrl, apiKey, modelName } = gatewayConfig(modelId);
  return Boolean(baseUrl && apiKey && modelName);
}

async function complete(messages, { model, temperature = 0.2, signal } = {}) {
  const config = gatewayConfig(model);
  if (!enabled(model)) return null;
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({ model: config.modelName, messages, temperature, stream: false }),
    signal,
  });
  if (!response.ok) throw new Error(`模型网关响应 ${response.status}`);
  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('模型网关返回内容为空');
  return { text: content, model: config.modelName, usage: payload.usage || {} };
}

module.exports = { complete, enabled, gatewayConfig };
