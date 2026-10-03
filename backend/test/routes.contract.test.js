/** B6：核心路由契约测试（documents / research / publish / openapi / 限流键 / zod 校验失败码） */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const testDataDir = path.join(os.tmpdir(), `sciencex-contract-test-${process.pid}`);
process.env.SCIENCEX_DATA_DIR = testDataDir;
const app = require('../src/server');
const store = require('../src/lib/store');
const { rateLimit, createMemoryLimiter } = require('../src/lib/rate-limit');
const { createSignedToken } = require('../src/lib/security');

let server;
let baseUrl;
let token;

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
  const login = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@sciencex.cn', password: '123456' }),
  });
  const body = await login.json();
  assert.equal(body.code, 0);
  token = body.data.token;
});

test.after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await store.flush().catch(() => {}); // 等响应尾部的 persist 队列落盘后再清理，避免 teardown 误报
  fs.rmSync(testDataDir, { recursive: true, force: true });
});

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) },
  });
  return { response, body: await response.json() };
}

/* ---------- B2：zod 统一校验 ---------- */
test('登录缺少字段返回 40011 参数校验失败并携带字段明细', async () => {
  const { response, body } = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'not-an-email' }) });
  assert.equal(response.status, 400);
  assert.equal(body.code, 40011);
  assert.ok(Array.isArray(body.data.details) && body.data.details.some((d) => d.field.includes('email')));
});

test('未声明字段被契约白名单剔除（防批量赋值）', async () => {
  const { body } = await request('/projects', { method: 'POST', body: JSON.stringify({ name: `契约测试项目-${Date.now()}`, role: 'admin', is_deleted: false }) });
  assert.equal(body.code, 0);
  assert.equal(body.data.role, undefined);
  assert.equal(body.data.is_deleted, undefined);
});

/* ---------- documents 路由契约 ---------- */
test('文档上传（Markdown 文本）→ 列表 → 详情 → 删除全链路', async () => {
  const markdown = '# AUFormer Contract Test\n\n## Abstract\n\nAU-aware Transformer for micro-expression recognition.\n\n## Method\n\nWe use AU priors.\n';
  const upload = await request('/documents/upload', { method: 'POST', body: JSON.stringify({ file_name: 'auformer_contract_test.md', content: markdown }) });
  assert.equal(upload.body.code, 0);
  const docId = upload.body.data.doc_id;
  assert.ok(docId);
  assert.ok(['parsing', 'parsed', 'parsed_degraded'].includes(upload.body.data.status), '上传后应处于解析生命周期内');

  const list = await request('/documents');
  assert.ok(list.body.data.items.some((d) => d.id === docId), '列表应包含新上传文档');

  const detail = await request(`/documents/${docId}`);
  assert.equal(detail.body.code, 0);
  assert.equal(detail.body.data.id, docId);
  assert.equal(detail.body.data.source, 'upload', '用户导入内容保留自身来源，不被 demo 打标污染');

  const remove = await request(`/documents/${docId}`, { method: 'DELETE' });
  assert.equal(remove.body.code, 0);
});

test('文档上传拒绝伪装扩展名（内容嗅探，B7）', async () => {
  const fakePdf = Buffer.from('not a real pdf at all').toString('base64');
  const { response, body } = await request('/documents/upload', { method: 'POST', body: JSON.stringify({ file_name: 'evil.pdf', file_content: fakePdf }) });
  assert.equal(response.status, 400);
  assert.equal(body.code, 40011);
});

/* ---------- research 路由契约 ---------- */
test('实验创建 → 运行调度 → 详情契约', async () => {
  const create = await request('/experiments', { method: 'POST', body: JSON.stringify({ name: '契约消融实验', goal: '验证 AU 分支', project_id: 'p1' }) });
  assert.equal(create.body.code, 0);
  const expId = create.body.data.id;
  const run = await request(`/experiments/${expId}/runs`, { method: 'POST', body: JSON.stringify({ name: 'r-contract' }) });
  assert.equal(run.body.code, 0);
  assert.equal(run.body.data.status, 'running');
  const detail = await request(`/experiments/${expId}`);
  assert.equal(detail.body.data.runs.length, 1);
});

test('GPU 节点与期刊返回带 source=demo 打标（B8）', async () => {
  const gpu = await request('/gpu/nodes');
  assert.equal(gpu.body.code, 0);
  assert.ok(gpu.body.data.nodes.length > 0);
  assert.ok(gpu.body.data.nodes.every((n) => n.source === 'demo'), 'GPU 模拟数据必须显式标记 demo 来源');
  const journals = await request('/journals?ccf=A');
  assert.ok(journals.body.data.items.length > 0);
  assert.ok(journals.body.data.items.every((j) => j.source === 'demo'), '期刊静态库必须显式标记 demo 来源');
});

