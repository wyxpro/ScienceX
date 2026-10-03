import React from 'react';
import { MARQUEE_ITEMS } from './types';
import BrandLogo from './BrandLogos';

export const LandingMarquee: React.FC = () => {
  return (
    <section className="marquee-section">
      <div className="marquee-track">
        {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, idx) => (
          <div key={idx} className="marquee-item">
            <BrandLogo id={item.logo} size={28} />
            {item.showName && <span>{item.name}</span>}
          </div>
        ))}
      </div>
    </section>
  );
};
