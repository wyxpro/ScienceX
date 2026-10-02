/** 文献检索 / 选题灵感 / 综述生成（异步任务） —— REQ-LIT-01/02 */
const express = require('express');
const store = require('../lib/store');
const { ok, errors } = require('../lib/respond');
const ai = require('../lib/ai');
const { auth } = require('./account');

const router = express.Router();

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
router.post('/topic/recommend', auth, (req, res) => {
  const { tags = [], history = '' } = req.body || {};
  ok(res, {
    items: [
      { id: store.id('tp'), title: '跨层 AU 交互的微表情识别 Transformer', score: 92, heat: 'high', reason: '与你的 up 系列 AU 分支衔接紧密，文献支撑充分（AUFormer / GraphAU），创新点聚焦"跨层注入"。', risks: ['需与 GraphAU 拉开差异', 'OpenFace 依赖'], refs: ['lit2', 'lit5'] },
      { id: store.id('tp'), title: '扩散模型合成微表情样本缓解类别不均衡', score: 85, heat: 'high', reason: 'CASME II 长尾类痛点明确，CVPR 25 已有先例但未结合 AU 条件。', risks: ['生成质量评估标准未定'], refs: ['lit3'] },
      { id: store.id('tp'), title: '跨数据集（SMIC/CASME II/SAMM）域适应', score: 78, heat: 'medium', reason: '综述指出 12-20 点性能下降是公认难题，学术价值高。', risks: ['工作量大', '适合作为第二篇'], refs: ['lit1'] },
      { id: store.id('tp'), title: '自监督 AU 预训练摆脱标注依赖', score: 74, heat: 'medium', reason: 'T-AFFC 25 对比预训练思路可迁移，与你 AU 主线互补。', risks: ['算力需求较高'], refs: ['lit6'] },
    ],
    based_on: { tags, history: history.slice(0, 60) },
  });
});

/* ---------- 可行性评估 REQ-LIT-02 ---------- */
router.post('/topic/feasibility', auth, (req, res) => {
  const { topic_desc = '' } = req.body || {};
  if (!topic_desc) return errors.param(res, '选题描述不能为空');
  ok(res, {
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
});

/* ---------- 开题报告 REQ-LIT-02 ---------- */
router.post('/topic/proposal', auth, (req, res) => {
  const { topic = '', refs = [] } = req.body || {};
  const task = ai.createTask('proposal', ['检索相关文献', '生成大纲', '撰写正文', '格式化导出'], () => ({
    doc_id: store.id('doc'),
    file_name: `开题报告_${topic.slice(0, 12) || '微表情识别'}.docx`,
    outline: ['一、选题背景与意义', '二、国内外研究现状', '三、研究内容与目标', '四、研究方案与技术路线', '五、创新点', '六、进度安排', '七、参考文献'],
    content_preview: `# ${topic || '跨层 AU 交互的微表情识别研究'} 开题报告\n\n## 一、选题背景与意义\n微表情识别在测谎、临床与安全领域应用广泛……\n（演示环境生成约 3800 字结构化正文，可导出 Word/PDF）`,
  }));
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
  }));
  ok(res, { task_id: task.id }, '综述生成任务已提交');
});

/* ---------- 异步任务：查询与 SSE 进度（TSD §3.8 / §5.4 progress 事件） ---------- */
router.get('/tasks/:id', auth, (req, res) => {
  const task = store.tasks.get(req.params.id);
  if (!task) return errors.notFound(res, '任务不存在');
  const { listeners, ...rest } = task;
  ok(res, rest);
});

router.get('/tasks/:id/stream', auth, (req, res) => {
  const task = store.tasks.get(req.params.id);
  if (!task) return errors.notFound(res, '任务不存在');
  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  send('progress', { task_id: task.id, percent: task.percent, stage: task.stage });
  if (task.status === 'done') {
    send('done', { task_id: task.id, result: task.result });
    return res.end();
  }
  const listener = (t) => {
    send('progress', { task_id: t.id, percent: t.percent, stage: t.stage });
    if (t.status === 'done') {
      send('done', { task_id: t.id, result: t.result });
      res.end();
    }
  };
  task.listeners.push(listener);
  req.on('close', () => {
    const i = task.listeners.indexOf(listener);
    if (i >= 0) task.listeners.splice(i, 1);
  });
});

module.exports = { router };
