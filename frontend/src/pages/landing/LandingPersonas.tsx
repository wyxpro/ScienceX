import React, { useState } from 'react';
import Icon from '../../components/Icon';
import gradStudentImg from '../../assets/personas/grad_student.jpg';
import earlyScholarImg from '../../assets/personas/early_scholar.jpg';
import labPiImg from '../../assets/personas/lab_pi.jpg';

interface PersonaScenario {
  id: string;
  role: string;
  tag: string;
  coverImg: string;
  avatarIcon: string;
  themeColor: string;
  badgeBg: string;
  cardActiveBg: string;
  shadowColor: string;
  sceneTitle: string;
  challenges: {
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
    role: '大学生 / 研究生',
    tag: '学术启蒙与深度探索 · 从 0 到 1 破局',
    coverImg: gradStudentImg,
    avatarIcon: 'book',
    themeColor: '#0284c7',
    badgeBg: 'rgba(2, 132, 199, 0.1)',
    cardActiveBg: 'rgba(2, 132, 199, 0.035)',
    shadowColor: 'rgba(2, 132, 199, 0.22)',
    sceneTitle: '毕业设计开题、文献精读、实验 Baseline 复现与论文初撰',
    challenges: [
      {
        icon: 'bulb',
        title: '选题开题方向迷茫',
        desc: '面对浩瀚学术文献难以精准捕捉核心创新点与前沿研究空白，开题报告思路发散缺乏论证深度。',
      },
      {
        icon: 'book',
        title: '外文文献精读耗时',
        desc: '英文顶刊长难句、专业术语壁垒与复杂数学公式推导理解门槛高，逐篇通读耗费大量科研时间。',
      },
      {
        icon: 'flask',
        title: 'Baseline 实验复现困难',
        desc: '开源实验代码环境配置繁琐、基线复现屡屡失败，消融实验缺乏规范的对比维度。',
      },
    ],
    keywords: ['开题调研', '文献精读', 'Baseline 对比', '消融实验'],
  },
  {
    id: 'teacher',
    role: '高校教师',
    tag: '教研并进 · 课题立项与团队指导',
    coverImg: earlyScholarImg,
    avatarIcon: 'pen',
    themeColor: '#059669',
    badgeBg: 'rgba(5, 150, 105, 0.1)',
    cardActiveBg: 'rgba(5, 150, 105, 0.035)',
    shadowColor: 'rgba(5, 150, 105, 0.22)',
    sceneTitle: '国家/省部级基金申报书撰写、课题把控与学生论文预审',
    challenges: [
      {
        icon: 'doc',
        title: '基金申报书撰写周期紧',
        desc: '教学与行政事务繁多，国家自然科学基金/省部级课题申报书的研究现状综述与技术路线推导撰写时间极为紧迫。',
      },
      {
        icon: 'users',
        title: '组会指导与论文审阅负担重',
        desc: '花费大量精力帮不同层级的学生纠正初稿中的逻辑漏洞与格式硬伤，组会汇报缺乏统一标准。',
      },
      {
        icon: 'db',
        title: '课题组科研资产分散断层',
        desc: '学生毕业流动导致论文数据、实验脚本与文献笔记散落各处，缺乏数字化的课题积累与传承沉淀。',
      },
    ],
    keywords: ['国自然基金', '立项论证', '组会管理', '论文预审', '资产沉淀'],
  },
  {
    id: 'researcher',
    role: '科研人员',
    tag: '顶刊攻关 · 原创突破与学科交叉',
    coverImg: labPiImg,
    avatarIcon: 'flask',
    themeColor: '#7c3aed',
    badgeBg: 'rgba(124, 58, 237, 0.1)',
    cardActiveBg: 'rgba(124, 58, 237, 0.035)',
    shadowColor: 'rgba(124, 58, 237, 0.22)',
    sceneTitle: '顶刊顶会攻关、前沿学术雷达、严谨消融与同行盲审对抗',
    challenges: [
      {
        icon: 'target',
        title: '顶刊对创新性要求极苛刻',
        desc: '面向 Nature / IEEE / ACM 等高影响因子刊物，需要极高理论创新增量、严谨的数学形式化与深度机理解释。',
      },
      {
        icon: 'shield',
        title: '多学科交叉复现与消融复杂度高',
        desc: '多模态、跨模态大规模模型验证计算开销大，参数敏感性分析与可复现性存证工作量庞大。',
      },
      {
        icon: 'refresh',
        title: '同行盲审对抗与 Rebuttal 辩护',
        desc: '国际审稿人评审意见针锋相对，需在极短时间内推演审稿疑虑并组织严密、有说服力的抗辩材料。',
      },
    ],
    keywords: ['顶刊顶会', '前沿雷达', '多维消融', '同行盲审', 'Rebuttal'],
  },
];

