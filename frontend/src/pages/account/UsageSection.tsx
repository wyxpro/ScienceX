import React from 'react';
import Icon from '../../components/Icon';
import { BarChart, LineChart } from '../../components/charts';
import { Empty, Progress } from '../../components/ui';
import { VirtualList } from '../../components/VirtualList';

interface UsageData {
  summary: {
    total_tokens: number;
    total_calls: number;
    total_cost: number | string;
    period_days: number;
  };
  by_day: Array<{ date: string; tokens: number; calls?: number; cost?: number }>;
  by_model: Array<{ model: string; tokens: number; calls: number; cost: number | string }>;
  by_scene: Array<{ scene: string; calls: number }>;
}

interface UsageSectionProps {
  usage: UsageData | null;
  range: number;
  onRangeChange: (d: number) => void;
}

export const UsageSection: React.FC<UsageSectionProps> = ({
  usage,
  range,
  onRangeChange,
}) => {
  return (
    <div className="anim-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="row-between">
        <div className="row g-1">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              className={`tag ${range === d ? 'tag-green' : 'tag-outline'}`}
              style={{ cursor: 'pointer', border: 'none' }}
              onClick={() => onRangeChange(d)}
              aria-label={`切换为最近 ${d} 天用量统计`}
            >
              近 {d} 天
            </button>
          ))}
        </div>
      </div>

      {!usage ? (
        <Empty icon="chart" text="加载中…" />
      ) : (
        <>
          <div
            className="grid"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}
          >
            {[
              {
                label: '总 Token 消耗',
                value: usage.summary.total_tokens.toLocaleString(),
                icon: 'zap',
              },
              {
                label: 'API 调用次数',
                value: usage.summary.total_calls.toLocaleString(),
                icon: 'cpu',
              },
              { label: '总费用', value: `¥${usage.summary.total_cost}`, icon: 'card' },
              { label: '统计周期', value: `${usage.summary.period_days} 天`, icon: 'clock' },
            ].map((s) => (
              <div key={s.label} className="card card-pad">
                <div className="row g-1 text-xs text-muted mb-1">
                  <Icon name={s.icon as any} size={12} />
                  {s.label}
                </div>
                <div className="mono fw-bold" style={{ fontSize: 20 }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          <div className="card card-pad">
            <div className="text-xs text-muted mb-2 fw-bold">每日 Token 消耗趋势</div>
            <LineChart
              series={[
                {
                  name: 'Token',
                  data: usage.by_day.map((d) => d.tokens),
                  color: 'var(--brand)',
                },
              ]}
              labels={usage.by_day.map((d) => d.date.slice(5))}
              height={180}
              yFormat={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
            />
          </div>

          <div
            className="grid"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}
          >
            <div className="card card-pad">
              <div className="text-xs text-muted mb-2 fw-bold">分模型用量</div>
              <BarChart
                data={usage.by_model.map((m) => ({ label: m.model, value: m.tokens }))}
                height={160}
                format={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
                }
              />
              <div className="mt-2">
                {usage.by_model.map((m) => (
                  <div
                    key={m.model}
                    className="row-between text-xs"
                    style={{ padding: '3px 0' }}
                  >
                    <span>{m.model}</span>
                    <span className="text-muted mono">
                      {m.calls} 次 · ¥{m.cost}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card card-pad">
              <div className="text-xs text-muted mb-2 fw-bold">分场景调用</div>
              {usage.by_scene.map((s) => (
                <div key={s.scene} style={{ marginBottom: 10 }}>
                  <div className="row-between text-xs mb-1">
                    <span>{s.scene}</span>
                    <span className="mono text-muted">{s.calls} 次</span>
                  </div>
                  <Progress
                    value={
                      (s.calls /
                        Math.max(...usage.by_scene.map((x) => x.calls))) *
                      100
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 每日详细日志 (虚拟化列表演示：当天数多时流畅滚动) */}
          {usage.by_day && usage.by_day.length > 0 && (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div
                className="text-xs text-muted fw-bold"
                style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)' }}
              >
                每日用量明细日志（共 {usage.by_day.length} 条记录）
              </div>
              {usage.by_day.length > 40 ? (
                <VirtualList
                  items={usage.by_day}
                  itemHeight={38}
                  containerHeight={260}
                  renderItem={(d) => (
                    <div
                      key={d.date}
                      className="row-between text-xs"
                      style={{
                        padding: '10px 16px',
                        borderBottom: '1px solid var(--line)',
                        alignItems: 'center',
                      }}
                    >
                      <span className="mono text-muted">{d.date}</span>
                      <span className="fw-bold">{d.tokens.toLocaleString()} tokens</span>
                      <span className="text-muted mono">{d.calls ?? '-'} 次</span>
                    </div>
                  )}
                />
              ) : (
                <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                  {usage.by_day.map((d) => (
                    <div
                      key={d.date}
                      className="row-between text-xs"
                      style={{
                        padding: '10px 16px',
                        borderBottom: '1px solid var(--line)',
                        alignItems: 'center',
                      }}
                    >
                      <span className="mono text-muted">{d.date}</span>
                      <span className="fw-bold">{d.tokens.toLocaleString()} tokens</span>
                      <span className="text-muted mono">{d.calls ?? '-'} 次</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
