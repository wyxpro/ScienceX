import React, { useEffect, useState } from 'react';
import Icon from '../../components/Icon';
import { useToast } from '../../components/ui';
import { api } from '../../api/client';
import type { ResearchMemoryFact } from '../../types';

interface MemoryDrawerProps {
  open: boolean;
  onClose: () => void;
  convId?: string | null;
  onMemoryChanged?: () => void;
}

export const MemoryDrawer: React.FC<MemoryDrawerProps> = ({
  open,
  onClose,
  convId,
  onMemoryChanged,
}) => {
  const toast = useToast();
  const [facts, setFacts] = useState<ResearchMemoryFact[]>([]);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);

  // 新增事实表单
  const [isAdding, setIsAdding] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('baseline');

  const loadMemories = async () => {
    try {
      setLoading(true);
      const res = await api<{ facts: ResearchMemoryFact[]; rolling_summary: string }>('/chat/memories', {
        params: { conversation_id: convId || undefined },
      });
      setFacts(res.facts || []);
      setSummary(res.rolling_summary || '');
    } catch {
      // 演示环境容错
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadMemories();
    }
  }, [open, convId]);

  const toggleFact = async (id: string, current: boolean) => {
    try {
      await api(`/chat/memories/${id}`, {
        method: 'PATCH',
        body: { active: !current },
      });
      setFacts((prev) => prev.map((f) => (f.id === id ? { ...f, active: !current } : f)));
      toast(`记忆事实已${!current ? '启用' : '挂起'}`);
      onMemoryChanged?.();
    } catch (err: any) {
      toast(err.message || '更新失败', 'err');
    }
  };

  const deleteFact = async (id: string) => {
    try {
      await api(`/chat/memories/${id}`, { method: 'DELETE' });
      setFacts((prev) => prev.filter((f) => f.id !== id));
      toast('科研记忆事实已移除');
      onMemoryChanged?.();
    } catch (err: any) {
      toast(err.message || '删除失败', 'err');
    }
  };

  const handleAddFact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newContent.trim()) {
      return toast('请填写事实名称与内容', 'info');
    }
    try {
      const created = await api<ResearchMemoryFact>('/chat/memories', {
        method: 'POST',
        body: {
          key: newKey,
          content: newContent,
          category: newCategory,
        },
      });
      setFacts((prev) => [created, ...prev]);
      setIsAdding(false);
      setNewKey('');
      setNewContent('');
      toast('新的科研事实已沉淀至长期记忆库');
      onMemoryChanged?.();
    } catch (err: any) {
      toast(err.message || '添加失败', 'err');
    }
  };

  const extractFromConv = async () => {
    try {
      setExtracting(true);
      const res = await api<{ added: ResearchMemoryFact[] }>('/chat/memories/extract', {
        method: 'POST',
        body: { conversation_id: convId || undefined },
      });
      if (res.added && res.added.length > 0) {
        setFacts((prev) => [...res.added, ...prev]);
        toast(`成功从当前对话提炼出 ${res.added.length} 条科研事实！`);
        onMemoryChanged?.();
      } else {
        toast('当前对话暂未发现新的科研事实', 'info');
      }
    } catch (err: any) {
      toast(err.message || '提取失败', 'err');
    } finally {
      setExtracting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(3px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(460px, 92vw)',
          height: '100%',
          background: 'var(--card)',
          boxShadow: '-8px 0 28px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 抽屉头部 */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--panel)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="spark" size={16} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
                课题组三层学术记忆引擎
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                Three-Tier Scholarly Memory · 跨会话持久沉淀
              </div>
            </div>
          </div>

          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* 抽屉主体 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* 第一层：会话短期内存 */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              background: 'var(--panel)',
              border: '1px solid var(--line)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
                【第一层】会话短期内存 (Short-term RAM)
              </span>
              <span style={{ fontSize: 10.5, color: '#10b981', fontWeight: 600 }}>活跃中</span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>
              保留最近 10 轮精准上下文、公式与实验跑分。当切换模型或网络短暂波动时，由前端平滑断点续传。
            </div>
          </div>

          {/* 第二层：课题动态滚动摘要 */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 10,
              background: 'var(--panel)',
              border: '1px solid var(--line)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
                【第二层】阶段动态摘要 (Rolling Summary)
              </span>
              <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>每 5 轮自适应压缩</span>
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--ink)',
                background: 'var(--card)',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid var(--line)',
                lineHeight: 1.5,
              }}
            >
              {summary || '课题当前聚焦微表情识别 AU 先验注入与 LOSO 协议验证，已确立 up9 作为核心基线模型。'}
            </div>
          </div>

          {/* 第三层：长期事实库 */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                  【第三层】长期事实库 (Long-term Facts)
                </span>
                <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 6 }}>
                  ({facts.filter((f) => f.active !== false).length}/{facts.length} 生效中)
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 11.5 }}
                  onClick={() => setIsAdding(!isAdding)}
                >
                  <Icon name="plus" size={13} />
                  新增
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: 11.5 }}
                  onClick={extractFromConv}
                  disabled={extracting}
                >
                  {extracting ? <span className="spinner" /> : <Icon name="spark" size={13} />}
                  智能提取
                </button>
              </div>
            </div>

            {/* 新增表单 */}
            {isAdding && (
              <form
                onSubmit={handleAddFact}
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: 'var(--panel)',
                  border: '1px solid var(--line)',
                  marginBottom: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="事实名称（如：基线模型、评测协议）"
                    style={{ flex: 1, fontSize: 12 }}
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                  />
                  <select
                    className="input"
                    style={{ width: 110, fontSize: 12 }}
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  >
                    <option value="baseline">基线模型</option>
                    <option value="dataset">数据集</option>
                    <option value="protocol">实验协议</option>
                    <option value="target">投稿目标</option>
                    <option value="advisor">导师要求</option>
                  </select>
                </div>
                <textarea
                  className="textarea"
                  placeholder="事实内容（例如：严格使用 3 个随机种子 7/13/42 并在 CASME II 上报告均值±方差）"
                  style={{ height: 60, fontSize: 12 }}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsAdding(false)}>
                    取消
                  </button>
                  <button type="submit" className="btn btn-primary btn-sm">
                    保存记忆
                  </button>
                </div>
              </form>
            )}

            {/* 事实卡片列表 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {facts.map((fact) => {
                const isActive = fact.active !== false;
                return (
                  <div
                    key={fact.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: isActive ? 'var(--card)' : 'var(--panel)',
                      border: isActive ? '1px solid var(--line)' : '1px dashed var(--line)',
                      opacity: isActive ? 1 : 0.6,
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 8,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            fontSize: 10,
                            padding: '1px 5px',
                            borderRadius: 4,
                            background: 'var(--brand-soft)',
                            color: 'var(--brand-strong)',
                            fontWeight: 600,
                          }}
                        >
                          {fact.category || '核心事实'}
                        </span>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)' }}>
                          {fact.key}
                        </span>
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink)', marginTop: 4, lineHeight: 1.4 }}>
                        {fact.content}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: 11, padding: '2px 6px', color: isActive ? '#10b981' : 'var(--muted)' }}
                        onClick={() => toggleFact(fact.id, isActive)}
                        title={isActive ? '点击挂起（暂不注入提示词）' : '点击激活'}
                      >
                        {isActive ? '已激活' : '已挂起'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon btn-sm"
                        style={{ color: 'var(--muted)' }}
                        onClick={() => deleteFact(fact.id)}
                        title="删除该条事实"
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 抽屉底部 */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--line)',
            background: 'var(--panel)',
            fontSize: 11.5,
            color: 'var(--muted)',
            textAlign: 'center',
          }}
        >
          活跃的科研记忆将在每次对话时自动作为 System Prompt 注入，保持课题上下文连贯
        </div>
      </div>
    </div>
  );
};
