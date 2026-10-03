import React from 'react';
import Icon from '../../components/Icon';

interface ReviewItem {
  id: string;
  quote: string;
  author: string;
  affiliation: string;
  targetBadge: string;
  avatarLetter: string;
  avatarBg: string;
  stars: number;
}

// 上排：向左滚动（内容聚焦微表情识别、AUFormer、消融实验、组会PPTX）
const ROW_TOP: ReviewItem[] = [
  {
    id: 'r1',
    quote:
      '“在微表情识别（MER）跨库泛化研究中，面对 CASME II 与 SAMM 的分布差异，ScienceX 帮我理清了 AUFormer (ACM MM 24) 的七段式核心创新，生成的消融实验对比方案结构严谨，节省了整整两周摸索时间！”',
    author: '李同学 · 计算机系博士候选人',
    affiliation: '清华大学 · CVPR 2025 作者',
    targetBadge: 'AUFormer · CASME II',
    avatarLetter: '李',
    avatarBg: 'rgba(27, 122, 94, 0.15)',
    stars: 5,
  },
  {
    id: 'r2',
    quote:
      '“我们团队在做 up9-base 与 +cross-attn 消融对比时，ScienceX 的数据分析模块直接输出了符合顶刊要求的 UF1 柱状图与混淆矩阵，多模态 Vision 自动解读出的反常样本点帮我们查出了标注误差！”',
    author: '陈博士 · 模式识别实验室',
    affiliation: '中科院自动化所 · IEEE TAC 录用',
    targetBadge: 'up9 消融 · UF1 对比',
    avatarLetter: '陈',
    avatarBg: 'rgba(194, 118, 43, 0.15)',
    stars: 5,
  },
  {
    id: 'r3',
    quote:
      '“每周五导师组会汇报最头疼。现在把最新一轮实验记录一键生成 12 页专业汇报 PPTX，涵盖 Baseline 对齐、参数趋势与下周规划，导师在组会上特别表扬了实验逻辑闭环！”',
    author: '王硕士 · 机器视觉研究组',
    affiliation: '浙江大学 · 组会汇报特优',
    targetBadge: '12页 PPTX · 组会汇报',
    avatarLetter: '王',
    avatarBg: 'rgba(37, 99, 235, 0.15)',
    stars: 5,
  },
  {
    id: 'r4',
    quote:
      '“论文初稿完成后，调用五角色专家评审团进行盲审预演。方法派审稿人一针见血指出了跨库评测缺少 LOSO 协议验证，我们在正式投稿前补齐了该实验，最终成功避免了大修拒稿风险！”',
    author: '赵副研究员 · 情感计算团队',
    affiliation: '北京大学 · 模拟审稿报告 #rv1',
    targetBadge: '五角色盲审 · 审稿报告',
    avatarLetter: '赵',
    avatarBg: 'rgba(124, 58, 237, 0.15)',
    stars: 5,
  },
];

// 下排：向右滚动（内容聚焦每日文献速递、CCF期刊匹配、学术润色与项目空间）
const ROW_BOTTOM: ReviewItem[] = [
  {
    id: 'r5',
    quote:
      '“arXiv 上的 METrack 实时微表情定位长视频论文刚发布，今日文献速递就推送到我的工作台，三栏阅读器精准提取七段式总结并溯源到第 4 页核心公式，调研效率呈量级提升！”',
    author: '刘同学 · 博士候选人',
    affiliation: '复旦大学 · arXiv 追踪者',
    targetBadge: 'METrack · 文献速递',
    avatarLetter: '刘',
    avatarBg: 'rgba(13, 148, 136, 0.15)',
    stars: 5,
  },
  {
    id: 'r6',
    quote:
      '“CCF 期刊大全不仅有实时的截稿倒计时，期刊智能匹配算法还会根据我的微表情摘要精准推荐投递 IEEE TPAMI 和 ACM MM，审稿周期与接收偏好预测非常准，节奏拿捏精准。”',
    author: '周教授 · 博士生导师',
    affiliation: '上海交通大学 · 重点实验室 PI',
    targetBadge: 'CCF-A · 期刊智能匹配',
    avatarLetter: '周',
    avatarBg: 'rgba(217, 119, 6, 0.15)',
    stars: 5,
  },
  {
    id: 'r7',
    quote:
      '“论文写作的对照双语润色和专业术语库注入太惊艳了。把‘AU 先验 + Transformer’的段落重构得自然地道，审稿人专门评价‘语言流畅严谨、符合顶刊风格’，顺利录用！”',
    author: '孙博士 · 助理教授',
    affiliation: '南京大学 · ACM MM 2024 作者',
    targetBadge: '双语对照 · 期刊风格润色',
    avatarLetter: '孙',
    avatarBg: 'rgba(16, 185, 129, 0.15)',
    stars: 5,
  },
  {
    id: 'r8',
    quote:
      '“项目空间把我们课题的文献库、消融实验矩阵、图表资产与审稿报告完整串联。跨成员协作不再依赖微信群和网盘乱传，实验资产 100% 数字化沉淀，课题组管理神器！”',
    author: '钱研究员 · 博士后主管',
    affiliation: '中国科学技术大学 · 智能感知团队',
    targetBadge: '科研资产 · 项目空间',
    avatarLetter: '钱',
    avatarBg: 'rgba(99, 102, 241, 0.15)',
    stars: 5,
  },
];

