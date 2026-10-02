import React from 'react';
import Icon from '../../components/Icon';
import { Progress, Tag } from '../../components/ui';

interface BillingSectionProps {
  subscription: any;
  plans: any[];
  onBuy: (planId: string) => void;
}

export const BillingSection: React.FC<BillingSectionProps> = ({
  subscription,
  plans,
  onBuy,
}) => {
  if (!subscription) return null;
  const quotaKeys = subscription.quota ? Object.keys(subscription.quota) : [];

  return (
    <div className="anim-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="card card-pad">
        <div className="row-between wrap g-2">
          <div>
            <div className="fw-bold" style={{ fontSize: 15 }}>
              当前订阅 · {subscription.plan_name}
            </div>
            <div className="text-xs text-muted mt-1">
              ¥{subscription.price}/{subscription.period} · 到期{' '}
              {String(subscription.expire_at).slice(0, 10)} ·{' '}
              {subscription.auto_renew ? '自动续费已开启' : '自动续费已关闭'}
            </div>
          </div>
          <Tag color="green">
            {subscription.used?.chat} / {subscription.quota?.chat} 次对话已用
          </Tag>
        </div>

        <div
          className="grid mt-3"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}
        >
          {quotaKeys.map((k) => {
            const label: Record<string, string> = {
              chat: 'AI 对话',
              literature: '文献检索',
              chart: '图表生成',
              kb: '知识库',
            };
            const used = subscription.used?.[k] || 0;
            const quota = subscription.quota?.[k] || 1;
            return (
              <div key={k} className="card card-pad" style={{ padding: 12 }}>
                <div className="row-between text-xs mb-1">
                  <span className="text-muted">{label[k] || k}</span>
                  <span className="mono">
                    {used}/{quota}
                  </span>
                </div>
                <Progress value={(used / quota) * 100} amber={used / quota > 0.8} />
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="grid"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}
      >
        {plans.map((p) => (
          <div
            key={p.id}
            className={`card card-pad ${
              subscription.plan === p.id ? 'plan-current' : 'card-hover'
            }`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              borderColor: subscription.plan === p.id ? 'var(--brand)' : undefined,
            }}
          >
            <div className="row-between">
              <span className="fw-bold">{p.name}</span>
              {subscription.plan === p.id && <Tag color="green">当前</Tag>}
            </div>
            <div className="mono fw-bold" style={{ fontSize: 24 }}>
              {p.price === 0 ? (
                '免费'
              ) : (
                <>
                  ¥{p.price}
                  <span className="text-xs text-muted fw-normal"> / {p.period}</span>
                </>
              )}
            </div>
            {p.features?.map((f: string) => (
              <div
                key={f}
                className="row g-1 text-xs"
                style={{ alignItems: 'flex-start', color: 'var(--ink-2)' }}
              >
                <Icon name="check" size={12} /> {f}
              </div>
            ))}
            {subscription.plan !== p.id && p.price > 0 && (
              <button
                className="btn btn-primary btn-sm"
                style={{ marginTop: 'auto' }}
                onClick={() => onBuy(p.id)}
                aria-label={`升级至 ${p.name}`}
              >
                升级
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
