/**
 * B9：OpenAPI 3.0 文档生成器。
 * 与运行时校验同源：请求/响应结构直接取自 shared/api-schemas 的 zod 契约，
 * 路径与方法取自 createRouter 收集到的 registeredRoutes，避免文档与代码脱节。
 */
const { zodToJsonSchema } = require('zod-to-json-schema');
const { registeredRoutes } = require('./router');

const API_PREFIX = '/api/v1';

const ENVELOPE_SCHEMA = {
  type: 'object',
  required: ['code', 'message', 'data', 'request_id', 'timestamp'],
  properties: {
    code: { type: 'integer', description: '业务码，0 表示成功（TSD §6.1）' },
    message: { type: 'string' },
    data: { type: 'object', additionalProperties: true },
    request_id: { type: 'string' },
    timestamp: { type: 'string', format: 'date-time' },
  },
};

function toJsonSchema(schema) {
  if (!schema) return undefined;
  try {
    return zodToJsonSchema(schema, { target: 'openApi3' });
  } catch {
    return { type: 'object' };
  }
}

// 把 zod 对象 schema 展开为 OpenAPI 的 parameters（query / path）列表
function toParameters(schema, location) {
  const json = toJsonSchema(schema);
  if (!json || !json.properties) return [];
  const required = new Set(Array.isArray(json.required) ? json.required : []);
  return Object.entries(json.properties).map(([name, prop]) => ({
    name,
    in: location,
    required: required.has(name),
    schema: prop,
  }));
}

function toPathKey(path) {
  return `${API_PREFIX}${path}`.replace(/:(\w+)/g, '{$1}');
}

function toTag(path) {
  const segment = path.split('/').filter(Boolean)[0] || 'default';
  return [segment];
}

function buildOpenApiDocument() {
  const paths = {};
  for (const route of registeredRoutes) {
    const pathKey = toPathKey(route.path);
    const schemas = route.schemas || {};
    const parameters = [...toParameters(schemas.params, 'path'), ...toParameters(schemas.query, 'query')];
    const operation = {
      tags: toTag(route.path),
      operationId: `${route.method}${pathKey.replace(/[^a-zA-Z0-9]+/g, '_')}`,
      security: route.authenticated ? [{ bearerAuth: [] }] : [],
      responses: {
        200: { description: '成功（统一响应信封）', content: { 'application/json': { schema: ENVELOPE_SCHEMA } } },
        400: { description: '参数校验失败（code=40011）' },
        401: { description: 'Token 失效或未认证（code=40101）' },
      },
    };
    if (parameters.length) operation.parameters = parameters;
    if (schemas.body && ['post', 'put', 'patch', 'delete'].includes(route.method)) {
      operation.requestBody = { required: true, content: { 'application/json': { schema: toJsonSchema(schemas.body) } } };
    }
    paths[pathKey] = { ...(paths[pathKey] || {}), [route.method]: operation };
  }
  return {
    openapi: '3.0.3',
    info: {
      title: 'ScienceX API',
      version: '1.0.0',
      description: 'ScienceX 科研 AI 工作台后端契约，由共享 zod schema 与路由注册信息自动生成（与运行时校验同源，见 fx1.md B9）。',
    },
    servers: [{ url: API_PREFIX, description: '统一前缀' }],
    tags: [...new Set(Object.values(paths).flatMap((item) => Object.values(item).flatMap((op) => op.tags)))].map((name) => ({ name })),
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT（HMAC-SHA256 签名令牌 sx1.）' } },
    },
    paths,
  };
}

module.exports = { buildOpenApiDocument };
