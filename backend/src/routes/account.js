/** 认证 / 用户 / 模型管理 / 计费 / 安全 —— REQ-USER-01~05, REQ-CHAT-02 */
const express = require('express');
const store = require('../lib/store');
const { ok, errors } = require('../lib/respond');
const { ACCESS_TTL_MS, REFRESH_TTL_MS, createSignedToken, verifySignedToken, hashPassword, verifyPassword, parseBearer, encryptSecret } = require('../lib/security');
const gateway = require('../lib/model-gateway');
const ai = require('../lib/ai');
const { canAccess } = require('../lib/access');

const router = express.Router();

/* ---------- 会话签发：无状态签名令牌（Serverless 多实例可验签）+ 内存会话镜像（单实例下支持即时吊销） ---------- */
function issueSession(user) {
  const token = createSignedToken(user.id, 'access', ACCESS_TTL_MS);
  const refreshToken = createSignedToken(user.id, 'refresh', REFRESH_TTL_MS);
  store.sessions.set(token, { user_id: user.id, refresh_token: refreshToken, expires_at: Date.now() + ACCESS_TTL_MS, refresh_expires_at: Date.now() + REFRESH_TTL_MS });
  return { token, refreshToken };
}

/* ---------- 鉴权中间件 ----------
   先查本实例内存会话（命中即可支持登出即时吊销）；
   未命中时回退为无状态签名校验，保证 Vercel 多实例/冷启动后令牌仍然有效。 */
function auth(req, res, next) {
  // EventSource cannot set Authorization, so query tokens are accepted only for GET streams.
  const token = parseBearer(req) || (req.method === 'GET' && req.path.endsWith('/stream') ? String(req.query.token || '') : '');
  if (!token) return errors.unauthorized(res);

  const session = store.sessions.get(token);
  if (session) {
    if (session.expires_at <= Date.now()) {
      store.sessions.delete(token);
    } else {
      const sessionUser = store.users.find((u) => u.id === session.user_id);
      if (sessionUser) {
        req.user = sessionUser;
        req.authToken = token;
        return next();
      }
    }
  }

  const payload = verifySignedToken(token, 'access');
  const user = payload && store.users.find((u) => u.id === payload.uid);
  if (!user) return errors.unauthorized(res);
  req.user = user;
  req.authToken = token;
  next();
}

/* ---------- 认证 REQ-USER-05 ---------- */
router.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  // 演示账号在所有环境可用（现场演示/评审要求）；如需关闭，删除 store 中的演示用户即可。
  const user = store.users.find((u) => u.email === email && verifyPassword(password, u.password));
  if (!user) return errors.param(res, '邮箱或密码错误（演示账号 demo@sciencex.cn / 123456）');
  const { token, refreshToken } = issueSession(user);
  const { password: _p, ...profile } = user;
  ok(res, { token, refresh_token: refreshToken, user: profile });
});

router.post('/auth/register', (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password || !name) return errors.param(res, '邮箱、密码、昵称为必填项');
  if (store.users.some((u) => u.email === email)) return errors.param(res, '该邮箱已注册');
  const user = { id: store.id('u'), email, password: hashPassword(password), name, title: '研究者', avatar: '', research_tags: [], lang: 'zh', plan: 'free', created_at: store.now() };
  store.users.push(user);
  const { token, refreshToken } = issueSession(user);
  const { password: _p, ...profile } = user;
  ok(res, { token, refresh_token: refreshToken, user: profile }, '注册成功');
});

router.post('/auth/refresh', (req, res) => {
  const { refresh_token } = req.body || {};
  // 1) 无状态刷新令牌：签名与有效期即可换新令牌对，不依赖实例内存
  const payload = verifySignedToken(refresh_token, 'refresh');
  if (payload) {
    const user = store.users.find((u) => u.id === payload.uid);
    if (user) {
      const { token, refreshToken } = issueSession(user);
      return ok(res, { token, refresh_token: refreshToken });
    }
  }
  // 2) 兼容旧版内存会话刷新令牌（升级窗口期）
  const old = [...store.sessions.entries()].find(([, session]) => session.refresh_token === refresh_token);
  if (!old || old[1].refresh_expires_at <= Date.now()) return errors.unauthorized(res, 'Refresh Token 已失效');
  const user = store.users.find((u) => u.id === old[1].user_id);
  if (!user) return errors.unauthorized(res, 'Refresh Token 已失效');
  store.sessions.delete(old[0]);
  const { token, refreshToken } = issueSession(user);
  ok(res, { token, refresh_token: refreshToken });
});

router.post('/auth/logout', auth, (req, res) => {
  store.sessions.delete(req.authToken || parseBearer(req));
  ok(res, {}, '已退出登录');
});

/* ---------- 用户资料 REQ-USER-01 ---------- */
router.get('/user/profile', auth, (req, res) => {
  const { password, ...profile } = req.user;
  ok(res, profile);
});

router.put('/user/profile', auth, (req, res) => {
  const allowed = ['name', 'title', 'avatar', 'research_tags', 'lang'];
  for (const field of allowed) {
    if (req.body?.[field] !== undefined) req.user[field] = req.body[field];
  }
  const { password, ...profile } = req.user;
  ok(res, profile, '资料已更新');
});

/* ---------- 模型管理 REQ-USER-02 / REQ-CHAT-02 ---------- */
router.get('/models', auth, (req, res) => {
  const custom = store.customModels
    .filter((model) => canAccess(model, req.user.id))
    .map(({ api_key_encrypted: _secret, ...model }) => model);
  ok(res, { builtin: store.builtinModels, custom });
});

