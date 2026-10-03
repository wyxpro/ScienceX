const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/server');
const aiModule = require('../src/ai');

const hasKey = aiModule.config.hasKey();

let server;
let baseUrl;

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
});

test.after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('AI 模块配置加载状态契约一致', () => {
  assert.equal(typeof hasKey, 'boolean');
  if (!hasKey) return; // CI / 本地未配置 DEEPSEEK_API_KEY 时，仅验证布尔契约，不要求真实密钥
  assert.equal(aiModule.config.model, 'DeepSeek-Flash');
  assert.ok(aiModule.config.baseUrl.includes('sophnet.com'));
});

test('GET /api/v1/ai/status 返回 3.1.1 文本模态能力与就绪状态', async () => {
  const res = await fetch(`${baseUrl}/ai/status`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.code, 0);
  assert.equal(json.data.active, hasKey);
  assert.equal(json.data.model, 'DeepSeek-Flash');
  assert.equal(json.data.modality, '3.1.1 文本模态（Text）');
  assert.ok(Array.isArray(json.data.capabilities));
});

test('DeepSeek V4.1 Flash 实时连通性测试 (POST /api/v1/ai/test)', { skip: !hasKey }, async () => {
  const res = await fetch(`${baseUrl}/ai/test`, { method: 'POST' });
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.code, 0);
  assert.equal(json.data.success, true);
  assert.equal(json.data.model, 'DeepSeek-Flash');
  assert.ok(json.data.latencyMs > 0);
  assert.ok(typeof json.data.sample === 'string');
});

test('3.1.1 文本模态：学术中英翻译能力验证', { skip: !hasKey }, async () => {
  const translated = await aiModule.textModality.translateAcademicText({
    text: 'A novel attention mechanism is proposed to capture long-range dependencies.',
    direction: 'en2zh',
  });
  assert.ok(typeof translated === 'string');
  assert.ok(translated.includes('注意力') || translated.includes('依赖') || translated.includes('机制'));
});

test('3.1.1 文本模态：科研提示词增强能力验证', { skip: !hasKey }, async () => {
  const enhanced = await aiModule.textModality.enhanceScholarlyPrompt({
    rawPrompt: '分析微表情识别中的 AU 先验',
    researchContext: '微表情识别 Transformer 模型',
  });
  assert.ok(typeof enhanced === 'string');
  assert.ok(enhanced.length > 50);
});
