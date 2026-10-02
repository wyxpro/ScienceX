/* AI 对话工作台 —— REQ-CHAT-01~04：流式对话 / 多模型 / 历史会话 / Skills / 看板置底 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, chatStream } from '../api/client';
import Icon from '../components/Icon';
import { Dropdown, DropdownItem, useToast } from '../components/ui';
import { useAuth } from '../stores/auth';
import type { AgentMode, ChatMessage, Conversation, SkillItem } from '../types';
import { ChatDashboard } from './chat/ChatDashboard';
import { ChatInputArea } from './chat/ChatInputArea';
import { ChatMessages } from './chat/ChatMessages';
import { ChatSidebar } from './chat/ChatSidebar';
import { AgentModeSelector } from './chat/AgentModeSelector';
import { MemoryDrawer } from './chat/MemoryDrawer';

const SUGGESTIONS: [string, string][] = [
  ['bulb', '帮我分析微表情识别领域 2026 年值得做的选题方向'],
  ['book', '为「AU 先验 + Transformer」这个主题生成一份文献综述大纲'],
  ['flask', '我的 up9 模型要做消融实验，帮我设计实验方案'],
  ['pen', '把这段论文摘要润色成更地道的学术英语'],
];

export default function Chat() {
  const { user } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [convs, setConvs] = useState<Conversation[] | null>(null);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [models, setModels] = useState<{ builtin: any[]; custom: any[] }>({ builtin: [], custom: [] });
  const [model, setModel] = useState('GPT-4o');
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [showDash, setShowDash] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [recording, setRecording] = useState(false);
  const [agentMode, setAgentMode] = useState<AgentMode>('plan_execute');
  const [showMemoryDrawer, setShowMemoryDrawer] = useState(false);
  const [memoryCount, setMemoryCount] = useState<number>(4);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 初始化带有精确演示数据的看板状态
  const [dashboard, setDashboard] = useState<any>({
    project: {
      name: '微表情识别（MER）研究',
      progress: { topic: 100, literature: 78, experiment: 55, analysis: 40 },
    },
    recent_outputs: [
      { id: 'ro1', type: 'chart', title: '消融实验 UF1 对比', meta: 'ch1 · 3天前', ref: '/tools/analysis' },
      { id: 'ro2', type: 'doc', title: '七段式总结 · AUFormer (MM 24)', meta: 'd2 · 5天前', ref: '/tools/reader' },
      { id: 'ro3', type: 'deck', title: '组会汇报 · up9 实验进展', meta: '12页 pptx · 5天前', ref: '/features/meeting' },
      { id: 'ro4', type: 'report', title: '模拟审稿报告 #rv1', meta: '大修 · 2天前', ref: '/features/review' },
    ],
    papers_daily: {
      items: [
        { id: 'pd4', title: 'METrack: Real-time Micro-expression Spotting in Long Videos', venue: 'arXiv', reason: '匹配「微表情识别」方向', hot: 4 },
        { id: 'pd5', title: 'Rethinking Evaluation Protocols in MER: A Reproducibility Study', venue: 'arXiv', reason: '与你阅读的综述相关', hot: 5 },
      ],
    },
    today_usage: { tokens: 38400, calls: 26, cost: 1.24 },
  });

  const loadData = useCallback(async () => {
    try {
      const [c, m, d, s, mem] = await Promise.all([
        api<{ items: Conversation[] } | Conversation[]>('/conversations'),
        api<{ builtin: any[]; custom: any[] }>('/models'),
        api<any>('/dashboard/summary'),
        api<{ items: SkillItem[] } | SkillItem[]>('/skills'),
        api<{ total: number }>('/chat/memories').catch(() => ({ total: 4 })),
      ]);
      setConvs((c as any)?.items || (Array.isArray(c) ? c : []));
      setModels(m || { builtin: [], custom: [] });
      if (d) setDashboard(d);
      setSkills(Array.isArray(s) ? s : ((s as any)?.items || []));
      if (mem && typeof mem.total === 'number') setMemoryCount(mem.total);
    } catch (err: any) {
      toast(err.message || '加载工作台数据失败', 'err');
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openConv = async (id: string) => {
    setActiveConv(id);
    const { items } = await api<{ items: ChatMessage[] }>(`/conversations/${id}/messages`);
    setMessages(items.map((m) => ({ ...m })));
  };

  const newConv = async () => {
    const c = await api<Conversation>('/conversations', { method: 'POST', body: { title: '新的对话' } });
    setConvs((x) => [c, ...(x || [])]);
    setActiveConv(c.id);
    setMessages([]);
  };

  const removeConv = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await api(`/conversations/${id}`, { method: 'DELETE' });
    setConvs((x) => (x ? x.filter((c) => c.id !== id) : []));
    if (activeConv === id) {
      setActiveConv(null);
      setMessages([]);
    }
    toast('会话已删除');
  };

  const renameConv = async (id: string) => {
    const title = prompt('重命名会话', convs?.find((c) => c.id === id)?.title || '');
    if (title) {
      await api(`/conversations/${id}`, { method: 'PATCH', body: { title } });
      setConvs((x) => (x ? x.map((c) => (c.id === id ? { ...c, title } : c)) : []));
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
    const userMsg: ChatMessage = { id: `u${Date.now()}`, role: 'user', content };
    const aiMsg: ChatMessage = {
      id: `a${Date.now()}`,
      role: 'assistant',
      content: '',
      model,
      agent_mode: agentMode,
      streaming: true,
    };
    setMessages((m) => [...m, userMsg, aiMsg]);

    let convId = activeConv;
    if (!convId) {
      const c = await api<Conversation>('/conversations', { method: 'POST', body: { title: content.slice(0, 18) } });
      convId = c.id;
      setActiveConv(c.id);
      setConvs((x) => [c, ...(x || [])]);
    }

    await chatStream(
      {
        messages: [...messages.filter((m) => !m.streaming), { role: 'user', content }].map((m) => ({
          role: m.role,
          content: m.content,
        })),
        model,
        agent_mode: agentMode,
        conversation_id: convId,
        skills: skillId ? [skillId] : [],
      },
      {
        onDelta: (t) => setMessages((m) => m.map((x) => (x.id === aiMsg.id ? { ...x, content: x.content + t } : x))),
        onPlan: (plan) => setMessages((m) => m.map((x) => (x.id === aiMsg.id ? { ...x, plan } : x))),
        onStepStart: (step) =>
          setMessages((m) =>
            m.map((x) =>
              x.id === aiMsg.id && x.plan
                ? {
                    ...x,
                    plan: {
                      ...x.plan,
                      steps: x.plan.steps.map((s, idx) => (idx === step.step_index ? { ...s, status: 'running' } : s)),
                    },
                  }
                : x
            )
          ),
        onStepUpdate: (up) =>
          setMessages((m) =>
            m.map((x) =>
              x.id === aiMsg.id && x.plan
                ? {
                    ...x,
                    plan: {
                      ...x.plan,
                      steps: x.plan.steps.map((s, idx) =>
                        idx === up.step_index ? { ...s, status: up.status, output: up.output } : s
                      ),
                    },
                  }
                : x
            )
          ),
        onThought: (th) =>
          setMessages((m) =>
            m.map((x) => (x.id === aiMsg.id ? { ...x, thoughts: [...(x.thoughts || []), th] } : x))
          ),
        onToolResult: (tr) =>
          setMessages((m) =>
            m.map((x) =>
              x.id === aiMsg.id
                ? {
                    ...x,
                    chart_data: tr.chart_data || x.chart_data,
                    code: tr.code || x.code,
                    papers: tr.papers || x.papers,
                  }
                : x
            )
          ),
        onMemoryInjected: (mem) =>
          setMessages((m) => m.map((x) => (x.id === aiMsg.id ? { ...x, memory_injected: mem } : x))),
        onTool: (d) => toast(`技能「${d.name}」已调用`, 'info'),
        onDone: () => {
          setMessages((m) =>
            m.map((x) =>
              x.id === aiMsg.id
                ? {
                    ...x,
                    streaming: false,
                    plan: x.plan ? { ...x.plan, percent: 100, status: 'completed' } : undefined,
                  }
                : x
            )
          );
          setStreaming(false);
          api<any>('/conversations').then((r: any) => setConvs(r?.items || (Array.isArray(r) ? r : [])));
        },
        onError: (msg) => {
          toast(msg, 'err');
          setStreaming(false);
          setMessages((m) => m.filter((x) => x.id !== aiMsg.id));
        },
      }
    );
  };

  const invokeSkill = (skill: SkillItem) => {
    send(`请使用「${skill.name}」技能：${skill.desc}`, skill.id);
  };

  const filteredConvs = convs?.filter((c) => c.title.includes(keyword)) || [];

  return (
    <div className="page" style={{ maxWidth: 1500 }}>
      {/* ===== 顶部简明状态栏 ===== */}
      <div className="row-between mb-3" style={{ alignItems: 'center' }}>
        <div className="row g-2 items-center">
          <div className="sb-logo-mark" style={{ width: 28, height: 28, borderRadius: 8, fontSize: 13 }}>
            <Icon name="flask" size={15} />
          </div>
          <span className="fw-bold" style={{ fontSize: 15 }}>对话中枢</span>
          <span className="tag" style={{ background: 'var(--brand-soft)', color: 'var(--brand-strong)', fontSize: 11.5 }}>
            {model} 在线
          </span>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 12,
              background: 'rgba(99, 102, 241, 0.1)',
              color: '#6366f1',
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            灵犀 Agent 引擎
          </span>
        </div>
        <div className="row g-3 items-center">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{
              border: '1px solid rgba(16, 185, 129, 0.35)',
              background: 'rgba(16, 185, 129, 0.08)',
              color: '#065f46',
              fontWeight: 600,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
            onClick={() => setShowMemoryDrawer(true)}
            title="管理课题组三层长短期记忆引擎"
          >
            <Icon name="spark" size={13} />
            <span>课题记忆 ({memoryCount})</span>
          </button>
          <div className="text-small text-muted">
            今日已用 <span className="mono fw-bold" style={{ color: 'var(--ink)' }}>{dashboard?.today_usage?.tokens?.toLocaleString?.() ?? '38,400'}</span> tokens · {dashboard?.today_usage?.calls ?? 26} 次调用
          </div>
        </div>
      </div>

      {/* ===== 主体：会话列表 + 对话区 ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 250px) 1fr', gap: 18, marginBottom: 22 }}>
        {/* 会话列表 */}
        <ChatSidebar
          convs={convs}
          filteredConvs={filteredConvs}
          activeConv={activeConv}
          keyword={keyword}
          onKeywordChange={setKeyword}
          onNewConv={newConv}
          onOpenConv={openConv}
          onRenameConv={renameConv}
          onRemoveConv={removeConv}
        />

        {/* 对话区 */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 'clamp(540px, 62vh, 660px)', overflow: 'hidden' }}>
          {/* 工具条 */}
          <div className="row-between" style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)' }}>
            <div className="row g-2 wrap items-center">
              <Dropdown trigger={<button className="btn btn-ghost btn-sm" aria-label="选择模型"><Icon name="cpu" size={14} />{model}<Icon name="chevronDown" size={13} /></button>}>
                {models.builtin?.map((m: any) => (
                  <DropdownItem key={m.id} icon="cpu" onClick={() => setModel(m.name)}>{m.name} · {m.tag}</DropdownItem>
                ))}
                {models.custom?.map((m: any) => (
                  <DropdownItem key={m.id} icon="key" onClick={() => setModel(m.name)}>{m.name}（自定义）</DropdownItem>
                ))}
              </Dropdown>
              <Dropdown trigger={<button className="btn btn-ghost btn-sm" aria-label="选择智能体技能"><Icon name="zap" size={14} />技能</button>}>
                {(skills || []).map((s) => (
                  <DropdownItem key={s.id} icon="spark" onClick={() => invokeSkill(s)}>{s.name} · {s.uses} 次使用</DropdownItem>
                ))}
              </Dropdown>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={enhancePrompt} title="优化我的输入提示词" aria-label="提示词增强">
              <Icon name="spark" size={14} />提示词增强
            </button>
          </div>

          {/* 8 大科研级 Agent 编排模式胶囊切换栏 */}
          <AgentModeSelector
            currentMode={agentMode}
            onSelectMode={setAgentMode}
            disabled={streaming}
          />

          {/* 消息流 */}
          <ChatMessages
            messages={messages}
            user={user}
            suggestions={SUGGESTIONS}
            onSelectSuggestion={(text) => send(text)}
            bottomRef={bottomRef}
          />

          {/* 输入区 */}
          <ChatInputArea
            input={input}
            streaming={streaming}
            recording={recording}
            onInputChange={setInput}
            onSend={() => send()}
            onVoiceInput={voiceInput}
            onUploadClick={() => toast('附件上传：演示环境未开放', 'info')}
          />
        </div>
      </div>

      {/* ===== 对话框下方：项目进度看板、最近产出、今日文献速递 ===== */}
      <ChatDashboard
        showDash={showDash}
        onToggleDash={() => setShowDash((s) => !s)}
        dashboard={dashboard}
      />

      {/* 课题组三层记忆抽屉 */}
      <MemoryDrawer
        open={showMemoryDrawer}
        onClose={() => setShowMemoryDrawer(false)}
        convId={activeConv}
        onMemoryChanged={() => api<{ total: number }>('/chat/memories').then((r) => setMemoryCount(r?.total || 4))}
      />

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
