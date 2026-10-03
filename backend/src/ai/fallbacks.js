// Deterministic advice only: never fabricate papers, tool observations or measurements.
const { generateReply } = require('../lib/ai');
function planSteps() {
  return [
    { id: 'step_1', title: '检索与任务相关的真实文献', tool: 'arXiv 学术检索', status: 'waiting', desc: '核对来源、研究方法与局限', output: '' },
    { id: 'step_2', title: '设计验证方案并确认所需证据', tool: '科研建议', status: 'waiting', desc: '明确基线、数据划分和评价协议；此步骤仅生成建议', output: '' },
  ];
}
function planReport(query, steps) {
  return `## 科研任务计划\n\n任务：${query}\n\n${steps.map((s, i) => `${i + 1}. ${s.title}：${s.output}`).join('\n\n')}\n\n当前报告仅整理可核验的工具输出与建议；未运行实验，无法给出定量结论。`;
}
function structured(query) {
  const jsonSchema = { research_question: query, evidence_status: '需要补充原文与实验记录', dataset: null, protocol: null, measured_results: [], next_steps: ['确定数据集和基线', '定义评价协议', '运行实验后填入真实结果'] };
  return { jsonSchema, text: `### 待验证的科研结构\n\n没有实验数据，数值字段保持空缺。\n\n\`\`\`json\n${JSON.stringify(jsonSchema, null, 2)}\n\`\`\`` };
}
module.exports = { planSteps, planReport, structured, reply: generateReply };
