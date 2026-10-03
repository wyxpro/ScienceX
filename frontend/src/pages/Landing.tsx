/* ============================================================
   ScienceX 官网宣传页 —— 电脑 & 移动端全适配 (F1 模块化解耦重构)
   由 LandingHero / Radar / Personas / Compare / Reviews / Pricing / CTA 组合
   ============================================================ */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { useAuth } from '../stores/auth';
import '../styles/landing.css';
import '../styles/landing-sections.css';

import { LandingHero } from './landing/LandingHero';
import { LandingMarquee } from './landing/LandingMarquee';
import { LandingRadar } from './landing/LandingRadar';
import { LandingPersonas } from './landing/LandingPersonas';
import { LandingCompare } from './landing/LandingCompare';
import { LandingReviews } from './landing/LandingReviews';
import { LandingPricing } from './landing/LandingPricing';
import { LandingCTA } from './landing/LandingCTA';
import { LandingFooter } from './landing/LandingFooter';

export default function Landing() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  const navLinks = [
    { id: 'personas', label: '用户画像与场景' },
    { id: 'compare', label: '竞品全景对比' },
    { id: 'radar', label: '专家评审雷达' },
    { id: 'reviews', label: '学者口碑' },
    { id: 'pricing', label: '会员方案' },
  ];

  return (
    <div className="landing-wrap">
      {/* ===== 顶部导航栏 ===== */}
      <header className="landing-nav" role="banner">
        <div className="landing-nav-inner">
          <button
            className="landing-logo"
            onClick={() => scrollTo('hero')}
            aria-label="返回页面顶部"
          >
            <div className="landing-logo-badge">
              <img src="/logo.png" alt="ScienceX Logo" />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 19, fontWeight: 800, color: 'var(--ink)' }}>
                ScienceX
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)', letterSpacing: 0.5, marginTop: -2 }}>
                AI 科研工作台
              </div>
            </div>
          </button>

          {/* 桌面端导航链接 */}
          <nav className="landing-nav-links" aria-label="官网快捷导航">
            {navLinks.map(link => (
              <a
                key={link.id}
                className="landing-nav-link"
                href={`#${link.id}`}
                onClick={e => { e.preventDefault(); scrollTo(link.id); }}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* 导航操作区 */}
          <div className="landing-nav-actions">
            {!user ? (
              <>
                <button className="btn btn-ghost btn-sm landing-nav-login-btn" onClick={() => nav('/login')}>
                  登录 / 注册
                </button>
                <button
                  className="btn btn-primary btn-sm landing-nav-cta-btn"
                  onClick={() => nav('/login')}
                  aria-label="立即开启科研工作台使用"
                >
                  立即使用 <Icon name="arrowRight" size={13} />
                </button>
              </>
            ) : (
              <button
                className="btn btn-primary btn-sm landing-nav-cta-btn"
                onClick={() => nav('/chat')}
                aria-label="进入科研工作台"
              >
                进入工作台 <Icon name="arrowRight" size={13} />
              </button>
            )}

            {/* 移动端汉堡切换按钮 */}
            <button
              className="landing-mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? '关闭导航菜单' : '打开导航菜单'}
              aria-expanded={mobileMenuOpen}
            >
              <Icon name={mobileMenuOpen ? 'x' : 'menu'} size={20} />
            </button>
          </div>
        </div>

        {/* 移动端下拉抽屉导航 */}
        {mobileMenuOpen && (
          <div className="landing-mobile-drawer" role="dialog" aria-label="移动端快捷导航">
            <div className="landing-mobile-drawer-links">
              {navLinks.map(link => (
                <button
                  key={link.id}
                  className="landing-mobile-drawer-link"
                  onClick={() => scrollTo(link.id)}
                >
                  <span>{link.label}</span>
                  <Icon name="chevronRight" size={15} />
                </button>
              ))}
            </div>
            <div className="landing-mobile-drawer-foot">
              {!user ? (
                <>
                  <button className="btn btn-secondary w-full" onClick={() => { setMobileMenuOpen(false); nav('/login'); }}>
                    登录现有账号
                  </button>
                  <button className="btn btn-primary w-full" onClick={() => { setMobileMenuOpen(false); nav('/login'); }}>
                    免费注册开始 <Icon name="arrowRight" size={14} />
                  </button>
                </>
              ) : (
                <button className="btn btn-primary w-full" onClick={() => { setMobileMenuOpen(false); nav('/chat'); }}>
                  进入科研工作台 <Icon name="arrowRight" size={14} />
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ===== 核心分区子组件组合 ===== */}
      <main>
        <LandingHero onExploreFeatures={() => scrollTo('personas')} />
        <LandingMarquee />
        <LandingPersonas />
        <LandingCompare />
        <LandingRadar />
        <LandingReviews />
        <LandingPricing />
        <LandingCTA />
      </main>

      <LandingFooter />
    </div>
  );
}
