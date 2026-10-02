/**
 * 模拟 AI 引擎 —— 演示环境用本地模板模拟 LLM 流式输出
 * 生产环境此处对接模型网关（OpenAI 兼容协议，见 TSD §3.1）
 */
const store = require('./store');
const gateway = require('./model-gateway');

/** 根据用户输入生成模拟回答（Markdown 格式） */
function generateReply(messages, scene = 'workbench') {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  const q = (lastUser && lastUser.content) || '';
  const lower = q.toLowerCase();

  if (scene === 'document') {
    return `根据这篇论文的内容，针对你的问题「${q.slice(0, 40)}」：\n\n论文相关章节指出，AU 先验与光流引导是微表情识别的两类关键结构偏置，二者作用互补——AU 分支贡献约 **6.8 UF1 点**，光流质量差异约 **3.2 点**。作者在消融实验中使用了严格的 LOSO 协议与 5 个随机种子。\n\n**延伸思考**：如果将其迁移到你的 up 系列模型，可以优先尝试跨层注入（而非单点融合），这也与综述 (TPAMI 25) 中"AU 注入方式决定增益上限"的结论一致。`;
  }

  if (lower.includes('选题') || lower.includes('方向') || lower.includes('topic')) {
    return `结合你的研究方向（微表情识别 / 情感计算 / Transformer），我建议关注以下选题：\n\n1. **跨层 AU 交互机制** ⭐ 推荐度 92%\n   - 与你 up9 的 AU 分支直接衔接，文献支撑充分（AUFormer、GraphAU）\n   - 风险：与现有工作需拉开差异，建议聚焦"跨层"而非"单点融合"\n\n2. **扩散模型数据增广缓解类别不均衡** ⭐ 推荐度 85%\n   - CASME II 长尾类（fear/disgust）样本 <30，痛点明确\n   - 可参考 Diffusion ME Synthesis (CVPR 25) 的合成策略\n\n3. **跨数据集域适应** ⭐ 推荐度 78%\n   - 综述指出跨数据集性能下降 12-20 点，学术价值高\n   - 工作量偏大，适合作为第二篇\n\n需要我对某个方向做**可行性评估**或直接生成**开题报告**吗？你可以直接在「选题灵感」页操作。`;
  }

  if (lower.includes('综述') || lower.includes('survey') || lower.includes('review')) {
    return `综述撰写建议（以「微表情识别」为例）：\n\n## 结构骨架\n1. **背景与挑战**（数据稀缺 / 类别不均衡 / 跨域泛化）\n2. **数据集与协议**（SMIC / CASME II / SAMM + LOSO 规范）\n3. **方法演进**（手工特征 → CNN-RNN → Transformer+AU 先验）\n4. **统一评测对比**（同协议复现表格是综述的核心价值）\n5. **开放问题与展望**\n\n## 写作要点\n- 用时间轴图呈现方法演进，避免流水账式罗列\n- 对比表必须统一协议口径，标注 LOSO / hold-out\n- 每个方法指出其"结构偏置"：AU 先验、光流、时序对比学习等\n\n我可以在「选题灵感 → 综述生成」中为你生成带引用的完整草稿。`;
  }

  if (lower.includes('实验') || lower.includes('消融') || lower.includes('ablation')) {
    return `针对实验设计的建议：\n\n## 消融实验设计\n| 配置 | AU 分支 | 跨层交互 | 光流增强 | 目的 |\n| --- | --- | --- | --- | --- |\n| baseline | ✓ | ✗ | ✗ | 基线 |\n| +cross-attn | ✓ | ✓ | ✗ | 验证跨层交互 |\n| +flow-boost | ✓ | ✓ | ✓ | 验证光流增强 |\n\n## 注意事项\n- **随机种子**：至少 3 个（7/13/42），报告均值 ± 标准差\n- **协议一致**：全部使用 LOSO，与 SOTA 对比需同口径\n- **记录规范**：每次运行记录 lr / batch / epochs / seed，可在「实验设计 → 参数看板」沉淀\n\n你当前 up9+cross-attn 的 UF1=0.6892，相比 baseline 提升 4.28 点（+6.6%），趋势健康。`;
  }

  if (lower.includes('润色') || lower.includes('翻译') || lower.includes('polish')) {
    return `我可以帮你完成学术写作的多个环节：\n\n- **学术润色**：优化语法、逻辑与学术表达，支持指定期刊风格\n- **中英互译**：段落级双向翻译，自动对齐学术术语\n- **AI 查重**：相似度检测 + 重复片段定位\n- **AI 降重**：保义改写，附前后对比\n\n请直接在「论文写作」页粘贴文本操作，或把要润色的段落发给我。`;
  }

  return `关于「${q.slice(0, 60)}」，我的分析如下：\n\n**核心要点**\n- 这是一个与${store.users[0].research_tags[0]}相关的科研问题，建议先界定问题边界与评价指标\n- 从文献看，该方向的成熟方案多采用结构先验 + 深度模型的组合思路\n- 建议优先复现 1-2 个代表性 baseline，在统一协议下再讨论创新点\n\n**建议的下一步**\n1. 在「选题灵感」检索相关文献，确认研究空白\n2. 在「文献阅读」精读 3 篇代表作，生成思维导图对比方法差异\n3. 在「实验设计」生成消融方案并记录参数\n\n需要我调用「文献综述生成」技能深入展开吗？`;
}

