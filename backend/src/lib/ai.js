/**
 * 模拟 AI 引擎 —— 演示环境用本地模板模拟 LLM 流式输出
 * 生产环境此处对接模型网关（OpenAI 兼容协议，见 TSD §3.1）
 */
const store = require('./store');
const gateway = require('./model-gateway');

/** 根据用户输入生成模拟回答（Markdown 格式） */
function generateReply(messages, scene = 'workbench') {
  const q = String([...messages].reverse().find((m) => m.role === 'user')?.content || '');
  const prefix = '> 演示模板：未调用真实模型，以下仅为通用方法建议。\n\n';
  if (scene === 'document') return prefix + '文档当前片段信息不足，无法确认问题中的结论、数据或页码。请检查原文和检索引用片段，配置模型后重试。';
  if (/实验|消融|种子|方差|ablation|显著/i.test(q)) return prefix + '实验设计建议：\n1. 固定数据集、训练预算和评价协议，建立 baseline 基线。\n2. 单独移除各模块进行消融，避免多个变量一起变化。\n3. 使用多个随机种子，报告均值、标准差或置信区间；统计显著性需要真实实验数据验证。\n4. 区分相对提升与百分点，保留失败结果和运行配置以便复现。';
  if (/综述|文献|survey|review|检索/i.test(q)) return prefix + '文献综述建议：明确检索范围与纳入标准，使用真实来源，按 DOI 和标题去重；按方法演进组织综述，比较数据集、评价协议及局限。所有引用都需核对原文，不能凭空编造论文和实验指标。';
  if (/润色|翻译|polish|translation/i.test(q)) return prefix + '请提供原文与目标语言。润色和翻译必须保留事实、数据、术语、公式和引用；不能增加未证实的结论。模型尚不可用，因此未生成可作为正式译文的结果。';
  if (/选题|方向|topic/i.test(q)) return prefix + '选题建议：界定研究问题，检索真实文献确认研究空白；检查数据、算力、时间等可行性，明确 baseline 基线和评价指标。创新性需要与已有方法进行证据充分的对比，不能仅依据题目判断。';
  return prefix + '建议先界定研究问题和可用证据，核对数据与评价协议，再制定可复现的验证方案。当前信息不足，无法确认具体结论；请补充原文、数据或实验记录。';
}

/** 优先调用已配置的 OpenAI 兼容网关，没有密钥时保留本地演示回退。 */
async function generateResponse(messages, { scene = 'workbench', model, signal, userId } = {}) {
  if (model && !gateway.resolveModel(model, userId)) {
    const error = new Error('模型不存在或无权访问');
    error.statusCode = 404;
    error.businessCode = 40003;
    error.publicMessage = '模型不存在或无权访问';
    throw error;
  }
  try {
    const remote = await gateway.complete(messages, { model, signal, userId, scene });
    if (remote) {
      return remote;
    }
  } catch (error) {
    if (signal?.aborted || model) throw error;
    console.warn('[ScienceX AI] 模型网关调用失败，回退到演示生成器:', error.message);
  }
  const user = userId ? store.users.find((item) => item.id === userId) : null;
  const text = generateReply(messages, scene, user);
  return { text, model: model || 'sim-model', usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }, fallback: true };
}

/** 模拟生成图表的提示词模板（image2 生成通道的替代演示） */
const chartPromptTemplates = [
  { type: 'bar', title: (kw) => `${kw} 指标对比`, desc: '分组柱状图，含误差棒，学术配色' },
  { type: 'line', title: (kw) => `${kw} 训练曲线`, desc: '双曲线（train/val），含最优 epoch 标注' },
  { type: 'heatmap', title: (kw) => `${kw} 混淆矩阵`, desc: '对角高亮，行归一化百分比' },
];

/**
 * SSE 流式响应（遵循 TSD §5.4 事件协议）
 * events: start / delta / progress / reference / tool / done / error
 */
function sseStream(res, { onDelta, onEvent, totalDelay = 1600, chunkCount = 40, extraDone = {} } = {}) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(`retry: 3000\n\n`);
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  return { send };
}

