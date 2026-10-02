const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/server');

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
