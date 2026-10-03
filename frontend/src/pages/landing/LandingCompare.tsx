import React, { useState } from 'react';
import Icon from '../../components/Icon';

const FILTERS = ['全部能力', '阅读与写作', '实验与评审', '协作与扩展'];
const ROWS = [
  { label: '科研全流程', sub: '从选题到投稿', icon: 'layers', group: 3, science: '统一工作台，连接全环节', others: ['通过对话分步完成', '围绕文献任务展开', '聚焦管理与排版'] },
  { label: '文献精读', sub: '理解、关联、积累', icon: 'book', group: 1, science: '三栏精读 + 引用拓扑图谱', others: ['附件问答与内容总结', '专业文献检索与问答', '文献整理与引用管理'] },
  { label: '学术写作', sub: '表达与成果整理', icon: 'pen', group: 1, science: '学术润色 + 汇报 PPTX', others: ['通用写作与大纲生成', '文献综述辅助', '专业排版与协同编辑'] },
  { label: '消融实验设计', sub: '验证每个研究假设', icon: 'flask', group: 2, science: '自动推导控制变量与实验矩阵', others: ['对话式方案建议', '侧重相关文献发现', '需另配实验工具'] },
  { label: '多角色专家评审', sub: '投稿前的多维审阅', icon: 'award', group: 2, science: '多角色独立评审与意见汇总', others: ['按提示模拟评审视角', '侧重文献分析', '需另配评审工具'] },
  { label: 'GPU 集群管理', sub: '让算力状态可见', icon: 'cpu', group: 2, science: '节点监控与任务调度', others: ['需外部工具集成', '需外部工具集成', '需外部工具集成'] },
  { label: '团队知识沉淀', sub: '让研究资产流转', icon: 'db', group: 3, science: '个人 / 课题组 RAG 知识库', others: ['依产品知识库能力而定', '个人或团队文献库', '共享文献与项目文件'] },
  { label: '自定义模型', sub: '保留你的选择权', icon: 'link', group: 3, science: '接入 OpenAI 兼容模型', others: ['依平台开放能力而定', '依平台开放能力而定', '通过插件或外部工具扩展'] },
];

export const LandingCompare: React.FC = () => {
  const [filter, setFilter] = useState(0);
  const rows = ROWS.filter(row => filter === 0 || row.group === filter);
  return (
    <section id="compare" className="landing-section comparison-section">
      <div className="section-head"><div className="section-badge">Competitive Analysis</div><h2 className="section-title">为什么选择 ScienceX？<br />一表看清核心优势</h2><p className="section-sub">把散落的工具，连接成连贯的研究体验。<br />按你关注的科研环节，找到合适的工作方式。</p></div>
      <div className="comparison-toolbar"><div className="landing-segmented" aria-label="筛选对比能力">{FILTERS.map((label, index) => <button key={label} aria-pressed={filter === index} className={filter === index ? 'active' : ''} onClick={() => setFilter(index)}>{label}</button>)}</div><span className="comparison-count" aria-live="polite">{rows.length} 项能力对比</span></div>
      <div className="comparison-scroll" role="region" aria-label="科研工具能力对比表，可横向滚动" tabIndex={0}>
        <table className="comparison-table"><caption className="sr-only">ScienceX 与通用大模型、文献工具、管理排版工具的典型使用方式对比</caption><thead><tr><th scope="col"><span className="landing-kicker">FIND YOUR FIT</span><strong>你的科研需求</strong></th><th scope="col" className="science-column"><span className="comparison-product"><Icon name="spark" size={20} />ScienceX</span><small>一体化 AI 科研工作台</small></th><th scope="col"><strong>通用大模型</strong><small>GPT / Kimi 等</small></th><th scope="col"><strong>文献工具</strong><small>SciSpace / Elicit 等</small></th><th scope="col"><strong>管理与排版工具</strong><small>Zotero / Overleaf 等</small></th></tr></thead><tbody>{rows.map(row => <tr key={row.label}><th scope="row"><span className="comparison-row-title"><Icon name={row.icon} size={17} />{row.label}</span><small>{row.sub}</small></th><td className="science-column"><span className="comparison-value"><Icon name="check" size={15} />{row.science}</span></td>{row.others.map((value, index) => <td key={index}>{value}</td>)}</tr>)}</tbody></table>
      </div>
      <div className="comparison-foot"><span><Icon name="info" size={14} />按典型使用方式展示，具体能力随产品版本与方案变化。</span><span className="comparison-scroll-hint">左右滑动查看完整对比 <Icon name="arrowRight" size={14} /></span></div>
    </section>
  );
};
