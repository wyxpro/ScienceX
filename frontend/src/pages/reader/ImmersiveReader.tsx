/* 沉浸式阅读层：文献阅读左栏的结构化正文阅读器
 * 能力：大纲导航 · 整页 / 宽度自适应 · 平滑划词 · 高亮批注（持久化） · 全文检索（逐段匹配 + 上下条跳转）
 * 与 DocViewer（对接 hexo-document-viewer 的源文件预览）互补：源文件在线预览 + 结构化深度阅读双模式。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../components/Icon';

type Highlight = { id: string; secId: string; paraIdx: number; start: number; end: number; text: string; color: string; note: string };
type Match = { secId: string; paraIdx: number; start: number; end: number };
type Popup = { x: number; y: number; secId: string; paraIdx: number; start: number; end: number; text: string };

const PALETTE = [
  { color: '#ffe58a', label: '高亮' },
  { color: '#b7e4c7', label: '重点' },
  { color: '#bfd7f7', label: '疑问' },
];

export default function ImmersiveReader({
  doc,
  activeKey,
  onTranslate,
  query = '',
  setQuery,
  matchIdx = 0,
  matchesCount = 0,
  onMatchesCountChange,
  notesOpen = false,
  setNotesOpen,
  onHighlightsCountChange,
}: {
  doc: any;
  activeKey: string | null;
  onTranslate: (text: string, secId: string, idx: number) => void;
  query?: string;
  setQuery?: (q: string) => void;
  matchIdx?: number;
  matchesCount?: number;
  onMatchesCountChange?: (count: number) => void;
  notesOpen?: boolean;
  setNotesOpen?: (v: boolean | ((prev: boolean) => boolean)) => void;
  onHighlightsCountChange?: (count: number) => void;
}) {
  const sections: any[] = doc?.structured?.sections || [];
  const activeQuery = query;

  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [popup, setPopup] = useState<Popup | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [notePopup, setNotePopup] = useState<{ hl: Highlight; x: number; y: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const storeKey = `sx-highlights:${doc?.id || ''}`;

  /* 批注按文档隔离持久化 */
  useEffect(() => {
    try {
      const list = JSON.parse(localStorage.getItem(storeKey) || '[]');
      setHighlights(list);
      onHighlightsCountChange?.(list.length);
    } catch {
      setHighlights([]);
      onHighlightsCountChange?.(0);
    }
    setPopup(null);
    setNotePopup(null);
  }, [storeKey, onHighlightsCountChange]);

  const commit = (list: Highlight[]) => {
    setHighlights(list);
    onHighlightsCountChange?.(list.length);
    try { localStorage.setItem(storeKey, JSON.stringify(list)); } catch { /* 存储异常时仅丢失持久化 */ }
  };

  /* 全文检索：大小写不敏感，逐段落收集匹配区间 */
  const matches = useMemo<Match[]>(() => {
    const q = activeQuery.trim().toLowerCase();
    if (!q) return [];
    const out: Match[] = [];
    sections.forEach((s: any) => (s.paragraphs || []).forEach((p: string, pi: number) => {
      const t = String(p).toLowerCase();
      let i = t.indexOf(q);
      while (i >= 0) { out.push({ secId: s.id, paraIdx: pi, start: i, end: i + q.length }); i = t.indexOf(q, i + q.length); }
    }));
    return out;
  }, [activeQuery, sections]);

  useEffect(() => {
    onMatchesCountChange?.(matches.length);
  }, [matches, onMatchesCountChange]);

  useEffect(() => {
    const m = matches[matchIdx];
    if (m) document.getElementById(`para-${m.secId}-${m.paraIdx}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [matchIdx, matches]);

  /* 平滑划词：把浏览器选区换算为段落内字符偏移（选区须完整落在同一段落内） */
  const captureSelection = (secId: string, paraIdx: number): Popup | null => {
    const el = document.getElementById(`para-${secId}-${paraIdx}`);
    const sel = window.getSelection();
    if (!el || !sel || sel.isCollapsed || !sel.rangeCount) return null;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return null;
    const text = range.toString();
    if (!text.trim()) return null;
    const pre = range.cloneRange();
    pre.selectNodeContents(el);
    pre.setEnd(range.startContainer, range.startOffset);
    const start = pre.toString().length;
    const rect = range.getBoundingClientRect();
    const host = scrollRef.current?.getBoundingClientRect();
    if (!host) return null;
    return { x: rect.left - host.left + Math.min(rect.width / 2, 220), y: rect.bottom - host.top + 6, secId, paraIdx, start, end: start + text.length, text };
  };

  const addHighlight = (color: string) => {
    if (!popup) return;
    const h: Highlight = { id: `h${Date.now()}`, secId: popup.secId, paraIdx: popup.paraIdx, start: popup.start, end: popup.end, text: popup.text, color, note: noteDraft.trim() };
    commit([...highlights, h]);
    window.getSelection()?.removeAllRanges();
    setPopup(null); setNoteDraft('');
    if (!notesOpen) setNotesOpen?.(true);
  };

  /* 段落渲染：叠加批注区间与检索区间，按边界切分为连续片段 */
  const renderPara = (raw: string, s: any, pi: number) => {
    const text = String(raw);
    const key = `${s.id}:${pi}`;
    const hls = highlights.filter((h) => h.secId === s.id && h.paraIdx === pi && h.start < h.end);
    const ms = matches.filter((m) => m.secId === s.id && m.paraIdx === pi);
    const cur = matches[matchIdx];
    const pts = new Set<number>([0, text.length]);
    hls.forEach((h) => { pts.add(Math.max(0, h.start)); pts.add(Math.min(text.length, h.end)); });
    ms.forEach((m) => { pts.add(m.start); pts.add(m.end); });
    const bounds = [...pts].sort((a, b) => a - b);
    const nodes: React.ReactNode[] = [];
    for (let i = 0; i < bounds.length - 1; i++) {
      const a = bounds[i]; const b = bounds[i + 1];
      if (b <= a) continue;
      const hl = hls.find((h) => h.start <= a && h.end >= b);
      const inMatch = ms.some((m) => m.start <= a && m.end >= b);
      const isActive = inMatch && !!cur && cur.secId === s.id && cur.paraIdx === pi && ms.some((m) => m === cur);
      nodes.push(
        <span
          key={i}
          style={{
            background: hl ? hl.color : inMatch ? 'rgba(194, 118, 43, 0.18)' : undefined,
            boxShadow: isActive ? '0 0 0 1.5px var(--accent)' : undefined,
            borderRadius: 3,
            cursor: hl ? 'pointer' : undefined,
            transition: 'background .15s ease, box-shadow .15s ease',
          }}
          onClick={(e) => {
            if (!hl) return;
            e.stopPropagation();
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const host = scrollRef.current?.getBoundingClientRect();
            if (host) setNotePopup({ hl, x: rect.left - host.left, y: rect.bottom - host.top + 6 });
          }}
        >
          {text.slice(a, b)}
        </span>
      );
    }
    return (
      <p
        id={`para-${s.id}-${pi}`}
        key={key}
        onMouseUp={() => setPopup(captureSelection(s.id, pi))}
        onDoubleClick={() => setPopup(captureSelection(s.id, pi))}
        onClick={() => { const p = captureSelection(s.id, pi); if (p) return; setPopup(null); onTranslate(text, s.id, pi); }}
        style={{
          fontSize: 13.8, lineHeight: 1.9, textAlign: 'justify', margin: '0 -10px 10px', padding: '6px 10px',
          borderRadius: 8, cursor: 'text', transition: 'background .2s',
          background: activeKey === key ? 'var(--accent-soft)' : 'transparent',
          userSelect: 'text',
        }}
        onMouseEnter={(e) => { if (activeKey !== key) e.currentTarget.style.background = 'var(--brand-softer)'; }}
        onMouseLeave={(e) => { if (activeKey !== key) e.currentTarget.style.background = 'transparent'; }}
      >
        {nodes}
      </p>
    );
  };

  const sorted = useMemo(() => {
    const order = new Map(sections.map((s: any, i: number) => [s.id, i]));
    return [...highlights].sort((a, b) => (order.get(a.secId) || 0) - (order.get(b.secId) || 0) || a.paraIdx - b.paraIdx || a.start - b.start);
  }, [highlights, sections]);

  return (
    <div ref={scrollRef} style={{ position: 'relative', flex: 1, overflowY: 'auto', minWidth: 0 }}>
      {/* 批注列表抽屉（由顶栏批注按钮控制展开） */}
      {notesOpen && (
        <div className="card anim-in" style={{ margin: '10px 14px 0', padding: 10, maxHeight: 180, overflowY: 'auto' }}>
          <div className="row g-1 mb-1"><span className="text-xs fw-bold">高亮与批注</span><span className="text-xs text-muted">点击条目可跳回原文</span></div>
          {sorted.length === 0 ? <div className="text-xs text-muted" style={{ padding: '6px 2px' }}>尚无批注 —— 在正文中划选文字即可高亮并附笔记</div> : (
            <div className="col g-1">
              {sorted.map((h) => (
                <div key={h.id} className="row g-1" style={{ alignItems: 'flex-start', fontSize: 12, padding: '6px 8px', borderRadius: 8, background: 'var(--bg)' }}>
                  <span style={{ width: 12, height: 12, borderRadius: 4, background: h.color, marginTop: 3, flexShrink: 0 }} />
                  <button style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-2)', lineHeight: 1.6 }}
                    onClick={() => document.getElementById(`para-${h.secId}-${h.paraIdx}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })}>
                    {h.text.length > 42 ? h.text.slice(0, 42) + '…' : h.text}
                    {h.note && <div className="text-xs" style={{ color: 'var(--accent)', marginTop: 2 }}>📝 {h.note}</div>}
                  </button>
                  <button className="btn btn-ghost btn-icon" style={{ width: 22, height: 22 }} title="删除批注" onClick={() => commit(highlights.filter((x) => x.id !== h.id))}><Icon name="trash" size={11} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 正文 */}
      <div style={{ padding: '20px 24px' }}>
        <article className="anim-in" style={{ maxWidth: 720, margin: '0 auto' }}>
          <header style={{ borderBottom: '2px solid var(--brand)', paddingBottom: 12, marginBottom: 16 }}>
            <h1 className="text-serif" style={{ fontSize: 19, lineHeight: 1.5 }}>{doc.title}</h1>
            <div className="text-small text-muted mt-1">{doc.authors} · {doc.venue} · {doc.pages} 页
              {doc.has_code && <a href={doc.code_url} target="_blank" rel="noreferrer" style={{ marginLeft: 8 }}><Icon name="branch" size={12} /> 开源代码</a>}
            </div>
          </header>
          <div className="text-xs text-muted" style={{ marginBottom: 14, padding: '8px 12px', background: 'var(--brand-softer)', borderRadius: 8 }}>
            <Icon name="quote" size={12} /> {doc.abstract}
          </div>
          {sections.map((s: any) => (
            <section key={s.id} id={`sec-${s.id}`} style={{ marginBottom: 18, scrollMarginTop: 60 }}>
              <h2 className="text-serif" style={{ fontSize: 15, color: 'var(--brand-strong)', marginBottom: 8 }}>
                {s.title}<span className="text-xs text-muted" style={{ fontWeight: 400, marginLeft: 8 }}>P{Number(String(s.page))}</span>
              </h2>
              {(s.paragraphs || []).map((p: string, i: number) => renderPara(p, s, i))}
            </section>
          ))}
          <div className="text-xs text-muted text-center" style={{ padding: '10px 0' }}>— 单击段落翻译 · 划选文字高亮批注 · 双击快速选词 —</div>
        </article>
      </div>

      {/* 划词浮动工具：选色 + 可选批注 */}
      {popup && (
        <div className="card anim-in row g-1" style={{ position: 'absolute', left: Math.max(8, Math.min(popup.x, (scrollRef.current?.clientWidth || 400) - 260)), top: popup.y, zIndex: 12, padding: 8, alignItems: 'center', boxShadow: '0 6px 24px rgba(0,0,0,.14)' }}
          onMouseDown={(e) => e.preventDefault()}>
          {PALETTE.map((c) => (
            <button key={c.color} title={c.label} onClick={() => addHighlight(c.color)}
              style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid var(--line-strong)', background: c.color, cursor: 'pointer' }} />
          ))}
          <input className="input" style={{ width: 130, fontSize: 12, padding: '4px 8px' }} placeholder="批注（可选）…" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addHighlight('#ffe58a')} />
          <button className="btn btn-ghost btn-icon" style={{ width: 22, height: 22 }} onClick={() => { setPopup(null); window.getSelection()?.removeAllRanges(); }}><Icon name="x" size={12} /></button>
        </div>
      )}

      {/* 已有高亮的批注查看 / 编辑 */}
      {notePopup && (
        <div className="card anim-in" style={{ position: 'absolute', left: Math.max(8, notePopup.x), top: notePopup.y, zIndex: 12, padding: 10, width: 240, boxShadow: '0 6px 24px rgba(0,0,0,.14)' }}>
          <div className="row g-1 mb-1"><span style={{ width: 10, height: 10, borderRadius: 3, background: notePopup.hl.color }} /><span className="text-xs fw-bold">批注</span></div>
          <div className="text-xs text-muted mb-1" style={{ lineHeight: 1.6 }}>「{notePopup.hl.text.slice(0, 60)}{notePopup.hl.text.length > 60 ? '…' : ''}」</div>
          <input className="input" style={{ width: '100%', fontSize: 12 }} value={notePopup.hl.note} placeholder="记录想法…"
            onChange={(e) => {
              const v = e.target.value;
              setNotePopup((np) => np && { ...np, hl: { ...np.hl, note: v } });
              commit(highlights.map((h) => (h.id === notePopup.hl.id ? { ...h, note: v } : h)));
            }} />
          <div className="row g-1 mt-1" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => { commit(highlights.filter((h) => h.id !== notePopup.hl.id)); setNotePopup(null); }}><Icon name="trash" size={12} />删除</button>
            <button className="btn btn-primary btn-sm" onClick={() => setNotePopup(null)}>完成</button>
          </div>
        </div>
      )}
    </div>
  );
}
