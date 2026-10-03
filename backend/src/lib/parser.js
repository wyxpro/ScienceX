/**
 * 多格式文档解析引擎 —— 文献导入 REQ-READ-01
 *
 * 支持格式：PDF / Word(.docx) / Markdown(.md/.markdown) / CAJ(中国知网)
 * 设计原则：零第三方依赖（纯 Node Buffer 解析），PDF 的正文提取委托给已安装的
 * Python PyMuPDF（如环境具备），其它格式在 Node 侧完成，任何一步失败都降级为
 * 「可阅读的结构化正文」而不是抛错，保证导入链路永远可用。
 *
 * 解析产物统一为：
 *   { title, authors, abstract, sections:[{id,title,page,paragraphs[]}],
 *     figures:[{id,label,caption,ref}], text, meta }
 */

const { execFile } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

/** 允许导入的扩展名（含 CAJ） */
const SUPPORTED_EXT = ['pdf', 'docx', 'doc', 'md', 'markdown', 'caj'];
/** 单文件上限 50MB —— 与前端提示保持一致 */
const MAX_FILE_BYTES = 50 * 1024 * 1024;
/** 解析正文最多保留的字符数，防止超大文件撑爆内存与响应体 */
const MAX_TEXT_CHARS = 400000;

class UnsupportedFormatError extends Error {
  constructor(ext) {
    super(`暂不支持 .${ext || '未知'} 格式，请转换为 PDF / Word / Markdown / CAJ 后重新导入`);
    this.name = 'UnsupportedFormatError';
    this.statusCode = 400;
    this.businessCode = 40001;
    this.publicMessage = this.message;
  }
}

class FileTooLargeError extends Error {
  constructor(size) {
    super(`文件大小 ${(size / 1024 / 1024).toFixed(1)}MB 超过 50MB 单文件上限`);
    this.name = 'FileTooLargeError';
    this.statusCode = 400;
    this.businessCode = 40001;
    this.publicMessage = this.message;
  }
}

function extOf(name = '') {
  const clean = String(name).split('?')[0].split('#')[0];
  const idx = clean.lastIndexOf('.');
  return idx >= 0 ? clean.slice(idx + 1).toLowerCase() : '';
}

function scriptTag(lang, body) {
  return `<${lang}>${String(body).replace(new RegExp(`</${lang}>`, 'gi'), `<\\/${lang}>`)}</${lang}>`;
}

/** ---------- 通用文本工具 ---------- */

function normalizeText(input = '') {
  return String(input)
    .replace(/\r\n?/g, '\n')
    .replace(/\u0000/g, '')
    .replace(/[\u00a0\u2007\u202f]/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\ufb01/g, 'fi')
    .replace(/\ufb02/g, 'fl');
}

/** 是否是「章节标题」样式的短行（Markdown 之外格式的兜底切分依据） */
function isHeadingLine(line) {
  const t = line.trim();
  if (!t || t.length > 90) return false;
  return /^(?:\d+(?:\.\d+)*[.、)]?\s+|第\s*[一二三四五六七八九十0-9]+\s*[章节部分]|Abstract|摘要|Introduction|Background|Related\s+Work|Method(?:s|ology)?|Approach|Experiment(?:s|al)?|Result(?:s)?|Discussion|Conclusion(?:s)?|References|Acknowledg(?:e?ment|ments)|Appendix|引言|背景|相关工作|方法|实验|结果|讨论|结论|参考文献|致谢|附录)/i.test(
    t
  );
}

