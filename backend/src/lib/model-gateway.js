const store = require('./store');
const { decryptSecret } = require('./security');
const { canAccess } = require('./access');
const dns = require('node:dns').promises;
const net = require('node:net');

function isPrivateAddress(address) {
  const version = net.isIP(address);
  if (version === 4) {
    const [a, b] = address.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  if (version === 6) {
    const normalized = address.toLowerCase();
    if (normalized.startsWith('::ffff:')) return isPrivateAddress(normalized.slice(7));
    return normalized === '::' || normalized === '::1' || /^(fc|fd|fe[89ab])/.test(normalized);
  }
  return false;
}

function parseModelBaseUrl(value) {
  let url;
  try { url = new URL(String(value)); } catch { throw new Error('模型 Base URL 格式无效'); }
  const devLoopback = process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(devLoopback && url.protocol === 'http:')) throw new Error('模型 Base URL 必须使用 HTTPS');
  if (url.username || url.password || url.search || url.hash) throw new Error('模型 Base URL 不得包含凭据、查询参数或片段');
  const host = url.hostname.toLowerCase();
  if (!devLoopback && (isPrivateAddress(host) || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal'))) {
    throw new Error('模型 Base URL 不得指向本地或内网地址');
  }
  return url;
}

async function validatePublicModelHost(url) {
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname) && !(process.env.NODE_ENV !== 'production' && ['127.0.0.1', '::1'].includes(hostname))) {
      throw new Error('模型 Base URL 不得指向本地或内网地址');
    }
    return;
  }
  const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error('模型 Base URL 解析到本地或内网地址');
  }
}

function resolveModel(modelId, userId) {
  const custom = store.customModels.filter((model) => canAccess(model, userId));
  const all = [...custom, ...store.builtinModels];
  if (modelId !== undefined && modelId !== null && String(modelId).trim() !== '') {
    return all.find((model) => model.id === modelId || model.model_name === modelId || model.name === modelId) || null;
  }
  return custom.find((model) => model.enabled) || null;
}

function gatewayConfig(modelId, userId) {
  const model = resolveModel(modelId, userId);
  const explicitModel = modelId !== undefined && modelId !== null && String(modelId).trim() !== '';
  // Never reinterpret an unknown or unauthorized explicit model as the global default.
  if (explicitModel && !model) return { model: null, baseUrl: '', apiKey: '', modelName: '' };
  const baseUrl = model?.base_url || process.env.OPENAI_BASE_URL || '';
  const apiKey = model?.builtin
    ? process.env.OPENAI_API_KEY || ''
    : model
      ? (model.api_key_encrypted ? decryptSecret(model.api_key_encrypted) : '')
      : process.env.OPENAI_API_KEY || '';
  const modelName = model?.model_name || process.env.OPENAI_MODEL || model?.name || modelId;
  return { model, baseUrl: baseUrl.replace(/\/$/, ''), apiKey, modelName };
}

function enabled(modelId, userId) {
  const { baseUrl, apiKey, modelName } = gatewayConfig(modelId, userId);
  return Boolean(baseUrl && apiKey && modelName);
}

async function complete(messages, { model, temperature = 0.2, signal, userId } = {}) {
  const config = gatewayConfig(model, userId);
  if (model && !config.model) throw new Error('模型不存在或无权访问');
  if (config.model && !config.model.builtin && !config.apiKey) throw new Error('该自定义模型尚未配置 API Key');
  if (!enabled(model, userId)) return null;
  const baseUrl = parseModelBaseUrl(config.baseUrl);
  await validatePublicModelHost(baseUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.OPENAI_TIMEOUT_MS || 30000));
  const abortFromCaller = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', abortFromCaller, { once: true });
  }
  let response;
  try {
    response = await fetch(new URL('chat/completions', `${baseUrl.toString().replace(/\/$/, '')}/`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({ model: config.modelName, messages, temperature, stream: false }),
      signal: controller.signal,
      redirect: 'error',
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

module.exports = { complete, enabled, gatewayConfig, resolveModel, isPrivateAddress, parseModelBaseUrl, validatePublicModelHost };
