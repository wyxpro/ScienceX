/* ============================================================
   ScienceX 虚拟化长列表组件 (F7 零依赖自研轻量级方案)
   基于容器滚动高度与动态视口计算，支持 50+ 乃至千级长列表丝滑滚动
   ============================================================ */
import React, { useRef, useState, useEffect, type ReactNode } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  height?: number | string;
  containerHeight?: number | string;
  renderItem: (item: T, index: number) => ReactNode;
  overscan?: number;
  className?: string;
  emptyText?: string;
}

export function VirtualList<T>({
  items,
  itemHeight,
  height = 420,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
  emptyText = '暂无数据',
}: VirtualListProps<T>) {
  const actualHeight = containerHeight ?? height;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // 若列表项少于 30 项，则直接全量渲染，无需进入虚拟滚动计算开销
  if (items.length <= 30) {
    if (items.length === 0) {
      return (
        <div className={`virtual-list-empty ${className}`} style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>
          {emptyText}
        </div>
      );
    }
    return (
      <div className={`virtual-list-simple ${className}`} style={{ maxHeight: actualHeight, overflowY: 'auto' }}>
        {items.map((item, idx) => (
          <React.Fragment key={idx}>{renderItem(item, idx)}</React.Fragment>
        ))}
      </div>
    );
  }

  const totalHeight = items.length * itemHeight;
  const numHeight = typeof actualHeight === 'number' ? actualHeight : 420;

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(items.length - 1, Math.floor((scrollTop + numHeight) / itemHeight) + overscan);

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * itemHeight;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`virtual-list-container ${className}`}
      style={{
        height,
        maxHeight: height,
        overflowY: 'auto',
        position: 'relative',
        WebkitOverflowScrolling: 'touch',
      }}
      tabIndex={0}
      role="region"
      aria-label="可滚动虚拟数据列表"
    >
      <div style={{ height: totalHeight, width: '100%', position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)`, willChange: 'transform' }}>
          {visibleItems.map((item, idx) => (
            <div key={startIndex + idx} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + idx)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default VirtualList;
