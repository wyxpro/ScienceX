/**
 * ScienceX AI 模块 —— DeepSeek V4.1 Flash 模型专有通讯客户端
 * 采用原生 HTTPS 模块与标准 fetch，完全兼容 OpenAI 接口与 Sophnet 协议
 * 支持非流式推演与流式思维链 (Reasoning Content) 实时解析
 */
const https = require('https');
const http = require('http');
const config = require('./config');

class DeepSeekClient {
  constructor(cfg = config) {
    this.config = cfg;
  }

  /**
   * 非流式对话推演
   * @param {Array<{role: string, content: string}>} messages 对话列表
   * @param {Object} options 选项 (temperature, max_tokens, signal, model)
   * @returns {Promise<{text: string, reasoning: string, usage: Object, model: string}>}
   */
  async chatCompletion(messages, options = {}, retryCount = 1) {
    if (!this.config.hasKey()) {
      throw new Error('未配置 DeepSeek API Key，请检查 .env 文件中的 DEEPSEEK_API_KEY');
    }

    const endpoint = `${this.config.baseUrl}/chat/completions`;
    const model = options.model || this.config.model;
    const temperature = options.temperature !== undefined ? options.temperature : 0.3;

    const payload = JSON.stringify({
      model,
      messages,
      temperature,
      stream: false,
      ...(options.max_tokens ? { max_tokens: options.max_tokens } : {}),
    });

    const parsedUrl = new URL(endpoint);
    const transport = parsedUrl.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
      const req = transport.request(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Length': Buffer.byteLength(payload),
        },
        timeout: options.timeoutMs || this.config.timeoutMs,
      }, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
            return reject(new Error(`DeepSeek API 请求失败 [HTTP ${res.statusCode}]: ${body.slice(0, 200)}`));
          }
          try {
            const data = JSON.parse(body);
            const choice = data.choices?.[0];
            const message = choice?.message || {};
            const content = message.content || '';
            const reasoning = message.reasoning_content || '';
            const usage = data.usage || {
              prompt_tokens: Math.round(JSON.stringify(messages).length / 4),
              completion_tokens: Math.round(content.length / 4),
              total_tokens: 0,
            };
            resolve({
              text: content,
              reasoning,
              model: data.model || model,
              usage,
              id: data.id,
            });
          } catch (jsonErr) {
            reject(new Error(`解析 DeepSeek 返回数据失败: ${jsonErr.message}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        if (retryCount > 0) {
          console.warn('[DeepSeekClient] 请求超时，正在重试...');
          return resolve(this.chatCompletion(messages, options, retryCount - 1));
        }
        reject(new Error('DeepSeek API 请求超时'));
      });

      req.on('error', (err) => {
        if (retryCount > 0) {
          console.warn('[DeepSeekClient] 网络异常，正在重试:', err.message);
          return resolve(this.chatCompletion(messages, options, retryCount - 1));
        }
        reject(err);
      });

      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          req.destroy();
          reject(new Error('请求已被调用方取消'));
        }, { once: true });
      }

      req.write(payload);
      req.end();
    });
  }

  /**
   * 流式对话推演，原生支持 SSE 数据流解析
   * 可分别捕获 DeepSeek 思维链 (Reasoning Content) 与正文 (Delta Content)
   * @param {Array<{role: string, content: string}>} messages 
   * @param {Object} callbacks 回调函数 { onThought, onDelta, onDone, onError }
   */
  async streamChatCompletion(messages, callbacks = {}, options = {}) {
    if (!this.config.hasKey()) {
      const err = new Error('未配置 DeepSeek API Key，请检查 .env 文件中的 DEEPSEEK_API_KEY');
      if (callbacks.onError) callbacks.onError(err);
      throw err;
    }

    const endpoint = `${this.config.baseUrl}/chat/completions`;
    const model = options.model || this.config.model;
    const temperature = options.temperature !== undefined ? options.temperature : 0.3;

    const payload = JSON.stringify({
      model,
      messages,
      temperature,
      stream: true,
      ...(options.max_tokens ? { max_tokens: options.max_tokens } : {}),
    });

    const parsedUrl = new URL(endpoint);
    const transport = parsedUrl.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
      let fullContent = '';
      let fullReasoning = '';
      let finalUsage = null;
      let isDone = false;

      const req = transport.request(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      }, (res) => {
        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          let errBody = '';
          res.on('data', (d) => { errBody += d; });
          res.on('end', () => {
            const error = new Error(`DeepSeek API 流式请求错误 [HTTP ${res.statusCode}]: ${errBody.slice(0, 200)}`);
            if (callbacks.onError) callbacks.onError(error);
            reject(error);
          });
          return;
        }

        let buffer = '';
        res.on('data', (chunk) => {
          buffer += chunk.toString('utf8');
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // 保留尚未闭合的一行

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;

            const dataStr = trimmed.slice(5).trim();
            if (dataStr === '[DONE]') {
              isDone = true;
              continue;
            }

            try {
              const parsed = JSON.parse(dataStr);
              const choice = parsed.choices?.[0];
              const delta = choice?.delta;

              if (delta) {
                // 处理思考链输出 (CoT reasoning_content)
                if (delta.reasoning_content) {
                  fullReasoning += delta.reasoning_content;
                  if (callbacks.onThought) callbacks.onThought(delta.reasoning_content, fullReasoning);
                }
                // 处理正文输出
                if (delta.content) {
                  fullContent += delta.content;
                  if (callbacks.onDelta) callbacks.onDelta(delta.content, fullContent);
                }
              }

              // 捕获用量数据
              if (parsed.usage) {
                finalUsage = parsed.usage;
              }
            } catch (parseErr) {
              // 忽略不完整的 JSON 碎片
            }
          }
        });

        res.on('end', () => {
          const result = {
            text: fullContent,
            reasoning: fullReasoning,
            usage: finalUsage || {
              prompt_tokens: Math.round(JSON.stringify(messages).length / 4),
              completion_tokens: Math.round(fullContent.length / 4),
              total_tokens: Math.round((JSON.stringify(messages).length + fullContent.length) / 4),
            },
            model,
          };
          if (callbacks.onDone) callbacks.onDone(result);
          resolve(result);
        });

        res.on('error', (err) => {
          if (callbacks.onError) callbacks.onError(err);
          reject(err);
        });
      });

      req.on('error', (err) => {
        if (callbacks.onError) callbacks.onError(err);
        reject(err);
      });

      // 监听外部终止信号
      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          req.destroy();
          reject(new Error('请求已被调用方取消'));
        }, { once: true });
      }

      req.write(payload);
      req.end();
    });
  }

  /**
   * 连通性测试
   */
  async testConnection() {
    const started = Date.now();
    try {
      const res = await this.chatCompletion([
        { role: 'user', content: '请只回复：连接正常' }
      ], { temperature: 0.1 });
      const latencyMs = Date.now() - started;
      return {
        success: true,
        latencyMs,
        model: res.model,
        sample: res.text,
        reasoning: res.reasoning,
        endpoint: this.config.baseUrl,
      };
    } catch (err) {
      return {
        success: false,
        latencyMs: Date.now() - started,
        error: err.message,
        endpoint: this.config.baseUrl,
      };
    }
  }
}

const defaultClient = new DeepSeekClient();

module.exports = {
  DeepSeekClient,
  client: defaultClient,
};
