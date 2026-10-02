/* ============================================================
   ScienceX 官网宣传页 —— 电脑 & 移动端全适配 (F1 模块化解耦重构)
   由 LandingHero / Features / Radar / Personas / Compare / Reviews / Pricing / CTA 组合
   ============================================================ */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import '../styles/landing.css';

import { LandingHero } from './landing/LandingHero';
import { LandingMarquee } from './landing/LandingMarquee';
import { LandingFeatures } from './landing/LandingFeatures';
import { LandingRadar } from './landing/LandingRadar';
import { LandingPersonas } from './landing/LandingPersonas';
import { LandingCompare } from './landing/LandingCompare';
import { LandingReviews } from './landing/LandingReviews';
import { LandingPricing } from './landing/LandingPricing';
import { LandingCTA } from './landing/LandingCTA';
import { LandingFooter } from './landing/LandingFooter';

export default function Landing() {
  const nav = useNavigate();

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing-wrap">
      {/* ===== 顶部导航栏 ===== */}
      <header className="landing-nav" role="banner">
        <div className="landing-nav-inner">
          <div
            className="landing-logo"
            onClick={() => scrollTo('hero')}
            role="button"
            tabIndex={0}
            aria-label="返回页面顶部"
          >
            <div className="landing-logo-badge">
              <Icon name="flask" size={20} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 19, fontWeight: 800, color: 'var(--ink)' }}>
                ScienceX
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)', letterSpacing: 0.5, marginTop: -2 }}>
                AI 科研工作台
              </div>
            </div>
          </div>

          <nav className="landing-nav-links" aria-label="官网快捷导航">
            <span className="landing-nav-link" onClick={() => scrollTo('features')}>特色功能</span>
            <span className="landing-nav-link" onClick={() => scrollTo('radar')}>专家评审雷达</span>
            <span className="landing-nav-link" onClick={() => scrollTo('personas')}>用户画像</span>
            <span className="landing-nav-link" onClick={() => scrollTo('compare')}>竞品全景对比</span>
            <span className="landing-nav-link" onClick={() => scrollTo('reviews')}>学者口碑</span>
            <span className="landing-nav-link" onClick={() => scrollTo('pricing')}>会员方案</span>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => nav('/login')}>
              登录 / 注册
            </button>
            <button
              className="btn btn-primary btn-sm"
              style={{ padding: '8px 18px' }}
              onClick={() => nav('/login')}
              aria-label="立即开启科研工作台使用"
            >
              立即使用 <Icon name="arrowRight" size={13} />
            </button>
          </div>
        </div>
      </header>

      {/* ===== 核心分区子组件组合 ===== */}
      <main>
        <LandingHero onExploreFeatures={() => scrollTo('features')} />
        <LandingMarquee />
        <LandingFeatures />
        <LandingRadar />
        <LandingPersonas />
        <LandingCompare />
        <LandingReviews />
        <LandingPricing />
        <LandingCTA />
      </main>

      <LandingFooter />
    </div>
  );
}
