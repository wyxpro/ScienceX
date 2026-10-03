/* 论文复现 —— 特色功能：选定开源论文 → 五阶段复现流水线 → 指标比对报告 */
import { useEffect, useRef, useState } from 'react';
import Icon from '../components/Icon';
import { Empty, Progress, Tag, useToast } from '../components/ui';

/* ---------- 数据定义 ---------- */
interface Candidate {
  id: string;
  title: string;
  authors: string;
  venue: string;
  year: number;
  codeUrl: string;
  stars: string;
  framework: string;
  gpu: string;
  dataset: string;
  difficulty: '低' | '中' | '高';
  estHours: number;
  tags: string[];
  abstract: string;
  phases: { name: string; desc: string; logs: string[] }[];
  metrics: { metric: string; paper: number; repro: number; tol: number }[];
}

const PHASE_META = [
  { icon: 'file', color: 'var(--brand)' },
  { icon: 'cpu', color: 'var(--accent)' },
  { icon: 'db', color: 'var(--gold)' },
  { icon: 'flask', color: 'var(--blue-safe)' },
  { icon: 'chart', color: 'var(--brand-strong)' },
] as const;

const CANDIDATES: Candidate[] = [
  {
    id: 'auformer',
    title: 'AU-aware Transformer with Optical Flow Guidance for Micro-expression Recognition',
    authors: 'Wang X., Zhang Q., et al.',
    venue: 'ACM MM', year: 2024,
    codeUrl: 'github.com/mer-lab/AUFormer', stars: '1.2k',
    framework: 'PyTorch 2.1 + TIMM', gpu: '1× RTX 4090 (24G)', dataset: 'CASME II / SMIC / SAMM',
    difficulty: '中', estHours: 8,
    tags: ['Transformer', 'AU 先验', '光流引导', 'LOSO 协议'],
    abstract: '将 OpenFace AU 强度图作为结构先验编入视觉注意力，并以 RAFT 光流引导时序建模，在三大数据集 LOSO 协议下取得 SOTA。',
    phases: [
      { name: '代码解析', desc: '克隆仓库 · 解析依赖与模块结构', logs: ['git clone https://github.com/mer-lab/AUFormer', '识别入口 train.py / eval.py（argparse 超参 27 项）', '模块图：ViT-B 骨干 → AUGraphEncoder → FlowGuidedTemporalAttn', '发现 requirements.txt 中 timm==0.5.4 与本地 CUDA 12 不兼容'] },
      { name: '环境构建', desc: '依赖锁定 · 容器化镜像 · 冒烟测试', logs: ['conda create -n auformer python=3.9', '升级 timm==0.9.2，补丁适配 deprecated API 2 处', 'docker build 完成，镜像 8.4GB', '冒烟测试：单 batch 前向通过，显存峰值 14.2GB'] },
      { name: '数据准备', desc: '数据集下载 · 预处理对齐 · LOSO 切分', logs: ['下载 CASME II（247 样本 / 10 被试）与 SMIC（166 样本）', '30fps → 128×128 裁剪对齐（论文附录 A 协议）', 'RAFT 光流预计算完成（耗时 22 分钟）', 'LOSO 切分与官方 split 文件逐折校验一致'] },
      { name: '基线对齐', desc: '超参对齐 · 随机种子固定 · 训练监控', logs: ['固定 3 随机种子 {42, 123, 2024}（论文要求均值±方差）', 'lr=1e-4, cosine, 80 epochs, batch=8', 'Epoch 40/80：验证 UF1 收敛至 0.77 附近', '训练完成，总耗时 6h52m，检查点已归档'] },
      { name: '结果比对', desc: '指标复算 · 论文数值对照 · 差异归因', logs: ['CASME II UF1 = 0.779 ± 0.004（论文 0.782）', 'gap -0.003，处于 3 种子波动范围内 → 判定复现成功', 'SAMM 略低 0.9 点：归因于官方 SAMM 修订版标注差异', '比对报告与日志已保存至项目资产库'] },
    ],
    metrics: [
      { metric: 'CASME II · UF1', paper: 0.782, repro: 0.779, tol: 0.005 },
      { metric: 'CASME II · UAR', paper: 0.769, repro: 0.766, tol: 0.005 },
      { metric: 'SMIC · UF1', paper: 0.512, repro: 0.508, tol: 0.006 },
      { metric: 'SAMM · UF1', paper: 0.715, repro: 0.706, tol: 0.005 },
    ],
  },
  {
    id: 'megen',
    title: 'Diffusion-based Micro-expression Data Synthesis for Class Imbalance',
    authors: 'Chen L., et al.',
    venue: 'CVPR', year: 2025,
    codeUrl: 'github.com/diff-me/MEGen', stars: '486',
    framework: 'PyTorch 2.2 + Diffusers', gpu: '2× A100 (40G)', dataset: 'CASME II（增广后 ×3）',
    difficulty: '高', estHours: 20,
    tags: ['扩散模型', '数据增广', '类别不均衡'],
    abstract: '以条件扩散模型合成稀有类别微表情样本（onset-apex-offset 三段时序），缓解类别不均衡，报告 UF1 相对提升 +4.2。',
    phases: [
      { name: '代码解析', desc: '克隆仓库 · 解析训练/采样双管线', logs: ['git clone https://github.com/diff-me/MEGen', '管线：UNet 条件去噪 + 光流伪运动向量注入', '预训练权重 2.1GB（HF 镜像拉取）', '采样脚本需 2 卡 DDP，单卡需修改 grad_ckpt 开关'] },
      { name: '环境构建', desc: 'xFormers 加速 · 显存优化适配', logs: ['安装 xformers==0.0.25 启用 memory-efficient attention', '单卡模式启用 gradient checkpointing，显存 38GB → 21GB', '镜像构建完成并冒烟通过'] },
      { name: '数据准备', desc: '稀有类筛选 · 潜变量编码缓存', logs: ['按 CASME II 标签分布筛出 rarity ≤ 12 样本的 3 类', 'VAE 潜空间编码缓存 4.6GB', '条件文本嵌入（AU 描述）预计算完成'] },
      { name: '基线对齐', desc: '复现增广倍率 ×3 · 下游分类器同参', logs: ['合成 3× 样本（每类 120 帧序列），FID = 31.2 符合论文区间', '下游分类器与论文共用 up9 baseline 配置', '3 种子训练完成（单次 1h40m）'] },
      { name: '结果比对', desc: '增广增益对照 · 显著性检验', logs: ['UF1 0.646 → 0.688（+4.2，论文 +4.2）', 'paired t-test p=0.013 < 0.05，增益显著', '复现成功；稀有类 Recall 提升与论文表格逐行一致'] },
    ],
    metrics: [
      { metric: 'UF1（基线）', paper: 0.646, repro: 0.646, tol: 0.004 },
      { metric: 'UF1（增广后）', paper: 0.688, repro: 0.688, tol: 0.004 },
      { metric: '合成数据 FID', paper: 30.8, repro: 31.2, tol: 1.5 },
      { metric: '稀有类 Recall', paper: 0.583, repro: 0.579, tol: 0.01 },
    ],
  },
  {
    id: 'graphau',
    title: 'GraphAU: Semantic-augmented Graph Learning for AU Detection',
    authors: 'Zhou T., et al.',
    venue: 'CVPR', year: 2024,
    codeUrl: 'github.com/hrzeng/GraphAU', stars: '754',
    framework: 'PyTorch 1.13 + GAT', gpu: '1× RTX 3090 (24G)', dataset: 'BP4D / DISFEA',
    difficulty: '低', estHours: 5,
    tags: ['图神经网络', 'AU 检测', '即插即用'],
    abstract: '以语义先验构建 AU 关系图并做 GAT 消息传递，作为轻量 AU 检测头可即插即用于下游识别管线，BP4D F1 = 0.741。',
    phases: [
      { name: '代码解析', desc: '结构清晰 · 双任务头解耦', logs: ['git clone https://github.com/hrzeng/GraphAU', '结构：ResNet-18 特征 → AU 关系图 GAT → 多标签头', '依赖简单，无版本冲突'] },
      { name: '环境构建', desc: '轻量依赖 · 一次性通过', logs: ['conda 环境安装 6 个依赖，全部解析成功', '冒烟测试通过，显存峰值 9.8GB'] },
      { name: '数据准备', desc: 'BP4D 连续帧 · OpenFace 缓存复用', logs: ['BP4D 41 被试，OpenFace AU 缓存直接复用课题组已有预处理', '按官方 fold 文件切分 train/val/test'] },
      { name: '基线对齐', desc: '论文附录超参 · 单卡训练', logs: ['lr=2e-4, weighted BCE, 50 epochs', '训练完成耗时 3h21m，验证 F1 收敛曲线与论文一致'] },
      { name: '结果比对', desc: '逐 AU 指标对照', logs: ['总体 F1 = 0.738（论文 0.741，-0.3 点）', '逐 AU 差异均在 ±1.2 内 → 判定复现成功', '输出 per-AU 对照表存入资产库'] },
    ],
    metrics: [
      { metric: 'BP4D · F1', paper: 0.741, repro: 0.738, tol: 0.006 },
      { metric: 'BP4D · AUC', paper: 0.813, repro: 0.811, tol: 0.006 },
      { metric: 'DISFEA · F1', paper: 0.662, repro: 0.657, tol: 0.008 },
    ],
  },
];

