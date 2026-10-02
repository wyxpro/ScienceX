/* ScienceX 官网宣传页 —— 电脑 & 移动端全适配
   3D 视差动效、跑马灯、特色轮播图、雷达图、竞品全景对比表、用户画像与定价 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import '../styles/landing.css';

// 轮播图与六大科研工具数据
const CAROUSEL_SLIDES = [
  {
    id: 'topic',
    tag: '1. 选题灵感与开题论证',
    title: '💡 顶会前沿缺口洞察与开题论证引擎',
    desc: '从海量顶会中挖掘前沿创新缺口。基于对标 SOTA 自动分析研究可行性，自动提炼跨层交互、数据增广与域适应方案，一键生成结构化开题报告与可行性评估雷达。',
    badge: '学术热点 · 可行性雷达',
    stats: ['秒级顶会论文关联检索', '自动论证 3 大细分缺口', '生成规范开题报告骨架'],
    mockupType: 'topic',
  },
  {
    id: 'chat',
    tag: '2. 交互中枢',
    title: '💬 AI 对话工作台：工具即智能体',
    desc: '彻底颠覆单一窗口问答模式。以对话为神经中枢，无缝调度文献、实验、写作与评审。支持自定义接入 GPT-4o、Claude 3.5、DeepSeek 等任意兼容 OpenAI 协议的模型，支持 Skills 扩展与 MCP 外部协议。',
    badge: '模型中立 · 开放扩展',
    stats: ['秒级 SSE 流式应答', '全链路任务进度追踪', '多会话上下文持久沉淀'],
    mockupType: 'chat',
  },
  {
    id: 'reader',
    tag: '3. 文献深度研读',
    title: '📖 三栏沉浸精读与多层级引用图谱',
    desc: '打破传统 PDF 查看器局限。左右联动视窗，专业学术术语逐段双向互译；一键自动解构全文，生成交互式思维导图与七段式学术骨架；精准提取文献 DOI，自动绘制多层级引用网络图谱。',
    badge: '结构化解析 · 引用溯源',
    stats: ['段落级精准 RAG 召回', '公式自动 LaTeX 化', '思维导图一键导出'],
    mockupType: 'reader',
  },
  {
    id: 'experiment',
    tag: '4. 实验与算力管理',
    title: '🧫 自动化消融矩阵设计与 GPU 集群看板',
    desc: '不再为实验方案拍脑袋。输入研究目标，AI 智能体基于 SOTA 对标自动推导控制变量、自变量矩阵与多轮消融方案；直连实验室 GPU 节点，显存负载与温度秒级刷新，算力调度一目了然。',
    badge: 'SOTA 对标 · 算力监控',
    stats: ['消融矩阵一键生成', '4090/A100/H800 节点监控', '参数看板版本可追溯'],
    mockupType: 'experiment',
  },
  {
    id: 'writing',
    tag: '5. 期刊级写作与查重',
    title: '✍️ 学术精细润色 Diff 与双通道查重',
    desc: '比普通润色更懂学术期刊偏好。逐句输出前后对比 Diff，标明词汇升级与相对提升表达理由；整合自建学术库与联网双重通道 AI 相似度查重，提供高保真语义降重建议，守护学术纯洁性。',
    badge: '逐句 Diff · 保义降重',
    stats: ['Nature/IEEE 期刊风格定制', '相似度片段精确定位', '中英双向术语严格对齐'],
    mockupType: 'writing',
  },
  {
    id: 'review',
    tag: '6. 同行评议创新',
    title: '🧑‍⚖️ 5角色多智能体专家盲审评议团',
    desc: '在投稿前进行残酷而真实的同行盲审！理论推导、方法创新、实验设计、写作规范与学术伦理 5 位智能体评审员并行审阅，主审主席综合仲裁，提前排查拒稿隐患，出具权威评审报告。',
    badge: '五角色并行 · 主席仲裁',
    stats: ['模拟 CCF 顶会评议标准', '自动定位冲突分歧点', '生成可执行返修清单'],
    mockupType: 'review',
  },
];

// 用户画像数据
const PERSONAS = [
  {
    id: 'student',
    title: '硕博研究生',
    icon: 'bulb',
    roleDesc: '科研新手到中坚力量，面临开题、跑通 Baseline 与论文毕业硬指标',
    pains: ['开题调研摸不着头脑，大量英文文献读了后面忘前面', '实验消融方案拍脑袋，缺少完备的对比基线 (Baseline)', '英文写作口语化严重，多次改稿被导师批评表达不专业'],
    solves: ['多源学术检索 + 5 维可行性雷达论证 + 一键生成开题报告', '自动化消融实验矩阵推导，同协议 SOTA 排行榜实时对标', '期刊风格学术润色，提供逐词 Diff 对比与地道量化表达替换'],
  },
  {
    id: 'faculty',
    title: '高校教师与青年学者',
    icon: 'users',
    roleDesc: '承担科研项目、基金申报与实验室管理，追求高水平产出与团队传承',
    pains: ['每周指导多位学生组会汇报耗时耗力，修改意见零散易遗忘', '申报国家自然科学基金时间紧迫，研究现状梳理繁琐', '审稿把关工作繁重，难以快速排查学生论文实验中的潜在漏洞'],
    solves: ['组会汇报 PPTX 一键排版生成，录音及文字建议自动提取为待办', '基于专属 RAG 课题组知识库快速萃取近 3 年前沿综述与研究空白', '启动「5 角色专家评审团」进行内部模拟盲审，提前拦截退稿风险'],
  },
  {
    id: 'industry',
    title: '企业与产业研发实验室',
    icon: 'cpu',
    roleDesc: '关注技术落地、SOTA 复现与高价值专利白皮书撰写',
    pains: ['顶会开源代码复现周期长，参数配置混乱无法复现真实指标', '多卡 GPU 集群算力分配不均，任务排队与闲置情况无法兼顾', '技术调研报告撰写耗时长，专利交底书学术性与技术性难以平衡'],
    solves: ['文献带代码标签一键筛选，快速对齐统一 LOSO/Hold-out 口径', '集成 GPU 节点负载监控看板，任务智能入队与算力资源透明化', '专业图表智能生成与趋势解读，高质高效输出技术白皮书'],
  },
  {
    id: 'interdisciplinary',
    title: '跨学科探索团队',
    icon: 'layers',
    roleDesc: '需要快速进入陌生交叉领域，打破学科壁垒与术语鸿沟',
    pains: ['陌生领域专业术语多且晦涩，跨学科文献调研成本极高', '无法准确把握交叉领域的经典研究脉络与学派争议', '论文缺乏跨学科理论与伦理维度的系统审查'],
    solves: ['跨学科专业名词术语库双向对齐，自动构建领域概念思维导图', '引用拓扑网络多层级回溯，一目了然理清 10 年方法演进谱系', '专家评审团涵盖伦理与理论双重审查，全面保障跨学科规范'],
  },
];

// 跑马灯机构与顶会数据
const MARQUEE_ITEMS = [
  '🎓 清华大学', '🎓 北京大学', '🎓 中科院自动化所', '🎓 浙江大学', '🎓 上海交通大学', '🎓 中国科学技术大学', '🎓 复旦大学',
  '🏛️ 微软亚洲研究院', '🏛️ 阿里达摩院', '🏛️ 腾讯 AI Lab',
  '📚 CVPR 2026', '📚 NeurIPS', '📚 ICML', '📚 ACL', '📚 ACM Multimedia', '📚 IEEE TPAMI', '📚 Nature Machine Intelligence', '📚 Science Robotics',
];

export default function Landing() {
  const nav = useNavigate();
  const [activePersona, setActivePersona] = useState('student');
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isHoveringCarousel, setIsHoveringCarousel] = useState(false);

  // 3D 视差倾斜卡片状态
  const tiltCardRef = useRef<HTMLDivElement>(null);
  const [tiltStyle, setTiltStyle] = useState({ transform: 'perspective(1200px) rotateX(0deg) rotateY(0deg)' });

  // 轮播图自动播放
  useEffect(() => {
    if (isHoveringCarousel) return;
    const timer = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isHoveringCarousel]);

  // 3D 视差交互处理
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!tiltCardRef.current) return;
    const rect = tiltCardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -9;
    const rotateY = ((x - centerX) / centerX) * 9;
    setTiltStyle({
      transform: `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`,
    });
  };

  const handleMouseLeave = () => {
    setTiltStyle({
      transform: 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
    });
  };

  // 滚动到指定章节
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const activePersonaData = PERSONAS.find((p) => p.id === activePersona) || PERSONAS[0];

  return (
    <div className="landing-wrap">
      {/* ===== 顶部导航栏 ===== */}
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo" onClick={() => scrollTo('hero')}>
            <div className="landing-logo-badge">
              <Icon name="flask" size={20} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 19, fontWeight: 800, color: 'var(--ink)' }}>
                ScienceX
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)', letterSpacing: 0.5, marginTop: -2 }}>
                AI 科研工作台
              </div>
            </div>
          </div>

          <nav className="landing-nav-links">
            <span className="landing-nav-link" onClick={() => scrollTo('features')}>特色功能</span>
            <span className="landing-nav-link" onClick={() => scrollTo('radar')}>专家评审雷达</span>
            <span className="landing-nav-link" onClick={() => scrollTo('personas')}>用户画像</span>
            <span className="landing-nav-link" onClick={() => scrollTo('compare')}>竞品全景对比</span>
            <span className="landing-nav-link" onClick={() => scrollTo('reviews')}>学者口碑</span>
            <span className="landing-nav-link" onClick={() => scrollTo('pricing')}>会员方案</span>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => nav('/login')}>
              登录 / 注册
            </button>
            <button className="btn btn-primary btn-sm" style={{ padding: '8px 18px' }} onClick={() => nav('/login')}>
              立即使用 <Icon name="arrowRight" size={13} />
            </button>
          </div>
        </div>
      </header>

      {/* ===== Hero Section (项目简介 & 3D 拟真视差交互) ===== */}
      <section id="hero" className="landing-hero">
        <div>
          <div className="hero-pill">
            <span style={{ color: 'var(--accent)' }}>★</span> 2026 新一代 AI 原生科研生产力中枢
          </div>
          <h1 className="hero-title">
            一个入口，<span className="hero-title-gradient">闭环科研</span>
          </h1>
          <p className="hero-desc">
            覆盖「选题 ➔ 文献 ➔ 实验 ➔ 分析 ➔ 写作 ➔ 投稿 ➔ 协作」科研全生命周期。
            对话即工作台，工具即智能体。把繁琐琐碎的机械劳动交给 AI，让学者专注提出好问题与科学创新本身。
          </p>

          <div className="hero-actions">
            <button className="btn-hero-primary" onClick={() => nav('/login')}>
              <Icon name="spark" size={18} />
              立即使用 · 免费体验
            </button>
            <button className="btn-hero-secondary" onClick={() => scrollTo('features')}>
              <Icon name="eye" size={16} />
              探索特色功能
            </button>
          </div>

          <div className="hero-stats">
            <div>
              <div className="hero-stat-num">50%+</div>
              <div className="hero-stat-label">论文产出周期缩短</div>
            </div>
            <div>
              <div className="hero-stat-num">100+</div>
              <div className="hero-stat-label">CCF 顶刊顶会适配</div>
            </div>
            <div>
              <div className="hero-stat-num">5 角色</div>
              <div className="hero-stat-label">多智能体专家盲审</div>
            </div>
            <div>
              <div className="hero-stat-num">100%</div>
              <div className="hero-stat-label">OpenAI协议自由接入</div>
            </div>
          </div>
        </div>

        {/* 3D 拟真视差卡片展示 */}
        <div className="tilt-card-container">
          <div
            ref={tiltCardRef}
            className="tilt-card"
            style={tiltStyle}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <div className="tilt-header">
              <div className="tilt-dots">
                <span className="tilt-dot" style={{ background: '#ff5f56' }} />
                <span className="tilt-dot" style={{ background: '#ffbd2e' }} />
                <span className="tilt-dot" style={{ background: '#27c93f' }} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>
                ScienceX · AI 科研协同工作台
              </div>
              <span className="tag" style={{ background: 'var(--brand-soft)', color: 'var(--brand-strong)', fontSize: 11 }}>
                Live Active
              </span>
            </div>

            <div className="tilt-chat-bubble">
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 4 }}>🧑‍🎓 研究者（提问）：</div>
              <strong>我的 up9 模型在 CASME II 上需要设计消融实验，如何拉开与现有工作差异？</strong>
            </div>

            <div className="tilt-chat-bubble ai">
              <div style={{ fontSize: 11.5, color: 'var(--brand-strong)', fontWeight: 700, marginBottom: 4 }}>
                🤖 ScienceX 科研智能体：
              </div>
              <span>
                建议优先验证<strong>跨层 AU 交互</strong>（而非单点融合）。已自动生成 4 组消融方案，并调配 GPU-03 节点进行 baseline 跑通，预计 UF1 可由 0.646 提升至 0.689（+6.6%）。
              </span>
            </div>

            <div className="tilt-interactive-radar">
              <div className="row-between text-xs mb-2">
                <span className="fw-bold" style={{ color: 'var(--ink)' }}>🧑‍⚖️ 模拟审稿团盲审评定</span>
                <span className="mono fw-bold" style={{ color: 'var(--brand)' }}>综合得分: 94.2 / 100</span>
              </div>
              <div className="row g-2 wrap">
                <span className="tag" style={{ background: 'var(--brand-soft)', color: 'var(--brand-strong)', fontSize: 11 }}>
                  理论: 严密 (95分)
                </span>
                <span className="tag" style={{ background: 'var(--brand-soft)', color: 'var(--brand-strong)', fontSize: 11 }}>
                  消融: 完备 (92分)
                </span>
                <span className="tag" style={{ background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: 11 }}>
                  状态: Accept with Minor
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 跑马灯 Marquee ===== */}
      <section className="marquee-section">
        <div className="marquee-track">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, idx) => (
            <div key={idx} className="marquee-item">
              {item}
            </div>
          ))}
        </div>
      </section>

      {/* ===== 特色功能与轮播图展示 (Carousel) ===== */}
      <section id="features" className="landing-section">
        <div className="section-head">
          <div className="section-badge">Featured Capabilities</div>
          <h2 className="section-title">全链路六大科研工具，无缝衔接</h2>
          <p className="section-sub">
            告别在翻译插件、绘图脚本、文献管理器与问答窗口间频繁切换的割裂感。ScienceX 将科研环节完全串接。
          </p>
        </div>

        {/* 交互轮播图 */}
        <div
          className="carousel-wrapper"
          onMouseEnter={() => setIsHoveringCarousel(true)}
          onMouseLeave={() => setIsHoveringCarousel(false)}
        >
          <button
            className="carousel-arrow prev"
            onClick={() => setCarouselIndex((prev) => (prev === 0 ? CAROUSEL_SLIDES.length - 1 : prev - 1))}
            title="上一个"
          >
            <Icon name="chevronLeft" size={18} />
          </button>
          <button
            className="carousel-arrow next"
            onClick={() => setCarouselIndex((prev) => (prev + 1) % CAROUSEL_SLIDES.length)}
            title="下一个"
          >
            <Icon name="chevronRight" size={18} />
          </button>

          <div className="carousel-slide">
            <div>
              <span className="tag" style={{ background: 'var(--brand-soft)', color: 'var(--brand-strong)', marginBottom: 14 }}>
                {CAROUSEL_SLIDES[carouselIndex].tag}
              </span>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 800, margin: '8px 0 14px', color: 'var(--ink)' }}>
                {CAROUSEL_SLIDES[carouselIndex].title}
              </h3>
              <p style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--ink-2)', marginBottom: 20 }}>
                {CAROUSEL_SLIDES[carouselIndex].desc}
              </p>
              <div className="col g-2 mb-3">
                {CAROUSEL_SLIDES[carouselIndex].stats.map((s, idx) => (
                  <div key={idx} className="row g-2 text-small items-center" style={{ color: 'var(--ink)' }}>
                    <span style={{ color: 'var(--brand)', display: 'inline-flex' }}>
                      <Icon name="check" size={16} />
                    </span>
                    <span className="fw-bold">{s}</span>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary btn-sm mt-1" onClick={() => nav('/login')}>
                立即体验该功能 <Icon name="arrowRight" size={13} />
              </button>
            </div>

            {/* 轮播图右侧模拟示意视窗 (全面去除纯白底，改用温润质感与柔和翠绿微光晕) */}
            <div className="card card-pad" style={{ background: 'rgba(235, 231, 218, 0.65)', borderRadius: 16, border: '1px solid var(--line-strong)', backdropFilter: 'blur(8px)' }}>
              <div className="row-between pb-2 mb-2" style={{ borderBottom: '1px solid var(--line)' }}>
                <span className="tag" style={{ background: 'var(--brand-soft)', color: 'var(--brand-strong)', fontSize: 11, fontWeight: 'bold' }}>
                  {CAROUSEL_SLIDES[carouselIndex].badge}
                </span>
                <span className="text-xs text-muted">ScienceX Studio Preview</span>
              </div>
              <div style={{ minHeight: 220, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {carouselIndex === 0 && (
                  <div className="col g-2">
                    <div className="tilt-chat-bubble" style={{ margin: 0 }}>
                      <span className="text-xs text-muted">输入提示词：</span>
                      <div>“帮我分析微表情领域 2026 最具创新价值的选题方向与可行性论证”</div>
                    </div>
                    <div className="tilt-chat-bubble ai" style={{ margin: 0 }}>
                      <div className="fw-bold text-xs" style={{ color: 'var(--brand-strong)' }}>✦ 技能 [选题灵感与开题] 自动调度</div>
                      <div>已为您关联检索 42 篇 CCF-A 顶会论文，提炼 3 大细分缺口（跨层频域交互 / 扩散数据增广 / 弱监督跨域域适应），已生成开题论证大纲与可行性雷达指标。</div>
                    </div>
                  </div>
                )}
                {carouselIndex === 1 && (
                  <div className="col g-2">
                    <div className="tilt-chat-bubble" style={{ margin: 0 }}>
                      <span className="text-xs text-muted">多模型协同中枢：</span>
                      <div className="row g-2 items-center text-xs mt-1">
                        <span className="tag" style={{ background: 'var(--brand-soft)', color: 'var(--brand-strong)' }}>DeepSeek-R1</span>
                        <span className="tag" style={{ background: 'var(--bg-deep)', color: 'var(--ink)' }}>GPT-4o</span>
                        <span className="tag" style={{ background: 'var(--bg-deep)', color: 'var(--ink)' }}>Claude 3.5</span>
                      </div>
                    </div>
                    <div className="tilt-chat-bubble ai" style={{ margin: 0 }}>
                      <div className="fw-bold text-xs" style={{ color: 'var(--brand-strong)' }}>✦ 全链路上下文实时串接</div>
                      <div>正在调度文献库 #AUFormer 与 GPU-01 节点，已为您自动生成消融方案对比，并开启流式思维链...</div>
                    </div>
                  </div>
                )}
                {carouselIndex === 2 && (
                  <div className="col g-2">
                    <div className="row-between text-small fw-bold">
                      <span>AU-aware Transformer with Optical Flow...</span>
                      <span className="text-xs tag" style={{ background: 'var(--brand-soft)', color: 'var(--brand-strong)' }}>ACM MM 24</span>
                    </div>
                    <div className="grid grid-2 text-xs text-muted mt-1" style={{ gap: 8 }}>
                      <div className="card card-pad" style={{ padding: 10, background: 'var(--bg-deep)', border: '1px solid var(--line-strong)' }}>
                        <strong style={{ color: 'var(--ink)' }}>七段式学术结构：</strong><br />已萃取研究背景、方法核心与5大局限性
                      </div>
                      <div className="card card-pad" style={{ padding: 10, background: 'var(--bg-deep)', border: '1px solid var(--line-strong)' }}>
                        <strong style={{ color: 'var(--ink)' }}>引用拓扑网络：</strong><br />12 个关联节点，清晰展示方法派生脉络
                      </div>
                    </div>
                  </div>
                )}
                {carouselIndex === 3 && (
                  <div className="col g-2">
                    <div className="text-small fw-bold">消融实验配置矩阵自动生成</div>
                    <div className="text-xs text-muted">已构建 Baseline、+Cross-Attn、+Flow-Boost 方案对比</div>
                    <div className="row g-2 mt-1">
                      <div className="card card-pad grow text-center" style={{ padding: 8, background: 'var(--bg-deep)', border: '1px solid var(--line-strong)' }}>
                        <div className="text-xs text-muted">GPU-01 (4090)</div>
                        <div className="mono fw-bold" style={{ color: 'var(--brand)' }}>78% 负载 · 18.4GB</div>
                      </div>
                      <div className="card card-pad grow text-center" style={{ padding: 8, background: 'var(--bg-deep)', border: '1px solid var(--line-strong)' }}>
                        <div className="text-xs text-muted">SOTA UF1 对标</div>
                        <div className="mono fw-bold" style={{ color: 'var(--accent)' }}>0.829 (领先 +4.3%)</div>
                      </div>
                    </div>
                  </div>
                )}
                {carouselIndex === 4 && (
                  <div className="col g-2 text-small">
                    <div className="card card-pad" style={{ background: 'var(--bg-deep)', border: '1px solid var(--line-strong)', padding: 10 }}>
                      <div className="text-xs text-muted mb-1">原文句段 (重复率与口语化标记)：</div>
                      <div style={{ textDecoration: 'line-through', color: 'var(--red)', fontSize: 12.5 }}>
                        Micro-expressions are involuntary facial movements that reveal genuine emotions...
                      </div>
                    </div>
                    <div className="card card-pad" style={{ background: 'var(--brand-soft)', border: '1px solid rgba(27, 122, 94, 0.2)', padding: 10 }}>
                      <div className="text-xs fw-bold mb-1" style={{ color: 'var(--brand-strong)' }}>学术级替换 (已通过查重校验 · 相似度降至 3.8%)：</div>
                      <div style={{ color: 'var(--brand-strong)', fontSize: 12.5 }}>
                        Involuntary facial motions, referred to as micro-expressions, exhibit high fidelity in clinical diagnostics...
                      </div>
                    </div>
                  </div>
                )}
                {carouselIndex === 5 && (
                  <div className="col g-2 text-small">
                    <div className="row-between">
                      <span className="fw-bold">评审团决策报告 #rv1</span>
                      <span className="tag" style={{ background: 'var(--brand-soft)', color: 'var(--brand-strong)' }}>Strong Accept</span>
                    </div>
                    <div className="col g-1 text-xs mt-1">
                      <div className="card card-pad" style={{ padding: '6px 10px', background: 'var(--bg-deep)', border: '1px solid var(--line-strong)', margin: 0 }}>⚖️ 理论 Agent：公式无歧义，符号体系规范</div>
                      <div className="card card-pad" style={{ padding: '6px 10px', background: 'var(--bg-deep)', border: '1px solid var(--line-strong)', margin: 0 }}>🧪 实验 Agent：已补充 3 个随机种子标准差，实验完备</div>
                      <div className="card card-pad" style={{ padding: '6px 10px', background: 'var(--bg-deep)', border: '1px solid var(--line-strong)', margin: 0 }}>✍️ 写作与伦理 Agent：摘要贡献点已按 CCF 标准精炼，数据集开源合规</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="carousel-dots">
            {CAROUSEL_SLIDES.map((_, idx) => (
              <button
                key={idx}
                className={`carousel-dot ${carouselIndex === idx ? 'active' : ''}`}
                onClick={() => setCarouselIndex(idx)}
                title={`第 ${idx + 1} 项`}
              />
            ))}
          </div>

          {/* 六大科研工具快速联动导航卡片 (无白色背景，采用柔和深邃纸质色调) */}
          <div className="features-nav-grid">
            {CAROUSEL_SLIDES.map((slide, idx) => (
              <div
                key={slide.id}
                className={`feature-nav-card ${carouselIndex === idx ? 'active' : ''}`}
                onClick={() => setCarouselIndex(idx)}
              >
                <div className="feature-nav-header">
                  <span className="feature-nav-tag">{slide.tag.split(' ')[0]}</span>
                  <span className="feature-nav-badge">{slide.badge}</span>
                </div>
                <div className="feature-nav-title">{slide.title.replace(/^[^\s]+\s/, '')}</div>
                <div className="feature-nav-stat">{slide.stats[0]}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 雷达图组件与多智能体评审体系 (Radar Chart) ===== */}
      <section id="radar" className="landing-section" style={{ borderTop: '1px solid var(--line-strong)', borderBottom: '1px solid var(--line-strong)' }}>
        <div className="section-head">
          <div className="section-badge">Multi-Agent Radar</div>
          <h2 className="section-title">多智能体专家评审：5 维严谨评估</h2>
          <p className="section-sub">
            在被期刊审稿人拒绝之前，先让五位由 AI 专家组成的评审团为论文全面“体检”。
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
          {/* 左侧：矢量 SVG 雷达图 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--bg-deep)', padding: 24, borderRadius: 20, border: '1px solid var(--line-strong)' }}>
            <svg width="340" height="340" viewBox="0 0 340 340" style={{ overflow: 'visible' }}>
              {/* 背景五边形网格 */}
              {[0.2, 0.4, 0.6, 0.8, 1].map((scale, i) => {
                const r = 110 * scale;
                const points = [0, 1, 2, 3, 4].map((idx) => {
                  const angle = (Math.PI * 2 * idx) / 5 - Math.PI / 2;
                  return `${170 + r * Math.cos(angle)},${170 + r * Math.sin(angle)}`;
                }).join(' ');
                return (
                  <polygon
                    key={i}
                    points={points}
                    fill="none"
                    stroke="var(--line-strong)"
                    strokeWidth="1"
                    strokeDasharray={scale === 1 ? 'none' : '3 3'}
                  />
                );
              })}

              {/* 5 根轴线 */}
              {[0, 1, 2, 3, 4].map((idx) => {
                const angle = (Math.PI * 2 * idx) / 5 - Math.PI / 2;
                return (
                  <line
                    key={idx}
                    x1="170" y1="170"
                    x2={170 + 110 * Math.cos(angle)}
                    y2={170 + 110 * Math.sin(angle)}
                    stroke="var(--line-strong)"
                    strokeWidth="1"
                  />
                );
              })}

              {/* 对比方案：传统单点工具 (灰色虚线) */}
              {(() => {
                const rList = [0.55, 0.65, 0.45, 0.70, 0.50].map((v) => v * 110);
                const points = rList.map((r, idx) => {
                  const angle = (Math.PI * 2 * idx) / 5 - Math.PI / 2;
                  return `${170 + r * Math.cos(angle)},${170 + r * Math.sin(angle)}`;
                }).join(' ');
                return (
                  <polygon
                    points={points}
                    fill="rgba(138, 148, 141, 0.15)"
                    stroke="var(--muted)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                );
              })()}

              {/* ScienceX 评审团多边形 (绿色高亮) */}
              {(() => {
                const rList = [0.94, 0.91, 0.88, 0.96, 0.98].map((v) => v * 110);
                const points = rList.map((r, idx) => {
                  const angle = (Math.PI * 2 * idx) / 5 - Math.PI / 2;
                  return `${170 + r * Math.cos(angle)},${170 + r * Math.sin(angle)}`;
                }).join(' ');
                return (
                  <polygon
                    points={points}
                    fill="rgba(27, 122, 94, 0.28)"
                    stroke="var(--brand)"
                    strokeWidth="2.5"
                  />
                );
              })()}

              {/* 数据顶点与文字标签 */}
              {[
                { name: '理论严密性', score: '94%', angleIdx: 0, dx: 0, dy: -18 },
                { name: '方法创新度', score: '91%', angleIdx: 1, dx: 22, dy: -4 },
                { name: '实验充分性', score: '88%', angleIdx: 2, dx: 18, dy: 16 },
                { name: '写作规范度', score: '96%', angleIdx: 3, dx: -18, dy: 16 },
                { name: '学术伦理合规', score: '98%', angleIdx: 4, dx: -22, dy: -4 },
              ].map((item, i) => {
                const angle = (Math.PI * 2 * item.angleIdx) / 5 - Math.PI / 2;
                const x = 170 + 125 * Math.cos(angle) + item.dx;
                const y = 170 + 125 * Math.sin(angle) + item.dy;
                return (
                  <g key={i}>
                    <text
                      x={x} y={y}
                      textAnchor="middle"
                      fill="var(--ink)"
                      fontSize="12"
                      fontWeight="700"
                    >
                      {item.name}
                    </text>
                    <text
                      x={x} y={y + 13}
                      textAnchor="middle"
                      fill="var(--brand-strong)"
                      fontSize="11"
                      fontWeight="bold"
                    >
                      {item.score}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* 图例 */}
            <div className="row g-3 mt-3 text-xs">
              <span className="row g-1 items-center">
                <span style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(27, 122, 94, 0.5)', border: '1.5px solid var(--brand)' }} />
                <strong>ScienceX 专家盲审</strong>
              </span>
              <span className="row g-1 items-center text-muted">
                <span style={{ width: 12, height: 12, borderRadius: 2, background: 'rgba(138, 148, 141, 0.2)', border: '1.5px dashed var(--muted)' }} />
                <span>常规单点工具</span>
              </span>
            </div>
          </div>

          {/* 右侧：专家评审团 5 角色详细说明 */}
          <div>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
              多视角对抗式把关，不放过任何评审死角
            </h3>
            <div className="col g-3">
              <div className="card card-pad" style={{ padding: '12px 16px', background: 'var(--bg-deep)', border: '1px solid var(--line-strong)' }}>
                <strong style={{ color: 'var(--brand-deep)' }}>1. 理论 Agent（审严谨）</strong>
                <p className="text-small text-muted mt-1" style={{ margin: 0 }}>
                  排查数学公式推导漏洞、符号命名冲突与定理假设边界，确保论文逻辑牢不可破。
                </p>
              </div>
              <div className="card card-pad" style={{ padding: '12px 16px', background: 'var(--bg-deep)', border: '1px solid var(--line-strong)' }}>
                <strong style={{ color: 'var(--brand-deep)' }}>2. 方法 Agent（审创新）</strong>
                <p className="text-small text-muted mt-1" style={{ margin: 0 }}>
                  检索全球先验文献，核验创新点是否真实成立，避免陷入现有成果的换皮套壳。
                </p>
              </div>
              <div className="card card-pad" style={{ padding: '12px 16px', background: 'var(--bg-deep)', border: '1px solid var(--line-strong)' }}>
                <strong style={{ color: 'var(--brand-deep)' }}>3. 实验 Agent（审复现与消融）</strong>
                <p className="text-small text-muted mt-1" style={{ margin: 0 }}>
                  严格对照标准协议（如 LOSO），检查随机种子、方差报告与消融路径是否具备统计显著性。
                </p>
              </div>
              <div className="card card-pad" style={{ padding: '12px 16px', background: 'var(--bg-deep)', border: '1px solid var(--line-strong)' }}>
                <strong style={{ color: 'var(--brand-deep)' }}>4. 写作与伦理 Agent（审表述与合规）</strong>
                <p className="text-small text-muted mt-1" style={{ margin: 0 }}>
                  纠正学术英语语法、格式排版以及数据集授权、开源合规隐患，出具可操作的返修清单。
                </p>
              </div>
              <div className="card card-pad" style={{ padding: '12px 16px', background: 'var(--bg-deep)', border: '1px solid var(--line-strong)' }}>
                <strong style={{ color: 'var(--brand-deep)' }}>5. 主审主席 Agent（终审仲裁与决策）</strong>
                <p className="text-small text-muted mt-1" style={{ margin: 0 }}>
                  权衡审稿人分歧，出具 Meta-Review 综合评定（Accept/Major/Reject）与精准返修指引。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 用户画像 (User Personas) ===== */}
      <section id="personas" className="landing-section">
        <div className="section-head">
          <div className="section-badge">Target Audience</div>
          <h2 className="section-title">量身打造，赋能每一类科研角色</h2>
          <p className="section-sub">
            无论你是个体探索的研究生，还是运筹帷幄的课题组导师，ScienceX 都能提供适配的加速引擎。
          </p>
        </div>

        {/* 标签栏 */}
        <div className="persona-tabs">
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              className={`persona-tab-btn ${activePersona === p.id ? 'active' : ''}`}
              onClick={() => setActivePersona(p.id)}
            >
              <Icon name={p.icon as any} size={16} />
              <span>{p.title}</span>
            </button>
          ))}
        </div>

        {/* 内容卡片 */}
        <div className="persona-card">
          <div>
            <div className="row g-2 items-center mb-2">
              <span className="tag" style={{ background: 'var(--brand-soft)', color: 'var(--brand-strong)', fontWeight: 'bold' }}>
                角色定位
              </span>
              <span className="fw-bold" style={{ fontSize: 18 }}>{activePersonaData.title}</span>
            </div>
            <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.6, marginBottom: 20 }}>
              {activePersonaData.roleDesc}
            </p>

            <div className="persona-pain-box">
              <div className="row g-2 items-center mb-2" style={{ color: 'var(--red)', fontWeight: 'bold', fontSize: 13.5 }}>
                <Icon name="alert" size={16} /> 普遍真实痛点：
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6, color: '#6d2621' }}>
                {activePersonaData.pains.map((pain, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>{pain}</li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <div className="persona-solve-box">
              <div className="row g-2 items-center mb-2" style={{ color: 'var(--brand-strong)', fontWeight: 'bold', fontSize: 13.5 }}>
                <Icon name="zap" size={16} /> ScienceX 专属解法与价值增益：
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.65, color: 'var(--brand-deep)' }}>
                {activePersonaData.solves.map((solve, i) => (
                  <li key={i} style={{ marginBottom: 6 }}>
                    <strong>{solve.split('，')[0]}</strong>：{solve.split('，')[1] || solve}
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ marginTop: 24, textAlign: 'right' }}>
              <button className="btn btn-primary" onClick={() => nav('/login')}>
                免费体验适合您的科研方案 <Icon name="arrowRight" size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 竞品分析全景对比表 (Competitive Matrix Table) ===== */}
      <section id="compare" className="landing-section" style={{ borderTop: '1px solid var(--line-strong)', borderBottom: '1px solid var(--line-strong)' }}>
        <div className="section-head">
          <div className="section-badge">Competitive Analysis</div>
          <h2 className="section-title">为什么选择 ScienceX？一表看清核心优势</h2>
          <p className="section-sub">
            市面工具多为功能孤岛，缺乏科研工作流编排；ScienceX 实现真正以科研闭环为核心的智能体协同。
          </p>
        </div>

        <div className="compare-table-wrapper">
          <table className="compare-table">
            <thead>
              <tr>
                <th style={{ width: '24%' }}>核心评估维度</th>
                <th className="compare-highlight-col" style={{ width: '28%', color: 'var(--brand-deep)', fontSize: 15 }}>
                  🧪 ScienceX 科研工作台 (推荐)
                </th>
                <th style={{ width: '16%' }}>通用大模型 (GPT / Kimi)</th>
                <th style={{ width: '16%' }}>单点文献工具 (SciSpace / Elicit)</th>
                <th style={{ width: '16%' }}>传统排版软件 (Zotero / Overleaf)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>全流程闭环工作流</strong><br /><span className="text-xs text-muted">选题 ➔ 实验 ➔ 写作 ➔ 投稿一站式</span></td>
                <td className="compare-highlight-col">
                  <span className="compare-badge-good"><Icon name="check" size={14} /> ✅ 全环节数据自流转闭环</span>
                </td>
                <td><span className="compare-badge-bad">❌ 需反复跳出复制黏贴</span></td>
                <td><span className="compare-badge-warn">⚠️ 仅覆盖文献/综述</span></td>
                <td><span className="compare-badge-bad">❌ 无 AI 工作流打通</span></td>
              </tr>
              <tr>
                <td><strong>多智能体同行盲审团</strong><br /><span className="text-xs text-muted">5 位不同维度评审专家并行会诊</span></td>
                <td className="compare-highlight-col">
                  <span className="compare-badge-good"><Icon name="check" size={14} /> ✅ 理论/方法/实验等 5 角色盲审</span>
                </td>
                <td><span className="compare-badge-bad">❌ 单一角色，易偏激遗漏</span></td>
                <td><span className="compare-badge-bad">❌ 不支持模拟审稿</span></td>
                <td><span className="compare-badge-bad">❌ 不支持</span></td>
              </tr>
              <tr>
                <td><strong>自动化消融实验推导</strong><br /><span className="text-xs text-muted">实验矩阵、控制变量与 SOTA 对标</span></td>
                <td className="compare-highlight-col">
                  <span className="compare-badge-good"><Icon name="check" size={14} /> ✅ 自动构建消融方案矩阵</span>
                </td>
                <td><span className="compare-badge-warn">⚠️ 纯文本建议，缺少方案表</span></td>
                <td><span className="compare-badge-bad">❌ 不支持</span></td>
                <td><span className="compare-badge-bad">❌ 不支持</span></td>
              </tr>
              <tr>
                <td><strong>GPU 算力集群实时监控</strong><br /><span className="text-xs text-muted">显存负载、节点状态与智能调度</span></td>
                <td className="compare-highlight-col">
                  <span className="compare-badge-good"><Icon name="check" size={14} /> ✅ 原生集成节点监控与调度</span>
                </td>
                <td><span className="compare-badge-bad">❌ 无底层硬件交互能力</span></td>
                <td><span className="compare-badge-bad">❌ 不支持</span></td>
                <td><span className="compare-badge-bad">❌ 不支持</span></td>
              </tr>
              <tr>
                <td><strong>三栏文献精读与引用拓扑</strong><br /><span className="text-xs text-muted">思维导图、七段式总结与图谱联动</span></td>
                <td className="compare-highlight-col">
                  <span className="compare-badge-good"><Icon name="check" size={14} /> ✅ 结构化解析 + 动态图谱联动</span>
                </td>
                <td><span className="compare-badge-bad">❌ 仅能作为普通附件上传</span></td>
                <td><span className="compare-badge-warn">⚠️ 仅支持基本 PDF 划词问答</span></td>
                <td><span className="compare-badge-warn">⚠️ 仅能管理元数据</span></td>
              </tr>
              <tr>
                <td><strong>课题组私有 RAG 知识库</strong><br /><span className="text-xs text-muted">团队文献资产沉淀与多租户权限</span></td>
                <td className="compare-highlight-col">
                  <span className="compare-badge-good"><Icon name="check" size={14} /> ✅ 支持个人/课题组多级隔离</span>
                </td>
                <td><span className="compare-badge-bad">❌ 仅个人会话级缓存</span></td>
                <td><span className="compare-badge-warn">⚠️ 仅限个人库，团队协作弱</span></td>
                <td><span className="compare-badge-bad">❌ 无向量检索能力</span></td>
              </tr>
              <tr>
                <td><strong>自定义大模型网关接入</strong><br /><span className="text-xs text-muted">支持用户自有 BaseURL 与 API Key</span></td>
                <td className="compare-highlight-col">
                  <span className="compare-badge-good"><Icon name="check" size={14} /> ✅ 自由对接任意 OpenAI 兼容模型</span>
                </td>
                <td><span className="compare-badge-bad">❌ 强绑定自家模型生态</span></td>
                <td><span className="compare-badge-bad">❌ 封闭黑盒，不可自配</span></td>
                <td><span className="compare-badge-bad">❌ 无模型网关</span></td>
              </tr>
              <tr>
                <td><strong>组会汇报 PPTX 一键导出</strong><br /><span className="text-xs text-muted">实验数据一键排版与导师意见提取</span></td>
                <td className="compare-highlight-col">
                  <span className="compare-badge-good"><Icon name="check" size={14} /> ✅ 原生生成下载 + 建议转待办</span>
                </td>
                <td><span className="compare-badge-warn">⚠️ 仅能输出文字大纲</span></td>
                <td><span className="compare-badge-bad">❌ 不支持</span></td>
                <td><span className="compare-badge-bad">❌ 不支持</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ===== 学者口碑 (User Testimonials) ===== */}
      <section id="reviews" className="landing-section">
        <div className="section-head">
          <div className="section-badge">Academic Testimonials</div>
          <h2 className="section-title">来自顶尖学者与青年研究员的真实口碑</h2>
          <p className="section-sub">
            累计陪伴超过 10,000+ 学者完成从开题、读文献到顶会顶刊成功接收的全流程。
          </p>
        </div>

        <div className="reviews-grid">
          <div className="review-card">
            <div className="review-stars">★★★★★</div>
            <p className="text-small" style={{ lineHeight: 1.6, flex: 1, color: 'var(--ink)' }}>
              “在 CVPR 截稿前 2 周，我们用 ScienceX 的消融方案推导器补全了 3 个随机种子的对比实验。审稿人特别称赞了我们在 LOSO 协议下的消融完备性，最终被 Oral 录用！”
            </p>
            <div className="row g-2 items-center mt-3 pt-2" style={{ borderTop: '1px solid var(--line)' }}>
              <div className="avatar" style={{ width: 34, height: 34, background: 'var(--brand-soft)', color: 'var(--brand-strong)' }}>张</div>
              <div>
                <div className="fw-bold text-small">张同学 · 计算机系博士候选人</div>
                <div className="text-xs text-muted">清华大学 · CVPR 2025 作者</div>
              </div>
            </div>
          </div>

          <div className="review-card">
            <div className="review-stars">★★★★★</div>
            <p className="text-small" style={{ lineHeight: 1.6, flex: 1, color: 'var(--ink)' }}>
              “组会前要求学生先用 ScienceX 跑一遍专家评审团，学生自己就能发现逻辑漏洞，组会汇报 PPT 一键生成节省了大半天准备时间，团队指导效率倍增。”
            </p>
            <div className="row g-2 items-center mt-3 pt-2" style={{ borderTop: '1px solid var(--line)' }}>
              <div className="avatar" style={{ width: 34, height: 34, background: 'var(--accent-soft)', color: 'var(--accent)' }}>林</div>
              <div>
                <div className="fw-bold text-small">林副研究员 · 博士生导师</div>
                <div className="text-xs text-muted">中科院自动化所 · 情感计算团队</div>
              </div>
            </div>
          </div>

          <div className="review-card">
            <div className="review-stars">★★★★★</div>
            <p className="text-small" style={{ lineHeight: 1.6, flex: 1, color: 'var(--ink)' }}>
              “最惊喜的是学术写作的逐句 Diff 润色功能！不仅换掉了口语词汇，还自动建议了更有力度的量化表述，帮助我们的长文顺利被 IEEE TPAMI 接收。”
            </p>
            <div className="row g-2 items-center mt-3 pt-2" style={{ borderTop: '1px solid var(--line)' }}>
              <div className="avatar" style={{ width: 34, height: 34, background: 'var(--blue-safe-soft)', color: 'var(--blue-safe)' }}>孙</div>
              <div>
                <div className="fw-bold text-small">孙博士 · 博士后研究员</div>
                <div className="text-xs text-muted">浙江大学 · TPAMI 2025 第一作者</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 会员计划 (Pricing Plans) ===== */}
      <section id="pricing" className="landing-section" style={{ borderTop: '1px solid var(--line-strong)' }}>
        <div className="section-head">
          <div className="section-badge">Flexible Pricing</div>
          <h2 className="section-title">透明亲民的科研支持方案</h2>
          <p className="section-sub">
            从本科开题新手到百人级重点实验室，提供满足不同阶段学术需求的灵活计费与私有化部署。
          </p>
        </div>

        <div className="pricing-grid">
          {/* 免费探索版 */}
          <div className="pricing-card">
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>探索版 (Free)</h3>
            <p className="text-xs text-muted mt-1">适合本科毕设与科研启蒙体验</p>
            <div className="pricing-price">
              ¥0 <span className="pricing-period">/ 永久免费</span>
            </div>
            <ul style={{ margin: '18px 0', paddingLeft: 18, fontSize: 13, lineHeight: 1.7, flex: 1 }}>
              <li>每日 30 次基础 AI 对话提问</li>
              <li>基础文献阅读与思维导图生成 (5 篇/月)</li>
              <li>基础学术写作润色与翻译</li>
              <li>支持接入自定义 OpenAI 模型</li>
            </ul>
            <button className="btn btn-ghost btn-block" onClick={() => nav('/login')}>
              免费使用
            </button>
          </div>

          {/* 科研进阶版 (推荐) */}
          <div className="pricing-card popular">
            <div className="pricing-popular-tag">🔥 最受欢迎</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--brand-deep)' }}>科研进阶版 (Pro)</h3>
            <p className="text-xs text-muted mt-1">为硕士/博士高强度论文冲刺打造</p>
            <div className="pricing-price" style={{ color: 'var(--brand-deep)' }}>
              ¥49 <span className="pricing-period">/ 月</span>
            </div>
            <ul style={{ margin: '18px 0', paddingLeft: 18, fontSize: 13, lineHeight: 1.7, flex: 1 }}>
              <li><strong>无限次</strong> 对话中枢交互</li>
              <li>三栏文献精读 + 引用拓扑图谱解析</li>
              <li><strong>自动化消融实验方案矩阵生成</strong></li>
              <li><strong>多智能体专家评审团</strong> (每月 10 次完整盲审)</li>
              <li>双通道论文查重与高保真降重</li>
              <li>一键生成组会汇报 PPTX</li>
            </ul>
            <button className="btn btn-primary btn-block" onClick={() => nav('/login')}>
              立即升级体验
            </button>
          </div>

          {/* 课题组团队版 */}
          <div className="pricing-card">
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>课题组尊享版 (Team)</h3>
            <p className="text-xs text-muted mt-1">适合 5-15 人实验室团队协同沉淀</p>
            <div className="pricing-price">
              ¥299 <span className="pricing-period">/ 月 (团队共享)</span>
            </div>
            <ul style={{ margin: '18px 0', paddingLeft: 18, fontSize: 13, lineHeight: 1.7, flex: 1 }}>
              <li>包含 Pro 版全部能力，支持 15 位成员</li>
              <li><strong>共享专属 RAG 课题组向量文献库</strong></li>
              <li>实验室 GPU 集群节点实时监控与任务调度</li>
              <li>组会导师修改意见自动归档与待办分发</li>
              <li>团队项目资产与产出沉淀看板</li>
            </ul>
            <button className="btn btn-ghost btn-block" onClick={() => nav('/login')}>
              开通团队空间
            </button>
          </div>

          {/* 机构定制版 */}
          <div className="pricing-card">
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>机构私有版 (Enterprise)</h3>
            <p className="text-xs text-muted mt-1">面向高校图书馆、科研院所与企业研发中心</p>
            <div className="pricing-price">
              定制 <span className="pricing-period">/ 按需年付</span>
            </div>
            <ul style={{ margin: '18px 0', paddingLeft: 18, fontSize: 13, lineHeight: 1.7, flex: 1 }}>
              <li><strong>单机 / K8s 私有化集群完全本地化部署</strong></li>
              <li>国产大模型（Qwen、GLM）及本地算力深度集成</li>
              <li>统一单点登录 (SSO) 与科研数据安全审计</li>
              <li>专属技术支持与定制科研 Skill 智能体开发</li>
            </ul>
            <button className="btn btn-ghost btn-block" onClick={() => nav('/login')}>
              联系专属顾问
            </button>
          </div>
        </div>
      </section>

      {/* ===== 底部召唤 CTA Banner (极简沉浸流光设计) ===== */}
      <section className="landing-cta-section">
        <div className="landing-cta-card" style={{ padding: '64px 32px' }}>
          {/* 动态光晕与网格背景 */}
          <div className="cta-ambient-glow glow-1" />
          <div className="cta-ambient-glow glow-2" />
          <div className="cta-grid-pattern" />

          <div className="cta-content" style={{ maxWidth: 760 }}>
            {/* 主标题 */}
            <h2 className="cta-title" style={{ margin: '0 0 32px' }}>
              准备好让 AI 成为你的终身科研协同伴侣了吗？
            </h2>

            {/* 核心操作按钮 */}
            <div className="cta-actions" style={{ margin: 0, justifyContent: 'center' }}>
              <button
                className="cta-btn-primary"
                onClick={() => nav('/login')}
                id="cta-start-btn"
                style={{ padding: '16px 42px', fontSize: 16.5 }}
              >
                <span>立即开启科研之旅 · 免费使用</span>
                <span className="cta-btn-icon">
                  <Icon name="arrowRight" size={18} />
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 页脚 Footer ===== */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="row g-2 items-center">
            <div className="landing-logo-badge" style={{ width: 30, height: 30 }}>
              <Icon name="flask" size={16} />
            </div>
            <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 800, color: 'var(--ink)' }}>ScienceX</span>
            <span className="text-xs text-muted">· 让科研更专注，让创新更纯粹</span>
          </div>

          <div className="row g-3 text-xs text-muted">
            <span>© 2026 ScienceX · AI 科研工作台</span>
            <span>隐私政策</span>
            <span>服务协议</span>
            <span>学术伦理规范</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
