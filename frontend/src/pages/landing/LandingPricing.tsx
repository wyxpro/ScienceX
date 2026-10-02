import React from 'react';
import { useNavigate } from 'react-router-dom';

export const LandingPricing: React.FC = () => {
  const nav = useNavigate();

  return (
    <section id="pricing" className="landing-section" style={{ borderTop: '1px solid var(--line-strong)' }}>
      <div className="section-head">
        <div className="section-badge">Flexible Pricing</div>
        <h2 className="section-title">透明亲民的科研支持方案</h2>
        <p className="section-sub">
          从本科开题新手到百人级重点实验室，提供满足不同阶段学术需求的灵活计费与私有化部署。
        </p>
      </div>

      <div className="pricing-grid">
        {/* 免费探索版 */}
        <div className="pricing-card">
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>探索版 (Free)</h3>
          <p className="text-xs text-muted mt-1">适合本科毕设与科研启蒙体验</p>
          <div className="pricing-price">
            ¥0 <span className="pricing-period">/ 永久免费</span>
          </div>
          <ul style={{ margin: '18px 0', paddingLeft: 18, fontSize: 13, lineHeight: 1.7, flex: 1 }}>
            <li>每日 30 次基础 AI 对话提问</li>
            <li>基础文献阅读与思维导图生成 (5 篇/月)</li>
            <li>基础学术写作润色与翻译</li>
            <li>支持接入自定义 OpenAI 模型</li>
          </ul>
          <button className="btn btn-ghost btn-block" onClick={() => nav('/login')}>
            免费使用
          </button>
        </div>

        {/* 科研进阶版 (推荐) */}
        <div className="pricing-card popular">
          <div className="pricing-popular-tag">🔥 最受欢迎</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--brand-deep)' }}>科研进阶版 (Pro)</h3>
          <p className="text-xs text-muted mt-1">为硕士/博士高强度论文冲刺打造</p>
          <div className="pricing-price" style={{ color: 'var(--brand-deep)' }}>
            ¥49 <span className="pricing-period">/ 月</span>
          </div>
          <ul style={{ margin: '18px 0', paddingLeft: 18, fontSize: 13, lineHeight: 1.7, flex: 1 }}>
            <li><strong>无限次</strong> 对话中枢交互</li>
            <li>三栏文献精读 + 引用拓扑图谱解析</li>
            <li><strong>自动化消融实验方案矩阵生成</strong></li>
            <li><strong>多智能体专家评审团</strong> (每月 10 次完整盲审)</li>
            <li>双通道论文查重与高保真降重</li>
            <li>一键生成组会汇报 PPTX</li>
          </ul>
          <button className="btn btn-primary btn-block" onClick={() => nav('/login')}>
            立即升级体验
          </button>
        </div>

        {/* 课题组团队版 */}
        <div className="pricing-card">
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>课题组尊享版 (Team)</h3>
          <p className="text-xs text-muted mt-1">适合 5-15 人实验室团队协同沉淀</p>
          <div className="pricing-price">
            ¥299 <span className="pricing-period">/ 月 (团队共享)</span>
          </div>
          <ul style={{ margin: '18px 0', paddingLeft: 18, fontSize: 13, lineHeight: 1.7, flex: 1 }}>
            <li>包含 Pro 版全部能力，支持 15 位成员</li>
            <li><strong>共享专属 RAG 课题组向量文献库</strong></li>
            <li>实验室 GPU 集群节点实时监控与任务调度</li>
            <li>组会导师修改意见自动归档与待办分发</li>
            <li>团队项目资产与产出沉淀看板</li>
          </ul>
          <button className="btn btn-ghost btn-block" onClick={() => nav('/login')}>
            开通团队空间
          </button>
        </div>

        {/* 机构定制版 */}
        <div className="pricing-card">
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>机构私有版 (Enterprise)</h3>
          <p className="text-xs text-muted mt-1">面向高校图书馆、科研院所与企业研发中心</p>
          <div className="pricing-price">
            定制 <span className="pricing-period">/ 按需年付</span>
          </div>
          <ul style={{ margin: '18px 0', paddingLeft: 18, fontSize: 13, lineHeight: 1.7, flex: 1 }}>
            <li><strong>单机 / K8s 私有化集群完全本地化部署</strong></li>
            <li>国产大模型（Qwen、GLM）及本地算力深度集成</li>
            <li>统一单点登录 (SSO) 与科研数据安全审计</li>
            <li>专属技术支持与定制科研 Skill 智能体开发</li>
          </ul>
          <button className="btn btn-ghost btn-block" onClick={() => nav('/login')}>
            联系专属顾问
          </button>
        </div>
      </div>
    </section>
  );
};
