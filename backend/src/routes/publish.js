/** 投稿助手 / 组会汇报 / 专家评审团 / 项目与课题组 —— REQ-SUB-01, REQ-SPC-01/02, REQ-PRJ-01 */
const express = require('express');
const store = require('../lib/store');
const { ok, errors } = require('../lib/respond');
const ai = require('../lib/ai');
const { auth } = require('./account');
const { canAccess } = require('../lib/access');

const router = express.Router();

/* ---------- CCF 期刊大全 REQ-SUB-01 ---------- */
router.get('/journals', auth, (req, res) => {
  const { ccf, field, keyword } = req.query;
  let items = store.journals;
  if (ccf) items = items.filter((j) => j.ccf === ccf);
  if (field) items = items.filter((j) => j.field.includes(field));
  if (keyword) items = items.filter((j) => j.name.toLowerCase().includes(String(keyword).toLowerCase()));
  items = items.map((j) => {
    const track = store.submissionTracks.find((t) => t.journal_id === j.id && canAccess(t, req.user.id));
    const days = j.deadline ? Math.ceil((new Date(j.deadline) - Date.now()) / 86400000) : null;
    return { ...j, days_left: days, tracked: !!track, track_status: track?.status || null };
  });
  ok(res, { items, total: items.length });
});

/* ---------- 投稿追踪 REQ-SUB-01 ---------- */
router.get('/submission-tracks', auth, (req, res) => {
  const items = store.submissionTracks.filter((t) => canAccess(t, req.user.id)).map((t) => ({
    ...t, days_left: Math.ceil((new Date(t.deadline) - Date.now()) / 86400000),
  }));
  ok(res, { items });
});

router.post('/submission-tracks', auth, (req, res) => {
  const { journal_id } = req.body || {};
  const journal = store.journals.find((j) => j.id === journal_id);
  if (!journal) return errors.notFound(res, '期刊不存在');
  const track = { id: store.id('st'), user_id: req.user.id, journal_id, journal_name: journal.name, status: 'watching', deadline: journal.deadline, note: '', created_at: store.now() };
  store.submissionTracks.push(track);
  ok(res, { ...track, days_left: journal.deadline ? Math.ceil((new Date(journal.deadline) - Date.now()) / 86400000) : null }, `已关注 ${journal.name}`);
});

router.delete('/submission-tracks/:id', auth, (req, res) => {
  const idx = store.submissionTracks.findIndex((t) => t.id === req.params.id && canAccess(t, req.user.id));
  if (idx < 0) return errors.notFound(res, '追踪记录不存在');
  store.submissionTracks.splice(idx, 1);
  ok(res, {}, '已取消关注');
});

router.patch('/submission-tracks/:id', auth, (req, res) => {
  const track = store.submissionTracks.find((t) => t.id === req.params.id && canAccess(t, req.user.id));
  if (!track) return errors.notFound(res, '追踪记录不存在');
  for (const field of ['status', 'note']) {
    if (req.body?.[field] !== undefined) track[field] = req.body[field];
  }
  ok(res, track, '状态已更新');
});

/* ---------- 期刊匹配 REQ-SUB-01 ---------- */
router.post('/journals/match', auth, (req, res) => {
  const { abstract = '' } = req.body || {};
  if (!abstract) return errors.param(res, '论文摘要不能为空');
  ok(res, {
    items: [
      { journal_id: 'j3', name: 'ACM Multimedia', ccf: 'A', score: 91, reason: '主题高度契合（情感计算 + 多媒体），近三年收录 40+ 篇 MER 论文，接受率 23%', deadline: store.daysAhead(96) },
      { journal_id: 'j6', name: 'IEEE T-AFFC', ccf: 'B', score: 86, reason: '情感计算旗舰期刊，MER 工作引用率高，审稿周期约 3 个月，适合作为稳妥选择', deadline: null },
      { journal_id: 'j1', name: 'CVPR', ccf: 'A', score: 74, reason: '需要更强的通用视觉创新点，建议 UF1 达到 0.75+ 后再考虑', deadline: store.daysAhead(58) },
      { journal_id: 'j9', name: 'FG', ccf: 'C', score: 68, reason: '人脸方向专项会议，保底选择，审稿快', deadline: store.daysAhead(23) },
    ],
  });
});

/* ---------- 组会汇报：PPT 生成 REQ-SPC-01 ---------- */
router.post('/deck/generate', auth, (req, res) => {
  const { source = '', template = 'academic' } = req.body || {};
  const task = ai.createTask('deck', ['解析研究内容', '生成 PPT 大纲', '填充每页内容', '套用模板渲染', '导出 .pptx'], () => ({
    file_name: `组会汇报_${source.slice(0, 10) || 'up9实验进展'}.pptx`,
    pages: 12,
    outline: [
      { page: 1, title: '封面', note: '题目 · 汇报人 · 日期' },
      { page: 2, title: '上周工作回顾', note: 'up9 baseline 完成，UF1=0.6464' },
      { page: 3, title: '本周进展：跨层 AU 交互', note: '动机 + 架构图' },
      { page: 5, title: '消融实验结果', note: '对比表 + 柱状图' },
      { page: 8, title: '问题与讨论', note: 'OpenFace 噪声 / 种子方差' },
      { page: 10, title: '下周计划', note: 'flow-boost 训练 + SAMM 验证' },
    ],
    download_url: `/api/v1/static/decks/demo.pptx`,
  }), req.user.id);
  ok(res, { task_id: task.id }, 'PPT 生成任务已提交');
});

