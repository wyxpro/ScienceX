import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import { CAROUSEL_SLIDES } from './types';

export const LandingFeatures: React.FC = () => {
  const nav = useNavigate();
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isHoveringCarousel, setIsHoveringCarousel] = useState(false);

  useEffect(() => {
    if (isHoveringCarousel) return;
    const timer = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isHoveringCarousel]);

  return (
    <section id="features" className="landing-section">
      <div className="section-head">
        <div className="section-badge">Featured Capabilities</div>
        <h2 className="section-title">全链路六大科研工具，无缝衔接</h2>
        <p className="section-sub">
          告别在翻译插件、绘图脚本、文献管理器与问答窗口间频繁切换的割裂感。ScienceX 将科研环节完全串接。
        </p>
      </div>

      <div
        className="carousel-wrapper"
        onMouseEnter={() => setIsHoveringCarousel(true)}
        onMouseLeave={() => setIsHoveringCarousel(false)}
      >
        <button
          className="carousel-arrow prev"
          onClick={() => setCarouselIndex((prev) => (prev === 0 ? CAROUSEL_SLIDES.length - 1 : prev - 1))}
          title="上一个"
          aria-label="上一个功能"
        >
          <Icon name="chevronLeft" size={18} />
        </button>
        <button
          className="carousel-arrow next"
          onClick={() => setCarouselIndex((prev) => (prev + 1) % CAROUSEL_SLIDES.length)}
          title="下一个"
          aria-label="下一个功能"
        >
          <Icon name="chevronRight" size={18} />
        </button>

        <div className="carousel-slide">
          <div>
            <span className="tag" style={{ background: 'var(--brand-soft)', color: 'var(--brand-strong)', marginBottom: 14 }}>
              {CAROUSEL_SLIDES[carouselIndex].tag}
            </span>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 800, margin: '8px 0 14px', color: 'var(--ink)' }}>
              {CAROUSEL_SLIDES[carouselIndex].title}
            </h3>
            <p style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--ink-2)', marginBottom: 20 }}>
              {CAROUSEL_SLIDES[carouselIndex].desc}
            </p>
            <div className="col g-2 mb-3">
              {CAROUSEL_SLIDES[carouselIndex].stats.map((s, idx) => (
                <div key={idx} className="row g-2 text-small items-center" style={{ color: 'var(--ink)' }}>
                  <span style={{ color: 'var(--brand)', display: 'inline-flex' }}>
                    <Icon name="check" size={16} />
                  </span>
                  <span className="fw-bold">{s}</span>
                </div>
              ))}
            </div>
            <button className="btn btn-primary btn-sm mt-1" onClick={() => nav('/login')}>
              立即体验该功能 <Icon name="arrowRight" size={13} />
            </button>
          </div>

          {/* 轮播图右侧模拟示意视窗 (温润柔和底色，无纯白底) */}
          <div className="card card-pad" style={{ background: 'rgba(235, 231, 218, 0.65)', borderRadius: 16, border: '1px solid var(--line-strong)', backdropFilter: 'blur(8px)' }}>
            <div className="row-between pb-2 mb-2" style={{ borderBottom: '1px solid var(--line)' }}>
              <span className="tag" style={{ background: 'var(--brand-soft)', color: 'var(--brand-strong)', fontSize: 11, fontWeight: 'bold' }}>
                {CAROUSEL_SLIDES[carouselIndex].badge}
              </span>
              <span className="text-xs text-muted">ScienceX Studio Preview</span>
            </div>
            <div style={{ minHeight: 220, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              {carouselIndex === 0 && (
                <div className="col g-2">
                  <div className="tilt-chat-bubble" style={{ margin: 0 }}>
                    <span className="text-xs text-muted">输入提示词：</span>
                    <div>“帮我分析微表情领域 2026 最具创新价值的选题方向与可行性论证”</div>
                  </div>
                  <div className="tilt-chat-bubble ai" style={{ margin: 0 }}>
                    <div className="fw-bold text-xs" style={{ color: 'var(--brand-strong)' }}>✦ 技能 [选题灵感与开题] 自动调度</div>
                    <div>已为您关联检索 42 篇 CCF-A 顶会论文，提炼 3 大细分缺口（跨层频域交互 / 扩散数据增广 / 弱监督跨域域适应），已生成开题论证大纲与可行性雷达指标。</div>
                  </div>
                </div>
              )}
              {carouselIndex === 1 && (
                <div className="col g-2">
                  <div className="tilt-chat-bubble" style={{ margin: 0 }}>
                    <span className="text-xs text-muted">多模型协同中枢：</span>
                    <div className="row g-2 items-center text-xs mt-1">
                      <span className="tag" style={{ background: 'var(--brand-soft)', color: 'var(--brand-strong)' }}>DeepSeek-R1</span>
                      <span className="tag" style={{ background: 'var(--bg-deep)', color: 'var(--ink)' }}>GPT-4o</span>
                      <span className="tag" style={{ background: 'var(--bg-deep)', color: 'var(--ink)' }}>Claude 3.5</span>
                    </div>
                  </div>
                  <div className="tilt-chat-bubble ai" style={{ margin: 0 }}>
                    <div className="fw-bold text-xs" style={{ color: 'var(--brand-strong)' }}>✦ 全链路上下文实时串接</div>
                    <div>正在调度文献库 #AUFormer 与 GPU-01 节点，已为您自动生成消融方案对比，并开启流式思维链...</div>
                  </div>
                </div>
              )}
              {carouselIndex === 2 && (
                <div className="col g-2">
                  <div className="row-between text-small fw-bold">
                    <span>AU-aware Transformer with Optical Flow...</span>
                    <span className="text-xs tag" style={{ background: 'var(--brand-soft)', color: 'var(--brand-strong)' }}>ACM MM 24</span>
                  </div>
                  <div className="grid grid-2 text-xs text-muted mt-1" style={{ gap: 8 }}>
                    <div className="card card-pad" style={{ padding: 10, background: 'var(--bg-deep)', border: '1px solid var(--line-strong)' }}>
                      <strong style={{ color: 'var(--ink)' }}>七段式学术结构：</strong><br />已萃取研究背景、方法核心与5大局限性
                    </div>
                    <div className="card card-pad" style={{ padding: 10, background: 'var(--bg-deep)', border: '1px solid var(--line-strong)' }}>
                      <strong style={{ color: 'var(--ink)' }}>引用拓扑网络：</strong><br />12 个关联节点，清晰展示方法派生脉络
                    </div>
                  </div>
                </div>
              )}
              {carouselIndex === 3 && (
                <div className="col g-2">
                  <div className="text-small fw-bold">消融实验配置矩阵自动生成</div>
                  <div className="text-xs text-muted">已构建 Baseline、+Cross-Attn、+Flow-Boost 方案对比</div>
                  <div className="row g-2 mt-1">
                    <div className="card card-pad grow text-center" style={{ padding: 8, background: 'var(--bg-deep)', border: '1px solid var(--line-strong)' }}>
                      <div className="text-xs text-muted">GPU-01 (4090)</div>
                      <div className="mono fw-bold" style={{ color: 'var(--brand)' }}>78% 负载 · 18.4GB</div>
                    </div>
                    <div className="card card-pad grow text-center" style={{ padding: 8, background: 'var(--bg-deep)', border: '1px solid var(--line-strong)' }}>
                      <div className="text-xs text-muted">SOTA UF1 对标</div>
                      <div className="mono fw-bold" style={{ color: 'var(--accent)' }}>0.829 (领先 +4.3%)</div>
                    </div>
                  </div>
                </div>
              )}
              {carouselIndex === 4 && (
                <div className="col g-2 text-small">
                  <div className="card card-pad" style={{ background: 'var(--bg-deep)', border: '1px solid var(--line-strong)', padding: 10 }}>
                    <div className="text-xs text-muted mb-1">原文句段 (重复率与口语化标记)：</div>
                    <div style={{ textDecoration: 'line-through', color: 'var(--red)', fontSize: 12.5 }}>
                      Micro-expressions are involuntary facial movements that reveal genuine emotions...
                    </div>
                  </div>
                  <div className="card card-pad" style={{ background: 'var(--brand-soft)', border: '1px solid rgba(27, 122, 94, 0.2)', padding: 10 }}>
                    <div className="text-xs fw-bold mb-1" style={{ color: 'var(--brand-strong)' }}>学术级替换 (已通过查重校验 · 相似度降至 3.8%)：</div>
                    <div style={{ color: 'var(--brand-strong)', fontSize: 12.5 }}>
                      Involuntary facial motions, referred to as micro-expressions, exhibit high fidelity in clinical diagnostics...
                    </div>
                  </div>
                </div>
              )}
              {carouselIndex === 5 && (
                <div className="col g-2 text-small">
                  <div className="row-between">
                    <span className="fw-bold">评审团决策报告 #rv1</span>
                    <span className="tag" style={{ background: 'var(--brand-soft)', color: 'var(--brand-strong)' }}>Strong Accept</span>
                  </div>
                  <div className="col g-1 text-xs mt-1">
                    <div className="card card-pad" style={{ padding: '6px 10px', background: 'var(--bg-deep)', border: '1px solid var(--line-strong)', margin: 0 }}>⚖️ 理论 Agent：公式无歧义，符号体系规范</div>
                    <div className="card card-pad" style={{ padding: '6px 10px', background: 'var(--bg-deep)', border: '1px solid var(--line-strong)', margin: 0 }}>🧪 实验 Agent：已补充 3 个随机种子标准差，实验完备</div>
                    <div className="card card-pad" style={{ padding: '6px 10px', background: 'var(--bg-deep)', border: '1px solid var(--line-strong)', margin: 0 }}>✍️ 写作与伦理 Agent：摘要贡献点已按 CCF 标准精炼，数据集开源合规</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="carousel-dots">
          {CAROUSEL_SLIDES.map((_, idx) => (
            <button
              key={idx}
              className={`carousel-dot ${carouselIndex === idx ? 'active' : ''}`}
              onClick={() => setCarouselIndex(idx)}
              title={`第 ${idx + 1} 项`}
              aria-label={`跳转至第 ${idx + 1} 个功能`}
            />
          ))}
        </div>

        {/* 六大科研工具快速联动导航卡片 (无白色背景) */}
        <div className="features-nav-grid">
          {CAROUSEL_SLIDES.map((slide, idx) => (
            <div
              key={slide.id}
              className={`feature-nav-card ${carouselIndex === idx ? 'active' : ''}`}
              onClick={() => setCarouselIndex(idx)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setCarouselIndex(idx)}
              aria-label={`切换到功能：${slide.title}`}
            >
              <div className="feature-nav-header">
                <span className="feature-nav-tag">{slide.tag.split(' ')[0]}</span>
                <span className="feature-nav-badge">{slide.badge}</span>
              </div>
              <div className="feature-nav-title">{slide.title.replace(/^[^\s]+\s/, '')}</div>
              <div className="feature-nav-stat">{slide.stats[0]}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
