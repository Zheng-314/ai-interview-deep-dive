// 自动评测：通过本地服务真实跑完整面试链路，产出可复现的链路数据
// 用法：先启动服务（npm run dev），再 node scripts/eval.js
const fs = require('fs');
const path = require('path');

const BASE = process.env.EVAL_BASE || 'http://127.0.0.1:3000';
const RUNS = Number(process.env.EVAL_RUNS || 3);

const JD = `AI 产品经理（实习生）
职责：负责 AI 功能的需求定义与效果验证，参与用户调研与竞品分析，与技术团队协作推进功能落地，跟踪核心指标并迭代。
要求：本科及以上，对 AI 产品有热情；具备需求拆解和文档能力；会用数据说话；有项目经历优先。`;

const RESUME = `张同学，某大学软件工程专业大三。
项目经历：校园二手书交易小程序（负责需求调研与功能设计，服务 800+ 学生）；课程评价分析工具（爬取公开数据做情感分析，准确率 76%）。
技能：Python、SQL、Axure、基础数据分析。`;

// 模拟中等水平候选人的固定回答（11 轮）
const ANSWERS = [
  '面试官好，我是张同学，软件工程大三。做过校园二手书小程序的需求和设计，还有一个小型情感分析工具。对 AI 产品很感兴趣，想投这个实习岗位。',
  '二手书小程序是为了解决毕业生书卖不掉、新生买书贵的问题。我和两个同学做的，我负责需求调研和功能设计，上线后大概有 800 个学生用。',
  '调研就是发了问卷，大概 120 份，还访谈了 8 个同学。发现大家最在意的是价格不透明和信任问题，所以先做了定价参考和面交担保的设计。',
  '定价参考是参考二手平台均价加成色折算。指标主要看发布量和成交量，三个月成交了 300 多单，周活在 200 左右。',
  '最难的是信任问题，一开始有人挂假书。我们加了学号认证和举报机制，举报后 24 小时处理，后面差评就少了。',
  '我的贡献主要是需求调研、功能设计和部分测试，还有上线后在群里收集反馈迭代了两个版本。',
  '如果放到这个岗位，我会先明确目标用户和场景，比如先做小范围试点，用留存和复购验证需求是否成立，再决定加资源。',
  '我会看发布到成交的转化率和复购率，还会看纠纷率下降情况，设一个基线做对比，两周复盘一次。',
  '竞品方面我分析过两个类似产品，一个是全品类二手平台，一个是校园垂直的。垂直的优势是信任成本低，劣势是供给不稳定。',
  '这个项目教会我需求要回到真实场景，不能拍脑袋。也让我知道指标要提前定，不然做完说不清效果。',
  '不足是数据分析能力还不够扎实，情感分析那个项目准确率只有 76%，方法也比较简单，我想在实习中补上这块。'
];

const initialState = () => ({ jdText: JD, resumeText: RESUME, targetRole: '', interviewMode: '产品', interviewTone: '完整', currentRound: 0, maxRounds: 11, currentDepth: '开场', currentTopic: '', coveredTopics: [], messages: [], weaknesses: [] });

async function oneRun(label) {
  let state = initialState(); const rounds = []; let ok = true; let err = '';
  for (let i = 0; i <= ANSWERS.length && ok; i++) {
    const t0 = Date.now();
    try {
      const r = await fetch(`${BASE}/api/interview`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ state, answer: i === 0 ? undefined : ANSWERS[i - 1] }) });
      const d = await r.json();
      if (!r.ok) { ok = false; err = `round ${i + 1}: ${d.error || r.status}`; break; }
      const q = d.state?.messages?.[d.state.messages.length - 1];
      rounds.push({ round: i + 1, ms: Date.now() - t0, depth: q?.depth || '', topic: d.state?.currentTopic || '', qlen: (q?.question || '').length, degraded: (q?.followUpReason || '').includes('降级'), weakness: !!d.weakness, finished: !!d.isFinished });
      state = d.state;
    } catch (e) { ok = false; err = `round ${i + 1}: ${e.message}`; break; }
  }
  const finished = ok && state.closingMessage !== undefined;
  return { label, ok, finished, err, rounds, closing: state.closingMessage || '', topics: state.coveredTopics, weaknessCount: state.weaknesses.length };
}

(async () => {
  try { const h = await fetch(BASE); if (!h.ok) throw new Error('服务未就绪'); } catch (e) { console.error('请先启动服务：npm run dev （' + e.message + '）'); process.exit(1); }
  const runs = [];
  for (let i = 1; i <= RUNS; i++) { console.log(`▶ 第 ${i}/${RUNS} 次完整面试…`); runs.push(await oneRun(`run${i}`)); }
  const completed = runs.filter(r => r.finished).length;
  const allRounds = runs.flatMap(r => r.rounds);
  const avgMs = allRounds.length ? Math.round(allRounds.reduce((s, r) => s + r.ms, 0) / allRounds.length) : 0;
  const degraded = allRounds.filter(r => r.degraded).length;
  const emptyQ = allRounds.filter(r => r.qlen === 0 && !r.finished).length;
  const result = {
    date: new Date().toISOString(), base: BASE, runs: RUNS,
    linkCompletion: `${completed}/${RUNS}`, avgRoundMs: avgMs,
    totalRounds: allRounds.length, degradedRounds: degraded, emptyQuestionRounds: emptyQ,
    depthSequences: runs.map(r => r.rounds.map(x => x.depth).join('→')),
    avgTopicsPerRun: +(runs.reduce((s, r) => s + r.topics.length, 0) / RUNS).toFixed(1),
    runs: runs.map(({ rounds, ...rest }) => ({ ...rest, roundCount: rounds.length }))
  };
  fs.writeFileSync(path.join(__dirname, '..', 'eval-results.json'), JSON.stringify(result, null, 2));
  console.log('\n==== 评测摘要 ====');
  console.log(`链路完成率：${completed}/${RUNS}`);
  console.log(`平均单轮耗时：${avgMs}ms（${allRounds.length} 轮）`);
  console.log(`降级解析轮数：${degraded}，空问题轮数：${emptyQ}`);
  console.log(`深度序列：${result.depthSequences.join('  |  ')}`);
  console.log('结果已写入 eval-results.json');
})();
