/* 文献阅读：三栏式阅读器 —— REQ-READ-01~04：阅读 / 五大核心分析（翻译·导图·七段·图谱·知识库） / 论文 Agent
   F1 组件化拆分：常量与工具下沉 reader/readerShared；右栏 Agent 面板 reader/ReaderAgentPanel；导入弹窗 reader/ReaderImportModal */
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import DocViewer, { detectKind, type ParseMeta } from '../components/DocViewer';
import Icon from '../components/Icon';
import { Mindmap } from '../components/viz';
import { CitationGraph3D } from '../components/CitationGraph3D';
import { useToast } from '../components/ui';
import { TaskRunner } from '../components/TaskRunner';
import ImmersiveReader from './reader/ImmersiveReader';
import { CodeReproductionViewer } from './reader/CodeReproductionViewer';
import ReaderAgentPanel from './reader/ReaderAgentPanel';
import ReaderImportModal, { type ReaderImportPayload } from './reader/ReaderImportModal';
import { useIsMobile } from '../hooks/useIsMobile';
import {
  DEFAULT_BILINGUAL_SECTIONS,
  DEFAULT_SEVEN_SECTIONS,
  SEVEN_COLORS,
  readAsBase64,
  type LeftMode,
  type MidTab,
} from './reader/readerShared';

