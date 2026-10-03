import React, { useState } from 'react';
import Icon from '../../components/Icon';
import { useToast } from '../../components/ui';
import { useIsMobile } from '../../hooks/useIsMobile';

interface CodeActResultCardProps {
  chartData: any;
  code?: string;
  stdout?: string;
}

export const CodeActResultCard: React.FC<CodeActResultCardProps> = ({
  chartData,
  code,
  stdout,
}) => {
  const toast = useToast();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<'chart' | 'code' | 'log'>('chart');

  if (!chartData && !code) return null;

  const copyCode = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      toast('Python 代码已复制到剪贴板');
    }
  };

  const isBarChart = chartData?.type === 'ablation_bar';
  const isConfusionMatrix = chartData?.type === 'confusion_matrix';

  return (
    <div
      style={{
        margin: '12px 0 16px',
        borderRadius: 12,
        border: '1px solid var(--line)',
        background: 'var(--card)',
        boxShadow: '0 4px 16px -4px rgba(0, 0, 0, 0.06)',
        overflow: 'hidden',
      }}
    >
      {/* 选项卡栏 */}
      <div
        className="chat-card-head"
        style={{
          padding: '6px 12px',
          background: 'var(--panel)',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div className="chat-card-head" style={{ display: 'flex', gap: 4 }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{
              fontSize: 12,
              fontWeight: tab === 'chart' ? 700 : 500,
              background: tab === 'chart' ? 'var(--card)' : 'transparent',
              color: tab === 'chart' ? 'var(--brand-strong)' : 'var(--muted)',
              border: tab === 'chart' ? '1px solid var(--line)' : 'none',
            }}
            onClick={() => setTab('chart')}
          >
            <Icon name="chart" size={13} />
            图表可视化
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{
              fontSize: 12,
              fontWeight: tab === 'code' ? 700 : 500,
              background: tab === 'code' ? 'var(--card)' : 'transparent',
              color: tab === 'code' ? 'var(--brand-strong)' : 'var(--muted)',
              border: tab === 'code' ? '1px solid var(--line)' : 'none',
            }}
            onClick={() => setTab('code')}
          >
            <Icon name="terminal" size={13} />
            Python 脚本
          </button>
          {stdout && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{
                fontSize: 12,
                fontWeight: tab === 'log' ? 700 : 500,
                background: tab === 'log' ? 'var(--card)' : 'transparent',
                color: tab === 'log' ? 'var(--brand-strong)' : 'var(--muted)',
                border: tab === 'log' ? '1px solid var(--line)' : 'none',
              }}
              onClick={() => setTab('log')}
            >
              <Icon name="doc" size={13} />
              控制台输出
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          {tab === 'code' && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 11 }}
              onClick={copyCode}
            >
              <Icon name="copy" size={12} />
              复制代码
            </button>
          )}
          <span
            style={{
              fontSize: 10.5,
              padding: '2px 6px',
              borderRadius: 4,
              background: 'rgba(6, 182, 212, 0.1)',
              color: '#0891b2',
              fontWeight: 600,
            }}
          >
            CodeAct Sandbox 3.12
          </span>
        </div>
      </div>

      {/* 视图 1: 图表渲染 */}
      {tab === 'chart' && (
        <div style={{ padding: '16px 20px', background: 'var(--card)' }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
              {chartData?.title || '实验数据可视化分析'}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
              采用严谨学术三线口径 · 包含 3 组随机种子 (7, 13, 42) 均值与标准差误差棒
            </div>
          </div>

          {/* 消融实验双柱状图 */}
          {isBarChart && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 16,
                  marginBottom: 10,
                  fontSize: 11.5,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 2, background: '#10b981' }} />
                  <span style={{ fontWeight: 600 }}>UF1 得分</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 2, background: '#3b82f6' }} />
                  <span style={{ fontWeight: 600 }}>UAR 得分</span>
                </div>
              </div>

              {/* 柱状图容器 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {chartData.configs.map((config: string, idx: number) => {
                  const uf1 = chartData.uf1[idx];
                  const uar = chartData.uar[idx];
                  const uf1Pct = Math.round(((uf1.mean - 0.58) / (0.76 - 0.58)) * 100);
                  const uarPct = Math.round(((uar.mean - 0.58) / (0.76 - 0.58)) * 100);

                  return (
                    <div key={config} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: isMobile ? 96 : 150,
                          fontSize: 12,
                          fontWeight: 600,
                          textAlign: 'right',
                          color: 'var(--ink)',
                          flexShrink: 0,
                        }}
                        className="ellipsis"
                      >
                        {config}
                      </div>

                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {/* UF1 Bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div
                            style={{
                              flex: 1,
                              height: 14,
                              borderRadius: 4,
                              background: 'var(--panel)',
                              overflow: 'hidden',
                              display: 'flex',
                            }}
                          >
                            <div
                              style={{
                                width: `${uf1Pct}%`,
                                background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                                borderRadius: 4,
                                transition: 'width 0.6s ease',
                              }}
                            />
                          </div>
                          <span style={{ width: 85, fontSize: 11, fontWeight: 700, color: '#059669' }} className="mono">
                            {uf1.mean.toFixed(4)} <span style={{ fontSize: 9.5, color: 'var(--muted)' }}>±{(uf1.std * 1000).toFixed(1)}m</span>
                          </span>
                        </div>

                        {/* UAR Bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div
                            style={{
                              flex: 1,
                              height: 14,
                              borderRadius: 4,
                              background: 'var(--panel)',
                              overflow: 'hidden',
                              display: 'flex',
                            }}
                          >
                            <div
                              style={{
                                width: `${uarPct}%`,
                                background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
                                borderRadius: 4,
                                transition: 'width 0.6s ease',
                              }}
                            />
                          </div>
                          <span style={{ width: 85, fontSize: 11, fontWeight: 700, color: '#2563eb' }} className="mono">
                            {uar.mean.toFixed(4)} <span style={{ fontSize: 9.5, color: 'var(--muted)' }}>±{(uar.std * 1000).toFixed(1)}m</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {chartData.insights && (
                <div
                  style={{
                    marginTop: 14,
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'var(--panel)',
                    borderLeft: '3px solid #10b981',
                    fontSize: 11.5,
                  }}
                >
                  <div style={{ fontWeight: 700, color: '#047857', marginBottom: 4 }}>
                    📌 统计推断与核心发现:
                  </div>
                  {chartData.insights.map((ins: string, i: number) => (
                    <div key={i} style={{ color: 'var(--ink)', lineHeight: 1.5 }}>
                      • {ins}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 混淆矩阵热力图 */}
          {isConfusionMatrix && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '100%', overflowX: 'auto' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${chartData.classes.length}, 110px)`,
                  gap: 4,
                  margin: '10px 0',
                }}
              >
                {chartData.matrix.map((row: number[], rIdx: number) =>
                  row.map((val: number, cIdx: number) => {
                    const isDiagonal = rIdx === cIdx;
                    return (
                      <div
                        key={`${rIdx}-${cIdx}`}
                        style={{
                          height: 70,
                          borderRadius: 6,
                          background: isDiagonal
                            ? `rgba(59, 130, 246, ${val / 100})`
                            : `rgba(239, 68, 68, ${val / 50})`,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isDiagonal ? '#fff' : 'var(--ink)',
                          border: '1px solid var(--line)',
                        }}
                      >
                        <span style={{ fontSize: 14, fontWeight: 700 }} className="mono">
                          {val}%
                        </span>
                        <span style={{ fontSize: 9.5, opacity: 0.85 }}>
                          {chartData.classes[rIdx].slice(0, 3)} ➔ {chartData.classes[cIdx].slice(0, 3)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              <div style={{ fontSize: 11.5, color: 'var(--muted)', textAlign: 'center', marginTop: 6 }}>
                总体准确率: <strong style={{ color: '#2563eb' }}>{chartData.metrics?.accuracy}</strong> · Macro F1:{' '}
                <strong style={{ color: '#059669' }}>{chartData.metrics?.macro_f1}</strong> · 平均 UAR:{' '}
                <strong style={{ color: '#7c3aed' }}>{chartData.metrics?.avg_uar}</strong>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 视图 2: Python 脚本源码 */}
      {tab === 'code' && (
        <div style={{ padding: '12px 14px', background: '#0f172a', color: '#e2e8f0' }}>
          <pre
            style={{
              margin: 0,
              fontFamily: 'Consolas, Monaco, monospace',
              fontSize: 11.5,
              lineHeight: 1.6,
              overflowX: 'auto',
            }}
          >
            {code}
          </pre>
        </div>
      )}

      {/* 视图 3: 控制台输出 */}
      {tab === 'log' && (
        <div style={{ padding: '12px 14px', background: 'var(--panel)', fontFamily: 'monospace', fontSize: 11.5 }}>
          <pre style={{ margin: 0, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
            {stdout}
          </pre>
        </div>
      )}
    </div>
  );
};
