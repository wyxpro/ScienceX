import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import gradStudentImg from '../../assets/personas/grad_student.jpg';
import earlyScholarImg from '../../assets/personas/early_scholar.jpg';
import labPiImg from '../../assets/personas/lab_pi.jpg';

interface PersonaScenario {
  id: string;
  order: string;
  role: string;
  audience: string;
  tag: string;
  coverImg: string;
  avatarIcon: string;
  sceneTitle: string;
  targetOutcome: string;
  features: {
    icon: string;
    title: string;
    desc: string;
  }[];
  keywords: string[];
}

// 三大核心用户角色：大学生/研究生、高校教师、科研人员
const PERSONA_SCENARIOS: PersonaScenario[] = [
  {
    id: 'student',
    order: '01',
    role: '大学生 / 研究生',
    audience: '本科毕设 · 硕博研究生',
    tag: '学术启蒙与深度探索 · 从 0 到 1 破局',
    coverImg: gradStudentImg,
    avatarIcon: 'bulb',
    sceneTitle: '开题调研 · 文献精读 · 基线复现 · 初稿撰写',
    targetOutcome: '高分完成开题论证 · 产出首篇 CCF 顶会/顶刊论文',
    features: [
      {
        icon: 'bulb',
        title: '智能选题与开题推演',
        desc: '前沿热点与个人背景深度匹配，一键生成结构化开题报告与可行性论证。',
      },
      {
        icon: 'book',
        title: '三栏结构化文献精读',
        desc: '双语对照速读、公式拆解与七段式创新点提取，大幅缩短文献摸索周期。',
      },
      {
        icon: 'flask',
        title: '实验沙箱与基线对标',
        desc: '自动适配开源 Baseline 实验环境，智能推导演化消融矩阵与参数看板。',
      },
    ],
    keywords: ['开题调研', '文献精读', 'Baseline 对比', '消融实验'],
  },
  {
    id: 'teacher',
    order: '02',
    role: '高校教师',
    audience: '青年骨干 · 硕博导师 · 课题负责人',
    tag: '教研并进 · 课题立项与团队统筹',
    coverImg: earlyScholarImg,
    avatarIcon: 'pen',
    sceneTitle: '基金申报 · 组会指导 · 论文预审 · 资产沉淀',
    targetOutcome: '国自然/省部级基金高效获批 · 团队科研成果资产零流失',
    features: [
      {
        icon: 'doc',
        title: '基金申报综述与论证助手',
        desc: '快速梳理国内外研究现状综述，严密辅助提炼科学假说与技术路线图。',
      },
      {
        icon: 'users',
        title: '多智能体盲审把关',
        desc: '提交前预先完成 5 维同行盲审模拟，提前消除学术表述瑕疵与逻辑硬伤。',
      },
      {
        icon: 'db',
        title: '数字化课题组资产传承',
        desc: '沉淀打通实验脚本、图表与论文全周期，学生交接平滑、研究积累不断层。',
      },
    ],
    keywords: ['国自然基金', '立项论证', '组会管理', '论文预审', '资产沉淀'],
  },
  {
    id: 'researcher',
    order: '03',
    role: '科研人员',
    audience: '专职学者 · 实验室 PI · 顶尖科学家',
    tag: '前沿攻关 · 原创突破与交叉创新',
    coverImg: labPiImg,
    avatarIcon: 'target',
    sceneTitle: '顶刊冲刺 · 前沿雷达 · 严谨消融 · 盲审对抗',
    targetOutcome: 'Nature/IEEE 顶刊顶会录用 · 建立学术高影响力',
    features: [
      {
        icon: 'chart',
        title: '前沿雷达与创新量化',
        desc: '多源交叉追踪全球顶尖突破，精准推演理论增量与机理解释维度。',
      },
      {
        icon: 'shield',
        title: '全周期消融与复现存证',
        desc: '自动推导参数敏感性看板与可复现性存证，筑牢高水平审稿证据链。',
      },
      {
        icon: 'refresh',
        title: '盲审对抗与 Rebuttal 辩护',
        desc: '多维审稿意见智能反推，推演潜在质疑并组织严密有力的抗辩支撑链。',
      },
    ],
    keywords: ['顶刊顶会', '前沿雷达', '多维消融', '同行盲审', 'Rebuttal'],
  },
];

export const LandingPersonas: React.FC = () => {
  const [selected, setSelected] = useState(0);
  const nav = useNavigate();
  const persona = PERSONA_SCENARIOS[selected];
  return (
    <section id="personas" className="landing-section personas-section">
      <div className="section-head"><div className="section-badge">User Personas & Scenarios</div><h2 className="section-title">用户画像与科研场景</h2><p className="section-sub">每一段科研旅程，都值得一个懂你的搭档。<br />选择你的角色，发现更适合自己的工作方式。</p></div>
      <div className="persona-selector" aria-label="选择科研角色">
        {PERSONA_SCENARIOS.map((item, index) => (
          <button key={item.id} className={`persona-choice${selected === index ? ' is-selected' : ''}`} aria-pressed={selected === index} aria-controls="persona-journey" onClick={() => setSelected(index)}>
            <div className="persona-photo"><img src={item.coverImg} alt="" loading="lazy" /><span className="persona-number">CHAPTER {item.order}</span><span className="persona-photo-icon"><Icon name={item.avatarIcon} size={22} /></span><div className="persona-photo-label"><strong>{item.role}</strong><span>{item.tag}</span></div></div>
            <div className="persona-choice-bottom"><span>{item.audience}</span><span className="persona-choice-arrow"><Icon name={selected === index ? 'check' : 'arrowRight'} size={16} /></span></div>
          </button>
        ))}
      </div>
      <div id="persona-journey" className="persona-journey" aria-live="polite">
        <div className="journey-intro"><span className="landing-kicker">YOUR RESEARCH PATH / {persona.order}</span><h3>{persona.role}的科研路径</h3><p>{persona.sceneTitle}</p><div className="journey-keywords">{persona.keywords.map(word => <span key={word}>{word}</span>)}</div><button className="landing-text-button" onClick={() => nav('/login')}>探索我的工作台 <Icon name="arrowRight" size={15} /></button></div>
        <div className="journey-steps" key={persona.id}>{persona.features.map((feature, index) => <article className="journey-step" key={feature.title}><span className="journey-step-icon"><Icon name={feature.icon} size={18} /></span><div><span className="journey-step-number">STEP 0{index + 1}</span><h4>{feature.title}</h4><p>{feature.desc}</p></div></article>)}</div>
      </div>
    </section>
  );
};
