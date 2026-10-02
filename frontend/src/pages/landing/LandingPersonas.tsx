import React, { useState } from 'react';
import Icon from '../../components/Icon';

interface PersonaScenario {
  id: string;
  role: string;
  tag: string;
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

// 仅保留三大核心角色：硕博研究生、青年学者/博士后、课题组导师/PI
const PERSONA_SCENARIOS: PersonaScenario[] = [
  {
    id: 'grad-student',
    role: '硕士 / 博士研究生',
    tag: '学术探索 · 开题与精读',
    avatarIcon: 'book',
    themeColor: '#1b7a5e',
    badgeBg: 'rgba(27, 122, 94, 0.12)',
    cardActiveBg: 'rgba(27, 122, 94, 0.05)',
    shadowColor: 'rgba(27, 122, 94, 0.28)',
    sceneTitle: '开题破局、文献精读与基线消融实验',
    pains: [
      '开题调研面对海量外文文献茫然无措，难以精准捕捉核心创新点与研究空白；',
      '外文顶刊长难句与公式推导繁杂，逐字阅读耗费数周时间；',
      '消融实验方案设计不周全，缺乏严密的 Baseline 对比和可复现性。',
    ],
    solves: [
      '智能选题雷达：结合顶刊顶会趋势与已有研究生成选题可行性分析；',
      '三栏结构化精读：提取七段式核心总结、一键生成交互式思维导图与引用网络；',
      '实验方案自动推导：输出标准消融对照矩阵与 UF1 柱状图/混淆矩阵。',
    ],
    metrics: ['开题周期缩短 60%', '文献精读提速 3x', '消融设计一次成型'],
  },
  {
    id: 'early-scholar',
    role: '青年学者 / 博士后',
    tag: '顶会冲刺 · 地道写作',
    avatarIcon: 'pen',
    themeColor: '#c2762b',
    badgeBg: 'rgba(194, 118, 43, 0.12)',
    cardActiveBg: 'rgba(194, 118, 43, 0.05)',
    shadowColor: 'rgba(194, 118, 43, 0.28)',
    sceneTitle: '多线程赶 Deadline、期刊风格润色与智能选刊',
    pains: [
      '多个顶会顶刊截稿日期并轨推进，精力分散难以保证高质量交付；',
      '论文英文表达存在中式思维，审稿人常因“语言生硬”给出负面评价；',
      '投稿选刊难以决策，不清楚审稿周期、录用偏好与影响因子变化。',
    ],
    solves: [
      '期刊风格精准润色：注入领域权威术语库，实现原汁原味的学术英语重构；',
      'CCF 会议期刊大全：根据论文摘要智能匹配期刊，实时提供倒计时预警；',
      '查重降重对照工作台：左右双栏实时对照，保留学术核心语义。',
    ],
    metrics: ['稿件润色效率提升 4x', '选刊匹配准确率 92%', '大修一次通过率提高'],
  },
  {
    id: 'lab-pi',
    role: '课题组导师 / 实验室 PI',
    tag: '团队统筹 · 资产沉淀',
    avatarIcon: 'users',
    themeColor: '#2563eb',
    badgeBg: 'rgba(37, 99, 235, 0.12)',
    cardActiveBg: 'rgba(37, 99, 235, 0.05)',
    shadowColor: 'rgba(37, 99, 235, 0.28)',
    sceneTitle: '组会汇报材料自动化、指导把控与科研资产库',
    pains: [
      '多位学生实验进展格式散乱，每周组会材料准备耗费学生与导师大量时间；',
      '花费大量精力纠正论文初稿中的逻辑硬伤与格式问题；',
      '学生毕业流动导致论文数据、实验代码与文献笔记散落丢失。',
    ],
    solves: [
      '一键生成汇报 PPTX：把实验消融进展直接转化为标准 12 页汇报幻灯片；',
      '模拟初审把关：让学生在提交前先过一遍多智能体自查，规避硬伤；',
      '集中式项目资产空间：文献库、代码实验、图表与稿件全生命周期资产留存。',
    ],
    metrics: ['组会筹备节省 80% 时间', '实验室数字资产 100% 留存', '指导沟通零损耗'],
  },
];

export const LandingPersonas: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string>('grad-student');

