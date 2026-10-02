import React from 'react';
import Icon from '../../components/Icon';
import type { Conversation } from '../../types';

export interface AgentItem {
  id: string;
  name: string;
  role?: string;
}

interface ChatSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeNav: string;
  onSelectNav: (nav: string) => void;
  selectedAgent: string;
  onSelectAgent: (id: string) => void;
  agents: AgentItem[];
  onAddAgent: () => void;
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
  collapsed,
  onToggleCollapse,
  activeNav,
  onSelectNav,
  selectedAgent,
  onSelectAgent,
  agents,
  onAddAgent,
  convs,
  filteredConvs,
  activeConv,
  onNewConv,
  onOpenConv,
  onRenameConv,
  onRemoveConv,
}) => {
  return (
    <aside className={`lobster-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* 顶部 macOS 红黄绿小圆点 + 侧边栏折叠图标 */}
      <div className="lobster-window-header">
        <div className="lobster-traffic-lights" title="ScienceX Agent Workspace">
          <span className="lobster-dot lobster-dot-red" />
          <span className="lobster-dot lobster-dot-yellow" />
          <span className="lobster-dot lobster-dot-green" />
        </div>
        <button
          type="button"
          className="lobster-sidebar-toggle"
          onClick={onToggleCollapse}
          title={collapsed ? '展开侧栏' : '收起侧栏'}
          aria-label="切换侧边栏"
        >
          <Icon name="layoutSidebar" size={15} />
        </button>
      </div>

      {/* 核心操作导航清单 */}
      <div className="lobster-nav-list">
        <button
          type="button"
          className={`lobster-nav-item ${activeNav === 'new_task' ? 'active' : ''}`}
          onClick={() => {
            onSelectNav('new_task');
            onNewConv();
          }}
          title="创建并开启全新任务"
        >
          <Icon name="pen" size={15} />
          <span>New Task</span>
        </button>

        <button
          type="button"
          className={`lobster-nav-item ${activeNav === 'search' ? 'active' : ''}`}
          onClick={() => onSelectNav('search')}
          title="搜索历史科研任务与会话"
        >
          <Icon name="search" size={15} />
          <span>Search Tasks</span>
        </button>

        <button
          type="button"
          className={`lobster-nav-item ${activeNav === 'scheduled' ? 'active' : ''}`}
          onClick={() => onSelectNav('scheduled')}
          title="学术定时任务（文献推送、模型定期巡检）"
        >
          <Icon name="clock" size={15} />
          <span>Scheduled Tasks</span>
        </button>

        <button
          type="button"
          className={`lobster-nav-item ${activeNav === 'kits' ? 'active' : ''}`}
          onClick={() => onSelectNav('kits')}
          title="科研场景模式套件（Plan-Execute / ReAct / CodeAct 等）"
        >
          <Icon name="grid" size={15} />
          <span>Kits</span>
        </button>

        <button
          type="button"
          className={`lobster-nav-item ${activeNav === 'skills' ? 'active' : ''}`}
          onClick={() => onSelectNav('skills')}
          title="智能体学术技能库"
        >
          <Icon name="sparkles" size={15} />
          <span>Skills</span>
        </button>

        <button
          type="button"
          className={`lobster-nav-item ${activeNav === 'mcp' ? 'active' : ''}`}
          onClick={() => onSelectNav('mcp')}
          title="Model Context Protocol 外部工具与服务"
        >
          <Icon name="link" size={15} />
          <span>MCP</span>
        </button>
      </div>

      {/* My Agents 智能体分组 */}
      <div className="lobster-section-title">
        <span>My Agents</span>
        <button
          type="button"
          className="lobster-section-btn"
          onClick={onAddAgent}
          title="创建自定义智能体"
          aria-label="添加智能体"
        >
          <Icon name="plus" size={13} />
        </button>
      </div>

      <div className="lobster-agents-list">
        {agents.map((agent) => {
          const isSelected = selectedAgent === agent.id;
          return (
            <button
              key={agent.id}
              type="button"
              className={`lobster-agent-item ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectAgent(agent.id)}
            >
              <Icon name="bot" size={15} style={{ color: isSelected ? '#10b981' : '#7d8296' }} />
              <span className="ellipsis">{agent.name}</span>
              {isSelected && <span className="lobster-agent-indicator" />}
            </button>
          );
        })}
      </div>

      {/* 最近任务/会话 */}
      {convs && convs.length > 0 && (
        <div className="lobster-history-block">
          <div className="lobster-history-title">
            <span>RECENT TASKS</span>
            <span style={{ fontSize: 10, opacity: 0.7 }}>{convs.length}</span>
          </div>
          <div style={{ maxHeight: 110, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filteredConvs.slice(0, 6).map((c) => (
              <div
                key={c.id}
                className={`lobster-history-item ${activeConv === c.id ? 'active' : ''}`}
                onClick={() => onOpenConv(c.id)}
                title={c.title}
              >
                <Icon name="chat" size={12} style={{ opacity: 0.6, flexShrink: 0 }} />
                <span className="grow ellipsis">{c.title}</span>
                <span className="row" style={{ gap: 2 }} onClick={(e) => e.stopPropagation()}>
                  <button
                    className="btn btn-ghost btn-icon"
                    style={{ padding: 1, color: '#7c8196', width: 16, height: 16 }}
                    onClick={() => onRenameConv(c.id)}
                    title="重命名"
                  >
                    <Icon name="edit" size={10} />
                  </button>
                  <button
                    className="btn btn-ghost btn-icon"
                    style={{ padding: 1, color: '#ef4444', width: 16, height: 16 }}
                    onClick={(e) => onRemoveConv(c.id, e)}
                    title="删除"
                  >
                    <Icon name="trash" size={10} />
                  </button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
};
