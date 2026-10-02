import React, { RefObject } from 'react';
import Icon from '../../components/Icon';
import Markdown from '../../components/Markdown';
import type { ChatMessage, User } from '../../types';

interface ChatMessagesProps {
  messages: ChatMessage[];
  user: User | null;
  suggestions: [string, string][];
  onSelectSuggestion: (text: string) => void;
  bottomRef: RefObject<HTMLDivElement>;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  user,
  suggestions,
  onSelectSuggestion,
  bottomRef,
}) => {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>
      {messages.length === 0 ? (
        <div
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            className="sb-logo-mark"
            style={{ width: 48, height: 48, marginBottom: 12 }}
          >
            <Icon name="flask" size={24} />
          </div>
          <div className="text-serif" style={{ fontSize: 18, fontWeight: 700 }}>
            下午好，{user?.name || '研究员'}
          </div>
          <div
            className="text-small text-muted mt-1"
            style={{ marginBottom: 18 }}
          >
            今天想让 AI 助理团帮您处理哪项科研工作？
          </div>
          <div
            className="grid grid-2 stagger"
            style={{ width: 'min(580px, 100%)', gap: 10 }}
          >
            {suggestions.map(([ic, text]) => (
              <button
                key={text}
                className="card card-pad card-hover"
                style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  padding: '10px 12px',
                }}
                onClick={() => onSelectSuggestion(text)}
                aria-label={`执行快捷指令: ${text}`}
              >
                <div
                  className="row g-2 items-center"
                  style={{ color: 'var(--brand-strong)' }}
                >
                  <Icon name={ic as any} size={15} />
                  <span className="fw-bold text-small">快捷指令</span>
                </div>
                <div
                  className="text-small text-muted mt-1 clamp2"
                  style={{ lineHeight: 1.4 }}
                >
                  {text}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="col g-3">
          {messages.map((m) => (
            <div
              key={m.id}
              style={{
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              {m.role === 'user' ? (
                <div className="chat-bubble-user">{m.content}</div>
              ) : (
                <div className="chat-bubble-ai">
                  {m.content ? (
                    <Markdown
                      text={m.content}
                      className={m.streaming ? 'cursor-blink' : ''}
                    />
                  ) : (
                    <span
                      style={{
                        display: 'inline-flex',
                        gap: 2,
                        padding: '6px 2px',
                      }}
                      aria-label="正在思考"
                    >
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </span>
                  )}
                  {!m.streaming && m.model && (
                    <div
                      className="text-xs text-muted mt-2"
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Icon name="cpu" size={11} />
                      {m.model}
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
  );
};
