const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function prioritySuggestions(weaknesses) {
  if (!weaknesses || weaknesses.length === 0) return '';
  const seen = new Set(); const items = [];
  for (const w of weaknesses) { if (!seen.has(w.topic)) { seen.add(w.topic); items.push(`<li><b>${esc(w.topic)}</b>：${esc(w.suggestion)}</li>`); } }
  return `<h2>优先补强方向</h2><ul class="priority">${items.join('')}</ul>`;
}
function encouragement() {
  return '练习的意义不在于这次答得多完美，而在于你现在清楚下一步补什么。带着这份清单去准备，下一轮会明显不同。';
}
module.exports = { prioritySuggestions, encouragement, esc };
