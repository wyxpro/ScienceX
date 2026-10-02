/* 多智能体专家评审团 —— REQ-SPC-02：五角色并行评审 · 冲突分析 · 修改优先级 */
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import Icon from '../components/Icon';
import { Empty, ScoreRing, Skeleton, Tag, useToast } from '../components/ui';
import { MetricBar } from '../components/charts';
import { TaskRunner } from '../components/TaskRunner';

const VERDICT_META: Record<string, { label: string; color: string }> = {
  accept: { label: '接受', color: 'green' },
  weak_accept: { label: '弱接受', color: 'green' },
  borderline: { label: '边缘', color: 'amber' },
  weak_reject: { label: '弱拒绝', color: 'red' },
  reject_risk: { label: '拒稿风险', color: 'red' },
};
const DECISION_META: Record<string, { label: string; color: string }> = {
  accept: { label: 'Accept 接收', color: 'green' },
  minor_revision: { label: 'Minor Revision 小修', color: 'green' },
  major_revision: { label: 'Major Revision 大修', color: 'amber' },
  reject: { label: 'Reject 拒稿', color: 'red' },
};
const P_COLOR: Record<string, string> = { P0: 'red', P1: 'amber', P2: 'gray' };

export default function Review() {
  const toast = useToast();
  const [manuscripts, setManuscripts] = useState<any[]>([]);
  const [msId, setMsId] = useState('');
  const [taskId, setTaskId] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);

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
  };

  if (loading) return <div className="page"><div className="card card-pad"><Skeleton lines={6} h={40} /></div></div>;

  const scores = report?.scores || {};

  return (
    <div className="page" style={{ gap: 14 }}>
      {/* ===== 发起评审 ===== */}
      <div className="card card-pad row-between wrap g-2" style={{ flex: 'none' }}>
        <div className="grow" style={{ minWidth: 240 }}>
          <div className="fw-bold" style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="award" size={15} /> 五角色评审团
          </div>
          <p className="text-xs text-muted" style={{ marginTop: 4 }}>
            理论 / 方法 / 实验 / 写作 / 伦理 5 个 Agent 并行评审，主席 Agent 汇总结论、定位冲突并给出修改优先级。
          </p>
        </div>
        <div className="row g-2 wrap">
          <select className="select" value={msId} onChange={(e) => setMsId(e.target.value)} style={{ width: 240 }}>
            {manuscripts.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select>
          <button className="btn btn-primary" onClick={launch}><Icon name="zap" size={14} />发起评审</button>
        </div>
      </div>

      {!report ? (
        <div className="card card-pad">
          {reports.length === 0 ? (
            <Empty icon="award" text="暂无评审报告，选择稿件发起一次评审吧" />
          ) : (
            <>
              <div className="text-xs text-muted mb-2">历史评审报告</div>
              {reports.map((r) => (
                <div key={r.id} className="row-between wrap g-2 card-hover" style={{ padding: '10px 4px', cursor: 'pointer' }} onClick={() => openReport(r.id)}>
                  <div className="row g-2" style={{ minWidth: 0 }}>
                    <span className="fw-bold text-small">{manuscripts.find((m) => m.id === r.manuscript_id)?.title || '稿件'}</span>
                    <Tag color={(DECISION_META[r.decision] || DECISION_META.major_revision).color as any}>
                      {(DECISION_META[r.decision] || DECISION_META.major_revision).label}
                    </Tag>
                  </div>
                  <span className="text-xs text-muted mono">总分 {r.scores.overall} · {String(r.created_at).slice(0, 10)}</span>
                </div>
              ))}
            </>
          )}
        </div>
      ) : (
        <>
          {/* ===== 总评 ===== */}
          <div className="card card-pad anim-in" style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <ScoreRing value={Math.round(scores.overall * 10)} size={86} label="总分" />
            <div className="grow" style={{ minWidth: 220 }}>
              <div className="row g-2 wrap mb-2">
                <Tag color={(DECISION_META[report.decision] || DECISION_META.major_revision).color as any}>
                  <Icon name="award" size={11} />主席结论：{(DECISION_META[report.decision] || DECISION_META.major_revision).label}
                </Tag>
                <Tag color="gray">{String(report.created_at).slice(0, 10)}</Tag>
              </div>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '4px 18px' }}>
                <MetricBar label="理论创新" value={scores.theory} max={10} />
                <MetricBar label="方法设计" value={scores.method} max={10} />
                <MetricBar label="实验严谨" value={scores.experiment} max={10} />
                <MetricBar label="写作质量" value={scores.writing} max={10} />
                <MetricBar label="伦理规范" value={scores.ethics} max={10} />
              </div>
            </div>
          </div>

          {/* ===== 五角色意见 ===== */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {report.roles.map((r: any, i: number) => {
              const v = VERDICT_META[r.verdict] || VERDICT_META.borderline;
              return (
                <div key={r.role} className="card card-pad anim-in" style={{ display: 'flex', flexDirection: 'column', gap: 8, animationDelay: `${i * 60}ms` }}>
                  <div className="row-between">
                    <span className="fw-bold text-small"><Icon name="user" size={13} /> {r.role}</span>
                    <Tag color={v.color as any}>{v.label}</Tag>
                  </div>
                  <p className="text-small" style={{ lineHeight: 1.8, color: 'var(--ink-2)' }}>{r.comments}</p>
                </div>
              );
            })}
          </div>

          {/* ===== 冲突分析 + 修改优先级 ===== */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
            <div className="card card-pad">
              <div className="fw-bold mb-2" style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 7 }}>
                <Icon name="alert" size={14} /> 审稿意见冲突分析（{report.conflicts.length} 处）
              </div>
              {report.conflicts.map((c: any, i: number) => (
                <div key={i} className="card card-pad" style={{ background: 'var(--bg-deep)', marginBottom: 8, padding: 12 }}>
                  <div className="row g-1 wrap mb-1">
                    {c.between.map((b: string) => <Tag key={b} color="amber">{b}</Tag>)}
                  </div>
                  <div className="text-small mb-1">{c.point}</div>
                  <div className="text-xs" style={{ color: 'var(--brand-strong)', display: 'flex', gap: 5, alignItems: 'center' }}>
                    <Icon name="check" size={12} /> {c.resolution}
                  </div>
                </div>
              ))}
            </div>
            <div className="card card-pad">
              <div className="fw-bold mb-2" style={{ fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 7 }}>
                <Icon name="target" size={14} /> 修改优先级清单
              </div>
              {report.priorities.map((p: any, i: number) => (
                <div key={i} className="row g-2 text-small" style={{ padding: '7px 0', borderBottom: i < report.priorities.length - 1 ? '1px dashed var(--line)' : 'none', alignItems: 'flex-start' }}>
                  <Tag color={P_COLOR[p.level] as any} style={{ flex: 'none' }}>{p.level}</Tag>
                  <span style={{ lineHeight: 1.6 }}>{p.item}</span>
                </div>
              ))}
              <button className="btn btn-soft btn-sm mt-3" onClick={() => setReport(null)}>
                <Icon name="refresh" size={12} /> 返回列表
              </button>
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
