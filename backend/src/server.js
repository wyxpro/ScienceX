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

const accountRoutes = require('./routes/account');
const chatRoutes = require('./routes/chat');
const literatureRoutes = require('./routes/literature');
const documentsRoutes = require('./routes/documents');
const researchRoutes = require('./routes/research');
const publishRoutes = require('./routes/publish');

const app = express();
const allowedOrigins = new Set((process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((origin) => origin.trim()).filter(Boolean));
app.use(cors({ origin(origin, callback) {
  if (!origin || allowedOrigins.has(origin)) return callback(null, true);
  return callback(null, false);
} }));
app.use(express.json({ limit: '2mb' }));
app.disable('x-powered-by');

// 请求追踪（TSD §5.1：X-Request-Id 全链路透传）
app.use((req, res, next) => {
  res.setHeader('X-Request-Id', `req_${Date.now().toString(36)}`);
  res.on('finish', () => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) store.persist();
  });
  next();
});

app.use('/api/v1/chat/completions', rateLimit({ windowMs: 60000, max: 30 }));
app.use('/api/v1/writing', rateLimit({ windowMs: 60000, max: 60 }));
app.use('/api/v1/literature', rateLimit({ windowMs: 60000, max: 60 }));

// 健康检查
app.get(['/health', '/api/health', '/api/v1/health'], (req, res) => ok(res, { service: 'sciencex-backend', version: '1.0.0', ts: new Date().toISOString() }));

// 业务路由（统一前缀 /api/v1）
app.use('/api/v1', accountRoutes.router);
app.use('/api/v1', chatRoutes.router);
app.use('/api/v1', literatureRoutes.router);
app.use('/api/v1', documentsRoutes.router);
app.use('/api/v1', researchRoutes.router);
app.use('/api/v1', publishRoutes.router);

// 404
app.use((req, res) => {
  res.status(404).json({ code: 40003, message: `接口不存在: ${req.method} ${req.path}`, data: {}, timestamp: new Date().toISOString() });
});

// 全局异常（TSD §6.1：500xx 服务端错误）
app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(500).json({ code: 50001, message: '服务内部错误，请稍后重试', data: { details: String(err.message || err) }, timestamp: new Date().toISOString() });
});

const fs = require('fs');
const path = require('path');

const DEFAULT_PORT = parseInt(process.env.PORT || '8787', 10);

function startServer(port, maxAttempts = 20) {
  const server = app.listen(port, () => {
    console.log(`[ScienceX Backend] running at http://localhost:${port}`);
    console.log('[ScienceX Backend] API 前缀: /api/v1  ·  演示账号: demo@sciencex.cn / 123456');
    try {
      const portFilePath = path.resolve(__dirname, '../.port');
      fs.writeFileSync(portFilePath, String(port), 'utf8');
    } catch (e) {
      console.warn('[ScienceX Backend] 记录端口文件失败:', e.message);
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && maxAttempts > 0) {
      console.warn(`[ScienceX Backend] 端口 ${port} 已被占用，正在自动切换至端口 ${port + 1}...`);
      startServer(port + 1, maxAttempts - 1);
    } else {
      console.error('[ScienceX Backend] 服务启动失败:', err);
      process.exit(1);
    }
  });
}

if (require.main === module) {
  startServer(DEFAULT_PORT);
}

module.exports = app;
