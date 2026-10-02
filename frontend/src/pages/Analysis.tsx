/* 数据分析 —— REQ-ANA-01/02：图表生成（image2） / 示例库 / 图表历史 / AI 解读 */
import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import Icon from '../components/Icon';
import { BarChart, HeatMap, LineChart } from '../components/charts';
import { Empty, Skeleton, Tabs, useToast } from '../components/ui';
import { TaskRunner } from '../components/TaskRunner';
import type { ChartItem } from '../types';

type Tab = 'generate' | 'library';

const ABLATION = [
  { label: 'up9-base', value: 0.6464 },
  { label: '+cross-attn', value: 0.6892 },
  { label: 'w/o AU', value: 0.5801 },
  { label: 'GraphAU', value: 0.81 },
  { label: 'AUFormer', value: 0.829 },
];
const TRAIN_CURVE = {
  train: Array.from({ length: 12 }, (_, i) => 0.32 + i * 0.05 + Math.sin(i) * 0.01),
  val: Array.from({ length: 12 }, (_, i) => 0.3 + i * 0.034 + Math.sin(i / 1.5) * 0.018),
  epochs: Array.from({ length: 12 }, (_, i) => `${(i + 1) * 6}`),
};
const CONFUSION = {
  labels: ['happy', 'surprise', 'disgust', 'repression', 'others'],
  matrix: [
    [78, 6, 4, 5, 7],
    [10, 74, 5, 4, 7],
    [8, 7, 62, 9, 14],
    [7, 6, 11, 58, 18],
    [6, 5, 10, 12, 67],
  ],
};

