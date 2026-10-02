# 🧪 ScienceX 项目全面分析报告与完善建议（fx.md）

> **分析对象**：ScienceX · AI 科研工作台（`e:\Code\AI\Start\Science`）
> **分析范围**：前端（React 18 + TS + Vite）、后端（Node.js + Express）、AI 服务（模板模拟层）、文档与工程化
> **分析日期**：2026-10-02
> **分析方法**：全量源码通读（backend 6 个路由 + 3 个 lib + 前端 24 个源文件）+ 接口契约比对 + 文档一致性核查

---

## 一、结论速览

| 维度 | 结论 |
| :--- | :--- |
| **项目性质** | 一个**完成度很高的可交互演示原型（High-fidelity Demo / MVP）**，页面覆盖度、UI 完成度、接口契约设计均达到优秀水平。 |
| **核心矛盾** | `README.md` / `TSD.md` 描述的是 **Java 21 + Spring Boot + Python FastAPI + PostgreSQL + Redis + K8s** 的生产架构，而代码实际是 **Node.js Express + 内存单例 + 模板模拟 AI + 纯 React**，**文档承诺与代码交付存在系统性落差**。 |
| **最大短板** | **AI 服务层 0% 真实接入**——所有"智能"输出均由 `backend/src/lib/ai.js` 的模板字符串与正则替换生成，未发生任何大模型网络请求。 |
| **次大短板** | 数据层无持久化、无多租户隔离；鉴权为明文密码 + 内存会话；工程化（测试 / Lint / CI / Docker / LICENSE）完全缺失。 |
| **亮点** | 前后端接口契约与 TSD §5 高度对齐；统一响应结构与 7 类错误码体系落地；SSE 事件协议（start/delta/progress/reference/tool/done/error）前后端一致实现；端口自愈 + Vite 代理联动设计巧妙。 |

---

## 二、文档承诺 vs 代码实现的落差核查

| 维度 | 文档（README/TSD）声明 | 代码实际实现 | 落差 |
| :--- | :--- | :--- | :---: |
| 后端业务运行时 | Java 21 + Spring Boot 3.3 | Node.js 18 + Express 4.19（`backend/src/server.js`） | 🔴 大 |
| AI 服务运行时 | Python 3.11 + FastAPI + LangChain | 无 Python 工程；`lib/ai.js` 模板字符串模拟 | 🔴 大 |
| 模型网关 | OpenAI 兼容协议，真实路由 GPT-4o/Claude/DeepSeek | 仅存模型元数据（`store.js` L26-48），**无任何请求转发代码** | 🔴 大 |
| 数据存储 | PostgreSQL 16 + Redis 7 + pgvector/Milvus + ES + MinIO | 全局内存单例 `store.js`（进程重启即丢失） | 🔴 大 |
| 文件解析 | pdf.js + MinerU/GROBID 版面解析 + OCR 兜底 | `/documents/upload` 只接收 `file_name`/`url` 字符串，**无 multipart、无解析** | 🔴 大 |
| RAG 检索 | Embedding + 向量库 + Rerank + 溯源 | `documents.js` L137-141 用 `Math.random()` 伪造相似度分 | 🔴 大 |
| 异步任务 | Celery / XXL-Job + 消息队列 | `ai.js` L85-110 用 `setTimeout` 循环推进假进度 | 🟡 中 |
| 前端技术栈 | Ant Design + Tailwind + Zustand + TanStack Query + ECharts + D3 + Cytoscape + PDF.js + KaTeX | `package.json` 仅 `react` / `react-dom` / `react-router-dom`，图表与 Markdown 均自研 SVG | 🟡 中 |
| 部署 | Docker + K8s + HPA + GitHub Actions + ArgoCD + Prometheus | 仅 `vercel.json`（Serverless）；无 Dockerfile、无 CI 配置 | 🔴 大 |
| 安全 | JWT + KMS 密钥加密 + RBAC + 审计 + 限流 | 明文密码、内存 token、`cors()` 全开、无 `expires_at` 校验、无对象级权限 | 🔴 大 |
| License | README 徽章标注 MIT 并链接 `LICENSE` | **仓库中不存在 LICENSE 文件** | 🟡 中 |

> **判断**：文档当前描述的是"目标架构（To-Be）"，代码交付的是"演示原型（As-Is）"。这是全项目最需要优先处理的一致性问题。

---

## 三、已有功能成熟度清单

**成熟度定义**：🟢 可用（逻辑闭环，仅缺真实数据源）｜🟡 半成品（接口在但数据/能力造假）｜🔴 空壳（仅有静态响应）

