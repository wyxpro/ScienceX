/* 我的项目 —— REQ-PRJ-01：项目空间（进度/资产）· 课题组管理 · RAG 知识库 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import Icon, { type IconName } from '../components/Icon';
import { Confirm, Empty, Modal, Progress, Skeleton, Tag, useToast } from '../components/ui';
import type { ProjectItem, TeamItem } from '../types';

const STAGE_META: [string, string, IconName][] = [
  ['topic', '选题', 'bulb'],
  ['literature', '文献', 'book'],
  ['experiment', '实验', 'flask'],
  ['analysis', '分析', 'chart'],
  ['writing', '写作', 'pen'],
  ['submission', '投稿', 'mail'],
];

const TYPE_META: Record<string, { label: string; color: 'green' | 'blue' | 'amber'; band: string }> = {
  research: { label: '研究', color: 'green', band: 'var(--brand)' },
  survey: { label: '综述', color: 'blue', band: 'var(--blue-safe)' },
  tool: { label: '工具', color: 'amber', band: 'var(--accent)' },
};

interface KbItem { id: string; name: string; scope: string; doc_count: number; chunk_count: number; size_mb: number; sample?: number }

const overallOf = (p: ProjectItem) => {
  const stages = Object.values((p.progress || {}) as Record<string, number>);
  return Math.round(stages.reduce((s, v) => s + Number(v || 0), 0) / (stages.length || 1));
};

export default function Projects() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [kbs, setKbs] = useState<KbItem[]>([]);
  const [detail, setDetail] = useState<any>(null);

  /* 搜索与筛选 */
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'research' | 'survey' | 'tool'>('all');

  /* 知识库 RAG 问答 */
  const [kbOpen, setKbOpen] = useState<string | null>(null);
  const [kbQuery, setKbQuery] = useState<Record<string, string>>({});
  const [kbAsking, setKbAsking] = useState<string | null>(null);
  const [kbHits, setKbHits] = useState<Record<string, any[]>>({});

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
      const [p, t, k] = await Promise.all([
        api<{ items: ProjectItem[] } | ProjectItem[]>('/projects'),
        api<{ items: TeamItem[] } | TeamItem[]>('/teams'),
        api<{ items: KbItem[] } | KbItem[]>('/knowledge-bases').catch(() => ({ items: [] })),
      ]);
      setProjects((p as any)?.items || (Array.isArray(p) ? p : []));
      setTeams((t as any)?.items || (Array.isArray(t) ? t : []));
      setKbs((k as any)?.items || (Array.isArray(k) ? k : []));
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

  const visible = useMemo(() => projects.filter((p) => {
    if (filter !== 'all' && p.type !== filter) return false;
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return `${p.name} ${p.description || ''}`.toLowerCase().includes(q);
  }), [projects, filter, query]);

  const totals = useMemo(() => ({
    docs: projects.reduce((s, p) => s + (p.stats?.documents ?? 0), 0),
    exps: projects.reduce((s, p) => s + (p.stats?.experiments ?? 0), 0),
    charts: projects.reduce((s, p) => s + (p.stats?.charts ?? 0), 0),
    mss: projects.reduce((s, p) => s + (p.stats?.manuscripts ?? 0), 0),
    members: new Set(teams.flatMap((t) => (t.members || []).map((m: any) => m.user_id))).size,
  }), [projects, teams]);

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

  /* 知识库语义检索 */
  const askKb = async (kb: KbItem) => {
    const q = (kbQuery[kb.id] || '').trim();
    if (!q) return toast('请输入检索问题', 'info');
    setKbAsking(kb.id);
    try {
      const r = await api<{ items: any[] }>(`/knowledge-bases/${kb.id}/query`, { method: 'POST', body: { q, top_k: 3 } });
      setKbHits((x) => ({ ...x, [kb.id]: r.items || [] }));
      if (!r.items?.length) toast('未命中相关片段，换个关键词试试', 'info');
    } catch (err: any) {
      toast(err.message || '知识库检索失败', 'err');
    } finally {
      setKbAsking(null);
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
    <div className="page" style={{ gap: 16 }}>
      {/* ===== 概览统计条 ===== */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', flex: 'none' }}>
        {[
          { label: '科研项目', value: projects.length, icon: 'layers', hint: `平均进度 ${Math.round(projects.reduce((s, p) => s + overallOf(p), 0) / (projects.length || 1))}%` },
          { label: '文献资产', value: totals.docs, icon: 'book', hint: `${totals.mss} 篇稿件` },
          { label: '实验 / 图表', value: `${totals.exps} / ${totals.charts}`, icon: 'flask', hint: '含消融与 SOTA 对标' },
          { label: '课题组成员', value: totals.members, icon: 'users', hint: `${teams.length} 个课题组` },
          { label: 'RAG 知识库', value: kbs.length, icon: 'db', hint: '私有语义索引' },
        ].map((s, i) => (
          <div key={s.label} className="card card-pad anim-in" style={{ padding: '14px 16px', display: 'flex', gap: 11, alignItems: 'center', animationDelay: `${i * 50}ms` }}>
            <span style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--brand-soft)', color: 'var(--brand-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
              <Icon name={s.icon as IconName} size={16} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="text-xs text-muted">{s.label}</div>
              <div className="mono fw-bold" style={{ fontSize: 19, lineHeight: 1.2 }}>{s.value}</div>
              <div className="text-xs text-muted ellipsis" style={{ fontSize: 10.5 }}>{s.hint}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ===== 项目空间工具栏 ===== */}
      <div className="card card-pad row-between wrap g-2" style={{ flex: 'none' }}>
        <div className="row g-2 wrap grow" style={{ minWidth: 0 }}>
          <div style={{ position: 'relative', width: 260, maxWidth: '100%' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', display: 'flex' }}>
              <Icon name="search" size={14} />
            </span>
            <input className="input" style={{ paddingLeft: 32 }} placeholder="搜索项目名称 / 描述…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="搜索项目" />
          </div>
          {([['all', '全部'], ['research', '研究'], ['survey', '综述'], ['tool', '工具']] as const).map(([k, label]) => (
            <button key={k} className={`tag ${filter === k ? 'tag-green' : 'tag-outline'}`} style={{ cursor: 'pointer', border: 'none' }}
              onClick={() => setFilter(k)} aria-label={`筛选${label}项目`}>{label}</button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setCreateOpen(true)} aria-label="新建项目">
          <Icon name="plus" size={14} /> 新建项目
        </button>
      </div>

      {/* ===== 项目卡片 ===== */}
      {visible.length === 0 ? (
        <div className="card card-pad">
          <Empty icon="layers" text={query || filter !== 'all' ? '没有匹配的项目，试试调整搜索或筛选' : '暂无项目，点击右上角新建首个科研项目'} />
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', flex: 'none' }}>
          {visible.map((p, i) => {
            const overall = overallOf(p);
            const tm = TYPE_META[p.type || 'research'] || TYPE_META.research;
            const ringC = overall >= 70 ? 'var(--brand)' : overall >= 40 ? 'var(--gold)' : 'var(--accent)';
            return (
              <div key={p.id} className="card card-hover anim-in" onClick={() => openDetail(p.id)}
                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', overflow: 'hidden', animationDelay: `${i * 50}ms` }}>
                <div style={{ height: 4, background: tm.band, flex: 'none' }} />
                <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  <div className="row-between" style={{ alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="fw-bold text-serif ellipsis" style={{ fontSize: 14.5 }}>{p.name}</div>
                      <p className="text-xs clamp2" style={{ color: 'var(--muted)', marginTop: 3, lineHeight: 1.6 }}>{p.description || '暂无描述'}</p>
                    </div>
                    {/* 总进度环 */}
                    <div style={{ position: 'relative', width: 52, height: 52, flex: 'none', marginLeft: 10 }}>
                      <svg width={52} height={52}>
                        <circle cx={26} cy={26} r={21} fill="none" stroke="var(--bg-deep)" strokeWidth={5} />
                        <circle cx={26} cy={26} r={21} fill="none" stroke={ringC} strokeWidth={5} strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 21} strokeDashoffset={2 * Math.PI * 21 * (1 - overall / 100)}
                          transform="rotate(-90 26 26)" />
                      </svg>
                      <span className="mono" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12.5, fontWeight: 700, color: ringC }}>{overall}%</span>
                    </div>
                  </div>

                  {/* 六阶段迷你进度 */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    {STAGE_META.map(([k, label]) => {
                      const v = Number((p.progress as any)?.[k] ?? 0);
                      return (
                        <div key={k} style={{ flex: 1, textAlign: 'center' }} title={`${label} ${v}%`}>
                          <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-deep)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${v}%`, borderRadius: 2, background: v >= 100 ? 'var(--brand)' : v > 0 ? 'var(--gold)' : 'transparent', transition: 'width .6s var(--ease)' }} />
                          </div>
                          <div className="text-xs" style={{ fontSize: 9.5, color: v > 0 ? 'var(--ink-2)' : 'var(--muted)', marginTop: 3 }}>{label}</div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="row-between wrap g-1" style={{ marginTop: 'auto' }}>
                    <div className="row g-1 wrap">
                      <span className="tag tag-gray"><Icon name="book" size={11} />{p.stats?.documents ?? 0}</span>
                      <span className="tag tag-gray"><Icon name="flask" size={11} />{p.stats?.experiments ?? 0}</span>
                      <span className="tag tag-gray"><Icon name="chart" size={11} />{p.stats?.charts ?? 0}</span>
                      <span className="tag tag-gray"><Icon name="doc" size={11} />{p.stats?.manuscripts ?? 0}</span>
                    </div>
                    <div className="row g-1">
                      <Tag color={tm.color}>{tm.label}</Tag>
                      <span className="row" style={{ color: 'var(--muted)' }}>详情<Icon name="chevronRight" size={13} /></span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===== 课题组 + RAG 知识库 ===== */}
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', alignItems: 'start', flex: 'none' }}>
        {/* 课题组 */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="row-between" style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
            <span className="card-title"><Icon name="users" size={15} /> 课题组</span>
            <span className="text-xs text-muted">{teams.length} 个</span>
          </div>
          {teams.length === 0 ? (
            <div style={{ padding: 20 }}><Empty icon="users" text="暂未加入任何课题组" /></div>
          ) : teams.map((t) => (
            <div key={t.id} style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
              <div className="row-between wrap g-2 mb-2">
                <div className="row g-2">
                  {/* 头像堆叠 */}
                  <div className="row" style={{ paddingLeft: 6 }}>
                    {(t.members || []).slice(0, 4).map((m: any, mi: number) => (
                      <span key={m.user_id} className="avatar" title={m.name}
                        style={{ width: 26, height: 26, fontSize: 11, borderWidth: 0, marginLeft: -6, zIndex: 10 - mi, outline: '2px solid var(--surface)', background: ['var(--brand)', 'var(--accent)', 'var(--blue-safe)', 'var(--gold)'][mi % 4] }}>
                        {m.name?.[0] || '员'}
                      </span>
                    ))}
                    {(t.members?.length ?? 0) > 4 && (
                      <span className="avatar" style={{ width: 26, height: 26, fontSize: 10, marginLeft: -6, background: 'var(--bg-deep)', color: 'var(--muted)', borderWidth: 0, outline: '2px solid var(--surface)' }}>+{(t.members?.length ?? 0) - 4}</span>
                    )}
                  </div>
                  <div>
                    <div className="fw-bold text-small">{t.name}</div>
                    <div className="text-xs text-muted">{t.members?.length ?? 0} 名成员 · 协作空间已互通</div>
                  </div>
                </div>
                <button className="btn btn-soft btn-sm" onClick={() => { setInviteTeam(t); setInviteOpen(true); }} aria-label={`邀请成员加入课题组 ${t.name}`}>
                  <Icon name="plus" size={12} /> 邀请
                </button>
              </div>
              <div className="row g-1 wrap">
                {t.members?.map((m: any) => (
                  <span key={m.user_id} className="tag tag-outline" style={{ cursor: 'default', gap: 6 }}>
                    {m.name}
                    <span className="text-xs" style={{ color: m.role === 'admin' ? 'var(--brand-strong)' : 'var(--muted)' }}>
                      {m.role === 'admin' ? '管理员' : m.role === 'guest' ? '访客' : '成员'}
                    </span>
                    {m.role !== 'admin' && (
                      <span style={{ display: 'flex', alignItems: 'center', color: 'var(--muted)', cursor: 'pointer' }}
                        onClick={() => setRemoveTarget({ team: t, uid: m.user_id, name: m.name })} title="移除成员" aria-label={`移除成员 ${m.name}`}>
                        <Icon name="x" size={11} />
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* RAG 知识库 */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="row-between" style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
            <span className="card-title"><Icon name="db" size={15} /> RAG 知识库</span>
            <span className="text-xs text-muted">私有语义索引 · 支持问答验证</span>
          </div>
          {kbs.length === 0 ? (
            <div style={{ padding: 20 }}><Empty icon="db" text="暂无知识库，在项目详情中上传文档即可建立索引" /></div>
          ) : kbs.map((kb) => {
            const open = kbOpen === kb.id;
            const hits = kbHits[kb.id] || [];
            return (
              <div key={kb.id} style={{ padding: '13px 16px', borderBottom: '1px solid var(--line)' }}>
                <div className="row-between wrap g-2">
                  <div className="row g-2" style={{ minWidth: 0 }}>
                    <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--brand-soft)', color: 'var(--brand-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
                      <Icon name="db" size={15} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div className="row g-1 wrap" style={{ alignItems: 'baseline' }}>
                        <span className="fw-bold text-small">{kb.name}</span>
                        <Tag color={kb.scope === 'team' ? 'blue' : 'gray'}>{kb.scope === 'team' ? '课题组' : kb.scope === 'project' ? '项目' : '个人'}</Tag>
                      </div>
                      <div className="text-xs text-muted mono" style={{ marginTop: 2 }}>
                        {kb.doc_count} 文档 · {kb.chunk_count.toLocaleString()} 切片 · {kb.size_mb} MB
                      </div>
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 'none' }} onClick={() => setKbOpen(open ? null : kb.id)}>
                    <Icon name="search" size={12} /> {open ? '收起检索' : '检索验证'}
                  </button>
                </div>

                {open && (
                  <div className="anim-in" style={{ marginTop: 10 }}>
                    <div className="row g-2">
                      <input className="input grow" placeholder="输入问题，验证知识库召回效果…" value={kbQuery[kb.id] || ''}
                        onChange={(e) => setKbQuery((x) => ({ ...x, [kb.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && askKb(kb)} aria-label={`检索知识库 ${kb.name}`} />
                      <button className="btn btn-primary btn-sm" style={{ flex: 'none' }} onClick={() => askKb(kb)} disabled={kbAsking === kb.id}>
                        {kbAsking === kb.id ? <span className="spinner" /> : <><Icon name="spark" size={12} /> 检索</>}
                      </button>
                    </div>
                    {hits.length > 0 && (
                      <div className="mt-2" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {hits.map((h: any) => (
                          <div key={h.id} className="card" style={{ padding: '9px 12px', background: 'var(--bg-deep)' }}>
                            <div className="row-between text-xs mb-1">
                              <span className="fw-bold" style={{ color: 'var(--brand-strong)' }}>
                                <Icon name="quote" size={11} /> {h.doc_title || `片段 ${h.id}`} {h.page ? `· P${h.page}` : ''}
                              </span>
                              <span className="mono text-muted">相关度 {(h.score * 100).toFixed(0)}%</span>
                            </div>
                            <div className="text-xs" style={{ color: 'var(--ink-2)', lineHeight: 1.7 }}>{h.content}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
              {STAGE_META.map(([k, label, ic]) => (
                <div key={k} className="card card-pad" style={{ padding: 12 }}>
                  <div className="row-between text-xs mb-1">
                    <span className="row g-1" style={{ alignItems: 'center' }}><Icon name={ic} size={12} /> {label}</span>
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
                        <Icon name={ic as IconName} size={12} /> {it.title || it.name}
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