/* ---------- publish 路由契约 ---------- */
test('投稿追踪：关注 → 更新状态 → 取消', async () => {
  const create = await request('/submission-tracks', { method: 'POST', body: JSON.stringify({ journal_id: 'j1' }) });
  assert.equal(create.body.code, 0);
  const trackId = create.body.data.id;
  const patch = await request(`/submission-tracks/${trackId}`, { method: 'PATCH', body: JSON.stringify({ status: 'submitted', note: '契约测试' }) });
  assert.equal(patch.body.data.status, 'submitted');
  const remove = await request(`/submission-tracks/${trackId}`, { method: 'DELETE' });
  assert.equal(remove.body.code, 0);
});

test('不存在的期刊返回 40003 而不是 500', async () => {
  const { response, body } = await request('/submission-tracks', { method: 'POST', body: JSON.stringify({ journal_id: 'j-not-exist' }) });
  assert.equal(response.status, 404);
  assert.equal(body.code, 40003);
});

/* ---------- B9：OpenAPI 文档 ---------- */
test('GET /openapi.json 与运行时契约同源', async () => {
  const { response, body } = await request('/openapi.json', { headers: {} });
  assert.equal(response.status, 200);
  assert.equal(body.openapi, '3.0.3');
  const login = body.paths['/api/v1/auth/login'].post;
  assert.ok(login.requestBody.content['application/json'].schema.properties.email);
  assert.deepEqual(login.security, [], '登录接口无需 Bearer');
  assert.deepEqual(body.paths['/api/v1/documents/{id}'].get.security, [{ bearerAuth: [] }]);
  assert.ok(body.paths['/api/v1/journals'].get.parameters.some((p) => p.name === 'ccf' && p.in === 'query'));
});

/* ---------- B3/B5：限流键与请求日志 ---------- */
function fakeRes() {
  return {
    statusCode: 200, headers: {},
    setHeader(name, value) { this.headers[name] = String(value); },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; },
  };
}

test('不同 scope 的限流桶互相隔离，同一用户不同接口不互踩（B3）', async () => {
  const consumed = [];
  const limiter = { async consume(key) { consumed.push(key); return { allowed: true, remaining: 1, retryMs: 1000 }; } };
  const req = { user: { id: 'u1' }, ip: '1.2.3.4', headers: {} };
  await rateLimit({ scope: 'chat', limiter })(req, fakeRes(), () => {});
  await rateLimit({ scope: 'literature', limiter })(req, fakeRes(), () => {});
  assert.equal(consumed.length, 2);
  assert.notEqual(consumed[0], consumed[1], '同一用户在不同 scope 下必须落不同计数桶');
});

test('限流优先按签名令牌识别 userId，共享 IP 不误伤（B3）', async () => {
  const consumed = [];
  const limiter = { async consume(key) { consumed.push(key); return { allowed: true, remaining: 1, retryMs: 1000 }; } };
  const middleware = rateLimit({ scope: 'chat', limiter });
  const signed = createSignedToken('u-shared', 'access', 60000);
  await middleware({ ip: '10.0.0.1', headers: { authorization: `Bearer ${signed}` } }, fakeRes(), () => {});
  await middleware({ ip: '10.0.0.1', headers: {} }, fakeRes(), () => {});
  assert.match(consumed[0], /^sx:/);
  assert.notEqual(consumed[0], consumed[1], '同 IP 的登录用户与匿名用户应分桶');
});

test('超限返回 429 + 42901 并携带 Retry-After', async () => {
  const limiter = createMemoryLimiter({ max: 2, windowMs: 60000 });
  const middleware = rateLimit({ scope: 'unit', max: 2, limiter });
  const req = { ip: '9.9.9.9', headers: {} };
  for (let i = 0; i < 2; i += 1) { const res = fakeRes(); await middleware(req, res, () => {}); assert.equal(res.statusCode, 200); }
  const res = fakeRes();
  await middleware(req, res, () => { throw new Error('不应放行'); });
  assert.equal(res.statusCode, 429);
  assert.equal(res.body.code, 42901);
  assert.ok(Number(res.headers['Retry-After']) >= 1);
});

test('X-Request-Id 全链路透传（B5 日志关联键）', async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.ok(response.headers.get('x-request-id'), '响应必须携带 X-Request-Id');
});