| # | 功能模块 | 前端页面 | 后端接口 | 数据/能力来源 | 成熟度 |
| :-: | :--- | :--- | :--- | :--- | :-: |
| 1 | AI 对话工作台 | `Chat.tsx`（420 行） | `/chat/completions`(SSE)、`/conversations`、`/dashboard/summary`、`/skills`、`/mcp/*` | 模板回答 + 假流式 | 🟡 |
| 2 | 选题灵感 | `Topic.tsx` | `/literature/search`、`/topic/recommend|feasibility|proposal`、`/literature/review` | 8 条硬编码文献池 + 固定推荐语 | 🟡 |
| 3 | 文献阅读 | `Reader.tsx` | `/documents/*`、`/documents/:id/chat`(SSE)、`/knowledge-bases/*` | 2 篇预置文档 + 假解析 | 🟡 |
| 4 | 实验设计 | `Experiment.tsx` | `/experiments/*`、`/gpu/nodes`、`/sota` | 预置实验 + `Math.random()` 抖动 GPU | 🟡 |
| 5 | 数据分析 | `Analysis.tsx` | `/charts`、`/charts/generate`、`/charts/:id/analyze` | 前端自研 SVG 渲染 + 硬编码示例数据 | 🟡 |
| 6 | 论文写作 | `Writing.tsx` | `/writing/polish|translate|plagiarism|paraphrase`、`/manuscripts/*` | **正则替换伪润色** | 🟡 |
| 7 | 投稿助手 | `Submission.tsx` | `/journals`、`/submission-tracks`、`/journals/match` | 12 条硬编码期刊 | 🟢 |
| 8 | 组会汇报 | `Meeting.tsx` | `/deck/generate`、`/advice/extract`、`/advice/*` | 假任务，返回固定大纲，无真实 pptx | 🟡 |
| 9 | 专家评审团 | `Review.tsx` | `/review/council`、`/review/reports/*` | 1 份预置评审报告，5 角色并非并行调用 | 🟡 |
| 10 | 项目与课题组 | `Projects.tsx` | `/projects`、`/teams/*` | 2 个项目 + 1 个预置团队 | 🟢 |
| 11 | 个人中心 | `Account.tsx`（435 行） | `/user/profile`、`/models`、`/usage`、`/billing/*`、`/account/*` | 公式生成的假用量（`store.js` L536-556） | 🟡 |
| 12 | 认证 | `Login.tsx` | `/auth/login|register|refresh|logout` | 明文密码 + 内存会话 | 🟡 |
| 13 | 官网宣传页 | `Landing.tsx`（986 行） | 无 | 纯静态常量 | 🟢 |

> **结论**：**功能覆盖面 100%、逻辑闭环度约 70%、真实能力落地度约 10%**。所有模块"形状"完整，缺的是真实数据源与模型接入。

---

## 四、前端完善建议

