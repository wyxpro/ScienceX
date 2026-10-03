/* 图表生成 —— 严格参考 DreamPaper「科研图」工作台界面设计
 * 视觉与布局改编自 .vendor/dreampaper/src/desktop/forms.tsx (FigureForm) + styles.css（紫色 accent 主题）
 * 功能对接 ScienceX 后端 /dreampaper/jobs（两阶段 Design→Implement 流水线，SSE 进度 + Design Log + 矢量降级渲染）
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, taskStream } from '../../api/client';
import { useToast } from '../../components/ui';
import Icon from '../../components/Icon';
import '../../styles/figure-studio.css';

type Kind = 'diagram' | 'plot';
type Pane = 'templates' | 'result';
type DesignLog = { step: string; label: string; status: string; content: string };
type Diagnosis = { summary: string; code?: string; stage?: string; role?: string; endpoint?: string; suggestion?: string };
type DpTemplate = { id: string; kind: Kind; name: string; category: string; visual_intent: string; desc: string; image_url?: string };
type DpResult = { kind: string; title: string; spec: any; design_mode?: string };

const MAX_TEMPLATES = 3;

/* 矢量管线图渲染（Implement 降级通道：diagram spec → SVG，可导出） */
function DiagramRender({ spec }: { spec: any }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const stages: any[] = spec?.stages || [];
  const connections: any[] = spec?.connections || [];
  if (!stages.length) return null;
  const W = 920; const gap = 34; const cardW = Math.max(150, Math.min(230, (W - gap * (stages.length - 1) - 40) / stages.length));
  const colX = stages.map((_: any, i: number) => 20 + i * (cardW + gap));
  const colH = stages.map((s: any) => 46 + (s.modules?.length || 1) * 26 + 12);
  const H = Math.max(...colH) + 56;

  const download = () => {
    const el = svgRef.current;
    if (!el) return;
    const source = `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(el)}`;
    const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${spec.title || 'figure'}.svg`; a.click();
    URL.revokeObjectURL(url);
  };
  const downloadJSON = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${spec.title || 'figure'}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fx-result-fig">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="fx-svg" role="img" aria-label={spec.title}>
        <text x={20} y={28} fontSize={15} fontWeight={700} fill="#1f2a24">{spec.title}</text>
        <text x={W - 20} y={28} fontSize={10} fill="#8a948d" textAnchor="end">{spec.flow_direction || 'left-to-right'}</text>
        {stages.map((s: any, i: number) => (
          <g key={i}>
            <rect x={colX[i]} y={48} width={cardW} height={colH[i]} rx={10} fill="#f3ecfb" stroke="#b45df2" strokeWidth={1.2} />
            <rect x={colX[i]} y={48} width={cardW} height={30} rx={10} fill="#b45df2" />
            <text x={colX[i] + cardW / 2} y={68} fontSize={12.5} fontWeight={700} fill="#fff" textAnchor="middle">{String(s.name).slice(0, 16)}</text>
            {(s.modules || []).map((m: string, j: number) => (
              <g key={j}>
                <rect x={colX[i] + 10} y={88 + j * 26} width={cardW - 20} height={22} rx={5} fill="#fff" stroke="#e2d3f5" />
                <text x={colX[i] + cardW / 2} y={103 + j * 26} fontSize={10.5} fill="#3d3148" textAnchor="middle">{String(m).slice(0, 14)}</text>
              </g>
            ))}
          </g>
        ))}
        {connections.map((c: any, i: number) => {
          const from = stages.findIndex((s) => s.name === c.from);
          const to = stages.findIndex((s) => s.name === c.to);
          if (from < 0 || to < 0) return null;
          const x1 = colX[from] + cardW, x2 = colX[to];
          const y = 48 + Math.min(colH[from], colH[to]) / 2;
          const mid = (x1 + x2) / 2;
          const isBack = to < from;
          const path = isBack ? `M ${x1} ${y} C ${x1 + 30} ${y + 40}, ${x2 - 30} ${y + 40}, ${x2} ${y}` : `M ${x1} ${y} L ${x2} ${y}`;
          return (
            <g key={`c${i}`}>
              <path d={path} fill="none" stroke={c.dashed ? '#c2762b' : '#9d3fe0'} strokeWidth={1.6} strokeDasharray={c.dashed ? '5 4' : undefined} markerEnd="url(#fxArrow)" />
              {!isBack && c.label ? <text x={mid} y={y - 6} fontSize={9.5} fill="#8a948d" textAnchor="middle">{String(c.label).slice(0, 10)}</text> : null}
            </g>
          );
        })}
        <defs>
          <marker id="fxArrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill="#9d3fe0" />
          </marker>
        </defs>
      </svg>
      <div className="fx-result-actions">
        <button type="button" className="fx-ghost" onClick={download}><Icon name="download" size={13} />导出 SVG</button>
        <button type="button" className="fx-ghost" onClick={downloadJSON}><Icon name="copy" size={13} />导出 Spec JSON</button>
      </div>
    </div>
  );
}

function CircularProgress({ value, failed }: { value: number; failed?: boolean }) {
  const size = 58; const stroke = 6; const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="fx-ring">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#eae6f2" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={failed ? '#e5484d' : '#b45df2'} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - Math.min(100, Math.max(0, value)) / 100)}
        style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset .4s ease' }} />
      <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" fontSize={12} fontWeight={700} fill="#5b3f73">{value}%</text>
    </svg>
  );
}

export default function FigureStudio() {
  const toast = useToast();
  const [templates, setTemplates] = useState<DpTemplate[]>([]);
  const [kind, setKind] = useState<Kind>('diagram');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [pane, setPane] = useState<Pane>('templates');

  /* 左「参数」表单 */
  const [title, setTitle] = useState('CLAU-Former 方法总览图');
  const [method, setMethod] = useState('视频输入 → 光流增强 → AU 拓扑图构建 → 图卷积精炼 → 跨层交叉注意力融合 → 时序分类输出；训练阶段使用 LOSO 协议与对比损失');
  const [ratio, setRatio] = useState('inherit');
  const [fidelity, setFidelity] = useState('balanced');
  const [strength, setStrength] = useState('high');
  const [custom, setCustom] = useState('');

  /* 运行态 */
  const [running, setRunning] = useState(false);
  const [percent, setPercent] = useState(0);
  const [stage, setStage] = useState('');
  const [logs, setLogs] = useState<DesignLog[]>([]);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [result, setResult] = useState<DpResult | null>(null);
  const [hasJob, setHasJob] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<{ items: DpTemplate[] }>('/dreampaper/templates').then((r) => setTemplates(r.items || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (logs.length) logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [logs]);

  const visible = templates.filter((t) => {
    if (t.kind !== kind) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [t.name, t.category, t.visual_intent, t.desc].some((s) => s?.toLowerCase().includes(q));
  });

  const toggle = (id: string) => {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(0, MAX_TEMPLATES)));
  };

  const submit = useCallback(async () => {
    if (!title.trim() || !method.trim() || !selected.length) return;
    try {
      setRunning(true); setPercent(0); setStage('排队中'); setLogs([]); setDiagnosis(null); setResult(null); setHasJob(true); setPane('result');
      const r = await api<{ job_id: string; task_id: string }>('/dreampaper/jobs', {
        method: 'POST',
        body: { mode: 'paper_figure', payload: { title, method, template_ids: selected, aspect_ratio: ratio, layout_fidelity: fidelity, style_strength: strength, custom } },
      });
      taskStream(r.task_id, {
        onProgress: (d) => {
          setPercent(d.percent ?? 0);
          setStage(d.stage || '');
          const dl = d.design_log;
          if (dl?.step) {
            setLogs((cur) => {
              const i = cur.findIndex((l) => l.step === dl.step);
              const next = { step: dl.step, label: dl.label, status: dl.status, content: dl.content };
              if (i >= 0) { const c = cur.slice(); c[i] = next; return c; }
              return [...cur, next];
            });
          }
          if (d.diagnosis) setDiagnosis(d.diagnosis as Diagnosis);
        },
        onDone: async () => {
          setRunning(false); setPercent(100);
          try {
            const detail = await api<any>(`/dreampaper/jobs/${r.job_id}`);
            setResult(detail.result || null);
            setLogs(detail.design_logs || []);
            toast('科研图生成完成', 'ok');
          } catch { toast('产物拉取失败，请重试', 'err'); }
        },
        onError: (m) => { setRunning(false); toast(m || '生成失败，请重试', 'err'); },
      });
    } catch (err: any) {
      setRunning(false);
      toast(err.message || '提交失败', 'err');
    }
  }, [title, method, selected, ratio, fidelity, strength, custom, toast]);

  const ready = Boolean(title.trim() && method.trim() && selected.length > 0);

  return (
    <div className="fx-studio anim-in">
      <div className="fx-intro">
        <div className="fx-intro-title"><Icon name="flask" size={16} />科研图工作台</div>
        <p>两阶段 Design→Implement 流水线：选定模板作 few-shot 参考 → 抽取结构 → 填充方法内容 → 矢量渲染导出。能力对接自 DreamPaper（PolyForm Noncommercial，仅限非商业学习研究）。</p>
      </div>

      <div className="fx-work">
        {/* 左：参数 */}
        <section className="fx-card">
          <header className="fx-card-head"><h2>参数</h2></header>
          <div className="fx-card-body">
            <label className="fx-field">
              <span className="fx-field-label">标题</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="为这张图命名，如：方法总览图" />
            </label>
            <div className="fx-field fx-field-grow" style={{ flexGrow: 2 }}>
              <span className="fx-field-label">方法 / 章节全文</span>
              <textarea className="fx-fill" value={method} onChange={(e) => setMethod(e.target.value)} placeholder="用 → 或分号描述流水线；并列模块用顿号。内容唯一来源，Anti-collapse 规则保全子步骤" />
            </div>
            <div className="fx-row three">
              <label className="fx-field">
                <span className="fx-field-label">比例</span>
                <select value={ratio} onChange={(e) => setRatio(e.target.value)}>
                  <option value="inherit">继承</option>
                  <option value="16:9">16:9</option>
                  <option value="4:3">4:3</option>
                  <option value="1:1">1:1</option>
                  <option value="3:2">3:2</option>
                </select>
              </label>
              <label className="fx-field">
                <span className="fx-field-label">布局</span>
                <select value={fidelity} onChange={(e) => setFidelity(e.target.value)}>
                  <option value="strict">严格 strict</option>
                  <option value="balanced">均衡 balanced</option>
                  <option value="loose">宽松 loose</option>
                </select>
              </label>
              <label className="fx-field">
                <span className="fx-field-label">风格</span>
                <select value={strength} onChange={(e) => setStrength(e.target.value)}>
                  <option value="high">强 high</option>
                  <option value="medium">中 medium</option>
                  <option value="low">弱 low</option>
                </select>
              </label>
            </div>
            <div className="fx-field fx-field-grow">
              <span className="fx-field-label">约束</span>
              <textarea className="fx-fill" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="可选：字体、配色、箭头节奏等额外约束" />
            </div>
          </div>
          <footer className="fx-card-foot">
            <span className="fx-foot-note">已选 {selected.length}/{MAX_TEMPLATES}</span>
            <button type="button" className="fx-primary" disabled={!ready || running} onClick={submit}>
              {running ? <span className="fx-spin" /> : <Icon name="spark" size={14} />}
              {running ? '生成中…' : '生成'}
            </button>
          </footer>
        </section>

        {/* 右：模板 / 结果 */}
        <section className="fx-card">
          <header className="fx-card-head">
            <div className="fx-seg" role="tablist">
              <button type="button" role="tab" aria-selected={pane === 'templates'} className={pane === 'templates' ? 'active' : ''} onClick={() => setPane('templates')}>模板</button>
              <button type="button" role="tab" aria-selected={pane === 'result'} className={pane === 'result' ? 'active' : ''} onClick={() => setPane('result')}>
                结果{hasJob && <span className="fx-seg-dot" aria-hidden="true" />}
              </button>
            </div>
            {pane === 'templates' && (
              <div className="fx-head-tools">
                <select className="fx-mini" value={kind} onChange={(e) => setKind(e.target.value as Kind)} aria-label="模板类型">
                  <option value="diagram">示意图</option>
                  <option value="plot">图表</option>
                </select>
                <input className="fx-mini fx-search" placeholder="搜索模板" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="搜索模板" />
              </div>
            )}
          </header>

          {pane === 'templates' ? (
            <div className="fx-card-body flush">
              {visible.length ? (
                <div className="fx-tiles">
                  {visible.map((t) => {
                    const on = selected.includes(t.id);
                    return (
                      <button key={t.id} type="button" className={`fx-tile${on ? ' on' : ''}`} aria-pressed={on} onClick={() => toggle(t.id)} title={t.visual_intent || t.category}>
                        {t.image_url ? <img src={t.image_url} alt="" loading="lazy" /> : <div className="fx-tile-ph"><Icon name="chart" size={22} /></div>}
                        <span className="fx-tile-cap">{t.category || t.kind}</span>
                        {on && <span className="fx-tile-mark" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="fx-empty"><strong>没有匹配的模板</strong><p>调整类型或清空搜索后重试。</p></div>
              )}
            </div>
          ) : (
            <div className="fx-card-body">
              {(running || hasJob) && (
                <div className="fx-progress">
                  <CircularProgress value={percent} failed={!!diagnosis && !running} />
                  <div className="fx-progress-meta">
                    <div className="fx-progress-top">
                      <span className="fx-progress-title">{diagnosis && !running ? '任务失败' : running ? '生成进行中' : '任务完成'}</span>
                      <span className="fx-stage">{stage}</span>
                    </div>
                    <div className="fx-bar"><div className="fx-bar-fill" style={{ width: `${percent}%`, background: diagnosis && !running ? '#e5484d' : undefined }} /></div>
                  </div>
                </div>
              )}

              {logs.length > 0 && (
                <div className="fx-logs">
                  {logs.map((l, i) => (
                    <div key={l.step + i} className="fx-log" data-status={l.status}>
                      <div className="fx-log-head">
                        <span>{l.label || l.step}</span>
                        {l.status === 'running' && <em>流式接收中…</em>}
                      </div>
                      <pre>{l.content || '（本步骤无返回内容）'}</pre>
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </div>
              )}

              {diagnosis && (
                <div className="fx-diagnosis">
                  <div className="fx-diagnosis-title"><Icon name="alert" size={14} />故障诊断</div>
                  <div className="fx-diag-kv"><span>摘要</span><span>{diagnosis.summary}</span></div>
                  {diagnosis.endpoint && <div className="fx-diag-kv"><span>请求端点</span><span>{diagnosis.endpoint}</span></div>}
                  {diagnosis.suggestion && <div className="fx-diag-kv"><span>处理建议</span><span>{diagnosis.suggestion}</span></div>}
                </div>
              )}

              {result?.kind === 'diagram' && (
                <div className="fx-result">
                  <div className="fx-result-head">
                    <span className="fx-result-title">{result.title}</span>
                    <span className="fx-result-tag">{result.design_mode === 'live' ? '模型网关' : '矢量降级'}</span>
                  </div>
                  <DiagramRender spec={result.spec} />
                </div>
              )}

              {!running && !result && !diagnosis && (
                <div className="fx-empty"><strong>提交任务后，这里显示进度与产出</strong><p>在左侧填写参数、选择模板，点击「生成」启动两阶段流水线。</p></div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
