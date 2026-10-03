/**
 * 临时探测脚本：实测 OpenAI Next 网关 (https://api.openai-next.com/v1) 各候选文本模型连通性
 * 用法: node tmp-next-check.js <model1> <model2> ...
 */
const BASE = 'https://api.openai-next.com/v1';
const KEY = 'sk-IYSE4I96nem6aCRe06FfBfE6420c492589E50510Eb6f25A5';

async function probe(model) {
  const started = Date.now();
  try {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: '回复一个词：连接成功' }],
        max_tokens: 16,
        temperature: 0.1,
      }),
      signal: AbortSignal.timeout(60000),
    });
    const data = await res.json().catch(() => ({}));
    const msg = data?.choices?.[0]?.message || data?.choices?.[0]?.delta || {};
    const text = msg?.content || msg?.reasoning_content || msg?.reasoning || data?.error?.message || JSON.stringify(data).slice(0, 200);
    console.log(`[${res.ok ? 'OK ' : 'FAIL'}] ${model} · HTTP ${res.status} · ${Date.now() - started}ms · ${String(text).slice(0, 150)}`);
  } catch (err) {
    console.log(`[ERR ] ${model} · ${err.message} · ${Date.now() - started}ms`);
  }
}

(async () => {
  const models = process.argv.slice(2);
  for (const m of models) await probe(m);
})();
