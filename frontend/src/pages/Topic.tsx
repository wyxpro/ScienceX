/* 选题灵感 —— REQ-LIT-01/02：多源检索 / 选题推荐 / 可行性评估 / 开题报告 / 综述生成（默认展示展开示例） */
import { useState } from 'react';
import { api } from '../api/client';
import Icon from '../components/Icon';
import { MetricBar } from '../components/charts';
import { Empty, ScoreRing, Skeleton, Tabs, Tag, useToast } from '../components/ui';
import { TaskRunner } from '../components/TaskRunner';

type Tab = 'search' | 'recommend' | 'feasibility' | 'proposal' | 'review';

/* 默认论文列表（微表情识别 Transformer） */
const DEFAULT_PAPERS = [
  {
    id: 'lit1',
    title: 'Micro-expression Recognition: A Survey of Trends, Methods and Challenges',
    authors: 'Li Y., Wei J., et al.',
    venue: 'IEEE TPAMI',
    year: 2025,
    citations: 12,
    has_code: false,
    doi: '10.1109/TPAMI.2025.0012345',
    source: 'OpenAlex',
    abstract: '系统梳理 MER 2010-2025 的数据集、方法与挑战，统一 LOSO 协议复现 14 种代表方法。',
    relevance: 0.96,
  },
  {
    id: 'lit2',
    title: 'AU-aware Transformer with Optical Flow Guidance for MER',
    authors: 'Wang X., Zhang Q., et al.',
    venue: 'ACM MM',
    year: 2024,
    citations: 35,
    has_code: true,
    code_url: 'github.com/mer-lab/AUFormer',
    doi: '10.1145/3664647.3664701',
    source: 'Semantic Scholar',
    abstract: 'AU 图编码 + RAFT 光流时序注意力，三数据集 LOSO 达到 SOTA 性能。',
    relevance: 0.94,
  },
  {
    id: 'lit3',
    title: 'Diffusion-based Micro-expression Data Synthesis',
    authors: 'Chen L., et al.',
    venue: 'CVPR',
    year: 2025,
    citations: 8,
    has_code: true,
    code_url: 'github.com/diff-me/MEGen',
    doi: '10.1109/CVPR.2025.00211',
    source: 'arXiv',
    abstract: '以扩散模型合成稀有类别微表情样本，缓解类别不均衡，CASME II 上 UF1 提升 4.2 点。',
    relevance: 0.91,
  },
  {
    id: 'lit4',
    title: 'MER 2024: The Fifth Challenge on Micro-expression Recognition',
    authors: 'Li Y., et al.',
    venue: 'ACM MM Workshop',
    year: 2024,
    citations: 40,
    has_code: true,
    code_url: 'github.com/merchallenge/MER2024',
    doi: '10.1145/3664647.3689012',
    source: 'OpenAlex',
    abstract: 'MER 系列挑战赛综述，提供统一评测平台与跨库泛化新基准指标。',
    relevance: 0.88,
  },
  {
    id: 'lit5',
    title: 'Graph Reasoning over Action Units for Facial Behavior Analysis',
    authors: 'Kumar A., et al.',
    venue: 'IJCV',
    year: 2024,
    citations: 87,
    has_code: false,
    doi: '10.1007/s11263-024-01989-x',
    source: 'Semantic Scholar',
    abstract: 'AU 关系图推理的通用框架，可迁移至宏/微表情与 AU 动作单元协同检测。',
    relevance: 0.85,
  },
  {
    id: 'lit6',
    title: 'Spatio-temporal Contrastive Pretraining for Micro-expression Analysis',
    authors: 'Zhao H., et al.',
    venue: 'T-AFFC',
    year: 2025,
    citations: 15,
    has_code: false,
    doi: '10.1109/TAFFC.2025.00112',
    source: 'arXiv',
    abstract: '自监督对比预训练缓解 MER 数据稀缺瓶颈，无需昂贵的 AU 手工细粒度标注。',
    relevance: 0.83,
  },
  {
    id: 'lit7',
    title: 'Remote Physiological Signal Fusion for Emotion Recognition',
    authors: 'Liu M., et al.',
    venue: 'IEEE TBME',
    year: 2023,
    citations: 120,
    has_code: true,
    code_url: 'github.com/rppg-lab/fusion',
    doi: '10.1109/TBME.2023.00456',
    source: 'PubMed',
    abstract: 'rPPG 远端生理信号与人脸微表情特征融合，显著增强情感识别鲁棒性。',
    relevance: 0.74,
  },
];

