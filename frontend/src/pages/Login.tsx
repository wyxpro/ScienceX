/* ============================================================
   ScienceX 电脑端全屏双栏沉浸式登录 / 注册页 (Full-screen Split Canvas)
   国际顶尖学术与科技工作台质感 · 100vh 满屏无拘束 · 呼吸感开阔大方
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
          左侧：全屏沉浸式学术科研展示长卷 (占屏 56%，深邃翡翠绿夜)
          ============================================================ */}
      <div
        className="desktop-only"
        style={{
          flex: '0 0 56%',
          width: '56%',
          height: '100vh',
          background: 'radial-gradient(130% 120% at 15% 15%, #183729 0%, #0f241a 55%, #081710 100%)',
          color: '#eaf4ee',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 'clamp(40px, 4.5vw, 64px) clamp(44px, 5vw, 76px)',
          position: 'relative',
          overflow: 'hidden',
          borderRight: '1px solid rgba(127, 208, 174, 0.16)',
          boxShadow: '10px 0 40px rgba(8, 23, 16, 0.18)',
        }}
      >
        {/* 背景动态装饰微网格与极光流光球 */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {/* 顶部中央极光微晕 */}
          <div
            style={{
              position: 'absolute',
              top: '-20%',
              left: '20%',
              width: 580,
              height: 580,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(127, 208, 174, 0.16) 0%, rgba(27, 122, 94, 0.04) 50%, transparent 70%)',
              filter: 'blur(70px)',
            }}
          />
          {/* 左下微琥珀金光晕 */}
          <div
            style={{
              position: 'absolute',
              bottom: '-15%',
              left: '-10%',
              width: 480,
              height: 480,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(194, 118, 43, 0.1) 0%, transparent 65%)',
              filter: 'blur(80px)',
            }}
          />
          {/* 学术坐标细网格 */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.35 }}>
            <defs>
              <pattern id="full-grid" width="36" height="36" patternUnits="userSpaceOnUse">
                <path d="M 36 0 L 0 0 0 36" fill="none" stroke="rgba(255, 255, 255, 0.065)" strokeWidth="0.8" />
                <circle cx="36" cy="0" r="1" fill="rgba(127, 208, 174, 0.2)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#full-grid)" />
          </svg>
        </div>

        {/* 左侧头部：品牌 Logo */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div
            onClick={() => nav('/landing')}
            style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', userSelect: 'none' }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 13,
                background: 'linear-gradient(135deg, #248a6a 0%, #0d4e38 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 20px rgba(27, 122, 94, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
              }}
            >
              <Icon name="flask" size={24} />
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 24,
                  fontWeight: 800,
                  color: '#ffffff',
                  letterSpacing: '-0.3px',
                  lineHeight: 1.1,
                }}
              >
                ScienceX
              </div>
              <div style={{ fontSize: 11.5, color: '#90b4a1', letterSpacing: 0.5, marginTop: 2, fontWeight: 500 }}>
                AI 科研全流程协同工作台
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 14px',
              borderRadius: 20,
              background: 'rgba(255, 255, 255, 0.07)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(8px)',
              fontSize: 12,
              color: '#8be2bf',
              fontWeight: 600,
            }}
          >
            <Icon name="award" size={14} /> 顶尖高校与科研机构专享
          </div>
        </div>

        {/* 左侧主体内容：学术愿景与科技链路卡片 */}
        <div style={{ position: 'relative', zIndex: 2, margin: 'auto 0', padding: '24px 0' }}>
          {/* 态势标签 */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              borderRadius: 999,
              background: 'rgba(255, 255, 255, 0.07)',
              border: '1px solid rgba(127, 208, 174, 0.28)',
              color: '#8fe0be',
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
                background: '#4ade80',
                boxShadow: '0 0 10px #4ade80',
                display: 'inline-block',
              }}
            />
            2026 AI 原生学术生产力中枢 · 面向学者全流程赋能
          </div>

          {/* 醒目标题 */}
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(32px, 3vw, 44px)',
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
                background: 'linear-gradient(90deg, #7fe0b8 0%, #bcf2dd 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              让 AI 承接 60% 的重复劳动
            </span>
          </h1>

          <p
            style={{
              color: '#b6ccc0',
              fontSize: 15.5,
              lineHeight: 1.85,
              marginBottom: 36,
              maxWidth: '92%',
            }}
          >
            从选题灵感检索、文献思维导图、实验矩阵设计，到论文润色对照与 5 维多智能体专家预审，把繁复机械的工具链交给 AI，让学者专注提出好问题与科学创新本身。
          </p>

          {/* 四大科研支柱网格卡片 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {[
              {
                icon: 'bulb',
                title: '选题灵感与前沿雷达',
                desc: '多源趋势聚类 · 创新可行性评估',
                tag: 'CVPR / Nature',
              },
              {
                icon: 'book',
                title: '文献沉浸精读与导图',
                desc: 'AUFormer 导图 · 跨模态公式拆解',
                tag: '双语对照',
              },
              {
                icon: 'flask',
                title: '实验设计与资产复现',
                desc: '消融实验矩阵 · GPU 调度看板',
                tag: '可复现追踪',
              },
              {
                icon: 'shield',
                title: '多智能体专家严谨预审',
                desc: '5 维盲审同行体检 · 避坑指南',
                tag: '顶刊标准',
              },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  padding: '16px 18px',
                  borderRadius: 16,
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.09)',
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
                      background: 'rgba(127, 208, 174, 0.16)',
                      color: '#7fe0b8',
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
                      color: '#8fe0be',
                      fontWeight: 600,
                    }}
                  >
                    {item.tag}
                  </span>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14.5, color: '#f3faf6' }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: '#90ae9f', marginTop: 3, lineHeight: 1.45 }}>{item.desc}</div>
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
              background: 'rgba(0, 0, 0, 0.16)',
              border: '1px solid rgba(255, 255, 255, 0.07)',
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
                    color: '#7fe0b8',
                  }}
                >
                  {s.val}
                </div>
                <div style={{ fontSize: 11.5, color: '#88a496', marginTop: 2 }}>{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 左侧底部：合规与学术信任 */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            paddingTop: 18,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 12.5,
            color: '#8faea0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#f59e0b' }}>{'★'.repeat(5)}</span>
            <span>已赋能清华、北大、中科大等高校科研团队</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#749b88' }}>
            <Icon name="shield" size={14} /> 数据端到端本地加密 · 严禁公开模型训练
          </div>
        </div>
      </div>

      {/* ============================================================
          右侧：全屏开阔学术表单工作区 (占屏 44%，温润象牙暖纸与纯净呼吸感)
          ============================================================ */}
      <div
        style={{
          flex: 1,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(175deg, #fdfbf7 0%, #f6f3eb 100%)',
          padding: 'clamp(28px, 4vw, 44px) clamp(32px, 5vw, 64px)',
          overflowY: 'auto',
          position: 'relative',
        }}
      >
        {/* 顶部辅助操作栏 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* 移动端品牌徽标（仅在无左侧栏时显示） */}
          <div
            className="mobile-only"
            onClick={() => nav('/landing')}
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #1b7a5e 0%, #0d4835 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="flask" size={20} />
            </div>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 800, color: '#13241b' }}>
              ScienceX
            </span>
          </div>

          <div style={{ marginLeft: 'auto' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => nav('/landing')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: '#2a3c32',
                fontSize: 13.5,
                fontWeight: 600,
                padding: '8px 18px',
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.75)',
                border: '1px solid rgba(214, 208, 192, 0.9)',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                transition: 'all 0.2s ease',
              }}
            >
              <Icon name="arrowLeft" size={14} /> 返回官网宣传页
            </button>
          </div>
        </div>

        {/* 核心登录/注册表单容器 (居中、开阔大方、无局促感) */}
        <div
          style={{
            maxWidth: 440,
            width: '100%',
            margin: 'auto',
            padding: '20px 0',
          }}
        >
          {/* 表单头部欢迎词 */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div
              style={{
                display: 'inline-flex',
                width: 56,
                height: 56,
                borderRadius: 18,
                background: 'linear-gradient(145deg, #1f7f62 0%, #104e3b 100%)',
                color: '#ffffff',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 22px rgba(27, 122, 94, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.25)',
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
            <p style={{ color: '#687970', fontSize: 14, margin: 0, lineHeight: 1.5 }}>
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
              background: '#ede8dc',
              borderRadius: 14,
              marginBottom: 24,
              border: '1px solid rgba(214, 208, 192, 0.8)',
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
                color: mode === 'login' ? '#14624a' : '#6b7b72',
                boxShadow: mode === 'login' ? '0 2px 8px rgba(18, 38, 28, 0.12)' : 'none',
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
                color: mode === 'register' ? '#14624a' : '#6b7b72',
                boxShadow: mode === 'register' ? '0 2px 8px rgba(18, 38, 28, 0.12)' : 'none',
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
                    color: '#1d3428',
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
                      border: '1px solid #d4cec0',
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
                      color: '#7b8d83',
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
                  color: '#1d3428',
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
                    border: '1px solid #d4cec0',
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
                    color: '#7b8d83',
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
                <label style={{ fontWeight: 600, fontSize: 13.5, margin: 0, color: '#1d3428' }}>
                  登录密码
                </label>
                {mode === 'login' && (
                  <span
                    onClick={() => toast('密码重置入口已联通，可直接使用下方演示账号一键登录')}
                    style={{ fontSize: 12.5, color: '#1b7a5e', cursor: 'pointer', fontWeight: 600 }}
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
                    border: '1px solid #d4cec0',
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
                    color: '#7b8d83',
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
                    color: '#7b8d83',
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
              className="btn btn-primary btn-block"
              disabled={loading}
              style={{
                height: 50,
                fontSize: 16,
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
                padding: '13px 18px',
                borderRadius: 14,
                background: '#ffffff',
                border: '1px solid rgba(214, 208, 192, 0.95)',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.03)',
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
                    background: '#f3efe6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#c2762b',
                    flexShrink: 0,
                  }}
                >
                  <Icon name="spark" size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#6a7b72', fontWeight: 600 }}>官方学术演示席位</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#14624a', fontFamily: 'var(--font-mono)' }}>
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
                  background: 'linear-gradient(135deg, #1b7a5e 0%, #135d46 100%)',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  boxShadow: '0 3px 10px rgba(27, 122, 94, 0.25)',
                  transition: 'all 0.18s ease',
                }}
              >
                ⚡ 一键极速体验
              </button>
            </div>
          )}

          {/* 学术单点登录 / 机构联盟拓展通道 */}
          <div style={{ marginTop: 26, paddingTop: 20, borderTop: '1px solid #e7e2d4' }}>
            <div
              style={{
                fontSize: 12,
                color: '#76877e',
                textAlign: 'center',
                marginBottom: 12,
                fontWeight: 500,
              }}
            >
              高校科研联盟与第三方学术凭据授权
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={() => toast('已连接 CARSI 中国教育科研身份认证联盟通道')}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: 11,
                  background: '#ffffff',
                  border: '1px solid #dcd7ca',
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: '#283c31',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                <Icon name="award" size={15} /> CARSI 高校认证
              </button>
              <button
                type="button"
                onClick={() => toast('已接入 ORCID 国际学术身份关联网关')}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: 11,
                  background: '#ffffff',
                  border: '1px solid #dcd7ca',
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: '#283c31',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                <Icon name="link" size={15} /> ORCID 学者凭据
              </button>
            </div>
          </div>
        </div>

        {/* 底部版权与安全保障 */}
        <div
          style={{
            textAlign: 'center',
            fontSize: 12,
            color: '#788980',
            paddingTop: 16,
            borderTop: '1px solid rgba(230, 225, 214, 0.8)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span>© 2026 ScienceX · AI 科研协同工作台</span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Icon name="shield" size={12} /> 端到端隐私加密保护
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
