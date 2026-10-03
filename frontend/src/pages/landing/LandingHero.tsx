import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';

const SCENES = [
  { id: 'reader', icon: 'book', label: '文献精读', title: '从一篇论文，读懂一个领域。', prompt: '帮我梳理这篇论文的核心贡献与研究脉络。', file: 'Attention Is All You Need', type: '文献研读笔记', heading: '让知识彼此连接', description: '从研究问题到方法创新，提炼关键论点，让每一次阅读都成为可积累的知识。', steps: ['解析论文结构', '提炼核心贡献', '关联引用文献'], metrics: ['研究问题', '方法与创新', '实验与结论'], values: ['01', '02', '03'], note: '结构化笔记 · 引用可溯源', floating: '论文 → 笔记 → 知识图谱' },
  { id: 'experiment', icon: 'flask', label: '实验设计', title: '把研究假设，变成验证路径。', prompt: '围绕跨层特征交互，为我设计一组消融实验。', file: '跨层特征交互 · 消融实验', type: '实验方案矩阵', heading: '让每个变量都有答案', description: '拆解研究假设，明确控制变量与对比基线，形成有条理、可追踪的实验计划。', steps: ['梳理研究假设', '设置控制变量', '生成消融矩阵'], metrics: ['基线对照', '模块消融', '联合验证'], values: ['A', 'B', 'C'], note: '变量清晰 · 结果可追踪', floating: '研究假设 → 实验矩阵' },
  { id: 'review', icon: 'award', label: '专家评审', title: '在投稿之前，多一个专业视角。', prompt: '请从创新性、实验设计与写作规范评审我的论文。', file: '论文初稿 · 投稿前检查', type: '多角色模拟评审', heading: '让好研究被更好地表达', description: '从不同学术视角审视论文，将潜在问题整理为可执行的修改建议。', steps: ['多角色独立审阅', '汇总评审意见', '整理返修清单'], metrics: ['理论推导', '方法创新', '实验设计'], values: ['严谨性', '贡献度', '完整性'], note: '5 个评审角色 · 多维度建议', floating: '独立评审 → 修改清单' },
];

export const LandingHero: React.FC<{ onExploreFeatures: () => void }> = ({ onExploreFeatures }) => {
  const nav = useNavigate();
  const [active, setActive] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const scene = SCENES[active];

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    stage.current?.style.setProperty('--rotate-x', `${-(event.clientY - rect.top - rect.height / 2) / rect.height * 5}deg`);
    stage.current?.style.setProperty('--rotate-y', `${(event.clientX - rect.left - rect.width / 2) / rect.width * 5}deg`);
  };
  const resetTilt = () => {
    stage.current?.style.setProperty('--rotate-x', '0deg');
    stage.current?.style.setProperty('--rotate-y', '0deg');
  };

  return (
    <section id="hero" className="landing-hero">
      <div className="hero-copy">
        <div className="hero-eyebrow"><span /> YOUR NEXT DISCOVERY STARTS HERE</div>
        <h1 className="hero-title">让科研更简单，<br /><span>让灵感走得更远。</span></h1>
        <p className="hero-desc">从第一篇文献，到下一次突破。<br />你的 AI 科研搭档，连接阅读、实验、写作与发现。</p>
        <div className="hero-actions">
          <button className="btn-hero-primary" onClick={() => nav('/login')}>开启我的科研之旅 <Icon name="arrowRight" size={18} /></button>
          <button className="btn-hero-secondary" onClick={onExploreFeatures}><span className="hero-play"><Icon name="play" size={13} /></span>探索科研场景</button>
        </div>
        <div className="hero-proof"><span><Icon name="check" size={14} />免费开始</span><span><Icon name="shield" size={14} />数据私有可控</span><span><Icon name="link" size={14} />自由接入模型</span></div>
        <div className="hero-bottom-line"><span className="hero-monogram">S<sup>✳</sup></span><div><strong>一个工作台，连接科研全流程</strong><p>选题 / 文献 / 实验 / 分析 / 写作 / 投稿 / 协作</p></div></div>
      </div>
      <div className="hero-showcase" onPointerMove={handlePointerMove} onPointerLeave={resetTilt}>
        <div className="hero-orbit hero-orbit-one" aria-hidden="true" /><div className="hero-orbit hero-orbit-two" aria-hidden="true" />
        <div className="hero-workspace" ref={stage}>
          <div className="workspace-topbar"><div className="workspace-brand"><img src="/logo.png" alt="" />ScienceX <span>/ 我的科研空间</span></div><span className="workspace-demo">交互演示</span></div>
          <div className="workspace-tabs" role="tablist" aria-label="科研场景预览">
            {SCENES.map((item, index) => <button key={item.id} id={`scene-tab-${item.id}`} role="tab" aria-selected={active === index} aria-controls="scene-preview" tabIndex={active === index ? 0 : -1} className={active === index ? 'active' : ''} onClick={() => setActive(index)} onKeyDown={(event) => {
              const next = event.key === 'ArrowRight' ? (index + 1) % SCENES.length : event.key === 'ArrowLeft' ? (index + SCENES.length - 1) % SCENES.length : event.key === 'Home' ? 0 : event.key === 'End' ? SCENES.length - 1 : null;
              if (next !== null) { event.preventDefault(); setActive(next); document.getElementById(`scene-tab-${SCENES[next].id}`)?.focus(); }
            }}><Icon name={item.icon} size={15} />{item.label}</button>)}
          </div>
          <div id="scene-preview" role="tabpanel" aria-labelledby={`scene-tab-${scene.id}`} tabIndex={0} className="workspace-panel">
            <div className="scene-content" key={scene.id}>
              <div className="workspace-greeting"><span>RESEARCH, REIMAGINED.</span><h2>{scene.title}</h2></div>
              <div className="workspace-prompt"><span className="prompt-avatar"><Icon name="user" size={15} /></span><p>{scene.prompt}</p><Icon name="arrowUp" size={15} /></div>
              <div className="workspace-response"><span className="response-spark"><Icon name="spark" size={19} /></span><div><strong>好的，我们一起探索。</strong><span>ScienceX 已为你整理研究思路</span></div><span className="response-status"><Icon name="check" size={12} />已生成</span></div>
              <div className="research-document"><div className="document-label"><Icon name={scene.icon} size={14} /><span>{scene.type}</span><Icon name="file" size={14} /></div><p className="document-filename">{scene.file}</p><h3>{scene.heading}</h3><p className="document-description">{scene.description}</p><div className="document-metrics">{scene.metrics.map((metric, index) => <div key={metric}><strong>{scene.values[index]}</strong><span>{metric}</span></div>)}</div><div className="document-foot"><span><Icon name="check" size={12} />{scene.note}</span><Icon name="arrowRight" size={14} /></div></div>
              <div className="workspace-steps">{scene.steps.map(step => <span key={step}><Icon name="check" size={11} />{step}</span>)}</div>
            </div>
          </div>
          <div className="workspace-bottom"><span><i />让繁琐交给 AI，让专注回归科学</span><Icon name="spark" size={13} /></div>
        </div>
        <div className="hero-floating-note"><span><Icon name="branch" size={19} /></span><div><small>CONNECTED KNOWLEDGE</small><strong>{scene.floating}</strong></div></div>
        <div className="hero-showcase-caption"><span />点击上方标签，体验科研的不同可能</div>
      </div>
    </section>
  );
};
