require('../ai/config');
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

function trustedLocal(url) {
  return (process.env.OLLAMA_ALLOWED_BASE_URLS || '').split(',').some((value) => value.trim() && value.trim().replace(/\/$/, '') === url.toString().replace(/\/$/, ''));
}
function parseModelBaseUrl(value) {
  let url;
  try { url = new URL(String(value)); } catch { throw new Error('模型 Base URL 格式无效'); }
  const devLoopback = trustedLocal(url) || (process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
  if (url.protocol !== 'https:' && !(devLoopback && url.protocol === 'http:')) throw new Error('模型 Base URL 必须使用 HTTPS');
  if (url.username || url.password || url.search || url.hash) throw new Error('模型 Base URL 不得包含凭据、查询参数或片段');
  const host = url.hostname.toLowerCase();
  if (!devLoopback && (isPrivateAddress(host) || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal'))) {
    throw new Error('模型 Base URL 不得指向本地或内网地址');
  }
  return url;
}

async function validatePublicModelHost(url) {
  if (trustedLocal(url)) return;
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(hostname)) {
    if (isPrivateAddress(hostname) && !(process.env.NODE_ENV !== 'production' && ['127.0.0.1', '::1'].includes(hostname))) {
      throw new Error('模型 Base URL 不得指向本地或内网地址');
    }
    return;
  }
  if (process.env.NODE_ENV !== 'production' && hostname === 'localhost') return;
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
  return custom.find((model) => model.enabled && (model.api_key_encrypted || model.provider === 'ollama')) || null;
}

function gatewayConfig(modelId, userId) {
  const model = resolveModel(modelId, userId);
  const explicitModel = modelId !== undefined && modelId !== null && String(modelId).trim() !== '';
  // Never reinterpret an unknown or unauthorized explicit model as the global default.
  if (explicitModel && !model) return { model: null, baseUrl: '', apiKey: '', modelName: '' };

  // 内置模型可自带 base_url + api_key_env（如 OpenAI Next 统一网关），否则回退全局 DeepSeek/OpenAI 配置
  const isDeepSeek = model?.provider === 'deepseek' || model?.id === 'm-deepseek-flash' || model?.model_name === 'DeepSeek-Flash';
  const defaultBaseUrl = isDeepSeek
    ? (process.env.DEEPSEEK_BASE_URL || process.env.OPENAI_BASE_URL || 'https://www.sophnet.com/api/open-apis/v1')
    : (process.env.OPENAI_BASE_URL || process.env.DEEPSEEK_BASE_URL || 'https://www.sophnet.com/api/open-apis/v1');

  const defaultApiKey = isDeepSeek
    ? (process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || '')
    : (process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY || '');

  const baseUrl = model?.base_url || defaultBaseUrl;
  const apiKey = model?.builtin
    ? (model.api_key_env ? (process.env[model.api_key_env] || '') : defaultApiKey)
    : model
      ? (model.api_key_encrypted ? decryptSecret(model.api_key_encrypted) : '')
      : defaultApiKey;
  const modelName = model?.model_name || (isDeepSeek ? (process.env.DEEPSEEK_MODEL || 'DeepSeek-Flash') : (process.env.OPENAI_MODEL || 'DeepSeek-Flash'));
  return { model, baseUrl: baseUrl.replace(/\/$/, ''), apiKey, modelName };
}

function enabled(modelId, userId) {
  const { baseUrl, apiKey, modelName, model } = gatewayConfig(modelId, userId);
  return Boolean(baseUrl && (apiKey || model?.provider === 'ollama') && modelName);
}

async function createClient(model, userId) {
  const config = gatewayConfig(model, userId);
  if (model && !config.model) throw new Error('模型不存在或无权访问');
  if (!enabled(model, userId)) return null;
  const baseUrl = parseModelBaseUrl(config.baseUrl);
  await validatePublicModelHost(baseUrl);
  const { DeepSeekClient } = require('../ai/client');
  return new DeepSeekClient({
    baseUrl: config.baseUrl, apiKey: config.apiKey, model: config.modelName,
    provider: config.model?.provider || 'openai',
    timeoutMs: Number(config.model?.timeout_ms || process.env.OPENAI_TIMEOUT_MS || 30000),
    hasKey: () => !!config.apiKey || config.model?.provider === 'ollama',
  });
}
async function complete(messages, options = {}) {
  const client = await createClient(options.model, options.userId);
  return client ? client.chatCompletion(messages, { ...options, model: client.config.model }) : null;
}

module.exports = { createClient, complete, enabled, gatewayConfig, resolveModel, isPrivateAddress, parseModelBaseUrl, validatePublicModelHost };
