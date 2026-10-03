globalThis.TonightTrend = (() => {
  // コメント文言と判定の設定は、この2つだけを編集します。
  const messages = {
    increasing: 'まだ起きている仲間が、少し増えています 🌙',
    decreasing: 'みんな、そろそろ寝始めています 🌙',
    steady: '今夜も、それぞれのペースで過ごしています 🌙',
    small: '今夜は少人数で、静かな夜を過ごしています 🌙',
    insufficient: '今夜の様子を、ゆっくり集めています 🌙'
  };
  const rules = { smallCount: 5, comparisonMinutes: 30, minimumMinutes: 15, changeRatio: 0.1, minimumChange: 2 };
  function classify(points, currentCount) {
    if (!Array.isArray(points) || points.length < 2 || !Number.isFinite(currentCount)) return 'insufficient';
    const last = points.at(-1);
    const eligible = points.filter(point => last.time - point.time >= rules.minimumMinutes * 60000);
    if (!eligible.length) return 'insufficient';
    const target = last.time - rules.comparisonMinutes * 60000;
    const previous = eligible.reduce((best, point) => Math.abs(point.time - target) < Math.abs(best.time - target) ? point : best);
    if (currentCount <= rules.smallCount) return 'small';
    const change = currentCount - previous.awake;
    const threshold = Math.max(rules.minimumChange, Math.ceil(previous.awake * rules.changeRatio));
    return change >= threshold ? 'increasing' : change <= -threshold ? 'decreasing' : 'steady';
  }
  const comment = (points, count) => messages[classify(points, count)];
  const timeLabel = time => new Date(time).toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hour12: false });
  function chart(points) {
    if (!points?.length) return '<p class="empty">今夜の推移は、投稿が集まると表示されます。</p>';
    const max = Math.max(1, ...points.map(point => point.awake));
    const ceiling = Math.ceil(max / (max > 20 ? 10 : 1)) * (max > 20 ? 10 : 1);
    const first = points[0].time, last = points.at(-1).time;
    const position = point => [last === first ? 174 : 44 + (point.time - first) / (last - first) * 262, 134 - point.awake / ceiling * 114];
    const path = points.map(point => position(point).map(value => value.toFixed(2)).join(' ')).join(' L');
    const labels = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];
    return `<svg viewBox="0 0 320 160" role="img" aria-label="今夜の起きている人数：${points[0].awake}人から${points.at(-1).awake}人。日本時間"><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#779aff" stop-opacity=".25"/><stop offset="1" stop-color="#779aff" stop-opacity="0"/></linearGradient></defs>${[0,1,2,3].map(index => `<path class="grid" d="M42 ${20 + index * 38}h266"/><text x="0" y="${24 + index * 38}">${Math.round(ceiling * (3 - index) / 3).toLocaleString('ja-JP')}</text>`).join('')}<path class="area" d="M${path} L${position(points.at(-1))[0]} 134 L${position(points[0])[0]} 134Z"/><path class="curve" d="M${path}"/><g fill="#a6bcff">${points.map(point => { const [x,y] = position(point); return `<circle cx="${x}" cy="${y}" r="3"/>`; }).join('')}</g>${labels.map(index => `<text x="${position(points[index])[0]}" y="156" text-anchor="${index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}">${timeLabel(points[index].time)}</text>`).join('')}</svg><p class="sample-tag">今夜の報告人数・日本時間${points.length === 1 ? '（データ収集中）' : ''}</p>`;
  }
  return { messages, rules, classify, comment, chart };
})();
