/* 思维导图（左根右叶层级布局）与引用图谱（径向布局） */
import { useState } from 'react';
import Icon from './Icon';

interface MindNode { title: string; children?: MindNode[] }

/* ============ 思维导图 ============ */
export function Mindmap({ data }: { data: MindNode }) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const rowH = 36, colW = 190, rootW = 160;

  // 第一遍：计算每个可见节点的行数（用于分配 y 坐标）
  const leavesOf = (n: MindNode, path: string): number => {
    if (!n.children?.length || collapsed[path]) return 1;
    return n.children.reduce((a, c, i) => a + leavesOf(c, `${path}/${i}`), 0);
  };
  const totalRows = Math.max(1, data.children?.reduce((a, c, i) => a + leavesOf(c, `r${i}`), 0) ?? 1);
  const H = Math.max(560, totalRows * rowH + 80);

  // 动态计算最大可见层级深度，确保导图在任何层级下均能完全完整显示
  const getDepth = (n: MindNode, path: string, currentDepth: number): number => {
    if (!n.children?.length || collapsed[path]) return currentDepth;
    return Math.max(currentDepth, ...n.children.map((c, i) => getDepth(c, `${path}/${i}`, currentDepth + 1)));
  };
  const maxDepth = Math.max(1, getDepth(data, 'root', 0));
  const W = Math.max(820, rootW + maxDepth * colW + 140);

  // 第二遍：分配坐标并产出 SVG 元素
  type Box = { path: string; node: MindNode; depth: number; x: number; y: number; w: number; hasKids: boolean; collapsed: boolean };
  const boxes: Box[] = [];
  const links: { x1: number; y1: number; x2: number; y2: number; depth: number }[] = [];
  let cursor = 24;

  const place = (n: MindNode, depth: number, path: string, parent?: Box) => {
    const x = depth === 0 ? 8 : 10 + depth * colW;
    const w = depth === 0 ? rootW : Math.max(86, Math.min(170, 24 + n.title.length * 11));
    const leaves = leavesOf(n, path);
    let y: number;
    if (depth === 0) {
      y = H / 2 - 14;
    } else {
      y = cursor + ((leaves - 1) * rowH) / 2;
    }
    const box: Box = { path, node: n, depth, x, y, w, hasKids: !!n.children?.length, collapsed: !!collapsed[path] };
    boxes.push(box);
    if (parent) {
      links.push({ x1: parent.x + parent.w, y1: parent.y + 14, x2: x, y2: y + 14, depth });
    }
    if (n.children?.length && !collapsed[path]) {
      for (let i = 0; i < n.children.length; i++) place(n.children[i], depth + 1, `${path}/${i}`, box);
    }
    if (depth > 0) cursor += leaves * rowH;
  };

  place(data, 0, 'root');
  // 让第一列整体垂直居中
  const firstCol = boxes.filter((b) => b.depth === 1);
  const occupied = firstCol.reduce((a, b) => a + leavesOf(b.node, b.path), 0);
  const offsetY = (totalRows - occupied) * rowH / 2;
  if (offsetY !== 0 && firstCol.length) {
    // 重新放置（简单做法：重置游标并整体平移第一列子树）
    boxes.length = 0; links.length = 0; cursor = 24 + offsetY;
    place(data, 0, 'root');
  }

  return (
    <div style={{ overflowX: 'auto', overflowY: 'auto', background: '#fdfcf9', borderRadius: 12, border: '1px solid var(--line)', flex: 1, minHeight: 560, height: '100%', display: 'flex', alignItems: 'center' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 620, height: H, display: 'block' }}>
        {links.map((l, i) => (
          <path key={i}
            d={`M ${l.x1} ${l.y1} C ${l.x1 + (l.x2 - l.x1) * 0.5} ${l.y1}, ${l.x1 + (l.x2 - l.x1) * 0.5} ${l.y2}, ${l.x2} ${l.y2}`}
            fill="none" stroke="#b9d4c7" strokeWidth="1.6" />
        ))}
        {boxes.map((b) => (
          <g key={b.path} style={{ cursor: b.hasKids ? 'pointer' : 'default' }}
            onClick={() => b.hasKids && setCollapsed((c) => ({ ...c, [b.path]: !c[b.path] }))}>
            <rect x={b.x} y={b.y} width={b.w} height={26} rx={b.depth === 0 ? 13 : 7}
              fill={b.depth === 0 ? '#1b7a5e' : b.depth === 1 ? '#e3f1ea' : '#fbfaf6'}
              stroke={b.depth === 1 ? '#bcd9cb' : '#e6e2d6'} strokeWidth="1" />
            <text x={b.x + b.w / 2} y={b.y + 17} textAnchor="middle"
              style={{ fontSize: b.depth === 0 ? 12 : 10.5, fontWeight: b.depth <= 1 ? 700 : 500, fill: b.depth === 0 ? '#fff' : '#1f2a24' }}>
              {b.node.title.length > 12 ? b.node.title.slice(0, 12) + '…' : b.node.title}
            </text>
            {b.hasKids && (
              <>
                <circle cx={b.x + b.w + 7} cy={b.y + 13} r="7" fill={b.collapsed ? '#c2762b' : '#1b7a5e'} />
                <text x={b.x + b.w + 7} y={b.y + 16.5} textAnchor="middle" style={{ fontSize: 9, fill: '#fff', fontWeight: 700 }}>
                  {b.collapsed ? '+' : '−'}
                </text>
              </>
            )}
            <title>{b.node.title}</title>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ============ 引用图谱 ============ */
interface GraphNode { id: string; label: string; type: 'self' | 'cited' | 'citing'; year: number; citations: number }

export function CitationGraph({ nodes, edges }: { nodes: GraphNode[]; edges: { source: string; target: string }[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const W = 700, H = 400, cx = W / 2, cy = H / 2;
  const self = nodes.find((n) => n.type === 'self');
  const cited = nodes.filter((n) => n.type === 'cited');
  const citing = nodes.filter((n) => n.type === 'citing');

  const posMap: Record<string, { x: number; y: number }> = {};
  if (self) posMap[self.id] = { x: cx, y: cy };
  const layoutSide = (arr: GraphNode[], side: -1 | 1) => {
    arr.forEach((n, i) => {
      const spread = arr.length <= 1 ? 0 : (i / (arr.length - 1) - 0.5) * 2;
      posMap[n.id] = { x: cx + side * (218 - Math.abs(spread) * 46), y: cy + spread * 150 };
    });
  };
  layoutSide(cited, -1);
  layoutSide(citing, 1);

  const colorOf = (t: string) => (t === 'self' ? '#1b7a5e' : t === 'cited' ? '#c2762b' : '#5e8f7f');
  const isLinked = (id: string) => !hover || hover === id || edges.some((e) => (e.source === hover && e.target === id) || (e.target === hover && e.source === id));

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 540 }}>
        <defs>
          <marker id="sx-arr" markerWidth="8" markerHeight="8" refX="24" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6" fill="none" stroke="#b0aca0" strokeWidth="1.2" />
          </marker>
        </defs>
        {edges.map((e, i) => {
          const a = posMap[e.source], b = posMap[e.target];
          if (!a || !b) return null;
          const dim = !!hover && e.source !== hover && e.target !== hover;
          return (
            <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#b0aca0"
              strokeWidth={dim ? 1 : 1.7} opacity={dim ? 0.22 : 0.8} markerEnd="url(#sx-arr)" style={{ transition: 'opacity .2s' }} />
          );
        })}
        {nodes.map((n) => {
          const p = posMap[n.id];
          if (!p) return null;
          const r = n.type === 'self' ? 13 : 8.5 + Math.min(6, Math.log10(n.citations + 1));
          const dim = !isLinked(n.id);
          return (
            <g key={n.id} style={{ cursor: 'pointer', opacity: dim ? 0.28 : 1, transition: 'opacity .2s' }}
              onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)}>
              <circle cx={p.x} cy={p.y} r={r} fill={colorOf(n.type)} stroke="#fff" strokeWidth="2"
                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.16))' }} />
              {n.type === 'self' && <circle cx={p.x} cy={p.y} r={r + 5} fill="none" stroke={colorOf(n.type)} strokeWidth="1.2" opacity="0.45" />}
              <text x={p.x} y={p.y + r + 13} textAnchor="middle" style={{ fontSize: 9.5, fill: '#4c5a52', fontWeight: n.type === 'self' ? 700 : 500 }}>
                {n.label.length > 24 ? n.label.slice(0, 24) + '…' : n.label}
              </text>
              <title>{`${n.label} · ${n.year} · 被引 ${n.citations}`}</title>
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', padding: '8px 0 12px', fontSize: 11.5, color: 'var(--muted)', flexWrap: 'wrap' }}>
        <span><i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: '#1b7a5e', marginRight: 5 }} />本文</span>
        <span><i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: '#c2762b', marginRight: 5 }} />参考文献（左）</span>
        <span><i style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: '#5e8f7f', marginRight: 5 }} />引用本文（右）</span>
        <span>悬停节点高亮关联</span>
      </div>
    </div>
  );
}
