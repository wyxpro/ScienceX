import React from 'react';
import Icon from '../../components/Icon';

export const LandingCompare: React.FC = () => {
  return (
    <section id="compare" className="landing-section" style={{ borderTop: '1px solid var(--line-strong)', borderBottom: '1px solid var(--line-strong)' }}>
      <div className="section-head">
        <div className="section-badge">Competitive Analysis</div>
        <h2 className="section-title">为什么选择 ScienceX？一表看清核心优势</h2>
        <p className="section-sub">
          市面工具多为功能孤岛，缺乏科研工作流编排；ScienceX 实现真正以科研闭环为核心的智能体协同。
        </p>
      </div>

      <div className="compare-table-wrapper table-responsive">
        <table className="compare-table">
          <thead>
            <tr>
              <th style={{ width: '24%' }}>核心评估维度</th>
              <th className="compare-highlight-col" style={{ width: '28%', color: 'var(--brand-deep)', fontSize: 15 }}>
                🧪 ScienceX 科研工作台 (推荐)
              </th>
              <th style={{ width: '16%' }}>通用大模型 (GPT / Kimi)</th>
              <th style={{ width: '16%' }}>单点文献工具 (SciSpace / Elicit)</th>
              <th style={{ width: '16%' }}>传统排版软件 (Zotero / Overleaf)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>全流程闭环工作流</strong><br /><span className="text-xs text-muted">选题 ➔ 实验 ➔ 写作 ➔ 投稿一站式</span></td>
              <td className="compare-highlight-col">
                <span className="compare-badge-good"><Icon name="check" size={14} /> ✅ 全环节数据自流转闭环</span>
              </td>
              <td><span className="compare-badge-bad">❌ 需反复跳出复制黏贴</span></td>
              <td><span className="compare-badge-warn">⚠️ 仅覆盖文献/综述</span></td>
              <td><span className="compare-badge-bad">❌ 无 AI 工作流打通</span></td>
            </tr>
            <tr>
              <td><strong>多智能体同行盲审团</strong><br /><span className="text-xs text-muted">5 位不同维度评审专家并行会诊</span></td>
              <td className="compare-highlight-col">
                <span className="compare-badge-good"><Icon name="check" size={14} /> ✅ 理论/方法/实验等 5 角色盲审</span>
              </td>
              <td><span className="compare-badge-bad">❌ 单一角色，易偏激遗漏</span></td>
              <td><span className="compare-badge-bad">❌ 不支持模拟审稿</span></td>
              <td><span className="compare-badge-bad">❌ 不支持</span></td>
            </tr>
            <tr>
              <td><strong>自动化消融实验推导</strong><br /><span className="text-xs text-muted">实验矩阵、控制变量与 SOTA 对标</span></td>
              <td className="compare-highlight-col">
                <span className="compare-badge-good"><Icon name="check" size={14} /> ✅ 自动构建消融方案矩阵</span>
              </td>
              <td><span className="compare-badge-warn">⚠️ 纯文本建议，缺少方案表</span></td>
              <td><span className="compare-badge-bad">❌ 不支持</span></td>
              <td><span className="compare-badge-bad">❌ 不支持</span></td>
            </tr>
            <tr>
              <td><strong>GPU 算力集群实时监控</strong><br /><span className="text-xs text-muted">显存负载、节点状态与智能调度</span></td>
              <td className="compare-highlight-col">
                <span className="compare-badge-good"><Icon name="check" size={14} /> ✅ 原生集成节点监控与调度</span>
              </td>
              <td><span className="compare-badge-bad">❌ 无底层硬件交互能力</span></td>
              <td><span className="compare-badge-bad">❌ 不支持</span></td>
              <td><span className="compare-badge-bad">❌ 不支持</span></td>
            </tr>
            <tr>
              <td><strong>三栏文献精读与引用拓扑</strong><br /><span className="text-xs text-muted">思维导图、七段式总结与图谱联动</span></td>
              <td className="compare-highlight-col">
                <span className="compare-badge-good"><Icon name="check" size={14} /> ✅ 结构化解析 + 动态图谱联动</span>
              </td>
              <td><span className="compare-badge-bad">❌ 仅能作为普通附件上传</span></td>
              <td><span className="compare-badge-warn">⚠️ 仅支持基本 PDF 划词问答</span></td>
              <td><span className="compare-badge-warn">⚠️ 仅能管理元数据</span></td>
            </tr>
            <tr>
              <td><strong>课题组私有 RAG 知识库</strong><br /><span className="text-xs text-muted">团队文献资产沉淀与多租户权限</span></td>
              <td className="compare-highlight-col">
                <span className="compare-badge-good"><Icon name="check" size={14} /> ✅ 支持个人/课题组多级隔离</span>
              </td>
              <td><span className="compare-badge-bad">❌ 仅个人会话级缓存</span></td>
              <td><span className="compare-badge-warn">⚠️ 仅限个人库，团队协作弱</span></td>
              <td><span className="compare-badge-bad">❌ 无向量检索能力</span></td>
            </tr>
            <tr>
              <td><strong>自定义大模型网关接入</strong><br /><span className="text-xs text-muted">支持用户自有 BaseURL 与 API Key</span></td>
              <td className="compare-highlight-col">
                <span className="compare-badge-good"><Icon name="check" size={14} /> ✅ 自由对接任意 OpenAI 兼容模型</span>
              </td>
              <td><span className="compare-badge-bad">❌ 强绑定自家模型生态</span></td>
              <td><span className="compare-badge-bad">❌ 封闭黑盒，不可自配</span></td>
              <td><span className="compare-badge-bad">❌ 无模型网关</span></td>
            </tr>
            <tr>
              <td><strong>组会汇报 PPTX 一键导出</strong><br /><span className="text-xs text-muted">实验数据一键排版与导师意见提取</span></td>
              <td className="compare-highlight-col">
                <span className="compare-badge-good"><Icon name="check" size={14} /> ✅ 原生生成下载 + 建议转待办</span>
              </td>
              <td><span className="compare-badge-warn">⚠️ 仅能输出文字大纲</span></td>
              <td><span className="compare-badge-bad">❌ 不支持</span></td>
              <td><span className="compare-badge-bad">❌ 不支持</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
};
