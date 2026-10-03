import React, { useEffect, useRef, useState, useMemo } from 'react';
import Icon from './Icon';

export interface Graph3DNode {
  id: string;
  label: string;
  title?: string;
  authors?: string;
  venue?: string;
  year: number;
  citations: number;
  type: 'self' | 'cited' | 'citing' | 'foundation' | 'related';
  doi?: string;
}

export interface Graph3DEdge {
  source: string;
  target: string;
  relation?: string;
}

interface CitationGraph3DProps {
  nodes?: Graph3DNode[];
  edges?: Graph3DEdge[];
  currentTitle?: string;
}

const DEFAULT_NODES: Graph3DNode[] = [
  {
    id: 'center',
    label: '当前精读文献',
    title: 'Micro-expression Recognition: A Survey of Trends, Methods and Challenges',
    authors: 'Li Y., Wei J., et al.',
    venue: 'IEEE TPAMI 2025',
    year: 2025,
    citations: 28,
    type: 'self',
    doi: '10.1109/TPAMI.2025.0012345',
  },
  {
    id: 'f1',
    label: 'LBP-TOP (TPAMI 2007)',
    title: 'Dynamic Texture Recognition Using Local Binary Patterns with an Application to Facial Expressions',
    authors: 'Zhao G., Pietikainen M.',
    venue: 'IEEE TPAMI',
    year: 2007,
    citations: 3420,
    type: 'foundation',
    doi: '10.1109/TPAMI.2007.1110',
  },
  {
    id: 'f2',
    label: 'CASME II 基准 (FG 2014)',
    title: 'CASME II: An Improved Spontaneous Micro-Expression Database and Baseline Evaluation',
    authors: 'Yan W. J., et al.',
    venue: 'IEEE FG 2014',
    year: 2014,
    citations: 1890,
    type: 'foundation',
    doi: '10.1109/FG.2014.6954964',
  },
  {
    id: 'f3',
    label: 'Attention (NeurIPS 2017)',
    title: 'Attention Is All You Need',
    authors: 'Vaswani A., et al.',
    venue: 'NeurIPS 2017',
    year: 2017,
    citations: 98500,
    type: 'foundation',
    doi: '10.48550/arXiv.1706.03762',
  },
  {
    id: 'r1',
    label: 'GraphAU (CVPR 2023)',
    title: 'Facial Action Unit Detection with Directed Acyclic Graph Networks',
    authors: 'Luo C., Song P., et al.',
    venue: 'CVPR 2023',
    year: 2023,
    citations: 184,
    type: 'related',
    doi: '10.1109/CVPR.2023.00341',
  },
  {
    id: 'r2',
    label: 'AUFormer (TMM 2024)',
    title: 'AUFormer: Vision Transformer with Action Unit Prior for Facial Micro-Expression Recognition',
    authors: 'Zhang K., Liu X.',
    venue: 'IEEE TMM 2024',
    year: 2024,
    citations: 92,
    type: 'related',
    doi: '10.1109/TMM.2024.3312',
  },
  {
    id: 'r3',
    label: 'ME-Diff (ECCV 2024)',
    title: 'Latent Diffusion Models for Imbalanced Micro-expression Generation',
    authors: 'Wang H., et al.',
    venue: 'ECCV 2024',
    year: 2024,
    citations: 64,
    type: 'related',
    doi: '10.1007/978-3-031-72980',
  },
  {
    id: 'd1',
    label: 'MambaMER (2025)',
    title: 'State Space Models for Real-time Micro-expression Spotting in Long Clinical Videos',
    authors: 'Zhao H., Li Y.',
    venue: 'IEEE T-AFFC 2025',
    year: 2025,
    citations: 36,
    type: 'citing',
    doi: '10.1109/TAFFC.2025.0023',
  },
  {
    id: 'd2',
    label: 'Multimodal-MER (2025)',
    title: 'Cross-Modal EEG and Facial Micro-movement Fusion for Lie Detection',
    authors: 'Chen X., et al.',
    venue: 'ACM MM 2025',
    year: 2025,
    citations: 19,
    type: 'citing',
    doi: '10.1145/3688000.3688123',
  },
];

