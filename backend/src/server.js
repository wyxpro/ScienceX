/**
 * ScienceX AI 科研工作台 —— 后端 API 服务
 * 演示环境：Node.js + Express（生产架构为 Java Spring Boot 业务域 + Python FastAPI AI 域，见 TSD §1.2）
 * 接口契约完全遵循 TSD §5（REST + SSE + 统一响应结构）
 */
const express = require('express');
const cors = require('cors');
const { ok } = require('./lib/respond');
const { rateLimit } = require('./lib/rate-limit');
const store = require('./lib/store');
const { assertProductionConfig } = require('./lib/security');
const { logger, getLogger, context } = require('./lib/logger');
const { buildOpenApiDocument } = require('./lib/openapi');

const accountRoutes = require('./routes/account');
const chatRoutes = require('./routes/chat');
const literatureRoutes = require('./routes/literature');
const documentsRoutes = require('./routes/documents');
const researchRoutes = require('./routes/research');
const publishRoutes = require('./routes/publish');
const dreampaperRoutes = require('./routes/dreampaper');
const aiModule = require('./ai');

const app = express();
assertProductionConfig();
const requestLogger = logger;
const allowedOrigins = new Set((process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((origin) => origin.trim()).filter(Boolean));
app.use(cors({ origin(origin, callback) {
  if (!origin || allowedOrigins.has(origin)) return callback(null, true);
  return callback(null, false);
} }));
app.disable('x-powered-by');

// 请求追踪（TSD §5.1：X-Request-Id 全链路透传）；B5：结构化访问日志 + ALS 链路上下文，B1：持久化失败只告警不炸进程
app.use((req, res, next) => {
  req.requestId = `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  res.setHeader('X-Request-Id', req.requestId);
  const started = performance.now();
  res.on('finish', () => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      Promise.resolve(store.persist()).catch((error) => requestLogger.error({ event: 'persist_failed', request_id: req.requestId, method: req.method, path: req.originalUrl, err: error }, '数据持久化失败'));
    }
    if (!req.path.startsWith('/health') && !req.path.startsWith('/api/health')) {
      requestLogger.info({ event: 'request', request_id: req.requestId, method: req.method, path: req.originalUrl.split('?')[0], status: res.statusCode, duration_ms: Math.round(performance.now() - started) });
    }
  });
  return context.run({ logger: requestLogger.child({ request_id: req.requestId }) }, next);
});
// 文献导入需承载 Base64 编码的源文件（单文件 50MB → Base64 约 67MB），故单独放宽上传路由限制
app.use('/api/v1/documents/upload', express.json({ limit: '72mb' }));
app.use(express.json({ limit: '2mb' }));

// B3：每个挂载点独立 scope，共享限流后端（Redis/Upstash）下不同阈值不互踩；登录用户按 userId、匿名按 IP 计数
app.use('/api/v1/chat/completions', rateLimit({ scope: 'chat-completions', windowMs: 60000, max: 30 }));
app.use('/api/v1/writing', rateLimit({ scope: 'writing', windowMs: 60000, max: 60 }));
app.use('/api/v1/literature', rateLimit({ scope: 'literature', windowMs: 60000, max: 60 }));

// 健康检查
app.get(['/health', '/api/health', '/api/v1/health'], (req, res) => ok(res, { service: 'sciencex-backend', version: '1.0.0', ts: new Date().toISOString() }));

// B9：OpenAPI 文档由共享 zod 契约与路由注册信息生成，与运行时校验同源（GET /api/v1/openapi.json）
app.get('/api/v1/openapi.json', (req, res) => res.json(buildOpenApiDocument()));

// AI 模块能力状态与连通性验证 (3.1.1 文本模态)
app.get('/api/v1/ai/status', (req, res) => {
  ok(res, {
    active: aiModule.config.hasKey(),
    model: aiModule.config.model,
    model_name: aiModule.config.modelDisplayName,
    endpoint: aiModule.config.baseUrl,
    modality: '3.1.1 文本模态（Text）',
    capabilities: [
      '对话中枢 (Chat Completions)',
      '长上下文 / RAG 问答 (Document QA)',
      '学术中英互译 (Academic Translation)',
      '学术润色 (Academic Polish)',
      'AI 降重 (Paraphrase)',
      '科研提示词增强 (Prompt Enhancement)',
      '多智能体专家评审团 (Review Council)',
    ],
  });
});

app.post('/api/v1/ai/test', async (req, res) => {
  const result = await aiModule.client.testConnection();
  ok(res, result);
});

// 业务路由（统一前缀 /api/v1）
app.use('/api/v1', accountRoutes.router);
app.use('/api/v1', chatRoutes.router);
app.use('/api/v1', literatureRoutes.router);
app.use('/api/v1', documentsRoutes.router);
app.use('/api/v1', researchRoutes.router);
app.use('/api/v1', publishRoutes.router);
app.use('/api/v1', dreampaperRoutes.router);

// 404
app.use((req, res) => {
  res.status(404).json({ code: 40003, message: `接口不存在: ${req.method} ${req.path}`, data: {}, request_id: req.requestId, timestamp: new Date().toISOString() });
});

// 全局异常（TSD §6.1：500xx 服务端错误）；B5：结构化日志落完整堆栈便于 Serverless 排障
app.use((err, req, res, next) => {
  if (res.headersSent) {
    if (!res.writableEnded) res.end();
    return;
  }
  const badRequest = err?.type === 'entity.too.large' || err?.type === 'entity.parse.failed';
  const status = Number(err?.statusCode) || (badRequest ? 400 : 500);
  const code = Number(err?.businessCode) || (badRequest ? 40001 : 50001);
  const message = err?.publicMessage || (badRequest ? '请求数据格式无效或超过大小限制' : '服务内部错误，请稍后重试');
  getLogger().error({ event: 'unhandled_error', method: req.method, path: req.originalUrl, status, code, err }, err?.message || String(err));
  res.status(status).json({ code, message, data: {}, request_id: req.requestId, timestamp: new Date().toISOString() });
});

const fs = require('fs');
const path = require('path');

const DEFAULT_PORT = parseInt(process.env.PORT || '8787', 10);

function startServer(port, maxAttempts = 20) {
  assertProductionConfig();
  const server = app.listen(port, () => {
    logger.info({ event: 'server_start', port }, `ScienceX Backend running at http://localhost:${port} · 演示账号 demo@sciencex.cn / 123456`);
    try {
      const portFilePath = path.resolve(__dirname, '../.port');
      fs.writeFileSync(portFilePath, String(port), 'utf8');
    } catch (e) {
      logger.warn({ event: 'port_file_write_failed', err: e }, `记录端口文件失败: ${e.message}`);
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && maxAttempts > 0) {
      logger.warn({ event: 'port_in_use', port }, `端口 ${port} 已被占用，自动切换至 ${port + 1}`);
      startServer(port + 1, maxAttempts - 1);
    } else {
      logger.fatal({ event: 'server_start_failed', err }, '服务启动失败');
      process.exit(1);
    }
  });
}

if (require.main === module) {
  startServer(DEFAULT_PORT);
}

module.exports = app;
