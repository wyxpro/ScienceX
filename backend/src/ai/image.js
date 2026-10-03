/**
 * ScienceX 生图网关 —— OpenAI 兼容 /v1/images/generations 客户端
 * 用途：数据图表（DreamPaper 流水线）Implement 阶段的真实位图渲染，替代纯矢量降级。
 * 配置来自 .env（IMAGE_BASE_URL / IMAGE_API_KEY / IMAGE_MODEL），严格禁止硬编码密钥。
 * 未配置密钥时 hasImageGateway() 返回 false，调用方回退矢量渲染。
 */
const { parseModelBaseUrl, validatePublicModelHost } = require('../lib/model-gateway');

function imageConfig() {
  return {
    baseUrl: (process.env.IMAGE_BASE_URL || '').replace(/\/+$/, ''),
    apiKey: process.env.IMAGE_API_KEY || '',
    model: process.env.IMAGE_MODEL || 'gpt-image-2',
    timeoutMs: Number(process.env.IMAGE_TIMEOUT_MS || 180000),
  };
}

function hasImageGateway() {
  const { baseUrl, apiKey } = imageConfig();
  return Boolean(baseUrl && apiKey.trim().length > 10);
}

/* 比例（前端 16:9 / 4:3 / 1:1 / 3:2 / inherit）→ OpenAI images API 支持的 size */
function sizeForRatio(ratio) {
  switch (String(ratio || '').trim()) {
    case '16:9': case '3:2': case 'inherit': return '1536x1024';
    case '4:3': return '1536x1024';
    case '1:1': return '1024x1024';
    default: return '1536x1024';
  }
}

/**
 * 生成一张图片。返回 { url, b64, model, size }；url 为上游 CDN 直链（可直接给前端展示），
 * b64 为返回的 base64 位图（url 缺失时由调用方转 data URL 兜底）。
 */
async function generateImage(prompt, { size, model } = {}) {
  const cfg = imageConfig();
  if (!hasImageGateway()) throw new Error('未配置生图网关（IMAGE_API_KEY）');
  const useModel = String(model || '').trim() || cfg.model;
  const base = parseModelBaseUrl(cfg.baseUrl);
  await validatePublicModelHost(base);
  const endpoint = `${base.toString().replace(/\/$/, '')}/images/generations`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: useModel, prompt: String(prompt || '').slice(0, 4000), size: size || '1536x1024', n: 1 }),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = data?.error?.message || `HTTP ${response.status}`;
      throw new Error(`生图网关返回错误：${detail}`);
    }
    const item = data?.data?.[0];
    if (!item || (!item.url && !item.b64_json)) throw new Error('生图网关未返回图片数据');
    return { url: item.url || '', b64: item.b64_json || '', model: data.model || useModel, size: size || '1536x1024' };
  } catch (error) {
    if (error.name === 'AbortError') throw new Error(`生图请求超时（${Math.round(cfg.timeoutMs / 1000)}s），请稍后重试或降低分辨率`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { imageConfig, hasImageGateway, generateImage, sizeForRatio };
