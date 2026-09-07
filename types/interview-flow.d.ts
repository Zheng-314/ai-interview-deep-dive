declare module '@/lib/interview-flow' {
  export const PHASES: { INTRO: string; PROJECT: string; SCENARIO: string; CLOSING: string };
  export function phaseFor(answered: number): string;
  export function phaseLabel(phase: string, mode?: string): string;
  export function fallbackQuestion(phase: string, mode?: string): string;
  export function isAnswerableQuestion(question: unknown): boolean;
}
