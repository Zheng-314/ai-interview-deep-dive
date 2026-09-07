import { NextResponse } from 'next/server';
import { buildPrompt } from '@/lib/prompts';
import { InterviewState, InterviewResponse } from '@/types/interview';
import { fallbackQuestion, phaseFor } from '@/lib/interview-flow';
import { extractJson, extractPlainQuestion } from '@/lib/model-json';
export const runtime = 'nodejs';

async function callModel(prompt: string) {
  const response = await fetch('https://api.deepseek.com/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` }, body: JSON.stringify({ model: process.env.DEEPSEEK_MODEL || 'deepseek-chat', temperature: 0.4, messages: [{ role: 'user', content: prompt }] }) });
  if (!response.ok) throw new Error('model_http_' + response.status);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function POST(req: Request) {
  try {
    const { state, answer } = await req.json() as { state: InterviewState; answer?: string };
    if (!process.env.DEEPSEEK_API_KEY) return NextResponse.json({ error: '尚未配置 DEEPSEEK_API_KEY，请在 .env.local 本地填写后重启服务' }, { status: 500 });
    const prompt = buildPrompt(state, answer);
    let parsed = null; let raw = '';
    for (let attempt = 0; attempt < 2 && !parsed; attempt++) { raw = await callModel(prompt); parsed = extractJson(raw); }
    if (!parsed) {
      const degraded = extractPlainQuestion(raw);
      if (!degraded) return NextResponse.json({ error: '模型返回格式异常，请重试' }, { status: 502 });
      parsed = { question: degraded, topic: state.currentTopic, depth: state.currentDepth, followUpReason: '格式降级解析' };
    }
    const finalAnswer = !!answer && state.currentRound >= state.maxRounds;
    const phase = phaseFor(answer ? state.currentRound : 0);
    const safeQuestion = typeof parsed.question === 'string' && parsed.question.trim() ? parsed.question.trim() : fallbackQuestion(phase, state.interviewMode);
    const weakness = answer && parsed.weakness ? { round: state.currentRound, ...parsed.weakness } : undefined;
    const updatedMessages = answer ? state.messages.map((m, index) => index === state.messages.length - 1 ? { ...m, answer } : m) : [{ round: 1, question: safeQuestion, depth: '开场' as const, followUpReason: '完整模拟面试从自我介绍开始' }];
    const nextRound = answer ? state.currentRound + 1 : 1;
    const nextState: InterviewState = { ...state, interviewMode: state.interviewMode, currentRound: nextRound, currentDepth: finalAnswer ? state.currentDepth : (parsed.depth || '中'), currentTopic: parsed.topic || state.currentTopic, coveredTopics: parsed.topic && !state.coveredTopics.includes(parsed.topic) ? [...state.coveredTopics, parsed.topic] : state.coveredTopics, messages: finalAnswer ? updatedMessages : answer ? [...updatedMessages, { round: nextRound, question: safeQuestion, depth: parsed.depth || '中', followUpReason: parsed.followUpReason }] : updatedMessages, weaknesses: weakness ? [...state.weaknesses, weakness] : state.weaknesses, closingMessage: finalAnswer ? parsed.closingMessage || '本次模拟到这里结束。请优先补强最薄弱的两个方向，再进行下一轮练习。' : undefined };
    return NextResponse.json({ question: finalAnswer ? undefined : safeQuestion, state: nextState, weakness, isFinished: finalAnswer } satisfies InterviewResponse);
  } catch { return NextResponse.json({ error: '模型调用失败，请稍后重试' }, { status: 502 }); }
}
