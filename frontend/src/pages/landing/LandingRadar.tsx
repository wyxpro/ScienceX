import React, { useState } from 'react';
import Icon from '../../components/Icon';

const DIMENSIONS = [
  { name: '理论严密性', score: 94, icon: 'layers', role: '理论评审', title: '让每一步推导，经得起追问。', desc: '检查公式推导、符号定义与定理假设，梳理研究论证的逻辑链条。', checks: ['符号与定义的一致性', '定理假设与适用边界', '推导过程与论证完整性'], suggestion: '建议补充关键定理的适用条件，并统一正文与附录中的符号定义。' },
  { name: '方法创新度', score: 91, icon: 'bulb', role: '方法评审', title: '让真正的创新，被清晰看见。', desc: '对照相关研究，审视方法差异与贡献表述，帮助厘清研究的增量价值。', checks: ['与已有方法的实质差异', '创新动机与问题匹配度', '贡献表述与证据的一致性'], suggestion: '建议增加与最接近工作的逐项比较，明确跨层交互模块的独立贡献。' },
  { name: '实验充分性', score: 88, icon: 'flask', role: '实验评审', title: '让每一个结论，都有证据支撑。', desc: '检查对比基线、消融设置与评测协议，帮助发现可复现性和实验设计中的缺口。', checks: ['基线选择与评测协议', '消融实验与变量控制', '随机种子、方差与复现信息'], suggestion: '建议补充多随机种子结果和方差，并在统一评测协议下重新对齐基线。' },
  { name: '写作规范度', score: 96, icon: 'pen', role: '写作与伦理评审', title: '让严谨的研究，有清晰的表达。', desc: '从术语、行文与图表组织入手，检查学术表达是否准确、连贯且易于理解。', checks: ['学术术语与语言一致性', '图表标注与引用规范', '段落衔接与论述结构'], suggestion: '建议在结果章节先概述主要发现，再逐项解释图表与实验观察。' },
  { name: '学术伦理合规', score: 98, icon: 'shield', role: '写作与伦理评审', title: '让研究的边界，同样得到重视。', desc: '核对数据来源、授权说明与引用披露，提示需要研究者进一步确认的合规事项。', checks: ['数据集来源与使用授权', '引用与利益冲突披露', '研究限制与伦理声明'], suggestion: '建议明确数据集的授权范围，并在论文中补充研究限制与伦理说明。' },
];
const point = (index: number, radius: number) => {
  const angle = index * Math.PI * 2 / 5 - Math.PI / 2;
  return [210 + Math.cos(angle) * radius, 190 + Math.sin(angle) * radius];
};
const polygon = (radius: number) => DIMENSIONS.map((_, index) => point(index, radius).join(',')).join(' ');

export const LandingRadar: React.FC = () => {
  const [active, setActive] = useState(0);
  const item = DIMENSIONS[active];
  const [x, y] = point(active, 116 * item.score / 100);
  return (
    <section id="radar" className="landing-section radar-section">
      <div className="section-head"><div className="section-badge">Multi-Agent Radar</div><h2 className="section-title">多智能体专家评审：5 维严谨评估</h2><p className="section-sub">投稿之前，先听听不同的学术视角。<br />从独立审阅到主席汇总，把评审意见变成下一步行动。</p></div>
      <div className="radar-workbench">
        <div className="radar-chart-card"><div className="radar-card-heading"><span><Icon name="award" size={16} />论文评审报告</span><span className="radar-example">示例预览</span></div>
          <svg className="review-radar" viewBox="0 0 420 365" role="img" aria-label={`示例评分：${DIMENSIONS.map(d => `${d.name} ${d.score} 分`).join('，')}。当前查看${item.name}`}>
            {[.25, .5, .75, 1].map(scale => <polygon key={scale} points={polygon(116 * scale)} className="radar-grid-ring" />)}
            {DIMENSIONS.map((d, i) => { const [ax, ay] = point(i, 116); return <line key={d.name} x1="210" y1="190" x2={ax} y2={ay} className="radar-axis" />; })}
            <polygon points={DIMENSIONS.map((d, i) => point(i, 116 * d.score / 100).join(',')).join(' ')} className="radar-area" />
            <line x1="210" y1="190" x2={x} y2={y} className="radar-active-line" />
            {DIMENSIONS.map((d, i) => { const [px, py] = point(i, 116 * d.score / 100); const [lx, ly] = point(i, 164); return <g key={d.name} className={active === i ? 'radar-label active' : 'radar-label'}><circle cx={px} cy={py} r={active === i ? 6 : 3.5} /><text x={lx} y={ly - 4} textAnchor="middle">{d.name}</text><text x={lx} y={ly + 15} textAnchor="middle" className="radar-label-score">{d.score}<tspan fontSize="9"> / 100</tspan></text></g>; })}
            <circle cx="210" cy="190" r="30" className="radar-center" /><text x="210" y="186" textAnchor="middle" className="radar-center-value">5</text><text x="210" y="202" textAnchor="middle" className="radar-center-caption">评估维度</text>
          </svg>
          <div className="radar-dimension-buttons" aria-label="选择评审维度">{DIMENSIONS.map((d, index) => <button key={d.name} aria-pressed={active === index} aria-controls="radar-detail" className={active === index ? 'active' : ''} onClick={() => setActive(index)}><Icon name={d.icon} size={15} /><span>{index === 4 ? '伦理' : d.name.slice(0, 2)}</span></button>)}</div>
          <p className="radar-chart-note">示例分数用于演示评审维度，不代表实际论文结果。</p>
        </div>
        <div className="radar-detail" id="radar-detail" aria-live="polite"><div className="radar-detail-body" key={item.name}><span className="landing-kicker">REVIEW INSIGHT / 0{active + 1}</span><div className="radar-role"><span><Icon name={item.icon} size={20} /></span>{item.role}</div><h3>{item.title}</h3><p>{item.desc}</p><ul>{item.checks.map(check => <li key={check}><Icon name="check" size={15} />{check}</li>)}</ul><div className="radar-suggestion"><span><Icon name="chat" size={15} />修改建议示例</span><p>{item.suggestion}</p></div></div><div className="radar-chair"><Icon name="users" size={18} /><p><strong>主审主席 · 综合仲裁</strong><span>汇总多角色意见，整理分歧与优先修改清单。</span></p><Icon name="arrowRight" size={16} /></div></div>
      </div>
    </section>
  );
};
