// 浏览器与服务端可复用的 Zod 契约；运行时校验和 OpenAPI 使用同一份定义。
const { z } = require('zod');
const text = z.string().max(100000);
const short = z.string().trim().min(1).max(200);
const id = z.string().min(1).max(128).regex(/^[\w-]+$/);
const email = z.string().trim().email().max(254);
const tags = z.array(short).max(50);
const obj = (shape = {}) => z.object(shape); // 自动剔除未声明字段，防止批量赋值。
const optionalId = id.nullish();
const fields = { project_id: optionalId, model: short.optional() };
const messages = z.array(obj({ role: z.enum(['system', 'user', 'assistant', 'tool']), content: text,
  name: short.optional(), tool_call_id: short.optional() })).min(1).max(200);
const years = z.tuple([z.number().int().min(1800).max(2200), z.number().int().min(1800).max(2200)])
  .refine(([from, to]) => from <= to, '年份范围必须从早到晚');
const direction = z.enum(['en2zh', 'zh2en']).optional();
const requiredText = text.refine((s) => s.trim().length > 0, '内容不能为空');
const record = z.record(z.union([z.string().max(2000), z.number().finite(), z.boolean(), z.null()]));
const contracts = {};
function body(method, path, schema) { contracts[method + ' ' + path] = { body: schema }; }
function query(path, schema) { contracts['get ' + path] = { query: schema }; }

body('post', '/auth/login', obj({ email, password: z.string().min(1).max(128) }));
body('post', '/auth/register', obj({ email, password: z.string().min(8).max(128), name: short }));
body('post', '/auth/refresh', obj({ refresh_token: z.string().min(1).max(4096) }));
body('put', '/user/profile', obj({ name: short.optional(), title: text.optional(), avatar: z.string().max(500000).optional(), research_tags: tags.optional(), lang: z.enum(['zh', 'en']).optional() }));
body('post', '/models', obj({ name: short.optional(), base_url: z.string().url().max(2048), model_name: short, provider: z.enum(['openai', 'deepseek', 'custom', 'anthropic', 'gemini', 'ollama']).optional(), api_key: z.string().max(4096).optional(), priority: z.number().int().min(1).max(100).optional() }));
body('post', '/orders', obj({ plan_id: z.enum(['free', 'pro', 'team']) }));
body('post', '/pay/callback', obj({ order_no: short }));
body('post', '/account/2fa', obj({ enabled: z.boolean() }));
body('delete', '/account', obj({ confirm: z.literal('DELETE') }));
query('/usage', obj({ range: z.coerce.number().int().min(1).max(365).optional() }));

body('post', '/chat/completions', obj({ ...fields, messages, stream: z.boolean().optional(), skills: tags.optional(), agent_mode: short.optional(), conversation_id: optionalId }));
body('post', '/conversations', obj({ ...fields, title: short.optional() }));
body('patch', '/conversations/:id', obj({ title: short }));
query('/conversations', obj({ keyword: text.optional(), page: z.coerce.number().int().min(1).optional(), page_size: z.coerce.number().int().min(1).max(100).optional() }));
query('/dashboard/summary', obj({ project_id: id.optional() }));
body('post', '/mcp/:id/call', obj({ name: z.literal('search_papers').optional(), arguments: obj({ query: z.string().trim().min(1).max(500), limit: z.number().int().min(1).max(20).optional() }) }));
query('/mcp/recommend', obj({ intent: text.optional() }));
body('post', '/skills/:id/invoke', obj({ input: text.optional(), prompt: text.optional(), query: text.optional(), model: short.optional() }));
body('post', '/prompt/enhance', obj({ prompt: requiredText }));
body('post', '/chat/memories', obj({ project_id: id.optional(), category: short.optional(), key: short, content: requiredText, tags: tags.optional() }));
body('patch', '/chat/memories/:id', obj({ active: z.boolean().optional(), content: requiredText.optional(), key: short.optional() }));
body('post', '/chat/memories/extract', obj({ project_id: id.optional(), conversation_id: id.optional(), messages: messages.optional() }));
query('/chat/memories', obj({ project_id: id.optional(), conversation_id: id.optional() }));
query('/chat/arxiv/search', obj({ q: text.optional() }));
body('post', '/chat/codeact/run', obj({ query: text.optional() }));

body('post', '/literature/search', obj({ query: requiredText, sources: tags.optional(), year_range: years.optional(), has_code: z.boolean().optional() }));
body('post', '/topic/recommend', obj({ tags: tags.optional(), history: text.optional() }));
body('post', '/topic/feasibility', obj({ topic_desc: requiredText }));
body('post', '/topic/proposal', obj({ topic: text.optional(), refs: tags.optional() }));
body('post', '/literature/review', obj({ topic: requiredText, range: years.optional() }));
query('/tasks/:id/stream', obj({ token: z.string().max(4096).optional(), last_event_id: z.coerce.number().int().min(0).optional() }));

