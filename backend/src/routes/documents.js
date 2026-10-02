/** 文档导入 / 结构化 / 分析 / 引用图谱 / 论文问答 / 知识库 —— REQ-READ-01~04 */
const express = require('express');
const store = require('../lib/store');
const { ok, errors } = require('../lib/respond');
const ai = require('../lib/ai');
const { auth } = require('./account');

const router = express.Router();

/* ---------- 文档列表与导入 REQ-READ-01 ---------- */
router.get('/documents', auth, (req, res) => {
  const items = store.documents.map(({ structured, mindmap, seven_summary, citation_graph, ...meta }) => ({
    ...meta, summary_ready: !!(mindmap && seven_summary), graph_ready: !!citation_graph,
  }));
  ok(res, { items, total: items.length });
});

router.post('/documents/upload', auth, (req, res) => {
  const { file_name, url, project_id = 'p1' } = req.body || {};
  if (!file_name && !url) return errors.param(res, '请提供文件名或 URL');
  const name = file_name || url.split('/').pop();
  const task = ai.createTask('parse', ['下载 / 读取文件', '版面解析', '公式与图表识别', '构建结构化文本'], () => ({ doc_id: doc.id }));
  const doc = {
    id: store.id('d'), project_id, title: name.replace(/\.(pdf|docx?|tex|md)$/i, ''),
    authors: '（待解析）', venue: '', year: new Date().getFullYear(), source_type: url ? 'url' : 'file',
    file_name: name, pages: 12, parsed_status: 'parsing', has_code: false, doi: '', abstract: '',
    created_at: store.now(),
    structured: { sections: [{ id: 's1', title: '1. Introduction', page: 1, paragraphs: ['（演示环境）版面解析完成后，这里将展示结构化正文。支持 PDF / Word / LaTeX / Markdown / 网页链接，公式自动 LaTeX 化，扫描件自动 OCR 兜底。'] }] },
    mindmap: null, seven_summary: null, citation_graph: null,
  };
  store.documents.unshift(doc);
  task.listeners.push(() => { doc.parsed_status = 'parsed'; });
  ok(res, { doc_id: doc.id, task_id: task.id, status: 'parsing' }, '解析任务已提交');
});

router.get('/documents/:id', auth, (req, res) => {
  const doc = store.documents.find((d) => d.id === req.params.id);
  if (!doc) return errors.notFound(res, '文档不存在');
  ok(res, doc);
});

/* ---------- 结构化正文 REQ-READ-01 ---------- */
router.get('/documents/:id/structured', auth, (req, res) => {
  const doc = store.documents.find((d) => d.id === req.params.id);
  if (!doc) return errors.notFound(res, '文档不存在');
  ok(res, { doc_id: doc.id, title: doc.title, sections: doc.structured.sections });
});

/* ---------- 翻译 REQ-READ-02 / REQ-WRT-01 ---------- */
router.post('/documents/:id/translate', auth, (req, res) => {
  const doc = store.documents.find((d) => d.id === req.params.id);
  if (!doc) return errors.notFound(res, '文档不存在');
  const { text = '', direction = 'en2zh' } = req.body || {};
  const sample = {
    en2zh: '微表情（ME）是不受主观意识控制的面部运动，通常持续 1/25 至 1/2 秒，能够揭示真实情绪，在测谎与临床诊断中具有极高价值。',
    zh2en: 'Micro-expressions are involuntary facial movements lasting 1/25 to 1/2 second, revealing genuine emotions with high value in lie detection and clinical diagnosis.',
  };
  ok(res, { original: text.slice(0, 120), translated: sample[direction] || sample.en2zh, direction, glossary: [{ en: 'micro-expression', zh: '微表情' }, { en: 'LOSO', zh: '留一主体交叉验证' }] });
});

/* ---------- 结构化分析：思维导图 + 七段式（异步任务） REQ-READ-02 ---------- */
router.post('/documents/:id/analyze', auth, (req, res) => {
  const doc = store.documents.find((d) => d.id === req.params.id);
  if (!doc) return errors.notFound(res, '文档不存在');
  const { mode = 'all' } = req.body || {};
  const task = ai.createTask('analyze', ['全文语义切分', '生成思维导图', '撰写七段式总结', 'Schema 校验'], () => {
    if (mode === 'mindmap' || mode === 'all') doc.mindmap = doc.mindmap || buildDefaultMindmap(doc);
    if (mode === 'seven' || mode === 'all') doc.seven_summary = doc.seven_summary || buildDefaultSeven(doc);
    return { mindmap: doc.mindmap, seven_summary: doc.seven_summary };
  });
  ok(res, { task_id: task.id }, '结构化分析任务已提交');
});