router.post('/models', auth, (req, res) => {
  const { name, base_url, model_name, api_key, priority } = req.body || {};
  if (!base_url || !model_name) return errors.param(res, 'BaseURL 与模型名为必填项');
  try { gateway.parseModelBaseUrl(base_url); } catch (error) { return errors.param(res, error.message); }
  const model = {
    id: store.id('m'), owner_id: req.user.id, name: name || model_name, provider: 'custom', base_url, model_name,
    api_key_masked: `sk-****-****-${String(api_key || '').slice(-4)}`,
    api_key_encrypted: encryptSecret(api_key),
    enabled: true, priority: priority || 1, builtin: false, status: 'connected', created_at: store.now(),
  };
  store.customModels.push(model);
  const { api_key_encrypted: _secret, ...publicModel } = model;
  ok(res, publicModel, '自定义模型已添加');
});

router.delete('/models/:id', auth, (req, res) => {
  const idx = store.customModels.findIndex((m) => m.id === req.params.id && canAccess(m, req.user.id));
  if (idx < 0) return errors.notFound(res, '模型不存在');
  store.customModels.splice(idx, 1);
  ok(res, {}, '模型已删除');
});

router.post('/models/:id/test', auth, async (req, res) => {
  const m = store.customModels.find((x) => x.id === req.params.id && canAccess(x, req.user.id));
  if (!m) return errors.notFound(res, '模型不存在');
  const started = Date.now();
  if (!gateway.enabled(m.id, req.user.id)) {
    return ok(res, { success: true, mode: 'demo-fallback', latency_ms: Date.now() - started, sample: '模型已保存；配置 OPENAI_API_KEY 或模型密钥后将启用真实调用。' });
  }
  try {
    const result = await gateway.complete([{ role: 'user', content: '请只回复：连接正常' }], { model: m.id, userId: req.user.id });
    ok(res, { success: true, mode: 'live', latency_ms: Date.now() - started, sample: result.text.slice(0, 80) });
  } catch (error) {
    errors.modelTimeout(res, `模型连接失败：${error.message}`);
  }
});

/* ---------- 用量统计 REQ-USER-03 ---------- */
router.get('/usage', auth, (req, res) => {
  const { range = 30 } = req.query;
  const days = Number(range) || 30;
  const cutoff = new Date(Date.now() - Math.max(1, days) * 86400000).toISOString().slice(0, 10);
  const records = store.usageRecords.filter((record) => canAccess(record, req.user.id) && record.date >= cutoff);
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
router.get('/billing/subscription', auth, (req, res) => {
  if (req.user.id === 'u1') return ok(res, store.subscription);
  const plan = store.plans.find((item) => item.id === req.user.plan) || store.plans[0];
  return ok(res, {
    plan: plan.id, plan_name: plan.name, price: plan.price, period: plan.period,
    expire_at: null, auto_renew: false, quota: { chat: 50, literature: 20, chart: 0, kb: 1 },
    used: { chat: 0, literature: 0, chart: 0, kb: 0 },
  });
});
router.get('/billing/orders', auth, (req, res) => ok(res, store.orders.filter((order) => canAccess(order, req.user.id))));

router.post('/orders', auth, (req, res) => {
  const { plan_id } = req.body || {};
  const plan = store.plans.find((p) => p.id === plan_id);
  if (!plan) return errors.notFound(res, '套餐不存在');
  const order = { id: store.id('o'), owner_id: req.user.id, order_no: `SX${Date.now()}`, plan: plan.name, amount: plan.price, pay_status: 'pending', period: plan.period, created_at: store.now() };
  store.orders.unshift(order);
  ok(res, { order, pay_params: { channel: 'demo', qr_url: 'https://pay.sciencex.cn/demo' } }, '订单已创建（演示环境模拟支付）');
});

router.post('/pay/callback', auth, (req, res) => {
  const { order_no } = req.body || {};
  const order = store.orders.find((o) => o.order_no === order_no && canAccess(o, req.user.id));
  if (order && order.pay_status === 'pending') order.pay_status = 'paid';
  ok(res, { ack: true }, '支付回调已处理（幂等）');
});

/* ---------- 安全与数据 REQ-USER-05 ---------- */
router.get('/account/security', auth, (req, res) => {
  ok(res, {
    two_factor: { enabled: false, method: 'totp' },
    password_updated_at: store.daysAgo(120),
    active_sessions: [{ device: 'Chrome · Windows', ip: '10.24.6.18', last_active: store.now() }],
    audit_logs: store.auditLogs.filter((entry) => canAccess(entry, req.user.id)),
  });
});

router.post('/account/2fa', auth, (req, res) => {
  ok(res, { enabled: !!req.body?.enabled }, req.body?.enabled ? '两步验证已开启' : '两步验证已关闭');
});

router.post('/account/export', auth, (req, res) => {
  const task = ai.createTask('export', ['收集个人资料', '打包对话与文档', '生成下载文件'], (currentTask) => ({
    download_url: `/api/v1/static/exports/${currentTask.id}.zip`,
  }), req.user.id);
  ok(res, { task_id: task.id }, '导出任务已创建，完成后可下载');
});

router.delete('/account', auth, (req, res) => {
  if (req.body?.confirm !== 'DELETE') return errors.param(res, '请传入 confirm=DELETE 二次确认');
  ok(res, {}, '注销申请已提交，7 天冷静期内可撤销');
});

module.exports = { router, auth };
