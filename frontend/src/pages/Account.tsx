/* 个人中心 —— REQ-USER-01~05：资料偏好 · 模型管理 · 用量 · 订阅计费 · 安全 */
import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import Icon from '../components/Icon';
import { Confirm, Modal, Tabs, Tag, useToast } from '../components/ui';
import { useAuth } from '../stores/auth';
import { BillingSection } from './account/BillingSection';
import { ModelsSection } from './account/ModelsSection';
import { ProfileSection } from './account/ProfileSection';
import { SecuritySection } from './account/SecuritySection';
import { UsageSection } from './account/UsageSection';

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

  const loadInitData = useCallback(async () => {
    try {
      const [m, s] = await Promise.all([
        api<{ builtin: any[]; custom: any[] }>('/models'),
        api<any>('/account/security'),
      ]);
      setModels(m || { builtin: [], custom: [] });
      setSecurity(s);
    } catch (err: any) {
      toast(err.message || '加载账户数据失败', 'err');
    }
  }, [toast]);

  useEffect(() => {
    loadInitData();
  }, [loadInitData]);

  useEffect(() => {
    if (tab === 'usage') {
      api<any>('/usage', { params: { range } }).then(setUsage).catch(() => {});
    }
  }, [tab, range]);

  useEffect(() => {
    if (tab === 'billing') {
      Promise.all([
        api<any[]>('/billing/plans'),
        api<any>('/billing/subscription'),
        api<any>('/billing/orders'),
      ]).then(([p, s, o]) => {
        setPlans(p || []);
        setSubscription(s);
        setOrders(o?.items || (Array.isArray(o) ? o : []));
      }).catch(() => {});
    }
  }, [tab]);

  /* ===== 资料保存 ===== */
  const saveProfile = async () => {
    setSaving(true);
    try {
      await api('/user/profile', { method: 'PUT', body: form });
      await refresh();
      toast('资料已更新');
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (!form.research_tags?.includes(t)) {
      setForm({ ...form, research_tags: [...(form.research_tags || []), t] });
    }
    setTagInput('');
  };

  /* ===== 模型管理 ===== */
  const addModel = async () => {
    if (!mForm.base_url || !mForm.model_name) return toast('BaseURL 与模型名为必填项', 'info');
    const m = await api<any>('/models', { method: 'POST', body: mForm });
    setModels((x) => ({ ...x, custom: [...x.custom, m] }));
    setAddOpen(false);
    setMForm({ name: '', base_url: '', model_name: '', api_key: '', priority: 1 });
    toast('自定义模型已添加');
  };

  const testModel = async (id: string) => {
    setTesting(id);
    try {
      const r = await api<any>(`/models/${id}/test`);
      toast(`连通正常 · ${r.latency_ms}ms`);
    } finally {
      setTesting(null);
    }
  };

  const delModel = async () => {
    await api(`/models/${delTarget.id}`, { method: 'DELETE' });
    setModels((x) => ({ ...x, custom: x.custom.filter((m) => m.id !== delTarget.id) }));
    toast('模型已删除');
  };

  /* ===== 订阅 ===== */
  const buy = async (planId: string) => {
    const r = await api<any>('/orders', { method: 'POST', body: { plan_id: planId } });
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

  return (
    <div className="page" style={{ gap: 14 }}>
      <div className="card card-pad" style={{ flex: 'none' }}>
        <div className="row g-3 wrap">
          <div className="avatar" style={{ width: 52, height: 52, fontSize: 20 }}>
            {user?.name?.[0] || '研'}
          </div>
          <div className="grow" style={{ minWidth: 180 }}>
            <div className="fw-bold text-serif" style={{ fontSize: 16 }}>{user?.name}</div>
            <div className="row g-1 mt-1 wrap">
              <Tag color="amber">
                {subscription?.plan_name || (user?.plan === 'pro' ? 'Pro 专业版' : 'Free 免费版')}
              </Tag>
              <Tag color="gray">{user?.title}</Tag>
              <span className="text-xs text-muted">{user?.email}</span>
            </div>
          </div>
        </div>
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { key: 'profile', label: <><Icon name="user" size={13} /> 资料偏好</> },
          { key: 'models', label: <><Icon name="cpu" size={13} /> 模型管理</> },
          { key: 'usage', label: <><Icon name="chart" size={13} /> 用量统计</> },
          { key: 'billing', label: <><Icon name="card" size={13} /> 订阅计费</> },
          { key: 'security', label: <><Icon name="shield" size={13} /> 安全</> },
        ]}
      />

      {/* ===== 资料偏好 ===== */}
      {tab === 'profile' && (
        <ProfileSection
          form={form}
          setForm={setForm}
          tagInput={tagInput}
          setTagInput={setTagInput}
          saving={saving}
          onSave={saveProfile}
          onAddTag={addTag}
        />
      )}

      {/* ===== 模型管理 ===== */}
      {tab === 'models' && (
        <ModelsSection
          models={models}
          testing={testing}
          onOpenAdd={() => setAddOpen(true)}
          onTestModel={testModel}
          onSelectDelete={setDelTarget}
        />
      )}

      {/* ===== 用量统计 ===== */}
      {tab === 'usage' && (
        <UsageSection
          usage={usage}
          range={range}
          onRangeChange={setRange}
        />
      )}

      {/* ===== 订阅计费 ===== */}
      {tab === 'billing' && subscription && (
        <BillingSection
          subscription={subscription}
          plans={plans}
          orders={orders}
          onBuy={buy}
        />
      )}

      {/* ===== 安全 ===== */}
      {tab === 'security' && security && (
        <SecuritySection
          security={security}
          onToggle2FA={toggle2FA}
          onExportData={exportData}
          onOpenDelAccount={() => setDelAccountOpen(true)}
        />
      )}

      {/* ===== 添加模型模态 ===== */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={<><Icon name="cpu" size={15} /> 添加自定义模型</>}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setAddOpen(false)}>取消</button>
            <button className="btn btn-primary" onClick={addModel}>添加</button>
          </>
        }
      >
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
      <Modal
        open={!!order}
        onClose={() => setOrder(null)}
        title={<><Icon name="card" size={15} /> 订单确认</>}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setOrder(null)}>取消</button>
            <button className="btn btn-primary" onClick={async () => {
              await api('/pay/callback', { method: 'POST', body: { order_no: order.order.order_no } });
              toast('支付成功（演示模拟）');
              setOrder(null);
              setTab('billing');
            }}>模拟支付 ¥{order?.order?.amount}</button>
          </>
        }
      >
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

      <Confirm
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={delModel}
        danger
        title="删除模型"
        text={`确定删除自定义模型「${delTarget?.name}」？删除后相关对话将回退到默认模型。`}
      />

      <Modal
        open={delAccountOpen}
        onClose={() => { setDelAccountOpen(false); setDelConfirmText(''); }}
        title={<><Icon name="alert" size={15} /> 注销账号</>}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => { setDelAccountOpen(false); setDelConfirmText(''); }}>取消</button>
            <button className="btn btn-danger" disabled={delConfirmText !== 'DELETE'} onClick={deleteAccount}>确认注销</button>
          </>
        }
      >
        <p className="text-small mb-2" style={{ lineHeight: 1.8 }}>
          ⚠️ 注销后所有数据（文献库、稿件、实验记录、订阅）将在 7 天冷静期后<b>永久删除且不可恢复</b>。
          请输入 <code className="mono">DELETE</code> 以确认：
        </p>
        <input className="input" value={delConfirmText} onChange={(e) => setDelConfirmText(e.target.value)} placeholder="DELETE" />
      </Modal>
    </div>
  );
}