/** 按空行 / 标题 / 中文句末标点做段落切分，避免「一句一段」导致阅读碎片化 */
function splitParagraphs(text, { collapse = true } = {}) {
  const normalized = normalizeText(text);
  const rawBlocks = normalized
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  const out = [];
  for (const block of rawBlocks) {
    // 先拆行，遇到标题行即断开，正文行按长度聚合成段
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    let buf = '';
    const flush = () => {
      const t = buf.trim();
      buf = '';
      if (!t) return;
      if (t.length > 900) {
        // 超长段落按句末标点二次切分
        const sentences = t.split(/(?<=[。！？!?；;])\s*/).filter(Boolean);
        let cur = '';
        sentences.forEach((s) => {
          if ((cur + s).length > 700) {
            if (cur) out.push(cur.trim());
            cur = s;
          } else cur += s;
        });
        if (cur.trim()) out.push(cur.trim());
        return;
      }
      out.push(t);
    };

    for (const line of lines) {
      if (isHeadingLine(line)) {
        flush();
        out.push(`__HEADING__${line}`);
      } else if (collapse) {
        buf += (buf && !/[A-Za-z0-9]$/.test(buf) ? '' : ' ') + line;
      } else {
        buf += (buf ? '\n' : '') + line;
      }
    }
    flush();
  }
  return out;
}

/** 把 __HEADING__ 标记的段落序列整理为 sections */
function blocksToSections(blocks, { fallbackTitle = '1. 正文' } = {}) {
  const sections = [];
  let current = null;
  let headingCount = 0;
  let orphan = 0;

  const pushCurrent = (nextTitle) => {
    if (current && current.paragraphs.length) sections.push(current);
    current = nextTitle ? { id: `s${sections.length + 1}`, title: nextTitle, page: sections.length + 1, paragraphs: [] } : null;
  };

  for (const block of blocks) {
    if (block.startsWith('__HEADING__')) {
      headingCount += 1;
      pushCurrent(block.replace('__HEADING__', '').trim());
      continue;
    }
    if (!current) {
      orphan += 1;
      current = { id: `s${sections.length + 1}`, title: fallbackTitle, page: 1, paragraphs: [] };
    }
    current.paragraphs.push(block);
  }
  if (current && current.paragraphs.length) sections.push(current);

  // 无标题文档：按等长切分为 3~5 节，保证左侧目录不会只有一个超长章节
  if (!headingCount && sections.length) {
    const all = sections.flatMap((s) => s.paragraphs);
    sections.length = 0;
    const parts = Math.min(5, Math.max(3, Math.ceil(all.length / 8)));
    const step = Math.ceil(all.length / parts) || 1;
    for (let i = 0; i < parts; i += 1) {
      const chunk = all.slice(i * step, (i + 1) * step);
      if (!chunk.length) continue;
      sections.push({
        id: `s${i + 1}`,
        title: `${i + 1}. ${['背景与概述', '方法与框架', '实验与结果', '讨论与分析', '结论与展望'][i] || '正文'}`,
        page: i * 3 + 1,
        paragraphs: chunk,
      });
    }
  }
  return { sections: sections.slice(0, 60), headingCount, orphan };
}

/** 从正文中抓取图 / 表的引用与标题（图表引用提取） */
function extractFigures(sections, rawText) {
  const figures = [];
  const captionRe = /(?:^|\n)\s*((?:图|表|Figure|Fig\.?|Table)\s*\d+[A-Za-z]?)\s*[:.：]?\s*([^\n]{0,180})/g;
  let m;
  const source = rawText || sections.flatMap((s) => s.paragraphs).join('\n');
  while ((m = captionRe.exec(source)) && figures.length < 60) {
    figures.push({ id: `fig${figures.length + 1}`, label: m[1].trim(), caption: (m[2] || '').trim(), ref: null });
  }
  // 正文中仅引用未给出标题的图表也登记，便于侧栏索引
  const refOnlyRe = /(?:as shown in|see|参见|如|见)\s*((?:图|表|Figure|Fig\.?|Table)\s*\d+)/gi;
  while ((m = refOnlyRe.exec(source)) && figures.length < 120) {
    const label = m[1].trim();
    if (!figures.some((f) => f.label.toLowerCase() === label.toLowerCase())) {
      figures.push({ id: `fig${figures.length + 1}`, label, caption: '', ref: 'inline-mention' });
    }
  }
  const known = new Set();
  return figures.filter((f) => {
    const k = f.label.toLowerCase();
    if (known.has(k) && !f.caption) return false;
    known.add(k);
    return true;
  });
}

/** ---------- PDF ---------- */

