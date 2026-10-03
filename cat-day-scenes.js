// 昼の演出専用。プロフィール表情・就寝/起床シーン・保存データとは独立。
globalThis.DayCats = (() => {
  const options = Object.freeze([
    { id: 'relax', label: 'のんびり中…' },
    { id: 'play', label: '遊んでる…' },
    { id: 'groom', label: '毛づくろい中…' },
    { id: 'doze', label: 'うとうと中…' },
    { id: 'gaze', label: '外を眺めてる…' }
  ].map(Object.freeze));
  const rules = Object.freeze({ startHour: 12, endHour: 18, intervalHours: 2 });
  function current(now = Date.now()) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: SleepFlow.rules.timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(now);
    const values = Object.fromEntries(parts.map(p => [p.type, p.value]));
    const hour = Number(values.hour);
    if (hour < rules.startHour || hour >= rules.endHour) return null;
    const day = `${values.year}-${values.month}-${values.day}`;
    const dayNumber = Math.floor(Date.parse(`${day}T00:00:00Z`) / 86400000);
    const bucket = Math.floor((hour - rules.startHour) / rules.intervalHours);
    return { ...options[(dayNumber * 3 + bucket) % options.length], key: `${day}:${bucket}` };
  }
  const badge = '<circle cx="50" cy="50" r="47" fill="#ffba70" stroke="#fff5e5" stroke-width="3"/><path d="M8 43Q20 2 64 8" fill="none" stroke="#ffd294" stroke-width="8" opacity=".55"/>';
  const room = '<path d="M59 15h25v42H59Z" fill="#b4dfeb"/><circle cx="76" cy="24" r="5" fill="#ffe499"/><path d="M63 33q1-5 5-3q4-6 7 0q5 0 5 3Z" fill="#fff8ee"/><path d="M58 12v47m13-46v44m-15 1h31" stroke="#f5d2a6" stroke-width="3"/><path d="M14 77h73" stroke="#e8a35e" stroke-width="5"/><ellipse cx="50" cy="87" rx="28" ry="5" fill="#f6dba6"/><path d="M14 68h12l-2 10h-8Z" fill="#cb8c51"/><path d="M20 69q-12-14-5-21q7 3 5 21q-3-23 5-28q6 12-5 28q6-20 11-16q0 9-11 16" fill="#82a552"/><path d="M80 68h9l-2 10h-5Z" fill="#cb8c51"/><path d="M84 69q-9-12-5-19q6 2 5 19q0-20 6-19q4 11-6 19" fill="#95b462"/>';
  function svg(action, coatValue) {
    const scene = options.some(o => o.id === action) ? action : 'relax';
    const coat = CatFaces.normalizeCoat(coatValue);
    const { fur, stripe } = CatFaces.palette(coat);
    const ink = coat === 'black' ? '#eee7df' : '#3f4050';
    const outline = coat === 'black' ? '#141922' : '#b69377';
    const tabby = ['orange', 'brown', 'silver'].includes(coat);
    const marks = tabby ? `<path d="m33 68 9 5-10 2m36-7-9 5 10 2m-23-1 4 9 4-9" fill="${stripe}"/>` : coat === 'calico' ? '<ellipse cx="38" cy="74" rx="7" ry="10" fill="#e89324"/>' : coat === 'tuxedo' ? '<path d="M33 62Q50 53 67 62L62 81H38Z" fill="#292929"/>' : '';
    const body = `<path d="M36 58Q29 65 30 82Q50 94 70 82Q71 65 64 58Z" fill="${fur}" stroke="${outline}" stroke-width="1.2"/>${marks}<path d="M69 74q17 14-5 13" fill="none" stroke="${stripe}" stroke-width="7" stroke-linecap="round"/><path d="M42 72v14m16-14v14" stroke="${outline}" stroke-width="1.2"/><ellipse cx="40" cy="86" rx="7" ry="3" fill="${fur}"/><ellipse cx="58" cy="86" rx="7" ry="3" fill="${fur}"/>`;
    let eyes = '<path d="m29 59 5 3 5-3m22 0 5 3 5-3"/>';
    if (scene === 'play') eyes = '<path d="M29 60q5-8 10 0m22 0q5-8 10 0"/>';
    if (scene === 'doze') eyes = '<path d="M29 61h10m22 0h10"/>';
    if (scene === 'gaze') eyes = '<ellipse cx="37" cy="59" rx="2" ry="4" fill="currentColor"/><ellipse cx="69" cy="59" rx="2" ry="4" fill="currentColor"/>';
    const mouth = scene === 'groom' ? '<path d="M48 74q6 1 3 7q-4 2-4-3Z" fill="#ff9295"/>' : '';
    const head = `<g transform="translate(${scene === 'gaze' ? '8 9' : '12 5'}) scale(.76)">${CatFaces.headMarkup(coat)}<g fill="none" stroke="${ink}" color="${ink}" stroke-width="3" stroke-linecap="round">${eyes}</g><path d="m46 68 4 3 4-3" fill="#d6887c"/><path d="M50 71v3m0 0q-5 5-9 0m9 0q5 5 9 0" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>${mouth}</g>`;
    let prop = '';
    if (scene === 'play') prop = `<path d="M61 72q13-13 19 1" fill="none" stroke="${fur}" stroke-width="8" stroke-linecap="round"/><circle cx="79" cy="80" r="9" fill="#8198ed"/><path d="M72 75q13 2 11 11m-9-14q-4 9 9 13" fill="none" stroke="#c5d1ff" stroke-width="1.4"/>`;
    if (scene === 'groom') prop = `<path d="M43 82q-12-8-3-18" fill="none" stroke="${outline}" stroke-width="9" stroke-linecap="round"/><path d="M43 82q-12-8-3-18" fill="none" stroke="${fur}" stroke-width="7" stroke-linecap="round"/>`;
    if (scene === 'doze') prop = '<path d="m76 23h7l-7 7h7m-6 6h4l-4 4h4" fill="none" stroke="#6e88dc" stroke-width="2" stroke-linecap="round"/>';
    let cat = body + head + prop;
    if (scene === 'play') cat = `<g transform="rotate(-12 50 70)">${body}${head}</g>` + `<path d="M43 71q-8 6-12 2" fill="none" stroke="${fur}" stroke-width="8" stroke-linecap="round"/><circle cx="29" cy="77" r="12" fill="${coat === 'gray' ? '#f4cc6c' : '#ed7fab'}"/><path d="M20 69q15 3 16 17m-10-20q-8 12 10 18m-18-8q8 10 17 0m-8 12q-1 6 15 3" fill="none" stroke="#b9507b" stroke-width="1.3"/>`;
    if (scene === 'doze') cat = `<ellipse cx="50" cy="86" rx="28" ry="5" fill="#9dc9d2"/><ellipse cx="42" cy="73" rx="23" ry="15" fill="${fur}" stroke="${outline}" stroke-width="1"/><g transform="translate(-8 7)">${marks}</g><g transform="translate(13 29) scale(.84)">${head}</g><ellipse cx="33" cy="86" rx="7" ry="3" fill="${fur}"/><ellipse cx="69" cy="87" rx="7" ry="3" fill="${fur}"/>${prop}`;
    if (scene === 'gaze') {
      const back = coat === 'tuxedo' ? '#292929' : fur;
      const patches = coat === 'calico' ? '<ellipse cx="42" cy="63" rx="8" ry="13" fill="#e89324"/><path d="M38 36q0-13 11-13v18Z" fill="#353535"/>' : tabby ? `<path d="m38 55 19 3-17 3m-5 5 22 3-21 3m7-41 8 8 2-13" fill="${stripe}"/>` : '';
      cat = `<path d="M42 52Q27 65 35 85Q43 91 63 86Q70 72 58 59Z" fill="${back}" stroke="${outline}" stroke-width="1"/><path d="M39 43 39 24 49 35Q59 26 65 41L72 49Q74 55 64 60Q54 65 41 57Z" fill="${back}" stroke="${outline}" stroke-width="1"/>${patches}<path d="M62 65q-5 11 1 20" fill="none" stroke="${fur}" stroke-width="5"/><path d="M34 76q-7 14 14 12" fill="none" stroke="${stripe}" stroke-width="6" stroke-linecap="round"/><ellipse cx="69" cy="54" rx="3" ry="2" fill="#ff9295"/><path d="M67 47v2" stroke="${ink}" stroke-width="2" stroke-linecap="round"/><path d="m40 28 5 7-5 2" fill="#ffafa1"/><path d="M79 43q-6-9-9-3q0 4 6 6q-6 3-1 5q6 0 4-8Z" fill="#e8a35e"/>`;
    }
    return `<svg class="cat-day-scene" viewBox="0 0 100 100" aria-hidden="true" focusable="false" data-day-scene="${scene}" data-cat-coat="${coat}">${badge}${room}${cat}</svg>`;
  }
  return Object.freeze({ options, rules, current, svg });
})();
