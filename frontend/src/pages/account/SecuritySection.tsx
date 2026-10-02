import React from 'react';
import Icon from '../../components/Icon';
import { Switch } from '../../components/ui';

interface SecuritySectionProps {
  security: any;
  onToggle2FA: (on: boolean) => void;
  onExportData: () => void;
  onOpenDelAccount: () => void;
}

export const SecuritySection: React.FC<SecuritySectionProps> = ({
  security,
  onToggle2FA,
  onExportData,
  onOpenDelAccount,
}) => {
  if (!security) return null;

  return (
    <div
      className="anim-in"
      style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 720 }}
    >
      <div className="card card-pad row-between">
        <div>
          <div className="fw-bold text-small">两步验证（TOTP）</div>
          <div className="text-xs text-muted mt-1">
            登录时需要额外输入动态验证码，大幅提升账号安全
          </div>
        </div>
        <Switch
          on={security.two_factor?.enabled ?? false}
          onChange={onToggle2FA}
          aria-label="切换两步验证"
        />
      </div>

      <div className="card card-pad row-between wrap g-2">
        <div>
          <div className="fw-bold text-small">个人数据导出</div>
          <div className="text-xs text-muted mt-1">
            打包下载全部文献笔记 / 稿件 / 实验记录（zip）
          </div>
        </div>
        <button
          className="btn btn-soft btn-sm"
          onClick={onExportData}
          aria-label="申请导出个人数据"
        >
          <Icon name="download" size={12} />
          申请导出
        </button>
      </div>

      <div className="card card-pad">
        <div className="fw-bold text-small mb-2">活跃会话</div>
        {security.active_sessions?.map((s: any, i: number) => (
          <div key={i} className="row-between text-xs" style={{ padding: '4px 0' }}>
            <span>
              {s.device} · <span className="mono text-muted">{s.ip}</span>
            </span>
            <span className="text-muted">当前设备</span>
          </div>
        ))}
      </div>

      <div className="card card-pad">
        <div className="fw-bold text-small mb-2">安全审计日志</div>
        {security.audit_logs?.slice(0, 6).map((l: any, i: number) => (
          <div key={i} className="row g-2 text-xs" style={{ padding: '4px 0' }}>
            <span className="mono text-muted">{String(l.time).slice(5, 16)}</span>
            <span>{l.action}</span>
            {l.detail && <span className="text-muted">{l.detail}</span>}
          </div>
        ))}
      </div>

      <div className="card card-pad" style={{ borderColor: 'var(--red-soft)' }}>
        <div className="fw-bold text-small" style={{ color: 'var(--red)' }}>
          注销账号
        </div>
        <div className="text-xs text-muted mt-1">
          提交后进入 7 天冷静期，期间可撤销；到期后所有数据将被永久删除。
        </div>
        <button
          className="btn btn-danger btn-sm mt-2"
          onClick={onOpenDelAccount}
          aria-label="申请注销账号"
        >
          <Icon name="alert" size={12} />
          申请注销
        </button>
      </div>
    </div>
  );
};
