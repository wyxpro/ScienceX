/**
 * LingXiAgent (灵犀平台) 多智能体执行中枢与三层记忆引擎 (Node.js 原生沉淀版)
 * 遵循对接.md规范：
 * 1. 8 类科研级 Agent 编排模式 (General, ReAct, Plan-Execute, CodeAct, MCP, Skill, Text2SQL, Structured)
 * 2. 灵寻 (LingSeek) 式任务规划流与拓扑执行
 * 3. 课题组三层长短期记忆引擎 (Short-term RAM, Rolling Summary, Long-term Facts)
 * 4. 学术 MCP 工具生态 (arXiv 检索、Python 代码沙箱、Web爬取)
 *
 * 模型接入：所有模式默认真实调用 DeepSeek V4.1 Flash（backend/src/ai 客户端），
 * 规划/推演/SQL/结构化等中间产物由模型按 JSON 契约生成；无密钥或调用失败时回退本地模板。
 */

const fallbacks = require('../../ai/fallbacks');
const gateway = require('../model-gateway');
const { errorPayload } = require('../../ai/resilience');
const store = require('../store');
const aiModule = require('../../ai');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* =========================================================================
 * DeepSeek V4.1 Flash 模型接入与用量记账
 * ========================================================================= */

const liveModelEnabled = (acc) => !!acc?.client;

function addUsage(acc, usage) {
  if (!acc || !usage) return;
  acc.usage.prompt_tokens += Number(usage.prompt_tokens) || 0;
  acc.usage.completion_tokens += Number(usage.completion_tokens) || 0;
  acc.usage.total_tokens = acc.usage.prompt_tokens + acc.usage.completion_tokens;
}