type PhaseStatus = 'done' | 'running' | 'pending';

export default function Reproduce() {
  const toast = useToast();
  const [pickedId, setPickedId] = useState(CANDIDATES[0].id);
  const picked = CANDIDATES.find((c) => c.id === pickedId)!;

  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(-1);      // 当前执行阶段
  const [doneIdx, setDoneIdx] = useState(-1);        // 已完成到阶段（< doneIdx 视为完成）
  const [logs, setLogs] = useState<string[]>([]);
  const [phasePct, setPhasePct] = useState(0);
  const [finished, setFinished] = useState(false);
  const [history, setHistory] = useState<{ title: string; at: string; ok: boolean }[]>([
    { title: 'AUFormer (MM 24) 全流程复现', at: '2026-08-21', ok: true },
  ]);

  const timers = useRef<number[]>([]);
  const logBox = useRef<HTMLDivElement>(null);
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => () => clearTimers(), []);
  useEffect(() => { if (logBox.current) logBox.current.scrollTop = logBox.current.scrollHeight; }, [logs]);

  const reset = () => { clearTimers(); setPhaseIdx(-1); setDoneIdx(-1); setLogs([]); setPhasePct(0); setFinished(false); };

  /* 逐阶段调度：每阶段内日志逐条打出，阶段尾部门控 100% */
  const launch = () => {
    if (running) return;
    reset();
    setRunning(true);
    let t = 350;
    picked.phases.forEach((ph, pi) => {
      timers.current.push(window.setTimeout(() => {
        setPhaseIdx(pi);
        setPhasePct(0);
        setLogs((x) => [...x, `▸ 阶段 ${pi + 1}「${ph.name}」启动 —— ${ph.desc}`]);
      }, t));
      t += 250;
      ph.logs.forEach((line, li) => {
        timers.current.push(window.setTimeout(() => {
          setLogs((x) => [...x, line]);
          setPhasePct(Math.round(((li + 1) / ph.logs.length) * 100));
        }, t));
        t += 850;
      });
      timers.current.push(window.setTimeout(() => setDoneIdx(pi), t + 200));
      t += 600;
    });
    timers.current.push(window.setTimeout(() => {
      setRunning(false);
      setFinished(true);
      setHistory((h) => [{ title: `${picked.venue} ${picked.year} · ${picked.codeUrl.split('/')[1]} 复现`, at: new Date().toISOString().slice(0, 10), ok: true }, ...h]);
      toast('复现流水线执行完成，指标已对齐', 'ok');
    }, t + 300));
  };

  const overall = finished ? 100 : Math.max(0, Math.min(99, ((doneIdx + 1 + (running ? (phasePct - 100) / 100 + 0.5 : 0)) / picked.phases.length) * 100));

  const diffColor = (d: number, tol: number) => (Math.abs(d) <= tol ? 'var(--brand)' : Math.abs(d) <= tol * 2 ? 'var(--accent)' : 'var(--red)');

  return (
    <div className="page" style={{ gap: 16 }}>
      {/* ===== 页头 ===== */}
      <div className="card card-pad" style={{ flex: 'none', background: 'linear-gradient(135deg, var(--brand-softer), var(--surface) 55%)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, background: 'var(--brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', boxShadow: '0 6px 16px -6px rgba(27,122,94,.55)' }}>
          <Icon name="branch" size={22} />
        </div>
        <div className="grow" style={{ minWidth: 240 }}>
          <div className="fw-bold" style={{ fontSize: 16 }}>论文复现流水线</div>
          <p className="text-xs text-muted" style={{ marginTop: 3 }}>
            选择一篇开源论文，自动完成 <b>代码解析 → 环境构建 → 数据准备 → 基线对齐 → 结果比对</b> 五阶段复现，输出与原文逐指标对照的可复现性报告。
          </p>
        </div>
        <div className="row g-1 wrap" style={{ flex: 'none' }}>
          <Tag color="green"><Icon name="check" size={11} /> 沙箱隔离执行</Tag>
          <Tag color="blue"><Icon name="db" size={11} /> 产物归档项目库</Tag>
          <Tag color="gold"><Icon name="clock" size={11} /> 支持断点续跑</Tag>
        </div>
      </div>

      {/* ===== 候选论文 ===== */}
      <div style={{ flex: 'none' }}>
        <div className="row-between" style={{ marginBottom: 8 }}>
          <span className="card-title"><Icon name="doc" size={15} /> 选择复现目标</span>
          <span className="text-xs text-muted">共 {CANDIDATES.length} 篇可复现论文（均含官方开源代码）</span>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {CANDIDATES.map((c, i) => {
            const active = c.id === pickedId;
            return (
              <div
                key={c.id}
                className={`card card-hover anim-in ${active ? '' : ''}`}
                onClick={() => { if (!running) { reset(); setPickedId(c.id); } }}
                style={{
                  cursor: running ? 'not-allowed' : 'pointer', display: 'flex', flexDirection: 'column', gap: 8,
                  animationDelay: `${i * 60}ms`, padding: '16px 18px',
                  borderColor: active ? 'var(--brand)' : undefined,
                  background: active ? 'var(--brand-softer)' : undefined,
                  boxShadow: active ? '0 0 0 3px rgba(27,122,94,.12)' : undefined,
                }}
              >
                <div className="row-between" style={{ alignItems: 'flex-start' }}>
                  <span className="tag tag-outline" style={{ flex: 'none' }}><Icon name="book" size={11} /> {c.venue} {c.year}</span>
                  <span className="row g-1" style={{ flex: 'none', color: active ? 'var(--brand)' : 'var(--muted)' }}>
                    <Icon name="star" size={12} /> <span className="mono text-xs">{c.stars}</span>
                  </span>
                </div>
                <div className="fw-bold text-small" style={{ lineHeight: 1.5 }}>{c.title}</div>
                <div className="text-xs text-muted">{c.authors}</div>
                <p className="text-xs clamp2" style={{ color: 'var(--ink-2)' }}>{c.abstract}</p>
                <div className="row g-1 wrap" style={{ marginTop: 'auto' }}>
                  <span className="tag tag-gray"><Icon name="cpu" size={11} /> {c.framework}</span>
                  <span className="tag tag-gray">{c.gpu}</span>
                  <span className="tag tag-gray"><Icon name="clock" size={11} /> 约 {c.estHours}h</span>
                  <Tag color={c.difficulty === '低' ? 'green' : c.difficulty === '中' ? 'amber' : 'red'} style={{ marginLeft: 'auto' }}>难度 {c.difficulty}</Tag>
                </div>
                {active && (
                  <div className="text-xs" style={{ color: 'var(--brand)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Icon name="check" size={12} /> 已选定 · <span className="mono">{c.codeUrl}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== 流水线 + 实时日志 ===== */}
      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 5fr) minmax(0, 4fr)', alignItems: 'start', flex: 'none' }}>
        {/* 左：五阶段步骤条 */}
        <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="row-between wrap g-2">
            <span className="card-title"><Icon name="zap" size={15} /> 复现流水线</span>
            {running ? (
              <button className="btn btn-danger btn-sm" onClick={() => { clearTimers(); setRunning(false); setLogs((x) => [...x, '⚠ 用户手动终止，已完成阶段产物已保留（支持断点续跑）']); toast('已终止，产物保留', 'info'); }}>
                <Icon name="x" size={12} /> 终止执行
              </button>
            ) : (
              <button className="btn btn-primary" onClick={launch}>
                <Icon name={finished ? 'refresh' : 'play'} size={14} /> {finished ? '重新复现' : '启动复现'}
              </button>
            )}
          </div>

          <div className="row-between text-xs text-muted">
            <span>{running ? `正在执行阶段 ${phaseIdx + 1}/5：${picked.phases[Math.max(0, phaseIdx)].name}` : finished ? '全部阶段完成' : '待启动'}</span>
            <span className="mono fw-bold" style={{ color: 'var(--brand-strong)' }}>{Math.round(overall)}%</span>
          </div>
          <Progress value={overall} amber={running && overall < 40} />

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {picked.phases.map((ph, i) => {
              const st: PhaseStatus = finished || i <= doneIdx ? 'done' : i === phaseIdx && running ? 'running' : 'pending';
              const meta = PHASE_META[i];
              return (
                <div key={ph.name} style={{ display: 'flex', gap: 12 }}>
                  {/* 连接线 + 节点 */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none', width: 34 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: st === 'done' ? 'var(--brand)' : st === 'running' ? 'var(--brand-soft)' : 'var(--bg-deep)',
                      color: st === 'done' ? '#fff' : st === 'running' ? 'var(--brand-strong)' : 'var(--muted)',
                      border: st === 'running' ? '2px solid var(--brand)' : '1px solid var(--line)',
                      animation: st === 'running' ? 'pulse 1.4s infinite' : undefined,
                    }}>
                      {st === 'done' ? <Icon name="check" size={15} /> : <Icon name={meta.icon} size={15} />}
                    </div>
                    {i < picked.phases.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 18, background: st === 'done' ? 'var(--brand)' : 'var(--line)' }} />}
                  </div>
                  <div style={{ paddingBottom: i < picked.phases.length - 1 ? 14 : 0, flex: 1, minWidth: 0 }}>
                    <div className="row g-2 wrap" style={{ alignItems: 'baseline' }}>
                      <span className="fw-bold text-small" style={{ color: st === 'pending' ? 'var(--muted)' : 'var(--ink)' }}>
                        {i + 1}. {ph.name}
                      </span>
                      {st === 'running' && <span className="text-xs" style={{ color: 'var(--brand)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><span className="spinner" style={{ width: 11, height: 11, borderWidth: 1.5 }} /> {phasePct}%</span>}
                      {st === 'done' && <span className="text-xs" style={{ color: 'var(--brand)' }}>已完成</span>}
                    </div>
                    <div className="text-xs text-muted" style={{ marginTop: 2 }}>{ph.desc}</div>
                    {st === 'running' && <div style={{ marginTop: 6 }}><Progress value={phasePct} /></div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 右：实时执行日志 */}
        <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 380 }}>
          <div className="row-between" style={{ padding: '11px 16px', borderBottom: '1px solid var(--line)' }}>
            <span className="fw-bold text-small"><Icon name="terminal" size={14} /> 执行日志</span>
            <span className="row g-1" style={{ alignItems: 'center' }}>
              <span className="typing-dot" style={{ animationPlayState: running ? 'running' : 'paused' }} />
              <span className="text-xs text-muted mono">{running ? 'streaming…' : logs.length ? 'idle' : 'waiting'}</span>
            </span>
          </div>
          <div ref={logBox} style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', background: '#101a16', fontFamily: 'var(--font-mono)', fontSize: 11.8, lineHeight: 1.9, color: '#9fd3b8' }}>
            {logs.length === 0 ? (
              <div style={{ color: '#4c6357' }}>$ 等待启动复现流水线…<br />$ 日志将在此实时输出（沙箱隔离环境）</div>
            ) : logs.map((l, i) => (
              <div key={i} className="anim-in" style={{ animationDuration: '.25s', color: l.startsWith('▸') ? '#e8c78a' : l.startsWith('⚠') ? '#ff9d94' : l.includes('成功') || l.includes('一致') ? '#8ae0b2' : '#9fd3b8', paddingLeft: l.startsWith('▸') ? 0 : 12 }}>
                {l.startsWith('▸') ? l : <span><span style={{ color: '#4c6357' }}>›</span> {l}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== 指标比对报告 ===== */}
      {finished && (
        <div className="card card-pad anim-in" style={{ flex: 'none' }}>
          <div className="row-between wrap g-2 mb-3">
            <span className="card-title"><Icon name="target" size={15} /> 可复现性比对报告 · {picked.venue} {picked.year}</span>
            <div className="row g-1">
              <button className="btn btn-soft btn-sm" onClick={() => toast('报告已导出为 PDF（演示）')}><Icon name="download" size={12} /> 导出报告</button>
              <button className="btn btn-ghost btn-sm" onClick={() => toast('已存入「MER 课题组」项目资产库')}><Icon name="layers" size={12} /> 存入项目</button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--muted)', fontSize: 12 }}>
                  {['评测指标', '论文原文', '本次复现', '偏差', '允许容差', '判定'].map((h) => (
                    <th key={h} style={{ padding: '8px 12px', borderBottom: '1px solid var(--line)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {picked.metrics.map((m) => {
                  const d = +(m.repro - m.paper).toFixed(3);
                  const okRow = Math.abs(d) <= m.tol;
                  return (
                    <tr key={m.metric} className="card-hover" style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{m.metric}</td>
                      <td className="mono" style={{ padding: '10px 12px' }}>{m.paper.toFixed(3)}</td>
                      <td className="mono" style={{ padding: '10px 12px', fontWeight: 700, color: diffColor(d, m.tol) }}>{m.repro.toFixed(3)}</td>
                      <td className="mono" style={{ padding: '10px 12px', color: diffColor(d, m.tol) }}>{d > 0 ? '+' : ''}{d.toFixed(3)}</td>
                      <td className="mono text-muted" style={{ padding: '10px 12px' }}>±{m.tol.toFixed(3)}</td>
                      <td style={{ padding: '10px 12px' }}><Tag color={okRow ? 'green' : 'amber'}>{okRow ? '对齐' : '临界'}</Tag></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="row g-2 wrap mt-3" style={{ padding: '12px 14px', background: 'var(--brand-softer)', borderRadius: 'var(--r-md)', alignItems: 'flex-start' }}>
            <Icon name="check" size={16} />
            <div className="grow text-small" style={{ color: 'var(--brand-deep)', lineHeight: 1.7 }}>
              <b>结论：复现成功。</b>全部 {picked.metrics.length} 项核心指标与原文偏差均处于允许容差内；环境与超参快照已固化，可一键在同一协议下与自有方法对比。
            </div>
          </div>
        </div>
      )}

      {/* ===== 历史复现任务 ===== */}
      <div className="card" style={{ flex: 'none', overflow: 'hidden' }}>
        <div className="row-between" style={{ padding: '11px 16px', borderBottom: '1px solid var(--line)' }}>
          <span className="fw-bold text-small"><Icon name="history" size={14} /> 历史复现任务</span>
          <span className="text-xs text-muted">{history.length} 条记录</span>
        </div>
        {history.length === 0 ? (
          <div style={{ padding: 20 }}><Empty icon="history" text="暂无历史，启动一次复现试试" /></div>
        ) : history.map((h, i) => (
          <div key={i} className="row-between wrap g-2 card-hover" style={{ padding: '11px 16px', borderBottom: i < history.length - 1 ? '1px solid var(--line)' : 'none' }}>
            <span className="row g-2" style={{ minWidth: 0 }}>
              <span className="tag tag-green" style={{ flex: 'none' }}><Icon name="check" size={11} /> 成功</span>
              <span className="text-small ellipsis">{h.title}</span>
            </span>
            <span className="text-xs text-muted mono" style={{ flex: 'none' }}>{h.at}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
