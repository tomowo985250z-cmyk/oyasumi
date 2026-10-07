// 就寝・起床専用画像。プロフィール表情・昼の場面・選択値は別に保持する。
globalThis.CatScenes = (() => {
  const settleDurationMs = 6500;
  const sceneVersions = {"black-footed-sleeping.png":"0e5d612860780f86","black-footed-waking.png":"9edc00522c0ce5dd","black-sleeping.png":"02e7f7c6dc1c4e46","black-waking.png":"692c78be5eeec266","brown-sleeping.png":"23a88669672d1da9","brown-waking.png":"f1a8e55b2b0c19e2","calico-sleeping.png":"add66985c7738dbb","calico-waking.png":"652aa7eb6fc292f7","cheetah-sleeping.png":"103152545f0f0864","cheetah-waking.png":"1d0f80fe366bc329","fishing-sleeping.png":"fef7d30e495ba769","fishing-waking.png":"186f8712604ba35f","gray-sleeping.png":"8c81fb263667ddc2","gray-waking.png":"4112c4080e6478c9","jaguar-sleeping.png":"1b33db8b01bf5f83","jaguar-waking.png":"e91613dae4c1bef5","leopard-sleeping.png":"586ef6a791bffcf1","leopard-waking.png":"a5f80cf012335101","manul-sleeping.png":"4ae855526bd2b75f","manul-waking.png":"3854460b63766d14","orange-sleeping.png":"acd5fd10c57ac292","orange-waking.png":"ae3ac2959422b352","sand-sleeping.png":"0969774e942fc697","sand-waking.png":"d45e13d77e43470e","silver-sleeping.png":"027af8dad7f46553","silver-waking.png":"8280166c8d210a60","snow-leopard-sleeping.png":"f0424e2e0ab0a207","snow-leopard-waking.png":"5709490cee78f66f","tuxedo-sleeping.png":"bb220545512e77f7","tuxedo-waking.png":"3bf65fff941cfcb9","white-sleeping.png":"72c5244773fa5469","white-waking.png":"f354eaf97e263dd2"};
  function elapsed(finishedAt, now = Date.now()) {
    const time = Date.parse(finishedAt);
    return Number.isFinite(time) ? Math.max(0, Math.min(settleDurationMs, now - time)) : settleDurationMs;
  }
  function svg(sceneValue, coatValue) {
    const scene = sceneValue === 'awake' ? 'awake' : 'sleeping';
    const coat = CatFaces.normalizeCoat(coatValue);
    const file = `${coat}-${scene === 'awake' ? 'waking' : 'sleeping'}.png`;
    return `<svg class="cat-scene" viewBox="0 0 100 100" aria-hidden="true" focusable="false" data-cat-scene="${scene}" data-cat-coat="${coat}"><image href="assets/sleep-wake-cats/${file}?v=${sceneVersions[file]}" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid meet"/></svg>`;
  }
  return Object.freeze({ svg, elapsed, settleDurationMs });
})();
