import React, { useMemo } from 'react';
import Icon, { type IconName } from '../../components/Icon';
import { Donut, LineChart } from '../../components/charts';
import { Empty, Tag } from '../../components/ui';

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

const fmtK = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : String(Math.round(v)));

const MODEL_COLORS = ['var(--brand)', 'var(--accent)', 'var(--gold)', 'var(--blue-safe)', '#5e8f7f', 'var(--red)'];
const SCENE_ICONS: Record<string, IconName> = {
  chat: 'chat', 对话: 'chat', 文献检索: 'search', 文献: 'book', 综述: 'book', 图表生成: 'chart', 图表: 'chart',
  实验设计: 'flask', 数据分析: 'chart', 论文写作: 'pen', 审稿: 'award', 投稿: 'mail', 知识库: 'db',
};

export const UsageSection: React.FC<UsageSectionProps> = ({
  usage,
  range,
  onRangeChange,
}) => {
  /* 汇总派生指标：峰值 / 日均 / 最近环比 */
  const derived = useMemo(() => {
    if (!usage?.by_day?.length) return null;
    const days = usage.by_day;
    const tokens = days.map((d) => d.tokens);
    const peak = Math.max(...tokens);
    const avg = tokens.reduce((a, b) => a + b, 0) / tokens.length;
    const last = days[days.length - 1];
    const prev = days.length > 1 ? days[days.length - 2] : null;
    const delta = prev && prev.tokens > 0 ? ((last.tokens - prev.tokens) / prev.tokens) * 100 : null;
    return { peak, avg, last, delta, peakDate: days[tokens.indexOf(peak)].date };
  }, [usage]);

  return (
    <div className="anim-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="row-between wrap g-2">
        <span className="text-xs text-muted">
          <Icon name="clock" size={12} /> 统计口径：最近 {range} 天的模型调用与费用，数据每日 00:00 归档
        </span>
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
          {/* ===== 核心指标卡 ===== */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
            {[
              {
                label: '总 Token 消耗', value: fmtK(usage.summary.total_tokens), icon: 'zap' as IconName,
                hint: derived ? `日均 ${fmtK(derived.avg)} · 峰值 ${fmtK(derived.peak)}` : '',
                extra: derived?.delta != null ? (
                  <Tag color={derived.delta >= 0 ? 'amber' : 'green'}>
                    <Icon name="arrowUp" size={10} style={{ transform: derived.delta < 0 ? 'rotate(180deg)' : undefined }} />
                    {Math.abs(derived.delta).toFixed(0)}% 环比昨日
                  </Tag>
                ) : undefined,
              },
              {
                label: 'API 调用次数', value: usage.summary.total_calls.toLocaleString(), icon: 'cpu' as IconName,
                hint: derived ? `日均 ${fmtK(Math.round(usage.summary.total_calls / usage.summary.period_days))} 次` : '',
              },
              {
                label: '总费用', value: `¥${usage.summary.total_cost}`, icon: 'card' as IconName,
                hint: `折合 ¥${(Number(usage.summary.total_cost) / usage.summary.period_days).toFixed(2)}/天`,
              },
              {
                label: '统计周期', value: `${usage.summary.period_days} 天`, icon: 'calendar' as IconName,
                hint: derived ? `峰值出现在 ${derived.peakDate.slice(5)}` : '',
              },
            ].map((s, i) => (
              <div key={s.label} className="card card-pad anim-in" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6, animationDelay: `${i * 50}ms` }}>
                <div className="row g-1 text-xs text-muted">
                  <span style={{ width: 22, height: 22, borderRadius: 7, background: 'var(--brand-soft)', color: 'var(--brand-strong)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={s.icon} size={12} />
                  </span>
                  {s.label}
                </div>
                <div className="mono fw-bold" style={{ fontSize: 22, lineHeight: 1.2 }}>{s.value}</div>
                <div className="row g-1 wrap" style={{ alignItems: 'center', minHeight: 20 }}>
                  {s.extra}
                  {s.hint && <span className="text-xs text-muted ellipsis">{s.hint}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* ===== 趋势图 ===== */}
          <div className="card card-pad">
            <div className="row-between wrap g-2 mb-2">
              <span className="card-title"><Icon name="chart" size={15} /> 每日 Token 消耗趋势</span>
              {derived && (
                <div className="row g-2 text-xs text-muted">
                  <span>峰值 <b className="mono" style={{ color: 'var(--ink)' }}>{fmtK(derived.peak)}</b></span>
                  <span>· 均值 <b className="mono" style={{ color: 'var(--ink)' }}>{fmtK(derived.avg)}</b></span>
                  <span>· 昨日 <b className="mono" style={{ color: 'var(--brand-strong)' }}>{fmtK(derived.last.tokens)}</b></span>
                </div>
              )}
            </div>
            <LineChart
              series={[
                {
                  name: 'Token',
                  data: usage.by_day.map((d) => d.tokens),
                  color: 'var(--brand)',
                },
              ]}
              labels={usage.by_day.map((d) => d.date.slice(5))}
              height={190}
              yFormat={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
            />
          </div>

          {/* ===== 分模型 + 分场景 ===== */}
          <div
            className="grid"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignItems: 'start' }}
          >
            <div className="card card-pad">
              <div className="row-between mb-2">
                <span className="card-title" style={{ fontSize: 13.5 }}><Icon name="cpu" size={14} /> 分模型用量</span>
                <span className="text-xs text-muted">{usage.by_model.length} 个模型</span>
              </div>
              {usage.by_model.map((m, i) => {
                const maxTok = Math.max(...usage.by_model.map((x) => x.tokens)) || 1;
                return (
                  <div key={m.model} style={{ marginBottom: i === usage.by_model.length - 1 ? 0 : 12 }}>
                    <div className="row-between text-xs mb-1">
                      <span className="row g-1" style={{ alignItems: 'center', minWidth: 0 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: MODEL_COLORS[i % MODEL_COLORS.length], flex: 'none' }} />
                        <span className="mono ellipsis" style={{ fontWeight: 600 }}>{m.model}</span>
                      </span>
                      <span className="text-muted mono" style={{ flex: 'none' }}>{fmtK(m.tokens)} tk · {m.calls} 次 · ¥{m.cost}</span>
                    </div>
                    <div style={{ height: 7, borderRadius: 4, background: 'var(--bg-deep)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 4, width: `${(m.tokens / maxTok) * 100}%`,
                        background: `linear-gradient(90deg, ${MODEL_COLORS[i % MODEL_COLORS.length]}, ${MODEL_COLORS[i % MODEL_COLORS.length]}99)`,
                        transition: 'width .7s var(--ease)',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="card card-pad">
              <div className="row-between mb-2">
                <span className="card-title" style={{ fontSize: 13.5 }}><Icon name="grid" size={14} /> 分场景调用</span>
                <span className="text-xs text-muted">共 {usage.by_scene.reduce((s, x) => s + x.calls, 0).toLocaleString()} 次</span>
              </div>
              <div className="row g-3 wrap" style={{ alignItems: 'center' }}>
                <Donut data={usage.by_scene.map((s, i) => ({ label: s.scene, value: s.calls, color: MODEL_COLORS[i % MODEL_COLORS.length] }))} size={140} inner={62} />
                <div className="grow" style={{ minWidth: 150 }}>
                  {usage.by_scene.map((s, i) => {
                    const total = usage.by_scene.reduce((a, b) => a + b.calls, 0) || 1;
                    return (
                      <div key={s.scene} className="row-between text-xs" style={{ padding: '4px 0', borderBottom: i < usage.by_scene.length - 1 ? '1px dashed var(--line)' : 'none' }}>
                        <span className="row g-1" style={{ alignItems: 'center' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: MODEL_COLORS[i % MODEL_COLORS.length], flex: 'none' }} />
                          <Icon name={SCENE_ICONS[s.scene] || 'spark'} size={11} style={{ color: 'var(--muted)' }} />
                          {s.scene}
                        </span>
                        <span className="mono text-muted">{s.calls} 次 · {((s.calls / total) * 100).toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ===== 每日明细表 ===== */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="row-between" style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)' }}>
              <span className="fw-bold text-small"><Icon name="file" size={14} /> 每日用量明细</span>
              <span className="text-xs text-muted">共 {usage.by_day.length} 天 · 峰值日已高亮</span>
            </div>
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1, color: 'var(--muted)', fontSize: 11.5 }}>
                    {['日期', '强度', 'Token 消耗', '调用次数', '费用'].map((h) => (
                      <th key={h} style={{ textAlign: h === '日期' ? 'left' : 'right', padding: '8px 16px', borderBottom: '1px solid var(--line)', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...usage.by_day].reverse().map((d) => {
                    const isPeak = derived && d.tokens === derived.peak;
                    const maxTok = derived?.peak || 1;
                    return (
                      <tr key={d.date} style={{ background: isPeak ? 'var(--brand-softer)' : undefined }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-deep)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = isPeak ? 'var(--brand-softer)' : 'transparent')}>
                        <td className="mono" style={{ padding: '9px 16px', borderBottom: '1px solid var(--line)', color: 'var(--ink-2)' }}>
                          {d.date}{isPeak && <span className="tag tag-green" style={{ marginLeft: 8, fontSize: 10 }}><Icon name="star" size={9} /> 峰值</span>}
                        </td>
                        <td style={{ padding: '9px 16px', borderBottom: '1px solid var(--line)', width: 90 }}>
                          <div style={{ height: 5, borderRadius: 3, background: 'var(--bg-deep)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(d.tokens / maxTok) * 100}%`, borderRadius: 3, background: 'var(--brand)' }} />
                          </div>
                        </td>
                        <td className="mono" style={{ padding: '9px 16px', borderBottom: '1px solid var(--line)', textAlign: 'right', fontWeight: 700 }}>{d.tokens.toLocaleString()}</td>
                        <td className="mono" style={{ padding: '9px 16px', borderBottom: '1px solid var(--line)', textAlign: 'right', color: 'var(--muted)' }}>{d.calls ?? '-'}</td>
                        <td className="mono" style={{ padding: '9px 16px', borderBottom: '1px solid var(--line)', textAlign: 'right', color: 'var(--muted)' }}>{d.cost != null ? `¥${d.cost}` : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
