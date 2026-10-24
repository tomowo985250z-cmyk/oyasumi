// Original photographic room materials. Existing cat anchors, live window,
// seasonal furniture and sun/moon/light calculations remain in their modules.
globalThis.BedroomRealism=(()=>{
 const base=SceneryMaterials,lighting=SolarLighting,ns='http://www.w3.org/2000/svg',root='assets/bedroom-realism-v1/';let serial=0;
 const images=new Map();
 function ready(w){return Promise.all(['shell','plant','basket','picture','clock',w.season==='autumn'||w.season==='winter'?'kotatsu':'cushion'].map(name=>{if(!images.has(name)){const img=new Image();img.src=root+name+'.webp';images.set(name,img.decode().catch(()=>{}));}return images.get(name);}));}
 function art(source,where,w){
  const original=base.art(source,where,w);if(where!=='room')return original;
  const doc=new DOMParser().parseFromString(original,'image/svg+xml');if(doc.querySelector('parsererror'))throw Error('Invalid photographic bedroom SVG');
  const svg=doc.documentElement,defs=svg.querySelector('defs'),main=svg.querySelector('g[filter]'),id='bedroom-realism-'+(++serial),cold=w.season==='autumn'||w.season==='winter';
  const node=(tag,attrs={})=>{const n=doc.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
  const tone=SolarLighting.palette(w,phase=>({rgb:phase==='night'?'#9da9ae':phase==='evening'?'#efd1ad':phase==='morning'?'#f1f8f0':'#ffffff'})).rgb;
  const [r,g,b]=[1,3,5].map(i=>(parseInt(tone.slice(i,i+2),16)/255).toFixed(5));
  const filter=node('filter',{id:id+'-tone','color-interpolation-filters':'sRGB'});filter.innerHTML=`<feColorMatrix type="matrix" values="${r} 0 0 0 0 0 ${g} 0 0 0 0 0 ${b} 0 0 0 0 0 1 0"/>`;defs.append(filter);
  const objects=node('filter',{id:id+'-objects','color-interpolation-filters':'sRGB'});objects.innerHTML=`<feColorMatrix type="saturate" values=".88"/><feColorMatrix type="matrix" values="${r*.96} 0 0 0 ${r*.015} 0 ${g*.96} 0 0 ${g*.015} 0 0 ${b*.96} 0 ${b*.015} 0 0 0 1 0"/>`;defs.append(objects);
  const image=(name,x,y,width,height)=>node('image',{href:root+name+'.webp',x,y,width,height,preserveAspectRatio:'none',filter:`url(#${id}-${name==='shell'?'tone':'objects'})`,'data-bedroom-photo':name});
  const plant=svg.querySelector('[data-scene-object="potted-plant"]'),basket=svg.querySelector('[data-scene-object="basket"]'),picture=svg.querySelector('[data-scene-object="picture"]'),kotatsu=svg.querySelector('[data-season-furniture="kotatsu"]');
  const marker=[...main.childNodes].find(n=>n.nodeType===8&&n.textContent.includes('Rounded window'))||doc.createComment('Rounded window, live landscape');
  const yarn=[...main.children].filter(n=>n.matches('ellipse[cx="88"][cy="287"],path[d^="M84 284"]'));
  main.replaceChildren(image('shell',0,0,400,330),marker);
  const shadow=(cx,cy,rx,ry)=>node('ellipse',{cx,cy,rx,ry,fill:'#303b32',opacity:'.14',filter:'url(#shadow)'});
  if(cold&&kotatsu){
   const support=kotatsu.querySelector('path[d^="M132 242"]')?.cloneNode(true);kotatsu.replaceChildren();if(support){support.setAttribute('fill','none');kotatsu.append(support);}
   kotatsu.append(shadow(200,299,79,4),image('kotatsu',115,233,170,68));main.append(kotatsu);
  }else{
   const cushion=node('g',{'data-season-furniture':'cushion','data-support':'207 275'});cushion.append(shadow(207,291.5,57,3),image('cushion',148,246.5,118,47));
   // Keep the original invisible surface for the existing edge-light reflection.
   cushion.append(node('path',{d:'M143 259q-5-24 13-29 43-11 85 0 19 6 13 29-45 21-111 0Z',fill:'none'}));main.append(cushion);
  }
  if(plant){plant.replaceChildren(shadow(0,4,18,2.1),node('ellipse',{cx:0,cy:3.6,rx:12,ry:1,fill:'#38352a',opacity:'.17'}),image('plant',-28,-130,60,134));main.append(plant);}
  if(basket){basket.replaceChildren(shadow(0,0,23,2),image('basket',-27,-38,55,38));main.append(basket);}
  if(picture){picture.removeAttribute('transform');picture.replaceChildren(image('picture',270,76,38,43));main.append(picture);}
  main.append(...yarn);svg.dataset.bedroomRealism='1';ready(w);
  return new XMLSerializer().serializeToString(svg);
 }
 function contact(html,where,place,night,w){
  const original=base.contact(html,where,place,night,w);
  if(where!=='room'||['window','corner'].includes(place))return original;
  const cold=['autumn','winter'].includes(w.season);
  // Share measured alpha contact: x207 is the rug centre. Warm-season feet
  // meet the centred cushion; cold-season feet meet the tabletop farther back.
  const measured=cold?original:base.contact(html,where,place,night,{...w,season:'autumn'});
  return measured.replace(/--season-cat-top:([\d.]+)%/,(_,top)=>`--season-cat-top:${Number(top)+(cold?-10:22)/3.3}%`);
 }
 function roomLight(source,w){
  const original=lighting.room(source,w);if(!source.includes('data-bedroom-realism="1"'))return original;
  const doc=new DOMParser().parseFromString(original,'image/svg+xml');
  // An uninterrupted pane has no centre bars to cast these old grid shadows.
  doc.querySelectorAll('[data-solar-window-light] > g[clip-path],[data-solar-edge-shadow]').forEach(n=>n.replaceChildren());
  if(!['autumn','winter'].includes(w.season))doc.querySelectorAll('path[fill$="-edge-bounce)"]').forEach(n=>n.setAttribute('d','M151 280.5q-5-24 13-29 43-11 85 0 19 6 13 29-45 21-111 0Z'));
  return new XMLSerializer().serializeToString(doc.documentElement);
 }
 globalThis.SceneryMaterials=Object.freeze({...base,art,contact});
 globalThis.SolarLighting=Object.freeze({...lighting,room:roomLight});
 return Object.freeze({art,contact,ready});
})();
