/** 文档导入 / 结构化 / 分析 / 引用图谱 / 论文问答 / 知识库 —— REQ-READ-01~04 */
const express = require('express');
const store = require('../lib/store');
const { ok, errors, asyncHandler } = require('../lib/respond');
const ai = require('../lib/ai');
const { auth } = require('./account');
const { canAccess } = require('../lib/access');
const parser = require('../lib/parser');

const router = express.Router();

/* ---------- 文档列表与导入 REQ-READ-01 ---------- */
router.get('/documents', auth, (req, res) => {
  const items = store.documents.filter((doc) => canAccess(doc, req.user.id)).map(({ structured, mindmap, seven_summary, citation_graph, ...meta }) => ({
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
  const name = file_name || url.split('/').pop() || 'untitled';
  const isUrl = /^https?:\/\//i.test(String(url || '')) && !file_name;

  let buffer = Buffer.alloc(0);
  let predecodedText = '';
  if (file_content) {
    try {
      buffer = Buffer.from(String(file_content), 'base64');
    } catch {
      return errors.param(res, 'file_content 必须是 Base64 编码');
    }
  } else if (typeof content === 'string' && content) {
    buffer = Buffer.from(content, 'utf8');
    predecodedText = content;
  }

  if (buffer.length > parser.MAX_FILE_BYTES) {
    return errors.param(res, `文件大小 ${(buffer.length / 1024 / 1024).toFixed(1)}MB 超过 50MB 单文件上限`);
  }

  let parsed;
  const baseName = name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || '未命名文献';
  if (buffer.length) {
    try {
      parsed = await parser.parseDocument(
        { buffer, fileName: name, mime: req.body?.mime },
        { text: predecodedText }
      );
    } catch (error) {
      return errors.param(res, error?.publicMessage || error?.message || '文件解析失败');
    }
  } else {
    // 仅给文件名 / URL 时走轻量降级：URL 场景尝试抓取可阅读文本
    let fetched = '';
    if (isUrl) {
      try {
        const resp = await fetch(url, { redirect: 'follow' });
        const ct = resp.headers.get('content-type') || '';
        if (resp.ok && cv(ct) !== 'binary') {
          const body = Buffer.from(await resp.arrayBuffer());
          if (parser.extOf(url) === 'pdf' || ct.includes('pdf')) {
            const r = await parser.parseDocument({ buffer: body, fileName: name });
            parsed = r;
          } else {
            fetched = body.toString('utf8').slice(0, parser.MAX_FILE_BYTES);
          }
        }
      } catch {
        /* 抓取失败时继续走占位结构化 */
      }
    }
    if (!parsed) {
      const fallback = buildStructuredFromText({ fileName: name, text: fetched, baseName });
      parsed = {
        title: fallback.docTitle,
        authors: 'ScienceX Imported Doc',
        abstract: fallback.paragraphs.length
          ? fallback.paragraphs[0].slice(0, 240) + '…'
          : `本文针对《${fallback.docTitle}》展开系统性学术解析，构建了多模态知识拓扑结构与核心论证脉络。`,
        sections: fallback.sections,
        figures: [],
        text: fetched,
        pages: Math.max(4, Math.ceil((fallback.paragraphs.length || 6) * 1.5)),
        meta: { ext: parser.extOf(name), size: fetched.length, engine: 'placeholder', degraded: true, degradedReason: 'metadata-only' },
      };
    }
  }

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
    doi: '10.1109/SCIENCE.2026.001',
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
    () => ({ doc_id: doc.id, sections: doc.structured.sections.length, figures: doc.structured.figures.length }),
    req.user.id
  );
  task.listeners.push((_task, entry) => {
    if (entry.event === 'done') doc.parsed_status = 'parsed';
    if (entry.event === 'error') doc.parsed_status = 'failed';
  });
  store.persist();

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
  ok(res, doc);
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
router.post('/documents/:id/chat', auth, async (req, res) => {
  const doc = store.documents.find((d) => d.id === req.params.id && canAccess(d, req.user.id));
  if (!doc) return errors.notFound(res, '文档不存在');
  const { messages, model } = req.body || {};
  const questionMessages = Array.isArray(messages) && messages.length ? messages : [{ role: 'user', content: '这篇论文的核心贡献是什么？' }];
  const context = doc.structured?.sections?.flatMap((section) => section.paragraphs || []).join('\n').slice(0, 18000) || doc.abstract || '';
  try {
    const result = await ai.generateResponse([
      { role: 'system', content: `你正在回答论文《${doc.title}》的问题。仅基于下列文档内容回答；如果内容不足请明确说明。\n\n${context}` },
      ...questionMessages,
    ], { scene: 'document', model, userId: req.user.id });
    const text = result.text;
    await ai.streamText(res, text, {
      beforeStream: (send) => {
        send('reference', { doc_id: doc.id, chunk_id: `${doc.id}_s1_1`, page: doc.structured?.sections?.[0]?.page || 1, title: doc.title });
      },
    });
  } catch {
    if (!res.headersSent) errors.modelTimeout(res, '文献问答模型请求失败，请稍后重试');
  }
});

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

router.post('/knowledge-bases/:id/query', auth, (req, res) => {
  const kb = store.knowledgeBases.find((k) => k.id === req.params.id && canAccess(k, req.user.id));
  if (!kb) return errors.notFound(res, '知识库不存在');
  const { q = '', top_k = 3 } = req.body || {};
  if (!q) return errors.param(res, '查询不能为空');
  if (kb.chunks.length === 0) return ok(res, { items: [], hint: '知识库为空，请先上传文档建立索引' }, '知识库为空');
  const terms = q.toLowerCase().match(/[\u4e00-\u9fff]|[a-z0-9]+/gi) || [];
  const scored = kb.chunks
    .map((c) => {
      const haystack = `${c.title || ''} ${c.text || c.content || ''}`.toLowerCase();
      const hits = terms.reduce((count, term) => count + (haystack.includes(term) ? 1 : 0), 0);
      return { ...c, score: +(hits / Math.max(1, terms.length)).toFixed(3) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, top_k);
  ok(res, { query: q, items: scored });
});

router.post('/knowledge-bases/:id/ingest', auth, (req, res) => {
  const kb = store.knowledgeBases.find((k) => k.id === req.params.id && canAccess(k, req.user.id));
  if (!kb) return errors.notFound(res, '知识库不存在');
  const doc = req.body?.document_id
    ? store.documents.find((item) => item.id === req.body.document_id && canAccess(item, req.user.id))
    : null;
  if (req.body?.document_id && !doc) return errors.notFound(res, '待入库文档不存在');
  const task = ai.createTask('ingest', ['读取文档', '语义切分', '向量化 (Embedding)', '写入向量库'], () => {
    const paragraphs = doc?.structured?.sections?.flatMap((section) => section.paragraphs.map((text, index) => ({
      id: `${doc.id}_${section.id}_${index + 1}`,
      doc_id: doc.id,
      title: doc.title,
      page: section.page,
      text,
    }))) || [];
    if (paragraphs.length) kb.chunks.push(...paragraphs);
    kb.doc_count += 1;
    kb.chunk_count = kb.chunks.length || kb.chunk_count + 1;
    kb.size_mb += doc ? Math.max(1, Math.round(JSON.stringify(doc).length / 1024 / 1024)) : 1;
    return { doc_count: kb.doc_count, chunk_count: kb.chunk_count };
  }, req.user.id);
  ok(res, { task_id: task.id }, '入库任务已提交');
});

module.exports = { router };
