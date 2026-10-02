import React, { useRef, useEffect } from 'react';
import Icon from '../../components/Icon';
import { Dropdown, DropdownItem } from '../../components/ui';

interface LobsterInputCardProps {
  input: string;
  onInputChange: (val: string) => void;
  streaming: boolean;
  recording: boolean;
  onSend: () => void;
  onVoiceInput: () => void;
  onUploadClick: () => void;
  onOpenKits: () => void;
  onEnhancePrompt: () => void;
  model: string;
  models: { builtin: any[]; custom: any[] };
  onSelectModel: (modelName: string) => void;
  projectName: string;
  agentName: string;
  onOpenProjectSelect?: () => void;
  onOpenAgentSelect?: () => void;
  placeholder?: string;
  docked?: boolean;
}

export const LobsterInputCard: React.FC<LobsterInputCardProps> = ({
  input,
  onInputChange,
  streaming,
  recording,
  onSend,
  onVoiceInput,
  onUploadClick,
  onOpenKits,
  onEnhancePrompt,
  model,
  models,
  onSelectModel,
  projectName,
  agentName,
  onOpenProjectSelect,
  onOpenAgentSelect,
  placeholder = 'Assign a task or ask any question',
  docked = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [input]);

  const canSend = !streaming && input.trim().length > 0;

  return (
    <div
      className="lobster-input-card"
      style={docked ? { boxShadow: '0 8px 30px rgba(0, 0, 0, 0.65)' } : {}}
    >
      {/* 文本输入区 */}
      <textarea
        ref={textareaRef}
        className="lobster-textarea"
        placeholder={placeholder}
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (canSend) onSend();
          }
        }}
        rows={docked ? 2 : 2}
        aria-label="Agent 任务提示词输入框"
      />

      {/* 内部操作栏 */}
      <div className="lobster-card-toolbar">
        {/* 左侧扩展操作：+ / Kits / Prompt Enhance */}
        <div className="lobster-tools-left">
          <button
            type="button"
            className="lobster-tool-btn"
            onClick={onUploadClick}
            title="添加附件或论文文档 (+)"
            aria-label="添加附件"
          >
            <Icon name="plus" size={17} />
          </button>

          <button
            type="button"
            className="lobster-tool-btn"
            onClick={onOpenKits}
            title="选择科研套件与 Agent 模式 (Kits)"
            aria-label="打开套件"
          >
            <Icon name="grid" size={16} />
          </button>

          <button
            type="button"
            className="lobster-tool-btn"
            onClick={onEnhancePrompt}
            title="提示词增强优化 (Prompt Enhance)"
            aria-label="提示词增强"
          >
            <Icon name="sparkles" size={16} />
          </button>
        </div>

        {/* 右侧：模型选择器药丸 / 麦克风 / 圆形向上箭头发送按钮 */}
        <div className="lobster-tools-right">
          <Dropdown
            trigger={
              <button
                type="button"
                className="lobster-model-pill"
                title="切换推理模型"
                aria-label="选择模型"
              >
                <span>{model}</span>
                <Icon name="chevronDown" size={12} style={{ opacity: 0.7 }} />
              </button>
            }
          >
            <div className="lobster-dropdown-menu">
              <div style={{ padding: '4px 8px 6px', fontSize: 11, color: '#686e84', fontWeight: 600 }}>
                BUILT-IN MODELS
              </div>
              {(models.builtin && models.builtin.length > 0
                ? models.builtin
                : [
                    { id: 'm1', name: 'DeepSeek-V4-Pro', tag: '学术满血版' },
                    { id: 'm2', name: 'GPT-4o', tag: '高精全能' },
                    { id: 'm3', name: 'Claude-3.5-Sonnet', tag: '长文推理' },
                    { id: 'm4', name: 'DeepSeek-R1', tag: '慢思考推导' },
                  ]
              ).map((m: any) => (
                <DropdownItem
                  key={m.id || m.name}
                  icon="cpu"
                  onClick={() => onSelectModel(m.name)}
                >
                  <span style={{ fontWeight: model === m.name ? 700 : 400 }}>{m.name}</span>
                  {m.tag && <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.6 }}>· {m.tag}</span>}
                </DropdownItem>
              ))}

              {models.custom && models.custom.length > 0 && (
                <>
                  <div style={{ padding: '8px 8px 4px', fontSize: 11, color: '#686e84', fontWeight: 600 }}>
                    CUSTOM MODELS
                  </div>
                  {models.custom.map((m: any) => (
                    <DropdownItem
                      key={m.id || m.name}
                      icon="key"
                      onClick={() => onSelectModel(m.name)}
                    >
                      <span>{m.name}（自定义）</span>
                    </DropdownItem>
                  ))}
                </>
              )}
            </div>
          </Dropdown>

          <button
            type="button"
            className={`lobster-mic-btn ${recording ? 'active' : ''}`}
            onClick={onVoiceInput}
            title={recording ? '正在聆听…点击停止' : '语音输入'}
            aria-label="语音输入"
          >
            <Icon name="mic" size={17} />
          </button>

          <button
            type="button"
            className={`lobster-send-btn ${canSend ? 'ready' : ''}`}
            onClick={onSend}
            disabled={!canSend}
            title="发送指令 (Enter)"
            aria-label="发送指令"
          >
            {streaming ? (
              <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
            ) : (
              <Icon name="arrowUp" size={16} />
            )}
          </button>
        </div>
      </div>

      {/* 底部附带的项目与智能体胶囊栏 */}
      <div className="lobster-card-chips">
        <button
          type="button"
          className="lobster-chip-btn"
          onClick={onOpenProjectSelect}
          title="切换当前关联的科研项目上下文"
        >
          <Icon name="folder" size={13} style={{ color: '#6366f1' }} />
          <span>project</span>
          <span style={{ color: '#d5d9ec', fontWeight: 600 }}>({projectName})</span>
          <Icon name="chevronDown" size={11} style={{ opacity: 0.6 }} />
        </button>

        <button
          type="button"
          className="lobster-chip-btn"
          onClick={onOpenAgentSelect}
          title="切换当前主编排智能体"
        >
          <Icon name="bot" size={13} style={{ color: '#10b981' }} />
          <span>{agentName}</span>
          <Icon name="chevronDown" size={11} style={{ opacity: 0.6 }} />
        </button>
      </div>
    </div>
  );
};
