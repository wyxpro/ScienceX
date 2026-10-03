/* ============================================================
   ScienceX 电脑端全屏沉浸式登录 / 注册页 (Full-screen Split Canvas)
   青春动态科技视觉 · 极简开阔大方 · 移除冗余组件
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
        width: '100vw',
        display: 'flex',
        background: '#ffffff',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* ============================================================
          左侧：全屏沉浸式科研展示长卷 (占屏 55%，青春动态科技极光蓝夜)
          ============================================================ */}
      <div
        className="desktop-only"
        style={{
          flex: '0 0 55%',
          width: '55%',
          height: '100vh',
          background: 'linear-gradient(145deg, #090e1a 0%, #0d1b2a 40%, #14213d 75%, #0d273d 100%)',
          color: '#f0f6fc',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 'clamp(44px, 5vw, 68px) clamp(44px, 5vw, 76px)',
          position: 'relative',
          overflow: 'hidden',
          borderRight: '1px solid rgba(56, 189, 248, 0.15)',
          boxShadow: '12px 0 45px rgba(5, 12, 28, 0.25)',
        }}
      >
        {/* 背景活力极光流动光球与微网格 */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {/* 左上炫彩天蓝光晕 */}
          <div
            style={{
              position: 'absolute',
              top: '-15%',
              left: '-10%',
              width: 560,
              height: 560,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(56, 189, 248, 0.22) 0%, rgba(14, 165, 233, 0.08) 45%, transparent 70%)',
              filter: 'blur(75px)',
            }}
          />
          {/* 中右极光紫蓝光晕 */}
          <div
            style={{
              position: 'absolute',
              top: '30%',
              right: '-10%',
              width: 520,
              height: 520,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(99, 102, 241, 0.18) 0%, rgba(129, 140, 248, 0.05) 50%, transparent 70%)',
              filter: 'blur(80px)',
            }}
          />
          {/* 左下青春青绿活力光晕 */}
          <div
            style={{
              position: 'absolute',
              bottom: '-15%',
              left: '15%',
              width: 480,
              height: 480,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(20, 184, 166, 0.18) 0%, transparent 65%)',
              filter: 'blur(75px)',
            }}
          />
          {/* 细腻科技微网格 */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.28 }}>
            <defs>
              <pattern id="tech-dynamic-grid" width="36" height="36" patternUnits="userSpaceOnUse">
                <path d="M 36 0 L 0 0 0 36" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="0.8" />
                <circle cx="36" cy="0" r="1.2" fill="rgba(56, 189, 248, 0.35)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#tech-dynamic-grid)" />
          </svg>
        </div>

        {/* 左侧头部：品牌 Logo */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div
            onClick={() => nav('/landing')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 14, cursor: 'pointer', userSelect: 'none' }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 13,
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 60%, #0f766e 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 20px rgba(2, 132, 199, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
              }}
            >
              <Icon name="flask" size={24} />
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 25,
                  fontWeight: 800,
                  color: '#ffffff',
                  letterSpacing: '-0.3px',
                  lineHeight: 1.1,
                }}
              >
                ScienceX
              </div>
              <div style={{ fontSize: 11.5, color: '#94a3b8', letterSpacing: 0.5, marginTop: 2, fontWeight: 500 }}>
                AI 科研全流程协同工作台
              </div>
            </div>
          </div>
        </div>

        {/* 左侧主体内容：学术愿景与科技链路卡片 */}
        <div style={{ position: 'relative', zIndex: 2, margin: 'auto 0', padding: '20px 0' }}>
          {/* 态势标签 */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              borderRadius: 999,
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.28)',
              color: '#38bdf8',
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 24,
              backdropFilter: 'blur(8px)',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#38bdf8',
                boxShadow: '0 0 12px #38bdf8',
                display: 'inline-block',
              }}
            />
            2026 AI 原生学术生产力中枢
          </div>

          {/* 醒目标题 */}
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(32px, 3vw, 45px)',
              lineHeight: 1.28,
              fontWeight: 700,
              margin: '0 0 20px',
              color: '#ffffff',
              letterSpacing: '-0.5px',
            }}
          >
            让科研更简单。<br />
            <span
              style={{
                background: 'linear-gradient(90deg, #38bdf8 0%, #818cf8 50%, #34d399 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              让 AI 承接 60% 的重复劳动
            </span>
          </h1>

          <p
            style={{
              color: '#94a3b8',
              fontSize: 15.5,
              lineHeight: 1.85,
              marginBottom: 36,
              maxWidth: '92%',
            }}
          >
            覆盖「选题 → 文献 → 实验 → 分析 → 写作 → 投稿 → 组会 / 评审」全流程，把繁复机械的工具链交给 AI 智能体，让学者专注提出好问题与科学创新本身。
          </p>

          {/* 四大科研支柱网格卡片 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {[
              {
                icon: 'bulb',
                title: '选题灵感与前沿雷达',
                desc: '多源趋势聚类 · 创新可行性评估',
                tag: 'CVPR / Nature',
                accent: '#38bdf8',
                bg: 'rgba(56, 189, 248, 0.14)',
              },
              {
                icon: 'book',
                title: '文献沉浸精读与导图',
                desc: 'AUFormer 导图 · 跨模态公式拆解',
                tag: '双语对照',
                accent: '#818cf8',
                bg: 'rgba(129, 140, 248, 0.14)',
              },
              {
                icon: 'flask',
                title: '实验设计与资产复现',
                desc: '消融实验矩阵 · GPU 调度看板',
                tag: '可复现追踪',
                accent: '#2dd4bf',
                bg: 'rgba(45, 212, 191, 0.14)',
              },
              {
                icon: 'shield',
                title: '多智能体专家严谨预审',
                desc: '5 维盲审同行体检 · 避坑指南',
                tag: '顶刊标准',
                accent: '#a78bfa',
                bg: 'rgba(167, 139, 250, 0.14)',
              },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  padding: '16px 18px',
                  borderRadius: 16,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: item.bg,
                      color: item.accent,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name={item.icon as any} size={18} />
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: 'rgba(255, 255, 255, 0.08)',
                      color: item.accent,
                      fontWeight: 600,
                    }}
                  >
                    {item.tag}
                  </span>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14.5, color: '#f8fafc' }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3, lineHeight: 1.45 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 科研学术数据指标展示 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 16,
              marginTop: 28,
              padding: '16px 20px',
              borderRadius: 16,
              background: 'rgba(15, 23, 42, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            {[
              { val: '120+', lbl: '顶尖课题组' },
              { val: '+42%', lbl: '顶刊接收率' },
              { val: '60%', lbl: '重复劳动削减' },
              { val: '5 维', lbl: '专家预审雷达' },
            ].map((s, idx) => (
              <div key={idx} style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 20,
                    fontWeight: 800,
                    color: '#38bdf8',
                  }}
                >
                  {s.val}
                </div>
                <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 2 }}>{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 左侧底部留白自然过渡 */}
        <div style={{ height: 10 }} />
      </div>

      {/* ============================================================
          右侧：全屏开阔表单工作区 (占屏 45%，纯粹、清爽、居中)
          ============================================================ */}
      <div
        style={{
          flex: 1,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(175deg, #ffffff 0%, #f8fafc 100%)',
          padding: 'clamp(32px, 5vw, 64px)',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        {/* 核心登录/注册表单容器 (纯净、开阔、大气) */}
        <div
          style={{
            maxWidth: 440,
            width: '100%',
            margin: 'auto',
          }}
        >
          {/* 表头欢迎语 */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div
              style={{
                display: 'inline-flex',
                width: 56,
                height: 56,
                borderRadius: 18,
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(2, 132, 199, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                marginBottom: 16,
              }}
            >
              <Icon name="user" size={28} />
            </div>
            <h2
              className="text-serif"
              style={{
                fontSize: 'clamp(24px, 2.4vw, 28px)',
                fontWeight: 800,
                margin: '0 0 8px',
                color: '#0f172a',
                letterSpacing: '-0.3px',
              }}
            >
              {mode === 'login' ? '学者账号登录' : '开启 ScienceX 科研之旅'}
            </h2>
            <p style={{ color: '#64748b', fontSize: 14, margin: 0, lineHeight: 1.5 }}>
              {mode === 'login'
                ? '输入学术账号，进入专属全流程科研工作台'
                : '免费开通学术席位，无需复杂环境配置即可体验'}
            </p>
          </div>

          {/* 胶囊分段控制器 (Segmented Tab Control) */}
          <div
            style={{
              display: 'flex',
              padding: 4,
              background: '#f1f5f9',
              borderRadius: 14,
              marginBottom: 24,
              border: '1px solid #e2e8f0',
            }}
          >
            <button
              type="button"
              onClick={() => setMode('login')}
              style={{
                flex: 1,
                padding: '11px 0',
                fontSize: 14.5,
                fontWeight: mode === 'login' ? 700 : 500,
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                background: mode === 'login' ? '#ffffff' : 'transparent',
                color: mode === 'login' ? '#0284c7' : '#64748b',
                boxShadow: mode === 'login' ? '0 2px 8px rgba(15, 23, 42, 0.08)' : 'none',
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
                padding: '11px 0',
                fontSize: 14.5,
                fontWeight: mode === 'register' ? 700 : 500,
                borderRadius: 10,
                border: 'none',
                cursor: 'pointer',
                background: mode === 'register' ? '#ffffff' : 'transparent',
                color: mode === 'register' ? '#0284c7' : '#64748b',
                boxShadow: mode === 'register' ? '0 2px 8px rgba(15, 23, 42, 0.08)' : 'none',
                transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
              }}
            >
              快速注册
            </button>
          </div>

          {/* 登录/注册表单 */}
          <form onSubmit={submit}>
            {mode === 'register' && (
              <div style={{ marginBottom: 18 }}>
                <label
                  style={{
                    display: 'block',
                    fontWeight: 600,
                    fontSize: 13.5,
                    marginBottom: 8,
                    color: '#1e293b',
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
                      paddingLeft: 44,
                      height: 48,
                      fontSize: 15,
                      borderRadius: 12,
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      width: '100%',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      left: 14,
                      top: 14,
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Icon name="user" size={19} />
                  </span>
                </div>
              </div>
            )}

            <div style={{ marginBottom: 18 }}>
              <label
                style={{
                  display: 'block',
                  fontWeight: 600,
                  fontSize: 13.5,
                  marginBottom: 8,
                  color: '#1e293b',
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
                    paddingLeft: 44,
                    height: 48,
                    fontSize: 15,
                    borderRadius: 12,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    width: '100%',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: 14,
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Icon name="mail" size={19} />
                </span>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div className="row-between items-center" style={{ marginBottom: 8 }}>
                <label style={{ fontWeight: 600, fontSize: 13.5, margin: 0, color: '#1e293b' }}>
                  登录密码
                </label>
                {mode === 'login' && (
                  <span
                    onClick={() => toast('密码重置入口已联通，可直接使用下方演示账号一键登录')}
                    style={{ fontSize: 12.5, color: '#0284c7', cursor: 'pointer', fontWeight: 600 }}
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
                  placeholder="至少 6 位安全字符"
                  required
                  minLength={6}
                  style={{
                    paddingLeft: 44,
                    paddingRight: 46,
                    height: 48,
                    fontSize: 15,
                    borderRadius: 12,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    width: '100%',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: 14,
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Icon name="key" size={19} />
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: 12,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title={showPassword ? '隐藏密码' : '显示密码'}
                >
                  <Icon name="eye" size={19} />
                </button>
              </div>
            </div>

            {/* 主提交按钮 */}
            <button
              type="submit"
              className="btn btn-block"
              disabled={loading}
              style={{
                height: 50,
                fontSize: 16,
                fontWeight: 700,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                boxShadow: '0 8px 24px -4px rgba(2, 132, 199, 0.42)',
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
                  <Icon name="arrowRight" size={17} />
                </>
              )}
            </button>
          </form>

          {/* 官方学者演示席位（一键极速体验） */}
          {mode === 'login' && (
            <div
              style={{
                marginTop: 22,
                padding: '14px 18px',
                borderRadius: 14,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: '#f0f9ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0284c7',
                    flexShrink: 0,
                  }}
                >
                  <Icon name="spark" size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>官方学术演示席位</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0369a1', fontFamily: 'var(--font-mono)' }}>
                    demo@sciencex.cn
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleQuickDemoLogin}
                disabled={loading}
                style={{
                  padding: '7px 16px',
                  fontSize: 13,
                  fontWeight: 700,
                  borderRadius: 9,
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  boxShadow: '0 3px 10px rgba(2, 132, 199, 0.25)',
                  transition: 'all 0.18s ease',
                }}
              >
                ⚡ 一键极速体验
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
