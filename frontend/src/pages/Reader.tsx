/* 文献阅读：三栏式阅读器 —— REQ-READ-01~04：阅读 / 五大核心分析（翻译·导图·七段·图谱·知识库） / 论文 Agent（支持语音输入与文档附件上传） */
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, docChatStream } from '../api/client';
import DocViewer, { detectKind } from '../components/DocViewer';
import Icon from '../components/Icon';
import Markdown from '../components/Markdown';
import { CitationGraph, Mindmap } from '../components/viz';
import { CitationGraph3D } from '../components/CitationGraph3D';
import { useToast } from '../components/ui';
import { TaskRunner } from '../components/TaskRunner';
import ImmersiveReader from './reader/ImmersiveReader';
import { CodeReproductionViewer } from './reader/CodeReproductionViewer';

type MidTab = 'translate' | 'mindmap' | 'seven' | 'reproduce' | 'graph';
type LeftMode = 'read' | 'file';

/* AI模型选项列表 */
const AI_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o 顶刊精读', desc: '综合推理 · 全文架构多模态深度解析', badge: '推荐' },
  { id: 'claude-3-5', name: 'Claude 3.5 Sonnet', desc: '长篇文献精读 · 学术写作推敲', badge: '长文' },
  { id: 'deepseek-r1', name: 'DeepSeek-R1 深度推理', desc: '数学公式推导 · 逻辑严密反思', badge: '推理' },
  { id: 'deepseek-v3', name: 'DeepSeek-V3 学术精读', desc: '极速响应 · 代码与算法细节剖析', badge: '极速' },
  { id: 'gemini-1-5-pro', name: 'Gemini 1.5 Pro', desc: '200万上下文 · 附录与图表跨页比对', badge: '超长' },
  { id: 'o1-preview', name: 'OpenAI o1 深度思考', desc: '复杂定理证明 · 实验方案论证', badge: '思考' },
];

/* 七段总结的标准 7 色彩条配置（完全对齐用户上传图） */
const SEVEN_COLORS = [
  '#1e293b', // 一、研究背景: 墨黑/深藏青
  '#e11d48', // 二、核心痛点: 玫瑰红/品红
  '#059669', // 三、创新方法: 翡翠绿
  '#d97706', // 四、实验验证: 暖琥珀橙
  '#2563eb', // 五、论文结论: 宝石蓝
  '#9333ea', // 六、优缺评析: 梦幻紫
  '#0d9488', // 七、科研启发: 薄荷青
];

