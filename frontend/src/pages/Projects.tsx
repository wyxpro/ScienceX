/* 我的项目 —— REQ-PRJ-01：项目空间（进度/资产） */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import Icon, { type IconName } from '../components/Icon';
import { Empty, Modal, Progress, Skeleton, Tag, useToast } from '../components/ui';
import type { ProjectItem } from '../types';

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

const overallOf = (p: ProjectItem) => {
  const stages = Object.values((p.progress || {}) as Record<string, number>);
  return Math.round(stages.reduce((s, v) => s + Number(v || 0), 0) / (stages.length || 1));
};

export default function Projects() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [detail, setDetail] = useState<any>(null);

  /* 搜索与筛选 */
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'research' | 'survey' | 'tool'>('all');

  /* 新建项目 */
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'research', description: '' });
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await api<{ items: ProjectItem[] } | ProjectItem[]>('/projects');
      setProjects((p as any)?.items || (Array.isArray(p) ? p : []));
    } catch (err: any) {
      setError(err.message || '加载项目数据失败');
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

  const stats = useMemo(() => {
    const totalDocs = projects.reduce((s, p) => s + (p.stats?.documents ?? 0), 0);
    const totalExps = projects.reduce((s, p) => s + (p.stats?.experiments ?? 0), 0);
    const totalCharts = projects.reduce((s, p) => s + (p.stats?.charts ?? 0), 0);
    const totalMss = projects.reduce((s, p) => s + (p.stats?.manuscripts ?? 0), 0);
    const avgProgress = projects.length
      ? Math.round(projects.reduce((s, p) => s + overallOf(p), 0) / projects.length)
      : 0;
    return { totalDocs, totalExps, totalCharts, totalMss, avgProgress };
  }, [projects]);

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
    <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 60 }}>
      {/* ===== 顶部 KPI 概览统计条 ===== */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, flex: 'none' }}>
        {[
          { label: '科研项目', value: projects.length, icon: 'layers', hint: `平均进度 ${stats.avgProgress}%` },
          { label: '文献资产', value: stats.totalDocs, icon: 'book', hint: `${stats.totalMss} 篇关联稿件` },
          { label: '实验 / 图表', value: `${stats.totalExps} / ${stats.totalCharts}`, icon: 'flask', hint: '含消融与 SOTA 对标' },
          { label: '整体推进率', value: `${stats.avgProgress}%`, icon: 'zap', hint: '全流程里程碑达成' },
        ].map((s, i) => (
          <div
            key={s.label}
            className="card anim-in"
            style={{
              padding: '16px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              animationDelay: `${i * 40}ms`,
              borderRadius: 14,
              border: '1px solid var(--line)',
              background: 'var(--surface)',
              boxShadow: '0 2px 8px -2px rgba(15, 23, 42, 0.04)',
            }}
          >
            <span
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'var(--brand-soft)',
                color: 'var(--brand-strong)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 'none',
              }}
            >
              <Icon name={s.icon as IconName} size={18} />
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="text-xs text-muted" style={{ fontWeight: 500, marginBottom: 2 }}>{s.label}</div>
              <div className="mono fw-bold" style={{ fontSize: 20, lineHeight: 1.2, color: 'var(--ink)' }}>{s.value}</div>
              <div className="text-xs text-muted ellipsis" style={{ fontSize: 11, marginTop: 3 }}>{s.hint}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ===== 项目空间工具栏 ===== */}
      <div
        className="card"
        style={{
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
          borderRadius: 14,
          border: '1px solid var(--line)',
          background: 'var(--surface)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', flex: 1, minWidth: 260 }}>
          <div style={{ position: 'relative', width: 280, maxWidth: '100%' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', display: 'flex' }}>
              <Icon name="search" size={14} />
            </span>
            <input
              className="input"
              style={{ paddingLeft: 34, height: 38, borderRadius: 10, fontSize: 13 }}
              placeholder="搜索项目名称 / 研究目标描述…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="搜索项目"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {([['all', '全部'], ['research', '研究'], ['survey', '综述'], ['tool', '工具']] as const).map(([k, label]) => (
              <button
                key={k}
                className={`tag ${filter === k ? 'tag-green' : 'tag-outline'}`}
                style={{
                  cursor: 'pointer',
                  border: filter === k ? 'none' : '1px solid var(--line)',
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: filter === k ? 600 : 500,
                  transition: 'all 0.15s ease',
                }}
                onClick={() => setFilter(k)}
                aria-label={`筛选${label}项目`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <button
          className="btn btn-primary"
          style={{ height: 38, padding: '0 18px', borderRadius: 10, fontWeight: 600, fontSize: 13 }}
          onClick={() => setCreateOpen(true)}
          aria-label="新建项目"
        >
          <Icon name="plus" size={14} /> 新建项目
        </button>
      </div>

      {/* ===== 项目卡片列表 ===== */}
      {visible.length === 0 ? (
        <div className="card card-pad" style={{ borderRadius: 14, padding: '40px 20px' }}>
          <Empty icon="layers" text={query || filter !== 'all' ? '没有匹配的项目，试试调整搜索或筛选条件' : '暂无项目，点击右上角新建首个科研项目'} />
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 20, flex: 'none' }}>
          {visible.map((p, i) => {
            const overall = overallOf(p);
            const tm = TYPE_META[p.type || 'research'] || TYPE_META.research;
            const ringC = overall >= 70 ? 'var(--brand)' : overall >= 40 ? 'var(--gold)' : 'var(--accent)';
            return (
              <div
                key={p.id}
                className="card card-hover anim-in"
                onClick={() => openDetail(p.id)}
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 16,
                  border: '1px solid var(--line)',
                  background: 'var(--surface)',
                  overflow: 'hidden',
                  animationDelay: `${i * 45}ms`,
                  boxShadow: '0 2px 10px -2px rgba(15, 23, 42, 0.05)',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                {/* 顶部色彩线 */}
                <div style={{ height: 4, background: tm.band, flex: 'none' }} />

                <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {/* 1. 头部：标题与总进度环 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <div className="fw-bold text-serif ellipsis" style={{ fontSize: 16, color: 'var(--ink)' }}>
                          {p.name}
                        </div>
                        <Tag color={tm.color}>{tm.label}</Tag>
                      </div>
                      <p
                        className="clamp2"
                        style={{
                          fontSize: 12.5,
                          color: 'var(--muted)',
                          lineHeight: 1.6,
                          margin: 0,
                          minHeight: 40,
                        }}
                      >
                        {p.description || '暂无项目描述'}
                      </p>
                    </div>

                    {/* 总进度环 */}
                    <div style={{ position: 'relative', width: 52, height: 52, flex: 'none' }} title={`整体进度 ${overall}%`}>
                      <svg width={52} height={52} style={{ display: 'block' }}>
                        <circle cx={26} cy={26} r={21} fill="none" stroke="var(--bg-deep)" strokeWidth={4.5} />
                        <circle
                          cx={26}
                          cy={26}
                          r={21}
                          fill="none"
                          stroke={ringC}
                          strokeWidth={4.5}
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 21}
                          strokeDashoffset={2 * Math.PI * 21 * (1 - overall / 100)}
                          transform="rotate(-90 26 26)"
                        />
                      </svg>
                      <span
                        className="mono"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 12,
                          fontWeight: 700,
                          color: ringC,
                        }}
                      >
                        {overall}%
                      </span>
                    </div>
                  </div>

                  {/* 2. 独立科研六阶段进度面板（杜绝任何文字重叠） */}
                  <div
                    style={{
                      marginTop: 18,
                      marginBottom: 18,
                      padding: '12px 14px',
                      background: 'var(--bg-deep)',
                      borderRadius: 12,
                      border: '1px solid rgba(0, 0, 0, 0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', letterSpacing: 0.3 }}>研究阶段里程碑</span>
                      <span className="mono" style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                        {Object.values(p.progress || {}).filter((v: any) => Number(v) >= 100).length} / 6 已达成
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                      {STAGE_META.map(([k, label]) => {
                        const v = Number((p.progress as any)?.[k] ?? 0);
                        const isDone = v >= 100;
                        const isInProgress = v > 0 && v < 100;
                        return (
                          <div key={k} style={{ textAlign: 'center' }} title={`${label}: ${v}%`}>
                            <div style={{ fontSize: 11, color: isDone ? 'var(--brand-strong)' : isInProgress ? 'var(--ink)' : 'var(--muted)', fontWeight: isDone || isInProgress ? 600 : 400, marginBottom: 4 }}>
                              {label}
                            </div>
                            <div style={{ height: 4, borderRadius: 2, background: 'rgba(0, 0, 0, 0.06)', overflow: 'hidden' }}>
                              <div
                                style={{
                                  height: '100%',
                                  width: `${v}%`,
                                  borderRadius: 2,
                                  background: isDone ? 'var(--brand)' : isInProgress ? 'var(--gold)' : 'transparent',
                                  transition: 'width 0.4s ease',
                                }}
                              />
                            </div>
                            <div className="mono" style={{ fontSize: 9.5, color: 'var(--muted)', marginTop: 3 }}>
                              {v}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. 底部：项目资产胶囊与进入详情按钮 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 'auto', paddingTop: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span className="tag tag-gray" style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6 }} title="文献数">
                        <Icon name="book" size={11} /> {p.stats?.documents ?? 0}
                      </span>
                      <span className="tag tag-gray" style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6 }} title="实验记录数">
                        <Icon name="flask" size={11} /> {p.stats?.experiments ?? 0}
                      </span>
                      <span className="tag tag-gray" style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6 }} title="科研图表数">
                        <Icon name="chart" size={11} /> {p.stats?.charts ?? 0}
                      </span>
                      <span className="tag tag-gray" style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6 }} title="稿件篇数">
                        <Icon name="doc" size={11} /> {p.stats?.manuscripts ?? 0}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--brand-strong)', fontSize: 12.5, fontWeight: 600 }}>
                      <span>详情</span>
                      <Icon name="chevronRight" size={13} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
    </div>
  );
}
