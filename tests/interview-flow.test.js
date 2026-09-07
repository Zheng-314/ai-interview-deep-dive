const test = require('node:test');
const assert = require('node:assert/strict');
const { decideFile } = require('../lib/file-policy');
const { prioritySuggestions, encouragement, esc } = require('../lib/report-core');
const { closingPhaseText, toneRule, focusText } = require('../lib/prompt-core');
const { phaseFor, fallbackQuestion, isAnswerableQuestion, PHASES } = require('../lib/interview-flow');
const { extractJson, extractPlainQuestion } = require('../lib/model-json');

test('fixed interview phases never expose a blank question', () => { for (let i=0;i<=11;i++) { const p=phaseFor(i); if (p !== PHASES.CLOSING) assert.equal(isAnswerableQuestion(fallbackQuestion(p,'产品')), true); } });
test('phase boundaries are explicit', () => { assert.equal(phaseFor(0), PHASES.INTRO); assert.equal(phaseFor(1), PHASES.PROJECT); assert.equal(phaseFor(6), PHASES.SCENARIO); assert.equal(phaseFor(11), PHASES.CLOSING); });
test('scenario fallback respects interview mode', () => { assert.match(fallbackQuestion(PHASES.SCENARIO,'产品'), /用户需求/); assert.match(fallbackQuestion(PHASES.SCENARIO,'技术'), /生产环境/); });

test('pdf accepted, images honestly rejected without fake OCR', () => {
  assert.deepEqual(decideFile('application/pdf', 1000), { ok: true, kind: 'pdf' });
  const img = decideFile('image/png', 1000);
  assert.equal(img.ok, false); assert.match(img.error, /图片识别暂未开放/); assert.match(img.error, /粘贴|PDF/);
  assert.equal(decideFile('application/msword', 1000).ok, false);
  assert.equal(decideFile('application/pdf', 6 * 1024 * 1024).ok, false);
});

test('report dedupes priority suggestions by topic and escapes html', () => {
  const out = prioritySuggestions([{ topic:'指标度量', suggestion:'补测 30 条样本' }, { topic:'指标度量', suggestion:'重复项应合并' }, { topic:'需求验证', suggestion:'做 3 人访谈<b>' }]);
  assert.equal((out.match(/<li>/g)||[]).length, 2);
  assert.match(out, /补测 30 条样本/);
  assert.doesNotMatch(out, /<b>3 人访谈/);
  assert.equal(prioritySuggestions([]), '');
});

test('encouragement present and honest', () => { assert.match(encouragement(), /下一步/); assert.match(encouragement(), /下一轮/); });

test('closing and tone rules differ between light and full modes', () => {
  assert.match(closingPhaseText('轻松'), /鼓励/); assert.match(closingPhaseText('轻松'), /不.*打击自信/);
  assert.match(closingPhaseText('完整'), /专业且建设性/);
  assert.notEqual(toneRule('轻松'), toneRule('完整'));
  assert.match(toneRule('轻松'), /建立信心/); assert.match(toneRule('完整'), /正式面试/);
});

test('scenario focus respects job mode', () => {
  assert.match(focusText('产品'), /用户洞察|需求验证/);
  assert.match(focusText('技术'), /架构|技术选型/);
});

test('dirty model output parsed or degraded honestly', () => {
  assert.deepEqual(extractJson('{"question":"你好"}').question, '你好');
  assert.equal(extractJson('```json\n{"question":"带围栏"}\n```').question, '带围栏');
  assert.equal(extractJson('前置说明 {"question":"夹在中间"} 后缀').question, '夹在中间');
  assert.equal(extractJson('完全不是 JSON'), null);
  assert.equal(extractJson(''), null);
  const degraded = extractPlainQuestion('模型胡言乱语。请介绍你做过的项目？不要跑题');
  assert.match(degraded, /请介绍你做过的项目？/);
  assert.equal(extractPlainQuestion('```json{"a":1}```'), '');
});
