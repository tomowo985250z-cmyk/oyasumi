globalThis.CatFaces = (() => {
  const options = Object.freeze([
    { id: 'calm', label: 'おだやか' },
    { id: 'sleepy', label: '眠そう' },
    { id: 'yawn', label: 'あくび' },
    { id: 'restless', label: '寝れない' },
    { id: 'happy', label: 'うれしい' }
  ]);
  const smile = '<path d="M50 71v3m0 0q-5 5-9 0m9 0q5 5 9 0" fill="none" stroke="#674e4f" stroke-width="2" stroke-linecap="round"/>';
  const faces = {
    calm: '<path d="m28 58 5 3 5-3m24 0 5 3 5-3" fill="none" stroke="#3f4050" stroke-width="3" stroke-linecap="round"/>' + smile,
    sleepy: '<path d="M28 60h10m24 0h10" fill="none" stroke="#3f4050" stroke-width="3.5" stroke-linecap="round"/>' + smile + '<path d="M78 24h6l-6 7h6m3-17h8l-8 9h8" fill="none" stroke="#7189c8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
    yawn: '<path d="m29 55 8 5-8 5m42-10-8 5 8 5" fill="none" stroke="#3f4050" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="50" cy="79" rx="8" ry="11" fill="#bd8475" stroke="#674e4f" stroke-width="2.5"/><path d="M44 82q6-5 12 0v4q-6 5-12 0Z" fill="#f4aba0"/><path d="m17 63 5 1m-4 10 4-3" fill="none" stroke="#7189c8" stroke-width="2.5" stroke-linecap="round"/>',
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
  function coatMarkup(coat) {
    if (coat === 'calico') return '<use href="cat.svg#cat-base"/>';
    const colors = { orange: ['#f3b36f','#ca8648'], brown: ['#ad9274','#51493e'], silver: ['#aab3bd','#65717f'], black: ['#28333e','#28333e'], white: ['#fff8ee','#fff8ee'], tuxedo: ['#fff0d9','#39434d'], gray: ['#909ba6','#909ba6'] };
    const [fur, stripe] = colors[coat];
    const tabby = ['orange','brown','silver'].includes(coat);
    return `<path d="m19 40 1-29 24 19M56 30 24-19 2 31" fill="${fur}" stroke="${fur}" stroke-width="3" stroke-linejoin="round"/><path d="m23 29 1-11 10 12m32 0 10-12 1 12" fill="#f1b6a5"/><ellipse cx="50" cy="58" rx="39" ry="33" fill="${fur}"/>${tabby ? `<path d="M40 25l4 19 3-20m4 0 2 20 7-18M14 46l12 5-13 3m73-8-12 5 13 3M12 61l13 4-10 4m73-8-13 4 10 4" fill="${stripe}"/><path d="M22 69q4-22 16-18l12 9 12-9q12-4 16 18-3 22-28 22T22 69" fill="#fff0d9"/>` : coat === 'tuxedo' ? '<path d="M12 52q0-28 38-28t38 28q-24-1-38-20-14 19-38 20Z" fill="#39434d"/>' : ''}<ellipse cx="27" cy="70" rx="7" ry="4" fill="#ffb6a1"/><ellipse cx="73" cy="70" rx="7" ry="4" fill="#ffb6a1"/>`;
  }
  const label = value => options.find(option => option.id === normalize(value)).label;
  function svg(value, coatValue) {
    const expression = normalize(value);
    const coat = normalizeCoat(coatValue);
    const face = coat === 'black' ? faces[expression].replaceAll('#3f4050', '#a9b9c9').replaceAll('#674e4f', '#a9b9c9') : faces[expression];
    return `<svg class="cat-face" viewBox="0 0 100 100" aria-hidden="true" focusable="false" data-cat-expression="${expression}" data-cat-coat="${coat}">${coatMarkup(coat)}${face}<path d="m45 67 5 4 5-4" fill="#d6887c"/></svg>`;
  }
  return Object.freeze({ options, normalize, label, coats, normalizeCoat, coatLabel, svg });
})();