/** 模拟逐字流式输出一段 Markdown 文本 */
async function streamText(res, text, { onDone, beforeStream, model = 'sim-model', fallback = model === 'sim-model', retrieval, usage } = {}) {
  sseStream(res);
  const messageId = store.id('msg');
  let closed = false;
  let sequence = 0;
  const onClose = () => { if (!res.writableEnded) closed = true; };
  const sendWithId = (event, data) => {
    sequence += 1;
    res.write(`id: ${sequence}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
  res.on('close', onClose);
  try {
    sendWithId('start', { message_id: messageId, model, fallback, mode: fallback ? 'fallback' : 'live', retrieval });
    if (fallback) sendWithId('fallback', { code: 'MODEL_UNAVAILABLE', degraded: true, retryable: true, message: '已降级为演示模板' });
    if (beforeStream) beforeStream(sendWithId);

    // 按 2~5 个字符切分为 token 块
    const chunks = [];
    let i = 0;
    while (i < text.length) {
      const size = 2 + Math.floor(Math.random() * 4);
      chunks.push(text.slice(i, i + size));
      i += size;
    }
    const perChunk = Math.max(12, Math.floor(1400 / Math.max(1, chunks.length)));
    for (const c of chunks) {
      if (closed || res.writableEnded) return false;
      sendWithId('delta', { text: c });
      await sleep(perChunk);
    }
    const tokens = Number.isFinite(usage?.prompt_tokens) && Number.isFinite(usage?.completion_tokens)
      ? usage.prompt_tokens + usage.completion_tokens : null;
    if (closed || res.writableEnded) return false;
    sendWithId('done', { message_id: messageId, tokens: fallback ? 0 : tokens, usage_status: tokens === null ? 'unreported' : 'reported', fallback, mode: fallback ? 'fallback' : 'live', ...onDone });
    res.end();
    return true;
  } finally {
    res.removeListener('close', onClose);
  }
}

/** 模拟异步任务：创建 → 进度推送 → 结果（GET /tasks/:id/stream 消费） */
function createTask(type, stages, resultBuilder, ownerId = null) {
  const taskId = store.id('task');
  const task = { id: taskId, owner_id: ownerId, type, status: 'pending', percent: 0, stage: stages[0], stages, created_at: store.now(), result: null, listeners: [], event_seq: 0, events: [] };
  store.tasks.set(taskId, task);
  publishTaskEvent(task, 'progress');

  (async () => {
    try {
      await sleep(400);
      task.status = 'running';
      publishTaskEvent(task, 'progress');
      for (let s = 0; s < stages.length; s++) {
        task.stage = stages[s];
        const from = Math.round((s / stages.length) * 100);
        const to = Math.round(((s + 1) / stages.length) * 100);
        for (let p = from; p <= to; p += Math.round((to - from) / 3) || 1) {
          task.percent = Math.min(p, 99);
          publishTaskEvent(task, 'progress');
          await sleep(280 + Math.random() * 350);
        }
      }
      task.percent = 100;
      task.result = await resultBuilder(task);
      task.status = 'done';
      await store.persist();
      publishTaskEvent(task, 'done');
    } catch (error) {
      task.status = 'failed';
      task.error = '任务执行失败';
      require('./logger').getLogger().error({ event: 'task_failed', task_id: task.id, err: error });
      publishTaskEvent(task, 'error');
    }
  })();

  return task;
}

function publishTaskEvent(task, event) {
  const terminalData = event === 'done'
    ? { result: task.result }
    : event === 'error'
      ? { message: task.error || '任务执行失败' }
      : {};
  const entry = { id: ++task.event_seq, event, data: { task_id: task.id, percent: task.percent, stage: task.stage, ...terminalData } };
  task.events.push(entry);
  if (task.events.length > 1000) task.events.shift();
  [...task.listeners].forEach((fn) => fn(task, entry));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = { generateReply, generateResponse, streamText, createTask, publishTaskEvent, sseStream, sleep, chartPromptTemplates };
