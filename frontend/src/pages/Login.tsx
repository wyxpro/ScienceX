/* 登录 / 注册页 —— 极简学术权威美学 · 黄金双栏对称布局 · 双端极致自适应 */
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
  const [showPassword, setShowPassword] = useState(false);
  const { login, register } = useAuth();
  const nav = useNavigate();
  const toast = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        toast('欢迎回来，科研工作即将开始');
      } else {
        await register(name, email, password);
        toast('注册成功，已自动登录');
      }
      const redirect = new URLSearchParams(window.location.search).get('redirect');
      nav(redirect ? decodeURIComponent(redirect) : '/chat');
    } catch (err: any) {
      toast(err.message || '操作失败', 'err');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg)',
        position: 'relative',
        overflowX: 'hidden',
        backgroundImage: `
          radial-gradient(circle at 10% 20%, rgba(27, 122, 94, 0.08) 0%, transparent 40%),
          radial-gradient(circle at 90% 80%, rgba(194, 118, 43, 0.06) 0%, transparent 40%)
        `,
      }}
    >
      {/* 顶部通栏导航 */}
      <header
        style={{
          height: 64,
          padding: '0 clamp(16px, 4vw, 40px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(230, 226, 214, 0.8)',
          background: 'rgba(246, 244, 238, 0.85)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          onClick={() => nav('/landing')}
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          title="返回官网首页"
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'linear-gradient(135deg, var(--brand-deep), var(--brand))',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(27, 122, 94, 0.28)',
            }}
          >
            <Icon name="flask" size={20} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>
              ScienceX
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--muted)', letterSpacing: 0.5, marginTop: -2 }}>
              AI 科研全流程协同工作台
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => nav('/landing')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--ink-2)',
            fontSize: 13,
            padding: '6px 14px',
            borderRadius: 8,
          }}
        >
          <Icon name="arrowLeft" size={14} /> 返回官网宣传页
        </button>
      </header>

      {/* 页面主工作区：对称式黄金比例排版 */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'clamp(24px, 4vw, 56px) clamp(16px, 4vw, 32px)',
          maxWidth: 1240,
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))',
            gap: 'clamp(24px, 4vw, 48px)',
            width: '100%',
            alignItems: 'center',
          }}
        >
          {/* 左侧：品牌闭环与科研特色展示 */}
          <div
            className="desktop-only"
            style={{
              background: 'linear-gradient(155deg, #182822 0%, #1d3a2e 55%, #14624a 100%)',
              color: '#eef5f0',
              borderRadius: 24,
              padding: 'clamp(36px, 4vw, 48px)',
              boxShadow: '0 20px 48px -12px rgba(20, 40, 30, 0.25)',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <svg style={{ position: 'absolute', inset: 0, opacity: 0.35, pointerEvents: 'none' }} width="100%" height="100%">
              <defs>
                <pattern id="grid-pattern-login" width="36" height="36" patternUnits="userSpaceOnUse">
                  <path d="M36 0H0V36" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid-pattern-login)" />
            </svg>

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 999,
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#7fd0ae',
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 20,
                }}
              >
                <span>★</span> 2026 AI 原生学术生产力中枢
              </div>

              <h1
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(26px, 2.6vw, 34px)',
                  lineHeight: 1.35,
                  fontWeight: 700,
                  margin: '0 0 16px',
                  color: '#ffffff',
                }}
              >
                一个入口，闭环科研。<br />
                <span style={{ color: '#7fd0ae' }}>让 AI 承接 60% 的重复劳动</span>
              </h1>

              <p
                style={{
                  color: '#b6cbc0',
                  fontSize: 14.5,
                  lineHeight: 1.8,
                  marginBottom: 32,
                }}
              >
                覆盖「选题 → 文献 → 实验 → 分析 → 写作 → 投稿 → 组会 / 评审」全流程的 AI 科研工作台，把机械、繁复的环节交给智能体，让学者专注提出好问题与科学创新本身。
              </p>

              {/* 四大科研支柱卡片 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                {[
                  ['bulb', '选题灵感', '多源检索 + 可行性评估'],
                  ['book', '文献阅读', '翻译 · 思维导图 · 图谱'],
                  ['flask', '实验设计', '参数看板 + GPU 监控'],
                  ['pen', '论文写作', '润色 · 查重 · 降重'],
                ].map(([ic, t, d]) => (
                  <div
                    key={t}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    <span style={{ color: '#7fd0ae', marginTop: 2 }}>
                      <Icon name={ic as any} size={18} />
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: '#f3faf6' }}>{t}</div>
                      <div style={{ fontSize: 11.5, color: '#8fae9d', marginTop: 2 }}>{d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧：登录与注册交互表单 */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: 24,
              padding: 'clamp(28px, 4vw, 44px)',
              boxShadow: '0 10px 36px -8px rgba(31, 42, 36, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
              border: '1px solid var(--line-strong)',
              width: '100%',
              maxWidth: 480,
              margin: '0 auto',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div
                style={{
                  display: 'inline-flex',
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: 'linear-gradient(145deg, #237a5c, #0e4a37)',
                  color: '#ffffff',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(27, 122, 94, 0.25)',
                  marginBottom: 12,
                }}
              >
                <Icon name="user" size={24} />
              </div>
              <h2
                className="text-serif"
                style={{
                  fontSize: 'clamp(20px, 2.2vw, 24px)',
                  fontWeight: 700,
                  margin: 0,
                  color: 'var(--ink)',
                }}
              >
                {mode === 'login' ? '学者账号登录' : '开启 ScienceX 科研之旅'}
              </h2>
              <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>
                {mode === 'login' ? '输入学术账号进入专属全流程科研工作台' : '免费注册，无需复杂环境配置即可体验'}
              </p>
            </div>

            {/* 登录/注册 Tab 切换 */}
            <div
              style={{
                display: 'flex',
                padding: 4,
                background: 'var(--bg-deep)',
                borderRadius: 12,
                marginBottom: 20,
              }}
            >
              <button
                type="button"
                onClick={() => setMode('login')}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  fontSize: 14,
                  fontWeight: mode === 'login' ? 700 : 500,
                  borderRadius: 9,
                  border: 'none',
                  cursor: 'pointer',
                  background: mode === 'login' ? '#ffffff' : 'transparent',
                  color: mode === 'login' ? 'var(--brand-deep)' : 'var(--muted)',
                  boxShadow: mode === 'login' ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                密码登录
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                style={{
                  flex: 1,
                  padding: '9px 0',
                  fontSize: 14,
                  fontWeight: mode === 'register' ? 700 : 500,
                  borderRadius: 9,
                  border: 'none',
                  cursor: 'pointer',
                  background: mode === 'register' ? '#ffffff' : 'transparent',
                  color: mode === 'register' ? 'var(--brand-deep)' : 'var(--muted)',
                  boxShadow: mode === 'register' ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                快速注册
              </button>
            </div>

            {/* 表单 */}
            <form onSubmit={submit}>
              {mode === 'register' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6, color: 'var(--ink)' }}>
                    学者姓名 / 昵称
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="例如：张博士 / 陈教授"
                      required
                      style={{ paddingLeft: 38, fontSize: 14.5, borderRadius: 10 }}
                    />
                    <span style={{ position: 'absolute', left: 12, top: 11, color: 'var(--muted)' }}>
                      <Icon name="user" size={16} />
                    </span>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6, color: 'var(--ink)' }}>
                  学术邮箱 / 账号
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@university.edu.cn"
                    required
                    style={{ paddingLeft: 38, fontSize: 14.5, borderRadius: 10 }}
                  />
                  <span style={{ position: 'absolute', left: 12, top: 11, color: 'var(--muted)' }}>
                    <Icon name="mail" size={16} />
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div className="row-between items-center" style={{ marginBottom: 6 }}>
                  <label style={{ fontWeight: 600, fontSize: 13, margin: 0, color: 'var(--ink)' }}>
                    登录密码
                  </label>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="至少 6 位安全字符"
                    required
                    minLength={6}
                    style={{ paddingLeft: 38, paddingRight: 40, fontSize: 14.5, borderRadius: 10 }}
                  />
                  <span style={{ position: 'absolute', left: 12, top: 11, color: 'var(--muted)' }}>
                    <Icon name="key" size={16} />
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: 8,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--muted)',
                      padding: 4,
                    }}
                    title={showPassword ? '隐藏密码' : '显示密码'}
                  >
                    <Icon name="eye" size={16} />
                  </button>
                </div>
              </div>

              <button
                className="btn btn-primary btn-lg btn-block"
                disabled={loading}
                style={{
                  padding: '13px 20px',
                  fontSize: 15,
                  fontWeight: 700,
                  borderRadius: 11,
                  boxShadow: '0 6px 18px rgba(27, 122, 94, 0.35)',
                }}
              >
                {loading ? <span className="spinner" /> : <Icon name="arrowRight" size={16} />}
                {mode === 'login' ? '进入科研工作台' : '免费创建学者账号'}
              </button>

              {mode === 'login' && (
                <div
                  style={{
                    marginTop: 18,
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: 'var(--bg-deep)',
                    border: '1px solid var(--line)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 8,
                    fontSize: 12.5,
                  }}
                >
                  <span style={{ color: 'var(--muted)' }}>
                    体验演示账号：
                    <strong style={{ color: 'var(--brand-strong)', marginLeft: 4 }}>demo@sciencex.cn</strong>
                  </span>
                  <button
                    type="button"
                    className="btn btn-soft btn-sm"
                    style={{ padding: '3px 10px', fontSize: 11.5, borderRadius: 6 }}
                    onClick={() => {
                      setEmail('demo@sciencex.cn');
                      setPassword('123456');
                    }}
                  >
                    ⚡ 一键填入
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      </main>

      {/* 底部版权 */}
      <footer
        style={{
          textAlign: 'center',
          padding: '18px 24px',
          fontSize: 12,
          color: 'var(--muted)',
          borderTop: '1px solid rgba(230, 226, 214, 0.6)',
        }}
      >
        © 2026 ScienceX · AI 科研协同工作台 · 让科学探索更高效
      </footer>
    </div>
  );
}