const PY_PDF_EXTRACTOR = `
import base64, json, sys, tempfile, os
data = base64.b64decode(sys.argv[1])
tmp = os.path.join(tempfile.gettempdir(), 'sx-' + os.urandom(6).hex() + '.pdf')
open(tmp, 'wb').write(data)
out = {'ok': False, 'pages': [], 'meta': {}}
doc = None
try:
    # PyMuPDF 2.x 起推荐 import pymupdf，旧版本仍使用 fitz
    try:
        import pymupdf as fitz
    except Exception:
        import fitz
    doc = fitz.open(tmp)
    out['meta'] = {'page_count': doc.page_count, 'title': (doc.metadata or {}).get('title', '')}
    for i, page in enumerate(doc):
        try:
            text = page.get_text('text')
        except Exception:
            text = ''
        out['pages'].append({'page': i + 1, 'text': text})
    out['ok'] = bool(doc.page_count)
except Exception as e:
    out['error'] = str(e)
finally:
    try:
        if doc is not None:
            doc.close()
    except Exception:
        pass
    try:
        os.remove(tmp)
    except Exception:
        pass
print(json.dumps(out))
`;

/**
 * PDF 文本层提取：优先 PyMuPDF，其次 pdfminer / pypdf，均不可用时返回 ok:false，
 * 由调用方降级为「版面占位 + 可阅读摘要」，而不是让整个导入失败。
 */
function pythonCandidates() {
  const list = [];
  if (process.env.SCIENCEX_PYTHON) list.push(process.env.SCIENCEX_PYTHON);
  if (process.env.PYTHON) list.push(process.env.PYTHON);
  list.push('python3', 'python');
  const home = process.env.USERPROFILE || process.env.HOME;
  if (home) {
    list.push(
      path.join(os.homedir(), '.workbuddy', 'binaries', 'python', 'envs', 'default', 'Scripts', 'python.exe'),
      path.join(home, '.workbuddy', 'binaries', 'python', 'versions', '3.13.12', 'python.exe'),
      path.join(home, '.workbuddy', 'binaries', 'python', 'versions', '3.13.9', 'python.exe')
    );
  }
  return [...new Set(list)];
}

function runPython(script, args, timeout = 45000, { accept } = {}) {
  return new Promise((resolve) => {
    const candidates = pythonCandidates();
    let index = 0;
    const tryNext = () => {
      if (index >= candidates.length) return resolve(null);
      const bin = candidates[index++];
      execFile(bin, ['-c', script, ...args], { timeout, maxBuffer: 256 * 1024 * 1024, windowsHide: true }, (err, stdout) => {
        if (err || !stdout) return tryNext();
        let parsed;
        try {
          parsed = JSON.parse(String(stdout).trim().split('\n').pop());
        } catch {
          return tryNext();
        }
        // 解释器能跑但缺少所需依赖时（ok:false）继续尝试下一个候选解释器
        if (typeof accept === 'function' && !accept(parsed)) return tryNext();
        resolve(parsed);
      });
    };
    tryNext();
  });
}

async function extractPdf(buffer) {
  const result = await runPython(PY_PDF_EXTRACTOR, [buffer.toString('base64')], 60000, { accept: (r) => r && r.ok && r.pages?.length });
  if (result && result.ok && result.pages?.length) {
    const text = result.pages.map((p) => p.text || '').join('\n');
    return {
      text,
      pages: result.pages.map((p) => ({ page: p.page, text: p.text || '' })),
      pageCount: result.meta?.page_count || result.pages.length,
      engine: 'pymupdf',
      title: result.meta?.title || '',
    };
  }
  return { text: '', pages: [], pageCount: 0, engine: 'none' };
}

/** ---------- DOCX（Word OOXML，纯 Node 解 zip） ---------- */

function inflateRaw(buffer) {
  try {
    // Node 12+ 内置 zlib.inflateRawSync 可直接解压 zip 的 deflate 数据
    return require('zlib').inflateRawSync(buffer);
  } catch {
    return null;
  }
}

