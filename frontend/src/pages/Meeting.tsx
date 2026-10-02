/* 组会汇报 —— REQ-SPC-01：PPT 一键生成 · 导师建议结构化记录 */
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import Icon from '../components/Icon';
import { Empty, Skeleton, Tag, useToast } from '../components/ui';
import { TaskRunner } from '../components/TaskRunner';

const STATUS_META: Record<string, { label: string; color: string; icon: string }> = {
  todo: { label: '待办', color: 'red', icon: 'clock' },
  doing: { label: '进行中', color: 'amber', icon: 'zap' },
  done: { label: '已完成', color: 'green', icon: 'check' },
};
const NEXT: Record<string, string> = { todo: 'doing', doing: 'done', done: 'todo' };

export default function Meeting() {
  const toast = useToast();
  /* PPT 生成 */
  const [source, setSource] = useState('up9 baseline 多数据集验证进展');
  const [template, setTemplate] = useState('academic');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [deckResult, setDeckResult] = useState<any>(null);
  /* 导师建议 */
  const [advice, setAdvice] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [meetingText, setMeetingText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<any>(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    (async () => {
      const r = await api<{ items: any[] }>('/advice');
      setAdvice(r.items);
      setLoading(false);
    })();
  }, []);

  const generateDeck = async () => {
    const r = await api<{ task_id: string }>('/deck/generate', { method: 'POST', body: { source, template } });
    setTaskId(r.task_id);
    setDeckResult(null);
  };

  const extract = async () => {
    if (meetingText.trim().length < 10) return toast('请粘贴至少 10 字的会议记录', 'info');
    setExtracting(true); setExtracted(null);
    try {
      const r = await api('/advice/extract', { method: 'POST', body: { text: meetingText, audio: false } });
      setExtracted(r);
      toast(`已抽取 ${r.items.length} 条建议`);
    } finally { setExtracting(false); }
  };

  const cycleStatus = async (a: any) => {
    const next = NEXT[a.status] || 'doing';
    await api(`/advice/${a.id}`, { method: 'PATCH', body: { status: next } });
    setAdvice((xs) => xs.map((x) => (x.id === a.id ? { ...x, status: next } : x)));
  };

  const saveExtracted = async () => {
    /* 演示环境：本地合并展示（后端 PATCH /advice/:id 支持持久化状态） */
    setAdvice((xs) => [
      ...extracted.items.map((it: any, i: number) => ({
        id: `new_${Date.now()}_${i}`, meeting: extracted.meeting, from: extracted.from,
        date: new Date().toISOString(), category: it.category, content: it.content, status: 'todo', todo: it.todo,
      })),
      ...xs,
    ]);
    setExtracted(null); setMeetingText('');
    toast('建议已存入记录');
  };

  const shown = filter === 'all' ? advice : advice.filter((a) => a.status === filter);

  return (
    <div className="page" style={{ gap: 14 }}>
      {/* ===== 上：PPT 生成 ===== */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', flex: 'none' }}>
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="fw-bold" style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="play" size={15} /> 组会 PPT 一键生成
          </div>
          <div>
            <div className="field-label">汇报主题 / 研究内容</div>
            <textarea className="textarea" rows={3} value={source} onChange={(e) => setSource(e.target.value)}
              placeholder="例：up9 baseline 多数据集验证进展" />
          </div>
          <div>
            <div className="field-label">模板风格</div>
            <div className="row g-1 wrap">
              {[['academic', '学术严谨'], ['minimal', '极简风'], ['visual', '图表驱动']].map(([k, label]) => (
                <button key={k} className={`tag ${template === k ? 'tag-green' : 'tag-outline'}`} style={{ cursor: 'pointer', border: 'none' }}
                  onClick={() => setTemplate(k)}>{label}</button>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" onClick={generateDeck}>
            <Icon name="zap" size={14} /> 生成汇报 PPT
          </button>
        </div>

        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="fw-bold mb-2" style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="doc" size={15} /> 生成结果
          </div>
          {!deckResult ? (
            <Empty icon="doc" text="尚未生成，点击左侧按钮开始" />
          ) : (
            <div className="anim-pop" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="row g-2 wrap">
                <Tag color="green"><Icon name="check" size={11} />{deckResult.file_name}</Tag>
                <Tag color="gray">{deckResult.pages} 页</Tag>
              </div>
              <div className="card card-pad" style={{ background: 'var(--brand-softer)', borderColor: 'var(--brand-soft)' }}>
                <div className="text-xs text-muted mb-1">PPT 大纲</div>
                {deckResult.outline.map((o: any, i: number) => (
                  <div key={i} className="row g-2 text-small" style={{ padding: '3px 0' }}>
                    <span className="mono text-muted" style={{ flex: 'none' }}>P{o.page}</span>
                    <span className="fw-bold" style={{ flex: 'none' }}>{o.title}</span>
                    <span className="text-xs text-muted">{o.note}</span>
                  </div>
                ))}
              </div>
              <button className="btn btn-soft btn-sm" style={{ alignSelf: 'flex-start' }}>
                <Icon name="download" size={12} /> 下载 .pptx
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ===== 下：导师建议记录 ===== */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 300 }}>
        <div className="row-between wrap g-2" style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
          <div className="fw-bold" style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="quote" size={15} /> 导师建议记录
          </div>
          <div className="row g-1">
            {['all', 'todo', 'doing', 'done'].map((k) => (
              <button key={k} className={`tag ${filter === k ? 'tag-green' : 'tag-outline'}`} style={{ cursor: 'pointer', border: 'none' }}
                onClick={() => setFilter(k)}>{k === 'all' ? '全部' : STATUS_META[k].label}</button>
            ))}
          </div>
        </div>

        <div className="page-scroll" style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* 抽取输入区 */}
          <div className="card card-pad" style={{ borderColor: 'var(--brand-soft)', background: 'var(--surface)' }}>
            <div className="row-between mb-1">
              <span className="text-xs text-muted">粘贴组会记录 / 导师语音转写文本，AI 自动抽取待办建议</span>
              {extracted && <Tag color="green">待保存 {extracted.items.length} 条</Tag>}
            </div>
            {!extracted ? (
              <>
                <textarea className="textarea" rows={2} value={meetingText} onChange={(e) => setMeetingText(e.target.value)}
                  placeholder="例：韩老师：对比实验要控制变量，backbone 规模差异要说明；补三个种子的实验…" />
                <button className="btn btn-soft btn-sm mt-2" onClick={extract} disabled={extracting}>
                  {extracting ? <span className="spinner" /> : <Icon name="spark" size={12} />} 智能抽取建议
                </button>
              </>
            ) : (
              <div className="anim-pop" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="text-xs text-muted">来源：{extracted.meeting} · {extracted.from} · {extracted.source}</div>
                {extracted.items.map((it: any, i: number) => (
                  <div key={i} className="row g-2 text-small" style={{ alignItems: 'flex-start' }}>
                    <Tag color="gray" style={{ flex: 'none' }}>{it.category}</Tag>
                    <span style={{ flex: 1, lineHeight: 1.7 }}>{it.content}</span>
                  </div>
                ))}
                <div className="row g-1 mt-1">
                  <button className="btn btn-primary btn-sm" onClick={saveExtracted}><Icon name="check" size={12} />保存到记录</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setExtracted(null)}>放弃</button>
                </div>
              </div>
            )}
          </div>

          {/* 记录列表 */}
          {loading ? (
            <Skeleton lines={4} h={44} />
          ) : shown.length === 0 ? (
            <Empty icon="quote" text="暂无建议记录" />
          ) : (
            shown.map((a, i) => {
              const meta = STATUS_META[a.status] || STATUS_META.todo;
              return (
                <div key={a.id} className="card card-pad anim-in" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', animationDelay: `${i * 40}ms` }}>
                  <button className="btn btn-icon btn-sm" style={{ flex: 'none', marginTop: 2, color: `var(--${a.status === 'done' ? 'brand' : a.status === 'doing' ? 'amber' : 'muted'})` }}
                    onClick={() => cycleStatus(a)} title="点击切换状态">
                    <Icon name={meta.icon as any} size={15} />
                  </button>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="row g-2 wrap mb-1">
                      <Tag color="gray">{a.category}</Tag>
                      <span className="text-xs text-muted">{a.meeting} · {a.from} · {String(a.date).slice(0, 10)}</span>
                    </div>
                    <p className="text-small" style={{ lineHeight: 1.75, textDecoration: a.status === 'done' ? 'line-through' : 'none', opacity: a.status === 'done' ? 0.6 : 1 }}>
                      {a.content}
                    </p>
                    {a.todo && a.status !== 'done' && (
                      <div className="text-xs mt-1" style={{ color: 'var(--brand-strong)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Icon name="target" size={12} /> 待办：{a.todo}
                      </div>
                    )}
                  </div>
                  <Tag color={meta.color as any} style={{ flex: 'none' }}>{meta.label}</Tag>
                </div>
              );
            })
          )}
        </div>
      </div>

      <TaskRunner taskId={taskId} title="组会 PPT 生成" onClose={() => setTaskId(null)} onDone={(r) => setDeckResult(r)} />
    </div>
  );
}