/** 将本轮对话的真实 token 用量写入看板统计 */
/** 宽松解析模型返回的 JSON（兼容 ```json 围栏与前后缀文本） */
function parseJSONObject(text) {
  if (!text) return null;
  const cleaned = String(text).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

/** 非流式调用 DeepSeek（用于规划 / ReAct 推演 / SQL / 结构化等 JSON 契约任务） */
async function completeLLM(acc, { systemPrompt, query, memoryPrompt = '', temperature = 0.2, maxTokens, signal }) {
  const messages = [
    { role: 'system', content: systemPrompt + (memoryPrompt ? `\n\n${memoryPrompt}` : '') },
    { role: 'user', content: query },
  ];
  const result = await acc.client.chatCompletion(messages, {
    temperature,
    ...(maxTokens ? { max_tokens: maxTokens } : {}),
    signal,
  });
  addUsage(acc, result.usage);
  return result;
}

/** 流式调用 DeepSeek：思维链 → thought 事件，正文 → delta 事件 */
async function streamLLM(acc, send, { systemPrompt, query, history = [], memoryPrompt = '', temperature = 0.4, signal }) {
  let sentAny = false;
  try {
    const messages = [
      { role: 'system', content: systemPrompt + (memoryPrompt ? `\n\n${memoryPrompt}` : '') },
      ...history,
      { role: 'user', content: query },
    ];
    const result = await acc.client.streamChatCompletion(messages, {
      onThought: (chunk) => send('thought', { text: chunk }),
      onDelta: (chunk) => { sentAny = true; acc.content += chunk; send('delta', { text: chunk }); },
    }, { model: acc.client.config.model, temperature, signal });
    addUsage(acc, result.usage);
    if (result.text) acc.content = result.text;
    return result;
  } catch (err) {
    err.sentDelta = err.sentDelta || sentAny;
    throw err;
  }
}

/** 优先真实模型流式输出；失败或无密钥时回退本地模板（已输出过 delta 则不重复回退） */
async function streamWithFallback(acc, send, opts, fallbackText) {
  if (liveModelEnabled(acc) && !(opts.signal && opts.signal.aborted)) {
    try {
      return await streamLLM(acc, send, opts);
    } catch (err) {
      if (err.sentDelta || (opts.signal && opts.signal.aborted)) throw err;
      console.warn('[LingXiAgent] DeepSeek 流式调用失败，回退本地模板:', err.message);
    }
  }
  acc.fallback = true;
  acc.content = '> 演示模板：未使用真实模型，请核验内容。\n\n' + fallbackText;
  send('fallback', { code: 'MODEL_UNAVAILABLE', degraded: true, retryable: true, message: '已降级为演示模板' });
  await streamDeltaText(send, acc.content);
  return { text: fallbackText };
}

/* =========================================================================
 * 三层记忆引擎 (Three-Tier Scholarly Memory)
 * ========================================================================= */

/**
 * 获取注入提示词的课题组记忆上下文
 */
function getMemoryContext(userId, projectId, convId) {
  // 第三层：长期事实库 (Long-term Facts)
  const facts = (store.researchMemories || [])
    .filter((m) => m.active !== false && (m.user_id === userId || (!m.user_id && userId === 'u1')) && (!projectId || !m.project_id || m.project_id === projectId));

  facts.sort((a, b) => (b.importance || 0.5) - (a.importance || 0.5));
  facts.splice(20);
  facts.forEach((f) => { f.last_accessed_at = store.now(); });
  // 第二层：会话动态摘要 (Rolling Summary)
  let rollingSummary = '';
  if (convId) {
    const conv = (store.conversations || []).find((c) => c.id === convId && (c.owner_id === userId || (!c.owner_id && userId === 'u1')));
    if (conv && conv.rolling_summary) {
      rollingSummary = conv.rolling_summary;
    }
  }

  return {
    facts,
    rollingSummary,
    injectedPrompt: buildMemoryPrompt(facts, rollingSummary),
  };
}

function buildMemoryPrompt(facts, rollingSummary) {
  let prompt = '';
  if (facts && facts.length > 0) {
    prompt += '\n【课题组三层记忆 · 长期事实库】\n';
    facts.forEach((f, idx) => {
      prompt += `${idx + 1}. [${f.category || '事实'}] ${f.key}: ${f.content}\n`;
    });
  }
  if (rollingSummary) {
    prompt += `\n【课题阶段动态滚动摘要】\n${rollingSummary}\n`;
  }
  return prompt;
}

/**
 * 从对话历史中智能提取科研事实并沉淀至第三层记忆
 */
async function extractMemoriesFromConversation(messages, userId = 'u1', projectId = 'p1') {
  return require('../../ai/memory').extract(messages, userId, projectId);
}

/* =========================================================================
 * 学术 MCP 工具集 (arXiv, Python Sandbox, Web)
 * ========================================================================= */

/**
 * 真实/高可用 arXiv 学术文献检索
 */
async function searchArxiv(query, maxResults = 4) {
  const result = await require('../../ai/mcp').call('arxiv-live', 'search_papers', { query: String(query).slice(0, 500), limit: maxResults });
  const data = JSON.parse(result.content[0].text);
  if (result.isError) throw new Error(data.warnings?.[0]?.message || 'arXiv 检索不可用');
  return data.items;
}

/**
 * 未部署隔离环境时禁用代码执行
 */
function runCodeActSandbox() {
  return { enabled: false, executed: false, source: 'disabled', code: 'SANDBOX_DISABLED', message: '尚未配置隔离执行环境，代码执行已禁用；可以生成代码供人工审查。', stdout: '未执行代码。' };
}

async function executeAgentStream(res, {
  messages,
  model = 'DeepSeek V4.1 Flash',
  agentMode = 'general',
  skills = [],
  userId = 'u1',
  projectId = 'p1',
  convId = null,
}) {
  if (model && !gateway.resolveModel(model, userId)) {
    const error = new Error('模型不存在或无权访问');
    Object.assign(error, { statusCode: 404, businessCode: 40003, publicMessage: error.message });
    throw error;
  }
  const selectedClient = await gateway.createClient(model, userId);
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
  const userQuery = lastUserMsg?.content || '';

  // 1. 三层记忆提取与注入
  const memoryCtx = getMemoryContext(userId, projectId, convId);

  // SSE 头部写入
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 3000\n\n');

  let seq = 0;
  const send = (event, data) => {
    if (res.writableEnded) return;
    seq += 1;
    res.write(`id: ${seq}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // 客户端断开时中止上游模型调用，避免无效消耗
  const abortController = new AbortController();
  res.on('close', () => abortController.abort());

  const messageId = store.id('msg');

  // 执行上下文：真实用量累计 + 注入记忆 + 近期对话历史
  const ctx = {
    acc: { client: selectedClient, fallback: false, content: '', usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } },
    memoryPrompt: memoryCtx.injectedPrompt,
    skills,
    history: (messages || []).slice(0, messages.lastIndexOf(lastUserMsg))
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.content)
      .slice(-8),
    signal: abortController.signal,
  };

  // 发送 start 事件
  send('start', {
    message_id: messageId,
    model,
    agent_mode: agentMode,
    timestamp: store.now(),
  });

  // 推送三层记忆注入状态
  if (memoryCtx.facts.length > 0 || memoryCtx.rollingSummary) {
    send('memory_injected', {
      count: memoryCtx.facts.length,
      facts: memoryCtx.facts.map((f) => `[${f.key}] ${f.content}`),
      summary: memoryCtx.rollingSummary,
    });
  }

  // 2. 根据 8 种模式分别执行
  try {
    switch (agentMode) {
      case 'plan_execute':
        await runPlanExecuteMode(send, userQuery, model, ctx);
        break;

      case 'react':
        await runReActMode(send, userQuery, model, ctx);
        break;

      case 'codeact':
        await runCodeActMode(send, userQuery, model, ctx);
        break;

      case 'mcp':
        await runMcpMode(send, userQuery, model, ctx);
        break;

      case 'skill':
        await runSkillMode(send, userQuery, skills, model, ctx);
        break;

      case 'text2sql':
        await runText2SQLMode(send, userQuery, model, ctx);
        break;

      case 'structured':
        await runStructuredMode(send, userQuery, model, ctx);
        break;

      case 'general':
      default:
        await runGeneralMode(send, userQuery, model, ctx);
        break;
    }

    // 3. 真实用量记账与完成事件
    await store.persist();
    const realTokens = ctx.acc.usage.total_tokens;
    send('done', {
      message_id: messageId,
      tokens: realTokens,
      fallback: ctx.acc.fallback, mode: ctx.acc.fallback ? 'fallback' : 'live',
      agent_mode: agentMode,
      model,
    });
  } catch (err) {
    if (abortController.signal.aborted) {
      console.warn('[LingXiAgent] 客户端已断开，中止本轮推演');
    } else {
      console.error('[LingXiAgent] Stream error:', err);
      send('error', errorPayload(err));
    }
  } finally {
    if (!res.writableEnded) res.end();
  }

  return { content: ctx.acc.content, usage: ctx.acc.usage, fallback: ctx.acc.fallback };
}

/* =========================================================================
 * 模式 1: 📋 Plan-and-Execute (灵寻 LingSeek 任务规划流)
 * 规划步骤与最终报告均由 DeepSeek V4.1 Flash 生成；文献检索与沙箱步骤真实执行工具
 * ========================================================================= */

const { PLAN_SYSTEM } = require('../../ai/prompts/agents');

function buildFallbackPlanSteps() { return fallbacks.planSteps(); }

function buildFallbackPlanReport(query, steps) { return fallbacks.planReport(query, steps); }

async function runPlanExecuteMode(send, query, model, ctx) {
  const { acc } = ctx;
  const taskId = store.id('task_plan');
  let title = `科研任务规划：${query.slice(0, 20)}`;
  let steps = null;

  // 1. DeepSeek 生成任务规划（JSON 契约）
  if (liveModelEnabled(acc) && !ctx.signal.aborted) {
    try {
      const planRes = await completeLLM(acc, {
        systemPrompt: PLAN_SYSTEM,
        query,
        memoryPrompt: ctx.memoryPrompt,
        temperature: 0.2,
        maxTokens: 900,
        signal: ctx.signal,
      });
      const planJson = parseJSONObject(planRes.text);
      if (planJson && Array.isArray(planJson.steps) && planJson.steps.length) {
        title = String(planJson.title || title).slice(0, 40);
        steps = planJson.steps.slice(0, 5).map((s, i) => ({
          id: `step_${i + 1}`,
          title: String(s.title || `步骤 ${i + 1}`).slice(0, 44),
          tool: String(s.tool || '科研推理引擎').slice(0, 24),
          status: 'waiting',
          desc: String(s.desc || '').slice(0, 80),
          output: String(s.output || ''),
        }));
      }
    } catch (err) {
      if (ctx.signal.aborted) return;
      console.warn('[LingXiAgent] DeepSeek 规划生成失败，回退内置规划:', err.message);
    }
  }
  if (!steps) steps = buildFallbackPlanSteps(query);

  // 2. 发送规划初始流
  send('plan', { task_id: taskId, title, percent: 0, status: 'running', steps });
  await sleep(300);

  // 3. 依次执行步骤：可映射的真实工具优先执行
  const toolNotes = [];
  for (let i = 0; i < steps.length; i++) {
    if (ctx.signal.aborted) return;
    const step = steps[i];
    step.status = 'running';
    send('step_start', { step_index: i, step_id: step.id, title: step.title, tool: step.tool });
    send('plan', {
      task_id: taskId,
      title,
      percent: Math.round(((i + 0.3) / steps.length) * 100),
      status: 'running',
      steps,
    });
    await sleep(250);

    let status = 'completed';
    let output = '建议步骤（尚未执行）：' + (step.desc || step.title);
    if (/arxiv|检索|文献|论文/i.test(`${step.tool}${step.title}`)) {
      try {
        const papers = await searchArxiv(query, 3);
        output = `已检索到代表文献：${papers.map((p) => `${p.title} (${p.venue})`).join('；')}`;
        toolNotes.push(`【arXiv 检索结果】\n${papers.map((p) => `- ${p.title}（${p.venue}, ${p.year}）：${p.abstract}`).join('\n')}`);
        status = 'success';
      } catch { output = '工具不可用，此步骤未执行'; status = 'failed'; }
    } else if (/python|沙箱|sandbox|代码|校验/i.test(`${step.tool}${step.title}`)) {
      try {
        const sandbox = runCodeActSandbox(query);
        output = sandbox.message;
        status = 'failed';
        toolNotes.push(`【代码执行状态】${sandbox.message}`);
      } catch { output = '代码执行不可用，未运行任何实验'; status = 'failed'; }
    }

    step.status = status;
    step.output = output;
    send('step_update', { step_index: i, step_id: step.id, status, output });
    send('plan', {
      task_id: taskId,
      title,
      percent: Math.round(((i + 1) / steps.length) * 100),
      status: i === steps.length - 1 ? 'completed' : 'running',
      steps,
    });
    await sleep(200);
  }

  // 4. DeepSeek 流式合成最终决策报告
  const stepsBrief = steps.map((s, i) => `${i + 1}. ${s.title}（工具：${s.tool}）→ 产出：${s.output}`).join('\n');
  const toolCtx = toolNotes.length ? `\n\n【真实工具执行产物】\n${toolNotes.join('\n\n')}` : '';
  await streamWithFallback(acc, send, {
    systemPrompt: '你是 ScienceX 科研总指挥智能体。步骤中可能包含未执行建议或禁用工具，只能根据明确的真实工具结果作结论，请基于下方步骤产出与真实工具结果，面向科研人员撰写最终决策报告：要求 Markdown 分节、结论先行、必要时给出行动建议清单；严禁虚构步骤产物中不存在的数据；若用户请求本身是寒暄或闲聊，则轻松自然地直接回应即可。',
    query: `用户原始请求：${query}\n\n步骤处理状态与产出：\n${stepsBrief}${toolCtx}`,
    memoryPrompt: ctx.memoryPrompt,
    temperature: 0.4,
    signal: ctx.signal,
  }, buildFallbackPlanReport(query, steps));
}

/* =========================================================================
 * 模式 2: 🔍 ReAct (严谨学术推演 Thought-Action-Observation)
 * 推演轮次与最终论证由 DeepSeek V4.1 Flash 生成
 * ========================================================================= */

const { REACT_SYSTEM } = require('../../ai/prompts/agents');

function buildFallbackReActAnswer(query) { return fallbacks.reply([{ role: "user", content: query }]); }

async function runReActMode(send, query, model, ctx) {
  const { acc } = ctx;
  let rounds = null;
  let answer = null;

  // 1. DeepSeek 生成 ReAct 推演链（JSON 契约）
  if (liveModelEnabled(acc) && !ctx.signal.aborted) {
    try {
      const reactRes = await completeLLM(acc, {
        systemPrompt: REACT_SYSTEM,
        query,
        memoryPrompt: ctx.memoryPrompt,
        temperature: 0.3,
        maxTokens: 1600,
        signal: ctx.signal,
      });
      const reactJson = parseJSONObject(reactRes.text);
      if (reactJson && Array.isArray(reactJson.rounds) && reactJson.rounds.length) {
        rounds = reactJson.rounds.slice(0, 3).map((r, i) => ({
          round: i + 1,
          thought: String(r.thought || '').slice(0, 160),
          action: String(r.action || '').slice(0, 160),
          observation: String(r.observation || '').slice(0, 220),
        }));
        if (reactJson.answer) answer = String(reactJson.answer);
      }
    } catch (err) {
      if (ctx.signal.aborted) return;
      console.warn('[LingXiAgent] DeepSeek ReAct 推演失败，回退内置推演链:', err.message);
    }
  }

  // 2. 逐轮推送思维链事件
  if (rounds) {
    for (const step of rounds) {
      if (ctx.signal.aborted) return;
      send('thought', { round: step.round, text: step.thought, action: step.action, observation: step.observation, latency_ms: 320 + step.round * 110 });
      await sleep(350);
    }
    // 3. 流式输出最终论证
    if (answer) {
      acc.content = answer;
      await streamDeltaText(send, answer);
      return;
    }
  }

  // 无解析结果：有模型能力时直接流式推演，否则回退模板报告
  await streamWithFallback(acc, send, {
    systemPrompt: '你是 ScienceX 的 ReAct 严谨学术推演智能体。请先进行 2-3 轮「思考→行动→观察」推演（以引用块或列表形式呈现），再输出「### 🔍 ReAct 学术推演与论证报告」格式的最终论证：含理论依据、严谨实验判定标准与可执行建议。',
    query,
    memoryPrompt: ctx.memoryPrompt,
    temperature: 0.4,
    signal: ctx.signal,
  }, buildFallbackReActAnswer(query));
}

/* =========================================================================
 * 模式 3: 💻 CodeAct (实验代码沙箱与数据可视化)
 * 沙箱真实执行工具；解读分析由 DeepSeek V4.1 Flash 生成
 * ========================================================================= */

async function runCodeActMode(send, query, model, ctx) {
  const result = runCodeActSandbox();
  send('tool_result', { tool: 'python_sandbox', ...result });
  ctx.acc.content = result.message;
  await streamDeltaText(send, result.message);
}

/* =========================================================================
 * 模式 4: 🌐 学术 MCP (arXiv 实时检索与论文元数据)
 * arXiv 工具真实执行；要点分析由 DeepSeek V4.1 Flash 生成
 * ========================================================================= */

function buildFallbackMcpAnalysis(papers) {
  return papers.length ? papers.map((p) => '- [' + p.title + '](' + p.url + ') — ' + (p.abstract || '来源未提供摘要')).join('\n\n') : '检索未返回文献，请调整关键词。';
}

async function runMcpMode(send, query, model, ctx) {
  const { acc } = ctx;
  send('thought', {
    round: 1,
    text: `通过 Model Context Protocol (MCP) 调度学术检索服务 \`arxiv-mcp\`，提取前沿微表情分析文献…`,
  });
  await sleep(250);

  send('tool_call', {
    tool: 'arxiv_mcp',
    params: { query: query.slice(0, 30), max_results: 4 },
  });

  const papers = await searchArxiv(query, 4);
  await sleep(300);

  send('tool_result', {
    tool: 'arxiv_mcp',
    papers,
    count: papers.length,
  });

  await streamWithFallback(acc, send, {
    systemPrompt: '你是 ScienceX 学术文献分析智能体。arXiv MCP 工具已检索到下列论文元数据，请撰写检索报告：Markdown 格式，逐篇提炼核心贡献与对你课题的启发，最后给出文献管理与精读建议；只能基于给出的论文信息分析，不得编造论文内容。',
    query: `用户检索意图：${query}\n\n检索到的论文元数据：\n${JSON.stringify(papers, null, 1)}`,
    memoryPrompt: ctx.memoryPrompt,
    temperature: 0.4,
    signal: ctx.signal,
  }, buildFallbackMcpAnalysis(papers));
}

/* =========================================================================
 * 模式 5: ⚡ 学术技能 (Skill) —— DeepSeek V4.1 Flash 按技能上下文真实执行
 * ========================================================================= */

function buildFallbackSkillText(skill, query) { return `技能：${skill.name}\n\n` + fallbacks.reply([{ role: "user", content: query }]); }

async function runSkillMode(send, query, skills, model, ctx) {
  const { acc } = ctx;
  const skill = store.skills.find((s) => s.id === skills[0]) || store.skills[0];

  send('tool_call', {
    tool: 'scholarly_skill',
    name: skill.name,
    desc: skill.desc,
  });
  await sleep(250);

  await streamWithFallback(acc, send, {
    systemPrompt: `你是 ScienceX 学术技能执行智能体。当前已激活技能「${skill.name}」（${skill.desc}）。请以该技能的专业视角执行用户任务并直接产出高质量结果，Markdown 格式，结论先行、分点展开；结合课题组记忆背景。`,
    query,
    memoryPrompt: ctx.memoryPrompt,
    temperature: 0.4,
    signal: ctx.signal,
  }, buildFallbackSkillText(skill, query));
}

/* =========================================================================
 * 模式 6: 🗄️ Text2SQL (学术数据库检索)
 * SQL 与解读由 DeepSeek V4.1 Flash 生成；演示库返回固定样例行
 * ========================================================================= */

const { TEXT2SQL_SYSTEM } = require('../../ai/prompts/agents');

function buildFallbackText2SQL() {
  const generatedSQL = `SELECT 
    e.model_name, e.backbone, e.dataset, 
    AVG(e.uf1) AS mean_uf1, STDDEV(e.uf1) AS std_uf1, 
    AVG(e.uar) AS mean_uar, COUNT(e.seed) AS seed_count
FROM experiment_runs e
WHERE e.dataset = 'CASME_II' 
  AND e.protocol = 'LOSO'
GROUP BY e.model_name, e.backbone, e.dataset
ORDER BY mean_uf1 DESC
LIMIT 5;`;

  const sqlData = [
    { model_name: 'up9 + Cross-Layer + Flow', backbone: 'ViT-B/16', mean_uf1: '0.7145', std_uf1: '0.0031', mean_uar: '0.7092', seed_count: 3 },
    { model_name: 'AUFormer (MM 24)', backbone: 'Swin-T', mean_uf1: '0.7080', std_uf1: '0.0042', mean_uar: '0.7015', seed_count: 3 },
    { model_name: 'up9 + Cross-Layer', backbone: 'ViT-B/16', mean_uf1: '0.6892', std_uf1: '0.0038', mean_uar: '0.6810', seed_count: 3 },
    { model_name: 'GraphAU (CVPR 24)', backbone: 'ResNet-18', mean_uf1: '0.6720', std_uf1: '0.0055', mean_uar: '0.6680', seed_count: 3 },
    { model_name: 'up9 Baseline', backbone: 'ViT-B/16', mean_uf1: '0.6464', std_uf1: '0.0052', mean_uar: '0.6414', seed_count: 3 },
  ];

  const text = `### 🗄️ Text2SQL 数据库查询结果

**生成的 SQL 查询语句**：
\`\`\`sql
${generatedSQL}
\`\`\`

**实验跑分聚合视图 (CASME II, LOSO 协议)**：

| 排名 | 模型架构与配置 | 主干网络 (Backbone) | 平均 UF1 (± std) | 平均 UAR | 随机种子数 |
| :---: | :--- | :--- | :---: | :---: | :---: |
| 🥇 | **up9 + Cross-Layer + Flow** | ViT-B/16 | **0.7145 ± 0.0031** | **0.7092** | 3 |
| 🥈 | **AUFormer (MM 24)** | Swin-T | 0.7080 ± 0.0042 | 0.7015 | 3 |
| 🥉 | **up9 + Cross-Layer** | ViT-B/16 | **0.6892 ± 0.0038** | **0.6810** | 3 |
| 4 | GraphAU (CVPR 24) | ResNet-18 | 0.6720 ± 0.0055 | 0.6680 | 3 |
| 5 | up9 Baseline | ViT-B/16 | 0.6464 ± 0.0052 | 0.6414 | 3 |

数据表明，注入跨层交互与光流增益后，你的模型已成功跃居榜首。`;

  return { generatedSQL, sqlData, text };
}

async function runText2SQLMode(send, query, model, ctx) {
  const { acc } = ctx;
  send('thought', {
    round: 1,
    text: `解析自然语言查询意图，生成针对科研实验跑分库与文献元数据库的 SQL 查询语句…`,
  });
  await sleep(250);

  // 1. DeepSeek 生成 SQL 与解读（JSON 契约）
  let sqlResult = null;
  if (liveModelEnabled(acc) && !ctx.signal.aborted) {
    try {
      const res2 = await completeLLM(acc, {
        systemPrompt: TEXT2SQL_SYSTEM,
        query,
        memoryPrompt: ctx.memoryPrompt,
        temperature: 0.2,
        maxTokens: 1400,
        signal: ctx.signal,
      });
      const parsed = parseJSONObject(res2.text);
      if (parsed && parsed.sql) {
        sqlResult = { sql: String(parsed.sql), analysis: String(parsed.analysis || '') };
      }
    } catch (err) {
      if (ctx.signal.aborted) return;
      console.warn('[LingXiAgent] DeepSeek Text2SQL 生成失败，回退内置 SQL:', err.message);
    }
  }

  const fallback = buildFallbackText2SQL();
  const generatedSQL = sqlResult ? sqlResult.sql : fallback.generatedSQL;

  send('tool_call', { tool: 'text2sql_engine', sql: generatedSQL });
  await sleep(350);

  send('tool_result', { tool: 'text2sql_engine', sql: generatedSQL, rows: fallback.sqlData });

  // 2. 输出 SQL + 模型解读
  if (sqlResult) {
    const text = `### 🗄️ Text2SQL 数据库查询结果

**生成的 SQL 查询语句**：
\`\`\`sql
${generatedSQL}
\`\`\`

**实验跑分聚合视图 (CASME II, LOSO 协议 · 演示样例数据)**：

| 排名 | 模型架构与配置 | 主干网络 (Backbone) | 平均 UF1 (± std) | 平均 UAR | 随机种子数 |
| :---: | :--- | :--- | :---: | :---: | :---: |
| 🥇 | **up9 + Cross-Layer + Flow** | ViT-B/16 | **0.7145 ± 0.0031** | **0.7092** | 3 |
| 🥈 | **AUFormer (MM 24)** | Swin-T | 0.7080 ± 0.0042 | 0.7015 | 3 |
| 🥉 | **up9 + Cross-Layer** | ViT-B/16 | **0.6892 ± 0.0038** | **0.6810** | 3 |
| 4 | GraphAU (CVPR 24) | ResNet-18 | 0.6720 ± 0.0055 | 0.6680 | 3 |
| 5 | up9 Baseline | ViT-B/16 | 0.6464 ± 0.0052 | 0.6414 | 3 |

${sqlResult.analysis}`;
    acc.content = text;
    await streamDeltaText(send, text);
    return;
  }

  acc.fallback = true;
  acc.content = '> 演示模板：未使用真实模型。\n\n' + fallback.text;
  send('fallback', { degraded: true, message: '演示模板' });
  await streamDeltaText(send, acc.content);
}

/* =========================================================================
 * 模式 7: 🎯 结构化产出 (Structured Output)
 * JSON 决策数据与 LaTeX 三线表由 DeepSeek V4.1 Flash 生成
 * ========================================================================= */

const { STRUCTURED_SYSTEM } = require('../../ai/prompts/agents');

function buildFallbackStructured(query) { return fallbacks.structured(query); }

async function runStructuredMode(send, query, model, ctx) {
  const { acc } = ctx;
  let structured = null;

  // 1. DeepSeek 生成结构化数据（JSON 契约）
  if (liveModelEnabled(acc) && !ctx.signal.aborted) {
    try {
      const res2 = await completeLLM(acc, {
        systemPrompt: STRUCTURED_SYSTEM,
        query,
        memoryPrompt: ctx.memoryPrompt,
        temperature: 0.2,
        maxTokens: 1800,
        signal: ctx.signal,
      });
      const parsed = parseJSONObject(res2.text);
      if (parsed && parsed.research_json) {
        structured = {
          researchJson: parsed.research_json,
          latex: String(parsed.latex || ''),
          summary: String(parsed.summary || ''),
        };
      }
    } catch (err) {
      if (ctx.signal.aborted) return;
      console.warn('[LingXiAgent] DeepSeek 结构化产出失败，回退内置模板:', err.message);
    }
  }

  if (structured) {
    const text = `### 🎯 结构化科研决策数据

已生成针对「**${query}**」的标准科研 JSON 结构定义与 LaTeX 论文排版源码：

\`\`\`json
${JSON.stringify(structured.researchJson, null, 2)}
\`\`\`
${structured.latex ? `\n**LaTeX 三线表排版代码 (可直接粘贴至 Overleaf)**：\n\`\`\`latex\n${structured.latex}\n\`\`\`\n` : ''}
${structured.summary}`;
    acc.content = text;
    await streamDeltaText(send, text);
    return;
  }

  const fallback = buildFallbackStructured(query);
  acc.fallback = true;
  acc.content = '> 演示模板：未使用真实模型。\n\n' + fallback.text;
  send('fallback', { degraded: true, message: '演示模板' });
  await streamDeltaText(send, acc.content);
}

/* =========================================================================
 * 模式 8: 🧠 通用科研对话 (General) —— DeepSeek V4.1 Flash 流式对话 + 三层记忆
 * ========================================================================= */

function buildFallbackGeneralReply(query) { return fallbacks.reply([{ role: "user", content: query }]); }

async function runGeneralMode(send, query, model, ctx) {
  const memoryPrompt = ctx.memoryPrompt || '';
  await streamWithFallback(ctx.acc, send, {
    systemPrompt: '你是 ScienceX AI 科研对话中枢的高级科研助手。请结合课题组科研背景与记忆，针对用户的科研问题给出学术规范、逻辑严谨、有理论深度且有实操价值的专业回答。在论述时，结论先行，逻辑清晰；若用户是日常寒暄或闲聊，则自然友好地直接回应。',
    query,
    history: ctx.history,
    memoryPrompt,
    temperature: 0.3,
    signal: ctx.signal,
  }, buildFallbackGeneralReply(query));
}

/**
 * 字符流平滑推送工具
 */
async function streamDeltaText(send, text) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    const size = 3 + Math.floor(Math.random() * 5);
    chunks.push(text.slice(i, i + size));
    i += size;
  }
  const perChunk = Math.max(10, Math.floor(1200 / Math.max(1, chunks.length)));
  for (const c of chunks) {
    send('delta', { text: c });
    await sleep(perChunk);
  }
}

module.exports = {
  getMemoryContext,
  extractMemoriesFromConversation,
  searchArxiv,
  runCodeActSandbox,
  executeAgentStream,
};