/** 优先调用已配置的 OpenAI 兼容网关，没有密钥时保留本地演示回退。 */
async function generateResponse(messages, { scene = 'workbench', model, signal, userId } = {}) {
  try {
    const remote = await gateway.complete(messages, { model, signal, userId });
    if (remote) return remote;
  } catch (error) {
    console.warn('[ScienceX AI] 模型网关调用失败，回退到演示生成器:', error.message);
  }
  const text = generateReply(messages, scene);
  return { text, model: model || 'sim-model', usage: { total_tokens: Math.round(text.length * 0.7) }, fallback: true };
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
async function streamText(res, text, { onDone, beforeStream, model = 'sim-model' } = {}) {
  const { send } = sseStream(res);
  const messageId = store.id('msg');
  let closed = false;
  const onClose = () => { closed = true; };
  res.on('close', onClose);
  send('start', { message_id: messageId, model });
  if (beforeStream) beforeStream(send);

  // 按 2~5 个字符切分为 token 块
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    const size = 2 + Math.floor(Math.random() * 4);
    chunks.push(text.slice(i, i + size));
    i += size;
  }
  const perChunk = Math.max(12, Math.floor(1400 / chunks.length));
  for (const c of chunks) {
    if (closed || res.writableEnded) return;
    send('delta', { text: c });
    await sleep(perChunk);
  }
  const tokens = Math.round(text.length * 0.7);
  if (!closed && !res.writableEnded) {
    send('done', { message_id: messageId, tokens, cost: +(tokens * 0.00003).toFixed(4), ...onDone });
    res.end();
  }
  res.removeListener('close', onClose);
}

/** 模拟异步任务：创建 → 进度推送 → 结果（GET /tasks/:id/stream 消费） */
function createTask(type, stages, resultBuilder, ownerId = null) {
  const taskId = store.id('task');
  const task = { id: taskId, owner_id: ownerId, type, status: 'pending', percent: 0, stage: stages[0], stages, created_at: store.now(), result: null, listeners: [] };
  store.tasks.set(taskId, task);

  (async () => {
    await sleep(400);
    task.status = 'running';
    for (let s = 0; s < stages.length; s++) {
      task.stage = stages[s];
      const from = Math.round((s / stages.length) * 100);
      const to = Math.round(((s + 1) / stages.length) * 100);
      for (let p = from; p <= to; p += Math.round((to - from) / 3) || 1) {
        task.percent = Math.min(p, 99);
        task.listeners.forEach((fn) => fn(task));
        await sleep(280 + Math.random() * 350);
      }
    }
    task.percent = 100;
    task.status = 'done';
    task.result = resultBuilder();
    task.listeners.forEach((fn) => fn(task));
  })();

  return task;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = { generateReply, generateResponse, streamText, createTask, sseStream, sleep, chartPromptTemplates };
