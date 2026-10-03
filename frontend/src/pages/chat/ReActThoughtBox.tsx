import React, { useState } from 'react';
import Icon from '../../components/Icon';
import type { ThoughtStep } from '../../types';

interface ReActThoughtBoxProps {
  thoughts: ThoughtStep[];
}

export const ReActThoughtBox: React.FC<ReActThoughtBoxProps> = ({ thoughts }) => {
  const [open, setOpen] = useState(false);

  if (!thoughts || thoughts.length === 0) return null;

  return (
    <div
      style={{
        margin: '8px 0 12px',
        borderRadius: 10,
        border: '1px solid var(--line)',
        background: 'var(--panel)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          background: 'rgba(245, 158, 11, 0.06)',
          borderBottom: open ? '1px solid var(--line)' : 'none',
        }}
        onClick={() => setOpen(!open)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: 'rgba(245, 158, 11, 0.2)',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="compass" size={13} />
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>
            ReAct 学术思维推演链
          </span>
          <span
            style={{
              fontSize: 10.5,
              padding: '1px 6px',
              borderRadius: 10,
              background: '#f59e0b22',
              color: '#d97706',
              fontWeight: 600,
            }}
          >
            {thoughts.length} 轮推演
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            {open ? '收起推导过程' : '查看完整思考与工具调用'}
          </span>
          <Icon name={open ? 'chevronUp' : 'chevronDown'} size={13} />
        </div>
      </div>

      {open && (
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {thoughts.map((item, idx) => (
            <div
              key={idx}
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                background: 'var(--card)',
                border: '1px solid var(--line)',
                fontSize: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="spark" size={12} />
                  第 {item.round || idx + 1} 轮推导
                </span>
                {item.latency_ms && (
                  <span style={{ fontSize: 10.5, color: 'var(--muted)' }} className="mono">
                    耗时 {item.latency_ms}ms
                  </span>
                )}
              </div>

              {/* Thought */}
              <div style={{ margin: '4px 0', color: 'var(--ink)', lineHeight: 1.5 }}>
                <span style={{ fontWeight: 600, color: 'var(--muted)', marginRight: 6 }}>
                  💭 Thought:
                </span>
                {item.text}
              </div>

              {/* Action */}
              {item.action && (
                <div
                  style={{
                    margin: '6px 0',
                    padding: '4px 8px',
                    borderRadius: 6,
                    background: 'var(--panel)',
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: '#6366f1',
                    borderLeft: '2px solid #6366f1',
                    wordBreak: 'break-all',
                  }}
                >
                  <span style={{ fontWeight: 700, color: 'var(--ink)', marginRight: 6 }}>
                    ⚡ Action:
                  </span>
                  {item.action}
                </div>
              )}

              {/* Observation */}
              {item.observation && (
                <div
                  style={{
                    margin: '4px 0 0',
                    padding: '4px 8px',
                    borderRadius: 6,
                    background: 'rgba(16, 185, 129, 0.05)',
                    fontSize: 11.5,
                    color: '#065f46',
                    borderLeft: '2px solid #10b981',
                  }}
                >
                  <span style={{ fontWeight: 700, color: '#047857', marginRight: 6 }}>
                    👁️ Observation:
                  </span>
                  {item.observation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
