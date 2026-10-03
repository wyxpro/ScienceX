const { XMLParser } = require('fast-xml-parser');
const { fetchBody, withRetry } = require('./resilience');
const queues = new Map();
const lastCall = new Map();
const { setTimeout: delay } = require('node:timers/promises');
const array = (value) => value ? (Array.isArray(value) ? value : [value]) : [];
const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
async function limited(source, fn) {
  const previous = queues.get(source) || Promise.resolve();
  const next = previous.catch(() => {}).then(async () => {
    const wait = Math.max(0, (lastCall.get(source) || 0) + (source === 'arXiv' ? 3100 : 1000) - Date.now());
    if (wait) await delay(wait);
    lastCall.set(source, Date.now());
    return fn();
  });
  queues.set(source, next);
  return next;
}
async function get(url, source, headers = {}, xml = false) {
  return withRetry(() => limited(source, () => fetchBody(url, { headers: { 'User-Agent': 'ScienceX/1.0 (academic literature search)', ...headers } }, (r) => xml ? r.text() : r.json(), 15000)), { retries: 1 });
}
function normalize(paper, source) {
  const code = clean(paper.abstract).match(/https:\/\/github\.com\/[\w.-]+\/[\w.-]+/i)?.[0] || null;
  return { ...paper, title: clean(paper.title), abstract: clean(paper.abstract), year: Number(paper.year) || null, authors: array(paper.authors).join(', '), source: 'live', sources: [source], has_code: false, code_url: code, code_verified: false };
}
function parseArxiv(xml) {
  const feed = new XMLParser({ ignoreAttributes: false }).parse(xml).feed;
  return array(feed?.entry).filter((e) => e.id && !String(e.id).includes('/api/errors')).map((e) => normalize({
    id: e.id, arxiv_id: String(e.id).split('/abs/')[1], title: e.title,
    authors: array(e.author).map((a) => a.name), abstract: e.summary,
    year: String(e.published).slice(0, 4), doi: e['arxiv:doi'] || null,
    url: e.id, pdf_url: array(e.link).find((l) => l['@_title'] === 'pdf')?.['@_href'] || null,
    venue: e['arxiv:journal_ref'] || 'arXiv', citations: null,
  }, 'arXiv'));
}
async function arxiv(query, limit = 10) {
  const url = new URL('https://export.arxiv.org/api/query');
  url.search = new URLSearchParams({ search_query: `all:${query}`, start: '0', max_results: String(limit), sortBy: 'relevance' });
  return parseArxiv(await get(url, 'arXiv', {}, true));
}
function abstractFromIndex(index) {
  const words = [];
  for (const [word, positions] of Object.entries(index || {})) for (const pos of positions) if (pos < 20000) words[pos] = word;
  return words.join(' ');
}
async function openalex(query, limit) {
  const url = new URL('https://api.openalex.org/works');
  url.search = new URLSearchParams({ search: query, per_page: String(limit), ...(process.env.OPENALEX_API_KEY ? { api_key: process.env.OPENALEX_API_KEY } : {}) });
  const data = await get(url, 'OpenAlex');
  return (data.results || []).map((p) => normalize({ id: p.id, title: p.display_name, authors: p.authorships?.map((a) => a.author.display_name), abstract: abstractFromIndex(p.abstract_inverted_index), year: p.publication_year, doi: p.doi, url: p.primary_location?.landing_page_url || p.id, pdf_url: p.best_oa_location?.pdf_url, venue: p.primary_location?.source?.display_name || '', citations: p.cited_by_count }, 'OpenAlex'));
}
async function semantic(query, limit) {
  const url = new URL('https://api.semanticscholar.org/graph/v1/paper/search');
  url.search = new URLSearchParams({ query, limit: String(limit), fields: 'title,authors,year,abstract,venue,citationCount,externalIds,url,openAccessPdf' });
  const data = await get(url, 'Semantic Scholar', process.env.SEMANTIC_SCHOLAR_API_KEY ? { 'x-api-key': process.env.SEMANTIC_SCHOLAR_API_KEY } : {});
  return (data.data || []).map((p) => normalize({ id: p.paperId, title: p.title, authors: p.authors?.map((a) => a.name), abstract: p.abstract, year: p.year, doi: p.externalIds?.DOI, arxiv_id: p.externalIds?.ArXiv, url: p.url, pdf_url: p.openAccessPdf?.url, venue: p.venue, citations: p.citationCount }, 'Semantic Scholar'));
}
function deduplicate(papers) {
  const items = [], keys = new Map();
  for (const paper of papers) {
    const ids = [paper.doi && `doi:${paper.doi.replace(/^https?:\/\/(dx\.)?doi.org\//i, '').toLowerCase()}`, paper.arxiv_id && `arxiv:${paper.arxiv_id.replace(/v\d+$/, '')}`, `title:${paper.title.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')}`].filter(Boolean);
    const existing = ids.map((key) => keys.get(key)).find(Boolean);
    if (existing) { existing.sources = [...new Set([...existing.sources, ...paper.sources])]; if (!existing.code_url) existing.code_url = paper.code_url; }
    else items.push(paper);
    ids.forEach((key) => keys.set(key, existing || paper));
  }
  return items;
}
async function verifyCode(paper) {
  if (!paper.code_url) return paper;
  const match = paper.code_url.match(/^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)/i);
  if (!match) return paper;
  try {
    const repo = await get(`https://api.github.com/repos/${match[1]}/${match[2].replace(/\.$/, '')}`, 'GitHub', process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {});
    return { ...paper, code_url: repo.html_url, code_verified: true, has_code: !repo.disabled };
  } catch { return paper; }
}
async function search({ query, sources = ['arXiv', 'OpenAlex', 'Semantic Scholar'], year_range, has_code = false, limit = 10 }) {
  const started = Date.now(), providers = { arXiv: arxiv, OpenAlex: openalex, 'Semantic Scholar': semantic };
  const selected = [...new Set(sources)].slice(0, 4), warnings = [];
  const results = await Promise.allSettled(selected.map((s) => providers[s] ? providers[s](query, Math.min(20, limit)) : Promise.reject(new Error('该检索源尚未接入'))));
  const papers = results.flatMap((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    warnings.push({ source: selected[i], message: r.reason.message }); return [];
  });
  let items = deduplicate(papers);
  const removed = papers.length - items.length;
  if (year_range) items = items.filter((p) => p.year >= year_range[0] && p.year <= year_range[1]);
  // Only verify links present in source metadata; a title search cannot prove code ownership.
  items = await Promise.all(items.slice(0, 30).map(verifyCode));
  if (has_code) items = items.filter((p) => p.has_code);
  return { items, total: items.length, dedup_removed: removed, search_time_ms: Date.now() - started, source: 'live', degraded: warnings.length > 0, warnings };
}
module.exports = { search, arxiv, parseArxiv, deduplicate };
