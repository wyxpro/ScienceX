import React, { useState } from 'react';
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
  },
  {
    id: 'teacher',
    order: '02',
    role: '高校教师',
    audience: '青年骨干 · 硕博导师 · 课题负责人',
    tag: '教研并进 · 课题立项与团队统筹',
    coverImg: earlyScholarImg,
    avatarIcon: 'pen',
  },
  {
    id: 'researcher',
    order: '03',
    role: '科研人员',
    audience: '专职学者 · 实验室 PI · 顶尖科学家',
    tag: '前沿攻关 · 原创突破与交叉创新',
    coverImg: labPiImg,
    avatarIcon: 'target',
  },
];

export const LandingPersonas: React.FC = () => {
  const [selected, setSelected] = useState(0);
  return (
    <section id="personas" className="landing-section personas-section">
      <div className="section-head"><div className="section-badge">User Personas & Scenarios</div><h2 className="section-title">用户画像与科研场景</h2><p className="section-sub">每一段科研旅程，都值得一个懂你的搭档。<br />选择你的角色，发现更适合自己的工作方式。</p></div>
      <div className="persona-selector" aria-label="选择科研角色">
        {PERSONA_SCENARIOS.map((item, index) => (
          <button key={item.id} className={`persona-choice${selected === index ? ' is-selected' : ''}`} aria-pressed={selected === index} onClick={() => setSelected(index)}>
            <div className="persona-photo"><img src={item.coverImg} alt="" loading="lazy" /><span className="persona-number">CHAPTER {item.order}</span><span className="persona-photo-icon"><Icon name={item.avatarIcon} size={22} /></span><div className="persona-photo-label"><strong>{item.role}</strong><span>{item.tag}</span></div></div>
            <div className="persona-choice-bottom"><span>{item.audience}</span><span className="persona-choice-arrow"><Icon name={selected === index ? 'check' : 'arrowRight'} size={16} /></span></div>
          </button>
        ))}
      </div>
    </section>
  );
};