/* ---------- 导师建议记录 REQ-SPC-01 ---------- */
router.get('/advice', auth, (req, res) => ok(res, { items: store.adviceRecords }));

router.post('/advice/extract', auth, (req, res) => {
  const { text = '', audio = false } = req.body || {};
  if (!text && !audio) return errors.param(res, '请提供会议记录文本或音频');
  ok(res, {
    meeting: `组会 · ${new Date().toISOString().slice(0, 10)}`,
    from: '韩老师',
    items: [
      { category: '实验', content: '补 3 个随机种子（7/13/42），报告均值±方差。', status: 'todo', todo: '补充随机种子实验' },
      { category: '写作', content: 'Introduction 贡献点用 bullet 列 3 条，避免大段文字。', status: 'todo', todo: '改写 Introduction' },
      { category: '文献', content: '关注 MER 2024 Challenge 的评测口径变化。', status: 'todo', todo: '阅读技术报告' },
    ],
    source: audio ? '语音转写 + LLM 抽取' : 'LLM 结构化抽取',
  });
});

router.patch('/advice/:id', auth, (req, res) => {
  const a = store.adviceRecords.find((x) => x.id === req.params.id && canAccess(x, req.user.id));
  if (!a) return errors.notFound(res, '建议记录不存在');
  for (const field of ['status', 'todo', 'content']) {
    if (req.body?.[field] !== undefined) a[field] = req.body[field];
  }
  ok(res, a, '已更新');
});

/* ---------- 多智能体评审团 REQ-SPC-02 ---------- */
router.get('/review/reports', auth, (req, res) => {
  ok(res, { items: store.reviewReports });
});

router.post('/review/council', auth, (req, res) => {
  const { manuscript_id, roles = ['theory', 'method', 'experiment', 'writing', 'ethics'] } = req.body || {};
  const ms = store.manuscripts.find((m) => m.id === manuscript_id);
  if (!ms) return errors.notFound(res, '稿件不存在');
  const task = ai.createTask('review', ['论文全文解析', '理论 Agent 评审', '方法 Agent 评审', '实验 Agent 评审', '写作/伦理 Agent 评审', '主席 Agent 汇总'], () => {
    const report = store.reviewReports.find((r) => r.manuscript_id === ms.id) || store.reviewReports[0];
    return { report_id: report.id, decision: report.decision, scores: report.scores };
  }, req.user.id);
  ok(res, { task_id: task.id }, '评审团已组建，5 位 Agent 并行评审中');
});

router.get('/review/reports/:id', auth, (req, res) => {
  const report = store.reviewReports.find((r) => r.id === req.params.id);
  if (!report) return errors.notFound(res, '报告不存在');
  ok(res, report);
});

/* ---------- 项目管理 REQ-PRJ-01 ---------- */
router.get('/projects', auth, (req, res) => {
  const items = store.projects.filter((project) => canAccess(project, req.user.id));
  ok(res, { items, total: items.length });
});

router.post('/projects', auth, (req, res) => {
  const { name, type = 'research', description = '' } = req.body || {};
  if (!name) return errors.param(res, '项目名称不能为空');
  const project = {
    id: store.id('p'), name, type, description, status: 'active', owner_id: req.user.id, team_id: null,
    progress: { topic: 0, literature: 0, experiment: 0, analysis: 0, writing: 0, submission: 0 },
    created_at: store.now(), stats: { documents: 0, experiments: 0, charts: 0, manuscripts: 0 },
  };
  store.projects.unshift(project);
  ok(res, project, '项目已创建');
});

router.get('/projects/:id', auth, (req, res) => {
  const project = store.projects.find((p) => p.id === req.params.id && canAccess(p, req.user.id));
  if (!project) return errors.notFound(res, '项目不存在');
  const docs = store.documents.filter((d) => d.project_id === project.id).map(({ structured, ...m }) => m);
  const exps = store.experiments.filter((e) => e.project_id === project.id);
  const charts = store.charts.filter((c) => c.project_id === project.id);
  const ms = store.manuscripts.filter((m) => m.project_id === project.id);
  ok(res, { ...project, documents: docs, experiments: exps, charts, manuscripts: ms });
});

/* ---------- 课题组 REQ-PRJ-01 ---------- */
router.get('/teams', auth, (req, res) => {
  ok(res, { items: store.teams.map((t) => ({ ...t, members: t.members.map(({ email, ...m }) => m) })) });
});

router.post('/teams/:id/members', auth, (req, res) => {
  const team = store.teams.find((t) => t.id === req.params.id);
  if (!team) return errors.notFound(res, '课题组不存在');
  const { email, role = 'member' } = req.body || {};
  if (!email) return errors.param(res, '成员邮箱不能为空');
  const member = { user_id: store.id('u'), name: email.split('@')[0], role, joined_at: store.now() };
  team.members.push(member);
  team.member_count = team.members.length;
  ok(res, member, `已向 ${email} 发送邀请（演示环境直接加入）`);
});

router.delete('/teams/:id/members/:uid', auth, (req, res) => {
  const team = store.teams.find((t) => t.id === req.params.id);
  if (!team) return errors.notFound(res, '课题组不存在');
  const idx = team.members.findIndex((m) => m.user_id === req.params.uid);
  if (idx >= 0) team.members.splice(idx, 1);
  team.member_count = team.members.length;
  ok(res, {}, '成员已移除');
});

module.exports = { router };
