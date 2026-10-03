// 就寝・起床の演出専用。プロフィールの5表情やSupabaseの選択値は変更しません。
globalThis.CatScenes = (() => {
  const settleDurationMs = 6500;
  function elapsed(finishedAt, now = Date.now()) {
    const time = Date.parse(finishedAt);
    return Number.isFinite(time) ? Math.max(0, Math.min(settleDurationMs, now - time)) : settleDurationMs;
  }
  const badge = '<circle cx="50" cy="50" r="47" fill="#ffba70" stroke="#fff5e5" stroke-width="3"/><path d="M8 43Q20 2 64 8" fill="none" stroke="#ffd294" stroke-width="8" opacity=".55"/>';
  function awake(coat) {
    const dark = coat === 'black' || coat === 'gray';
    const eye = dark ? '#f3cf6b' : '#fff8ee';
    const stroke = coat === 'black' ? '#c2b7b1' : '#674e4f';
    return CatFaces.baseMarkup(coat)
      + `<g data-awake-eyes><circle cx="33" cy="60" r="8" fill="${eye}"/><circle cx="67" cy="60" r="8" fill="${eye}"/><circle cx="33" cy="60" r="6" fill="#171b22"/><circle cx="67" cy="60" r="6" fill="#171b22"/><circle cx="30.5" cy="57" r="2.5" fill="#fff"/><circle cx="64.5" cy="57" r="2.5" fill="#fff"/><circle cx="35" cy="63" r="1" fill="#fff"/><circle cx="69" cy="63" r="1" fill="#fff"/></g><path d="M44 75q6 3 12 0l-2 8q-4 7-8 0Z" fill="#ff9295"/><path d="M50 70v4m0 0q-5 5-9 0m9 0q5 5 9 0" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round"/><path d="m46 67 4 3 4-3" fill="#d6887c"/><path d="m44 14-2-4m8 3 2-4m-7 11 3 1" fill="none" stroke="#e89324" stroke-width="3" stroke-linecap="round"/>`;
  }
  function sleeping(coat) {
    const { fur, stripe } = CatFaces.palette(coat);
    const dark = coat === 'black' || coat === 'gray';
    const outline = coat === 'black' ? '#171b22' : coat === 'gray' ? '#767b82' : '#d9b99b';
    const faceStroke = coat === 'black' ? '#f3eee9' : '#3f4050';
    const tabby = ['orange','brown','silver'].includes(coat);
    const bodyMarks = tabby ? `<path d="m66 43 7 10 3-13m5 11-6 11 11-4m-7 13-11 5 12 4" fill="${stripe}"/>` : coat === 'calico' ? '<path d="M78 47q17 10 6 27L73 65Z" fill="#e89324"/>' : coat === 'tuxedo' ? '<path d="M65 42q27 0 28 26L70 80Z" fill="#292929"/>' : '';
    const tail = coat === 'calico' || coat === 'tuxedo' ? '#353535' : stripe;
    return badge + `<ellipse cx="64" cy="65" rx="29" ry="25" fill="${fur}" stroke="${outline}" stroke-width="1.5"/>${bodyMarks}<path d="M82 57q12 23-18 29H45" fill="none" stroke="${outline}" stroke-width="13" stroke-linecap="round"/><path d="M82 57q12 23-18 29H45" fill="none" stroke="${fur}" stroke-width="10" stroke-linecap="round"/><path d="M58 86H46" fill="none" stroke="${tail}" stroke-width="10" stroke-linecap="round"/><g transform="translate(1 19) scale(.72)">${CatFaces.headMarkup(coat)}<path d="M28 59q5 5 10 0m24 0q5 5 10 0" fill="none" stroke="${faceStroke}" stroke-width="3" stroke-linecap="round"/><path d="m45 67 5 4 5-4" fill="#d6887c"/><path d="M50 71v3m0 0q-5 5-9 0m9 0q5 5 9 0" fill="none" stroke="${coat === 'black' ? '#c2b7b1' : '#674e4f'}" stroke-width="2" stroke-linecap="round"/></g><ellipse cx="39" cy="83" rx="6" ry="3" fill="${dark ? fur : '#fff8ee'}"/><path d="m76 21h7l-7 7h7m-8 6h5l-5 5h5" fill="none" stroke="#087cff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  function svg(sceneValue, coatValue) {
    const scene = sceneValue === 'awake' ? 'awake' : 'sleeping';
    const coat = CatFaces.normalizeCoat(coatValue);
    return `<svg class="cat-scene" viewBox="0 0 100 100" aria-hidden="true" focusable="false" data-cat-scene="${scene}" data-cat-coat="${coat}">${scene === 'awake' ? awake(coat) : sleeping(coat)}</svg>`;
  }
  return Object.freeze({ svg, elapsed, settleDurationMs });
})();
