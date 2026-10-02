import React from 'react';
import Icon from '../../components/Icon';

interface ProfileSectionProps {
  form: {
    name?: string;
    title?: string;
    research_tags?: string[];
  };
  setForm: React.Dispatch<React.SetStateAction<any>>;
  tagInput: string;
  setTagInput: (val: string) => void;
  saving: boolean;
  onSave: () => void;
  onAddTag: () => void;
}

export const ProfileSection: React.FC<ProfileSectionProps> = ({
  form,
  setForm,
  tagInput,
  setTagInput,
  saving,
  onSave,
  onAddTag,
}) => {
  return (
    <div className="card card-pad anim-in" style={{ maxWidth: 640 }}>
      <label className="field-label" htmlFor="user-name-input">昵称</label>
      <input
        id="user-name-input"
        className="input mb-2"
        value={form.name || ''}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="科研工作者姓名"
      />

      <label className="field-label" htmlFor="user-title-input">身份 / 头衔</label>
      <input
        id="user-title-input"
        className="input mb-2"
        value={form.title || ''}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        placeholder="例：博士生 / 副研究员"
      />

      <div className="field-label">研究方向标签</div>
      <div className="row g-1 wrap mb-1">
        {(form.research_tags || []).map((t: string) => (
          <span
            key={t}
            className="tag tag-green"
            style={{ cursor: 'pointer' }}
            onClick={() =>
              setForm({
                ...form,
                research_tags: (form.research_tags || []).filter((x: string) => x !== t),
              })
            }
            title="点击移除"
            aria-label={`移除标签 ${t}`}
          >
            {t} <Icon name="x" size={10} />
          </span>
        ))}
      </div>

      <div className="row g-1 mb-3">
        <input
          className="input grow"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAddTag()}
          placeholder="输入标签后回车，例：微表情识别"
          aria-label="新增研究方向标签"
        />
        <button
          className="btn btn-soft"
          onClick={onAddTag}
          aria-label="添加标签"
          type="button"
        >
          <Icon name="plus" size={13} />
        </button>
      </div>

      <button
        className="btn btn-primary"
        onClick={onSave}
        disabled={saving}
        type="button"
        aria-label="保存资料"
      >
        {saving ? <span className="spinner" /> : <Icon name="check" size={14} />} 保存资料
      </button>
    </div>
  );
};
