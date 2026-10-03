import React, { useState } from 'react';
import Icon from './Icon';
import { useProject } from '../stores/project';
import { useToast } from './ui';

interface ProjectSpaceModalProps {
  open: boolean;
  onClose: () => void;
}

export function ProjectSpaceModal({ open, onClose }: ProjectSpaceModalProps) {
  const toast = useToast();
  const { projects, currentProject, selectProject, createProject, deleteProject } = useProject();

  const [isCreating, setIsCreating] = useState(false);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('research');
  const [formDesc, setFormDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!open) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      return toast('请输入课题项目名称', 'info');
    }
    setSubmitting(true);
    try {
      const p = await createProject({
        name: formName.trim(),
        type: formType,
        description: formDesc.trim(),
      });
      toast(`课题项目《${p.name || formName}》创建成功并已激活`, 'ok');
      setFormName('');
      setFormDesc('');
      setIsCreating(false);
    } catch (err: any) {
      toast(err?.message || '创建项目失败', 'err');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (projects.length <= 1) {
      return toast('至少保留一个课题空间项目', 'info');
    }
    if (!window.confirm(`确定要彻底删除课题项目《${name}》吗？其关联的实验数据和研读记录将被清理。`)) {
      return;
    }
    setDeletingId(id);
    try {
      await deleteProject(id);
      toast(`已删除课题项目《${name}》`, 'ok');
    } catch (err: any) {
      toast(err?.message || '删除项目失败', 'err');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div
      className="modal-scrim"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal anim-in"
        style={{
          width: '92%',
          maxWidth: 620,
          background: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '85vh',
        }}
      >
        {/* 弹窗顶栏 */}
        <div
          className="row-between items-center"
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid #e2e8f0',
            background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
          }}
        >
          <div className="row g-2 items-center">
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="layers" size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                课题空间管理
              </h3>
              <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>
                选择、新建或管理当前研读与实验的课题空间
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ borderRadius: 8 }}>
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* 弹窗内容区 */}
        <div style={{ padding: '18px 22px', overflowY: 'auto', flex: 1 }}>
          {/* 操作栏：当前状态与新建按钮 */}
          <div className="row-between items-center mb-3">
            <div style={{ fontSize: 12.5, color: '#334155', fontWeight: 600 }}>
              全部课题项目（共 {projects.length} 项）
            </div>
            {!isCreating && (
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => setIsCreating(true)}
                style={{ padding: '5px 12px', fontSize: 12 }}
              >
                <Icon name="check" size={12} /> + 新建课题空间
              </button>
            )}
          </div>

          {/* 新建项目表单 */}
          {isCreating && (
            <form
              onSubmit={handleCreate}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: 12,
                padding: '14px 16px',
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>
                新建课题空间项目
              </div>
              <div className="col g-2">
                <div>
                  <label className="field-label" style={{ fontSize: 12 }}>项目名称 *</label>
                  <input
                    className="input"
                    placeholder="如：扩散模型在小样本医学影像上的微调研究…"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    style={{ fontSize: 13, background: '#ffffff' }}
                    autoFocus
                  />
                </div>
                <div className="row g-2">
                  <div style={{ flex: 1 }}>
                    <label className="field-label" style={{ fontSize: 12 }}>课题类型</label>
                    <select
                      className="select"
                      value={formType}
                      onChange={(e) => setFormType(e.target.value)}
                      style={{ fontSize: 12.5, background: '#ffffff' }}
                    >
                      <option value="research">科研论文攻坚 (Research)</option>
                      <option value="survey">领域前沿综述 (Survey)</option>
                      <option value="tool">科研工具开源 (Tool/Code)</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="field-label" style={{ fontSize: 12 }}>研究目标描述（可选）</label>
                  <textarea
                    className="textarea"
                    rows={2}
                    placeholder="简述该课题的核心痛点、目标投稿期刊与创新假设…"
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    style={{ fontSize: 12.5, background: '#ffffff', minHeight: 60 }}
                  />
                </div>
                <div className="row justify-end g-2 mt-1">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setIsCreating(false);
                      setFormName('');
                      setFormDesc('');
                    }}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={submitting || !formName.trim()}
                  >
                    {submitting ? '创建中…' : '立即创建并激活'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* 项目卡片列表 */}
          <div className="col g-2">
            {projects.map((p) => {
              const isSelected = currentProject?.id === p.id;
              const isDeleting = deletingId === p.id;
              const typeLabel =
                p.type === 'survey' ? '综述' : p.type === 'tool' ? '工具' : '研究';

              return (
                <div
                  key={p.id}
                  style={{
                    borderRadius: 12,
                    border: isSelected ? '1.5px solid #10b981' : '1px solid #e2e8f0',
                    background: isSelected ? '#f0fdf4' : '#ffffff',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    boxShadow: isSelected ? '0 3px 12px rgba(16, 185, 129, 0.12)' : 'none',
                  }}
                  onClick={() => {
                    selectProject(p);
                    toast(`已切换当前课题为《${p.name || p.title}》`, 'ok');
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="row g-2 items-center">
                      <span
                        style={{
                          fontSize: 13.5,
                          fontWeight: 700,
                          color: isSelected ? '#065f46' : '#0f172a',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {p.name || p.title}
                      </span>
                      <span
                        className="tag"
                        style={{
                          fontSize: 10.5,
                          padding: '1px 6px',
                          background: isSelected ? '#bbf7d0' : '#f1f5f9',
                          color: isSelected ? '#166534' : '#475569',
                          fontWeight: 600,
                        }}
                      >
                        {typeLabel}
                      </span>
                      {isSelected && (
                        <span
                          className="tag tag-green"
                          style={{ fontSize: 10, padding: '1px 7px', fontWeight: 700 }}
                        >
                          当前激活
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: '#64748b',
                        marginTop: 4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {p.description || p.field || '持续推进文献阅读、消融实验与论文写作'}
                    </div>
                  </div>

                  <div className="row g-2 items-center" style={{ flexShrink: 0 }}>
                    {!isSelected && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ fontSize: 12, padding: '4px 10px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          selectProject(p);
                          toast(`已切换当前课题为《${p.name || p.title}》`, 'ok');
                        }}
                      >
                        选择此课题
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon btn-sm"
                      title="删除该课题项目"
                      style={{ color: '#ef4444', padding: 5 }}
                      disabled={isDeleting}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(p.id, p.name || p.title || '未命名课题');
                      }}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 弹窗底栏 */}
        <div
          className="row-between items-center"
          style={{
            padding: '12px 22px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
          }}
        >
          <div style={{ fontSize: 11.5, color: '#64748b' }}>
            当前课题空间：<strong style={{ color: '#0f172a' }}>{currentProject?.name || currentProject?.title || '未指定'}</strong>
          </div>
          <button className="btn btn-primary btn-sm" onClick={onClose} style={{ padding: '6px 18px' }}>
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
