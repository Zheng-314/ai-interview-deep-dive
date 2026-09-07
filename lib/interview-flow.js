const PHASES = Object.freeze({ INTRO: 'intro', PROJECT: 'project', SCENARIO: 'scenario', CLOSING: 'closing' });
function phaseFor(answered) { if (answered <= 0) return PHASES.INTRO; if (answered <= 5) return PHASES.PROJECT; if (answered <= 10) return PHASES.SCENARIO; return PHASES.CLOSING; }
function phaseLabel(phase, mode) { return ({ intro: '自我介绍', project: '项目讲解', scenario: `${mode || '岗位'}场景追问`, closing: '总结与结束' })[phase]; }
function fallbackQuestion(phase, mode) { return ({ intro: '请先做一个 60-90 秒的自我介绍，重点说说与你应聘岗位相关的经历。', project: '请开始介绍简历中与你目标岗位最相关的一个项目：当时为什么做、目标是什么？', scenario: mode === '产品' ? '如果把这个项目放到目标岗位的真实业务场景中，你会如何判断用户需求是否成立？' : '如果这个项目进入真实生产环境，你会如何验证它的稳定性和效果？', closing: '' })[phase]; }
function isAnswerableQuestion(q) { return typeof q === 'string' && q.trim().length > 0; }
module.exports = { PHASES, phaseFor, phaseLabel, fallbackQuestion, isAnswerableQuestion };