export const LandingPersonas: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string>('student');

  return (
    <section id="personas" className="landing-section" style={{ maxWidth: 1320, margin: '0 auto', padding: '60px 24px' }}>
      <div className="section-head text-center" style={{ marginBottom: 44 }}>
        <div className="section-badge">User Personas & Scenarios</div>
        <h2 className="section-title" style={{ fontSize: 'clamp(26px, 3.2vw, 36px)', marginTop: 8 }}>
          用户画像与科研场景
        </h2>
        <p className="section-sub" style={{ maxWidth: 740, margin: '10px auto 0', color: 'var(--muted)', fontSize: 15.5 }}>
          针对大学生/研究生、高校教师与专业科研人员的学术成长路径，ScienceX 量身定制全链路科研协作中枢。
        </p>
      </div>

      {/* 三大画像场景卡片网格 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 26,
        }}
      >
        {PERSONA_SCENARIOS.map((p) => {
          const isSelected = selectedId === p.id;
          return (
            <div
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              style={{
                borderRadius: 24,
                overflow: 'hidden',
                background: isSelected ? p.cardActiveBg : '#ffffff',
                backdropFilter: 'blur(16px)',
                border: isSelected ? `2px solid ${p.themeColor}` : '1px solid #e2e8f0',
                boxShadow: isSelected
                  ? `0 20px 48px -10px ${p.shadowColor}, 0 4px 16px rgba(0, 0, 0, 0.05)`
                  : '0 4px 20px -4px rgba(15, 23, 42, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'all 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)',
                transform: isSelected ? 'translateY(-4px)' : 'none',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = p.themeColor;
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = `0 12px 28px -6px ${p.shadowColor}`;
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 4px 20px -4px rgba(15, 23, 42, 0.05)';
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`选择画像：${p.role}`}
            >
              {/* 顶部选中角标 */}
              {isSelected && (
                <div
                  style={{
                    position: 'absolute',
                    top: 14,
                    right: 14,
                    zIndex: 10,
                    background: p.themeColor,
                    color: '#ffffff',
                    fontSize: 11.5,
                    fontWeight: 700,
                    padding: '4px 12px',
                    borderRadius: 999,
                    boxShadow: `0 4px 12px ${p.shadowColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    backdropFilter: 'blur(6px)',
                  }}
                >
                  <Icon name="check" size={13} /> 聚焦场景
                </div>
              )}

              {/* 封面图区域 */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: 196,
                  overflow: 'hidden',
                  background: '#0e1d17',
                }}
              >
                <img
                  src={p.coverImg}
                  alt={p.role}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform 0.5s ease',
                    transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                    display: 'block',
                  }}
                  loading="lazy"
                />
                {/* 蒙层渐变 */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(15, 23, 42, 0.9) 0%, rgba(15, 23, 42, 0.3) 50%, rgba(0,0,0,0.1) 100%)',
                    pointerEvents: 'none',
                  }}
                />

                {/* 封面图内叠底信息 */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 14,
                    left: 18,
                    right: 18,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    zIndex: 2,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 13,
                        background: 'rgba(255, 255, 255, 0.95)',
                        color: p.themeColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
                        backdropFilter: 'blur(8px)',
                        flexShrink: 0,
                      }}
                    >
                      <Icon name={p.avatarIcon as any} size={22} />
                    </div>
                    <div>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 18,
                          color: '#ffffff',
                          textShadow: '0 2px 8px rgba(0, 0, 0, 0.7)',
                          lineHeight: 1.25,
                        }}
                      >
                        {p.role}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: '#e2e8f0',
                          marginTop: 3,
                          textShadow: '0 1px 4px rgba(0, 0, 0, 0.6)',
                          fontWeight: 500,
                        }}
                      >
                        {p.tag}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 卡片主体内容 */}
              <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                {/* 核心场景定位条 */}
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: p.themeColor,
                    marginBottom: 18,
                    padding: '9px 13px',
                    borderRadius: 11,
                    background: isSelected ? '#ffffff' : 'rgba(241, 245, 249, 0.75)',
                    border: isSelected ? `1px solid ${p.themeColor}33` : '1px solid #e2e8f0',
                    transition: 'all 0.25s ease',
                    lineHeight: 1.45,
                  }}
                >
                  🎯 {p.sceneTitle}
                </div>

                {/* 核心科研挑战清单 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, marginBottom: 18 }}>
                  {p.challenges.map((c, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 12,
                        background: isSelected ? 'rgba(255, 255, 255, 0.8)' : '#f8fafc',
                        border: '1px solid #edf2f7',
                        display: 'flex',
                        gap: 12,
                        alignItems: 'flex-start',
                      }}
                    >
                      <span
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: `${p.themeColor}12`,
                          color: p.themeColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        <Icon name={c.icon as any} size={15} />
                      </span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>
                          {c.title}
                        </div>
                        <div style={{ fontSize: 12, color: '#475569', marginTop: 3, lineHeight: 1.5 }}>
                          {c.desc}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 底部学术关键词标签 */}
                <div
                  style={{
                    borderTop: '1px solid #edf2f7',
                    paddingTop: 14,
                    marginTop: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    flexWrap: 'wrap',
                  }}
                >
                  {p.keywords.map((kw, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: 11.5,
                        padding: '3px 9px',
                        borderRadius: 6,
                        background: isSelected ? `${p.themeColor}12` : '#f1f5f9',
                        color: isSelected ? p.themeColor : '#475569',
                        fontWeight: isSelected ? 700 : 500,
                        border: isSelected ? `1px solid ${p.themeColor}26` : '1px solid transparent',
                      }}
                    >
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
