import React, { useState } from 'react';
import Icon from '../../components/Icon';
import type { PlanFlowData } from '../../types';

interface PlanFlowCardProps {
  plan: PlanFlowData;
  onRetryStep?: (stepIndex: number) => void;
}

export const PlanFlowCard: React.FC<PlanFlowCardProps> = ({ plan, onRetryStep }) => {
  const [expanded, setExpanded] = useState(true);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);

  const isCompleted = plan.status === 'completed' || plan.percent >= 100;
  const isRunning = plan.status === 'running' || (plan.percent > 0 && plan.percent < 100);

  return (
    <div
      style={{
        margin: '10px 0 14px',
        borderRadius: 12,
        border: '1px solid var(--line)',
        background: 'linear-gradient(180deg, var(--card) 0%, rgba(245, 247, 250, 0.4) 100%)',
        boxShadow: '0 4px 14px -4px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
      }}
    >
      {/* 头部：标题、进度条与操作 */}
      <div
        style={{
          padding: '10px 14px',
          background: 'var(--panel)',
          borderBottom: expanded ? '1px solid var(--line)' : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 8,
              background: isCompleted
                ? 'rgba(16, 185, 129, 0.15)'
                : 'rgba(99, 102, 241, 0.15)',
              color: isCompleted ? '#10b981' : '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {isRunning ? (
              <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} />
            ) : isCompleted ? (
              <Icon name="check" size={14} />
            ) : (
              <Icon name="layers" size={14} />
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }} className="ellipsis">
                {plan.title || '灵寻 (LingSeek) 科研任务规划执行流'}
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontWeight: 600,
                  background: isCompleted
                    ? 'rgba(16, 185, 129, 0.12)'
                    : isRunning
                    ? 'rgba(99, 102, 241, 0.12)'
                    : 'var(--line)',
                  color: isCompleted ? '#10b981' : isRunning ? '#6366f1' : 'var(--muted)',
                }}
              >
                {isCompleted ? '已全部完成' : isRunning ? '正在全流程执行' : '规划就绪'}
              </span>
            </div>

            {/* 紧凑进度条 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 4,
              }}
            >
              <div
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  background: 'var(--line)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${plan.percent}%`,
                    background: isCompleted
                      ? '#10b981'
                      : 'linear-gradient(90deg, #6366f1 0%, #3b82f6 100%)',
                    borderRadius: 2,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: isCompleted ? '#10b981' : '#6366f1' }} className="mono">
                {plan.percent}%
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-icon btn-sm"
          style={{ marginLeft: 12, flexShrink: 0 }}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          title={expanded ? '收起任务看板' : '展开任务看板'}
        >
          <Icon name={expanded ? 'chevronUp' : 'chevronDown'} size={14} />
        </button>
      </div>

      {/* 步骤列表 */}
      {expanded && (
        <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {plan.steps.map((step, idx) => {
            const isStepRunning = step.status === 'running';
            const isStepSuccess = step.status === 'success';
            const isStepWaiting = step.status === 'waiting';
            const isStepFailed = step.status === 'failed';
            const isSelected = activeStepId === step.id;

            return (
              <div
                key={step.id || idx}
                style={{
                  padding: '7px 10px',
                  borderRadius: 8,
                  background: isStepRunning
                    ? 'rgba(99, 102, 241, 0.05)'
                    : isStepSuccess
                    ? 'rgba(16, 185, 129, 0.03)'
                    : 'transparent',
                  border: isStepRunning
                    ? '1px solid rgba(99, 102, 241, 0.25)'
                    : isStepSuccess
                    ? '1px solid rgba(16, 185, 129, 0.2)'
                    : '1px solid transparent',
                  transition: 'all 0.2s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1, minWidth: 0 }}>
                    {/* 状态徽章 */}
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: 1,
                        background: isStepSuccess
                          ? '#10b981'
                          : isStepRunning
                          ? '#6366f1'
                          : isStepFailed
                          ? '#ef4444'
                          : 'var(--line)',
                        color: isStepWaiting ? 'var(--muted)' : '#fff',
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      {isStepRunning ? (
                        <span className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }} />
                      ) : isStepSuccess ? (
                        <Icon name="check" size={11} />
                      ) : isStepFailed ? (
                        '✕'
                      ) : (
                        idx + 1
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: 12.5,
                            fontWeight: isStepRunning ? 700 : 500,
                            color: isStepWaiting ? 'var(--muted)' : 'var(--ink)',
                          }}
                        >
                          {step.title}
                        </span>
                        {step.tool && (
                          <span
                            style={{
                              fontSize: 10,
                              padding: '1px 5px',
                              borderRadius: 4,
                              background: 'var(--line)',
                              color: 'var(--ink)',
                              fontFamily: 'monospace',
                            }}
                          >
                            🛠️ {step.tool}
                          </span>
                        )}
                      </div>

                      {step.desc && (
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                          {step.desc}
                        </div>
                      )}

                      {/* 执行产物预览 */}
                      {step.output && (
                        <div
                          style={{
                            marginTop: 4,
                            padding: '4px 8px',
                            borderRadius: 6,
                            background: 'var(--panel)',
                            fontSize: 11.5,
                            color: 'var(--ink)',
                            borderLeft: '2px solid #10b981',
                          }}
                        >
                          <span style={{ fontWeight: 600, color: '#10b981', marginRight: 4 }}>
                            产物反馈:
                          </span>
                          {step.output}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 重试按钮 */}
                  {isStepFailed && onRetryStep && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11, color: '#ef4444', padding: '2px 6px' }}
                      onClick={() => onRetryStep(idx)}
                    >
                      重试
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
