/* ============================================================
   ScienceX 核心数据契约类型定义库（遵循 TSD §5.3 与 PRD 业务规范）
   ============================================================ */

/** 通用 API 包装响应结构 */
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  trace_id?: string;
}

/** 分页响应结构 */
export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

/* ---------- 用户与鉴权 ---------- */
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  title: string;
  research_tags: string[];
  plan: 'free' | 'pro' | 'team' | 'enterprise';
  institution?: string;
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  refresh_token?: string;
  user: User;
}

/* ---------- 对话与智能体 ---------- */
export type AgentMode =
  | 'general'
  | 'react'
  | 'plan_execute'
  | 'codeact'
  | 'mcp'
  | 'skill'
  | 'text2sql'
  | 'structured';

export interface PlanStep {
  id: string;
  title: string;
  tool?: string;
  /** planning/completed 为 LingXi 引擎 step_update 事件实际状态词表 */
  status: 'waiting' | 'running' | 'success' | 'failed' | 'planning' | 'completed';
  desc?: string;
  output?: string;
}

export interface PlanFlowData {
  task_id: string;
  title: string;
  percent: number;
  status: 'planning' | 'running' | 'completed' | 'failed';
  steps: PlanStep[];
}

export interface ThoughtStep {
  round: number;
  text: string;
  action?: string;
  observation?: string;
  latency_ms?: number;
}

export interface ResearchPaperItem {
  id: string;
  title: string;
  authors: string[];
  venue?: string;
  year?: string;
  arxiv_id?: string;
  abstract: string;
  pdf_url?: string;
  citations?: number;
  code_url?: string;
}

export interface ResearchMemoryFact {
  id: string;
  user_id?: string;
  project_id?: string;
  category: string;
  key: string;
  content: string;
  tags?: string[];
  active?: boolean;
  created_at: string;
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at?: number | string;
  references?: CitationReference[];
  tools?: string[];
  error?: boolean;
  model?: string;
  tokens?: number;
  streaming?: boolean;
  agent_mode?: AgentMode;
  plan?: PlanFlowData;
  thoughts?: ThoughtStep[];
  chart_data?: any;
  code?: string;
  papers?: ResearchPaperItem[];
  memory_injected?: {
    count: number;
    facts: string[];
    summary?: string;
  };
}

export interface CitationReference {
  doc_id?: string;
  title?: string;
  chunk_id?: string;
  page?: number;
  snippet?: string;
  score?: number;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  model: string;
  system_prompt?: string;
  message_count?: number;
}

export interface ChatCompletionPayload {
  conversation_id?: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
  temperature?: number;
  skills?: string[];
  mcp_tools?: string[];
  agent_mode?: AgentMode;
  [key: string]: any;
}

export interface SkillItem {
  id: string;
  name: string;
  icon?: string;
  desc?: string;
  prompt_template?: string;
  category?: 'literature' | 'experiment' | 'writing' | 'review' | 'general';
  uses?: number;
}

export interface MCPServer {
  id: string;
  name: string;
  endpoint: string;
  status: 'connected' | 'disconnected' | 'error';
  category: string;
  description: string;
}

/* ---------- 文献与知识库 ---------- */
export interface DocumentItem {
  id: string;
  title: string;
  authors: string[];
  year: number;
  venue: string;
  doi?: string;
  abstract: string;
  citation_count?: number;
  url?: string;
  file_size?: number;
  status?: 'parsed' | 'parsing' | 'failed';
  knowledge_base_id?: string;
  mindmap?: Record<string, any>;
  seven_section_summary?: {
    background?: string;
    motivation?: string;
    method?: string;
    experiments?: string;
    results?: string;
    limitations?: string;
    future_work?: string;
  };
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string;
  doc_count: number;
  created_at: string;
  updated_at: string;
  is_shared?: boolean;
}

/* ---------- 实验与算力 ---------- */
export interface ExperimentItem {
  id: string;
  title: string;
  status: 'running' | 'completed' | 'queued' | 'failed';
  baseline_name: string;
  dataset: string;
  metric_name: string;
  baseline_score: number;
  target_score: number;
  current_score?: number;
  gpu_node?: string;
  started_at: string;
  matrix?: Array<{
    variant: string;
    params: Record<string, any>;
    result?: number;
    delta?: number;
    status: 'pending' | 'running' | 'success';
  }>;
}

export interface GPUNode {
  id: string;
  name: string;
  device: string;
  vram_total: number;
  vram_used: number;
  temperature: number;
  utilization: number;
  status: 'active' | 'idle' | 'warning' | 'offline';
}

export interface SotaBenchmark {
  task: string;
  dataset: string;
  metric: string;
  sota_score: number;
  sota_paper: string;
  sciencex_score: number;
}

/* ---------- 数据分析与图表 ---------- */
export interface ChartItem {
  id: string;
  title: string;
  type?: 'radar' | 'scatter' | 'line' | 'bar' | 'network' | 'heatmap' | string;
  description?: string;
  created_at: string;
  spec?: {
    labels?: string[];
    datasets?: Array<{
      label: string;
      data: any[];
      color?: string;
    }>;
    nodes?: Array<{ id: string; label: string; group?: number }>;
    links?: Array<{ source: string; target: string; value?: number }>;
    options?: Record<string, any>;
  };
  svg_spec?: any;
  analysis?: string;
}

