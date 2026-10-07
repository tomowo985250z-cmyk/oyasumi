// 昼の演出専用。プロフィール表情・就寝/起床シーン・保存データとは独立。
globalThis.DayCats = (() => {
  const options = Object.freeze([
    { id: 'relax', label: 'のんびり中' },
    { id: 'play', label: '遊んでる' },
    { id: 'groom', label: '毛づくろい中' },
    { id: 'doze', label: 'うとうと中' },
    { id: 'gaze', label: '外を眺めてる' }
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
  const dayImageVersions = {"black-doze.png":"5f29e08ef0ca3e8c","black-gaze.png":"de2a5bea72467cdd","black-groom.png":"3c731e8d60b9aa1f","black-play.png":"396a640136983bbc","black-relax.png":"6ce7d208ed83ee3d","brown-doze.png":"7c3d3d1d60281bd3","brown-gaze.png":"b4299ee63ce17736","brown-groom.png":"ca337ba9bc9a670d","brown-play.png":"273f38df8a5340bc","brown-relax.png":"a74feefa9fbcc42c","calico-doze.png":"5bd7bf3dfa1cb87a","calico-gaze.png":"beff30f50e9860a7","calico-groom.png":"bf863f26724fb571","calico-play.png":"06767ed734979a09","calico-relax.png":"a599c011ebc96997","gray-doze.png":"2d4bdee8a4a9a64c","gray-gaze.png":"1099e14c96c1dc84","gray-groom.png":"eb33e3144efea72b","gray-play.png":"58e23b4a5f3ffc8c","gray-relax.png":"d5f51c224464750e","orange-doze.png":"ad55a7af88af1f72","orange-gaze.png":"a0d406d6a0da1716","orange-groom.png":"99b67e80fbfa7bb3","orange-play.png":"b2922b9adc604af7","orange-relax.png":"34dbe426943a5f8a","silver-doze.png":"62ef1399a96dd788","silver-gaze.png":"e2137d5a5c4f291e","silver-groom.png":"dbc1f37c98b7fb9f","silver-play.png":"715ad2db62de6a40","silver-relax.png":"d0d009880a1a3cc6","tuxedo-doze.png":"af466ae66444e7ac","tuxedo-gaze.png":"1abef790ae00701f","tuxedo-groom.png":"a4e4cbe84a996386","tuxedo-play.png":"64df5be277bd0632","tuxedo-relax.png":"0f8c7c1ebc479f9b","white-doze.png":"23292ea581bd6d0e","white-gaze.png":"5a23cd3570863cf2","white-groom.png":"7d8922fbf4412d9d","white-play.png":"64469da25a9ffdc8","white-relax.png":"e1f2a02d7edb7cc0"};
  function svg(action, coatValue) {
    const scene = options.some(o => o.id === action) ? action : 'relax';
    const coat = CatFaces.normalizeCoat(coatValue);
    if(CatFaces.isBig(coat))return CatFaces.svg(scene === 'doze' ? 'sleepy' : 'calm',coat).replace('class="cat-face"',`class="cat-day-scene" data-day-scene="${scene}"`);
    if(WildCatAssets.isWild(coat))return `<svg class="cat-day-scene" viewBox="0 0 100 100" aria-hidden="true" focusable="false" data-day-scene="${scene}" data-cat-coat="${coat}">${WildCatAssets.image('day',coat,scene)}</svg>`;
    const file = `${coat}-${scene}.png`;
    return `<img class="cat-day-scene day-cat-image" src="assets/day-cats/${file}?v=${dayImageVersions[file]}" alt="" aria-hidden="true" width="152" height="152" data-day-scene="${scene}" data-cat-coat="${coat}">`;
  }

  return Object.freeze({ options, rules, current, svg });
})();
