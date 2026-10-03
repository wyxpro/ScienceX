# ScienceX 项目全面分析与功能完善建议（fx1）

> 分析日期：2026-10-04
> 分析范围：frontend（React 18 + TS + Vite）、backend（Node.js + Express）、AI 服务层（ai/ 模块 + 灵犀引擎 + 模型网关）
> 结论基线：当前仓库为「可运行的高保真演示原型」——前端完成度高、后端契约完整、AI 链路真实调用与演示回退并存。

---

## 一、总体评估

| 维度 | 完成度 | 一句话评价 |
| :--- | :---: | :--- |
| 前端功能覆盖 | ★★★★☆ | 12+ 业务页面全部交付，移动端适配完成；但代码组织与工程化欠账明显 |
| 后端契约与治理 | ★★★★☆ | 统一响应/限流/链路追踪/签名令牌齐备；但存储层是单点瓶颈 |
| AI 服务真实度 | ★★★☆☆ | 对话链路真实可调用；检索/RAG/MCP/复现执行器仍是模拟或关键词级实现 |
| 工程化保障 | ★★☆☆☆ | 后端有 3 个测试文件；前端零测试、零 Lint、零格式化配置 |

**核心判断**：项目「面」已经铺得很全，下一步完善的方向不是继续加页面/接口，而是**把模拟的部分变真、把薄弱的底座变硬**。优先级最高的是：① RAG 从关键词升级为向量检索（这是「科研工作台」的灵魂能力）；② 数据存储替换（JSON 文件 → SQLite/PostgreSQL）；③ 前端超大文件拆分 + 工程化配置补齐。

---

## 二、前端（Frontend）分析与建议

### 现状
- React 18 + TypeScript 5.5 + Vite 5.4，HashRouter + lazy 懒加载 + 登录守卫，路由结构与 PRD 一一对应。
- [client.ts](frontend/src/api/client.ts) 是亮点：统一 Fetch 封装、Token 缓存续期、401 拦截、错误码映射，SSE 解析器支持断线重连 / Last-Event-ID / abort。
- 状态管理为自研 Context（auth / project），无全局状态库。
- 已知硬伤：[Reader.tsx](frontend/src/pages/Reader.tsx) 单文件 85KB；全项目内联样式 `style={{}}` 出现 1288 处（44 个文件）；多处 `any` 类型；无 ESLint / Prettier / 测试 / 错误边界。

### 前端完善建议

| # | 问题领域 | 现状 | 完善建议 | 优先级 |
| :--- | :--- | :--- | :--- | :---: |
| F1 | 超大组件 | Reader.tsx 85KB、Submission.tsx 38KB、Reproduce.tsx 34KB，状态与 UI 混杂 | 按功能域拆分（如 Reader 拆为导入器 / 阅读器 / RAG 面板 / 图谱面板），单文件控制在 500 行内 | 🔴 高 |
| F2 | 类型安全 | `any[]`/`any` 散布于 Reader、project store、SSE handlers | 后端响应已有统一契约，补 `types/` 全量接口类型，开启 `strict: true`，SSE 事件 payload 建立判别联合类型 | 🔴 高 |
| F3 | 工程化缺失 | 无 ESLint、Prettier、husky、CI 检查 | 接入 `eslint + @typescript-eslint + prettier`，`npm run build` 前置 lint；GitHub Actions 加类型检查 | 🔴 高 |
| F4 | 样式体系 | 1288 处内联样式，维护成本高，主题切换困难 | 渐进迁移到 CSS Modules 或 Tailwind；优先迁移 Reader/Chat 两个高频页面，样式值统一走 `tokens.css` 变量 | 🟠 中 |
| F5 | 错误与加载态 | 仅简单 Toast；无全局 ErrorBoundary、无 Skeleton | 根组件加 ErrorBoundary（含「上报并重试」）；列表页统一 Skeleton；SSE 断流给明确重连 UI | 🟠 中 |
| F6 | 表单与校验 | 登录/注册/模型接入表单手写校验 | 引入 `react-hook-form + zod`，与后端校验规则共享 schema | 🟠 中 |
| F7 | 状态管理扩展 | Context 嵌套深，跨页共享（如当前文献、图表数据）靠 props 层层传递 | 引入 `zustand` 管理跨页研究上下文（当前文档/项目/会话），Context 仅留全局主题 | 🟡 低 |
| F8 | 国际化与可访问性 | 全中文硬编码；a11y 仅 Modal 有部分属性 | 若有出海计划，抽 `i18n` 字典；补键盘导航、焦点管理、色彩对比度审查 | 🟡 低 |
| F9 | 数据缓存 | 每次进页面重新拉取，无缓存去重 | 引入 `@tanstack/react-query` 管理服务端状态（缓存、失效、乐观更新），可删掉大量手写 loading 逻辑 | 🟡 低 |

