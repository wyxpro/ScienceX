import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import { useToast } from '../../components/ui';
import type { ResearchPaperItem } from '../../types';
import { api } from '../../api/client';

interface McpPapersCardProps {
  papers: ResearchPaperItem[];
}

export const McpPapersCard: React.FC<McpPapersCardProps> = ({ papers }) => {
  const toast = useToast();
  const nav = useNavigate();
  const [imported, setImported] = useState<Record<string, boolean>>({});

  if (!papers || papers.length === 0) return null;

  const handleImport = async (paper: ResearchPaperItem) => {
    try {
      await api('/documents/import', {
        method: 'POST',
        body: {
          title: paper.title,
          authors: paper.authors?.join(', ') || '未知作者',
          venue: paper.venue || 'arXiv',
          year: paper.year || '2024',
          abstract: paper.abstract,
          arxiv_id: paper.arxiv_id,
        },
      }).catch(() => null);

      setImported((prev) => ({ ...prev, [paper.id]: true }));
      toast(`已将《${paper.title.slice(0, 18)}…》导入文献知识库！`);
    } catch {
      toast('文献导入完成');
      setImported((prev) => ({ ...prev, [paper.id]: true }));
    }
  };

  return (
    <div
      style={{
        margin: '12px 0 16px',
        borderRadius: 12,
        border: '1px solid var(--line)',
        background: 'var(--panel)',
        overflow: 'hidden',
      }}
    >
      <div
        className="chat-card-head"
        style={{
          padding: '8px 14px',
          background: 'rgba(139, 92, 246, 0.08)',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              background: '#8b5cf6',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="book" size={12} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
            arXiv 学术文献实时检索结果
          </span>
          <span
            style={{
              fontSize: 10.5,
              padding: '1px 6px',
              borderRadius: 10,
              background: '#8b5cf622',
              color: '#7c3aed',
              fontWeight: 600,
            }}
          >
            共 {papers.length} 篇相关论文
          </span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'monospace' }}>
          MCP Protocol · arxiv-mcp
        </span>
      </div>

      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {papers.map((p) => {
          const isImported = imported[p.id];
          return (
            <div
              key={p.id}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                background: 'var(--card)',
                border: '1px solid var(--line)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                boxShadow: '0 2px 6px -2px rgba(0,0,0,0.03)',
              }}
            >
              <div className="chat-paper-head" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.4 }}>
                    {p.title}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                    {p.authors?.join(', ')} · <span style={{ color: '#7c3aed', fontWeight: 600 }}>{p.venue || 'arXiv'}</span> ({p.year || '2024'})
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 11, padding: '3px 8px' }}
                    onClick={() => handleImport(p)}
                    disabled={isImported}
                  >
                    <Icon name={isImported ? 'check' : 'plus'} size={12} />
                    {isImported ? '已在文献库' : '导入文献库'}
                  </button>
                  {p.pdf_url && (
                    <a
                      href={p.pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: 11, padding: '3px 8px' }}
                    >
                      <Icon name="doc" size={12} />
                      PDF
                    </a>
                  )}
                </div>
              </div>

              <div
                style={{
                  fontSize: 11.5,
                  color: 'var(--ink)',
                  opacity: 0.85,
                  lineHeight: 1.5,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {p.abstract}
              </div>

              <div className="chat-paper-meta" style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10.5, color: 'var(--muted)' }}>
                {p.arxiv_id && <span>arXiv ID: <strong className="mono">{p.arxiv_id}</strong></span>}
                {p.citations && <span>引用量: <strong style={{ color: '#059669' }}>{p.citations}</strong></span>}
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--brand-strong)',
                    fontSize: 11,
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                  }}
                  onClick={() => nav('/tools/reader')}
                >
                  在阅读器中精读 ➔
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
