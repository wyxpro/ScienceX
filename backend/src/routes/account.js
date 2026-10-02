/** 认证 / 用户 / 模型管理 / 计费 / 安全 —— REQ-USER-01~05, REQ-CHAT-02 */
const express = require('express');
const store = require('../lib/store');
const { ok, errors } = require('../lib/respond');

const router = express.Router();

/* ---------- 鉴权中间件 ---------- */
function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const session = store.sessions.get(token);
  if (!session) return errors.unauthorized(res);
  req.user = store.users.find((u) => u.id === session.user_id);
  next();
}

/* ---------- 认证 REQ-USER-05 ---------- */
router.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = store.users.find((u) => u.email === email && u.password === password);
  if (!user) return errors.param(res, '邮箱或密码错误（演示账号 demo@sciencex.cn / 123456）');
  const token = `tk_${store.id('s')}`;
  store.sessions.set(token, { user_id: user.id, expires_at: Date.now() + 7 * 86400000 });
  const { password: _p, ...profile } = user;
  ok(res, { token, refresh_token: `rf_${token}`, user: profile });
});

router.post('/auth/register', (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password || !name) return errors.param(res, '邮箱、密码、昵称为必填项');
  if (store.users.some((u) => u.email === email)) return errors.param(res, '该邮箱已注册');
  const user = { id: store.id('u'), email, password, name, title: '研究者', avatar: '', research_tags: [], lang: 'zh', plan: 'free', created_at: store.now() };
  store.users.push(user);
  const token = `tk_${store.id('s')}`;
  store.sessions.set(token, { user_id: user.id, expires_at: Date.now() + 7 * 86400000 });
  const { password: _p, ...profile } = user;
  ok(res, { token, refresh_token: `rf_${token}`, user: profile }, '注册成功');
});

router.post('/auth/refresh', (req, res) => {
  const { refresh_token } = req.body || {};
  const token = String(refresh_token || '').replace('rf_', '');
  const session = store.sessions.get(token);
  if (!session) return errors.unauthorized(res, 'Refresh Token 已失效');
  const newToken = `tk_${store.id('s')}`;
  store.sessions.set(newToken, { user_id: session.user_id, expires_at: Date.now() + 7 * 86400000 });
  ok(res, { token: newToken });
});

router.post('/auth/logout', (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  store.sessions.delete(token);
  ok(res, {}, '已退出登录');
});

/* ---------- 用户资料 REQ-USER-01 ---------- */
router.get('/user/profile', auth, (req, res) => {
  const { password, ...profile } = req.user;
  ok(res, profile);
});

router.put('/user/profile', auth, (req, res) => {
  Object.assign(req.user, req.body || {});
  const { password, ...profile } = req.user;
  ok(res, profile, '资料已更新');
});

/* ---------- 模型管理 REQ-USER-02 / REQ-CHAT-02 ---------- */
router.get('/models', auth, (req, res) => {
  ok(res, { builtin: store.builtinModels, custom: store.customModels });
});

router.post('/models', auth, (req, res) => {
  const { name, base_url, model_name, api_key, priority } = req.body || {};
  if (!base_url || !model_name) return errors.param(res, 'BaseURL 与模型名为必填项');
  const model = {
    id: store.id('m'), name: name || model_name, provider: 'custom', base_url, model_name,
    api_key_masked: `sk-****-****-${String(api_key || '').slice(-4)}`,
    enabled: true, priority: priority || 1, builtin: false, status: 'connected', created_at: store.now(),
  };
  store.customModels.push(model);
  ok(res, model, '自定义模型已添加');
});

router.delete('/models/:id', auth, (req, res) => {
  const idx = store.customModels.findIndex((m) => m.id === req.params.id);
  if (idx < 0) return errors.notFound(res, '模型不存在');
  store.customModels.splice(idx, 1);
  ok(res, {}, '模型已删除');
});

router.post('/models/:id/test', auth, (req, res) => {
  const m = store.customModels.find((x) => x.id === req.params.id);
  if (!m) return errors.notFound(res, '模型不存在');
  ok(res, { success: true, latency_ms: 180 + Math.floor(Math.random() * 300), sample: '连接正常，协议兼容 OpenAI chat/completions。' });
});

