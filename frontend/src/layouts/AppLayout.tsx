/* 应用布局：左侧边栏（桌面）/ 抽屉（移动端）+ 顶栏 + 内容区 */
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Icon, { type IconName } from '../components/Icon';
import { useAuth } from '../stores/auth';
import { useProject } from '../stores/project';
import { ProjectSpaceModal } from '../components/ProjectSpaceModal';

interface NavItem { to: string; label: string; icon: IconName }
interface NavGroup { title?: string; items: NavItem[] }

const GROUPS: NavGroup[] = [
  { items: [{ to: '/chat', label: 'AI 工作台', icon: 'chat' }] },
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
      { to: '/features/reproduce', label: '论文复现', icon: 'branch' },
    ],
  },
  { title: '协作空间', items: [{ to: '/projects', label: '我的项目', icon: 'layers' }] },
];

const TITLES: Record<string, [string, string]> = {
  '/chat': ['AI 工作台', '对话即工作台 · 工具即智能体'],
  '/tools/topic': ['选题灵感', '多源检索 · 选题推荐 · 可行性评估 · 开题报告'],
  '/tools/reader': ['文献阅读', '三栏联动 · 翻译 · 思维导图 · 引用图谱'],
  '/tools/experiment': ['实验设计', '参数看板 · GPU 监控 · 方案生成 · SOTA 对标'],
  '/tools/analysis': ['数据分析', '科研图表生成 · 示例库 · AI 解读'],
  '/tools/writing': ['论文写作', '对照阅读 · 互译 · 润色 · 查重 · 降重'],
  '/tools/submission': ['投稿助手', 'CCF 期刊大全 · 倒计时 · 匹配推荐'],
  '/features/meeting': ['组会汇报', 'PPT 一键生成 · 导师建议记录'],
  '/features/review': ['多智能体专家评审团', '五角色并行评审 · 冲突分析 · 审稿报告'],
  '/features/reproduce': ['论文复现', '代码解析 · 环境搭建 · 基线对齐 · 结果比对'],
  '/projects': ['我的项目', '项目空间 · 课题组 · RAG 知识库'],
  '/account': ['设置与管理', '资料偏好 · 模型管理 · 用量 · 订阅 · 安全'],
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { currentProject } = useProject();
  const loc = useLocation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [loc.pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const [title, sub] = TITLES[loc.pathname] || ['ScienceX', 'AI 科研工作台'];

  const sidebar = (
    <aside className={`sidebar ${open ? 'open' : ''} ${collapsed ? 'collapsed' : ''}`}>
      {/* 侧边栏精简顶部：去除 AI 工作台上方原有的大块占位，仅保留轻巧小巧的折叠手柄 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '12px 0 6px' : '12px 14px 6px',
        }}
      >
        {!collapsed && (
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sb-text-dim)', letterSpacing: 1.2, textTransform: 'uppercase' }}>
            导航目录
          </span>
        )}
        <button
          type="button"
          className="btn btn-ghost btn-icon btn-sm"
          style={{ width: 24, height: 24, color: 'var(--sb-text-dim)', borderRadius: 6, padding: 0 }}
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? '展开左侧边栏' : '折叠收起左侧边栏'}
        >
          <Icon name="chevronDown" size={13} style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(90deg)' }} />
        </button>
      </div>

      <nav className="sb-scroll" style={{ paddingTop: 4 }}>
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
        <header className="topbar">
          <button className="btn btn-ghost btn-icon hamburger" onClick={() => setOpen(true)}><Icon name="menu" size={19} /></button>
          
          {/* 顶栏左侧：标题与【课题空间】管理交互组件 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
            <div style={{ minWidth: 0 }}>
              <div className="topbar-title">{title}</div>
              <div className="topbar-sub">{sub}</div>
            </div>

            {/* 课题空间组件：替代原静态按钮，支持点击后选择、添加、删除项目 */}
            <button
              type="button"
              className="chip-project"
              onClick={() => setProjectModalOpen(true)}
              style={{
                marginLeft: 4,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 14px',
                borderRadius: 999,
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.08) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                color: '#065f46',
                fontSize: 12.5,
                fontWeight: 700,
                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.08)',
                transition: 'all 0.2s ease',
                flexShrink: 0,
              }}
              title="点击打开课题空间：支持选择已有课题、新建课题或删除课题"
            >
              <Icon name="layers" size={14} style={{ color: '#10b981' }} />
              <span>课题空间 · {currentProject?.name || currentProject?.title || '微表情识别（MER）研究'}</span>
              <Icon name="chevronDown" size={11} style={{ color: '#059669', opacity: 0.75 }} />
            </button>
          </div>

          {/* 顶栏右侧：“ScienceX AI科研全流程”文字与品牌标志在右边显示 */}
          <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '5px 12px',
                borderRadius: 10,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)',
                cursor: 'pointer',
              }}
              onClick={() => nav('/landing')}
              title="前往 ScienceX 官网主页"
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 7,
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.35)',
                }}
              >
                <Icon name="flask" size={13} />
              </div>
              <div style={{ lineHeight: 1.18, textAlign: 'left' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 13, fontWeight: 800, color: '#142820', letterSpacing: 0.2 }}>
                  ScienceX
                </div>
                <div style={{ fontSize: 9.5, color: '#64748b', letterSpacing: 0.8, fontWeight: 700 }}>
                  AI 科研全流程
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="page-scroll" id="page-scroll">
          <Outlet />
        </main>
      </div>

      {/* 课题空间模态弹窗：选择、添加、删除课题项目 */}
      <ProjectSpaceModal
        open={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
      />
    </div>
  );
}
