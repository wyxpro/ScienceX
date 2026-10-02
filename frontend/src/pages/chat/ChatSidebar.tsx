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
}) => {
  return (
    <div
      className="card"
      style={{
        padding: 12,
        height: 'clamp(500px, 58vh, 620px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <button
        className="btn btn-primary btn-block btn-sm"
        onClick={onNewConv}
        aria-label="创建新对话"
      >
        <Icon name="plus" size={14} />
        新对话
      </button>

      <div style={{ position: 'relative', margin: '10px 0' }}>
        <span style={{ position: 'absolute', left: 10, top: 8, color: 'var(--muted)' }}>
          <Icon name="search" size={14} />
        </span>
        <input
          className="input"
          style={{ paddingLeft: 32, fontSize: 12.5 }}
          placeholder="搜索会话"
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          aria-label="搜索历史会话"
        />
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {convs === null ? (
          <div style={{ padding: 8 }}>
            <Skeleton lines={4} />
          </div>
        ) : filteredConvs.length === 0 ? (
          <div className="text-small text-muted text-center" style={{ padding: 18 }}>
            暂无会话
          </div>
        ) : (
          filteredConvs.map((c) => (
            <div
              key={c.id}
              onClick={() => onOpenConv(c.id)}
              style={{
                padding: '9px 10px',
                borderRadius: 9,
                cursor: 'pointer',
                marginBottom: 3,
                transition: 'all .15s',
                background: activeConv === c.id ? 'var(--brand-soft)' : 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  activeConv === c.id ? 'var(--brand-soft)' : 'var(--bg-deep)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  activeConv === c.id ? 'var(--brand-soft)' : 'transparent';
              }}
            >
              <div className="row g-2">
                <Icon
                  name="chat"
                  size={13}
                  style={{ color: 'var(--muted)', flex: 'none', marginTop: 2 }}
                />
                <div className="grow ellipsis text-small fw-bold">{c.title}</div>
                <span className="row" style={{ gap: 2 }}>
                  <button
                    className="btn btn-ghost btn-icon"
                    style={{ padding: 3 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRenameConv(c.id);
                    }}
                    title="重命名会话"
                    aria-label="重命名会话"
                  >
                    <Icon name="edit" size={12} />
                  </button>
                  <button
                    className="btn btn-ghost btn-icon"
                    style={{ padding: 3, color: 'var(--red)' }}
                    onClick={(e) => onRemoveConv(c.id, e)}
                    title="删除会话"
                    aria-label="删除会话"
                  >
                    <Icon name="trash" size={12} />
                  </button>
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
