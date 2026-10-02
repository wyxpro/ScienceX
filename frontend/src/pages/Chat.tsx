/* AI 对话工作台 —— 现代化深色 Agent 工作台 (LobsterAI 视觉规范) */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api, chatStream } from '../api/client';
import Icon from '../components/Icon';
import { useToast } from '../components/ui';
import { useAuth } from '../stores/auth';
import type { AgentMode, ChatMessage, Conversation, SkillItem } from '../types';
import { ChatSidebar, type AgentItem } from './chat/ChatSidebar';
import { ChatMessages } from './chat/ChatMessages';
import { LobsterInputCard } from './chat/LobsterInputCard';
import { LobsterModals } from './chat/LobsterModals';
import { MemoryDrawer } from './chat/MemoryDrawer';
import './chat/lobster-chat.css';

const DEFAULT_AGENTS: AgentItem[] = [
  { id: 'main_agent', name: 'Main Agent', role: '灵犀科研主智能体' },
  { id: 'literature_agent', name: 'Literature Agent', role: '文献精读与综述智能体' },
  { id: 'experiment_agent', name: 'Experiment Agent', role: '消融实验与参数调优智能体' },
  { id: 'reviewer_council', name: 'Reviewer Council', role: '五角色多智能体专家评审团' },
];

const QUICK_CAPSULES = [
  {
    icon: 'doc' as const,
    label: 'Create Slides',
    prompt: '为「微表情识别（MER）多模态融合」研究生成一份 12 页学术组会汇报 PPT 大纲与分页讲稿',
  },
  {
    icon: 'chart' as const,
    label: 'Data Analysis',
    prompt: '分析当前消融实验 UF1 / UAR 指标数据，生成学术消融对比图并输出关键趋势洞察',
  },
  {
    icon: 'book' as const,
    label: 'Education & Learning',
    prompt: '深度精读 2026 年微表情识别领域关键顶会论文，解析核心网络架构、AU 先验机制与局限性',
  },
  {
    icon: 'globe' as const,
    label: 'Create Website',
    prompt: '为当前科研项目设计一个展示微表情识别算法、Demo 演示与消融基准的交互式学术主页',
  },
];

