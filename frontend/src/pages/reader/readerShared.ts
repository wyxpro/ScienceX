/* ============================================================
   Reader 模块共享常量与工具（自 pages/Reader.tsx 拆分下沉，F1）
   ============================================================ */

export type MidTab = 'translate' | 'mindmap' | 'seven' | 'reproduce' | 'graph';
export type LeftMode = 'read' | 'file';

/** 文献导入支持的格式（含 CAJ 知网格式），与后端 parser.SUPPORTED_EXT 对齐 */
export const IMPORT_ACCEPT = '.pdf,.docx,.doc,.md,.markdown,.caj';
/** 单文件上限 50MB */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/** 依据扩展名给出导入格式标签样式 */
export function importKindInfo(fileName: string): { label: string; bg: string; color: string } {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') return { label: 'PDF 论文', bg: '#fee2e2', color: '#dc2626' };
  if (ext === 'docx' || ext === 'doc') return { label: 'Word (.docx)', bg: '#dbeafe', color: '#2563eb' };
  if (ext === 'md' || ext === 'markdown') return { label: 'Markdown', bg: '#ede9fe', color: '#7c3aed' };
  if (ext === 'caj') return { label: 'CAJ 知网', bg: '#ffedd5', color: '#ea580c' };
  return { label: ext ? ext.toUpperCase() : '文件', bg: '#f1f5f9', color: '#475569' };
}