| # | 现状 / 问题 | 完善建议 | 优先级 | 预期收益 |
| :-: | :--- | :--- | :-: | :--- |
| F1 | **`Landing.tsx` 986 行 / `landing.css` 945 行**，`Account.tsx` 435 行、`Chat.tsx` 420 行，单文件过大 | 按区块拆分组件（`Hero`/`Carousel`/`PersonaGrid`/`Footer`），样式随组件下沉为 CSS Module 或按 BEM 命名分文件 | P1 | 可维护性、减少合并冲突 |
| F2 | **无集中类型定义**，`api<T = any>` 默认 `any`，各页面大量 `useState<any>`，`AuthCtx` 用 `null as any` | 新建 `src/types/`，以 TSD §5.3 接口清单为准生成 `User`/`Document`/`Experiment`/`Chart`/`Journal` 等类型；`api<T>()` 显式传泛型 | P1 | 类型安全、IDE 提示、契约回归防护 |
| F3 | **Token 存 `localStorage`**（`client.ts` L12-20），`refresh_token` 后端已返回但**前端从未使用**，无静默续期 | 短期：改用内存 + `sessionStorage` 或 `httpOnly` Cookie；中期：实现 401 拦截 → 调 `/auth/refresh` 重放原请求 | P0 | 安全 + 会话不中断 |
| F4 | **401 时 `location.href='/login'` 整页跳转**（`client.ts` L50），丢失 SPA 状态与未保存内容 | 改为通过路由 `navigate('/login')` + 全局 toast 提示，保留 `redirect` 参数回跳 | P2 | 体验连贯 |
| F5 | **SSE 解析未处理 `Last-Event-ID` 断线续传**（TSD §5.4 明确承诺）；`readSSE` 中 `JSON.parse` 失败静默丢弃 | 记录事件序号并在重连时带上 `Last-Event-ID`；`chatStream` 增加自动重连与 `AbortController`（`docChatStream` 目前不支持中断） | P1 | 长回答不丢字 |
| F6 | **重复内联样式**：`Chat.tsx`、`Projects.tsx`、`Landing.tsx` 大量 `style={{...}}` 硬编码颜色与尺寸 | 收敛到 `styles/tokens.css` 的设计变量，抽公共 `Card`/`Toolbar`/`StatRow` 组件；禁止在业务组件写死色值 | P2 | 主题一致性、支持暗色切换 |
| F7 | **大列表无虚拟化**：`Projects.tsx`、`Submission.tsx`、`Account.tsx` 长列表全量渲染 | 列表超过 ~50 项时引入虚拟滚动（可自研 IntersectionObserver 方案，避免新增依赖） | P3 | 渲染性能 |
| F8 | **可访问性缺失**：几乎无 `aria-*` / `role` / 键盘导航；图标按钮无 `aria-label` | 为交互控件补 `aria-label`、`role="dialog"` + 焦点陷阱（Modal 已有基础）、`Esc` 关闭 | P2 | 合规与可用性 |
| F9 | **响应式靠 flex/grid 自适应**，无显式断点；`Experiment/Analysis/Writing` 宽表格在窄屏易横向溢出 | 补齐 `@media` 断点；宽表格改为"横向滚动容器 + 首列吸附"或窄屏切换为卡片式 | P2 | 移动端可用 |
| F10 | **`useEffect` 依赖不完整**（`Analysis.tsx` 的 `renderChart` 未列入依赖、`Chat.tsx` 初始化一次拉 4 个接口无并发控制） | 用 `Promise.all` 并发初始化；补齐依赖或用 `useCallback` 稳定引用；为每个数据区块提供独立 loading / error / empty 三态 | P2 | 稳定性与可观测 |
| F11 | **`vite.config.ts` 无代码分割与压缩配置**，产物只有一个大 chunk（`chunkSizeWarningLimit: 1200`） | 配置 `manualChunks`（react vendor 分离）、开启 `build.sourcemap`（staging）、按需 gzip/brotli | P2 | 首屏 LCP |
| F12 | **`Landing.tsx` 与主应用共用同一 SPA 入口**，宣传页体积拖累工作台首屏 | 将 Landing 独立为静态站或独立入口（多页构建），或懒加载其重型装饰组件 | P3 | 首屏速度 |

---

## 五、后端完善建议

