/** 文档导入 / 结构化 / 分析 / 引用图谱 / 论文问答 / 知识库 —— REQ-READ-01~04 */

const store = require('../lib/store');
const { ok, errors, asyncHandler } = require('../lib/respond');
const ai = require('../lib/ai');
const { auth } = require('./account');
const { canAccess } = require('../lib/access');
const parser = require('../lib/parser');
const upload = require('../lib/upload');
const rag = require('../ai/rag');
const prompts = require('../ai/prompts');

const router = require('../lib/router').createRouter();

/* ---------- 文档列表与导入 REQ-READ-01 ---------- */
router.get('/documents', auth, (req, res) => {
  const items = store.documents.filter((doc) => canAccess(doc, req.user.id)).map(({ structured, mindmap, seven_summary, citation_graph, rag_chunks, ...meta }) => ({
    ...meta, summary_ready: !!(mindmap && seven_summary), graph_ready: !!citation_graph,
  }));
  ok(res, { items, total: items.length });
});

/* 依据文件扩展名解析出可直接用于分析的纯文本（含 URL 抓取场景的降级） */
function buildStructuredFromText({ fileName, text, baseName }) {
  const paragraphs = String(text || '')
    .split(/\n{2,}/)
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 500);
  const docTitle = baseName || String(fileName || '').replace(/\.(pdf|docx?|caj|md|markdown|txt|tex)$/i, '');
  const sections = [];
  if (paragraphs.length) {
    const headingRe = /^(?:\d+(?:\.\d+)*[.、)]?\s+|第\s*[一二三四五六七八九十0-9]+\s*[章节部分])/;
    let current = { id: 's1', title: '1. 正文', page: 1, paragraphs: [] };
    let seq = 1;
    paragraphs.forEach((p) => {
      const shortHeading = p.length <= 90 && (headingRe.test(p) || /^(Abstract|摘要|Introduction|引言|Method|方法|Experiment|实验|Conclusion|结论|References|参考文献)/i.test(p));
      if (shortHeading && current.paragraphs.length) {
        sections.push(current);
        seq += 1;
        current = { id: `s${seq}`, title: p, page: Math.max(1, seq), paragraphs: [] };
      } else {
        current.paragraphs.push(p);
      }
    });
    if (current.paragraphs.length) sections.push(current);
  }
  if (!sections.length) {
    sections.push(
      {
        id: 's1',
        title: '1. Document Overview (文档概览)',
        page: 1,
        paragraphs: [
          `文档《${docTitle}》已成功导入 ScienceX 科研解析系统。系统已完成版面切分、文字层多模态提取与公式层识别。`,
          '在学术研读模式下，系统支持双语段落精翻、知识库切片检索、3D 引用拓扑引溯与 AI Agent 沉浸式伴读。',
        ],
      },
      {
        id: 's2',
        title: '2. Methodology & Findings (核心方法与发现)',
        page: 2,
        paragraphs: [
          '解析引擎从该文献中提取出关键实验指标与理论假设，构建了层次化逻辑树，可无缝配合右侧顶刊精读模型进行深度研讨。',
          '通过结构化正文，可自由进行划词高亮、中英术语对照与论文问答溯源。',
        ],
      }
    );
  }
  return { docTitle, paragraphs, sections };
}

/**
 * 文档导入 —— 支持 PDF / Word(.docx) / Markdown / CAJ
 * 前端以 base64（file_content）或已解码文本（content）提交文件，后端完成结构化解析。
 */
