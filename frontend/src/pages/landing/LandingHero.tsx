import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';

interface LandingHeroProps {
  onExploreFeatures: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({ onExploreFeatures }) => {
  const nav = useNavigate();
  const tiltCardRef = useRef<HTMLDivElement>(null);
  const [tiltStyle, setTiltStyle] = useState({ transform: 'perspective(1200px) rotateX(0deg) rotateY(0deg)' });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tiltCardRef.current) return;
    const rect = tiltCardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -9;
    const rotateY = ((x - centerX) / centerX) * 9;
    setTiltStyle({
      transform: `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`,
    });
  };

  const handleMouseLeave = () => {
    setTiltStyle({
      transform: 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
    });
  };

  return (
    <section id="hero" className="landing-hero">
      <div>
        <div className="hero-pill">
          <span style={{ color: 'var(--accent)' }}>★</span> 2026 新一代 AI 原生科研生产力中枢
        </div>
        <h1 className="hero-title">
          一个入口，<span className="hero-title-gradient">闭环科研</span>
        </h1>
        <p className="hero-desc">
          覆盖「选题 ➔ 文献 ➔ 实验 ➔ 分析 ➔ 写作 ➔ 投稿 ➔ 协作」科研全生命周期。
          对话即工作台，工具即智能体。把繁琐琐碎的机械劳动交给 AI，让学者专注提出好问题与科学创新本身。
        </p>

        <div className="hero-actions">
          <button className="btn-hero-primary" onClick={() => nav('/login')}>
            <Icon name="spark" size={18} />
            立即使用 · 免费体验
          </button>
          <button className="btn-hero-secondary" onClick={onExploreFeatures}>
            <Icon name="eye" size={16} />
            探索特色功能
          </button>
        </div>

        <div className="hero-stats">
          <div>
            <div className="hero-stat-num">50%+</div>
            <div className="hero-stat-label">论文产出周期缩短</div>
          </div>
          <div>
            <div className="hero-stat-num">100+</div>
            <div className="hero-stat-label">CCF 顶刊顶会适配</div>
          </div>
          <div>
            <div className="hero-stat-num">5 角色</div>
            <div className="hero-stat-label">多智能体专家盲审</div>
          </div>
          <div>
            <div className="hero-stat-num">100%</div>
            <div className="hero-stat-label">OpenAI协议自由接入</div>
          </div>
        </div>
      </div>

      {/* 3D 拟真视差卡片展示 */}
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
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
              ScienceX · AI 科研协同工作台
            </div>
            <span className="tag" style={{ background: 'var(--brand-soft)', color: 'var(--brand-strong)', fontSize: 11 }}>
              Live Active
            </span>
          </div>

          <div className="tilt-chat-bubble">
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 4 }}>🧑‍🎓 研究者（提问）：</div>
            <strong>我的 up9 模型在 CASME II 上需要设计消融实验，如何拉开与现有工作差异？</strong>
          </div>

          <div className="tilt-chat-bubble ai">
            <div style={{ fontSize: 11.5, color: 'var(--brand-strong)', fontWeight: 700, marginBottom: 4 }}>
              🤖 ScienceX 科研智能体：
            </div>
            <span>
              建议优先验证<strong>跨层 AU 交互</strong>（而非单点融合）。已自动生成 4 组消融方案，并调配 GPU-03 节点进行 baseline 跑通，预计 UF1 可由 0.646 提升至 0.689（+6.6%）。
            </span>
          </div>

          <div className="tilt-interactive-radar">
            <div className="row-between text-xs mb-2">
              <span className="fw-bold" style={{ color: 'var(--ink)' }}>🧑‍⚖️ 模拟审稿团盲审评定</span>
              <span className="mono fw-bold" style={{ color: 'var(--brand)' }}>综合得分: 94.2 / 100</span>
            </div>
            <div className="row g-2 wrap">
              <span className="tag" style={{ background: 'var(--brand-soft)', color: 'var(--brand-strong)', fontSize: 11 }}>
                理论: 严密 (95分)
              </span>
              <span className="tag" style={{ background: 'var(--brand-soft)', color: 'var(--brand-strong)', fontSize: 11 }}>
                创新: 突出 (92分)
              </span>
              <span className="tag" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 11 }}>
                消融: 建议补种 (88分)
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
