/**
 * ScienceX AI 模块统一出口
 * 汇聚 DeepSeek V4.1 Flash 客户端、3.1.1 文本模态能力、流式适配器与配置中心
 */
const config = require('./config');
const { DeepSeekClient, client } = require('./client');
const textModality = require('./textModality');
const { pipeDeepSeekToSSE } = require('./streamAdapter');

module.exports = {
  config,
  DeepSeekClient,
  client,
  textModality,
  pipeDeepSeekToSSE,
};
