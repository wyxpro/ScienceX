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
  themeColor: string;
  badgeBg: string;
  cardActiveBg: string;
  shadowColor: string;
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
    themeColor: '#0284c7',
    badgeBg: 'rgba(2, 132, 199, 0.1)',
    cardActiveBg: 'rgba(2, 132, 199, 0.03)',
    shadowColor: 'rgba(2, 132, 199, 0.22)',
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
    themeColor: '#059669',
    badgeBg: 'rgba(5, 150, 105, 0.1)',
    cardActiveBg: 'rgba(5, 150, 105, 0.03)',
    shadowColor: 'rgba(5, 150, 105, 0.22)',
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
    themeColor: '#7c3aed',
    badgeBg: 'rgba(124, 58, 237, 0.1)',
    cardActiveBg: 'rgba(124, 58, 237, 0.03)',
    shadowColor: 'rgba(124, 58, 237, 0.22)',
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
  const [selectedId, setSelectedId] = useState<string>('student');

  return (
    <section id="personas" className="landing-section" style={{ maxWidth: 1320, margin: '0 auto', padding: '64px 24px' }}>
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: 28,
        }}
      >
        {PERSONA_SCENARIOS.map((p) => {
          const isSelected = selectedId === p.id;
          return (
            <div
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              style={{
                borderRadius: 22,
                overflow: 'hidden',
                background: '#ffffff',
                border: isSelected ? `2px solid ${p.themeColor}` : '1px solid #e2e8f0',
                boxShadow: isSelected
                  ? `0 20px 48px -10px ${p.shadowColor}, 0 4px 16px rgba(0, 0, 0, 0.04)`
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
                  e.currentTarget.style.boxShadow = `0 14px 30px -6px ${p.shadowColor}`;
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
              {/* 1. 顶部保留封面图区域 */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: 200,
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

                {/* 深度暗角渐变蒙层，保证文字 100% 易读 */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(15, 23, 42, 0.94) 0%, rgba(15, 23, 42, 0.45) 55%, rgba(0, 0, 0, 0.2) 100%)',
                    pointerEvents: 'none',
                  }}
                />

                {/* 封面顶部浮动标贴 */}
                <div
                  style={{
                    position: 'absolute',
                    top: 14,
                    left: 16,
                    right: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    zIndex: 2,
                  }}
                >
                  <span
                    style={{
                      background: 'rgba(15, 23, 42, 0.65)',
                      backdropFilter: 'blur(8px)',
                      color: '#ffffff',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: 6,
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                    }}
                  >
                    STAGE {p.order}
                  </span>

                  <span
                    style={{
                      background: isSelected ? p.themeColor : 'rgba(15, 23, 42, 0.65)',
                      backdropFilter: 'blur(8px)',
                      color: '#ffffff',
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: 999,
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      boxShadow: isSelected ? `0 2px 10px ${p.shadowColor}` : 'none',
                    }}
                  >
                    {p.audience}
                  </span>
                </div>

                {/* 封面底部核心信息 */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 14,
                    left: 18,
                    right: 18,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    zIndex: 2,
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: 'rgba(255, 255, 255, 0.95)',
                      color: p.themeColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
                      backdropFilter: 'blur(8px)',
                      flexShrink: 0,
                    }}
                  >
                    <Icon name={p.avatarIcon as any} size={20} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: 18,
                        color: '#ffffff',
                        letterSpacing: '-0.2px',
                        lineHeight: 1.25,
                      }}
                    >
                      {p.role}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: '#cbd5e1',
                        marginTop: 3,
                        fontWeight: 500,
                      }}
                    >
                      {p.tag}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. 卡片主体内容区域 */}
              <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                {/* 核心场景定位横条 */}
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: p.themeColor,
                    marginBottom: 16,
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: `${p.themeColor}0a`,
                    border: `1px solid ${p.themeColor}22`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 13 }}>🎯</span>
                  <span className="ellipsis">{p.sceneTitle}</span>
                </div>

                {/* 三大专属赋能功能微卡片 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, marginBottom: 16 }}>
                  {p.features.map((f, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: '#f8fafc',
                        border: '1px solid #edf2f7',
                        display: 'flex',
                        gap: 10,
                        alignItems: 'flex-start',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <span
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 7,
                          background: `${p.themeColor}14`,
                          color: p.themeColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        <Icon name={f.icon as any} size={14} />
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                          {f.title}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#475569', marginTop: 2, lineHeight: 1.45 }}>
                          {f.desc}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 标杆预期产出横条 */}
                <div
                  style={{
                    padding: '9px 12px',
                    borderRadius: 10,
                    background: isSelected ? 'rgba(255, 255, 255, 0.95)' : '#ffffff',
                    border: `1px dashed ${p.themeColor}44`,
                    marginBottom: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#0f172a',
                  }}
                >
                  <span style={{ color: '#d97706', fontSize: 14 }}>🏆</span>
                  <span style={{ color: '#334155' }}>
                    标杆目标：<strong style={{ color: p.themeColor }}>{p.targetOutcome}</strong>
                  </span>
                </div>

                {/* 底部学术关键词标签 */}
                <div
                  style={{
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: 12,
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
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: isSelected ? `${p.themeColor}12` : '#f1f5f9',
                        color: isSelected ? p.themeColor : '#64748b',
                        fontWeight: isSelected ? 700 : 500,
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
