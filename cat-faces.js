globalThis.CatFaces = (() => {
  const options = Object.freeze([
    { id: 'calm', label: 'おだやか' },
    { id: 'sleepy', label: '眠そう' },
    { id: 'yawn', label: 'あくび' },
    { id: 'restless', label: '寝れない' },
    { id: 'happy', label: 'うれしい' },
    { id: 'surprised', label: 'きょとん' }
  ]);
  const smile = '<path d="M50 71v3m0 0q-5 5-9 0m9 0q5 5 9 0" fill="none" stroke="#674e4f" stroke-width="2" stroke-linecap="round"/>';
  const faces = {
    surprised: '<g data-surprised-eyes><circle cx="33" cy="59" r="6.5" fill="#171b22" stroke="#fff8ee" stroke-width="1.5"/><circle cx="67" cy="59" r="6.5" fill="#171b22" stroke="#fff8ee" stroke-width="1.5"/><circle cx="35" cy="56" r="2" fill="#fff"/><circle cx="69" cy="56" r="2" fill="#fff"/></g><ellipse cx="50" cy="77" rx="2.7" ry="3.5" fill="#ff9295" stroke="#3f4050" stroke-width="1.5"/>',
    calm: '<path d="M28 58q5 6 10 0m24 0q5 6 10 0" fill="none" stroke="#3f4050" stroke-width="3" stroke-linecap="round"/>' + smile,
    sleepy: '<path d="M28 59q5 5 10 0m24 0q5 5 10 0" fill="none" stroke="#3f4050" stroke-width="3" stroke-linecap="round"/>' + smile + '<path d="M76 22h8l-8 8h8m1-20h9l-9 9h9" fill="none" stroke="#087cff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>',
    yawn: '<path d="m29 55 8 5-8 5m42-10-8 5 8 5" fill="none" stroke="#3f4050" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="50" cy="77" rx="12" ry="14" fill="#e84b4b" stroke="#674e4f" stroke-width="2.5"/><ellipse cx="50" cy="84" rx="9" ry="6" fill="#ffb5a9"/><path d="M25 74q-9 5-4 13t12-6q3-9-8-7Z" fill="#8beaf5" stroke="#45cbe4" stroke-width="1.5"/><ellipse cx="26" cy="79" rx="2" ry="3" fill="#fff"/>',
    restless: '<path d="M34 59q-3-3-5 0t3 6q8 0 8-7t-9-7q-9 2-7 10m43-2q-3-3-5 0t3 6q8 0 8-7t-9-7q-9 2-7 10" fill="none" stroke="#3f4050" stroke-width="2.5" stroke-linecap="round"/><path d="m40 78 5-4 5 4 5-4 5 4" fill="none" stroke="#674e4f" stroke-width="2.5" stroke-linejoin="round"/><path d="M83 17q-12-5-8 5t10-2-10-6q-10 6 1 11t9-9" fill="none" stroke="#7189c8" stroke-width="2" stroke-linecap="round"/>',
    happy: '<path d="M27 62q6-12 12 0m22 0q6-12 12 0" fill="none" stroke="#3f4050" stroke-width="3" stroke-linecap="round"/><path d="M43 76q7 3 14 0l-2 7q-5 9-10 0Z" fill="#f4aba0" stroke="#674e4f" stroke-width="2"/>' + smile + '<path d="m82 17 2-7m4 12 6-5" fill="none" stroke="#ff929d" stroke-width="3.5" stroke-linecap="round"/>'
  };
  const normalize = value => options.some(option => option.id === value) ? value : 'calm';
  const coats = Object.freeze([
    { id: 'calico', label: '三毛' }, { id: 'orange', label: '茶トラ' },
    { id: 'brown', label: 'キジトラ' }, { id: 'silver', label: 'サバトラ' },
    { id: 'black', label: '黒猫' }, { id: 'white', label: '白猫' },
    { id: 'tuxedo', label: 'ハチワレ' }, { id: 'gray', label: 'グレー' }
  ]);
  const normalizeCoat = value => coats.some(coat => coat.id === value) ? value : 'calico';
  const coatLabel = value => coats.find(coat => coat.id === normalizeCoat(value)).label;
  const colors = { calico: ['#fff8ee','#e89324'], orange: ['#ffbc6c','#d58322'], brown: ['#ac8c64','#33302a'], silver: ['#bfc1c3','#8a8c8e'], black: ['#232323','#232323'], white: ['#fffdf8','#fffdf8'], tuxedo: ['#fffdf8','#292929'], gray: ['#919395','#919395'] };
  function coatMarkup(coat) {
    const [fur, stripe] = colors[coat];
    const tabby = ['orange','brown','silver'].includes(coat);
    const patches = coat === 'calico' ? '<path d="M12 53Q9 28 44 27q-4 22-32 26Z" fill="#e89324"/><path d="M53 27q32-1 35 27Q64 49 53 27Z" fill="#353535"/>' : coat === 'tuxedo' ? '<path d="M12 53Q9 25 50 27q41-2 38 26Q63 51 50 31 37 51 12 53Z" fill="#292929"/>' : '';
    const stripes = tabby ? `<path d="M36 27q0 13 7 20l3-20m2 0q-1 14 3 20l4-20m2 0q-1 13 5 19l4-17M12 47l14 7-15 3m78-10-14 7 15 3M13 62l12 4-10 4m72-8-12 4 10 4" fill="${stripe}"/><path d="M20 74q0-16 12-16 10 0 18-12 8 12 18 12 12 0 12 16-3 16-30 16T20 74Z" fill="#fff8ee"/>` : '';
    return `<circle cx="50" cy="50" r="47" fill="#ffba70" stroke="#fff5e5" stroke-width="3"/><path d="M8 43Q20 2 64 8" fill="none" stroke="#ffd294" stroke-width="8" opacity=".55"/><path d="M17 41 19 17Q21 13 39 30M61 30Q79 13 81 17l2 24" fill="${fur}" stroke="${fur}" stroke-width="4" stroke-linejoin="round"/><path d="m22 32 0-12 11 10m34 0 11-10 0 12" fill="#ff9a94"/><ellipse cx="50" cy="59" rx="39" ry="32" fill="${fur}"/>${patches}${stripes}<ellipse cx="27" cy="70" rx="7" ry="4" fill="#ff9295"/><ellipse cx="73" cy="70" rx="7" ry="4" fill="#ff9295"/><g fill="${coat === 'black' || coat === 'gray' ? fur : '#fff8ee'}"><ellipse cx="30" cy="92" rx="7" ry="4"/><ellipse cx="70" cy="92" rx="7" ry="4"/></g><path d="m28 93 1 2m3-2 1 2m35-2 1 2m3-2 1 2" stroke="${stripe}" stroke-width="1" stroke-linecap="round"/>`;
  }
  const label = value => options.find(option => option.id === normalize(value)).label;
  function svg(value, coatValue) {
    const expression = normalize(value);
    const coat = normalizeCoat(coatValue);
    let face = faces[expression].replaceAll('#7189c8', '#087cff').replaceAll('#ff929d', '#ff2862');
    if (coat === 'black') face = face.replaceAll('#3f4050', '#f3eee9').replaceAll('#674e4f', '#c2b7b1');
    return `<svg class="cat-face" viewBox="0 0 100 100" aria-hidden="true" focusable="false" data-cat-expression="${expression}" data-cat-coat="${coat}">${coatMarkup(coat)}${face}<path d="m45 67 5 4 5-4" fill="#d6887c"/></svg>`;
  }
  // 演出用にも同じ輪郭・毛色を共有。プロフィールの表情は追加しません。
  function headMarkup(value) {
    const base = coatMarkup(normalizeCoat(value));
    return base.slice(base.indexOf('<path d="M17'), base.indexOf('<g fill='));
  }
  const palette = value => { const [fur, stripe] = colors[normalizeCoat(value)]; return { fur, stripe }; };
  return Object.freeze({ options, normalize, label, coats, normalizeCoat, coatLabel, svg, baseMarkup: value => coatMarkup(normalizeCoat(value)), headMarkup, palette });
})();
