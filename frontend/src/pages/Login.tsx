/* 登录 / 注册页 —— 左侧品牌展示（内容向右居中靠拢），右侧输入信息，双端深度适配 */
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
        background: 'var(--bg)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ===== 电脑端左侧：品牌与科研闭环特色展示区（组件向右偏移靠拢中线） ===== */}
      <div
        className="desktop-only"
        style={{
          flex: '1.25',
          background: 'linear-gradient(160deg, #182822 0%, #1d3a2e 55%, #14624a 100%)',
          color: '#eef5f0',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-end', // 向右对齐，靠近页面中轴
          padding: '60px 56px 60px 48px',
          position: 'relative',
          overflow: 'hidden',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <svg style={{ position: 'absolute', inset: 0, opacity: 0.45 }} width="100%" height="100%">
          <defs>
            <pattern id="grid-login" width="44" height="44" patternUnits="userSpaceOnUse">
              <path d="M44 0H0V44" fill="none" stroke="rgba(255,255,255,0.045)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-login)" />
        </svg>

        {/* 品牌模块内容容器（最大宽 540，居右放置） */}
        <div style={{ position: 'relative', maxWidth: 540, width: '100%' }}>
          <div
            className="row g-2 mb-3 anim-in"
            style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
            onClick={() => nav('/landing')}
            title="返回官网宣传页"
          >
            <div
              className="sb-logo-mark"
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.12)',
                color: '#7fd0ae',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <Icon name="flask" size={24} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 700, letterSpacing: 0.5 }}>
                ScienceX
              </div>
              <div style={{ fontSize: 11, letterSpacing: 3, color: '#8fae9d', textTransform: 'uppercase' }}>
                AI Research Workbench
              </div>
            </div>
          </div>

          <h1
            className="anim-in"
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(28px, 2.6vw, 36px)',
              lineHeight: 1.4,
              fontWeight: 700,
              animationDelay: '.1s',
              margin: '18px 0 14px',
            }}
          >
            一个入口，闭环科研。<br />
            <span style={{ color: '#7fd0ae' }}>让 AI 承接 60% 的重复劳动</span>
          </h1>

          <p
            className="anim-in"
            style={{
              color: '#a9bcb2',
              fontSize: 14.5,
              lineHeight: 1.85,
              animationDelay: '.2s',
              marginBottom: 32,
            }}
          >
            覆盖「选题 → 文献 → 实验 → 分析 → 写作 → 投稿 → 组会 / 评审」全流程的 AI 科研工作台，把重复、琐碎、耗时的环节交给 AI 智能体，让研究者专注于创新本身。
          </p>

          {/* 四大科研支柱网格 */}
          <div
            className="stagger"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 14,
            }}
          >
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
                  gap: 12,
                  alignItems: 'flex-start',
                  padding: '14px 16px',
                  borderRadius: 14,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.09)',
                  backdropFilter: 'blur(10px)',
                  transition: 'transform 0.2s ease, background 0.2s ease',
                }}
              >
                <span style={{ color: '#7fd0ae', marginTop: 2 }}>
                  <Icon name={ic as any} size={19} />
                </span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: '#f3faf6' }}>{t}</div>
                  <div style={{ fontSize: 11.5, color: '#90b09f', marginTop: 3, lineHeight: 1.45 }}>{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== 电脑端右侧 / 移动端全宽：输入信息（登录/注册交互表单区） ===== */}
      <div
        style={{
          flex: '1',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 'clamp(20px, 4vw, 48px) clamp(16px, 3vw, 36px)',
          minHeight: '100vh',
          zIndex: 2,
          position: 'relative',
        }}
      >
        {/* 顶部返回官网快捷条（移动端友好，且桌面端清晰可见） */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
          }}
        >
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => nav('/landing')}
            title="返回官网宣传页"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--muted)',
              fontSize: 13,
            }}
          >
            <Icon name="arrowLeft" size={14} /> 返回官网宣传页
          </button>
        </div>

        <div
          className="anim-in"
          style={{
            width: '100%',
            maxWidth: 420,
            marginTop: 20,
          }}
        >
          {/* Logo 区域 */}
          <div
            className="row g-2 mb-3"
            style={{ justifyContent: 'center', cursor: 'pointer', alignItems: 'center' }}
            onClick={() => nav('/landing')}
            title="返回官网宣传页"
          >
            <div
              className="sb-logo-mark"
              style={{
                width: 44,
                height: 44,
                background: 'linear-gradient(145deg, #237a5c, #0e4a37)',
                color: '#fff',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(27, 122, 94, 0.28)',
              }}
            >
              <Icon name="flask" size={22} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 800, color: 'var(--ink)' }}>
                ScienceX
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: 0.5, marginTop: -2 }}>
                AI 科研全流程协同工作台
              </div>
            </div>
          </div>

          <h2
            className="text-serif"
            style={{
              textAlign: 'center',
              fontSize: 'clamp(20px, 2.5vw, 24px)',
              fontWeight: 700,
              marginTop: 12,
              marginBottom: 4,
            }}
          >
            {mode === 'login' ? '学者账号登录' : '加入 ScienceX 科研工作台'}
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
            {mode === 'login' ? '你的专属 AI 科研助理团队已就绪' : '开启选题、精读、实验与论文全闭环'}
          </p>

          {/* 登录/注册 Tab 切换 */}
          <div className="seg mt-3" style={{ width: '100%', display: 'flex', padding: 3, background: 'var(--bg-deep)', borderRadius: 10 }}>
            <button
              type="button"
              className={`seg-btn grow ${mode === 'login' ? 'active' : ''}`}
              onClick={() => setMode('login')}
              style={{
                padding: '9px 0',
                fontSize: 14,
                fontWeight: mode === 'login' ? 700 : 500,
                borderRadius: 8,
                transition: 'all 0.2s ease',
              }}
            >
              密码登录
            </button>
            <button
              type="button"
              className={`seg-btn grow ${mode === 'register' ? 'active' : ''}`}
              onClick={() => setMode('register')}
              style={{
                padding: '9px 0',
                fontSize: 14,
                fontWeight: mode === 'register' ? 700 : 500,
                borderRadius: 8,
                transition: 'all 0.2s ease',
              }}
            >
              快速注册
            </button>
          </div>

          {/* 表单卡片 */}
          <form
            onSubmit={submit}
            className="card card-pad mt-3"
            style={{
              borderRadius: 18,
              border: '1px solid var(--line-strong)',
              boxShadow: '0 8px 30px -6px rgba(0, 0, 0, 0.07)',
              padding: 'clamp(20px, 3.5vw, 28px)',
              background: 'rgba(255, 255, 255, 0.85)',
              backdropFilter: 'blur(16px)',
            }}
          >
            {mode === 'register' && (
              <div className="form-row" style={{ marginBottom: 16 }}>
                <label className="field-label" style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, display: 'block' }}>
                  学者姓名 / 昵称
                </label>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：张博士"
                  required
                  style={{ fontSize: 15, padding: '10px 14px', borderRadius: 10 }}
                />
              </div>
            )}
            <div className="form-row" style={{ marginBottom: 16 }}>
              <label className="field-label" style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, display: 'block' }}>
                学术邮箱 / 账号
              </label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu.cn"
                required
                style={{ fontSize: 15, padding: '10px 14px', borderRadius: 10 }}
              />
            </div>
            <div className="form-row" style={{ marginBottom: 20 }}>
              <div className="row-between items-center" style={{ marginBottom: 6 }}>
                <label className="field-label" style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>
                  登录密码
                </label>
              </div>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位安全字符"
                required
                minLength={6}
                style={{ fontSize: 15, padding: '10px 14px', borderRadius: 10 }}
              />
            </div>

            <button
              className="btn btn-primary btn-lg btn-block"
              disabled={loading}
              style={{
                padding: '12px 18px',
                fontSize: 15,
                fontWeight: 700,
                borderRadius: 11,
                boxShadow: '0 4px 14px rgba(27, 122, 94, 0.35)',
              }}
            >
              {loading ? <span className="spinner" /> : <Icon name="arrowRight" size={16} />}
              {mode === 'login' ? '进入科研工作台' : '免费创建科研账号'}
            </button>

            {mode === 'login' && (
              <div
                className="mt-3"
                style={{
                  textAlign: 'center',
                  fontSize: 12.5,
                  color: 'var(--muted)',
                  background: 'var(--bg-deep)',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                <span>
                  演示体验账号：
                  <span className="mono" style={{ color: 'var(--brand-strong)', fontWeight: 700 }}>
                    demo@sciencex.cn
                  </span>
                </span>
                <button
                  type="button"
                  className="btn btn-soft btn-sm"
                  style={{
                    padding: '3px 9px',
                    fontSize: 11.5,
                    borderRadius: 6,
                    background: 'var(--brand-soft)',
                    color: 'var(--brand-strong)',
                  }}
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

          {/* 移动端专属微型特性提醒条 */}
          <div
            className="mobile-only"
            style={{
              marginTop: 20,
              padding: '10px 14px',
              borderRadius: 10,
              background: 'rgba(27, 122, 94, 0.06)',
              border: '1px solid rgba(27, 122, 94, 0.12)',
              fontSize: 12,
              color: 'var(--brand-deep)',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            💡 支持选题 · 文献精读 · 消融矩阵 · 论文润色 · 组会汇报全流程
          </div>
        </div>
      </div>
    </div>
  );
}