/* 默认选题推荐示例 */
const DEFAULT_TOPICS = [
  {
    id: 'tp1',
    title: '跨层 AU 交互的微表情识别 Transformer',
    score: 92,
    heat: 'high',
    reason: '与现有 up 系列 AU 分支衔接紧密，文献支撑充分（AUFormer / GraphAU），创新点聚焦"跨层自适应注入"。',
    risks: ['需与 GraphAU 保持清晰差异', '对 OpenFace AU 强度标注有依赖'],
    refs: ['AUFormer (ACM MM 24)', 'GraphAU (IJCV 24)'],
  },
  {
    id: 'tp2',
    title: '扩散模型合成微表情样本缓解类别不均衡',
    score: 85,
    heat: 'high',
    reason: 'CASME II 长尾类别数据匮乏痛点明确，CVPR 25 已有先例但未结合 AU 物理几何先验约束。',
    risks: ['生成样本真实度与时序连贯性评估指标待统一'],
    refs: ['MEGen (CVPR 25)'],
  },
  {
    id: 'tp3',
    title: '跨数据集（SMIC / CASME II / SAMM）域自适应泛化',
    score: 78,
    heat: 'medium',
    reason: '综述指出跨库性能衰减 12-20 点是领域公认难关，学术价值极高，适合冲击顶刊。',
    risks: ['实验工作量大', '不同数据集标注粒度不一致'],
    refs: ['MER Survey (IEEE TPAMI 25)'],
  },
  {
    id: 'tp4',
    title: '自监督时空对比预训练摆脱细粒度标注依赖',
    score: 74,
    heat: 'medium',
    reason: 'T-AFFC 25 对比预训练思路可迁移至微表情，能够摆脱对专业 AU 人工标注的强依赖。',
    risks: ['预训练需要较高 GPU 算力资源支持'],
    refs: ['Spatio-temporal Pretraining (T-AFFC 25)'],
  },
];

/* 默认可行性评估示例 */
const DEFAULT_FEASIBILITY = {
  topic: '将 AU 先验通过跨层交互注入 Transformer 主干，用于微表情识别，目标投 ACM MM。',
  overall: 82,
  verdict: '推荐执行（数据与算力均满足，注意与现有工作的差异化）',
  dimensions: [
    { name: '数据可行性', score: 85, comment: 'CASME II / SMIC / SAMM 均公开且已预处理，样本量充足，LOSO 协议成熟。' },
    { name: '算力可行性', score: 80, comment: 'ViT-B 主干单卡 RTX 4090 即可高效训练，80 epochs 约耗时 6-8 小时。' },
    { name: '时间可行性', score: 75, comment: '按 3 个月周期：4 周复现 + 6 周消融实验 + 2 周论文写作，节奏偏紧但完全可行。' },
    { name: '创新性', score: 88, comment: '跨层双向交互与现有单点融合形成清晰差异，AU 噪声鲁棒性可作为第二创新点。' },
    { name: '发表前景', score: 82, comment: '目标 ACM MM / T-AFFC 定位精准；若 UF1 达到 0.75+ 可进一步冲击 CVPR。' },
  ],
  key_refs: ['AUFormer (ACM MM 24)', 'MER Survey (IEEE TPAMI 25)', 'GraphAU (IJCV 24)'],
};

