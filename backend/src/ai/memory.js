const { z } = require('zod');
const store = require('../lib/store');
const gateway = require('../lib/model-gateway');
const { render } = require('./prompts');
const schema = z.object({ facts: z.array(z.object({
  key: z.string().min(1).max(80), content: z.string().min(5).max(800), category: z.string().max(40),
  importance: z.number().min(0).max(1), evidence: z.string().min(5).max(800), tags: z.array(z.string().max(40)).max(8),
})).max(20) });
const normalized = (text) => text.toLowerCase().replace(/[\s\p{P}]/gu, '');
async function mergeFacts(facts, messages, userId, projectId) {
  const source = messages.filter((m) => m.role === 'user').map((m) => String(m.content)).join('\n');
  const added = [], merged = [];
  for (const item of facts) {
    if (item.importance < 0.5 || !source.includes(item.evidence) || /api[_ -]?key|password|密码|密钥|sk-[a-z0-9]/i.test(item.content + item.evidence)) continue;
    const existing = store.researchMemories.find((m) => m.user_id === userId && m.project_id === projectId && (normalized(m.key) === normalized(item.key) || normalized(m.content) === normalized(item.content)));
    if (existing) {
      Object.assign(existing, item, { updated_at: store.now(), last_accessed_at: store.now() });
      merged.push(existing);
    } else {
      const fact = { ...item, id: store.id('mem'), user_id: userId, project_id: projectId, active: true, created_at: store.now(), last_accessed_at: store.now(), source: 'llm' };
      store.researchMemories.push(fact); added.push(fact);
    }
  }
  const cap = Math.max(1, Math.min(1000, Number(process.env.MEMORY_MAX_FACTS) || 100));
  const owned = store.researchMemories.filter((m) => m.user_id === userId && m.project_id === projectId);
  const priority = (m) => (m.importance || 0.5) * 0.7 + 0.3 / (1 + Math.max(0, Date.now() - Date.parse(m.last_accessed_at || m.created_at)) / 86400000);
  const evicted = new Set(owned.sort((a, b) => priority(b) - priority(a)).slice(cap).map((m) => m.id));
  for (let i = store.researchMemories.length - 1; i >= 0; i--) if (evicted.has(store.researchMemories[i].id)) store.researchMemories.splice(i, 1);
  await store.persist();
  return { added: added.filter((m) => !evicted.has(m.id)), merged, evicted: evicted.size, total: owned.length - evicted.size, mode: 'live' };
}
async function extract(messages, userId, projectId) {
  const result = await gateway.complete(render('memory', { messages }), { userId, scene: 'memory', temperature: 0, response_format: { type: 'json_object' } });
  if (!result) return { added: [], merged: [], total: 0, mode: 'unavailable', reason: '未配置模型，未生成或保存推测事实' };
  const parsed = schema.parse(JSON.parse(result.text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')));
  return mergeFacts(parsed.facts, messages, userId, projectId);
}
module.exports = { extract, mergeFacts, schema };
