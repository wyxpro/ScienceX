/**
 * 内存数据存储 —— 演示环境（生产环境为 PostgreSQL + Redis + 向量库，见 TSD §4.4）
 * 所有数据结构与 TSD 核心表结构一一对应
 */
const fs = require('fs');
const path = require('path');

const now = () => new Date().toISOString();
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
const daysAhead = (n) => new Date(Date.now() + n * 86400000).toISOString();

const users = [
  {
    id: 'u1',
    email: 'demo@sciencex.cn',
    // scrypt(123456)，仅用于本地演示账号；新用户注册时始终生成独立哈希。
    password: 'scrypt$8663751b902994fe0c07bfdb2b92f20c$7b9ca56210502020e31470d8f7179eb99811ce952681f01c32deb3cfd8f8db63b7760b1c1bd1693a4dd747f84a3452ccdb811dd5fba86a446dd212f08dcd8902',
    name: '陈墨',
    title: '博士生 · 计算机视觉方向',
    avatar: '',
    research_tags: ['微表情识别', '情感计算', 'Transformer'],
    lang: 'zh',
    plan: 'pro',
    created_at: daysAgo(320),
  },
];

const sessions = new Map(); // token -> { user_id, expires_at }

const builtinModels = [
  { id: 'm-gpt4o', name: 'GPT-4o', provider: 'openai', tag: '通用最强', context: '128K', enabled: true, builtin: true },
  { id: 'm-claude', name: 'Claude 3.7 Sonnet', provider: 'anthropic', tag: '长文写作', context: '200K', enabled: true, builtin: true },
  { id: 'm-gemini', name: 'Gemini 2.0 Flash', provider: 'google', tag: '高速低价', context: '1M', enabled: true, builtin: true },
  { id: 'm-deepseek', name: 'DeepSeek-V3', provider: 'deepseek', tag: '代码 / 推理', context: '64K', enabled: true, builtin: true },
  { id: 'm-qwen', name: 'Qwen-Max', provider: 'qwen', tag: '中文优化', context: '128K', enabled: true, builtin: true },
];

const customModels = [
  {
    id: 'm-custom-1',
    name: 'lab-local-qwen2.5-72b',
    provider: 'custom',
    base_url: 'https://llm.lab.edu.cn/v1',
    model_name: 'qwen2.5-72b-instruct',
    api_key_masked: 'sk-****-****-3Fa9',
    enabled: true,
    priority: 2,
    builtin: false,
    status: 'connected',
    created_at: daysAgo(45),
  },
];

const conversations = [
  {
    id: 'c1',
    title: '微表情识别选题方向讨论',
    project_id: 'p1',
    scene: 'workbench',
    model: 'm-gpt4o',
    updated_at: daysAgo(0),
    messages: [
      { id: 'msg1', role: 'user', content: '帮我分析一下 2025-2026 年微表情识别领域有哪些值得做的选题方向？', tokens: 128, created_at: daysAgo(1) },
      {
        id: 'msg2',
        role: 'assistant',
        model: 'GPT-4o',
        content:
          '结合近两年顶会论文趋势，微表情识别（MER）目前有四个高价值方向：\n\n1. **AU 先验与 Transformer 融合**：将面部动作单元（AU）作为结构化先验注入注意力机制，代表作如 AU-aware Transformer 系列；\n2. **长时序时序建模**：利用光流 / RAFT 特征捕捉微表情的瞬态动态；\n3. **跨数据集泛化**：SMIC / CASME II / SAMM 间的 domain gap 是公认痛点，域适应与数据增广仍有空间；\n4. **多模态融合**：结合生理信号（rPPG、EEG）提升识别鲁棒性。\n\n若你的前期工作已在 AU 特征上积累了 baseline（如 up 系列模型），建议优先沿方向 1 深耕。',
        tokens: 486,
        created_at: daysAgo(1),
      },
    ],
  },
  {
    id: 'c2',
    title: 'up9 消融实验结果分析',
    project_id: 'p1',
    scene: 'workbench',
    model: 'm-deepseek',
    updated_at: daysAgo(2),
    messages: [
      { id: 'msg3', role: 'user', content: 'up9 在 CASME II 上 UF1=0.6464、UAR=0.6414，这个结果处于什么水平？', tokens: 96, created_at: daysAgo(2) },
      {
        id: 'msg4',
        role: 'assistant',
        model: 'DeepSeek-V3',
        content:
          '在 **leave-one-subject-out** 协议下，UF1 ≈ 0.65 属于近三年主流工作的中位偏上水平（SOTA 约 0.92+ 出现在部分非严格协议的报告中，需注意对比口径）。建议：\n\n- 检查对比方法是否使用相同的数据划分协议；\n- 补充 95% 置信区间与多次随机种子实验；\n- 下一步可尝试引入 AU 分支与主干的跨层交互（cross-layer interaction）。',
        tokens: 352,
        created_at: daysAgo(2),
      },
    ],
  },
];

