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
    // RPC snapshots are state counts, not events to sum. Keep the 06:00 JST night intact.
    const nightKey = time => Math.floor((time + 3 * 3600000) / 86400000);
    const valid = Array.isArray(points) ? points.filter(p => Number.isFinite(p.time)
      && Number.isFinite(p.awake) && p.awake >= 0 && Number.isFinite(p.sleeping) && p.sleeping >= 0) : [];
    const sorted = [...new Map(valid.map(p => [p.time, p])).values()].sort((a,b) => a.time-b.time);
    if (!sorted.length) return '<p class="empty">みんなの推移は、投稿が集まると表示されます。</p>';
    const rows = sorted.filter(p => nightKey(p.time) === nightKey(sorted.at(-1).time));
    const first = rows[0].time, last = rows.at(-1).time;
    const max = Math.max(1, ...rows.flatMap(p => [p.awake,p.sleeping]));
    const step = max > 20 ? 10 : 1, ceiling = Math.ceil(max / step) * step;
    const yTicks = [...new Set([0,1,2,3].map(i => Math.round(ceiling * (3-i) / 3)))];
    const x = time => first === last ? 174 : 44 + (time-first)/(last-first)*262;
    const y = count => 134-count/ceiling*114;
    const curve = key => rows.map(p => `${x(p.time).toFixed(2)} ${y(p[key]).toFixed(2)}`).join(' L');
    const hour = 3600000, ticks = [];
    for (let time = Math.ceil(first/hour)*hour; time <= last; time += hour) ticks.push(time);
    const stride = Math.max(1, Math.ceil(ticks.length/4));
    const labels = first === last ? [first] : [...new Set([first,...ticks.filter((_,i)=>i%stride===0 && x(ticks[i])-44>=42 && 306-x(ticks[i])>=42),last])];
    const end = rows.at(-1);
    return `<div class="trend-legend"><span><i class="trend-awake"></i>まだ起きてる報告</span><span><i class="trend-sleeping"></i>おやすみ報告</span></div><svg viewBox="0 0 320 160" role="img" aria-label="日本時間の人数推移。${timeLabel(first)}から${timeLabel(last)}。まだ起きてる人：${rows[0].awake}人から${end.awake}人。もう寝た人：${rows[0].sleeping}人から${end.sleeping}人。">${yTicks.map(value=>`<path class="grid" d="M42 ${y(value)}h266"/><text x="0" y="${y(value)+4}">${value.toLocaleString('ja-JP')}</text>`).join('')}<path class="curve trend-awake" d="M${curve('awake')}"/><path class="curve trend-sleeping" d="M${curve('sleeping')}"/>${['awake','sleeping'].map(key=>`<g class="trend-${key}">${rows.map(p=>`<circle cx="${x(p.time)}" cy="${y(p[key])}" r="3"/>`).join('')}</g>`).join('')}${labels.map(time=>`<text x="${x(time)}" y="156" text-anchor="${first===last?'middle':time===first?'start':time===last?'end':'middle'}">${timeLabel(time)}</text>`).join('')}</svg><p class="sample-tag">各時点の報告人数・日本時間（06:00切替）${rows.length===1?'・データ収集中':''}</p>`;
  }

  // Same population as the chart/RPC: latest event_order per author within
  // each 06:00 JST night, without applying the home's three-hour expiry.
  const catRules = Object.freeze({ low: .75, high: 1.25, lowExit: .85, highExit: 1.15,
    minimumDays: 3, minimumBaseline: 3, minimumChange: 2, holdMinutes: 30 });
  const catInterval = 15 * 60000, day = 86400000;
  const nightStart = time => Math.floor((time + 3 * 3600000) / day) * day - 3 * 3600000;
  function catBaseline(history, at) {
    const start = nightStart(at), slot = Math.floor((at - start) / catInterval) * catInterval;
    const nights = new Map();
    for (const row of history || []) {
      if (!Number.isFinite(row.time) || !Number.isFinite(row.order) || !row.userId
        || !['awake','sleep','try-sleep','early-sleep'].includes(row.status)) continue;
      const previous = nightStart(row.time), age = (start - previous) / day;
      if (age < 1 || age > 7 || row.nightDate !== new Date(previous + 9 * 3600000).toISOString().slice(0,10)) continue;
      if (!nights.has(previous)) nights.set(previous, new Map());
      // A night with later posts but none yet at this slot is an observed zero.
      if (row.time > previous + slot) continue;
      const authors = nights.get(previous), before = authors.get(row.userId);
      if (!before || row.order > before.order) authors.set(row.userId, row);
    }
    const counts = [...nights.values()].map(authors => [...authors.values()].filter(row => row.status === 'awake').length);
    return { days: counts.length, average: counts.length ? counts.reduce((a,b) => a+b,0) / counts.length : 0 };
  }
  function createCatIndicator() {
    let start, lastSlot, count, candidate, confirmations = 0, changedAt = -Infinity;
    return (activeCount, points, history, now) => {
      const currentStart = nightStart(now), slot = Math.floor(now / catInterval) * catInterval;
      if (start !== currentStart) { start = currentStart; lastSlot = undefined; count = undefined; candidate = undefined; confirmations = 0; changedAt = -Infinity; }
      // Exact small counts and unknown/zero must never retain decorative cats.
      if (!Number.isFinite(activeCount) || activeCount < 3) {
        count = Number.isFinite(activeCount) ? Math.max(0, Math.floor(activeCount)) : 0;
        lastSlot = undefined; candidate = undefined; confirmations = 0; changedAt = -Infinity;
        return count;
      }
      if (lastSlot === slot) return count;
      const consecutive = lastSlot !== undefined && slot - lastSlot === catInterval;
      lastSlot = slot;
      const baseline = catBaseline(history, slot);
      const point = (points || []).find(p => p.time === slot && Number.isFinite(p.awake) && p.awake >= 0);
      let next = 2;
      if (baseline.days >= catRules.minimumDays && baseline.average >= catRules.minimumBaseline && point) {
        const change = point.awake - baseline.average, ratio = point.awake / baseline.average;
        if (Math.abs(change) >= catRules.minimumChange) {
          if (ratio <= catRules.low) next = 1;
          else if (ratio >= catRules.high) next = 3;
          else if (count === 1 && ratio <= catRules.lowExit) next = 1;
          else if (count === 3 && ratio >= catRules.highExit) next = 3;
        }
      }
      if (count === undefined || count < 1 || !consecutive) {
        count = next; candidate = undefined; confirmations = 0; changedAt = slot;
      } else if (next === count) { candidate = undefined; confirmations = 0; }
      else {
        confirmations = next === candidate ? confirmations + 1 : 1; candidate = next;
        if (confirmations >= 2 && slot - changedAt >= catRules.holdMinutes * 60000) {
          count = next; changedAt = slot; candidate = undefined; confirmations = 0;
        }
      }
      return count;
    };
  }
  return { messages, rules, classify, comment, chart, catRules, catBaseline, createCatIndicator };
})();
