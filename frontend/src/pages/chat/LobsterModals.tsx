import React, { useState } from 'react';
import Icon from '../../components/Icon';
import { Modal } from '../../components/ui';
import type { AgentMode, Conversation } from '../../types';

interface LobsterModalsProps {
  activeModal: 'kits' | 'scheduled' | 'search' | 'mcp' | 'add_agent' | 'project' | null;
  onClose: () => void;
  agentMode: AgentMode;
  onSelectAgentMode: (mode: AgentMode) => void;
  convs: Conversation[] | null;
  onOpenConv: (id: string) => void;
  onNewConvWithPrompt: (prompt: string) => void;
  projectName: string;
  onSelectProject: (name: string) => void;
  onAddCustomAgent: (agent: { id: string; name: string; role: string }) => void;
}

export const LobsterModals: React.FC<LobsterModalsProps> = ({
  activeModal,
  onClose,
  agentMode,
  onSelectAgentMode,
  convs,
  onOpenConv,
  onNewConvWithPrompt,
  projectName,
  onSelectProject,
  onAddCustomAgent,
}) => {
  const [searchKw, setSearchKw] = useState('');
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentRole, setNewAgentRole] = useState('专注于文献精读与数学公式推导的学术助理');

  const filtered = convs?.filter((c) => c.title.toLowerCase().includes(searchKw.toLowerCase())) || [];

  return (
    <>
      {/* 1. Kits 科研套件与 Agent 模式选择 */}
      {activeModal === 'kits' && (
        <Modal open={true} onClose={onClose} title="科研套件与 Agent 执行模式 (Kits)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#e2e5f5' }}>
                选择 Agent 认知与编排模式
              </div>
              <div className="grid grid-2" style={{ gap: 8 }}>
                {[
                  { mode: 'plan_execute', title: 'Plan-Execute (规划执行)', desc: '长流程科研任务，自动分步拆解并递进完成' },
                  { mode: 'react', title: 'ReAct (推理动效)', desc: '显式展示思考 (Thought) 与行动 (Action) 环路' },
                  { mode: 'code_act', title: 'CodeAct (代码解释器)', desc: '内置 Node/Python 沙箱，可执行计算与图表生成' },
                  { mode: 'reflection', title: 'Self-Reflection (自我反思)', desc: '双通道 Critique 纠错机制，提高学术严谨性' },
                  { mode: 'multi_agent', title: 'Multi-Agent (多智能体协同)', desc: '模拟多个学术角色分工协作并汇总成果' },
                  { mode: 'chat', title: 'Standard Chat (极速直答)', desc: '轻量单轮或多轮快速问答' },
                ].map((item) => (
                  <button
                    key={item.mode}
                    type="button"
                    style={{
                      background: agentMode === item.mode ? '#1e243d' : '#141622',
                      border: `1px solid ${agentMode === item.mode ? '#6366f1' : '#272a3d'}`,
                      borderRadius: 10,
                      padding: '10px 12px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: '#f0f3fa',
                    }}
                    onClick={() => {
                      onSelectAgentMode(item.mode as AgentMode);
                      onClose();
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{item.title}</div>
                    <div style={{ fontSize: 11.5, color: '#8b91a7', marginTop: 3 }}>{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#e2e5f5' }}>
                快捷学术套件预设
              </div>
              <div className="grid grid-3" style={{ gap: 8 }}>
                {[
                  { name: '组会答辩 PPT 套件', prompt: '帮我针对微表情识别进展生成一份 12 页组会答辩 PPT 结构草案' },
                  { name: '消融实验矩阵套件', prompt: '设计一份微表情 Transformer 模型的超参数消融实验方案矩阵' },
                  { name: '顶刊审稿预检套件', prompt: '启动五角色专家审稿团，对当前论文方法章节进行模拟盲审' },
                ].map((kit) => (
                  <button
                    key={kit.name}
                    type="button"
                    className="card card-pad card-hover"
                    style={{ background: '#161826', borderColor: '#26293c', textAlign: 'left', cursor: 'pointer' }}
                    onClick={() => {
                      onClose();
                      onNewConvWithPrompt(kit.prompt);
                    }}
                  >
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: '#60a5fa' }}>{kit.name}</div>
                    <div className="text-small text-muted mt-1 clamp2" style={{ fontSize: 11.5 }}>{kit.prompt}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 2. Scheduled Tasks 定时任务 */}
      {activeModal === 'scheduled' && (
        <Modal open={true} onClose={onClose} title="定时学术任务 (Scheduled Tasks)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              {
                id: 's1',
                title: '每日 arXiv 微表情 (MER) 最新论文巡检',
                time: '每天 08:00 AM',
                status: '活跃中',
                action: '已匹配 2 篇新文献入库',
              },
              {
                id: 's2',
                title: 'GPU 算力集群训练收敛状态与显存巡检',
                time: '每周一 09:30 AM',
                status: '活跃中',
                action: 'RTX 4090 节点状态正常',
              },
              {
                id: 's3',
                title: '组会待办进度定期提醒与结构化提取',
                time: '每周五 17:00 PM',
                status: '活跃中',
                action: '3 项待办推进中',
              },
            ].map((task) => (
              <div
                key={task.id}
                style={{
                  background: '#151724',
                  border: '1px solid #242738',
                  borderRadius: 10,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: '#f1f3f9' }}>{task.title}</div>
                  <div style={{ fontSize: 12, color: '#888ea4', marginTop: 4 }}>
                    周期：{task.time} · <span style={{ color: '#10b981' }}>{task.action}</span>
                  </div>
                </div>
                <span
                  style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: '#10b981',
                    fontSize: 11,
                    padding: '3px 8px',
                    borderRadius: 12,
                    fontWeight: 600,
                  }}
                >
                  {task.status}
                </span>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* 3. Search Tasks 任务搜索 */}
      {activeModal === 'search' && (
        <Modal open={true} onClose={onClose} title="搜索历史任务与会话 (Search Tasks)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: 10, color: '#747990' }}>
                <Icon name="search" size={16} />
              </span>
              <input
                className="input"
                style={{
                  width: '100%',
                  paddingLeft: 38,
                  background: '#141623',
                  borderColor: '#292d42',
                  color: '#fff',
                }}
                placeholder="输入关键词搜索科研对话、任务记录..."
                value={searchKw}
                onChange={(e) => setSearchKw(e.target.value)}
                autoFocus
              />
            </div>

            <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: '#6e738a', fontSize: 13 }}>
                  未检索到匹配的学术任务
                </div>
              ) : (
                filtered.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      background: '#171926',
                      border: '1px solid #25283c',
                      borderRadius: 8,
                      padding: '10px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background 0.15s',
                    }}
                    onClick={() => {
                      onOpenConv(c.id);
                      onClose();
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#e5e8f5' }}>{c.title}</div>
                    <span style={{ fontSize: 11, color: '#7e849c' }}>查看任务</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* 4. MCP 工具协议管理 */}
      {activeModal === 'mcp' && (
        <Modal open={true} onClose={onClose} title="Model Context Protocol (MCP) 接入状态">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { name: 'arXiv API & Semantic Scholar', desc: '用于多源学术文献实时检索与 Citation 图谱回传', status: '已连接', healthy: true },
              { name: 'GitHub Code Repos MCP', desc: '用于开源算法实现检索、消融基准代码拉取', status: '已连接', healthy: true },
              { name: 'Slurm / Slurm-REST GPU 调度器', desc: '用于监控算力集群节点状态与实验提交', status: '准备就绪', healthy: true },
              { name: 'Zotero Reference Bridge', desc: '用于文献题录与个人 BibTeX 实时同步', status: '待配置密钥', healthy: false },
            ].map((mcp) => (
              <div
                key={mcp.name}
                style={{
                  background: '#151724',
                  border: '1px solid #26293a',
                  borderRadius: 10,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: '#f0f3fa' }}>{mcp.name}</div>
                  <div style={{ fontSize: 11.5, color: '#80869d', marginTop: 3 }}>{mcp.desc}</div>
                </div>
                <span
                  style={{
                    background: mcp.healthy ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: mcp.healthy ? '#10b981' : '#f87171',
                    fontSize: 11,
                    padding: '3px 8px',
                    borderRadius: 12,
                    fontWeight: 600,
                  }}
                >
                  {mcp.status}
                </span>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* 5. 创建自定义智能体 */}
      {activeModal === 'add_agent' && (
        <Modal open={true} onClose={onClose} title="创建自定义科研智能体 (Create Agent)">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#898ea2', display: 'block', marginBottom: 4 }}>
                智能体名称
              </label>
              <input
                className="input"
                style={{ width: '100%', background: '#141624', borderColor: '#272a3d', color: '#fff' }}
                placeholder="例如：公式推导 Agent / 审稿伦理评审员"
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#898ea2', display: 'block', marginBottom: 4 }}>
                专精领域与 System Prompt
              </label>
              <textarea
                className="textarea"
                style={{ width: '100%', background: '#141624', borderColor: '#272a3d', color: '#fff', minHeight: 80 }}
                placeholder="描述该智能体的专属职责与科研风格..."
                value={newAgentRole}
                onChange={(e) => setNewAgentRole(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                取消
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!newAgentName.trim()}
                onClick={() => {
                  onAddCustomAgent({
                    id: `agent_${Date.now()}`,
                    name: newAgentName.trim(),
                    role: newAgentRole,
                  });
                  onClose();
                }}
              >
                确认创建
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 6. 切换项目上下文 */}
      {activeModal === 'project' && (
        <Modal open={true} onClose={onClose} title="切换关联科研项目上下文">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              '微表情识别（MER）研究',
              '多模态情感计算与可解释性 AI',
              '小样本跨域图神经网络表征',
              '通用大模型学术评测基准',
            ].map((p) => (
              <button
                key={p}
                type="button"
                style={{
                  background: projectName === p ? '#1f243b' : '#151724',
                  border: `1px solid ${projectName === p ? '#6366f1' : '#272a3c'}`,
                  borderRadius: 8,
                  padding: '10px 14px',
                  color: '#fff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontWeight: projectName === p ? 700 : 400,
                }}
                onClick={() => {
                  onSelectProject(p);
                  onClose();
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </>
  );
};
