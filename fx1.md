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
