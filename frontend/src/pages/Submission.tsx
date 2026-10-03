/* 投稿助手 —— REQ-SUB-01：CCF 期刊大全 · 投稿追踪 · 期刊智能匹配 · 弹窗详情 */
import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import Icon from '../components/Icon';
import { Countdown, Empty, ScoreRing, Skeleton, Tag, useToast } from '../components/ui';

const CCF_COLORS: Record<string, string> = { A: 'red', B: 'amber', C: 'gray' };
const STATUS_LABEL: Record<string, string> = {
  watching: '已关注',
  submitted: '已投稿',
  under_review: '审稿中',
  accepted: '已录用',
  rejected: '已拒稿',
};
const STATUS_COLORS: Record<string, string> = {
  watching: 'blue',
  submitted: 'amber',
  under_review: 'amber',
  accepted: 'green',
  rejected: 'red',
};

export default function Submission() {
  const toast = useToast();
  const [tab, setTab] = useState<'journals' | 'tracks' | 'match'>('journals');
  const [loading, setLoading] = useState(true);
  const [journals, setJournals] = useState<any[]>([]);
  const [tracks, setTracks] = useState<any[]>([]);
  const [ccf, setCcf] = useState('');
  const [keyword, setKeyword] = useState('');
  /* 匹配表单 */
  const [abstract, setAbstract] = useState('');
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<any[]>([]);
  /* 弹窗详情 */
  const [selectedJournal, setSelectedJournal] = useState<any | null>(null);

  const loadJournals = useCallback(async () => {
    const r = await api<{ items: any[] }>('/journals', { params: { ccf, keyword } });
    setJournals(r.items);
  }, [ccf, keyword]);

  const loadTracks = useCallback(async () => {
    const r = await api<{ items: any[] }>('/submission-tracks');
    setTracks(r.items);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await Promise.all([loadJournals(), loadTracks()]);
      } finally {
        setLoading(false);
      }
    })();
  }, [loadJournals]);

  const toggleTrack = async (j: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (j.tracked) {
      const t = tracks.find((x) => x.journal_id === j.id);
      if (t) await api(`/submission-tracks/${t.id}`, { method: 'DELETE' });
      toast(`已取消关注 ${j.name}`);
    } else {
      await api('/submission-tracks', { method: 'POST', body: { journal_id: j.id } });
      toast(`已关注 ${j.name}，将提醒投稿进度`);
    }
    await Promise.all([loadJournals(), loadTracks()]);
    // 若当前弹窗打开的是此期刊，同步更新状态
    if (selectedJournal && selectedJournal.id === j.id) {
      setSelectedJournal((prev: any) => ({ ...prev, tracked: !j.tracked }));
    }
  };

  const updateTrackStatus = async (t: any, status: string) => {
    await api(`/submission-tracks/${t.id}`, { method: 'PATCH', body: { status } });
    toast('状态已更新');
    await loadTracks();
  };

  const runMatch = async () => {
    if (abstract.trim().length < 20) return toast('请粘贴至少 20 字的论文摘要', 'info');
    setMatching(true);
    setMatchResult([]);
    try {
      const r = await api<{ items: any[] }>('/journals/match', { method: 'POST', body: { abstract } });
      setMatchResult(r.items);
      toast('匹配完成');
    } finally {
      setMatching(false);
    }
  };

  // 格式化日期辅助函数
  const formatDeadlineDate = (dl: string | null) => {
    if (!dl) return '常年开放 (滚动投稿)';
    try {
      const d = new Date(dl);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    } catch {
      return dl;
    }
  };

  return (
    <div className="page" style={{ gap: 14 }}>
      {/* ===== 页头 Tabs ===== */}
      <div className="card card-pad row-between wrap g-2" style={{ flex: 'none' }}>
        <div className="tabs" style={{ background: 'transparent', padding: 0 }}>
          {([
            ['journals', '期刊会议大全', 'mail'],
            ['tracks', `投稿追踪 (${tracks.length})`, 'clock'],
            ['match', '期刊智能匹配', 'spark'],
          ] as const).map(([k, label, ic]) => (
            <button key={k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k as any)}>
              <Icon name={ic as any} size={13} /> {label}
            </button>
          ))}
        </div>
        {tab === 'journals' && (
          <div className="row g-2 wrap">
            <input
              className="input"
              style={{ width: 180 }}
              placeholder="搜索期刊 / 会议…"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <div className="row g-1">
              {['', 'A', 'B', 'C'].map((c) => (
                <button
                  key={c}
                  className={`tag ${ccf === c ? 'tag-green' : 'tag-outline'}`}
                  style={{ cursor: 'pointer', border: 'none' }}
                  onClick={() => setCcf(c)}
                >
                  {c || '全部 CCF'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ===== 期刊列表 ===== */}
      {tab === 'journals' && (
        <div className="anim-in">
          {loading ? (
            <div className="card card-pad">
              <Skeleton lines={6} h={38} />
            </div>
          ) : journals.length === 0 ? (
            <Empty icon="mail" text="没有符合条件的期刊，试试放宽筛选" />
          ) : (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
              {journals.map((j) => (
                <div
                  key={j.id}
                  className="card card-pad card-hover anim-in"
                  onClick={() => setSelectedJournal(j)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.25s ease',
                  }}
                  title="点击查看期刊详细信息与投稿指南"
                >
                  {/* 头部标题与分类 */}
                  <div className="row-between">
                    <div className="row g-2" style={{ minWidth: 0, alignItems: 'center' }}>
                      <div
                        style={{
                          flex: 'none',
                          width: 42,
                          height: 42,
                          borderRadius: 11,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'var(--brand-soft)',
                          color: 'var(--brand-strong)',
                          fontWeight: 800,
                          fontSize: 13,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                        }}
                      >
                        {j.name.slice(0, 3).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="fw-bold text-small ellipsis" style={{ fontSize: 15, color: 'var(--ink)' }}>
                          {j.name}
                        </div>
                        <div className="text-xs text-muted ellipsis" style={{ marginTop: 2 }}>
                          {j.field}
                        </div>
                      </div>
                    </div>
                    <Tag color={CCF_COLORS[j.ccf] as any}>CCF-{j.ccf}</Tag>
                  </div>

                  {/* 学术属性徽章 */}
                  <div className="row g-1 wrap">
                    <Tag color="gray">
                      <Icon name="doc" size={11} /> {j.type}
                    </Tag>
                    {j.if_score && <Tag color="gold">IF {j.if_score}</Tag>}
                    {j.acceptance_rate && <Tag color="green">录用率 {j.acceptance_rate}</Tag>}
                    <Tag color="gray">{j.period}</Tag>
                    {j.location && j.location !== '-' && <Tag color="gray">{j.location}</Tag>}
                  </div>

                  {/* 新增：投稿截止日期专栏 */}
                  <div
                    style={{
                      background: 'var(--bg-deep)',
                      borderRadius: 9,
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-2)' }}>
                      <Icon name="calendar" size={13} />
                      <span style={{ color: 'var(--muted)' }}>截止日期:</span>
                      <strong style={{ fontWeight: 600 }}>{formatDeadlineDate(j.deadline)}</strong>
                    </div>
                    <Countdown days={j.days_left} />
                  </div>

                  {/* 底部操作区：官网按钮与关注操作 */}
                  <div
                    className="row-between items-center"
                    style={{
                      marginTop: 'auto',
                      paddingTop: 8,
                      borderTop: '1px solid var(--line)',
                    }}
                  >
                    {/* 官网跳转按钮 */}
                    {j.website ? (
                      <a
                        href={j.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="btn btn-ghost btn-xs"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          color: 'var(--brand-strong)',
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: 7,
                          background: 'var(--brand-soft)',
                        }}
                        title={`访问 ${j.name} 官方网站`}
                      >
                        <Icon name="link" size={12} /> 官网
                      </a>
                    ) : (
                      <span className="text-xs text-muted">暂无官网</span>
                    )}

                    <div className="row g-2">
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedJournal(j);
                        }}
                        style={{ fontSize: 12 }}
                      >
                        详情
                      </button>
                      <button
                        className={`btn btn-xs ${j.tracked ? 'btn-ghost' : 'btn-primary'}`}
                        onClick={(e) => toggleTrack(j, e)}
                        style={{ padding: '4px 10px' }}
                      >
                        <Icon name={j.tracked ? 'check' : 'star'} size={11} />
                        {j.tracked ? '已关注' : '关注'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== 投稿追踪 ===== */}
      {tab === 'tracks' && (
        <div className="anim-in">
          {tracks.length === 0 ? (
            <Empty icon="clock" text="暂无追踪记录，去期刊大全点击「关注」添加" />
          ) : (
            <div className="card" style={{ overflow: 'hidden' }}>
              {tracks.map((t, i) => (
                <div
                  key={t.id}
                  className="row-between wrap g-2"
                  style={{
                    padding: '13px 18px',
                    borderTop: i ? '1px solid var(--line)' : 'none',
                    transition: 'background .15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-deep)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div className="row g-2" style={{ minWidth: 200, alignItems: 'center' }}>
                    <div className="fw-bold text-small">{t.journal_name}</div>
                    <Tag color={STATUS_COLORS[t.status] as any}>{STATUS_LABEL[t.status] || t.status}</Tag>
                  </div>
                  <div className="row g-2 wrap items-center">
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      截止：{formatDeadlineDate(t.deadline)}
                    </div>
                    <Countdown days={t.days_left} />
                    <select
                      className="input"
                      style={{ width: 110, padding: '4px 8px', fontSize: 12 }}
                      value={t.status}
                      onChange={(e) => updateTrackStatus(t, e.target.value)}
                    >
                      {Object.entries(STATUS_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== 期刊匹配 ===== */}
      {tab === 'match' && (
        <div
          className="anim-in"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14, alignItems: 'start' }}
        >
          <div className="card card-pad">
            <div className="fw-bold mb-1" style={{ fontSize: 14 }}>
              <Icon name="spark" size={15} /> 期刊智能匹配
            </div>
            <p className="text-xs text-muted" style={{ marginBottom: 10 }}>
              粘贴论文摘要，AI 将从主题契合度、审稿周期、录用率等维度推荐合适的期刊 / 会议。
            </p>
            <textarea
              className="textarea"
              rows={10}
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              placeholder="例：Micro-expression recognition (MER) aims to…（支持中英文摘要）"
            />
            <button className="btn btn-primary btn-block mt-2" onClick={runMatch} disabled={matching}>
              {matching ? <span className="spinner" /> : <Icon name="zap" size={14} />} 开始匹配
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {matchResult.length === 0 && !matching && <Empty icon="target" text="匹配结果将展示在这里" />}
            {matchResult.map((m, i) => (
              <div key={m.journal_id} className="card card-pad card-hover anim-in" style={{ display: 'flex', gap: 14 }}>
                <ScoreRing value={m.score} size={64} label="匹配度" />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="row g-2 mb-1" style={{ alignItems: 'center' }}>
                    <span className="fw-bold text-small">{m.name}</span>
                    <Tag color={CCF_COLORS[m.ccf] as any}>CCF-{m.ccf}</Tag>
                    {i === 0 && (
                      <Tag color="green">
                        <Icon name="award" size={11} /> 最佳推荐
                      </Tag>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--ink-2)', lineHeight: 1.7, margin: '4px 0 8px' }}>
                    {m.reason}
                  </p>
                  <div className="row-between text-xs text-muted" style={{ borderTop: '1px dashed var(--line)', paddingTop: 6 }}>
                    <span>截止: {formatDeadlineDate(m.deadline)}</span>
                    <Countdown days={m.deadline ? Math.ceil((new Date(m.deadline).getTime() - Date.now()) / 86400000) : null} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== 期刊/会议详情弹窗 (Modal) ===== */}
      {selectedJournal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setSelectedJournal(null)}
        >
          <div
            className="card anim-in"
            style={{
              width: '100%',
              maxWidth: 680,
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: 20,
              boxShadow: '0 24px 64px -12px rgba(15, 23, 42, 0.35)',
              border: '1px solid var(--line)',
              padding: 0,
              background: '#ffffff',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 弹窗头部 */}
            <div
              style={{
                padding: '24px 28px 18px',
                borderBottom: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                background: 'linear-gradient(175deg, var(--brand-softer) 0%, #ffffff 100%)',
              }}
            >
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-deep) 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    fontWeight: 800,
                    boxShadow: '0 6px 16px rgba(27, 122, 94, 0.28)',
                    flexShrink: 0,
                  }}
                >
                  {selectedJournal.name.slice(0, 3).toUpperCase()}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>
                      {selectedJournal.name}
                    </h3>
                    <Tag color={CCF_COLORS[selectedJournal.ccf] as any}>CCF-{selectedJournal.ccf}</Tag>
                    <Tag color="gray">{selectedJournal.type}</Tag>
                    {selectedJournal.if_score && <Tag color="gold">IF {selectedJournal.if_score}</Tag>}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, lineHeight: 1.4 }}>
                    {selectedJournal.full_name || selectedJournal.field}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedJournal(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  padding: 6,
                  borderRadius: 8,
                }}
                title="关闭弹窗"
              >
                <Icon name="x" size={20} />
              </button>
            </div>

            {/* 弹窗核心数据 4 维看板 */}
            <div style={{ padding: '20px 28px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: 'var(--bg-deep)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>投稿截止</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--brand-strong)' }}>
                    {formatDeadlineDate(selectedJournal.deadline)}
                  </div>
                </div>

                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: 'var(--bg-deep)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>影响因子 / 级别</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>
                    {selectedJournal.if_score ? `IF ${selectedJournal.if_score}` : `CCF-${selectedJournal.ccf} 顶会`}
                  </div>
                </div>

                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: 'var(--bg-deep)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>审稿周期</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>
                    {selectedJournal.review_cycle || selectedJournal.period || '约 3 个月'}
                  </div>
                </div>

                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: 'var(--bg-deep)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>参考录用率</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#059669' }}>
                    {selectedJournal.acceptance_rate || '约 22%~25%'}
                  </div>
                </div>
              </div>

              {/* 简介 */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)', marginBottom: 6 }}>
                  📖 简介与学术声誉
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--ink-2)', background: '#fafafa', padding: '12px 16px', borderRadius: 10 }}>
                  {selectedJournal.description || `${selectedJournal.name} 是${selectedJournal.field}领域的核心国际学术发表阵地，具有极高的同行声誉与严密的审稿机制。`}
                </div>
              </div>

              {/* 收录主题 */}
              {selectedJournal.topics && selectedJournal.topics.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)', marginBottom: 8 }}>
                    🏷️ 重点收录主题
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {selectedJournal.topics.map((t: string, idx: number) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: 12,
                          padding: '4px 10px',
                          borderRadius: 8,
                          background: 'var(--brand-soft)',
                          color: 'var(--brand-strong)',
                          fontWeight: 500,
                        }}
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 投稿指南与规范 */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)', marginBottom: 6 }}>
                  📝 投稿须知与格式规范
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    lineHeight: 1.65,
                    color: 'var(--ink-2)',
                    background: '#f8fafc',
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  {selectedJournal.guidelines || `${selectedJournal.publisher || '官方'} 标准格式 · 请严格遵循匿名盲审规范与正文页数限制。`}
                </div>
              </div>

              {/* 出版商与举办地点 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'var(--bg-deep)',
                  borderRadius: 10,
                  fontSize: 12,
                  color: 'var(--muted)',
                }}
              >
                <span>举办地点/主办方：<strong style={{ color: 'var(--ink)' }}>{selectedJournal.location !== '-' ? selectedJournal.location : (selectedJournal.publisher || '国际学术组织')}</strong></span>
                <span>出版商：<strong style={{ color: 'var(--ink)' }}>{selectedJournal.publisher || 'IEEE/ACM/Springer'}</strong></span>
              </div>
            </div>

            {/* 弹窗底部操作条 */}
            <div
              style={{
                padding: '16px 28px',
                borderTop: '1px solid var(--line)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#fafafa',
              }}
            >
              <button
                className={`btn btn-sm ${selectedJournal.tracked ? 'btn-ghost' : 'btn-primary'}`}
                onClick={(e) => toggleTrack(selectedJournal, e)}
              >
                <Icon name={selectedJournal.tracked ? 'check' : 'star'} size={13} />
                {selectedJournal.tracked ? '已在关注列表中' : '加入投稿追踪'}
              </button>

              <div style={{ display: 'flex', gap: 10 }}>
                {selectedJournal.website && (
                  <a
                    href={selectedJournal.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 18px',
                      borderRadius: 9,
                    }}
                  >
                    访问官方网站 <Icon name="arrowRight" size={13} />
                  </a>
                )}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSelectedJournal(null)}
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