| # | 现状 / 问题 | 完善建议 | 优先级 | 预期收益 |
| :-: | :--- | :--- | :-: | :--- |
| B1 | **无持久化**：所有数据在 `store.js` 内存单例，进程重启全部丢失（含新增项目/会话/知识库） | 引入 SQLite（`better-sqlite3`，零运维）或 PostgreSQL，按 TSD §4.4 建表；先落地 `user`/`project`/`conversation`/`message`/`document` 五张核心表 | P0 | 数据不丢、可演示真实流程 |
| B2 | **无多租户隔离**：`/conversations`、`/documents`、`/projects` 等**不按 `user_id` 过滤**，任意登录用户可见全量数据 | 所有查询补 `owner_id` / `tenant_id` 过滤条件；抽象 `withTenant(req, query)` 助手，并加单测防回归 | P0 | 安全底线 |
| B3 | **鉴权薄弱**：明文密码（`store.js` L13）、token 非 JWT、`expires_at` 存了但**从不校验**、`cors()` 全开（`server.js` L18） | 密码 `bcrypt` 加盐哈希；改用 JWT（含 `exp`/`sub`/`tenant`）；中间件校验过期并支持滑动续期；CORS 白名单 | P0 | 安全 |
| B4 | **越权写入 / 参数覆盖**：`PUT /user/profile` 用 `Object.assign(req.user, req.body)`（`account.js` L62-66），可篡改 `id`/`plan`/`password`；`PATCH /advice/:id`、`/submission-tracks/:id` 同类问题 | 改用字段白名单显式解构赋值；禁止 `Object.assign` 直接落库 | P0 | 防提权 |
| B5 | **文件上传与解析是空壳**：`/documents/upload` 只收 `file_name`/`url` 字符串（`documents.js` L18-19） | 引入 `multer` 支持 multipart；接入 `pdf-parse`/`pdfjs-dist` 做真实文本抽取（先做文字层 PDF，OCR 后续） | P0 | 文献模块从"演示"变"可用" |
| B6 | **RAG 检索伪造**：`/knowledge-bases/:id/query` 用 `Math.random()` 生成相关性分（`documents.js` L137-141） | 实现真实检索：文本切分 + `transformers.js` 本地 embedding 或调用 embedding API + 余弦相似度排序 + 返回 `page` 溯源 | P1 | 核心差异化能力落地 |
| B7 | **缺少限流与请求体防护** | 对 `/chat/completions`、`/writing/*`、`/literature/*` 加 per-user 令牌桶限流；`express.json` 保持 2mb 并对超限返回 40001 | P1 | 防刷与稳定性 |
| B8 | **异步任务不可恢复**：`ai.js` 的 `setTimeout` 任务无幂等键、无重试、无终止；任务表仅存内存 | 任务状态机落库；引入 `Idempotency-Key`；`GET /tasks/:id` 支持断点查询；任务超时与取消 | P2 | 可靠性与可观测 |
| B9 | **SSE 无断线处理与心跳**：`streamText`（`ai.js` L60-82）不监听 `req.on('close')`，客户端断开后仍继续写；无心跳保活 | 注册 `req.on('close')` 提前终止循环；每 15s 发送 `: ping` 心跳；支持 `Last-Event-ID` 续传 | P1 | 资源节约、体验 |
| B10 | **`/mcp/recommend` 存在运行时崩溃**：`m.category.some(...)`（`chat.js` L98）中 `category` 是字符串，传入 `intent` 时抛 `TypeError` → 500 | 修正为字符串包含判断 `m.category.includes(...)` 或先做意图关键词打分 | P0 | 修复明确 Bug |
| B11 | **异步任务 SSE 鉴权不可用**：前端 `taskStream` 用 `EventSource(...?token=)`（`client.ts` L97），但后端 `auth` 只读 `Authorization` 头（`account.js` L9-15）→ **必然 401** | 后端 `auth` 增加对 `req.query.token` 的兜底读取（仅限 SSE/GET），或改用 `fetch` + ReadableStream 实现事件流 | P0 | 修复明确 Bug |
| B12 | **缺少工程化基线**：无 ESLint/Prettier、无任何测试、无 Dockerfile、无 CI、无 LICENSE、无 `.env.example` | 补 ESLint + Prettier + `supertest` 接口测试（先覆盖 auth/contract）；`.env.example` 管理 `PORT`/模型密钥；补 LICENSE（与 README 徽章一致） | P1 | 可协作、可交付 |
| B13 | **`vercel.json` 用 Serverless 承载 SSE 长连接** | Serverless 对长连接 SSE 支持有限，可能被平台中断；建议 SSE 相关接口部署到常驻容器（Render/Fly/自建 VPS），文档注明 | P2 | 部署可用性 |
| B14 | **日志与可观测性薄弱**：仅 `console.error`，`X-Request-Id` 生成后未贯穿日志 | todo 引入结构化日志（`pino`），日志携带 `request_id`/`user_id`；补 `/metrics` 基础指标 | P2 | 排障效率 |

---

## 六、AI 服务完善建议

> **前提认知**：当前项目**不存在真正的 AI 服务**——所有"智能"输出位于 `backend/src/lib/ai.js`（`generateReply` 关键词匹配 + 模板字符串）与 `research.js`（`/writing/polish` 用正则替换）。以下建议按"从 0 到 1 落地 AI 能力"组织。

