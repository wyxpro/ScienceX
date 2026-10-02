/* 文献阅读：三栏式阅读器 —— REQ-READ-01~04：阅读 / 分析（翻译·导图·七段·图谱） / Agent 对话 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, docChatStream } from '../api/client';
import DocViewer, { detectKind } from '../components/DocViewer';
import Icon from '../components/Icon';
import Markdown from '../components/Markdown';
import { CitationGraph, Mindmap } from '../components/viz';
import { useToast } from '../components/ui';
import { TaskRunner } from '../components/TaskRunner';
import ImmersiveReader from './reader/ImmersiveReader';

type MidTab = 'translate' | 'mindmap' | 'seven' | 'graph' | 'kb';
type LeftMode = 'read' | 'file';

export default function Reader() {
  const toast = useToast();
  const [docs, setDocs] = useState<any[] | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const [doc, setDoc] = useState<any>(null);
  const [midTab, setMidTab] = useState<MidTab>('mindmap');
  const [task, setTask] = useState<{ id: string; title: string } | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [leftMode, setLeftMode] = useState<LeftMode>('read');
  /* 导入的原始文件（blob / 公网 URL）：对接 hexo-document-viewer 移植的 DocViewer 在线预览 */
  const [fileMap, setFileMap] = useState<Record<string, { url: string; name: string }>>({});

  /* 翻译 */
  const [paraKey, setParaKey] = useState<string | null>(null);
  const [translation, setTranslation] = useState<any>(null);

  /* Agent 对话 */
  const [chatMsgs, setChatMsgs] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatting, setChatting] = useState(false);
  const [references, setReferences] = useState<any[]>([]);
  const chatBottom = useRef<HTMLDivElement>(null);
  const chatAbortRef = useRef<AbortController | null>(null);

  const loadDoc = useCallback(async (id: string) => {
    setDocId(id); setDoc(null); setChatMsgs([]); setReferences([]); setTranslation(null); setParaKey(null);
    chatAbortRef.current?.abort();
    setChatting(false);
    try {
      const d = await api(`/documents/${id}`);
      setDoc(d);
      setMidTab(d.mindmap ? 'mindmap' : 'translate');
    } catch (error: any) {
      toast(error?.message || '文档加载失败，请重试', 'err');
    }
  }, [toast]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await api<{ items: any[] }>('/documents');
        if (!active) return;
        setDocs(r.items);
        if (r.items.length) await loadDoc(r.items[0].id);
      } catch (error: any) {
        if (active) {
          setDocs([]);
          toast(error?.message || '文档列表加载失败，请重试', 'err');
        }
      }
    })();
    return () => {
      active = false;
      chatAbortRef.current?.abort();
    };
  }, [loadDoc, toast]);
  useEffect(() => { chatBottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMsgs]);

  const analyze = async () => {
    const r = await api<{ task_id: string }>(`/documents/${docId}/analyze`, { method: 'POST', body: { mode: 'all' } });
    setTask({ id: r.task_id, title: '结构化分析（思维导图 + 七段式）' });
  };

  const translatePara = async (text: string, secId: string, i: number) => {
    setParaKey(`${secId}:${i}`);
    const r = await api(`/documents/${docId}/translate`, { method: 'POST', body: { text, direction: 'en2zh' } });
    setTranslation(r);
    setMidTab('translate');
  };

  const saveToKB = async () => {
    const r = await api<{ task_id: string }>(`/knowledge-bases/kb1/ingest`, { method: 'POST', body: { document_id: docId } });
    setTask({ id: r.task_id, title: '沉淀到 RAG 知识库（MER 课题组文献库）' });
  };

  const sendChat = async () => {
    const q = chatInput.trim();
    if (!q || chatting) return;
    setChatInput(''); setChatting(true);
    chatAbortRef.current?.abort();
    const controller = new AbortController();
    chatAbortRef.current = controller;
    const aiMsg = { role: 'assistant', content: '', streaming: true };
    setChatMsgs((m) => [...m, { role: 'user', content: q }, aiMsg]);
    try {
      await docChatStream(docId!, [{ role: 'user', content: q }], {
        onDelta: (t) => setChatMsgs((m) => m.map((x, i) => (i === m.length - 1 ? { ...x, content: x.content + t } : x))),
        onReference: (r) => setReferences((x) => [...x.filter((i: any) => i.chunk_id !== r.chunk_id), r]),
        onDone: () => { setChatMsgs((m) => m.map((x, i) => (i === m.length - 1 ? { ...x, streaming: false } : x))); setChatting(false); },
        onError: () => { setChatting(false); toast('对话失败，请重试', 'err'); },
      }, controller.signal);
    } finally {
      if (chatAbortRef.current === controller) chatAbortRef.current = null;
      setChatting(false);
    }
  };

  const upload = async () => {
    const name = uploadFile?.name || uploadName.trim();
    if (!name) return toast('请选择文件，或输入文件名 / URL', 'info');
    const isUrl = /^https?:\/\//i.test(name);
    const body: any = { project_id: 'p1' };
    if (isUrl) body.url = name;
    else body.file_name = /\.(pdf|docx?|xlsx?|pptx?|txt|md|tex)$/i.test(name) ? name : `${name}.pdf`;
    /* 纯文本类文件直接携带内容，供后端提取段落；其余格式走解析任务兜底 */
    if (uploadFile && detectKind(uploadFile.name) === 'txt') body.content = await uploadFile.text();
    const r = await api<{ doc_id: string; task_id: string }>('/documents/upload', { method: 'POST', body });
    if (uploadFile) setFileMap((m) => ({ ...m, [r.doc_id]: { url: URL.createObjectURL(uploadFile), name: uploadFile.name } }));
    else if (isUrl) setFileMap((m) => ({ ...m, [r.doc_id]: { url: name, name: name.split('/').pop() || name } }));
    setUploadOpen(false); setUploadName(''); setUploadFile(null);
    toast('解析任务已提交');
    setTask({ id: r.task_id, title: '文档解析（版面还原 + 公式识别）' });
    setTimeout(() => loadDoc(r.doc_id), 1500);
    const rr = await api<{ items: any[] }>('/documents');
    setDocs(rr.items);
  };

  if (docs === null) return <div className="page"><div className="card card-pad"><div className="skel" style={{ height: 300 }} /></div></div>;

  return (
    <div className="page page-full" style={{ gap: 14, padding: '16px 20px', maxHeight: 'calc(100vh - 60px)', flexWrap: 'wrap' }}>
      {/* ===== 左栏：文档与阅读 ===== */}
      <section style={{ flex: '1.2 1 340px', minWidth: 300, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '100%', overflow: 'hidden' }}>
        <div className="card" style={{ padding: 10 }}>
          <div className="row g-1 wrap">
            {docs.map((d) => (
              <button key={d.id} className={`tag ${docId === d.id ? 'tag-green' : 'tag-gray'}`} style={{ cursor: 'pointer', border: 'none' }}
                onClick={() => loadDoc(d.id)} title={d.title}>
                <Icon name="file" size={11} />{d.title.length > 18 ? d.title.slice(0, 18) + '…' : d.title}
              </button>
            ))}
            <button className="tag tag-amber" style={{ cursor: 'pointer', border: 'none' }} onClick={() => setUploadOpen(true)}><Icon name="upload" size={11} />导入文档</button>
          </div>
        </div>
        {/* 阅读区：沉浸式阅读（大纲/自适应/划词批注/检索） + 源文件预览（DocViewer 对接 hexo-document-viewer） */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0, minHeight: 0 }}>
          {!doc ? (
            <div className="skel" style={{ height: '80%', margin: 16 }} />
          ) : (
            <>
              <div className="row g-1 wrap" style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)' }}>
                <button className={`tag ${leftMode === 'read' ? 'tag-green' : 'tag-gray'}`} style={{ cursor: 'pointer', border: 'none' }} onClick={() => setLeftMode('read')}>
                  <Icon name="book" size={11} />沉浸式阅读
                </button>
                <button className={`tag ${leftMode === 'file' ? 'tag-green' : 'tag-gray'}`} style={{ cursor: 'pointer', border: 'none' }} onClick={() => setLeftMode('file')}>
                  <Icon name="doc" size={11} />源文件预览{fileMap[doc.id] ? `（${detectKind(fileMap[doc.id].name).toUpperCase()}）` : ''}
                </button>
                {!fileMap[doc.id] && <span className="text-xs text-muted">示例文献无原始文件，可通过「导入文档」上传以启用在线预览</span>}
              </div>
              {leftMode === 'read' ? (
                <ImmersiveReader doc={doc} activeKey={paraKey} onTranslate={translatePara} />
              ) : fileMap[doc.id] ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 12, minHeight: 0 }}>
                  <DocViewer url={fileMap[doc.id].url} name={fileMap[doc.id].name} onBackToRead={() => setLeftMode('read')} />
                </div>
              ) : (
                <div className="empty"><div className="empty-ic"><Icon name="upload" size={32} /></div>
                  <div className="text-small">该文献暂无可预览的原始文件<br />支持 PDF / Word / Excel / PPT / TXT 导入后在线预览</div>
                  <button className="btn btn-primary btn-sm mt-2" onClick={() => setUploadOpen(true)}>导入文档</button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ===== 中栏：分析 ===== */}
      <section style={{ flex: '1.1 1 320px', minWidth: 300, display: 'flex', flexDirection: 'column', maxHeight: '100%', overflow: 'hidden' }}>
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div className="row g-1 wrap" style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)' }}>
            {([['translate', 'globe', '翻译'], ['mindmap', 'branch', '思维导图'], ['seven', 'doc', '七段总结'], ['graph', 'link', '引用图谱'], ['kb', 'db', '知识库']] as const).map(([k, ic, label]) => (
              <button key={k} className={`tag ${midTab === k ? 'tag-green' : 'tag-gray'}`} style={{ cursor: 'pointer', border: 'none' }}
                onClick={() => setMidTab(k as MidTab)}><Icon name={ic} size={11} />{label}</button>
            ))}
            <button className="btn btn-accent btn-sm" style={{ marginLeft: 'auto' }} onClick={analyze}>
              <Icon name="spark" size={12} />{doc?.mindmap ? '重新分析' : '结构化分析'}
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {midTab === 'translate' && (
              translation ? (
                <div className="anim-in">
                  <div className="text-xs text-muted mb-2">原文（选自论文）</div>
                  <div style={{ fontSize: 13, lineHeight: 1.8, padding: '10px 12px', background: 'var(--bg-deep)', borderRadius: 10, marginBottom: 12 }}>{translation.original}</div>
                  <div className="text-xs text-muted mb-2"><Icon name="globe" size={12} /> 译文（术语库对齐）</div>
                  <div style={{ fontSize: 13.8, lineHeight: 1.9, padding: '12px 14px', background: 'var(--brand-softer)', borderRadius: 10, border: '1px solid var(--brand-soft)' }}>{translation.translated}</div>
                  <div className="row g-1 mt-2 wrap">
                    {translation.glossary.map((g: any) => <span key={g.en} className="tag tag-outline">{g.en} → {g.zh}</span>)}
                  </div>
                </div>
              ) : (
                <div className="empty"><div className="empty-ic"><Icon name="globe" size={32} /></div><div className="text-small">在左侧点击任意英文段落<br />即可获得术语对齐的中文译文</div></div>
              )
            )}
            {midTab === 'mindmap' && (doc?.mindmap ? <div className="anim-in"><Mindmap data={doc.mindmap} /></div> : (
              <div className="empty"><div className="empty-ic"><Icon name="branch" size={32} /></div><div className="text-small mb-2">尚未生成思维导图</div><button className="btn btn-primary btn-sm" onClick={analyze}>开始结构化分析</button></div>
            ))}
            {midTab === 'seven' && (doc?.seven_summary ? (
              <div className="col g-2 stagger">
                {doc.seven_summary.map((s: any, i: number) => (
                  <div key={i} className="card card-pad" style={{ borderLeft: '3px solid var(--brand)' }}>
                    <div className="row g-2 mb-1">
                      <span className="tag tag-green">{s.key}</span>
                    </div>
                    <p className="text-small" style={{ lineHeight: 1.8, color: 'var(--ink-2)' }}>{s.text}</p>
                  </div>
                ))}
              </div>
            ) : <div className="empty"><div className="empty-ic"><Icon name="doc" size={32} /></div><div className="text-small">尚未生成七段式总结</div></div>)}
            {midTab === 'graph' && (doc?.citation_graph ? (
              <div className="anim-in"><CitationGraph nodes={doc.citation_graph.nodes} edges={doc.citation_graph.edges} /></div>
            ) : <div className="empty"><div className="empty-ic"><Icon name="link" size={32} /></div><div className="text-small">该文档无 DOI，引用图谱不可用</div></div>)}
            {midTab === 'kb' && (
              <div className="anim-in">
                <p className="text-small text-muted mb-2">将本文的阅读结果（结构化正文 + 分析摘要）切片入库，供课题组 RAG 问答引用。</p>
                <div className="kv"><span className="kv-k">目标知识库</span><span className="kv-v">MER 课题组文献库（团队共享）</span></div>
                <div className="kv"><span className="kv-k">现有文档</span><span className="kv-v">24 篇 · 1846 个语义块</span></div>
                <button className="btn btn-primary mt-2" onClick={saveToKB}><Icon name="db" size={14} />沉淀到知识库</button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== 右栏：Agent 对话 ===== */}
      <section style={{ flex: '1 1 300px', minWidth: 280, display: 'flex', flexDirection: 'column', maxHeight: '100%', overflow: 'hidden' }}>
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }} className="row g-2">
            <span className="dot dot-green dot-pulse" />
            <span className="fw-bold text-small">论文 Agent</span>
            <span className="text-xs text-muted">多人协同已开启（林曦 · 赵越 在线）</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
            {chatMsgs.length === 0 && (
              <div className="empty">
                <div className="empty-ic"><Icon name="chat" size={30} /></div>
                <div className="text-small">针对本论文提问<br />回答将附引用溯源</div>
                <div className="col g-1 mt-2" style={{ alignItems: 'center' }}>
                  {['AU 分支带来了多少增益？', '本文与 GraphAU 的区别？'].map((q) => (
                    <button key={q} className="tag tag-outline" style={{ cursor: 'pointer' }} onClick={() => { setChatInput(q); }}>{q}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="col g-2">
              {chatMsgs.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {m.role === 'user' ? (
                    <div className="chat-bubble-user" style={{ fontSize: 13, padding: '9px 13px' }}>{m.content}</div>
                  ) : (
                    <div className="chat-bubble-ai" style={{ padding: '10px 13px' }}>
                      {m.content ? <Markdown text={m.content} className={m.streaming ? 'cursor-blink' : ''} /> : (
                        <span className="row"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></span>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatBottom} />
            </div>
            {references.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-muted mb-1"><Icon name="quote" size={11} /> 引用溯源</div>
                {references.map((r: any) => (
                  <div key={r.chunk_id} className="tag tag-green mb-1" style={{ display: 'flex' }}>
                    <Icon name="file" size={11} /> {r.title?.slice(0, 26)} · P{r.page}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ padding: 12, borderTop: '1px solid var(--line)' }}>
            <div className="row g-1">
              <input className="input grow" style={{ fontSize: 13 }} value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChat()} placeholder="针对论文提问…" />
              <button className="btn btn-primary btn-icon" onClick={sendChat} disabled={chatting}>
                {chatting ? <span className="spinner" /> : <Icon name="send" size={15} />}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 上传模态 */}
      {uploadOpen && (
        <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && setUploadOpen(false)}>
          <div className="modal">
            <div className="modal-head"><div className="modal-title">导入文献</div>
              <button className="btn btn-ghost btn-icon modal-x" onClick={() => setUploadOpen(false)}><Icon name="x" size={16} /></button></div>
            <div className="modal-body">
              <label className="field-label">选择本地文件（PDF / Word / Excel / PPT / TXT）</label>
              <input className="input" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md"
                onChange={(e) => { const f = e.target.files?.[0] || null; setUploadFile(f); if (f) setUploadName(f.name); }} />
              {uploadFile && <div className="text-xs text-muted mt-1"><Icon name="file" size={11} /> 已选择：{uploadFile.name}（{(uploadFile.size / 1024).toFixed(0)} KB）</div>}
              <label className="field-label" style={{ marginTop: 12 }}>或输入文件名 / 公网可访问 URL（Office 文档在线预览需公网 URL）</label>
              <input className="input" value={uploadName} onChange={(e) => { setUploadName(e.target.value); setUploadFile(null); }} placeholder="mer-transformer-2026.pdf 或 https://…/paper.pdf" />
              <div className="text-xs text-muted mt-2">PDF 本地文件可直接预览 · 分片上传 · 断点续传 · 扫描件自动 OCR 兜底 · 公式 LaTeX 化</div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setUploadOpen(false)}>取消</button>
              <button className="btn btn-primary" onClick={upload}>提交解析</button>
            </div>
          </div>
        </div>
      )}

      <TaskRunner taskId={task?.id || null} title={task?.title || ''} onClose={() => { setTask(null); if (docId) loadDoc(docId); }} onDone={() => {}} />
    </div>
  );
}
