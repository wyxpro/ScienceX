/**
 * ScienceX AI 模块配置中心 —— DeepSeek V4.1 Flash 与模型网关参数
 * 密钥来自 .env 文件，严格禁止代码硬编码
 */
const path = require('path');
const fs = require('fs');

// 优先加载 .env 文件（支持 Node 20+ 的 process.loadEnvFile 与轻量自解析回退）
function loadEnvironment() {
  const envCandidates = [
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../../.env'),
    path.resolve(process.cwd(), 'backend/.env'),
    path.resolve(process.cwd(), '.env'),
  ];

  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      try {
        if (typeof process.loadEnvFile === 'function') {
          process.loadEnvFile(envPath);
          break;
        } else {
          const content = fs.readFileSync(envPath, 'utf8');
          for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx > 0) {
              const key = trimmed.slice(0, eqIdx).trim();
              const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
              if (!process.env[key]) {
                process.env[key] = val;
              }
            }
          }
          break;
        }
      } catch (err) {
        console.warn('[ScienceX AI Config] 加载 .env 异常:', err.message);
      }
    }
  }
}

loadEnvironment();

const config = {
  // Sophnet / DeepSeek 基础端点
  baseUrl: (process.env.DEEPSEEK_BASE_URL || process.env.OPENAI_BASE_URL || 'https://www.sophnet.com/api/open-apis/v1').replace(/\/+$/, ''),
  apiKey: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || '',
  model: process.env.DEEPSEEK_MODEL || 'DeepSeek-Flash',
  modelDisplayName: 'DeepSeek V4.1 Flash',
  timeoutMs: Number(process.env.DEEPSEEK_TIMEOUT_MS || process.env.OPENAI_TIMEOUT_MS || 45000),

  // 状态检查
  hasKey() {
    return Boolean(this.apiKey && this.apiKey.trim().length > 10);
  },
  
  // 重新加载配置
  reload() {
    loadEnvironment();
    this.baseUrl = (process.env.DEEPSEEK_BASE_URL || process.env.OPENAI_BASE_URL || 'https://www.sophnet.com/api/open-apis/v1').replace(/\/+$/, '');
    this.apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || '';
    this.model = process.env.DEEPSEEK_MODEL || 'DeepSeek-Flash';
  }
};

module.exports = config;
