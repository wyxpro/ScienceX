import React from 'react';
import Icon from '../../components/Icon';

export const LandingFooter: React.FC = () => {
  return (
    <footer className="landing-footer">
      <div className="landing-footer-inner">
        <div className="row g-2 items-center">
          <div className="landing-logo-badge" style={{ width: 30, height: 30 }}>
            <Icon name="flask" size={16} />
          </div>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 800, color: 'var(--ink)' }}>ScienceX</span>
          <span className="text-xs text-muted">· 让科研更专注，让创新更纯粹</span>
        </div>

        <div className="row g-3 text-xs text-muted">
          <span>© 2026 ScienceX · AI 科研工作台</span>
          <span>隐私政策</span>
          <span>服务协议</span>
          <span>学术伦理规范</span>
        </div>
      </div>
    </footer>
  );
};
