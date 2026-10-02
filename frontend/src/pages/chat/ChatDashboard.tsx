import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import { Progress } from '../../components/ui';

interface DashboardData {
  project?: {
    name: string;
    progress?: { topic?: number; literature?: number; experiment?: number; analysis?: number };
  };
  recent_outputs?: Array<{
    id: string;
    type: string;
    title: string;
    meta: string;
    ref?: string;
  }>;
  papers_daily?: {
    items?: Array<{
      id: string;
      title: string;
      venue: string;
      reason: string;
      hot: number;
    }>;
  };
}

interface ChatDashboardProps {
  showDash: boolean;
  onToggleDash: () => void;
  dashboard: DashboardData;
}

export const ChatDashboard: React.FC<ChatDashboardProps> = ({
  showDash,
  onToggleDash,
  dashboard,
}) => {
  const nav = useNavigate();

  return (
    <div style={{ marginTop: 6, marginBottom: 20 }}>
      <div className="row-between mb-3 items-center" style={{ padding: '0 2px' }}>
        <div className="row g-2 items-center">
          <span style={{ color: 'var(--brand)', display: 'inline-flex' }}>
            <Icon name="gauge" size={16} />
          </span>
          <span className="fw-bold" style={{ fontSize: 15 }}>
            项目看板与科研动态
          </span>
          <span
            className="tag"
            style={{
              background: 'var(--brand-soft)',
              color: 'var(--brand-strong)',
              fontSize: 11.5,
            }}
          >
            {dashboard?.project?.name || '微表情识别（MER）研究'}
          </span>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={onToggleDash}
          aria-expanded={showDash}
          aria-label={showDash ? '收起看板' : '展开看板'}
        >
          <Icon name={showDash ? 'chevronDown' : 'chevronRight'} size={13} />
          {showDash ? '收起看板' : '展开看板'}
        </button>
      </div>

      {showDash && (
        <div className="grid grid-3 stagger" style={{ gap: 16 }}>
          {/* 卡片 1：项目进度看板 */}
          <div className="card card-pad card-hover" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="row-between items-center mb-1">
              <div className="card-title" style={{ margin: 0 }}>
                <Icon name="gauge" size={15} /> 项目进度看板
              </div>
              <button
                className="btn btn-ghost btn-xs text-xs"
                onClick={() => nav('/projects')}
                title="查看全部项目"
                aria-label="查看项目进度详情"
              >
                详情 <Icon name="arrowRight" size={11} />
              </button>
            </div>
            <div
              className="text-small text-muted"
              style={{ fontWeight: 600, color: 'var(--ink)' }}
            >
              {dashboard?.project?.name || '微表情识别（MER）研究'}
            </div>

            <div className="mt-3 col g-2 grow" style={{ justifyContent: 'center' }}>
              {[
                ['选题', dashboard?.project?.progress?.topic ?? 100],
                ['文献', dashboard?.project?.progress?.literature ?? 78],
                ['实验', dashboard?.project?.progress?.experiment ?? 55],
                ['分析', dashboard?.project?.progress?.analysis ?? 40],
              ].map(([label, val]) => (
                <div key={label as string} style={{ padding: '3px 0' }}>
                  <div className="row-between text-small" style={{ marginBottom: 3 }}>
                    <span className="fw-bold">{label}</span>
                    <span
                      className="mono fw-bold"
                      style={{ color: Number(val) === 100 ? 'var(--brand)' : 'var(--ink)' }}
                    >
                      {val}%
                    </span>
                  </div>
                  <Progress value={Number(val)} amber={Number(val) < 50 && Number(val) > 0} />
                </div>
              ))}
            </div>
          </div>

          {/* 卡片 2：最近产出 */}
          <div className="card card-pad card-hover" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="row-between items-center mb-1">
              <div className="card-title" style={{ margin: 0 }}>
                <Icon name="clock" size={15} /> 最近产出
              </div>
              <span
                className="tag"
                style={{ background: 'var(--bg-deep)', color: 'var(--muted)', fontSize: 11 }}
              >
                4 项沉淀
              </span>
            </div>
            <div className="text-small text-muted">科研资产自动化版本沉淀</div>

            <div className="mt-2 col g-1 grow" style={{ justifyContent: 'center' }}>
              {(
                dashboard?.recent_outputs || [
                  { id: 'ro1', type: 'chart', title: '消融实验 UF1 对比', meta: 'ch1 · 3天前', ref: '/tools/analysis' },
                  { id: 'ro2', type: 'doc', title: '七段式总结 · AUFormer (MM 24)', meta: 'd2 · 5天前', ref: '/tools/reader' },
                  { id: 'ro3', type: 'deck', title: '组会汇报 · up9 实验进展', meta: '12页 pptx · 5天前', ref: '/features/meeting' },
                  { id: 'ro4', type: 'report', title: '模拟审稿报告 #rv1', meta: '大修 · 2天前', ref: '/features/review' },
                ]
              )
                .slice(0, 4)
                .map((o) => (
                  <div
                    key={o.id}
                    className="row g-2 text-small items-center"
                    style={{
                      padding: '7px 9px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'background .15s',
                    }}
                    onClick={() => o.ref && nav(o.ref)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--brand-softer)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ color: 'var(--brand)', display: 'inline-flex' }}>
                      <Icon
                        name={
                          o.type === 'chart'
                            ? 'chart'
                            : o.type === 'deck'
                            ? 'layers'
                            : o.type === 'report'
                            ? 'award'
                            : 'doc'
                        }
                        size={14}
                      />
                    </span>
                    <span className="ellipsis grow fw-bold" style={{ fontSize: 12.5 }}>
                      {o.title}
                    </span>
                    <span className="text-xs text-muted mono" style={{ flexShrink: 0 }}>
                      {o.meta}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* 卡片 3：今日文献速递 */}
          <div className="card card-pad card-hover" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="row-between items-center mb-1">
              <div className="card-title" style={{ margin: 0 }}>
                <Icon name="mail" size={15} /> 今日文献速递
              </div>
              <button
                className="btn btn-ghost btn-xs text-xs"
                onClick={() => nav('/tools/reader')}
                title="前往文献阅读"
                aria-label="阅读今日文献速递"
              >
                阅读 <Icon name="arrowRight" size={11} />
              </button>
            </div>
            <div className="text-small text-muted">算法匹配与阅读推荐</div>

            <div className="mt-2 col g-2 grow" style={{ justifyContent: 'center' }}>
              {(
                dashboard?.papers_daily?.items || [
                  { id: 'pd4', title: 'METrack: Real-time Micro-expression Spotting in Long Videos', venue: 'arXiv', reason: '匹配「微表情识别」方向', hot: 4 },
                  { id: 'pd5', title: 'Rethinking Evaluation Protocols in MER: A Reproducibility Study', venue: 'arXiv', reason: '与你阅读的综述相关', hot: 5 },
                ]
              ).map((p) => (
                <div
                  key={p.id}
                  onClick={() => nav('/tools/reader')}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: 'var(--brand-softer)',
                    cursor: 'pointer',
                    transition: 'transform .15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
                >
                  <div
                    className="text-small fw-bold clamp2"
                    style={{ lineHeight: 1.35, color: 'var(--ink)' }}
                  >
                    {p.title}
                  </div>
                  <div className="row-between text-xs mt-1" style={{ color: 'var(--muted)' }}>
                    <span>
                      {p.venue} · {p.reason}
                    </span>
                    <span style={{ color: 'var(--gold)', letterSpacing: 1 }}>
                      {'★'.repeat(p.hot || 4)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
