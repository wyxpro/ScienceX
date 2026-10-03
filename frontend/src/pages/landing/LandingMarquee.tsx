import React from 'react';
import { MARQUEE_ITEMS } from './types';

/** 机构 / 会议矢量字标占位：取 logo 标识大写缩写，后续可替换为完整矢量标志 */
const acronym = (logo: string) => logo.toUpperCase().slice(0, 5);

export const LandingMarquee: React.FC = () => {
  return (
    <section className="marquee-section">
      <div className="marquee-track">
        {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, idx) => (
          <div key={idx} className="marquee-item">
            <span
              aria-hidden="true"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 26,
                height: 26,
                flex: 'none',
                borderRadius: 8,
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: '#047857',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.2px',
              }}
            >
              {acronym(item.logo)}
            </span>
            {item.showName && <span>{item.name}</span>}
          </div>
        ))}
      </div>
    </section>
  );
};
