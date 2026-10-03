/* DreamPaper 路由冒烟测试：登录 → 提交三类任务 → 轮询至终态 → 校验产物结构 */
const BASE = 'http://127.0.0.1:' + (process.env.SMOKE_PORT || '8790') + '/api/v1';
let token = '';

async function call(path, opts = {}) {
  const res = await fetch(BASE + path, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(`${path} -> ${json.code} ${json.message}`);
  return json.data;
}

async function waitFor(jobId, timeoutMs = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const job = await call(`/dreampaper/jobs/${jobId}`);
    if (['succeeded', 'failed'].includes(job.status)) return job;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('任务超时未完成');
}

function assert(cond, msg) { if (!cond) throw new Error('断言失败: ' + msg); }

(async () => {
  const login = await call('/auth/login', { method: 'POST', body: { email: 'demo@sciencex.cn', password: '123456' } });
  token = login.token || login.access_token;
  assert(token, '登录应返回 token');

  const tpls = await call('/dreampaper/templates');
  assert(Array.isArray(tpls.items) && tpls.items.length >= 6, '模板库应返回条目');
  assert(String(tpls.notice).includes('PolyForm'), '模板响应应带许可声明');

  /* 1. 科研配图 */
  const fig = await call('/dreampaper/jobs', { method: 'POST', body: { mode: 'paper_figure', payload: { title: '冒烟测试图', method: '输入 → 编码 → 融合 → 输出', template_ids: [tpls.items[0].id] } } });
  const figJob = await waitFor(fig.job_id);
  assert(figJob.status === 'succeeded', '科研配图任务应成功');
  assert(figJob.result?.kind === 'diagram' && Array.isArray(figJob.result.spec?.stages) && figJob.result.spec.stages.length >= 2, 'diagram spec 应含 stages');
  assert(figJob.design_logs.length >= 5, '科研配图应有多条 Design Log');
  console.log('[OK] paper_figure:', figJob.result.spec.stages.map((s) => s.name).join(' → '), '| logs =', figJob.design_logs.length);

  /* 2. 统计图表 */
  const plot = await call('/dreampaper/jobs', { method: 'POST', body: { mode: 'plot_chart', payload: { title: '冒烟柱状图', data: 'baseline=0.65, ours=0.83', chart_type: 'bar' } } });
  const plotJob = await waitFor(plot.job_id);
  assert(plotJob.status === 'succeeded', '统计图表任务应成功');
  assert(plotJob.result?.spec?.series?.length >= 2, 'plot spec 应解析出数据序列');
  console.log('[OK] plot_chart: series =', plotJob.result.spec.series.map((s) => `${s.label}=${s.value}`).join(', '));

  /* 3. 幻灯片 + 评分 */
  const deck = await call('/dreampaper/jobs', { method: 'POST', body: { mode: 'ppt_slide', payload: { title: '冒烟汇报', pages: 4, material: '实验进展汇报' } } });
  const deckJob = await waitFor(deck.job_id);
  assert(deckJob.status === 'succeeded', '幻灯片任务应成功');
  assert(deckJob.result?.pages?.length === 4, 'deck 应生成 4 页');
  const rated = await call(`/dreampaper/jobs/${deckJob.id}/rate`, { method: 'POST', body: { rating: 'good' } });
  assert(rated.rating === 'good', '评分应写入案例记忆');
  console.log('[OK] ppt_slide: pages =', deckJob.result.pages.length, '| rating =', rated.rating);

  /* 4. 参数校验 */
  let rejected = false;
  try { await call('/dreampaper/jobs', { method: 'POST', body: { mode: 'unknown' } }); } catch { rejected = true; }
  assert(rejected, '非法 mode 应被拒绝');
  console.log('[OK] param guard: 非法 mode 被拒绝');
  console.log('\n全部冒烟断言通过 ✔');
  process.exit(0);
})().catch((err) => { console.error('[SMOKE FAIL]', err.message); process.exit(1); });
