const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const testDataDir = path.join(os.tmpdir(), `sciencex-api-test-${process.pid}`);
process.env.SCIENCEX_DATA_DIR = testDataDir;
const app = require('../src/server');
const gateway = require('../src/lib/model-gateway');
const store = require('../src/lib/store');

let server;
let baseUrl;
let token;
let refreshToken;

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
});

test.after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  fs.rmSync(testDataDir, { recursive: true, force: true });
});

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  return { response, body: await response.json() };
}

async function ensureToken() {
  if (token) return token;
  const login = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'demo@sciencex.cn', password: '123456' }) });
  assert.equal(login.body.code, 0);
  token = login.body.data.token;
  refreshToken = login.body.data.refresh_token;
  return token;
}

test('健康检查返回统一结构', { concurrency: false }, async () => {
  const { response, body } = await request('/health');
  assert.equal(response.status, 200);
  assert.equal(body.code, 0);
  assert.equal(body.data.service, 'sciencex-backend');
  assert.equal(body.request_id, response.headers.get('x-request-id'));
});

test('登录、资料白名单和刷新令牌', { concurrency: false }, async () => {
  const login = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'demo@sciencex.cn', password: '123456' }) });
  assert.equal(login.body.code, 0);
  token = login.body.data.token;
  refreshToken = login.body.data.refresh_token;
  const profile = await request('/user/profile', { headers: { Authorization: `Bearer ${token}` } });
  const userId = profile.body.data.id;
  const update = await request('/user/profile', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: '测试昵称', id: 'attacker', plan: 'team' }),
  });
  assert.equal(update.body.code, 0);
  assert.equal(update.body.data.id, userId);
  assert.notEqual(update.body.data.plan, 'team');
  const refreshed = await request('/auth/refresh', { method: 'POST', body: JSON.stringify({ refresh_token: refreshToken }) });
  assert.equal(refreshed.body.code, 0);
  assert.ok(refreshed.body.data.token);
  token = refreshed.body.data.token;
  refreshToken = refreshed.body.data.refresh_token;
});

test('MCP 推荐不会因为字符串 category 崩溃', { concurrency: false }, async () => {
  const { response, body } = await request('/mcp/recommend?intent=文献', { headers: { Authorization: `Bearer ${await ensureToken()}` } });
  assert.equal(response.status, 200);
  assert.equal(body.code, 0);
  assert.ok(Array.isArray(body.data));
});

test('未授权请求被拒绝', { concurrency: false }, async () => {
  const { response, body } = await request('/conversations');
  assert.equal(response.status, 401);
  assert.equal(body.code, 40101);
});

test('新用户只能看到自己的资源', { concurrency: false }, async () => {
  const email = `isolation-${Date.now()}@example.com`;
  const registered = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'a-strong-password', name: '隔离测试用户' }),
  });
  assert.equal(registered.body.code, 0);
  const userToken = registered.body.data.token;
  const headers = { Authorization: `Bearer ${userToken}` };

  const [projects, conversations, documents, reports, teams, models, orders, advice] = await Promise.all([
    request('/projects', { headers }),
    request('/conversations', { headers }),
    request('/documents', { headers }),
    request('/review/reports', { headers }),
    request('/teams', { headers }),
    request('/models', { headers }),
    request('/billing/orders', { headers }),
    request('/advice', { headers }),
  ]);

  assert.deepEqual(projects.body.data.items, []);
  assert.deepEqual(conversations.body.data.items, []);
  assert.deepEqual(documents.body.data.items, []);
  assert.deepEqual(reports.body.data.items, []);
  assert.deepEqual(teams.body.data.items, []);
  assert.deepEqual(models.body.data.custom, []);
  assert.deepEqual(orders.body.data, []);
  assert.deepEqual(advice.body.data.items, []);

  const createdProject = await request('/projects', {
    method: 'POST',
    headers,
    body: JSON.stringify({ name: '隔离用户项目' }),
  });
  assert.equal(createdProject.body.code, 0);
  const dashboard = await request(`/dashboard/summary?project_id=${createdProject.body.data.id}`, { headers });
  assert.equal(dashboard.body.code, 0);
  assert.deepEqual(dashboard.body.data.recent_outputs, []);
  assert.deepEqual(dashboard.body.data.papers_daily.items, []);
  assert.deepEqual(dashboard.body.data.todos, []);
  assert.deepEqual(dashboard.body.data.today_usage, { tokens: 0, calls: 0, cost: 0 });
});