const documents = [
  {
    id: 'd1',
    project_id: 'p1',
    title: 'Micro-expression Recognition: A Survey of Trends, Methods and Challenges',
    authors: 'Li Y., Wei J., et al.',
    venue: 'IEEE TPAMI 2025',
    year: 2025,
    source_type: 'pdf',
    file_name: 'mer-survey-tpami2025.pdf',
    pages: 28,
    parsed_status: 'parsed',
    has_code: false,
    doi: '10.1109/TPAMI.2025.0012345',
    abstract:
      '微表情识别（MER）因其在谎言检测、临床医学与国家安全领域的应用价值而受到广泛关注。本文系统梳理了 2010-2025 年间 MER 的数据集、特征提取方法（LBP-TOP、光流、深度学习）、识别协议与评价标准，并讨论了跨数据集泛化、类别不均衡与微弱运动放大的开放挑战。',
    created_at: daysAgo(12),
    structured: {
      sections: [
        {
          id: 's1', title: '1. Introduction', page: 1,
          paragraphs: [
            'Micro-expressions (MEs) are involuntary facial movements that reveal genuine emotions, typically lasting between 1/25 and 1/2 second. Unlike macro-expressions, MEs are subtle, low-intensity, and hard to conceal, making them valuable for lie detection and clinical diagnosis.',
            'Over the past decade, MER has evolved from hand-crafted descriptors (LBP-TOP, HOG-TOP) to deep architectures including CNN-RNN hybrids, 3D-CNNs, and recently Transformer-based models. However, three fundamental challenges persist: data scarcity, class imbalance, and cross-dataset generalization.',
            'In this survey, we analyze 214 papers published between 2010 and 2025, categorize methods along feature extraction, temporal modeling and recognition protocol dimensions, and provide a unified benchmark on SMIC, CASME II and SAMM.',
          ],
        },
        {
          id: 's2', title: '2. Datasets and Protocols', page: 5,
          paragraphs: [
            'Three benchmark datasets dominate MER research. SMIC contains 157 sequences from 16 subjects with 3 camera frame rates. CASME II provides 247 samples from 26 subjects annotated with 5 emotion classes and AU labels. SAMM offers 159 samples with 7 classes and precise muscle movement annotations.',
            'Two evaluation protocols are widely used: leave-one-subject-out (LOSO) and hold-out with subject-independent splits. We argue that LOSO should be the standard reporting protocol, as it eliminates subject leakage.',
          ],
        },
        {
          id: 's3', title: '3. Method Taxonomy', page: 9,
          paragraphs: [
            'Hand-crafted era (2010-2016): LBP-TOP and its variants dominated, achieving UF1 ≈ 0.4-0.5 on CASME II.',
            'Deep learning era (2016-2021): CNN-RNN pipelines, 3D-CNNs and attention-augmented networks pushed UF1 to 0.65-0.75.',
            'Transformer era (2021-now): Vision Transformers, optical-flow-guided attention and AU-prior injection reach UF1 0.75-0.85 under strict LOSO, with graph-based AU reasoning showing particular promise.',
            'A consistent finding across eras: incorporating AU priors yields 3-8 UF1 points of improvement, as AU annotations provide compact, physiologically grounded structure.',
          ],
        },
        {
          id: 's4', title: '4. Experiments and Benchmark', page: 17,
          paragraphs: [
            'We re-implement 14 representative methods under a unified LOSO protocol. The best performing method combines RAFT optical flow features with an AU-aware Transformer, achieving UF1=0.782 and UAR=0.769 on CASME II.',
            'Cross-dataset experiments reveal a significant drop (12-20 points), indicating overfitting to dataset-specific illumination and subject demographics.',
          ],
        },
        {
          id: 's5', title: '5. Challenges and Future Directions', page: 23,
          paragraphs: [
            'Data scarcity remains the bottleneck: the largest public dataset contains fewer than 300 samples. Generative augmentation (diffusion-based ME synthesis) and self-supervised pre-training are promising remedies.',
            'Interpretable AU reasoning, real-time on-device inference, and multimodal fusion with physiological signals constitute the frontier of MER research.',
          ],
        },
      ],
    },
    mindmap: {
      title: 'MER 综述 (TPAMI 2025)',
      children: [
        { title: '数据集', children: [{ title: 'SMIC (157, 3帧率)' }, { title: 'CASME II (247, AU标注)' }, { title: 'SAMM (159, 肌肉注释)' }] },
        { title: '方法演进', children: [{ title: '手工特征: LBP-TOP' }, { title: '深度学习: CNN-RNN / 3D-CNN' }, { title: 'Transformer + AU先验' }] },
        { title: '评价协议', children: [{ title: 'LOSO (推荐)' }, { title: 'Hold-out' }] },
        { title: '挑战', children: [{ title: '数据稀缺' }, { title: '类别不均衡' }, { title: '跨数据集泛化' }] },
        { title: '未来方向', children: [{ title: '扩散模型数据增广' }, { title: '可解释AU推理' }, { title: '多模态融合' }] },
      ],
    },
    seven_summary: [
      { key: '背景', text: '微表情是 1/25~1/2 秒的 involuntary 面部运动，测谎与临床价值高；近 15 年方法从手工特征演进到 Transformer。' },
      { key: '问题', text: '三大挑战：公开数据稀缺（最大 <300 样本）、类别严重不均衡、跨数据集泛化差（性能下降 12-20 点）。' },
      { key: '方法', text: '系统梳理 214 篇论文，按特征提取 / 时序建模 / 识别协议三维度分类，并在统一 LOSO 协议下复现 14 种代表方法。' },
      { key: '实验', text: 'RAFT 光流 + AU-aware Transformer 取得最优：CASME II 上 UF1=0.782 / UAR=0.769；跨数据集实验揭示显著 domain gap。' },
      { key: '结论', text: 'AU 先验可稳定带来 3-8 UF1 点增益；LOSO 应作为标准报告协议以消除主体泄露。' },
      { key: '优点', text: '统一协议复现对比公平；方法分类维度清晰；对数据集协议讨论深入。' },
      { key: '局限与启发', text: '未覆盖生成式增广的最新进展；启发：将 AU 结构化先验与跨层交互结合，或以扩散模型扩充稀有类别样本。' },
    ],
    citation_graph: {
      nodes: [
        { id: 'n0', label: '本综述 (TPAMI 25)', type: 'self', year: 2025, citations: 12 },
        { id: 'n1', label: 'LBP-TOP (TPAMI 11)', type: 'cited', year: 2011, citations: 2400 },
        { id: 'n2', label: 'CASME II (T-AFFC 14)', type: 'cited', year: 2014, citations: 1850 },
        { id: 'n3', label: 'SAMM (FG 17)', type: 'cited', year: 2017, citations: 960 },
        { id: 'n4', label: 'SMIC (CVPR 11)', type: 'cited', year: 2011, citations: 1500 },
        { id: 'n5', label: 'Vision Transformer (ICLR 21)', type: 'cited', year: 2021, citations: 98000 },
        { id: 'n6', label: 'RAFT (ECCV 20)', type: 'cited', year: 2020, citations: 4200 },
        { id: 'n7', label: 'AU-aware MER (FG 24)', type: 'citing', year: 2024, citations: 35 },
        { id: 'n8', label: 'Diffusion ME Synth (CVPR 25)', type: 'citing', year: 2025, citations: 8 },
        { id: 'n9', label: 'MER 2024 Challenge (ACM MM 24)', type: 'citing', year: 2024, citations: 40 },
      ],
      edges: [
        { source: 'n0', target: 'n1' }, { source: 'n0', target: 'n2' }, { source: 'n0', target: 'n3' },
        { source: 'n0', target: 'n4' }, { source: 'n0', target: 'n5' }, { source: 'n0', target: 'n6' },
        { source: 'n7', target: 'n0' }, { source: 'n8', target: 'n0' }, { source: 'n9', target: 'n0' },
        { source: 'n7', target: 'n5' }, { source: 'n7', target: 'n6' }, { source: 'n8', target: 'n0' },
      ],
    },
  },
  {
    id: 'd2',
    project_id: 'p1',
    title: 'AU-aware Transformer with Optical Flow Guidance for Micro-expression Recognition',
    authors: 'Wang X., Zhang Q., et al.',
    venue: 'ACM MM 2024',
    year: 2024,
    source_type: 'pdf',
    file_name: 'au-transformer-mm24.pdf',
    pages: 9,
    parsed_status: 'parsed',
    has_code: true,
    code_url: 'https://github.com/mer-lab/AUFormer',
    doi: '10.1145/3664647.3664701',
    abstract:
      '本文提出 AU-aware Transformer，将面部动作单元作为图节点与图像 patch token 联合建模，并通过 RAFT 光流引导的时序注意力捕捉微表情瞬态动态。在 CASME II / SMIC / SAMM 上取得 SOTA。',
    created_at: daysAgo(30),
    structured: {
      sections: [
        {
          id: 's1', title: '1. Introduction', page: 1,
          paragraphs: [
            'Micro-expression recognition suffers from subtle motion and scarce data. We propose to inject Action Unit (AU) priors as graph-structured tokens into a Transformer backbone, jointly attending with visual patches.',
            'Our contributions: (1) an AU graph encoder with learnable AU relations; (2) RAFT-flow guided temporal attention; (3) SOTA on three benchmarks under LOSO.',
          ],
        },
        {
          id: 's2', title: '2. Method', page: 3,
          paragraphs: [
            'The AU graph encoder builds 17 AU nodes from OpenFace-detected intensities, initialized with pretrained AU embeddings and refined through graph attention. Cross-modal fusion aligns AU node features with patch tokens via cross-attention.',
            'Temporal attention weights are guided by dense optical flow magnitude, forcing the model to focus on apex frames where micro-motions peak.',
          ],
        },
        {
          id: 's3', title: '3. Experiments', page: 5,
          paragraphs: [
            'CASME II: UF1=0.829, UAR=0.812; SMIC: UF1=0.764; SAMM: UF1=0.721, all under strict LOSO with 5 seeds.',
            'Ablation: removing the AU branch drops UF1 by 6.8 points; replacing RAFT with TV-L1 drops 3.2 points.',
          ],
        },
        {
          id: 's4', title: '4. Conclusion', page: 8,
          paragraphs: [
            'AU priors and flow guidance are complementary structural biases for MER. Code and pretrained models are released.',
          ],
        },
      ],
    },
    mindmap: {
      title: 'AU-aware Transformer (MM 24)',
      children: [
        { title: '动机', children: [{ title: '微表情运动微弱' }, { title: '数据稀缺' }] },
        { title: '方法', children: [{ title: 'AU 图编码器 (17节点)' }, { title: 'RAFT 光流时序注意力' }, { title: '跨模态融合' }] },
        { title: '实验', children: [{ title: 'CASME II UF1=0.829' }, { title: '消融: AU分支 -6.8' }] },
        { title: '开源', children: [{ title: 'github.com/mer-lab/AUFormer' }] },
      ],
    },
    seven_summary: [
      { key: '背景', text: '微表情运动微弱 + 数据稀缺，纯视觉 Transformer 缺乏结构先验。' },
      { key: '问题', text: '如何将 AU 生理先验有效注入视觉主干，并与时序动态建模协同。' },
      { key: '方法', text: '17 个 AU 节点图注意力编码 + 与 patch token 跨模态融合 + RAFT 光流引导时序注意力。' },
      { key: '实验', text: '三数据集 LOSO SOTA：CASME II UF1=0.829 / UAR=0.812；消融验证 AU 分支贡献 6.8 点。' },
      { key: '结论', text: 'AU 先验与光流引导是互补的结构偏置，可显著提升 MER 性能。' },
      { key: '优点', text: '结构先验设计清晰；5 种子严格协议；开源代码可复现。' },
      { key: '局限与启发', text: '依赖 OpenFace 的 AU 检测质量；启发：自监督 AU 预训练可摆脱标注依赖。' },
    ],
    citation_graph: {
      nodes: [
        { id: 'n0', label: 'AUFormer (MM 24)', type: 'self', year: 2024, citations: 35 },
        { id: 'n1', label: 'Vision Transformer', type: 'cited', year: 2021, citations: 98000 },
        { id: 'n2', label: 'RAFT (ECCV 20)', type: 'cited', year: 2020, citations: 4200 },
        { id: 'n3', label: 'OpenFace (TPAMI 16)', type: 'cited', year: 2016, citations: 5200 },
        { id: 'n4', label: 'CASME II', type: 'cited', year: 2014, citations: 1850 },
        { id: 'n5', label: 'MER Survey (TPAMI 25)', type: 'citing', year: 2025, citations: 12 },
        { id: 'n6', label: 'MER 2024 Challenge', type: 'citing', year: 2024, citations: 40 },
      ],
      edges: [
        { source: 'n0', target: 'n1' }, { source: 'n0', target: 'n2' }, { source: 'n0', target: 'n3' },
        { source: 'n0', target: 'n4' }, { source: 'n5', target: 'n0' }, { source: 'n6', target: 'n0' },
      ],
    },
  },
];

