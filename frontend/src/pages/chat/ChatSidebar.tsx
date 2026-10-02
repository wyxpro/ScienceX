import React from 'react';
import Icon from '../../components/Icon';
import { Skeleton } from '../../components/ui';
import type { Conversation } from '../../types';

interface ChatSidebarProps {
  convs: Conversation[] | null;
  filteredConvs: Conversation[];
  activeConv: string | null;
  keyword: string;
  onKeywordChange: (val: string) => void;
  onNewConv: () => void;
  onOpenConv: (id: string) => void;
  onRenameConv: (id: string) => void;
  onRemoveConv: (id: string, e: React.MouseEvent) => void;
  collapsed?: boolean;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  convs,
  filteredConvs,
  activeConv,
  keyword,
  onKeywordChange,
  onNewConv,
  onOpenConv,
  onRenameConv,
  onRemoveConv,
  collapsed = false,
}) => {
  return (
    <aside className={`chat-sidebar-card ${collapsed ? 'collapsed' : ''}`}>
      {/* 新对话按钮 */}
      <button
        className="chat-new-btn"
        onClick={onNewConv}
        aria-label="创建新对话"
      >
        <Icon name="plus" size={15} strokeWidth={2.4} />
        <span>开启新对话</span>
      </button>

      {/* 搜索框 */}
      <div className="chat-search-wrap">
        <span style={{ position: 'absolute', left: 10, top: 8, color: '#94a3b8', display: 'flex' }}>
          <Icon name="search" size={14} />
        </span>
        <input
          placeholder="搜索历史会话..."
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          aria-label="搜索历史会话"
        />
        {keyword && (
          <button
            type="button"
            onClick={() => onKeywordChange('')}
            style={{
              position: 'absolute',
              right: 8,
              top: 7,
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: 2,
            }}
          >
            <Icon name="x" size={12} />
          </button>
        )}
      </div>

      {/* 会话列表 */}
      <div style={{ overflowY: 'auto', flex: 1, paddingRight: 2 }} className="custom-scrollbar">
        {convs === null ? (
          <div style={{ padding: 8 }}>
            <Skeleton lines={5} />
          </div>
        ) : filteredConvs.length === 0 ? (
          <div style={{ padding: '30px 10px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            <Icon name="chat" size={24} style={{ opacity: 0.35, marginBottom: 6 }} />
            <div>暂无历史会话</div>
          </div>
        ) : (
          filteredConvs.map((c) => {
            const isActive = activeConv === c.id;
            return (
              <div
                key={c.id}
                className={`chat-conv-item ${isActive ? 'active' : ''}`}
                onClick={() => onOpenConv(c.id)}
                title={c.title}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0, flex: 1 }}>
                  <Icon
                    name="chat"
                    size={14}
                    style={{
                      color: isActive ? '#059669' : '#94a3b8',
                      flex: 'none',
                    }}
                  />
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: 13,
                    }}
                  >
                    {c.title}
                  </span>
                </div>

                <div className="chat-conv-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="chat-conv-action-btn"
                    onClick={() => onRenameConv(c.id)}
                    title="重命名会话"
                    aria-label="重命名会话"
                  >
                    <Icon name="edit" size={12} />
                  </button>
                  <button
                    type="button"
                    className="chat-conv-action-btn delete"
                    onClick={(e) => onRemoveConv(c.id, e)}
                    title="删除会话"
                    aria-label="删除会话"
                  >
                    <Icon name="trash" size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
