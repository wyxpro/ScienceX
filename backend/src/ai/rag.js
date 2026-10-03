const { createHash } = require('node:crypto');
const { fetchBody, withRetry, withCircuit, circuitKey, AIError } = require('./resilience');
const { recordUsage } = require('./usage');
const hash = (s) => createHash('sha256').update(s).digest('hex');
function embeddingConfig() {
  const baseUrl = (process.env.EMBEDDING_BASE_URL || '').replace(/\/+$/, '');
  const model = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
  return { baseUrl, model, apiKey: process.env.EMBEDDING_API_KEY || '', fingerprint: hash(`${baseUrl}:${model}`) };
}
function chunksFromDocument(doc) {
  if (doc.parse_meta?.engine === 'placeholder' || doc.parse_meta?.charCount === 0) return [];
  return (doc.structured?.sections || []).flatMap((section) => (section.paragraphs || []).flatMap((paragraph, pi) => {
    const text = typeof paragraph === 'string' ? paragraph : paragraph.text || '';
    const chunks = [];
    for (let start = 0; start < text.length; start += 1000) {
      chunks.push({ id: `${doc.id}_${section.id}_${pi + 1}_${start}`, doc_id: doc.id, title: doc.title, section: section.title, section_id: section.id, page: section.paragraph_pages?.[pi] || (section.page_verified ? section.page : null), page_verified: !!(section.paragraph_pages?.[pi] || section.page_verified), text: text.slice(start, start + 1200) });
    }
    return chunks;
  }));
}
async function embed(texts, options = {}) {
  const cfg = embeddingConfig();
  if (!cfg.baseUrl) throw new AIError('未配置 Embedding 服务', 'EMBEDDING_NOT_CONFIGURED');
  const vectors = [];
  for (let start = 0; start < texts.length; start += 32) {
    const input = texts.slice(start, start + 32);
    const data = await withCircuit(circuitKey(cfg.baseUrl, cfg.apiKey), () => withRetry(() => fetchBody(`${cfg.baseUrl}/embeddings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}) },
      body: JSON.stringify({ model: cfg.model, input }), signal: options.signal,
    }, (r) => r.json(), 30000), { signal: options.signal }));
    const sorted = [...(data.data || [])].sort((a, b) => a.index - b.index);
    if (sorted.length !== input.length || sorted.some((v, i) => v.index !== i || !Array.isArray(v.embedding) || !v.embedding.length || v.embedding.length > 16384 || !v.embedding.every(Number.isFinite) || !v.embedding.some((n) => n !== 0))) throw new AIError('Embedding 返回向量无效', 'INVALID_EMBEDDING');
    vectors.push(...sorted.map((v) => v.embedding));
    await recordUsage({ model: data.model || cfg.model, usage: { prompt_tokens: data.usage?.prompt_tokens, completion_tokens: 0 } }, { ...options, scene: 'embedding' });
  }
  if (vectors.some((v) => v.length !== vectors[0].length)) throw new AIError('Embedding 维度不一致', 'INVALID_EMBEDDING');
  return vectors;
}
async function indexChunks(chunks, options = {}) {
  const cfg = embeddingConfig();
  const pending = chunks.filter((c) => !c.embedding || c.embedding_model !== cfg.fingerprint || c.content_hash !== hash(c.text || c.content || ''));
  if (!pending.length) return;
  const vectors = await embed(pending.map((c) => c.text || c.content || ''), options);
  pending.forEach((c, i) => Object.assign(c, { embedding: vectors[i], embedding_model: cfg.fingerprint, content_hash: hash(c.text || c.content || '') }));
}
function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return -1;
  const norm = Math.hypot(...a) * Math.hypot(...b);
  return norm ? a.reduce((s, x, i) => s + x * b[i], 0) / norm : -1;
}
function lexical(chunks, query) {
  const terms = query.toLowerCase().match(/[\u4e00-\u9fff]|[a-z0-9]+/gi) || [];
  return chunks.map((c) => ({ ...c, score: terms.reduce((s, t) => s + (`${c.title} ${c.text || c.content}`.toLowerCase().includes(t) ? 1 : 0), 0) / Math.max(1, terms.length) })).filter((c) => c.score > 0);
}
async function retrieve(chunks, query, { topK = 3, userId, model, signal } = {}) {
  let items, mode = 'vector', warning = null;
  try {
    await indexChunks(chunks, { userId, signal });
    const [vector] = await embed([query], { userId, signal });
    if (chunks.some((c) => c.embedding.length !== vector.length)) throw new AIError('查询向量维度与索引不一致', 'INVALID_EMBEDDING');
    items = chunks.map((c) => ({ ...c, score: cosine(vector, c.embedding) })).sort((a, b) => b.score - a.score).slice(0, Math.max(topK, 12));
    await require('../lib/store').persist();
  } catch (error) {
    if (signal?.aborted) throw error;
    mode = 'keyword-fallback'; warning = error.code || 'EMBEDDING_UNAVAILABLE';
    items = lexical(chunks, query).sort((a, b) => b.score - a.score).slice(0, 12);
  }
  let reranked = false;
  if (items.length && process.env.RAG_RERANK === 'true') {
    try {
      const gateway = require('../lib/model-gateway');
      const result = await gateway.complete(require('./prompts').render('rerank', { query, items }), { model, userId, signal, temperature: 0 });
      if (result) {
        const ranking = JSON.parse(result.text).ids;
        if (!Array.isArray(ranking) || new Set(ranking).size !== ranking.length || ranking.some((id) => !items.some((c) => c.id === id))) throw new Error('无效重排');
        items = [...ranking.map((id) => items.find((c) => c.id === id)), ...items.filter((c) => !ranking.includes(c.id))];
        reranked = true;
      }
    } catch { warning = warning || 'RERANK_UNAVAILABLE'; }
  }
  return { items: items.slice(0, topK).map(({ embedding, embedding_model, content_hash, ...c }) => c), mode, degraded: mode !== 'vector', reranked, warning };
}
module.exports = { chunksFromDocument, embed, indexChunks, retrieve, cosine, lexical };
