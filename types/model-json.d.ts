declare module '@/lib/model-json' {
  export function extractJson(raw: string): Record<string, any> | null;
  export function extractPlainQuestion(raw: string): string;
}