test('SSE 查询参数 token 不能用于写请求', { concurrency: false }, async () => {
  const response = await fetch(`${baseUrl}/auth/logout?token=${encodeURIComponent(await ensureToken())}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const body = await response.json();
  assert.equal(response.status, 401);
  assert.equal(body.code, 40101);
});

test('模型网关对无权模型显式失败关闭', { concurrency: false }, () => {
  const config = gateway.gatewayConfig('m-custom-1', 'unrelated-user');
  assert.equal(config.baseUrl, '');
  assert.equal(config.apiKey, '');
  assert.equal(gateway.enabled('m-custom-1', 'unrelated-user'), false);
});

test('模型网关允许公共 HTTPS 域名并拒绝内网地址', { concurrency: false }, () => {
  assert.equal(gateway.parseModelBaseUrl('https://api.example.com/v1').hostname, 'api.example.com');
  assert.throws(() => gateway.parseModelBaseUrl('https://10.0.0.1/v1'), /本地或内网/);
  assert.throws(() => gateway.parseModelBaseUrl('http://api.example.com/v1'), /HTTPS/);
});

test('模型网关总超时覆盖响应体读取', { concurrency: false }, async () => {
  const previous = {
    baseUrl: process.env.OPENAI_BASE_URL,
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL,
    timeout: process.env.OPENAI_TIMEOUT_MS,
    fetch: global.fetch,
  };
  process.env.OPENAI_BASE_URL = 'https://1.1.1.1/v1';
  process.env.OPENAI_API_KEY = 'test-key';
  process.env.OPENAI_MODEL = 'test-model';
  process.env.OPENAI_TIMEOUT_MS = '20';
  global.fetch = async (_url, { signal }) => ({
    ok: true,
    json: () => new Promise((resolve, reject) => {
      const timeout = setTimeout(() => resolve({ choices: [{ message: { content: 'late' } }] }), 100);
      signal.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(new DOMException('The operation was aborted', 'AbortError'));
      }, { once: true });
    }),
  });
  try {
    await assert.rejects(gateway.complete([{ role: 'user', content: 'test' }]), { name: 'AbortError' });
  } finally {
    global.fetch = previous.fetch;
    for (const [key, value] of [
      ['OPENAI_BASE_URL', previous.baseUrl],
      ['OPENAI_API_KEY', previous.apiKey],
      ['OPENAI_MODEL', previous.model],
      ['OPENAI_TIMEOUT_MS', previous.timeout],
    ]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test('未知显式模型返回受控错误而不是进程异常', { concurrency: false }, async () => {
  const { response, body } = await request('/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${await ensureToken()}` },
    body: JSON.stringify({ messages: [{ role: 'user', content: '测试' }], model: 'missing-model', stream: false }),
  });
  assert.equal(response.status, 404);
  assert.equal(body.code, 40003);
});

test('异步导出任务通过 SSE 推送进度并正常完成', { concurrency: false, timeout: 15000 }, async () => {
  const created = await request('/account/export', {
    method: 'POST',
    headers: { Authorization: `Bearer ${await ensureToken()}` },
    body: JSON.stringify({}),
  });
  assert.equal(created.body.code, 0);
  const taskId = created.body.data.task_id;
  const stream = await fetch(`${baseUrl}/tasks/${taskId}/stream`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
  });
  assert.equal(stream.status, 200);
  const payload = await stream.text();
  assert.match(payload, /id: \d+\nevent: progress/);
  assert.match(payload, /event: done/);
  assert.match(payload, new RegExp(`\"download_url\":\"/api/v1/static/exports/${taskId}\.zip\"`));
});

test('客户端关闭任务 SSE 后移除任务监听器', { concurrency: false, timeout: 10000 }, async () => {
  const created = await request('/account/export', {
    method: 'POST',
    headers: { Authorization: `Bearer ${await ensureToken()}` },
    body: JSON.stringify({}),
  });
  const taskId = created.body.data.task_id;
  const stream = await fetch(`${baseUrl}/tasks/${taskId}/stream`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
  });
  assert.equal(stream.status, 200);
  const reader = stream.body.getReader();
  await reader.read();
  assert.equal(store.tasks.get(taskId).listeners.length, 1);
  await reader.cancel();
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(store.tasks.get(taskId).listeners.length, 0);
});
