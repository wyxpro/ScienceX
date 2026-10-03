const version = '2026-10-04.v1';
function generateTopicProposals({ direction, background, count }) { return `请针对科研方向「${direction}」${background ? `，结合研究背景「${background}」` : ''}，生成 ${count} 个高质量的学术选题建议。
要求每个选题包含：
1. 选题名称 (title)
2. 推荐度评分 (score，百分比)
3. 核心创新点与理论动机 (innovation)
4. 预期风险与可行性评估 (feasibility)
5. 适用的数据集与评测基准 (datasets)
请以严谨的学术中文呈现，格式清晰。`; }
function generateReviewOutline({ topic, focus }) { return `请为主题为「${topic}」（重点关注：${focus}）撰写一份完整的学术文献综述结构大纲与核心内容：
1. 背景与核心挑战（数据稀缺、类别不均衡、跨域泛化等）
2. 数据集与经典实验协议规范
3. 代表性方法演化脉络（结构偏置演进、技术演化逻辑）
4. 统一评测对比维度设计
5. 开放性难题与未来展望
格式使用 Markdown，条理分明，语言严谨。`; }
function askDocumentQA({ docTitle, contextSnippet, query }) { return `【当前论文标题】：《${docTitle || '未命名论文'}》
【论文相关片段内容】：
"""
${contextSnippet}
"""

【用户提问】：
${query}

请严格基于上述论文片段内容回答用户的问题。
回答要求：
1. 忠实于原文，不得凭空捏造数据、指标或实验结论；
2. 如果论文内容足以回答，请给出清晰条理的解答，并标明依据的章节或上下文事实；
3. 如果给定片段缺乏足够信息，请明确诚实说明「文档当前片段未提及该信息」。`; }
function translateAcademicText({ direction, glossaryInstruction }) { return `你是计算机与 AI 顶会的专业学术论文翻译助手。
任务：将给定的学术文本${direction === 'en2zh' ? '精确翻译为中文' : '精确翻译为地道的学术英文'}。
要求：
1. 保留所有专业术语、公式变量、引用格式（如 [1], et al.）、代码标签；
2. 语言风格严谨精炼，符合科技文献发表规范；
3. 只直接输出翻译后的正文，严禁添加任何前缀、解释、引言或无关修饰。${glossaryInstruction}`; }
function polishAcademicText({ text, style, target }) { return `请对以下学术英文段落进行专业润色：
【原文】：
${text}

【目标风格】：${style}（${target ? `面向投递：${target}` : '顶级学术会议或期刊标准'}）

润色重点：
1. 替换口语化表达为地道学术词汇；
2. 消除主谓冗余与被动语态堆叠，提升论证连贯性；
3. 精准化量化表述（如相对提升、显著性说明）。

输出规范：
请以 JSON 格式输出，不要包含 Markdown 围栏符号，格式如下：
{
  "polished": "润色后的完整学术正文",
  "changes": [
    { "type": "词汇升级|句式优化|学术表达", "from": "原词句", "to": "改后词句", "reason": "修改缘由" }
  ]
}`; }
function paraphraseAcademicText({ text, ratio }) { return `请对以下高重复率的学术段落进行深度重构降重改写：
【原文】：
${text}

【降重强度】：${ratio}（轻度 / 中度 / 深度）

改写准则：
1. 核心科学事实、数据指标、专有名词严禁歪曲；
2. 改变句法结构（主被动转换、从句重组、分词短语替换、语态重塑）；
3. 替换同义学术学术表述，打散连续重复片段。

请以 JSON 格式输出，不要包含 Markdown 围栏符号，格式如下：
{
  "paraphrased": "改写后的降重文本",
  "similarity_reduction": "预估重复率下降比例（如 65% -> 12%）",
  "semantic_score": 0.95,
  "diff": [
    { "type": "del", "text": "被替换的短语" },
    { "type": "ins", "text": "替换后的学术新表述" }
  ]
}`; }
function enhanceScholarlyPrompt({ rawPrompt, researchContext }) { return `用户原始输入的提问/指令为：
"${rawPrompt}"

${researchContext ? `用户科研背景与上下文：${researchContext}` : ''}

请将该提问重构成一段结构化、严谨且可执行性极高的「资深科研顾问元提示词（Scholarly Meta-Prompt）」。
增强要求：
1. 设定资深科研专家/审稿人角色边界；
2. 明确输出契约（结论先行、分点论述、引入近三年顶会代表作对比）；
3. 补充针对性的量化验证要求（如显著性检验、基准协议、消融指标）；
4. 保持用户原意，不改变核心提问方向。

直接返回优化后的提示词正文，不要有多余寒暄。`; }
function generateReviewCouncil({ title, abstract, content }) { return `请对以下论文稿件开展严谨的多视角审稿：
【论文标题】：《${title}》
【论文摘要】：${abstract}
${content ? `【论文部分正文】：\n${content.slice(0, 4000)}` : ''}

请分别扮演 5 位独立同行审稿人与主编主席：
1. 理论 Agent (Theory Reviewer): 审视理论创新、数学推导与边界假设
2. 方法 Agent (Method Reviewer): 审视网络架构、先验设计与机制合理性
3. 实验 Agent (Experiment Reviewer): 审视消融设计、LOSO 协议、统计显著性与种子纪律
4. 写作与伦理 Agent (Writing & Ethics Reviewer): 审视论文组织、图表严谨性与数据伦理
5. 主席 Agent (Meta Reviewer / AC): 汇总上述意见，给出最终决策与打分

严格只输出一个 JSON 对象，禁止 Markdown 围栏与任何解释性文字，结构如下：
{"decision":"Accept|Weak Accept|Borderline|Revision 之一","total_score":6.5,"scores":{"theory":6.5,"method":7.0,"experiment":5.5,"writing":7.5,"ethics":9.0},"summary":"主席总评，150字以内，指出核心贡献与主要风险","roles":[{"role":"理论审稿人","verdict":"accept|weak_accept|borderline|reject_risk 之一","comments":"该角色评审意见，100字内，指出具体问题与可执行的修改建议"},{"role":"方法审稿人","verdict":"...","comments":"..."},{"role":"实验审稿人","verdict":"...","comments":"..."},{"role":"写作审稿人","verdict":"...","comments":"..."},{"role":"伦理审稿人","verdict":"...","comments":"..."}],"priorities":[{"level":"P0","item":"最高优先级修改事项"}]}
要求：scores 各维度为 1-10 分（可含一位小数）；roles 必须恰好 5 条，依次为理论审稿人/方法审稿人/实验审稿人/写作审稿人/伦理审稿人；priorities 为 2-5 条。`; }
module.exports = { version, generateTopicProposals, generateReviewOutline, askDocumentQA, translateAcademicText, polishAcademicText, paraphraseAcademicText, enhanceScholarlyPrompt, generateReviewCouncil };
