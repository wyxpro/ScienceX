/* 沉浸式阅读层：文献阅读左栏的结构化正文阅读器
 * 能力：大纲导航 · 整页 / 宽度自适应 · 平滑划词 · 高亮批注（持久化） · 划词翻译（内联） · 全文检索（逐段匹配 + 上下条跳转）
 * 与 DocViewer（多格式源文件预览）互补：源文件在线预览 + 结构化深度阅读双模式。
 *
 * 划词交互设计要点（对应验收标准「流畅划词 → 弹出工具栏 → 高亮/批注/翻译」）：
 * 1. 使用 mouseup 捕获选区，并把 mouseup 期间置为「忽略外部点击」，避免工具栏被立刻关闭；
 * 2. 工具栏定位基于滚动容器坐标，并在渲染后做边界校正，避免抖动 / 跳动；
 * 3. 翻译结果以内联卡片插入到选中段落下方（或右侧），并随文档 / 段落隔离缓存。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../components/Icon';

type Highlight = { id: string; secId: string; paraIdx: number; start: number; end: number; text: string; color: string; note: string };
type Match = { secId: string; paraIdx: number; start: number; end: number };
type Popup = { secId: string; paraIdx: number; start: number; end: number; text: string; anchorTop: number; anchorBottom: number; anchorLeft: number };
type InlineTrans = {
  key: string;
  secId: string;
  paraIdx: number;
  start: number;
  end: number;
  text: string;
  direction: 'en2zh' | 'zh2en';
  status: 'loading' | 'done' | 'error';
  translated: string;
  glossary?: Array<{ en: string; zh: string }>;
  mode?: string;
};

const PALETTE = [
  { color: '#ffe58a', label: '高亮黄' },
  { color: '#b7e4c7', label: '重点绿' },
  { color: '#bfd7f7', label: '疑问蓝' },
];

/** 粗略判断文本主语言，用于中↔英自动方向 */
function detectDirection(text: string): 'en2zh' | 'zh2en' {
  const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  return cjk > latin ? 'zh2en' : 'en2zh';
}

