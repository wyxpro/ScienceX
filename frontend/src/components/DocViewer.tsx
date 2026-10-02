/* DocViewer：移植自 hexo-document-viewer（MIT · https://github.com/XuYouo/hexo-document-viewer）
 * 在 React 前端复用它的多格式嵌入预览策略：
 * - PDF：浏览器内置查看器（iframe，支持本地 blob 文件）
 * - Word / Excel / PPT：Microsoft Office Online Viewer，可一键切换 Google Docs Viewer 兜底（与原插件降级逻辑一致）
 * - TXT / Markdown：fetch 纯文本渲染
 * - 其它格式：显示下载卡片
 */
import { useEffect, useMemo, useState } from 'react';
import Icon from './Icon';

export type DocKind = 'pdf' | 'word' | 'excel' | 'ppt' | 'txt' | 'other';

/** 依据文件名 / URL 推断文档类型（对应原插件 getFileType） */
export function detectKind(name = ''): DocKind {
  const ext = name.split('?')[0].split('#')[0].split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'doc' || ext === 'docx') return 'word';
  if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') return 'excel';
  if (ext === 'ppt' || ext === 'pptx') return 'ppt';
  if (ext === 'txt' || ext === 'md') return 'txt';
  return 'other';
}

const KIND_META: Record<DocKind, { label: string; tag: string }> = {
  pdf: { label: 'PDF', tag: 'tag-red' },
  word: { label: 'Word', tag: 'tag-blue' },
  excel: { label: 'Excel', tag: 'tag-green' },
  ppt: { label: 'PowerPoint', tag: 'tag-amber' },
  txt: { label: '文本', tag: 'tag-gray' },
  other: { label: '文件', tag: 'tag-gray' },
};

/** Office 在线预览地址（对应原插件 createOfficeViewer 的双引擎策略） */
function officeSrc(url: string, provider: 'office' | 'google') {
  const encoded = encodeURIComponent(url);
  if (provider === 'google') return `https://docs.google.com/gview?url=${encoded}&embedded=true`;
  return `https://view.officeapps.live.com/op/view.aspx?src=${encoded}`;
}

export default function DocViewer({ url, name, onBackToRead }: { url: string; name: string; onBackToRead?: () => void }) {
  const kind = useMemo(() => detectKind(name || url), [name, url]);
  const meta = KIND_META[kind];
  const isLocal = url.startsWith('blob:') || url.startsWith('data:');
  const [provider, setProvider] = useState<'office' | 'google'>('office');
  const [text, setText] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState('');

  useEffect(() => {
    if (kind !== 'txt') return;
    let active = true;
    fetch(url)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
      .then((t) => { if (active) setText(t); })
      .catch((e) => { if (active) setLoadErr(String(e?.message || e)); });
    return () => { active = false; };
  }, [kind, url]);

  const frame = (src: string) => (
    <iframe src={src} title={`${typeLabel(kind)} 预览`} allowFullScreen style={{ flex: 1, width: '100%', border: 'none', borderRadius: 10, background: '#fff' }} />
  );

  return (
    <div className="anim-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
      {/* 标题栏：格式标签 + 文件名 + 引擎切换 + 下载（对应原插件 doc-viewer-title） */}
      <div className="row g-1 wrap" style={{ alignItems: 'center' }}>
        <span className={`tag ${meta.tag}`}><Icon name="file" size={11} />{meta.label}</span>
        <span className="text-small fw-bold" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>{name}</span>
        {(kind === 'word' || kind === 'excel' || kind === 'ppt') && !isLocal && (
          <div className="row g-1" style={{ marginLeft: 'auto' }}>
            <button className={`tag ${provider === 'office' ? 'tag-green' : 'tag-gray'}`} style={{ cursor: 'pointer', border: 'none' }} onClick={() => setProvider('office')}>Office Online</button>
            <button className={`tag ${provider === 'google' ? 'tag-green' : 'tag-gray'}`} style={{ cursor: 'pointer', border: 'none' }} onClick={() => setProvider('google')}>Google Docs</button>
          </div>
        )}
        <a className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} href={url} download={name}>
          <Icon name="download" size={13} />下载
        </a>
      </div>

      {/* 内容区：按格式分派查看器（对应原插件 createViewerByType） */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: kind === 'txt' ? 0 : 8, minHeight: 0 }}>
        {kind === 'pdf' && frame(url)}
        {(kind === 'word' || kind === 'excel' || kind === 'ppt') && (
          isLocal ? (
            <div className="empty" style={{ margin: 'auto' }}>
              <div className="empty-ic"><Icon name="alert" size={32} /></div>
              <div className="text-small" style={{ maxWidth: 340, lineHeight: 1.8 }}>
                本地 {meta.label} 文件需先「提交解析」提取结构化正文后沉浸阅读；<br />
                在线预览要求文件具备<b>公网可访问 URL</b>（Office Online / Google Docs 引擎限制）。
              </div>
              {onBackToRead && <button className="btn btn-primary btn-sm mt-2" onClick={onBackToRead}>回到沉浸式阅读</button>}
            </div>
          ) : frame(officeSrc(url, provider))
        )}
        {kind === 'txt' && (
          loadErr ? <div className="empty"><div className="empty-ic"><Icon name="alert" size={30} /></div><div className="text-small">文本加载失败：{loadErr}</div></div> :
          text === null ? <div style={{ padding: 20 }}><div className="skel" style={{ height: 200 }} /></div> : (
            <pre style={{ flex: 1, overflow: 'auto', margin: 0, padding: '18px 20px', fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{text}</pre>
          )
        )}
        {kind === 'other' && (
          <div className="empty" style={{ margin: 'auto' }}>
            <div className="empty-ic"><Icon name="doc" size={34} /></div>
            <div className="text-small">该格式暂不支持在线预览<br />请下载后本地打开，或导入解析为结构化正文</div>
          </div>
        )}
      </div>
    </div>
  );
}

function typeLabel(kind: DocKind) {
  return KIND_META[kind].label;
}
