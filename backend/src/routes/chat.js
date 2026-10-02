/** 对话工作台：流式对话 / 会话历史 / 看板 / Skills / MCP —— REQ-CHAT-01~04 */
const express = require('express');
const store = require('../lib/store');
const { ok, errors } = require('../lib/respond');
const ai = require('../lib/ai');
const { auth } = require('./account');

const router = express.Router();

/* ---------- 对话补全（SSE 流式） REQ-CHAT-01/02/03 ---------- */
router.post('/chat/completions', auth, express.json({ limit: '2mb' }), async (req, res) => {
  const { messages, model, stream = true, skills = [] } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) return errors.param(res, 'messages 不能为空');
  if (!stream) {
    return ok(res, { content: ai.generateReply(messages), model, usage: { total_tokens: 512 } });
  }
  // SSE：start → (tool) → delta* → done  —— 遵循 TSD §5.4
  const text = ai.generateReply(messages);
  const usedSkill = skills[0] ? store.skills.find((s) => s.id === skills[0]) : null;
  await ai.streamText(res, text, {
    beforeStream: (send) => {
      if (usedSkill) send('tool', { name: usedSkill.name, args: { prompt: messages.at(-1).content?.slice(0, 20) }, status: 'done' });
    },
  });
  // 写回会话
  const convId = req.body.conversation_id;
  const conv = store.conversations.find((c) => c.id === convId);
  if (conv) {
    conv.messages.push({ id: store.id('msg'), role: 'user', content: messages.at(-1).content, tokens: 64, created_at: store.now() });
    conv.messages.push({ id: store.id('msg'), role: 'assistant', model: model || 'GPT-4o', content: text, tokens: Math.round(text.length * 0.7), created_at: store.now() });
    conv.updated_at = store.now();
  }
});

/* ---------- 会话管理 REQ-CHAT-01 ---------- */
router.get('/conversations', auth, (req, res) => {
  const { keyword = '', page = 1, page_size = 20 } = req.query;
  const list = store.conversations
    .filter((c) => c.title.includes(keyword))
    .map(({ id, title, project_id, scene, model, updated_at, messages }) => ({ id, title, project_id, scene, model, updated_at, message_count: messages.length }))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  ok(res, { items: list, total: list.length, has_more: false, page: +page });
});

router.post('/conversations', auth, (req, res) => {
  const conv = { id: store.id('c'), title: req.body?.title || '新的对话', project_id: req.body?.project_id || null, scene: 'workbench', model: req.body?.model || 'm-gpt4o', updated_at: store.now(), messages: [] };
  store.conversations.unshift(conv);
  ok(res, { id: conv.id, title: conv.title, project_id: conv.project_id, scene: conv.scene, model: conv.model, updated_at: conv.updated_at, message_count: 0 });
});

router.get('/conversations/:id/messages', auth, (req, res) => {
  const conv = store.conversations.find((c) => c.id === req.params.id);
  if (!conv) return errors.notFound(res, '会话不存在');
  ok(res, { items: conv.messages, total: conv.messages.length, has_more: false });
});

router.patch('/conversations/:id', auth, (req, res) => {
  const conv = store.conversations.find((c) => c.id === req.params.id);
  if (!conv) return errors.notFound(res, '会话不存在');
  if (req.body?.title) conv.title = req.body.title;
  ok(res, { id: conv.id, title: conv.title }, '会话已更新');
});

router.delete('/conversations/:id', auth, (req, res) => {
  const idx = store.conversations.findIndex((c) => c.id === req.params.id);
  if (idx < 0) return errors.notFound(res, '会话不存在');
  store.conversations.splice(idx, 1);
  ok(res, {}, '会话已删除');
});

/* ---------- 顶部看板 REQ-CHAT-04 ---------- */
router.get('/dashboard/summary', auth, (req, res) => {
  const project = store.projects.find((p) => p.id === (req.query.project_id || 'p1')) || store.projects[0];
  ok(res, {
    project: { id: project.id, name: project.name, progress: project.progress },
    recent_outputs: store.recentOutputs,
    papers_daily: store.papersDaily.at(-1),
    today_usage: { tokens: 38400, calls: 26, cost: 1.24 },
    todos: [
      { id: 't1', text: '补充 up9 消融实验 3 个随机种子', done: false, due: daysText(2) },
      { id: 't2', text: '回复审稿意见 #rv1（P0 项）', done: false, due: daysText(5) },
      { id: 't3', text: '阅读 Diffusion-based ME Synthesis', done: true, due: daysText(-1) },
    ],
  });
});

/* ---------- Skills REQ-CHAT-03 ---------- */
router.get('/skills', auth, (req, res) => ok(res, { items: store.skills, total: store.skills.length }));
router.post('/skills/:id/invoke', auth, async (req, res) => {
  const skill = store.skills.find((s) => s.id === req.params.id);
  if (!skill) return errors.notFound(res, '技能不存在');
  await ai.streamText(res, `已调用技能「${skill.name}」。\n\n基于你的输入，执行结果如下：\n\n1. 已根据技能模板解析任务参数\n2. 完成检索与计算\n3. 生成结果（见下方）\n\n> 演示环境返回模拟结果，生产环境将调用真实技能执行器。`, {});
});

/* ---------- MCP 推荐 REQ-CHAT-03 ---------- */
router.get('/mcp/recommend', auth, (req, res) => {
  const intent = String(req.query.intent || '');
  const matched = store.mcpServers.filter((m) => !intent || m.category.some(() => intent.includes('文献') || intent.includes('论文') || intent.includes('代码')));
  ok(res, matched.length ? matched : store.mcpServers);
});
router.post('/mcp/:id/connect', auth, (req, res) => {
  const server = store.mcpServers.find((m) => m.id === req.params.id);
  if (!server) return errors.notFound(res, 'MCP 服务不存在');
  server.status = 'connected';
  ok(res, server, `已接入 ${server.name}`);
});

/* ---------- 提示词增强 REQ-CHAT-03 ---------- */
router.post('/prompt/enhance', auth, (req, res) => {
  const raw = String(req.body?.prompt || '');
  if (!raw) return errors.param(res, 'prompt 不能为空');
  ok(res, {
    enhanced: `请以资深科研顾问的角色回答以下问题，要求：\n1. 结论先行，分点展开；\n2. 引用近三年代表性工作并标注出处；\n3. 给出可直接执行的行动建议。\n\n我的问题：${raw}\n\n我的背景：研究方向为微表情识别与情感计算，当前正在迭代基于 AU 先验的 Transformer 模型。`,
    version: 'v2',
  }, '提示词已增强');
});

function daysText(n) {
  const d = new Date(Date.now() + n * 86400000);
  return d.toISOString().slice(0, 10);
}

module.exports = { router };
