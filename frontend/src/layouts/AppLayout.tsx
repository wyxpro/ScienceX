/* 应用布局：左侧边栏（桌面）/ 抽屉（移动端）+ 顶栏 + 内容区 */
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Icon, { type IconName } from '../components/Icon';
import { useAuth } from '../stores/auth';

interface NavItem { to: string; label: string; icon: IconName }
interface NavGroup { title?: string; items: NavItem[] }

const GROUPS: NavGroup[] = [
  {
    items: [
      { to: '/chat', label: 'AI 工作台', icon: 'chat' },
    ],
  },
  {
    title: '科研工具', items: [
      { to: '/tools/topic', label: '选题灵感', icon: 'bulb' },
      { to: '/tools/reader', label: '文献阅读', icon: 'book' },
      { to: '/tools/experiment', label: '实验设计', icon: 'flask' },
      { to: '/tools/analysis', label: '数据图表', icon: 'chart' },
      { to: '/tools/writing', label: '论文写作', icon: 'pen' },
      { to: '/tools/submission', label: '投稿助手', icon: 'mail' },
    ],
  },
  {
    title: '特色功能', items: [
      { to: '/features/reproduce', label: '论文复现', icon: 'branch' },
      { to: '/features/meeting', label: '组会汇报', icon: 'users' },
      { to: '/features/review', label: '专家评审团', icon: 'award' },
    ],
  },
];

const TITLES: Record<string, [string, string]> = {
  '/projects': ['课题空间', '项目空间 · 进度与资产'],
  '/chat': ['AI 工作台', '对话即工作台 · 工具即智能体'],
  '/tools/topic': ['选题灵感', '多源检索 · 选题推荐 · 可行性评估 · 开题报告'],
  '/tools/reader': ['文献阅读', '三栏联动 · 翻译 · 思维导图 · 引用图谱'],
  '/tools/experiment': ['实验设计', '参数看板 · GPU 监控 · 方案生成 · SOTA 对标'],
  '/tools/analysis': ['数据图表', '科研图工作台 · 两阶段生成 · 10 类科研图表模板 · 生图模型可选'],
  '/tools/writing': ['论文写作', '对照阅读 · 互译 · 润色 · 查重 · 降重'],
  '/tools/submission': ['投稿助手', 'CCF 期刊大全 · 倒计时 · 匹配推荐'],
  '/features/meeting': ['组会汇报', 'PPT 一键生成 · 导师建议记录'],
  '/features/review': ['多智能体专家评审团', '五角色并行评审 · 冲突分析 · 审稿报告'],
  '/features/reproduce': ['论文复现', '代码解析 · 环境搭建 · 基线对齐 · 结果比对'],
  '/account': ['设置与管理', '资料偏好 · 模型管理 · 用量 · 订阅 · 安全'],
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => { setOpen(false); }, [loc.pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const [title, sub] = TITLES[loc.pathname] || ['ScienceX', 'AI 科研工作台'];

  const sidebar = (
    <aside className={`sidebar ${open ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>
      {/* 经典的 ScienceX AI 科研全流程 Logo 常驻左上角 */}
      <div className="sb-logo" style={{ cursor: 'pointer' }} onClick={() => nav('/landing')} title="前往官网宣传页">
        <div className="sb-logo-mark"><img src="/logo.png" alt="ScienceX Logo" /></div>
        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <div className="sb-logo-name">ScienceX</div>
            <div className="sb-logo-sub">AI 科研全流程</div>
          </div>
        )}
      </div>

      <nav className="sb-scroll" style={{ paddingTop: 8 }}>
        {GROUPS.map((g, idx) => (
          <div className="sb-group" key={g.title || idx}>
            {!collapsed && g.title && <div className="sb-group-title">{g.title}</div>}
            {g.items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                className={({ isActive }) => `sb-item ${isActive ? 'active' : ''}`}
                title={collapsed ? it.label : undefined}
              >
                <span className="sb-ic"><Icon name={it.icon} size={17} /></span>
                {!collapsed && <span>{it.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* 课题空间入口：设计全新轻奢质感卡片按钮 */}
      <div style={{ padding: '0 10px', marginBottom: 8 }}>
        <NavLink
          to="/projects"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: collapsed ? '9px 0' : '9px 12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: 11,
            textDecoration: 'none',
            background: isActive
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.16) 0%, rgba(5, 150, 105, 0.22) 100%)'
              : 'linear-gradient(135deg, rgba(241, 245, 249, 0.75) 0%, rgba(248, 250, 252, 0.95) 100%)',
            border: isActive ? '1.5px solid rgba(16, 185, 129, 0.45)' : '1px solid rgba(226, 232, 240, 0.9)',
            boxShadow: isActive
              ? '0 3px 12px -2px rgba(16, 185, 129, 0.22)'
              : '0 1px 3px rgba(0, 0, 0, 0.02)',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            cursor: 'pointer',
          })}
          title={collapsed ? '课题空间' : undefined}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none';
          }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
              flexShrink: 0,
            }}
          >
            <Icon name="layers" size={15} />
          </span>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.2px' }}>
                  课题空间
                </span>
                <span style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: -1 }}>
                  进度与全链资产
                </span>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: 'var(--brand-strong)',
                  background: 'var(--brand-soft)',
                  padding: '1px 6px',
                  borderRadius: 6,
                }}
              >
                Space
              </span>
            </div>
          )}
        </NavLink>
      </div>

      <div className="sb-user" onClick={() => nav('/account')} title={collapsed ? '设置与管理' : undefined}>
        <div className="avatar" style={{ width: 30, height: 30, fontSize: 12.5, borderWidth: 0 }}>{user?.name?.[0] || '研'}</div>
        {!collapsed && (
          <>
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="sb-user-name ellipsis">{user?.name || '未登录'}</div>
              <div className="sb-user-plan">{user?.plan === 'pro' ? 'Pro 专业版' : user?.plan === 'team' ? 'Team 团队版' : 'Free 免费版'}</div>
            </div>
            <button className="btn btn-ghost btn-icon" style={{ borderColor: 'var(--sb-border)', color: 'var(--sb-text-dim)', padding: 5, background: 'transparent' }}
              onClick={(e) => { e.stopPropagation(); logout(); }} title="退出登录">
              <Icon name="logout" size={14} />
            </button>
          </>
        )}
      </div>
    </aside>
  );

  return (
    <div className="app-shell">
      {sidebar}
      {open && <div className="scrim mobile-only" onClick={() => setOpen(false)} />}
      <div className="main-area">
        {loc.pathname !== '/chat' && (
          <header className="topbar">
            <button className="btn btn-ghost btn-icon hamburger" onClick={() => setOpen(true)}><Icon name="menu" size={19} /></button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
              <div style={{ minWidth: 0 }}>
                <div className="topbar-title">{title}</div>
                <div className="topbar-sub">{sub}</div>
              </div>
            </div>
          </header>
        )}

        <main className="page-scroll" id="page-scroll">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
