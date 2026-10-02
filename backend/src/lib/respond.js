/**
 * 统一响应结构 —— 遵循 TSD §5.2
 * { code, message, data, request_id, timestamp }
 */
let reqCounter = 0;

function genRequestId() {
  reqCounter += 1;
  return `req_${Date.now().toString(36)}_${reqCounter.toString(36)}`;
}

function ok(res, data = {}, message = 'ok') {
  res.json({
    code: 0,
    message,
    data,
    request_id: genRequestId(),
    timestamp: new Date().toISOString(),
  });
}

/**
 * 业务失败：HTTP 状态码与业务 code 遵循 TSD §6.1 错误码体系
 * 400xx 客户端 / 401xx 认证 / 403xx 配额 / 500xx 服务端 / 600xx AI / 700xx 外部服务
 */
function fail(res, httpStatus, code, message, details) {
  res.status(httpStatus).json({
    code,
    message,
    data: details ? { details } : {},
    request_id: genRequestId(),
    timestamp: new Date().toISOString(),
  });
}

const errors = {
  param: (res, msg = '参数校验失败') => fail(res, 400, 40001, msg),
  notFound: (res, msg = '资源不存在') => fail(res, 404, 40003, msg),
  forbidden: (res, msg = '无权限访问该资源') => fail(res, 403, 40009, msg),
  unauthorized: (res, msg = 'Token 已失效，请重新登录') => fail(res, 401, 40101, msg),
  quota: (res, msg = '配额不足，请升级套餐') => fail(res, 403, 40301, msg),
  modelTimeout: (res, msg = '模型请求超时') => fail(res, 504, 60001, msg),
};

module.exports = { ok, fail, errors, genRequestId };
