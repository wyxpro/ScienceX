const crypto = require('crypto');

const SCRYPT_PREFIX = 'scrypt';
const ACCESS_TTL_MS = 7 * 86400000;
const REFRESH_TTL_MS = 30 * 86400000;
const configuredMasterKey = process.env.SCIENCEX_MASTER_KEY || '';
const masterKey = crypto.createHash('sha256').update(configuredMasterKey || 'sciencex-development-key-change-me').digest();

function assertProductionConfig() {
  if (process.env.NODE_ENV === 'production' && configuredMasterKey.length < 32) {
    throw new Error('SCIENCEX_MASTER_KEY must be set to at least 32 characters in production');
  }
}

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

function createToken(prefix) {
  return `${prefix}_${crypto.randomBytes(24).toString('hex')}`;
}

function parseBearer(req) {
  const header = String(req.headers.authorization || '');
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
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

module.exports = { ACCESS_TTL_MS, REFRESH_TTL_MS, hashPassword, verifyPassword, createToken, parseBearer, encryptSecret, decryptSecret, assertProductionConfig };
