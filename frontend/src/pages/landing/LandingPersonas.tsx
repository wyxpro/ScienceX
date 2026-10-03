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
  pains: string[];
  solves: string[];
  metrics: string[];
}

// 三大核心用户角色：大学生/研究生、高校教师、科研人员
const PERSONA_SCENARIOS: PersonaScenario[] = [
  {
    id: 'student',
    role: '大学生 / 研究生',
    tag: '学业深造 · 开题与精读',
    coverImg: gradStudentImg,
    avatarIcon: 'book',
    themeColor: '#0284c7',
    badgeBg: 'rgba(2, 132, 199, 0.1)',
    cardActiveBg: 'rgba(2, 132, 199, 0.04)',
    shadowColor: 'rgba(2, 132, 199, 0.25)',
    sceneTitle: '开题调研破局、文献公式精读与毕业论文 baseline 实验',
    pains: [
      '开题调研面对海量外文文献茫然无措，难以精准捕捉研究空白与创新点；',
      '外文顶刊长难句、专业术语与公式推导繁杂，逐篇通读耗费大量宝贵时间；',
      '毕业设计/学位论文消融实验设计不周全，缺乏严密 Baseline 对比，查重降重繁琐。',
    ],
    solves: [
      '智能选题雷达：结合前沿趋势与个人背景，智能输出开题报告与可行性论证；',
      '三栏结构化精读：提取七段式核心创新、交互式思维导图与公式可视化拆解；',
      '实验助手与查重降重：一键生成消融对照矩阵，提供学术级中英双语对照润色。',
    ],
    metrics: ['开题周期缩短 60%', '文献精读提速 3x', '消融设计一次成型'],
  },
  {
    id: 'teacher',
    role: '高校教师',
    tag: '教研并进 · 课题申报与指导',
    coverImg: earlyScholarImg,
    avatarIcon: 'pen',
    themeColor: '#059669',
    badgeBg: 'rgba(5, 150, 105, 0.1)',
    cardActiveBg: 'rgba(5, 150, 105, 0.04)',
    shadowColor: 'rgba(5, 150, 105, 0.25)',
    sceneTitle: '国家/省部级基金申报书撰写、课题把控与学生论文预审',
    pains: [
      '教学、科研与行政多线推进，国家/省部级基金申报与立项论证撰写时间极其紧缺；',
      '花费大量精力逐字修改学生提交的初稿硬伤，每周组会进展混乱难以高效调度；',
      '学生毕业流动导致论文实验数据、代码和文献库流失，课题资产缺乏统一数字化沉淀。',
    ],
    solves: [
      '基金申报助手：快速梳理国内外研究现状综述，辅助提炼科学假说与技术路线图；',
      '多智能体初审把关：让学生在提交前先完成 5 维同行模拟盲审，提前消除格式与逻辑硬伤；',
      '集中式课题资产库：文献库、实验代码、图表与项目全周期数据统一留存与传承。',
    ],
    metrics: ['申报书筹备提速 50%', '组会指导效率翻倍', '课题资产 100% 留存'],
  },
  {
    id: 'researcher',
    role: '科研人员',
    tag: '顶刊攻关 · 原创突破与交叉',
    coverImg: labPiImg,
    avatarIcon: 'flask',
    themeColor: '#7c3aed',
    badgeBg: 'rgba(124, 58, 237, 0.1)',
    cardActiveBg: 'rgba(124, 58, 237, 0.04)',
    shadowColor: 'rgba(124, 58, 237, 0.25)',
    sceneTitle: '顶刊顶会攻关、前沿学术雷达、严谨消融与同行盲审对抗',
    pains: [
      '瞄准 Nature/IEEE/ACM 顶刊，对创新性（Novelty）与理论深度要求极高；',
      '跨学科交叉研究文献壁垒高，复现复杂算法与大规模消融验证难度大；',
      '投稿周期长、审稿人评审意见犀利，缺乏针对性的抗辩（Rebuttal）策略推演。',
    ],
    solves: [
      '前沿雷达与创新量化：多源交叉追踪全球最新突破，精准推演理论创新增量；',
      '全生命周期消融矩阵：自动推导参数敏感性看板与可复现性存证报告；',
      '5 维智能体盲审陪练：全方位模拟严苛审稿人视角，辅助生成高质量 Rebuttal 辩护。',
    ],
    metrics: ['顶刊录用率提升 42%', '实验复现耗时削减 70%', 'Rebuttal 成功率提升'],
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24,
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
                background: isSelected ? p.cardActiveBg : 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(16px)',
                border: isSelected ? `2.5px solid ${p.themeColor}` : '1.5px solid var(--line)',
                boxShadow: isSelected
                  ? `0 20px 48px -10px ${p.shadowColor}, 0 4px 16px rgba(0, 0, 0, 0.06)`
                  : '0 6px 20px -6px rgba(0, 0, 0, 0.05)',
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
                  e.currentTarget.style.borderColor = 'var(--line)';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 6px 20px -6px rgba(0, 0, 0, 0.05)';
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
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '3px 12px',
                    borderRadius: 999,
                    boxShadow: `0 4px 12px ${p.shadowColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    backdropFilter: 'blur(6px)',
                  }}
                >
                  <Icon name="check" size={12} /> 聚焦场景
                </div>
              )}

              {/* 封面图区域 */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: 190,
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
                    background: 'linear-gradient(to top, rgba(15, 23, 42, 0.88) 0%, rgba(15, 23, 42, 0.25) 50%, rgba(0,0,0,0.1) 100%)',
                    pointerEvents: 'none',
                  }}
                />

                {/* 封面图内叠底信息 */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 12,
                    left: 16,
                    right: 16,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    zIndex: 2,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: 'rgba(255, 255, 255, 0.95)',
                        color: p.themeColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
                        backdropFilter: 'blur(8px)',
                      }}
                    >
                      <Icon name={p.avatarIcon as any} size={20} />
                    </div>
                    <div>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 17,
                          color: '#ffffff',
                          textShadow: '0 2px 8px rgba(0, 0, 0, 0.7)',
                          lineHeight: 1.25,
                        }}
                      >
                        {p.role}
                      </div>
                      <div
                        style={{
                          fontSize: 11.5,
                          color: '#e2e8f0',
                          marginTop: 3,
                          textShadow: '0 1px 4px rgba(0, 0, 0, 0.6)',
                        }}
                      >
                        {p.tag}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 卡片主体内容 */}
              <div style={{ padding: '20px 22px 22px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                {/* 核心场景定位 */}
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: p.themeColor,
                    marginBottom: 14,
                    padding: '8px 12px',
                    borderRadius: 10,
                    background: isSelected ? 'rgba(255, 255, 255, 0.95)' : 'var(--bg-deep)',
                    border: isSelected ? `1px solid ${p.themeColor}33` : '1px solid var(--line)',
                    transition: 'all 0.25s ease',
                  }}
                >
                  🎯 {p.sceneTitle}
                </div>

                {/* 痛点与解法 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, marginBottom: 16 }}>
                  <div
                    style={{
                      fontSize: 12.5,
                      color: '#991b1b',
                      background: 'rgba(239, 68, 68, 0.06)',
                      padding: '11px 13px',
                      borderRadius: 12,
                      border: '1px solid rgba(239, 68, 68, 0.12)',
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Icon name="alert" size={13} /> 典型科研痛点
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.55 }}>
                      {p.pains.map((pain, idx) => (
                        <li key={idx} style={{ marginBottom: 3 }}>
                          {pain}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div
                    style={{
                      fontSize: 12.5,
                      color: 'var(--ink)',
                      background: isSelected ? 'rgba(255, 255, 255, 0.95)' : 'rgba(248, 250, 252, 0.85)',
                      border: isSelected ? `1px solid ${p.themeColor}33` : '1px solid var(--line)',
                      padding: '11px 13px',
                      borderRadius: 12,
                      transition: 'all 0.25s ease',
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        marginBottom: 5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        color: p.themeColor,
                      }}
                    >
                      <Icon name="zap" size={13} /> ScienceX 专属解法
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.55 }}>
                      {p.solves.map((solve, idx) => (
                        <li key={idx} style={{ marginBottom: 3 }}>
                          {solve}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 量化指标标签 */}
                <div
                  className="row g-1 wrap"
                  style={{
                    borderTop: '1px solid var(--line)',
                    paddingTop: 12,
                    marginTop: 'auto',
                  }}
                >
                  {p.metrics.map((m, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: 11,
                        padding: '3px 9px',
                        borderRadius: 6,
                        background: isSelected ? `${p.themeColor}15` : 'rgba(0, 0, 0, 0.04)',
                        color: isSelected ? p.themeColor : 'var(--ink-2)',
                        fontWeight: isSelected ? 700 : 600,
                        border: isSelected ? `1px solid ${p.themeColor}33` : '1px solid transparent',
                        transition: 'all 0.25s ease',
                      }}
                    >
                      ⚡ {m}
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