---

## 三、后端（Backend）分析与建议

### 现状
- Express 4.19，统一 `/api/v1` 契约、`respond.js` 标准响应、`X-Request-Id` 链路追踪、进程内滑动窗口限流、`EADDRINUSE` 端口自愈。
- 认证：scrypt 加盐存密码（[security.js](backend/src/lib/security.js)）+ HMAC-SHA256 签名令牌（`sx1.` 前缀，Access 7 天 / Refresh 30 天），适配 Serverless 多实例——设计合理。
- 存储：[store.js](backend/src/lib/store.js)（54KB）全量内存 + JSON 文件持久化；测试仅 3 个文件（api / ai / dreampaper.smoke）。

### 后端完善建议

| # | 问题领域 | 现状 | 完善建议 | 优先级 |
| :--- | :--- | :--- | :--- | :---: |
| B1 | 数据存储 | JSON 文件全量读写，无事务、无并发控制、无索引；数据量大后有丢失与性能风险 | 短期：写操作加互斥队列 + 原子写（临时文件 + rename）；中期：迁 SQLite（单机）或 PostgreSQL（生产），store.js 保持接口不变做仓储层适配 | 🔴 高 |
| B2 | 输入校验 | 路由内手写 `if (!field)` 校验，规则零散 | 引入 `zod`（与前端共享 schema），在路由层统一 `validate` 中间件，校验失败返回 40011 参数错误码 | 🔴 高 |
| B3 | 限流局限 | 限流计数在进程内存，Serverless 多实例下各算各的，形同虚设 | Vercel 场景接入 Upstash Redis 限流；自部署场景换 `rate-limiter-flexible` + Redis；同时把限流 key 从 path 改为 `userId+path` 防共享 IP 误伤 | 🔴 高 |
| B4 | 密钥兜底 | `SCIENCEX_MASTER_KEY` 缺失时回落 `'sciencex-development-key-change-me'` | 生产环境（NODE_ENV=production）检测到缺省密钥应**拒绝启动**而非降级，已有 `assertProductionConfig` 则确保所有入口都调用 | 🔴 高 |
| B5 | 日志与可观测 | 只有请求链路 ID，无结构化日志、无错误堆栈持久化 | 引入 `pino`：JSON 结构化日志 + 请求耗时 + AI 调用耗时/token 数；错误经全局中间件写堆栈，便于 Serverless 排障 | 🟠 中 |
| B6 | 测试覆盖 | 3 个测试文件，核心路由（documents/publish/research）无覆盖 | 补齐 7 个路由的契约测试；存储层加并发写测试；CI 中跑 `npm test` 并要求覆盖率阈值 | 🟠 中 |
| B7 | 上传安全 | documents 上传放宽 body 限制，未见文件类型/大小白名单与内容嗅探 | 白名单后缀 + MIME 嗅探 + 大小上限 + 文件名清洗（防路径穿越），落盘目录与可执行目录隔离 | 🟠 中 |
| B8 | 模拟数据残留 | GPU 节点（research.js）、期刊库（publish.js）、文献检索源均为内置静态数据 | 标注 `source: 'demo'` 字段让前端可区分展示「演示数据」徽标，避免误导；逐步接真实数据源（见 AI 部分） | 🟡 低 |
| B9 | API 文档 | README 手写接口清单，易与代码脱节 | 引入 OpenAPI（`swagger-jsdoc`）由路由注释生成文档，前端类型可由 schema 自动生成（打通 F2） | 🟡 低 |

---

## 四、AI 服务分析与建议

### 现状调用链路
```
routes (chat/documents/research/publish/...)
   → lingxiEngine.executeAgentStream / model-gateway.js
      → ai/client.js（OpenAI 兼容 chat/completions，1 次超时重试，支持 reasoning_content）
         → streamAdapter.js（适配为 start/thought/delta/done/error SSE 事件）
   无密钥/失败时 → lib/ai.js 本地模板回退（fallback 标记）
```
- 真实调用覆盖：**对话（8 类 Agent 模式）、模型网关（自定义 OpenAI 兼容模型）、流式适配、记忆上下文注入**为真实链路。
- 模拟/降级覆盖：**arXiv 检索返回硬编码论文**（lingxiEngine.js L255+，URL 像真的但条目是假的）；**RAG 为关键词计分**（documents.js L334-342）；**技能执行返回固定模板**（chat.js L128）；**文献多源检索、GPU 监控、期刊匹配**为静态数据；**DreamPaper 代码执行为沙箱模拟**。

