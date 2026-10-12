// Approved artwork. Original asset files and selection rules are retained.
(() => {
  const faces = CatFaces, scenes = CatScenes, day = DayCats;
  const windowGazeVersions = {"black-footed":"fbaaeb9453cbdf26","black":"e23645d01106fe34","brown":"a581f68092e43db2","calico":"b739e57ec2c56515","cheetah":"eebb0505132e4c73","fishing":"b8ef195344a629e1","gray":"c4d9c7fdc504a2f2","jaguar":"00fa618e47234b14","leopard":"b4c45cd466d10afc","manul":"3fafcafddca89335","orange":"9f0e402d9d8e6cf9","sand":"d151653203de3552","silver":"6b01535d7e2364a8","snow-leopard":"e5045f0fa5428180","tuxedo":"c51a4a333880707d","white":"625b24f729b69969"};
  const image = (coat, frame, classes, extra = '') => {
    coat = faces.normalizeCoat(coat);
    // Keep the restored calm icon; its five expression edits share that identity.
    if (coat === 'manul' && frame === 'face-calm') return faces.svg('calm', 'manul');
    if (coat === 'manul' && frame.startsWith('face-')) return `<img class="${classes}" src="assets/manul-expressions-v2/${frame}.png" alt="" aria-hidden="true" data-asset-key="${coat}/${frame}" data-cat-coat="${coat}" ${extra}>`;
    return `<img class="${classes}" src="assets/cat-refresh-v1/${coat}/${frame}.png" alt="" aria-hidden="true" data-asset-key="${coat}/${frame}" data-cat-coat="${coat}" ${extra}>`;
  };
  globalThis.CatFaces = Object.freeze({...faces, svg: (expression, coat) => {
    expression = faces.normalize(expression);
    return image(coat, 'face-' + expression, 'cat-face', `data-cat-expression="${expression}" data-expression="${expression}"`);
  }});
  globalThis.CatScenes = Object.freeze({...scenes, svg: (scene, coat) => image(coat, scene === 'awake' ? 'morning' : 'night', 'cat-scene', `data-cat-scene="${scene === 'awake' ? 'awake' : 'sleeping'}"`)});
  globalThis.DayCats = Object.freeze({...day, svg: (pose, coat) => {
    pose = day.options.some(option => option.id === pose) ? pose : 'relax';
    if (pose === 'gaze') {
      coat = faces.normalizeCoat(coat);
      return `<img class="cat-day-scene day-cat-image" src="assets/window-gaze-v1/${coat}.png?v=${windowGazeVersions[coat]}" alt="" aria-hidden="true" data-asset-key="${coat}/day-gaze-window" data-cat-coat="${coat}" width="152" height="152" data-day-scene="gaze" data-cat-pose="window-rear">`;
    }
    return image(coat, 'day-' + pose, 'cat-day-scene day-cat-image', `width="152" height="152" data-day-scene="${pose}"`);
  }});
  // Rooftop artwork remains independent of the window-gazing pose.
  globalThis.RoofCats = Object.freeze({svg: coat => {
    coat = faces.normalizeCoat(coat);
    return `<img class="roof-cat" src="assets/roof-cats-v2/${coat}.png" alt="" aria-hidden="true" data-asset-key="rear/${coat}" data-cat-coat="${coat}" data-cat-pose="rear">`;
  }});
  // Retain a small working set of decoded images, never the whole cat catalog.
  const cache = new Map(), limit = 12;
  const selector = 'img[data-asset-key], svg.cat-face, .care-scene img';
  function remember(src, image) {
    if (!src) return;
    if (cache.has(src)) {
      const entry = cache.get(src); cache.delete(src); cache.set(src, entry);
      return;
    }
    image ||= new Image();
    cache.set(src, image);
    image.loading = 'eager';
    image.addEventListener('error', () => { if (cache.get(src) === image) cache.delete(src); }, {once: true});
    if (!image.getAttribute('src')) image.src = src;
    if (typeof image.decode === 'function') void image.decode().catch(() => {});
    while (cache.size > limit) cache.delete(cache.keys().next().value);
  }
  function warm(root) {
    for (const cat of root.querySelectorAll(selector)) {
      const image = cat.matches('img') ? cat : cat.querySelector('image');
      if (image) remember(image.getAttribute('src') || image.getAttribute('href'), image.matches('img') ? image : undefined);
    }
  }
  function preload(markup) {
    const template = document.createElement('template'); template.innerHTML = markup;
    const sources = new Set();
    for (const image of template.content.querySelectorAll('img, svg.cat-face image')) {
      const src = image.getAttribute('src') || image.getAttribute('href');
      if (src) sources.add(src);
      if (sources.size === 4) break;
    }
    for (const src of sources) remember(src);
  }
  function render(target, markup) {
    const template = document.createElement('template'); template.innerHTML = markup;
    for (const image of template.content.querySelectorAll('img[data-asset-key], .care-scene img')) image.loading = 'eager';
    const children = [...template.content.childNodes];
    if (children.length === target.childNodes.length && children.every((node, i) => node.isEqualNode(target.childNodes[i]))) {
      warm(target); return;
    }
    // Reuse identical cat nodes when only surrounding text/data changes.
    const existing = new Map();
    for (const cat of target.querySelectorAll(selector)) {
      const key = cat.outerHTML;
      if (!existing.has(key)) existing.set(key, []);
      existing.get(key).push(cat);
    }
    for (const cat of template.content.querySelectorAll(selector)) {
      const previous = existing.get(cat.outerHTML)?.shift();
      if (previous) cat.replaceWith(previous);
    }
    target.replaceChildren(template.content);
    // Cached images must not retain entire detached screens through their parents.
    for (const image of cache.values()) if (!image.isConnected) image.remove();
    warm(target);
  }
  globalThis.CatImages = Object.freeze({preload, render, warm});
})();