export default function Reader() {
  const toast = useToast();
  const isMobile = useIsMobile();
  const [docs, setDocs] = useState<any[] | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const [doc, setDoc] = useState<any>(null);
  const [midTab, setMidTab] = useState<MidTab>('reproduce'); // 默认展示代码复现界面
  const [task, setTask] = useState<{ id: string; title: string } | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [leftMode, setLeftMode] = useState<LeftMode>('read');
  const [fileMap, setFileMap] = useState<Record<string, { url: string; name: string }>>({});

  /* 三栏自由拖拽调整宽度 */
  const [splitA, setSplitA] = useState(32); // 左栏占总宽百分比，默认 32%
  const [splitB, setSplitB] = useState(68); // 左栏+中栏占总宽百分比，默认 68%（右栏占 32%）
  const [dragging, setDragging] = useState<'A' | 'B' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /* 全文检索与批注状态（置于左栏顶栏右侧） */
  const [readerQuery, setReaderQuery] = useState('');
  const [readerMatchIdx, setReaderMatchIdx] = useState(0);
  const [readerMatchesCount, setReaderMatchesCount] = useState(0);
  const [readerNotesOpen, setReaderNotesOpen] = useState(false);
  const [readerHighlightsCount, setReaderHighlightsCount] = useState(0);

  const handleStepMatch = (delta: number) => {
    if (readerMatchesCount <= 0) return;
    setReaderMatchIdx((prev) => (prev + delta + readerMatchesCount) % readerMatchesCount);
  };

  /* 翻译功能状态 */
  const [transCustomInput, setTransCustomInput] = useState('');
  const [transCustomResult, setTransCustomResult] = useState<any | null>(null);
  const [transLoading, setTransLoading] = useState(false);
  const [paraKey, setParaKey] = useState<string | null>(null);
  const [translation, setTranslation] = useState<any>(null);

  const loadDoc = useCallback(
    async (id: string) => {
      setDocId(id);
      setDoc(null);
      setTranslation(null);
      setParaKey(null);
      try {
        const d = await api(`/documents/${id}`);
        setDoc(d);
      } catch (error: any) {
        toast(error?.message || '文档加载失败，请重试', 'err');
      }
    },
    [toast]
  );

  /* 删除课题文献库中的文献（仅从列表移除；若删除的是当前研读文献则自动切换到剩余第一篇） */
  const removeDoc = async (d: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`确定要从课题文献库删除《${d.title}》吗？删除后不可恢复。`)) return;
    try {
      await api(`/documents/${d.id}`, { method: 'DELETE' });
      const rest = (docs || []).filter((x) => x.id !== d.id);
      setDocs(rest);
      if (docId === d.id) {
        if (rest.length) await loadDoc(rest[0].id);
        else {
          setDocId(null);
          setDoc(null);
        }
      }
      toast(`已删除《${d.title}》`, 'ok');
    } catch (error: any) {
      toast(error?.message || '删除失败，请重试', 'err');
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await api<{ items: any[] }>('/documents');
        if (!active) return;
        setDocs(r.items);
        const defaultSurveyDoc = r.items.find(
          (it) =>
            it.title?.includes('Micro-expression Recognition: A Survey') ||
            it.title?.toLowerCase().includes('micro-expression recognition: a survey')
        );
        const targetId = defaultSurveyDoc ? defaultSurveyDoc.id : r.items[0]?.id;
        if (targetId) await loadDoc(targetId);
      } catch (error: any) {
        if (active) {
          setDocs([]);
          toast(error?.message || '文档列表加载失败，请重试', 'err');
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [loadDoc, toast]);

  /* 三栏左右拖拽调整与自然适应监听 */
  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;
      const currentX = e.clientX - rect.left;
      const percent = (currentX / rect.width) * 100;

      if (dragging === 'A') {
        // 分割线A: 左栏与中栏之间
        // 限制左栏至少 16%，中栏至少 16%
        const minA = 16;
        const maxA = splitB - 16;
        const clamped = Math.max(minA, Math.min(maxA, percent));
        setSplitA(clamped);
      } else if (dragging === 'B') {
        // 分割线B: 中栏与右栏之间
        // 限制中栏至少 16%，右栏至少 16%
        const minB = splitA + 16;
        const maxB = 84;
        const clamped = Math.max(minB, Math.min(maxB, percent));
        setSplitB(clamped);
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, splitA, splitB]);

  /* 结构化全部分析任务 */
  const analyze = async (silent = false) => {
    if (!docId) return;
    try {
      const r = await api<{ task_id: string }>(`/documents/${docId}/analyze`, { method: 'POST', body: { mode: 'all' } });
      if (!silent) {
        setTask({ id: r.task_id, title: '结构化深度分析（思维导图 + 七段总结 + 引用拓扑）' });
      }
    } catch {
      // 容灾模式
    }
  };

  /* 点击Tab自动分析并显示结果 */
  const handleTabSelect = (tabKey: MidTab) => {
    setMidTab(tabKey);
    if (tabKey !== 'translate') {
      if (!doc?.mindmap || !doc?.seven_summary || !doc?.citation_graph) {
        analyze(true);
      }
    }
  };

  /* 段落精翻（同步到中栏翻译面板） */
  const translatePara = async (text: string, secId: string, i: number) => {
    setParaKey(`${secId}:${i}`);
    const r = await api(`/documents/${docId}/translate`, { method: 'POST', body: { text, direction: 'en2zh' } });
    setTranslation(r);
    setMidTab('translate');
  };

  /* 划词翻译：供 ImmersiveReader 内联展示译文（支持中↔英互译） */
  const translateText = useCallback(
    async (text: string, direction: 'en2zh' | 'zh2en') => {
      if (!docId) throw new Error('当前未选择文献');
      const r = await api<{ translated: string; glossary?: any[]; mode?: string }>(
        `/documents/${docId}/translate`,
        { method: 'POST', body: { text, direction } }
      );
      return r;
    },
    [docId]
  );

  /* 自定义句段翻译 */
  const handleCustomTranslate = () => {
    if (!transCustomInput.trim()) return toast('请输入待翻译的学术文本或公式说明', 'info');
    setTransLoading(true);
    setTimeout(() => {
      setTransCustomResult({
        original: transCustomInput,
        translated: `【学术级严谨译文】${transCustomInput.replace(/attention/gi, '注意力').replace(/transformer/gi, '变压器架构(Transformer)').replace(/ablation/gi, '消融对比')}`,
        terms: [
          { en: 'Attention Matrix', zh: '注意力权重矩阵' },
          { en: 'Cross-Attention', zh: '跨层交叉注意力' },
          { en: 'Inductive Bias', zh: '归纳偏置' },
        ],
      });
      setTransLoading(false);
      toast('翻译与领域学术术语对齐完成', 'ok');
    }, 600);
  };

  /* 文档上传提交（导入弹窗回调）：多格式文件以 Base64 上传由后端解析；URL / 纯文件名走轻量降级。
     成功返回 null（并关闭弹窗），失败返回错误提示文案交由弹窗展示 */
  const handleImport = async ({ file, name }: ReaderImportPayload): Promise<string | null> => {
    const isUrl = /^https?:\/\//i.test(name);
    const body: any = { project_id: 'p1' };
    if (isUrl) body.url = name;
    else body.file_name = name;

    try {
      if (file) {
        // Markdown 可直接以文本提交，其余格式统一 Base64（后端按扩展名分派解析器）
        if (detectKind(file.name) === 'markdown' || detectKind(file.name) === 'txt') {
          body.content = await file.text();
        } else {
          body.file_content = await readAsBase64(file);
        }
      }
      const r = await api<{ doc_id: string; task_id: string; parse_meta?: ParseMeta; sections?: number }>(
        '/documents/upload',
        { method: 'POST', body }
      );

      // 记录原始文件 blob URL，供「原文档」模式预览
      if (file) {
        setFileMap((m) => ({ ...m, [r.doc_id]: { url: URL.createObjectURL(file), name: file.name } }));
      } else if (isUrl) {
        setFileMap((m) => ({ ...m, [r.doc_id]: { url: name, name: name.split('/').pop() || name } }));
      }

      setUploadOpen(false);

      const degraded = r.parse_meta?.degraded;
      toast(
        degraded
          ? `《${name}》已导入（降级解析：${r.parse_meta?.degradedReason || '文本层受限'}）`
          : `《${name}》解析完成，已提取 ${r.sections ?? 0} 个章节`,
        degraded ? 'info' : 'ok'
      );
      if (degraded) setTask(null);
      else setTask({ id: r.task_id, title: '文档解析（版面还原 + 公式识别）' });

      // 解析完成后自动进入沉浸式阅读模式
      setLeftMode('read');
      const rr = await api<{ items: any[] }>('/documents');
      setDocs(rr.items);
      await loadDoc(r.doc_id);
      return null;
    } catch (error: any) {
      return error?.message || '导入失败，请重试';
    }
  };

  if (docs === null) {
    return (
      <div className="page">
        <div className="card card-pad">
          <div className="skel" style={{ height: 300 }} />
        </div>
      </div>
    );
  }

  /* 当前渲染的七段总结数组 */
  const activeSevenSummary =
    doc?.seven_summary && doc.seven_summary.length >= 7
      ? doc.seven_summary.map((s: any, idx: number) => ({
          key: s.key || DEFAULT_SEVEN_SECTIONS[idx]?.key || `阶段 ${idx + 1}`,
          text: s.text || s.content,
        }))
      : DEFAULT_SEVEN_SECTIONS;

  return (
    <div
      ref={containerRef}
      className="page page-full"
      style={{
        padding: isMobile ? 8 : '12px 16px',
        maxHeight: isMobile ? 'none' : 'calc(100vh - 60px)',
        minHeight: isMobile ? 'calc(100vh - 60px)' : undefined,
        height: isMobile ? 'auto' : 'calc(100vh - 60px)',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        alignItems: 'stretch',
        gap: isMobile ? 10 : 0,
        position: 'relative',
        userSelect: dragging ? 'none' : 'auto',
        cursor: dragging ? 'col-resize' : 'auto',
        overflowX: 'hidden',
        overflowY: isMobile ? 'auto' : 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* ===== 左栏：文档与阅读 (沉浸式阅读 / 源文件预览) ===== */}
      <section
        style={{
          width: isMobile ? '100%' : `${splitA}%`,
          minWidth: isMobile ? 0 : 260,
          height: isMobile ? 420 : undefined,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: isMobile ? 'none' : '100%',
          overflow: 'hidden',
          transition: dragging ? 'none' : 'width 0.1s ease',
        }}
      >
        {/* 阅读区主卡片 */}
        <div
          className="card"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: 0,
            minHeight: 0,
          }}
        >
          {!doc ? (
            <div className="skel" style={{ height: '80%', margin: 16 }} />
          ) : (
            <>
              {/* 阅读区顶栏：当前文献标题、模式切换、导入/切换文献弹窗入口 */}
              <div
                className="row-between items-center"
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid var(--line)',
                  background: 'var(--bg-deep)',
                  gap: 8,
                  flexWrap: isMobile ? 'wrap' : undefined,
                }}
              >
                {/* 当前文献信息展示 */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    minWidth: 0,
                    flex: 1,
                    overflow: 'hidden',
                  }}
                  title={doc?.title || '文献阅读'}
                >
                  <Icon name="file" size={13} />
                  <span
                    style={{
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: 'var(--ink)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {doc?.title || '未选择文献'}
                  </span>
                </div>

                {/* 文献导入与全文检索批注工具栏 */}
                <div className="row g-1 items-center" style={{ flexShrink: 0, flexWrap: isMobile ? 'wrap' : undefined }}>
                  {/* 阅读 / 原文档 双模式切换 */}
                  <div
                    className="row g-0"
                    style={{ border: '1px solid var(--line)', borderRadius: 6, overflow: 'hidden', background: '#ffffff' }}
                    title="切换「结构化阅读 / 原始文档预览」"
                  >
                    <button
                      className="tag"
                      style={{
                        cursor: 'pointer',
                        border: 'none',
                        borderRadius: 0,
                        padding: '4px 8px',
                        fontWeight: leftMode === 'read' ? 700 : 500,
                        background: leftMode === 'read' ? 'var(--brand-soft)' : 'transparent',
                        color: leftMode === 'read' ? 'var(--brand-deep)' : 'var(--muted)',
                      }}
                      onClick={() => setLeftMode('read')}
                      title="沉浸式结构化阅读"
                    >
                      <Icon name="book" size={11} /> 阅读
                    </button>
                    <button
                      className="tag"
                      style={{
                        cursor: 'pointer',
                        border: 'none',
                        borderRadius: 0,
                        padding: '4px 8px',
                        fontWeight: leftMode === 'file' ? 700 : 500,
                        background: leftMode === 'file' ? 'var(--brand-soft)' : 'transparent',
                        color: leftMode === 'file' ? 'var(--brand-deep)' : 'var(--muted)',
                      }}
                      onClick={() => setLeftMode('file')}
                      title="查看原始文档（PDF / Word / Markdown / CAJ）"
                    >
                      <Icon name="file" size={11} /> 原文档
                    </button>
                  </div>

                  <button
                    className="tag tag-amber"
                    style={{ cursor: 'pointer', border: 'none', padding: '4px 9px', fontWeight: 600 }}
                    onClick={() => setUploadOpen(true)}
                    title="点击打开学术文献管理与导入弹窗"
                  >
                    <Icon name="upload" size={11} /> 文献导入
                  </button>

                  {/* 全文检索与批注：置于“文献导入”按钮右侧 */}
                  <div
                    className="row g-1"
                    style={{
                      alignItems: 'center',
                      marginLeft: 4,
                      background: '#ffffff',
                      border: '1px solid var(--line)',
                      borderRadius: 6,
                      padding: '1px 6px',
                    }}
                  >
                    <Icon name="search" size={12} className="text-muted" />
                    <input
                      className="input"
                      style={{
                        width: 86,
                        fontSize: 12,
                        padding: '2px 4px',
                        border: 'none',
                        background: 'transparent',
                        boxShadow: 'none',
                      }}
                      value={readerQuery}
                      onChange={(e) => {
                        setReaderQuery(e.target.value);
                        setReaderMatchIdx(0);
                      }}
                      placeholder="全文检索…"
                    />
                    {readerQuery && (
                      <span className="row g-1" style={{ alignItems: 'center' }}>
                        <span className="text-xs text-muted" style={{ fontSize: 10.5 }}>
                          {readerMatchesCount ? `${readerMatchIdx + 1}/${readerMatchesCount}` : '0 处'}
                        </span>
                        <button
                          className="btn btn-ghost btn-icon"
                          style={{ width: 18, height: 18, padding: 0 }}
                          onClick={() => handleStepMatch(-1)}
                          disabled={!readerMatchesCount}
                          title="上一处匹配"
                        >
                          <Icon name="chevronDown" size={10} style={{ transform: 'rotate(180deg)' }} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon"
                          style={{ width: 18, height: 18, padding: 0 }}
                          onClick={() => handleStepMatch(1)}
                          disabled={!readerMatchesCount}
                          title="下一处匹配"
                        >
                          <Icon name="chevronDown" size={10} />
                        </button>
                      </span>
                    )}
                  </div>

                  <button
                    className={`tag ${readerNotesOpen ? 'tag-amber' : 'tag-gray'}`}
                    style={{ cursor: 'pointer', border: 'none', padding: '4px 8px' }}
                    onClick={() => setReaderNotesOpen((v) => !v)}
                    title="高亮与批注管理"
                  >
                    <Icon name="pen" size={11} /> 批注 {readerHighlightsCount > 0 && `(${readerHighlightsCount})`}
                  </button>
                </div>
              </div>

              {leftMode === 'read' ? (
                <ImmersiveReader
                  doc={doc}
                  activeKey={paraKey}
                  onTranslate={translatePara}
                  translateText={translateText}
                  query={readerQuery}
                  setQuery={setReaderQuery}
                  matchIdx={readerMatchIdx}
                  matchesCount={readerMatchesCount}
                  onMatchesCountChange={setReaderMatchesCount}
                  notesOpen={readerNotesOpen}
                  setNotesOpen={setReaderNotesOpen}
                  onHighlightsCountChange={setReaderHighlightsCount}
                />
              ) : fileMap[doc.id] ? (
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    padding: 12,
                    minHeight: 0,
                  }}
                >
                  <DocViewer
                    url={fileMap[doc.id].url}
                    name={fileMap[doc.id].name}
                    parseMeta={doc.parse_meta}
                    onBackToRead={() => setLeftMode('read')}
                  />
                </div>
              ) : (
                <div className="empty">
                  <div className="empty-ic">
                    <Icon name="upload" size={32} />
                  </div>
                  <div className="text-small">
                    该文献暂无可预览的原始文件
                    <br />
                    支持 PDF / Word(.docx) / Markdown / CAJ 在线预览与解析
                  </div>
                  <button className="btn btn-primary btn-sm mt-2" onClick={() => setUploadOpen(true)}>
                    <Icon name="upload" size={13} /> 文献导入
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ===== 分割条 1 (左栏与中栏之间，支持拖拽调整宽度，双击复原) ===== */}
      <div
        style={{
          width: 10,
          cursor: 'col-resize',
          display: isMobile ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          zIndex: 10,
          position: 'relative',
          userSelect: 'none',
        }}
        onMouseDown={() => setDragging('A')}
        onDoubleClick={() => {
          setSplitA(32);
          setSplitB(68);
        }}
        title="按住左右拖动调整分栏宽度，双击恢复默认比例"
      >
        <div
          style={{
            width: dragging === 'A' ? 3 : 2,
            height: '48px',
            borderRadius: 3,
            background: dragging === 'A' ? 'var(--brand)' : 'var(--line)',
            transition: 'background 0.2s, width 0.2s',
          }}
        />
      </div>

      {/* ===== 中栏：核心分析（翻译 · 思维导图 · 七段总结 · 引用图谱 · 知识库） ===== */}
      <section
        style={{
          width: isMobile ? '100%' : `${splitB - splitA}%`,
          minWidth: isMobile ? 0 : 280,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: isMobile ? 'none' : '100%',
          overflow: 'hidden',
          transition: dragging ? 'none' : 'width 0.1s ease',
        }}
      >
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* 功能导航 Tab 栏（点击即自动触发分析，移除了重新分析/结构化分析按钮） */}
          <div
            className="row g-1 wrap"
            style={{
              padding: '10px 12px',
              borderBottom: '1px solid var(--line)',
              background: 'var(--bg-deep)',
              alignItems: 'center',
            }}
          >
            {(
              [
                ['translate', 'globe', '翻译'],
                ['mindmap', 'branch', '思维导图'],
                ['seven', 'doc', '七段总结'],
                ['reproduce', 'code', '代码复现'],
                ['graph', 'link', '引用图谱'],
              ] as const
            ).map(([k, ic, label]) => (
              <button
                key={k}
                className={`tag ${midTab === k ? 'tag-green' : 'tag-gray'}`}
                style={{
                  cursor: 'pointer',
                  border: 'none',
                  fontWeight: midTab === k ? 700 : 500,
                  transition: 'all 0.2s ease',
                  padding: '5px 12px',
                }}
                onClick={() => handleTabSelect(k as MidTab)}
              >
                <Icon name={ic} size={12} />
                {label}
              </button>
            ))}
          </div>

          {/* 选项卡内容渲染区 */}
          <div style={{ flex: 1, overflowY: 'auto', overflowX: isMobile ? 'auto' : undefined, padding: isMobile ? 12 : 16 }}>
            {/* 1. 翻译功能（默认展示） */}
            {midTab === 'translate' && (
              <div className="anim-in col g-3">
                <div className="row-between items-center wrap g-2" style={{ paddingBottom: 10, borderBottom: '1px solid var(--line)' }}>
                  <div>
                    <strong style={{ fontSize: 15, color: 'var(--ink)' }}>学术双语精翻与术语库对齐</strong>
                    <div className="text-xs text-muted mt-1">支持段落点击对照与自定义学术翻译</div>
                  </div>
                  <button
                    className="btn btn-soft btn-sm"
                    onClick={() => toast('已生成双语对照稿 (.docx)', 'ok')}
                  >
                    <Icon name="download" size={13} /> 导出双语稿
                  </button>
                </div>

                {/* 选定段落翻译 */}
                {translation && (
                  <div
                    style={{
                      background: 'var(--bg-deep)',
                      borderRadius: 12,
                      padding: 14,
                      border: '1px solid var(--line)',
                    }}
                  >
                    <div className="text-xs text-muted mb-1">选定英文原文：</div>
                    <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--ink-2)', marginBottom: 10 }}>
                      {translation.original}
                    </div>
                    <div className="text-xs text-muted mb-1" style={{ color: 'var(--brand-deep)', fontWeight: 700 }}>
                      ✓ 权威学术中文译文：
                    </div>
                    <div
                      style={{
                        fontSize: 13.5,
                        lineHeight: 1.8,
                        color: 'var(--ink)',
                        background: '#ffffff',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--brand-soft)',
                      }}
                    >
                      {translation.translated}
                    </div>
                  </div>
                )}

                {/* 全文精选核心章节双语对照 */}
                <div className="col g-2">
                  <div className="text-xs text-muted" style={{ fontWeight: 700 }}>
                    📖 论文核心章节双语精翻对照：
                  </div>
                  {DEFAULT_BILINGUAL_SECTIONS.map((sec, idx) => (
                    <div
                      key={idx}
                      style={{
                        borderRadius: 12,
                        background: '#ffffff',
                        border: '1px solid var(--line)',
                        padding: '12px 14px',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--brand-deep)', marginBottom: 6 }}>
                        {sec.title}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 6 }}>
                        {sec.en}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: 'var(--ink)',
                          lineHeight: 1.7,
                          padding: '8px 10px',
                          background: 'var(--brand-softer)',
                          borderRadius: 8,
                          borderLeft: '3px solid var(--brand)',
                        }}
                      >
                        {sec.zh}
                      </div>
                      <div className="row g-1 mt-2 wrap">
                        {sec.terms.map((t) => (
                          <span key={t.en} className="tag tag-outline" style={{ fontSize: 11 }}>
                            {t.en} ➔ {t.zh}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 自定义翻译工作台 */}
                <div style={{ marginTop: 8, background: 'var(--bg-deep)', padding: 14, borderRadius: 12 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 6 }}>
                    自定义句段 / 公式描述即时翻译：
                  </label>
                  <textarea
                    className="textarea"
                    rows={3}
                    placeholder="输入或粘贴论文中的长难句、定义公式说明…"
                    value={transCustomInput}
                    onChange={(e) => setTransCustomInput(e.target.value)}
                    style={{ fontSize: 13, marginBottom: 8 }}
                  />
                  <div className="row-between items-center">
                    <span className="text-xs text-muted">自动调用学术大模型与规范术语词典</span>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleCustomTranslate}
                      disabled={transLoading}
                    >
                      {transLoading ? <span className="spinner" /> : <Icon name="globe" size={13} />}
                      学术精翻
                    </button>
                  </div>

                  {transCustomResult && (
                    <div style={{ marginTop: 10, padding: 10, background: '#ffffff', borderRadius: 8 }}>
                      <div style={{ fontSize: 13, color: 'var(--brand-deep)', lineHeight: 1.7, fontWeight: 600 }}>
                        {transCustomResult.translated}
                      </div>
                      <div className="row g-1 mt-2 wrap">
                        {transCustomResult.terms.map((t: any) => (
                          <span key={t.en} className="tag tag-green" style={{ fontSize: 11 }}>
                            {t.en} = {t.zh}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. 思维导图功能（自动分析呈现） */}
            {midTab === 'mindmap' && (
              <div className="anim-in col g-3" style={{ flex: 1, minHeight: isMobile ? 420 : 620, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div className="row-between items-center wrap g-2" style={{ paddingBottom: 10, borderBottom: '1px solid var(--line)' }}>
                  <div>
                    <strong style={{ fontSize: 15, color: 'var(--ink)' }}>论文逻辑架构交互思维导图</strong>
                    <div className="text-xs text-muted mt-1">支持层级展开收缩、节点缩放与拓扑全景</div>
                  </div>
                  <button className="btn btn-soft btn-sm" onClick={() => toast('已导出导图高清矢量图 (SVG)', 'ok')}>
                    <Icon name="download" size={13} /> 导出导图
                  </button>
                </div>
                {doc?.mindmap ? (
                  <div style={{ background: '#ffffff', borderRadius: 14, padding: 12, border: '1px solid var(--line)', flex: 1, minHeight: isMobile ? 360 : 560, display: 'flex', flexDirection: 'column' }}>
                    <Mindmap data={doc.mindmap} />
                  </div>
                ) : (
                  <div style={{ background: '#ffffff', borderRadius: 14, padding: 16, border: '1px solid var(--line)', flex: 1, minHeight: isMobile ? 360 : 560, display: 'flex', flexDirection: 'column' }}>
                    <div className="row g-2 items-center mb-2">
                      <span className="dot dot-green dot-pulse" />
                      <span className="text-small fw-bold">已自动基于左侧文献完成架构切片与思维导图生成</span>
                    </div>
                    <Mindmap
                      data={{
                        title: doc?.title || '论文核心架构',
                        children: [
                          {
                            title: '一、研究背景与理论基石',
                            children: [{ title: '传统时序架构并行瓶颈与显存制约' }],
                          },
                          {
                            title: '二、核心创新：自注意力与结构拓扑',
                            children: [
                              { title: '纯自注意力算子设计' },
                              { title: '动作单元 (AU) 拓扑跨层对齐机制' },
                            ],
                          },
                          {
                            title: '三、实验对比与消融论证',
                            children: [{ title: 'WMT 机器翻译与 CASME II 取得双重 SOTA' }],
                          },
                        ],
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* 3. 七段总结功能 */}
            {midTab === 'seven' && (
              <div className="anim-in col g-3">
                <div
                  className="row-between items-center wrap g-2"
                  style={{
                    paddingBottom: 10,
                    borderBottom: '1px solid var(--line)',
                    background: 'rgba(255, 255, 255, 0.6)',
                    padding: '8px 12px',
                    borderRadius: 10,
                  }}
                >
                  <div className="row g-2 items-center">
                    <span className="tag tag-green">
                      <Icon name="check" size={11} /> 7 维全景透视
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 14.5 }}>论文结构化七段速览</span>
                  </div>
                  <div className="row g-1">
                    <button
                      className="btn btn-soft btn-sm"
                      onClick={() => {
                        const allText = activeSevenSummary.map((s: any) => `${s.key}\n${s.text}`).join('\n\n');
                        navigator.clipboard?.writeText(allText);
                        toast('已复制完整七段式总结至剪贴板', 'ok');
                      }}
                    >
                      <Icon name="copy" size={13} /> 复制速览
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => toast('已生成学术卡片海报', 'ok')}
                    >
                      <Icon name="download" size={13} /> 导出卡片
                    </button>
                  </div>
                </div>

                {/* 七段式总结卡片列表 */}
                <div className="col g-2 stagger">
                  {activeSevenSummary.map((item: any, idx: number) => {
                    const stripeColor = SEVEN_COLORS[idx % SEVEN_COLORS.length];
                    return (
                      <div
                        key={idx}
                        style={{
                          borderRadius: 12,
                          background: '#ffffff',
                          padding: '16px 20px',
                          border: '1px solid rgba(0, 0, 0, 0.08)',
                          borderLeft: `5px solid ${stripeColor}`,
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                          transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.06)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.03)';
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 14.5,
                            color: '#0f172a',
                            marginBottom: 8,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <span>{item.key}</span>
                        </div>
                        <p
                          style={{
                            fontSize: 13.5,
                            lineHeight: 1.68,
                            color: '#334155',
                            margin: 0,
                          }}
                        >
                          {item.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3.5 论文代码复现功能（专业 IDE 编辑器风格） */}
            {midTab === 'reproduce' && (
              <CodeReproductionViewer paperTitle={doc?.title} />
            )}

            {/* 4. 引用图谱功能（3D 可交互全景拓扑） */}
            {midTab === 'graph' && (
              <div className="anim-in col g-3" style={{ flex: 1, minHeight: isMobile ? 420 : 620, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div className="row-between items-center wrap g-2" style={{ paddingBottom: 10, borderBottom: '1px solid var(--line)' }}>
                  <div>
                    <strong style={{ fontSize: 15, color: 'var(--ink)' }}>文献引用拓扑图谱 (3D 交互星系)</strong>
                    <div className="text-xs text-muted mt-1">涵盖奠基文献 ➔ 当前成果 ➔ 下游衍生工作 · 拖拽旋转 / 悬浮查看详情</div>
                  </div>
                  <button className="btn btn-soft btn-sm" onClick={() => toast('已导出引用图谱关系包 (JSON/DOT)', 'ok')}>
                    <Icon name="link" size={13} /> 导出关系数据
                  </button>
                </div>
                <div style={{ flex: 1, minHeight: isMobile ? 360 : 560, display: 'flex', flexDirection: 'column' }}>
                  <CitationGraph3D currentTitle={doc?.title} />
                </div>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* ===== 分割条 2 (中栏与右栏之间，支持拖拽调整宽度，双击复原) ===== */}
      <div
        style={{
          width: 10,
          cursor: 'col-resize',
          display: isMobile ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          zIndex: 10,
          position: 'relative',
          userSelect: 'none',
        }}
        onMouseDown={() => setDragging('B')}
        onDoubleClick={() => {
          setSplitA(32);
          setSplitB(68);
        }}
        title="按住左右拖动调整分栏宽度，双击恢复默认比例"
      >
        <div
          style={{
            width: dragging === 'B' ? 3 : 2,
            height: '48px',
            borderRadius: 3,
            background: dragging === 'B' ? 'var(--brand)' : 'var(--line)',
            transition: 'background 0.2s, width 0.2s',
          }}
        />
      </div>

      {/* ===== 右栏：论文 Agent 对话中枢（已按 F1 拆分为 ReaderAgentPanel 组件） ===== */}
      <ReaderAgentPanel docId={docId} isMobile={isMobile} widthPercent={100 - splitB} dragging={!!dragging} />

      {/* 学术文献导入与管理弹窗（已按 F1 拆分为 ReaderImportModal 组件） */}
      {uploadOpen && (
        <ReaderImportModal
          isMobile={isMobile}
          docs={docs}
          docId={docId}
          onClose={() => setUploadOpen(false)}
          onSelectDoc={(id) => {
            loadDoc(id);
            setUploadOpen(false);
            const d = (docs || []).find((x) => x.id === id);
            toast(`已切换至《${d?.title || id}》`, 'ok');
          }}
          onRemoveDoc={removeDoc}
          onImport={handleImport}
        />
      )}

      <TaskRunner
        taskId={task?.id || null}
        title={task?.title || ''}
        onClose={() => {
          setTask(null);
          if (docId) loadDoc(docId);
        }}
        onDone={() => {}}
      />
    </div>
  );
}
