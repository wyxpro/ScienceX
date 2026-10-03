import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';

export const LandingCTA: React.FC = () => {
  const nav = useNavigate();
  return (
    <section className="landing-cta-section" aria-label="开启科研之旅">
      <div className="closing-card">
        <div className="closing-symbol" aria-hidden="true">
          <Icon name="spark" size={24} strokeWidth={1.4} />
        </div>
        <div className="closing-actions">
          <button className="closing-primary" onClick={() => nav('/login')} id="cta-start-btn">
            <span>立即开启科研之旅 · 免费使用</span>
            <span className="closing-arrow-icon" aria-hidden="true">
              <Icon name="arrowRight" size={17} strokeWidth={2.2} />
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};
