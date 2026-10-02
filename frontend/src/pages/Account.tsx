/* 个人中心 —— REQ-USER-01~05：资料偏好 · 模型管理 · 用量 · 订阅计费 · 安全 */
import { useEffect, useState } from 'react';
import { api } from '../api/client';
import Icon from '../components/Icon';
import { Confirm, Empty, Modal, Progress, Switch, Tabs, Tag, useToast } from '../components/ui';
import { BarChart, LineChart } from '../components/charts';
import { useAuth } from '../stores/auth';

export default function Account() {
  const toast = useToast();
  const { user, refresh } = useAuth();
  const [tab, setTab] = useState('profile');

  /* 资料 */
  const [form, setForm] = useState<any>({});
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  /* 模型 */
  const [models, setModels] = useState<{ builtin: any[]; custom: any[] }>({ builtin: [], custom: [] });
  const [addOpen, setAddOpen] = useState(false);
  const [mForm, setMForm] = useState({ name: '', base_url: '', model_name: '', api_key: '', priority: 1 });
  const [testing, setTesting] = useState<string | null>(null);
  const [delTarget, setDelTarget] = useState<any>(null);

  /* 用量 */
  const [usage, setUsage] = useState<any>(null);
  const [range, setRange] = useState(30);

  /* 订阅 */
  const [plans, setPlans] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [order, setOrder] = useState<any>(null);

  /* 安全 */
  const [security, setSecurity] = useState<any>(null);
  const [delAccountOpen, setDelAccountOpen] = useState(false);
  const [delConfirmText, setDelConfirmText] = useState('');

  useEffect(() => {
    const p = { name: user?.name || '', title: user?.title || '', research_tags: user?.research_tags || [] };
    setForm(p);
  }, [user]);

  useEffect(() => {
    (async () => {
      const m = await api('/models');
      setModels(m);
      const s = await api('/account/security');
      setSecurity(s);
    })();
  }, []);

  useEffect(() => {
    if (tab === 'usage') api('/usage', { params: { range } }).then(setUsage);
  }, [tab, range]);

  useEffect(() => {
    if (tab === 'billing') {
      Promise.all([api('/billing/plans'), api('/billing/subscription'), api('/billing/orders')])
        .then(([p, s, o]) => { setPlans(p); setSubscription(s); setOrders(o.items || o); });
    }
  }, [tab]);

  /* ===== 资料保存 ===== */
  const saveProfile = async () => {
    setSaving(true);
    try {
      const r = await api('/user/profile', { method: 'PUT', body: form });
      void r;
      await refresh();
      toast('资料已更新');
    } finally { setSaving(false); }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (!form.research_tags.includes(t)) setForm({ ...form, research_tags: [...form.research_tags, t] });
    setTagInput('');
  };

  /* ===== 模型管理 ===== */
  const addModel = async () => {
    if (!mForm.base_url || !mForm.model_name) return toast('BaseURL 与模型名为必填项', 'info');
    const m = await api('/models', { method: 'POST', body: mForm });
    setModels((x) => ({ ...x, custom: [...x.custom, m] }));
    setAddOpen(false);
    setMForm({ name: '', base_url: '', model_name: '', api_key: '', priority: 1 });
    toast('自定义模型已添加');
  };

  const testModel = async (id: string) => {
    setTesting(id);
    try {
      const r = await api(`/models/${id}/test`);
      toast(`连通正常 · ${r.latency_ms}ms`);
    } finally { setTesting(null); }
  };

  const delModel = async () => {
    await api(`/models/${delTarget.id}`, { method: 'DELETE' });
    setModels((x) => ({ ...x, custom: x.custom.filter((m) => m.id !== delTarget.id) }));
    toast('模型已删除');
  };

  /* ===== 订阅 ===== */
  const buy = async (planId: string) => {
    const r = await api('/orders', { method: 'POST', body: { plan_id: planId } });
    setOrder(r);
    toast('订单已创建（演示环境模拟支付）');
  };

  /* ===== 安全 ===== */
  const toggle2FA = async (on: boolean) => {
    await api('/account/2fa', { method: 'POST', body: { enabled: on } });
    setSecurity({ ...security, two_factor: { ...security.two_factor, enabled: on } });
    toast(on ? '两步验证已开启' : '两步验证已关闭');
  };

  const exportData = async () => {
    await api('/account/export', { method: 'POST' });
    toast('导出任务已创建，完成后可下载');
  };

  const deleteAccount = async () => {
    await api('/account', { method: 'DELETE', body: { confirm: 'DELETE' } });
    setDelAccountOpen(false);
    toast('注销申请已提交，7 天冷静期内可撤销');
  };

  const quotaKeys = subscription ? Object.keys(subscription.quota) : [];

  return (
    <div className="page" style={{ gap: 14 }}>
      <div className="card card-pad" style={{ flex: 'none' }}>
        <div className="row g-3 wrap">
          <div className="avatar" style={{ width: 52, height: 52, fontSize: 20 }}>{user?.name?.[0] || '研'}</div>
          <div className="grow" style={{ minWidth: 180 }}>
            <div className="fw-bold text-serif" style={{ fontSize: 16 }}>{user?.name}</div>
            <div className="row g-1 mt-1 wrap">
              <Tag color="amber">{subscription?.plan_name || (user?.plan === 'pro' ? 'Pro 专业版' : 'Free 免费版')}</Tag>
              <Tag color="gray">{user?.title}</Tag>
              <span className="text-xs text-muted">{user?.email}</span>
            </div>
          </div>
        </div>
      </div>

      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'profile', label: <><Icon name="user" size={13} /> 资料偏好</> },
        { key: 'models', label: <><Icon name="cpu" size={13} /> 模型管理</> },
        { key: 'usage', label: <><Icon name="chart" size={13} /> 用量统计</> },
        { key: 'billing', label: <><Icon name="card" size={13} /> 订阅计费</> },
        { key: 'security', label: <><Icon name="shield" size={13} /> 安全</> },
      ]} />

      {/* ===== 资料偏好 ===== */}
      {tab === 'profile' && (
        <div className="card card-pad anim-in" style={{ maxWidth: 640 }}>
          <div className="field-label">昵称</div>
          <input className="input mb-2" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="field-label">身份 / 头衔</div>
          <input className="input mb-2" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="例：博士生 / 副研究员" />
          <div className="field-label">研究方向标签</div>
          <div className="row g-1 wrap mb-1">
            {(form.research_tags || []).map((t: string) => (
              <span key={t} className="tag tag-green" style={{ cursor: 'pointer' }} onClick={() => setForm({ ...form, research_tags: form.research_tags.filter((x: string) => x !== t) })} title="点击移除">
                {t} <Icon name="x" size={10} />
              </span>
            ))}
          </div>
          <div className="row g-1 mb-3">
            <input className="input grow" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag()} placeholder="输入标签后回车，例：微表情识别" />
            <button className="btn btn-soft" onClick={addTag}><Icon name="plus" size={13} /></button>
          </div>
          <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>
            {saving ? <span className="spinner" /> : <Icon name="check" size={14} />} 保存资料
          </button>
        </div>
      )}

      {/* ===== 模型管理 ===== */}
      {tab === 'models' && (
        <div className="anim-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="row-between">
            <span className="text-xs text-muted">内置模型（平台托管）与自定义模型（OpenAI 兼容协议接入）</span>
            <button className="btn btn-primary btn-sm" onClick={() => setAddOpen(true)}><Icon name="plus" size={12} />添加自定义模型</button>
          </div>
          {[
            { title: '内置模型', items: models.builtin },
            { title: '自定义模型', items: models.custom },
          ].map((grp) => (
            <div key={grp.title} className="card" style={{ overflow: 'hidden' }}>
              <div className="text-xs text-muted fw-bold" style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)' }}>{grp.title}（{grp.items.length}）</div>
              {grp.items.map((m: any) => (
                <div key={m.id} className="row-between wrap g-2" style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                  <div className="row g-2" style={{ minWidth: 200 }}>
                    <span className="fw-bold text-small">{m.name}</span>
                    <Tag color={m.status === 'connected' ? 'green' : 'gray'}><span className={`dot dot-${m.status === 'connected' ? 'green' : 'gray'}`} />{m.status === 'connected' ? '已连通' : '未连通'}</Tag>
                    {m.api_key_masked && <span className="text-xs text-muted mono">{m.api_key_masked}</span>}
                  </div>
                  <div className="row g-1">
                    {!m.builtin && <>
                      <button className="btn btn-ghost btn-sm" onClick={() => testModel(m.id)}>
                        {testing === m.id ? <span className="spinner" /> : <Icon name="zap" size={12} />}测试
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => setDelTarget(m)}>
                        <Icon name="trash" size={12} />删除
                      </button>
                    </>}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ===== 用量统计 ===== */}
      {tab === 'usage' && (
        <div className="anim-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="row-between">
            <div className="row g-1">
              {[7, 30, 90].map((d) => (
                <button key={d} className={`tag ${range === d ? 'tag-green' : 'tag-outline'}`} style={{ cursor: 'pointer', border: 'none' }}
                  onClick={() => setRange(d)}>近 {d} 天</button>
              ))}
            </div>
          </div>
          {!usage ? <Empty icon="chart" text="加载中…" /> : (
            <>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                {[
                  { label: '总 Token 消耗', value: usage.summary.total_tokens.toLocaleString(), icon: 'zap' },
                  { label: 'API 调用次数', value: usage.summary.total_calls.toLocaleString(), icon: 'cpu' },
                  { label: '总费用', value: `¥${usage.summary.total_cost}`, icon: 'card' },
                  { label: '统计周期', value: `${usage.summary.period_days} 天`, icon: 'clock' },
                ].map((s) => (
                  <div key={s.label} className="card card-pad">
                    <div className="row g-1 text-xs text-muted mb-1"><Icon name={s.icon as any} size={12} />{s.label}</div>
                    <div className="mono fw-bold" style={{ fontSize: 20 }}>{s.value}</div>
                  </div>
                ))}
              </div>
              <div className="card card-pad">
                <div className="text-xs text-muted mb-2 fw-bold">每日 Token 消耗趋势</div>
                <LineChart
                  series={[{ name: 'Token', data: usage.by_day.map((d: any) => d.tokens), color: 'var(--brand)' }]}
                  labels={usage.by_day.map((d: any) => d.date.slice(5))}
                  height={180}
                  yFormat={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                />
              </div>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                <div className="card card-pad">
                  <div className="text-xs text-muted mb-2 fw-bold">分模型用量</div>
                  <BarChart
                    data={usage.by_model.map((m: any) => ({ label: m.model, value: m.tokens }))}
                    height={160}
                    format={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
                  />
                  <div className="mt-2">
                    {usage.by_model.map((m: any) => (
                      <div key={m.model} className="row-between text-xs" style={{ padding: '3px 0' }}>
                        <span>{m.model}</span>
                        <span className="text-muted mono">{m.calls} 次 · ¥{m.cost}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card card-pad">
                  <div className="text-xs text-muted mb-2 fw-bold">分场景调用</div>
                  {usage.by_scene.map((s: any) => (
                    <div key={s.scene} style={{ marginBottom: 10 }}>
                      <div className="row-between text-xs mb-1">
                        <span>{s.scene}</span>
                        <span className="mono text-muted">{s.calls} 次</span>
                      </div>
                      <Progress value={(s.calls / Math.max(...usage.by_scene.map((x: any) => x.calls))) * 100} />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ===== 订阅计费 ===== */}
      {tab === 'billing' && subscription && (
        <div className="anim-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card card-pad">
            <div className="row-between wrap g-2">
              <div>
                <div className="fw-bold" style={{ fontSize: 15 }}>当前订阅 · {subscription.plan_name}</div>
                <div className="text-xs text-muted mt-1">
                  ¥{subscription.price}/{subscription.period} · 到期 {String(subscription.expire_at).slice(0, 10)} · {subscription.auto_renew ? '自动续费已开启' : '自动续费已关闭'}
                </div>
              </div>
              <Tag color="green">{subscription.used.chat} / {subscription.quota.chat} 次对话已用</Tag>
            </div>
            <div className="grid mt-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
              {quotaKeys.map((k) => {
                const label: Record<string, string> = { chat: 'AI 对话', literature: '文献检索', chart: '图表生成', kb: '知识库' };
                return (
                  <div key={k} className="card card-pad" style={{ padding: 12 }}>
                    <div className="row-between text-xs mb-1">
                      <span className="text-muted">{label[k] || k}</span>
                      <span className="mono">{subscription.used[k]}/{subscription.quota[k]}</span>
                    </div>
                    <Progress value={(subscription.used[k] / subscription.quota[k]) * 100} amber={subscription.used[k] / subscription.quota[k] > 0.8} />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            {plans.map((p) => (
              <div key={p.id} className={`card card-pad ${subscription.plan === p.id ? 'plan-current' : 'card-hover'}`}
                style={{ display: 'flex', flexDirection: 'column', gap: 8, borderColor: subscription.plan === p.id ? 'var(--brand)' : undefined }}>
                <div className="row-between">
                  <span className="fw-bold">{p.name}</span>
                  {subscription.plan === p.id && <Tag color="green">当前</Tag>}
                </div>
                <div className="mono fw-bold" style={{ fontSize: 24 }}>
                  {p.price === 0 ? '免费' : <>¥{p.price}<span className="text-xs text-muted fw-normal"> / {p.period}</span></>}
                </div>
                {p.features.map((f: string) => (
                  <div key={f} className="row g-1 text-xs" style={{ alignItems: 'flex-start', color: 'var(--ink-2)' }}>
                    <Icon name="check" size={12} /> {f}
                  </div>
                ))}
                {subscription.plan !== p.id && p.price > 0 && (
                  <button className="btn btn-primary btn-sm" style={{ marginTop: 'auto' }} onClick={() => buy(p.id)}>升级</button>
                )}
              </div>
            ))}
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="text-xs text-muted fw-bold" style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)' }}>订单记录</div>
            {orders.length === 0 ? (
              <div style={{ padding: 20 }}><Empty icon="card" text="暂无订单" /></div>
            ) : orders.map((o) => (
              <div key={o.id} className="row-between text-small" style={{ padding: '11px 16px', borderBottom: '1px solid var(--line)' }}>
                <span className="mono text-xs">{o.order_no}</span>
                <span>{o.plan}</span>
                <span className="mono">¥{o.amount}</span>
                <Tag color={o.pay_status === 'paid' ? 'green' : 'amber'}>{o.pay_status === 'paid' ? '已支付' : '待支付'}</Tag>
                <span className="text-xs text-muted">{String(o.created_at).slice(0, 10)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== 安全 ===== */}
      {tab === 'security' && security && (
        <div className="anim-in" style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 720 }}>
          <div className="card card-pad row-between">
            <div>
              <div className="fw-bold text-small">两步验证（TOTP）</div>
              <div className="text-xs text-muted mt-1">登录时需要额外输入动态验证码，大幅提升账号安全</div>
            </div>
            <Switch on={security.two_factor.enabled} onChange={toggle2FA} />
          </div>
          <div className="card card-pad row-between wrap g-2">
            <div>
              <div className="fw-bold text-small">个人数据导出</div>
              <div className="text-xs text-muted mt-1">打包下载全部文献笔记 / 稿件 / 实验记录（zip）</div>
            </div>
            <button className="btn btn-soft btn-sm" onClick={exportData}><Icon name="download" size={12} />申请导出</button>
          </div>
          <div className="card card-pad">
            <div className="fw-bold text-small mb-2">活跃会话</div>
            {security.active_sessions.map((s: any, i: number) => (
              <div key={i} className="row-between text-xs" style={{ padding: '4px 0' }}>
                <span>{s.device} · <span className="mono text-muted">{s.ip}</span></span>
                <span className="text-muted">当前设备</span>
              </div>
            ))}
          </div>
          <div className="card card-pad">
            <div className="fw-bold text-small mb-2">安全审计日志</div>
            {security.audit_logs.slice(0, 6).map((l: any, i: number) => (
              <div key={i} className="row g-2 text-xs" style={{ padding: '4px 0' }}>
                <span className="mono text-muted">{String(l.time).slice(5, 16)}</span>
                <span>{l.action}</span>
                {l.detail && <span className="text-muted">{l.detail}</span>}
              </div>
            ))}
          </div>
          <div className="card card-pad" style={{ borderColor: 'var(--red-soft)' }}>
            <div className="fw-bold text-small" style={{ color: 'var(--red)' }}>注销账号</div>
            <div className="text-xs text-muted mt-1">提交后进入 7 天冷静期，期间可撤销；到期后所有数据将被永久删除。</div>
            <button className="btn btn-danger btn-sm mt-2" onClick={() => setDelAccountOpen(true)}><Icon name="alert" size={12} />申请注销</button>
          </div>
        </div>
      )}

      {/* ===== 添加模型模态 ===== */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={<><Icon name="cpu" size={15} /> 添加自定义模型</>}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setAddOpen(false)}>取消</button>
          <button className="btn btn-primary" onClick={addModel}>添加</button>
        </>}>
        <div className="field-label">显示名称</div>
        <input className="input mb-2" value={mForm.name} onChange={(e) => setMForm({ ...mForm, name: e.target.value })} placeholder="例：DeepSeek-V3" />
        <div className="field-label">Base URL *</div>
        <input className="input mb-2" value={mForm.base_url} onChange={(e) => setMForm({ ...mForm, base_url: e.target.value })} placeholder="https://api.example.com/v1" />
        <div className="field-label">模型名 *</div>
        <input className="input mb-2" value={mForm.model_name} onChange={(e) => setMForm({ ...mForm, model_name: e.target.value })} placeholder="例：deepseek-chat" />
        <div className="field-label">API Key</div>
        <input className="input mb-2" type="password" value={mForm.api_key} onChange={(e) => setMForm({ ...mForm, api_key: e.target.value })} placeholder="sk-…" />
        <div className="field-label">调用优先级</div>
        <div className="row g-1">
          {[1, 2, 3].map((p) => (
            <button key={p} className={`tag ${mForm.priority === p ? 'tag-green' : 'tag-outline'}`} style={{ cursor: 'pointer', border: 'none' }}
              onClick={() => setMForm({ ...mForm, priority: p })}>{p}</button>
          ))}
        </div>
      </Modal>

      {/* ===== 支付模拟模态 ===== */}
      <Modal open={!!order} onClose={() => setOrder(null)} title={<><Icon name="card" size={15} /> 订单确认</>}
        footer={<>
          <button className="btn btn-ghost" onClick={() => setOrder(null)}>取消</button>
          <button className="btn btn-primary" onClick={async () => {
            await api('/pay/callback', { method: 'POST', body: { order_no: order.order.order_no } });
            toast('支付成功（演示模拟）');
            setOrder(null);
            setTab('billing');
          }}>模拟支付 ¥{order?.order?.amount}</button>
        </>}>
        <div className="kv">
          <span className="kv-k">订单号</span><span className="kv-v mono">{order?.order?.order_no}</span>
        </div>
        <div className="kv">
          <span className="kv-k">套餐</span><span className="kv-v">{order?.order?.plan}（{order?.order?.period}）</span>
        </div>
        <div className="kv">
          <span className="kv-k">金额</span><span className="kv-v mono fw-bold">¥{order?.order?.amount}</span>
        </div>
        <p className="text-xs text-muted mt-2">演示环境：点击「模拟支付」即视为支付回调成功并开通权益。</p>
      </Modal>

      <Confirm open={!!delTarget} onClose={() => setDelTarget(null)} onConfirm={delModel} danger
        title="删除模型" text={`确定删除自定义模型「${delTarget?.name}」？删除后相关对话将回退到默认模型。`} />

      <Modal open={delAccountOpen} onClose={() => { setDelAccountOpen(false); setDelConfirmText(''); }}
        title={<><Icon name="alert" size={15} /> 注销账号</>}
        footer={<>
          <button className="btn btn-ghost" onClick={() => { setDelAccountOpen(false); setDelConfirmText(''); }}>取消</button>
          <button className="btn btn-danger" disabled={delConfirmText !== 'DELETE'} onClick={deleteAccount}>确认注销</button>
        </>}>
        <p className="text-small mb-2" style={{ lineHeight: 1.8 }}>
          ⚠️ 注销后所有数据（文献库、稿件、实验记录、订阅）将在 7 天冷静期后<b>永久删除且不可恢复</b>。
          请输入 <code className="mono">DELETE</code> 以确认：
        </p>
        <input className="input" value={delConfirmText} onChange={(e) => setDelConfirmText(e.target.value)} placeholder="DELETE" />
      </Modal>
    </div>
  );
}
