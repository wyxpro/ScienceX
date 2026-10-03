/* 投稿助手 —— REQ-SUB-01：CCF 期刊大全 · 投稿追踪 · 期刊智能匹配 · 弹窗详情 */
import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import Icon from '../components/Icon';
import { Countdown, Empty, ScoreRing, Skeleton, Tag, useToast } from '../components/ui';

const CCF_TAG_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  A: { bg: '#fef2f2', color: '#dc2626', border: 'rgba(239, 68, 68, 0.2)' },
  B: { bg: '#fffbeb', color: '#d97706', border: 'rgba(245, 158, 11, 0.25)' },
  C: { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' },
};

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
  const [typeFilter, setTypeFilter] = useState<'all' | '会议' | '期刊'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | '30' | '90'>('all');

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

  // 格式化官网显示（去掉协议头保持简洁美观）
  const getDomainFromUrl = (url?: string) => {
    if (!url) return '';
    try {
      return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
    } catch {
      return url;
    }
  };

  // 过滤后的期刊列表（支持类型与时间过滤）
  const filteredJournals = journals.filter((j) => {
    if (typeFilter !== 'all' && j.type !== typeFilter) return false;
    if (timeFilter === '30' && (j.days_left == null || j.days_left > 30 || j.days_left < 0)) return false;
    if (timeFilter === '90' && (j.days_left == null || j.days_left > 90 || j.days_left < 0)) return false;
    return true;
  });

  return (
    <div className="page" style={{ gap: 16 }}>
      {/* ===== 顶部主 Tabs 栏 ===== */}
      <div
        className="card card-pad"
        style={{
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff',
          borderRadius: 14,
        }}
      >
        <div className="tabs" style={{ background: 'transparent', padding: 0, margin: 0 }}>
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
          <div className="text-xs text-muted">
            共收录 <strong style={{ color: 'var(--brand-strong)' }}>{filteredJournals.length}</strong> 份 CCF 顶级期刊与学术会议
          </div>
        )}
      </div>

      {/* ===== 点击“期刊会议大全”时在下方展示的筛选工具条（与下方卡片间距合理匀称） ===== */}
      {tab === 'journals' && (
        <div
          className="card card-pad anim-in"
          style={{
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            background: '#ffffff',
            borderRadius: 14,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          }}
        >
          {/* 会议 / 期刊 快速类型切换 */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-deep)',
              borderRadius: 8,
              padding: 2,
              border: '1px solid var(--line)',
            }}
          >
            {(['all', '会议', '期刊'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                style={{
                  padding: '5px 13px',
                  fontSize: 12.5,
                  fontWeight: typeFilter === t ? 700 : 500,
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  background: typeFilter === t ? '#ffffff' : 'transparent',
                  color: typeFilter === t ? 'var(--ink)' : 'var(--muted)',
                  boxShadow: typeFilter === t ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {t === 'all' ? '全部' : t}
              </button>
            ))}
          </div>

          {/* 搜索会议 / 期刊 输入框 */}
          <div style={{ position: 'relative', width: 230 }}>
            <input
              className="input"
              style={{ width: '100%', height: 34, fontSize: 13, paddingLeft: 30, borderRadius: 8 }}
              placeholder="搜索会议 / 期刊 (如 CVPR、TPAMI)…"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <span
              style={{
                position: 'absolute',
                left: 10,
                top: 9,
                color: 'var(--muted)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Icon name="search" size={14} />
            </span>
          </div>

          <div style={{ width: 1, height: 20, background: 'var(--line)', margin: '0 4px' }} />

          {/* CCF 等级筛选胶囊 (全部 CCF / CCF-A / CCF-B / CCF-C) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {[
              { key: '', label: '全部 CCF' },
              { key: 'A', label: 'CCF-A' },
              { key: 'B', label: 'CCF-B' },
              { key: 'C', label: 'CCF-C' },
            ].map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCcf(c.key)}
                style={{
                  padding: '5px 12px',
                  fontSize: 12,
                  fontWeight: ccf === c.key ? 700 : 500,
                  borderRadius: 7,
                  border: ccf === c.key ? '1px solid var(--brand)' : '1px solid var(--line)',
                  background: ccf === c.key ? 'var(--brand-soft)' : '#ffffff',
                  color: ccf === c.key ? 'var(--brand-strong)' : 'var(--ink-2)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* 截稿时间范围快捷筛选 (全部时间 / 30天内 / 90天内) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
            {[
              { key: 'all', label: '全部时间' },
              { key: '30', label: '30 天内' },
              { key: '90', label: '90 天内' },
            ].map((tm) => (
              <button
                key={tm.key}
                type="button"
                onClick={() => setTimeFilter(tm.key as any)}
                style={{
                  padding: '5px 12px',
                  fontSize: 12,
                  fontWeight: timeFilter === tm.key ? 700 : 500,
                  borderRadius: 7,
                  border: timeFilter === tm.key ? '1px solid #94a3b8' : '1px solid var(--line)',
                  background: timeFilter === tm.key ? '#f1f5f9' : '#ffffff',
                  color: timeFilter === tm.key ? '#0f172a' : 'var(--muted)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tm.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ===== 期刊列表（电脑端一行 3 个卡片 · 现代典雅卡片样式） ===== */}
      {tab === 'journals' && (
        <div className="anim-in">
          {loading ? (
            <div className="card card-pad">
              <Skeleton lines={6} h={42} />
            </div>
          ) : filteredJournals.length === 0 ? (
            <Empty icon="mail" text="没有符合条件的期刊或会议，试试放宽筛选" />
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(max(31%, 320px), 1fr))',
                gap: 16,
              }}
            >
              {filteredJournals.map((j) => {
                const ccfStyle = CCF_TAG_STYLES[j.ccf] || CCF_TAG_STYLES.C;
                const isUrgent = typeof j.days_left === 'number' && j.days_left <= 30 && j.days_left >= 0;

                return (
                  <div
                    key={j.id}
                    onClick={() => setSelectedJournal(j)}
                    style={{
                      borderRadius: 16,
                      background: '#ffffff',
                      border: j.tracked ? '1.5px solid var(--brand)' : '1px solid #e2e8f0',
                      boxShadow: j.tracked
                        ? '0 6px 20px -4px rgba(27, 122, 94, 0.16)'
                        : '0 2px 10px rgba(15, 23, 42, 0.04)',
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 10px 24px -4px rgba(15, 23, 42, 0.09)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = j.tracked
                        ? '0 6px 20px -4px rgba(27, 122, 94, 0.16)'
                        : '0 2px 10px rgba(15, 23, 42, 0.04)';
                    }}
                    role="button"
                    tabIndex={0}
                    title="点击查看期刊详情与投稿须知"
                  >
                    {/* 第一行：CCF 标签 + 期刊/会议名称 + 收藏星星按钮 */}
                    <div className="row-between" style={{ alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 800,
                            background: ccfStyle.bg,
                            color: ccfStyle.color,
                            border: `1px solid ${ccfStyle.border}`,
                            flexShrink: 0,
                          }}
                        >
                          CCF-{j.ccf}
                        </span>
                        <div
                          className="ellipsis"
                          style={{
                            fontSize: 16,
                            fontWeight: 800,
                            color: '#0f172a',
                            letterSpacing: '-0.2px',
                          }}
                        >
                          {j.name}
                        </div>
                      </div>

                      {/* 收藏 / 追踪星星图标 */}
                      <button
                        type="button"
                        onClick={(e) => toggleTrack(j, e)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: j.tracked ? '#d97706' : '#94a3b8',
                          transition: 'transform 0.15s ease, color 0.15s ease',
                          flexShrink: 0,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.2)')}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
                        title={j.tracked ? '已关注，点击取消' : '点击关注追踪'}
                      >
                        <Icon name="star" size={18} />
                      </button>
                    </div>

                    {/* 第二行：英文全称 / 领域副标题 */}
                    <div
                      className="ellipsis"
                      style={{
                        fontSize: 12.5,
                        color: '#64748b',
                        lineHeight: 1.4,
                      }}
                      title={j.full_name || j.field}
                    >
                      {j.full_name || j.field}
                    </div>

                    {/* 第三行：截稿状态（重点醒目展示） */}
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: isUrgent ? '#dc2626' : typeof j.days_left === 'number' ? '#b45309' : '#047857',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span>
                        {typeof j.days_left === 'number'
                          ? `全文截稿 · 剩 ${j.days_left} 天 (${formatDeadlineDate(j.deadline)})`
                          : '滚动投稿 · 常年开放'}
                      </span>
                    </div>

                    {/* 第四行：举办日期与地点 / 周期 */}
                    <div
                      style={{
                        fontSize: 12,
                        color: '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span>{j.location && j.location !== '-' ? `${j.period} · ${j.location}` : j.period}</span>
                      {j.if_score && (
                        <span style={{ color: '#d97706', fontWeight: 600 }}>· IF {j.if_score}</span>
                      )}
                    </div>

                    {/* 第五行：官方网址点击链接 + 详情提示 */}
                    <div
                      style={{
                        marginTop: 4,
                        paddingTop: 8,
                        borderTop: '1px solid #f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      {j.website ? (
                        <a
                          href={j.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            fontSize: 12,
                            color: '#0284c7',
                            textDecoration: 'none',
                            fontWeight: 500,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                          title={`访问 ${j.name} 官网`}
                        >
                          <Icon name="link" size={11} />
                          <span className="ellipsis" style={{ maxWidth: 220 }}>
                            {getDomainFromUrl(j.website)}
                          </span>
                        </a>
                      ) : (
                        <span style={{ fontSize: 11.5, color: '#94a3b8' }}>暂无官网</span>
                      )}

                      <span
                        style={{
                          fontSize: 11.5,
                          color: 'var(--muted)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                        }}
                      >
                        详情 <Icon name="chevronRight" size={11} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== 投稿追踪 ===== */}
      {tab === 'tracks' && (
        <div className="anim-in">
          {tracks.length === 0 ? (
            <Empty icon="clock" text="暂无追踪记录，去期刊大全点击「★ 关注」添加" />
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

      {/* ===== 期刊智能匹配 ===== */}
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
                background: 'linear-gradient(175deg, #f8fafc 0%, #ffffff 100%)',
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
                    <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0f172a' }}>
                      {selectedJournal.name}
                    </h3>
                    <span
                      style={{
                        padding: '2px 7px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 800,
                        background: CCF_TAG_STYLES[selectedJournal.ccf]?.bg || '#f1f5f9',
                        color: CCF_TAG_STYLES[selectedJournal.ccf]?.color || '#334155',
                        border: `1px solid ${CCF_TAG_STYLES[selectedJournal.ccf]?.border || '#e2e8f0'}`,
                      }}
                    >
                      CCF-{selectedJournal.ccf}
                    </span>
                    <Tag color="gray">{selectedJournal.type}</Tag>
                    {selectedJournal.if_score && <Tag color="gold">IF {selectedJournal.if_score}</Tag>}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, lineHeight: 1.4 }}>
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
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>投稿截止</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                    {formatDeadlineDate(selectedJournal.deadline)}
                  </div>
                </div>

                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>影响因子 / 级别</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                    {selectedJournal.if_score ? `IF ${selectedJournal.if_score}` : `CCF-${selectedJournal.ccf} 顶会`}
                  </div>
                </div>

                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>审稿周期</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                    {selectedJournal.review_cycle || selectedJournal.period || '约 3 个月'}
                  </div>
                </div>

                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>参考录用率</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#059669' }}>
                    {selectedJournal.acceptance_rate || '约 22%~25%'}
                  </div>
                </div>
              </div>

              {/* 简介 */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a', marginBottom: 6 }}>
                  📖 简介与学术声誉
                </div>
                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.7,
                    color: '#334155',
                    background: '#f8fafc',
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: '1px solid #edf2f7',
                  }}
                >
                  {selectedJournal.description ||
                    `${selectedJournal.name} 是${selectedJournal.field}领域的核心国际学术发表阵地，具有极高的同行声誉与严密的审稿机制。`}
                </div>
              </div>

              {/* 收录主题 */}
              {selectedJournal.topics && selectedJournal.topics.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a', marginBottom: 8 }}>
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
                          fontWeight: 600,
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
                <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a', marginBottom: 6 }}>
                  📝 投稿须知与格式规范
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    lineHeight: 1.65,
                    color: '#334155',
                    background: '#f8fafc',
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: '1px solid #edf2f7',
                  }}
                >
                  {selectedJournal.guidelines ||
                    `${selectedJournal.publisher || '官方'} 标准格式 · 请严格遵循匿名盲审规范与正文页数限制。`}
                </div>
              </div>

              {/* 出版商与举办地点 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: '#f1f5f9',
                  borderRadius: 10,
                  fontSize: 12,
                  color: '#64748b',
                }}
              >
                <span>
                  举办地点/主办方：
                  <strong style={{ color: '#0f172a' }}>
                    {selectedJournal.location !== '-' ? selectedJournal.location : selectedJournal.publisher || '国际学术组织'}
                  </strong>
                </span>
                <span>
                  出版商：<strong style={{ color: '#0f172a' }}>{selectedJournal.publisher || 'IEEE / ACM / Springer'}</strong>
                </span>
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
                background: '#f8fafc',
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