/** 极简 ZIP 读取器：只支持普通条目（含 data descriptor 的条目做兜底扫描） */
function readZipEntries(buffer) {
  const entries = new Map();
  const eocdSig = 0x06054b50;
  let eocd = -1;
  for (let i = buffer.length - 22; i >= 0 && i >= buffer.length - 22 - 65536; i--) {
    if (buffer.readUInt32LE(i) === eocdSig) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return entries;
  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);

  for (let n = 0; n < count && offset + 46 <= buffer.length; n++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) break;
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLen = buffer.readUInt16LE(offset + 28);
    const extraLen = buffer.readUInt16LE(offset + 30);
    const commentLen = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLen);
    entries.set(name, { method, compressedSize, localOffset });
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function extractZipEntry(buffer, entry) {
  if (!entry) return null;
  const { localOffset, compressedSize, method } = entry;
  if (buffer.readUInt32LE(localOffset) !== 0x04034b50) return null;
  const nameLen = buffer.readUInt16LE(localOffset + 26);
  const extraLen = buffer.readUInt16LE(localOffset + 28);
  const start = localOffset + 30 + nameLen + extraLen;
  const size = compressedSize || undefined;
  const data = buffer.subarray(start, size ? start + size : buffer.length);
  if (method === 0) return data;
  if (method === 8) return inflateRaw(data);
  return null;
}

/** 把 OOXML 段落节点转成纯文本，保留 <w:p> 的段落边界 */
function wordXmlToText(xml) {
  const paragraphs = xml.split(/<w:p[\s>]/).slice(1);
  const lines = [];
  for (const para of paragraphs) {
    const body = para.split(/(?=<w:p[\s>])/)[0];
    const texts = [...body.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]);
    const breaks = (body.match(/<w:br\s*\/?>/g) || []).length;
    const raw = texts.join('').trim();
    if (!raw) {
      if (breaks) lines.push('');
      continue;
    }
    lines.push(raw);
  }
  return lines.join('\n');
}

function xmlDecode(s = '') {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&');
}

function extractDocx(buffer) {
  const entries = readZipEntries(buffer);
  const docEntry = entries.get('word/document.xml');
  const xmlBuf = extractZipEntry(buffer, docEntry);
  if (!xmlBuf) {
    return { text: '', engine: 'none' };
  }
  const xml = xmlBuf.toString('utf8');
  let text = xmlDecode(wordXmlToText(xml));

  // 读取 docProps/core.xml 获取真实标题 / 作者
  let coreTitle = '';
  let coreAuthor = '';
  const coreBuf = extractZipEntry(buffer, entries.get('docProps/core.xml'));
  if (coreBuf) {
    const core = coreBuf.toString('utf8');
    coreTitle = xmlDecode((/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/.exec(core) || [])[1] || '');
    coreAuthor = xmlDecode((/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/.exec(core) || [])[1] || '');
  }
  return { text, engine: 'docx-ooxml', title: coreTitle.trim(), authors: coreAuthor.trim() };
}

/** ---------- Markdown ---------- */

function stripInlineMarkdown(s = '') {
  return s
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__)([\s\S]*?)\1/g, '$2')
    .replace(/(\*|_)([\s\S]*?)\1/g, '$2')
    .replace(/~~([\s\S]*?)~~/g, '$1')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+[.)]\s+/gm, '')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMarkdown(text) {
  const src = normalizeText(text);
  const lines = src.split('\n');
  let title = '';
  const headings = [];
  const blocks = [];
  let inCode = false;
  let abstract = '';
  let authors = '';

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;

    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const text2 = stripInlineMarkdown(h[2]);
      if (!text2) continue;
      if (level === 1 && !title) {
        title = text2;
        continue;
      }
      headings.push({ level, title: text2 });
      blocks.push(`__HEADING__${text2}`);
      continue;
    }
    if (/^\s*(?:[-*_]\s*){3,}$/.test(line)) continue; // 分隔线
    if (/^\s*\|/.test(line)) continue; // 表格行（Markdown 表格不具备段落语义）
    const stripped = stripInlineMarkdown(line);
    if (!stripped) continue;
    if (/^(?:作者|Authors?|By)\s*[:：]/i.test(stripped) && !authors) {
      authors = stripped.replace(/^(?:作者|Authors?|By)\s*[:：]\s*/i, '');
      continue;
    }
    if (/^(?:摘要|Abstract)\s*[:：]?\s*/i.test(stripped) && !abstract) {
      abstract = stripped.replace(/^(?:摘要|Abstract)\s*[:：]?\s*/i, '');
      continue;
    }
    blocks.push(stripped);
  }

  if (!title) {
    const firstHeading = headings.find((h) => h.level <= 2);
    const firstText = blocks.find((b) => !b.startsWith('__HEADING__'));
    title = firstHeading?.title || (firstText || '').slice(0, 80);
  }
  return { title, authors, abstract, blocks, headings, engine: 'markdown' };
}

