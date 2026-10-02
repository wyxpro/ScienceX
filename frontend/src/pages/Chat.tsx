/* AI 对话工作台 —— REQ-CHAT-01~04：流式对话 / 多模型 / 历史会话 / Skills / 顶部看板 */
import { useEffect, useRef, useState } from 'react';
import { api, chatStream } from '../api/client';
import Icon from '../components/Icon';
import Markdown from '../components/Markdown';
import { Dropdown, DropdownItem, Empty, Progress, Skeleton, useToast } from '../components/ui';
import { useAuth } from '../stores/auth';

interface Message { id: string; role: 'user' | 'assistant'; content: string; model?: string; tokens?: number; streaming?: boolean }
interface Conversation { id: string; title: string; updated_at: string; message_count: number }

const SUGGESTIONS = [
  ['bulb', '帮我分析微表情识别领域 2026 年值得做的选题方向'],
  ['book', '为「AU 先验 + Transformer」这个主题生成一份文献综述大纲'],
  ['flask', '我的 up9 模型要做消融实验，帮我设计实验方案'],
  ['pen', '把这段论文摘要润色成更地道的学术英语'],
];

export default function Chat() {
  const { user } = useAuth();
  const toast = useToast();
  const [convs, setConvs] = useState<Conversation[] | null>(null);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [models, setModels] = useState<any>({ builtin: [], custom: [] });
  const [model, setModel] = useState('GPT-4o');
  const [dashboard, setDashboard] = useState<any>(null);
  const [skills, setSkills] = useState<any[]>([]);
  const [showDash, setShowDash] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [recording, setRecording] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const [c, m, d, s] = await Promise.all([
        api<any>('/conversations'),
        api('/models'), api('/dashboard/summary'), api<any>('/skills'),
      ]);
      setConvs(c?.items || (Array.isArray(c) ? c : []));
      setModels(m || { builtin: [], custom: [] });
      setDashboard(d);
      setSkills(Array.isArray(s) ? s : (s?.items || []));
    })();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openConv = async (id: string) => {
    setActiveConv(id);
    const { items } = await api<{ items: Message[] }>(`/conversations/${id}/messages`);
    setMessages(items.map((m: any) => ({ ...m })));
  };

  const newConv = async () => {
    const c = await api<Conversation>('/conversations', { method: 'POST', body: { title: '新的对话' } });
    setConvs((x) => [c, ...(x || [])]);
    setActiveConv(c.id); setMessages([]);
  };

  const removeConv = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await api(`/conversations/${id}`, { method: 'DELETE' });
    setConvs((x) => x!.filter((c) => c.id !== id));
    if (activeConv === id) { setActiveConv(null); setMessages([]); }
    toast('会话已删除');
  };

  const renameConv = async (id: string) => {
    const title = prompt('重命名会话', convs?.find((c) => c.id === id)?.title || '');
    if (title) {
      await api(`/conversations/${id}`, { method: 'PATCH', body: { title } });
      setConvs((x) => x!.map((c) => (c.id === id ? { ...c, title } : c)));
    }
  };

  const enhancePrompt = async () => {
    if (!input.trim()) return toast('请先输入提示词', 'info');
    const { enhanced } = await api<{ enhanced: string }>('/prompt/enhance', { method: 'POST', body: { prompt: input } });
    setInput(enhanced);
    toast('提示词已增强（角色 + 结构 + 背景）');
  };

  const voiceInput = () => {
    if (recording) {
      setRecording(false);
      setInput((v) => (v ? v + ' ' : '') + '（语音转写）帮我分析当前实验的下一步计划');
      toast('语音已转写为文字');
      return;
    }
    setRecording(true);
    toast('正在聆听…再次点击结束（演示模拟 Web Speech API）', 'info');
  };

  const send = async (text?: string, skillId?: string) => {
    const content = (text ?? input).trim();
    if (!content || streaming) return;
    setInput('');
    setStreaming(true);
    const userMsg: Message = { id: `u${Date.now()}`, role: 'user', content };
    const aiMsg: Message = { id: `a${Date.now()}`, role: 'assistant', content: '', model, streaming: true };
    setMessages((m) => [...m, userMsg, aiMsg]);

    let convId = activeConv;
    if (!convId) {
      const c = await api<Conversation>('/conversations', { method: 'POST', body: { title: content.slice(0, 18) } });
      convId = c.id; setActiveConv(c.id);
      setConvs((x) => [c, ...(x || [])]);
    }

    await chatStream(
      { messages: [...messages.filter((m) => !m.streaming), { role: 'user', content }].map((m) => ({ role: m.role, content: m.content })), model, conversation_id: convId, skills: skillId ? [skillId] : [] },
      {
        onDelta: (t) => setMessages((m) => m.map((x) => (x.id === aiMsg.id ? { ...x, content: x.content + t } : x))),
        onTool: (d) => toast(`技能「${d.name}」已调用`, 'info'),
        onDone: () => {
          setMessages((m) => m.map((x) => (x.id === aiMsg.id ? { ...x, streaming: false } : x)));
          setStreaming(false);
          api('/conversations').then((r: any) => setConvs(r?.items || (Array.isArray(r) ? r : [])));
        },
        onError: (msg) => { toast(msg, 'err'); setStreaming(false); setMessages((m) => m.filter((x) => x.id !== aiMsg.id)); },
      },
    );
  };

  const invokeSkill = async (skill: any) => {
    send(`请使用「${skill.name}」技能：${skill.desc}`, skill.id);
  };

  const filteredConvs = convs?.filter((c) => c.title.includes(keyword)) || [];
  const progressEntries = dashboard?.project?.progress ? Object.entries(dashboard.project.progress) as [string, number][] : [];
  const stageNames: Record<string, string> = { topic: '选题', literature: '文献', experiment: '实验', analysis: '分析', writing: '写作', submission: '投稿' };

  return (
    <div className="page" style={{ maxWidth: 1500 }}>
      {/* ===== 顶部三卡片（REQ-CHAT-04） ===== */}
      {showDash && dashboard && (
        <div className="grid grid-3 stagger" style={{ marginBottom: 18 }}>
          <div className="card card-pad card-hover">
            <div className="card-title"><Icon name="gauge" size={15} /> 项目进度看板</div>
            <div className="text-small text-muted mt-1">{dashboard.project.name}</div>
            <div className="mt-2">
              {progressEntries.slice(0, 4).map(([k, v]) => (
                <div key={k} style={{ marginBottom: 7 }}>
                  <div className="row-between text-xs" style={{ marginBottom: 3 }}>
                    <span>{stageNames[k]}</span><span className="mono">{v}%</span>
                  </div>
                  <Progress value={v} amber={v < 50 && v > 0} />
                </div>
              ))}
            </div>
          </div>
          <div className="card card-pad card-hover">
            <div className="card-title"><Icon name="clock" size={15} /> 最近产出</div>
            <div className="mt-2 col g-1">
              {dashboard.recent_outputs.slice(0, 4).map((o: any) => (
                <div key={o.id} className="row g-2 text-small" style={{ padding: '5px 8px', borderRadius: 8, cursor: 'pointer', transition: 'background .15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--brand-softer)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <Icon name={o.type === 'chart' ? 'chart' : o.type === 'deck' ? 'layers' : o.type === 'report' ? 'award' : 'doc'} size={14} />
                  <span className="ellipsis grow">{o.title}</span>
                  <span className="text-xs text-muted">{o.meta}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card card-pad card-hover">
            <div className="card-title"><Icon name="mail" size={15} /> 今日文献速递</div>
            <div className="mt-2 col g-2">
              {(dashboard.papers_daily?.items || []).map((p: any) => (
                <div key={p.id} style={{ padding: '7px 9px', borderRadius: 8, background: 'var(--brand-softer)' }}>
                  <div className="text-small fw-bold clamp2">{p.title}</div>
                  <div className="text-xs text-muted mt-1">{p.venue} · {p.reason} · 热度 {'★'.repeat(p.hot)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="row-between mb-2">
        <div className="text-small text-muted">今日已用 {dashboard?.today_usage?.tokens?.toLocaleString?.() ?? '—'} tokens · {dashboard?.today_usage?.calls ?? '—'} 次调用</div>
        <button className="btn btn-ghost btn-sm" onClick={() => setShowDash((s) => !s)}>
          <Icon name="chevronDown" size={13} />{showDash ? '收起看板' : '展开看板'}
        </button>
      </div>

      {/* ===== 主体：会话列表 + 对话区 ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(210px, 240px) 1fr', gap: 18 }}>
        {/* 会话列表 */}
        <div className="card" style={{ padding: 12, height: 'fit-content', maxHeight: 'calc(100vh - 320px)', display: 'flex', flexDirection: 'column' }}>
          <button className="btn btn-primary btn-block btn-sm" onClick={newConv}><Icon name="plus" size={14} />新对话</button>
          <div style={{ position: 'relative', margin: '10px 0' }}>
            <span style={{ position: 'absolute', left: 10, top: 8, color: 'var(--muted)' }}><Icon name="search" size={14} /></span>
            <input className="input" style={{ paddingLeft: 32, fontSize: 12.5 }} placeholder="搜索会话" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {convs === null ? <div style={{ padding: 8 }}><Skeleton lines={4} /></div> : filteredConvs.length === 0 ? (
              <div className="text-small text-muted text-center" style={{ padding: 18 }}>暂无会话</div>
            ) : filteredConvs.map((c) => (
              <div key={c.id}
                onClick={() => openConv(c.id)}
                style={{
                  padding: '9px 10px', borderRadius: 9, cursor: 'pointer', marginBottom: 3, transition: 'all .15s',
                  background: activeConv === c.id ? 'var(--brand-soft)' : 'transparent',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = activeConv === c.id ? 'var(--brand-soft)' : 'var(--bg-deep)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = activeConv === c.id ? 'var(--brand-soft)' : 'transparent')}>
                <div className="row g-2">
                  <Icon name="chat" size={13} style={{ color: 'var(--muted)', flex: 'none', marginTop: 2 }} />
                  <div className="grow ellipsis text-small fw-bold">{c.title}</div>
                  <span className="row" style={{ gap: 2 }}>
                    <button className="btn btn-ghost btn-icon" style={{ padding: 3 }} onClick={(e) => { e.stopPropagation(); renameConv(c.id); }}><Icon name="edit" size={12} /></button>
                    <button className="btn btn-ghost btn-icon" style={{ padding: 3, color: 'var(--red)' }} onClick={(e) => removeConv(c.id, e)}><Icon name="trash" size={12} /></button>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 对话区 */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 520, height: 'calc(100vh - 300px)' }}>
          {/* 工具条 */}
          <div className="row-between" style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
            <div className="row g-2 wrap">
              <Dropdown trigger={<button className="btn btn-ghost btn-sm"><Icon name="cpu" size={14} />{model}<Icon name="chevronDown" size={13} /></button>}>
                {models.builtin?.map((m: any) => (
                  <DropdownItem key={m.id} icon="cpu" onClick={() => setModel(m.name)}>{m.name} · {m.tag}</DropdownItem>
                ))}
                {models.custom?.map((m: any) => (
                  <DropdownItem key={m.id} icon="key" onClick={() => setModel(m.name)}>{m.name}（自定义）</DropdownItem>
                ))}
              </Dropdown>
              <Dropdown trigger={<button className="btn btn-ghost btn-sm"><Icon name="zap" size={14} />技能</button>}>
                {(skills || []).map((s) => (
                  <DropdownItem key={s.id} icon="spark" onClick={() => invokeSkill(s)}>{s.name} · {s.uses} 次使用</DropdownItem>
                ))}
              </Dropdown>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={enhancePrompt} title="优化我的输入提示词"><Icon name="spark" size={14} />提示词增强</button>
          </div>

          {/* 消息流 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
            {messages.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div className="sb-logo-mark" style={{ width: 52, height: 52, marginBottom: 14 }}><Icon name="flask" size={26} /></div>
                <div className="text-serif" style={{ fontSize: 19, fontWeight: 700 }}>下午好，{user?.name}</div>
                <div className="text-small text-muted mt-1" style={{ marginBottom: 20 }}>今天想让 AI 助理团帮你做什么？</div>
                <div className="grid grid-2 stagger" style={{ width: 'min(560px, 100%)' }}>
                  {SUGGESTIONS.map(([ic, text]) => (
                    <button key={text} className="card card-pad card-hover" style={{ textAlign: 'left', cursor: 'pointer' }}
                      onClick={() => send(text)}>
                      <div className="row g-2" style={{ color: 'var(--brand-strong)' }}><Icon name={ic as any} size={16} /><span className="fw-bold text-small">快捷指令</span></div>
                      <div className="text-small text-muted mt-1 clamp2">{text}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="col g-3">
                {messages.map((m) => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    {m.role === 'user' ? (
                      <div className="chat-bubble-user">{m.content}</div>
                    ) : (
                      <div className="chat-bubble-ai">
                        {m.content ? <Markdown text={m.content} className={m.streaming ? 'cursor-blink' : ''} /> : (
                          <span style={{ display: 'inline-flex', gap: 2, padding: '6px 2px' }}>
                            <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                          </span>
                        )}
                        {!m.streaming && m.model && (
                          <div className="text-xs text-muted mt-2" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Icon name="cpu" size={11} />{m.model}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* 输入区 */}
          <div style={{ padding: '12px 16px 16px', borderTop: '1px solid var(--line)' }}>
            <div className="chat-input-shell" style={{ padding: '10px 12px 8px' }}>
              <textarea
                className="textarea" style={{ border: 'none', padding: 0, background: 'transparent', minHeight: 44, maxHeight: 140, resize: 'none' }}
                placeholder="输入你的科研问题…（Enter 发送 / Shift+Enter 换行）"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              />
              <div className="row-between" style={{ marginTop: 4 }}>
                <div className="row g-1">
                  <button className={`btn btn-ghost btn-icon ${recording ? 'dot-pulse' : ''}`} style={recording ? { color: 'var(--red)', borderColor: 'var(--red)' } : {}}
                    onClick={voiceInput} title="语音输入"><Icon name="mic" size={16} /></button>
                  <button className="btn btn-ghost btn-icon" title="上传附件（演示）" onClick={() => toast('附件上传：演示环境未开放', 'info')}><Icon name="upload" size={16} /></button>
                </div>
                <button className="btn btn-primary" onClick={() => send()} disabled={streaming || !input.trim()}>
                  {streaming ? <span className="spinner" /> : <Icon name="send" size={15} />}
                  发送
                </button>
              </div>
            </div>
            <div className="text-xs text-muted text-center mt-1">内容由 AI 生成，请注意甄别与核实</div>
          </div>
        </div>
      </div>

      {/* 移动端会话入口 */}
      <div className="mobile-only mt-2">
        {convs && convs.length > 0 && (
          <div className="card card-pad">
            <div className="card-title mb-2"><Icon name="history" size={15} />历史会话</div>
            {convs.slice(0, 5).map((c) => (
              <div key={c.id} className="kv" style={{ cursor: 'pointer' }} onClick={() => openConv(c.id)}>
                <span className="kv-v ellipsis">{c.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
