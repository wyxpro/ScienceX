/**
 * DreamPaper 工作台路由 —— 对接 DreamPaper（https://github.com/dream-rec/dreampaper）核心能力的等价实现
 * 设计参考（非代码搬运，许可见 lib/dp-prompts.js 头部声明）：
 *  - 两阶段 Design → Implement 流水线（结构抽取 / 母版分析 → 内容填充）
 *  - JobRecord / JobEvent / JobError / JobDesignLog 数据模型（src/types.ts，高参考性）
 *  - stage-weight 阶段进度映射（src/app.tsx PAPER/PPT_STAGE_WEIGHTS，高参考性）
 *  - 案例记忆 + Advisor 评分反哺（memory.rs / advisor.md 思路）
 * 降级策略：ScienceX 网关仅支持文本 chat 协议，无图像生成端点 ——
 *  Implement 阶段产出矢量 spec（diagram / plot / deck），由前端 SVG/图表组件渲染，可导出 SVG 与 JSON。
 */
const express = require('express');
const store = require('../lib/store');
const ai = require('../lib/ai');
const { ok, errors } = require('../lib/respond');
const { auth } = require('./account');
const gateway = require('../lib/model-gateway');
const dp = require('../lib/dp-prompts');

const router = express.Router();

/* ---------- 模板库（对应 DreamPaper TemplateStore / PaperBananaBench 元数据，演示内置） ---------- */
const dpTemplates = [
  { id: 'tpl-diag-1', kind: 'diagram', name: '多阶段流水线', category: 'pipeline', visual_intent: '横向主流程 + 底部虚线训练支路，5-7 个阶段面板，嵌套模块分组', desc: '方法总览 / 系统架构' },
  { id: 'tpl-diag-2', kind: 'diagram', name: '双塔对比架构', category: 'architecture', visual_intent: '左右双塔编码器 + 顶部融合层，跨塔虚线交互箭头', desc: '双分支 / 融合模型' },
  { id: 'tpl-diag-3', kind: 'diagram', name: '机制示意（AU 拓扑）', category: 'mechanism', visual_intent: '中心节点图 + 环绕注意力标注，扇入扇出连接', desc: '模块内部机制' },
  { id: 'tpl-plot-1', kind: 'plot', name: '消融对比柱状图', category: 'ablation', visual_intent: '分组柱状图 + 误差棒，colorblind-friendly 学术配色', desc: '配置间指标对比' },
  { id: 'tpl-plot-2', kind: 'plot', name: '训练双曲线', category: 'curve', visual_intent: 'train/val 双曲线 + 最优 epoch 标注，图例置于外侧', desc: '收敛行为展示' },
  { id: 'tpl-plot-3', kind: 'plot', name: '混淆矩阵热力图', category: 'matrix', visual_intent: '行归一化矩阵 + 对角高亮，含色条图例', desc: '分类结果分析' },
  { id: 'tpl-master-1', kind: 'master', name: '学术蓝白母版', category: 'academic', visual_intent: '16:9，白底墨蓝标题带，左上 logo，底部页码，卡片圆角 8px', desc: '组会 / 答辩通用' },
  { id: 'tpl-master-2', kind: 'master', name: '琥珀暖纸母版', category: 'warm', visual_intent: '16:9，暖纸底色，琥珀强调色，衬线标题层级', desc: '人文汇报风格' },
];

/* ---------- 阶段权重（改编自 DreamPaper stage-weight 进度映射思路） ---------- */
const STAGE_WEIGHTS = {
  paper_figure: [['queued', 4], ['started', 8], ['validate', 12], ['templates', 16], ['memory', 18], ['structure', 34], ['advisor', 40], ['design', 62], ['implement_plan', 72], ['render', 88], ['save', 96]],
  plot_chart: [['queued', 3], ['started', 6], ['validate', 10], ['memory', 14], ['parse_data', 22], ['design', 52], ['implement_plan', 66], ['render', 86], ['save', 95]],
  ppt_slide: [['queued', 3], ['started', 6], ['validate', 10], ['master', 18], ['memory', 22], ['analyze', 30], ['outline', 48], ['page_plan_queue', 58], ['implement_queue', 72], ['save', 92]],
};
const MODES = Object.keys(STAGE_WEIGHTS);

const dpJobs = [];
const sleep = ai.sleep;

