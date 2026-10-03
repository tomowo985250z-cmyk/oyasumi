globalThis.TonightTrend = (() => {
  // コメント文言と判定の設定は、この2つだけを編集します。
  const messages = {
    insufficient: '今夜はこれから',
    increasing: 'まだ起きてる仲間が増えてきたみたい',
    steady: '今夜もまだ起きてる仲間がいるみたい',
    decreasing: '少しずつ、おやすみする人が増えてきたみたい',
    strongDecreasing: 'みんな少しずつ眠りにつきはじめたみたい'
  };
  const rules = {
    intervalMinutes: 15, recentMinutes: 15, comparisonStartMinutes: 30, comparisonEndMinutes: 60,
    increaseRate: 0.10, decreaseRate: -0.10, strongDecreaseRate: -0.30,
    increaseExitRate: 0.05, decreaseExitRate: -0.05, strongDecreaseExitRate: -0.20,
    minimumChange: 2, confirmationWindows: 2, minimumHoldMinutes: 30
  };
  function classify(points) {
    if (!Array.isArray(points)) return 'insufficient';
    const interval = rules.intervalMinutes * 60000;
    // 現在時点の未確定サンプルは使わず、RPCの15分境界だけで判定。
    const completed = [...new Map(points.filter(point => Number.isFinite(point.time)
      && Number.isFinite(point.awake) && point.awake >= 0 && point.time % interval === 0)
      .map(point => [point.time, point])).values()].sort((a,b) => a.time - b.time);
    let state = 'insufficient', candidate, confirmations = 0, changedAt = -Infinity, previousTime, segmentStart = 0;
    const mean = rows => rows.reduce((sum,row) => sum + row.awake, 0) / rows.length;
    for (let index = 0; index < completed.length; index++) {
      const now = completed[index].time;
      if (previousTime !== undefined && now - previousTime !== interval) {
        state = 'insufficient'; candidate = undefined; confirmations = 0; changedAt = -Infinity;
        segmentStart = index;
      }
      previousTime = now;
      const window = completed.slice(segmentStart,index + 1);
      const recent = window.filter(point => now - point.time <= rules.recentMinutes * 60000);
      const baseline = window.filter(point => now - point.time >= rules.comparisonStartMinutes * 60000
        && now - point.time <= rules.comparisonEndMinutes * 60000);
      if (recent.length < 2 || !baseline.length) continue;
      const before = mean(baseline), change = mean(recent) - before;
      const rate = change / Math.max(1,before);
      let next = 'steady';
      if (Math.abs(change) >= rules.minimumChange) {
        if (rate <= rules.strongDecreaseRate) next = 'strongDecreasing';
        else if (rate >= rules.increaseRate) next = 'increasing';
        else if (rate <= rules.decreaseRate) next = 'decreasing';
        else if (state === 'increasing' && rate >= rules.increaseExitRate) next = state;
        else if (state === 'decreasing' && rate <= rules.decreaseExitRate) next = state;
      }
      if (state === 'strongDecreasing' && rate <= rules.strongDecreaseExitRate
        && Math.abs(change) >= rules.minimumChange) next = state;
      if (next === state) { candidate = undefined; confirmations = 0; continue; }
      confirmations = next === candidate ? confirmations + 1 : 1;
      candidate = next;
      if (confirmations >= rules.confirmationWindows && now - changedAt >= rules.minimumHoldMinutes * 60000) {
        state = next; changedAt = now; candidate = undefined; confirmations = 0;
      }
    }
    return state;
  }
  const comment = points => messages[classify(points)];
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