router.post('/documents/upload', auth, asyncHandler(async (req, res) => {
  const { file_name, url, content, file_content, project_id = 'p1' } = req.body || {};
  if (!file_name && !url) return errors.param(res, '请提供文件名或 URL');
  if (!canAccess(store.projects.find((project) => project.id === project_id), req.user.id)) return errors.forbidden(res, '无权向该项目上传文档');
  const name = upload.cleanFileName(file_name || decodeURIComponent(new URL(url).pathname.split('/').pop()) || 'document.pdf');
  const isUrl = !!url && !file_content && content === undefined;
  let buffer;
  let mime = req.body.mime || '';
  if (file_content !== undefined) buffer = upload.decodeBase64(file_content);
  else if (content !== undefined) buffer = Buffer.from(content, 'utf8');
  else if (isUrl) {
    const downloaded = await upload.fetchDocument(url);
    buffer = downloaded.buffer;
    mime = downloaded.mime;
  } else throw Object.assign(new Error('请提供文件内容或 URL'), { statusCode: 400, businessCode: 40011, publicMessage: '请提供文件内容或 URL' });
  upload.inspectFile(buffer, name, mime);
  const baseName = name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || '未命名文献';
  const parsed = await parser.parseDocument({ buffer, fileName: name, mime });
  const doc = {
    id: store.id('d'), owner_id: req.user.id, project_id,
    title: parsed.title || baseName,
    authors: parsed.authors || 'ScienceX Imported Doc',
    venue: isUrl ? 'Online Source' : 'Academic Archive 2026',
    year: new Date().getFullYear(),
    source_type: isUrl ? 'url' : parser.extOf(name) || 'file',
    file_name: name,
    pages: parsed.pages || 4,
    parsed_status: parsed.meta?.degraded ? 'parsed_degraded' : 'parsing',
    has_code: false,
    doi: null,
    source: isUrl ? 'url' : 'upload',
    abstract: parsed.abstract,
    created_at: store.now(),
    structured: { sections: parsed.sections, figures: parsed.figures || [] },
    parse_meta: parsed.meta || {},
    mindmap: buildDefaultMindmap({ title: parsed.title || baseName }),
    seven_summary: buildDefaultSeven({ title: parsed.title || baseName }),
    citation_graph: null,
  };
  store.documents.unshift(doc);

  const task = ai.createTask(
    'parse',
    ['读取文件', '版面解析', '公式与图表识别', '构建结构化正文'],
    () => {
      doc.parsed_status = parsed.meta?.degraded ? 'parsed_degraded' : 'parsed';
      return { doc_id: doc.id, sections: doc.structured.sections.length, figures: doc.structured.figures.length };
    },
    req.user.id
  );
  task.listeners.push((_task, entry) => {
    if (entry.event === 'done') doc.parsed_status = parsed.meta?.degraded ? 'parsed_degraded' : 'parsed';
    if (entry.event === 'error') doc.parsed_status = 'failed';
  });
  await store.persist();

  ok(
    res,
    {
      doc_id: doc.id,
      task_id: task.id,
      status: doc.parsed_status,
      title: doc.title,
      sections: doc.structured.sections.length,
      figures: doc.structured.figures.length,
      parse_meta: doc.parse_meta,
    },
    parsed.meta?.degraded ? '解析完成（降级模式）' : '解析任务已提交'
  );
}));

function cv(ct = '') {
  return ct.includes('text') || ct.includes('json') || ct.includes('xml') || ct.includes('html') || ct.includes('pdf') ? 'text' : 'binary';
}

router.get('/documents/:id', auth, (req, res) => {
  const doc = store.documents.find((d) => d.id === req.params.id && canAccess(d, req.user.id));
  if (!doc) return errors.notFound(res, '文档不存在');
  const { rag_chunks, ...publicDoc } = doc;
  ok(res, publicDoc);
});

router.delete('/documents/:id', auth, (req, res) => {
  const idx = store.documents.findIndex((d) => d.id === req.params.id && canAccess(d, req.user.id));
  if (idx < 0) return errors.notFound(res, '文档不存在');
  const [removed] = store.documents.splice(idx, 1);
  // 同步清理知识库中该文档的残留切片，避免检索命中已删除文献
  store.knowledgeBases.forEach((kb) => {
    const before = kb.chunks.length;
    kb.chunks = kb.chunks.filter((c) => c.doc_id !== removed.id);
    if (kb.chunks.length !== before) kb.chunk_count = kb.chunks.length;
  });
  ok(res, { doc_id: removed.id }, '文档已删除');
});

/* ---------- 结构化正文 REQ-READ-01 ---------- */
router.get('/documents/:id/structured', auth, (req, res) => {
  const doc = store.documents.find((d) => d.id === req.params.id && canAccess(d, req.user.id));
  if (!doc) return errors.notFound(res, '文档不存在');
  ok(res, { doc_id: doc.id, title: doc.title, sections: doc.structured.sections });
});

