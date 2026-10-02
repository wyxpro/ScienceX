/* ============================================================
   ScienceX AI 对话工作台 —— 全新美学重构版
   非暗黑模式 / 明亮清爽 / 悬浮指令中枢 / 8大科研智能体范式
   ============================================================ */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api, chatStream } from '../api/client';
import Icon, { type IconName } from '../components/Icon';
import { useToast } from '../components/ui';
import { useAuth } from '../stores/auth';
import type { AgentMode, ChatMessage, Conversation, SkillItem } from '../types';
import { ChatCommandDock } from './chat/ChatCommandDock';
import { ChatMessages } from './chat/ChatMessages';
import { ChatSidebar } from './chat/ChatSidebar';
import { MemoryDrawer } from './chat/MemoryDrawer';

interface QuickPrompt {
  id: string;
  icon: IconName;
  label: string;
  prompt: string;
}

const QUICK_PROMPTS: QuickPrompt[] = [
  { id: 'topic', icon: 'bulb', label: '选题方向推演', prompt: '帮我分析微表情识别领域 2026 年值得做的选题方向' },
  { id: 'review', icon: 'book', label: '综述大纲生成', prompt: '为「AU 先验 + Transformer」这个主题生成一份文献综述大纲' },
  { id: 'exp', icon: 'flask', label: '消融实验方案', prompt: '我的 up9 模型要做消融实验，帮我设计实验方案' },
  { id: 'polish', icon: 'pen', label: '论文学术润色', prompt: '把这段论文摘要润色成更地道的学术英语' },
  { id: 'chart', icon: 'chart', label: '科研图表生成', prompt: '帮我用 Python 生成一份多指标消融对比的学术柱状图' },
];

export default function Chat() {
  const { user } = useAuth();
  const toast = useToast();
  const [convs, setConvs] = useState<Conversation[] | null>(null);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [models, setModels] = useState<{ builtin: any[]; custom: any[] }>({ builtin: [], custom: [] });
  const [model, setModel] = useState('GPT-4o');
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [keyword, setKeyword] = useState('');
  const [recording, setRecording] = useState(false);
  const [agentMode, setAgentMode] = useState<AgentMode>('plan_execute');
  const [showMemoryDrawer, setShowMemoryDrawer] = useState(false);
  const [memoryCount, setMemoryCount] = useState<number>(4);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [projectName] = useState('微表情识别（MER）研究');
  const bottomRef = useRef<HTMLDivElement>(null);

  // 初始化带有精确演示数据的看板状态
  const [dashboard, setDashboard] = useState<any>({
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
    const c = await api<Conversation>('/conversations', { method: 'POST', body: { title: '新的科研对话' } });
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
    <div className="chat-workbench">
      {/* ===== 左侧会话侧边栏（可折叠） ===== */}
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
        collapsed={!sidebarOpen}
      />

      {/* ===== 主工作区视窗 ===== */}
      <div className="chat-main-stage">
        {/* 顶部轻量状态栏 */}
        <div className="chat-stage-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className="chat-tool-btn"
              onClick={() => setSidebarOpen((v) => !v)}
              title={sidebarOpen ? '收起会话列表' : '展开会话列表'}
              aria-label="切换侧边栏"
            >
              <Icon name="menu" size={16} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 7,
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                }}
              >
                <Icon name="flask" size={13} />
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                {activeConv ? convs?.find((c) => c.id === activeConv)?.title || '科研对话' : 'AI 对话中枢'}
              </span>
            </div>

            <div className="chat-header-pill" style={{ color: '#059669', background: '#ecfdf5', borderColor: '#a7f3d0' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
              <span>{model} 在线</span>
            </div>

            <div className="chat-header-pill" style={{ color: '#4f46e5', background: '#e0e7ff', borderColor: '#c7d2fe' }}>
              <span>灵犀 Agent 引擎</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              今日已用 <strong style={{ color: '#0f172a' }}>{dashboard?.today_usage?.tokens?.toLocaleString?.() ?? '38,400'}</strong> tokens · {dashboard?.today_usage?.calls ?? 26} 次调用
            </div>
          </div>
        </div>

        {/* 内容区域：空状态（LobsterAI 风格居中 Hero + 输入卡片） 或 消息流 */}
        {messages.length === 0 ? (
          <div className="chat-hero-container">
            {/* 居中标志性 App Badge */}
            <div className="chat-hero-badge">
              <Icon name="flask" size={28} />
            </div>

            {/* 标题与副标题 */}
            <h1 className="chat-hero-title">ScienceX AI</h1>
            <p className="chat-hero-subtitle">
              全周期 AI 科研智能体中枢 · 覆盖选题、文献、实验、写作与评审
            </p>

            {/* 核心悬浮输入中枢卡片 */}
            <ChatCommandDock
              input={input}
              onInputChange={setInput}
              onSend={() => send()}
              streaming={streaming}
              recording={recording}
              onVoiceInput={voiceInput}
              onUploadClick={() => toast('附件上传：演示环境已就绪', 'info')}
              onEnhancePrompt={enhancePrompt}
              model={model}
              onSelectModel={setModel}
              models={models}
              skills={skills}
              onInvokeSkill={invokeSkill}
              projectName={projectName}
              agentMode={agentMode}
              onSelectAgentMode={setAgentMode}
              memoryCount={memoryCount}
              onOpenMemoryDrawer={() => setShowMemoryDrawer(true)}
            />

            {/* 下方快捷推荐指令胶囊栏 */}
            <div className="chat-quick-tags">
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp.id}
                  type="button"
                  className="chat-quick-tag"
                  onClick={() => send(qp.prompt)}
                  title={qp.prompt}
                >
                  <Icon name={qp.icon} size={14} style={{ color: '#059669' }} />
                  <span>{qp.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* 消息滚动流 */}
            <ChatMessages
              messages={messages}
              user={user}
              bottomRef={bottomRef}
            />

            {/* 底部悬浮吸附输入中枢卡片 */}
            <div className="chat-dock-sticky-container">
              <ChatCommandDock
                input={input}
                onInputChange={setInput}
                onSend={() => send()}
                streaming={streaming}
                recording={recording}
                onVoiceInput={voiceInput}
                onUploadClick={() => toast('附件上传：演示环境已就绪', 'info')}
                onEnhancePrompt={enhancePrompt}
                model={model}
                onSelectModel={setModel}
                models={models}
                skills={skills}
                onInvokeSkill={invokeSkill}
                projectName={projectName}
                agentMode={agentMode}
                onSelectAgentMode={setAgentMode}
                memoryCount={memoryCount}
                onOpenMemoryDrawer={() => setShowMemoryDrawer(true)}
              />
            </div>
          </>
        )}
      </div>

      {/* 课题组三层记忆抽屉 */}
      <MemoryDrawer
        open={showMemoryDrawer}
        onClose={() => setShowMemoryDrawer(false)}
        convId={activeConv}
        onMemoryChanged={() => api<{ total: number }>('/chat/memories').then((r) => setMemoryCount(r?.total || 4))}
      />
    </div>
  );
}