### AI 服务完善建议

| # | 问题领域 | 现状 | 完善建议 | 优先级 |
| :--- | :--- | :--- | :--- | :---: |
| A1 | RAG 检索质量 | 关键词命中计分（documents.js），无语义召回、无 rerank、无页码级对齐 | 接入 Embedding（如 OpenAI text-embedding-3 / BGE 本地模型）做向量检索，SQLite 可用 sqlite-vec、PG 用 pgvector；检索后接 LLM rerank；引用溯源保留 section/page 字段——这是「文献 RAG 问答」可信度的关键 | 🔴 高 |
| A2 | 真实文献检索 | arXiv「检索」返回硬编码假论文，多源检索为静态数据 | 对接真实 API：arXiv API（免费）、Semantic Scholar、OpenAlex；统一做去重、字段映射与限频；有 code 链接的接 GitHub API 补全 `has_code` 过滤 | 🔴 高 |
| A3 | 提示词管理 | 提示词硬编码散落在各路由与 dp-prompts.js | 集中 `prompts/` 目录按功能模块化，支持版本号；关键场景（评审团、润色）用 few-shot 模板；便于后续 A/B 与评测 | 🟠 中 |
| A4 | 调用健壮性 | client.js 仅 1 次重试、单超时值；无降级分级、无熔断 | 抽象统一的 `withRetry`（指数退避 + 可配置次数）；区分「网络失败可重试」与「4xx 不可重试」；连续失败进入短时熔断直接走模板回退，避免雪崩 | 🟠 中 |
| A5 | Token 计量与成本 | usage 有解析但未沉淀，用户看不到消耗 | 每次调用记录 `prompt_tokens/completion_tokens/model/cost` 入库，Account 用量页展示真实统计；为后续按量计费打底 | 🟠 中 |
| A6 | 记忆引擎质量 | 三层记忆基于规则抽取（从对话提事实），无质量过滤与遗忘机制 | 抽取改为 LLM 结构化输出（JSON schema）；加重要性评分与去重合并；长期记忆超容量时按「最近访问 + 重要性」淘汰 | 🟠 中 |
| A7 | 流式错误语义 | SSE error 事件后前端只能笼统重试 | error 事件携带错误码与「是否可重试/是否已降级模板」标记；降级生成的内容显式打「演示模板」水印，与真实模型输出区分 | 🟡 低 |
| A8 | 模型评测缺失 | 回退模板内容质量无任何度量 | 建立最小评测集（10-20 个代表性问题 × 期望要点），跑「真实模型 vs 模板」自动对比，防止回退质量劣化无人知晓 | 🟡 低 |
| A9 | MCP / 工具执行 | MCP 目录与连接状态为模拟，技能执行返回固定文案 | 优先把 arXiv 工具做真（并入 A2）；MCP 客户端按官方 SDK 接 1-2 个真实 server 作为样板；CodeAct 若不能上 Docker 沙箱，明确禁用执行类指令并提示 | 🟡 低 |
| A10 | 模型网关扩展 | 仅支持 OpenAI 兼容协议 + DeepSeek 端点 | 网关层抽象 `provider`（openai / anthropic / gemini / ollama 本地），满足 README 中「私有化国产模型」的演进目标 | 🟡 低 |

---

## 五、落地路线图（按优先级收敛）

| 阶段 | 目标 | 对应条目 |
| :--- | :--- | :--- |
| 第一阶段：把「假」变「真」 | RAG 向量化、真实 arXiv/OpenAlex 检索、演示数据打标 | A1、A2、B8 |
| 第二阶段：把「底座」变「硬」 | 存储原子写/迁移、限流 Redis 化、生产密钥强校验、zod 校验 | B1、B2、B3、B4 |
| 第三阶段：把「工程」补「齐」 | 前端 lint/test、Reader 拆分、类型收敛、结构化日志、补测试 | F1-F3、B5、B6 |
| 第四阶段：把「智能」做「深」 | 提示词工程化、token 成本统计、记忆引擎升级、模型评测 | A3-A6、A8 |
| 第五阶段：把「生态」打「通」 | 真实 MCP 接入、多 Provider 网关、代码沙箱评估 | A9、A10、（TSD 演进项） |

---

## 六、风险提示