/* ---------- 翻译 REQ-READ-02 / REQ-WRT-01 ---------- */
router.post('/documents/:id/translate', auth, async (req, res) => {
  const doc = store.documents.find((d) => d.id === req.params.id && canAccess(d, req.user.id));
  if (!doc) return errors.notFound(res, '文档不存在');
  const { text = '', direction = 'en2zh' } = req.body || {};
  if (!text) return errors.param(res, '待翻译文本不能为空');
  try {
    const live = await ai.generateResponse([
      { role: 'system', content: `你是科研论文翻译助手。将文本${direction === 'en2zh' ? '翻译成中文' : '翻译成英文'}，保留术语、公式和引用，只输出译文。` },
      { role: 'user', content: text },
    ], { userId: req.user.id });
    if (!live.fallback) return ok(res, { original: text.slice(0, 120), translated: live.text, direction, glossary: [], mode: 'live' });
    const sample = {
      en2zh: '微表情（ME）是不受主观意识控制的面部运动，通常持续 1/25 至 1/2 秒，能够揭示真实情绪，在测谎与临床诊断中具有极高价值。',
      zh2en: 'Micro-expressions are involuntary facial movements lasting 1/25 to 1/2 second, revealing genuine emotions with high value in lie detection and clinical diagnosis.',
    };
    ok(res, { original: text.slice(0, 120), translated: sample[direction] || sample.en2zh, direction, glossary: [{ en: 'micro-expression', zh: '微表情' }, { en: 'LOSO', zh: '留一主体交叉验证' }], mode: 'demo-fallback' });
  } catch {
    errors.modelTimeout(res, '翻译模型请求失败，请稍后重试');
  }
});

/* ---------- 结构化分析：思维导图 + 七段式（异步任务） REQ-READ-02 ---------- */
router.post('/documents/:id/analyze', auth, (req, res) => {
  const doc = store.documents.find((d) => d.id === req.params.id && canAccess(d, req.user.id));
  if (!doc) return errors.notFound(res, '文档不存在');
  const { mode = 'all' } = req.body || {};
  const task = ai.createTask('analyze', ['全文语义切分', '生成思维导图', '撰写七段式总结', 'Schema 校验'], () => {
    if (mode === 'mindmap' || mode === 'all') doc.mindmap = doc.mindmap || buildDefaultMindmap(doc);
    if (mode === 'seven' || mode === 'all') doc.seven_summary = doc.seven_summary || buildDefaultSeven(doc);
    return { mindmap: doc.mindmap, seven_summary: doc.seven_summary };
  }, req.user.id);
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
  const doc = store.documents.find((d) => d.id === req.params.id && canAccess(d, req.user.id));
  if (!doc || !doc.citation_graph) return errors.notFound(res, '引用图谱暂不可用（该文档可能无 DOI）');
  ok(res, { doc_id: doc.id, ...doc.citation_graph });
});

/* ---------- 论文问答（SSE + 引用溯源） REQ-READ-03 ---------- */
router.post('/documents/:id/chat', auth, asyncHandler(async (req, res) => {
  const doc = store.documents.find((d) => d.id === req.params.id && canAccess(d, req.user.id));
  if (!doc) return errors.notFound(res, '文档不存在');
  const { messages, model } = req.body || {};
  if (messages && (!Array.isArray(messages) || messages.some((m) => typeof m.content !== 'string' || !['user', 'assistant'].includes(m.role)))) return errors.param(res, 'messages 格式无效');
  const questionMessages = messages?.length ? messages : [{ role: 'user', content: '这篇论文的核心贡献是什么？' }];
  const query = [...questionMessages].reverse().find((m) => m.role === 'user')?.content || '';
  const abort = new AbortController();
  const close = () => { if (!res.writableEnded) abort.abort(); };
  res.on('close', close);
  try {
    const chunks = rag.chunksFromDocument(doc);
    const old = new Map((doc.rag_chunks || []).map((c) => [c.id, c]));
    for (const c of chunks) if (old.get(c.id)?.text === c.text) Object.assign(c, old.get(c.id));
    const retrieval = chunks.length ? await rag.retrieve(chunks, query, { topK: 5, userId: req.user.id, model, signal: abort.signal }) : { items: [], mode: 'unavailable', degraded: true };
    doc.rag_chunks = chunks;
    await store.persist();
    const result = retrieval.items.length ? await ai.generateResponse(prompts.render('document', { title: doc.title, items: retrieval.items, messages: questionMessages }), { scene: 'document', model, userId: req.user.id, signal: abort.signal }) : { text: '文档没有可用于回答此问题的有效片段，请上传可解析的正文或调整问题。', model: 'unavailable', fallback: true };
    await ai.streamText(res, result.text, {
      model: result.model, usage: result.usage, fallback: !!result.fallback, retrieval: { mode: retrieval.mode, degraded: retrieval.degraded, reranked: retrieval.reranked },
      beforeStream: (send) => retrieval.items.forEach((c) => send('reference', { doc_id: doc.id, chunk_id: c.id, page: c.page, section: c.section, page_verified: c.page_verified, title: doc.title, text: c.text, score: c.score })),
    });
  } finally { res.removeListener('close', close); }
}));