export const LandingReviews: React.FC = () => {
  return (
    <section id="reviews" className="landing-section" style={{ maxWidth: 1400, margin: '0 auto', padding: '60px 0' }}>
      <div className="section-head text-center" style={{ padding: '0 24px', marginBottom: 36 }}>
        <div className="section-badge">Academic Testimonials</div>
        <h2 className="section-title" style={{ fontSize: 'clamp(26px, 3.2vw, 36px)', marginTop: 8 }}>
          真实科研项目落地口碑
        </h2>
        <p className="section-sub" style={{ maxWidth: 720, margin: '10px auto 0', color: 'var(--muted)', fontSize: 15.5 }}>
          来自真实微表情识别（MER）与前沿科研攻关团队的实测反馈，陪伴学者从开题、实验到顶会顶刊接收。
        </p>
      </div>

      {/* 双层轮播容器 */}
      <div className="reviews-marquee-container">
        {/* 上排：向左滚动 */}
        <div className="reviews-marquee-row reviews-marquee-left">
          {[...ROW_TOP, ...ROW_TOP].map((item, idx) => (
            <div key={`${item.id}-${idx}`} className="review-marquee-card">
              <div className="row-between items-center" style={{ marginBottom: 10 }}>
                <span style={{ color: 'var(--gold)', letterSpacing: 2, fontSize: 13 }}>
                  {'★'.repeat(item.stars)}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'var(--bg-deep)',
                    color: 'var(--brand-strong)',
                  }}
                >
                  {item.targetBadge}
                </span>
              </div>

              <p
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.62,
                  color: 'var(--ink)',
                  margin: '0 0 14px',
                  flex: 1,
                }}
              >
                {item.quote}
              </p>

              <div
                className="row g-2 items-center"
                style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 'auto' }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: item.avatarBg,
                    color: 'var(--ink)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  {item.avatarLetter}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="ellipsis" style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>
                    {item.author}
                  </div>
                  <div className="ellipsis text-xs text-muted" style={{ marginTop: 1 }}>
                    {item.affiliation}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 下排：向右滚动 */}
        <div className="reviews-marquee-row reviews-marquee-right">
          {[...ROW_BOTTOM, ...ROW_BOTTOM].map((item, idx) => (
            <div key={`${item.id}-${idx}`} className="review-marquee-card">
              <div className="row-between items-center" style={{ marginBottom: 10 }}>
                <span style={{ color: 'var(--gold)', letterSpacing: 2, fontSize: 13 }}>
                  {'★'.repeat(item.stars)}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'var(--bg-deep)',
                    color: 'var(--brand-strong)',
                  }}
                >
                  {item.targetBadge}
                </span>
              </div>

              <p
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.62,
                  color: 'var(--ink)',
                  margin: '0 0 14px',
                  flex: 1,
                }}
              >
                {item.quote}
              </p>

              <div
                className="row g-2 items-center"
                style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 'auto' }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: item.avatarBg,
                    color: 'var(--ink)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  {item.avatarLetter}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="ellipsis" style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>
                    {item.author}
                  </div>
                  <div className="ellipsis text-xs text-muted" style={{ marginTop: 1 }}>
                    {item.affiliation}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
