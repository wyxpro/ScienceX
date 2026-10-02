/* 多智能体专家评审团 —— REQ-SPC-02：五角色并行评审 · 冲突分析 · 修改优先级 */
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import Icon, { type IconName } from '../components/Icon';
import { Empty, Skeleton, Tag, useToast } from '../components/ui';
import { TaskRunner } from '../components/TaskRunner';

const VERDICT_META: Record<string, { label: string; color: string; tone: string; score: number }> = {
  accept: { label: '接受', color: 'green', tone: 'var(--brand)', score: 9.0 },
  weak_accept: { label: '弱接受', color: 'green', tone: 'var(--brand)', score: 8.0 },
  borderline: { label: '边缘', color: 'amber', tone: 'var(--accent)', score: 6.5 },
  weak_reject: { label: '弱拒绝', color: 'red', tone: 'var(--red)', score: 5.0 },
  reject_risk: { label: '拒稿风险', color: 'red', tone: 'var(--red)', score: 3.5 },
};
const DECISION_META: Record<string, { label: string; color: string }> = {
  accept: { label: 'Accept 接收', color: 'green' },
  minor_revision: { label: 'Minor Revision 小修', color: 'green' },
  major_revision: { label: 'Major Revision 大修', color: 'amber' },
  reject: { label: 'Reject 拒稿', color: 'red' },
};
/* 五个审稿 Agent 的角色视觉设定 */
const ROLE_META: Record<string, { en: string; icon: IconName; color: string; bg: string }> = {
  理论审稿人: { en: 'Theory Reviewer', icon: 'bulb', color: 'var(--brand-strong)', bg: 'var(--brand-soft)' },
  方法审稿人: { en: 'Methodology Reviewer', icon: 'flask', color: 'var(--blue-safe)', bg: 'var(--blue-safe-soft)' },
  实验审稿人: { en: 'Experiment Reviewer', icon: 'chart', color: 'var(--accent)', bg: 'var(--accent-soft)' },
  写作审稿人: { en: 'Writing Reviewer', icon: 'pen', color: 'var(--gold)', bg: '#f7edd2' },
  伦理审稿人: { en: 'Ethics Reviewer', icon: 'shield', color: 'var(--red)', bg: 'var(--red-soft)' },
};
const P_META: Record<string, { color: string; label: string }> = {
  P0: { color: 'red', label: '必须修改' },
  P1: { color: 'amber', label: '建议修改' },
  P2: { color: 'gray', label: '可选优化' },
};
const DIM_LABEL: Record<string, string> = { theory: '理论创新', method: '方法设计', experiment: '实验严谨', writing: '写作质量', ethics: '伦理规范' };