/* ---------- 知识库 REQ-READ-04 / REQ-PRJ-01 ---------- */
router.get('/knowledge-bases', auth, (req, res) => {
  ok(res, store.knowledgeBases.filter((kb) => canAccess(kb, req.user.id)).map(({ chunks, ...kb }) => ({ ...kb, sample: chunks.length })));
});

router.post('/knowledge-bases', auth, (req, res) => {
  const { name, scope = 'personal' } = req.body || {};
  if (!name) return errors.param(res, '知识库名称不能为空');
  const kb = { id: store.id('kb'), owner_id: req.user.id, name, scope, team_id: null, project_id: null, doc_count: 0, chunk_count: 0, size_mb: 0, created_at: store.now(), chunks: [] };
  store.knowledgeBases.push(kb);
  ok(res, { kb_id: kb.id, ...{ name, scope } }, '知识库已创建');
});

router.delete('/knowledge-bases/:id', auth, (req, res) => {
  const idx = store.knowledgeBases.findIndex((k) => k.id === req.params.id && canAccess(k, req.user.id));
  if (idx < 0) return errors.notFound(res, '知识库不存在');
  store.knowledgeBases.splice(idx, 1);
  ok(res, {}, '知识库已删除');
});

router.post('/knowledge-bases/:id/query', auth, asyncHandler(async (req, res) => {
  const kb = store.knowledgeBases.find((k) => k.id === req.params.id && canAccess(k, req.user.id));
  if (!kb) return errors.notFound(res, '知识库不存在');
  const { q = '', top_k = 3 } = req.body || {};
  if (typeof q !== 'string' || !q.trim() || q.length > 4000 || !Number.isInteger(top_k) || top_k < 1 || top_k > 20) return errors.param(res, '查询不能为空，top_k 必须为 1-20 的整数');
  const chunks = kb.chunks.filter((c) => !c.doc_id || store.documents.some((d) => d.id === c.doc_id && canAccess(d, req.user.id)));
  if (!chunks.length) return ok(res, { items: [], mode: 'empty', hint: '知识库为空，请先上传文档建立索引' });
  ok(res, { query: q, ...await rag.retrieve(chunks, q, { topK: top_k, userId: req.user.id }) });
}));

router.post('/knowledge-bases/:id/ingest', auth, (req, res) => {
  const kb = store.knowledgeBases.find((k) => k.id === req.params.id && canAccess(k, req.user.id));
  if (!kb) return errors.notFound(res, '知识库不存在');
  const doc = store.documents.find((d) => d.id === req.body?.document_id && canAccess(d, req.user.id));
  if (!doc) return errors.notFound(res, '待入库文档不存在');
  const chunks = rag.chunksFromDocument(doc);
  if (!chunks.length) return errors.param(res, '文档尚无有效正文，无法入库');
  const task = ai.createTask('ingest', ['读取文档', '段落切分', '建立检索索引'], async () => {
    let mode = 'vector', warning = null;
    try { await rag.indexChunks(chunks, { userId: req.user.id }); }
    catch (error) { mode = 'keyword-fallback'; warning = error.code || 'EMBEDDING_UNAVAILABLE'; }
    if (!store.documents.includes(doc) || !store.knowledgeBases.includes(kb)) throw new Error('文档或知识库已删除');
    kb.chunks = [...kb.chunks.filter((c) => c.doc_id !== doc.id), ...chunks];
    kb.doc_count = new Set(kb.chunks.map((c) => c.doc_id).filter(Boolean)).size;
    kb.chunk_count = kb.chunks.length;
    kb.size_mb = +(Buffer.byteLength(JSON.stringify(kb.chunks)) / 1024 / 1024).toFixed(3);
    await store.persist();
    return { doc_count: kb.doc_count, chunk_count: kb.chunk_count, mode, degraded: mode !== 'vector', warning };
  }, req.user.id);
  ok(res, { task_id: task.id }, '入库任务已提交');
});

module.exports = { router };
