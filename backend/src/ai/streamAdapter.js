/**
 * ScienceX AI 模块 —— SSE 流式适配器
 * 将 DeepSeek-Flash 的原生流式推演（含 Thinking 链）无缝转换为 ScienceX 前端所需的标准 SSE 事件
 */
const { client } = require('./client');

/**
 * 将 DeepSeek 流接入 Express SSE 响应
 * @param {import('express').Response} res Express 响应流
 * @param {Object} params 参数
 * @param {Array} params.messages 历史对话
 * @param {string} params.model 模型名称
 * @param {string} params.messageId 消息 ID
 * @param {string} params.agentMode 智能体模式
 * @param {Function} [params.beforeStream] 流开始前的预置事件发送
 */
async function pipeDeepSeekToSSE(res, {
  messages,
  model = 'DeepSeek-Flash',
  messageId = `msg_${Date.now()}`,
  agentMode = 'general',
  beforeStream,
  temperature = 0.3,
}) {
  // 确保已发送 SSE Header
  if (!res.headersSent) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write('retry: 3000\n\n');
  }

  let seq = 0;
  const send = (event, data) => {
    if (res.writableEnded) return;
    seq += 1;
    res.write(`id: ${seq}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  send('start', {
    message_id: messageId,
    model,
    agent_mode: agentMode,
    timestamp: new Date().toISOString(),
  });

  if (typeof beforeStream === 'function') {
    beforeStream(send);
  }

  const abortController = new AbortController();
  const onClose = () => {
    abortController.abort();
  };
  res.on('close', onClose);

  try {
    const result = await client.streamChatCompletion(messages, {
      onThought: (chunk, fullThought) => {
        send('thought', { text: chunk, full: fullThought });
      },
      onDelta: (chunk, fullText) => {
        send('delta', { text: chunk });
      },
      onDone: (finalResult) => {
        send('done', {
          message_id: messageId,
          tokens: finalResult.usage?.total_tokens || Math.round(finalResult.text.length * 0.7),
          model,
          agent_mode: agentMode,
          has_reasoning: Boolean(finalResult.reasoning),
        });
      },
      onError: (err) => {
        send('error', { message: err.message || '模型推演中断' });
      },
    }, {
      model,
      temperature,
      signal: abortController.signal,
    });

    return result;
  } catch (err) {
    if (!res.writableEnded) {
      send('error', { message: err.message || '模型请求失败' });
    }
    throw err;
  } finally {
    res.removeListener('close', onClose);
    if (!res.writableEnded) {
      res.end();
    }
  }
}

module.exports = {
  pipeDeepSeekToSSE,
};
