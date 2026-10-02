import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';

export const LandingCTA: React.FC = () => {
  const nav = useNavigate();

  return (
    <section className="landing-cta-section">
      <div className="landing-cta-card" style={{ padding: '64px 32px' }}>
        {/* 动态光晕与网格背景 */}
        <div className="cta-ambient-glow glow-1" />
        <div className="cta-ambient-glow glow-2" />
        <div className="cta-grid-pattern" />

        <div className="cta-content" style={{ maxWidth: 760 }}>
          {/* 主标题 */}
          <h2 className="cta-title" style={{ margin: '0 0 32px' }}>
            准备好让 AI 成为你的终身科研协同伴侣了吗？
          </h2>

          {/* 核心操作按钮 */}
          <div className="cta-actions" style={{ margin: 0, justifyContent: 'center' }}>
            <button
              className="cta-btn-primary"
              onClick={() => nav('/login')}
              id="cta-start-btn"
              style={{ padding: '16px 42px', fontSize: 16.5 }}
              aria-label="立即开启科研之旅 · 免费使用"
            >
              <span>立即开启科研之旅 · 免费使用</span>
              <span className="cta-btn-icon">
                <Icon name="arrowRight" size={18} />
              </span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