const DEFAULT_EDGES: Graph3DEdge[] = [
  { source: 'f1', target: 'center', relation: '时序纹理先验' },
  { source: 'f2', target: 'center', relation: '核心评测协议 LOSO' },
  { source: 'f3', target: 'center', relation: '自注意力机制' },
  { source: 'center', target: 'r1', relation: 'AU 解剖拓扑对比' },
  { source: 'center', target: 'r2', relation: '特征跨层注入基线' },
  { source: 'center', target: 'r3', relation: '解决长尾数据稀缺' },
  { source: 'center', target: 'd1', relation: '线性复杂度衍生' },
  { source: 'center', target: 'd2', relation: '多模态下游应用' },
];

const COLOR_MAP: Record<string, { bg: string; border: string; glow: string; label: string }> = {
  self: { bg: '#10b981', border: '#059669', glow: 'rgba(16, 185, 129, 0.5)', label: '当前精读文献' },
  foundation: { bg: '#6366f1', border: '#4f46e5', glow: 'rgba(99, 102, 241, 0.45)', label: '奠基经典文献' },
  related: { bg: '#f59e0b', border: '#d97706', glow: 'rgba(245, 158, 11, 0.45)', label: '同类前沿对比' },
  citing: { bg: '#06b6d4', border: '#0891b2', glow: 'rgba(6, 182, 212, 0.45)', label: '下游衍生发展' },
  cited: { bg: '#8b5cf6', border: '#7c3aed', glow: 'rgba(139, 92, 246, 0.45)', label: '引溯参考源' },
};

