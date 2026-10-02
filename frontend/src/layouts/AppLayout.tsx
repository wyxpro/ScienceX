/* 应用布局：左侧边栏（桌面）/ 抽屉（移动端）+ 顶栏 + 内容区 */
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Icon, { type IconName } from '../components/Icon';
import { useAuth } from '../stores/auth';

interface NavItem { to: string; label: string; icon: IconName }
interface NavGroup { title: string; items: NavItem[] }

const GROUPS: NavGroup[] = [
  { title: '工作台', items: [{ to: '/chat', label: 'AI 对话工作台', icon: 'chat' }] },
  {
    title: '科研工具', items: [
      { to: '/tools/topic', label: '选题灵感', icon: 'bulb' },
      { to: '/tools/reader', label: '文献阅读', icon: 'book' },
      { to: '/tools/experiment', label: '实验设计', icon: 'flask' },
      { to: '/tools/analysis', label: '数据分析', icon: 'chart' },
      { to: '/tools/writing', label: '论文写作', icon: 'pen' },
      { to: '/tools/submission', label: '投稿助手', icon: 'mail' },
    ],
  },
  {
    title: '特色功能', items: [
      { to: '/features/meeting', label: '组会汇报', icon: 'users' },
      { to: '/features/review', label: '专家评审团', icon: 'award' },
    ],
  },
  { title: '协作空间', items: [{ to: '/projects', label: '我的项目', icon: 'layers' }] },
  { title: '个人中心', items: [{ to: '/account', label: '设置与管理', icon: 'settings' }] },
];

const TITLES: Record<string, [string, string]> = {
  '/chat': ['AI 对话工作台', '对话即工作台 · 工具即智能体'],
  '/tools/topic': ['选题灵感', '多源检索 · 选题推荐 · 可行性评估 · 开题报告'],
  '/tools/reader': ['文献阅读', '三栏联动 · 翻译 · 思维导图 · 引用图谱'],
  '/tools/experiment': ['实验设计', '参数看板 · GPU 监控 · 方案生成 · SOTA 对标'],
  '/tools/analysis': ['数据分析', '科研图表生成 · 示例库 · AI 解读'],
  '/tools/writing': ['论文写作', '对照阅读 · 互译 · 润色 · 查重 · 降重'],
  '/tools/submission': ['投稿助手', 'CCF 期刊大全 · 倒计时 · 匹配推荐'],
  '/features/meeting': ['组会汇报', 'PPT 一键生成 · 导师建议记录'],
  '/features/review': ['多智能体专家评审团', '五角色并行评审 · 冲突分析 · 审稿报告'],
  '/projects': ['我的项目', '项目空间 · 课题组 · RAG 知识库'],
  '/account': ['个人中心', '资料偏好 · 模型管理 · 用量 · 订阅 · 安全'],
};

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();

  useEffect(() => { setOpen(false); }, [loc.pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const [title, sub] = TITLES[loc.pathname] || ['ScienceX', 'AI 科研工作台'];

  const sidebar = (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sb-logo">
        <div className="sb-logo-mark"><Icon name="flask" size={19} /></div>
        <div>
          <div className="sb-logo-name">ScienceX</div>
          <div className="sb-logo-sub">AI Research Workbench</div>
        </div>
      </div>
      <nav className="sb-scroll">
        {GROUPS.map((g) => (
          <div className="sb-group" key={g.title}>
            <div className="sb-group-title">{g.title}</div>
            {g.items.map((it) => (
              <NavLink key={it.to} to={it.to} className={({ isActive }) => `sb-item ${isActive ? 'active' : ''}`}>
                <span className="sb-ic"><Icon name={it.icon} size={17} /></span>
                <span>{it.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="sb-user" onClick={() => nav('/account')}>
        <div className="avatar" style={{ width: 30, height: 30, fontSize: 12.5, borderWidth: 0 }}>{user?.name?.[0] || '研'}</div>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="sb-user-name ellipsis">{user?.name || '未登录'}</div>
          <div className="sb-user-plan">{user?.plan === 'pro' ? 'Pro 专业版' : user?.plan === 'team' ? 'Team 团队版' : 'Free 免费版'}</div>
        </div>
        <button className="btn btn-ghost btn-icon" style={{ borderColor: 'rgba(255,255,255,.14)', color: '#a9bcb2', padding: 5 }}
          onClick={(e) => { e.stopPropagation(); logout(); }} title="退出登录">
          <Icon name="logout" size={14} />
        </button>
      </div>
    </aside>
  );

  return (
    <div className="app-shell">
      {sidebar}
      {open && <div className="scrim mobile-only" onClick={() => setOpen(false)} />}
      <div className="main-area">
        <header className="topbar">
          <button className="btn btn-ghost btn-icon hamburger" onClick={() => setOpen(true)}><Icon name="menu" size={19} /></button>
          <div style={{ minWidth: 0 }}>
            <div className="topbar-title">{title}</div>
            <div className="topbar-sub">{sub}</div>
          </div>
          <div className="topbar-right">
            <button className="chip-project" onClick={() => nav('/projects')}>
              <Icon name="layers" size={13} />
              <span className="desktop-only">当前项目 · 微表情识别（MER）研究</span>
              <span className="mobile-only">MER 研究</span>
            </button>
            <div className="avatar desktop-only" onClick={() => nav('/account')} title={user?.name}>
              {user?.name?.[0] || '研'}
            </div>
          </div>
        </header>
        <main className="page-scroll" id="page-scroll">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