  return (
    <section id="personas" className="landing-section" style={{ maxWidth: 1320, margin: '0 auto', padding: '60px 24px' }}>
      <div className="section-head text-center" style={{ marginBottom: 44 }}>
        <div className="section-badge">User Personas & Scenarios</div>
        <h2 className="section-title" style={{ fontSize: 'clamp(26px, 3.2vw, 36px)', marginTop: 8 }}>
          用户画像与科研场景
        </h2>
        <p className="section-sub" style={{ maxWidth: 720, margin: '10px auto 0', color: 'var(--muted)', fontSize: 15.5 }}>
          从开题破局、多线程写作到组会统筹与成果沉淀，ScienceX 量身赋能每一位科研工作者的关键决策时刻。
        </p>
      </div>

      {/* 三大画像场景卡片网格（点击有交互效果与专属配色） */}
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
                borderRadius: 20,
                padding: '26px 24px',
                background: isSelected ? p.cardActiveBg : 'rgba(255, 255, 255, 0.65)',
                backdropFilter: 'blur(14px)',
                border: isSelected ? `2.5px solid ${p.themeColor}` : '1.5px solid var(--line)',
                boxShadow: isSelected
                  ? `0 18px 40px -8px ${p.shadowColor}, 0 4px 14px rgba(0, 0, 0, 0.05)`
                  : '0 4px 16px -6px rgba(0, 0, 0, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                transform: isSelected ? 'translateY(-4px)' : 'none',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = p.themeColor;
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = `0 10px 24px -6px ${p.shadowColor}`;
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = 'var(--line)';
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 4px 16px -6px rgba(0, 0, 0, 0.05)';
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`选择画像：${p.role}`}
            >
              {/* 顶部微高亮角标 */}
              {isSelected && (
                <div
                  style={{
                    position: 'absolute',
                    top: -11,
                    right: 22,
                    background: p.themeColor,
                    color: '#ffffff',
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '2px 10px',
                    borderRadius: 999,
                    boxShadow: `0 4px 10px ${p.shadowColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Icon name="check" size={11} /> 当前选中方案
                </div>
              )}

              {/* 卡片头部 */}
              <div className="row-between items-center" style={{ marginBottom: 14 }}>
                <div className="row g-2 items-center">
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 14,
                      background: p.badgeBg,
                      color: p.themeColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: isSelected ? `0 4px 12px ${p.shadowColor}` : 'none',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <Icon name={p.avatarIcon as any} size={22} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--ink)' }}>{p.role}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{p.tag}</div>
                  </div>
                </div>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: 999,
                    fontSize: 11.5,
                    fontWeight: 700,
                    background: isSelected ? p.themeColor : p.badgeBg,
                    color: isSelected ? '#ffffff' : p.themeColor,
                    transition: 'all 0.25s ease',
                  }}
                >
                  {isSelected ? '✓ 聚焦场景' : '点击查看'}
                </span>
              </div>

              {/* 核心场景定位 */}
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: p.themeColor,
                  marginBottom: 14,
                  padding: '7px 12px',
                  borderRadius: 10,
                  background: isSelected ? 'rgba(255, 255, 255, 0.85)' : 'var(--bg-deep)',
                  border: isSelected ? `1px solid ${p.themeColor}33` : '1px solid transparent',
                  transition: 'all 0.25s ease',
                }}
              >
                🎯 {p.sceneTitle}
              </div>

              {/* 痛点与解法 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, marginBottom: 16 }}>
                <div style={{ fontSize: 12.5, color: '#8b3d36', background: 'rgba(194, 74, 66, 0.06)', padding: '11px 13px', borderRadius: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Icon name="alert" size={13} /> 典型科研痛点
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.55 }}>
                    {p.pains.map((pain, idx) => (
                      <li key={idx} style={{ marginBottom: 3 }}>{pain}</li>
                    ))}
                  </ul>
                </div>

                <div
                  style={{
                    fontSize: 12.5,
                    color: 'var(--ink)',
                    background: isSelected ? 'rgba(255, 255, 255, 0.95)' : 'var(--brand-softer)',
                    border: isSelected ? `1px solid ${p.themeColor}33` : 'none',
                    padding: '11px 13px',
                    borderRadius: 12,
                    transition: 'all 0.25s ease',
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5, color: p.themeColor }}>
                    <Icon name="zap" size={13} /> ScienceX 专属解法
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.55 }}>
                    {p.solves.map((solve, idx) => (
                      <li key={idx} style={{ marginBottom: 3 }}>{solve}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 量化指标标签 */}
              <div className="row g-1 wrap" style={{ borderTop: '1px solid var(--line)', paddingTop: 12, marginTop: 'auto' }}>
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
          );
        })}
      </div>
    </section>
  );
};
