const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
process.env.SCIENCEX_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'sciencex-ai-'));
const { DeepSeekClient } = require('../src/ai/client');
const { withRetry, withCircuit, AIError } = require('../src/ai/resilience');
const { requestFor } = require('../src/ai/providers');
const store = require('../src/lib/store');
const rag = require('../src/ai/rag');
let server, endpoint, requests = 0, handler;
test.before(async () => {
  server = http.createServer((req, res) => { requests++; handler(req, res); });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  endpoint = `http://127.0.0.1:${server.address().port}`;
});
test.after(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await store.flush?.();
  fs.rmSync(process.env.SCIENCEX_DATA_DIR, { recursive: true, force: true });
});
const client = () => new DeepSeekClient({ baseUrl: endpoint, apiKey: 'test', model: 'fixture-model', hasKey: () => true, timeoutMs: 1000 });
test('429/5xx 重试，401 不重试，取消不重试', async () => {
  requests = 0;
  handler = (_req, res) => { if (requests < 3) { res.writeHead(429); res.end(); } else res.end(JSON.stringify({ choices: [{ message: { content: 'ok' } }] })); };
  assert.equal((await client().chatCompletion([{ role: 'user', content: 'hello' }])).text, 'ok');
  assert.equal(requests, 3);
  requests = 0;
  handler = (_req, res) => { res.writeHead(401); res.end(); };
  await assert.rejects(client().chatCompletion([]), { code: 'UPSTREAM_401' });
  assert.equal(requests, 1);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(client().chatCompletion([], { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(requests, 1);
});
test('连续失败触发熔断，熔断期间不发起请求', async () => {
  let count = 0;
  const fail = () => { count++; throw new AIError('unavailable', 'DOWN', { retryable: true }); };
  await assert.rejects(withCircuit('fixture-circuit', fail, { threshold: 1 }));
  await assert.rejects(withCircuit('fixture-circuit', fail), { code: 'CIRCUIT_OPEN' });
  assert.equal(count, 1);
});
test('流式 UTF-8 跨块解析、usage 与一次完成通知', async () => {
  requests = 0; let done = 0, errors = 0, output = '';
  handler = (_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    const data = Buffer.from('data: {"choices":[{"delta":{"content":"你好"}}]}\n\ndata: {"choices":[],"usage":{"prompt_tokens":7,"completion_tokens":2}}\n\ndata: [DONE]');
    const pos = data.indexOf(Buffer.from('你')) + 1;
    res.write(data.subarray(0, pos)); setTimeout(() => res.end(data.subarray(pos)), 5);
  };
  const result = await client().streamChatCompletion([], { onDelta: (t) => { output += t; }, onDone: () => done++, onError: () => errors++ });
  assert.equal(output, '你好'); assert.equal(result.usage.prompt_tokens, 7); assert.equal(done, 1); assert.equal(errors, 0);
});
test('流已输出后截断不得重试或伪造 done', async () => {
  requests = 0; let done = 0, errors = 0;
  handler = (_req, res) => res.end('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n');
  await assert.rejects(client().streamChatCompletion([], { onDone: () => done++, onError: () => errors++ }), { code: 'STREAM_INTERRUPTED', sentDelta: true });
  assert.equal(requests, 1); assert.equal(done, 0); assert.equal(errors, 1);
});
test('整次请求 deadline 覆盖响应体读取', async () => {
  handler = (_req, res) => { res.writeHead(200); res.write('{'); };
  await assert.rejects(client().chatCompletion([], { timeoutMs: 20, retries: 0 }), { code: 'AI_TIMEOUT' });
});
test('四种 Provider 请求与响应字段映射', () => {
  const cfg = { baseUrl: 'https://example.org/v1', model: 'model-x', apiKey: 'test' };
  const messages = [{ role: 'system', content: 'rules' }, { role: 'user', content: 'hi' }];
  const a = requestFor('anthropic', cfg, messages);
  assert.equal(a.headers['x-api-key'], 'test'); assert.equal(a.body.system, 'rules'); assert.equal(a.body.messages.length, 1);
  assert.equal(a.parse({ content: [{ type: 'text', text: 'ok' }], usage: { input_tokens: 3, output_tokens: 4 } }).usage.completion_tokens, 4);
  const g = requestFor('gemini', cfg, messages); assert.match(g.url, /:generateContent$/); assert.equal(g.body.contents[0].role, 'user');
  assert.equal(g.parse({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }).text, 'ok');
  const o = requestFor('ollama', cfg, messages); assert.match(o.url, /api\/chat$/); assert.equal(o.parse({ message: { content: 'ok' }, eval_count: 5 }).usage.completion_tokens, 5);
  const c = requestFor('openai', cfg, messages, { stream: true }); assert.equal(c.body.stream_options.include_usage, true);
});
test('真实 arXiv XML 映射与跨源 DOI 去重', () => {
  const { parseArxiv, deduplicate } = require('../src/ai/literature');
  const papers = parseArxiv('<feed><entry><id>https://arxiv.org/abs/1234.5678v1</id><title>A &amp; B</title><author><name>Alice</name></author><summary>Text</summary><published>2025-01-01</published><arxiv:doi>10.1/test</arxiv:doi><link title="pdf" href="https://arxiv.org/pdf/1234.5678"/></entry></feed>');
  assert.equal(papers[0].title, 'A & B'); assert.equal(papers[0].authors, 'Alice'); assert.equal(papers[0].year, 2025);
  const merged = deduplicate([...papers, { ...papers[0], id: 'openalex-id', doi: 'https://doi.org/10.1/TEST', sources: ['OpenAlex'] }]);
  assert.equal(merged.length, 1); assert.deepEqual(merged[0].sources, ['arXiv', 'OpenAlex']);
});
test('Embedding 语义召回、重建缓存、页码溯源与内部向量隐藏', async () => {
  process.env.EMBEDDING_BASE_URL = endpoint;
  process.env.EMBEDDING_MODEL = 'fixture-embed';
  const doc = { id: 'doc-test', title: 'Study', structured: { sections: [{ id: 'methods', title: '方法', page: 9, paragraph_pages: [9, null], paragraphs: ['cats sleep', 'quantum field'] }] } };
  const chunks = rag.chunksFromDocument(doc); let calls = 0;
  handler = async (req, res) => {
    let body = ''; for await (const c of req) body += c;
    const input = JSON.parse(body).input; calls++;
    res.end(JSON.stringify({ data: input.map((text, index) => ({ index, embedding: /quantum/.test(text) ? [0, 1] : [1, 0] })) }));
  };
  let result = await rag.retrieve(chunks, 'feline rest', { topK: 1 });
  assert.equal(result.mode, 'vector'); assert.equal(result.items[0].text, 'cats sleep'); assert.equal(result.items[0].page, 9); assert.equal(result.items[0].embedding, undefined);
  assert.equal(chunks[1].page, null);
  await rag.retrieve(chunks, 'feline rest'); assert.equal(calls, 3);
  chunks[0].text = 'quantum physics'; await rag.retrieve(chunks, 'quantum'); assert.equal(calls, 5);
  process.env.EMBEDDING_BASE_URL = '';
  result = await rag.retrieve(chunks, 'quantum'); assert.equal(result.mode, 'keyword-fallback'); assert.equal(result.degraded, true);
});
test('无效向量拒绝，不能污染已有索引', async () => {
  process.env.EMBEDDING_BASE_URL = endpoint;
  handler = (_req, res) => res.end('{"data":[{"index":0,"embedding":[0,0]}]}');
  const chunks = [{ id: 'x', text: 'hello' }];
  await assert.rejects(rag.indexChunks(chunks), { code: 'INVALID_EMBEDDING' }); assert.equal(chunks[0].embedding, undefined);
  process.env.EMBEDDING_BASE_URL = '';
});
test('用量按调用记录、价格未知不伪造零成本、隔离用户', async () => {
  const { context } = require('../src/ai/usage');
  handler = (_req, res) => res.end(JSON.stringify({ choices: [{ message: { content: 'ok' } }], usage: { prompt_tokens: 100, completion_tokens: 50 } }));
  process.env.AI_PRICES_JSON = '{"fixture-model":{"input":2,"output":4}}';
  await context.run({ userId: 'usage-owner', scene: 'review' }, () => client().chatCompletion([]));
  const record = store.usageRecords[0]; assert.equal(record.owner_id, 'usage-owner'); assert.equal(record.cost, 0.0004); assert.equal(record.calls, 1);
  delete process.env.AI_PRICES_JSON;
  await client().chatCompletion([], { userId: 'other' }); assert.equal(store.usageRecords[0].cost, null);
});
test('记忆证据校验、跨项目去重和容量淘汰', async () => {
  const { mergeFacts } = require('../src/ai/memory');
  const messages = [{ role: 'user', content: '采用五折交叉验证，报告标准差。' }];
  const fact = { key: 'protocol', content: '采用五折交叉验证', category: 'research', tags: [], importance: 0.9, evidence: '采用五折交叉验证' };
  process.env.MEMORY_MAX_FACTS = '1';
  assert.equal((await mergeFacts([fact], messages, 'test-owner', 'p1')).added.length, 1);
  assert.equal((await mergeFacts([fact], messages, 'test-owner', 'p1')).merged.length, 1);
  assert.equal((await mergeFacts([fact], messages, 'test-owner', 'p2')).added.length, 1);
  assert.equal((await mergeFacts([{ ...fact, key: 'fake', evidence: '三次随机种子' }], messages, 'test-owner', 'p1')).added.length, 0);
  const result = await mergeFacts([{ ...fact, key: 'report', content: '报告标准差', evidence: '报告标准差' }], messages, 'test-owner', 'p1');
  assert.equal(result.evicted, 1); delete process.env.MEMORY_MAX_FACTS;
});
test('官方 MCP SDK 真实握手和工具枚举，CodeAct 执行明确禁用', async () => {
  const mcp = require('../src/ai/mcp');
  for (const item of mcp.catalog) {
    const result = await mcp.connect(item.id); assert.equal(result.status, 'connected'); assert.equal(result.tools[0].name, 'search_papers');
  }
  const result = require('../src/lib/agents/lingxiEngine').runCodeActSandbox('print(1)');
  assert.equal(result.executed, false); assert.equal(result.code, 'SANDBOX_DISABLED');
});

test('MCP 工具调用贯通 SDK 与检索服务，保留真实来源', async () => {
  const original = global.fetch;
  global.fetch = async (url) => {
    assert.equal(new URL(url).hostname, 'export.arxiv.org');
    return new Response('<feed><entry><id>https://arxiv.org/abs/2501.00001</id><title>Fixture study</title><author><name>Alice</name></author><summary>Evidence</summary><published>2025-01-01</published></entry></feed>');
  };
  try {
    const result = await require('../src/ai/mcp').call('arxiv-live', 'search_papers', { query: 'study', limit: 1 });
    const data = JSON.parse(result.content[0].text);
    assert.equal(data.items[0].title, 'Fixture study');
    assert.equal(data.items[0].source, 'live');
    assert.equal(data.items[0].has_code, false);
  } finally { global.fetch = original; }
});

test('无证据的降级方案不伪造实验指标或执行结果', () => {
  const fallbacks = require('../src/ai/fallbacks');
  const result = fallbacks.structured('研究方法');
  assert.deepEqual(result.jsonSchema.measured_results, []);
  assert.equal(result.jsonSchema.dataset, null);
  assert.ok(fallbacks.planSteps().every((s) => s.output === ''));
  assert.match(fallbacks.planReport('研究方法', []), /未运行实验/);
});
