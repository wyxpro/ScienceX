/* 登录 / 注册页 —— REQ-USER-05 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { useToast } from '../components/ui';
import { useAuth } from '../stores/auth';

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('demo@sciencex.cn');
  const [password, setPassword] = useState('123456');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const nav = useNavigate();
  const toast = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') { await login(email, password); toast('欢迎回来，科研工作即将开始'); }
      else { await register(name, email, password); toast('注册成功，已自动登录'); }
      nav('/chat');
    } catch (err: any) {
      toast(err.message || '操作失败', 'err');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)' }}>
      {/* 品牌区 */}
      <div className="desktop-only" style={{
        flex: '1.15', background: 'linear-gradient(160deg, #182822 0%, #1d3a2e 55%, #14624a 100%)',
        color: '#eef5f0', display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px 72px', position: 'relative', overflow: 'hidden',
      }}>
        <svg style={{ position: 'absolute', inset: 0, opacity: 0.5 }} width="100%" height="100%">
          <defs>
            <pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse">
              <path d="M44 0H0V44" fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        <div style={{ position: 'relative', maxWidth: 520 }}>
          <div className="row g-2 mb-3 anim-in">
            <div className="sb-logo-mark" style={{ width: 44, height: 44 }}><Icon name="flask" size={22} /></div>
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 700, letterSpacing: 0.5 }}>ScienceX</div>
              <div style={{ fontSize: 11, letterSpacing: 3, color: '#8fae9d', textTransform: 'uppercase' }}>AI Research Workbench</div>
            </div>
          </div>
          <h1 className="anim-in" style={{ fontFamily: 'var(--font-serif)', fontSize: 34, lineHeight: 1.45, fontWeight: 700, animationDelay: '.1s' }}>
            一个入口，闭环科研。<br />
            <span style={{ color: '#7fd0ae' }}>让 AI 承接 60% 的重复劳动</span>
          </h1>
          <p className="anim-in" style={{ color: '#a9bcb2', marginTop: 18, fontSize: 14.5, lineHeight: 1.9, animationDelay: '.2s' }}>
            覆盖「选题 → 文献 → 实验 → 分析 → 写作 → 投稿 → 组会 / 评审」全流程的 AI 科研工作台，把重复、琐碎、耗时的环节交给 AI 智能体，让研究者专注于创新本身。
          </p>
          <div className="stagger" style={{ display: 'grid', 'gridTemplateColumns': '1fr 1fr', gap: 12, marginTop: 34 } as any}>
            {[
              ['bulb', '选题灵感', '多源检索 + 可行性评估'],
              ['book', '文献阅读', '翻译 · 思维导图 · 图谱'],
              ['flask', '实验设计', '参数看板 + GPU 监控'],
              ['pen', '论文写作', '润色 · 查重 · 降重'],
            ].map(([ic, t, d]) => (
              <div key={t} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '13px 15px', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
                <span style={{ color: '#7fd0ae', marginTop: 2 }}><Icon name={ic as any} size={18} /></span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{t}</div>
                  <div style={{ fontSize: 11.5, color: '#8fae9d', marginTop: 2 }}>{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 表单区 */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="anim-in" style={{ width: 'min(400px, 100%)' }}>
          <div className="row g-2 mb-3" style={{ justifyContent: 'center' }}>
            <div className="sb-logo-mark" style={{ width: 40, height: 40, background: 'linear-gradient(145deg,#237a5c,#0e4a37)' }}><Icon name="flask" size={20} /></div>
          </div>
          <h2 className="text-serif" style={{ textAlign: 'center', fontSize: 22 }}>{mode === 'login' ? '登录 ScienceX' : '创建科研账号'}</h2>
          <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>
            {mode === 'login' ? '你的 AI 科研助理团已就位' : '注册即代表同意服务条款与隐私政策'}
          </p>

          <div className="seg mt-3" style={{ width: '100%', display: 'flex' }}>
            <button className={`seg-btn grow ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>登录</button>
            <button className={`seg-btn grow ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>注册</button>
          </div>

          <form onSubmit={submit} className="card card-pad mt-3">
            {mode === 'register' && (
              <div className="form-row">
                <label className="field-label">昵称</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="你的姓名或昵称" required />
              </div>
            )}
            <div className="form-row">
              <label className="field-label">邮箱</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@university.edu.cn" required />
            </div>
            <div className="form-row">
              <label className="field-label">密码</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少 6 位" required minLength={6} />
            </div>
            <button className="btn btn-primary btn-lg btn-block mt-2" disabled={loading}>
              {loading ? <span className="spinner" /> : <Icon name="arrowRight" size={16} />}
              {mode === 'login' ? '进入工作台' : '创建账号并开始'}
            </button>
            {mode === 'login' && (
              <div className="mt-2" style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
                演示账号 <span className="mono" style={{ color: 'var(--brand-strong)' }}>demo@sciencex.cn / 123456</span>
                <button type="button" className="btn btn-soft btn-sm" style={{ marginLeft: 8 }}
                  onClick={() => { setEmail('demo@sciencex.cn'); setPassword('123456'); }}>一键填入</button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
