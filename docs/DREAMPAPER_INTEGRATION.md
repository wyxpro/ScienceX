# DreamPaper 项目分析与 ScienceX 对接文档

> 源仓库：<https://github.com/dream-rec/dreampaper>  
> 版本：v0.2.0 · 许可：**PolyForm Noncommercial 1.0.0**（允许个人学习/研究/修改分发，禁止商业使用）  
> 分析日期：2026-10

---

## 一、项目概述

DreamPaper 是一款**本地科研配图与学术幻灯片 AI 生成工具**，采用"两阶段设计"（先抽结构/母版风格，再填内容）思路，支持：

| 模块 | 功能 |
|------|------|
| 科研图生成 | 选 PaperBananaBench 模板作 few-shot → Design 模型规划布局 → Implement 模型出图 |
| 幻灯片生成 | 上传母版图 → 分析版式 → 逐页规划 → 批量制图（最多 20 页） |
| 工作台 | 生成图后期修复（框选乱码/错字 → OCR 识别 → 可编辑文字层 → 无损导出） |
| 案例记忆 | FTS5 召回历史相似任务 + Advisor 比对给出版式建议 |
| 模型配置 | Design / Implement / Search 三角色独立配置，兼容 OpenAI / Anthropic / image2 / banana2 |
| 离线 OCR | 纯 Rust + ONNX Runtime + PP-OCRv6，图片不出本机 |

---

## 二、技术栈对比

| 维度 | DreamPaper | ScienceX |
|------|-----------|----------|
| 前端 | React 19 + Vite 7 + TypeScript 5.8 + Konva 10 | React 18.3 + Vite 5.4 + TypeScript 5.5 |
| 后端 | Python 3.10+ / FastAPI (Web) + Rust/Tauri 2 (桌面) | Node.js 18+ / Express 4.19 |
| 桌面壳 | Tauri 2 + Rust sidecar | 无（纯 Web SPA） |
| 数据 | `~/.dreampaper/` JSON 文件 + SQLite FTS5 | JSON 文件 store.js（目标 PostgreSQL） |
| AI 通信 | 同步 HTTP（OpenAI / Anthropic / image2 协议） | SSE 流式（OpenAI 兼容） |
| 构建 | npm + cargo + python | npm |
| 许可 | PolyForm Noncommercial | MIT |

---

## 三、优缺点与结合点分析

### 3.1 优点表

| # | 优点 | 价值说明 | 与 ScienceX 结合点 |
|---|------|---------|-------------------|
| 1 | **两阶段 Design → Implement 流水线** | 结构与内容解耦，减少风格漂移 | ScienceX「论文写作」「投稿准备」页可新增"AI 科研配图"功能 |
| 2 | **完整 Prompt 工程体系** | prompts/ 目录含 12+ 专业 md 模板，覆盖 diagram / plot / PPT / validator | 直接移植到 ScienceX AI 层 lib/ai.js 的 prompt 拼接逻辑 |
| 3 | **模型 Profile 多角色配置** | design / implement / search 分离，支持 6 种协议 | ScienceX 的 ModelsSection 可参考其协议下拉 + output_defaults 设计 |
| 4 | **Job 阶段权重进度体系** | PAPER_STAGE_WEIGHTS / PPT_STAGE_WEIGHTS 精确映射 30+ 阶段 | 替换 ScienceX 当前粗粒度 TaskRunner，实现细粒度进度条 |
| 5 | **错误诊断卡** | JobError 携带 role / profile / endpoint / HTTP status / suggestion | 补充 ScienceX 后端的错误返回结构，前端展示诊断面板 |
| 6 | **Design Log 流式可展开面板** | useDesignLogs hook 按 begin/delta/end 事件拼接卡片 | 对齐 ScienceX 的 SSE delta 流，增加"AI 思考过程"可折叠日志 |
| 7 | **Konva 画布工作台** | 选区→OCR→修字→裁剪→无损导出 | ScienceX Reader 未来可参考其 canvas 选区交互做图片批注 |
| 8 | **i18n copy 对象模式** | 无额外库，零依赖中英切换 | ScienceX 可采纳同模式做轻量 i18n（目前纯中文） |
| 9 | **案例记忆 + FTS5 + Advisor** | 历史产物入库→二元组召回→评分反哺 | ScienceX 知识库可参考此"评分→召回排序"反馈链路 |

### 3.2 缺点 / 风险表