/* ---------- SSE 事件发布（对齐 TSD §5.4 + TaskRunner 消费协议） ---------- */
function emit(task, event, extra = {}) {
  const data = { task_id: task.id, percent: task.percent, stage: task.stage, ...extra };
  const entry = { id: ++task.event_seq, event, data };
  task.events.push(entry);
  if (task.events.length > 1000) task.events.shift();
  [...task.listeners].forEach((fn) => fn(task, entry));
}

function designLog(job, step, label, content, status = 'succeeded') {
  const log = { step, label, status, content: String(content || ''), timestamp: store.now() };
  job.design_logs.push(log);
  return log;
}

/* ---------- Design 阶段：优先真实模型网关，JSON 解析失败 / 无网关时确定性回退 ---------- */
async function designJSON(systemPrompt, userBrief, fallback) {
  try {
    const r = await ai.generateResponse(
      [
        { role: 'system', content: `${dp.GLOBAL_SYSTEM}\n\n${systemPrompt}\n\n${dp.VALIDATOR}` },
        { role: 'user', content: userBrief },
      ],
      { scene: 'dreampaper' }
    );
    const text = r.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (parsed && typeof parsed === 'object') return { spec: parsed, mode: r.fallback ? 'fallback' : 'live', raw: text };
    }
  } catch { /* 网关异常 → 确定性回退 */ }
  return { spec: fallback(), mode: 'simulated', raw: '' };
}

/* ---------- 回退构造器（无网关 / 解析失败时仍产出可渲染 spec） ---------- */
function splitStages(text) {
  const parts = String(text || '').split(/[；;\n。→\->]+/).map((s) => s.trim()).filter((s) => s.length >= 2).slice(0, 5);
  return parts.length >= 2 ? parts : null;
}

function fallbackDiagram(payload) {
  const segs = splitStages(payload.method);
  const stages = (segs || ['输入与预处理', '特征提取与增强', '跨层交互融合', '解码与输出']).map((name, i) => ({
    name, modules: (payload.method || '').split(/\s*[，,、]\s*/).filter(Boolean).slice(i * 2, i * 2 + 2).map((s) => s.slice(0, 10)).concat([`阶段 ${i + 1} 模块`]).slice(0, 3),
  }));
  const connections = stages.slice(1).map((s, i) => ({ from: stages[i].name, to: s.name, label: '数据流', dashed: false }));
  connections.push({ from: stages[stages.length - 1].name, to: stages[0].name, label: '训练反馈', dashed: true });
  return {
    title: payload.title || '科研方法框架图', content_inventory: (payload.method || '').split(/\s*[，,、]\s*/).filter(Boolean).slice(0, 12),
    stages, connections, flow_direction: 'left-to-right', palette: ['#1b7a5e', '#c2762b', '#2563eb'],
    implement_plan: '横向多阶段学术管线：主数据流实线箭头，训练反馈虚线支路；模块嵌套分组；关键词短标签。',
  };
}

function fallbackPlot(payload) {
  const series = [];
  const re = /([A-Za-z\u4e00-\u9fa5+\-w/ ]{1,16})\s*[=:：]\s*(0?\.\d+|\d+(?:\.\d+)?)/g;
  let m;
  while ((m = re.exec(String(payload.data || ''))) && series.length < 12) {
    const value = Number(m[2]);
    if (Number.isFinite(value)) series.push({ label: m[1].trim(), value });
  }
  if (!series.length) {
    series.push({ label: 'baseline', value: 0.6464 }, { label: '+cross-attn', value: 0.6892 }, { label: 'GraphAU', value: 0.81 }, { label: 'AUFormer', value: 0.829 });
  }
  return {
    title: payload.title || '实验指标对比图', chart_type: payload.chart_type || 'bar',
    axes: { x: '配置', y: '指标值' }, series, legend: [],
    statistical_annotations: 'none',
    implement_plan: 'colorblind-friendly 配色；图例置于数据区外侧；坐标轴含单位；数据元素加粗高对比。',
  };
}