export default function Review() {
  const toast = useToast();
  const [manuscripts, setManuscripts] = useState<any[]>([]);
  const [msId, setMsId] = useState('');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);
  const [checked, setChecked] = useState<Set<number>>(new Set());

  useEffect(() => {
    (async () => {
      const r = await api<{ items: any[] }>('/manuscripts');
      setManuscripts(r.items);
      if (r.items.length) setMsId(r.items[0].id);
      const h = await api<{ items: any[] }>('/review/reports');
      setReports(h.items);
      setLoading(false);
    })();
  }, []);

  const launch = async () => {
    if (!msId) return toast('请选择稿件', 'info');
    const r = await api<{ task_id: string }>('/review/council', { method: 'POST', body: { manuscript_id: msId } });
    setTaskId(r.task_id);
  };

  const openReport = async (id: string) => {
    const r = await api(`/review/reports/${id}`);
    setReport(r);
    setChecked(new Set());
  };

  if (loading) return <div className="page"><div className="card card-pad"><Skeleton lines={6} h={40} /></div></div>;

  const scores = report?.scores || {};
  const msTitle = (id: string) => manuscripts.find((m) => m.id === id)?.title || '稿件';
  const decision = DECISION_META[report?.decision] || DECISION_META.major_revision;
  const pct = report ? Math.round(scores.overall * 10) : 0;
  const ringColor = pct >= 85 ? 'var(--brand)' : pct >= 70 ? 'var(--gold)' : pct >= 55 ? 'var(--accent)' : 'var(--red)';
  const toggleCheck = (i: number) => setChecked((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });

  return (
    <div className="page" style={{ gap: 16 }}>
      {/* ===== 页头 ===== */}
      <div className="card card-pad" style={{ flex: 'none', background: 'linear-gradient(135deg, var(--accent-soft), var(--surface) 60%)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', boxShadow: '0 6px 16px -6px rgba(194,118,43,.55)' }}>
          <Icon name="award" size={22} />
        </div>
        <div className="grow" style={{ minWidth: 240 }}>
          <div className="fw-bold" style={{ fontSize: 16 }}>五角色评审团 · 主席 Agent 汇总</div>
          <p className="text-xs text-muted" style={{ marginTop: 3 }}>
            理论 / 方法 / 实验 / 写作 / 伦理 5 个审稿 Agent <b>并行独立评审</b>，主席 Agent 自动汇总结论、定位意见冲突并生成按优先级排序的修改清单。
          </p>
        </div>
        <div className="row g-2 wrap" style={{ flex: 'none' }}>
          <select className="select" value={msId} onChange={(e) => setMsId(e.target.value)} style={{ width: 230 }} aria-label="选择评审稿件">
            {manuscripts.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
          <button className="btn btn-primary" onClick={launch}><Icon name="zap" size={14} />发起评审</button>
        </div>
      </div>

      {!report ? (
        /* ===== 报告列表视图 ===== */
        <div className="grid" style={{ gridTemplateColumns: reports.length ? 'minmax(0, 2fr) minmax(0, 1fr)' : '1fr', alignItems: 'start', gap: 14 }}>
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="row-between" style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
              <span className="card-title"><Icon name="doc" size={15} /> 历史评审报告</span>
              <span className="text-xs text-muted">{reports.length} 份</span>
            </div>
            {reports.length === 0 ? (
              <div style={{ padding: 24 }}><Empty icon="award" text="暂无评审报告，选择稿件发起一次评审吧" /></div>
            ) : reports.map((r, i) => {
              const d = DECISION_META[r.decision] || DECISION_META.major_revision;
              const p = Math.round(r.scores.overall * 10);
              return (
                <div key={r.id} className="row-between wrap g-3 card-hover anim-in" style={{ padding: '14px 16px', cursor: 'pointer', borderBottom: i < reports.length - 1 ? '1px solid var(--line)' : 'none', animationDelay: `${i * 60}ms` }} onClick={() => openReport(r.id)}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="fw-bold text-small ellipsis" style={{ marginBottom: 5 }}>{msTitle(r.manuscript_id)}</div>
                    <div className="row g-1 wrap">
                      <Tag color={d.color as any}><Icon name="award" size={11} />{d.label}</Tag>
                      <span className="text-xs text-muted mono">{String(r.created_at).slice(0, 10)}</span>
                      <span className="text-xs text-muted">· 5 角色意见 · {r.conflicts?.length ?? 0} 处冲突 · {r.priorities?.length ?? 0} 项修改建议</span>
                    </div>
                  </div>
                  <div className="row g-2" style={{ flex: 'none' }}>
                    <div style={{ position: 'relative', width: 44, height: 44 }}>
                      <svg width={44} height={44}>
                        <circle cx={22} cy={22} r={18} fill="none" stroke="var(--bg-deep)" strokeWidth={4} />
                        <circle cx={22} cy={22} r={18} fill="none" stroke={p >= 70 ? 'var(--brand)' : 'var(--accent)'} strokeWidth={4} strokeLinecap="round" strokeDasharray={2 * Math.PI * 18} strokeDashoffset={2 * Math.PI * 18 * (1 - p / 100)} transform="rotate(-90 22 22)" />
                      </svg>
                      <span className="mono" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 700 }}>{p}</span>
                    </div>
                    <Icon name="chevronRight" size={16} />
                  </div>
                </div>
              );
            })}
          </div>
          {reports.length > 0 && (
            <div className="card card-pad anim-in" style={{ display: 'flex', flexDirection: 'column', gap: 10, animationDelay: '.15s' }}>
              <span className="card-title"><Icon name="info" size={15} /> 评审团工作流</span>
              {[
                ['zap', '并行评审', '5 个审稿 Agent 各自独立打分并撰写意见，互不可见'],
                ['alert', '冲突检测', '主席 Agent 比对意见分歧，定位结论矛盾的评审点'],
                ['target', '优先级裁决', '给出冲突化解建议与 P0-P2 修改优先级清单'],
              ].map(([ic, t, d], i) => (
                <div key={t} className="row g-2" style={{ alignItems: 'flex-start' }}>
                  <span style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', marginTop: 1 }}>
                    <Icon name={ic as IconName} size={13} />
                  </span>
                  <div>
                    <div className="text-small fw-bold">{i + 1}. {t}</div>
                    <div className="text-xs text-muted" style={{ lineHeight: 1.6, marginTop: 2 }}>{d}</div>
                  </div>
                </div>
              ))}
              <div className="text-xs text-muted" style={{ marginTop: 'auto', paddingTop: 6, borderTop: '1px dashed var(--line)' }}>点击左侧任意报告查看完整评审结果。</div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* ===== 报告总览横幅 ===== */}
          <div className="card card-pad anim-in" style={{ flex: 'none', display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: 116, height: 116, flex: 'none' }}>
              <svg width={116} height={116}>
                <circle cx={58} cy={58} r={50} fill="none" stroke="var(--bg-deep)" strokeWidth={9} />
                <circle cx={58} cy={58} r={50} fill="none" stroke={ringColor} strokeWidth={9} strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 50} strokeDashoffset={2 * Math.PI * 50 * (1 - pct / 100)}
                  style={{ transition: 'stroke-dashoffset 1s var(--ease)', transform: 'rotate(-90deg)', transformOrigin: 'center' }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span className="mono" style={{ fontSize: 26, fontWeight: 800, color: ringColor }}>{pct}</span>
                <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>主席综合评分</span>
              </div>
            </div>
            <div className="grow" style={{ minWidth: 260 }}>
              <div className="row g-2 wrap mb-2" style={{ alignItems: 'center' }}>
                <span className="fw-bold text-serif" style={{ fontSize: 15.5 }}>{msTitle(report.manuscript_id)}</span>
                <Tag color={decision.color as any}><Icon name="award" size={11} />{decision.label}</Tag>
                <span className="text-xs text-muted mono">{String(report.created_at).slice(0, 10)}</span>
              </div>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px 18px' }}>
                {Object.entries(DIM_LABEL).map(([k, label]) => {
                  const v = Number(scores[k] ?? 0);
                  const p = Math.round(v * 10);
                  return (
                    <div key={k}>
                      <div className="row-between text-xs mb-1">
                        <span className="text-muted">{label}</span>
                        <span className="mono fw-bold" style={{ color: v >= 7.5 ? 'var(--brand)' : v >= 6 ? 'var(--gold)' : 'var(--accent)' }}>{v.toFixed(1)}</span>
                      </div>
                      <div className="progress"><div className={v >= 7.5 ? 'progress-bar' : 'progress-bar amber'} style={{ width: `${p}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="row g-2" style={{ flex: 'none', alignSelf: 'flex-start' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => { setReport(null); setChecked(new Set()); }}><Icon name="chevronLeft" size={12} /> 返回列表</button>
              <button className="btn btn-soft btn-sm" onClick={() => toast('审稿报告已导出 PDF（演示）')}><Icon name="download" size={12} /> 导出</button>
            </div>
          </div>

          {/* ===== 五角色意见 ===== */}
          <div style={{ flex: 'none' }}>
            <div className="row-between" style={{ marginBottom: 8 }}>
              <span className="card-title"><Icon name="users" size={15} /> 审稿意见 · 五位 Agent 独立评审</span>
              <span className="text-xs text-muted">点击卡片展开 / 收起完整意见</span>
            </div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {report.roles.map((r: any, i: number) => {
                const v = VERDICT_META[r.verdict] || VERDICT_META.borderline;
                const meta = ROLE_META[r.role] || { en: 'Reviewer', icon: 'user' as IconName, color: 'var(--brand-strong)', bg: 'var(--brand-soft)' };
                const vs = v.score;
                const vp = Math.round(vs * 10);
                return (
                  <details key={r.role} className="card card-pad anim-in" open={i === 0} style={{ display: 'flex', flexDirection: 'column', gap: 10, animationDelay: `${i * 60}ms`, cursor: 'pointer' }}>
                    <summary style={{ listStyle: 'none', display: 'flex', alignItems: 'center', gap: 10, outline: 'none' }}>
                      <span style={{ width: 38, height: 38, borderRadius: 11, background: meta.bg, color: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                        <Icon name={meta.icon} size={17} />
                      </span>
                      <div className="grow" style={{ minWidth: 0 }}>
                        <div className="fw-bold text-small">{r.role}</div>
                        <div className="text-xs text-muted mono ellipsis" style={{ letterSpacing: '.02em' }}>{meta.en}</div>
                      </div>
                      <span className="mono fw-bold" style={{ fontSize: 17, color: v.tone, flex: 'none' }}>{vs.toFixed(1)}</span>
                      <Icon name="chevronDown" size={14} style={{ flex: 'none', color: 'var(--muted)', transition: 'transform .2s' }} />
                    </summary>
                    <div className="row-between">
                      <Tag color={v.color as any}>{v.label}</Tag>
                      <span className="text-xs text-muted">评分权重 1/5</span>
                    </div>
                    <div className="progress"><div className={vp >= 75 ? 'progress-bar' : 'progress-bar amber'} style={{ width: `${vp}%` }} /></div>
                    <p className="text-small" style={{ lineHeight: 1.8, color: 'var(--ink-2)' }}>{r.comments}</p>
                  </details>
                );
              })}
            </div>
          </div>

          {/* ===== 冲突分析 + 修改优先级 ===== */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', alignItems: 'start' }}>
            {/* 冲突分析 */}
            <div className="card card-pad anim-in">
              <div className="row-between mb-2">
                <span className="card-title"><Icon name="alert" size={15} /> 意见冲突分析</span>
                <Tag color="amber">{report.conflicts.length} 处</Tag>
              </div>
              {report.conflicts.map((c: any, i: number) => (
                <div key={i} style={{ border: '1px solid var(--line)', borderLeft: '3px solid var(--accent)', borderRadius: 'var(--r-md)', padding: '12px 14px', marginBottom: i < report.conflicts.length - 1 ? 10 : 0, background: 'var(--bg-deep)' }}>
                  <div className="row g-1 wrap mb-1" style={{ alignItems: 'center' }}>
                    <span className="mono text-xs" style={{ color: 'var(--accent)', fontWeight: 700 }}>CONFLICT #{i + 1}</span>
                    {c.between.map((b: string) => <span key={b} className="tag tag-outline">{b}</span>)}
                  </div>
                  <div className="text-small mb-1" style={{ lineHeight: 1.7 }}>{c.point}</div>
                  <div className="text-xs" style={{ color: 'var(--brand-strong)', display: 'flex', gap: 5, alignItems: 'flex-start', lineHeight: 1.7 }}>
                    <Icon name="check" size={12} style={{ flex: 'none', marginTop: 3 }} /> <span><b>主席裁决：</b>{c.resolution}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* 修改优先级清单（可勾选） */}
            <div className="card card-pad anim-in" style={{ animationDelay: '.08s' }}>
              <div className="row-between mb-2">
                <span className="card-title"><Icon name="target" size={15} /> 修改优先级清单</span>
                <span className="text-xs text-muted mono">{checked.size}/{report.priorities.length} 已完成</span>
              </div>
              {report.priorities.map((p: any, i: number) => {
                const done = checked.has(i);
                const pm = P_META[p.level] || P_META.P2;
                return (
                  <div key={i} onClick={() => toggleCheck(i)} className="row g-2" style={{ padding: '9px 4px', borderBottom: i < report.priorities.length - 1 ? '1px dashed var(--line)' : 'none', alignItems: 'flex-start', cursor: 'pointer' }}>
                    <span style={{ width: 17, height: 17, borderRadius: 5, flex: 'none', marginTop: 2, border: done ? 'none' : '1.5px solid var(--line-strong)', background: done ? 'var(--brand)' : 'transparent', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
                      {done && <Icon name="check" size={11} strokeWidth={3} />}
                    </span>
                    <Tag color={pm.color as any} style={{ flex: 'none' }}>{p.level}</Tag>
                    <span className="text-small" style={{ lineHeight: 1.6, textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--muted)' : 'var(--ink)' }}>{p.item}</span>
                  </div>
                );
              })}
              <div className="row g-2 mt-3">
                <button className="btn btn-soft btn-sm" onClick={() => toast('清单已同步至课题进度看板')}>
                  <Icon name="layers" size={12} /> 同步到项目看板
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => toast('已按 P0 → P2 顺序生成修改排期（演示）')}>
                  <Icon name="calendar" size={12} /> 生成修改排期
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <TaskRunner
        taskId={taskId}
        title="五角色并行评审中"
        onClose={() => setTaskId(null)}
        onDone={async (r) => {
          if (r?.report_id) await openReport(r.report_id);
        }}
      />
    </div>
  );
}