function buildDefaultMindmap(doc) {
  return {
    title: doc.title.slice(0, 40),
    children: [
      { title: '研究背景', children: [{ title: '领域现状' }, { title: '核心挑战' }] },
      { title: '方法', children: [{ title: '整体框架' }, { title: '关键模块' }] },
      { title: '实验', children: [{ title: '数据集' }, { title: '评价指标' }, { title: '对比结果' }] },
      { title: '结论与启发', children: [{ title: '主要结论' }, { title: '可借鉴点' }] },
    ],
  };
}
function buildDefaultSeven(doc) {
  return ['背景', '问题', '方法', '实验', '结论', '优点', '局限与启发'].map((key) => ({
    key, text: `（针对《${doc.title.slice(0, 30)}》的${key}分析，演示环境生成结构化摘要。）`,
  }));
}

/* ---------- 引用图谱 REQ-READ-02 ---------- */
router.get('/documents/:id/citation-graph', auth, (req, res) => {
  const doc = store.documents.find((d) => d.id === req.params.id);
  if (!doc || !doc.citation_graph) return errors.notFound(res, '引用图谱暂不可用（该文档可能无 DOI）');
  ok(res, { doc_id: doc.id, ...doc.citation_graph });
});

/* ---------- 论文问答（SSE + 引用溯源） REQ-READ-03 ---------- */
router.post('/documents/:id/chat', auth, async (req, res) => {
  const doc = store.documents.find((d) => d.id === req.params.id);
  if (!doc) return errors.notFound(res, '文档不存在');
  const { messages } = req.body || {};
  const text = ai.generateReply(messages || [{ role: 'user', content: '这篇论文的核心贡献是什么？' }], 'document');
  await ai.streamText(res, text, {
    beforeStream: (send) => {
      send('reference', { doc_id: doc.id, chunk_id: 'ck1', page: 5, title: doc.title });
    },
  });
});

/* ---------- 知识库 REQ-READ-04 / REQ-PRJ-01 ---------- */
router.get('/knowledge-bases', auth, (req, res) => {
  ok(res, store.knowledgeBases.map(({ chunks, ...kb }) => ({ ...kb, sample: chunks.length })));
});

router.post('/knowledge-bases', auth, (req, res) => {
  const { name, scope = 'personal' } = req.body || {};
  if (!name) return errors.param(res, '知识库名称不能为空');
  const kb = { id: store.id('kb'), name, scope, team_id: null, project_id: null, doc_count: 0, chunk_count: 0, size_mb: 0, created_at: store.now(), chunks: [] };
  store.knowledgeBases.push(kb);
  ok(res, { kb_id: kb.id, ...{ name, scope } }, '知识库已创建');
});

router.delete('/knowledge-bases/:id', auth, (req, res) => {
  const idx = store.knowledgeBases.findIndex((k) => k.id === req.params.id);
  if (idx < 0) return errors.notFound(res, '知识库不存在');
  store.knowledgeBases.splice(idx, 1);
  ok(res, {}, '知识库已删除');
});

router.post('/knowledge-bases/:id/query', auth, (req, res) => {
  const kb = store.knowledgeBases.find((k) => k.id === req.params.id);
  if (!kb) return errors.notFound(res, '知识库不存在');
  const { q = '', top_k = 3 } = req.body || {};
  if (!q) return errors.param(res, '查询不能为空');
  if (kb.chunks.length === 0) return ok(res, { items: [], hint: '知识库为空，请先上传文档建立索引' }, '知识库为空');
  const scored = kb.chunks
    .map((c) => ({ ...c, score: +(0.72 + Math.random() * 0.25).toFixed(3) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, top_k);
  ok(res, { query: q, items: scored });
});

router.post('/knowledge-bases/:id/ingest', auth, (req, res) => {
  const kb = store.knowledgeBases.find((k) => k.id === req.params.id);
  if (!kb) return errors.notFound(res, '知识库不存在');
  const task = ai.createTask('ingest', ['读取文档', '语义切分', '向量化 (Embedding)', '写入向量库'], () => {
    kb.doc_count += 1;
    kb.chunk_count += 86;
    kb.size_mb += 12;
    return { doc_count: kb.doc_count, chunk_count: kb.chunk_count };
  });
  ok(res, { task_id: task.id }, '入库任务已提交');
});

module.exports = { router };