const literaturePool = [
  { id: 'lit1', title: 'Micro-expression Recognition: A Survey of Trends, Methods and Challenges', authors: 'Li Y., Wei J., et al.', venue: 'IEEE TPAMI', year: 2025, citations: 12, has_code: false, doi: '10.1109/TPAMI.2025.0012345', source: 'OpenAlex', abstract: '系统梳理 MER 2010-2025 的数据集、方法与挑战，统一 LOSO 协议复现 14 种代表方法。', relevance: 0.96 },
  { id: 'lit2', title: 'AU-aware Transformer with Optical Flow Guidance for MER', authors: 'Wang X., Zhang Q., et al.', venue: 'ACM MM', year: 2024, citations: 35, has_code: true, code_url: 'github.com/mer-lab/AUFormer', doi: '10.1145/3664647.3664701', source: 'Semantic Scholar', abstract: 'AU 图编码 + RAFT 光流时序注意力，三数据集 LOSO SOTA。', relevance: 0.94 },
  { id: 'lit3', title: 'Diffusion-based Micro-expression Data Synthesis', authors: 'Chen L., et al.', venue: 'CVPR', year: 2025, citations: 8, has_code: true, code_url: 'github.com/diff-me/MEGen', doi: '10.1109/CVPR.2025.00211', source: 'arXiv', abstract: '以扩散模型合成稀有类别微表情样本，缓解类别不均衡，UF1 +4.2。', relevance: 0.91 },
  { id: 'lit4', title: 'MER 2024: The Fifth Challenge on Micro-expression Recognition', authors: 'Li Y., et al.', venue: 'ACM MM Workshop', year: 2024, citations: 40, has_code: true, code_url: 'github.com/merchallenge/MER2024', doi: '10.1145/3664647.3689012', source: 'OpenAlex', abstract: 'MER 系列挑战赛综述，提供统一评测平台与新指标。', relevance: 0.88 },
  { id: 'lit5', title: 'Graph Reasoning over Action Units for Facial Behavior Analysis', authors: 'Kumar A., et al.', venue: 'IJCV', year: 2024, citations: 87, has_code: false, doi: '10.1007/s11263-024-01989-x', source: 'Semantic Scholar', abstract: 'AU 关系图推理的通用框架，可迁移至宏/微表情与 AU 检测。', relevance: 0.85 },
  { id: 'lit6', title: 'Spatio-temporal Contrastive Pretraining for Micro-expression Analysis', authors: 'Zhao H., et al.', venue: 'T-AFFC', year: 2025, citations: 15, has_code: false, doi: '10.1109/TAFFC.2025.00112', source: 'arXiv', abstract: '自监督对比预训练缓解 MER 数据稀缺，无需 AU 标注。', relevance: 0.83 },
  { id: 'lit7', title: 'Remote Physiological Signal Fusion for Emotion Recognition', authors: 'Liu M., et al.', venue: 'IEEE TBME', year: 2023, citations: 120, has_code: true, code_url: 'github.com/rppg-lab/fusion', doi: '10.1109/TBME.2023.00456', source: 'PubMed', abstract: 'rPPG 与表情特征融合提升情感识别鲁棒性。', relevance: 0.74 },
  { id: 'lit8', title: 'Efficient On-Device Facial Analysis via Distillation', authors: 'Park S., et al.', venue: 'ECCV', year: 2024, citations: 66, has_code: true, code_url: 'github.com/edge-face/distill', doi: '10.1007/978-3-031-72901-x', source: 'arXiv', abstract: '知识蒸馏实现端侧实时面部分析，延迟 <10ms。', relevance: 0.70 },
];

const projects = [
  {
    id: 'p1',
    name: '微表情识别（MER）研究',
    type: 'research',
    status: 'active',
    description: '基于 AU 先验与 Transformer 的微表情识别，目标投 CCF-A 类会议。',
    owner_id: 'u1',
    team_id: 't1',
    progress: { topic: 100, literature: 78, experiment: 55, analysis: 40, writing: 15, submission: 0 },
    created_at: daysAgo(180),
    stats: { documents: 24, experiments: 9, charts: 6, manuscripts: 1 },
  },
  {
    id: 'p2',
    name: '多模态情感计算综述',
    type: 'survey',
    status: 'active',
    description: '面向研究生入门的多模态情感计算综述写作项目。',
    owner_id: 'u1',
    team_id: null,
    progress: { topic: 100, literature: 60, experiment: 0, analysis: 10, writing: 35, submission: 0 },
    created_at: daysAgo(90),
    stats: { documents: 41, experiments: 0, charts: 2, manuscripts: 1 },
  },
];

