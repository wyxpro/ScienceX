import React from 'react';
import Icon from '../../components/Icon';

interface ChatInputAreaProps {
  input: string;
  streaming: boolean;
  recording: boolean;
  onInputChange: (val: string) => void;
  onSend: () => void;
  onVoiceInput: () => void;
  onUploadClick: () => void;
}

export const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  input,
  streaming,
  recording,
  onInputChange,
  onSend,
  onVoiceInput,
  onUploadClick,
}) => {
  return (
    <div style={{ padding: '10px 16px 14px', borderTop: '1px solid var(--line)' }}>
      <div className="chat-input-shell" style={{ padding: '10px 12px 8px' }}>
        <textarea
          className="textarea"
          style={{
            border: 'none',
            padding: 0,
            background: 'transparent',
            minHeight: 40,
            maxHeight: 120,
            resize: 'none',
          }}
          placeholder="输入你的科研问题…（Enter 发送 / Shift+Enter 换行）"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          aria-label="科研问题输入框"
        />
        <div className="row-between" style={{ marginTop: 4 }}>
          <div className="row g-1">
            <button
              type="button"
              className={`btn btn-ghost btn-icon ${recording ? 'dot-pulse' : ''}`}
              style={recording ? { color: 'var(--red)', borderColor: 'var(--red)' } : {}}
              onClick={onVoiceInput}
              title="语音输入"
              aria-label="语音输入"
            >
              <Icon name="mic" size={16} />
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              title="上传附件"
              aria-label="上传附件"
              onClick={onUploadClick}
            >
              <Icon name="upload" size={16} />
            </button>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onSend}
            disabled={streaming || !input.trim()}
            aria-label="发送消息"
          >
            {streaming ? <span className="spinner" /> : <Icon name="send" size={15} />}
            发送
          </button>
        </div>
      </div>
      <div className="text-xs text-muted text-center mt-1">
        内容由 AI 生成，请注意甄别与核实
      </div>
    </div>
  );
};