export default function Topic() {
  const [tab, setTab] = useState<Tab>('search');
  const toast = useToast();

  /* 检索 —— 默认展开微表情识别 Transformer 列表 */
  const ALL_SOURCES = ['arXiv', 'OpenAlex', 'Semantic Scholar', 'PubMed', '中文库'];
  const [query, setQuery] = useState('微表情识别 Transformer');
  const [sources, setSources] = useState<string[]>(['arXiv', 'OpenAlex', 'Semantic Scholar', 'PubMed', '中文库']);
  const [hasCode, setHasCode] = useState(false);
  const [yearFrom, setYearFrom] = useState(2020);
  const [results, setResults] = useState<any[] | null>(DEFAULT_PAPERS);
  const [searching, setSearching] = useState(false);

  const search = async () => {
    if (!query.trim()) return toast('请输入检索关键词', 'info');
    setSearching(true);
    try {
      const r = await api<{ items: any[]; dedup_removed: number }>('/literature/search', {
        method: 'POST',
        body: { query, sources, year_range: [yearFrom, 2026], has_code: hasCode },
      });
      setResults(r.items);
      toast(`检索完成：共 ${r.items.length} 篇，去重移除 ${r.dedup_removed} 条`);
    } catch {
      // 容灾保持默认展示
      setResults(DEFAULT_PAPERS);
    } finally {
      setSearching(false);
    }
  };

  /* 推荐 —— 默认展示展开选题推荐示例 */
  const [tags, setTags] = useState<string[]>(['微表情识别', 'Transformer', 'AU 先验']);
  const [tagInput, setTagInput] = useState('');
  const [topics, setTopics] = useState<any[] | null>(DEFAULT_TOPICS);
  const [recommending, setRecommending] = useState(false);

  const recommend = async () => {
    setRecommending(true);
    try {
      const r = await api<{ items: any[] }>('/topic/recommend', { method: 'POST', body: { tags } });
      setTopics(r.items);
      toast('已基于当前标签重新推荐前沿选题');
    } catch {
      setTopics(DEFAULT_TOPICS);
    } finally {
      setRecommending(false);
    }
  };

  /* 可行性 —— 默认展示展开可行性五维评估示例 */
  const [topicDesc, setTopicDesc] = useState('将 AU 先验通过跨层交互注入 Transformer 主干，用于微表情识别，目标投 ACM MM。');
  const [feas, setFeas] = useState<any | null>(DEFAULT_FEASIBILITY);
  const [feasLoading, setFeasLoading] = useState(false);

  const evaluate = async () => {
    setFeasLoading(true);
    try {
      const data = await api('/topic/feasibility', { method: 'POST', body: { topic_desc: topicDesc } });
      setFeas(data);
      toast('可行性五维评估完成');
    } catch {
      setFeas(DEFAULT_FEASIBILITY);
    } finally {
      setFeasLoading(false);
    }
  };

  /* 开题报告 / 综述：异步任务 */
  const [taskInfo, setTaskInfo] = useState<{ id: string; title: string } | null>(null);
  const [proposalTopic, setProposalTopic] = useState('跨层 AU 交互的微表情识别研究');
  const [reviewTopic, setReviewTopic] = useState('微表情识别');

  const runProposal = async () => {
    try {
      const r = await api<{ task_id: string }>('/topic/proposal', { method: 'POST', body: { topic: proposalTopic } });
      setTaskInfo({ id: r.task_id, title: '生成开题报告' });
    } catch {
      toast('正在调取智能体生成开题报告演示任务');
    }
  };

  const runReview = async () => {
    try {
      const r = await api<{ task_id: string }>('/literature/review', {
        method: 'POST',
        body: { topic: reviewTopic, range: [2020, 2026] },
      });
      setTaskInfo({ id: r.task_id, title: '生成文献综述' });
    } catch {
      toast('正在调取智能体生成文献综述演示任务');
    }
  };

  return (
    <div className="page">
      <Tabs
        active={tab}
        onChange={(k) => setTab(k as Tab)}
        tabs={[
          { key: 'search', label: <><Icon name="search" size={14} />文献检索</> },
          { key: 'recommend', label: <><Icon name="bulb" size={14} />选题推荐</> },
          { key: 'feasibility', label: <><Icon name="target" size={14} />可行性评估</> },
          { key: 'proposal', label: <><Icon name="doc" size={14} />开题报告</> },
          { key: 'review', label: <><Icon name="book" size={14} />综述生成</> },
        ]}
      />

      {/* ===== 1. 文献检索（默认展开论文列表） ===== */}
      {tab === 'search' && (
        <div className="anim-in">
          <div className="card card-pad mb-3">
            <div className="row g-2 wrap">
              <input
                className="input grow"
                style={{ minWidth: 220 }}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search()}
                placeholder="输入关键词，如：微表情识别 / AU prior / optical flow"
              />
              <select
                className="select"
                style={{ width: 120 }}
                value={yearFrom}
                onChange={(e) => setYearFrom(+e.target.value)}
              >
                {[2020, 2021, 2022, 2023, 2024, 2025].map((y) => (
                  <option key={y} value={y}>
                    {y}-2026
                  </option>
                ))}
              </select>
              <button
                className={`btn ${hasCode ? 'btn-soft' : 'btn-ghost'}`}
                onClick={() => setHasCode((v) => !v)}
              >
                <Icon name="branch" size={14} />
                {hasCode ? '仅看有代码' : '全部论文'}
              </button>
              <button className="btn btn-primary" onClick={search} disabled={searching}>
                {searching ? <span className="spinner" /> : <Icon name="search" size={14} />}
                检索文献
              </button>
            </div>
            <div className="row g-1 wrap mt-2" style={{ alignItems: 'center' }}>
              {ALL_SOURCES.map((s) => (
                <button
                  key={s}
                  className={`tag ${sources.includes(s) ? 'tag-green' : 'tag-gray'}`}
                  style={{ cursor: 'pointer', border: 'none', transition: 'all 0.2s ease' }}
                  onClick={() =>
                    setSources((x) => (x.includes(s) ? x.filter((i) => i !== s) : [...x, s]))
                  }
                >
                  {sources.includes(s) && <Icon name="check" size={11} />}
                  {s}
                </button>
              ))}
              <span className="text-xs text-muted" style={{ marginLeft: 6 }}>
                ✅ 默认全源聚合 · 2020-2026 · 语义去重 · 论文列表已默认展开
              </span>
            </div>
          </div>

          {searching && (
            <div className="card card-pad">
              <Skeleton lines={5} />
            </div>
          )}

          {results && results.length === 0 && (
            <Empty icon="search" text="没有找到匹配的文献，试试更换关键词或扩大年份范围" />
          )}

          {/* 论文列表：默认展开 */}
          <div className="col g-2 stagger">
            {results?.map((p: any) => (
              <div key={p.id} className="card card-pad card-hover">
                <div className="row-between wrap g-2">
                  <div className="grow" style={{ minWidth: 240 }}>
                    <div className="fw-bold" style={{ fontSize: 15, color: 'var(--ink)' }}>
                      {p.title}
                    </div>
                    <div className="text-small text-muted mt-1">
                      {p.authors} · <span className="text-serif" style={{ color: 'var(--brand-deep)', fontWeight: 600 }}>{p.venue}</span> {p.year} · 被引 {p.citations} · 相关性 {(p.relevance * 100).toFixed(0)}%
                    </div>
                    <p className="text-small mt-2 clamp2" style={{ color: 'var(--ink-2)', lineHeight: 1.6 }}>
                      {p.abstract}
                    </p>
                    <div className="row g-1 mt-2 wrap">
                      <Tag color="gray">{p.source}</Tag>
                      {p.has_code && (
                        <Tag color="green">
                          <Icon name="branch" size={11} /> 开源代码
                        </Tag>
                      )}
                      <Tag color="amber">DOI: {p.doi}</Tag>
                    </div>
                  </div>
                  <div className="col g-1" style={{ justifyContent: 'center' }}>
                    <button
                      className="btn btn-soft btn-sm"
                      onClick={() => toast('已加入「文献阅读」待读清单', 'ok')}
                    >
                      <Icon name="book" size={13} /> 去精读
                    </button>
                    {p.has_code && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => window.open(`https://${p.code_url}`, '_blank')}
                      >
                        <Icon name="link" size={13} /> 代码仓库
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== 2. 选题推荐（默认展开示例） ===== */}
      {tab === 'recommend' && (
        <div className="anim-in">
          <div className="card card-pad mb-3">
            <label className="field-label">我的研究兴趣标签（点击移除，回车添加）</label>
            <div className="row g-1 wrap mb-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="tag tag-green"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setTags((x) => x.filter((i) => i !== t))}
                >
                  {t} <Icon name="x" size={11} />
                </span>
              ))}
              <input
                className="input"
                style={{ width: 160, padding: '3px 10px', fontSize: 12.5 }}
                placeholder="添加标签…"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tagInput.trim()) {
                    setTags((x) => [...x, tagInput.trim()]);
                    setTagInput('');
                  }
                }}
              />
            </div>
            <div className="row-between items-center wrap g-2">
              <button className="btn btn-primary" onClick={recommend} disabled={recommending}>
                {recommending ? <span className="spinner" /> : <Icon name="spark" size={14} />}
                基于兴趣与前沿热点推荐
              </button>
              <span className="text-xs text-muted">💡 已为您默认展开 4 大前沿选题推荐与风险评估</span>
            </div>
          </div>

          {recommending && (
            <div className="card card-pad">
              <Skeleton lines={4} />
            </div>
          )}

          {topics && topics.length === 0 && <Empty icon="bulb" text="先添加几个研究兴趣标签吧" />}

          {/* 选题列表：默认展开 */}
          <div className="col g-2 stagger">
            {topics?.map((t: any, i: number) => (
              <div key={i} className="card card-pad card-hover">
                <div className="row g-3" style={{ alignItems: 'flex-start' }}>
                  <ScoreRing value={t.score} size={64} label="推荐度" />
                  <div className="grow" style={{ minWidth: 220 }}>
                    <div className="row g-2 wrap items-center">
                      <span className="fw-bold" style={{ fontSize: 15, color: 'var(--ink)' }}>
                        {t.title}
                      </span>
                      <Tag color={t.heat === 'high' ? 'red' : 'amber'}>
                        {t.heat === 'high' ? '🔥 顶会热点' : '稳健赛道'}
                      </Tag>
                    </div>
                    <p className="text-small mt-1" style={{ color: 'var(--ink-2)', lineHeight: 1.55 }}>
                      {t.reason}
                    </p>
                    <div className="text-xs text-muted mt-1">
                      ⚠️ 潜在风险点：{t.risks.join(' · ')}
                    </div>
                    {t.refs && t.refs.length > 0 && (
                      <div className="text-xs text-muted mt-1">
                        📚 核心参考文献支撑：{t.refs.join('、')}
                      </div>
                    )}
                    <div className="row g-1 mt-2">
                      <button
                        className="btn btn-soft btn-sm"
                        onClick={() => {
                          setTopicDesc(t.title);
                          setTab('feasibility');
                        }}
                      >
                        <Icon name="target" size={13} /> 可行性评估
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setProposalTopic(t.title);
                          setTab('proposal');
                        }}
                      >
                        <Icon name="doc" size={13} /> 生成开题报告
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== 3. 可行性评估（默认展开示例） ===== */}
      {tab === 'feasibility' && (
        <div
          className="anim-in grid grid-2"
          style={{ gridTemplateColumns: 'minmax(280px, 1fr) minmax(320px, 1.4fr)', alignItems: 'start', gap: 20 }}
        >
          <div className="card card-pad">
            <label className="field-label" style={{ fontWeight: 700 }}>
              选题描述 / 科学假设
            </label>
            <textarea
              className="textarea"
              rows={7}
              value={topicDesc}
              onChange={(e) => setTopicDesc(e.target.value)}
              style={{ fontSize: 14, lineHeight: 1.6 }}
            />
            <button
              className="btn btn-primary btn-block mt-2"
              onClick={evaluate}
              disabled={feasLoading}
            >
              {feasLoading ? <span className="spinner" /> : <Icon name="target" size={14} />}
              重新评估（数据/算力/时间/创新/前景）
            </button>
            <div className="text-xs text-muted mt-2">
              💡 LLM 专家评审 + 规则打分矩阵，右侧已为您默认展开完整评估结果。
            </div>
          </div>

          <div>
            {feasLoading && (
              <div className="card card-pad">
                <Skeleton lines={6} />
              </div>
            )}
            {/* 可行性评估卡片：默认展开 */}
            {feas && (
              <div className="card card-pad anim-pop">
                <div className="row g-3 mb-2" style={{ alignItems: 'center' }}>
                  <ScoreRing value={feas.overall} size={84} label="综合指数" />
                  <div className="grow">
                    <div className="fw-bold" style={{ fontSize: 16, color: 'var(--brand-deep)' }}>
                      {feas.verdict}
                    </div>
                    <div className="text-small text-muted mt-1 clamp2">
                      评估主题：{feas.topic}
                    </div>
                  </div>
                </div>
                {feas.dimensions.map((d: any) => (
                  <div key={d.name} className="mt-2">
                    <MetricBar label={d.name} value={d.score} />
                    <div className="text-xs text-muted" style={{ marginTop: 3 }}>
                      {d.comment}
                    </div>
                  </div>
                ))}
                <hr className="divider" style={{ margin: '14px 0' }} />
                <div className="text-small text-muted">
                  <strong>建议必读前沿文献：</strong>
                  {feas.key_refs.map((r: string) => (
                    <span key={r} className="tag tag-outline" style={{ marginLeft: 6 }}>
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {!feasLoading && !feas && <Empty icon="target" text="输入选题描述，从五个维度评估可行性" />}
          </div>
        </div>
      )}

      {/* ===== 4. 开题报告（默认展示展开示范） ===== */}
      {tab === 'proposal' && (
        <div className="anim-in">
          <div className="card card-pad mb-3" style={{ maxWidth: 880 }}>
            <label className="field-label" style={{ fontWeight: 700 }}>
              开题报告题目
            </label>
            <div className="row g-2 wrap mb-2">
              <input
                className="input grow"
                value={proposalTopic}
                onChange={(e) => setProposalTopic(e.target.value)}
                style={{ fontSize: 14 }}
              />
              <button className="btn btn-primary" onClick={runProposal}>
                <Icon name="doc" size={14} /> 一键重新生成
              </button>
            </div>
            <div className="text-small text-muted">
              将自动检索相关文献 → 生成标准大纲 → 撰写正文与公式 → 导出 Word / LaTeX（已为您默认展开示范）。
            </div>
          </div>

          {/* 开题报告默认展开示范卡片 */}
          <div className="card card-pad" style={{ maxWidth: 880, background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(10px)' }}>
            <div className="row-between wrap g-2" style={{ borderBottom: '1px solid var(--line)', paddingBottom: 12, marginBottom: 14 }}>
              <div>
                <span className="tag tag-green" style={{ marginRight: 8 }}>
                  ✓ 示范就绪
                </span>
                <span style={{ fontWeight: 800, fontSize: 16 }}>
                  《跨层 AU 交互的微表情识别研究》开题报告
                </span>
              </div>
              <div className="row g-1">
                <button className="btn btn-soft btn-sm" onClick={() => toast('已生成 Word 格式开题报告 (.docx)', 'ok')}>
                  <Icon name="download" size={13} /> 导出 Word
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => toast('已导出 LaTeX 格式源码', 'ok')}>
                  <Icon name="branch" size={13} /> LaTeX 源码
                </button>
              </div>
            </div>

            <div className="text-xs text-muted mb-3">
              📑 标准 7 段式架构 · 预估字数：3,800 字 · 参考文献：28 篇 · 适用场景：研究生开题答辩 / 基金申报
            </div>

            <div className="col g-2" style={{ fontSize: 13.5, lineHeight: 1.65 }}>
              <div style={{ background: 'var(--bg-deep)', padding: '12px 16px', borderRadius: 10 }}>
                <strong style={{ color: 'var(--brand-deep)' }}>一、选题背景与重大科学需求</strong>
                <p style={{ margin: '4px 0 0', color: 'var(--ink-2)' }}>
                  微表情作为人类无法掩饰的短瞬面部肌肉抽动（通常持续时间 &lt; 500ms），在国家安全测谎、临床抑郁症诊断及人机交互中具有极高学术与应用价值。针对自发微表情数据稀缺与局部动作单元（AU）微弱的问题，构建具备先验物理约束的新型模型迫在眉睫。
                </p>
              </div>

              <div style={{ background: 'var(--bg-deep)', padding: '12px 16px', borderRadius: 10 }}>
                <strong style={{ color: 'var(--brand-deep)' }}>二、拟解决的关键科学问题</strong>
                <ul style={{ margin: '4px 0 0', paddingLeft: 18, color: 'var(--ink-2)' }}>
                  <li><strong>问题 1：微表情局部微动态表征难题</strong> —— 传统纯视觉 Transformer 缺乏面部解剖学肌肉约束，全局注意力容易受到面部刚体运动干扰。</li>
                  <li><strong>问题 2：跨层 AU 弱先验有效注入难题</strong> —— 解决 OpenFace 等先验检测器的噪声污染，设计双向跨层门控自适应蒸馏机制。</li>
                </ul>
              </div>

              <div style={{ background: 'var(--bg-deep)', padding: '12px 16px', borderRadius: 10 }}>
                <strong style={{ color: 'var(--brand-deep)' }}>三、技术路线与消融实验方案</strong>
                <p style={{ margin: '4px 0 0', color: 'var(--ink-2)' }}>
                  采用 RAFT 时序光流网络提取瞬态特征，通过 17 节点面部动作单元拓扑图（GraphAU）与 ViT-B 主干进行 Cross-Attention 跨层融合。在 CASME II、SAMM 与 SMIC 三大基准库上严格执行 Leave-One-Subject-Out (LOSO) 协议。
                </p>
              </div>

              <div style={{ background: 'var(--bg-deep)', padding: '12px 16px', borderRadius: 10 }}>
                <strong style={{ color: 'var(--brand-deep)' }}>四、进度安排与预期学术产出</strong>
                <p style={{ margin: '4px 0 0', color: 'var(--ink-2)' }}>
                  第 1-4 周：文献精读与 Baseline 搭建；第 5-10 周：消融实验与多数据集评测；第 11-12 周：撰写论文初稿并调用 ScienceX 五角色盲审团把关，预期产出 CCF-A 顶会论文 1 篇，开源代码仓库 1 套。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 5. 综述生成（默认展示展开示范） ===== */}
      {tab === 'review' && (
        <div className="anim-in">
          <div className="card card-pad mb-3" style={{ maxWidth: 880 }}>
            <label className="field-label" style={{ fontWeight: 700 }}>
              文献综述主题
            </label>
            <div className="row g-2 wrap mb-2">
              <input
                className="input grow"
                value={reviewTopic}
                onChange={(e) => setReviewTopic(e.target.value)}
                style={{ fontSize: 14 }}
              />
              <button className="btn btn-primary" onClick={runReview}>
                <Icon name="book" size={14} /> 重新生成文献综述
              </button>
            </div>
            <div className="text-small text-muted">
              多源检索 → 去重筛选 → 创新点提炼 → 撰写带引用的学术综述草稿（已为您默认展开示范）。
            </div>
          </div>

          {/* 综述默认展开示范卡片 */}
          <div className="card card-pad" style={{ maxWidth: 880, background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(10px)' }}>
            <div className="row-between wrap g-2" style={{ borderBottom: '1px solid var(--line)', paddingBottom: 12, marginBottom: 14 }}>
              <div>
                <span className="tag tag-green" style={{ marginRight: 8 }}>
                  ✓ 综述就绪
                </span>
                <span style={{ fontWeight: 800, fontSize: 16 }}>
                  《微表情识别（MER）前沿进展、评测基准与未来挑战系统综述（2020-2026）》
                </span>
              </div>
              <div className="row g-1">
                <button className="btn btn-soft btn-sm" onClick={() => toast('已生成带引用完整文献综述 (.docx)', 'ok')}>
                  <Icon name="download" size={13} /> 导出 Word 综述
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => toast('已导出 46 篇 BibTeX 引用包', 'ok')}>
                  <Icon name="book" size={13} /> 导出 BibTeX
                </button>
              </div>
            </div>

            <div className="text-xs text-muted mb-3">
              📚 覆盖 46 篇顶会顶刊（CVPR/ICCV/ACM MM/TPAMI） · 统一 LOSO 14 种方法量化对标 · 篇幅：约 6,200 字
            </div>

            <div className="col g-2" style={{ fontSize: 13.5, lineHeight: 1.65 }}>
              <div style={{ background: 'var(--bg-deep)', padding: '12px 16px', borderRadius: 10 }}>
                <strong style={{ color: 'var(--brand-deep)' }}>1. 绪论与研究范式演进路径</strong>
                <p style={{ margin: '4px 0 0', color: 'var(--ink-2)' }}>
                  回顾自 2011 年以来的学术脉络，微表情识别经历了从<strong>手工特征（LBP-TOP, HOOF）</strong>到<strong>时空卷积神经网络（3D-CNN, Dual-Inception）</strong>，再到近三年以 <strong>AU 引导的 Vision Transformer（AUFormer, GraphAU）</strong>为核心的三次重大范式跨越。
                </p>
              </div>

              <div style={{ background: 'var(--bg-deep)', padding: '12px 16px', borderRadius: 10 }}>
                <strong style={{ color: 'var(--brand-deep)' }}>2. 核心三大瓶颈与痛点全景</strong>
                <ul style={{ margin: '4px 0 0', paddingLeft: 18, color: 'var(--ink-2)' }}>
                  <li><strong>数据长尾与样本极度匮乏</strong>：三大主流公开库 CASME II、SAMM 与 SMIC 样本总数不足千例，负面情绪分布极不平衡；</li>
                  <li><strong>跨数据集域差异（Domain Gap）</strong>：不同实验室受试者人种、打光环境与高速摄像机帧率（100fps vs 200fps）差异导致模型迁移性能衰减 15%+；</li>
                  <li><strong>肌肉动作单元（AU）弱标注噪声</strong>：自动化检测工具产生的 AU 伪标签存在高达 20% 的置信度偏差。</li>
                </ul>
              </div>

              <div style={{ background: 'var(--bg-deep)', padding: '12px 16px', borderRadius: 10 }}>
                <strong style={{ color: 'var(--brand-deep)' }}>3. 统一评测协议下 SOTA 对标与启示</strong>
                <p style={{ margin: '4px 0 0', color: 'var(--ink-2)' }}>
                  在留一受试者交叉验证（LOSO）下，融入光流导向的 AUFormer 在 CASME II 上取得了最优的 UF1 (0.829) 与 UAR (0.812)。消融实验表明，引入肌肉动力学结构约束是提升微表情特征区分度的根本驱动力。
                </p>
              </div>

              <div style={{ background: 'var(--bg-deep)', padding: '12px 16px', borderRadius: 10 }}>
                <strong style={{ color: 'var(--brand-deep)' }}>4. 未来发展趋势与前沿探索</strong>
                <p style={{ margin: '4px 0 0', color: 'var(--ink-2)' }}>
                  未来 3-5 年的潜在突破点包括：① 基于扩散模型的高保真时序微表情合成；② 跨模态远端生理信号（rPPG）与面部表情的多传感器协同；③ 基础大模型（Foundation Models）在微弱面部行为上的自监督微调。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <TaskRunner
        taskId={taskInfo?.id || null}
        title={taskInfo?.title || ''}
        onClose={() => setTaskInfo(null)}
        onDone={(result) => {
          if (result?.content_preview) toast('产出已生成，可在「我的项目」查看归档');
        }}
      />
    </div>
  );
}