const teams = [
  {
    id: 't1', name: '情感计算课题组', owner: 'u1', member_count: 5,
    members: [
      { user_id: 'u1', name: '陈墨', role: 'admin', email: 'demo@sciencex.cn', joined_at: daysAgo(180) },
      { user_id: 'u2', name: '林曦', role: 'member', email: 'linxi@lab.edu.cn', joined_at: daysAgo(150) },
      { user_id: 'u3', name: '赵越', role: 'member', email: 'zhaoyue@lab.edu.cn', joined_at: daysAgo(120) },
      { user_id: 'u4', name: 'Dr. 韩明远', role: 'owner', email: 'hanmy@lab.edu.cn', joined_at: daysAgo(365) },
    ],
  },
];

const knowledgeBases = [
  {
    id: 'kb1', name: 'MER 课题组文献库', scope: 'team', team_id: 't1', project_id: 'p1',
    doc_count: 24, chunk_count: 1846, size_mb: 312,
    created_at: daysAgo(160),
    chunks: [
      { id: 'ck1', doc_id: 'd1', doc_title: 'MER Survey (TPAMI 25)', page: 17, content: '在统一 LOSO 协议下，RAFT 光流 + AU-aware Transformer 取得最优：CASME II 上 UF1=0.782、UAR=0.769。AU 先验可稳定带来 3-8 UF1 点增益。' },
      { id: 'ck2', doc_id: 'd2', doc_title: 'AUFormer (MM 24)', page: 5, content: 'CASME II: UF1=0.829, UAR=0.812；移除 AU 分支 UF1 下降 6.8 点；RAFT 替换为 TV-L1 下降 3.2 点。' },
      { id: 'ck3', doc_id: 'd1', doc_title: 'MER Survey (TPAMI 25)', page: 23, content: '数据稀缺是核心瓶颈：最大公开数据集不足 300 样本。扩散模型合成与自监督预训练是可行解法。' },
      { id: 'ck4', doc_id: 'd2', doc_title: 'AUFormer (MM 24)', page: 3, content: '17 个 AU 节点由 OpenFace 强度初始化，经图注意力精炼，与视觉 patch token 通过 cross-attention 融合。' },
    ],
  },
  {
    id: 'kb2', name: '个人写作素材库', scope: 'personal', team_id: null, project_id: null,
    doc_count: 8, chunk_count: 512, size_mb: 48,
    created_at: daysAgo(80),
    chunks: [
      { id: 'ck5', doc_id: 'd1', doc_title: '写作规范笔记', page: 1, content: '摘要应包含：背景一句、问题一句、方法两句、结果两句（带数字）、意义一句。避免 "we propose" 连续出现。' },
    ],
  },
];

const experiments = [
  {
    id: 'e1', project_id: 'p1', name: 'RAFT-AU-Former up9 消融实验',
    status: 'running', goal: '验证 AU 跨层交互模块对 UF1 的贡献',
    created_at: daysAgo(6),
    runs: [
      { id: 'r1', name: 'up9-baseline', params: { lr: 3e-4, batch: 32, epochs: 80, seed: 42, backbone: 'ViT-B', au_branch: true, cross_attn: false }, metrics: { UF1: 0.6464, UAR: 0.6414, Acc: 0.7244 }, status: 'completed', gpu_node: 'gpu-01', started_at: daysAgo(5), duration_h: 6.2 },
      { id: 'r2', name: 'up9+cross-attn', params: { lr: 3e-4, batch: 32, epochs: 80, seed: 42, backbone: 'ViT-B', au_branch: true, cross_attn: true }, metrics: { UF1: 0.6892, UAR: 0.6801, Acc: 0.7531 }, status: 'completed', gpu_node: 'gpu-01', started_at: daysAgo(3), duration_h: 7.8 },
      { id: 'r3', name: 'up9+flow-boost', params: { lr: 2e-4, batch: 16, epochs: 120, seed: 7, backbone: 'ViT-B', au_branch: true, cross_attn: true, flow_boost: 'x2' }, metrics: {}, status: 'running', gpu_node: 'gpu-03', started_at: daysAgo(0), duration_h: 2.4 },
    ],
  },
  {
    id: 'e2', project_id: 'p1', name: '主干网络对比实验',
    status: 'completed', goal: '对比 ViT-S/B/L 与 ConvNeXt 在 CASME II 上的表现',
    created_at: daysAgo(20),
    runs: [
      { id: 'r4', name: 'ViT-S', params: { lr: 3e-4, batch: 64, epochs: 60, seed: 42 }, metrics: { UF1: 0.5981, UAR: 0.5902, Acc: 0.6988 }, status: 'completed', gpu_node: 'gpu-02', started_at: daysAgo(19), duration_h: 3.1 },
      { id: 'r5', name: 'ViT-L', params: { lr: 1e-4, batch: 16, epochs: 60, seed: 42 }, metrics: { UF1: 0.6710, UAR: 0.6623, Acc: 0.7402 }, status: 'completed', gpu_node: 'gpu-02', started_at: daysAgo(15), duration_h: 12.6 },
      { id: 'r6', name: 'ConvNeXt-B', params: { lr: 3e-4, batch: 32, epochs: 60, seed: 42 }, metrics: { UF1: 0.6233, UAR: 0.6156, Acc: 0.7119 }, status: 'completed', gpu_node: 'gpu-04', started_at: daysAgo(10), duration_h: 5.4 },
    ],
  },
];

const gpuNodes = [
  { id: 'gpu-01', host: 'lab-server-01', gpu_model: 'RTX 4090 24G', status: 'busy', util: 92, mem_used: 21.4, mem_total: 24, temp: 71, task: 'e1/r3 up9+flow-boost' },
  { id: 'gpu-02', host: 'lab-server-01', gpu_model: 'RTX 4090 24G', status: 'busy', util: 78, mem_used: 18.2, mem_total: 24, temp: 65, task: '师兄 - LLaMA 微调' },
  { id: 'gpu-03', host: 'lab-server-02', gpu_model: 'A100 80G', status: 'busy', util: 64, mem_used: 52.7, mem_total: 80, temp: 58, task: 'e1/r3 up9+flow-boost' },
  { id: 'gpu-04', host: 'lab-server-02', gpu_model: 'A100 80G', status: 'free', util: 3, mem_used: 1.1, mem_total: 80, temp: 35, task: null },
  { id: 'gpu-05', host: 'lab-server-03', gpu_model: 'A6000 48G', status: 'offline', util: 0, mem_used: 0, mem_total: 48, temp: 0, task: null },
];

