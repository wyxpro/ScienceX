/* ============================================================
   机构信赖墙 —— 高校印章 / 机构标识 / 会议徽票 矢量 Logo 跑马灯
   ============================================================ */
import React from 'react';
import BrandLogo from './BrandLogos';
import { MARQUEE_ITEMS } from './types';

export const LandingMarquee: React.FC = () => {
  // 首尾复制一份实现无缝循环（配合 -50% 位移精确衔接，item 间距用 margin 保证半宽严格相等）
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

  return (
    <section className="marquee-section" aria-label="服务院校、机构与适用会议">
      <div className="marquee-caption">
        <span className="marquee-caption-line" />
        <span className="marquee-caption-text">全球顶尖学府 · 科研机构 · CCF 顶会学者的共同选择</span>
        <span className="marquee-caption-line" />
      </div>

      <div className="marquee-viewport">
        <div className="marquee-track">
          {items.map((item, idx) => (
            <div className="marquee-item" key={`${item.id}-${idx}`} title={item.name}>
              <span className="marquee-logo">
                <BrandLogo id={item.logo} size={item.showName ? 30 : 28} />
              </span>
              {item.showName && <span className="marquee-name">{item.name}</span>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
