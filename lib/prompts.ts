import { InterviewState } from '@/types/interview';
import { closingPhaseText, toneRule, focusText } from '@/lib/prompt-core';

export function buildPrompt(state: InterviewState, answer?: string) {
  const history = state.messages.map(m => `第${m.round}轮【${m.depth}】问题：${m.question}\n回答：${m.answer || '（待回答）'}`).join('\n\n');
  const isOpening = !answer && state.currentRound === 0;
  const isFinal = !!answer && state.currentRound >= state.maxRounds;
  let phase = '';
  if (isOpening) {
    phase = '第 1 段·自我介绍（1轮）：请邀请候选人进行 60-90 秒自我介绍。不要立刻深挖项目。';
  } else if (isFinal) {
    phase = closingPhaseText(state.interviewTone);
  } else if (state.currentRound === 1) {
    phase = '第 2 段·项目讲解（第1/5轮）：自我介绍结束。请邀请候选人开始介绍简历中与目标岗位最相关的一个项目，先让候选人完整讲项目，不要马上连续追问。';
  } else if (state.currentRound >= 2 && state.currentRound <= 5) {
    phase = `第 2 段·项目讲解（第${state.currentRound}/5轮）：围绕候选人刚才介绍的同一个项目继续追问，逐步了解背景、目标、用户/业务问题、方案、个人贡献和结果。不要跳到另一个项目。`;
  } else {
    phase = `第 3 段·岗位场景追问（第${state.currentRound - 5}/5轮）：结合目标 JD，围绕刚才的项目追问候选人在岗位场景中的判断与行动。当前模式是${state.interviewMode}面，重点考察${focusText(state.interviewMode)}。不要脱离项目变成泛泛的八股题。`;
  }
  return `你是严格、真实且有帮助的面试官。你正在执行一场完整的模拟面试，必须遵循固定流程：自我介绍 1 轮 → 项目讲解 5 轮 → 结合岗位场景追问 5 轮 → 肯定、鼓励、总结并结束。总共 11 轮候选人回答，最后输出总结，不再提问。\n\n目标岗位 JD：\n${state.jdText}\n\n候选人简历：\n${state.resumeText}\n\n当前状态：第 ${state.currentRound}/${state.maxRounds} 轮；岗位模式=${state.interviewMode}；面试氛围=${state.interviewTone}；当前主题=${state.currentTopic || '待确定'}；已覆盖=${state.coveredTopics.join('、') || '无'}。\n\n本轮任务：${phase}\n\n${toneRule(state.interviewTone)}\n\n历史对话：\n${history || '无'}\n${answer ? `\n候选人本轮回答：\n${answer}` : ''}\n\n只返回 JSON，不要 Markdown：{"question":"下一道问题（除总结结束外必须是非空的具体问题）","topic":"当前考察主题","depth":"开场|浅|中|深","followUpReason":"为什么这样追问","interviewMode":"产品|技术","weakness":{"topic":"薄弱点主题","evidence":"回答中的证据","suggestion":"改进建议"},"closingMessage":"仅在总结结束时填写：具体肯定、亮点引用、最优先补强的 2 个方向和鼓励，并明确说本次面试到这里结束；否则空字符串"}。对于产品岗，岗位场景重点是产品思考而非技术实现；对于技术岗，重点是实现与技术判断。`;
}