const sotaLeaderboard = {
  task: '微表情识别 (Micro-expression Recognition)',
  protocol: 'LOSO (Leave-One-Subject-Out)',
  datasets: [
    {
      name: 'CASME II', samples: 247, subjects: 26, classes: 5,
      entries: [
        { rank: 1, method: 'AUFormer (MM 24)', uf1: 0.829, uar: 0.812, year: 2024, has_code: true },
        { rank: 2, method: 'GraphAU (IJCV 24)', uf1: 0.810, uar: 0.798, year: 2024, has_code: false },
        { rank: 3, method: 'STCL (T-AFFC 25)', uf1: 0.793, uar: 0.780, year: 2025, has_code: false },
        { rank: 4, method: 'Survey best re-impl (TPAMI 25)', uf1: 0.782, uar: 0.769, year: 2025, has_code: true },
        { rank: 5, method: 'Ours: up9+cross-attn', uf1: 0.689, uar: 0.680, year: 2026, has_code: false, is_ours: true },
      ],
    },
    {
      name: 'SMIC', samples: 157, subjects: 16, classes: 3,
      entries: [
        { rank: 1, method: 'AUFormer (MM 24)', uf1: 0.764, uar: 0.751, year: 2024, has_code: true },
        { rank: 2, method: 'STCL (T-AFFC 25)', uf1: 0.742, uar: 0.730, year: 2025, has_code: false },
        { rank: 3, method: 'Ours: up9+cross-attn', uf1: 0.703, uar: 0.695, year: 2026, has_code: false, is_ours: true },
      ],
    },
    {
      name: 'SAMM', samples: 159, subjects: 29, classes: 7,
      entries: [
        { rank: 1, method: 'GraphAU (IJCV 24)', uf1: 0.721, uar: 0.708, year: 2024, has_code: false },
        { rank: 2, method: 'AUFormer (MM 24)', uf1: 0.705, uar: 0.694, year: 2024, has_code: true },
        { rank: 3, method: 'Ours: up9-baseline', uf1: 0.612, uar: 0.604, year: 2026, has_code: false, is_ours: true },
      ],
    },
  ],
};

const charts = [
  { id: 'ch1', project_id: 'p1', title: '消融实验 UF1 对比', type: 'bar', prompt: '各消融配置在 CASME II 上的 UF1 柱状图', created_at: daysAgo(3), source: 'generated', analysis: { trend: 'up9+cross-attn 相比 baseline 提升 4.28 个点（+6.6%）', anomalies: 'flow-boost 配置尚在训练，暂无数据', suggestions: ['补充 3 个随机种子以报告均值±方差', '绘制 per-class F1 以检查少数类', '建议加入 SAMM 交叉验证'] } },
  { id: 'ch2', project_id: 'p1', title: '训练曲线 UF1 vs Epoch', type: 'line', prompt: 'up9+cross-attn 训练曲线，含 train/val', created_at: daysAgo(2), source: 'generated', analysis: { trend: 'val UF1 在 epoch 62 后趋于平稳，最佳 0.6892', anomalies: 'epoch 31 处 val 抖动 -1.2 点，疑似学习率预热结束', suggestions: ['考虑 cosine 退火', '最佳 epoch 附近可降低 eval 间隔'] } },
];

const chartTemplates = [
  { id: 'tpl1', name: '分组柱状图', desc: '多方法 × 多数据集对比', tags: ['对比实验'] },
  { id: 'tpl2', name: '消融瀑布图', desc: '模块贡献分解', tags: ['消融'] },
  { id: 'tpl3', name: '训练曲线', desc: 'loss / metric 随 epoch 变化', tags: ['训练监控'] },
  { id: 'tpl4', name: '混淆矩阵热力图', desc: 'per-class 识别表现', tags: ['分类评估'] },
  { id: 'tpl5', name: '雷达图', desc: '多维度方法对比', tags: ['综合评估'] },
  { id: 'tpl6', name: '小提琴图', desc: '指标分布（多种子）', tags: ['统计'] },
];

