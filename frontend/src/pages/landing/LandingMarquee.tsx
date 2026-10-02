import React from 'react';
import { MARQUEE_ITEMS } from './types';

export const LandingMarquee: React.FC = () => {
  return (
    <section className="marquee-section">
      <div className="marquee-track">
        {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, idx) => (
          <div key={idx} className="marquee-item">
            {item}
          </div>
        ))}
      </div>
    </section>
  );
};
