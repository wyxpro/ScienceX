/** 对话工作台：流式对话 / 会话历史 / 看板 / Skills / MCP —— REQ-CHAT-01~04 */
const express = require('express');
const store = require('../lib/store');
const { ok, errors, asyncHandler } = require('../lib/respond');
const ai = require('../lib/ai');
const { auth } = require('./account');
const { canAccess } = require('../lib/access');

const router = express.Router();

const lingxiEngine = require('../lib/agents/lingxiEngine');

/* ---------- 对话补全（SSE 流式） REQ-CHAT-01/02/03 + LingXiAgent 8大模式 ---------- */
router.post('/chat/completions', auth, express.json({ limit: '2mb' }), asyncHandler(async (req, res) => {
  const { messages, model = 'DeepSeek V4.1 Flash', stream = true, skills = [], agent_mode = 'general', project_id = 'p1', conversation_id } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) return errors.param(res, 'messages 不能为空');
  
  if (!stream) {
    const result = await ai.generateResponse(messages, { model, userId: req.user.id });
    return ok(res, { content: result.text, model: result.model || model, usage: result.usage || {} });
  }

  // 调度 LingXiAgent 多智能体引擎 (支持 8 大模式、灵寻规划流、三层记忆与 MCP 工具)
  await lingxiEngine.executeAgentStream(res, {
    messages,
    model,
    agentMode: agent_mode,
    skills,
    userId: req.user.id,
    projectId: project_id,
    convId: conversation_id,
  });

  // 记录会话历史
  const conv = store.conversations.find((c) => c.id === conversation_id && canAccess(c, req.user.id));
  if (conv) {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUser) {
      conv.messages.push({
        id: store.id('msg'),
        role: 'user',
        content: lastUser.content,
        tokens: 64,
        created_at: store.now(),
      });
      conv.messages.push({
        id: store.id('msg'),
        role: 'assistant',
        model,
        agent_mode,
        content: `（已完成 ${agent_mode} 模式智能体推演与处理）`,
        tokens: 280,
        created_at: store.now(),
      });
      conv.updated_at = store.now();
    }
  }
}));

/* ---------- 会话管理 REQ-CHAT-01 ---------- */
router.get('/conversations', auth, (req, res) => {
  const { keyword = '', page = 1, page_size = 20 } = req.query;
  const list = store.conversations
    .filter((c) => c.title.includes(keyword) && canAccess(c, req.user.id))
    .map(({ id, title, project_id, scene, model, updated_at, messages }) => ({ id, title, project_id, scene, model, updated_at, message_count: messages.length }))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  ok(res, { items: list, total: list.length, has_more: false, page: +page });
});

router.post('/conversations', auth, (req, res) => {
  const conv = { id: store.id('c'), owner_id: req.user.id, title: req.body?.title || '新的对话', project_id: req.body?.project_id || null, scene: 'workbench', model: req.body?.model || 'm-deepseek-flash', updated_at: store.now(), messages: [] };
  store.conversations.unshift(conv);
  ok(res, { id: conv.id, title: conv.title, project_id: conv.project_id, scene: conv.scene, model: conv.model, updated_at: conv.updated_at, message_count: 0 });
});

router.get('/conversations/:id/messages', auth, (req, res) => {
  const conv = store.conversations.find((c) => c.id === req.params.id && canAccess(c, req.user.id));
  if (!conv) return errors.notFound(res, '会话不存在');
  ok(res, { items: conv.messages, total: conv.messages.length, has_more: false });
});

router.patch('/conversations/:id', auth, (req, res) => {
  const conv = store.conversations.find((c) => c.id === req.params.id && canAccess(c, req.user.id));
  if (!conv) return errors.notFound(res, '会话不存在');
  if (req.body?.title) conv.title = req.body.title;
  ok(res, { id: conv.id, title: conv.title }, '会话已更新');
});

