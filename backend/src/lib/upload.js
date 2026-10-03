const path = require('node:path');
const https = require('node:https');
const dns = require('node:dns').promises;
const net = require('node:net');
const { TextDecoder } = require('node:util');
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MIME = {
  pdf: ['application/pdf'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  doc: ['application/msword'],
  md: ['text/markdown', 'text/plain', 'text/x-markdown'],
  markdown: ['text/markdown', 'text/plain', 'text/x-markdown'],
  caj: ['application/caj', 'application/x-caj', 'application/octet-stream'],
};
function invalid(message) {
  return Object.assign(new Error(message), { statusCode: 400, businessCode: 40011, publicMessage: message });
}
function cleanFileName(value) {
  const name = path.posix.basename(String(value).replace(/\\/g, '/')).normalize('NFC')
    .replace(/[\x00-\x1f\x7f<>:"|?*]/g, '_').replace(/[. ]+$/g, '');
  if (!name || name.length > 255 || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i.test(name)) throw invalid('文件名无效');
  if (!MIME[path.extname(name).slice(1).toLowerCase()]) throw invalid('仅支持 PDF / Word / Markdown / CAJ 文件');
  return name;
}
function decodeBase64(value) {
  if (!value || value.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw invalid('file_content 必须为完整的 Base64 编码');
  if (value.length / 4 * 3 - (value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0) > MAX_FILE_BYTES) throw invalid('单文件不能超过 50MB');
  return Buffer.from(value, 'base64');
}
function inspectFile(buffer, name, mime = '') {
  if (!buffer.length) throw invalid('文件内容不能为空');
  if (buffer.length > MAX_FILE_BYTES) throw invalid('单文件不能超过 50MB');
  const ext = path.extname(cleanFileName(name)).slice(1).toLowerCase();
  const declared = mime.toLowerCase().split(';')[0].trim();
  if (declared && declared !== 'application/octet-stream' && !MIME[ext].includes(declared)) throw invalid('声明的 MIME 与文件扩展名不符');
  const head = buffer.subarray(0, 8).toString('latin1');
  let matches = false;
  if (ext === 'pdf') matches = /^%PDF-\d\.\d/.test(head);
  if (ext === 'doc') matches = buffer.subarray(0, 8).equals(Buffer.from('d0cf11e0a1b11ae1', 'hex'));
  if (ext === 'caj') matches = /^(CAJ|TEBX|HN)/.test(head);
  if (ext === 'docx') {
    try {
      const entries = require('./parser')._internal.readZipEntries(buffer);
      matches = head.startsWith('PK\x03\x04') && entries.has('[Content_Types].xml') && entries.has('word/document.xml');
    } catch { matches = false; }
  }
  if (ext === 'md' || ext === 'markdown') {
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
      matches = !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text) && !/^(MZ|%PDF-|PK\x03\x04)/.test(text);
    } catch { matches = false; }
  }
  if (!matches) throw invalid('文件内容与声明格式不符或文件已损坏');
  return MIME[ext][0];
}
function isPublicAddress(address) {
  if (net.isIP(address) === 4) {
    const [a, b] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a === 169 && b === 254 ||
      a === 172 && b >= 16 && b <= 31 || a === 192 && [0, 168].includes(b) ||
      a === 100 && b >= 64 && b <= 127 || a === 198 && [18, 19].includes(b) || a >= 224);
  }
  // 公网 IPv6 仅接收全球单播，排除 mapped IPv4/ULA/link-local。
  return net.isIP(address) === 6 && /^[23][0-9a-f]{3}:/i.test(address);
}
async function fetchDocument(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port && url.port !== '443') throw invalid('URL 导入仅允许无凭据的公网 HTTPS 地址');
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = net.isIP(hostname) ? [{ address: hostname, family: net.isIP(hostname) }] : await dns.lookup(hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) throw invalid('URL 不得指向本机或内网');
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      // 固定已校验地址，防 DNS 重绑定；不跟随重定向。
      lookup: (_host, options, callback) => options.all ? callback(null, [addresses[0]]) : callback(null, addresses[0].address, addresses[0].family),
      headers: { Accept: 'application/pdf,text/markdown,application/octet-stream' },
    }, (response) => {
      if (response.statusCode !== 200 || Number(response.headers['content-length'] || 0) > MAX_FILE_BYTES) {
        response.destroy(); request.destroy(invalid('URL 返回非 200 状态、重定向或文件超过 50MB')); return;
      }
      const chunks = [];
      let size = 0;
      response.on('data', (chunk) => {
        size += chunk.length;
        if (size > MAX_FILE_BYTES) request.destroy(invalid('URL 文件超过 50MB'));
        else chunks.push(chunk);
      });
      response.on('error', reject);
      response.on('end', () => resolve({ buffer: Buffer.concat(chunks), mime: response.headers['content-type'] || '' }));
    });
    const timer = setTimeout(() => request.destroy(invalid('URL 文件下载超时')), 15000);
    request.on('error', reject);
    request.on('close', () => clearTimeout(timer));
  });
}
module.exports = { MAX_FILE_BYTES, cleanFileName, decodeBase64, inspectFile, fetchDocument, isPublicAddress };
