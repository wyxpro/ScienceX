import React, { useState, useEffect, useRef } from 'react';
import Icon from '../../components/Icon';
import type { AgentMode, SkillItem } from '../../types';

interface ChatCommandDockProps {
  input: string;
  onInputChange: (val: string) => void;
  onSend: () => void;
  streaming: boolean;
  recording: boolean;
  onVoiceInput: () => void;
  onUploadClick: () => void;
  onEnhancePrompt: () => void;
  model: string;
  onSelectModel: (m: string) => void;
  models: { builtin: any[]; custom: any[] };
  skills: SkillItem[];
  onInvokeSkill: (skill: SkillItem) => void;
  projectName?: string;
  agentMode: AgentMode;
  onSelectAgentMode: (mode: AgentMode) => void;
  memoryCount: number;
  onOpenMemoryDrawer: () => void;
}

const AGENT_MODES: Array<{ mode: AgentMode; label: string; icon: any; desc: string }> = [
  { mode: 'plan_execute', label: '灵寻规划执行', icon: 'layers', desc: '分步拆解 · 自动化全流程' },
  { mode: 'general', label: '通用学术对话', icon: 'spark', desc: '记忆注入 · 学术全景分析' },
  { mode: 'react', label: 'ReAct 思维推演', icon: 'compass', desc: '思维链推导 · 工具闭环检验' },
  { mode: 'codeact', label: 'CodeAct 实验代码', icon: 'chart', desc: 'Python 沙箱 · 消融图表可视化' },
  { mode: 'mcp', label: 'MCP 学术检索', icon: 'globe', desc: 'arXiv 直连 · 顶会顶刊抓取' },
  { mode: 'skill', label: '学术技能编排', icon: 'zap', desc: '综述大纲 · LaTeX · 实验向导' },
  { mode: 'text2sql', label: 'Text2SQL 数据查询', icon: 'db', desc: '指标过滤 · SOTA 聚合对比' },
  { mode: 'structured', label: '结构化产出', icon: 'grid', desc: 'LaTeX 三线表 · 审稿矩阵' },
];

