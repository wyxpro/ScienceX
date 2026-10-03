import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';

export const LandingHero: React.FC<{ onExploreFeatures: () => void }> = ({ onExploreFeatures }) => {
  const nav = useNavigate();
  const visualRef = useRef<HTMLDivElement>(null);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left - rect.width / 2) / rect.width;
    const y = (event.clientY - rect.top - rect.height / 2) / rect.height;
    if (visualRef.current) {
      visualRef.current.style.transform = `perspective(1000px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-2px)`;
    }
  };

  const handlePointerLeave = () => {
    if (visualRef.current) {
      visualRef.current.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) translateY(0)';
    }
  };

  return (
    <section id="hero" className="landing-hero">
      <div className="hero-copy">
        <div className="hero-eyebrow"><span /> YOUR NEXT DISCOVERY STARTS HERE</div>
        <h1 className="hero-title">让科研更简单，<br /><span>一站式科研AI搭子</span></h1>
        <p className="hero-desc">从第一篇文献，到下一次突破。<br />你的 AI 科研搭档，连接阅读、实验、写作与发现。</p>
        <div className="hero-actions">
          <button className="btn-hero-primary" onClick={() => nav('/login')}>开启我的科研之旅 <Icon name="arrowRight" size={18} /></button>
          <button className="btn-hero-secondary" onClick={onExploreFeatures}><span className="hero-play"><Icon name="play" size={13} /></span>探索科研场景</button>
        </div>
        <div className="hero-proof"><span><Icon name="check" size={14} />免费开始</span><span><Icon name="shield" size={14} />数据私有可控</span><span><Icon name="link" size={14} />自由接入模型</span></div>
        <div className="hero-bottom-line"><span className="hero-monogram">S<sup>✳</sup></span><div><strong>一个工作台，连接科研全流程</strong><p>选题 / 文献 / 实验 / 分析 / 写作 / 投稿 / 协作</p></div></div>
      </div>
      <div
        className="hero-showcase hero-visual-container"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <div className="hero-visual" ref={visualRef}>
          <img
            src="/gw.png"
            alt="ScienceX 智能科研助手"
            className="hero-visual-img"
            loading="eager"
            decoding="async"
          />
        </div>
      </div>
    </section>
  );
};
