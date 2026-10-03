// Offline by default. --live explicitly enables external model calls and compares both modes.
if (!process.argv.includes('--live')) process.env.SCIENCEX_SKIP_ENV_FILE = 'true';
const cases = require('./cases.json');
const { generateReply } = require('../src/lib/ai');
const { client, config } = require('../src/ai');
const { version } = require('../src/ai/prompts');
function score(text, expected) {
  const hits = expected.filter((pattern) => new RegExp(pattern, 'i').test(text));
  return { score: hits.length / expected.length, matched: hits, missing: expected.filter((p) => !hits.includes(p)) };
}
async function run() {
  const live = process.argv.includes('--live');
  if (live && !config.hasKey()) throw new Error('--live 需要配置模型密钥');
  const results = [];
  for (const item of cases) {
    const messages = [{ role: 'user', content: item.question }];
    const fallback = generateReply(messages, item.scene);
    const row = { id: item.id, question: item.question, template: { text: fallback, ...score(fallback, item.expected) }, live: { status: 'skipped' }, minimum: item.minimum };
    if (live) {
      try {
        const result = await client.chatCompletion([{ role: 'system', content: '你是严谨科研助手。没有原文或数据时不得编造数值、引用或页码，应明确说明证据不足。' }, ...messages], { temperature: 0, max_tokens: 700 });
        row.live = { status: 'completed', text: result.text, usage: result.usage, model: result.model, ...score(result.text, item.expected) };
      } catch (error) { row.live = { status: 'failed', error: error.code || error.message }; }
    }
    results.push(row);
  }
  const failed = results.filter((r) => r.template.score < r.minimum || (live && (r.live.status !== 'completed' || r.live.score < r.minimum)));
  const report = { prompt_version: version, metric: '期望要点正则命中率；不等价于事实正确性或完整人工评审', cases: cases.length, template_average: results.reduce((s, r) => s + r.template.score, 0) / results.length, live_enabled: live, failed: failed.map((r) => r.id), results };
  console.log(JSON.stringify(report, null, 2));
  if (process.argv.includes('--check') && failed.length) process.exitCode = 1;
}
if (require.main === module) run().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { score };