export function CitationGraph3D({ nodes = DEFAULT_NODES, edges = DEFAULT_EDGES, currentTitle }: CitationGraph3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /* 3D 视角与旋转 Ref（保证 60FPS 丝滑，无 React 频繁 re-render 损耗） */
  const rotXRef = useRef(-0.25);
  const rotYRef = useRef(0.45);
  const zoomRef = useRef(1);
  const autoRotateRef = useRef(true);
  const [autoRotateState, setAutoRotateState] = useState(true);

  const [hoveredNode, setHoveredNode] = useState<Graph3DNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<Graph3DNode | null>(null);
  const hoveredNodeRef = useRef<Graph3DNode | null>(null);
  const selectedNodeRef = useRef<Graph3DNode | null>(null);

  useEffect(() => {
    hoveredNodeRef.current = hoveredNode;
  }, [hoveredNode]);
  useEffect(() => {
    selectedNodeRef.current = selectedNode;
  }, [selectedNode]);

  /* 拖拽交互状态 */
  const isDragging = useRef(false);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animFrameId = useRef<number>(0);
  const particleOffset = useRef<number>(0);

  /* 构建 3D 球体坐标分布 */
  const effectiveNodes = useMemo(() => {
    if (!currentTitle) return nodes;
    return nodes.map((n) => (n.type === 'self' ? { ...n, title: currentTitle, label: n.label || '当前精读文献' } : n));
  }, [nodes, currentTitle]);

  const node3DPositions = useMemo(() => {
    const list = [...effectiveNodes];
    const map = new Map<string, { x: number; y: number; z: number }>();
    const R_BASE = 180;

    list.forEach((n, idx) => {
      if (n.type === 'self') {
        map.set(n.id, { x: 0, y: 0, z: 0 });
        return;
      }
      // 斐波那契球面均匀分布算法（严格 clamp 到 [-1, 1] 避免 Math.acos 返回 NaN）
      const count = Math.max(1, list.length - 1);
      const ratio = Math.max(-1, Math.min(1, 1 - (2 * (idx + 0.5)) / count));
      const phi = Math.acos(ratio);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (idx + 0.5);

      const r = n.type === 'foundation' ? R_BASE * 0.9 : n.type === 'citing' ? R_BASE * 1.15 : R_BASE;
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi) * 0.7; // 扁椭球空间视觉更好
      const z = r * Math.sin(phi) * Math.sin(theta);

      map.set(n.id, {
        x: Number.isFinite(x) ? x : 0,
        y: Number.isFinite(y) ? y : 0,
        z: Number.isFinite(z) ? z : 0,
      });
    });

    return map;
  }, [effectiveNodes]);

  /* 渲染循环 (60FPS Canvas 3D Perspective Projection) */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      // 自转推进
      if (autoRotateRef.current && !isDragging.current) {
        rotYRef.current += 0.0035;
      }

      particleOffset.current = (particleOffset.current + 0.012) % 1;

      const w = canvas.width || 600;
      const h = canvas.height || 480;
      if (w <= 0 || h <= 0) {
        animFrameId.current = requestAnimationFrame(render);
        return;
      }

      const cx = w / 2;
      const cy = h / 2;

      ctx.clearRect(0, 0, w, h);

      // 绘制精致的 3D 星空网格地平线光晕（防非有限数值）
      const maxDim = Math.max(w, h, 200);
      try {
        const bgGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, maxDim * 0.65);
        bgGrad.addColorStop(0, 'rgba(15, 23, 42, 0.03)');
        bgGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);
      } catch {}

      // 绘制 3D 赤道与纬度参考轨道圈
      ctx.save();
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.ellipse(cx, cy, 180 * zoomRef.current, 70 * zoomRef.current, rotXRef.current, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 计算每个节点经过 3D 旋转和透视后的 2D 坐标
      const projected = new Map<string, { x: number; y: number; z: number; scale: number; alpha: number }>();
      const FOV = 420;

      const currentRotY = rotYRef.current;
      const currentRotX = rotXRef.current;
      const currentZoom = zoomRef.current;

      node3DPositions.forEach((pos, id) => {
        // 绕 Y 轴旋转
        const cosY = Math.cos(currentRotY);
        const sinY = Math.sin(currentRotY);
        const x1 = pos.x * cosY - pos.z * sinY;
        const z1 = pos.z * cosY + pos.x * sinY;

        // 绕 X 轴旋转
        const cosX = Math.cos(currentRotX);
        const sinX = Math.sin(currentRotX);
        const y2 = pos.y * cosX - z1 * sinX;
        const z2 = z1 * cosX + pos.y * sinX;

        // 透视缩放与深度投影
        const depth = z2 + 380;
        const scale = (FOV / Math.max(depth, 50)) * currentZoom;
        const projX = cx + x1 * scale;
        const projY = cy + y2 * scale;
        const alpha = Math.min(1, Math.max(0.25, (z2 + 250) / 450));

        projected.set(id, { x: projX, y: projY, z: z2, scale, alpha });
      });

      const currentHovered = hoveredNodeRef.current;
      const currentSelected = selectedNodeRef.current;

      // 1. 绘制立体连接弧线与引溯能量光量子
      edges.forEach((edge) => {
        const p1 = projected.get(edge.source);
        const p2 = projected.get(edge.target);
        if (!p1 || !p2) return;

        const isHighlighted =
          (currentHovered && (currentHovered.id === edge.source || currentHovered.id === edge.target)) ||
          (currentSelected && (currentSelected.id === edge.source || currentSelected.id === edge.target));

        const avgAlpha = (p1.alpha + p2.alpha) / 2;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = isHighlighted
          ? 'rgba(16, 185, 129, 0.95)'
          : `rgba(148, 163, 184, ${avgAlpha * 0.45})`;
        ctx.lineWidth = isHighlighted ? 2.5 : 1.2;
        ctx.stroke();

        // 沿连线流动的能量粒子
        const t = (particleOffset.current + (edge.source.charCodeAt(0) % 5) * 0.2) % 1;
        const px = p1.x + (p2.x - p1.x) * t;
        const py = p1.y + (p2.y - p1.y) * t;

        ctx.beginPath();
        ctx.arc(px, py, isHighlighted ? 3 : 2, 0, Math.PI * 2);
        ctx.fillStyle = isHighlighted ? '#10b981' : '#6366f1';
        ctx.fill();
      });

      // 2. 按 Z 轴从远到近排序渲染节点（Painter's Algorithm 保证前后层级正确）
      const sortedNodes = [...effectiveNodes].sort((a, b) => {
        const pA = projected.get(a.id)?.z || 0;
        const pB = projected.get(b.id)?.z || 0;
        return pA - pB;
      });

      sortedNodes.forEach((node) => {
        const p = projected.get(node.id);
        if (!p) return;

        const isCenter = node.type === 'self';
        const isHovered = currentHovered?.id === node.id;
        const isSelected = currentSelected?.id === node.id;
        const cfg = COLOR_MAP[node.type] || COLOR_MAP.related;

        const baseR = isCenter ? 22 : 14;
        const validScale = Number.isFinite(p.scale) && p.scale > 0 ? p.scale : 1;
        const radius = Math.max(8, baseR * validScale * (isHovered || isSelected ? 1.25 : 1));

        if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(radius) || radius <= 0) return;

        // 节点立体辉光
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius + (isHovered ? 8 : 4), 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? cfg.glow : `rgba(226, 232, 240, ${p.alpha * 0.6})`;
        ctx.fill();

        // 节点主体球（防非有限数值异常）
        try {
          const grad = ctx.createRadialGradient(p.x - radius * 0.3, p.y - radius * 0.3, Math.max(0.1, radius * 0.1), p.x, p.y, radius);
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.35, cfg.bg);
          grad.addColorStop(1, cfg.border);
          ctx.fillStyle = grad;
        } catch {
          ctx.fillStyle = cfg.bg;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#ffffff' : cfg.border;
        ctx.lineWidth = isSelected ? 3 : 1.5;
        ctx.stroke();

        // 节点标签文字
        ctx.fillStyle = isHovered ? '#0f172a' : `rgba(30, 41, 59, ${p.alpha * 0.95})`;
        ctx.font = `${isCenter ? 'bold 12.5px' : '500 11px'} system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(node.label, p.x, p.y + radius + 14);

        if (isCenter) {
          ctx.fillStyle = '#059669';
          ctx.font = 'bold 9.5px sans-serif';
          ctx.fillText('★ 研读核心', p.x, p.y - radius - 5);
        }

        ctx.restore();
      });

      animFrameId.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrameId.current);
    };
  }, [effectiveNodes, edges, node3DPositions]);

  /* 尺寸自适应 */
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      canvasRef.current.width = rect.width;
      canvasRef.current.height = Math.max(480, rect.height || 480);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /* 鼠标 3D 拖拽旋转事件 */
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDragging.current) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      rotYRef.current += dx * 0.008;
      rotXRef.current = Math.max(-1.2, Math.min(1.2, rotXRef.current + dy * 0.008));
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      return;
    }

    // 鼠标 Hover 碰撞检测
    const w = canvasRef.current.width;
    const h = canvasRef.current.height;
    const cx = w / 2;
    const cy = h / 2;
    const FOV = 420;

    let nearestNode: Graph3DNode | null = null;
    let minD = 24;

    const currentRotY = rotYRef.current;
    const currentRotX = rotXRef.current;
    const currentZoom = zoomRef.current;

    effectiveNodes.forEach((n) => {
      const pos = node3DPositions.get(n.id);
      if (!pos) return;

      const cosY = Math.cos(currentRotY);
      const sinY = Math.sin(currentRotY);
      const x1 = pos.x * cosY - pos.z * sinY;
      const z1 = pos.z * cosY + pos.x * sinY;

      const cosX = Math.cos(currentRotX);
      const sinX = Math.sin(currentRotX);
      const y2 = pos.y * cosX - z1 * sinX;
      const z2 = z1 * cosX + pos.y * sinX;

      const scale = (FOV / Math.max(z2 + 380, 50)) * currentZoom;
      const projX = cx + x1 * scale;
      const projY = cy + y2 * scale;

      const dist = Math.hypot(projX - mouseX, projY - mouseY);
      if (dist < minD) {
        minD = dist;
        nearestNode = n;
      }
    });

    setHoveredNode(nearestNode);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  /* 鼠标滚轮缩放视角 */
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    zoomRef.current = Math.max(0.6, Math.min(1.8, zoomRef.current + delta));
  };

  /* 重置 3D 视角 */
  const resetView = () => {
    rotXRef.current = -0.25;
    rotYRef.current = 0.45;
    zoomRef.current = 1;
    setSelectedNode(null);
  };

  const toggleAutoRotate = () => {
    autoRotateRef.current = !autoRotateRef.current;
    setAutoRotateState(autoRotateRef.current);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 480,
        borderRadius: 14,
        background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
        border: '1px solid var(--line)',
        overflow: 'hidden',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 3D 渲染画布 */}
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block', cursor: isDragging.current ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
        onClick={() => {
          if (hoveredNode) setSelectedNode(hoveredNode);
        }}
      />

      {/* 顶部状态与 3D 操作工具浮栏 */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 14,
          right: 14,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'auto' }}>
          <span className="tag tag-green" style={{ fontSize: 11, padding: '3px 8px', fontWeight: 600 }}>
            <span className="dot dot-green dot-pulse" style={{ width: 6, height: 6 }} />
            3D 空间立体拓扑
          </span>
          <span className="text-xs text-muted">按住左键拖拽旋转 · 滚轮缩放视距</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, pointerEvents: 'auto' }}>
          <button
            className={`btn btn-sm ${autoRotateState ? 'btn-soft' : 'btn-ghost'}`}
            style={{ fontSize: 11, padding: '3px 8px', height: 26 }}
            onClick={toggleAutoRotate}
            title="开启/暂停 3D 慢速自转"
          >
            <Icon name="refresh" size={11} /> {autoRotateState ? '自转中' : '已暂停'}
          </button>
          <button
            className="btn btn-soft btn-sm"
            style={{ fontSize: 11, padding: '3px 8px', height: 26 }}
            onClick={resetView}
            title="复位 3D 摄像机视角"
          >
            <Icon name="home" size={11} /> 视角复位
          </button>
        </div>
      </div>

      {/* 图例标识 */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 14,
          display: 'flex',
          gap: 12,
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(8px)',
          padding: '6px 12px',
          borderRadius: 10,
          border: '1px solid rgba(0,0,0,0.06)',
          fontSize: 11,
          pointerEvents: 'none',
        }}
      >
        {Object.entries(COLOR_MAP).map(([key, val]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: val.bg }} />
            <span style={{ color: '#475569' }}>{val.label}</span>
          </div>
        ))}
      </div>

      {/* 节点点击/悬浮详情悬浮卡片 */}
      {(hoveredNode || selectedNode) && (
        <div
          className="anim-pop"
          style={{
            position: 'absolute',
            bottom: 14,
            right: 14,
            width: 290,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(12px)',
            borderRadius: 12,
            border: '1px solid #cbd5e1',
            boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.12)',
            padding: '12px 14px',
            pointerEvents: 'auto',
          }}
        >
          {(() => {
            const n = selectedNode || hoveredNode!;
            const cfg = COLOR_MAP[n.type] || COLOR_MAP.related;
            return (
              <div>
                <div className="row-between items-center mb-1">
                  <span
                    className="tag"
                    style={{ background: cfg.glow, color: cfg.border, fontWeight: 700, fontSize: 10, border: 'none' }}
                  >
                    {cfg.label}
                  </span>
                  <span style={{ fontSize: 11, color: '#64748b' }}>{n.venue || `${n.year} 年`}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', lineHeight: 1.4, margin: '6px 0' }}>
                  {n.title || n.label}
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b', marginBottom: 6 }}>
                  作者：{n.authors || '权威学术团队'}
                </div>
                <div className="row-between items-center" style={{ borderTop: '1px solid #f1f5f9', paddingTop: 6, fontSize: 11 }}>
                  <span style={{ color: '#059669', fontWeight: 600 }}>
                    🔥 被引量：{n.citations.toLocaleString()} 次
                  </span>
                  {n.doi && (
                    <span style={{ color: '#6366f1', fontFamily: 'monospace' }}>
                      DOI: {n.doi.slice(0, 14)}…
                    </span>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
