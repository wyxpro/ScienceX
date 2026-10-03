import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';

export const LandingCTA: React.FC = () => {
  const nav = useNavigate();
  return (
    <section className="landing-cta-section" aria-label="开启科研之旅">
      <div className="closing-card">
        <div className="closing-orbit closing-orbit-one" aria-hidden="true" /><div className="closing-orbit closing-orbit-two" aria-hidden="true" />
        <div className="closing-symbol" aria-hidden="true"><Icon name="spark" size={35} strokeWidth={1.2} /></div>
        <div className="closing-actions"><button className="closing-primary" onClick={() => nav('/login')} id="cta-start-btn">立即开启科研之旅 · 免费使用 <Icon name="arrowRight" size={18} /></button></div>
      </div>
    </section>
  );
};