router.delete('/conversations/:id', auth, (req, res) => {
  const idx = store.conversations.findIndex((c) => c.id === req.params.id && canAccess(c, req.user.id));
  if (idx < 0) return errors.notFound(res, '会话不存在');
  store.conversations.splice(idx, 1);
  ok(res, {}, '会话已删除');
});

/* ---------- 顶部看板 REQ-CHAT-04 ---------- */
router.get('/dashboard/summary', auth, (req, res) => {
  const project = store.projects.find((p) => p.id === (req.query.project_id || 'p1') && canAccess(p, req.user.id)) || store.projects.find((p) => canAccess(p, req.user.id));
  if (!project) return errors.notFound(res, '项目不存在');
  const isDemoUser = req.user.id === 'u1';
  const today = store.now().slice(0, 10);
  const usage = store.usageRecords
    .filter((record) => canAccess(record, req.user.id) && record.date === today)
    .reduce((summary, record) => ({
      tokens: summary.tokens + record.prompt_tokens + record.completion_tokens,
      calls: summary.calls + record.calls,
      cost: summary.cost + record.cost,
    }), { tokens: 0, calls: 0, cost: 0 });
  ok(res, {
    project: { id: project.id, name: project.name, progress: project.progress },
    recent_outputs: isDemoUser ? store.recentOutputs : [],
    papers_daily: isDemoUser ? store.papersDaily.at(-1) : { date: today, items: [] },
    today_usage: { ...usage, cost: +usage.cost.toFixed(2) },
    todos: isDemoUser ? [
      { id: 't1', text: '补充 up9 消融实验 3 个随机种子', done: false, due: daysText(2) },
      { id: 't2', text: '回复审稿意见 #rv1（P0 项）', done: false, due: daysText(5) },
      { id: 't3', text: '阅读 Diffusion-based ME Synthesis', done: true, due: daysText(-1) },
    ] : [],
  });
});

/* ---------- Skills REQ-CHAT-03 ---------- */
router.get('/skills', auth, (req, res) => ok(res, { items: store.skills, total: store.skills.length }));
router.post('/skills/:id/invoke', auth, asyncHandler(async (req, res) => {
  const skill = store.skills.find((s) => s.id === req.params.id);
  if (!skill) return errors.notFound(res, '技能不存在');
  await ai.streamText(res, `已调用技能「${skill.name}」。\n\n基于你的输入，执行结果如下：\n\n1. 已根据技能模板解析任务参数\n2. 完成检索与计算\n3. 生成结果（见下方）\n\n> 演示环境返回模拟结果，生产环境将调用真实技能执行器。`, {});
}));

/* ---------- MCP 推荐 REQ-CHAT-03 ---------- */
router.get('/mcp/recommend', auth, (req, res) => {
  const intent = String(req.query.intent || '');
  const keywords = intent.match(/文献|论文|代码|实验|检索/g) || [];
  const matched = store.mcpServers.filter((m) => !keywords.length || keywords.some((keyword) => m.category.includes(keyword) || m.desc.includes(keyword)));
  ok(res, matched.length ? matched : store.mcpServers);
});
router.post('/mcp/:id/connect', auth, (req, res) => {
  const server = store.mcpServers.find((m) => m.id === req.params.id);
  if (!server) return errors.notFound(res, 'MCP 服务不存在');
  server.status = 'connected';
  ok(res, server, `已接入 ${server.name}`);
});