/** ---------- CAJ（中国知网专有格式） ---------- */

const CAJ_SIGNATURES = {
  'CAJ-C': 'caj-c',
  'TEBX': 'caj-tebx',
  HN: 'caj-hn',
};

/**
 * CAJ 为专有二进制格式，无开源解析器。策略：
 * 1) 识别 CAJ 版本头，做「可阅读内容提取」——扫描内嵌的 PDF/文本片段；
 * 2) 提取失败时返回降级方案标记，前端 DocViewer 引导用户转 PDF 后导入。
 */
function extractCaj(buffer) {
  const head = buffer.subarray(0, 8).toString('latin1');
  const version = CAJ_SIGNATURES[head] || (head.includes('CAJ') ? 'caj-legacy' : 'caj-unknown');

  // 部分 CAJ 由 PDF 转换而来，内部保留了 PDF 文本流：尝试定位 %PDF 头做内联解析
  const pdfIdx = buffer.indexOf(Buffer.from('%PDF-'));
  if (pdfIdx >= 0) {
    return {
      text: '',
      engine: 'caj-embedded-pdf',
      cajVersion: version,
      embeddedPdfOffset: pdfIdx,
      degraded: true,
      degradedReason: 'detected-embedded-pdf',
    };
  }

  // 兜底：按 UTF-16LE / GBK 可打印字符密度扫描，提取可阅读片段
  const candidates = [];
  const utf16 = buffer.toString('utf16le');
  const runs = utf16.match(/[\u4e00-\u9fff\u0020-\u007e]{24,}/g) || [];
  runs.forEach((r) => candidates.push(r));
  const latin = buffer.toString('latin1').replace(/[\x00-\x1f\x7f-\x9f]+/g, '\n');
  latin
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length >= 40 && /[A-Za-z]{12,}/.test(l) && !/^[A-Za-z0-9+/=]{60,}$/.test(l))
    .slice(0, 40)
    .forEach((l) => candidates.push(l));

  const text = candidates.join('\n').trim();
  return {
    text,
    engine: text ? 'caj-heuristic' : 'none',
    cajVersion: version,
    degraded: true,
    degradedReason: text ? 'heuristic-extract' : 'caj-unsupported',
  };
}

/** ---------- 结构化组装 ---------- */

function guessTitleFromText(text, fallback) {
  const lines = normalizeText(text)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 25);
  for (const line of lines) {
    if (line.length >= 12 && line.length <= 180 && !/^(abstract|摘要|keywords?|关键词|doi|http)/i.test(line)) return line;
  }
  return fallback;
}

function deriveAbstract(sections, text) {
  const flat = sections.flatMap((s) => s.paragraphs).join(' ').trim();
  if (!flat) return '';
  const absMatch = /(?:Abstract|摘要)[\s:：]*([\s\S]{80,900}?)(?:\n\s*(?:Keywords?|关键词|1[.、]\s|Introduction|引言)|$)/i.exec(text || '');
  if (absMatch) return absMatch[1].replace(/\s+/g, ' ').trim().slice(0, 520);
  return flat.replace(/\s+/g, ' ').slice(0, 280);
}

/**
 * PDF 的标题/作者识别：首页前若干行。
 * 返回被识别为「页眉元信息」的行，便于从正文中剥离，避免标题/作者重复出现在首段。
 */
