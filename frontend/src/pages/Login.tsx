/* ============================================================
   ScienceX 登录 / 注册页 —— 极简学术权威美学 · 黄金双栏对称布局
   面向顶尖高校与科研机构学者的极致视觉体验 (2026 AI 原生学术生产力中枢)
   ============================================================ */
import React, { useState } from 'react';
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
        toast('欢迎回来，科研工作空间已就绪');
      } else {
        await register(name || '青年学者', email, password);
        toast('注册成功，已为您开通学术专属工作台');
      }
      const redirect = new URLSearchParams(window.location.search).get('redirect');
      nav(redirect ? decodeURIComponent(redirect) : '/chat');
    } catch (err: any) {
      toast(err.message || '操作失败，请重试', 'err');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setEmail('demo@sciencex.cn');
    setPassword('123456');
    setLoading(true);
    try {
      await login('demo@sciencex.cn', '123456');
      toast('已通过演示账号快捷登录');
      const redirect = new URLSearchParams(window.location.search).get('redirect');
      nav(redirect ? decodeURIComponent(redirect) : '/chat');
    } catch (err: any) {
      toast(err.message || '登录异常', 'err');
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
        background: '#f8f6f0',
        position: 'relative',
        overflowX: 'hidden',
        color: '#1a241f',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* ===== 背景光晕与学术微网格装饰 ===== */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          overflow: 'hidden',
        }}
      >
        {/* 左上墨绿柔光球 */}
        <div
          style={{
            position: 'absolute',
            top: '-15%',
            left: '-10%',
            width: '55vw',
            height: '55vw',
            maxWidth: 800,
            maxHeight: 800,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(27, 122, 94, 0.12) 0%, rgba(27, 122, 94, 0.03) 50%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        {/* 右下暖琥珀霞光球 */}
        <div
          style={{
            position: 'absolute',
            bottom: '-15%',
            right: '-10%',
            width: '50vw',
            height: '50vw',
            maxWidth: 750,
            maxHeight: 750,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(194, 118, 43, 0.09) 0%, rgba(194, 118, 43, 0.02) 50%, transparent 70%)',
            filter: 'blur(70px)',
          }}
        />
        {/* 精致学术图纸微网格纹理 */}
        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0.45,
          }}
        >
          <defs>
            <pattern id="academic-grid-pattern" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(27, 122, 94, 0.065)" strokeWidth="0.8" />
              <circle cx="32" cy="0" r="1" fill="rgba(27, 122, 94, 0.12)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#academic-grid-pattern)" />
        </svg>
      </div>

      {/* ===== 顶部通栏导航栏 ===== */}
      <header
        style={{
          height: 68,
          padding: '0 clamp(20px, 4vw, 56px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(228, 224, 212, 0.75)',
          background: 'rgba(248, 246, 240, 0.82)',
          backdropFilter: 'blur(16px)',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}
      >
        <div
          onClick={() => nav('/landing')}
          style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', userSelect: 'none' }}
          title="返回官网首页"
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #1b7a5e 0%, #0d4835 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(27, 122, 94, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
              flexShrink: 0,
            }}
          >
            <Icon name="flask" size={22} />
          </div>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 21,
                fontWeight: 800,
                color: '#13241b',
                letterSpacing: '-0.3px',
                lineHeight: 1.15,
              }}
            >
              ScienceX
            </div>
            <div style={{ fontSize: 11, color: '#68776e', letterSpacing: 0.3, marginTop: 1, fontWeight: 500 }}>
              AI 科研全流程协同工作台
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            className="desktop-only"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 20,
              background: 'rgba(27, 122, 94, 0.08)',
              color: '#156149',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <Icon name="award" size={14} /> 顶尖高校科研机构专享通道
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => nav('/landing')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: '#2a3b31',
              fontSize: 13,
              fontWeight: 600,
              padding: '7px 16px',
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.6)',
              border: '1px solid rgba(214, 209, 195, 0.8)',
              transition: 'all 0.2s ease',
            }}
          >
            <Icon name="arrowLeft" size={14} /> 返回官网宣传页
          </button>
        </div>
      </header>

      {/* ===== 核心双栏工作区 ===== */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'clamp(28px, 4vw, 64px) clamp(20px, 4vw, 48px)',
          maxWidth: 1280,
          margin: '0 auto',
          width: '100%',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 500px), 1fr))',
            gap: 'clamp(28px, 4vw, 56px)',
            width: '100%',
            alignItems: 'stretch',
          }}
        >
          {/* 左侧：学术中枢品牌长卷（科技感与权威感并存） */}
          <div
            className="desktop-only"
            style={{
              background: 'radial-gradient(130% 120% at 15% 15%, #183528 0%, #10251c 55%, #0a1811 100%)',
              color: '#eef6f1',
              borderRadius: 28,
              padding: 'clamp(40px, 4.2vw, 52px)',
              boxShadow: '0 24px 64px -14px rgba(10, 26, 18, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.14)',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid rgba(127, 208, 174, 0.18)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            {/* 左侧卡片内部光斑纹理 */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 320,
                height: 320,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(127, 208, 174, 0.12) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />

            <div>
              {/* 顶部微徽章 */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 14px',
                  borderRadius: 999,
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(127, 208, 174, 0.25)',
                  color: '#8fe0be',
                  fontSize: 12.5,
                  fontWeight: 600,
                  marginBottom: 24,
                  backdropFilter: 'blur(8px)',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#58dd9f',
                    boxShadow: '0 0 8px #58dd9f',
                    display: 'inline-block',
                  }}
                />
                2026 AI 原生学术生产力中枢
              </div>

              {/* 主标题 */}
              <h1
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(28px, 2.7vw, 36px)',
                  lineHeight: 1.32,
                  fontWeight: 700,
                  margin: '0 0 18px',
                  color: '#ffffff',
                  letterSpacing: '-0.3px',
                }}
              >
                让科研更简单。<br />
                <span
                  style={{
                    background: 'linear-gradient(90deg, #7fd0ae 0%, #b8edd5 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  让 AI 承接 60% 的重复劳动
                </span>
              </h1>

              <p
                style={{
                  color: '#b0c7ba',
                  fontSize: 14.5,
                  lineHeight: 1.85,
                  marginBottom: 36,
                  maxWidth: '96%',
                }}
              >
                覆盖「选题 → 文献 → 实验 → 分析 → 写作 → 投稿 → 组会 / 评审」全流程，把繁琐机械的环节交给智能体，让学者专注探索世界与原创洞见。
              </p>

              {/* 四大科研支柱网格卡片 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                {[
                  {
                    icon: 'bulb',
                    title: '选题灵感与雷达',
                    desc: '多源趋势 · 创新点可行性量化',
                    badge: 'CVPR / Nature',
                  },
                  {
                    icon: 'book',
                    title: '文献沉浸精读',
                    desc: 'AUFormer 导图 · 公式拆解',
                    badge: '双语对照',
                  },
                  {
                    icon: 'flask',
                    title: '实验设计与复现',
                    desc: '消融矩阵 · GPU 调度看板',
                    badge: '可复现追踪',
                  },
                  {
                    icon: 'shield',
                    title: '多智能体严谨预审',
                    desc: '5 维专家盲审 · 避坑指南',
                    badge: '顶刊标准',
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 14,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.09)',
                      backdropFilter: 'blur(10px)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: 'rgba(127, 208, 174, 0.15)',
                          color: '#7fd0ae',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon name={item.icon as any} size={16} />
                      </span>
                      <span
                        style={{
                          fontSize: 10.5,
                          padding: '2px 7px',
                          borderRadius: 6,
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: '#8fe0be',
                          fontWeight: 500,
                        }}
                      >
                        {item.badge}
                      </span>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: '#f3faf6', marginTop: 2 }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#8fae9d', marginTop: 2, lineHeight: 1.4 }}>
                        {item.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 底部科研信任背书条 */}
            <div
              style={{
                marginTop: 36,
                paddingTop: 20,
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#8fae9d' }}>
                <span style={{ color: '#f59e0b', display: 'flex', gap: 2 }}>
                  {'★'.repeat(5)}
                </span>
                <span>已赋能 120+ 顶尖高校课题组 · 论文接收率提升 42%</span>
              </div>
              <div style={{ fontSize: 11.5, color: '#688c7b', fontWeight: 500 }}>
                🔒 符合端到端科研隐私规范
              </div>
            </div>
          </div>

          {/* 右侧：登录与注册主交互卡片（大气质感 · 纯白浮雕） */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.94)',
              borderRadius: 28,
              padding: 'clamp(32px, 4.2vw, 48px)',
              boxShadow: '0 20px 60px -15px rgba(22, 44, 32, 0.12), 0 2px 10px rgba(0, 0, 0, 0.03)',
              border: '1px solid rgba(214, 210, 196, 0.9)',
              backdropFilter: 'blur(20px)',
              width: '100%',
              maxWidth: 510,
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              {/* 卡片头部 */}
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div
                  style={{
                    display: 'inline-flex',
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    background: 'linear-gradient(135deg, #1d7b5f 0%, #104e3b 100%)',
                    color: '#ffffff',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 6px 18px rgba(27, 122, 94, 0.28)',
                    marginBottom: 14,
                  }}
                >
                  <Icon name="user" size={26} />
                </div>
                <h2
                  className="text-serif"
                  style={{
                    fontSize: 'clamp(22px, 2.3vw, 26px)',
                    fontWeight: 800,
                    margin: 0,
                    color: '#14271d',
                    letterSpacing: '-0.3px',
                  }}
                >
                  {mode === 'login' ? '学者账号登录' : '开启 ScienceX 科研之旅'}
                </h2>
                <p style={{ color: '#6c7a72', fontSize: 13.5, marginTop: 7, lineHeight: 1.5 }}>
                  {mode === 'login'
                    ? '输入学术凭据，进入全流程 AI 科研工作台'
                    : '免费注册学术席位，即刻解锁多智能体文献与实验支持'}
                </p>
              </div>

              {/* 现代胶囊分段控制器 (Segmented Tab Control) */}
              <div
                style={{
                  display: 'flex',
                  padding: 4,
                  background: '#f0ece2',
                  borderRadius: 14,
                  marginBottom: 24,
                  border: '1px solid rgba(218, 213, 201, 0.8)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    fontSize: 14,
                    fontWeight: mode === 'login' ? 700 : 500,
                    borderRadius: 10,
                    border: 'none',
                    cursor: 'pointer',
                    background: mode === 'login' ? '#ffffff' : 'transparent',
                    color: mode === 'login' ? '#14624a' : '#6b7a71',
                    boxShadow: mode === 'login' ? '0 2px 8px rgba(18, 38, 28, 0.1)' : 'none',
                    transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                  }}
                >
                  密码登录
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    fontSize: 14,
                    fontWeight: mode === 'register' ? 700 : 500,
                    borderRadius: 10,
                    border: 'none',
                    cursor: 'pointer',
                    background: mode === 'register' ? '#ffffff' : 'transparent',
                    color: mode === 'register' ? '#14624a' : '#6b7a71',
                    boxShadow: mode === 'register' ? '0 2px 8px rgba(18, 38, 28, 0.1)' : 'none',
                    transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                  }}
                >
                  快速注册
                </button>
              </div>

              {/* 核心登录/注册表单 */}
              <form onSubmit={submit}>
                {mode === 'register' && (
                  <div style={{ marginBottom: 18 }}>
                    <label
                      style={{
                        display: 'block',
                        fontWeight: 600,
                        fontSize: 13,
                        marginBottom: 7,
                        color: '#1f3327',
                      }}
                    >
                      学者姓名 / 称谓
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="例如：张博士 / 陈教授"
                        required
                        style={{
                          paddingLeft: 42,
                          height: 46,
                          fontSize: 14.5,
                          borderRadius: 12,
                          border: '1px solid #d5d0c2',
                          background: '#faf9f5',
                          width: '100%',
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          left: 14,
                          top: 13,
                          color: '#7b8c82',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Icon name="user" size={18} />
                      </span>
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: 18 }}>
                  <label
                    style={{
                      display: 'block',
                      fontWeight: 600,
                      fontSize: 13,
                      marginBottom: 7,
                      color: '#1f3327',
                    }}
                  >
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
                      style={{
                        paddingLeft: 42,
                        height: 46,
                        fontSize: 14.5,
                        borderRadius: 12,
                        border: '1px solid #d5d0c2',
                        background: '#faf9f5',
                        width: '100%',
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        left: 14,
                        top: 13,
                        color: '#7b8c82',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Icon name="mail" size={18} />
                    </span>
                  </div>
                </div>

                <div style={{ marginBottom: 22 }}>
                  <div className="row-between items-center" style={{ marginBottom: 7 }}>
                    <label style={{ fontWeight: 600, fontSize: 13, margin: 0, color: '#1f3327' }}>
                      登录密码
                    </label>
                    {mode === 'login' && (
                      <span
                        onClick={() => toast('密码重置链接已预留，测试环境可直接使用下方演示账号')}
                        style={{ fontSize: 12, color: '#1b7a5e', cursor: 'pointer', fontWeight: 500 }}
                      >
                        忘记密码？
                      </span>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="input"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="至少 6 位密码字符"
                      required
                      minLength={6}
                      style={{
                        paddingLeft: 42,
                        paddingRight: 44,
                        height: 46,
                        fontSize: 14.5,
                        borderRadius: 12,
                        border: '1px solid #d5d0c2',
                        background: '#faf9f5',
                        width: '100%',
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        left: 14,
                        top: 13,
                        color: '#7b8c82',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Icon name="key" size={18} />
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: 11,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#7b8c82',
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title={showPassword ? '隐藏密码' : '显示密码'}
                    >
                      <Icon name="eye" size={18} />
                    </button>
                  </div>
                </div>

                {/* 主行动按钮 */}
                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  disabled={loading}
                  style={{
                    height: 48,
                    fontSize: 15.5,
                    fontWeight: 700,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #1b7a5e 0%, #115740 100%)',
                    boxShadow: '0 8px 24px -4px rgba(27, 122, 94, 0.42)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {loading ? (
                    <span className="spinner" />
                  ) : (
                    <>
                      <span>{mode === 'login' ? '进入科研工作台' : '免费开通学术账号'}</span>
                      <Icon name="arrowRight" size={16} />
                    </>
                  )}
                </button>
              </form>

              {/* 体验演示账号快捷登录卡片 */}
              {mode === 'login' && (
                <div
                  style={{
                    marginTop: 20,
                    padding: '12px 16px',
                    borderRadius: 14,
                    background: 'linear-gradient(145deg, #f5f3eb 0%, #ede8dc 100%)',
                    border: '1px solid rgba(214, 208, 192, 0.9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#c2762b',
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
                        flexShrink: 0,
                      }}
                    >
                      <Icon name="spark" size={16} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11.5, color: '#68776e', fontWeight: 600 }}>官方学术演示席位</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#14624a', fontFamily: 'var(--font-mono)' }}>
                        demo@sciencex.cn
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleQuickDemoLogin}
                    disabled={loading}
                    style={{
                      padding: '6px 14px',
                      fontSize: 12.5,
                      fontWeight: 700,
                      borderRadius: 8,
                      background: '#ffffff',
                      color: '#14624a',
                      border: '1px solid rgba(27, 122, 94, 0.25)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      boxShadow: '0 2px 6px rgba(27, 122, 94, 0.08)',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    ⚡ 一键极速体验
                  </button>
                </div>
              )}

              {/* 学术单点登录 / 机构联盟拓展通道 */}
              <div style={{ marginTop: 24, paddingTop: 18, borderTop: '1px solid #e7e2d4' }}>
                <div
                  style={{
                    fontSize: 11.5,
                    color: '#7b8a81',
                    textAlign: 'center',
                    marginBottom: 12,
                    fontWeight: 500,
                  }}
                >
                  高校联盟与第三方学术凭据授权
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => toast('已接入 CARSI 高校联盟身份认证网关')}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: 10,
                      background: '#faf9f5',
                      border: '1px solid #d9d4c5',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#2d3e33',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <Icon name="award" size={14} /> CARSI 高校认证
                  </button>
                  <button
                    type="button"
                    onClick={() => toast('已接入 ORCID 学者学术身份关联通道')}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: 10,
                      background: '#faf9f5',
                      border: '1px solid #d9d4c5',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#2d3e33',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <Icon name="link" size={14} /> ORCID 学者凭证
                  </button>
                </div>
              </div>
            </div>

            {/* 卡片底部隐私合规承诺 */}
            <div
              style={{
                marginTop: 24,
                textAlign: 'center',
                fontSize: 11.5,
                color: '#829188',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Icon name="shield" size={13} />
              <span>数据严格端到端加密，绝不将学者手稿用于公共模型训练</span>
            </div>
          </div>
        </div>
      </main>

      {/* ===== 底部学术版权与支持信息 ===== */}
      <footer
        style={{
          textAlign: 'center',
          padding: '20px clamp(16px, 4vw, 32px)',
          fontSize: 12,
          color: '#76857c',
          borderTop: '1px solid rgba(228, 224, 212, 0.7)',
          background: 'rgba(248, 246, 240, 0.85)',
          backdropFilter: 'blur(10px)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span>© 2026 ScienceX · AI 科研协同工作台</span>
          <span style={{ opacity: 0.4 }}>|</span>
          <span>遵循学术道德与同行评审国际合规规范 (COPE / IEEE)</span>
          <span style={{ opacity: 0.4 }}>|</span>
          <span
            style={{ color: '#1b7a5e', cursor: 'pointer', textDecoration: 'underline' }}
            onClick={() => nav('/landing')}
          >
            返回官网
          </span>
        </div>
      </footer>
    </div>
  );
}