1. **演示与真实的边界要对外可见**：未配置 `DEEPSEEK_API_KEY` 时回退模板内容可能被误认为模型输出，建议全局显式标识（配合 A7/B8）。
2. **Vercel 多实例是当前架构的隐形约束**：任何新引入的进程内存态（会话、限流、任务流）都会复现「Token 已失效」同类故障，新功能设计时先问「这个状态放哪」。
3. **不要在原型上直接堆生产功能**：建议存储与校验两项底座（B1/B2）先行，否则后续每个新功能都在放大技术债。

---

## 七、实施记录（2026-10-04，第二节「前端分析与建议」落地）

| # | 条目 | 状态 | 落地内容 |
| :--- | :--- | :---: | :--- |
| F3 | 工程化缺失 | ✅ 已完成 | 接入 ESLint 9（flat config）+ typescript-eslint 8 + react-hooks + react-refresh + Prettier；新增 `lint` / `lint:fix` / `format` / `typecheck` 脚本；CI 增加「Frontend typecheck + Frontend lint」两道门禁（当前 0 error / 248 warning，存量 `any` 以 warn 渐进收敛）。 |
| F2 | 类型安全 | ✅ 主体完成 | `types/index.ts` 新增 SSE 事件判别联合（`SSEEvent` + 14 种事件名 + 8 类载荷接口）；`client.ts` 的 `SSEHandlers` 全量告别 `any`，`chatStream` 改用 `ChatCompletionPayload`（补 `agent_mode`），`docChatStream` 改用 `DocChatMessage`；类型校准中发现并对齐了后端 step_update 事件真实词表（`planning/completed`）。剩余 248 处存量 `any` 已入 lint 监控，按页面逐步收敛。 |
| F5 | 错误与加载态 | ✅ 核心完成 | 新增 `components/ErrorBoundary.tsx`（重试本页 / 刷新 / 返回工作台 + 错误堆栈本地留存 `sx:error-log`）；双层接入：外壳内按路由 key 重置的页面级边界（单页崩溃不拖垮侧边栏）+ 顶层兜底边界（Landing/Login）。 |
| F1 | 超大组件 | 🔶 第一阶段 | Reader.tsx **1990 → 950 行**，按功能域拆出 3 个模块：`reader/readerShared.ts`（常量/工具/类型）、`reader/ReaderAgentPanel.tsx`（右栏 Agent 对话中枢，含语音输入/附件/模型切换，切换文献自动重置会话）、`reader/ReaderImportModal.tsx`（导入弹窗，表单校验状态内聚，`onImport` 回调返回错误文案）。中栏五 Tab 面板与左栏阅读器为后续第二阶段拆分对象；Submission/Reproduce 同理。 |
| F4/F6-F9 | 样式/表单/状态/缓存 | ⏸ 未动 | 属渐进型改造（内联样式 1288 处、引入新依赖），建议与功能迭代合并推进，不在本次范围。 |

**验收**：`tsc --noEmit` 0 错误；`eslint src` 0 error；`npm run build` 通过；行为等价性通过组件职责比对（导入/对话/删切换文献链路未变）。

## 八、实施记录（2026-10-04，第四节「AI 服务分析与建议」落地）

已落地 A1–A10 的核心服务链路：Embedding RAG 与引用溯源、真实多源检索、版本化提示词、重试熔断、真实用量记录、结构化记忆抽取、SSE 降级语义、12 题评测集、官方 SDK MCP 样板及多 Provider 网关。无隔离环境时禁用代码执行，降级规划不再编造论文与实验数值。

配置、验收及明确边界见 [AI 服务接入与验收](backend/AI-SERVICES.md)。当前向量检索采用现有存储加进程内精确检索，MCP 样板采用进程内传输；向量数据库索引、远程 MCP 部署和新增 Provider 原生流式协议仍属于后续扩展。

**验收**：后端 32 项通过、3 项真实模型测试跳过；12 题模板回归通过；前端构建通过，Lint 0 error / 248 warning。外部服务真实连通性及付费模型评测未在本次离线验收中验证。

## 九、实施记录（2026-10-04，第三节「后端分析与建议」落地）