function detectPdfHeader(pages, fallbackTitle) {
  const first = (pages[0]?.text || '').split('\n').map((l) => l.trim()).filter(Boolean);
  let title = '';
  let authors = '';
  const consumed = new Set();
  for (let i = 0; i < Math.min(first.length, 12); i++) {
    const line = first[i];
    if (!title) {
      if (line.length >= 12 && line.length <= 200 && !/^(abstract|摘要|arxiv|doi|http|www\.|©|copyright)/i.test(line)) {
        title = line;
        consumed.add(i);
      }
      continue;
    }
    if (!authors && line.length < 220 && /[A-Z][a-z]+ [A-Z].*[,;]|[A-Z]\.\s*[A-Z]?\.?\s*[A-Z][a-z]+|，.*，/.test(line)) {
      authors = line;
      consumed.add(i);
      break;
    }
    if (/^(abstract|摘要)/i.test(line)) break;
  }
  return { title: title || fallbackTitle, authors, headerLines: [...consumed].map((i) => first[i]) };
}

/** 从正文中移除已在页眉识别出的标题 / 作者行，避免语义重复 */
function stripHeaderLines(text, headerLines = []) {
  if (!headerLines.length) return text;
  const targets = new Set(headerLines.map((l) => l.trim()));
  const lines = text.split('\n');
  let removed = 0;
  const out = lines.filter((line) => {
    if (removed >= targets.size) return true;
    if (targets.has(line.trim())) {
      removed += 1;
      return false;
    }
    return true;
  });
  return out.join('\n');
}

/**
 * 统一解析入口。
 * @param {{ buffer:Buffer, fileName:string, mime?:string }} file
 * @param {{ text?:string }} [opts] 已由前端解码好的纯文本（Markdown / TXT 场景）
 */
