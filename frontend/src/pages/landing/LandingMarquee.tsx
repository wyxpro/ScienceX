import React, { useState } from 'react';
import BrandLogo from './BrandLogos';
import Icon from '../../components/Icon';
import { MARQUEE_ITEMS } from './types';

export const LandingMarquee: React.FC = () => {
  const [paused, setPaused] = useState(false);
  return (
    <section className="marquee-section" aria-label="学术院校与会议">
      <div className="marquee-heading"><span className="marquee-caption-text">连接学术视野，与前沿研究同行</span><button type="button" className="marquee-toggle" aria-label={paused ? '播放图标跑马灯' : '暂停图标跑马灯'} aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? <Icon name="play" size={11} /> : <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="M2 2h3v8H2zM7 2h3v8H7z" /></svg>}</button></div>
      <div className="marquee-viewport"><div className={`marquee-track${paused ? ' is-paused' : ''}`}>
        {[0, 1].map(copy => <div className="marquee-group" key={copy} aria-hidden={copy === 1 ? true : undefined}>{MARQUEE_ITEMS.map(item => <div className="marquee-item" key={item.id} title={item.name}><span className="marquee-logo"><BrandLogo id={item.logo} name={item.showName ? '' : item.name} /></span>{item.showName && <span className="marquee-name">{item.name}</span>}</div>)}</div>)}
      </div></div>
    </section>
  );
};
