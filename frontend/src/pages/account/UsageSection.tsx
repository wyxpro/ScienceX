import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon, { type IconName } from '../../components/Icon';
import { Donut } from '../../components/charts';
import { Empty, Tag } from '../../components/ui';

interface UsageData {
  summary: {
    total_tokens: number;
    total_calls: number;
    total_cost: number | string;
    period_days: number;
    unpriced_calls?: number;
    unreported_calls?: number;
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

/* ============================================================
 * 每日趋势卡（专业版）：指标切换 · 平滑面积图 · 悬停十字线与明细
 * ============================================================ */
type MetricKey = 'tokens' | 'calls' | 'cost';

const METRICS: Record<MetricKey, { label: string; color: string; short: (v: number) => string; full: (v: number) => string }> = {
  tokens: { label: 'Token', color: 'var(--brand)', short: (v) => fmtK(v), full: (v) => `${Math.round(v).toLocaleString()} tk` },
  calls: { label: '调用次数', color: 'var(--blue-safe)', short: (v) => fmtK(v), full: (v) => `${Math.round(v).toLocaleString()} 次` },
  cost: { label: '费用', color: 'var(--accent)', short: (v) => `¥${fmtK(v)}`, full: (v) => `¥${v.toFixed(2)}` },
};

/* 将最大值向上取整到 1/2/5×10^n 的「整洁」刻度 */
function niceScale(maxV: number, ticks = 4): { step: number; top: number } {
  if (maxV <= 0) return { step: 1, top: 1 };
  const raw = maxV / ticks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  return { step, top: Math.ceil(maxV / step) * step };
}

/* Catmull-Rom → 三次贝塞尔平滑曲线（控制点 y 夹在绘图区内防过冲） */
function smoothPath(pts: { x: number; y: number }[], yMin: number, yMax: number): string {
  const clamp = (v: number) => Math.min(yMax, Math.max(yMin, v));
  if (pts.length < 2) return pts.length === 1 ? `M ${pts[0].x},${pts[0].y}` : '';
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = clamp(p1.y + (p2.y - p0.y) / 6);
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = clamp(p2.y - (p3.y - p1.y) / 6);
    d += ` C ${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

const TrendChart: React.FC<{ byDay: UsageData['by_day']; metric: MetricKey }> = ({ byDay, metric }) => {
  const meta = METRICS[metric];
  const gradId = `grad-${metric}-${React.useId().replace(/[^a-zA-Z0-9-]/g, '')}`;
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [w, setW] = useState(760);
  const [hover, setHover] = useState<number | null>(null);

  /* 容器宽度自适应，保证 1:1 像素坐标（点与文字不变形） */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((es) => {
      const cw = es[0].contentRect.width;
      if (cw > 0) setW(cw);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* 切换指标时重置悬停 */
  useEffect(() => setHover(null), [metric]);

  const H = 248;
  const pad = { l: 50, r: 18, t: 26, b: 30 };
  const iw = Math.max(60, w - pad.l - pad.r);
  const ih = H - pad.t - pad.b;
  const baseY = pad.t + ih;
  const n = byDay.length;

  const values = byDay.map((d) => (metric === 'tokens' ? d.tokens : metric === 'calls' ? d.calls ?? 0 : Number(d.cost ?? 0)));
  const { step, top } = niceScale(Math.max(...values, 0));
  const x = (i: number) => pad.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => pad.t + ih - (Math.min(v, top) / top) * ih;

  const pts = values.map((v, i) => ({ x: x(i), y: y(v) }));
  const linePath = smoothPath(pts, pad.t, baseY);
  const areaPath = n > 1 ? `${linePath} L ${pts[n - 1].x},${baseY} L ${pts[0].x},${baseY} Z` : '';

  const peak = Math.max(...values, 0);
  const peakIdx = values.indexOf(peak);
  const hasPeak = peak > 0 && n > 0;
  const avg = n ? values.reduce((a, b) => a + b, 0) / n : 0;

  /* x 轴标签抽样（约 8 个），始终包含首尾 */
  const labelStep = Math.max(1, Math.ceil(n / 8));
  const xIdxs = Array.from(new Set(byDay.map((_, i) => i).filter((i) => i % labelStep === 0 || i === n - 1)));

  /* y 轴刻度 */
  const yTicks: number[] = [];
  for (let v = 0; v <= top + 1e-9 && yTicks.length <= 7; v += step) yTicks.push(v);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (n === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * w;
    const i = n === 1 ? 0 : Math.round(((mx - pad.l) / iw) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  const hoverD = hover != null ? byDay[hover] : null;
  const tipX = hover != null ? Math.min(Math.max(x(hover), 88), Math.max(88, w - 88)) : 0;

  return (
    <div ref={wrapRef} style={{ position: 'relative', cursor: 'crosshair' }}>
      <svg
        key={metric}
        viewBox={`0 0 ${w} ${H}`}
        width="100%"
        height={H}
        role="img"
        aria-label="每日消耗趋势图"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        style={{ display: 'block' }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" style={{ stopColor: meta.color, stopOpacity: 0.2 }} />
            <stop offset="92%" style={{ stopColor: meta.color, stopOpacity: 0.02 }} />
          </linearGradient>
        </defs>

        {/* 网格 + y 轴刻度 */}
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={pad.l + iw} y1={y(v)} y2={y(v)}
              stroke={v === 0 ? 'var(--line-strong)' : 'var(--line)'} strokeWidth="1"
              strokeDasharray={v === 0 ? undefined : '2 5'} vectorEffect="non-scaling-stroke" />
            <text x={pad.l - 10} y={y(v) + 3.5} textAnchor="end" style={{ fontSize: 10.5, fill: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
              {meta.short(v)}
            </text>
          </g>
        ))}

        {/* x 轴日期 */}
        {xIdxs.map((i) => (
          <text key={i} x={x(i)} y={H - 9} textAnchor="middle"
            style={{ fontSize: 10.5, fill: hover === i ? 'var(--ink)' : 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            {byDay[i].date.slice(5)}
          </text>
        ))}

        {/* 日均参考线 */}
        {avg > 0 && (
          <line x1={pad.l} x2={pad.l + iw} y1={y(avg)} y2={y(avg)}
            stroke="var(--accent)" strokeWidth="1.2" strokeDasharray="6 4" opacity="0.55">
            <title>{`日均 ${meta.full(avg)}`}</title>
          </line>
        )}

        {/* 面积 + 平滑折线（线条生长动画） */}
        {n > 1 && <path d={areaPath} fill={`url(#${gradId})`} />}
        {n > 1 && (
          <path d={linePath} fill="none" stroke={meta.color} strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round" pathLength={1}
            strokeDasharray="1" strokeDashoffset="1"
            style={{ animation: 'dash 1.2s var(--ease) 0.1s both' }} />
        )}
        {n === 1 && <circle cx={x(0)} cy={y(values[0])} r="4" fill={meta.color} />}

        {/* 峰值实心点 */}
        {hasPeak && <circle cx={x(peakIdx)} cy={y(peak)} r="3.4" fill={meta.color} stroke="var(--surface)" strokeWidth="1.8" />}

        {/* 悬停十字线 + 高亮点 */}
        {hover != null && hoverD && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={baseY}
              stroke="var(--line-strong)" strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
            <circle cx={x(hover)} cy={y(values[hover])} r="9" fill={meta.color} opacity="0.14" />
            <circle cx={x(hover)} cy={y(values[hover])} r="4" fill="#fff" stroke={meta.color} strokeWidth="2.2" />
          </g>
        )}
      </svg>

      {/* 峰值标注 */}
      {hasPeak && (
        <div style={{
          position: 'absolute', left: x(peakIdx), top: y(peak) - 30, transform: 'translateX(-50%)',
          background: 'var(--brand-soft)', color: 'var(--brand-strong)', border: '1px solid var(--brand-soft)',
          fontSize: 10.5, fontWeight: 700, padding: '2.5px 8px', borderRadius: 7,
          pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          峰值 {meta.short(peak)}
        </div>
      )}

      {/* 悬停明细卡 */}
      {hover != null && hoverD && (
        <div className="anim-pop" style={{
          position: 'absolute', left: tipX, top: 4, transform: 'translateX(-50%)',
          background: 'var(--surface)', border: '1px solid var(--line-strong)', borderRadius: 10,
          boxShadow: '0 10px 28px -10px rgba(15, 23, 42, 0.22)', padding: '9px 12px',
          pointerEvents: 'none', zIndex: 6, minWidth: 136,
        }}>
          <div className="mono fw-bold" style={{ fontSize: 12, marginBottom: 5 }}>{hoverD.date}</div>
          <div className="row g-1" style={{ alignItems: 'center' }}>
            <span style={{ width: 8, height: 8, borderRadius: 3, background: meta.color, flex: 'none' }} />
            <span className="mono fw-bold" style={{ fontSize: 13.5 }}>{meta.full(values[hover])}</span>
          </div>
          {metric !== 'calls' && hoverD.calls != null && (
            <div className="text-xs text-muted" style={{ marginTop: 4 }}>调用 {hoverD.calls.toLocaleString()} 次</div>
          )}
          {metric !== 'cost' && hoverD.cost != null && (
            <div className="text-xs text-muted" style={{ marginTop: 2 }}>费用 ¥{hoverD.cost}</div>
          )}
        </div>
      )}
    </div>
  );
};

const MetricTrendCard: React.FC<{ byDay: UsageData['by_day']; range: number }> = ({ byDay, range }) => {
  const n = byDay.length;
  const avail = (['tokens', 'calls', 'cost'] as MetricKey[]).filter(
    (k) => k === 'tokens' || byDay.some((d) => (k === 'calls' ? d.calls != null : d.cost != null))
  );
  const [metric, setMetric] = useState<MetricKey>('tokens');
  const active: MetricKey = avail.includes(metric) ? metric : 'tokens';
  const meta = METRICS[active];

  const values = byDay.map((d) => (active === 'tokens' ? d.tokens : active === 'calls' ? d.calls ?? 0 : Number(d.cost ?? 0)));
  const peak = n ? Math.max(...values, 0) : 0;
  const peakIdx = values.indexOf(peak);
  const avg = n ? values.reduce((a, b) => a + b, 0) / n : 0;
  const last = values[n - 1] ?? 0;
  const prev = n > 1 ? values[n - 2] ?? 0 : 0;
  const delta = prev > 0 ? ((last - prev) / prev) * 100 : null;

  const stats: { label: string; value: string; sub: React.ReactNode }[] = [
    { label: '峰值', value: meta.short(peak), sub: n ? byDay[peakIdx]?.date.slice(5) : '' },
    { label: '日均', value: meta.short(avg), sub: `近 ${range} 天平均` },
    { label: '昨日', value: meta.short(last), sub: delta != null ? (
      <Tag color={delta >= 0 ? 'amber' : 'green'}>
        <Icon name="arrowUp" size={10} style={{ transform: delta < 0 ? 'rotate(180deg)' : undefined }} />
        {Math.abs(delta).toFixed(0)}% 环比
      </Tag>
    ) : '—' },
  ];

  return (
    <div className="card anim-in" style={{ padding: '18px 20px 14px' }}>
      {/* 头部：标题 + 指标切换 */}
      <div className="row-between wrap g-2">
        <div className="row g-2">
          <span style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--brand-soft)', color: 'var(--brand-strong)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
            <Icon name="chart" size={15} />
          </span>
          <div>
            <div className="fw-bold" style={{ fontSize: 14.5 }}>每日 Token 消耗趋势</div>
            <div className="text-xs text-muted" style={{ marginTop: 1 }}>悬停查看每日明细 · 虚线为日均线</div>
          </div>
        </div>
        {avail.length > 1 && (
          <div className="seg">
            {avail.map((k) => (
              <button key={k} className={`seg-btn ${active === k ? 'active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setMetric(k)}>
                {METRICS[k].label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 关键统计 */}
      {n > 0 && (
        <div className="row wrap" style={{ gap: 26, margin: '14px 2px 2px' }}>
          {stats.map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <span style={{ width: 1, height: 32, background: 'var(--line)', flex: 'none' }} />}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span className="text-muted" style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.4 }}>{s.label}</span>
                <span className="mono fw-bold" style={{ fontSize: 17, lineHeight: 1.25 }}>{s.value}</span>
                <span style={{ minHeight: 18, display: 'inline-flex', alignItems: 'center', fontSize: 10.5, color: 'var(--muted)' }}>{s.sub}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* 图表主体 */}
      {n === 0 ? (
        <div style={{ padding: '12px 0 8px' }}><Empty icon="chart" text="暂无用量数据" /></div>
      ) : (
        <TrendChart byDay={byDay} metric={active} />
      )}
    </div>
  );
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
      <div className="text-xs text-muted" role="status">未定价调用：{usage?.summary.unpriced_calls || 0} 次；未上报 Token：{usage?.summary.unreported_calls || 0} 次。未知费用未计入总额。</div>
      <div className="row-between wrap g-2">
        <span className="text-xs text-muted">
          <Icon name="clock" size={12} /> 统计口径：最近 {range} 天的真实调用；费用按配置单价估算（人民币），不含演示模板
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

          {/* ===== 趋势图（专业版） ===== */}
          <MetricTrendCard byDay={usage.by_day} range={range} />

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