body('post', '/documents/upload', obj({ file_name: z.string().min(1).max(255).optional(), url: z.string().url().max(2048).optional(),
  content: z.string().max(50 * 1024 * 1024).optional(), file_content: z.string().max(69905068).optional(),
  mime: z.string().max(200).optional(), project_id: id.optional() })
  .refine((v) => !!v.file_name || !!v.url, '请提供文件名或 URL')
  .refine((v) => !(v.content !== undefined && v.file_content !== undefined), 'content 与 file_content 不能同时提供'));
body('post', '/documents/:id/translate', obj({ text: requiredText, direction }));
body('post', '/documents/:id/analyze', obj({ mode: z.enum(['all', 'mindmap', 'seven']).optional() }));
body('post', '/documents/:id/chat', obj({ messages: messages.optional(), model: short.optional() }));
body('post', '/knowledge-bases', obj({ name: short, scope: z.enum(['personal', 'team', 'project']).optional() }));
body('post', '/knowledge-bases/:id/query', obj({ q: requiredText, top_k: z.number().int().min(1).max(20).optional() }));
body('post', '/knowledge-bases/:id/ingest', obj({ document_id: id }));

body('post', '/experiments', obj({ project_id: id.optional(), name: short, goal: text.optional(), params: record.optional() }));
body('post', '/experiments/:id/runs', obj({ name: short.optional(), params: record.optional() }));
body('post', '/experiments/plan', obj({ goal: requiredText, method: text.optional() }));
body('post', '/charts/generate', obj({ prompt: text.optional(), data: z.array(z.record(z.union([z.string(), z.number(), z.array(z.number())]))).max(10000).nullish(),
  style: short.optional(), template_id: optionalId, project_id: id.optional() }).refine((v) => v.prompt || v.data || v.template_id, '请提供提示词、数据或模板'));
body('post', '/writing/polish', obj({ text: requiredText, style: short.optional(), target: text.optional() }));
body('post', '/writing/translate', obj({ text: requiredText, direction }));
body('post', '/writing/plagiarism', obj({ text: requiredText }));
body('post', '/writing/paraphrase', obj({ text: requiredText, ratio: z.enum(['low', 'light', 'medium', 'high', 'deep']).optional() }));
body('put', '/manuscripts/:id', obj({ content: text }));

query('/journals', obj({ ccf: z.enum(['A', 'B', 'C']).optional(), field: text.optional(), keyword: text.optional() }));
body('post', '/journals/match', obj({ abstract: requiredText }));
body('post', '/submission-tracks', obj({ journal_id: id }));
body('patch', '/submission-tracks/:id', obj({ status: z.enum(['watching', 'open', 'submitted', 'reviewing', 'revision', 'accepted', 'rejected']).optional(), note: text.optional() }));
body('post', '/deck/generate', obj({ source: text.optional(), template: short.optional() }));
body('post', '/advice/extract', obj({ text: text.optional(), audio: z.boolean().optional() }).refine((v) => v.text || v.audio, '请提供会议记录文本或音频'));
body('patch', '/advice/:id', obj({ status: z.enum(['todo', 'doing', 'done']).optional(), todo: text.optional(), content: text.optional() }));
body('post', '/review/council', obj({ manuscript_id: id, roles: z.array(z.enum(['theory', 'method', 'experiment', 'writing', 'ethics'])).min(1).max(5).optional() }));
body('post', '/projects', obj({ name: short, type: short.optional(), description: text.optional() }));
body('post', '/teams/:id/members', obj({ email, role: z.enum(['member', 'admin']).optional() }));

const dpPayload = obj({ title: text.optional(), method: text.optional(), data: text.optional(), pages: z.coerce.number().int().min(1).max(100).optional(),
  topic: text.optional(), content: text.optional(), style: text.optional(), language: short.optional(), aspect_ratio: short.optional(),
  chart_type: short.optional(), notes: text.optional(), audience: text.optional(), prompt: text.optional(),
  template_ids: tags.optional(), layout_fidelity: short.optional(), style_strength: short.optional(),
  custom: text.optional(), material: text.optional(), master_desc: text.optional() });
body('post', '/dreampaper/jobs', obj({ mode: z.enum(['paper_figure', 'ppt_slide', 'plot_chart']), payload: dpPayload.default({}) })
  .refine((v) => v.mode === 'ppt_slide' ? !!v.payload.pages : v.mode === 'paper_figure' ? !!(v.payload.title?.trim() || v.payload.method?.trim()) : !!(v.payload.title?.trim() || v.payload.data?.trim()), '请填写该模式所需的标题、方法、数据或页数'));
body('post', '/dreampaper/jobs/:id/rate', obj({ rating: z.enum(['good', 'fair', 'poor']).nullable() }));

function getContract(method, path) {
  const schemas = { ...(contracts[method + ' ' + path] || {}) };
  const keys = [...path.matchAll(/:([\w]+)/g)].map((m) => m[1]);
  if (keys.length) schemas.params = obj(Object.fromEntries(keys.map((key) => [key, id])));
  if (['post', 'put', 'patch', 'delete'].includes(method) && !schemas.body) schemas.body = obj();
  if (!schemas.query) schemas.query = obj();
  return schemas;
}
module.exports = { contracts, getContract, messages };
