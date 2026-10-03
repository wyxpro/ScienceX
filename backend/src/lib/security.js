const crypto = require('crypto');

const SCRYPT_PREFIX = 'scrypt';
const ACCESS_TTL_MS = 7 * 86400000;
const REFRESH_TTL_MS = 30 * 86400000;
require('../ai/config'); // 所有入口先加载环境配置，再派生密钥和检查生产配置。
const configuredMasterKey = process.env.SCIENCEX_MASTER_KEY || '';
const masterKey = crypto.createHash('sha256').update(configuredMasterKey || 'sciencex-development-key-change-me').digest();

function assertProductionConfig() {
  if (process.env.NODE_ENV === 'production' && (configuredMasterKey.trim().length < 32 ||
      ['sciencex-development-key-change-me', 'replace-with-a-long-random-secret'].includes(configuredMasterKey))) {
    throw new Error('生产环境必须配置 SCIENCEX_MASTER_KEY（至少 32 字符的随机密钥），拒绝使用开发或示例密钥');
  }
}

assertProductionConfig();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${SCRYPT_PREFIX}$${salt}$${derived}`;
}

function verifyPassword(password, encoded) {
  if (typeof encoded !== 'string' || !encoded.startsWith(`${SCRYPT_PREFIX}$`)) return false;
  const [, salt, expected] = encoded.split('$');
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(String(password), salt, 64).toString('hex');
  const actualBuffer = Buffer.from(actual, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function parseBearer(req) {
  const header = String(req.headers.authorization || '');
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

/* ---------- 无状态签名令牌（Serverless 多实例共用） ----------
   Vercel 等环境下实例内存不共享，随机不透明令牌 + 内存会话表会导致
   "Token 已失效，请重新登录"。改为 HMAC-SHA256 自包含令牌：
   密钥来自 SCIENCEX_MASTER_KEY（跨实例一致），任何实例均可离线验签。 */
const SIGNED_TOKEN_PREFIX = 'sx1.';

function signTokenBody(body) {
  return crypto.createHmac('sha256', masterKey).update(body).digest('base64url');
}

function createSignedToken(userId, type, ttlMs) {
  const nowMs = Date.now();
  const body = Buffer.from(JSON.stringify({ uid: userId, typ: type, iat: nowMs, exp: nowMs + ttlMs }), 'utf8').toString('base64url');
  return `${SIGNED_TOKEN_PREFIX}${body}.${signTokenBody(body)}`;
}

function verifySignedToken(token, expectedType) {
  if (typeof token !== 'string' || !token.startsWith(SIGNED_TOKEN_PREFIX)) return null;
  const [body, sig] = token.slice(SIGNED_TOKEN_PREFIX.length).split('.');
  if (!body || !sig) return null;
  const actual = Buffer.from(sig);
  const expected = Buffer.from(signTokenBody(body));
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload?.uid || typeof payload.exp !== 'number' || payload.exp <= Date.now()) return null;
    if (expectedType && payload.typ !== expectedType) return null;
    return payload;
  } catch {
    return null;
  }
}

function encryptSecret(value) {
  if (!value) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', masterKey, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return [iv.toString('hex'), cipher.getAuthTag().toString('hex'), encrypted.toString('hex')].join('.');
}

function decryptSecret(value) {
  if (!value) return '';
  try {
    const [ivHex, tagHex, dataHex] = String(value).split('.');
    const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
}

module.exports = { ACCESS_TTL_MS, REFRESH_TTL_MS, hashPassword, verifyPassword, createSignedToken, verifySignedToken, parseBearer, encryptSecret, decryptSecret, assertProductionConfig };
