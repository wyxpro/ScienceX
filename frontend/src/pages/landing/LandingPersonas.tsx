import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import { PERSONAS } from './types';

export const LandingPersonas: React.FC = () => {
  const nav = useNavigate();
  const [activePersona, setActivePersona] = useState('student');
  const activePersonaData = PERSONAS.find((p) => p.id === activePersona) || PERSONAS[0];

  return (
    <section id="personas" className="landing-section">
      <div className="section-head">
        <div className="section-badge">Target Audience</div>
        <h2 className="section-title">量身打造，赋能每一类科研角色</h2>
        <p className="section-sub">
          无论你是个体探索的研究生，还是运筹帷幄的课题组导师，ScienceX 都能提供适配的加速引擎。
        </p>
      </div>

      <div className="persona-tabs">
        {PERSONAS.map((p) => (
          <button
            key={p.id}
            className={`persona-tab-btn ${activePersona === p.id ? 'active' : ''}`}
            onClick={() => setActivePersona(p.id)}
            aria-label={`切换到角色：${p.title}`}
          >
            <Icon name={p.icon as any} size={16} />
            <span>{p.title}</span>
          </button>
        ))}
      </div>

      <div className="persona-card">
        <div>
          <div className="row g-2 items-center mb-2">
            <span className="tag" style={{ background: 'var(--brand-soft)', color: 'var(--brand-strong)', fontWeight: 'bold' }}>
              角色定位
            </span>
            <span className="fw-bold" style={{ fontSize: 18 }}>{activePersonaData.title}</span>
          </div>
          <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 20 }}>
            {activePersonaData.roleDesc}
          </p>

          <div className="persona-pain-box">
            <div className="row g-2 items-center mb-2" style={{ color: 'var(--red)', fontWeight: 'bold', fontSize: 13.5 }}>
              <Icon name="alert" size={16} /> 普遍真实痛点：
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6, color: '#6d2621' }}>
              {activePersonaData.pains.map((pain, i) => (
                <li key={i} style={{ marginBottom: 4 }}>{pain}</li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <div className="persona-solve-box">
            <div className="row g-2 items-center mb-2" style={{ color: 'var(--brand-strong)', fontWeight: 'bold', fontSize: 13.5 }}>
              <Icon name="zap" size={16} /> ScienceX 专属解法与价值增益：
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.65, color: 'var(--brand-deep)' }}>
              {activePersonaData.solves.map((solve, i) => (
                <li key={i} style={{ marginBottom: 6 }}>
                  <strong>{solve.split('，')[0]}</strong>：{solve.split('，')[1] || solve}
                </li>
              ))}
            </ul>
          </div>

          <div style={{ marginTop: 24, textAlign: 'right' }}>
            <button className="btn btn-primary" onClick={() => nav('/login')}>
              免费体验适合您的科研方案 <Icon name="arrowRight" size={14} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
