/* DocViewer：多格式源文档预览
 * 移植自 hexo-document-viewer（MIT · https://github.com/XuYouo/hexo-document-viewer）
 * 并参考 sixiang-world/file-viewer-standalone 的 viewer 分派策略
 * （按扩展名选择 PDF.js 内嵌 / Office 在线预览 / 纯文本渲染 / 自定义格式解析）。
 *
 * 分派规则（对应原插件 createViewerByType / getFileType）：
 * - PDF          → 浏览器内置 PDF 查看器（iframe，支持本地 blob 文件）
 * - Word/Excel/PPT → Microsoft Office Online Viewer，可切换 Google Docs Viewer 兜底
 * - Markdown     → 结构化 Markdown 渲染（标题 / 列表 / 代码 / 表格 / 引用）
 * - TXT          → fetch 纯文本渲染
 * - CAJ          → 降级方案：内嵌可阅读文本（后端启发式提取）+ 转 PDF 引导
 * - 其它格式     → 下载卡片
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import Markdown from './Markdown';

export type DocKind = 'pdf' | 'word' | 'excel' | 'ppt' | 'txt' | 'markdown' | 'caj' | 'other';

/** 依据文件名 / URL 推断文档类型（对应原插件 getFileType 的扩展名映射表） */
export function detectKind(name = ''): DocKind {
  const ext = name.split('?')[0].split('#')[0].split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'doc' || ext === 'docx' || ext === 'rtf' || ext === 'odt') return 'word';
  if (ext === 'xls' || ext === 'xlsx' || ext === 'csv' || ext === 'ods') return 'excel';
  if (ext === 'ppt' || ext === 'pptx' || ext === 'odp') return 'ppt';
  if (ext === 'md' || ext === 'markdown' || ext === 'mdown' || ext === 'mkd') return 'markdown';
  if (ext === 'txt' || ext === 'text' || ext === 'log' || ext === 'tex') return 'txt';
  if (ext === 'caj') return 'caj';
  return 'other';
}

export const KIND_META: Record<DocKind, { label: string; tag: string }> = {
  pdf: { label: 'PDF', tag: 'tag-red' },
  word: { label: 'Word', tag: 'tag-blue' },
  excel: { label: 'Excel', tag: 'tag-green' },
  ppt: { label: 'PowerPoint', tag: 'tag-amber' },
  markdown: { label: 'Markdown', tag: 'tag-blue' },
  txt: { label: '文本', tag: 'tag-gray' },
  caj: { label: 'CAJ 知网', tag: 'tag-amber' },
  other: { label: '文件', tag: 'tag-gray' },
};

/** 后端解析引擎识别到的降级信息（随文档一起返回） */
export type ParseMeta = {
  ext?: string;
  size?: number;
  degraded?: boolean;
  degradedReason?: string;
  cajVersion?: string;
  engine?: string;
  pageCount?: number;
  charCount?: number;
};

/** Office 在线预览地址（对应原插件 createOfficeViewer 的双引擎策略） */
function officeSrc(url: string, provider: 'office' | 'google') {
  const encoded = encodeURIComponent(url);
  if (provider === 'google') return `https://docs.google.com/gview?url=${encoded}&embedded=true`;
  return `https://view.officeapps.live.com/op/view.aspx?src=${encoded}`;
}

/** 是否为本浏览器可直接内嵌的本地资源（blob / data URL） */
function isLocalUrl(url: string) {
  return url.startsWith('blob:') || url.startsWith('data:');
}

type OfficeKind = 'word' | 'excel' | 'ppt';