| # | 现状 / 问题 | 完善建议 | 优先级 | 预期收益 |
| :-: | :--- | :--- | :-: | :--- |
| A1 | **无模型调用**：`/models` 仅有元数据，`/chat/completions` 返回模板文本；已配置的自定义模型（`store.js` L34-48）从未被真正请求 | 新增 `lib/model-gateway.js`：以 OpenAI 兼容协议统一封装 `chat/embeddings`；从 `store.customModels` 读取 `base_url`/`api_key`/`model_name` 发起真实请求，并把 token 增量透传给 SSE | P0 | AI 能力从 0 → 1，项目性质根本改变 |
| A2 | **密钥明文存内存**，`api_key_masked` 只做展示遮蔽，原始 key 未加密保存 | 用 AES-256-GCM（`crypto` 内置）加密落库，主密钥来自环境变量；网关解密后仅用于出站请求，绝不回传前端 | P0 | 密钥安全（对齐 TSD §7.3） |
| A3 | **无模型降级与重试**：TSD §6.2 承诺"指数退避 → 切备用模型 → 降级提示"，代码无实现 | 网关内实现：超时/429 → 指数退避重试 3 次 → 按 `priority` 切备用模型 → 全部失败返回 60001/60002 错误码 | P1 | 稳定性 |
| A4 | **无 Token 计量**：`/usage` 数据由 `Math.sin` 公式伪造（`store.js` L536-556） | 在网关内真实统计 `prompt_tokens`/`completion_tokens`/`cost` 并写入 `usage_record`；`/usage` 改为聚合真实记录 | P1 | 计费基础、商业闭环 |
| A5 | **对话无上下文管理**：`generateReply` 只取最后一条 user 消息，忽略历史；无长期记忆与摘要压缩 | 实现分层上下文：系统提示 + 历史消息窗口 + 超窗摘要压缩（对齐 TSD §3.2）；会话消息真实落库 | P1 | 多轮质量 |
| A6 | **无 RAG 引擎**：文献问答（`documents.js` L99-108）返回固定文案，`reference` 事件写死 `chunk_id:'ck1', page:5` | 建 `lib/rag.js`：文档切分（版面感知）→ embedding → 向量检索 → rerank → 拼装上下文 → 生成带真实 `reference`（doc_id/chunk_id/page）的回答 | P1 | 可信度与溯源（核心卖点） |
| A7 | **提示词增强是字符串拼接**（`chat.js` L109-116） | 改为调用轻量模型或规则模板库；补 Prompt Injection 防护（输入清洗 + 输出审核 + 工具白名单，对齐 TSD §7.3） | P2 | 安全与效果 |
| A8 | **多智能体评审团非真并行**：`/review/council` 只推进假进度后返回预置报告（`publish.js` L119-128） | 用 `Promise.allSettled` 并发 5 个角色 Agent（独立 system prompt），再由"主席 Agent"汇总；加 Token 成本熔断（对齐 TSD §3.6） | P1 | 特色功能真实化 |
| A9 | **图表生成无 image2 通道**：`/charts/generate` 返回 `svg_spec` 由前端自绘 | 双通道：数据驱动（自绘 SVG，已有基础）+ 生成式（接入文生图模型，落对象存储返回 URL）；失败时回退到模板自绘 | P2 | 对齐 PRD §2.2.4 |
| A10 | **无 AI 效果评测**：TSD §8.6 要求"离线评测集 + 基线回归对比"，当前无任何评测 | 为总结/翻译/润色/评审建立小规模标注集（各 30-50 条）与自动评分脚本，纳入 CI 回归 | P2 | 质量可量化 |
| A11 | **术语库缺失**：翻译返回的 `glossary` 为固定两条 | 建术语表（领域词 + 期刊风格），在翻译/润色 prompt 中注入；支持用户自定义术语 | P3 | 专业度 |
| A12 | **代码复现 / MCP 仅存目录**：`mcpServers` 只有 4 条静态记录，`/mcp/:id/connect` 只改状态字段 | 实现真实 MCP 客户端（JSON-RPC 2.0）接入 arXiv/GitHub MCP；或先做"可插拔适配器接口 + 1 个真实示例" | P3 | 生态扩展性 |

---

## 七、已定位的具体缺陷清单（可直接修复）

