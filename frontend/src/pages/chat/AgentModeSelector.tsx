import React from 'react';
import Icon from '../../components/Icon';
import type { AgentMode } from '../../types';

interface AgentModeSelectorProps {
  currentMode: AgentMode;
  onSelectMode: (mode: AgentMode) => void;
  disabled?: boolean;
}

interface ModeMeta {
  mode: AgentMode;
  name: string;
  en: string;
  desc: string;
  icon: string;
  accent: string;
  bgActive: string;
  badge?: string;
}

const MODES: ModeMeta[] = [
  {
    mode: 'general',
    name: '通用对话',
    en: 'General',
    desc: '记忆注入 · 学术全景分析',
    icon: 'spark',
    accent: '#10b981',
    bgActive: 'rgba(16, 185, 129, 0.12)',
  },
  {
    mode: 'plan_execute',
    name: '任务规划',
    en: 'LingSeek',
    desc: '分步拆解 · 自动化全流程',
    icon: 'layers',
    accent: '#6366f1',
    bgActive: 'rgba(99, 102, 241, 0.12)',
    badge: '灵寻',
  },
  {
    mode: 'react',
    name: '严谨推演',
    en: 'ReAct',
    desc: '思维链推导 · 工具闭环检验',
    icon: 'compass',
    accent: '#f59e0b',
    bgActive: 'rgba(245, 158, 11, 0.12)',
  },
  {
    mode: 'codeact',
    name: '实验代码',
    en: 'CodeAct',
    desc: 'Python 沙箱 · 消融图表可视化',
    icon: 'terminal',
    accent: '#06b6d4',
    bgActive: 'rgba(6, 182, 212, 0.12)',
    badge: '绘图',
  },
  {
    mode: 'mcp',
    name: '学术检索',
    en: 'MCP',
    desc: 'arXiv 直连 · 顶会顶刊抓取',
    icon: 'globe',
    accent: '#8b5cf6',
    bgActive: 'rgba(139, 92, 246, 0.12)',
    badge: 'arXiv',
  },
  {
    mode: 'skill',
    name: '学术技能',
    en: 'Skill',
    desc: '综述大纲 · LaTeX · 实验向导',
    icon: 'zap',
    accent: '#ec4899',
    bgActive: 'rgba(236, 72, 153, 0.12)',
  },
  {
    mode: 'text2sql',
    name: '数据检索',
    en: 'Text2SQL',
    desc: '指标过滤 · SOTA 聚合对比',
    icon: 'database',
    accent: '#14b8a6',
    bgActive: 'rgba(20, 184, 166, 0.12)',
  },
  {
    mode: 'structured',
    name: '结构化产出',
    en: 'Structured',
    desc: 'LaTeX 三线表 · 审稿矩阵',
    icon: 'grid',
    accent: '#3b82f6',
    bgActive: 'rgba(59, 130, 246, 0.12)',
  },
];

export const AgentModeSelector: React.FC<AgentModeSelectorProps> = ({
  currentMode,
  onSelectMode,
  disabled = false,
}) => {
  return (
    <div
      style={{
        padding: '8px 12px',
        background: 'var(--panel)',
        borderBottom: '1px solid var(--line)',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        scrollbarWidth: 'none',
      }}
      className="no-scrollbar"
    >
      <div
        style={{
          display: 'inline-flex',
          gap: 6,
          alignItems: 'center',
          minWidth: 'max-content',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginRight: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--brand-strong)',
              display: 'inline-block',
            }}
          />
          智能体范式
        </span>

        {MODES.map((item) => {
          const isActive = currentMode === item.mode;
          return (
            <button
              key={item.mode}
              type="button"
              disabled={disabled}
              onClick={() => onSelectMode(item.mode)}
              title={`${item.name} (${item.en})：${item.desc}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 10px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: isActive ? 600 : 500,
                border: isActive
                  ? `1px solid ${item.accent}`
                  : '1px solid var(--line)',
                background: isActive ? item.bgActive : 'transparent',
                color: isActive ? item.accent : 'var(--ink)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: isActive
                  ? `0 2px 8px -2px ${item.accent}33`
                  : 'none',
              }}
            >
              <Icon name={item.icon as any} size={13} />
              <span>{item.name}</span>
              {item.badge && (
                <span
                  style={{
                    fontSize: 9.5,
                    padding: '1px 5px',
                    borderRadius: 10,
                    background: isActive ? item.accent : 'var(--line)',
                    color: isActive ? '#fff' : 'var(--muted)',
                    fontWeight: 700,
                    lineHeight: 1.2,
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
