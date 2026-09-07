// 解析模型返回的脏 JSON：容忍 ```json 包裹、前后杂文字；支持重试与降级
function extractJson(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const start = cleaned.indexOf('{'); const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) { try { return JSON.parse(cleaned.slice(start, end + 1)); } catch {} }
  return null;
}
function extractPlainQuestion(raw) {
  if (typeof raw !== 'string') return '';
  const cleaned = raw.replace(/```json[\s\S]*?```/g, ' ').replace(/[{}"]/g, ' ').trim();
  const sentences = cleaned.split(/(?<=[。？?!])\s*/).filter(s => s.trim().length >= 8);
  return sentences[0] ? sentences[0].trim() : '';
}
module.exports = { extractJson, extractPlainQuestion };