/* ---------- 提示词增强 REQ-CHAT-03 ---------- */
router.post('/prompt/enhance', auth, asyncHandler(async (req, res) => {
  const raw = String(req.body?.prompt || '');
  if (!raw) return errors.param(res, 'prompt 不能为空');
  try {
    const aiModule = require('../ai');
    if (aiModule.config.hasKey()) {
      const user = store.users.find((u) => u.id === req.user.id);
      const researchCtx = user?.research_tags?.length ? `研究方向: ${user.research_tags.join(', ')}` : '微表情识别与情感计算，AU 先验 Transformer';
      const enhanced = await aiModule.textModality.enhanceScholarlyPrompt({ rawPrompt: raw, researchContext: researchCtx });
      return ok(res, { enhanced, version: 'deepseek-v4.1-flash', mode: 'live' }, '提示词已增强');
    }
  } catch (err) {
    console.warn('[Prompt Enhance] DeepSeek 增强异常，回退模板:', err.message);
  }
  ok(res, {
    enhanced: `请以资深科研顾问的角色回答以下问题，要求：\n1. 结论先行，分点展开；\n2. 引用近三年代表性工作并标注出处；\n3. 给出可直接执行的行动建议。\n\n我的问题：${raw}\n\n我的背景：研究方向为微表情识别与情感计算，当前正在迭代基于 AU 先验的 Transformer 模型。`,
    version: 'v2-fallback',
    mode: 'demo-fallback',
  }, '提示词已增强');
}));

/* ---------- 课题组三层记忆引擎 (Three-Tier Memory) REQ-LINGXI-MEM ---------- */
router.get('/chat/memories', auth, (req, res) => {
  const { project_id = 'p1', conversation_id } = req.query;
  const ctx = lingxiEngine.getMemoryContext(req.user.id, project_id, conversation_id);
  ok(res, {
    facts: ctx.facts,
    rolling_summary: ctx.rollingSummary,
    total: ctx.facts.length,
  });
});

router.post('/chat/memories', auth, (req, res) => {
  const { category = 'research', key, content, tags = [], project_id = 'p1' } = req.body || {};
  if (!key || !content) return errors.param(res, 'key 和 content 不能为空');
  const fact = {
    id: store.id('mem'),
    user_id: req.user.id,
    project_id,
    category,
    key,
    content,
    tags: Array.isArray(tags) ? tags : [tags].filter(Boolean),
    active: true,
    created_at: store.now(),
  };
  store.researchMemories.unshift(fact);
  ok(res, fact, '科研记忆事实已沉淀');
});

router.patch('/chat/memories/:id', auth, (req, res) => {
  const fact = (store.researchMemories || []).find((m) => m.id === req.params.id && (!m.user_id || m.user_id === req.user.id));
  if (!fact) return errors.notFound(res, '记忆事实不存在');
  if (req.body.active !== undefined) fact.active = !!req.body.active;
  if (req.body.content) fact.content = req.body.content;
  if (req.body.key) fact.key = req.body.key;
  ok(res, fact, '记忆事实已更新');
});

router.delete('/chat/memories/:id', auth, (req, res) => {
  const idx = (store.researchMemories || []).findIndex((m) => m.id === req.params.id && (!m.user_id || m.user_id === req.user.id));
  if (idx < 0) return errors.notFound(res, '记忆事实不存在');
  store.researchMemories.splice(idx, 1);
  ok(res, {}, '记忆事实已删除');
});

router.post('/chat/memories/extract', auth, (req, res) => {
  const { conversation_id, project_id = 'p1' } = req.body || {};
  const conv = store.conversations.find((c) => c.id === conversation_id && canAccess(c, req.user.id));
  const messages = conv ? conv.messages : (req.body?.messages || []);
  const result = lingxiEngine.extractMemoriesFromConversation(messages, req.user.id, project_id);
  ok(res, result, `已智能提取并沉淀 ${result.added.length} 条科研事实`);
});

/* ---------- 学术 MCP 与沙箱工具交互 ---------- */
router.get('/chat/arxiv/search', auth, asyncHandler(async (req, res) => {
  const q = String(req.query.q || 'Micro-expression Transformer');
  const papers = await lingxiEngine.searchArxiv(q, 5);
  ok(res, { items: papers, total: papers.length });
}));

router.post('/chat/codeact/run', auth, (req, res) => {
  const { query = '消融指标' } = req.body || {};
  const result = lingxiEngine.runCodeActSandbox(query);
  ok(res, result);
});

function daysText(n) {
  const d = new Date(Date.now() + n * 86400000);
  return d.toISOString().slice(0, 10);
}

module.exports = { router };
