import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';

export const LandingCTA: React.FC = () => {
  const nav = useNavigate();

  return (
    <section className="landing-cta-section">
      <div className="landing-cta-card">
        <div className="cta-content">
          <h2 className="cta-title">
            准备好让 AI 成为你的终身科研协同伴侣了吗？
          </h2>

          <div className="cta-actions">
            <button
              className="cta-btn-primary"
              onClick={() => nav('/login')}
              id="cta-start-btn"
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
