/* 课题组管理 —— 从「课题空间」迁移：成员邀请 / 移除 · 协作空间 */
import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import Icon from '../../components/Icon';
import { Confirm, Empty, Modal, useToast } from '../../components/ui';
import type { TeamItem } from '../../types';

export const TeamSection: React.FC = () => {
  const toast = useToast();
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [loading, setLoading] = useState(true);

  /* 邀请 / 移除 */
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteTeam, setInviteTeam] = useState<TeamItem | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [removeTarget, setRemoveTarget] = useState<{ team: TeamItem; uid: string; name: string } | null>(null);

  const loadTeams = useCallback(async () => {
    setLoading(true);
    try {
      const t = await api<{ items: TeamItem[] } | TeamItem[]>('/teams');
      setTeams((t as any)?.items || (Array.isArray(t) ? t : []));
    } catch (err: any) {
      toast(err.message || '加载课题组数据失败', 'err');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

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

  return (
    <div className="anim-in" style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 720 }}>
      <div className="card" style={{ borderRadius: 16, border: '1px solid var(--line)', background: 'var(--surface)', overflow: 'hidden', boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.04)' }}>
        <div className="row-between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', background: 'rgba(0, 0, 0, 0.01)' }}>
          <span className="card-title" style={{ fontSize: 15, fontWeight: 700 }}><Icon name="users" size={16} /> 课题组</span>
          <span className="text-xs text-muted" style={{ fontWeight: 500 }}>{teams.length} 个课题组</span>
        </div>
        {loading ? (
          <div style={{ padding: 32 }} className="text-center text-muted text-xs">加载中…</div>
        ) : teams.length === 0 ? (
          <div style={{ padding: 32 }}><Empty icon="users" text="暂未加入任何课题组" /></div>
        ) : teams.map((t) => (
          <div key={t.id} style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
            <div className="row-between wrap g-2 mb-3">
              <div className="row g-2" style={{ alignItems: 'center' }}>
                {/* 头像堆叠 */}
                <div className="row" style={{ paddingLeft: 6 }}>
                  {(t.members || []).slice(0, 4).map((m: any, mi: number) => (
                    <span
                      key={m.user_id}
                      className="avatar"
                      title={m.name}
                      style={{
                        width: 28,
                        height: 28,
                        fontSize: 11.5,
                        borderWidth: 0,
                        marginLeft: -6,
                        zIndex: 10 - mi,
                        outline: '2px solid var(--surface)',
                        background: ['#10b981', '#6366f1', '#0ea5e9', '#f59e0b'][mi % 4],
                      }}
                    >
                      {m.name?.[0] || '员'}
                    </span>
                  ))}
                  {(t.members?.length ?? 0) > 4 && (
                    <span className="avatar" style={{ width: 28, height: 28, fontSize: 10, marginLeft: -6, background: 'var(--bg-deep)', color: 'var(--muted)', borderWidth: 0, outline: '2px solid var(--surface)' }}>
                      +{(t.members?.length ?? 0) - 4}
                    </span>
                  )}
                </div>
                <div>
                  <div className="fw-bold" style={{ fontSize: 14, color: 'var(--ink)' }}>{t.name}</div>
                  <div className="text-xs text-muted" style={{ marginTop: 2 }}>{t.members?.length ?? 0} 名成员 · 协作空间已互通</div>
                </div>
              </div>
              <button className="btn btn-soft btn-sm" style={{ borderRadius: 8, padding: '5px 12px' }} onClick={() => { setInviteTeam(t); setInviteOpen(true); }} aria-label={`邀请成员加入课题组 ${t.name}`}>
                <Icon name="plus" size={12} /> 邀请
              </button>
            </div>

            <div className="row g-1 wrap">
              {t.members?.map((m: any) => (
                <span key={m.user_id} className="tag tag-outline" style={{ cursor: 'default', gap: 6, borderRadius: 8, padding: '4px 10px' }}>
                  <span style={{ fontWeight: 500 }}>{m.name}</span>
                  <span className="text-xs" style={{ color: m.role === 'admin' ? 'var(--brand-strong)' : 'var(--muted)' }}>
                    {m.role === 'admin' ? '管理员' : m.role === 'guest' ? '访客' : '成员'}
                  </span>
                  {m.role !== 'admin' && (
                    <span
                      style={{ display: 'flex', alignItems: 'center', color: 'var(--muted)', cursor: 'pointer', marginLeft: 2 }}
                      onClick={() => setRemoveTarget({ team: t, uid: m.user_id, name: m.name })}
                      title="移除成员"
                      aria-label={`移除成员 ${m.name}`}
                    >
                      <Icon name="x" size={11} />
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

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
};
