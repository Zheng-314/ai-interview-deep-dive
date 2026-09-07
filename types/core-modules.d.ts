declare module '@/lib/prompt-core' {
  export function closingPhaseText(tone: string): string;
  export function toneRule(tone: string): string;
  export function focusText(mode: string): string;
}
declare module '@/lib/report-core' {
  export function prioritySuggestions(weaknesses: Array<{ topic: string; suggestion: string }>): string;
  export function encouragement(): string;
  export function esc(s: string): string;
}
declare module '@/lib/file-policy' {
  export function decideFile(fileType: string, fileSizeBytes: number): { ok: boolean; kind?: string; error?: string };
}
