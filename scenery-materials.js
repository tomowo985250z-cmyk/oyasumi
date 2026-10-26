// Quiet, static SVG material detail. Shared seasonal palette; no images, filters,
// clocks, observers or state of its own. Geometry remains in the native viewBox.
globalThis.SceneryMaterials=(()=>{
 const ns='http://www.w3.org/2000/svg';let sequence=0;
 const cold=w=>w.season==='autumn'||w.season==='winter';
 const tabletop='M132 242Q200 234 268 242L280 258Q200 273 120 258Z';
 const tabletopSupport='M139 239Q207 231 275 239L287 255Q207 270 127 255Z';
 const mix=(a,b,t)=>SeasonLandscape.mix(a,b,t);
 function art(source,where,w){
  const doc=new DOMParser().parseFromString(source.replace('<svg ',`<svg xmlns="${ns}" `).replace(/\sxmlns="[^"]+"(?=[^>]*\sxmlns=)/,'').replace(/\s(data-[\w-]+)(?=\s|>)/g,' $1=""'),'image/svg+xml');
  if(doc.querySelector('parsererror'))throw Error('Invalid material SVG ('+where+'): '+doc.querySelector('parsererror').textContent);
  const svg=doc.documentElement,p=SeasonLandscape.theme(w),id='material-'+(++sequence),main=svg.querySelector('g[filter]')||svg;
  let defs=svg.querySelector('defs');if(!defs){defs=doc.createElementNS(ns,'defs');svg.prepend(defs);}
  const add=(parent,html)=>{const holder=doc.createElementNS(ns,'g');holder.innerHTML=html;const nodes=[...holder.childNodes];parent.append(...nodes);return nodes[0];};
  const node=(tag,attrs)=>{const n=doc.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
  let serial=0;
  const gradient=(base,axis='vertical',depth=.26)=>{
   const key=id+'-'+(++serial),g=node('linearGradient',{id:key,x1:0,y1:0,x2:axis==='vertical'?0:1,y2:axis==='vertical'?1:0});
   for(const [offset,color]of [[0,mix(base,p.woodLight,.18)],[.34,base],[1,mix(base,p.shadow,depth)]])g.append(node('stop',{offset,'stop-color':color}));
   defs.append(g);return `url(#${key})`;
  };
  const fill=n=>{for(let t=n;t;t=t.parentElement){const f=t.getAttribute('fill');if(/^#[a-f0-9]{6}$/i.test(f||''))return f;}return p.wood;};
  const shade=(n,axis,depth)=>{if(n)n.setAttribute('fill',gradient(fill(n),axis,depth));};
  const paths=[...main.querySelectorAll('path')],find=d=>paths.find(n=>n.getAttribute('d')?.startsWith(d));
  const details=(html,clip)=>{
   const group=doc.createElementNS(ns,'g');group.dataset.material='surface';
   if(clip){const key=id+'-clip-'+(++serial),c=node('clipPath',{id:key});c.append(node('path',{d:clip}));defs.append(c);group.setAttribute('clip-path',`url(#${key})`);}
   add(group,html);return group;
  };
  const grain=(count,start,step,width)=>Array.from({length:count},(_,i)=>{
   const y=start+i*step+(i%3-1)*step*.19,x=(i*47)%65-20;
   return `M${x} ${y}q${width*.16} ${i%2?1.8:-1.4} ${width*.32} .2m${width*.08} .5q${width*.18} ${i%2?-1.5:1} ${width*.27} -.2`;
  }).join('');
  if(where==='room'){
   find('M214 143h34')?.remove(); // An orphan wall stroke has no supporting object.
   // Plank grain follows the established floor perspective, under furniture.
   const g=details(`<path d="${grain(16,235,6,420)}" fill="none" stroke="${p.trunk}" stroke-opacity=".11" stroke-width=".55"/><path d="M26 261q8-4 21 0t22 0m41 42q12-3 24 0t22 1m188-49q9-2 19 0" fill="none" stroke="${p.woodLight}" stroke-opacity=".32" stroke-width=".6"/>`,'M0 236 309 228 400 258v72H0Z');
   const marker=[...main.childNodes].find(n=>n.nodeType===8&&n.textContent.includes('Rounded window'));main.insertBefore(g,marker||main.firstChild);
   shade(find('M46 170h116'),'vertical',.19);
   const sill=svg.querySelector('rect[x="30"][y="158"]');
   if(sill){const wood=details(`<path d="M37 164q35-3 65-1t68 0m-120 3q27-1 53 0t54 0" stroke="${p.trunk}" stroke-opacity=".18" stroke-width=".5" fill="none"/>`);sill.after(wood);}
   const rug=svg.querySelector('ellipse[cx="207"][cy="276"]');shade(rug,'vertical',.14);
   const pillow=find('M143 259');
   if(cold(w)){
    for(const d of ['M143 266','M143 259','M148 256','m152 236'])find(d)?.remove();
    const cloth=mix(p.wood,p.green,.17),clothFill=gradient(cloth,'horizontal',.32),woodFill=gradient(p.woodLight,'vertical',.22),edgeFill=gradient(p.wood,'vertical',.42),fold=mix(cloth,p.shadow,.4);
    const group=details(`<ellipse cx="200" cy="289" rx="82" ry="13" fill="${p.shadow}" opacity=".19"/><ellipse cx="200" cy="289" rx="66" ry="7" fill="${p.shadow}" opacity=".10"/><path d="M145 256v33m112-33v33" stroke="${p.wood}" stroke-width="8" stroke-linecap="round"/><path d="M136 250Q200 239 265 250L282 287Q264 298 241 291q-35 13-68 2-28 5-51-5Z" fill="${clothFill}"/><path d="m253 259 20 5 9 23q-12 9-29 6l-13-27Z" fill="${fold}" opacity=".45"/><path d="M148 260q4 17-13 28l9 3q15-13 15-27Zm24 7q8 14-1 26l9 2q8-15 2-27Zm37 2q-4 14 4 27l10-2q-12-14-8-25Z" fill="${fold}" opacity=".35"/><path d="M162 267q7 17-3 24m31-21q-2 17 3 27m35-28q5 14 12 22" fill="none" stroke="${p.woodLight}" stroke-opacity=".27" stroke-width="2.8" stroke-linecap="round"/><path d="M128 284q20 10 44 4 29 13 68-1 20 8 36-1" fill="none" stroke="${p.woodLight}" stroke-opacity=".4" stroke-width="1"/><path d="M125 265q75 18 151 0" fill="none" stroke="${p.shadow}" stroke-opacity=".25" stroke-width="4"/><path d="M120 258v8q80 17 160 0v-8q-80 15-160 0Z" fill="${edgeFill}"/><path d="m268 242 12 16v8l-12-16Z" fill="${mix(p.wood,p.shadow,.4)}"/><path d="${tabletop}" fill="${woodFill}"/><path d="M125 258q76 14 151 0" fill="none" stroke="${p.woodLight}" stroke-width="1.2"/><path d="M140 245q42-3 85 0t37 1m-125 5q59-4 119 0m-117 5q55-2 104 0" fill="none" stroke="${p.trunk}" stroke-opacity=".19" stroke-width=".55"/><ellipse cx="200" cy="256" rx="34" ry="2.7" fill="${p.shadow}" opacity=".13"/>`);
    // Centre the footprint horizontally on the rug, slightly forward.
    group.setAttribute('transform','translate(7 -3)');group.dataset.seasonFurniture='kotatsu';group.dataset.support='207 253';group.dataset.floorSupport='200 289';main.insertBefore(group,svg.querySelector('[data-scene-object="potted-plant"]'));
   }else if(pillow){
    pillow.dataset.seasonFurniture='cushion';
    const cloth=details(`<path d="${grain(9,230,4.2,125)}" stroke="${p.woodLight}" stroke-width=".55" stroke-opacity=".24" fill="none" transform="translate(140 0)"/><path d="M151 251q48 15 93 0" fill="none" stroke="${p.shadow}" stroke-opacity=".13" stroke-width=".8"/>`,pillow.getAttribute('d'));
    pillow.after(cloth);
   }
   const basket=svg.querySelector('[data-scene-object="basket"]');
   if(basket){if(cold(w))basket.setAttribute('transform','translate(84 284)');shade(basket.querySelector('path'),'horizontal',.28);add(basket,`<path d="M-23-20q23 12 47 0m-44 10q20 9 40 0m-36 8q15 5 30 0" stroke="${p.woodLight}" stroke-opacity=".22" stroke-width=".65" fill="none"/>`);}
  }else if(where==='engawa'){
   // Only the floor changes material; keep the sill, posts and furniture.
   const tatami=SolarLighting.palette(w,phase=>({base:phase==='night'?'#49584e':phase==='evening'?'#acb18a':'#b8c69c',light:phase==='night'?'#5c6c59':phase==='evening'?'#c6c39b':'#cbd5b0',edge:phase==='night'?'#35463e':'#637357'}));
   const mat=id+'-tatami',weave=mat+'-weave';
   add(defs,`<linearGradient id="${mat}" x2="0" y2="1"><stop stop-color="${mix(tatami.base,p.green,.05)}"/><stop offset="1" stop-color="${tatami.light}"/></linearGradient><pattern id="${weave}" patternUnits="userSpaceOnUse" width="7" height="3"><path d="M0 .5H7" stroke="${tatami.edge}" stroke-opacity=".14" stroke-width=".45"/><path d="M1 .5v1M4.5 2v1" stroke="${tatami.light}" stroke-opacity=".25" stroke-width=".5"/></pattern>`);
   const matFloor=find('M0 220h400v110');matFloor?.setAttribute('fill',`url(#${mat})`);
   find('M0 262h400')?.parentElement.remove();
   const rim=find('M0 226h400');rim?.setAttribute('stroke',tatami.light);rim?.setAttribute('stroke-width','1.5');
   const g=details(`<path d="M0 226h400v104H0Z" fill="url(#${weave})"/><path d="M0 276h400v2.5H0ZM199 226h2v50h-2Zm0 52.5h2V330h-2Z" fill="${tatami.edge}" opacity=".38"/>`,'M0 226h400v104H0Z');
   main.insertBefore(g,main.children[3]);
   for(const d of ['M60 0h16','M369 0h13','M0 0h400v31'])shade(find(d),'horizontal',.34);
   const grainPosts=details(`<path d="M62 36q4 42 1 84t2 94m6-157q-3 45 0 86m300-99q5 45 0 82t1 83M12 8q70 3 137 0t114 1 124 0M26 18q85-3 169 0t172-1" fill="none" stroke="${p.trunk}" stroke-width=".5" stroke-opacity=".18"/>`);main.append(grainPosts);
   shade(find('M138 262'),'vertical',.23);
   const bowl=svg.querySelector('[data-scene-object="water-bowl"]');if(bowl){shade(bowl.querySelector('path'),'horizontal',.24);add(bowl,`<path d="M-12-13q8-4 18-1" fill="none" stroke="${p.woodLight}" stroke-width=".8" opacity=".65"/>`);}
   const old=find('M102 21h8');if(old){let n=old;for(let i=0;i<4&&n;i++){const next=n.nextElementSibling;n.remove();n=next;}}
   if(w.season==='summer'){
    const chime=details(`<path d="M106 33v16" stroke="${p.trunk}" stroke-width=".65" fill="none"/><path d="M95 60q0-18 11-18t11 18v5q-11 6-22 0Z" fill="${mix(p.cloud,p.sky,.22)}" fill-opacity=".44" stroke="${p.woodLight}" stroke-width=".65"/><path d="M99 57q0-8 4-10" fill="none" stroke="${p.cloud}" stroke-width="1" opacity=".65"/><path d="M106 63v24" stroke="${p.trunk}" stroke-width=".6"/><path d="m103 83 9 2-4 21-8-3Z" fill="${p.woodLight}" opacity=".8"/>`);chime.dataset.sceneObject='wind-chime';main.append(chime);
   }
  }else if(where==='garden'){
   const dirt=details(`<path d="M0 276q70-15 139 0t161 3 100-5v56H0Z" fill="${p.trunk}" opacity=".05"/><path d="M14 282h3m35-12h2m40 38h3m206-25h2m39 25h3m-34-44h2m-226 21h2m34 38h3" stroke="${p.trunk}" stroke-opacity=".22" stroke-width=".9" stroke-linecap="round"/><path d="M29 252h5m79 26h4m174 42h8m27-45h4" stroke="${p.woodLight}" stroke-opacity=".22" stroke-width=".7"/>`,'M0 222q89-19 184-2t216-2v112H0Z');main.insertBefore(dirt,main.children[2]);
   for(const selector of ['ellipse[cx="93"][cy="298"]','ellipse[cx="48"][cy="325"]'])shade(svg.querySelector(selector),'vertical',.3);
   shade(find('M121 254'),'vertical',.24);shade(find('M121 260'),'vertical',.38);
   const rock=details(`<path d="M133 249q29-8 50-7m67 3 12 4M74 295q10-4 20-3m-63 30q11-4 26-2" fill="none" stroke="${p.woodLight}" stroke-width=".75" stroke-opacity=".25"/>`);main.append(rock);
   const crown=svg.querySelector('[data-tree-crown]');
   if(crown){for(const e of crown.children)shade(e,'vertical',.26);add(crown,`<g fill="${p.leafLight}" opacity=".15"><path d="M-62-162q14-17 28-7-9 15-28 7m38-31q19-20 31-10-8 13-31 10m33 25q17-13 27-5-10 12-27 5"/></g>`);}
   const tree=svg.querySelector('[data-scene-object="garden-tree"]');if(tree){const bark=add(tree,`<path d="M-1-4q3-43-1-73m-2-9q2-25-4-50" fill="none" stroke="${p.woodLight}" stroke-opacity=".23" stroke-width="1.1" stroke-linecap="round"/>`);if(crown)tree.insertBefore(bark,crown);}
  }else if(where==='landscape'){
   const ridge=svg.querySelector('[data-depth="distant-ridge"]');let n=ridge;
   for(let i=0;i<3&&n;i++,n=n.nextElementSibling)if(n.localName==='path')shade(n,'vertical',.16+i*.035);
   svg.dataset.material='atmospheric-depth';
  }
  const plant=svg.querySelector('[data-scene-object="potted-plant"]');
  if(plant){
   shade([...plant.children].find(n=>/^M-1[78]-/.test(n.getAttribute('d')||'')),'horizontal',.4);
   const leaves=[...plant.children].find(n=>n.localName==='g'&&n.hasAttribute('fill')&&n.getAttribute('fill')!=='none');
   if(leaves){for(const leaf of leaves.children)shade(leaf,'vertical',.3);}
   const room=where==='room',veins=room?'M-5-84q-9-9-15-17M-5-93q6-15 4-28M3-59q12-14 23-19M-4-59q-13-7-18-16':'M0-29-8-50M0-29 10-48M0-41 1-69';
   const vein=node('path',{d:veins,fill:'none',stroke:mix(p.green,p.woodLight,.22),'stroke-width':.65,'stroke-opacity':.5});leaves?.after(vein);
   const body=[...plant.children].find(n=>/^M-1[78]-/.test(n.getAttribute('d')||''));
   if(body){const pot=details(`<path d="${room?'M-13-28q1 12 4 21':'M-12-19l3 16'}" stroke="${p.woodLight}" stroke-opacity=".25" stroke-width="1.1" stroke-linecap="round" fill="none"/>`);body.after(pot);}
   const rim=plant.querySelector(room?'ellipse[rx="18"]':'ellipse[rx="17"]'),lip=plant.querySelector('[data-plant-root]')?.nextElementSibling;
   if(rim&&lip)lip.setAttribute('stroke',fill(rim));
  }
  svg.dataset.material='storybook';return new XMLSerializer().serializeToString(svg);
 }
 // Measured alpha contact, not the transparent image rectangle. Only the
 // furniture anchor changes; coat, size, mood, journey and sleep remain intact.
 function contact(html,where,place,night,w){
  if(where!=='room'||!cold(w)||place==='window')return '';
  const a=IndoorCatScale.contact(html.match(/data-asset-key="([^"]+)"/)?.[1]);if(!a)return '';
  const explicit=night&&night.pose!=='seated',width=explicit?Number(night.style.match(/--night-width:([\d.]+)%/)?.[1])*4:place==='corner'?140:160;
  const height=explicit?Number(night.style.match(/--night-height:([\d.]+)%/)?.[1])*3.3:width;
  const beside=place==='corner',x=beside?310:207,y=beside?318:253;
  return `--season-cat-left:${(x-((a[2]+a[4])/2/a[0]-.5)*width)/4}%;--season-cat-top:${(y-a[5]/a[1]*height)/3.3}%;`;
 }
 function support(stage,meal=false){return stage.dataset.location==='room'&&cold({season:stage.dataset.worldSeason})&&(meal||stage.dataset.place==='cushion')?tabletopSupport:null;}
 function roof(d){
  const lines=[2,-12].map((x,row)=>Array.from({length:23},(_,n)=>{const i=n-9;return `M${x+34*i} ${86+row*13+i}q17 4 34 1`;}).join('')).join('');
  return `<defs><clipPath id="material-roof-clip"><path d="${d}"/></clipPath><linearGradient id="material-tile-roll" x2="0" y2="1"><stop stop-color="#78909d" stop-opacity=".09"/><stop offset=".55" stop-color="#78909d" stop-opacity="0"/><stop offset="1" stop-color="#071421" stop-opacity=".25"/></linearGradient></defs><g data-material="roof-tiles" clip-path="url(#material-roof-clip)"><path d="${d}" fill="url(#material-tile-roll)"/><path d="${lines}" transform="translate(0 -.8)" fill="none" stroke="#8fa1a9" stroke-width=".5" stroke-opacity=".2"/><path d="${lines}" transform="translate(0 1.2)" fill="none" stroke="#061420" stroke-width="1.3" stroke-opacity=".4"/><path data-night-tile-shadow="" d="${lines}" transform="translate(0 2)" fill="none" stroke="#21344b" stroke-width="2.1" stroke-linecap="round" style="opacity:calc(var(--roof-night-ink,0) * .22)"/></g>`;
 }
 return Object.freeze({art,contact,support,roof});
})();

// Isolated material study: static SVG only, existing clock and lighting retained.
(()=>{
 if(new URLSearchParams(location.search).get('interior')==='existing')return;
 const baseMaterials=SceneryMaterials,baseLighting=SolarLighting,ns='http://www.w3.org/2000/svg';let serial=0;
 const mix=SeasonLandscape.mix;
 const palette=w=>{
  const p=baseLighting.palette(w,phase=>phase==='night'?{wood:'#635b4b',light:'#82715a',dark:'#393e37',fiber:'#999887',fade:'#969785'}:phase==='evening'?{wood:'#aa8358',light:'#cfac7a',dark:'#695b43',fiber:'#dbd6af',fade:'#d4d2a9'}:{wood:'#aa845c',light:'#d1b18a',dark:'#746046',fiber:'#e0e4c6',fade:'#d5d8b5'});
  const wet=w.weather==='rainy'?.15:w.weather==='cloudy'?.07:0;
  for(const k of ['wood','light','dark'])p[k]=mix(p[k],'#6b7977',wet);
  return p;
 };
 const parse=source=>new DOMParser().parseFromString(source,'image/svg+xml').documentElement;
 const html=(svg,source)=>{const g=svg.ownerDocument.createElementNS(ns,'g');g.innerHTML=source;return [...g.childNodes];};
 const woodDefs=(id,p)=>`<linearGradient id="${id}-wood" x2="1" y2="0"><stop stop-color="${p.dark}"/><stop offset=".18" stop-color="${p.wood}"/><stop offset=".46" stop-color="${p.light}"/><stop offset=".69" stop-color="${p.wood}"/><stop offset="1" stop-color="${p.dark}"/></linearGradient><linearGradient id="${id}-beam" x2="0" y2="1"><stop stop-color="${p.dark}"/><stop offset=".24" stop-color="${p.wood}"/><stop offset=".76" stop-color="${mix(p.wood,p.light,.28)}"/><stop offset="1" stop-color="${p.dark}"/></linearGradient>`;
 const grain=(id,p,vertical,horizontal)=>`<path d="${vertical}" fill="none" stroke="${p.dark}" stroke-width=".48" stroke-opacity=".24"/><path d="${horizontal}" fill="none" stroke="${p.dark}" stroke-width=".43" stroke-opacity=".23"/>`;
 function art(source,where,w){
  const original=baseMaterials.art(source,where,w);if(where!=='engawa')return original;
  const svg=parse(original),defs=svg.querySelector('defs'),main=svg.querySelector('g[filter]'),id='interior-'+(++serial),p=palette(w),paths=[...main.querySelectorAll('path')],find=d=>paths.find(n=>n.getAttribute('d')?.startsWith(d));
  defs.append(...html(svg,woodDefs(id,p)));
  for(const d of ['M60 0h16','M369 0h13'])find(d)?.setAttribute('fill',`url(#${id}-wood)`);
  for(const d of ['M0 0h400v31','M0 215h400','M57.35 220.7'])find(d)?.setAttribute('fill',`url(#${id}-beam)`);
  for(const d of ['M64 0h6','M372 0h5','M0 26h400']){const n=find(d);if(n){n.setAttribute('fill',p.light);n.setAttribute('fill-opacity','.34');}}
  const woodClip='M60 0h16v224H60Z M369 0h13v224h-13Z M0 0h400v31H0Z M0 215h400v9H0Z M57.35 220.7h285.3V228H57.35Z';
  let vertical='';for(const [left,right]of [[60,76],[369,382]])for(let i=0;i<8;i++){const x=left+1+i*(right-left-2)/8;vertical+=`M${x} 2q${i%2?1.1:-.7} 39 .2 75t.1 80 .4 65`;}
  // SVG filters use the un-clipped geometry bounds. Keep grain inside the
  // original 0..400 extent so the shared paper texture stays unchanged outdoors.
  let horizontal='';for(let i=0;i<13;i++){const y=i<8?2+i*3.65:216+(i-8)*2.3;horizontal+=`M0 ${y}q43 ${i%2?1:-.8} 89 .1t100 -.2 109 .3 102 -.1`;}
  defs.append(...html(svg,`<clipPath id="${id}-wood-clip"><path d="${woodClip}"/></clipPath><radialGradient id="${id}-fade" cx=".72" cy=".12" r=".86"><stop stop-color="${p.fade}" stop-opacity=".27"/><stop offset=".58" stop-color="${p.fade}" stop-opacity=".06"/><stop offset="1" stop-color="${p.fade}" stop-opacity="0"/></radialGradient>`));
  main.append(...html(svg,`<g data-interior-study="wood" pointer-events="none" clip-path="url(#${id}-wood-clip)">${grain(id,p,vertical,horizontal)}<path d="M61 36v174M370 39v170M7 27q72-1 137 .2t149 -.3 99 .1M82 222.7h244" fill="none" stroke="${p.light}" stroke-width=".65" stroke-opacity=".28"/></g>`));
  const weave=defs.querySelector('pattern[id$="-weave"]');if(weave){weave.setAttribute('width','5.8');weave.setAttribute('height','2.4');weave.innerHTML=`<path d="M0 .5h5.8M0 1.65h5.8" stroke="${p.dark}" stroke-opacity=".075" stroke-width=".33"/><path d="M.8 .5v.65M2.65 1.65v.7M4.7 .5v.65" stroke="${p.fiber}" stroke-opacity=".32" stroke-width=".48"/>`;}
  const mat=[...main.querySelectorAll('[data-material="surface"]')].find(g=>g.querySelector('path[fill$="-weave)"]'));
  if(mat)mat.prepend(...html(svg,`<path data-interior-study="tatami-fade" d="M0 226h400v104H0Z" fill="url(#${id}-fade)"/><path d="M0 232q87 2 198 0t202 .5M0 289q71-1 199 .3t201 -.5M16 317q81 1 181 -.2t189 .3" fill="none" stroke="${p.fiber}" stroke-width=".5" stroke-opacity=".16"/>`));
  return new XMLSerializer().serializeToString(svg);
 }
 function place(source,where,w){
  const original=baseLighting.place(source,where,w);if(where!=='engawa')return original;
  const svg=parse(original),s=SolarSky.state(w,where),night=SolarModel.weights(SolarModel.time(w)).night;
  // Use the unchanged sun vectors, weather transmission and existing light groups.
  if(s.source==='sun')for(const n of svg.querySelectorAll('[data-caster="pillar"]')){n.setAttribute('opacity',String(.17+.045*(1-night)));n.setAttribute('fill','#454d41');}
  for(const g of svg.querySelectorAll('radialGradient[id$="-lamp-glow"]'))for(const stop of g.querySelectorAll('stop'))stop.setAttribute('stop-opacity',String(Number(stop.getAttribute('stop-opacity'))*1.22));
  for(const g of svg.querySelectorAll('linearGradient[id$="-edge-beam"]'))for(const stop of g.querySelectorAll('stop'))stop.setAttribute('stop-opacity',String(Number(stop.getAttribute('stop-opacity'))*1.18));
  return new XMLSerializer().serializeToString(svg);
 }
 function surround(w,key,header=false){
  const id=key+'-interior'+(header?'-header':''),p=palette(SolarModel.world(w));
  const clip=header?'M57.35 34.5H342.65V41.8H57.35Z':'M63 32H380V37H63Z M63 225H380V231H63Z M63 37H76V225H63Z M369 37H380V225H369Z';
  let v='';if(!header)for(const [x,width]of [[63,13],[369,11]])for(let i=0;i<6;i++)v+=`M${x+.8+i*width/6} 37q${i%2?-.7:.6} 39 .2 79t-.1 108`;
  const ys=header?[35.4,37,39.5,41]:[32.6,34.4,36.2,225.7,227.6,229.7];let h='';for(let i=0;i<ys.length;i++)h+=`M55 ${ys[i]}q42 ${i%2?.4:-.35} 92 .05t110 -.1 130 .1`;
  return `<defs>${woodDefs(id,p)}<clipPath id="${id}-clip"><path d="${clip}"/></clipPath></defs><g data-interior-study="${header?'header':'surround'}" clip-path="url(#${id}-clip)" pointer-events="none"><path d="${clip}" fill="url(#${id}-${header?'beam':'wood'})"/>${!header?`<path d="M63 32H380V37H63Z M63 225H380V231H63Z" fill="url(#${id}-beam)"/>`:''}${grain(id,p,v,h)}<path d="${header?'M60 35h279':'M64 33H379M64 229.5H379M74.5 38V224M370.5 38V224'}" fill="none" stroke="${p.light}" stroke-width=".65" stroke-opacity=".34"/></g>`;
 }
 globalThis.SceneryMaterials=Object.freeze({...baseMaterials,art});
 globalThis.SolarLighting=Object.freeze({...baseLighting,place});
 globalThis.EngawaInteriorStudy=Object.freeze({frame:(w,id)=>surround(w,id),header:(w,id)=>surround(w,id,true),baseMaterials,baseLighting});
})();
