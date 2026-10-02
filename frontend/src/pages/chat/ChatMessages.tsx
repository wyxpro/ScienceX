import React, { RefObject } from 'react';
import Icon from '../../components/Icon';
import Markdown from '../../components/Markdown';
import type { ChatMessage, User } from '../../types';
import { PlanFlowCard } from './PlanFlowCard';
import { ReActThoughtBox } from './ReActThoughtBox';
import { CodeActResultCard } from './CodeActResultCard';
import { McpPapersCard } from './McpPapersCard';

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
                <div className="chat-bubble-user lobster-bubble-user">{m.content}</div>
              ) : (
                <div className="chat-bubble-ai lobster-bubble-ai" style={{ width: '100%', maxWidth: '900px' }}>
                  {/* 记忆注入横幅 */}
                  {m.memory_injected && m.memory_injected.count > 0 && (
                    <div
                      style={{
                        margin: '0 0 10px',
                        padding: '5px 10px',
                        borderRadius: 6,
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 11,
                        color: '#065f46',
                      }}
                    >
                      <Icon name="spark" size={12} />
                      <span>
                        已自动注入 <strong>{m.memory_injected.count} 条</strong> 课题组长期记忆与当前阶段摘要
                      </span>
                    </div>
                  )}

                  {/* 灵寻 (LingSeek) 任务规划流看板 */}
                  {m.plan && <PlanFlowCard plan={m.plan} />}

                  {/* ReAct 思考与工具推演链 */}
                  {m.thoughts && m.thoughts.length > 0 && (
                    <ReActThoughtBox thoughts={m.thoughts} />
                  )}

                  {/* CodeAct 实验代码沙箱与消融图表 */}
                  {(m.chart_data || m.code) && (
                    <CodeActResultCard
                      chartData={m.chart_data}
                      code={m.code}
                      stdout={m.chart_data?.insights ? undefined : m.chart_data?.stdout}
                    />
                  )}

                  {/* arXiv 学术文献卡片 (MCP) */}
                  {m.papers && m.papers.length > 0 && (
                    <McpPapersCard papers={m.papers} />
                  )}

                  {/* 主文本流 */}
                  {m.content ? (
                    <Markdown
                      text={m.content}
                      className={m.streaming ? 'cursor-blink' : ''}
                    />
                  ) : (
                    m.streaming && (
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
                    )
                  )}

                  {/* 底部元信息 (模型名 + 智能体范式) */}
                  {!m.streaming && (m.model || m.agent_mode) && (
                    <div
                      className="text-xs text-muted mt-2"
                      style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                    >
                      {m.model && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Icon name="cpu" size={11} />
                          {m.model}
                        </div>
                      )}
                      {m.agent_mode && (
                        <div
                          style={{
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: 'var(--panel)',
                            fontSize: 10.5,
                            color: 'var(--muted)',
                          }}
                        >
                          模式: {m.agent_mode}
                        </div>
                      )}
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
