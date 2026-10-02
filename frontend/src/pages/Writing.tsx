/* 论文写作 —— REQ-WRT-01：左侧阅读器对照 + 翻译/润色/查重/降重 */
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import Icon from '../components/Icon';
import { Modal, Progress, Tag, Tabs, useToast } from '../components/ui';

type Tool = 'translate' | 'polish' | 'plagiarism' | 'paraphrase';

export default function Writing() {
  const toast = useToast();
  const [ms, setMs] = useState<any>(null);
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState(true);
  const [tool, setTool] = useState<Tool>('polish');
  const [input, setInput] = useState('');
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [refDoc, setRefDoc] = useState<any>(null);
  const [refOpen, setRefOpen] = useState(false);
  const [style, setStyle] = useState('academic');

  useEffect(() => {
    (async () => {
      const r = await api<{ items: any[] }>('/manuscripts');
      if (r?.items?.length) { setMs(r.items[0]); setContent(r.items[0].content); }
      const docs = await api<{ items: any[] }>('/documents');
      if (docs?.items?.length) {
        const target = docs.items[1] || docs.items[0];
        try {
          const fullDoc = await api(`/documents/${target.id}`);
          setRefDoc(fullDoc);
        } catch {
          setRefDoc(target);
        }
      }
    })();
  }, []);

  const save = async () => {
    await api(`/manuscripts/${ms.id}`, { method: 'PUT', body: { content } });
    setSaved(true);
    const r = await api(`/manuscripts/${ms.id}`);
    setMs(r);
    toast(`已保存至 v${r.version}`);
  };

  const runTool = async () => {
    if (!input.trim()) return toast('请先在下方粘贴或输入文本', 'info');
    setBusy(true); setResult(null);
    try {
      const path = { translate: '/writing/translate', polish: '/writing/polish', plagiarism: '/writing/plagiarism', paraphrase: '/writing/paraphrase' }[tool];
      const body = { translate: { text: input, direction: 'en2zh' }, polish: { text: input, style, target: 'ACM MM' }, plagiarism: { text: input }, paraphrase: { text: input, ratio: 'medium' } }[tool];
      setResult(await api(path, { method: 'POST', body }));
      toast('处理完成');
    } finally { setBusy(false); }
  };

  const TOOLS: { key: Tool; icon: any; label: string; desc: string }[] = [
    { key: 'translate', icon: 'globe', label: '中英互译', desc: '段落级双向 · 学术术语库对齐' },
    { key: 'polish', icon: 'pen', label: '学术润色', desc: '语法 / 逻辑 / 期刊风格' },
    { key: 'plagiarism', icon: 'search', label: 'AI 查重', desc: '自建库 + 联网比对' },
    { key: 'paraphrase', icon: 'refresh', label: 'AI 降重', desc: '保义改写 · 语义校验' },
  ];

  return (
    <div className="page page-full" style={{ gap: 14, padding: '16px 20px', flexWrap: 'wrap' }}>
      {/* ===== 左：稿件编辑器 ===== */}
      <section style={{ flex: '1.3 1 380px', minWidth: 300, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '100%' }}>
        <div className="card card-pad" style={{ flex: 'none' }}>
          <div className="row-between wrap g-2">
            <div className="grow" style={{ minWidth: 220 }}>
              <div className="fw-bold text-serif" style={{ fontSize: 14.5 }}>{ms?.title || '未命名稿件'}</div>
              <div className="row g-1 mt-1 wrap">
                <Tag color="amber">{ms?.status === 'polishing' ? '润色中' : ms?.status}</Tag>
                <Tag color="gray">v{ms?.version ?? '—'}</Tag>
                <Tag color="gray">{ms?.words ?? '—'} 词</Tag>
                {saved ? <Tag color="green">已保存</Tag> : <Tag color="red">未保存</Tag>}
              </div>
            </div>
            <div className="row g-1">
              <button className="btn btn-ghost btn-sm" onClick={() => setRefOpen(true)}><Icon name="book" size={13} />对照阅读</button>
              <button className="btn btn-primary btn-sm" onClick={save} disabled={saved}><Icon name="download" size={13} />{saved ? '已保存' : '保存'}</button>
            </div>
          </div>
        </div>
        <div className="card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <textarea
            value={content}
            onChange={(e) => { setContent(e.target.value); setSaved(false); }}
            spellCheck={false}
            style={{
              flex: 1, width: '100%', border: 'none', outline: 'none', resize: 'none', padding: '22px 26px',
              fontFamily: 'var(--font-serif)', fontSize: 14.5, lineHeight: 2, color: 'var(--ink)', background: 'transparent',
            }}
          />
          <div className="row-between text-xs text-muted" style={{ padding: '8px 16px', borderTop: '1px solid var(--line)' }}>
            <span>Markdown 模式 · 版本自动管理</span>
            <span>{content.length} 字符</span>
          </div>
        </div>
      </section>

      {/* ===== 右：写作工具 ===== */}
      <section style={{ flex: '1 1 330px', minWidth: 300, display: 'flex', flexDirection: 'column', maxHeight: '100%', overflow: 'hidden' }}>
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TOOLS.map((t) => (
              <button key={t.key} className={`tag ${tool === t.key ? 'tag-green' : 'tag-gray'}`} style={{ cursor: 'pointer', border: 'none' }}
                onClick={() => { setTool(t.key); setResult(null); }}>
                <Icon name={t.icon} size={11} />{t.label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            <div className="text-xs text-muted mb-2">{TOOLS.find((t) => t.key === tool)!.desc}</div>

            {tool === 'polish' && (
              <div className="row g-1 mb-2">
                {['academic', 'confident', 'concise'].map((s) => (
                  <button key={s} className={`tag ${style === s ? 'tag-green' : 'tag-outline'}`} style={{ cursor: 'pointer', border: 'none' }}
                    onClick={() => setStyle(s)}>{s === 'academic' ? '学术严谨' : s === 'confident' ? '自信表述' : '简洁'}</button>
                ))}
                <span className="tag tag-amber">目标：ACM MM</span>
              </div>
            )}

            <textarea className="textarea" rows={5} value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={tool === 'translate' ? '粘贴英文段落，输出术语对齐的中文…'
                : tool === 'plagiarism' ? '粘贴待查重的全文片段…'
                  : '粘贴需要润色 / 降重的段落…（也可从左侧稿件复制）'} />
            <button className="btn btn-primary btn-block mt-2" onClick={runTool} disabled={busy}>
              {busy ? <span className="spinner" /> : <Icon name="zap" size={14} />}
              {TOOLS.find((t) => t.key === tool)!.label}
            </button>

            {result && (
              <div className="mt-3 anim-pop">
                {/* 翻译 */}
                {tool === 'translate' && (
                  <div className="card card-pad" style={{ background: 'var(--brand-softer)' }}>
                    <div className="text-xs text-muted mb-1">译文</div>
                    <p className="text-small" style={{ lineHeight: 1.9 }}>{result.translated}</p>
                    <div className="row g-1 mt-2 wrap">{result.glossary.map((g: any) => <Tag key={g.en} color="gray">{g.en} → {g.zh}</Tag>)}</div>
                  </div>
                )}
                {/* 润色 */}
                {tool === 'polish' && (
                  <>
                    <div className="card card-pad" style={{ background: 'var(--brand-softer)' }}>
                      <div className="text-xs text-muted mb-1">润色后</div>
                      <p className="text-small" style={{ lineHeight: 1.9 }}>{result.polished}</p>
                    </div>
                    <div className="card card-pad mt-2">
                      <div className="text-xs text-muted mb-1">修改说明（{result.changes.length} 处）</div>
                      {result.changes.map((c: any, i: number) => (
                        <div key={i} className="kv">
                          <span className="kv-k">{c.type}</span>
                          <span className="kv-v text-small">
                            <code>{c.from}</code> → <code>{c.to}</code>
                            <div className="text-xs text-muted">{c.reason}</div>
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {/* 查重 */}
                {tool === 'plagiarism' && (
                  <>
                    <div className="card card-pad">
                      <div className="row g-3 mb-2">
                        <div className="grow">
                          <div className="row-between text-small mb-1"><span className="fw-bold">总体相似度</span><span className="mono fw-bold" style={{ fontSize: 20, color: result.overall_similarity < 30 ? 'var(--brand)' : 'var(--red)' }}>{result.overall_similarity}%</span></div>
                          <Progress value={result.overall_similarity} amber={result.overall_similarity >= 30} />
                          <div className="text-xs text-muted mt-1">{result.verdict}</div>
                        </div>
                      </div>
                    </div>
                    <div className="card card-pad mt-2">
                      <div className="text-xs text-muted mb-1">重复片段定位（{result.channels.join(' + ')}）</div>
                      {result.fragments.map((f: any, i: number) => (
                        <div key={i} className="kv">
                          <span className="kv-v text-small">
                            <div className="clamp2" style={{ fontFamily: 'var(--font-serif)' }}>“{f.text}”</div>
                            <div className="row g-1 mt-1 wrap">
                              <Tag color={f.similarity > 60 ? 'red' : 'amber'}>相似 {f.similarity}%</Tag>
                              <span className="text-xs text-muted">来源：{f.source}</span>
                            </div>
                            <div className="text-xs text-muted mt-1">建议：{f.suggestion}</div>
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {/* 降重 */}
                {tool === 'paraphrase' && (
                  <>
                    <div className="card card-pad" style={{ background: 'var(--brand-softer)' }}>
                      <div className="text-xs text-muted mb-1">降重后</div>
                      <p className="text-small" style={{ lineHeight: 1.9, fontFamily: 'var(--font-serif)' }}>{result.paraphrased}</p>
                      <div className="row g-1 mt-2 wrap">
                        <Tag color="red">相似度 {result.before_similarity}% → </Tag>
                        <Tag color="green">{result.after_similarity}%</Tag>
                        <Tag color="blue">语义一致性 {result.semantic_check.score}</Tag>
                      </div>
                    </div>
                    <div className="card card-pad mt-2">
                      <div className="text-xs text-muted mb-1">前后对比</div>
                      {result.diff.map((d: any, i: number) => (
                        <div key={i} className="text-small" style={{
                          padding: '4px 10px', borderRadius: 6, margin: '3px 0', fontFamily: 'var(--font-serif)',
                          background: d.type === 'del' ? 'var(--red-soft)' : '#e3f1ea',
                          color: d.type === 'del' ? 'var(--red)' : 'var(--brand-strong)',
                          textDecoration: d.type === 'del' ? 'line-through' : 'none',
                        }}>{d.text}</div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 对照阅读模态 */}
      <Modal open={refOpen} onClose={() => setRefOpen(false)} title={<><Icon name="book" size={15} /> 对照阅读 · {refDoc?.title}</>} width="lg">
        {refDoc && (
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {(refDoc?.structured?.sections || []).length > 0 ? (
              refDoc.structured.sections.map((s: any) => (
                <div key={s.id} style={{ marginBottom: 14 }}>
                  <div className="fw-bold text-small" style={{ color: 'var(--brand-strong)' }}>{s.title}</div>
                  {(s.paragraphs || []).map((p: string, i: number) => (
                    <p key={i} className="text-small" style={{ lineHeight: 1.85, color: 'var(--ink-2)', textAlign: 'justify' }}>{p}</p>
                  ))}
                </div>
              ))
            ) : (
              <p className="text-small text-muted" style={{ padding: 16 }}>{refDoc.abstract || '暂无结构化正文内容'}</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
