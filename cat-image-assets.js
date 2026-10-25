// Approved artwork. Original asset files and selection rules are retained.
(() => {
  const faces = CatFaces, scenes = CatScenes, day = DayCats;
  const windowGazeVersions = {"black-footed":"5d647b9e78e8eca3","black":"2be3d0be582a375e","brown":"6c9368f3abdc28a4","calico":"c0b7d6678ae8c62a","cheetah":"e357c35b45783219","fishing":"fa91913718bfeee0","gray":"8ff201b042f5c610","jaguar":"423de060b2d01883","leopard":"a6337baf8eb85a4a","manul":"01f12b4d497967a5","orange":"b4bccac537ccbdc3","sand":"6f58014d21e2e5f3","silver":"adda4dd08b94a410","snow-leopard":"74e2b93ee80fd31a","tuxedo":"a2ff32fb3dba1adf","white":"8c28923e3e27523d"};
  const manulVersions = {"face-happy":"37da44072d2fb471","face-sleepy":"8985bc4dac026b8f","face-yawn":"7ae3928ef73ac37e","face-restless":"cec5657221e20ece","face-surprised":"6b15a3556979fb0c","day-relax":"ac95ac535b975f23","morning":"e89ad431e1e0794f","night":"62811751583ab19b","day-play":"1a246b7ca4c87d86","day-groom":"cc1fc206a419fdbf","day-doze":"21498952614402b2","face-calm":"17fa1f567688573e"};
  const homeVersions = {"black-footed/day-doze":"bcbddd3eb13c92c9","black-footed/day-groom":"5ee20562bdae82fc","black-footed/day-play":"921d768e0c32b1d2","black-footed/day-relax":"dce5dde7ba470773","black-footed/morning":"ce6558d781d59d41","black-footed/night":"a244c184c42b3c4d","black/day-doze":"e5b502cc315a3dd0","black/day-groom":"63b5c601b64ed9d4","black/day-play":"d52c92a0d315b61f","black/day-relax":"aa10c0d3f78960b0","black/morning":"f7406b1aefc7e46c","black/night":"74a74a7aa635af8f","brown/day-doze":"268d069b832c7ca0","brown/day-groom":"ec78c599abd491c7","brown/day-play":"9c166c6ad4529078","brown/day-relax":"7bc47b4fa89fc81e","brown/morning":"cf9bb187412b2546","brown/night":"8919720b479609b1","calico/day-doze":"11c723fe11c142fd","calico/day-groom":"f7f6a9ae9dce39be","calico/day-play":"f41eac9044ee46ea","calico/day-relax":"17fbac063ed0411e","calico/morning":"293242ecf8afe638","calico/night":"1da4e5fc0c6ddeb8","cheetah/day-doze":"f55e1593eda90e72","cheetah/day-groom":"7fffe83a81c62d32","cheetah/day-play":"1742bbf4299448f2","cheetah/day-relax":"e6a6d1690cc8b5f9","cheetah/morning":"399f1b74d9d0bb7f","cheetah/night":"28dad1addfcaf194","fishing/day-doze":"dfee09e89049efc2","fishing/day-groom":"b7952551a8fac49b","fishing/day-play":"3ca8141461bf643f","fishing/day-relax":"1e0718175eae1d90","fishing/morning":"dd2e585eeb324600","fishing/night":"d83dd56e1901652e","gray/day-doze":"ad3502c17cb8d546","gray/day-groom":"32e8d624f47c1c16","gray/day-play":"31defaab36703913","gray/day-relax":"063cca895a233ef9","gray/morning":"a0bf1c8db238ff0b","gray/night":"6fe2ea8f05986ffc","jaguar/day-doze":"f9c2f92f6e44ac9b","jaguar/day-groom":"484c39a8f184c1c9","jaguar/day-play":"b5db61389a8f983c","jaguar/day-relax":"3f9e241fa3704b42","jaguar/morning":"a936343d3baccd45","jaguar/night":"75ca02c3d96e161e","leopard/day-doze":"f2b7e136d006af42","leopard/day-groom":"a23d838db04d25da","leopard/day-play":"1e23fb7492905260","leopard/day-relax":"31272d8989e8de7e","leopard/morning":"bea710ce8b646729","leopard/night":"096a6b9c40854572","manul/day-doze":"21498952614402b2","manul/day-groom":"cc1fc206a419fdbf","manul/day-play":"1a246b7ca4c87d86","manul/day-relax":"ac95ac535b975f23","manul/morning":"e89ad431e1e0794f","manul/night":"62811751583ab19b","orange/day-doze":"961cb641e775db0b","orange/day-groom":"0fca580c9c130613","orange/day-play":"dc3f7895b8916a71","orange/day-relax":"98740ed5a8fa18b8","orange/morning":"d99af8cb72fd8df3","orange/night":"fd2ed8d1a5d67d07","sand/day-doze":"5e62c396ecedc6fb","sand/day-groom":"3ba4a5df8059da68","sand/day-play":"85b08caea57edccb","sand/day-relax":"ab106ffc0f9dd01f","sand/morning":"7c2545274761e9be","sand/night":"a12b13cf3dacb0bb","silver/day-doze":"ca118f557178bfca","silver/day-groom":"8f8f66b3710e2652","silver/day-play":"26be49ef9541fb22","silver/day-relax":"3aa3fd7815de799c","silver/morning":"7e8036915d4f8f66","silver/night":"8c2a1fddc2041771","snow-leopard/day-doze":"2b02aae33665d9ec","snow-leopard/day-groom":"a288a819691dfd66","snow-leopard/day-play":"7f69b7d297756eea","snow-leopard/day-relax":"b6784f166648efa9","snow-leopard/morning":"da59832a73e0d75f","snow-leopard/night":"e51023b2d2699ff2","tuxedo/day-doze":"78393dbc9048bcee","tuxedo/day-groom":"a94b3e046613c65e","tuxedo/day-play":"23911042e4aec607","tuxedo/day-relax":"8eeeb5d38d70c96f","tuxedo/morning":"7ea7818ff0551d80","tuxedo/night":"fa451ef4d259c39a","white/day-doze":"0c9988bed30dd893","white/day-groom":"ccd121ce3b728226","white/day-play":"0c9a802f57e35f8a","white/day-relax":"de8f7abf568bfd58","white/morning":"ef5ea38f6e788a4a","white/night":"a70493799cfee941"};
  const image = (coat, frame, classes, extra = '') => {
    coat = faces.normalizeCoat(coat);
    // Keep the restored calm icon; its five expression edits share that identity.
    if (coat === 'manul' && frame === 'face-calm') return faces.svg('calm', 'manul');
    if (coat === 'manul' && frame.startsWith('face-')) return `<img class="${classes}" src="assets/manul-expressions-v2/${frame}.png?v=${manulVersions[frame]}" alt="" aria-hidden="true" data-asset-key="${coat}/${frame}" data-cat-coat="${coat}" ${extra}>`;
    const revision=homeVersions[coat+'/'+frame]||(coat==='manul'?manulVersions[frame]:''),version=revision?'?v='+revision:'';
    return `<img class="${classes}" src="assets/cat-refresh-v1/${coat}/${frame}.png${version}" alt="" aria-hidden="true" data-asset-key="${coat}/${frame}" data-cat-coat="${coat}" ${extra}>`;
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
  const timings=[],coatMaxAge=7*86400000;
  const coatKey=scope=>'oyasumi-confirmed-coat-v1:'+scope;
  const validCoat=coat=>faces.coats.some(c=>c.id===coat);
  function record(stage,src,start) {
    timings.push({stage,src,start,ms:performance.now()-start});if(timings.length>40)timings.shift();
  }
  // A cached coat is an image-loading hint, never a source of rendered state.
  // Bind it to the authenticated user and project/auth-storage namespace.
  function primeCoat(userId,scope) {
    if(!userId||!scope)return;
    try {
      const key=coatKey(scope),saved=JSON.parse(localStorage.getItem(key)||'null');
      if(!saved)return;
      if(saved.version!==1||saved.userId!==userId||!validCoat(saved.coat)||!Number.isFinite(saved.at)||Date.now()-saved.at>coatMaxAge||saved.at>Date.now()+60000){localStorage.removeItem(key);return;}
      // Identity alone cannot choose a sleep state, pose or server-clock scene.
      // The existing onOwnCat callback warms exactly the confirmed home image.
    }catch{ /* Missing, disabled or damaged storage does not block startup. */ }
  }
  function confirmCoat(userId,scope,coat,expression,now) {
    if(!userId)return;
    if(!validCoat(coat)){try{localStorage.removeItem(coatKey(scope));}catch{}return;}
    try{localStorage.setItem(coatKey(scope),JSON.stringify({version:1,userId,coat,at:Date.now()}));}catch{}
    // The authenticated home path preloads its confirmed state at high priority.
    // Persist the hint without speculating another pose before that state arrives.
  }
  const selector = 'img[data-asset-key], svg.cat-face, .care-scene img';
  function remember(src, image, priority='low') {
    if (!src) return;
    if (cache.has(src)) {
      const entry = cache.get(src); cache.delete(src); cache.set(src, entry);
      if(priority==='high')entry.fetchPriority='high';
      return;
    }
    image ||= new Image();
    cache.set(src, image);
    if(image.loading!=='lazy')image.loading = 'eager';
    image.fetchPriority=priority;image.decoding='async';
    const start=performance.now();
    if(image.complete&&image.naturalWidth)record('image-cached',src,start);
    else image.addEventListener('load',()=>record('image-load',src,start),{once:true});
    image.addEventListener('error', () => { if (cache.get(src) === image) cache.delete(src); }, {once: true});
    if (!image.getAttribute('src')) image.src = src;
    if (typeof image.decode === 'function') void image.decode().then(()=>record('image-decode',src,start)).catch(() => {});
    while (cache.size > limit) cache.delete(cache.keys().next().value);
  }
  const watched=new Set(),feedIcon=cat=>!!cat.closest('.post .avatar,.mini-row .avatar');
  const sources=cat=>cat.matches('img')?[cat]:[...cat.querySelectorAll('image')];
  function loadCat(cat){
    for(const image of sources(cat)){
      const attribute=image.matches('img')?'src':'href';
      if(image.dataset.catSrc&&image.getAttribute(attribute)!==image.dataset.catSrc)image.setAttribute(attribute,image.dataset.catSrc);
      remember(image.getAttribute(attribute),image.matches('img')?image:undefined,cat.closest('.own-cat-room .room-resident')?'high':'low');
    }
  }
  const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
    for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);watched.delete(entry.target);if(entry.target.isConnected)loadCat(entry.target);}
  },{rootMargin:'180px 0px'}):null;
  function warm(root) {
    for(const cat of watched)if(!cat.isConnected){observer?.unobserve(cat);watched.delete(cat);}
    for (const cat of root.querySelectorAll(selector)) {
      if(observer&&feedIcon(cat)){
        const r=cat.getBoundingClientRect();
        if(!r.width||r.bottom< -180||r.top>innerHeight+180){if(!watched.has(cat)){watched.add(cat);observer.observe(cat);}continue;}
      }
      loadCat(cat);
    }
  }
  function preload(markup,{priority='low',max=4}={}) {
    const template = document.createElement('template'); template.innerHTML = markup;
    const sources = new Set();
    for (const image of template.content.querySelectorAll('img, svg.cat-face image')) {
      const src = image.getAttribute('src') || image.getAttribute('href');
      if (src) sources.add(src);
      if (sources.size === max) break;
    }
    for (const src of sources) remember(src,undefined,priority);
  }
  // Canonical sources keep the same icon node when its deferred image becomes visible.
  function imageKey(cat){
    if(!cat.matches('[data-cat-src]')&&!cat.querySelector('[data-cat-src]'))return cat.outerHTML;
    // Cloning a live <img> and setting src can itself start another download.
    const template=document.createElement('template');template.innerHTML=cat.outerHTML;
    const copy=template.content.firstElementChild;
    for(const image of [copy,...copy.querySelectorAll('[data-cat-src]')])if(image.dataset.catSrc){image.setAttribute(image.matches('img')?'src':'href',image.dataset.catSrc);image.removeAttribute('data-cat-src');}
    return copy.outerHTML;
  }
  function render(target, markup, {resolved = true,confirmed = ''} = {}) {
    const template = document.createElement('template'); template.innerHTML = markup;
    // Keep the existing geometry, without attaching/requesting provisional art.
    if (!resolved) for (const cat of template.content.querySelectorAll(selector)) {
      if(confirmed&&cat.closest(confirmed))continue;
      cat.setAttribute('data-cat-placeholder', '');
      for (const image of [cat, ...cat.querySelectorAll('image')]) {
        image.removeAttribute('src'); image.removeAttribute('href');
      }
    }
    for(const cat of template.content.querySelectorAll(selector)){
      const deferred=feedIcon(cat);
      for(const image of sources(cat)){
        if(image.matches('img')){image.loading='eager';image.decoding='async';image.fetchPriority=cat.closest('.own-cat-room .room-resident')?'high':'low';}
        const attribute=image.matches('img')?'src':'href',src=image.getAttribute(attribute);
        if(deferred&&src){image.dataset.catSrc=src;image.removeAttribute(attribute);}
      }
    }
    const children = [...template.content.childNodes];
    if (children.length === target.childNodes.length && children.every((node, i) => node.isEqualNode(target.childNodes[i]))) {
      warm(target); return;
    }
    const content=document.createDocumentFragment();content.append(template.content);
    // Reuse identical cat nodes when only surrounding text/data changes.
    const existing = new Map();
    for (const cat of target.querySelectorAll(selector)) {
      const key = imageKey(cat);
      if (!existing.has(key)) existing.set(key, []);
      existing.get(key).push(cat);
    }
    for (const cat of content.querySelectorAll(selector)) {
      const previous = existing.get(imageKey(cat))?.shift();
      if (previous) cat.replaceWith(previous);
    }
    // Home can also adopt its in-flight preloader, keeping one load/decode owner.
    for(const cat of content.querySelectorAll('img[data-asset-key]')){
      const src=cat.getAttribute('src')||cat.dataset.catSrc,cached=cache.get(src);
      if(!cached?.matches('img')||cached===cat||content.contains(cached)||(cached.isConnected&&!target.contains(cached)))continue;
      if((!cached.complete||!cached.naturalWidth)&&!cat.closest('.own-cat-room .room-resident'))continue;
      for(const attribute of [...cached.attributes])if(attribute.name!=='src'&&!cat.hasAttribute(attribute.name))cached.removeAttribute(attribute.name);
      for(const attribute of [...cat.attributes])if(cached.getAttribute(attribute.name)!==attribute.value)cached.setAttribute(attribute.name,attribute.value);
      cat.replaceWith(cached);
    }
    target.replaceChildren(content);
    // Cached images must not retain entire detached screens through their parents.
    for (const image of cache.values()) if (!image.isConnected) image.remove();
    warm(target);
  }
  globalThis.CatImages = Object.freeze({preload, render, warm,primeCoat,confirmCoat,get timings(){return timings.map(t=>({...t}));}});
})();