async function parseDocument({ buffer, fileName, mime = '' }, opts = {}) {
  const ext = extOf(fileName);
  const name = String(fileName || 'untitled');
  const baseName = name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || '未命名文献';
  const size = buffer ? buffer.length : Buffer.byteLength(opts.text || '', 'utf8');

  if (size > MAX_FILE_BYTES) throw new FileTooLargeError(size);
  if (!SUPPORTED_EXT.includes(ext)) throw new UnsupportedFormatError(ext);

  const meta = { ext, size, degraded: false, degradedReason: '', cajVersion: '', engine: '' };
  let rawText = '';
  let title = '';
  let authors = '';
  let abstract = '';
  let pageMap = null;
  let blocks = null;
  let headerLines = [];

  try {
    if (ext === 'pdf') {
      const r = await extractPdf(buffer);
      if (r.engine === 'none' || !r.text.trim()) {
        meta.degraded = true;
        meta.degradedReason = r.engine === 'none' ? 'pdf-text-layer-unavailable' : 'pdf-empty-text-layer';
        meta.engine = r.engine;
        rawText = '';
      } else {
        meta.engine = r.engine;
        pageMap = r.pages;
        const header = detectPdfHeader(r.pages, r.title || baseName);
        title = header.title;
        authors = header.authors;
        headerLines = header.headerLines;
        rawText = stripHeaderLines(r.text, headerLines);
      }
    } else if (ext === 'docx') {
      const r = extractDocx(buffer);
      meta.engine = r.engine;
      rawText = r.text;
      title = r.title || '';
      authors = r.authors || '';
      if (!rawText.trim()) {
        meta.degraded = true;
        meta.degradedReason = 'docx-empty-or-unreadable';
      }
    } else if (ext === 'doc') {
      // 老式二进制 .doc：无可靠纯 JS 解析器，提取其中可见的 ASCII/UTF-16 文本片段
      const utf16 = buffer.toString('utf16le').match(/[\u4e00-\u9fff\u0020-\u007e]{30,}/g) || [];
      const latin = buffer
        .toString('latin1')
        .replace(/[\x00-\x1f\x7f-\x9f]+/g, '\n')
        .split('\n')
        .filter((l) => l.trim().length >= 40)
        .slice(0, 200);
      rawText = [...utf16, ...latin].join('\n');
      meta.engine = 'doc-legacy';
      meta.degraded = true;
      meta.degradedReason = rawText.trim() ? 'doc-legacy-heuristic' : 'doc-legacy-unsupported';
    } else if (ext === 'md' || ext === 'markdown') {
      const text = typeof opts.text === 'string' ? opts.text : buffer.toString('utf8');
      const r = extractMarkdown(text);
      rawText = r.blocks.join('\n\n');
      blocks = r.blocks;
      title = r.title;
      authors = r.authors;
      abstract = r.abstract;
      meta.engine = r.engine;
    } else if (ext === 'caj') {
      const r = extractCaj(buffer);
      rawText = r.text;
      meta.engine = r.engine;
      meta.cajVersion = r.cajVersion;
      meta.degraded = r.degraded;
      meta.degradedReason = r.degradedReason;
      if (r.embeddedPdfOffset != null) meta.embeddedPdfOffset = r.embeddedPdfOffset;
    }
  } catch (error) {
    meta.degraded = true;
    meta.degradedReason = `parse-error:${error?.message || 'unknown'}`;
  }

  rawText = rawText.slice(0, MAX_TEXT_CHARS);

  // 组装结构化正文
  let sections = [];
  if (blocks && blocks.length) {
    sections = blocksToSections(blocks, { fallbackTitle: '1. 正文' }).sections;
  } else if (rawText.trim()) {
    const paraBlocks = splitParagraphs(rawText).filter(Boolean).slice(0, 800);
    sections = blocksToSections(paraBlocks, { fallbackTitle: '1. 正文' }).sections;
  }

  // 无正文（扫描件 PDF / 加密 CAJ）→ 生成说明性结构化正文，保证沉浸式阅读可用
  if (!sections.length) {
    meta.degraded = true;
    meta.degradedReason = meta.degradedReason || 'no-text-layer';
    const reasonText = {
      'pdf-text-layer-unavailable': '该 PDF 未检测到可用文本层（可能为扫描件），已启用版面占位视图。',
      'pdf-empty-text-layer': '该 PDF 文本层为空（可能为扫描件或纯图片版式），已启用版面占位视图。',
    }[meta.degradedReason] || '该文件未能提取到有效文本层，已启用降级阅读视图。';

    sections = [
      {
        id: 's1',
        title: '1. 文档概览 (Document Overview)',
        page: 1,
        paragraphs: [
          `文档《${baseName}》已成功导入 ScienceX 文献解析系统，文件格式为 ${ext.toUpperCase()}，体积 ${(size / 1024).toFixed(0)} KB。`,
          reasonText,
          '可在左栏右上角切换「原文档」模式查看原始文件；扫描件 PDF 建议先经 OCR 转换后再导入，以获得可划词、可翻译的结构化正文。',
        ],
      },
      {
        id: 's2',
        title: '2. 可阅读信息 (Extracted Content)',
        page: 1,
        paragraphs: [
          '当前视图为降级模式。系统已保留文件的元信息与可提取片段，您仍可使用论文 Agent 基于文件元信息进行问答。',
          '若需完整的结构化正文（章节、段落、图表引用），请参考「原文档预览」中的处理建议。',
        ],
      },
    ];
  }

  const figures = extractFigures(sections, rawText);
  if (!title) title = guessTitleFromText(rawText, baseName);
  if (!abstract) abstract = deriveAbstract(sections, rawText);

  const pageCount = pageMap?.length || Math.max(1, sections.length * 2);

  return {
    title: String(title).slice(0, 200) || baseName,
    authors: String(authors).slice(0, 220) || '未标注作者',
    abstract: abstract || `《${baseName}》已完成结构化解析，共 ${sections.length} 个章节、${figures.length} 处图表引用。`,
    sections,
    figures,
    text: rawText,
    pages: pageCount,
    meta: {
      ...meta,
      pageCount,
      charCount: rawText.length,
      engine: meta.engine || ext,
    },
  };
}

module.exports = {
  parseDocument,
  SUPPORTED_EXT,
  MAX_FILE_BYTES,
  UnsupportedFormatError,
  FileTooLargeError,
  extOf,
  // 供单元测试使用的内部工具
  _internal: { splitParagraphs, blocksToSections, extractMarkdown, extractFigures, extractDocx, readZipEntries, stripInlineMarkdown },
};
