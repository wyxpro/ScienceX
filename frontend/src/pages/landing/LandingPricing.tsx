import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';

const PLANS = [
  { id: 'free', name: '探索版', english: 'FREE', icon: 'bulb', description: '从好奇出发，迈出科研第一步', price: '0', period: '永久免费', audience: '本科毕设 · 科研启蒙', action: '免费开始探索', summary: '开启你的基础科研工具箱', features: ['每日 30 次基础 AI 对话', '文献阅读与思维导图，5 篇 / 月', '基础学术润色与翻译', '自定义接入 OpenAI 模型'] },
  { id: 'pro', name: '科研进阶版', english: 'PRO', icon: 'spark', description: '为每一次论文突破，全力以赴', price: '19.9', period: '/ 月', audience: '硕士博士 · 论文冲刺', action: '开启进阶科研', summary: '让高强度研究，更从容', features: ['无限次对话中枢交互', '三栏文献精读与引用图谱', '自动化消融实验方案矩阵', '专家完整盲审，10 次 / 月', '双通道查重与高保真降重', '一键生成组会汇报 PPTX'] },
  { id: 'team', name: '课题组尊享版', english: 'TEAM', icon: 'users', description: '让个人的发现，成为团队的积累', price: '299', period: '/ 月 · 团队共享', audience: '5–15 人实验室 · 团队协同', action: '开通团队空间', summary: '包含 Pro 全部能力，并提供', features: ['支持 15 位团队成员', '专属共享 RAG 文献知识库', 'GPU 集群监控与任务调度', '导师意见归档与待办分发', '团队项目资产与成果看板'] },
  { id: 'enterprise', name: '机构私有版', english: 'ENTERPRISE', icon: 'shield', description: '让科研能力，扎根你的组织', price: '按需定制', period: '定制方案 · 按年付费', audience: '高校院所 · 企业研发中心', action: '咨询机构方案', summary: '专属部署，支持深度定制', features: ['单机 / K8s 集群本地化部署', 'Qwen、GLM 与本地算力集成', '统一 SSO 与科研数据审计', '专属技术支持', '定制科研 Skill 智能体开发'] },
];

export const LandingPricing: React.FC = () => {
  const nav = useNavigate();
  return (
    <section id="pricing" className="landing-section pricing-section">
      <div className="section-head"><div className="section-badge">Flexible Pricing</div><h2 className="section-title">透明亲民的科研支持方案</h2><p className="section-sub">从一个人的灵感，到整个团队的突破。<br />选择适合你现阶段的科研搭档。</p></div>
      <div className="pricing-grid">{PLANS.map(plan => <article className={`pricing-card${plan.id === 'pro' ? ' popular' : ''}`} key={plan.id}>
        <div className="pricing-card-top"><span className="pricing-icon"><Icon name={plan.icon} size={21} /></span><span className="pricing-tier">{plan.english}</span>{plan.id === 'pro' && <span className="pricing-popular-tag"><Icon name="star" size={11} />推荐方案</span>}</div>
        <h3>{plan.name}</h3><p className="pricing-description">{plan.description}</p>
        <div className={`pricing-price${plan.id === 'enterprise' ? ' custom' : ''}`}>{plan.id !== 'enterprise' && <span className="pricing-currency">¥</span>}{plan.price}</div><div className="pricing-period">{plan.period}</div>
        <button className="pricing-action" onClick={() => nav('/login')}>{plan.action}<Icon name="arrowRight" size={16} /></button>
        <div className="pricing-audience">{plan.audience}</div><div className="pricing-features"><p>{plan.summary}</p><ul>{plan.features.map(feature => <li key={feature}><Icon name="check" size={14} /><span>{feature}</span></li>)}</ul></div>
      </article>)}</div>
      <div className="pricing-assurance"><span><Icon name="shield" size={15} />数据私有可控</span><span><Icon name="link" size={15} />支持自定义模型</span><span><Icon name="users" size={15} />覆盖个人与团队</span></div>
    </section>
  );
};