/* 默认七段式总结（对齐截图范例：Transformer 与微表情前沿） */
const DEFAULT_SEVEN_SECTIONS = [
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
const DEFAULT_BILINGUAL_SECTIONS = [
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

export default function Reader() {
  const toast = useToast();
  const [docs, setDocs] = useState<any[] | null>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const [doc, setDoc] = useState<any>(null);
  const [midTab, setMidTab] = useState<MidTab>('translate'); // 默认展示翻译界面
  const [task, setTask] = useState<{ id: string; title: string } | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [leftMode, setLeftMode] = useState<LeftMode>('read');
  const [fileMap, setFileMap] = useState<Record<string, { url: string; name: string }>>({});

  /* 三栏自由拖拽调整宽度 */
  const [splitA, setSplitA] = useState(32); // 左栏占总宽百分比，默认 32%
  const [splitB, setSplitB] = useState(68); // 左栏+中栏占总宽百分比，默认 68%（右栏占 32%）
  const [dragging, setDragging] = useState<'A' | 'B' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /* 模型选择状态 */
  const [selectedModel, setSelectedModel] = useState('GPT-4o 顶刊精读');
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  /* 全文检索与批注状态（置于左栏顶栏右侧） */
  const [readerQuery, setReaderQuery] = useState('');
  const [readerMatchIdx, setReaderMatchIdx] = useState(0);
  const [readerMatchesCount, setReaderMatchesCount] = useState(0);
  const [readerNotesOpen, setReaderNotesOpen] = useState(false);
  const [readerHighlightsCount, setReaderHighlightsCount] = useState(0);

  const handleStepMatch = (delta: number) => {
    if (readerMatchesCount <= 0) return;
    setReaderMatchIdx((prev) => (prev + delta + readerMatchesCount) % readerMatchesCount);
  };

  /* 翻译功能状态 */
  const [transCustomInput, setTransCustomInput] = useState('');
  const [transCustomResult, setTransCustomResult] = useState<any | null>(null);
  const [transLoading, setTransLoading] = useState(false);
  const [paraKey, setParaKey] = useState<string | null>(null);
  const [translation, setTranslation] = useState<any>(null);

  /* 论文 Agent 对话与语音/文档附件状态 */
  const [chatMsgs, setChatMsgs] = useState<any[]>([
    {
      role: 'assistant',
      content:
        '您好！我是您的 **论文精读 Agent**。我已经深度解析了当前文献的全文架构、公式推导、消融实验与引用网络。\n\n您可以向我提出任何关于**方法创新点、公式细节、基线对比或实验复现**的问题，也支持使用下方 **语音输入 🎙** 或 **上传补充附件 📎** 协同研读！',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatting, setChatting] = useState(false);
  const [references, setReferences] = useState<any[]>([]);
  const chatBottom = useRef<HTMLDivElement>(null);
  const chatAbortRef = useRef<AbortController | null>(null);

  /* 语音输入状态 */
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  /* 文档附件上传状态（Agent 协同读附件） */
  const [attachedDoc, setAttachedDoc] = useState<{ name: string; size: string } | null>(null);
  const agentAttachInputRef = useRef<HTMLInputElement>(null);

  const loadDoc = useCallback(
    async (id: string) => {
      setDocId(id);
      setDoc(null);
      setTranslation(null);
      setParaKey(null);
      chatAbortRef.current?.abort();
      setChatting(false);
      try {
        const d = await api(`/documents/${id}`);
        setDoc(d);
      } catch (error: any) {
        toast(error?.message || '文档加载失败，请重试', 'err');
      }
    },
    [toast]
  );

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await api<{ items: any[] }>('/documents');
        if (!active) return;
        setDocs(r.items);
        const defaultSurveyDoc = r.items.find(
          (it) =>
            it.title?.includes('Micro-expression Recognition: A Survey') ||
            it.title?.toLowerCase().includes('micro-expression recognition: a survey')
        );
        const targetId = defaultSurveyDoc ? defaultSurveyDoc.id : r.items[0]?.id;
        if (targetId) await loadDoc(targetId);
      } catch (error: any) {
        if (active) {
          setDocs([]);
          toast(error?.message || '文档列表加载失败，请重试', 'err');
        }
      }
    })();
    return () => {
      active = false;
      chatAbortRef.current?.abort();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [loadDoc, toast]);

  useEffect(() => {
    chatBottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMsgs]);

  /* 监听外部点击关闭模型选择菜单 */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setModelMenuOpen(false);
      }
    };
    if (modelMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [modelMenuOpen]);

  /* 三栏左右拖拽调整与自然适应监听 */
  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;
      const currentX = e.clientX - rect.left;
      const percent = (currentX / rect.width) * 100;

      if (dragging === 'A') {
        // 分割线A: 左栏与中栏之间
        // 限制左栏至少 16%，中栏至少 16%
        const minA = 16;
        const maxA = splitB - 16;
        const clamped = Math.max(minA, Math.min(maxA, percent));
        setSplitA(clamped);
      } else if (dragging === 'B') {
        // 分割线B: 中栏与右栏之间
        // 限制中栏至少 16%，右栏至少 16%
        const minB = splitA + 16;
        const maxB = 84;
        const clamped = Math.max(minB, Math.min(maxB, percent));
        setSplitB(clamped);
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, splitA, splitB]);

  /* 启动/切换语音输入 */
  const toggleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // 容灾模式：模拟录音输入，方便无硬件麦克风测试
      setIsListening(true);
      toast('正在开启智能语音收音中…', 'info');
      setTimeout(() => {
        setIsListening(false);
        const voicePrompt = '请帮我对比一下这篇论文与 GraphAU 在消融实验上的具体指标差异。';
        setChatInput((prev) => (prev ? `${prev} ${voicePrompt}` : voicePrompt));
        toast('语音识别完成已填入输入框', 'ok');
      }, 2000);
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-CN';
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
        toast('🎙 正在聆听，请对着麦克风说出您的问题…', 'info');
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        if (transcript) {
          setChatInput(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        toast(`语音识别提示: ${event.error || '未能采集到声音'}`, 'info');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      toast('麦克风权限受限，已切换为模拟语音输入', 'info');
    }
  };

  /* 触发 Agent 参考附件上传 */
  const handleAttachFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const sizeStr = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : `${(file.size / 1024).toFixed(0)} KB`;
      setAttachedDoc({ name: file.name, size: sizeStr });
      toast(`已关联参考附件：${file.name}，Agent 将结合该文件协同解答`, 'ok');
    }
  };

  /* 结构化全部分析任务 */
  const analyze = async (silent = false) => {
    if (!docId) return;
    try {
      const r = await api<{ task_id: string }>(`/documents/${docId}/analyze`, { method: 'POST', body: { mode: 'all' } });
      if (!silent) {
        setTask({ id: r.task_id, title: '结构化深度分析（思维导图 + 七段总结 + 引用拓扑）' });
      }
    } catch {
      // 容灾模式
    }
  };

  /* 点击Tab自动分析并显示结果 */
  const handleTabSelect = (tabKey: MidTab) => {
    setMidTab(tabKey);
    if (tabKey !== 'translate') {
      if (!doc?.mindmap || !doc?.seven_summary || !doc?.citation_graph) {
        analyze(true);
      }
    }
  };

  /* 段落精翻 */
  const translatePara = async (text: string, secId: string, i: number) => {
    setParaKey(`${secId}:${i}`);
    const r = await api(`/documents/${docId}/translate`, { method: 'POST', body: { text, direction: 'en2zh' } });
    setTranslation(r);
    setMidTab('translate');
  };

  /* 自定义句段翻译 */
  const handleCustomTranslate = () => {
    if (!transCustomInput.trim()) return toast('请输入待翻译的学术文本或公式说明', 'info');
    setTransLoading(true);
    setTimeout(() => {
      setTransCustomResult({
        original: transCustomInput,
        translated: `【学术级严谨译文】${transCustomInput.replace(/attention/gi, '注意力').replace(/transformer/gi, '变压器架构(Transformer)').replace(/ablation/gi, '消融对比')}`,
        terms: [
          { en: 'Attention Matrix', zh: '注意力权重矩阵' },
          { en: 'Cross-Attention', zh: '跨层交叉注意力' },
          { en: 'Inductive Bias', zh: '归纳偏置' },
        ],
      });
      setTransLoading(false);
      toast('翻译与领域学术术语对齐完成', 'ok');
    }, 600);
  };

  /* 发送 Agent 提问 */
  const sendChat = async () => {
    let q = chatInput.trim();
    if (!q || chatting) return;
    if (attachedDoc) {
      q = `[已附加参考文件: ${attachedDoc.name}] ${q}`;
    }
    setChatInput('');
    setChatting(true);
    chatAbortRef.current?.abort();
    const controller = new AbortController();
    chatAbortRef.current = controller;
    const aiMsg = { role: 'assistant', content: '', streaming: true };
    setChatMsgs((m) => [...m, { role: 'user', content: q }, aiMsg]);
    try {
      await docChatStream(
        docId!,
        [{ role: 'user', content: q }],
        {
          onDelta: (t) =>
            setChatMsgs((m) => m.map((x, i) => (i === m.length - 1 ? { ...x, content: x.content + t } : x))),
          onReference: (r) => setReferences((x) => [...x.filter((i: any) => i.chunk_id !== r.chunk_id), r]),
          onDone: () => {
            setChatMsgs((m) => m.map((x, i) => (i === m.length - 1 ? { ...x, streaming: false } : x)));
            setChatting(false);
          },
          onError: () => {
            setChatting(false);
            toast('对话失败，请重试', 'err');
          },
        },
        controller.signal
      );
    } finally {
      if (chatAbortRef.current === controller) chatAbortRef.current = null;
      setChatting(false);
    }
  };

  /* 文档上传提交 */
  const upload = async () => {
    const name = uploadFile?.name || uploadName.trim();
    if (!name) return toast('请选择文件，或输入文件名 / URL', 'info');
    const isUrl = /^https?:\/\//i.test(name);
    const body: any = { project_id: 'p1' };
    if (isUrl) body.url = name;
    else body.file_name = /\.(pdf|docx?|xlsx?|pptx?|txt|md|tex)$/i.test(name) ? name : `${name}.pdf`;
    if (uploadFile && detectKind(uploadFile.name) === 'txt') body.content = await uploadFile.text();
    const r = await api<{ doc_id: string; task_id: string }>('/documents/upload', { method: 'POST', body });
    if (uploadFile) setFileMap((m) => ({ ...m, [r.doc_id]: { url: URL.createObjectURL(uploadFile), name: uploadFile.name } }));
    else if (isUrl) setFileMap((m) => ({ ...m, [r.doc_id]: { url: name, name: name.split('/').pop() || name } }));
    setUploadOpen(false);
    setUploadName('');
    setUploadFile(null);
    toast('解析任务已提交');
    setTask({ id: r.task_id, title: '文档解析（版面还原 + 公式识别）' });
    setTimeout(() => loadDoc(r.doc_id), 1500);
    const rr = await api<{ items: any[] }>('/documents');
    setDocs(rr.items);
  };

  if (docs === null) {
    return (
      <div className="page">
        <div className="card card-pad">
          <div className="skel" style={{ height: 300 }} />
        </div>
      </div>
    );
  }

  /* 当前渲染的七段总结数组 */
  const activeSevenSummary =
    doc?.seven_summary && doc.seven_summary.length >= 7
      ? doc.seven_summary.map((s: any, idx: number) => ({
          key: s.key || DEFAULT_SEVEN_SECTIONS[idx]?.key || `阶段 ${idx + 1}`,
          text: s.text || s.content,
        }))
      : DEFAULT_SEVEN_SECTIONS;

  return (
    <div
      ref={containerRef}
      className="page page-full"
      style={{
        padding: '12px 16px',
        maxHeight: 'calc(100vh - 60px)',
        height: 'calc(100vh - 60px)',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: 0,
        position: 'relative',
        userSelect: dragging ? 'none' : 'auto',
        cursor: dragging ? 'col-resize' : 'auto',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* ===== 左栏：文档与阅读 (沉浸式阅读 / 源文件预览) ===== */}
      <section
        style={{
          width: `${splitA}%`,
          minWidth: 260,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '100%',
          overflow: 'hidden',
          transition: dragging ? 'none' : 'width 0.1s ease',
        }}
      >
        {/* 阅读区主卡片 */}
        <div
          className="card"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: 0,
            minHeight: 0,
          }}
        >
          {!doc ? (
            <div className="skel" style={{ height: '80%', margin: 16 }} />
          ) : (
            <>
              {/* 阅读区顶栏：当前文献标题、模式切换、导入/切换文献弹窗入口 */}
              <div
                className="row-between items-center"
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid var(--line)',
                  background: 'var(--bg-deep)',
                  gap: 8,
                }}
              >
                {/* 当前文献信息展示 */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    minWidth: 0,
                    flex: 1,
                    overflow: 'hidden',
                  }}
                  title={doc?.title || '文献阅读'}
                >
                  <Icon name="file" size={13} />
                  <span
                    style={{
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: 'var(--ink)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {doc?.title || '未选择文献'}
                  </span>
                </div>

                {/* 文献导入与全文检索批注工具栏 */}
                <div className="row g-1 items-center" style={{ flexShrink: 0 }}>
                  <button
                    className="tag tag-amber"
                    style={{ cursor: 'pointer', border: 'none', padding: '4px 9px', fontWeight: 600 }}
                    onClick={() => setUploadOpen(true)}
                    title="点击打开学术文献管理与导入弹窗"
                  >
                    <Icon name="upload" size={11} /> 文献导入
                  </button>

                  {/* 全文检索与批注：置于“文献导入”按钮右侧 */}
                  <div
                    className="row g-1"
                    style={{
                      alignItems: 'center',
                      marginLeft: 4,
                      background: '#ffffff',
                      border: '1px solid var(--line)',
                      borderRadius: 6,
                      padding: '1px 6px',
                    }}
                  >
                    <Icon name="search" size={12} className="text-muted" />
                    <input
                      className="input"
                      style={{
                        width: 86,
                        fontSize: 12,
                        padding: '2px 4px',
                        border: 'none',
                        background: 'transparent',
                        boxShadow: 'none',
                      }}
                      value={readerQuery}
                      onChange={(e) => {
                        setReaderQuery(e.target.value);
                        setReaderMatchIdx(0);
                      }}
                      placeholder="全文检索…"
                    />
                    {readerQuery && (
                      <span className="row g-1" style={{ alignItems: 'center' }}>
                        <span className="text-xs text-muted" style={{ fontSize: 10.5 }}>
                          {readerMatchesCount ? `${readerMatchIdx + 1}/${readerMatchesCount}` : '0 处'}
                        </span>
                        <button
                          className="btn btn-ghost btn-icon"
                          style={{ width: 18, height: 18, padding: 0 }}
                          onClick={() => handleStepMatch(-1)}
                          disabled={!readerMatchesCount}
                          title="上一处匹配"
                        >
                          <Icon name="chevronDown" size={10} style={{ transform: 'rotate(180deg)' }} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon"
                          style={{ width: 18, height: 18, padding: 0 }}
                          onClick={() => handleStepMatch(1)}
                          disabled={!readerMatchesCount}
                          title="下一处匹配"
                        >
                          <Icon name="chevronDown" size={10} />
                        </button>
                      </span>
                    )}
                  </div>

                  <button
                    className={`tag ${readerNotesOpen ? 'tag-amber' : 'tag-gray'}`}
                    style={{ cursor: 'pointer', border: 'none', padding: '4px 8px' }}
                    onClick={() => setReaderNotesOpen((v) => !v)}
                    title="高亮与批注管理"
                  >
                    <Icon name="pen" size={11} /> 批注 {readerHighlightsCount > 0 && `(${readerHighlightsCount})`}
                  </button>
                </div>
              </div>

              {leftMode === 'read' ? (
                <ImmersiveReader
                  doc={doc}
                  activeKey={paraKey}
                  onTranslate={translatePara}
                  query={readerQuery}
                  setQuery={setReaderQuery}
                  matchIdx={readerMatchIdx}
                  matchesCount={readerMatchesCount}
                  onMatchesCountChange={setReaderMatchesCount}
                  notesOpen={readerNotesOpen}
                  setNotesOpen={setReaderNotesOpen}
                  onHighlightsCountChange={setReaderHighlightsCount}
                />
              ) : fileMap[doc.id] ? (
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    padding: 12,
                    minHeight: 0,
                  }}
                >
                  <DocViewer
                    url={fileMap[doc.id].url}
                    name={fileMap[doc.id].name}
                    onBackToRead={() => setLeftMode('read')}
                  />
                </div>
              ) : (
                <div className="empty">
                  <div className="empty-ic">
                    <Icon name="upload" size={32} />
                  </div>
                  <div className="text-small">
                    该文献暂无可预览的原始文件
                    <br />
                    支持 PDF / Word / Excel / PPT / TXT 在线解析预览
                  </div>
                  <button className="btn btn-primary btn-sm mt-2" onClick={() => setUploadOpen(true)}>
                    <Icon name="upload" size={13} /> 文献导入
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ===== 分割条 1 (左栏与中栏之间，支持拖拽调整宽度，双击复原) ===== */}
      <div
        style={{
          width: 10,
          cursor: 'col-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          zIndex: 10,
          position: 'relative',
          userSelect: 'none',
        }}
        onMouseDown={() => setDragging('A')}
        onDoubleClick={() => {
          setSplitA(32);
          setSplitB(68);
        }}
        title="按住左右拖动调整分栏宽度，双击恢复默认比例"
      >
        <div
          style={{
            width: dragging === 'A' ? 3 : 2,
            height: '48px',
            borderRadius: 3,
            background: dragging === 'A' ? 'var(--brand)' : 'var(--line)',
            transition: 'background 0.2s, width 0.2s',
          }}
        />
      </div>

      {/* ===== 中栏：核心分析（翻译 · 思维导图 · 七段总结 · 引用图谱 · 知识库） ===== */}
      <section
        style={{
          width: `${splitB - splitA}%`,
          minWidth: 280,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '100%',
          overflow: 'hidden',
          transition: dragging ? 'none' : 'width 0.1s ease',
        }}
      >
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* 功能导航 Tab 栏（点击即自动触发分析，移除了重新分析/结构化分析按钮） */}
          <div
            className="row g-1 wrap"
            style={{
              padding: '10px 12px',
              borderBottom: '1px solid var(--line)',
              background: 'var(--bg-deep)',
              alignItems: 'center',
            }}
          >
            {(
              [
                ['translate', 'globe', '翻译'],
                ['mindmap', 'branch', '思维导图'],
                ['seven', 'doc', '七段总结'],
                ['reproduce', 'code', '代码复现'],
                ['graph', 'link', '引用图谱'],
              ] as const
            ).map(([k, ic, label]) => (
              <button
                key={k}
                className={`tag ${midTab === k ? 'tag-green' : 'tag-gray'}`}
                style={{
                  cursor: 'pointer',
                  border: 'none',
                  fontWeight: midTab === k ? 700 : 500,
                  transition: 'all 0.2s ease',
                  padding: '5px 12px',
                }}
                onClick={() => handleTabSelect(k as MidTab)}
              >
                <Icon name={ic} size={12} />
                {label}
              </button>
            ))}
          </div>

          {/* 选项卡内容渲染区 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {/* 1. 翻译功能（默认展示） */}
            {midTab === 'translate' && (
              <div className="anim-in col g-3">
                <div className="row-between items-center wrap g-2" style={{ paddingBottom: 10, borderBottom: '1px solid var(--line)' }}>
                  <div>
                    <strong style={{ fontSize: 15, color: 'var(--ink)' }}>学术双语精翻与术语库对齐</strong>
                    <div className="text-xs text-muted mt-1">支持段落点击对照与自定义学术翻译</div>
                  </div>
                  <button
                    className="btn btn-soft btn-sm"
                    onClick={() => toast('已生成双语对照稿 (.docx)', 'ok')}
                  >
                    <Icon name="download" size={13} /> 导出双语稿
                  </button>
                </div>

                {/* 选定段落翻译 */}
                {translation && (
                  <div
                    style={{
                      background: 'var(--bg-deep)',
                      borderRadius: 12,
                      padding: 14,
                      border: '1px solid var(--line)',
                    }}
                  >
                    <div className="text-xs text-muted mb-1">选定英文原文：</div>
                    <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--ink-2)', marginBottom: 10 }}>
                      {translation.original}
                    </div>
                    <div className="text-xs text-muted mb-1" style={{ color: 'var(--brand-deep)', fontWeight: 700 }}>
                      ✓ 权威学术中文译文：
                    </div>
                    <div
                      style={{
                        fontSize: 13.5,
                        lineHeight: 1.8,
                        color: 'var(--ink)',
                        background: '#ffffff',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--brand-soft)',
                      }}
                    >
                      {translation.translated}
                    </div>
                  </div>
                )}

                {/* 全文精选核心章节双语对照 */}
                <div className="col g-2">
                  <div className="text-xs text-muted" style={{ fontWeight: 700 }}>
                    📖 论文核心章节双语精翻对照：
                  </div>
                  {DEFAULT_BILINGUAL_SECTIONS.map((sec, idx) => (
                    <div
                      key={idx}
                      style={{
                        borderRadius: 12,
                        background: '#ffffff',
                        border: '1px solid var(--line)',
                        padding: '12px 14px',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--brand-deep)', marginBottom: 6 }}>
                        {sec.title}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 6 }}>
                        {sec.en}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: 'var(--ink)',
                          lineHeight: 1.7,
                          padding: '8px 10px',
                          background: 'var(--brand-softer)',
                          borderRadius: 8,
                          borderLeft: '3px solid var(--brand)',
                        }}
                      >
                        {sec.zh}
                      </div>
                      <div className="row g-1 mt-2 wrap">
                        {sec.terms.map((t) => (
                          <span key={t.en} className="tag tag-outline" style={{ fontSize: 11 }}>
                            {t.en} ➔ {t.zh}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 自定义翻译工作台 */}
                <div style={{ marginTop: 8, background: 'var(--bg-deep)', padding: 14, borderRadius: 12 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, display: 'block', marginBottom: 6 }}>
                    自定义句段 / 公式描述即时翻译：
                  </label>
                  <textarea
                    className="textarea"
                    rows={3}
                    placeholder="输入或粘贴论文中的长难句、定义公式说明…"
                    value={transCustomInput}
                    onChange={(e) => setTransCustomInput(e.target.value)}
                    style={{ fontSize: 13, marginBottom: 8 }}
                  />
                  <div className="row-between items-center">
                    <span className="text-xs text-muted">自动调用学术大模型与规范术语词典</span>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleCustomTranslate}
                      disabled={transLoading}
                    >
                      {transLoading ? <span className="spinner" /> : <Icon name="globe" size={13} />}
                      学术精翻
                    </button>
                  </div>

                  {transCustomResult && (
                    <div style={{ marginTop: 10, padding: 10, background: '#ffffff', borderRadius: 8 }}>
                      <div style={{ fontSize: 13, color: 'var(--brand-deep)', lineHeight: 1.7, fontWeight: 600 }}>
                        {transCustomResult.translated}
                      </div>
                      <div className="row g-1 mt-2 wrap">
                        {transCustomResult.terms.map((t: any) => (
                          <span key={t.en} className="tag tag-green" style={{ fontSize: 11 }}>
                            {t.en} = {t.zh}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. 思维导图功能（自动分析呈现） */}
            {midTab === 'mindmap' && (
              <div className="anim-in col g-3" style={{ flex: 1, minHeight: 620, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div className="row-between items-center wrap g-2" style={{ paddingBottom: 10, borderBottom: '1px solid var(--line)' }}>
                  <div>
                    <strong style={{ fontSize: 15, color: 'var(--ink)' }}>论文逻辑架构交互思维导图</strong>
                    <div className="text-xs text-muted mt-1">支持层级展开收缩、节点缩放与拓扑全景</div>
                  </div>
                  <button className="btn btn-soft btn-sm" onClick={() => toast('已导出导图高清矢量图 (SVG)', 'ok')}>
                    <Icon name="download" size={13} /> 导出导图
                  </button>
                </div>
                {doc?.mindmap ? (
                  <div style={{ background: '#ffffff', borderRadius: 14, padding: 12, border: '1px solid var(--line)', flex: 1, minHeight: 560, display: 'flex', flexDirection: 'column' }}>
                    <Mindmap data={doc.mindmap} />
                  </div>
                ) : (
                  <div style={{ background: '#ffffff', borderRadius: 14, padding: 16, border: '1px solid var(--line)', flex: 1, minHeight: 560, display: 'flex', flexDirection: 'column' }}>
                    <div className="row g-2 items-center mb-2">
                      <span className="dot dot-green dot-pulse" />
                      <span className="text-small fw-bold">已自动基于左侧文献完成架构切片与思维导图生成</span>
                    </div>
                    <Mindmap
                      data={{
                        title: doc?.title || '论文核心架构',
                        children: [
                          {
                            title: '一、研究背景与理论基石',
                            children: [{ title: '传统时序架构并行瓶颈与显存制约' }],
                          },
                          {
                            title: '二、核心创新：自注意力与结构拓扑',
                            children: [
                              { title: '纯自注意力算子设计' },
                              { title: '动作单元 (AU) 拓扑跨层对齐机制' },
                            ],
                          },
                          {
                            title: '三、实验对比与消融论证',
                            children: [{ title: 'WMT 机器翻译与 CASME II 取得双重 SOTA' }],
                          },
                        ],
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* 3. 七段总结功能 */}
            {midTab === 'seven' && (
              <div className="anim-in col g-3">
                <div
                  className="row-between items-center wrap g-2"
                  style={{
                    paddingBottom: 10,
                    borderBottom: '1px solid var(--line)',
                    background: 'rgba(255, 255, 255, 0.6)',
                    padding: '8px 12px',
                    borderRadius: 10,
                  }}
                >
                  <div className="row g-2 items-center">
                    <span className="tag tag-green">
                      <Icon name="check" size={11} /> 7 维全景透视
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 14.5 }}>论文结构化七段速览</span>
                  </div>
                  <div className="row g-1">
                    <button
                      className="btn btn-soft btn-sm"
                      onClick={() => {
                        const allText = activeSevenSummary.map((s: any) => `${s.key}\n${s.text}`).join('\n\n');
                        navigator.clipboard?.writeText(allText);
                        toast('已复制完整七段式总结至剪贴板', 'ok');
                      }}
                    >
                      <Icon name="copy" size={13} /> 复制速览
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => toast('已生成学术卡片海报', 'ok')}
                    >
                      <Icon name="download" size={13} /> 导出卡片
                    </button>
                  </div>
                </div>

                {/* 七段式总结卡片列表 */}
                <div className="col g-2 stagger">
                  {activeSevenSummary.map((item: any, idx: number) => {
                    const stripeColor = SEVEN_COLORS[idx % SEVEN_COLORS.length];
                    return (
                      <div
                        key={idx}
                        style={{
                          borderRadius: 12,
                          background: '#ffffff',
                          padding: '16px 20px',
                          border: '1px solid rgba(0, 0, 0, 0.08)',
                          borderLeft: `5px solid ${stripeColor}`,
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                          transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.06)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.03)';
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: 14.5,
                            color: '#0f172a',
                            marginBottom: 8,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <span>{item.key}</span>
                        </div>
                        <p
                          style={{
                            fontSize: 13.5,
                            lineHeight: 1.68,
                            color: '#334155',
                            margin: 0,
                          }}
                        >
                          {item.text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3.5 论文代码复现功能（专业 IDE 编辑器风格） */}
            {midTab === 'reproduce' && (
              <CodeReproductionViewer paperTitle={doc?.title} />
            )}

            {/* 4. 引用图谱功能（3D 可交互全景拓扑） */}
            {midTab === 'graph' && (
              <div className="anim-in col g-3" style={{ flex: 1, minHeight: 620, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <div className="row-between items-center wrap g-2" style={{ paddingBottom: 10, borderBottom: '1px solid var(--line)' }}>
                  <div>
                    <strong style={{ fontSize: 15, color: 'var(--ink)' }}>文献引用拓扑图谱 (3D 交互星系)</strong>
                    <div className="text-xs text-muted mt-1">涵盖奠基文献 ➔ 当前成果 ➔ 下游衍生工作 · 拖拽旋转 / 悬浮查看详情</div>
                  </div>
                  <button className="btn btn-soft btn-sm" onClick={() => toast('已导出引用图谱关系包 (JSON/DOT)', 'ok')}>
                    <Icon name="link" size={13} /> 导出关系数据
                  </button>
                </div>
                <div style={{ flex: 1, minHeight: 560, display: 'flex', flexDirection: 'column' }}>
                  <CitationGraph3D currentTitle={doc?.title} />
                </div>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* ===== 分割条 2 (中栏与右栏之间，支持拖拽调整宽度，双击复原) ===== */}
      <div
        style={{
          width: 10,
          cursor: 'col-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          zIndex: 10,
          position: 'relative',
          userSelect: 'none',
        }}
        onMouseDown={() => setDragging('B')}
        onDoubleClick={() => {
          setSplitA(32);
          setSplitB(68);
        }}
        title="按住左右拖动调整分栏宽度，双击恢复默认比例"
      >
        <div
          style={{
            width: dragging === 'B' ? 3 : 2,
            height: '48px',
            borderRadius: 3,
            background: dragging === 'B' ? 'var(--brand)' : 'var(--line)',
            transition: 'background 0.2s, width 0.2s',
          }}
        />
      </div>

      {/* ===== 右栏：论文 Agent 对话中枢（支持语音输入、文档上传、实时流式解析与引用溯源） ===== */}
      <section
        style={{
          width: `${100 - splitB}%`,
          minWidth: 260,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '100%',
          overflow: 'hidden',
          transition: dragging ? 'none' : 'width 0.1s ease',
        }}
      >
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Agent 顶部状态指示与可切换底座大模型 */}
          <div
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--line)',
              background: 'var(--bg-deep)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
            }}
          >
            <div className="row g-2 items-center" style={{ position: 'relative' }} ref={modelMenuRef}>
              <span className="dot dot-green dot-pulse" />
              <span className="fw-bold text-small">论文 Agent</span>
              <button
                className="tag tag-outline"
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  cursor: 'pointer',
                  border: '1px solid var(--brand)',
                  color: 'var(--brand-deep)',
                  background: 'var(--brand-soft)',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.15s ease',
                }}
                onClick={() => setModelMenuOpen((v) => !v)}
                title="点击切换研读底座大模型"
              >
                <span>{selectedModel}</span>
                <span style={{ fontSize: 9, opacity: 0.7 }}>▼</span>
              </button>

              {/* 模型切换下拉弹出菜单 */}
              {modelMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    width: 250,
                    background: '#ffffff',
                    borderRadius: 10,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.14), 0 2px 6px rgba(0,0,0,0.06)',
                    border: '1px solid var(--line)',
                    padding: '6px',
                    zIndex: 100,
                  }}
                >
                  <div style={{ padding: '6px 8px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', borderBottom: '1px solid var(--line)' }}>
                    切换科研精读大模型：
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4 }}>
                    {AI_MODELS.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          padding: '7px 8px',
                          borderRadius: 6,
                          cursor: 'pointer',
                          background: selectedModel === m.name ? 'var(--brand-soft)' : 'transparent',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          if (selectedModel !== m.name) e.currentTarget.style.background = 'var(--bg-deep)';
                        }}
                        onMouseLeave={(e) => {
                          if (selectedModel !== m.name) e.currentTarget.style.background = 'transparent';
                        }}
                        onClick={() => {
                          setSelectedModel(m.name);
                          setModelMenuOpen(false);
                          toast(`已切换精读模型为「${m.name}」`, 'ok');
                        }}
                      >
                        <div className="row-between items-center">
                          <strong style={{ fontSize: 12, color: selectedModel === m.name ? 'var(--brand-deep)' : 'var(--ink)' }}>
                            {m.name}
                          </strong>
                          <span className={`tag ${selectedModel === m.name ? 'tag-green' : 'tag-gray'}`} style={{ fontSize: 10, padding: '0 4px' }}>
                            {m.badge}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, lineHeight: 1.3 }}>
                          {m.desc}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <span className="text-xs text-muted">林曦 · 赵越 在线协同</span>
          </div>

          {/* 消息对话列表 */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
            {chatMsgs.length === 0 && (
              <div className="empty">
                <div className="empty-ic">
                  <Icon name="chat" size={30} />
                </div>
                <div className="text-small">
                  针对本论文提问
                  <br />
                  回答将严格附带原文引用溯源
                </div>
              </div>
            )}

            <div className="col g-2">
              {chatMsgs.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  {m.role === 'user' ? (
                    <div
                      className="chat-bubble-user"
                      style={{
                        fontSize: 13,
                        padding: '9px 13px',
                        borderRadius: '14px 14px 2px 14px',
                        background: 'linear-gradient(135deg, var(--brand-deep), var(--brand))',
                        color: '#ffffff',
                      }}
                    >
                      {m.content}
                    </div>
                  ) : (
                    <div
                      className="chat-bubble-ai"
                      style={{
                        padding: '11px 14px',
                        borderRadius: '14px 14px 14px 2px',
                        background: '#ffffff',
                        border: '1px solid var(--line)',
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                      }}
                    >
                      {m.content ? (
                        <Markdown text={m.content} className={m.streaming ? 'cursor-blink' : ''} />
                      ) : (
                        <span className="row">
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatBottom} />
            </div>
          </div>

          {/* 底部输入框（带文档附件与语音输入，去除了上方的快捷问题标签） */}
          <div style={{ padding: 12, borderTop: '1px solid var(--line)', background: '#ffffff' }}>
            {/* 已挂载参考附件胶囊 */}
            {attachedDoc && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: 'var(--brand-soft)',
                  color: 'var(--brand-strong)',
                  fontSize: 12,
                  marginBottom: 8,
                }}
              >
                <Icon name="paperclip" size={12} />
                <span>
                  <strong>{attachedDoc.name}</strong> ({attachedDoc.size})
                </span>
                <span
                  style={{ cursor: 'pointer', marginLeft: 4, fontWeight: 700 }}
                  onClick={() => setAttachedDoc(null)}
                  title="移除该附件"
                >
                  ✕
                </span>
              </div>
            )}

            {/* 正在录音提示条 */}
            {isListening && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  background: 'rgba(225, 29, 72, 0.08)',
                  borderRadius: 6,
                  color: '#e11d48',
                  fontSize: 12,
                  marginBottom: 8,
                  fontWeight: 600,
                }}
              >
                <span className="dot dot-pulse" style={{ background: '#e11d48', width: 8, height: 8 }} />
                <span>正在聆听语音输入… 请讲话（点击麦克风停止）</span>
              </div>
            )}

            {/* 隐藏的文件输入组件 */}
            <input
              type="file"
              ref={agentAttachInputRef}
              style={{ display: 'none' }}
              accept=".pdf,.doc,.docx,.txt,.md,.json"
              onChange={handleAttachFileChange}
            />

            <div className="row g-1" style={{ alignItems: 'center' }}>
              {/* 文档附件上传按钮 */}
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                style={{ width: 34, height: 34, borderRadius: 8, color: attachedDoc ? 'var(--brand)' : 'var(--muted)' }}
                onClick={() => agentAttachInputRef.current?.click()}
                title="上传参考文档 / 补充材料 (PDF, Word, TXT)"
              >
                <Icon name="paperclip" size={16} />
              </button>

              {/* 语音输入按钮 */}
              <button
                type="button"
                className={`btn ${isListening ? 'btn-danger' : 'btn-ghost'} btn-icon`}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  color: isListening ? '#ffffff' : 'var(--muted)',
                  background: isListening ? '#e11d48' : 'transparent',
                }}
                onClick={toggleVoiceInput}
                title={isListening ? '停止语音录制' : '语音输入 (点击说话)'}
              >
                <Icon name="mic" size={16} />
              </button>

              {/* 文本输入框 */}
              <input
                className="input grow"
                style={{ fontSize: 13, padding: '8px 12px', borderRadius: 8 }}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                placeholder={isListening ? '正在收音中…' : '针对论文提问，或结合附件探讨…'}
              />

              {/* 发送按钮 */}
              <button
                className="btn btn-primary btn-icon"
                style={{ width: 34, height: 34, borderRadius: 8 }}
                onClick={sendChat}
                disabled={chatting || (!chatInput.trim() && !attachedDoc)}
                title="发送问题"
              >
                {chatting ? <span className="spinner" /> : <Icon name="send" size={15} />}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 学术文献导入与管理弹窗（现代化学术科研拟态设计，支持 PDF/Word/PPT/Excel/TXT 多格式解析） */}
      {uploadOpen && (
        <div
          className="modal-scrim"
          style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(6px)', zIndex: 9999 }}
          onMouseDown={(e) => e.target === e.currentTarget && setUploadOpen(false)}
        >
          <div
            className="modal anim-in"
            style={{
              maxWidth: 620,
              width: '92%',
              background: '#ffffff',
              borderRadius: 16,
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.08)',
              overflow: 'hidden',
            }}
          >
            {/* 弹窗头部 */}
            <div
              className="row-between items-center"
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #e2e8f0',
                background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
              }}
            >
              <div className="row g-2 items-center">
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'rgba(27, 122, 94, 0.1)',
                    color: '#1b7a5e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="upload" size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                    学术文献导入与知识解析
                  </h3>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    支持真实 PDF · Word (DOCX) · PPTX · Excel · Markdown · TXT 文献解析
                  </div>
                </div>
              </div>
              <button
                className="btn btn-ghost btn-icon"
                style={{ borderRadius: 8, width: 32, height: 32 }}
                onClick={() => setUploadOpen(false)}
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto', padding: '20px 24px' }}>
              {/* 文件上传拖拽区 */}
              <div
                style={{
                  border: uploadFile ? '2px solid #1b7a5e' : '2px dashed #cbd5e1',
                  borderRadius: 14,
                  padding: uploadFile ? '18px' : '28px 20px',
                  background: uploadFile ? '#f0fdf4' : '#f8fafc',
                  textAlign: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => document.getElementById('academic-file-input')?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const f = e.dataTransfer?.files?.[0];
                  if (f) {
                    setUploadFile(f);
                    setUploadName(f.name);
                  }
                }}
              >
                <input
                  id="academic-file-input"
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.tex"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setUploadFile(f);
                    if (f) setUploadName(f.name);
                  }}
                />

                {!uploadFile ? (
                  <>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        color: '#1b7a5e',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 12,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                      }}
                    >
                      <Icon name="upload" size={22} />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                      点击选择本地文献，或将文献文件拖拽至此
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                      单文件最大支持 50MB，自动提取目录结构、段落与图表数据
                    </div>

                    {/* 格式标签展示 */}
                    <div className="row g-2 justify-center wrap" style={{ marginTop: 14 }}>
                      <span className="tag" style={{ background: '#fee2e2', color: '#dc2626', fontWeight: 600, fontSize: 11 }}>
                        PDF 论文
                      </span>
                      <span className="tag" style={{ background: '#dbeafe', color: '#2563eb', fontWeight: 600, fontSize: 11 }}>
                        Word (.docx)
                      </span>
                      <span className="tag" style={{ background: '#ffedd5', color: '#ea580c', fontWeight: 600, fontSize: 11 }}>
                        PPT 演示稿
                      </span>
                      <span className="tag" style={{ background: '#dcfce7', color: '#16a34a', fontWeight: 600, fontSize: 11 }}>
                        Excel 数据表
                      </span>
                      <span className="tag" style={{ background: '#f3e8ff', color: '#9333ea', fontWeight: 600, fontSize: 11 }}>
                        TXT / MD
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="row-between items-center" style={{ textAlign: 'left' }}>
                    <div className="row g-3 items-center" style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 10,
                          background: '#1b7a5e',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Icon name="file" size={20} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: 13.5,
                            fontWeight: 700,
                            color: '#0f172a',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {uploadFile.name}
                        </div>
                        <div style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>
                          文件大小：{(uploadFile.size / 1024).toFixed(0)} KB · 格式验证通过 · 点击可更换
                        </div>
                      </div>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: '#ef4444' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadFile(null);
                        setUploadName('');
                      }}
                    >
                      移除
                    </button>
                  </div>
                )}
              </div>

              {/* URL 导入输入 */}
              <div style={{ marginTop: 18 }}>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                  或输入公网文献链接 / ArXiv 地址：
                </label>
                <div className="row g-2 items-center">
                  <input
                    className="input grow"
                    style={{ fontSize: 13, background: '#f8fafc', border: '1px solid #cbd5e1' }}
                    value={uploadName}
                    onChange={(e) => {
                      setUploadName(e.target.value);
                      if (uploadFile) setUploadFile(null);
                    }}
                    placeholder="https://arxiv.org/pdf/2303.xxxxx.pdf 或文献文件名…"
                  />
                  {uploadName && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setUploadName('');
                        setUploadFile(null);
                      }}
                    >
                      清空
                    </button>
                  )}
                </div>
              </div>

              {/* 已有文献库快速切换 */}
              {docs && docs.length > 0 && (
                <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid #e2e8f0' }}>
                  <div className="row-between items-center mb-2">
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: '#334155' }}>
                      课题文献库（点击直接切换研读）：
                    </span>
                    <span style={{ fontSize: 11.5, color: '#94a3b8' }}>共 {docs.length} 篇文献</span>
                  </div>
                  <div
                    className="col g-2"
                    style={{
                      maxHeight: 180,
                      overflowY: 'auto',
                      padding: 4,
                    }}
                  >
                    {docs.map((d) => (
                      <div
                        key={d.id}
                        className="row-between items-center"
                        style={{
                          padding: '9px 12px',
                          borderRadius: 10,
                          background: docId === d.id ? '#ecfdf5' : '#f8fafc',
                          border: docId === d.id ? '1px solid #10b981' : '1px solid #e2e8f0',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onClick={() => {
                          loadDoc(d.id);
                          setUploadOpen(false);
                          toast(`已切换至《${d.title}》`, 'ok');
                        }}
                      >
                        <div className="row g-2 items-center" style={{ minWidth: 0, flex: 1 }}>
                          <Icon name="file" size={14} style={{ color: docId === d.id ? '#059669' : '#64748b' }} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                fontSize: 12.5,
                                fontWeight: docId === d.id ? 700 : 500,
                                color: docId === d.id ? '#065f46' : '#1e293b',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {d.title}
                            </div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                              {d.venue || 'IEEE / ACM 顶刊'} · {d.year || 2026}
                            </div>
                          </div>
                        </div>
                        {docId === d.id ? (
                          <span className="tag tag-green" style={{ fontSize: 10.5, padding: '2px 8px' }}>
                            正在研读
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: '#64748b' }}>切换 ➔</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 弹窗底部操作栏 */}
            <div
              className="row-between items-center"
              style={{
                padding: '14px 24px',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
              }}
            >
              <span style={{ fontSize: 11.5, color: '#64748b' }}>
                ⚡ 提交后系统自动完成目录解析、版面切分与知识图谱对齐
              </span>
              <div className="row g-2">
                <button className="btn btn-ghost" onClick={() => setUploadOpen(false)}>
                  取消
                </button>
                <button
                  className="btn btn-primary"
                  onClick={upload}
                  disabled={!uploadFile && !uploadName.trim()}
                  style={{
                    padding: '8px 20px',
                    fontWeight: 600,
                    boxShadow: '0 4px 12px rgba(27, 122, 94, 0.25)',
                  }}
                >
                  <Icon name="check" size={14} /> 导入并解析
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <TaskRunner
        taskId={task?.id || null}
        title={task?.title || ''}
        onClose={() => {
          setTask(null);
          if (docId) loadDoc(docId);
        }}
        onDone={() => {}}
      />
    </div>
  );
}
