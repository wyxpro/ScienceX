# AI 服务接入与验收

对应 `fx1.md` 第四节 A1–A10。环境变量见 `.env.example`，服务仍通过原有 `/api/v1` 路由提供。

| 条目 | 实现与使用方式 |
| --- | --- |
| A1 RAG | `ai/rag.js` 切片、批量 Embedding、内容哈希缓存和余弦相似度召回；知识库入库与文档问答共用检索逻辑。引用返回 chunk、section、page、page_verified，无法确认原始页码时返回 null。`RAG_RERANK=true` 启用模型重排。 |
| A2 文献 | `ai/literature.js` 接入 arXiv、OpenAlex、Semantic Scholar，统一字段、按来源排队限频、跨源去重；仅验证摘要中已有的 GitHub 仓库链接，验证成功才设置 has_code。上游失败返回 warnings，不补入假论文。 |
| A3 提示词 | `ai/prompts/` 集中管理 RAG、记忆、技能、主要 Agent、文本任务和 DreamPaper 提示词，包含版本号、润色及评审 few-shot 示例。后续可继续迁移路由中剩余的场景提示词。 |
| A4 健壮性 | `ai/resilience.js` 提供指数退避、取消、HTTP 错误分类、短时熔断。每次尝试的超时包含响应体读取；重试总耗时可能超过单次超时。流已输出后不重试，避免重复正文。 |
| A5 用量 | 成功模型调用按用户、模型、场景记录上游 Token。上游未上报时标记 unreported；未配置价格时 cost 为 null。账户用量页只统计真实调用，费用是按配置价格计算的估算值。 |
| A6 记忆 | 模型输出 JSON 后通过 Zod 校验，要求证据逐字存在于用户消息，过滤低重要性和敏感凭据，按用户与项目合并、按重要性及访问时间淘汰。未配置模型时不推测事实。 |
| A7 SSE | error 携带 code/retryable/degraded；模板输出含可见水印和 fallback 事件；保留已输出的部分回复，未知 Token 不用文本长度假算。 |
| A8 评测 | `eval/cases.json` 包含 12 个问题及期望要点；离线模板回归已接入 CI，`--live` 可显式启用真实模型对比。 |
| A9 工具 | 官方 MCP SDK Client、McpServer、InMemoryTransport 完成握手、工具枚举和工具调用，提供 arXiv/OpenAlex 两个样板。连接范围为单次请求，不是持久远程连接。CodeAct 返回 SANDBOX_DISABLED 和 executed=false。 |
| A10 网关 | 账户模型配置支持 openai/deepseek/custom、anthropic、gemini、ollama，分别映射原生请求和用量字段。Ollama 本地地址在生产环境需要管理员 allowlist。 |

## 配置

1. 为默认对话设置 DeepSeek 或 OpenAI 兼容服务的 Base URL、模型和密钥；账户页可以新增其他 Provider。两套默认配置同时存在时 DeepSeek 优先。
2. 为向量检索独立设置 `EMBEDDING_BASE_URL`、`EMBEDDING_MODEL`、`EMBEDDING_API_KEY`。无配置或服务异常时返回 `keyword-fallback`，并显式标记 degraded。
3. 按服务商要求设置 `OPENALEX_API_KEY`、`SEMANTIC_SCHOLAR_API_KEY`；可选 `GITHUB_TOKEN` 用于仓库验证配额。
4. 用 `AI_PRICES_JSON` 设置模型每百万输入/输出 Token 的人民币单价；模型名须与上游响应一致。不要把未知费用当作免费。

| Provider | Base URL 格式示例 |
| --- | --- |
| OpenAI 兼容 | `https://服务域名/v1` |
| Anthropic | `https://api.anthropic.com/v1` |
| Gemini | `https://generativelanguage.googleapis.com/v1beta` |
| Ollama | `http://127.0.0.1:11434`（不带 `/v1`） |

## 验证

```powershell
npm test --prefix backend
npm run eval:ai --prefix backend -- --check
npm run lint --prefix frontend
npm run build --prefix frontend
# 已配置密钥、准备产生真实调用时：
npm run eval:ai --prefix backend -- --live --check
```

当前离线验收：后端 32 项通过、3 项真实模型测试跳过；12 个评测问题模板要点命中率 1.0；前端构建通过、Lint 0 error / 248 个存量 warning。HTTP/Embedding/Provider 协议测试使用本地 fixture；未据此宣称外部服务在线可用。要点命中率不代表事实正确性或完整人工评审。

## 部署边界

- 向量保存在现有存储层的文档/知识库切片中，当前进行进程内精确检索，尚未接入 sqlite-vec/pgvector；适用于小规模知识库。
- 熔断和文献限频为单进程状态，多实例部署需统一协调；检索覆盖受各来源的返回条数和配额限制。
- Anthropic、Gemini、Ollama 当前完整获取回答后通过统一事件交付；尚未实现原生逐 Token 流。
- MCP 样板为进程内 SDK 服务，不支持用户任意添加远程 server 或本地执行命令。
- CodeAct 和 DreamPaper 代码执行保持禁用；Text2SQL 仍是显式演示数据，生成 SQL 不代表实际查询数据库。
- 记忆证据逐字校验只能验证出处，不能证明模型归纳语义完全正确；科研事实应允许用户复核、修改和删除。