/* ---------- 用量统计 REQ-USER-03 ---------- */
router.get('/usage', auth, (req, res) => {
  const { range = 30 } = req.query;
  const days = Number(range) || 30;
  const records = store.usageRecords.slice(-days * 3);
  const byDay = {};
  const byModel = {};
  const byScene = {};
  let totalTokens = 0, totalCost = 0, totalCalls = 0;
  for (const r of records) {
    totalTokens += r.prompt_tokens + r.completion_tokens;
    totalCost += r.cost;
    totalCalls += r.calls;
    byDay[r.date] = (byDay[r.date] || 0) + r.prompt_tokens + r.completion_tokens;
    byModel[r.model] = byModel[r.model] || { tokens: 0, cost: 0, calls: 0 };
    byModel[r.model].tokens += r.prompt_tokens + r.completion_tokens;
    byModel[r.model].cost += r.cost;
    byModel[r.model].calls += r.calls;
    byScene[r.scene] = byScene[r.scene] || { calls: 0 };
    byScene[r.scene].calls += r.calls;
  }
  ok(res, {
    summary: { total_tokens: totalTokens, total_cost: +totalCost.toFixed(2), total_calls: totalCalls, period_days: days },
    by_day: Object.entries(byDay).map(([date, tokens]) => ({ date, tokens })),
    by_model: Object.entries(byModel).map(([model, v]) => ({ model, ...v, cost: +v.cost.toFixed(2) })),
    by_scene: Object.entries(byScene).map(([scene, v]) => ({ scene, ...v })),
  });
});

/* ---------- 订阅与订单 REQ-USER-04 ---------- */
router.get('/billing/plans', auth, (req, res) => ok(res, store.plans));
router.get('/billing/subscription', auth, (req, res) => ok(res, store.subscription));
router.get('/billing/orders', auth, (req, res) => ok(res, store.orders));

router.post('/orders', auth, (req, res) => {
  const { plan_id } = req.body || {};
  const plan = store.plans.find((p) => p.id === plan_id);
  if (!plan) return errors.notFound(res, '套餐不存在');
  const order = { id: store.id('o'), order_no: `SX${Date.now()}`, plan: plan.name, amount: plan.price, pay_status: 'pending', period: plan.period, created_at: store.now() };
  store.orders.unshift(order);
  ok(res, { order, pay_params: { channel: 'demo', qr_url: 'https://pay.sciencex.cn/demo' } }, '订单已创建（演示环境模拟支付）');
});

router.post('/pay/callback', (req, res) => {
  const { order_no } = req.body || {};
  const order = store.orders.find((o) => o.order_no === order_no);
  if (order && order.pay_status === 'pending') order.pay_status = 'paid';
  ok(res, { ack: true }, '支付回调已处理（幂等）');
});

/* ---------- 安全与数据 REQ-USER-05 ---------- */
router.get('/account/security', auth, (req, res) => {
  ok(res, {
    two_factor: { enabled: false, method: 'totp' },
    password_updated_at: store.daysAgo(120),
    active_sessions: [{ device: 'Chrome · Windows', ip: '10.24.6.18', last_active: store.now() }],
    audit_logs: store.auditLogs,
  });
});

router.post('/account/2fa', auth, (req, res) => {
  ok(res, { enabled: !!req.body?.enabled }, req.body?.enabled ? '两步验证已开启' : '两步验证已关闭');
});

router.post('/account/export', auth, (req, res) => {
  const task = { id: store.id('task'), type: 'export', status: 'running', percent: 10, stage: '打包个人数据', created_at: store.now() };
  store.tasks.set(task.id, task);
  setTimeout(() => { task.status = 'done'; task.percent = 100; task.result = { download_url: `/api/v1/static/exports/${task.id}.zip` }; }, 2000);
  ok(res, { task_id: task.id }, '导出任务已创建，完成后可下载');
});

router.delete('/account', auth, (req, res) => {
  if (req.body?.confirm !== 'DELETE') return errors.param(res, '请传入 confirm=DELETE 二次确认');
  ok(res, {}, '注销申请已提交，7 天冷静期内可撤销');
});

module.exports = { router, auth };
