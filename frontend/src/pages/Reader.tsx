/* 文献阅读：三栏式阅读器 —— REQ-READ-01~04：阅读 / 分析（翻译·导图·七段·图谱） / Agent 对话 */
import { useEffect, useRef, useState } from 'react';
import { api, docChatStream } from '../api/client';
import Icon from '../components/Icon';
import Markdown from '../components/Markdown';
import { CitationGraph, Mindmap } from '../components/viz';
import { useToast } from '../components/ui';
import { TaskRunner } from '../components/TaskRunner';

type MidTab = 'translate' | 'mindmap' | 'seven' | 'graph' | 'kb';

export default function Reader() {
  const toast = useToast();
  const [docs, setDocs] = useState<any[] | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const [doc, setDoc] = useState<any>(null);
  const [midTab, setMidTab] = useState<MidTab>('mindmap');
  const [task, setTask] = useState<{ id: string; title: string } | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadName, setUploadName] = useState('');

  /* 翻译 */
  const [paraIdx, setParaIdx] = useState<number | null>(null);
  const [translation, setTranslation] = useState<any>(null);

  /* Agent 对话 */
  const [chatMsgs, setChatMsgs] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatting, setChatting] = useState(false);
  const [references, setReferences] = useState<any[]>([]);
  const chatBottom = useRef<HTMLDivElement>(null);

  useEffect(() => { (async () => { const r = await api<{ items: any[] }>('/documents'); setDocs(r.items); if (r.items.length) loadDoc(r.items[0].id); })(); }, []);
  useEffect(() => { chatBottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMsgs]);

  const loadDoc = async (id: string) => {
    setDocId(id); setDoc(null); setChatMsgs([]); setReferences([]); setTranslation(null); setParaIdx(null);
    const d = await api(`/documents/${id}`);
    setDoc(d);
    setMidTab(d.mindmap ? 'mindmap' : 'translate');
  };

  const analyze = async () => {
    const r = await api<{ task_id: string }>(`/documents/${docId}/analyze`, { method: 'POST', body: { mode: 'all' } });
    setTask({ id: r.task_id, title: '结构化分析（思维导图 + 七段式）' });
  };

  const translatePara = async (text: string, i: number) => {
    setParaIdx(i);
    const r = await api(`/documents/${docId}/translate`, { method: 'POST', body: { text, direction: 'en2zh' } });
    setTranslation(r);
    setMidTab('translate');
  };

  const saveToKB = async () => {
    const r = await api(`/knowledge-bases/kb1/ingest`, { method: 'POST' });
    setTask({ id: r.task_id, title: '沉淀到 RAG 知识库（MER 课题组文献库）' });
  };

  const sendChat = async () => {
    const q = chatInput.trim();
    if (!q || chatting) return;
    setChatInput(''); setChatting(true);
    const aiMsg = { role: 'assistant', content: '', streaming: true };
    setChatMsgs((m) => [...m, { role: 'user', content: q }, aiMsg]);
    await docChatStream(docId!, [{ role: 'user', content: q }], {
      onDelta: (t) => setChatMsgs((m) => m.map((x, i) => (i === m.length - 1 ? { ...x, content: x.content + t } : x))),
      onReference: (r) => setReferences((x) => [...x.filter((i: any) => i.chunk_id !== r.chunk_id), r]),
      onDone: () => { setChatMsgs((m) => m.map((x, i) => (i === m.length - 1 ? { ...x, streaming: false } : x))); setChatting(false); },
      onError: () => { setChatting(false); toast('对话失败，请重试', 'err'); },
    });
  };

  const upload = async () => {
    if (!uploadName.trim()) return toast('请输入文件名或 URL', 'info');
    const r = await api<{ doc_id: string; task_id: string }>('/documents/upload', { method: 'POST', body: { file_name: uploadName.endsWith('.pdf') ? uploadName : `${uploadName}.pdf`, project_id: 'p1' } });
    setUploadOpen(false); setUploadName('');
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
        <div className="card" style={{ flex: 1, overflowY: 'auto', padding: '22px 26px' }}>
          {!doc ? (
            <div className="skel" style={{ height: '80%' }} />
          ) : (
            <article className="anim-in">
              <header style={{ borderBottom: '2px solid var(--brand)', paddingBottom: 12, marginBottom: 16 }}>
                <h1 className="text-serif" style={{ fontSize: 19, lineHeight: 1.5 }}>{doc.title}</h1>
                <div className="text-small text-muted mt-1">{doc.authors} · {doc.venue} · {doc.pages} 页 {doc.has_code && <a href={doc.code_url} target="_blank" rel="noreferrer" style={{ marginLeft: 8 }}><Icon name="branch" size={12} /> 开源代码</a>}</div>
              </header>
              <div className="text-xs text-muted" style={{ marginBottom: 14, padding: '8px 12px', background: 'var(--brand-softer)', borderRadius: 8 }}>
                <Icon name="quote" size={12} /> {doc.abstract}
              </div>
              {(doc?.structured?.sections || []).map((s: any) => (
                <section key={s.id} style={{ marginBottom: 18 }}>
                  <h2 className="text-serif" style={{ fontSize: 15, color: 'var(--brand-strong)', marginBottom: 8 }}>{s.title}<span className="text-xs text-muted" style={{ fontWeight: 400, marginLeft: 8 }}>P{Number(String(s.page))}</span></h2>
                  {(s.paragraphs || []).map((p: string, i: number) => (
                    <p key={i}
                      onClick={() => translatePara(p, i)}
                      style={{
                        fontSize: 13.8, lineHeight: 1.9, textAlign: 'justify', marginBottom: 10, cursor: 'pointer',
                        padding: '6px 10px', marginLeft: -10, borderRadius: 8, transition: 'background .2s',
                        background: paraIdx === i && s.id === doc?.structured?.sections?.[0]?.id ? 'var(--accent-soft)' : 'transparent',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--brand-softer)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = paraIdx === i && s.id === doc?.structured?.sections?.[0]?.id ? 'var(--accent-soft)' : 'transparent')}>
                      {p}
                    </p>
                  ))}
                </section>
              ))}
              <div className="text-xs text-muted text-center" style={{ padding: '10px 0' }}>— 点击段落可翻译（术语库对齐） —</div>
            </article>
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
              <label className="field-label">文件名（PDF / Word / LaTeX / Markdown）或粘贴 URL</label>
              <input className="input" value={uploadName} onChange={(e) => setUploadName(e.target.value)} placeholder="mer-transformer-2026.pdf" />
              <div className="text-xs text-muted mt-2">支持分片上传 · 断点续传 · 扫描件自动 OCR 兜底 · 公式 LaTeX 化</div>
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