export default function Analysis() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('generate');
  const [prompt, setPrompt] = useState('各消融配置在 CASME II 上的 UF1 对比柱状图，学术配色，带误差棒');
  const [chartKind, setChartKind] = useState<'bar' | 'line' | 'heatmap'>('bar');
  const [templates, setTemplates] = useState<any[]>([]);
  const [charts, setCharts] = useState<ChartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [current, setCurrent] = useState<ChartItem | null>(null);

  const loadData = useCallback(async () => {
    try {
      const r = await api<{ items: ChartItem[]; templates: any[] }>('/charts');
      setTemplates(r.templates || []);
      setCharts(r.items || []);
      if (r.items?.length) setCurrent(r.items[0]);
    } catch (err: any) {
      toast(err.message || '加载图表数据失败', 'err');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const generate = async () => {
    if (!prompt.trim()) return toast('请输入图表提示词', 'info');
    try {
      const r = await api<{ task_id: string }>('/charts/generate', {
        method: 'POST',
        body: {
          prompt,
          template_id: chartKind === 'bar' ? 'tpl2' : chartKind === 'line' ? 'tpl3' : 'tpl4',
        },
      });
      setTask(r.task_id);
    } catch (err: any) {
      toast(err.message || '发起生成任务失败', 'err');
    }
  };

  const analyzeChart = async () => {
    if (!current) return;
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const res = await api(`/charts/${current.id}/analyze`, { method: 'POST', body: {} });
      setAnalysis(res);
      toast('AI 解读完成（Vision 多模态分析）');
    } catch (err: any) {
      toast(err.message || '解读图表失败', 'err');
    } finally {
      setAnalyzing(false);
    }
  };

  const renderChart = useCallback((kind: string, spec?: any) => {
    if (kind === 'line') {
      return (
        <LineChart
          labels={TRAIN_CURVE.epochs}
          series={[
            { name: 'train UF1', data: TRAIN_CURVE.train },
            { name: 'val UF1', data: TRAIN_CURVE.val, color: '#c2762b' },
          ]}
          yFormat={(v) => v.toFixed(2)}
        />
      );
    }
    if (kind === 'heatmap') {
      return <HeatMap matrix={CONFUSION.matrix} labels={CONFUSION.labels} />;
    }
    return (
      <BarChart
        data={spec?.series?.length ? spec.series : ABLATION}
        max={1}
        format={(v) => v.toFixed(3)}
      />
    );
  }, []);

  if (loading) {
    return (
      <div className="page">
        <div className="card card-pad">
          <Skeleton lines={6} h={42} />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <Tabs
        active={tab}
        onChange={(k) => setTab(k as Tab)}
        tabs={[
          { key: 'generate', label: <><Icon name="spark" size={14} />图表生成与解读</> },
          { key: 'library', label: <><Icon name="layers" size={14} />示例图表库 / 历史</> },
        ]}
      />

      {tab === 'generate' && (
        <div
          className="anim-in grid grid-2"
          style={{
            gridTemplateColumns: 'minmax(300px, 1fr) minmax(340px, 1.4fr)',
            alignItems: 'start',
          }}
        >
          {/* 左：生成入口 */}
          <div className="col g-2">
            <div className="card card-pad">
              <div className="card-title mb-2">
                <Icon name="spark" size={15} />科研图表生成
              </div>
              <div className="seg mb-2" style={{ display: 'flex' }} role="tablist" aria-label="图表类型">
                <button
                  type="button"
                  className={`seg-btn grow ${chartKind === 'bar' ? 'active' : ''}`}
                  onClick={() => setChartKind('bar')}
                  aria-label="柱状图"
                >
                  柱状图
                </button>
                <button
                  type="button"
                  className={`seg-btn grow ${chartKind === 'line' ? 'active' : ''}`}
                  onClick={() => setChartKind('line')}
                  aria-label="曲线图"
                >
                  曲线图
                </button>
                <button
                  type="button"
                  className={`seg-btn grow ${chartKind === 'heatmap' ? 'active' : ''}`}
                  onClick={() => setChartKind('heatmap')}
                  aria-label="混淆矩阵"
                >
                  混淆矩阵
                </button>
              </div>
              <textarea
                className="textarea"
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="描述你想要的图表，如：各消融配置的 UF1 对比…"
                aria-label="图表生成提示词"
              />
              <button
                type="button"
                className="btn btn-primary btn-block mt-2"
                onClick={generate}
                aria-label="执行 image2 生成图表"
              >
                <Icon name="zap" size={14} />image2 生成图表
              </button>
              <div className="text-xs text-muted mt-2">
                双通道：「生成式绘图」（image2 模型）+「数据驱动绘图」（粘贴数据自动绑定）
              </div>
            </div>

            <div className="card card-pad">
              <div className="card-title mb-2">
                <Icon name="layers" size={15} />模板参考
              </div>
              <div className="grid grid-2" style={{ gap: 8 }}>
                {templates.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      padding: '9px 11px',
                      borderRadius: 10,
                      border: '1px solid var(--line)',
                      cursor: 'pointer',
                      transition: 'all .15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--brand)';
                      e.currentTarget.style.background = 'var(--brand-softer)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--line)';
                      e.currentTarget.style.background = 'transparent';
                    }}
                    onClick={() =>
                      setPrompt(
                        `使用「${t.name}」模板：${t.desc}。我的实验数据是 up9 系列 UF1 对比。`
                      )
                    }
                    role="button"
                    tabIndex={0}
                    aria-label={`选择模板: ${t.name}`}
                  >
                    <div className="text-small fw-bold">{t.name}</div>
                    <div className="text-xs text-muted">{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右：图表 + 解读 */}
          <div className="col g-2">
            <div className="card card-pad">
              <div className="row-between mb-2">
                <div className="card-title">
                  <Icon name="chart" size={15} />
                  {current?.title || 'UF1 消融对比'}
                </div>
                <button
                  type="button"
                  className="btn btn-accent btn-sm"
                  onClick={analyzeChart}
                  disabled={!current || analyzing}
                  aria-label="AI 解读此图"
                >
                  {analyzing ? <span className="spinner" /> : <Icon name="eye" size={13} />}
                  AI 解读此图
                </button>
              </div>
              {renderChart(chartKind, current?.svg_spec)}
            </div>

            {analysis && (
              <div
                className="card card-pad anim-pop"
                style={{
                  background: 'var(--brand-softer)',
                  borderColor: 'var(--brand-soft)',
                }}
              >
                <div className="card-title mb-2">
                  <Icon name="eye" size={15} />AI 图表解读（多模态 Vision）
                </div>
                <div className="kv">
                  <span className="kv-k">趋势</span>
                  <span className="kv-v">{analysis.trend}</span>
                </div>
                <div className="kv">
                  <span className="kv-k">异常</span>
                  <span className="kv-v">{analysis.anomalies}</span>
                </div>
                <div className="kv">
                  <span className="kv-k">下一步建议</span>
                  <span className="kv-v">
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {analysis.suggestions?.map((s: string) => (
                        <li key={s} className="text-small" style={{ padding: '1px 0' }}>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </span>
                </div>
              </div>
            )}

            {charts.length > 0 && (
              <div className="card card-pad">
                <div className="card-title mb-2">
                  <Icon name="history" size={15} />最近生成
                </div>
                {charts.map((c) => (
                  <div
                    key={c.id}
                    className="kv"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setCurrent(c);
                      setAnalysis(null);
                      toast(`已切换到「${c.title}」`);
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`切换到图表: ${c.title}`}
                  >
                    <span className="kv-v">{c.title}</span>
                    <span className="text-xs text-muted">{c.created_at?.slice(0, 10)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'library' && (
        <div className="anim-in grid grid-3 stagger">
          {templates.map((t) => (
            <div
              key={t.id}
              className="card card-pad card-hover"
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setTab('generate');
                setChartKind(
                  t.name.includes('曲线') ? 'line' : t.name.includes('混淆') ? 'heatmap' : 'bar'
                );
                toast(`已套用模板「${t.name}」`);
              }}
              role="button"
              tabIndex={0}
              aria-label={`套用模板: ${t.name}`}
            >
              <div className="row-between mb-2">
                <div className="fw-bold text-small">{t.name}</div>
                {t.tags?.map((tg: string) => (
                  <span key={tg} className="tag tag-outline">
                    {tg}
                  </span>
                ))}
              </div>
              <div className="text-xs text-muted">{t.desc}</div>
              <div
                style={{
                  marginTop: 10,
                  height: 90,
                  background: 'var(--bg-deep)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--muted)',
                }}
              >
                <Icon name="chart" size={26} />
              </div>
            </div>
          ))}
          {charts.length === 0 && templates.length === 0 && (
            <Empty icon="chart" text="暂无图表" />
          )}
        </div>
      )}

      <TaskRunner
        taskId={task}
        title="image2 图表生成"
        onClose={() => {
          setTask(null);
          api<{ items: ChartItem[] }>('/charts').then((r) => {
            setCharts(r.items || []);
            if (r.items?.length) setCurrent(r.items[0]);
          });
        }}
        onDone={() => {}}
      />
    </div>
  );
}
