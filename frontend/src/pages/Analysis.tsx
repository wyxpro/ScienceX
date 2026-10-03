/* 数据分析 —— REQ-ANA-01/02：图表生成（科研图工作台） / 示例图表库 · 历史 */
import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import Icon from '../components/Icon';
import { Empty, Skeleton, Tabs, useToast } from '../components/ui';
import FigureStudio from './analysis/FigureStudio';
import type { ChartItem } from '../types';

type Tab = 'figure' | 'library';

export default function Analysis() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('figure');
  const [templates, setTemplates] = useState<any[]>([]);
  const [charts, setCharts] = useState<ChartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const r = await api<{ items: ChartItem[]; templates: any[] }>('/charts');
      setTemplates(r.templates || []);
      setCharts(r.items || []);
    } catch (err: any) {
      toast(err.message || '加载图表数据失败', 'err');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
          { key: 'figure', label: <><Icon name="spark" size={14} />图表生成</> },
          { key: 'library', label: <><Icon name="layers" size={14} />示例图表库 / 历史</> },
        ]}
      />

      {tab === 'figure' && <FigureStudio />}

      {tab === 'library' && (
        <div className="anim-in grid grid-3 stagger">
          {templates.map((t) => (
            <div
              key={t.id}
              className="card card-pad card-hover"
              style={{ cursor: 'pointer' }}
              onClick={() => toast(`已查看模板「${t.name}」，前往「图表生成」套用`)}
              role="button"
              tabIndex={0}
              aria-label={`查看模板: ${t.name}`}
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
          {charts.map((c) => (
            <div key={c.id} className="card card-pad">
              <div className="row-between mb-2">
                <div className="fw-bold text-small">{c.title}</div>
                <span className="text-xs text-muted">{c.created_at?.slice(0, 10)}</span>
              </div>
              <div className="text-xs text-muted">历史生成记录</div>
            </div>
          ))}
          {charts.length === 0 && templates.length === 0 && <Empty icon="chart" text="暂无图表" />}
        </div>
      )}
    </div>
  );
}
