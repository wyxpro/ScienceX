import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';

export const LandingCTA: React.FC = () => {
  const nav = useNavigate();
  return (
    <section className="landing-cta-section" aria-labelledby="closing-title">
      <div className="closing-card">
        <div className="closing-orbit closing-orbit-one" aria-hidden="true" /><div className="closing-orbit closing-orbit-two" aria-hidden="true" />
        <div className="closing-symbol" aria-hidden="true"><Icon name="spark" size={35} strokeWidth={1.2} /></div>
        <span className="closing-eyebrow">LESS FRICTION. MORE DISCOVERY.</span>
        <h2 id="closing-title">下一次突破，<br /><span>从一个好问题开始。</span></h2>
        <p className="closing-description">准备好让 AI 成为你的终身科研协同伴侣了吗？<br />把灵感带来，让 ScienceX 陪你走向下一步。</p>
        <div className="closing-actions"><button className="closing-primary" onClick={() => nav('/login')} id="cta-start-btn">立即开启科研之旅 · 免费使用 <Icon name="arrowRight" size={18} /></button><a href="#pricing" className="closing-secondary">找到适合我的方案 <Icon name="chevronRight" size={16} /></a></div>
        <div className="closing-assurances"><span><Icon name="check" size={14} />免费开始探索</span><span><Icon name="shield" size={14} />数据私有可控</span><span><Icon name="link" size={14} />自由接入模型</span></div>
        <div className="closing-footnote"><span>ScienceX</span><span>为好奇而生，为发现而来。</span><span>YOUR RESEARCH COMPANION</span></div>
      </div>
    </section>
  );
};