const TRANS_STORE = (docId: string) => `sx-translations:${docId || ''}`;

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
  translateText,
}: {
  doc: any;
  activeKey: string | null;
  /** 段落单击翻译（同步到中栏翻译面板），保留原有能力 */
  onTranslate: (text: string, secId: string, idx: number) => void;
  /** 划词翻译：调用后端 AI 翻译接口，返回译文 */
  translateText?: (text: string, direction: 'en2zh' | 'zh2en') => Promise<{ translated: string; glossary?: any[]; mode?: string }>;
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
  const [inlineTrans, setInlineTrans] = useState<Record<string, InlineTrans>>({});
  const [openTransKey, setOpenTransKey] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const selectingRef = useRef(false);
  const storeKey = `sx-highlights:${doc?.id || ''}`;
  const transStoreKey = TRANS_STORE(doc?.id);

  /* 批注 + 译文按文档隔离持久化 */
  useEffect(() => {
    try {
      const list = JSON.parse(localStorage.getItem(storeKey) || '[]');
      setHighlights(list);
      onHighlightsCountChange?.(list.length);
    } catch {
      setHighlights([]);
      onHighlightsCountChange?.(0);
    }
    try {
      const saved = JSON.parse(localStorage.getItem(transStoreKey) || '{}');
      setInlineTrans(saved && typeof saved === 'object' ? saved : {});
    } catch {
      setInlineTrans({});
    }
    setPopup(null);
    setNotePopup(null);
    setOpenTransKey(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeKey, transStoreKey]);

  const commit = (list: Highlight[]) => {
    setHighlights(list);
    onHighlightsCountChange?.(list.length);
    try {
      localStorage.setItem(storeKey, JSON.stringify(list));
    } catch {
      /* 存储异常时仅丢失持久化 */
    }
  };

  const commitTrans = useCallback(
    (next: Record<string, InlineTrans>) => {
      setInlineTrans(next);
      try {
        localStorage.setItem(transStoreKey, JSON.stringify(next));
      } catch {
        /* 存储异常时仅丢失持久化 */
      }
    },
    [transStoreKey]
  );

  /* 全文检索：大小写不敏感，逐段落收集匹配区间 */
  const matches = useMemo<Match[]>(() => {
    const q = activeQuery.trim().toLowerCase();
    if (!q) return [];
    const out: Match[] = [];
    sections.forEach((s: any) =>
      (s.paragraphs || []).forEach((p: string, pi: number) => {
        const t = String(p).toLowerCase();
        let i = t.indexOf(q);
        while (i >= 0) {
          out.push({ secId: s.id, paraIdx: pi, start: i, end: i + q.length });
          i = t.indexOf(q, i + q.length);
        }
      })
    );
    return out;
  }, [activeQuery, sections]);

  useEffect(() => {
    onMatchesCountChange?.(matches.length);
  }, [matches, onMatchesCountChange]);

  useEffect(() => {
    const m = matches[matchIdx];
    if (m) document.getElementById(`para-${m.secId}-${m.paraIdx}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [matchIdx, matches]);

  /* 点击空白 / 滚动时收起划词工具栏与批注浮层 */
  useEffect(() => {
    if (!popup && !notePopup) return;
    const onDown = (e: MouseEvent) => {
      if (selectingRef.current) return; // mouseup 期间的点击不关闭工具栏
      if (popupRef.current?.contains(e.target as Node)) return;
      const target = e.target as HTMLElement;
      if (target.closest?.('[data-note-popup]')) return;
      setPopup(null);
      setNotePopup(null);
      setNoteDraft('');
    };
    const onScroll = () => {
      setPopup(null);
      setNotePopup(null);
    };
    document.addEventListener('mousedown', onDown, true);
    const el = scrollRef.current;
    el?.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      el?.removeEventListener('scroll', onScroll);
    };
  }, [popup, notePopup]);

  /* 工具栏渲染后做边界校正：避免超出滚动容器左右 / 上下边界造成跳动 */
  useEffect(() => {
    const el = popupRef.current;
    const host = scrollRef.current;
    if (!el || !host || !popup) return;
    const rect = el.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    let patchX = 0;
    let patchY = 0;
    if (rect.left < hostRect.left + 6) patchX = hostRect.left + 6 - rect.left;
    else if (rect.right > hostRect.right - 6) patchX = hostRect.right - 6 - rect.right;
    if (rect.bottom > hostRect.bottom - 6) {
      // 下方空间不足时上翻到选区上方
      patchY = rect.height + 12 + rect.bottom - hostRect.bottom;
      if (patchY < 0) patchY = 0;
    }
    if (patchX || patchY) el.style.transform = `translate(${patchX}px, ${-patchY}px)`;
    else el.style.transform = 'none';
  }, [popup]);

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
    return {
      secId,
      paraIdx,
      start,
      end: start + text.length,
      text,
      anchorTop: rect.top - host.top,
      anchorBottom: rect.bottom - host.top,
      anchorLeft: rect.left - host.left + Math.min(rect.width / 2, 220),
    };
  };

  const handleMouseUp = (secId: string, paraIdx: number) => {
    selectingRef.current = true;
    // 选中后等浏览器选区稳定再取坐标，避免工具栏闪烁 / 跳动
    window.requestAnimationFrame(() => {
      const next = captureSelection(secId, paraIdx);
      if (next) setPopup(next);
      window.setTimeout(() => {
        selectingRef.current = false;
      }, 0);
    });
  };

  const clearSelection = () => {
    window.getSelection()?.removeAllRanges();
    setPopup(null);
    setNoteDraft('');
  };

  const addHighlight = (color: string) => {
    if (!popup) return;
    const h: Highlight = {
      id: `h${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      secId: popup.secId,
      paraIdx: popup.paraIdx,
      start: popup.start,
      end: popup.end,
      text: popup.text,
      color,
      note: noteDraft.trim(),
    };
    commit([...highlights, h]);
    clearSelection();
    if (!notesOpen) setNotesOpen?.(true);
  };

  /* 划词翻译：内联展示在选中段落下方 */
  const runInlineTranslate = async (target: Popup, forced?: 'en2zh' | 'zh2en') => {
    if (!translateText) return;
    const direction = forced || detectDirection(target.text);
    const key = `${target.secId}:${target.paraIdx}:${target.start}-${target.end}`;
    const pending: InlineTrans = {
      key,
      secId: target.secId,
      paraIdx: target.paraIdx,
      start: target.start,
      end: target.end,
      text: target.text,
      direction,
      status: 'loading',
      translated: '',
    };
    commitTrans({ ...inlineTrans, [key]: pending });
    setOpenTransKey(key);
    clearSelection();
    try {
      const r = await translateText(target.text, direction);
      commitTrans({
        ...inlineTrans,
        [key]: { ...pending, status: 'done', translated: r?.translated || '', glossary: r?.glossary || [], mode: r?.mode },
      });
    } catch (error: any) {
      commitTrans({
        ...inlineTrans,
        [key]: { ...pending, status: 'error', translated: error?.message || '翻译失败，请稍后重试' },
      });
    }
  };

  const closeTrans = (key: string) => {
    const next = { ...inlineTrans };
    delete next[key];
    commitTrans(next);
    if (openTransKey === key) setOpenTransKey(null);
  };

  /* 段落渲染：叠加批注区间与检索区间，按边界切分为连续片段 */
  const renderPara = (raw: string, s: any, pi: number) => {
    const text = String(raw);
    const key = `${s.id}:${pi}`;
    const hls = highlights.filter((h) => h.secId === s.id && h.paraIdx === pi && h.start < h.end);
    const ms = matches.filter((m) => m.secId === s.id && m.paraIdx === pi);
    const cur = matches[matchIdx];
    const pts = new Set<number>([0, text.length]);
    hls.forEach((h) => {
      pts.add(Math.max(0, h.start));
      pts.add(Math.min(text.length, h.end));
    });
    ms.forEach((m) => {
      pts.add(m.start);
      pts.add(m.end);
    });
    const bounds = [...pts].sort((a, b) => a - b);
    const nodes: React.ReactNode[] = [];
    for (let i = 0; i < bounds.length - 1; i++) {
      const a = bounds[i];
      const b = bounds[i + 1];
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

    const paraTrans = Object.values(inlineTrans).filter(
      (t) => t.secId === s.id && t.paraIdx === pi && openTransKey === t.key
    );

    return (
      <div key={key} style={{ margin: '0 -10px 10px' }}>
        <p
          id={`para-${s.id}-${pi}`}
          onMouseUp={() => handleMouseUp(s.id, pi)}
          onDoubleClick={() => handleMouseUp(s.id, pi)}
          onClick={() => {
            if (popup) return;
            // 单击段落：同步到中栏翻译面板（保留原有交互）
            onTranslate(text, s.id, pi);
          }}
          style={{
            fontSize: 13.8,
            lineHeight: 1.9,
            textAlign: 'justify',
            margin: 0,
            padding: '6px 10px',
            borderRadius: 8,
            cursor: 'text',
            transition: 'background .2s',
            background: activeKey === key ? 'var(--accent-soft)' : 'transparent',
            userSelect: 'text',
          }}
          onMouseEnter={(e) => {
            if (activeKey !== key) e.currentTarget.style.background = 'var(--brand-softer)';
          }}
          onMouseLeave={(e) => {
            if (activeKey !== key) e.currentTarget.style.background = 'transparent';
          }}
        >
          {nodes}
        </p>

        {/* 划词翻译内联卡片：展示在选中段落下方 */}
        {paraTrans.map((t) => (
          <InlineTransCard
            key={t.key}
            data={t}
            onClose={() => closeTrans(t.key)}
            onRetranslate={(dir) => {
              const target: Popup = {
                secId: t.secId,
                paraIdx: t.paraIdx,
                start: t.start,
                end: t.end,
                text: t.text,
                anchorTop: 0,
                anchorBottom: 0,
                anchorLeft: 0,
              };
              runInlineTranslate(target, dir);
            }}
          />
        ))}
      </div>
    );
  };

  const sorted = useMemo(() => {
    const order = new Map(sections.map((s: any, i: number) => [s.id, i]));
    return [...highlights].sort(
      (a, b) => (order.get(a.secId) || 0) - (order.get(b.secId) || 0) || a.paraIdx - b.paraIdx || a.start - b.start
    );
  }, [highlights, sections]);

  const popupLeft = popup ? Math.max(8, Math.min(popup.anchorLeft, (scrollRef.current?.clientWidth || 400) - 300)) : 0;
  const popupTop = popup ? popup.anchorBottom + 6 : 0;

  return (
    <div ref={scrollRef} style={{ position: 'relative', flex: 1, overflowY: 'auto', minWidth: 0 }}>
      {/* 批注列表抽屉（由顶栏批注按钮控制展开） */}
      {notesOpen && (
        <div className="card anim-in" style={{ margin: '10px 14px 0', padding: 10, maxHeight: 180, overflowY: 'auto' }}>
          <div className="row g-1 mb-1">
            <span className="text-xs fw-bold">高亮与批注</span>
            <span className="text-xs text-muted">点击条目可跳回原文</span>
          </div>
          {sorted.length === 0 ? (
            <div className="text-xs text-muted" style={{ padding: '6px 2px' }}>
              尚无批注 —— 在正文中划选文字即可高亮、批注或翻译
            </div>
          ) : (
            <div className="col g-1">
              {sorted.map((h) => (
                <div
                  key={h.id}
                  className="row g-1"
                  style={{ alignItems: 'flex-start', fontSize: 12, padding: '6px 8px', borderRadius: 8, background: 'var(--bg)' }}
                >
                  <span style={{ width: 12, height: 12, borderRadius: 4, background: h.color, marginTop: 3, flexShrink: 0 }} />
                  <button
                    style={{
                      flex: 1,
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--ink-2)',
                      lineHeight: 1.6,
                    }}
                    onClick={() => document.getElementById(`para-${h.secId}-${h.paraIdx}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })}
                  >
                    {h.text.length > 42 ? h.text.slice(0, 42) + '…' : h.text}
                    {h.note && (
                      <div className="text-xs" style={{ color: 'var(--accent)', marginTop: 2 }}>
                        批注：{h.note}
                      </div>
                    )}
                  </button>
                  <button
                    className="btn btn-ghost btn-icon"
                    style={{ width: 22, height: 22 }}
                    title="删除批注"
                    onClick={() => commit(highlights.filter((x) => x.id !== h.id))}
                  >
                    <Icon name="trash" size={11} />
                  </button>
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
            <h1 className="text-serif" style={{ fontSize: 19, lineHeight: 1.5 }}>
              {doc.title}
            </h1>
            <div className="text-small text-muted mt-1">
              {doc.authors} · {doc.venue} · {doc.pages} 页
              {doc.has_code && (
                <a href={doc.code_url} target="_blank" rel="noreferrer" style={{ marginLeft: 8 }}>
                  <Icon name="branch" size={12} /> 开源代码
                </a>
              )}
              {doc.parse_meta?.degraded && (
                <span className="tag tag-amber" style={{ marginLeft: 8, fontSize: 10.5 }}>
                  <Icon name="alert" size={10} />降级解析
                </span>
              )}
            </div>
          </header>
          <div
            className="text-xs text-muted"
            style={{ marginBottom: 14, padding: '8px 12px', background: 'var(--brand-softer)', borderRadius: 8 }}
          >
            <Icon name="quote" size={12} /> {doc.abstract}
          </div>
          {sections.map((s: any) => (
            <section key={s.id} id={`sec-${s.id}`} style={{ marginBottom: 18, scrollMarginTop: 60 }}>
              <h2 className="text-serif" style={{ fontSize: 15, color: 'var(--brand-strong)', marginBottom: 8 }}>
                {s.title}
                <span className="text-xs text-muted" style={{ fontWeight: 400, marginLeft: 8 }}>
                  P{Number(String(s.page))}
                </span>
              </h2>
              {(s.paragraphs || []).map((p: string, i: number) => renderPara(p, s, i))}
            </section>
          ))}
          <div className="text-xs text-muted text-center" style={{ padding: '10px 0' }}>
            — 划选文字高亮批注 · 划词翻译内联展示 · 单击段落同步精翻 —
          </div>
        </article>
      </div>

      {/* 划词浮动工具：选色 + 批注 + 翻译（对应验收标准三步操作） */}
      {popup && (
        <div
          ref={popupRef}
          className="card anim-in row g-1"
          data-selection-popup="true"
          style={{
            position: 'absolute',
            left: popupLeft,
            top: popupTop,
            zIndex: 30,
            padding: 8,
            alignItems: 'center',
            boxShadow: '0 8px 28px rgba(0, 0, 0, .18)',
            willChange: 'transform',
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {PALETTE.map((c) => (
            <button
              key={c.color}
              title={`${c.label}（点击高亮）`}
              onClick={() => addHighlight(c.color)}
              style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid var(--line-strong)', background: c.color, cursor: 'pointer' }}
            />
          ))}
          <span style={{ width: 1, height: 18, background: 'var(--line)', margin: '0 2px' }} />
          <button
            className="btn btn-soft btn-sm"
            style={{ fontSize: 12, padding: '3px 8px' }}
            title="翻译选中内容（自动判断中↔英方向）"
            onClick={() => runInlineTranslate(popup)}
          >
            <Icon name="globe" size={12} /> 翻译
          </button>
          <button
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 12, padding: '3px 8px' }}
            title="反向翻译"
            onClick={() => runInlineTranslate(popup, detectDirection(popup.text) === 'en2zh' ? 'zh2en' : 'en2zh')}
          >
            中↔英
          </button>
          <input
            className="input"
            style={{ width: 118, fontSize: 12, padding: '4px 8px' }}
            placeholder="批注（可选）…"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addHighlight('#ffe58a');
            }}
          />
          <button className="btn btn-ghost btn-icon" style={{ width: 22, height: 22 }} onClick={clearSelection} title="关闭">
            <Icon name="x" size={12} />
          </button>
        </div>
      )}

      {/* 已有高亮的批注查看 / 编辑 */}
      {notePopup && (
        <div
          className="card anim-in"
          data-note-popup="true"
          style={{
            position: 'absolute',
            left: Math.max(8, Math.min(notePopup.x, (scrollRef.current?.clientWidth || 400) - 260)),
            top: notePopup.y,
            zIndex: 30,
            padding: 10,
            width: 240,
            boxShadow: '0 8px 28px rgba(0, 0, 0, .18)',
          }}
        >
          <div className="row g-1 mb-1">
            <span style={{ width: 10, height: 10, borderRadius: 3, background: notePopup.hl.color }} />
            <span className="text-xs fw-bold">批注</span>
          </div>
          <div className="text-xs text-muted mb-1" style={{ lineHeight: 1.6 }}>
            「{notePopup.hl.text.slice(0, 60)}
            {notePopup.hl.text.length > 60 ? '…' : ''}」
          </div>
          <input
            className="input"
            style={{ width: '100%', fontSize: 12 }}
            value={notePopup.hl.note}
            placeholder="记录想法…"
            onChange={(e) => {
              const v = e.target.value;
              setNotePopup((np) => np && { ...np, hl: { ...np.hl, note: v } });
              commit(highlights.map((h) => (h.id === notePopup.hl.id ? { ...h, note: v } : h)));
            }}
          />
          <div className="row g-1 mt-1" style={{ justifyContent: 'space-between' }}>
            <div className="row g-1">
              {PALETTE.map((c) => (
                <button
                  key={c.color}
                  title={`改为${c.label}`}
                  onClick={() => {
                    setNotePopup((np) => np && { ...np, hl: { ...np.hl, color: c.color } });
                    commit(highlights.map((h) => (h.id === notePopup.hl.id ? { ...h, color: c.color } : h)));
                  }}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 5,
                    border: '1px solid var(--line-strong)',
                    background: c.color,
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
            <div className="row g-1">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  commit(highlights.filter((h) => h.id !== notePopup.hl.id));
                  setNotePopup(null);
                }}
              >
                <Icon name="trash" size={12} />
                删除
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setNotePopup(null)}>
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- 划词翻译内联卡片 ---------- */

function InlineTransCard({
  data,
  onClose,
  onRetranslate,
}: {
  data: InlineTrans;
  onClose: () => void;
  onRetranslate: (dir: 'en2zh' | 'zh2en') => void;
}) {
  const dirLabel = data.direction === 'en2zh' ? '英 → 中' : '中 → 英';
  return (
    <div
      className="anim-in"
      style={{
        margin: '8px 10px 4px',
        padding: '10px 12px',
        borderRadius: 10,
        background: 'var(--brand-softer)',
        border: '1px solid var(--brand-soft)',
        borderLeft: '3px solid var(--brand)',
      }}
    >
      <div className="row-between items-center mb-1">
        <span className="row g-1 items-center">
          <Icon name="globe" size={12} />
          <span className="text-xs fw-bold">划词翻译 · {dirLabel}</span>
          {data.mode && (
            <span className="tag tag-gray" style={{ fontSize: 10 }}>
              {data.mode === 'live' ? 'AI 实时' : '演示回退'}
            </span>
          )}
        </span>
        <span className="row g-1">
          <button
            className="btn btn-ghost btn-icon"
            style={{ width: 20, height: 20 }}
            title="切换翻译方向"
            onClick={() => onRetranslate(data.direction === 'en2zh' ? 'zh2en' : 'en2zh')}
          >
            <Icon name="refresh" size={11} />
          </button>
          <button className="btn btn-ghost btn-icon" style={{ width: 20, height: 20 }} title="关闭译文" onClick={onClose}>
            <Icon name="x" size={11} />
          </button>
        </span>
      </div>

      <div className="text-xs text-muted" style={{ lineHeight: 1.7, marginBottom: 6, opacity: 0.85 }}>
        {data.text.length > 160 ? data.text.slice(0, 160) + '…' : data.text}
      </div>

      {data.status === 'loading' && (
        <div className="row g-1 items-center text-small text-muted">
          <span className="spinner" /> 正在调用学术翻译引擎…
        </div>
      )}
      {data.status === 'error' && (
        <div className="text-small" style={{ color: '#e5484d' }}>
          <Icon name="alert" size={12} /> {data.translated || '翻译失败'}
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={() => onRetranslate(data.direction)}>
            重试
          </button>
        </div>
      )}
      {data.status === 'done' && (
        <>
          <div style={{ fontSize: 13.2, lineHeight: 1.85, color: 'var(--ink)' }}>{data.translated}</div>
          {!!data.glossary?.length && (
            <div className="row g-1 mt-2 wrap">
              {data.glossary.slice(0, 8).map((g: any, i: number) => (
                <span key={i} className="tag tag-outline" style={{ fontSize: 10.5 }}>
                  {g.en || g.term} ➔ {g.zh || g.translation}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