| # | 位置 | 问题描述 | 影响 | 建议修复 |
| :-: | :--- | :--- | :--- | :--- |
| 🐞1 | `backend/src/routes/chat.js` L96-100 | `m.category.some(...)` 中 `category` 为字符串（`store.js` L528-533），无 `some` 方法 | 调用 `/mcp/recommend?intent=...` 抛 `TypeError` 返回 500 | 改为 `m.category.includes(kw)` |
| 🐞2 | `frontend/src/api/client.ts` L96-108 ↔ `backend/src/routes/account.js` L9-15 | 前端用 `EventSource(...?token=)` 传票，后端 `auth` 只读 `Authorization` 头 | **所有异步任务进度流 401**，开题报告/综述/PPT/评审的 TaskRunner 均失效 | 后端 `auth` 兜底读取 `req.query.token`，或前端改 `fetch` 流式实现 |
| 🐞3 | `backend/src/routes/account.js` L62-66；`publish.js` L52 | `Object.assign(req.user, req.body)` 等无字段白名单 | 用户可篡改 `id`/`plan`/`password`，越权提权 | 显式解构白名单字段 |
| 🐞4 | `backend/src/routes/documents.js` L22-33 | `createTask(...() => ({ doc_id: doc.id }))` 在 `const doc` 声明前引用 | 当前因异步延迟侥幸可用，属 TDZ 隐患，重构即可能崩 | 先建 `doc` 再 `createTask` |
| 🐞5 | `backend/src/lib/ai.js` L60-82 | `streamText` 不监听 `req.on('close')` | 客户端断开后服务端仍持续写流直到结束，浪费资源 | 注册 `close` 监听并终止循环 |
| 🐞6 | `backend/src/lib/store.js` L13、L24 | 明文密码；`expires_at` 存入但从不校验 | 密码泄露风险；Token 实际永不过期（除非重启） | bcrypt + JWT + 过期校验 |
| 🐞7 | `backend/src/server.js` L18 | `app.use(cors())` 允许任意来源 | CSRF/数据泄露风险 | 按环境配置 CORS 白名单 |
| 🐞8 | `README.md` L2、L3 徽章 | 链接 `LICENSE` 文件但仓库中不存在 | 许可不明，影响开源合规 | 补 MIT LICENSE 或移除徽章 |
| 🐞9 | `backend/src/routes/chat.js` L36-43 等 | 会话/文档/项目查询无 `user_id` 过滤 | 任意登录用户可见全量数据 | 补租户过滤 |
| 🐞10 | `backend/src/routes/research.js` L115-131 | `/writing/polish` 仅 3 条正则替换 | 功能与宣传严重不符（"期刊风格润色"） | 接入真实模型或明确标注为演示 |

---

## 八、优先级实施路线

| 阶段 | 目标 | 关键事项 | 交付标准 |
| :--- | :--- | :--- | :--- |
| **S0 · 止血（当下）** | 修复明确 Bug、消除安全底线问题 | 🐞1-🐞9；CORS 白名单；字段白名单；文档与实现落差说明 | 无 500 级已知 Bug；不越权；README 标注"演示原型 + 目标架构" |
| **S1 · 打通 AI（最关键）** | 让"AI 科研工作台"名副其实 | A1 模型网关 + A2 密钥加密 + A3 降级重试 + A4 真实计量 + A5 上下文 | 对话/润色/翻译走真实模型，用量真实累积 |
| **S2 · 持久化与多租户** | 数据可留存、可隔离 | B1 SQLite/PostgreSQL + B2 租户过滤 + B3 鉴权升级 | 重启不丢数据；跨用户不可见；JWT 过期生效 |
| **S3 · 真实文件与 RAG** | 文献模块从演示到可用 | B5 multipart + PDF 解析；A6 RAG 引擎；B6 真实检索 | 上传真实 PDF 可提取正文、可问答、可溯源到页码 |
| **S4 · 特色能力真实化** | 兑现差异化卖点 | A8 五角色并行评审 + 主席汇总；A9 图表双通道 | 评审团真实调用多 Agent；图表可生成位图 |
| **S5 · 工程化与可观测** | 可协作、可交付、可运维 | B12 Lint/测试/CI/Docker/LICENSE；B14 结构化日志；A10 AI 评测 | CI 全绿；关键链路有测试；有部署文档 |

---

## 九、总结

| 评价项 | 评分（10 分制） | 说明 |
| :--- | :-: | :--- |
| 产品设计与功能覆盖 | **9.0** | PRD/TSD 完整且专业，13 个功能模块全部有页面与接口，闭环设计清晰 |
| 前端实现质量 | **7.0** | UI 完成度高、交互细腻；扣分于类型松散、超大文件、无真实技术栈落地 |
| 后端接口契约 | **8.0** | 统一响应、错误码、SSE 协议与文档高度一致，路由组织清晰 |
| 后端工程能力 | **3.5** | 无持久化、无多租户、鉴权薄弱、无测试/CI，属演示级 |
| AI 能力落地 | **1.5** | 全为模板模拟，无模型调用、无 RAG、无计量 |
| 文档一致性 | **3.0** | 文档描述的是未实现的目标架构，易造成预期偏差 |

**一句话结论**：ScienceX 是一个**产品设计优秀、前端完成度高、后端契约规范，但真实能力（AI / 数据 / 持久化 / 安全）尚未落地**的高保真原型。当前最高杠杆的动作只有两件——**① 接入真实模型网关让 AI 名副其实；② 修正文档与实现的落差并补齐安全底线**。完成这两件事后，项目的说服力与实用价值将有量级提升。