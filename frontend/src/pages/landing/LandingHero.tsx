/* ============================================================
   Landing Hero —— 首屏重设计
   极光氛围底光 · 科研全生命周期流程芯片 · 数字滚动统计
   视差拟真工作台卡片（SVG 头像 + 审稿评分动效）· 悬浮卫星卡
   ============================================================ */
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';

/* 科研全生命周期流程（可视化芯片替代描述文本中的 emoji 箭头） */
const PIPELINE = ['选题', '文献', '实验', '分析', '写作', '投稿', '协作'];

/* 数字滚动动画 */
function useCountUp(target: number, duration = 1400): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setVal(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

const HeroStat: React.FC<{ value: number; suffix: string; label: string }> = ({ value, suffix, label }) => {
  const num = useCountUp(value);
  return (
    <div className="hero-stat">
      <div className="hero-stat-num">{num}<em>{suffix}</em></div>
      <div className="hero-stat-label">{label}</div>
    </div>
  );
};

interface LandingHeroProps {
  onExploreFeatures: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ onExploreFeatures }) => {
  const nav = useNavigate();
  const tiltCardRef = useRef<HTMLDivElement>(null);
  const [tiltStyle, setTiltStyle] = useState({ transform: 'perspective(1200px) rotateX(0deg) rotateY(0deg)' });
  const [mounted, setMounted] = useState(false);

  /* 评分进度条入场动效 */
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tiltCardRef.current) return;
    const rect = tiltCardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rotateX = ((y - rect.height / 2) / (rect.height / 2)) * -8;
    const rotateY = ((x - rect.width / 2) / (rect.width / 2)) * 8;
    setTiltStyle({
      transform: `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`,
    });
  };

  const handleMouseLeave = () => {
    setTiltStyle({ transform: 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)' });
  };

  const scores = [
    { label: '理论 · 严密', val: 95, warn: false },
    { label: '创新 · 突出', val: 92, warn: false },
    { label: '消融 · 建议补种', val: 88, warn: true },
  ];

  return (
    <section id="hero" className="landing-hero">
      <div className="hero-aurora" aria-hidden="true" />

      {/* ===== 左侧：主张与行动 ===== */}
      <div className="hero-copy">
        <div className="hero-pill">
          <span className="hero-pill-live" />
          <span className="hero-pill-star">★</span>
          2026 新一代 AI 原生科研生产力中枢
        </div>

        <h1 className="hero-title">
          让
          <span className="hero-title-gradient">
            科研更简单
            <svg className="hero-scribble" viewBox="0 0 220 14" fill="none" aria-hidden="true">
              <path
                d="M4 10 C 48 3, 96 12, 138 6 S 200 4, 216 8"
                stroke="var(--accent)" strokeWidth="3.5" strokeLinecap="round" opacity="0.7"
              />
            </svg>
          </span>
        </h1>

        <div className="hero-pipeline">
          {PIPELINE.map((step, i) => (
            <React.Fragment key={step}>
              {i > 0 && <Icon name="arrowRight" size={11} className="pipe-arrow" />}
              <span className="pipe-chip">{step}</span>
            </React.Fragment>
          ))}
        </div>

        <p className="hero-desc">
          对话即工作台，工具即智能体。把繁琐琐碎的机械劳动交给 AI，
          让学者专注提出好问题与科学创新本身。
        </p>

        <div className="hero-actions">
          <button className="btn-hero-primary" onClick={() => nav('/login')}>
            <Icon name="spark" size={18} />
            立即使用 · 免费体验
            <Icon name="arrowRight" size={16} className="btn-hero-arrow" />
          </button>
          <button className="btn-hero-secondary" onClick={onExploreFeatures}>
            <Icon name="eye" size={16} />
            探索科研场景
          </button>
        </div>

        <div className="hero-proof">
          <span className="hero-proof-item"><Icon name="check" size={14} />免费体验无门槛</span>
          <span className="hero-proof-item"><Icon name="shield" size={14} />数据私有可控</span>
          <span className="hero-proof-item"><Icon name="link" size={14} />OpenAI 协议任意接入</span>
        </div>

        <div className="hero-stats">
          <HeroStat value={50} suffix="%+" label="论文产出周期缩短" />
          <HeroStat value={100} suffix="+" label="CCF 顶刊顶会适配" />
          <HeroStat value={5} suffix=" 角色" label="多智能体专家盲审" />
          <HeroStat value={100} suffix="%" label="OpenAI协议自由接入" />
        </div>
      </div>

      {/* ===== 右侧：视差工作台卡片 + 悬浮卫星卡 ===== */}
      <div className="hero-visual-wrap">
        <div className="float-card float-card-gpu" aria-hidden="true">
          <div className="row" style={{ gap: 8 }}>
            <span className="pulse-dot" />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>GPU-03 · A100</span>
            <span className="tag" style={{ background: 'var(--brand-soft)', color: 'var(--brand-strong)', fontSize: 10, padding: '1px 8px' }}>
              运行中
            </span>
          </div>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 4 }}>
            显存 38.2 / 80 GB · 温度 67°C
          </div>
        </div>

        <div className="float-card float-card-doc" aria-hidden="true">
          <div className="row" style={{ gap: 9 }}>
            <span className="float-card-icon"><Icon name="branch" size={14} /></span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>引用图谱 +12 新节点</span>
          </div>
        </div>

        <div className="tilt-card-container">
          <div
            ref={tiltCardRef}
            className="tilt-card"
            style={tiltStyle}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <div className="tilt-header">
              <div className="tilt-dots">
                <span className="tilt-dot" style={{ background: '#ff5f56' }} />
                <span className="tilt-dot" style={{ background: '#ffbd2e' }} />
                <span className="tilt-dot" style={{ background: '#27c93f' }} />
              </div>
              <div className="tilt-title">ScienceX · AI 科研协同工作台</div>
              <span className="tag tilt-live-tag"><span className="pulse-dot" />Live</span>
            </div>

            <div className="tilt-msg">
              <div className="msg-avatar"><Icon name="user" size={15} /></div>
              <div className="tilt-msg-body">
                <div className="msg-role">研究者 · 提问</div>
                <strong>我的 up9 模型在 CASME II 上需要设计消融实验，如何拉开与现有工作差异？</strong>
              </div>
            </div>

            <div className="tilt-msg ai">
              <div className="msg-avatar"><Icon name="spark" size={15} /></div>
              <div className="tilt-msg-body">
                <div className="msg-role">ScienceX 科研智能体</div>
                建议优先验证<strong>跨层 AU 交互</strong>（而非单点融合）。已自动生成 4 组消融方案，
                并调配 GPU-03 节点完成 baseline 跑通，预计 UF1 由 0.646 提升至 0.689（<span className="score-up">+6.6%</span>）。
              </div>
            </div>

            <div className="tilt-score">
              <div className="row-between">
                <span className="tilt-score-title"><Icon name="award" size={14} />模拟审稿团盲审评定</span>
                <span className="tilt-score-total">94.2<span> / 100</span></span>
              </div>
              {scores.map((s, i) => (
                <div className={`score-bar-row${s.warn ? ' warn' : ''}`} key={s.label}>
                  <span className="score-label">{s.label}</span>
                  <div className="score-bar">
                    <div
                      className="score-bar-fill"
                      style={{ width: mounted ? `${s.val}%` : '0%', transitionDelay: `${0.3 + i * 0.18}s` }}
                    />
                  </div>
                  <span className="score-num">{s.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
