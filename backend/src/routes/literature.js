/** 文献检索 / 选题灵感 / 综述生成（异步任务） —— REQ-LIT-01/02 */
const express = require('express');
const store = require('../lib/store');
const { ok, errors, asyncHandler } = require('../lib/respond');
const ai = require('../lib/ai');
const aiModule = require('../ai');
const { auth } = require('./account');

const router = express.Router();

/* ---------- 选题三件套：真实大模型优先（DeepSeek），失败确定性回退演示数据 ---------- */

/** 从模型返回文本中稳健提取首个 JSON 值（容忍 Markdown 代码块与前后缀说明） */
function extractJSON(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.search(/[[{]/);
  if (start < 0) return null;
  const open = raw[start];
  const end = raw.lastIndexOf(open === '[' ? ']' : '}');
  if (end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

const clampScore = (value, dflt) => Math.max(0, Math.min(100, Math.round(Number(value) || dflt)));

/* ---------- 多源文献检索 REQ-LIT-01 ---------- */
router.post('/literature/search', auth, (req, res) => {
  const { query = '', sources = ['arXiv', 'OpenAlex', 'Semantic Scholar', 'PubMed'], year_range = [2020, 2026], has_code = false } = req.body || {};
  if (!query) return errors.param(res, '检索关键词不能为空');
  const kw = query.toLowerCase();
  let items = store.literaturePool.filter((p) => {
    const hit = p.title.toLowerCase().includes(kw) || p.abstract.includes(query) ||
      /micro|expression|facial|emotion|au |transformer/.test(kw) || query.includes('微表情') || query.includes('情感');
    return hit;
  });
  if (has_code) items = items.filter((p) => p.has_code);
  items = items.filter((p) => p.year >= year_range[0] && p.year <= year_range[1]);
  ok(res, {
    items: items.map((p) => ({ ...p, sources })),
    total: items.length,
    dedup_removed: 3,
    search_time_ms: 420,
  });
});

/* ---------- 选题推荐 REQ-LIT-02 ---------- */
router.post('/topic/recommend', auth, asyncHandler(async (req, res) => {
  const { tags = [], history = '' } = req.body || {};
  const direction = Array.isArray(tags) && tags.length ? tags.join(' / ') : '微表情识别';
  let items = null;
  let mode = 'fallback';
  if (aiModule.config.hasKey()) {
    try {
      const result = await aiModule.textModality.generateChatResponse([
        { role: 'user', content: `请针对科研方向「${direction}」${history ? `，结合研究者背景「${String(history).slice(0, 120)}」` : ''}，推荐 4 个高质量学术选题。\n严格只输出一个 JSON 数组，禁止任何解释性文字，每个元素形如：\n{"title":"选题名称","score":88,"heat":"high","reason":"80字内推荐理由，需引用具体文献或基准","risks":["风险1","风险2"],"refs":["关联文献简称"]}\n其中 score 为 0-100 整数，heat 取值 high/medium/low。` },
      ], { temperature: 0.4, max_tokens: 1400 });
      const parsed = extractJSON(result && result.text);
      if (Array.isArray(parsed) && parsed.length) {
        items = parsed.slice(0, 6).map((it, index) => ({
          id: store.id('tp'),
          title: String(it.title || `选题 ${index + 1}`).slice(0, 80),
          score: clampScore(it.score, 70),
          heat: ['high', 'medium', 'low'].includes(it.heat) ? it.heat : 'medium',
          reason: String(it.reason || '').slice(0, 300),
          risks: Array.isArray(it.risks) ? it.risks.map((r) => String(r)).slice(0, 5) : [],
          refs: Array.isArray(it.refs) ? it.refs.map((r) => String(r)).slice(0, 6) : [],
        }));
        mode = 'live';
      }
    } catch (error) {
      console.warn('[ScienceX Topic] 选题推荐真实模型调用失败，回退演示数据:', error.message);
    }
  }
  if (!items) {
    items = [
      { id: store.id('tp'), title: '跨层 AU 交互的微表情识别 Transformer', score: 92, heat: 'high', reason: '与你的 up 系列 AU 分支衔接紧密，文献支撑充分（AUFormer / GraphAU），创新点聚焦"跨层注入"。', risks: ['需与 GraphAU 拉开差异', 'OpenFace 依赖'], refs: ['lit2', 'lit5'] },
      { id: store.id('tp'), title: '扩散模型合成微表情样本缓解类别不均衡', score: 85, heat: 'high', reason: 'CASME II 长尾类痛点明确，CVPR 25 已有先例但未结合 AU 条件。', risks: ['生成质量评估标准未定'], refs: ['lit3'] },
      { id: store.id('tp'), title: '跨数据集（SMIC/CASME II/SAMM）域适应', score: 78, heat: 'medium', reason: '综述指出 12-20 点性能下降是公认难题，学术价值高。', risks: ['工作量大', '适合作为第二篇'], refs: ['lit1'] },
      { id: store.id('tp'), title: '自监督 AU 预训练摆脱标注依赖', score: 74, heat: 'medium', reason: 'T-AFFC 25 对比预训练思路可迁移，与你 AU 主线互补。', risks: ['算力需求较高'], refs: ['lit6'] },
    ];
  }
  ok(res, { items, based_on: { tags, history: history.slice(0, 60) }, mode });
}));

/* ---------- 可行性评估 REQ-LIT-02 ---------- */
router.post('/topic/feasibility', auth, asyncHandler(async (req, res) => {
  const { topic_desc = '' } = req.body || {};
  if (!topic_desc) return errors.param(res, '选题描述不能为空');
  const fallback = () => ({
    topic: topic_desc.slice(0, 50),
    overall: 82,
    verdict: '推荐执行（数据与算力均满足，注意与现有工作的差异化）',
    dimensions: [
      { name: '数据可行性', score: 85, comment: 'CASME II / SMIC / SAMM 均公开，样本量 157-247，LOSO 协议成熟。' },
      { name: '算力可行性', score: 80, comment: 'ViT-B 规模单卡 4090 可训练，80 epochs 约 6-8 小时。' },
      { name: '时间可行性', score: 75, comment: '按 3 个月周期估算：4 周复现 + 6 周实验 + 2 周写作，偏紧但可行。' },
      { name: '创新性', score: 88, comment: '跨层交互与现有单点融合形成清晰差异，AU 噪声鲁棒性可作为第二创新点。' },
      { name: '发表前景', score: 82, comment: '目标 ACM MM / T-AFFC 合理；若 UF1 达到 0.75+ 可冲击 CVPR。' },
    ],
    key_refs: ['lit1', 'lit2', 'lit5'],
  });
  let data = null;
  let mode = 'fallback';
  if (aiModule.config.hasKey()) {
    try {
      const result = await aiModule.textModality.generateChatResponse([
        { role: 'user', content: `请评估以下科研选题的可行性：「${topic_desc}」。\n严格只输出一个 JSON 对象，禁止解释性文字：\n{"overall":82,"verdict":"一句话总结论","dimensions":[{"name":"数据可行性","score":85,"comment":"80字内评价"}],"key_refs":["关键文献简称"]}\ndimensions 必须包含 5 个维度：数据可行性、算力可行性、时间可行性、创新性、发表前景；score 为 0-100 整数。` },
      ], { temperature: 0.3, max_tokens: 1200 });
      const parsed = extractJSON(result && result.text);
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.dimensions) && parsed.dimensions.length) {
        data = {
          topic: topic_desc.slice(0, 50),
          overall: clampScore(parsed.overall, 75),
          verdict: String(parsed.verdict || '').slice(0, 120),
          dimensions: parsed.dimensions.slice(0, 8).map((d) => ({
            name: String(d.name || '维度').slice(0, 20),
            score: clampScore(d.score, 70),
            comment: String(d.comment || '').slice(0, 200),
          })),
          key_refs: Array.isArray(parsed.key_refs) ? parsed.key_refs.map((r) => String(r)).slice(0, 8) : [],
        };
        mode = 'live';
      }
    } catch (error) {
      console.warn('[ScienceX Topic] 可行性评估真实模型调用失败，回退演示数据:', error.message);
    }
  }
  if (!data) data = fallback();
  ok(res, { ...data, mode });
}));

/* ---------- 开题报告 REQ-LIT-02 ---------- */
router.post('/topic/proposal', auth, (req, res) => {
  const { topic = '', refs = [] } = req.body || {};
  const title = topic || '跨层 AU 交互的微表情识别研究';
  const task = ai.createTask('proposal', ['检索相关文献', '生成大纲', '撰写正文', '格式化导出'], async () => {
    let content = null;
    let mode = 'fallback';
    if (aiModule.config.hasKey()) {
      try {
        const result = await aiModule.textModality.generateChatResponse([
          { role: 'user', content: `请为主题「${title}」撰写一份开题报告正文（Markdown 格式，约 1200 字），包含以下章节：一、选题背景与意义；二、国内外研究现状；三、研究内容与目标；四、研究方案与技术路线；五、创新点；六、进度安排。语言严谨，可直接用于开题答辩。` },
        ], { temperature: 0.4, max_tokens: 2200 });
        if (result && result.text && result.text.length > 200) {
          content = result.text;
          mode = 'live';
        }
      } catch (error) {
        console.warn('[ScienceX Topic] 开题报告真实模型生成失败，回退演示模板:', error.message);
      }
    }
    return {
      doc_id: store.id('doc'),
      file_name: `开题报告_${title.slice(0, 12)}.docx`,
      outline: ['一、选题背景与意义', '二、国内外研究现状', '三、研究内容与目标', '四、研究方案与技术路线', '五、创新点', '六、进度安排', '七、参考文献'],
      content_preview: content || `# ${title} 开题报告\n\n## 一、选题背景与意义\n微表情识别在测谎、临床与安全领域应用广泛……\n（演示环境生成约 3800 字结构化正文，可导出 Word/PDF）`,
      mode,
    };
  }, req.user.id);
  ok(res, { task_id: task.id }, '开题报告生成任务已提交');
});

/* ---------- 综述生成（异步任务） REQ-LIT-01 ---------- */
router.post('/literature/review', auth, (req, res) => {
  const { topic = '', range = [2020, 2026] } = req.body || {};
  if (!topic) return errors.param(res, '综述主题不能为空');
  const task = ai.createTask('review', ['多源检索文献', '去重与筛选', '阅读提取要点', '撰写综述正文', '生成参考文献'], () => ({
    topic, papers_used: 42,
    outline: ['1. 引言', '2. 数据集与评测协议', '3. 方法演进：手工特征到 Transformer', '4. 统一协议下的对比分析', '5. 开放问题', '6. 结论'],
    content_preview: `# ${topic} 研究综述\n\n## 1. 引言\n本文系统梳理 ${range[0]}-${range[1]} 年间 ${topic} 领域的代表性工作……\n（演示环境生成约 6000 字带引用草稿）`,
  }), req.user.id);
  ok(res, { task_id: task.id }, '综述生成任务已提交');
});

/* ---------- 异步任务：查询与 SSE 进度（TSD §3.8 / §5.4 progress 事件） ---------- */
router.get('/tasks/:id', auth, (req, res) => {
  const task = store.tasks.get(req.params.id);
  if (!task || (task.owner_id ? task.owner_id !== req.user.id : req.user.id !== 'u1')) return errors.notFound(res, '任务不存在');
  const { listeners, events, ...rest } = task;
  ok(res, rest);
});

router.get('/tasks/:id/stream', auth, (req, res) => {
  const task = store.tasks.get(req.params.id);
  if (!task || (task.owner_id ? task.owner_id !== req.user.id : req.user.id !== 'u1')) return errors.notFound(res, '任务不存在');
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 3000\n\n');
  const lastEventId = Number.parseInt(req.get('Last-Event-ID') || req.query.last_event_id || '0', 10) || 0;
  const send = (entry) => {
    if (!res.writableEnded) res.write(`id: ${entry.id}\nevent: ${entry.event}\ndata: ${JSON.stringify(entry.data)}\n\n`);
  };
  const heartbeat = setInterval(() => { if (!res.writableEnded) res.write(': ping\n\n'); }, 15000);
  let replayCutoff = task.event_seq || 0;
  const cleanup = () => {
    clearInterval(heartbeat);
    const index = task.listeners.indexOf(listener);
    if (index >= 0) task.listeners.splice(index, 1);
  };
  const listener = (_task, entry) => {
    if (entry.id <= replayCutoff) return;
    send(entry);
    if (entry.event === 'done' || entry.event === 'error') {
      cleanup();
      if (!res.writableEnded) res.end();
    }
  };
  task.listeners.push(listener);
  const history = Array.isArray(task.events)
    ? task.events.filter((entry) => entry.id > lastEventId && entry.id <= replayCutoff)
    : [];
  if (history.length) history.forEach(send);
  else if (!['done', 'failed'].includes(task.status)) {
    send({ id: replayCutoff || 1, event: 'progress', data: { task_id: task.id, percent: task.percent, stage: task.stage } });
  }
  if (['done', 'failed'].includes(task.status)) {
    cleanup();
    return res.end();
  }
  res.once('close', cleanup);
});

module.exports = { router };
