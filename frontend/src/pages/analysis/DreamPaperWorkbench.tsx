/* DreamPaper 工作台 —— 对接 dreampaper (https://github.com/dream-rec/dreampaper) 核心能力
 * 等价实现：两阶段 Design→Implement 流水线（后端 routes/dreampaper.js）
 * 复用模式：stage-weight 进度 · Design Log 流式面板 · JobError 诊断卡 · 优/良/差评分反哺（许可见 dp-prompts.js）
 * 结果：Implement 阶段降级为矢量 spec（diagram / plot / deck），前端 SVG / 图表组件渲染并支持导出
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, taskStream } from '../../api/client';
import { BarChart, HeatMap, LineChart } from '../../components/charts';
import Icon from '../../components/Icon';
import { useToast } from '../../components/ui';

type Mode = 'paper_figure' | 'plot_chart' | 'ppt_slide';
type DesignLog = { step: string; label: string; status: string; content: string };
type Diagnosis = { summary: string; code: string; stage?: string; role?: string; endpoint?: string; http_status?: number | null; suggestion?: string };
type DpJob = {
  id: string; mode: Mode; status: string; stage: string; percent: number;
  rating?: string | null; result?: any; error?: Diagnosis | null; created_at: string;
  design_logs?: DesignLog[]; design_log_count?: number;
};

const MODE_META: Record<Mode, { label: string; icon: any; intro: string }> = {
  paper_figure: { label: '科研配图', icon: 'flask', intro: '两阶段生成：抽取模板结构 → Design 填充方法内容 → 矢量渲染' },
  plot_chart: { label: '统计图表', icon: 'chart', intro: '按 Plot 规则生成统计图 spec：不虚构坐标轴、单位与统计标注' },
  ppt_slide: { label: '论文幻灯片', icon: 'layers', intro: '母版风格分析 → Deck 大纲 → 逐页 Page Plan（母版不可变元素绑定）' },
};

const TPL_KIND: Record<Mode, string> = { paper_figure: 'diagram', plot_chart: 'plot', ppt_slide: 'master' };

function CircularProgress({ value, failed }: { value: number; failed?: boolean }) {
  const size = 64; const stroke = 6; const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--bg-deep)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={failed ? 'var(--red, #e11d48)' : 'var(--brand)'} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - Math.min(100, Math.max(0, value)) / 100)}
        style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset .4s ease' }} />
      <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" fontSize={13} fontWeight={700} fill="var(--ink-2)">{value}%</text>
    </svg>
  );
}

/* 矢量管线图渲染（Implement 降级通道：diagram spec → SVG） */
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

  return (
    <div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', background: '#fff', borderRadius: 10, border: '1px solid var(--line)' }} role="img" aria-label={spec.title}>
        <text x={20} y={28} fontSize={15} fontWeight={700} fill="#1f2a24">{spec.title}</text>
        <text x={W - 20} y={28} fontSize={10} fill="#8a948d" textAnchor="end">{spec.flow_direction || 'left-to-right'}</text>
        {stages.map((s: any, i: number) => (
          <g key={i}>
            <rect x={colX[i]} y={48} width={cardW} height={colH[i]} rx={10} fill="#f0f7f3" stroke="#1b7a5e" strokeWidth={1.2} />
            <rect x={colX[i]} y={48} width={cardW} height={30} rx={10} fill="#1b7a5e" />
            <text x={colX[i] + cardW / 2} y={68} fontSize={12.5} fontWeight={700} fill="#fff" textAnchor="middle">{String(s.name).slice(0, 16)}</text>
            {(s.modules || []).map((m: string, j: number) => (
              <g key={j}>
                <rect x={colX[i] + 10} y={88 + j * 26} width={cardW - 20} height={22} rx={5} fill="#fff" stroke="#d7e6df" />
                <text x={colX[i] + cardW / 2} y={103 + j * 26} fontSize={10.5} fill="#334155" textAnchor="middle">{String(m).slice(0, 14)}</text>
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
              <path d={path} fill="none" stroke={c.dashed ? '#c2762b' : '#1b7a5e'} strokeWidth={1.6} strokeDasharray={c.dashed ? '5 4' : undefined} markerEnd="url(#dpArrow)" />
              {!isBack && c.label ? <text x={mid} y={y - 6} fontSize={9.5} fill="#8a948d" textAnchor="middle">{String(c.label).slice(0, 10)}</text> : null}
            </g>
          );
        })}
        <defs>
          <marker id="dpArrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill="#1b7a5e" />
          </marker>
        </defs>
      </svg>
      <div className="row g-1 mt-2">
        <button className="btn btn-ghost btn-sm" onClick={download}><Icon name="download" size={13} />导出 SVG</button>
        <button className="btn btn-ghost btn-sm" onClick={() => downloadJSON(spec, `${spec.title || 'figure'}.json`)}><Icon name="copy" size={13} />导出 Spec JSON</button>
      </div>
    </div>
  );
}

function downloadJSON(data: any, name: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function downloadText(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export default function DreamPaperWorkbench() {
  const toast = useToast();
  const [mode, setMode] = useState<Mode>('paper_figure');
  const [templates, setTemplates] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [history, setHistory] = useState<DpJob[]>([]);

  /* 表单（按模式） */
  const [title, setTitle] = useState('CLAU-Former 方法总览图');
  const [method, setMethod] = useState('视频输入 → 光流增强 → AU 拓扑图构建 → 图卷积精炼 → 跨层交叉注意力融合 → 时序分类输出；训练阶段使用 LOSO 协议与对比损失');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'heatmap'>('bar');
  const [plotData, setPlotData] = useState('baseline=0.6464, +cross-attn=0.6892, w/o AU=0.5801, GraphAU=0.81, AUFormer=0.829');
  const [pages, setPages] = useState(6);
  const [material, setMaterial] = useState('up9 系列在 CASME II 上 UF1=0.829；消融显示 AU 分支贡献 6.8 点；计划补充 SAMM 交叉验证实验');

  /* 运行态 */
  const [jobId, setJobId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [percent, setPercent] = useState(0);
  const [stage, setStage] = useState('');
  const [logs, setLogs] = useState<DesignLog[]>([]);
  const [logsOpen, setLogsOpen] = useState(true);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [result, setResult] = useState<any>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const loadHistory = useCallback(async () => {
    try {
      const r = await api<{ items: DpJob[] }>('/dreampaper/jobs');
      setHistory(r.items || []);
    } catch { /* 历史加载失败不阻塞工作台 */ }
  }, []);

  useEffect(() => {
    api<{ items: any[] }>('/dreampaper/templates').then((r) => setTemplates(r.items || [])).catch(() => {});
    loadHistory();
  }, [loadHistory]);

  useEffect(() => { setSelected([]); }, [mode]);
  useEffect(() => { if (logsOpen) logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [logs, logsOpen]);

  /* 提交 → SSE 进度（design_log 增量 / diagnosis）→ 完成拉取产物 */
  const submit = async () => {
    const payload: any =
      mode === 'paper_figure' ? { title, method, template_ids: selected, custom: '' } :
      mode === 'plot_chart' ? { title, data: plotData, chart_type: chartType } :
      { title, pages, material, master_desc: templates.find((t) => selected.includes(t.id))?.visual_intent || '学术蓝白母版' };
    try {
      setRunning(true); setPercent(0); setStage('排队中'); setLogs([]); setDiagnosis(null); setResult(null); setJobId(null);
      const r = await api<{ job_id: string; task_id: string }>('/dreampaper/jobs', { method: 'POST', body: { mode, payload } });
      setJobId(r.job_id);
      taskStream(r.task_id, {
        onProgress: (d) => {
          setPercent(d.percent ?? 0);
          setStage(d.stage || '');
          const dlog = d.design_log;
          if (dlog?.step) {
            setLogs((cur) => {
              const i = cur.findIndex((l) => l.step === dlog.step);
              const next = { step: dlog.step, label: dlog.label, status: dlog.status, content: dlog.content };
              if (i >= 0) { const c = cur.slice(); c[i] = next; return c; }
              return [...cur, next];
            });
          }
          if (d.diagnosis) setDiagnosis(d.diagnosis as Diagnosis);
        },
        onDone: async () => {
          setRunning(false); setPercent(100);
          try {
            const detail = await api<DpJob>(`/dreampaper/jobs/${r.job_id}`);
            setResult(detail.result || null);
            setLogs(detail.design_logs || []);
            toast('DreamPaper 生成完成', 'ok');
          } catch { toast('产物拉取失败，请在历史中重试', 'err'); }
          loadHistory();
        },
        onError: (m) => { setRunning(false); toast(m || '生成失败，请重试', 'err'); loadHistory(); },
      });
    } catch (err: any) {
      setRunning(false);
      toast(err.message || '提交失败', 'err');
    }
  };

  const rate = async (job: DpJob, value: string) => {
    try {
      await api(`/dreampaper/jobs/${job.id}/rate`, { method: 'POST', body: { rating: job.rating === value ? null : value } });
      toast('评分已写入案例记忆，将反哺 Advisor 召回', 'ok');
      loadHistory();
    } catch (err: any) { toast(err.message || '评分失败', 'err'); }
  };

  const openHistory = async (job: DpJob) => {
    try {
      const detail = await api<DpJob>(`/dreampaper/jobs/${job.id}`);
      setMode(detail.mode); setResult(detail.result || null); setLogs(detail.design_logs || []);
      setDiagnosis(detail.error || null); setPercent(detail.percent || 0); setStage(detail.stage || '');
      toast(`已载入历史任务（${detail.status === 'succeeded' ? '成功' : detail.status}）`, 'info');
    } catch { toast('历史任务载入失败', 'err'); }
  };

  const kindTemplates = templates.filter((t) => t.kind === TPL_KIND[mode]);
  const exportDeck = () => {
    if (!result?.pages) return;
    const md = [`# ${result.title}`, '', `> 母版：${result.master_style?.typography || ''}`, '',
      ...result.pages.flatMap((p: any, i: number) => [`## Slide ${i + 1} · ${p.title}`, ...(p.bullets || []).map((b: string) => `- ${b}`),
        p.visual_element_plan ? `\n视觉方案：${p.visual_element_plan}` : '',
        p.emphasis?.length ? `\n关键词强调：${p.emphasis.join('、')}` : '', ''])];
    downloadText(md.join('\n'), `${result.title || 'deck'}.md`);
  };

  return (
    <div className="anim-in col g-2">
      {/* 许可与来源声明 */}
      <div className="text-xs text-muted" style={{ padding: '6px 10px', background: 'var(--bg-deep)', borderRadius: 8 }}>
        <Icon name="info" size={12} /> 能力对接自 DreamPaper（PolyForm Noncommercial 1.0.0，仅限非商业学习研究）：
        两阶段 Design→Implement 流水线 · stage-weight 进度 · Design Log · 错误诊断 · 评分反哺；无图像网关时自动降级为矢量 spec 渲染。
      </div>

      {/* 三模式子导航 */}
      <div className="seg" style={{ display: 'flex' }} role="tablist" aria-label="DreamPaper 功能模式">
        {(Object.keys(MODE_META) as Mode[]).map((m) => (
          <button key={m} type="button" className={`seg-btn grow ${mode === m ? 'active' : ''}`} onClick={() => setMode(m)} role="tab" aria-selected={mode === m}>
            <Icon name={MODE_META[m].icon} size={13} />{MODE_META[m].label}
          </button>
        ))}
      </div>
      <div className="text-xs text-muted">{MODE_META[mode].intro}</div>

      <div className="grid grid-2" style={{ gridTemplateColumns: 'minmax(300px, 1fr) minmax(360px, 1.4fr)', alignItems: 'start' }}>
        {/* 左：表单 + 模板 + 历史 */}
        <div className="col g-2">
          <div className="card card-pad">
            <div className="card-title mb-2"><Icon name="pen" size={15} />{MODE_META[mode].label} · 任务配置</div>
            <label className="field-label">{mode === 'plot_chart' ? '图表标题' : mode === 'ppt_slide' ? '汇报主题' : '图标题'}</label>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="如：CLAU-Former 方法总览图" />
            {mode === 'paper_figure' && (
              <>
                <label className="field-label mt-2">方法 / 章节全文（内容唯一来源，Anti-collapse 规则保全子步骤）</label>
                <textarea className="textarea" rows={5} value={method} onChange={(e) => setMethod(e.target.value)} placeholder="用 → 或分号描述流水线；并列模块用顿号…" />
              </>
            )}
            {mode === 'plot_chart' && (
              <>
                <label className="field-label mt-2">图表类型</label>
                <div className="seg" style={{ display: 'flex' }}>
                  {(['bar', 'line', 'heatmap'] as const).map((k) => (
                    <button key={k} type="button" className={`seg-btn grow ${chartType === k ? 'active' : ''}`} onClick={() => setChartType(k)}>
                      {k === 'bar' ? '柱状图' : k === 'line' ? '曲线图' : '热力图'}
                    </button>
                  ))}
                </div>
                <label className="field-label mt-2">数据（label=value 逗号分隔，不虚构统计标注）</label>
                <textarea className="textarea" rows={3} value={plotData} onChange={(e) => setPlotData(e.target.value)} />
              </>
            )}
            {mode === 'ppt_slide' && (
              <>
                <label className="field-label mt-2">页数（1–20）</label>
                <input className="input" type="number" min={1} max={20} value={pages} onChange={(e) => setPages(Number(e.target.value))} />
                <label className="field-label mt-2">资料文本（可粘贴论文段落 / 实验进展）</label>
                <textarea className="textarea" rows={4} value={material} onChange={(e) => setMaterial(e.target.value)} />
              </>
            )}
            <button type="button" className="btn btn-primary btn-block mt-2" onClick={submit} disabled={running}>
              {running ? <span className="spinner spinner-dark" /> : <Icon name="spark" size={14} />}
              {running ? '生成中…' : '启动两阶段生成'}
            </button>
          </div>

          <div className="card card-pad">
            <div className="card-title mb-2"><Icon name="layers" size={15} />模板 / 母版（few-shot 参考，最多 3 个）</div>
            <div className="grid grid-2" style={{ gap: 8 }}>
              {kindTemplates.map((t) => {
                const on = selected.includes(t.id);
                return (
                  <div key={t.id} role="button" tabIndex={0} aria-label={`选择模板 ${t.name}`}
                    onClick={() => setSelected((cur) => (on ? cur.filter((x) => x !== t.id) : [...cur, t.id].slice(0, 3)))}
                    style={{ padding: '9px 11px', borderRadius: 10, border: `1px solid ${on ? 'var(--brand)' : 'var(--line)'}`, background: on ? 'var(--brand-softer)' : 'transparent', cursor: 'pointer', transition: 'all .15s' }}>
                    <div className="row-between">
                      <span className="text-small fw-bold">{t.name}</span>
                      {on && <Icon name="check" size={13} />}
                    </div>
                    <div className="text-xs text-muted">{t.desc} · {t.category}</div>
                  </div>
                );
              })}
              {!kindTemplates.length && <div className="text-xs text-muted">该模式暂无模板</div>}
            </div>
          </div>

          {history.length > 0 && (
            <div className="card card-pad">
              <div className="card-title mb-2"><Icon name="history" size={15} />任务历史（评分反哺案例记忆）</div>
              {history.slice(0, 6).map((j) => (
                <div key={j.id} className="kv" style={{ alignItems: 'center' }}>
                  <span className="kv-k" style={{ cursor: 'pointer' }} onClick={() => openHistory(j)} role="button" tabIndex={0}>
                    {MODE_META[j.mode]?.label} · {j.created_at?.slice(5, 16)}
                  </span>
                  <span className="row g-1" style={{ alignItems: 'center' }}>
                    {j.status !== 'succeeded' ? (
                      <span className={`tag ${j.status === 'failed' ? 'tag-red' : 'tag-gray'}`}>{j.status === 'failed' ? '失败' : j.status}</span>
                    ) : (
                      ['good', 'fair', 'poor'].map((v) => (
                        <button key={v} className={`tag ${j.rating === v ? (v === 'good' ? 'tag-green' : v === 'fair' ? 'tag-amber' : 'tag-red') : 'tag-gray'}`}
                          style={{ cursor: 'pointer', border: 'none', padding: '2px 7px' }}
                          onClick={() => rate(j, v)} title="评分将作为 Advisor 案例证据">
                          {v === 'good' ? '优' : v === 'fair' ? '良' : '差'}
                        </button>
                      ))
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右：进度 + Design Log + 诊断 + 产物 */}
        <div className="col g-2">
          {(running || jobId) && (
            <div className="card card-pad">
              <div className="row g-2" style={{ alignItems: 'center' }}>
                <CircularProgress value={percent} failed={!!diagnosis && !running} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row-between">
                    <span className="fw-bold text-small">{diagnosis && !running ? '任务失败' : running ? '生成进行中' : '任务完成'}</span>
                    <span className="text-xs text-muted mono">{stage}</span>
                  </div>
                  <div className="progress mt-1" style={{ height: 8 }}>
                    <div className="progress-bar" style={{ width: `${percent}%`, background: diagnosis && !running ? 'var(--red, #e11d48)' : undefined }} />
                  </div>
                </div>
                {logs.length > 0 && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setLogsOpen((v) => !v)}>
                    <Icon name={logsOpen ? 'chevronDown' : 'chevronRight'} size={13} />Design Log（{logs.length}）
                  </button>
                )}
              </div>
            </div>
          )}

          {logsOpen && logs.length > 0 && (
            <div className="card card-pad" style={{ maxHeight: 260, overflowY: 'auto' }}>
              <div className="col g-1">
                {logs.map((l, i) => (
                  <div key={l.step + i} style={{ borderLeft: `3px solid ${l.status === 'running' ? 'var(--accent)' : l.status === 'failed' ? 'var(--red, #e11d48)' : 'var(--brand)'}`, padding: '6px 10px', background: 'var(--bg)', borderRadius: 8 }}>
                    <div className="row-between">
                      <span className="text-xs fw-bold">{l.label || l.step}</span>
                      {l.status === 'running' && <span className="tag tag-amber" style={{ fontSize: 10, padding: '1px 6px' }}>流式接收中…</span>}
                    </div>
                    <pre className="text-xs" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: '4px 0 0', color: 'var(--ink-2)', fontFamily: 'inherit' }}>{l.content || '（本步骤无返回内容）'}</pre>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>
          )}

          {diagnosis && (
            <div className="card card-pad anim-pop" style={{ borderColor: 'var(--red, #e11d48)', background: 'rgba(225,29,72,0.04)' }}>
              <div className="card-title mb-2" style={{ color: 'var(--red, #e11d48)' }}><Icon name="alert" size={15} />故障诊断</div>
              <div className="kv"><span className="kv-k">摘要</span><span className="kv-v">{diagnosis.summary}</span></div>
              <div className="kv"><span className="kv-k">角色 / 阶段</span><span className="kv-v">{diagnosis.role} · {diagnosis.stage}</span></div>
              <div className="kv"><span className="kv-k">请求端点</span><span className="kv-v">{diagnosis.endpoint}</span></div>
              <div className="kv"><span className="kv-k">处理建议</span><span className="kv-v">{diagnosis.suggestion}</span></div>
            </div>
          )}

          {result?.kind === 'diagram' && (
            <div className="card card-pad anim-pop">
              <div className="card-title mb-2"><Icon name="flask" size={15} />科研配图（矢量渲染{result.design_mode === 'live' ? ' · 模型网关' : ' · 降级模式'}）</div>
              <DiagramRender spec={result.spec} />
            </div>
          )}

          {result?.kind === 'plot' && (
            <div className="card card-pad anim-pop">
              <div className="row-between mb-2">
                <div className="card-title"><Icon name="chart" size={15} />{result.title}</div>
                <button className="btn btn-ghost btn-sm" onClick={() => downloadJSON(result.spec, `${result.title}.json`)}><Icon name="copy" size={13} />导出 Spec</button>
              </div>
              {result.spec?.chart_type === 'line' ? (
                <LineChart labels={(result.spec.series || []).map((_: any, i: number) => `T${i + 1}`)}
                  series={[{ name: result.spec.axes?.y || 'value', data: (result.spec.series || []).map((s: any) => s.value) }]} yFormat={(v) => v.toFixed(2)} />
              ) : result.spec?.chart_type === 'heatmap' ? (
                <HeatMap labels={(result.spec.series || []).map((s: any) => s.label)}
                  matrix={(result.spec.series || []).map((row: any, i: number) => (result.spec.series || []).map((col: any, j: number) => (i === j ? row.value : Math.round(row.value * 18))))} />
              ) : (
                <BarChart data={(result.spec.series || []).map((s: any) => ({ label: s.label, value: s.value }))} format={(v) => v.toFixed(2)} />
              )}
              <div className="text-xs text-muted mt-1">统计标注：{result.spec?.statistical_annotations || 'none'}（数据完整性规则禁止虚构坐标轴 / 单位 / 显著性）</div>
            </div>
          )}

          {result?.kind === 'deck' && (
            <div className="card card-pad anim-pop">
              <div className="row-between mb-2">
                <div className="card-title"><Icon name="layers" size={15} />{result.title}（{result.pages?.length || 0} 页）</div>
                <button className="btn btn-ghost btn-sm" onClick={exportDeck}><Icon name="download" size={13} />导出 Markdown</button>
              </div>
              <div className="grid grid-2" style={{ gap: 10 }}>
                {(result.pages || []).map((p: any, i: number) => (
                  <div key={i} style={{ aspectRatio: '16/9', borderRadius: 10, border: '1px solid var(--line)', background: '#fff', padding: 12, overflow: 'hidden' }}>
                    <div className="fw-bold" style={{ fontSize: 12.5, color: 'var(--brand-deep)', borderBottom: '2px solid var(--brand)', paddingBottom: 4 }}>{p.title}</div>
                    <ul style={{ margin: '6px 0 0', paddingLeft: 16, fontSize: 11, lineHeight: 1.7, color: 'var(--ink-2)' }}>
                      {(p.bullets || []).slice(0, 3).map((b: string, k: number) => <li key={k}>{b}</li>)}
                    </ul>
                    <div className="row g-1 mt-1 wrap">
                      {(p.emphasis || []).slice(0, 2).map((e: string) => <span key={e} className="tag tag-amber" style={{ fontSize: 10, padding: '1px 6px' }}>{e}</span>)}
                    </div>
                    <div className="text-xs text-muted mt-1" style={{ fontSize: 10 }}>视觉方案：{p.visual_element_plan}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!running && !result && !diagnosis && (
            <div className="empty">
              <div className="empty-ic"><Icon name="spark" size={32} /></div>
              <div className="text-small">配置左侧任务并启动两阶段生成<br />Design Log 与产物将在此实时展示</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
