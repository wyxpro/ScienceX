/* ============================================================
   ScienceX 电脑端全屏沉浸式登录 / 注册页 (Full-screen Split Canvas)
   高级翡翠与暖金学术色调 · 告别单一蓝调 · 清晰通透开阔大方
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
      const redirect = new URLSearchParams(window.location.hash.split('?')[1] || '').get('redirect');
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
      const redirect = new URLSearchParams(window.location.hash.split('?')[1] || '').get('redirect');
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
          左侧：全屏沉浸式科研展示长卷 (占屏 55%，通透翡翠与琥珀光微调·视觉清晰)
          ============================================================ */}
      <div
        className="desktop-only"
        style={{
          flex: '0 0 55%',
          width: '55%',
          height: '100vh',
          background: 'linear-gradient(155deg, #f2f9f5 0%, #e6f6ee 38%, #f8fbf9 75%, #fdf9ee 100%)',
          color: '#0f172a',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 'clamp(44px, 5vw, 68px) clamp(44px, 5vw, 76px)',
          position: 'relative',
          overflow: 'hidden',
          borderRight: '1px solid #e2ece6',
          boxShadow: '10px 0 36px rgba(15, 23, 42, 0.04)',
        }}
      >
        {/* 背景轻盈翡翠柔光与琥珀微晕 */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {/* 左上高雅翡翠光晕 */}
          <div
            style={{
              position: 'absolute',
              top: '-15%',
              left: '-10%',
              width: 580,
              height: 580,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.06) 50%, transparent 70%)',
              filter: 'blur(75px)',
            }}
          />
          {/* 中右暖金琥珀光晕 */}
          <div
            style={{
              position: 'absolute',
              top: '35%',
              right: '-12%',
              width: 500,
              height: 500,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(217, 119, 6, 0.16) 0%, rgba(245, 158, 11, 0.05) 50%, transparent 70%)',
              filter: 'blur(80px)',
            }}
          />
          {/* 左下清爽薄荷青光晕 */}
          <div
            style={{
              position: 'absolute',
              bottom: '-15%',
              left: '10%',
              width: 480,
              height: 480,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(45, 212, 191, 0.16) 0%, transparent 65%)',
              filter: 'blur(75px)',
            }}
          />
          {/* 细腻学术坐标细网格 */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.35 }}>
            <defs>
              <pattern id="emerald-grid" width="36" height="36" patternUnits="userSpaceOnUse">
                <path d="M 36 0 L 0 0 0 36" fill="none" stroke="rgba(5, 150, 105, 0.08)" strokeWidth="0.8" />
                <circle cx="36" cy="0" r="1.2" fill="rgba(5, 150, 105, 0.18)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#emerald-grid)" />
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
                width: 50,
                height: 50,
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <img src="/logo.png" alt="ScienceX Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 26,
                  fontWeight: 800,
                  color: '#13281e',
                  letterSpacing: '-0.3px',
                  lineHeight: 1.1,
                }}
              >
                ScienceX
              </div>
              <div style={{ fontSize: 11.5, color: '#52695c', letterSpacing: 0.5, marginTop: 2, fontWeight: 600 }}>
                AI 科研全流程协同工作台
              </div>
            </div>
          </div>
        </div>

        {/* 左侧主体内容：学术愿景与科技链路卡片 */}
        <div style={{ position: 'relative', zIndex: 2, margin: 'auto 0', padding: '16px 0' }}>
          {/* 醒目标题 */}
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(32px, 3.2vw, 46px)',
              lineHeight: 1.28,
              fontWeight: 800,
              margin: '0 0 18px',
              color: '#112319',
              letterSpacing: '-0.5px',
            }}
          >
            让科研更简单。<br />
            <span
              style={{
                background: 'linear-gradient(90deg, #059669 0%, #0d9488 45%, #d97706 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              让 AI 承接 60% 的重复劳动
            </span>
          </h1>

          <p
            style={{
              color: '#384d41',
              fontSize: 15.5,
              lineHeight: 1.85,
              marginBottom: 36,
              maxWidth: '92%',
              fontWeight: 450,
            }}
          >
            覆盖「选题 → 文献 → 实验 → 分析 → 写作 → 投稿 → 组会 / 评审」全流程，把繁复机械的工具链交给 AI 智能体，让学者专注提出好问题与科学创新本身。
          </p>

          {/* 四大科研支柱网格卡片（白玉微玻璃拟态 · 视觉清晰锐利） */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {[
              {
                icon: 'bulb',
                title: '选题灵感与前沿雷达',
                desc: '多源趋势聚类 · 创新可行性评估',
                tag: 'CVPR / Nature',
                accent: '#059669',
                bg: 'rgba(5, 150, 105, 0.1)',
              },
              {
                icon: 'book',
                title: '文献沉浸精读与导图',
                desc: 'AUFormer 导图 · 跨模态公式拆解',
                tag: '双语对照',
                accent: '#0d9488',
                bg: 'rgba(13, 148, 136, 0.1)',
              },
              {
                icon: 'flask',
                title: '实验设计与资产复现',
                desc: '消融实验矩阵 · GPU 调度看板',
                tag: '可复现追踪',
                accent: '#d97706',
                bg: 'rgba(217, 119, 6, 0.1)',
              },
              {
                icon: 'shield',
                title: '多智能体专家严谨预审',
                desc: '5 维盲审同行体检 · 避坑指南',
                tag: '顶刊标准',
                accent: '#7c3aed',
                bg: 'rgba(124, 58, 237, 0.1)',
              },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  padding: '16px 18px',
                  borderRadius: 16,
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid rgba(220, 235, 226, 0.95)',
                  backdropFilter: 'blur(12px)',
                  boxShadow: '0 4px 16px -2px rgba(15, 35, 24, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  transition: 'all 0.2s ease',
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
                      background: item.bg,
                      color: item.accent,
                      fontWeight: 700,
                    }}
                  >
                    {item.tag}
                  </span>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14.5, color: '#13281e' }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: '#52695c', marginTop: 3, lineHeight: 1.45 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 科研学术数据指标展示（纯白浮雕卡） */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 16,
              marginTop: 26,
              padding: '16px 20px',
              borderRadius: 16,
              background: '#ffffff',
              border: '1px solid #dcebe2',
              boxShadow: '0 4px 14px rgba(15, 35, 24, 0.04)',
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
                    fontSize: 21,
                    fontWeight: 800,
                    color: '#059669',
                  }}
                >
                  {s.val}
                </div>
                <div style={{ fontSize: 12, color: '#5e7568', marginTop: 2, fontWeight: 500 }}>{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 左侧底部留白自然过渡 */}
        <div style={{ height: 6 }} />
      </div>

      {/* ============================================================
          右侧：全屏开阔表单工作区 (占屏 45%，高级翡翠与琥珀暖色调·非蓝色调)
          ============================================================ */}
      <div
        style={{
          flex: 1,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(175deg, #ffffff 0%, #faf8f3 100%)',
          padding: 'clamp(32px, 5vw, 64px)',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        {/* 核心登录/注册表单容器 (纯净、开阔、大气、高级翠绿暖金) */}
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
                background: 'linear-gradient(135deg, #10b981 0%, #059669 60%, #047857 100%)',
                color: '#ffffff',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(5, 150, 105, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.35)',
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
                color: '#13281e',
                letterSpacing: '-0.3px',
              }}
            >
              {mode === 'login' ? '学者账号登录' : '开启 ScienceX 科研之旅'}
            </h2>
            <p style={{ color: '#5f7367', fontSize: 14, margin: 0, lineHeight: 1.5 }}>
              {mode === 'login'
                ? '输入学术账号，进入专属全流程科研工作台'
                : '免费开通学术席位，无需复杂环境配置即可体验'}
            </p>
          </div>

          {/* 胶囊分段控制器 (Segmented Tab Control - 翠绿温润调) */}
          <div
            style={{
              display: 'flex',
              padding: 4,
              background: '#edf4f0',
              borderRadius: 14,
              marginBottom: 24,
              border: '1px solid #dce8e1',
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
                color: mode === 'login' ? '#047857' : '#5e7568',
                boxShadow: mode === 'login' ? '0 2px 8px rgba(5, 150, 105, 0.1)' : 'none',
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
                color: mode === 'register' ? '#047857' : '#5e7568',
                boxShadow: mode === 'register' ? '0 2px 8px rgba(5, 150, 105, 0.1)' : 'none',
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
                    color: '#1a2e23',
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
                      border: '1px solid #d0dfd6',
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
                      color: '#829b8d',
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
                  color: '#1a2e23',
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
                    border: '1px solid #d0dfd6',
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
                    color: '#829b8d',
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
                <label style={{ fontWeight: 600, fontSize: 13.5, margin: 0, color: '#1a2e23' }}>
                  登录密码
                </label>
                {mode === 'login' && (
                  <span
                    onClick={() => toast('密码重置入口已联通，可直接使用下方演示账号一键登录')}
                    style={{ fontSize: 12.5, color: '#059669', cursor: 'pointer', fontWeight: 600 }}
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
                  placeholder="至少 8 位安全字符"
                  required
                  minLength={8}
                  style={{
                    paddingLeft: 44,
                    paddingRight: 46,
                    height: 48,
                    fontSize: 15,
                    borderRadius: 12,
                    border: '1px solid #d0dfd6',
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
                    color: '#829b8d',
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
                    color: '#829b8d',
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

            {/* 主提交按钮 - 采用高级翡翠翠绿微光 */}
            <button
              type="submit"
              className="btn btn-block"
              disabled={loading}
              style={{
                height: 50,
                fontSize: 16,
                fontWeight: 700,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 60%, #047857 100%)',
                boxShadow: '0 8px 24px -4px rgba(5, 150, 105, 0.42)',
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

          {/* 官方学者演示席位（一键极速体验 - 琥珀金与翡翠微光调） */}
          {mode === 'login' && (
            <div
              style={{
                marginTop: 22,
                padding: '14px 18px',
                borderRadius: 14,
                background: '#ffffff',
                border: '1px solid #dce8e1',
                boxShadow: '0 4px 14px rgba(15, 35, 24, 0.04)',
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
                    background: '#fef3c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#d97706',
                    flexShrink: 0,
                  }}
                >
                  <Icon name="spark" size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#688072', fontWeight: 600 }}>官方学术演示席位</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#047857', fontFamily: 'var(--font-mono)' }}>
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
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  boxShadow: '0 3px 10px rgba(5, 150, 105, 0.25)',
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
