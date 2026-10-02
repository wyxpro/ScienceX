/* 我的项目 —— REQ-PRJ-01：项目空间（进度/资产）· 课题组管理 */
import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import Icon from '../components/Icon';
import { Confirm, Empty, Modal, Progress, Skeleton, Tag, useToast } from '../components/ui';
import type { ProjectItem, TeamItem } from '../types';

const STAGE_LABEL: Record<string, string> = {
  topic: '选题',
  literature: '文献',
  experiment: '实验',
  analysis: '分析',
  writing: '写作',
  submission: '投稿',
};

const TYPE_COLOR: Record<string, 'green' | 'blue' | 'amber'> = {
  research: 'green',
  survey: 'blue',
  tool: 'amber',
};

export default function Projects() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [detail, setDetail] = useState<any>(null);

  /* 新建项目 */
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'research', description: '' });
  const [creating, setCreating] = useState(false);

  /* 课题组 */
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteTeam, setInviteTeam] = useState<TeamItem | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [removeTarget, setRemoveTarget] = useState<{ team: TeamItem; uid: string; name: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, t] = await Promise.all([
        api<{ items: ProjectItem[] } | ProjectItem[]>('/projects'),
        api<{ items: TeamItem[] } | TeamItem[]>('/teams'),
      ]);
      setProjects((p as any)?.items || (Array.isArray(p) ? p : []));
      setTeams((t as any)?.items || (Array.isArray(t) ? t : []));
    } catch (err: any) {
      setError(err.message || '加载项目与课题组数据失败');
      toast(err.message || '加载项目数据失败', 'err');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openDetail = async (id: string) => {
    try {
      const r = await api<any>(`/projects/${id}`);
      setDetail(r);
    } catch (err: any) {
      toast(err.message || '获取项目详情失败', 'err');
    }
  };

  const create = async () => {
    if (!form.name.trim()) return toast('请输入项目名称', 'info');
    setCreating(true);
    try {
      const p = await api<ProjectItem>('/projects', { method: 'POST', body: form });
      setProjects((xs) => [p, ...xs]);
      setCreateOpen(false);
      setForm({ name: '', type: 'research', description: '' });
      toast('项目已创建');
    } catch (err: any) {
      toast(err.message || '创建项目失败', 'err');
    } finally {
      setCreating(false);
    }
  };

  const invite = async () => {
    if (!inviteTeam) return;
    if (!inviteEmail.includes('@')) return toast('请输入有效邮箱', 'info');
    try {
      const m = await api<any>(`/teams/${inviteTeam.id}/members`, {
        method: 'POST',
        body: { email: inviteEmail, role: inviteRole },
      });
      setTeams((xs) =>
        xs.map((t) => (t.id === inviteTeam.id ? { ...t, members: [...t.members, m] } : t))
      );
      setInviteOpen(false);
      setInviteEmail('');
      toast(`已邀请 ${inviteEmail}`);
    } catch (err: any) {
      toast(err.message || '邀请成员失败', 'err');
    }
  };

  const removeMember = async () => {
    if (!removeTarget) return;
    try {
      await api(`/teams/${removeTarget.team.id}/members/${removeTarget.uid}`, { method: 'DELETE' });
      setTeams((xs) =>
        xs.map((t) =>
          t.id === removeTarget.team.id
            ? { ...t, members: t.members.filter((m: any) => m.user_id !== removeTarget.uid) }
            : t
        )
      );
      toast('成员已移除');
    } catch (err: any) {
      toast(err.message || '移除成员失败', 'err');
    } finally {
      setRemoveTarget(null);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <div className="card card-pad">
          <Skeleton lines={6} h={40} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="card card-pad text-center" style={{ padding: 40 }}>
          <div style={{ color: 'var(--red)', marginBottom: 12 }}>
            <Icon name="alert" size={32} />
          </div>
          <div className="fw-bold mb-2">加载失败</div>
          <div className="text-small text-muted mb-3">{error}</div>
          <button className="btn btn-primary btn-sm" onClick={loadData}>
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ gap: 14 }}>
      {/* ===== 项目列表 ===== */}
      <div className="card card-pad row-between wrap g-2" style={{ flex: 'none' }}>
        <div className="grow" style={{ minWidth: 200 }}>
          <div className="fw-bold" style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="layers" size={15} /> 项目空间
          </div>
          <p className="text-xs text-muted" style={{ marginTop: 4 }}>
            点击项目查看六阶段进度与全部研究资产（文献 / 实验 / 图表 / 稿件）。
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setCreateOpen(true)}
          aria-label="新建项目"
        >
          <Icon name="plus" size={14} />
          新建项目
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="card card-pad">
          <Empty icon="layers" text="暂无项目，点击右上角新建首个科研项目" />
        </div>
      ) : (
        <div
          className="grid"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', flex: 'none' }}
        >
          {projects.map((p, i) => {
            const stages = Object.entries(p.progress || {});
            const overall = Math.round(
              stages.reduce((s: number, [, v]: any) => s + Number(v || 0), 0) / (stages.length || 1)
            );
            return (
              <div
                key={p.id}
                className="card card-pad card-hover anim-in"
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  animationDelay: `${i * 50}ms`,
                }}
                onClick={() => openDetail(p.id)}
                aria-label={`查看项目 ${p.name}`}
              >
                <div className="row-between">
                  <div className="fw-bold text-small text-serif ellipsis" style={{ minWidth: 0 }}>
                    {p.name}
                  </div>
                  <Tag color={(p.type && TYPE_COLOR[p.type]) || 'gray'}>
                    {p.type === 'research' ? '研究' : p.type === 'survey' ? '综述' : '工具'}
                  </Tag>
                </div>
                <p className="text-xs clamp2" style={{ color: 'var(--muted)' }}>
                  {p.description || '暂无描述'}
                </p>
                <div>
                  <div className="row-between text-xs mb-1">
                    <span className="text-muted">总进度</span>
                    <span className="mono fw-bold">{overall}%</span>
                  </div>
                  <Progress value={overall} />
                </div>
                <div className="row g-1 wrap text-xs text-muted" style={{ marginTop: 'auto' }}>
                  <span className="tag tag-gray">
                    <Icon name="book" size={11} />
                    {p.stats?.documents ?? 0} 文献
                  </span>
                  <span className="tag tag-gray">
                    <Icon name="flask" size={11} />
                    {p.stats?.experiments ?? 0} 实验
                  </span>
                  <span className="tag tag-gray">
                    <Icon name="chart" size={11} />
                    {p.stats?.charts ?? 0} 图表
                  </span>
                  <span className="tag tag-gray">
                    <Icon name="doc" size={11} />
                    {p.stats?.manuscripts ?? 0} 稿件
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== 课题组 ===== */}
      <div className="card" style={{ flex: 'none', overflow: 'hidden' }}>
        <div
          className="row-between"
          style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}
        >
          <span
            className="fw-bold"
            style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Icon name="users" size={15} /> 课题组
          </span>
        </div>
        {teams.length === 0 ? (
          <div style={{ padding: 20 }}>
            <Empty icon="users" text="暂未加入任何课题组" />
          </div>
        ) : (
          teams.map((t) => (
            <div key={t.id} style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
              <div className="row-between wrap g-2 mb-2">
                <div className="row g-2">
                  <span className="fw-bold text-small">{t.name}</span>
                  <Tag color="gray">{t.members?.length ?? 0} 名成员</Tag>
                </div>
                <button
                  className="btn btn-soft btn-sm"
                  onClick={() => {
                    setInviteTeam(t);
                    setInviteOpen(true);
                  }}
                  aria-label={`邀请成员加入课题组 ${t.name}`}
                >
                  <Icon name="plus" size={12} />
                  邀请成员
                </button>
              </div>
              <div className="row g-2 wrap">
                {t.members?.map((m: any) => (
                  <div key={m.user_id} className="tag tag-outline" style={{ cursor: 'default', gap: 7 }}>
                    <span
                      className="avatar"
                      style={{
                        width: 20,
                        height: 20,
                        fontSize: 9.5,
                        borderWidth: 0,
                        flex: 'none',
                      }}
                    >
                      {m.name?.[0] || '员'}
                    </span>
                    {m.name}
                    <span className="text-xs text-muted">
                      {m.role === 'admin' ? '管理员' : m.role === 'guest' ? '访客' : '成员'}
                    </span>
                    {m.role !== 'admin' && (
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          color: 'var(--muted)',
                          cursor: 'pointer',
                        }}
                        onClick={() =>
                          setRemoveTarget({ team: t, uid: m.user_id, name: m.name })
                        }
                        title="移除成员"
                        aria-label={`移除成员 ${m.name}`}
                      >
                        <Icon name="x" size={11} />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ===== 项目详情模态 ===== */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={<><Icon name="layers" size={15} /> {detail?.name}</>}
        width="lg"
      >
        {detail && (
          <div style={{ maxHeight: '62vh', overflowY: 'auto', paddingRight: 4 }}>
            <p className="text-xs text-muted mb-3">{detail.description}</p>
            {/* 六阶段进度 */}
            <div className="text-xs text-muted mb-1 fw-bold">研究进度</div>
            <div
              className="grid mb-3"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}
            >
              {Object.entries(STAGE_LABEL).map(([k, label]) => (
                <div key={k} className="card card-pad" style={{ padding: 12 }}>
                  <div className="row-between text-xs mb-1">
                    <span>{label}</span>
                    <span className="mono">{detail.progress?.[k] ?? 0}%</span>
                  </div>
                  <Progress
                    value={detail.progress?.[k] ?? 0}
                    amber={(detail.progress?.[k] ?? 0) < 50}
                  />
                </div>
              ))}
            </div>
            {/* 资产清单 */}
            {(
              [
                ['documents', '文献库', 'book'],
                ['experiments', '实验记录', 'flask'],
                ['charts', '图表', 'chart'],
                ['manuscripts', '稿件', 'doc'],
              ] as const
            ).map(([key, label, ic]) => (
              <div key={key} className="mb-3">
                <div className="text-xs text-muted mb-1 fw-bold">
                  {label}（{detail[key]?.length ?? 0}）
                </div>
                {!detail[key] || detail[key].length === 0 ? (
                  <div className="text-xs text-muted" style={{ padding: '6px 0' }}>
                    暂无
                  </div>
                ) : (
                  detail[key].slice(0, 5).map((it: any) => (
                    <div
                      key={it.id}
                      className="row-between text-small card-hover"
                      style={{ padding: '6px 4px' }}
                    >
                      <span className="ellipsis" style={{ minWidth: 0 }}>
                        <Icon name={ic as any} size={12} /> {it.title || it.name}
                      </span>
                      <span className="text-xs text-muted" style={{ flex: 'none' }}>
                        {it.created_at?.slice(0, 10)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* ===== 新建项目模态 ===== */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={<><Icon name="plus" size={15} /> 新建项目</>}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setCreateOpen(false)}>
              取消
            </button>
            <button className="btn btn-primary" onClick={create} disabled={creating}>
              {creating ? <span className="spinner" /> : '创建'}
            </button>
          </>
        }
      >
        <div className="field-label">项目名称 *</div>
        <input
          className="input mb-2"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="例：SAMM 跨库泛化研究"
          aria-label="项目名称"
        />
        <div className="field-label">项目类型</div>
        <div className="row g-1 mb-2">
          {[
            ['research', '研究项目'],
            ['survey', '综述项目'],
            ['tool', '工具开发'],
          ].map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={`tag ${form.type === k ? 'tag-green' : 'tag-outline'}`}
              style={{ cursor: 'pointer', border: 'none' }}
              onClick={() => setForm({ ...form, type: k })}
              aria-label={`选择项目类型: ${label}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="field-label">项目描述</div>
        <textarea
          className="textarea"
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="一句话说明研究目标…"
          aria-label="项目描述"
        />
      </Modal>

      {/* ===== 邀请成员模态 ===== */}
      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title={<><Icon name="users" size={15} /> 邀请成员加入 · {inviteTeam?.name}</>}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setInviteOpen(false)}>
              取消
            </button>
            <button className="btn btn-primary" onClick={invite}>
              发送邀请
            </button>
          </>
        }
      >
        <div className="field-label">成员邮箱 *</div>
        <input
          className="input mb-2"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          placeholder="member@lab.edu.cn"
          aria-label="受邀成员邮箱"
        />
        <div className="field-label">角色</div>
        <div className="row g-1">
          {[
            ['member', '成员（可读写）'],
            ['guest', '访客（只读）'],
          ].map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={`tag ${inviteRole === k ? 'tag-green' : 'tag-outline'}`}
              style={{ cursor: 'pointer', border: 'none' }}
              onClick={() => setInviteRole(k)}
              aria-label={`选择角色: ${label}`}
            >
              {label}
            </button>
          ))}
        </div>
      </Modal>

      <Confirm
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={removeMember}
        title="移除成员"
        text={`确定将「${removeTarget?.name}」移出课题组？移除后其将失去项目访问权限。`}
        danger
      />
    </div>
  );
}