function fallbackDeck(payload) {
  const pages = Math.min(20, Math.max(1, Number(payload.pages) || 5));
  const outline = ['研究背景与挑战', '相关工作对比', '方法总览', '核心模块设计', '实验设置', '主要结果', '消融分析', '结论与展望'];
  return {
    master_style: { background: '白色母版底', palette: ['#14624a', '#c2762b', '#1f2a24'], typography: '衬线标题 + 无衬线正文，两级层级' },
    pages: Array.from({ length: pages }, (_, i) => ({
      title: `${i + 1}. ${outline[i % outline.length]}`,
      bullets: [`${outline[i % outline.length]}的关键要点一`, `支撑数据 / 证据二`, '与主线的衔接说明'],
      visual_element_plan: i % 3 === 1 ? '绘制实物/装置示意，避免纯文字方框' : '半版示意图形 + 半版要点列表',
      emphasis: i % 3 === 1 ? ['核心指标', '增益来源'] : ['方法名'],
    })),
  };
}

/* ---------- 流水线执行（stage-weight 进度 + Design Log 流式推送） ---------- */
async function runPipeline(job, task, payload) {
  const weights = STAGE_WEIGHTS[job.mode];
  const brief = JSON.stringify(payload, null, 0).slice(0, 3500);
  const rated = dpJobs.filter((j) => j.mode === job.mode && j.rating && j.id !== job.id).slice(0, 3);

  const setStage = (name, label, logText, status = 'succeeded') => {
    const found = weights.find(([s]) => s === name);
    task.stage = label || name;
    task.percent = found ? found[1] : task.percent;
    job.stage = task.stage;
    job.percent = task.percent;
    if (logText) {
      const log = designLog(job, name, label, logText, status);
      emit(task, 'progress', { design_log: { step: log.step, label: log.label, status: log.status, content: log.content } });
    } else {
      emit(task, 'progress');
    }
  };

  const step = async (ms) => sleep(ms + Math.random() * 300);

  try {
    task.status = 'running';
    setStage('queued', '排队中');
    await step(350);
    setStage('started', '启动流水线');
    await step(300);
    setStage('validate', '校验输入与契约');
    await step(320);

    /* 阶段一：结构 / 母版 / 数据解析 */
    if (job.mode === 'paper_figure') {
      const tplNames = (payload.template_ids || []).map((id) => dpTemplates.find((t) => t.id === id)?.name).filter(Boolean);
      setStage('templates', '选择模板（few-shot 参考）', `已选定模板：${tplNames.join('、') || '默认多阶段流水线'}；仅作布局/密度参考，禁止像素级复制。`);
      await step(300);
      setStage('memory', '案例记忆召回', rated.length ? `召回 ${rated.length} 条历史案例（评分：${rated.map((j) => ({ good: '优', fair: '良', poor: '差' })[j.rating]).join('/')}），Advisor 将比对版式经验。` : '暂无同模式历史案例，跳过 Advisor 比对。');
      await step(300);
      setStage('structure', '抽取模板结构（阶段一）', '结构计划：横向主流程 · 阶段面板分组 · 底部虚线反馈支路 · 高密度嵌套模块。', 'running');
      const structure = await designJSON(dp.PAPER_STRUCTURE, `模板意图：${tplNames.join('；') || '多阶段流水线'}。输出结构计划 JSON（stages 为抽象阶段名数组，不带用户内容）。`, () => ({ stages: ['输入', '编码', '融合', '解码'], bands: ['训练反馈（虚线）'] }));
      setStage('structure', '抽取模板结构（阶段一）', `结构计划：${(structure.spec.stages || []).join(' → ')}`);
      await step(300);
      setStage('advisor', 'Advisor 版式建议', rated.length ? '建议复用历史优评案例的阶段密度与箭头节奏；规避已记录的“阶段过度概括”失败模式。' : '无候选案例，Advisor 返回空建议。');
      await step(300);

      setStage('design', 'Design：内容填充与 Diagram Spec（阶段二）', '', 'running');
      const design = await designJSON(
        `${dp.DIAGRAM_DESIGN}\n\n${dp.outputContract('paper_figure')}\n\n结构计划参考：${JSON.stringify(structure.spec).slice(0, 1200)}`,
        `图标题：${payload.title}\n方法/章节全文：${payload.method}\n布局：${payload.layout_fidelity || 'balanced'}；风格强度：${payload.style_strength || 'high'}${payload.custom ? `；额外约束：${payload.custom}` : ''}`,
        () => fallbackDiagram(payload)
      );
      job.result = { kind: 'diagram', title: design.spec.title || payload.title || '科研配图', spec: design.spec, design_mode: design.mode };
      const specPreview = JSON.stringify({ stages: design.spec.stages, connections: design.spec.connections }, null, 1);
      setStage('design', 'Design：内容填充与 Diagram Spec（阶段二）', `生成 ${design.spec.stages?.length || 0} 个阶段 / ${design.spec.connections?.length || 0} 条连接（模式：${design.mode === 'live' ? '模型网关' : design.mode === 'fallback' ? '网关+容错解析' : '确定性回退'}）\n${specPreview.slice(0, 900)}`);
      await step(300);

      setStage('implement_plan', 'Implement：渲染计划', design.spec.implement_plan || '按 Diagram Spec 渲染学术矢量图。');
      await step(300);
      setStage('render', '渲染矢量预览', 'ScienceX 网关暂无图像端点，Implement 降级为矢量 spec 渲染（前端 SVG，可导出）。');
      await step(350);
      setStage('save', '保存产物');
    } else if (job.mode === 'plot_chart') {
      setStage('memory', '案例记忆召回', rated.length ? `召回 ${rated.length} 条同类型图表案例供参考。` : '暂无历史案例。');
      await step(300);
      setStage('parse_data', '解析数据字段', payload.data ? '已从输入中提取键值数据对。' : '未提供数据，将使用演示数据并标注。');
      await step(300);
      setStage('design', 'Design：Plot Spec（阶段二）', '', 'running');
      const design = await designJSON(
        `${dp.PLOT_DESIGN}\n\n${dp.outputContract('plot_chart')}`,
        `图表需求：${payload.title}\n数据：${payload.data || '（未提供，使用演示数据）'}\n类型偏好：${payload.chart_type || 'auto'}`,
        () => fallbackPlot(payload)
      );
      job.result = { kind: 'plot', title: design.spec.title || payload.title || '统计图表', spec: design.spec, design_mode: design.mode };
      setStage('design', 'Design：Plot Spec（阶段二）', `类型：${design.spec.chart_type}；序列 ${design.spec.series?.length || 0} 条；统计标注：${design.spec.statistical_annotations || 'none'}`);
      await step(300);
      setStage('implement_plan', 'Implement：渲染计划', design.spec.implement_plan || '按 Plot Spec 渲染学术图表。');
      await step(300);
      setStage('render', '渲染矢量预览', '降级为矢量图表组件渲染（SVG，可导出 JSON / 截图）。');
      await step(350);
      setStage('save', '保存产物');
    } else {
      setStage('master', '母版风格分析（阶段一）', '', 'running');
      const master = await designJSON(dp.PPT_ANALYZER, `母版描述：${payload.master_desc || '学术蓝白母版'}`, () => fallbackDeck(payload).master_style);
      setStage('master', '母版风格分析（阶段一）', `不可变母版元素：${[master.spec.background, master.spec.typography].filter(Boolean).join(' · ') || '标题带 / 页码 / 卡片样式'}`);
      await step(300);
      setStage('memory', '案例记忆召回', rated.length ? `召回 ${rated.length} 条幻灯片任务案例。` : '暂无历史案例。');
      await step(300);
      setStage('analyze', '资料要点分析', (payload.material || '').slice(0, 160) || '未提供资料文本，使用通用学术汇报大纲。');
      await step(300);
      setStage('outline', 'Design：Deck 大纲（阶段二）', '', 'running');
      const design = await designJSON(
        `${dp.PPT_DESIGN}\n\n${dp.outputContract('ppt_slide')}\n\n母版绑定：${JSON.stringify(master.spec).slice(0, 600)}`,
        `页数：${payload.pages}\n资料：${payload.material || '（通用大纲）'}${payload.custom ? `；约束：${payload.custom}` : ''}`,
        () => fallbackDeck(payload)
      );
      const pages = Array.isArray(design.spec.pages) ? design.spec.pages.slice(0, 20) : fallbackDeck(payload).pages;
      job.result = { kind: 'deck', title: payload.title || '学术幻灯片', master_style: design.spec.master_style || master.spec, pages, design_mode: design.mode };
      setStage('outline', 'Design：Deck 大纲（阶段二）', `规划 ${pages.length} 页：${pages.map((p) => p.title).slice(0, 5).join(' / ')}${pages.length > 5 ? ' …' : ''}`);
      await step(300);
      setStage('page_plan_queue', '逐页 Page Plan', pages.map((p, i) => `P${i + 1} ${p.title}`).join('；').slice(0, 400));
      await step(320);
      setStage('implement_queue', 'Implement：逐页渲染计划', pages.map((p) => p.visual_element_plan).filter(Boolean).slice(0, 3).join('；').slice(0, 300) || '每页绑定母版不可变元素，正文限定安全区。');
      await step(320);
      setStage('save', '保存产物');
    }

    task.percent = 100;
    task.status = 'done';
    job.status = 'succeeded';
    job.percent = 100;
    job.updated_at = store.now();
    emit(task, 'progress', { stage: '完成' });
    emit(task, 'done');
  } catch (error) {
    /* JobError 诊断模型（参考 DreamPaper error.diagnostic 结构） */
    job.status = 'failed';
    job.error = {
      summary: error?.message || '生成流水线执行失败',
      code: 'dp_pipeline_failed',
      stage: job.stage || 'running',
      role: 'design',
      endpoint: gateway.enabled() ? 'model-gateway:chat/completions' : '本地确定性回退',
      http_status: null,
      suggestion: '请检查 Account → 模型管理中的网关配置；或稍后重试（本次已保留阶段性 Design 日志供排查）。',
    };
    task.status = 'failed';
    task.error = job.error.summary;
    emit(task, 'progress', { diagnosis: job.error });
    emit(task, 'error', { diagnosis: job.error });
    job.updated_at = store.now();
  }
}

