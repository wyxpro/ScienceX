/* 选题灵感 —— REQ-LIT-01/02：多源检索 / 选题推荐 / 可行性评估 / 开题报告 / 综述生成 */
import { useState } from 'react';
import { api } from '../api/client';
import Icon from '../components/Icon';
import { MetricBar } from '../components/charts';
import { Empty, Progress, ScoreRing, Skeleton, Tabs, Tag, useToast } from '../components/ui';
import { TaskRunner } from '../components/TaskRunner';

type Tab = 'search' | 'recommend' | 'feasibility' | 'proposal' | 'review';

export default function Topic() {
  const [tab, setTab] = useState<Tab>('search');
  const toast = useToast();

  /* 检索 */
  const [query, setQuery] = useState('微表情识别 Transformer');
  const [sources, setSources] = useState<string[]>(['arXiv', 'OpenAlex', 'Semantic Scholar']);
  const [hasCode, setHasCode] = useState(false);
  const [yearFrom, setYearFrom] = useState(2020);
  const [results, setResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);
  const ALL_SOURCES = ['arXiv', 'OpenAlex', 'Semantic Scholar', 'PubMed', '中文库'];

  const search = async () => {
    if (!query.trim()) return toast('请输入检索关键词', 'info');
    setSearching(true); setResults(null);
    try {
      const r = await api<{ items: any[]; dedup_removed: number }>('/literature/search', { method: 'POST', body: { query, sources, year_range: [yearFrom, 2026], has_code: hasCode } });
      setResults(r.items);
      toast(`检索完成：${r.items.length} 篇，去重移除 ${r.dedup_removed} 条`);
    } finally { setSearching(false); }
  };

  /* 推荐 */
  const [tags, setTags] = useState<string[]>(['微表情识别', 'Transformer', 'AU 先验']);
  const [tagInput, setTagInput] = useState('');
  const [topics, setTopics] = useState<any[] | null>(null);
  const [recommending, setRecommending] = useState(false);
  const recommend = async () => {
    setRecommending(true); setTopics(null);
    try {
      const r = await api<{ items: any[] }>('/topic/recommend', { method: 'POST', body: { tags } });
      setTopics(r.items);
    } finally { setRecommending(false); }
  };

  /* 可行性 */
  const [topicDesc, setTopicDesc] = useState('将 AU 先验通过跨层交互注入 Transformer 主干，用于微表情识别，目标投 ACM MM。');
  const [feas, setFeas] = useState<any | null>(null);
  const [feasLoading, setFeasLoading] = useState(false);
  const evaluate = async () => {
    setFeasLoading(true); setFeas(null);
    try { setFeas(await api('/topic/feasibility', { method: 'POST', body: { topic_desc: topicDesc } })); }
    finally { setFeasLoading(false); }
  };

  /* 开题报告 / 综述：异步任务 */
  const [taskInfo, setTaskInfo] = useState<{ id: string; title: string } | null>(null);
  const [proposalTopic, setProposalTopic] = useState('跨层 AU 交互的微表情识别研究');
  const [reviewTopic, setReviewTopic] = useState('微表情识别');

  const runProposal = async () => {
    const r = await api<{ task_id: string }>('/topic/proposal', { method: 'POST', body: { topic: proposalTopic } });
    setTaskInfo({ id: r.task_id, title: '生成开题报告' });
  };
  const runReview = async () => {
    const r = await api<{ task_id: string }>('/literature/review', { method: 'POST', body: { topic: reviewTopic, range: [2020, 2026] } });
    setTaskInfo({ id: r.task_id, title: '生成文献综述' });
  };

  return (
    <div className="page">
      <Tabs
        active={tab} onChange={(k) => setTab(k as Tab)}
        tabs={[
          { key: 'search', label: <><Icon name="search" size={14} />文献检索</> },
          { key: 'recommend', label: <><Icon name="bulb" size={14} />选题推荐</> },
          { key: 'feasibility', label: <><Icon name="target" size={14} />可行性评估</> },
          { key: 'proposal', label: <><Icon name="doc" size={14} />开题报告</> },
          { key: 'review', label: <><Icon name="book" size={14} />综述生成</> },
        ]}
      />

      {/* ===== 文献检索 ===== */}
      {tab === 'search' && (
        <div className="anim-in">
          <div className="card card-pad mb-3">
            <div className="row g-2 wrap">
              <input className="input grow" style={{ minWidth: 220 }} value={query} onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="输入关键词，如：微表情识别 / AU prior / optical flow" />
              <select className="select" style={{ width: 110 }} value={yearFrom} onChange={(e) => setYearFrom(+e.target.value)}>
                {[2020, 2021, 2022, 2023, 2024, 2025].map((y) => <option key={y} value={y}>{y}-2026</option>)}
              </select>
              <button className={`btn ${hasCode ? 'btn-soft' : 'btn-ghost'}`} onClick={() => setHasCode((v) => !v)}>
                <Icon name="branch" size={14} />{hasCode ? '仅看有代码' : '全部论文'}
              </button>
              <button className="btn btn-primary" onClick={search} disabled={searching}>
                {searching ? <span className="spinner" /> : <Icon name="search" size={14} />}检索
              </button>
            </div>
            <div className="row g-1 wrap mt-2">
              {ALL_SOURCES.map((s) => (
                <button key={s} className={`tag ${sources.includes(s) ? 'tag-green' : 'tag-gray'}`} style={{ cursor: 'pointer', border: 'none' }}
                  onClick={() => setSources((x) => x.includes(s) ? x.filter((i) => i !== s) : [...x, s])}>
                  {sources.includes(s) && <Icon name="check" size={11} />}{s}
                </button>
              ))}
              <span className="text-xs text-muted" style={{ marginLeft: 4 }}>多源聚合 · 语义去重 · 相关性排序</span>
            </div>
          </div>

          {searching && <div className="card card-pad"><Skeleton lines={5} /></div>}
          {results && results.length === 0 && <Empty icon="search" text="没有找到匹配的文献，试试更换关键词或扩大年份范围" />}
          <div className="col g-2 stagger">
            {results?.map((p: any) => (
              <div key={p.id} className="card card-pad card-hover">
                <div className="row-between wrap g-2">
                  <div className="grow" style={{ minWidth: 240 }}>
                    <div className="fw-bold" style={{ fontSize: 14.5 }}>{p.title}</div>
                    <div className="text-small text-muted mt-1">{p.authors} · <span className="text-serif">{p.venue}</span> {p.year} · 被引 {p.citations} · 相关性 {(p.relevance * 100).toFixed(0)}%</div>
                    <p className="text-small mt-2 clamp2" style={{ color: 'var(--ink-2)' }}>{p.abstract}</p>
                    <div className="row g-1 mt-2 wrap">
                      <Tag color="gray">{p.source}</Tag>
                      {p.has_code && <Tag color="green"><Icon name="branch" size={11} />开源代码</Tag>}
                      <Tag color="amber">DOI: {p.doi}</Tag>
                    </div>
                  </div>
                  <div className="col g-1">
                    <button className="btn btn-soft btn-sm" onClick={() => toast('已加入「文献阅读」待读清单', 'ok')}><Icon name="book" size={13} />去精读</button>
                    {p.has_code && <button className="btn btn-ghost btn-sm" onClick={() => window.open(`https://${p.code_url}`, '_blank')}><Icon name="link" size={13} />代码仓库</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== 选题推荐 ===== */}
      {tab === 'recommend' && (
        <div className="anim-in">
          <div className="card card-pad mb-3">
            <label className="field-label">我的研究兴趣标签（点击移除，回车添加）</label>
            <div className="row g-1 wrap mb-2">
              {tags.map((t) => (
                <span key={t} className="tag tag-green" style={{ cursor: 'pointer' }} onClick={() => setTags((x) => x.filter((i) => i !== t))}>
                  {t} <Icon name="x" size={11} />
                </span>
              ))}
              <input className="input" style={{ width: 160, padding: '3px 10px', fontSize: 12.5 }}
                placeholder="添加标签…" value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && tagInput.trim()) { setTags((x) => [...x, tagInput.trim()]); setTagInput(''); } }} />
            </div>
            <button className="btn btn-primary" onClick={recommend} disabled={recommending}>
              {recommending ? <span className="spinner" /> : <Icon name="spark" size={14} />}基于兴趣与前沿热点推荐
            </button>
          </div>
          {recommending && <div className="card card-pad"><Skeleton lines={4} /></div>}
          {topics && topics.length === 0 && <Empty icon="bulb" text="先添加几个研究兴趣标签吧" />}
          <div className="col g-2 stagger">
            {topics?.map((t: any, i: number) => (
              <div key={i} className="card card-pad card-hover">
                <div className="row g-3" style={{ alignItems: 'flex-start' }}>
                  <ScoreRing value={t.score} size={64} label="推荐度" />
                  <div className="grow" style={{ minWidth: 220 }}>
                    <div className="row g-2 wrap">
                      <span className="fw-bold" style={{ fontSize: 14.5 }}>{t.title}</span>
                      <Tag color={t.heat === 'high' ? 'red' : 'amber'}>{t.heat === 'high' ? '热点' : '稳定'}</Tag>
                    </div>
                    <p className="text-small mt-1" style={{ color: 'var(--ink-2)' }}>{t.reason}</p>
                    <div className="text-xs text-muted mt-1">风险：{t.risks.join(' · ')}</div>
                    <div className="row g-1 mt-2">
                      <button className="btn btn-soft btn-sm" onClick={() => { setTopicDesc(t.title); setTab('feasibility'); }}>
                        <Icon name="target" size={13} />可行性评估
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setProposalTopic(t.title); setTab('proposal'); }}>
                        <Icon name="doc" size={13} />生成开题报告
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== 可行性评估 ===== */}
      {tab === 'feasibility' && (
        <div className="anim-in grid grid-2" style={{ gridTemplateColumns: 'minmax(280px, 1fr) minmax(300px, 1.4fr)', alignItems: 'start' }}>
          <div className="card card-pad">
            <label className="field-label">选题描述</label>
            <textarea className="textarea" rows={7} value={topicDesc} onChange={(e) => setTopicDesc(e.target.value)} />
            <button className="btn btn-primary btn-block mt-2" onClick={evaluate} disabled={feasLoading}>
              {feasLoading ? <span className="spinner" /> : <Icon name="target" size={14} />}评估数据 / 算力 / 时间 / 创新性 / 发表前景
            </button>
            <div className="text-xs text-muted mt-2">LLM 评估 + 规则打分，输出五维评分与关键参考文献</div>
          </div>
          <div>
            {feasLoading && <div className="card card-pad"><Skeleton lines={6} /></div>}
            {feas && (
              <div className="card card-pad anim-pop">
                <div className="row g-3 mb-2">
                  <ScoreRing value={feas.overall} size={84} label="综合" />
                  <div className="grow">
                    <div className="fw-bold" style={{ fontSize: 15 }}>{feas.verdict}</div>
                    <div className="text-small text-muted mt-1 clamp2">选题：{feas.topic}</div>
                  </div>
                </div>
                {feas.dimensions.map((d: any) => (
                  <div key={d.name} className="mt-2">
                    <MetricBar label={d.name} value={d.score} />
                    <div className="text-xs text-muted" style={{ marginTop: 3 }}>{d.comment}</div>
                  </div>
                ))}
                <hr className="divider" />
                <div className="text-small text-muted">建议进一步阅读：
                  {feas.key_refs.map((r: string) => <span key={r} className="tag tag-outline" style={{ marginLeft: 6 }}>{r}</span>)}
                </div>
              </div>
            )}
            {!feasLoading && !feas && <Empty icon="target" text="输入选题描述，从五个维度评估可行性" />}
          </div>
        </div>
      )}

      {/* ===== 开题报告 ===== */}
      {tab === 'proposal' && (
        <div className="anim-in">
          <div className="card card-pad" style={{ maxWidth: 640 }}>
            <label className="field-label">选题名称</label>
            <input className="input mb-2" value={proposalTopic} onChange={(e) => setProposalTopic(e.target.value)} />
            <div className="text-small text-muted mb-2">将自动检索相关文献 → 生成大纲 → 撰写正文 → 导出 Word / PDF（异步任务，进度实时推送）</div>
            <button className="btn btn-primary" onClick={runProposal}><Icon name="doc" size={14} />一键生成开题报告</button>
          </div>
        </div>
      )}

      {/* ===== 综述生成 ===== */}
      {tab === 'review' && (
        <div className="anim-in">
          <div className="card card-pad" style={{ maxWidth: 640 }}>
            <label className="field-label">综述主题</label>
            <input className="input mb-2" value={reviewTopic} onChange={(e) => setReviewTopic(e.target.value)} />
            <div className="text-small text-muted mb-2">多源检索 → 去重筛选 → 要点提取 → 撰写带引用的综述草稿（约 6000 字）</div>
            <button className="btn btn-primary" onClick={runReview}><Icon name="book" size={14} />生成领域综述草稿</button>
          </div>
        </div>
      )}

      <TaskRunner taskId={taskInfo?.id || null} title={taskInfo?.title || ''} onClose={() => setTaskInfo(null)}
        onDone={(result) => { if (result?.content_preview) toast('草稿已生成，可在「我的项目」查看产出'); }} />
    </div>
  );
}