const journals = [
  {
    id: 'j1',
    name: 'CVPR',
    full_name: 'IEEE/CVF Conference on Computer Vision and Pattern Recognition',
    ccf: 'A',
    type: '会议',
    field: '计算机视觉与模式识别',
    deadline: daysAhead(58),
    if_score: null,
    period: '一年一届',
    location: 'Denver, USA',
    website: 'https://cvpr.thecvf.com/',
    publisher: 'IEEE / CVF',
    acceptance_rate: '23.6%',
    review_cycle: '双盲三审 · 约 3.5 个月',
    guidelines: '双盲评审 (Double Blind) · IEEE 8页双栏 LaTeX 模板 · 支持 Supplementary 材料',
    description: '全球计算机视觉与模式识别领域的顶级学术会议，享有极高学术声誉与产业影响力。重点收录图像处理、3D重建、微表情与行为分析、基础视觉大模型等前沿突破。',
    topics: ['微表情与动作识别', '多模态视觉生成', '3D 人体表征', '目标检测与分割'],
  },
  {
    id: 'j2',
    name: 'ICCV',
    full_name: 'IEEE/CVF International Conference on Computer Vision',
    ccf: 'A',
    type: '会议',
    field: '计算机视觉与人工智能',
    deadline: daysAhead(205),
    if_score: null,
    period: '两年一届',
    location: 'Seoul, Korea',
    website: 'https://iccv.thecvf.com/',
    publisher: 'IEEE / CVF',
    acceptance_rate: '21.5%',
    review_cycle: '双盲三审 · 约 4 个月',
    guidelines: '严格双盲评审 · 8页正文限制 · 严禁未脱敏机构信息',
    description: '计算机视觉领域最具权威的两年一度顶级国际学术会议。理论严谨性与创新增量要求极高，极度重视消融实验完整性与 Baseline 真实性。',
    topics: ['神经辐射场 (NeRF)', '视频时空建模', '鲁棒性与泛化', '生成模型'],
  },
  {
    id: 'j3',
    name: 'ACM Multimedia',
    full_name: 'ACM International Conference on Multimedia (ACM MM)',
    ccf: 'A',
    type: '会议',
    field: '多媒体计算与人机交互',
    deadline: daysAhead(96),
    if_score: null,
    period: '一年一届',
    location: 'Dublin, Ireland',
    website: 'https://acmmm.org/',
    publisher: 'ACM',
    acceptance_rate: '24.2%',
    review_cycle: '双盲同行评议 · 约 3 个月',
    guidelines: '双盲评审 · ACM 9页长文模板 (ACM SigConf) · 鼓励开源数据集与代码',
    description: '多媒体计算领域的旗舰国际会议，多模态融合、情感计算、微表情识别（MER）与视听感知研究的核心发表阵地，近三年收录大量动作单元与 Transformer 交叉研究。',
    topics: ['情感计算与微表情', '跨模态多媒体分析', '多感官具身智能', '音视频理解'],
  },
  {
    id: 'j4',
    name: 'IEEE TPAMI',
    full_name: 'IEEE Transactions on Pattern Analysis and Machine Intelligence',
    ccf: 'A',
    type: '期刊',
    field: '模式识别 / 人工智能 / 机器感知',
    deadline: null,
    if_score: 20.8,
    period: '滚动投稿 (常年开放)',
    location: 'IEEE CSDL',
    website: 'https://www.computer.org/csdl/journal/tp',
    publisher: 'IEEE Computer Society',
    acceptance_rate: '14.8%',
    review_cycle: '首轮审稿约 4.5 个月 · 严格二到三轮大修',
    guidelines: '单盲或双盲可选 · IEEE 期刊双栏 12-14 页长文 · 需充分的理论证明与大规模基准实验',
    description: '模式识别与机器学习领域的殿堂级期刊，影响因子高达 20.8。偏好理论深度深厚、实验覆盖度全、且对学科分支具有长远指导意义的奠基性工作。',
    topics: ['模式分析理论', '深度表征学习', '复杂视觉推理', '生物特征识别'],
  },
  {
    id: 'j5',
    name: 'IJCV',
    full_name: 'International Journal of Computer Vision',
    ccf: 'A',
    type: '期刊',
    field: '计算机视觉 / 几何视觉',
    deadline: null,
    if_score: 11.6,
    period: '滚动投稿 (常年开放)',
    location: 'Springer Nature',
    website: 'https://www.springer.com/journal/11263',
    publisher: 'Springer Nature',
    acceptance_rate: '18.3%',
    review_cycle: '首轮审稿约 3.5 个月',
    guidelines: 'Springer Nature 期刊标准模板 · 不设严格页数上限 · 鼓励详实消融与附录推导',
    description: 'Springer 旗下的顶尖视觉理论期刊，与 TPAMI 并称视觉学术双壁。注重论文行文优雅度、公式推演的数学美感以及系统性实验对比。',
    topics: ['计算摄影学', '几何视觉与 SLAM', '细粒度行为理解', '自监督学习'],
  },
  {
    id: 'j6',
    name: 'IEEE T-AFFC',
    full_name: 'IEEE Transactions on Affective Computing',
    ccf: 'B',
    type: '期刊',
    field: '情感计算 / 微表情 / 人机协同',
    deadline: null,
    if_score: 9.2,
    period: '滚动投稿 (常年开放)',
    location: 'IEEE CSDL',
    website: 'https://www.computer.org/csdl/journal/ta',
    publisher: 'IEEE Computer Society',
    acceptance_rate: '22.0%',
    review_cycle: '首轮约 2.8 个月 · 审稿反馈专业详尽',
    guidelines: 'IEEE Transactions 规范 · 需包含心理学/人机认知合理性与消融论证',
    description: '国际情感计算领域的顶级期刊，也是微表情识别、生理信号分析与面部动作单元（AU）交互研究的最佳投递目标之一，审稿人专业度极高。',
    topics: ['微表情与心理计算', '多模态情绪识别', '神经反应特征', '生理人机交互'],
  },
  {
    id: 'j7',
    name: 'AAAI',
    full_name: 'AAAI Conference on Artificial Intelligence',
    ccf: 'A',
    type: '会议',
    field: '综合人工智能 / 机器学习',
    deadline: daysAhead(41),
    if_score: null,
    period: '一年一届',
    location: 'Singapore',
    website: 'https://aaai.org/conference/aaai/',
    publisher: 'AAAI Press',
    acceptance_rate: '23.8%',
    review_cycle: '双盲二阶段评议 · 约 3 个月',
    guidelines: 'AAAI 7页正文 + 2页参考文献 · 双盲盲审 · 支持 NeurIPS 风格快速抗辩',
    description: '国际人工智能综合性顶级学术会议，涵盖机器学习、知识图谱、计算机视觉、自然语言处理等广泛分支，接收率约 23%，跨学科包容度高。',
    topics: ['通用人工智能', '知识图谱与推理', '多智能体协作', '高效模型训练'],
  },
  {
    id: 'j8',
    name: 'ECCV',
    full_name: 'European Conference on Computer Vision',
    ccf: 'B',
    type: '会议',
    field: '计算机视觉',
    deadline: daysAhead(150),
    if_score: null,
    period: '两年一届',
    location: 'Munich, Germany',
    website: 'https://eccv.ecva.net/',
    publisher: 'Springer / ECVA',
    acceptance_rate: '26.4%',
    review_cycle: '双盲三审 · 约 3.5 个月',
    guidelines: 'LNCS 14页正文格式 (单栏 Springer) · 双盲盲审 · 重视真实世界鲁棒性',
    description: '欧洲计算机视觉顶级学术会议，与 CVPR、ICCV 齐名。偏好新颖的表征结构、具有启发性的理论反思与鲁棒的轻量化架构设计。',
    topics: ['自适应神经表征', '鲁棒特征提取', '运动与动作估计', '生成对抗模型'],
  },
  {
    id: 'j9',
    name: 'FG (IEEE Face & Gesture)',
    full_name: 'IEEE International Conference on Automatic Face and Gesture Recognition',
    ccf: 'C',
    type: '会议',
    field: '人脸识别 / 手势感知 / 微表情',
    deadline: daysAhead(23),
    if_score: null,
    period: '一年一届',
    location: 'Tokyo, Japan',
    website: 'https://fg2024.ieee-biometrics.org/',
    publisher: 'IEEE Biometrics Council',
    acceptance_rate: '35.0%',
    review_cycle: '双盲审稿 · 约 2 个月 · 审稿反馈快',
    guidelines: 'IEEE 6-8页标准会议格式 · 面部计算专项聚焦',
    description: '人脸与手势分析方向历史悠久的专项会议，微表情与微动作（Action Units）领域的学者高度集中，非常适合毕业研究成果保底发表。',
    topics: ['面部动作单元检测', '微表情跨数据集泛化', '手势识别', '视线估计'],
  },
  {
    id: 'j10',
    name: 'ICASSP',
    full_name: 'IEEE International Conference on Acoustics, Speech and Signal Processing',
    ccf: 'B',
    type: '会议',
    field: '信号处理 / 语音 / 多模态感知',
    deadline: daysAhead(72),
    if_score: null,
    period: '一年一届',
    location: 'Barcelona, Spain',
    website: 'https://2024.ieeeicassp.org/',
    publisher: 'IEEE Signal Processing Society',
    acceptance_rate: '45.0%',
    review_cycle: '单盲或双盲 · 约 2.5 个月',
    guidelines: 'IEEE 4页正文 + 1页参考文献 · 篇幅精炼 · 强调信号处理理论与实验验证',
    description: 'IEEE 信号处理学会旗舰会议，文章篇幅紧凑，接收量大，是快速发表音视频信号与微小变化传感工作的首选会议。',
    topics: ['时序微运动滤波', '图信号处理', '跨模态信号融合', '高效特征工程'],
  },
  {
    id: 'j11',
    name: 'Neurocomputing',
    full_name: 'Neurocomputing (Elsevier)',
    ccf: 'C',
    type: '期刊',
    field: '神经网络 / 深度学习 / 模式分类',
    deadline: null,
    if_score: 6.0,
    period: '滚动投稿 (常年开放)',
    location: 'Elsevier ScienceDirect',
    website: 'https://www.sciencedirect.com/journal/neurocomputing',
    publisher: 'Elsevier',
    acceptance_rate: '28.0%',
    review_cycle: '首轮约 3 个月 · 接收后见刊极快',
    guidelines: 'Elsevier 标准期刊模板 · 接收实验性改进与工程优化型长文',
    description: 'Elsevier 旗下的经典神经网络期刊，年发文量充裕，适合具有稳定消融实验与明确指标提升的应用型学术工作。',
    topics: ['深度神经网络优化', '特征选择', '医学影像与模式分类', '时序建模'],
  },
  {
    id: 'j12',
    name: 'Pattern Recognition',
    full_name: 'Pattern Recognition (Elsevier PR)',
    ccf: 'B',
    type: '期刊',
    field: '模式识别 / 计算机视觉 / 生物特征',
    deadline: null,
    if_score: 7.5,
    period: '滚动投稿 (常年开放)',
    location: 'Elsevier ScienceDirect',
    website: 'https://www.sciencedirect.com/journal/pattern-recognition',
    publisher: 'Elsevier / Pattern Recognition Society',
    acceptance_rate: '19.5%',
    review_cycle: '首轮约 3.2 个月 · 大修二审严密',
    guidelines: 'Elsevier 双栏模板 · 需具备详实的数学建模与严格同类算法对比',
    description: '模式识别领域极富声誉的权威期刊，影响因子稳步上升，对算法的数学严密性与理论清晰度要求非常严格。',
    topics: ['统计模式识别', '流形学习', '图神经网络', '细粒度行为特征'],
  },
];