| # | 条目 | 状态 | 落地内容 |
| :--- | :--- | :---: | :--- |
| B1 | 数据存储 | 🔶 短期完成 | 仓储层已有 `lib/persistence.js` 写互斥队列（同一实例按入队次序串行落盘）+ 原子写（临时文件 `wx 0o600` → fsync → rename，失败清理）；本次补齐 `server.js` 响应尾部 `store.persist()` 失败捕获并记结构化告警（不再产生 unhandledRejection 风险）。新增 5 项存储层测试（并发次序、单次失败不阻塞队列、快照序列化异常隔离、真实磁盘并发无半写、store 队列共享）。SQLite/PostgreSQL 迁移为中期项，store.js 接口未变可直接做仓储适配。 |
| B2 | 输入校验 | ✅ 已完成 | `shared/api-schemas.js` 统一 zod 契约（浏览器/服务端可复用），`lib/router.js` 的 `createRouter` 按 method+path 自动注入 `validate` 中间件，失败返回 400 + 40011 + 字段级明细；未声明字段被 `z.object` 剥离（防批量赋值）。补齐契约测试验证登录校验与字段剔除。 |
| B3 | 限流局限 | ✅ 已完成 | 限流后端三级可选：memory / Upstash REST / Redis（`rate-limiter-flexible`，Lua 原子计数），Vercel 生产环境强制共享限流否则拒绝启动；本次修复两个关键缺口：① `chat/writing/literature` 三个挂载点各自独立 `scope`（此前共享默认桶，共享后端下不同阈值互踩）；② 限流中间件跑在认证之前，现在先验签 `sx1.` Bearer 令牌取 userId 分桶（此前 req.user 未填充永远落到 ip 桶，校园网/NAT 共享 IP 误伤登录用户），匿名才降级 ip。新增 3 项限流测试。 |
| B4 | 密钥兜底 | ✅ 已收敛 | `assertProductionConfig` 在 `security.js` 模块加载与 `startServer` 双入口均调用，覆盖所有启动路径。策略按既有决策（a4cbe5a）收敛为：生产缺 `SCIENCEX_MASTER_KEY` 时输出显式告警并回退演示密钥，保证 Serverless 演示可用性；对应测试「生产环境未配置主密钥时告警回退并正常启动」守护该行为。正式上线仍必须在部署平台配置 32+ 字符随机密钥。 |
| B5 | 日志与可观测 | ✅ 已完成 | pino JSON 结构化日志（敏感字段 authorization/token/password/api_key 自动脱敏）；请求中间件输出 `event:request`（method/path/status/duration_ms/request_id），AsyncLocalStorage 将子 logger 贯穿到业务代码与全局错误处理；未处理异常落完整堆栈（err 序列化）；启动/端口切换/持久化失败/AI 调用耗时与 token 用量全部事件化。 |
| B6 | 测试覆盖 | ✅ 主体完成 | 新增 `test/persistence.test.js`（5 项）与 `test/routes.contract.test.js`（13 项：documents 上传→列表→详情→删除全链路、伪装扩展名拒绝、实验创建→调度→详情、GPU/期刊 demo 打标、投稿追踪 CRUD、40003 错误契约、OpenAPI 同源、限流键/429/Retry-After、X-Request-Id）；全套 53 项：50 通过 / 0 失败 / 3 跳过（真实模型用例）；新增 `npm run coverage`（c8 阈值 lines 55 / functions 50 / branches 60，实测 58.3/53.6/65.3）并接入 CI 门禁。 |
| B7 | 上传安全 | ✅ 已完成 | `lib/upload.js`：后缀白名单（PDF/DOC/DOCX/MD/CAJ）+ 魔数嗅探（%PDF-/PK…/OLE/CAJ 头，docx 校验 zip 内部 document.xml）+ 50MB 上限 + 文件名清洗（basename、控制字符、Windows 保留名）+ URL 导入 SSRF 防护（仅公网 HTTPS、固定已校验地址防 DNS 重绑定、不跟随重定向）。 |
| B8 | 模拟数据残留 | ✅ 已完成 | `store.js` 启动时对 gpuNodes/journals/literaturePool/sotaLeaderboard/skills/mcpServers/papersDaily/recentOutputs 统一打 `source: 'demo'`；用户导入（source: 'upload'/'url'）与真实检索（`source: 'live'` + degraded 标记）保留各自来源不被污染；契约测试断言打标不回退。 |
| B9 | API 文档 | ✅ 已完成 | 新增 `lib/openapi.js`：由共享 zod 契约 + `registeredRoutes` 自动生成 OpenAPI 3.0.3 文档，`GET /api/v1/openapi.json` 对外暴露（与运行时校验同源，不可能脱节）；含 securitySchemes（sx1. 签名令牌）、requestBody/query/path 参数与统一响应信封。前端类型可由该 schema 生成（打通 F2）。未采用 swagger-jsdoc 注释方案（契约已在 schema 中，注释会引入双源）。 |

**验收**：`npm test` 53 项（50 通过 / 0 失败 / 3 跳过真实模型用例）；`npm run coverage` 阈值门禁 EXIT=0；OpenAPI/限流/存储并发均为新增自动化测试覆盖。SQLite/PostgreSQL 迁移、前端「演示数据」徽标展示为后续演进项。
