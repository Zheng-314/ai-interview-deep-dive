export type Depth = '开场' | '浅' | '中' | '深';
export type InterviewMode = '产品' | '技术';
export type InterviewTone = '完整' | '轻松';
export type Message = { round: number; question: string; answer?: string; followUpReason?: string; depth: Depth };
export type Weakness = { round: number; topic: string; evidence: string; suggestion: string };
export type InterviewState = { jdText: string; resumeText: string; targetRole: string; interviewMode: InterviewMode; interviewTone: InterviewTone; currentRound: number; maxRounds: number; currentDepth: Depth; currentTopic: string; coveredTopics: string[]; messages: Message[]; weaknesses: Weakness[]; closingMessage?: string };
export type InterviewResponse = { question?: string; state?: InterviewState; weakness?: Weakness; isFinished?: boolean; error?: string };
