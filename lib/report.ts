import { InterviewState } from '@/types/interview';
import { prioritySuggestions, encouragement, esc } from '@/lib/report-core';

export function buildReport(state: InterviewState) {
  const rounds = state.messages.map(m => {
    const w = state.weaknesses.find(x => x.round === m.round);
    return `<article><div class="meta"><span class="badge">${m.depth}</span>第 ${m.round} 轮 · ${esc(m.followUpReason || '面试追问')}</div><h3>${esc(m.question)}</h3><p class="ans"><b>你的回答</b>${esc(m.answer || '未回答')}</p>${w ? `<div class="weak"><b>待改进 · ${esc(w.topic)}</b><span>${esc(w.evidence)}</span><em>建议：${esc(w.suggestion)}</em></div>` : ''}</article>`;
  }).join('');
  return `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>深挖面试官 · 复盘报告</title><style>
:root{--ink:#1D2534;--ink2:#5B6478;--line:#E8E4DA;--amber:#B97C16;--amber-bg:#FBF4E4}
*{box-sizing:border-box}body{margin:0;background:#FFF;color:var(--ink);font:15px/1.75 -apple-system,"Segoe UI","Microsoft YaHei",sans-serif}
.wrap{max-width:800px;margin:0 auto;padding:48px 24px 64px}
.brand{display:inline-block;font-weight:800;font-size:12px;letter-spacing:.08em;border:1.5px solid var(--ink);border-radius:999px;padding:3px 12px}
h1{font-family:Georgia,"Songti SC","SimSun",serif;font-size:34px;margin:18px 0 6px;letter-spacing:.01em}
.stats{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0 8px}
.stats span{background:var(--amber-bg);color:var(--amber);font-weight:700;font-size:13px;border-radius:999px;padding:5px 13px}
.rule{border:none;border-top:1px solid var(--line);margin:26px 0}
h2{font-family:Georgia,"Songti SC","SimSun",serif;font-size:21px;margin:0 0 14px}
article{border:1px solid var(--line);border-radius:14px;padding:20px 22px;margin:14px 0}
.meta{display:flex;align-items:center;gap:10px;color:var(--ink2);font-size:12.5px;margin-bottom:8px}
.badge{background:var(--ink);color:#fff;border-radius:6px;padding:2px 9px;font-size:12px}
h3{font-family:Georgia,"Songti SC","SimSun",serif;font-size:18px;line-height:1.6;margin:0 0 10px}
.ans{background:#FAF9F5;border-radius:10px;padding:11px 14px;font-size:14px;white-space:pre-wrap}
.ans b{display:block;margin-bottom:4px;font-size:12.5px;color:var(--ink2)}
.weak{border-left:3px solid #E8A33D;background:var(--amber-bg);border-radius:0 10px 10px 0;padding:11px 14px;margin-top:10px;font-size:14px}
.weak b{display:block;margin-bottom:4px}
.weak span{display:block;color:#4A5468}
.weak em{display:block;font-style:normal;margin-top:6px;color:var(--amber)}
ol.priority{padding-left:0;list-style:none;margin:0}
ol.priority li{border:1px solid var(--line);border-radius:12px;padding:14px 18px;margin-bottom:10px}
ol.priority b{color:var(--amber)}
.words{background:#F4F8F2;border:1px solid #D9E8D5;border-radius:14px;padding:22px 24px}
.words h2{color:#2E6B4F}
.words p{color:#3E4C5E;margin:0 0 10px}
.enc{color:#2E6B4F;font-weight:600}
footer{margin-top:36px;color:#9AA3B2;font-size:12px;text-align:center}
@media print{body{padding:0}.wrap{padding:24px}article{break-inside:avoid}}
</style></head><body><div class="wrap">
<span class="brand">深挖面试官</span>
<h1>面试复盘报告</h1>
<div class="stats"><span>${esc(state.interviewMode)}面</span><span>${esc(state.interviewTone)}模式</span><span>${state.messages.length} 轮问答</span><span>${state.weaknesses.length} 个待改进点</span></div>
<hr class="rule">
${rounds}
<hr class="rule">
${prioritySuggestions(state.weaknesses)}
<section class="words"><h2>面试官的话</h2><p>${esc(state.closingMessage || '本次模拟到这里结束。请优先补强最薄弱的两个方向，再进行下一轮练习。')}</p><p class="enc">${encouragement()}</p></section>
<footer>深挖面试官 · 生成本地完成，内容仅保存在你的设备上</footer>
</div></body></html>`;
}
