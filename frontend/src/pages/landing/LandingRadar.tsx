import React from 'react';

export const LandingRadar: React.FC = () => {
  return (
    <section id="radar" className="landing-section" style={{ borderTop: '1px solid var(--line-strong)', borderBottom: '1px solid var(--line-strong)' }}>
      <div className="section-head">
        <div className="section-badge">Multi-Agent Radar</div>
        <h2 className="section-title">多智能体专家评审：5 维严谨评估</h2>
        <p className="section-sub">
          在被期刊审稿人拒绝之前，先让五位由 AI 专家组成的评审团为论文全面“体检”。
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
        {/* 左侧：矢量 SVG 雷达图 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--bg-deep)', padding: 24, borderRadius: 20, border: '1px solid var(--line-strong)' }}>
          <svg width="340" height="340" viewBox="0 0 340 340" style={{ overflow: 'visible' }}>
            {/* 背景五边形网格 */}
            {[0.2, 0.4, 0.6, 0.8, 1].map((scale, i) => {
              const r = 110 * scale;
              const points = [0, 1, 2, 3, 4].map((idx) => {
                const angle = (Math.PI * 2 * idx) / 5 - Math.PI / 2;
                return `${170 + r * Math.cos(angle)},${170 + r * Math.sin(angle)}`;
              }).join(' ');
              return (
                <polygon
                  key={i}
                  points={points}
                  fill="none"
                  stroke="var(--line-strong)"
                  strokeWidth="1"
                  strokeDasharray={scale === 1 ? 'none' : '3 3'}
                />
              );
            })}

            {/* 5 根轴线 */}
            {[0, 1, 2, 3, 4].map((idx) => {
              const angle = (Math.PI * 2 * idx) / 5 - Math.PI / 2;
              return (
                <line
                  key={idx}
                  x1="170" y1="170"
                  x2={170 + 110 * Math.cos(angle)}
                  y2={170 + 110 * Math.sin(angle)}
                  stroke="var(--line-strong)"
                  strokeWidth="1"
                />
              );
            })}

            {/* 对比方案：传统单点工具 (灰色虚线) */}
            {(() => {
              const rList = [0.55, 0.65, 0.45, 0.70, 0.50].map((v) => v * 110);
              const points = rList.map((r, idx) => {
                const angle = (Math.PI * 2 * idx) / 5 - Math.PI / 2;
                return `${170 + r * Math.cos(angle)},${170 + r * Math.sin(angle)}`;
              }).join(' ');
              return (
                <polygon
                  points={points}
                  fill="rgba(138, 148, 141, 0.15)"
                  stroke="var(--muted)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              );
            })()}

            {/* ScienceX 评审团多边形 (绿色高亮) */}
            {(() => {
              const rList = [0.94, 0.91, 0.88, 0.96, 0.98].map((v) => v * 110);
              const points = rList.map((r, idx) => {
                const angle = (Math.PI * 2 * idx) / 5 - Math.PI / 2;
                return `${170 + r * Math.cos(angle)},${170 + r * Math.sin(angle)}`;
              }).join(' ');
              return (
                <polygon
                  points={points}
                  fill="rgba(27, 122, 94, 0.28)"
                  stroke="var(--brand)"
                  strokeWidth="2.5"
                />
              );
            })()}

            {/* 数据顶点与文字标签 */}
            {[
              { name: '理论严密性', score: '94%', angleIdx: 0, dx: 0, dy: -18 },
              { name: '方法创新度', score: '91%', angleIdx: 1, dx: 22, dy: -4 },
              { name: '实验充分性', score: '88%', angleIdx: 2, dx: 18, dy: 16 },
              { name: '写作规范度', score: '96%', angleIdx: 3, dx: -18, dy: 16 },
              { name: '学术伦理合规', score: '98%', angleIdx: 4, dx: -22, dy: -4 },
            ].map((item, i) => {
              const angle = (Math.PI * 2 * item.angleIdx) / 5 - Math.PI / 2;
              const x = 170 + 125 * Math.cos(angle) + item.dx;
              const y = 170 + 125 * Math.sin(angle) + item.dy;
              return (
                <g key={i}>
                  <text
                    x={x} y={y}
                    textAnchor="middle"
                    fill="var(--ink)"
                    fontSize="12"
                    fontWeight="700"
                  >
                    {item.name}
                  </text>
                  <text
                    x={x} y={y + 13}
                    textAnchor="middle"
                    fill="var(--brand-strong)"
                    fontSize="11"
                    fontWeight="bold"
                  >
                    {item.score}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* 图例 */}
          <div className="row g-3 mt-3 text-xs">
            <span className="row g-1 items-center">
              <span style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(27, 122, 94, 0.5)', border: '1.5px solid var(--brand)' }} />
              <strong>ScienceX 专家盲审</strong>
            </span>
            <span className="row g-1 items-center text-muted">
              <span style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(138, 148, 141, 0.2)', border: '1.5px dashed var(--muted)' }} />
              <span>常规单点工具</span>
            </span>
          </div>
        </div>

        {/* 右侧：专家评审团 5 角色详细说明 */}
        <div>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
            多视角对抗式把关，不放过任何评审死角
          </h3>
          <div className="col g-3">
            <div className="card card-pad" style={{ padding: '12px 16px', background: 'var(--bg-deep)', border: '1px solid var(--line-strong)' }}>
              <strong style={{ color: 'var(--brand-deep)' }}>1. 理论 Agent（审严谨）</strong>
              <p className="text-small text-muted mt-1" style={{ margin: 0 }}>
                排查数学公式推导漏洞、符号命名冲突与定理假设边界，确保论文逻辑牢不可破。
              </p>
            </div>
            <div className="card card-pad" style={{ padding: '12px 16px', background: 'var(--bg-deep)', border: '1px solid var(--line-strong)' }}>
              <strong style={{ color: 'var(--brand-deep)' }}>2. 方法 Agent（审创新）</strong>
              <p className="text-small text-muted mt-1" style={{ margin: 0 }}>
                检索全球先验文献，核验创新点是否真实成立，避免陷入现有成果的换皮套壳。
              </p>
            </div>
            <div className="card card-pad" style={{ padding: '12px 16px', background: 'var(--bg-deep)', border: '1px solid var(--line-strong)' }}>
              <strong style={{ color: 'var(--brand-deep)' }}>3. 实验 Agent（审复现与消融）</strong>
              <p className="text-small text-muted mt-1" style={{ margin: 0 }}>
                严格对照标准协议（如 LOSO），检查随机种子、方差报告与消融路径是否具备统计显著性。
              </p>
            </div>
            <div className="card card-pad" style={{ padding: '12px 16px', background: 'var(--bg-deep)', border: '1px solid var(--line-strong)' }}>
              <strong style={{ color: 'var(--brand-deep)' }}>4. 写作与伦理 Agent（审表述与合规）</strong>
              <p className="text-small text-muted mt-1" style={{ margin: 0 }}>
                纠正学术英语语法、格式排版以及数据集授权、开源合规隐患，出具可操作的返修清单。
              </p>
            </div>
            <div className="card card-pad" style={{ padding: '12px 16px', background: 'var(--bg-deep)', border: '1px solid var(--line-strong)' }}>
              <strong style={{ color: 'var(--brand-deep)' }}>5. 主审主席 Agent（终审仲裁与决策）</strong>
              <p className="text-small text-muted mt-1" style={{ margin: 0 }}>
                权衡审稿人分歧，出具 Meta-Review 综合评定（Accept/Major/Reject）与精准返修指引。
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