| # | 缺点/风险 | 影响 |
|---|----------|------|
| 1 | **PolyForm Noncommercial 许可** | 不可直接复制代码到商业项目；学习/参考思路合法，**源码级复用必须标注出处且禁止商用** |
| 2 | Python/Rust 后端 | 无法直接复用 server 代码到 Node.js/Express；只能移植思路或做微服务对接 |
| 3 | 强依赖 Tauri + Rust sidecar | 工作台 OCR、事件总线等仅桌面版可用，Web 端是降级 stub |
| 4 | 无用户体系 / 无鉴权 | 与 ScienceX 的多租户 + JWT 架构完全不同 |
| 5 | 无流式 AI | 全部同步 HTTP，与 ScienceX 的 SSE 事件流架构不兼容 |
| 6 | 无版本控制 API | Job 状态仅 1.8s 轮询，无 webhook 或 SSE 推送（桌面用 event bus 替代） |
| 7 | PaperBananaBench 不附带 | 需用户额外下载 266MB 模板库，非开箱即用 |
| 8 | React 19 新特性 | 使用了 `inert` 属性、React 19 hooks 变更，不能直接 copy 到 React 18 项目 |

### 3.3 架构结合点图

```
ScienceX (Web SPA + Express)
├── 文献阅读 (Reader) ← 已有 hexo-document-viewer 对接
├── 论文写作 (Writing)  ─┐
├── 投稿准备 (Submission) ─┤→ 新增 [AI 科研配图] 页面
├── 实验设计 (Experiment) ─┘   ├─ Prompt 工程复用
│                              ├─ 进度追踪参考
├── Account > ModelsSection ←─ 多角色 Profile + output_defaults
├── TaskRunner / SSE ←──────── Design Log 流式面板
└── 知识库 / RAG ←─────────── 案例记忆评分召回
```

---

## 四、可直接复用 / 高参考性文件清单

| 文件路径 | 复用级别 | 说明 |
|---------|---------|------|
| `prompts/` 全部 12 个 .md | ✅ **可直接复用** | 纯文本 prompt 模板，与语言/框架无关；diagram design / plot rules / PPT master / validator 等 |
| `prompts/global/visual_terms.json` | ✅ **可直接复用** | 视觉主体词库，辅助图片生成时标注实物/产品/logo |
| `src/app.tsx` 中 `PAPER_STAGE_WEIGHTS` / `PPT_STAGE_WEIGHTS` | 📐 **高参考性** | 30+ 阶段的百分比进度映射表，可转为 ScienceX 任务进度配置 |
| `src/types.ts` → `JobRecord` / `JobError` / `JobEvent` 接口 | 📐 **高参考性** | 比 ScienceX 现有 TaskRunner 更丰富的 Job 数据模型 |
| `backend/app/prompts.py` (27 行) | 📐 **易移植** | PromptStore + compose_prompt 拼接逻辑，可直接翻译为 JS |
| `backend/app/adapters.py` 协议分发设计 | 📐 **设计参考** | normalize_base_url / 多协议端点路由 / ModelAdapterError 诊断结构 |
| `src/api.ts` 轮询 + event listen 模式 | 📐 **模式参考** | useJobPolling / listenDesignLog 可映射为 ScienceX 的 SSE 订阅 |
| `src/app.tsx` 中 `copy` 对象 (i18n) | 📐 **模式参考** | 零依赖中英 copy 对象，ScienceX 可采纳 |
| `src/workbench/geom.ts` 几何算法 | ⚠️ **有条件复用** | zoom / constrain / crop 纯数学函数，需标注出处；Noncommercial 限制 |
| `src/app.tsx` JobPanel 组件 UI 结构 | ⚠️ **UI 参考** | Circular progress + step-log + error-diagnostic 三合一面板设计 |

---

## 五、对接方案建议

### 5.1 短期可落地（1–2 天）

1. **AI 科研配图功能入口**  
   - 新建 `frontend/src/pages/Figure.tsx`，选"论文方法段落 + 上传参考模板 → 生成配图"
   - 复用 DreamPaper 的 `prompts/modes/paper_figure/` 全部 .md 作为 prompt 链路
   - 后端新增 `/api/figure/generate` 路由，调用 ScienceX model-gateway 走 image generation

2. **Job 进度升级**  
   - 在 TaskRunner 中引入 stage-weight 映射（参考 PAPER_STAGE_WEIGHTS），将 SSE `progress` 事件的 stage 字段换算为真实百分比
   - 新增 Design Log 可折叠面板（参考 JobPanel 中的 `<design-log>` 组件结构）

