# STORY.md — ScienceX · AI 科研工作台 · 项目路演答辩

## ① 用户意图对齐

- **目标受众**：路演 / 答辩评审现场，面向评审专家、潜在合作方与导师（懂科研、重证据、时间宝贵的专业观众）。
- **核心目标**：讲完后让观众相信——ScienceX 是**真正覆盖科研全流程**的 AI 工作台，而非又一个「单点聊天框」；记住三大记忆点：① 8 大痛点 → 60%+ 重复劳动被 AI 承接；② 全流程闭环 + 多智能体专家评审团（首创）；③ 全五星口碑实测。并期待扫码体验 / 交流合作。
- **PPT 长度**：22 页 → Hero 页配额约 4–6 页（封面、结束页默认 Hero，中段按内容高潮选）。
- **视觉调性**：权威严谨 · 温润智性 · 次世代敏捷（暖纸底 + 墨绿 + 琥珀金 + 学术衬线）。
- **内容边界**：必讲——痛点-解法映射、全流程闭环、技术双轨架构、商业模式四档定价、实测口碑；禁碰——虚构公式/数据（所有数字取自 `PRD.md`/`fx.md`/`ai.md`/官网源码）。

## ② 页面布局骨架

### 页面总数与分章（22 页，4 章 + 封面/目录/结束页）

- **前置**：P00 封面(hero) · P01 目录(supporting)
- **Part 01 需求洞察**：P02 扉页(transition) · P03 痛点映射(supporting)
- **Part 02 团队及产品**：P04 扉页(transition) · P05 团队(supporting) · P06 文案金句(supporting) · P07 项目简介(supporting) · P08 用户画像(supporting) · P09 核心功能(supporting) · P10 竞品对比(supporting) · P11 评分亮点(hero-peak)
- **Part 03 技术解析**：P12 扉页(transition) · P13 架构(supporting) · P14 UI设计(supporting) · P15 后端(supporting) · P16 AI能力(hero-peak)
- **Part 04 商业模式**：P17 扉页(transition) · P18 商业模式(supporting) · P19 行业价值(supporting) · P20 公益计划(supporting)
- **收尾**：P21 结束页(hero)

### 目录↔章节扉页契约（目录声明 4 章，须 4 个 `type: section` 扉页，编号连续）

- 目录第 1 章「01 需求洞察」→ P02 扉页（编号 01）
- 目录第 2 章「02 团队及产品介绍」→ P04 扉页（编号 02）
- 目录第 3 章「03 技术解析及亮点」→ P12 扉页（编号 03）
- 目录第 4 章「04 商业模式及创新」→ P17 扉页（编号 04）
（4 个扉页齐全、编号 01–04 连续 ✓）

### Hero 页定位与 rhythm 曲线

- Hero：P00 封面(peak) · P11 评分亮点(peak) · P16 AI能力(peak) · P21 结束页(peak)。占比 4/22 ≈ 18%（内容高密路演略低，靠 P03/P10/P13 等表格/架构页做强支撑）。任意两 Hero 间均有 ≥1 个 supporting ✓
- rhythm：P00 peak → P01 valley → P02 transition → P03 peak-ish(表格爆发) → P04 transition → P05-P10 valley 连排 → P11 peak → P12 transition → P13-P15 valley → P16 peak → P17 transition → P18-P20 valley → P21 peak。P05–P10 连续 6 个 valley 偏长，故将 P07（项目简介·流程链条）与 P10（竞品高亮对比）设为 **peak-ish**（加入流程链条视觉锤 / 绿色高亮列）打破沉闷。

### 非对称版式预算（≥40%）

22 页中非对称版式约 11 页（≥50%）：P00(左文右图非对称)、P03(左右映射)、P05(三联卡中间抬升)、P07(三列卡+流程链)、P08(三联图文卡)、P11(左巨数+右评分)、P13(分层架构横带)、P14(左文右图)、P15(左右分栏)、P16(三段纵向流+终端窗)、P20(阶梯抬升)。对称版式预算 ≤2：P01(目录)、P18(定价阶梯)。

## ③ 页面大纲（逐页字段：title / type / role / rhythm / layout / visual / visual_role / density / anti_pattern / description）

详见下方逐页描述（与 ppt.md 的 P00–P21 一一对应）。所有关键数据均附「数据 + 判断」两段式 description。

（以下 22 页骨架与最终交付内容一致，具体文案见各页 .slide 源文件。）
