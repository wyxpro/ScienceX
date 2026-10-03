const config = require('./config');
const { requestFor } = require('./providers');
const { AIError, withRetry, withCircuit, circuitKey, fetchBody } = require('./resilience');
const { recordUsage } = require('./usage');

class DeepSeekClient {
  constructor(cfg = config) { this.config = cfg; }
  async request(messages, options, consume) {
    if (!this.config.hasKey()) throw new AIError('未配置模型密钥', 'MODEL_NOT_CONFIGURED');
    const request = requestFor(this.config.provider || 'openai', this.config, messages, options);
    return withCircuit(circuitKey(request.url, this.config.apiKey), () => withRetry(() => fetchBody(request.url, {
      method: 'POST', headers: request.headers, body: JSON.stringify(request.body), signal: options.signal,
    }, (response) => consume(response, request), options.timeoutMs || this.config.timeoutMs || 30000), { signal: options.signal, retries: options.retries }));
  }
  async chatCompletion(messages, options = {}) {
    const result = await this.request(messages, options, async (response, request) => {
      const result = request.parse(await response.json());
      // 推理型模型（如 Kimi K2.5）在短输出预算下可能只返回 reasoning_content；降级采用思维链而非直接报错
      if ((!result.text || !String(result.text).trim()) && result.reasoning && result.reasoning.trim()) result.text = result.reasoning.trim();
      if (typeof result.text !== 'string' || !result.text.trim()) throw new AIError('模型返回了空内容', 'INVALID_RESPONSE');
      return result;
    });
    await recordUsage(result, options);
    return result;
  }
  async streamChatCompletion(messages, callbacks = {}, options = {}) {
    let emitted = false;
    try {
      if (['anthropic', 'gemini', 'ollama'].includes(this.config.provider)) {
        const result = await this.chatCompletion(messages, options);
        callbacks.onDelta?.(result.text, result.text);
        callbacks.onDone?.(result);
        return result;
      }
      const result = await this.request(messages, { ...options, stream: true }, async (response) => {
        let text = '', reasoning = '', buffer = '', complete = false, usage = {}, model = options.model || this.config.model;
        const decoder = new TextDecoder();
        const line = (value) => {
          if (!value.startsWith('data:')) return;
          const raw = value.slice(5).trim();
          if (raw === '[DONE]') { complete = true; return; }
          if (!raw) return;
          let data;
          try { data = JSON.parse(raw); } catch { throw new AIError('模型流数据格式无效', 'INVALID_STREAM'); }
          if (data.error) throw new AIError('模型流返回错误', 'UPSTREAM_STREAM_ERROR');
          const delta = data.choices?.[0]?.delta;
          if (delta?.reasoning_content) { emitted = true; reasoning += delta.reasoning_content; callbacks.onThought?.(delta.reasoning_content, reasoning); }
          if (delta?.content) { emitted = true; text += delta.content; callbacks.onDelta?.(delta.content, text); }
          if (data.usage) usage = data.usage;
          if (data.model) model = data.model;
          if (data.choices?.[0]?.finish_reason) complete = true;
        };
        try {
          for await (const chunk of response.body) {
            buffer += decoder.decode(chunk, { stream: true });
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop();
            lines.forEach(line);
          }
          buffer += decoder.decode();
          if (buffer.trim()) line(buffer.trim());
          if (!complete || !text) throw new AIError('模型流未正常完成', 'STREAM_INTERRUPTED', { retryable: true });
        } catch (error) { error.sentDelta = emitted; throw error; }
        return { text, reasoning, usage, model };
      });
      await recordUsage(result, options);
      callbacks.onDone?.(result);
      return result;
    } catch (error) {
      error.sentDelta = emitted;
      callbacks.onError?.(error);
      throw error;
    }
  }
  async testConnection() {
    const started = Date.now();
    try {
      const result = await this.chatCompletion([{ role: 'user', content: '请只回复：连接正常' }]);
      return { success: true, latencyMs: Date.now() - started, model: result.model, sample: result.text, endpoint: this.config.baseUrl };
    } catch (error) { return { success: false, latencyMs: Date.now() - started, error: error.message, endpoint: this.config.baseUrl }; }
  }
}
module.exports = { DeepSeekClient, client: new DeepSeekClient() };