3. **错误诊断卡**  
   - 后端 `model-gateway.js` 异常时补充 `{ role, profile_id, endpoint, http_status, suggestion }` 字段
   - TaskRunner / Chat 展示时映射为 ScienceX 风格诊断面板

### 5.2 中期对接（1 周）

4. **幻灯片 AI 生成模块**  
   - 在 `Writing.tsx` 或新建 `Slide.tsx` 页面，上传母版图 → 输入资料 → 逐页生成学术 PPT  
   - 复用 `prompts/modes/ppt_slide/design.md` + `analyzer.md` + `master_rules.md`  
   - visual_terms.json 做实物/logo 检索增强

5. **多模型 Profile 管理**  
   - Account → ModelsSection 参考 DreamPaper 的 design/implement/search 三角色 + protocol 下拉 + output_defaults 设计  
   - 扩展 `model-gateway.js` 支持 image2 / banana2 出图协议

6. **轻量 i18n**  
   - 参考 `copy` 对象模式，抽取中文硬编码到 locale 文件

### 5.3 长期演进（2+ 周）

7. **图片工作台**（需评估许可风险）  
   - ScienceX 若走商业路线，需用自己实现替代或仅参考交互模式（选区→修字→导出）  
   - Konva 画布 + 离线 OCR 思路可移植，但代码需重写（非 copy）

8. **案例记忆反馈链**  
   - 知识库增加"产物评分→FTS5 相似召回→Advisor prompt 注入"闭环  
   - 当前 ScienceX RAG 已有向量检索，补充结构化案例召回

---

## 六、许可合规提醒

```
PolyForm Noncommercial 1.0.0
├─ 允许：学习、研究、修改源码、分发附带此协议的衍生
├─ 禁止：公司内部生产、对外付费/商业服务、商品出售
└─ 结论：
   ① ScienceX 作为学术/个人项目使用 → 可复用 prompts/ + 参考设计模式
   ② 若未来 ScienceX 商业化 → 仅参考思路架构，不得直接搬运代码
   ③ 无论哪种情况，复用文件须保留 Required Notice: Copyright (c) 2026 dream-rec
```

---

## 七、核心 Prompt 文件速览

| 文件 | 用途 | 可直接搬入 ScienceX 的场景 |
|------|------|---------------------------|
| `prompts/modes/paper_figure/design.md` | 科研图第二阶段：内容清单→模块→连接→implement_prompt | lib/ai.js 的 figure prompt |
| `prompts/modes/paper_figure/structure.md` | 第一阶段：模板图片→结构 plan | 配图模板风格抽取 |
| `prompts/modes/paper_figure/diagram_rules.md` | 流程图/架构图绘制规则约束 | 生成方法论框架图 |
| `prompts/modes/paper_figure/plot_rules.md` | 统计图表规范 | 实验数据可视化 |
| `prompts/modes/paper_figure/validator.md` | 质量校验 prompt | 生成后二次评估 |
| `prompts/modes/ppt_slide/design.md` | 幻灯片单页/全 deck 规划 prompt | PPT 生成功能 |
| `prompts/modes/ppt_slide/analyzer.md` | 母版风格分析 prompt | 提取版式约束 |
| `prompts/modes/ppt_slide/master_rules.md` | 母版一致性硬约束 | 全 deck 风格保持 |
| `prompts/roles/advisor.md` | 案例比对+建议 prompt | 知识库反馈增强 |
| `prompts/global/system.md` | 全局系统 prompt 基础 | AI 层 system 配置 |
| `prompts/global/visual_terms.json` | 视觉主体词库（900+条） | 图文匹配/检索 |
| `prompts/global/figure_style.md` | 学术图风格约束 | 配图风格统一 |

---

## 八、总结

| 维度 | 结论 |
|------|------|
| **定位互补性** | ScienceX 覆盖科研全流程但 AI 生成图/表为 mock；DreamPaper 专注"配图+幻灯片"且 pipeline 成熟 |
| **技术差异** | Python+Rust vs Node.js；Tauri 桌面 vs Web SPA；同步 vs SSE — 不能整体 merge |
| **最佳策略** | **Prompt 直接复用 + 架构模式参考 + Job 进度/诊断模型移植** |
| **风险** | 许可 Noncommercial — 商业路线必须只学思路、不搬代码 |
| **最高 ROI** | prompts/ 目录 + stage-weight 进度体系 + 错误诊断卡（立即可用，零依赖冲突） |
