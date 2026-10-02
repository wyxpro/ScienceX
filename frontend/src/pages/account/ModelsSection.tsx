import React from 'react';
import Icon from '../../components/Icon';
import { Tag } from '../../components/ui';

interface ModelsSectionProps {
  models: { builtin: any[]; custom: any[] };
  testing: string | null;
  onOpenAdd: () => void;
  onTestModel: (id: string) => void;
  onSelectDelete: (model: any) => void;
}

export const ModelsSection: React.FC<ModelsSectionProps> = ({
  models,
  testing,
  onOpenAdd,
  onTestModel,
  onSelectDelete,
}) => {
  return (
    <div className="anim-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="row-between">
        <span className="text-xs text-muted">
          内置模型（平台托管）与自定义模型（OpenAI 兼容协议接入）
        </span>
        <button
          className="btn btn-primary btn-sm"
          onClick={onOpenAdd}
          aria-label="添加自定义模型"
        >
          <Icon name="plus" size={12} />
          添加自定义模型
        </button>
      </div>

      {[
        { title: '内置模型', items: models.builtin },
        { title: '自定义模型', items: models.custom },
      ].map((grp) => (
        <div key={grp.title} className="card" style={{ overflow: 'hidden' }}>
          <div
            className="text-xs text-muted fw-bold"
            style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)' }}
          >
            {grp.title}（{grp.items.length}）
          </div>
          {grp.items.map((m: any) => (
            <div
              key={m.id}
              className="row-between wrap g-2"
              style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}
            >
              <div className="row g-2" style={{ minWidth: 200 }}>
                <span className="fw-bold text-small">{m.name}</span>
                <Tag color={m.status === 'connected' ? 'green' : 'gray'}>
                  <span className={`dot dot-${m.status === 'connected' ? 'green' : 'gray'}`} />
                  {m.status === 'connected' ? '已连通' : '未连通'}
                </Tag>
                {m.api_key_masked && (
                  <span className="text-xs text-muted mono">{m.api_key_masked}</span>
                )}
              </div>
              <div className="row g-1">
                {!m.builtin && (
                  <>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => onTestModel(m.id)}
                      disabled={testing === m.id}
                      aria-label={`测试模型 ${m.name}`}
                    >
                      {testing === m.id ? (
                        <span className="spinner" />
                      ) : (
                        <Icon name="zap" size={12} />
                      )}
                      测试
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--red)' }}
                      onClick={() => onSelectDelete(m)}
                      aria-label={`删除模型 ${m.name}`}
                    >
                      <Icon name="trash" size={12} />
                      删除
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