export default function Chat() {
  const { user } = useAuth();
  const toast = useToast();

  const [convs, setConvs] = useState<Conversation[] | null>(null);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [models, setModels] = useState<{ builtin: any[]; custom: any[] }>({
    builtin: [
      { id: 'm1', name: 'DeepSeek-V4-Pro', tag: '学术满血版' },
      { id: 'm2', name: 'GPT-4o', tag: '高精全能' },
      { id: 'm3', name: 'Claude-3.5-Sonnet', tag: '长文推理' },
      { id: 'm4', name: 'DeepSeek-R1', tag: '慢思考推导' },
    ],
    custom: [],
  });
  const [model, setModel] = useState('DeepSeek-V4-Pro');
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [keyword, setKeyword] = useState('');
  const [recording, setRecording] = useState(false);
  const [agentMode, setAgentMode] = useState<AgentMode>('plan_execute');
  const [showMemoryDrawer, setShowMemoryDrawer] = useState(false);
  const [memoryCount, setMemoryCount] = useState<number>(4);

  // 现代 Agent 界面状态
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState('new_task');
  const [selectedAgent, setSelectedAgent] = useState('main_agent');
  const [agents, setAgents] = useState<AgentItem[]>(DEFAULT_AGENTS);
  const [projectName, setProjectName] = useState('微表情识别（MER）研究');
  const [activeModal, setActiveModal] = useState<'kits' | 'scheduled' | 'search' | 'mcp' | 'add_agent' | 'project' | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    try {
      const [c, m, s, mem] = await Promise.all([
        api<{ items: Conversation[] } | Conversation[]>('/conversations'),
        api<{ builtin: any[]; custom: any[] }>('/models'),
        api<{ items: SkillItem[] } | SkillItem[]>('/skills'),
        api<{ total: number }>('/chat/memories').catch(() => ({ total: 4 })),
      ]);
      setConvs((c as any)?.items || (Array.isArray(c) ? c : []));
      if (m?.builtin?.length) {
        setModels(m);
        // 如果后端配置有模型，优先保留或对齐
        if (!m.builtin.some((b: any) => b.name === model)) {
          setModel(m.builtin[0].name);
        }
      }
      setSkills(Array.isArray(s) ? s : ((s as any)?.items || []));
      if (mem && typeof mem.total === 'number') setMemoryCount(mem.total);
    } catch (err: any) {
      toast(err.message || '加载工作台数据失败', 'err');
    }
  }, [toast, model]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openConv = async (id: string) => {
    setActiveConv(id);
    setActiveNav('tasks');
    const { items } = await api<{ items: ChatMessage[] }>(`/conversations/${id}/messages`);
    setMessages(items.map((m) => ({ ...m })));
  };

  const newConv = async () => {
    const c = await api<Conversation>('/conversations', {
      method: 'POST',
      body: { title: '新的科研任务' },
    });
    setConvs((x) => [c, ...(x || [])]);
    setActiveConv(c.id);
    setMessages([]);
    setActiveNav('new_task');
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
    const { enhanced } = await api<{ enhanced: string }>('/prompt/enhance', {
      method: 'POST',
      body: { prompt: input },
    });
    setInput(enhanced);
    toast('提示词已增强（学术背景 + 结构化约束）');
  };

  const voiceInput = () => {
    if (recording) {
      setRecording(false);
      setInput((v) => (v ? v + ' ' : '') + '帮我分析当前消融实验结果并生成进一步的改进方向');
      toast('语音已转写为文字');
      return;
    }
    setRecording(true);
    toast('正在聆听…再次点击结束（Web Speech API 模拟）', 'info');
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
      const c = await api<Conversation>('/conversations', {
        method: 'POST',
        body: { title: content.slice(0, 18) },
      });
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
        onDelta: (t) =>
          setMessages((m) => m.map((x) => (x.id === aiMsg.id ? { ...x, content: x.content + t } : x))),
        onPlan: (plan) =>
          setMessages((m) => m.map((x) => (x.id === aiMsg.id ? { ...x, plan } : x))),
        onStepStart: (step) =>
          setMessages((m) =>
            m.map((x) =>
              x.id === aiMsg.id && x.plan
                ? {
                    ...x,
                    plan: {
                      ...x.plan,
                      steps: x.plan.steps.map((s, idx) =>
                        idx === step.step_index ? { ...s, status: 'running' } : s
                      ),
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

  const handleSelectNav = (nav: string) => {
    setActiveNav(nav);
    if (nav === 'kits') setActiveModal('kits');
    else if (nav === 'scheduled') setActiveModal('scheduled');
    else if (nav === 'search') setActiveModal('search');
    else if (nav === 'mcp') setActiveModal('mcp');
    else if (nav === 'skills') {
      if (skills.length > 0) {
        toast(`已载入 ${skills.length} 个学术 Skills 扩展`, 'info');
      } else {
        toast('Skills 扩展就绪', 'info');
      }
    }
  };

  const filteredConvs = convs?.filter((c) => c.title.includes(keyword)) || [];
  const currentAgent = agents.find((a) => a.id === selectedAgent) || agents[0];

  return (
    <div style={{ padding: '0 4px', height: '100%' }}>
      {/* 现代深色 Agent 工作台外壳 */}
      <div className="lobster-container">
        {/* 左侧工作台侧栏 */}
        <ChatSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
          activeNav={activeNav}
          onSelectNav={handleSelectNav}
          selectedAgent={selectedAgent}
          onSelectAgent={(id) => {
            setSelectedAgent(id);
            const a = agents.find((x) => x.id === id);
            toast(`已切换至 ${a?.name || '智能体'}`);
          }}
          agents={agents}
          onAddAgent={() => setActiveModal('add_agent')}
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

        {/* 右侧主工作台 */}
        <main className="lobster-main">
          {/* 顶栏控制状态条 */}
          <div className="lobster-topbar">
            <div className="lobster-topbar-left">
              {sidebarCollapsed && (
                <button
                  type="button"
                  className="lobster-sidebar-open-btn"
                  onClick={() => setSidebarCollapsed(false)}
                  title="展开侧边栏"
                >
                  <Icon name="layoutSidebar" size={15} />
                  <span>Sidebar</span>
                </button>
              )}
            </div>

            <div className="lobster-topbar-right">
              {/* 课题记忆抽屉入口 */}
              <button
                type="button"
                className="lobster-mem-btn"
                onClick={() => setShowMemoryDrawer(true)}
                title="管理课题组三层长短期记忆引擎"
              >
                <Icon name="spark" size={13} />
                <span>Memory ({memoryCount})</span>
              </button>

              {/* 标志性绿色安全态指示器 */}
              <div className="lobster-security-pill" title="Security & Sandboxing Active">
                <Icon name="shield" size={14} />
                <span>Security Active</span>
              </div>

              {/* 在有消息时提供快捷新任务按钮 */}
              {messages.length > 0 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ color: '#a4a9bd', borderColor: 'rgba(255,255,255,0.1)' }}
                  onClick={newConv}
                  title="开始新任务"
                >
                  <Icon name="plus" size={13} />
                  <span>新任务</span>
                </button>
              )}
            </div>
          </div>

          {/* 内容展示区：空白初始态 (Hero) 或 对话消息流 (Flow) */}
          {messages.length === 0 ? (
            <div className="lobster-hero-stage">
              {/* 居中标志性圆角橘红徽章图标 */}
              <div className="lobster-logo-badge" title="LobsterAI Agent Engine">
                <Icon name="lobster" size={32} />
              </div>

              <h1 className="lobster-title">LobsterAI</h1>
              <div className="lobster-subtitle">All-scenario office assistant Agent</div>

              {/* 居中核心悬浮提示词卡片 */}
              <LobsterInputCard
                input={input}
                onInputChange={setInput}
                streaming={streaming}
                recording={recording}
                onSend={() => send()}
                onVoiceInput={voiceInput}
                onUploadClick={() => toast('附件上传：演示沙箱已连接', 'info')}
                onOpenKits={() => setActiveModal('kits')}
                onEnhancePrompt={enhancePrompt}
                model={model}
                models={models}
                onSelectModel={setModel}
                projectName={projectName}
                agentName={currentAgent.name}
                onOpenProjectSelect={() => setActiveModal('project')}
                onOpenAgentSelect={() => setActiveModal('kits')}
                placeholder="Assign a task or ask any question"
              />

              {/* 卡片下方的快捷学术指令胶囊 */}
              <div className="lobster-capsules-row">
                {QUICK_CAPSULES.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    className="lobster-capsule"
                    onClick={() => send(item.prompt)}
                    title={item.prompt}
                  >
                    <Icon name={item.icon} size={15} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="lobster-chat-flow">
              {/* 消息滚动流 */}
              <div className="lobster-messages-scroll">
                <div className="lobster-messages-container">
                  <ChatMessages
                    messages={messages}
                    user={user}
                    suggestions={[]}
                    onSelectSuggestion={(text) => send(text)}
                    bottomRef={bottomRef}
                  />
                </div>
              </div>

              {/* 底部吸底悬浮输入卡片 */}
              <div className="lobster-docked-input-shell">
                <LobsterInputCard
                  docked={true}
                  input={input}
                  onInputChange={setInput}
                  streaming={streaming}
                  recording={recording}
                  onSend={() => send()}
                  onVoiceInput={voiceInput}
                  onUploadClick={() => toast('附件上传：演示沙箱已连接', 'info')}
                  onOpenKits={() => setActiveModal('kits')}
                  onEnhancePrompt={enhancePrompt}
                  model={model}
                  models={models}
                  onSelectModel={setModel}
                  projectName={projectName}
                  agentName={currentAgent.name}
                  onOpenProjectSelect={() => setActiveModal('project')}
                  onOpenAgentSelect={() => setActiveModal('kits')}
                  placeholder="Assign a task or ask any question"
                />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 弹窗与抽屉 */}
      <LobsterModals
        activeModal={activeModal}
        onClose={() => setActiveModal(null)}
        agentMode={agentMode}
        onSelectAgentMode={setAgentMode}
        convs={convs}
        onOpenConv={openConv}
        onNewConvWithPrompt={(prompt) => send(prompt)}
        projectName={projectName}
        onSelectProject={setProjectName}
        onAddCustomAgent={(newAgent) => {
          setAgents((prev) => [...prev, newAgent]);
          setSelectedAgent(newAgent.id);
          toast(`智能体「${newAgent.name}」已创建并生效`);
        }}
      />

      <MemoryDrawer
        open={showMemoryDrawer}
        onClose={() => setShowMemoryDrawer(false)}
        convId={activeConv}
        onMemoryChanged={() =>
          api<{ total: number }>('/chat/memories').then((r) => setMemoryCount(r?.total || 4))
        }
      />
    </div>
  );
}
