/* ============================================================
   ScienceX 官网宣传页常量数据定义库 (从 Landing.tsx 拆分解耦)
   ============================================================ */

export interface CarouselSlide {
  id: string;
  tag: string;
  title: string;
  desc: string;
  badge: string;
  stats: string[];
  mockupType: string;
}

export interface PersonaItem {
  id: string;
  title: string;
  icon: string;
  roleDesc: string;
  pains: string[];
  solves: string[];
}

export const CAROUSEL_SLIDES: CarouselSlide[] = [
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

export const PERSONAS: PersonaItem[] = [
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

export const MARQUEE_ITEMS = [
  '🎓 清华大学', '🎓 北京大学', '🎓 中科院自动化所', '🎓 浙江大学', '🎓 上海交通大学', '🎓 中国科学技术大学', '🎓 复旦大学',
  '🏛️ 微软亚洲研究院', '🏛️ 阿里达摩院', '🏛️ 腾讯 AI Lab',
  '📚 CVPR 2026', '📚 NeurIPS', '📚 ICML', '📚 ACL', '📚 ACM Multimedia', '📚 IEEE TPAMI', '📚 Nature Machine Intelligence', '📚 Science Robotics',
];