export const ChatCommandDock: React.FC<ChatCommandDockProps> = ({
  input,
  onInputChange,
  onSend,
  streaming,
  recording,
  onVoiceInput,
  onUploadClick,
  onEnhancePrompt,
  model,
  onSelectModel,
  models,
  skills,
  onInvokeSkill,
  projectName = '微表情识别（MER）研究',
  agentMode,
  onSelectAgentMode,
  memoryCount,
  onOpenMemoryDrawer,
}) => {
  const currentModeMeta = AGENT_MODES.find((m) => m.mode === agentMode) || AGENT_MODES[0];
  const canSend = !streaming && input.trim().length > 0;

  /* 统一互斥菜单管理，确保每个按钮弹出的下拉菜单置于最顶层，且互不遮挡重叠 */
  const [activeMenu, setActiveMenu] = useState<'skills' | 'model' | 'mode' | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dockRef.current && !dockRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    if (activeMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [activeMenu]);

  return (
    <div className="chat-command-dock" ref={dockRef} style={{ overflow: 'visible', position: 'relative' }}>
      {/* 顶部主输入区域 */}
      <div className="chat-dock-main">
        <textarea
          className="chat-dock-textarea"
          placeholder="输入你的科研问题，或指派文献调研、消融实验、论文润色任务...（Enter 发送 / Shift+Enter 换行）"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (canSend) onSend();
            }
          }}
          aria-label="科研任务输入框"
          rows={2}
        />

        {/* 输入框内置动作栏（左侧操作 + 右侧模型切换与发送） */}
        <div className="chat-dock-actions" style={{ position: 'relative' }}>
          {/* 左侧：上传文件、技能抽屉、提示词增强 */}
          <div className="chat-dock-left-tools">
            <button
              type="button"
              className="chat-tool-btn"
              onClick={onUploadClick}
              title="上传论文/实验数据附件"
              aria-label="上传附件"
            >
              <Icon name="plus" size={17} />
            </button>

            {/* 智能体技能/插件面板 */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="chat-tool-btn"
                title="调用科研技能与 MCP 工具"
                aria-label="科研技能"
                onClick={() => setActiveMenu((m) => (m === 'skills' ? null : 'skills'))}
                style={{
                  background: activeMenu === 'skills' ? '#f1f5f9' : 'transparent',
                  color: activeMenu === 'skills' ? '#0f172a' : '#64748b',
                }}
              >
                <Icon name="grid" size={16} />
              </button>

              {activeMenu === 'skills' && (
                <div
                  className="anim-pop"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    zIndex: 1500,
                    minWidth: 230,
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 14,
                    boxShadow: '0 16px 40px -8px rgba(15, 23, 42, 0.18), 0 4px 12px rgba(0, 0, 0, 0.08)',
                    padding: 6,
                    overflow: 'hidden',
                  }}
                  onClick={() => setActiveMenu(null)}
                >
                  <div style={{ padding: '6px 10px 8px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                    科研智能体技能库
                  </div>
                  {(skills || []).map((s) => (
                    <div
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 10px',
                        borderRadius: 8,
                        fontSize: 13,
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      onClick={() => onInvokeSkill(s)}
                    >
                      <Icon name="spark" size={13} style={{ color: '#059669' }} />
                      <span>{s.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>({s.uses} 次)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 提示词增强 */}
            <button
              type="button"
              className="chat-tool-btn"
              onClick={onEnhancePrompt}
              title="学术提示词深度增强（角色+结构+背景）"
              aria-label="提示词增强"
            >
              <Icon name="spark" size={16} />
            </button>
          </div>

          {/* 右侧：模型切换、语音输入、圆形发送按钮 */}
          <div className="chat-dock-right-tools">
            {/* 模型选择器 */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="chat-model-pill"
                aria-label="选择模型"
                onClick={() => setActiveMenu((m) => (m === 'model' ? null : 'model'))}
                style={{
                  background: activeMenu === 'model' ? '#e2e8f0' : '#f8fafc',
                  borderColor: activeMenu === 'model' ? '#94a3b8' : '#e2e8f0',
                }}
              >
                <Icon name="cpu" size={13} style={{ color: '#059669' }} />
                <span>{model}</span>
                <Icon name="chevronDown" size={11} style={{ opacity: 0.6 }} />
              </button>

              {activeMenu === 'model' && (
                <div
                  className="anim-pop"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    zIndex: 1500,
                    minWidth: 230,
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 14,
                    boxShadow: '0 16px 40px -8px rgba(15, 23, 42, 0.18), 0 4px 12px rgba(0, 0, 0, 0.08)',
                    padding: 6,
                    overflow: 'hidden',
                  }}
                  onClick={() => setActiveMenu(null)}
                >
                  <div style={{ padding: '6px 10px 8px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                    主流与专有科研大模型
                  </div>
                  {models.builtin?.map((m: any) => (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 10px',
                        borderRadius: 8,
                        fontSize: 13,
                        cursor: 'pointer',
                        background: model === m.name ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => { if (model !== m.name) e.currentTarget.style.background = '#f1f5f9'; }}
                      onMouseLeave={(e) => { if (model !== m.name) e.currentTarget.style.background = 'transparent'; }}
                      onClick={() => onSelectModel(m.name)}
                    >
                      <Icon name="cpu" size={13} style={{ color: '#059669' }} />
                      <span style={{ fontWeight: model === m.name ? 600 : 400 }}>{m.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>{m.tag}</span>
                    </div>
                  ))}
                  {models.custom?.map((m: any) => (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 10px',
                        borderRadius: 8,
                        fontSize: 13,
                        cursor: 'pointer',
                        background: model === m.name ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => { if (model !== m.name) e.currentTarget.style.background = '#f1f5f9'; }}
                      onMouseLeave={(e) => { if (model !== m.name) e.currentTarget.style.background = 'transparent'; }}
                      onClick={() => onSelectModel(m.name)}
                    >
                      <Icon name="key" size={13} style={{ color: '#10b981' }} />
                      <span style={{ fontWeight: model === m.name ? 600 : 400 }}>{m.name}</span>
                      <span style={{ fontSize: 11, color: '#10b981', marginLeft: 'auto' }}>自定义</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 语音输入按钮 */}
            <button
              type="button"
              className={`chat-mic-btn ${recording ? 'recording' : ''}`}
              onClick={onVoiceInput}
              title={recording ? '点击结束语音输入' : '语音输入'}
              aria-label="语音输入"
            >
              <Icon name="mic" size={16} />
            </button>

            {/* 圆形发送按钮 */}
            <button
              type="button"
              className={`chat-send-circle ${canSend ? 'active' : ''}`}
              onClick={() => { if (canSend) onSend(); }}
              disabled={!canSend}
              title={streaming ? '正在生成回复中...' : '发送指令'}
              aria-label="发送消息"
            >
              {streaming ? (
                <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: '#fff' }} />
              ) : (
                <Icon name="arrowUp" size={17} strokeWidth={2.4} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 底部附着托盘：关联课题、Agent 范式模式、长效记忆 */}
      <div className="chat-dock-tray" style={{ overflow: 'visible', position: 'relative' }}>
        <div className="chat-tray-group">
          {/* 关联项目胶囊 */}
          <div className="chat-tray-pill" title="当前关联的课题与实验空间">
            <Icon name="layers" size={12} style={{ color: '#0d9488' }} />
            <span>{projectName}</span>
          </div>

          {/* Agent 模式切换胶囊（向上展开顶层菜单） */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="chat-tray-pill highlight"
              aria-label="切换 Agent 模式"
              onClick={() => setActiveMenu((m) => (m === 'mode' ? null : 'mode'))}
              style={{
                background: activeMenu === 'mode' ? '#e2e8f0' : undefined,
              }}
            >
              <Icon name={currentModeMeta.icon} size={12} />
              <span>{currentModeMeta.label}</span>
              <Icon name="chevronDown" size={10} style={{ opacity: 0.6 }} />
            </button>

            {activeMenu === 'mode' && (
              <div
                className="anim-pop"
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 8px)',
                  left: 0,
                  zIndex: 1500,
                  minWidth: 260,
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  boxShadow: '0 16px 40px -8px rgba(15, 23, 42, 0.22), 0 4px 12px rgba(0, 0, 0, 0.08)',
                  padding: 6,
                  maxHeight: 320,
                  overflowY: 'auto',
                }}
                onClick={() => setActiveMenu(null)}
              >
                <div style={{ padding: '6px 10px 8px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
                  8 大科研智能体范式
                </div>
                {AGENT_MODES.map((am) => (
                  <div
                    key={am.mode}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      background: agentMode === am.mode ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { if (agentMode !== am.mode) e.currentTarget.style.background = '#f1f5f9'; }}
                    onMouseLeave={(e) => { if (agentMode !== am.mode) e.currentTarget.style.background = 'transparent'; }}
                    onClick={() => onSelectAgentMode(am.mode)}
                  >
                    <Icon name={am.icon} size={15} style={{ marginTop: 2, color: agentMode === am.mode ? '#059669' : '#64748b' }} />
                    <div>
                      <div style={{ fontWeight: agentMode === am.mode ? 700 : 600, fontSize: 12.5, color: agentMode === am.mode ? '#059669' : '#1e293b' }}>
                        {am.label}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{am.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右侧：长效记忆胶囊 */}
        <div className="chat-tray-group">
          <button
            type="button"
            className="chat-tray-pill highlight"
            onClick={onOpenMemoryDrawer}
            title="管理课题组三层长短期记忆引擎"
            aria-label="管理课题记忆"
          >
            <Icon name="spark" size={12} style={{ color: '#10b981' }} />
            <span>课题记忆 ({memoryCount})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
