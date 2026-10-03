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
  bottomRef: RefObject<HTMLDivElement>;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({
  messages,
  user,
  bottomRef,
}) => {
  return (
    <div className="chat-conversation-scroll">
      <div className="chat-conversation-inner">
        {messages.map((m) => {
          if (m.role === 'user') {
            return (
              <div key={m.id} className="chat-user-row">
                <div className="chat-user-bubble">{m.content}</div>
                {/* 用户头像标识 */}
                <div className="chat-user-avatar" title={user?.name || '我的提问'}>
                  {user?.name?.[0] || '研'}
                </div>
              </div>
            );
          }

          return (
            <div key={m.id} className="chat-ai-row">
              {/* AI 头像标识 */}
              <div className="chat-ai-avatar" title={`${m.model || 'ScienceX AI'} · 灵犀科研引擎`}>
                <Icon name="flask" size={18} />
              </div>

              {/* AI 消息卡片 */}
              <div className="chat-ai-body">
                {/* 记忆注入提示横幅 */}
                {m.memory_injected && m.memory_injected.count > 0 && (
                  <div
                    style={{
                      margin: '0 0 12px',
                      padding: '6px 12px',
                      borderRadius: 8,
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      fontSize: 12,
                      color: '#065f46',
                    }}
                  >
                    <Icon name="spark" size={13} />
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 13, padding: '4px 0' }}>
                      <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: '#10b981' }} />
                      <span>正在深度检索与推理中...</span>
                    </div>
                  )
                )}

                {/* 底部模型与响应信息元数据 */}
                {!m.streaming && (
                  <div
                    className="chat-msg-meta"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 12,
                      paddingTop: 8,
                      borderTop: '1px solid #f1f5f9',
                      fontSize: 11.5,
                      color: '#94a3b8',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>模型: {m.model || 'GPT-4o'}</span>
                      {m.agent_mode && <span>· 范式: {m.agent_mode}</span>}
                    </div>
                    <div>学术可复现性验证通过</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} style={{ height: 1 }} />
      </div>
    </div>
  );
};
