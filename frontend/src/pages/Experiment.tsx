/* 实验设计 —— REQ-EXP-01/02：参数看板 / GPU 监控 / 方案生成 / SOTA 对标 */
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import Icon from '../components/Icon';
import { GaugeRow } from '../components/charts';
import { Modal, Tag, Tabs, useToast } from '../components/ui';

type Tab = 'board' | 'gpu' | 'plan' | 'sota';

export default function Experiment() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('board');
  const [exps, setExps] = useState<any[] | null>(null);
  const [expId, setExpId] = useState<string>('');
  const [gpu, setGpu] = useState<any[]>([]);
  const [plan, setPlan] = useState<any>(null);
  const [goal, setGoal] = useState('验证跨层 AU 交互对微表情识别 UF1 的贡献');
  const [method, setMethod] = useState('RAFT-AU-Former up9（ViT-B + AU 图分支）');
  const [sota, setSota] = useState<any>(null);
  const [sotaDs, setSotaDs] = useState(0);
  const [runModal, setRunModal] = useState(false);
  const [runForm, setRunForm] = useState({ name: 'up12-cross-attn-s7', lr: '3e-4', batch: '32', epochs: '80', seed: '7' });

  useEffect(() => {
    (async () => {
      const r = await api<{ items: any[] }>('/experiments');
      setExps(r.items);
      if (r.items.length) setExpId(r.items[0].id);
      const g = await api<{ nodes: any[] }>('/gpu/nodes');
      setGpu(g.nodes);
      setSota(await api('/sota'));
    })();
  }, []);

  /* GPU 自动刷新 */
  useEffect(() => {
    if (tab !== 'gpu') return;
    const t = setInterval(async () => {
      const g = await api<{ nodes: any[] }>('/gpu/nodes');
      setGpu(g.nodes);
    }, 3000);
    return () => clearInterval(t);
  }, [tab]);

  const exp = exps?.find((e) => e.id === expId);

  const genPlan = async () => {
    setPlan(await api('/experiments/plan', { method: 'POST', body: { goal, method } }));
    toast('实验方案已生成');
  };

  const submitRun = async () => {
    const r = await api(`/experiments/${expId}/runs`, {
      method: 'POST',
      body: { name: runForm.name, params: { lr: Number(runForm.lr), batch: +runForm.batch, epochs: +runForm.epochs, seed: +runForm.seed, backbone: 'ViT-B', au_branch: true, cross_attn: true } },
    });
    toast(r as any === Object(r) ? '实验已提交运行' : '实验已提交');
    setRunModal(false);
    const rr = await api<{ items: any[] }>('/experiments');
    setExps(rr.items);
  };

  const statusTag = (s: string) =>
    s === 'running' ? <Tag color="green"><span className="dot dot-green dot-pulse" />运行中</Tag>
      : s === 'completed' ? <Tag color="gray">已完成</Tag>
        : s === 'failed' ? <Tag color="red">失败</Tag> : <Tag color="amber">已规划</Tag>;

  return (
    <div className="page">
      <Tabs active={tab} onChange={(k) => setTab(k as Tab)} tabs={[
        { key: 'board', label: <><Icon name="layers" size={14} />参数看板</> },
        { key: 'gpu', label: <><Icon name="cpu" size={14} />GPU 监控</> },
        { key: 'plan', label: <><Icon name="spark" size={14} />方案生成</> },
        { key: 'sota', label: <><Icon name="award" size={14} />SOTA 对标</> },
      ]} />

      {/* ===== 参数看板 ===== */}
      {tab === 'board' && exps && (
        <div className="anim-in">
          <div className="row g-2 wrap mb-3">
            <select className="select" style={{ width: 300 }} value={expId} onChange={(e) => setExpId(e.target.value)}>
              {exps.map((e) => <option key={e.id} value={e.id}>{e.name}（{e.runs.length} 次运行）</option>)}
            </select>
            <button className="btn btn-primary" onClick={() => setRunModal(true)}><Icon name="play" size={14} />新建实验</button>
          </div>

          {exp && (
            <>
              <div className="card card-pad mb-3">
                <div className="row-between wrap g-2">
                  <div>
                    <div className="fw-bold" style={{ fontSize: 15 }}>{exp.name}</div>
                    <div className="text-small text-muted mt-1">{exp.goal}</div>
                  </div>
                  {statusTag(exp.status)}
                </div>
              </div>
              <div className="card mb-3" style={{ overflowX: 'auto' }}>
                <table className="tbl">
                  <thead><tr><th>运行</th><th>lr</th><th>batch</th><th>epochs</th><th>seed</th><th>配置</th><th>UF1</th><th>UAR</th><th>Acc</th><th>GPU</th><th>状态</th></tr></thead>
                  <tbody>
                    {exp.runs.map((r: any) => (
                      <tr key={r.id}>
                        <td className="fw-bold">{r.name}</td>
                        <td className="num">{r.params.lr}</td>
                        <td className="num">{r.params.batch}</td>
                        <td className="num">{r.params.epochs}</td>
                        <td className="num">{r.params.seed}</td>
                        <td>
                          {r.params.cross_attn && <Tag color="green">cross-attn</Tag>}
                          {r.params.flow_boost && <Tag color="amber">flow×{r.params.flow_boost?.replace('x', '')}</Tag>}
                          {r.params.au_branch === false && <Tag color="red">w/o AU</Tag>}
                        </td>
                        <td className="num fw-bold" style={{ color: 'var(--brand-strong)' }}>{r.metrics.UF1?.toFixed(4) ?? '—'}</td>
                        <td className="num">{r.metrics.UAR?.toFixed(4) ?? '—'}</td>
                        <td className="num">{r.metrics.Acc?.toFixed(4) ?? '—'}</td>
                        <td className="num">{r.gpu_node}</td>
                        <td>{statusTag(r.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* ===== GPU 监控 ===== */}
      {tab === 'gpu' && (
        <div className="anim-in grid grid-3 stagger">
          {gpu.map((n) => (
            <div key={n.id} className="card card-pad card-hover">
              <div className="row-between mb-2">
                <div className="row g-2">
                  <Icon name="cpu" size={16} style={{ color: n.status === 'offline' ? 'var(--muted)' : 'var(--brand)' }} />
                  <div>
                    <div className="fw-bold text-small">{n.gpu_model}</div>
                    <div className="text-xs text-muted">{n.host} · {n.id}</div>
                  </div>
                </div>
                {n.status === 'free' ? <Tag color="green">空闲</Tag> : n.status === 'offline' ? <Tag color="gray">离线</Tag> : <Tag color="amber">占用</Tag>}
              </div>
              {n.status !== 'offline' ? (
                <>
                  <GaugeRow label="计算利用率" value={n.util} total={100} unit="%" />
                  <GaugeRow label="显存占用" value={n.mem_used} total={n.mem_total} />
                  <div className="row-between text-xs text-muted mt-1">
                    <span>温度 {n.temp}°C</span>
                    <span>{n.task ? `任务：${n.task}` : '—'}</span>
                  </div>
                </>
              ) : (
                <div className="text-small text-muted" style={{ padding: '12px 0' }}>节点离线，重试采集中…</div>
              )}
            </div>
          ))}
          <div className="card card-pad" style={{ background: 'var(--brand-softer)', borderColor: 'var(--brand-soft)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="refresh" size={16} />
            <span className="text-small">每 3 秒自动刷新 · 数据来自 nvidia-smi 采集上报</span>
          </div>
        </div>
      )}

      {/* ===== 方案生成 ===== */}
      {tab === 'plan' && (
        <div className="anim-in grid grid-2" style={{ gridTemplateColumns: 'minmax(280px, 1fr) minmax(320px, 1.5fr)', alignItems: 'start' }}>
          <div className="card card-pad">
            <div className="form-row">
              <label className="field-label">研究目标</label>
              <textarea className="textarea" rows={3} value={goal} onChange={(e) => setGoal(e.target.value)} />
            </div>
            <div className="form-row">
              <label className="field-label">当前方法</label>
              <textarea className="textarea" rows={3} value={method} onChange={(e) => setMethod(e.target.value)} />
            </div>
            <button className="btn btn-primary btn-block" onClick={genPlan}><Icon name="spark" size={14} />生成消融 + 对比实验方案</button>
          </div>
          {plan ? (
            <div className="col g-2 anim-pop">
              <div className="card card-pad">
                <div className="card-title mb-2"><Icon name="flask" size={15} />消融实验设计</div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="tbl">
                    <thead><tr><th>配置</th><th>AU 分支</th><th>跨层交互</th><th>光流增强</th><th>验证目标</th></tr></thead>
                    <tbody>
                      {plan.ablation.map((a: any) => (
                        <tr key={a.id}>
                          <td className="fw-bold">{a.name}</td>
                          <td>{a.au_branch ? '✓' : '✗'}</td>
                          <td>{a.cross_attn ? '✓' : '✗'}</td>
                          <td>{a.flow_boost}</td>
                          <td className="text-small text-muted">{a.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="card card-pad">
                <div className="card-title mb-2"><Icon name="users" size={15} />对比实验</div>
                {plan.comparison.map((c: any) => (
                  <div className="kv" key={c.method}><span className="kv-v">{c.method}</span><span className="text-xs text-muted">{c.note}</span></div>
                ))}
              </div>
              <div className="card card-pad">
                <div className="card-title mb-2"><Icon name="target" size={15} />变量控制</div>
                <div className="text-xs text-muted" style={{ marginBottom: 4 }}>控制变量</div>
                <div className="row g-1 wrap mb-2">{plan.variables.controlled.map((v: string) => <Tag key={v} color="gray">{v}</Tag>)}</div>
                <div className="text-xs text-muted" style={{ marginBottom: 4 }}>自变量</div>
                <div className="row g-1 wrap mb-2">{plan.variables.independent.map((v: string) => <Tag key={v} color="green">{v}</Tag>)}</div>
                <div className="text-xs text-muted" style={{ marginBottom: 4 }}>因变量</div>
                <div className="row g-1 wrap">{plan.variables.dependent.map((v: string) => <Tag key={v} color="amber">{v}</Tag>)}</div>
              </div>
              <div className="card card-pad" style={{ background: 'var(--accent-soft)', borderColor: '#ecd9bb' }}>
                <div className="card-title mb-1"><Icon name="info" size={15} />执行建议</div>
                {plan.advice.map((a: string) => <div key={a} className="text-small" style={{ padding: '2px 0' }}>· {a}</div>)}
              </div>
            </div>
          ) : (
            <div className="card card-pad text-center text-muted" style={{ padding: 60 }}>
              <Icon name="spark" size={30} style={{ opacity: 0.4, marginBottom: 10 }} />
              <div className="text-small">输入研究目标与方法<br />LLM 将生成含变量设计的实验方案</div>
            </div>
          )}
        </div>
      )}

      {/* ===== SOTA 对标 ===== */}
      {tab === 'sota' && sota && (
        <div className="anim-in">
          <div className="card card-pad mb-3">
            <div className="row g-2 wrap">
              <span className="fw-bold">{sota.task}</span>
              <Tag color="blue">协议：{sota.protocol}</Tag>
              <span className="text-xs text-muted">数据聚合自 Papers with Code 与文献复现</span>
            </div>
          </div>
          <div className="seg mb-3">
            {sota.datasets.map((d: any, i: number) => (
              <button key={d.name} className={`seg-btn ${sotaDs === i ? 'active' : ''}`} onClick={() => setSotaDs(i)}>
                {d.name}（{d.samples} 样本 · {d.subjects} 人 · {d.classes} 类）
              </button>
            ))}
          </div>
          <div className="card" style={{ overflowX: 'auto' }}>
            <table className="tbl">
              <thead><tr><th>排名</th><th>方法</th><th>年份</th><th>UF1</th><th>UAR</th><th>代码</th></tr></thead>
              <tbody>
                {sota.datasets[sotaDs].entries.map((e: any) => (
                  <tr key={e.method} style={e.is_ours ? { background: 'var(--brand-softer)' } : undefined}>
                    <td className="fw-bold">#{e.rank}</td>
                    <td className="fw-bold">{e.method}{e.is_ours && <Tag color="green">本文</Tag>}</td>
                    <td className="num">{e.year}</td>
                    <td className="num fw-bold" style={{ color: 'var(--brand-strong)', fontSize: 13.5 }}>{e.uf1.toFixed(3)}</td>
                    <td className="num">{e.uar.toFixed(3)}</td>
                    <td>{e.has_code ? <a href="#" onClick={(ev) => ev.preventDefault()}><Icon name="branch" size={13} /></a> : <span className="text-muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-xs text-muted mt-2">⚠️ 对比时务必确认协议一致：非 LOSO 报告的 0.9+ 结果不具备可比性</div>
        </div>
      )}

      {/* 新建实验 */}
      <Modal open={runModal} onClose={() => setRunModal(false)} title="新建实验运行"
        footer={<><button className="btn btn-ghost" onClick={() => setRunModal(false)}>取消</button>
          <button className="btn btn-primary" onClick={submitRun}><Icon name="play" size={14} />提交运行</button></>}>
        <div className="form-row"><label className="field-label">运行名称</label>
          <input className="input" value={runForm.name} onChange={(e) => setRunForm({ ...runForm, name: e.target.value })} /></div>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <div className="form-row"><label className="field-label">学习率</label>
            <input className="input mono" value={runForm.lr} onChange={(e) => setRunForm({ ...runForm, lr: e.target.value })} /></div>
          <div className="form-row"><label className="field-label">Batch Size</label>
            <input className="input mono" value={runForm.batch} onChange={(e) => setRunForm({ ...runForm, batch: e.target.value })} /></div>
          <div className="form-row"><label className="field-label">Epochs</label>
            <input className="input mono" value={runForm.epochs} onChange={(e) => setRunForm({ ...runForm, epochs: e.target.value })} /></div>
          <div className="form-row"><label className="field-label">随机种子</label>
            <input className="input mono" value={runForm.seed} onChange={(e) => setRunForm({ ...runForm, seed: e.target.value })} /></div>
        </div>
        <div className="text-xs text-muted">将自动调度至空闲 GPU（A100-04 当前空闲）· 参数将沉淀到看板</div>
      </Modal>
    </div>
  );
}
