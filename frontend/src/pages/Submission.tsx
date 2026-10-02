/* 投稿助手 —— REQ-SUB-01：CCF 期刊大全 · 投稿追踪 · 期刊智能匹配 */
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import Icon from '../components/Icon';
import { Countdown, Empty, ScoreRing, Skeleton, Tag, useToast } from '../components/ui';

const CCF_COLORS: Record<string, string> = { A: 'red', B: 'amber', C: 'gray' };
const STATUS_LABEL: Record<string, string> = { watching: '已关注', submitted: '已投稿', under_review: '审稿中', accepted: '已录用', rejected: '已拒稿' };
const STATUS_COLORS: Record<string, string> = { watching: 'blue', submitted: 'amber', under_review: 'amber', accepted: 'green', rejected: 'red' };

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
      } finally { setLoading(false); }
    })();
  }, [loadJournals]);

  const toggleTrack = async (j: any) => {
    if (j.tracked) {
      const t = tracks.find((x) => x.journal_id === j.id);
      if (t) await api(`/submission-tracks/${t.id}`, { method: 'DELETE' });
      toast(`已取消关注 ${j.name}`);
    } else {
      await api('/submission-tracks', { method: 'POST', body: { journal_id: j.id } });
      toast(`已关注 ${j.name}，将提醒投稿进度`);
    }
    await Promise.all([loadJournals(), loadTracks()]);
  };

  const updateTrackStatus = async (t: any, status: string) => {
    await api(`/submission-tracks/${t.id}`, { method: 'PATCH', body: { status } });
    toast('状态已更新');
    await loadTracks();
  };

  const runMatch = async () => {
    if (abstract.trim().length < 20) return toast('请粘贴至少 20 字的论文摘要', 'info');
    setMatching(true); setMatchResult([]);
    try {
      const r = await api<{ items: any[] }>('/journals/match', { method: 'POST', body: { abstract } });
      setMatchResult(r.items);
      toast('匹配完成');
    } finally { setMatching(false); }
  };

  return (
    <div className="page" style={{ gap: 14 }}>
      {/* ===== 页头 Tabs ===== */}
      <div className="card card-pad row-between wrap g-2" style={{ flex: 'none' }}>
        <div className="tabs" style={{ background: 'transparent', padding: 0 }}>
          {([['journals', '期刊会议大全', 'mail'], ['tracks', `投稿追踪 (${tracks.length})`, 'clock'], ['match', '期刊智能匹配', 'spark']] as const).map(([k, label, ic]) => (
            <button key={k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k as any)}>
              <Icon name={ic as any} size={13} /> {label}
            </button>
          ))}
        </div>
        {tab === 'journals' && (
          <div className="row g-2 wrap">
            <input className="input" style={{ width: 180 }} placeholder="搜索期刊 / 会议…" value={keyword}
              onChange={(e) => setKeyword(e.target.value)} />
            <div className="row g-1">
              {['', 'A', 'B', 'C'].map((c) => (
                <button key={c} className={`tag ${ccf === c ? 'tag-green' : 'tag-outline'}`} style={{ cursor: 'pointer', border: 'none' }}
                  onClick={() => setCcf(c)}>{c || '全部 CCF'}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ===== 期刊列表 ===== */}
      {tab === 'journals' && (
        <div className="anim-in">
          {loading ? (
            <div className="card card-pad"><Skeleton lines={6} h={38} /></div>
          ) : journals.length === 0 ? (
            <Empty icon="mail" text="没有符合条件的期刊，试试放宽筛选" />
          ) : (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {journals.map((j) => (
                <div key={j.id} className="card card-pad card-hover anim-in" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="row-between">
                    <div className="row g-2" style={{ minWidth: 0 }}>
                      <div style={{ flex: 'none', width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--brand-softer)', color: 'var(--brand-strong)', fontWeight: 700, fontSize: 12.5 }}>{j.name.slice(0, 2).toUpperCase()}</div>
                      <div style={{ minWidth: 0 }}>
                        <div className="fw-bold text-small ellipsis">{j.name}</div>
                        <div className="text-xs text-muted">{j.field}</div>
                      </div>
                    </div>
                    <Tag color={CCF_COLORS[j.ccf] as any}>CCF-{j.ccf}</Tag>
                  </div>
                  <div className="row g-1 wrap">
                    <Tag color="gray"><Icon name="doc" size={11} />{j.type}</Tag>
                    {j.if_score && <Tag color="gold">IF {j.if_score}</Tag>}
                    <Tag color="gray">{j.period}</Tag>
                    {j.location !== '-' && <Tag color="gray">{j.location}</Tag>}
                  </div>
                  <div className="row-between" style={{ marginTop: 'auto', paddingTop: 4, borderTop: '1px dashed var(--line)' }}>
                    <Countdown days={j.days_left} />
                    <button className={`btn btn-sm ${j.tracked ? 'btn-ghost' : 'btn-primary'}`} onClick={() => toggleTrack(j)}>
                      <Icon name={j.tracked ? 'check' : 'star'} size={12} />
                      {j.tracked ? '已关注' : '关注'}
                    </button>
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
                <div key={t.id} className="row-between wrap g-2" style={{ padding: '13px 18px', borderTop: i ? '1px solid var(--line)' : 'none', transition: 'background .15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-deep)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <div className="row g-2" style={{ minWidth: 200 }}>
                    <div className="fw-bold text-small">{t.journal_name}</div>
                    <Tag color={STATUS_COLORS[t.status] as any}>{STATUS_LABEL[t.status] || t.status}</Tag>
                  </div>
                  <div className="row g-2 wrap">
                    <Countdown days={t.days_left} />
                    <select className="input" style={{ width: 110, padding: '4px 8px', fontSize: 12 }} value={t.status}
                      onChange={(e) => updateTrackStatus(t, e.target.value)}>
                      {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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
        <div className="anim-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14, alignItems: 'start' }}>
          <div className="card card-pad">
            <div className="fw-bold mb-1" style={{ fontSize: 14 }}>
              <Icon name="spark" size={15} /> 期刊智能匹配
            </div>
            <p className="text-xs text-muted" style={{ marginBottom: 10 }}>
              粘贴论文摘要，AI 将从主题契合度、审稿周期、录用率等维度推荐合适的期刊 / 会议。
            </p>
            <textarea className="textarea" rows={10} value={abstract} onChange={(e) => setAbstract(e.target.value)}
              placeholder="例：Micro-expression recognition (MER) aims to…（支持中英文摘要）" />
            <button className="btn btn-primary btn-block mt-2" onClick={runMatch} disabled={matching}>
              {matching ? <span className="spinner" /> : <Icon name="zap" size={14} />} 开始匹配
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {matchResult.length === 0 && !matching && (
              <Empty icon="target" text="匹配结果将展示在这里" />
            )}
            {matchResult.map((m, i) => (
              <div key={m.journal_id} className="card card-pad card-hover anim-in" style={{ display: 'flex', gap: 14 }}>
                <ScoreRing value={m.score} size={64} label="匹配度" />
                <div style={{ minWidth: 0 }}>
                  <div className="row g-2 mb-1">
                    <span className="fw-bold text-small">{m.name}</span>
                    <Tag color={CCF_COLORS[m.ccf] as any}>CCF-{m.ccf}</Tag>
                    {i === 0 && <Tag color="green"><Icon name="award" size={11} />最佳推荐</Tag>}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--ink-2)', lineHeight: 1.7 }}>{m.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