const submissionTracks = [
  { id: 'st1', user_id: 'u1', journal_id: 'j1', journal_name: 'CVPR', status: 'watching', deadline: daysAhead(58), note: '主目标：MER 论文', created_at: daysAgo(10) },
  { id: 'st2', user_id: 'u1', journal_id: 'j3', journal_name: 'ACM Multimedia', status: 'open', deadline: daysAhead(96), note: '备选', created_at: daysAgo(8) },
  { id: 'st3', user_id: 'u1', journal_id: 'j9', journal_name: 'FG', status: 'submitted', deadline: daysAhead(23), note: '已投 short paper', created_at: daysAgo(20) },
];

const manuscripts = [
  {
    id: 'ms1', project_id: 'p1', title: 'Cross-Layer AU Interaction Transformers for Micro-expression Recognition',
    status: 'polishing', language: 'en', version: 7, words: 6842,
    updated_at: daysAgo(1),
    content: `# Cross-Layer AU Interaction Transformers for Micro-expression Recognition

## Abstract
Micro-expression recognition (MER) is hindered by subtle facial motions and scarce training data. We propose CLAU-Former, which injects Action Unit (AU) priors through cross-layer interaction with visual patch tokens. Experiments on CASME II under LOSO achieve UF1 0.689, improving our baseline by 4.3 points.

## 1. Introduction
Micro-expressions are involuntary facial movements lasting 1/25 to 1/2 second... (draft)

## 2. Related Work
Early MER methods rely on hand-crafted descriptors such as LBP-TOP... 

## 3. Method
### 3.1 AU Graph Encoder
We build 17 AU nodes initialized from OpenFace intensities...

### 3.2 Cross-Layer Interaction
Unlike single-point fusion, we inject AU features at stages 2, 6, 10 of the ViT backbone...
`,
  },
];

const reviewReports = [
  {
    id: 'rv1', manuscript_id: 'ms1', decision: 'major_revision',
    created_at: daysAgo(2),
    scores: { theory: 6.5, method: 7.0, experiment: 5.5, writing: 7.5, ethics: 9.0, overall: 6.9 },
    roles: [
      {
        role: '理论审稿人', verdict: 'borderline',
        comments: 'AU 先验作为结构偏置的动机充分，但与 GraphAU (IJCV 24) 的核心区别论述不足，建议在 Related Work 中增加逐条对比表。',
      },
      {
        role: '方法审稿人', verdict: 'weak_accept',
        comments: '跨层交互设计合理，消融实验验证了各模块贡献。担忧：AU 强度依赖 OpenFace，其噪声敏感性未讨论，建议补充 AU 检测误差的鲁棒性分析。',
      },
      {
        role: '实验审稿人', verdict: 'reject_risk',
        comments: 'UF1 0.689 距离当前 SOTA (0.829, AUFormer) 仍有 14 个点差距，必须说明差异来源（数据划分/骨干规模）。单一种子结果不可接受，至少 3 种子均值±方差。SAMM 结果偏弱。',
      },
      {
        role: '写作审稿人', verdict: 'weak_accept',
        comments: '行文清晰，图表规范。Abstract 中 "improving our baseline by 4.3 points" 表述应改为相对提升百分比。建议补充限制章节。',
      },
      {
        role: '伦理审稿人', verdict: 'accept',
        comments: '使用公开数据集且无隐私风险，符合伦理规范。建议在 Conclusion 中说明潜在误用于监控的风险。',
      },
    ],
    conflicts: [
      { between: ['方法审稿人', '实验审稿人'], point: 'OpenFace 噪声影响：方法侧认为可控，实验侧要求定量分析', resolution: '建议补 AU 噪声注入实验（±10% 强度扰动）' },
      { between: ['理论审稿人', '方法审稿人'], point: '与 GraphAU 的差异化贡献是否足够', resolution: '增加对比表并强调跨层 vs 单点融合的消融' },
    ],
    priorities: [
      { level: 'P0', item: '补充 3 随机种子实验并报告均值±方差' },
      { level: 'P0', item: '与 AUFormer 在相同协议下复现对比，解释 14 点差距' },
      { level: 'P1', item: 'AU 检测噪声鲁棒性分析' },
      { level: 'P1', item: 'Related Work 增加与 GraphAU 的逐条对比' },
      { level: 'P2', item: '补充 Limitation 章节' },
    ],
  },
];

const adviceRecords = [
  { id: 'a1', meeting: '10月组会', from: '韩老师', date: daysAgo(5), category: '实验', content: '对比实验要控制变量，backbone 规模差异要说明；补 3 个种子。', status: 'done', todo: '补充随机种子 7/13/42 三组实验' },
  { id: 'a2', meeting: '10月组会', from: '韩老师', date: daysAgo(5), category: '写作', content: 'Intro 的贡献点写得太含糊，用 bullet 列 3 条。', status: 'doing', todo: '重写 Introduction 贡献列表' },
  { id: 'a3', meeting: '9月组会', from: '林曦', date: daysAgo(35), category: '文献', content: '建议关注 MER 2024 Challenge 的评测口径。', status: 'done', todo: '阅读 MER2024 技术报告' },
];

const researchMemories = [
  {
    id: 'mem1',
    user_id: 'u1',
    project_id: 'p1',
    category: 'baseline',
    key: '基线模型设定',
    content: '当前课题核心基线为 up9 系列（含 AU 分支），近期最高指标 UF1=0.6892，UAR=0.6810',
    tags: ['up9', 'baseline', 'AU-branch'],
    active: true,
    created_at: daysAgo(10),
  },
  {
    id: 'mem2',
    user_id: 'u1',
    project_id: 'p1',
    category: 'dataset',
    key: '数据与评测协议',
    content: '采用 CASME II 与 SAMM 双库评测，遵循严格的 LOSO (Leave-One-Subject-Out) 交叉验证协议',
    tags: ['CASME-II', 'SAMM', 'LOSO'],
    active: true,
    created_at: daysAgo(15),
  },
  {
    id: 'mem3',
    user_id: 'u1',
    project_id: 'p1',
    category: 'target',
    key: '目标投稿期刊与会议',
    content: '主攻目标 ACM MM 2026 与 IEEE TPAMI，重点强化 cross-layer 创新性与消融论述',
    tags: ['ACM-MM', 'TPAMI'],
    active: true,
    created_at: daysAgo(20),
  },
  {
    id: 'mem4',
    user_id: 'u1',
    project_id: 'p1',
    category: 'advisor',
    key: '导师评审硬性要求',
    content: '韩老师组会要求：所有消融实验必须使用至少 3 个随机种子 (7/13/42) 报告均值与方差',
    tags: ['韩老师', '随机种子', '方差报告'],
    active: true,
    created_at: daysAgo(5),
  },
];

const skills = [
  { id: 'sk1', name: '文献综述生成', desc: '输入主题，自动检索并生成带引用的综述草稿', icon: 'book', category: '文献', uses: 128 },
  { id: 'sk2', name: '统计分析向导', desc: '选择检验方法、解读 p 值与效应量', icon: 'chart', category: '数据', uses: 96 },
  { id: 'sk3', name: '实验设计器', desc: '生成消融/对比实验方案与变量控制表', icon: 'flask', category: '实验', uses: 74 },
  { id: 'sk4', name: 'LaTeX 排版助手', desc: '表格/公式/参考文献格式化', icon: 'doc', category: '写作', uses: 152 },
  { id: 'sk5', name: '学术英文润色', desc: '学术语气改写、期刊风格适配', icon: 'pen', category: '写作', uses: 210 },
];

