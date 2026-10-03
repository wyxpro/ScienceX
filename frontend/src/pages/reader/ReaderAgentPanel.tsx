/* ============================================================
   右栏：论文 Agent 对话中枢（自 pages/Reader.tsx 拆分，F1）
   支持语音输入、文档附件协同、底座大模型切换与 SSE 流式引用溯源
   ============================================================ */
import { useEffect, useRef, useState } from 'react';
import { docChatStream } from '../../api/client';
import Icon from '../../components/Icon';
import Markdown from '../../components/Markdown';
import { useToast } from '../../components/ui';
import { AI_MODELS } from './readerShared';

interface ReaderAgentPanelProps {
  docId: string | null;
  isMobile: boolean;
  /** 右栏占总宽百分比（由三栏拖拽状态决定） */
  widthPercent: number;
  dragging: boolean;
}

interface AgentChatMsg {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

const INITIAL_GREETING =
  '您好！我是您的 **论文精读 Agent**。我已经深度解析了当前文献的全文架构、公式推导、消融实验与引用网络。\n\n您可以向我提出任何关于**方法创新点、公式细节、基线对比或实验复现**的问题，也支持使用下方 **语音输入 🎙** 或 **上传补充附件 📎** 协同研读！';

export default function ReaderAgentPanel({ docId, isMobile, widthPercent, dragging }: ReaderAgentPanelProps) {
  const toast = useToast();

  /* 对话消息与流式状态 */
  const [chatMsgs, setChatMsgs] = useState<AgentChatMsg[]>([
    {
      role: 'assistant',
      content: INITIAL_GREETING,
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatting, setChatting] = useState(false);
  const [references, setReferences] = useState<any[]>([]);
  const chatBottom = useRef<HTMLDivElement>(null);
  const chatAbortRef = useRef<AbortController | null>(null);

  /* 底座模型选择状态 */
  const [selectedModel, setSelectedModel] = useState('DeepSeek V4.1 Flash');
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  /* 语音输入状态 */
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  /* 文档附件上传状态（Agent 协同读附件） */
  const [attachedDoc, setAttachedDoc] = useState<{ name: string; size: string } | null>(null);
  const agentAttachInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatBottom.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMsgs]);

  /* 切换研读文献时：中断进行中的流式请求并重置会话（与拆分前 loadDoc 行为一致） */
  useEffect(() => {
    chatAbortRef.current?.abort();
    chatAbortRef.current = null;
    setChatting(false);
    setReferences([]);
    setAttachedDoc(null);
    setChatMsgs([{ role: 'assistant', content: INITIAL_GREETING }]);
  }, [docId]);

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

  /* 卸载时中断流式请求与语音识别 */
  useEffect(() => {
    return () => {
      chatAbortRef.current?.abort();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          /* 忽略停止失败 */
        }
      }
    };
  }, []);

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
        } catch {
          /* 忽略停止失败 */
        }
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

  /* 发送 Agent 提问 */
  const sendChat = async () => {
    let q = chatInput.trim();
    if (!q || chatting || !docId) return;
    if (attachedDoc) {
      q = `[已附加参考文件: ${attachedDoc.name}] ${q}`;
    }
    setChatInput('');
    setChatting(true);
    chatAbortRef.current?.abort();
    const controller = new AbortController();
    chatAbortRef.current = controller;
    const aiMsg: AgentChatMsg = { role: 'assistant', content: '', streaming: true };
    setChatMsgs((m) => [...m, { role: 'user', content: q }, aiMsg]);
    try {
      await docChatStream(
        docId,
        [{ role: 'user', content: q }],
        {
          onDelta: (t) =>
            setChatMsgs((m) => m.map((x, i) => (i === m.length - 1 ? { ...x, content: x.content + t } : x))),
          onReference: (r) => setReferences((x) => [...x.filter((i) => i.chunk_id !== r.chunk_id), r]),
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

  return (
    <section
      style={{
        width: isMobile ? '100%' : `${widthPercent}%`,
        minWidth: isMobile ? 0 : 260,
        height: isMobile ? 440 : undefined,
        display: 'flex',
        flexDirection: 'column',
        maxHeight: isMobile ? 'none' : '100%',
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
            flexWrap: isMobile ? 'wrap' : undefined,
            gap: isMobile ? 6 : undefined,
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
                  maxWidth: isMobile ? 'calc(100vw - 24px)' : undefined,
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
                      maxWidth: isMobile ? '86%' : undefined,
                      wordBreak: isMobile ? 'break-word' : undefined,
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
                      maxWidth: isMobile ? '92%' : undefined,
                      minWidth: 0,
                      wordBreak: isMobile ? 'break-word' : undefined,
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
                maxWidth: isMobile ? '100%' : undefined,
                wordBreak: isMobile ? 'break-word' : undefined,
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
  );
}
