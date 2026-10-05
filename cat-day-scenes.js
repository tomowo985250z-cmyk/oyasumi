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
  const dayImageVersions = {"black-doze.png":"e21daf21e915fe3a","black-gaze.png":"95354400c620ca79","black-groom.png":"31f67d70249c403d","black-play.png":"456523553e065029","black-relax.png":"2976fe135adace15","brown-doze.png":"7e0400575d4adb28","brown-gaze.png":"ce361264a5b9c314","brown-groom.png":"97a7662f6f4434e5","brown-play.png":"ce09f0290f0fb64b","brown-relax.png":"2438c5ac5ca6a2d3","calico-doze.png":"cec553b2758a7e5b","calico-gaze.png":"f9f400612867a998","calico-groom.png":"f4b899692ccc0e8d","calico-play.png":"eb096ddc4b6e87aa","calico-relax.png":"8436a3e35cc39995","gray-doze.png":"afba521f01ef32b3","gray-gaze.png":"495183b097be61d1","gray-groom.png":"ae83197636cfa06a","gray-play.png":"ba9d1823440519c7","gray-relax.png":"9874d520de214930","orange-doze.png":"6a7a36ba27d5398a","orange-gaze.png":"5d451a56826eefdb","orange-groom.png":"e4d62b2fbad53319","orange-play.png":"219d1a5ad8315747","orange-relax.png":"3ca1ce496339167f","silver-doze.png":"e7efe98c8782fcc1","silver-gaze.png":"fada4d277d25a307","silver-groom.png":"086e6aa98a211e14","silver-play.png":"704b481955917d95","silver-relax.png":"46a8b94c3204a05e","tuxedo-doze.png":"73659539e99be90b","tuxedo-gaze.png":"f5e71b3cd463f4f8","tuxedo-groom.png":"36cb517734d8093c","tuxedo-play.png":"79ac9cfc60d40b55","tuxedo-relax.png":"8689733aec10497f","white-doze.png":"69ffded6b8900f79","white-gaze.png":"a07446950b90c942","white-groom.png":"4246c911fb492765","white-play.png":"0acdb53419df9afa","white-relax.png":"61d2c5e62cc76a82"};
  function svg(action, coatValue) {
    const scene = options.some(o => o.id === action) ? action : 'relax';
    const coat = CatFaces.normalizeCoat(coatValue);
    if(WildCatAssets.isWild(coat))return `<svg class="cat-day-scene" viewBox="0 0 100 100" aria-hidden="true" focusable="false" data-day-scene="${scene}" data-cat-coat="${coat}">${WildCatAssets.image('day',coat,scene)}</svg>`;
    const file = `${coat}-${scene}.png`;
    return `<img class="cat-day-scene day-cat-image" src="assets/day-cats/${file}?v=${dayImageVersions[file]}" alt="" aria-hidden="true" width="152" height="152" data-day-scene="${scene}" data-cat-coat="${coat}">`;
  }

  return Object.freeze({ options, rules, current, svg });
})();