/** 把本地文件读成 Base64（去掉 data URL 前缀），供后端解析 */
export function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = String(reader.result || '');
      const idx = r.indexOf(',');
      resolve(idx >= 0 ? r.slice(idx + 1) : r);
    };
    reader.onerror = () => reject(reader.error || new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

/* AI模型选项列表（与后端内置模型保持一致，OpenAI Next 统一网关实测可用） */
export const AI_MODELS = [
  { id: 'deepseek-flash', name: 'DeepSeek V4.1 Flash', desc: '极速推理 · 3.1.1 文本核心引擎', badge: '闪电' },
  { id: 'm-gpt-sol', name: 'GPT-6.1 Sol 顶刊精读', desc: '通用旗舰 · 全文架构深度推理', badge: '推荐' },
  { id: 'm-claude', name: 'Claude Sonnet 5', desc: '长篇文献精读 · 学术写作推敲', badge: '长文' },
  { id: 'm-deepseek', name: 'DeepSeek V4 Pro 深度推理', desc: '数学公式推导 · 逻辑严密反思', badge: '推理' },
  { id: 'm-kimi', name: 'Kimi K2.5 中文精读', desc: '256K 上下文 · 中文长文档剖析', badge: '中文' },
  { id: 'm-gemini', name: 'Gemini 3.8 Flash', desc: '1M 上下文 · 附录与图表跨页比对', badge: '超长' },
  { id: 'm-deepseek-flash', name: 'DeepSeek-Flash 极速模式', desc: '极速响应 · 代码与算法细节剖析', badge: '极速' },
];

/* 七段总结的标准 7 色彩条配置（完全对齐用户上传图） */
export const SEVEN_COLORS = [
  '#1e293b', // 一、研究背景: 墨黑/深藏青
  '#e11d48', // 二、核心痛点: 玫瑰红/品红
  '#059669', // 三、创新方法: 翡翠绿
  '#d97706', // 四、实验验证: 暖琥珀橙
  '#2563eb', // 五、论文结论: 宝石蓝
  '#9333ea', // 六、优缺评析: 梦幻紫
  '#0d9488', // 七、科研启发: 薄荷青
];

/* 默认七段式总结（对齐截图范例：Transformer 与微表情前沿） */
export const DEFAULT_SEVEN_SECTIONS = [
  {
    key: '一、研究背景 (Background)',
    text: '机器翻译与序列生成传统依赖 RNN/LSTM/GRU，其本质是顺序时间步计算，难以实现大规模 GPU 矩阵并行。在微表情识别中，亦存在瞬态短时特征时序捕获受限、手工特征难以泛化的底层局限。',
  },
  {
    key: '二、核心痛点 (Problem)',
    text: '长距离依赖衰减严重、信息瓶颈明显、训练时间极度受限且梯度易消失或爆炸；在微动态面部特征上，缺乏肌肉解剖动作单元（AU）的显式约束，导致全局注意力易受刚体运动干扰。',
  },
  {
    key: '三、创新方法 (Method)',
    text: '提出纯自注意力（Self-Attention）与多头注意力（Multi-Head Attention）机制，结合正弦位置编码与残差前馈网络，并在此基础上构建动作单元 AU 拓扑图引导的双向跨层特征注入机制。',
  },
  {
    key: '四、实验验证 (Experiment)',
    text: '在 WMT 2014 英德翻译取得 28.4 BLEU（超越当时所有 Ensemble SOTA），英法翻译取得 41.8 BLEU，仅训练 3.5 天；在 CASME II 与 SAMM 的 LOSO 协议下，UF1 达到 0.829，取得显著 SOTA。',
  },
  {
    key: '五、论文结论 (Conclusion)',
    text: '注意力机制完全足以作为深度神经网络的唯一核心特征提取算子，彻底改写了现代人工智能的底层范式，证明了显式结构化先验与注意力融合在细粒度分析中的不可替代性。',
  },
  {
    key: '六、优缺评析 (Pros & Cons)',
    text: '优点：全局感受野复杂度 O(1)、完全高度并行、可解释性强；局限：全自注意力计算与序列长度呈二次方复杂度 O(N^2)，对无标注微表情微弱动作容易过拟合。',
  },
  {
    key: '七、科研启发 (Takeaways)',
    text: '可探索稀疏注意力（Sparse Attention）、线性注意力与状态空间模型（Mamba）以克服二次方显存开销，并结合自监督对比预训练和扩散模型增广解决科研样本匮乏难题。',
  },
];

/* 默认全文双语精翻数据 */
export const DEFAULT_BILINGUAL_SECTIONS = [
  {
    title: 'Title & Abstract (标题与摘要)',
    en: 'Attention Is All You Need. The dominant sequence transduction models are based on complex recurrent or convolutional neural networks. We propose the Transformer, a model architecture eschewing recurrence and entirely relying on an attention mechanism to draw global dependencies.',
    zh: '注意力就是你所需的一切。当前主流的序列转导模型普遍依赖于复杂的循环或卷积神经网络。我们提出了 Transformer，这是一种彻底摒弃循环连接、完全依赖注意力机制来捕获输入与输出之间全局依赖关系的全新模型架构。',
    terms: [
      { en: 'Sequence Transduction', zh: '序列转导' },
      { en: 'Attention Mechanism', zh: '注意力机制' },
      { en: 'Recurrence', zh: '循环连接' },
    ],
  },
  {
    title: 'Model Architecture (模型核心架构)',
    en: 'The Transformer follows this overall architecture using stacked self-attention and point-wise, fully connected layers for both the encoder and decoder. Multi-Head Attention allows the model to jointly attend to information from different representation subspaces at different positions.',
    zh: 'Transformer 遵循典型的编码器-解码器架构，在编码端和解码端均使用堆叠的自注意力层和按位置全连接层。多头注意力机制（Multi-Head Attention）使模型能够同时关注来自不同位置、不同表示子空间的信息。',
    terms: [
      { en: 'Self-Attention', zh: '自注意力' },
      { en: 'Multi-Head Attention', zh: '多头注意力' },
      { en: 'Representation Subspaces', zh: '表示子空间' },
    ],
  },
  {
    title: 'Experimental Results & Conclusion (实验结论)',
    en: 'On the WMT 2014 English-to-German translation task, the big transformer model establishes a new state-of-the-art BLEU score of 28.4. Attention mechanisms can be extended to multimodal facial behavior and micro-expression recognition tasks effectively.',
    zh: '在 WMT 2014 英德机器翻译基准评测上，大型 Transformer 模型创造了 28.4 的全新 SOTA BLEU 跑分。该注意力机制亦可高度泛化并迁移至多模态人脸行为分析与微表情识别等细粒度视觉任务中。',
    terms: [
      { en: 'State-of-the-art (SOTA)', zh: '当前最高水准' },
      { en: 'BLEU Score', zh: 'BLEU 评测得分' },
      { en: 'Facial Behavior', zh: '面部行为分析' },
    ],
  },
];