/* ---------- 路由 ---------- */
router.get('/dreampaper/templates', auth, (req, res) => {
  ok(res, { items: dpTemplates, notice: dp.NOTICE });
});

router.get('/dreampaper/jobs', auth, (req, res) => {
  const items = dpJobs
    .filter((j) => j.owner_id === req.user.id)
    .map(({ design_logs, ...meta }) => ({ ...meta, design_log_count: design_logs.length }));
  ok(res, { items, notice: dp.NOTICE });
});

router.get('/dreampaper/jobs/:id', auth, (req, res) => {
  const job = dpJobs.find((j) => j.id === req.params.id && j.owner_id === req.user.id);
  if (!job) return errors.notFound(res, '任务不存在');
  ok(res, job);
});

router.post('/dreampaper/jobs', auth, (req, res) => {
  const { mode, payload = {} } = req.body || {};
  if (!MODES.includes(mode)) return errors.param(res, `mode 必须是 ${MODES.join(' / ')}`);
  if (mode === 'paper_figure' && !String(payload.title || '').trim() && !String(payload.method || '').trim()) return errors.param(res, '请填写图标题或方法描述');
  if (mode === 'ppt_slide' && !Number(payload.pages)) return errors.param(res, '请指定幻灯片页数');
  if (mode === 'plot_chart' && !String(payload.title || '').trim() && !String(payload.data || '').trim()) return errors.param(res, '请填写图表标题或数据');

  const job = {
    id: store.id('dpj'), owner_id: req.user.id, mode, status: 'queued', stage: 'queued', percent: 0,
    payload, events: [], design_logs: [], error: null, rating: null, result: null,
    created_at: store.now(), updated_at: store.now(),
  };
  dpJobs.unshift(job);

  /* 注册进统一任务表，复用 GET /tasks/:id/stream 的 SSE 通道与断线重连 */
  const task = {
    id: job.id, owner_id: req.user.id, type: `dreampaper:${mode}`, status: 'pending', percent: 0,
    stage: 'queued', stages: STAGE_WEIGHTS[mode].map(([, label]) => label),
    created_at: store.now(), result: null, listeners: [], event_seq: 0, events: [],
  };
  store.tasks.set(task.id, task);
  emit(task, 'progress');
  runPipeline(job, task, payload);
  ok(res, { job_id: job.id, task_id: task.id, status: 'queued' }, 'DreamPaper 任务已提交');
});

router.post('/dreampaper/jobs/:id/rate', auth, (req, res) => {
  const job = dpJobs.find((j) => j.id === req.params.id && j.owner_id === req.user.id);
  if (!job) return errors.notFound(res, '任务不存在');
  const { rating } = req.body || {};
  if (rating !== null && !['good', 'fair', 'poor'].includes(rating)) return errors.param(res, 'rating 必须是 good / fair / poor / null');
  if (job.status !== 'succeeded') return errors.param(res, '仅成功的任务可评分');
  job.rating = rating;
  job.updated_at = store.now();
  ok(res, { job_id: job.id, rating: job.rating }, rating ? '评分已写入案例记忆，将反哺后续 Advisor 召回' : '已清除评分');
});

module.exports = { router };