const mcpServers = [
  { id: 'mcp1', name: 'arxiv-mcp', desc: '实时检索 arXiv 最新论文', status: 'available', category: '文献' },
  { id: 'mcp2', name: 'github-mcp', desc: '搜索开源代码与仓库信息', status: 'available', category: '代码' },
  { id: 'mcp3', name: 'pwc-mcp', desc: 'Papers with Code SOTA 查询', status: 'available', category: '实验' },
  { id: 'mcp4', name: 'scholar-mcp', desc: 'Google Scholar 引用数据', status: 'available', category: '文献' },
];

// 用量数据（近 30 天）
function genUsage() {
  const arr = [];
  const scenes = ['chat', 'literature', 'analysis', 'writing', 'review'];
  const models = ['GPT-4o', 'DeepSeek-V3', 'Claude 3.7', 'Gemini 2.0'];
  for (let d = 29; d >= 0; d--) {
    const base = 20 + Math.round(30 * Math.abs(Math.sin(d / 4)));
    for (let i = 0; i < 3; i++) {
      arr.push({
        date: daysAgo(d).slice(0, 10),
        scene: scenes[(d + i) % scenes.length],
        model: models[(d + i) % models.length],
        prompt_tokens: 400 + ((d * 137 + i * 311) % 1600),
        completion_tokens: 200 + ((d * 89 + i * 173) % 900),
        calls: 2 + ((d + i) % 6),
        cost: +(((d * 1.7 + i * 2.3) % 9) + 0.4).toFixed(2),
      });
    }
  }
  return arr;
}
const usageRecords = genUsage();

const orders = [
  { id: 'o1', order_no: 'SX20260901001', plan: 'Pro 专业版', amount: 59, pay_status: 'paid', period: '月付', created_at: daysAgo(31), invoice: { status: 'issued', title: '××大学' } },
  { id: 'o2', order_no: 'SX20260801002', plan: 'Pro 专业版', amount: 59, pay_status: 'paid', period: '月付', created_at: daysAgo(62), invoice: { status: 'issued', title: '××大学' } },
];

const subscription = {
  plan: 'pro', plan_name: 'Pro 专业版', price: 59, period: '月付',
  expire_at: daysAhead(29), auto_renew: true,
  quota: { chat: 2000, literature: 500, chart: 100, kb: 10 },
  used: { chat: 1284, literature: 213, chart: 37, kb: 3 },
};

const plans = [
  { id: 'free', name: 'Free 免费版', price: 0, period: '永久', features: ['基础对话 50 次/天', '文献检索 20 次/天', '1 个知识库', '单模型接入'] },
  { id: 'pro', name: 'Pro 专业版', price: 59, period: '月', features: ['全工具解锁', '多模型无限切换', 'RAG 知识库 ×10', '图表生成 100 次/月', '不限量润色与翻译'], highlight: true },
  { id: 'team', name: 'Team 科研团队版', price: 399, period: '月', features: ['包含 5 席位', '课题组共享空间', '共享知识库', '管理员权限', '优先支持'], },
];

const auditLogs = [
  { id: 'al1', action: '登录成功', ip: '10.24.6.18', result: 'success', ts: daysAgo(0) },
  { id: 'al2', action: '修改模型密钥 (lab-local-qwen2.5-72b)', ip: '10.24.6.18', result: 'success', ts: daysAgo(12) },
  { id: 'al3', action: '导出个人数据', ip: '10.24.6.18', result: 'success', ts: daysAgo(20) },
  { id: 'al4', action: '登录失败（密码错误）', ip: '172.16.4.9', result: 'failed', ts: daysAgo(22) },
];

const papersDaily = [
  { date: daysAgo(4).slice(0, 10), items: [
    { id: 'pd1', title: 'SAMM-3D: A New Dataset for 3D Micro-expression Analysis', venue: 'arXiv', authors: 'Garcia R., et al.', reason: '匹配「微表情识别」方向', hot: 4 },
    { id: 'pd2', title: 'Unified AU Detection and MER via Multi-task Learning', venue: 'arXiv', authors: 'Sun Q., et al.', reason: '匹配「AU 先验」兴趣', hot: 3 },
  ]},
  { date: daysAgo(2).slice(0, 10), items: [
    { id: 'pd3', title: 'Efficient Transformers for On-Device Facial Analysis', venue: 'arXiv', authors: 'Park S., et al.', reason: '匹配「Transformer」方向', hot: 5 },
  ]},
  { date: daysAgo(0).slice(0, 10), items: [
    { id: 'pd4', title: 'METrack: Real-time Micro-expression Spotting in Long Videos', venue: 'arXiv', authors: 'Li Y., et al.', reason: '匹配「微表情识别」方向', hot: 4 },
    { id: 'pd5', title: 'Rethinking Evaluation Protocols in MER: A Reproducibility Study', venue: 'arXiv', authors: 'Wei J., et al.', reason: '与你阅读的综述相关', hot: 5 },
  ]},
];

const recentOutputs = [
  { id: 'ro1', type: 'chart', title: '消融实验 UF1 对比', meta: 'ch1 · 3天前', ref: '/tools/analysis' },
  { id: 'ro2', type: 'doc', title: '七段式总结 · AUFormer (MM 24)', meta: 'd2 · 5天前', ref: '/tools/reader' },
  { id: 'ro3', type: 'deck', title: '组会汇报 · up9 实验进展', meta: '12页 pptx · 5天前', ref: '/features/meeting' },
  { id: 'ro4', type: 'report', title: '模拟审稿报告 #rv1', meta: '大修 · 2天前', ref: '/features/review' },
];

// 异步任务表
const tasks = new Map();

const id = (prefix) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/* 开发环境 JSON 持久化：替代生产环境的 PostgreSQL/Redis，避免演示数据因重启丢失。 */
const dataDir = path.resolve(process.env.SCIENCEX_DATA_DIR || path.join(__dirname, '../../.data'));
const dataFile = path.join(dataDir, 'store.json');
const persistedCollections = {
  users, customModels, conversations, documents, projects, teams, knowledgeBases,
  experiments, charts, submissionTracks, manuscripts, reviewReports, adviceRecords,
  researchMemories, usageRecords, orders, subscription,
};

function hydrate() {
  if (!fs.existsSync(dataFile)) return;
  try {
    const saved = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    for (const [name, target] of Object.entries(persistedCollections)) {
      if (saved[name] === undefined) continue;
      if (Array.isArray(target) && Array.isArray(saved[name])) {
        target.splice(0, target.length, ...saved[name]);
      } else if (target && typeof target === 'object' && saved[name] && !Array.isArray(saved[name])) {
        Object.assign(target, saved[name]);
      }
    }
  } catch (error) {
    console.warn('[ScienceX Store] 持久化数据读取失败，将使用内置演示数据:', error.message);
  }
}

function persist() {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    const tempFile = `${dataFile}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(persistedCollections, null, 2), 'utf8');
    fs.renameSync(tempFile, dataFile);
  } catch (error) {
    console.warn('[ScienceX Store] 持久化数据写入失败:', error.message);
  }
}

hydrate();

module.exports = {
  users, sessions, builtinModels, customModels, conversations, documents, literaturePool,
  projects, teams, knowledgeBases, experiments, gpuNodes, sotaLeaderboard, charts,
  chartTemplates, journals, submissionTracks, manuscripts, reviewReports, adviceRecords,
  skills, mcpServers, usageRecords, orders, subscription, plans, auditLogs, papersDaily,
  recentOutputs, tasks, researchMemories, id, now, daysAgo, daysAhead, persist,
};