/* ---------- 期刊与投稿 ---------- */
export interface JournalItem {
  id: string;
  title: string;
  issn?: string;
  impact_factor: number;
  cas_tier: string;
  ccf_tier?: string;
  acceptance_rate: string;
  review_cycle_days: number;
  scope_keywords: string[];
  deadlines?: Array<{
    event: string;
    date: string;
    days_left: number | null;
  }>;
}

export interface SubmissionTrackItem {
  id: string;
  manuscript_title: string;
  journal_name: string;
  status: 'draft' | 'submitted' | 'under_review' | 'revision' | 'accepted' | 'rejected';
  submitted_at: string;
  deadline?: string;
  reviewer_comments_count?: number;
}

/* ---------- 专家同行评审团 ---------- */
export interface ReviewReport {
  id: string;
  manuscript_title: string;
  overall_verdict: 'Strong Accept' | 'Accept' | 'Weak Accept' | 'Major Revision' | 'Reject';
  overall_score: number;
  summary: string;
  created_at: string;
  agents: {
    theory: AgentReviewDetail;
    method: AgentReviewDetail;
    experiment: AgentReviewDetail;
    writing: AgentReviewDetail;
    ethics: AgentReviewDetail;
  };
  action_checklist: Array<{
    id: string;
    task: string;
    priority: 'high' | 'medium' | 'low';
    agent: string;
    done?: boolean;
  }>;
}

export interface AgentReviewDetail {
  name: string;
  role: string;
  score: number;
  verdict: string;
  comments: string[];
  suggestions: string[];
}

/* ---------- 项目与团队 ---------- */
export interface ProjectItem {
  id: string;
  title?: string;
  name?: string;
  type?: 'research' | 'survey' | 'tool' | string;
  description?: string;
  field?: string;
  status?: 'active' | 'archived' | 'completed' | string;
  progress?: any;
  created_at?: string;
  stats?: {
    documents?: number;
    experiments?: number;
    charts?: number;
    manuscripts?: number;
  };
  members_count?: number;
  documents_count?: number;
  experiments_count?: number;
}

export interface TeamItem {
  id: string;
  name: string;
  members: Array<{
    user_id: string;
    name: string;
    role: string;
  }>;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'lead' | 'researcher' | 'student';
  avatar?: string;
  joined_at: string;
}

/* ---------- 异步任务与进度 ---------- */
export interface AsyncTaskProgress {
  task_id: string;
  percent: number;
  stage: string;
  message?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
}

/* ---------- SSE 流式事件协议（TSD §5.4，F2 判别联合） ----------
   事件名全集：start / delta / progress / reference / tool / plan / step_start /
   step_update / thought / tool_call / tool_result / memory_injected / error / done
   各载荷保留索引签名以兼容后端字段演进，已知字段获得编译期约束 */

export type SSEEventName =
  | 'start'
  | 'delta'
  | 'progress'
  | 'reference'
  | 'tool'
  | 'plan'
  | 'step_start'
  | 'step_update'
  | 'thought'
  | 'tool_call'
  | 'tool_result'
  | 'memory_injected'
  | 'error'
  | 'done';

export interface SSEStartPayload {
  conversation_id?: string;
  message_id?: string;
  mode?: 'live' | 'fallback';
  model?: string;
  [key: string]: any;
}

export interface SSEDeltaPayload {
  text: string;
  [key: string]: any;
}

/** DreamPaper 流水线 design_log 增量与故障诊断卡 */
export interface SSEProgressPayload {
  percent: number;
  stage: string;
  message?: string;
  design_log?: { step: string; label: string; status: string; content: string };
  diagnosis?: Record<string, any>;
  [key: string]: any;
}

export interface SSEReferencePayload extends CitationReference {
  [key: string]: any;
}

export interface SSEToolPayload {
  name?: string;
  tool?: string;
  status?: string;
  args?: Record<string, any>;
  result?: any;
  [key: string]: any;
}

/** Plan-Execute 模式 step_start / step_update 事件载荷（按步骤索引增量更新计划流） */
export interface SSEStepPayload {
  step_index?: number;
  status?: PlanStep['status'];
  output?: string;
  [key: string]: any;
}

export interface SSEDonePayload {
  text?: string;
  aborted?: boolean;
  mode?: 'live' | 'fallback';
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  [key: string]: any;
}

export interface SSEErrorPayload {
  message?: string;
  code?: number;
  retryable?: boolean;
  degraded?: boolean;
  [key: string]: any;
}

/** 原始 SSE 事件判别联合：供解析器与调试工具按 event 字段窄化载荷 */
export type SSEEvent =
  | { event: 'start'; data: SSEStartPayload }
  | { event: 'delta'; data: SSEDeltaPayload }
  | { event: 'progress'; data: SSEProgressPayload }
  | { event: 'reference'; data: SSEReferencePayload }
  | { event: 'tool'; data: SSEToolPayload }
  | { event: 'plan'; data: PlanFlowData }
  | { event: 'step_start' | 'step_update'; data: SSEStepPayload }
  | { event: 'thought'; data: ThoughtStep }
  | { event: 'tool_call' | 'tool_result'; data: SSEToolPayload }
  | { event: 'memory_injected'; data: NonNullable<ChatMessage['memory_injected']> }
  | { event: 'error'; data: SSEErrorPayload }
  | { event: 'done'; data: SSEDonePayload };

/** 文献问答消息（docChatStream 入参） */
export interface DocChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
