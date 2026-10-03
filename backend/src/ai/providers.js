const { AIError } = require('./resilience');
const PROVIDERS = ['openai', 'deepseek', 'custom', 'anthropic', 'gemini', 'ollama'];
function requestFor(provider, config, messages, options = {}) {
  const base = config.baseUrl.replace(/\/+$/, ''), model = options.model || config.model;
  const temperature = options.temperature ?? 0.3;
  const headers = { 'Content-Type': 'application/json' };
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
  const turns = messages.filter((m) => m.role !== 'system');
  if (provider === 'anthropic') return {
    url: `${base}/messages`, headers: { ...headers, 'x-api-key': config.apiKey, 'anthropic-version': '2023-06-01' },
    body: { model, system, messages: turns, max_tokens: options.max_tokens || 4096, temperature },
    parse: (data) => ({ text: (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join(''), model: data.model || model, usage: data.usage ? { prompt_tokens: data.usage.input_tokens, completion_tokens: data.usage.output_tokens } : {} }),
  };
  if (provider === 'gemini') return {
    url: `${base}/models/${encodeURIComponent(model)}:generateContent`, headers: { ...headers, 'x-goog-api-key': config.apiKey },
    body: { ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}), contents: turns.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })), generationConfig: { temperature, ...(options.max_tokens ? { maxOutputTokens: options.max_tokens } : {}) } },
    parse: (data) => ({ text: (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join(''), model, usage: data.usageMetadata ? { prompt_tokens: data.usageMetadata.promptTokenCount, completion_tokens: data.usageMetadata.candidatesTokenCount } : {} }),
  };
  if (provider === 'ollama') return {
    url: `${base}/api/chat`, headers, body: { model, messages, stream: false, options: { temperature, ...(options.max_tokens ? { num_predict: options.max_tokens } : {}) } },
    parse: (data) => ({ text: data.message?.content, model: data.model || model, usage: { prompt_tokens: data.prompt_eval_count, completion_tokens: data.eval_count } }),
  };
  if (!PROVIDERS.includes(provider)) throw new AIError('不支持的模型协议', 'INVALID_PROVIDER');
  return {
    url: `${base}/chat/completions`, headers: { ...headers, Authorization: `Bearer ${config.apiKey}` },
    body: { model, messages, temperature, stream: !!options.stream, ...(options.stream ? { stream_options: { include_usage: true } } : {}), ...(options.max_tokens ? { max_tokens: options.max_tokens } : {}), ...(options.response_format ? { response_format: options.response_format } : {}) },
    parse: (data) => ({ text: data.choices?.[0]?.message?.content, reasoning: data.choices?.[0]?.message?.reasoning_content || '', model: data.model || model, usage: data.usage || {}, id: data.id }),
  };
}
module.exports = { PROVIDERS, requestFor };
