import React from 'react';

export const LandingReviews: React.FC = () => {
  return (
    <section id="reviews" className="landing-section">
      <div className="section-head">
        <div className="section-badge">Academic Testimonials</div>
        <h2 className="section-title">来自顶尖学者与青年研究员的真实口碑</h2>
        <p className="section-sub">
          累计陪伴超过 10,000+ 学者完成从开题、读文献到顶会顶刊成功接收的全流程。
        </p>
      </div>

      <div className="reviews-grid">
        <div className="review-card">
          <div className="review-stars">★★★★★</div>
          <p className="text-small" style={{ lineHeight: 1.6, flex: 1, color: 'var(--ink)' }}>
            “在 CVPR 截稿前 2 周，我们用 ScienceX 的消融方案推导器补全了 3 个随机种子的对比实验。审稿人特别称赞了我们在 LOSO 协议下的消融完备性，最终被 Oral 录用！”
          </p>
          <div className="row g-2 items-center mt-3 pt-2" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="avatar" style={{ width: 34, height: 34, background: 'var(--brand-soft)', color: 'var(--brand-strong)' }}>张</div>
            <div>
              <div className="fw-bold text-small">张同学 · 计算机系博士候选人</div>
              <div className="text-xs text-muted">清华大学 · CVPR 2025 作者</div>
            </div>
          </div>
        </div>

        <div className="review-card">
          <div className="review-stars">★★★★★</div>
          <p className="text-small" style={{ lineHeight: 1.6, flex: 1, color: 'var(--ink)' }}>
            “组会前要求学生先用 ScienceX 跑一遍专家评审团，学生自己就能发现逻辑漏洞，组会汇报 PPT 一键生成节省了大半天准备时间，团队指导效率倍增。”
          </p>
          <div className="row g-2 items-center mt-3 pt-2" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="avatar" style={{ width: 34, height: 34, background: 'var(--accent-soft)', color: 'var(--accent)' }}>林</div>
            <div>
              <div className="fw-bold text-small">林副研究员 · 博士生导师</div>
              <div className="text-xs text-muted">中科院自动化所 · 情感计算团队</div>
            </div>
          </div>
        </div>

        <div className="review-card">
          <div className="review-stars">★★★★★</div>
          <p className="text-small" style={{ lineHeight: 1.6, flex: 1, color: 'var(--ink)' }}>
            “跨学科做医疗微表情分析时，ScienceX 的专业术语对齐与引用网络图谱帮我节省了至少一个月的基础调研时间，精准理清了领域 10 年的方法谱系。”
          </p>
          <div className="row g-2 items-center mt-3 pt-2" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="avatar" style={{ width: 34, height: 34, background: 'var(--blue-safe-soft)', color: 'var(--blue-safe)' }}>孙</div>
            <div>
              <div className="fw-bold text-small">孙博士 · 博士后研究员</div>
              <div className="text-xs text-muted">浙江大学 · TPAMI 2025 第一作者</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
