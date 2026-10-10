// Approved artwork. Original asset files and selection rules are retained.
(() => {
  const faces = CatFaces, scenes = CatScenes, day = DayCats;
  const image = (coat, frame, classes, extra = '') => {
    coat = faces.normalizeCoat(coat);
    // Restore only the calm manul icon from the original supplied artwork.
    if (coat === 'manul' && frame === 'face-calm') return faces.svg('calm', 'manul');
    return `<img class="${classes}" src="assets/cat-refresh-v1/${coat}/${frame}.png" alt="" aria-hidden="true" data-asset-key="${coat}/${frame}" data-cat-coat="${coat}" ${extra}>`;
  };
  globalThis.CatFaces = Object.freeze({...faces, svg: (expression, coat) => {
    expression = faces.normalize(expression);
    return image(coat, 'face-' + expression, 'cat-face', `data-cat-expression="${expression}" data-expression="${expression}"`);
  }});
  globalThis.CatScenes = Object.freeze({...scenes, svg: (scene, coat) => image(coat, scene === 'awake' ? 'morning' : 'night', 'cat-scene', `data-cat-scene="${scene === 'awake' ? 'awake' : 'sleeping'}"`)});
  globalThis.DayCats = Object.freeze({...day, svg: (pose, coat) => {
    pose = day.options.some(option => option.id === pose) ? pose : 'relax';
    return image(coat, 'day-' + pose, 'cat-day-scene day-cat-image', `width="152" height="152" data-day-scene="${pose}"`);
  }});
  // Rear-view artwork is exclusive to the awake rooftop group.
  globalThis.RoofCats = Object.freeze({svg: coat => {
    coat = faces.normalizeCoat(coat);
    return `<img class="roof-cat" src="assets/roof-cats-v2/${coat}.png" alt="" aria-hidden="true" data-asset-key="rear/${coat}" data-cat-coat="${coat}" data-cat-pose="rear">`;
  }});
})();