export default function DocViewer({
  url,
  name,
  parseMeta,
  onBackToRead,
}: {
  url: string;
  name: string;
  /** 后端解析元信息，用于 CAJ / 扫描件 PDF 的降级提示 */
  parseMeta?: ParseMeta;
  onBackToRead?: () => void;
}) {
  const kind = useMemo(() => detectKind(name || url), [name, url]);
  const meta = KIND_META[kind];
  const isLocal = isLocalUrl(url);
  const [provider, setProvider] = useState<'office' | 'google'>('office');
  const [text, setText] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState('');
  const [officeFail, setOfficeFail] = useState(false);
  const [cajInfo, setCajInfo] = useState('');
  const [showRawCaj, setShowRawCaj] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  const isOffice = kind === 'word' || kind === 'excel' || kind === 'ppt';

  /* 纯文本类（TXT / Markdown / CAJ 降级）统一走 fetch 文本渲染 */
  useEffect(() => {
    if (kind !== 'txt' && kind !== 'markdown' && kind !== 'caj') return;
    let active = true;
    setText(null);
    setLoadErr('');
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((t) => {
        if (!active) return;
        setText(t);
        if (kind === 'caj') {
          // CAJ 为二进制格式：提取可阅读的 CJK / ASCII 片段
          const readable = extractReadableFromCaj(t);
          setCajInfo(readable);
        }
      })
      .catch((e) => {
        if (!active) return;
        if (kind === 'caj') {
          // 本地 blob 读取失败时不阻塞用户，保持降级引导
          setCajInfo('');
          setText('');
        } else {
          setLoadErr(String(e?.message || e));
        }
      });
    return () => {
      active = false;
    };
  }, [kind, url]);

  /* Office 在线引擎加载失败时自动切换 Google Docs（对应原插件 iframe.onerror） */
  useEffect(() => {
    if (!isOffice || isLocal) return;
    const timer = window.setTimeout(() => {
      const doc = frameRef.current?.contentDocument;
      if (doc && doc.body && doc.body.childElementCount === 0) setOfficeFail(true);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [isOffice, isLocal, provider, url]);

  const frame = (src: string) => (
    <iframe
      ref={frameRef}
      src={src}
      title={`${meta.label} 预览`}
      allowFullScreen
      style={{ flex: 1, width: '100%', border: 'none', borderRadius: 10, background: '#fff' }}
    />
  );

  const backBtn = onBackToRead && (
    <button className="btn btn-primary btn-sm mt-2" onClick={onBackToRead}>
      回到沉浸式阅读
    </button>
  );

  return (
    <div className="anim-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
      {/* 标题栏：格式标签 + 文件名 + 引擎切换 + 下载（对应原插件 doc-viewer-title） */}
      <div className="row g-1 wrap" style={{ alignItems: 'center' }}>
        <span className={`tag ${meta.tag}`}>
          <Icon name="file" size={11} />
          {meta.label}
        </span>
        <span
          className="text-small fw-bold"
          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '48%' }}
          title={name}
        >
          {name}
        </span>
        {parseMeta?.degraded && (
          <span className="tag tag-amber" style={{ fontSize: 10.5 }} title={parseMeta.degradedReason || '降级解析'}>
            <Icon name="alert" size={10} />降级解析
          </span>
        )}
        {typeof parseMeta?.pageCount === 'number' && parseMeta.pageCount > 0 && (
          <span className="text-xs text-muted">{parseMeta.pageCount} 页</span>
        )}

        {isOffice && !isLocal && (
          <div className="row g-1" style={{ marginLeft: 'auto' }}>
            <button
              className={`tag ${provider === 'office' ? 'tag-green' : 'tag-gray'}`}
              style={{ cursor: 'pointer', border: 'none' }}
              onClick={() => {
                setProvider('office');
                setOfficeFail(false);
              }}
            >
              Office Online
            </button>
            <button
              className={`tag ${provider === 'google' ? 'tag-green' : 'tag-gray'}`}
              style={{ cursor: 'pointer', border: 'none' }}
              onClick={() => {
                setProvider('google');
                setOfficeFail(false);
              }}
            >
              Google Docs
            </button>
          </div>
        )}
        <a className="btn btn-ghost btn-sm" style={{ marginLeft: isOffice && !isLocal ? undefined : 'auto' }} href={url} download={name}>
          <Icon name="download" size={13} />下载
        </a>
      </div>

      {/* 内容区：按格式分派查看器（对应原插件 createViewerByType） */}
      <div
        className="card"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: kind === 'txt' || kind === 'markdown' || kind === 'caj' ? 0 : 8,
          minHeight: 0,
        }}
      >
        {/* PDF：浏览器内嵌查看器 */}
        {kind === 'pdf' && frame(url)}

        {/* Word / Excel / PPT：Office 在线引擎 + Google Docs 兜底 */}
        {isOffice &&
          (isLocal ? (
            <div className="empty" style={{ margin: 'auto' }}>
              <div className="empty-ic">
                <Icon name="alert" size={32} />
              </div>
              <div className="text-small" style={{ maxWidth: 340, lineHeight: 1.8 }}>
                本地 {meta.label} 文件需先「提交解析」提取结构化正文后沉浸阅读；
                <br />
                在线预览要求文件具备<b>公网可访问 URL</b>（Office Online / Google Docs 引擎限制）。
              </div>
              {backBtn}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {officeFail && (
                <div
                  className="text-xs"
                  style={{
                    margin: '0 0 8px',
                    padding: '6px 10px',
                    borderRadius: 8,
                    background: 'var(--bg-deep)',
                    color: 'var(--muted)',
                  }}
                >
                  {provider === 'office' ? 'Office Online 引擎未响应' : 'Google Docs 引擎未响应'}，可点击右上角切换另一在线引擎，或下载后本地打开。
                </div>
              )}
              {frame(officeSrc(url, officeFail ? (provider === 'office' ? 'google' : 'office') : provider))}
            </div>
          ))}

        {/* TXT：纯文本 */}
        {kind === 'txt' &&
          (loadErr ? (
            <div className="empty">
              <div className="empty-ic">
                <Icon name="alert" size={30} />
              </div>
              <div className="text-small">文本加载失败：{loadErr}</div>
            </div>
          ) : text === null ? (
            <div style={{ padding: 20 }}>
              <div className="skel" style={{ height: 200 }} />
            </div>
          ) : (
            <pre
              style={{
                flex: 1,
                overflow: 'auto',
                margin: 0,
                padding: '18px 20px',
                fontSize: 13,
                lineHeight: 1.8,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {text}
            </pre>
          ))}

        {/* Markdown：结构化渲染 */}
        {kind === 'markdown' &&
          (loadErr ? (
            <div className="empty">
              <div className="empty-ic">
                <Icon name="alert" size={30} />
              </div>
              <div className="text-small">Markdown 加载失败：{loadErr}</div>
            </div>
          ) : text === null ? (
            <div style={{ padding: 20 }}>
              <div className="skel" style={{ height: 200 }} />
            </div>
          ) : (
            <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
              <div className="md-body" style={{ maxWidth: 760, margin: '0 auto', fontSize: 13.5, lineHeight: 1.85 }}>
                <Markdown text={text} />
              </div>
            </div>
          ))}

        {/* CAJ：降级方案 */}
        {kind === 'caj' && <CajFallback name={name} info={cajInfo} showRaw={showRawCaj} setShowRaw={setShowRawCaj} onBackToRead={onBackToRead} />}

        {/* 其它格式：下载卡片（对应原插件 fileType === 'other' 分支） */}
        {kind === 'other' && (
          <div className="empty" style={{ margin: 'auto' }}>
            <div className="empty-ic">
              <Icon name="doc" size={34} />
            </div>
            <div className="text-small">
              该格式暂不支持在线预览
              <br />
              请下载后本地打开，或导入解析为结构化正文
            </div>
            {backBtn}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- CAJ 降级视图 ---------- */

/** 从 CAJ 二进制文本中提取可阅读片段（与服务端启发式策略一致） */
function extractReadableFromCaj(raw: string): string {
  const runs = String(raw).match(/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef][\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\s，。；：、（）《》""''！？0-9A-Za-z.%\-]{20,}/g) || [];
  return runs
    .map((r) => r.replace(/\s+/g, ' ').trim())
    .filter((r) => r.length >= 24)
    .slice(0, 40)
    .join('\n\n');
}

function CajFallback({
  name,
  info,
  showRaw,
  setShowRaw,
  onBackToRead,
}: {
  name: string;
  info: string;
  showRaw: boolean;
  setShowRaw: (v: boolean) => void;
  onBackToRead?: () => void;
}) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
      <div
        className="card"
        style={{
          padding: 16,
          borderRadius: 12,
          background: 'var(--brand-softer)',
          border: '1px solid var(--brand-soft)',
          marginBottom: 14,
        }}
      >
        <div className="row g-1 items-center mb-1">
          <Icon name="alert" size={14} />
          <span className="fw-bold" style={{ fontSize: 13.5 }}>
            CAJ 格式降级预览
          </span>
        </div>
        <div className="text-small" style={{ lineHeight: 1.85, color: 'var(--ink-2)' }}>
          CAJ 是中国知网（CNKI）的<b>专有二进制格式</b>，浏览器与开源解析器均无法完整还原其版式。
          ScienceX 已对《{name}》执行<b>可阅读内容提取</b>，下方为其正文片段；如需精确版式与高清图表，建议按以下方式处理：
        </div>
        <ol className="text-small" style={{ lineHeight: 1.9, margin: '8px 0 0', paddingLeft: 20, color: 'var(--ink-2)' }}>
          <li>在 <b>CAJViewer</b> 中打开该文件，导出为 <b>PDF</b> 后重新导入（推荐，可保留完整版式）；</li>
          <li>或在知网页面直接下载 <b>PDF 版本</b>（多数文献同时提供 PDF 与 CAJ）；</li>
          <li>也可将 CAJ 交由专用转换服务（如 CNKI E-Study）批量转 PDF 后再导入。</li>
        </ol>
        <div className="row g-2 mt-2 wrap">
          {onBackToRead && (
            <button className="btn btn-primary btn-sm" onClick={onBackToRead}>
              <Icon name="book" size={13} /> 查看已提取的结构化正文
            </button>
          )}
          <button className="btn btn-soft btn-sm" type="button" onClick={() => setShowRaw(!showRaw)}>
            <Icon name={showRaw ? 'eye' : 'code'} size={13} /> {showRaw ? '隐藏原始片段' : '查看可阅读片段'}
          </button>
        </div>
      </div>

      {showRaw ? (
        info ? (
          <pre
            style={{
              margin: 0,
              padding: '10px 12px',
              fontSize: 12.5,
              lineHeight: 1.85,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              background: 'var(--bg-deep)',
              borderRadius: 10,
              border: '1px solid var(--line)',
            }}
          >
            {info}
          </pre>
        ) : (
          <div className="text-small text-muted" style={{ padding: 12 }}>
            未从该 CAJ 文件中提取到足够的可阅读文本。请参考上述建议转换为 PDF 后重新导入。
          </div>
        )
      ) : (
        <div className="text-xs text-muted text-center" style={{ padding: '6px 0' }}>
          — 点击「查看可阅读片段」展开服务端与浏览器双重提取的正文内容 —
        </div>
      )}
    </div>
  );
}
