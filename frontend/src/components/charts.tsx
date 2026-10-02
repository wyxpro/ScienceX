/* SVG 图表组件（学术风格：白底矢量、无渐变、清晰轴标签） */
import { useMemo } from 'react';

const C = {
  brand: '#1b7a5e', brand2: '#2ea87e', accent: '#c2762b', gold: '#b9891e', red: '#c24a42',
  muted: '#8a948d', line: '#e6e2d6', ink: '#1f2a24',
};

/* ---------- 柱状图 ---------- */
export function BarChart({ data, height = 220, max, format = (v: any) => String(v), highlight }: {
  data: { label: string; value: number }[]; height?: number; max?: number; format?: (v: number) => string; highlight?: (d: { label: string; value: number }) => boolean;
}) {
  const m = max ?? Math.max(...data.map((d) => d.value)) * 1.15;
  const W = 100; // viewBox 百分比坐标
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${height}`} style={{ width: '100%', height }} preserveAspectRatio="none">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1="0" x2={W} y1={height - 26 - f * (height - 46)} y2={height - 26 - f * (height - 46)} stroke={C.line} strokeWidth="1" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
        ))}
        {data.map((d, i) => {
          const bw = W / data.length * 0.52;
          const x = (i + 0.5) * (W / data.length) - bw / 2;
          const h = Math.max(2, (d.value / m) * (height - 46));
          const hi = highlight?.(d);
          return (
            <g key={d.label}>
              <rect x={x} y={height - 26 - h} width={bw} height={h} rx="2.5" fill={hi ? C.accent : C.brand} opacity={0.92}
                style={{ transition: 'all .8s var(--ease)' }}>
                <title>{`${d.label}: ${format(d.value)}`}</title>
              </rect>
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex' }}>
        {data.map((d) => (
          <div key={d.label} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: highlight?.(d) ? C.accent : C.ink, fontWeight: highlight?.(d) ? 700 : 500 }}>{format(d.value)}</div>
            <div style={{ fontSize: 10.5, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- 折线图 ---------- */
export function LineChart({ series, height = 200, yFormat = (v: number) => String(v), labels }: {
  series: { name: string; data: number[]; color?: string; dashed?: boolean }[];
  height?: number; yFormat?: (v: number) => string; labels?: string[];
}) {
  const all = series.flatMap((s) => s.data);
  const max = Math.max(...all) * 1.08 || 1;
  const min = Math.min(0, ...all);
  const n = Math.max(...series.map((s) => s.data.length));
  const pad = { l: 8, r: 2, t: 10, b: 22 };
  const W = 100;
  const H = height;
  const x = (i: number) => pad.l + (i / Math.max(1, n - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => H - pad.b - ((v - min) / (max - min)) * (H - pad.t - pad.b);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height }} preserveAspectRatio="none">
        {[0, 0.33, 0.66, 1].map((f) => (
          <line key={f} x1="0" x2={W} y1={y(min + f * (max - min))} y2={y(min + f * (max - min))} stroke={C.line} strokeWidth="1" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
        ))}
        {series.map((s) => {
          const color = s.color || C.brand;
          const pts = s.data.map((v, i) => `${x(i)},${y(v)}`).join(' ');
          return (
            <g key={s.name}>
              <polyline points={pts} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke"
                strokeDasharray={s.dashed ? '5 4' : undefined} strokeLinejoin="round" strokeLinecap="round"
                style={{ strokeDasharray: s.dashed ? undefined : 1000, strokeDashoffset: 0, animation: 'dash 1.2s var(--ease) both' }} />
              {s.data.map((v, i) => (
                <circle key={i} cx={x(i)} cy={y(v)} r="2.6" fill="#fff" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke">
                  <title>{`${s.name} ${labels?.[i] || i}: ${yFormat(v)}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
        {series.map((s) => (
          <span key={s.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: C.muted }}>
            <i style={{ width: 14, height: 3, borderRadius: 2, background: s.color || C.brand, display: 'inline-block' }} />{s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- 环形占比 ---------- */
export function Donut({ data, size = 160, inner = 58 }: { data: { label: string; value: number; color?: string }[]; size?: number; inner?: number }) {
  const palette = [C.brand, C.accent, C.gold, '#5e8f7f', C.red, '#7aa5c7'];
  const total = data.reduce((a, b) => a + b.value, 0) || 1;
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
      <svg width={size} height={size}>
        {data.map((d, i) => {
          const frac = d.value / total;
          const dash = `${frac * c} ${c}`;
          const offset = -acc * c;
          acc += frac;
          return (
            <circle key={d.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color || palette[i % palette.length]}
              strokeWidth="14" strokeDasharray={dash} strokeDashoffset={offset} transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{ transition: 'stroke-dasharray 1s var(--ease)' }}>
              <title>{`${d.label}: ${d.value}`}</title>
            </circle>
          );
        })}
        <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 15, fontWeight: 700, fill: C.ink }}>
          {total.toLocaleString()}
        </text>
        <text x={size / 2} y={size / 2 + 18} textAnchor="middle" style={{ fontSize: 9.5, fill: C.muted }}>总量</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.map((d, i) => (
          <span key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: C.ink }}>
            <i style={{ width: 9, height: 9, borderRadius: 3, background: d.color || palette[i % palette.length], display: 'inline-block' }} />
            {d.label}<span style={{ color: C.muted, marginLeft: 'auto', paddingLeft: 12 }}>{d.value.toLocaleString()}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- 混淆矩阵热力图 ---------- */
export function HeatMap({ matrix, labels }: { matrix: number[][]; labels: string[] }) {
  const color = (v: number) => {
    const t = Math.min(1, v / 100);
    return `rgba(27,122,94,${0.08 + t * 0.85})`;
  };
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', margin: '0 auto' }}>
        <thead>
          <tr>
            <th style={{ padding: 6, fontSize: 11, color: C.muted }}>真实\预测</th>
            {labels.map((l) => <th key={l} style={{ padding: 6, fontSize: 11, color: C.muted, fontWeight: 600 }}>{l}</th>)}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i}>
              <td style={{ padding: 6, fontSize: 11, color: C.muted, fontWeight: 600 }}>{labels[i]}</td>
              {row.map((v, j) => (
                <td key={j} style={{ background: color(v), color: v > 50 ? '#fff' : C.ink, textAlign: 'center', padding: '9px 12px', fontSize: 12, fontWeight: 600, borderRadius: 4, border: i === j ? '1.5px solid var(--accent)' : '1px solid #fff' }}>
                  {v}%
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- 指标迷你条 ---------- */
export function MetricBar({ label, value, max = 100, format = (v: number) => v.toFixed(1), color }: { label: string; value: number; max?: number; format?: (v: number) => string; color?: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: 'var(--ink-2)' }}>{label}</span>
        <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{format(value)}</span>
      </div>
      <div className="progress">
        <div className="progress-bar" style={{ width: `${(value / max) * 100}%`, background: color || 'var(--brand)' }} />
      </div>
    </div>
  );
}

/* ---------- GPU 显存/利用率条 ---------- */
export function GaugeRow({ label, value, total, unit = 'GB', danger = 0.85 }: { label: string; value: number; total: number; unit?: string; danger?: number }) {
  const pct = (value / total) * 100;
  const c = pct / 100 > danger ? C.red : pct > 60 ? C.accent : C.brand;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
        <span style={{ color: 'var(--ink-2)' }}>{label}</span>
        <span className="mono">{value.toFixed(1)} / {total} {unit}</span>
      </div>
      <div className="progress" style={{ height: 8 }}>
        <div className="progress-bar" style={{ width: `${Math.min(100, pct)}%`, background: c, transition: 'width .6s var(--ease)' }} />
      </div>
    </div>
  );
}

export function useTicker(intervalMs: number) {
  return useMemo(() => intervalMs, [intervalMs]);
}
