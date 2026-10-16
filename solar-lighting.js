// Original 2.5D projection for the unchanged v2 artwork. All casts use one source.
globalThis.SolarLighting=(()=>{
 let sequence=0;
 const ns='http://www.w3.org/2000/svg';
 const parse=source=>{const normalized=(/<svg[^>]*\bxmlns=/.test(source)?source:source.replace('<svg ',`<svg xmlns="${ns}" `)).replace(/\s(data-[\w-]+)(?=\s|>)/g,' $1=""'),doc=new DOMParser().parseFromString(normalized,'image/svg+xml');if(doc.querySelector('parsererror'))throw Error(doc.querySelector('parsererror').textContent);return doc.documentElement;};
 const stringify=svg=>new XMLSerializer().serializeToString(svg);
 const points=p=>p.map(a=>a.map(n=>Number(n.toFixed(3))).join(',')).join(' ');
 const polygon=(p,fill,opacity,attrs='')=>`<polygon points="${points(p)}" fill="${fill}" opacity="${opacity}" ${attrs}/>`;
 function palette(w,build){
  if(!w.solar)return build(w.phase);
  const weights=SolarModel.weights(SolarModel.time(w)),maps=Object.entries(weights).filter(([,v])=>v>0).map(([phase,weight])=>({map:build(phase),weight})),result={};
  for(const key of Object.keys(maps[0].map))result[key]='#'+[1,3,5].map(i=>Math.round(maps.reduce((n,{map,weight})=>n+parseInt(map[key].slice(i,i+2),16)*weight,0)).toString(16).padStart(2,'0')).join('');
  return result;
 }
 const theme=w=>palette(w,phase=>SeasonLandscape.theme({...w,solar:false,phase}));
 function nodes(svg,html){const fragment=parse(`<svg xmlns="${ns}">${html}</svg>`);return [...fragment.childNodes].map(n=>svg.ownerDocument.importNode(n,true));}
 const floor=where=>where==='room'?'M0 236 309 228 400 258v72H0Z':where==='garden'?'M0 222q89-19 184-2t216-2v112H0Z':'M0 224h400v106H0Z';
 function room(source,w){
  const svg=parse(source),s=SolarModel.at(w.at,w.weather),id='solar-room-'+(++sequence),v=s.shadow(90,150),strength=s.direct*s.southExposure;
  const group=svg.querySelector('g[filter]'),insertion=[...group.childNodes].find(n=>n.nodeType===8&&n.textContent.includes('Rounded window'));
  const beam=[[49,233],[157,230],[174+v.x,258+v.y],[36+v.x,263+v.y]],center=104;
  const strips=[center,76,133].map((x,i)=>polygon([[x-2,232],[x+2,232],[x+v.x+4,261+v.y],[x+v.x-4,261+v.y]],'#334951',strength*(i?.065:.12))).join('');
  const light=s.source==='moon'?'#bed0d5':s.altitude<22?'#edcfaa':'#efe8d5';
  const markup=`<defs><clipPath id="${id}-floor"><path d="${floor('room')}"/></clipPath><clipPath id="${id}-beam"><polygon points="${points(beam)}"/></clipPath><linearGradient id="${id}-light" x2=".25" y2="1"><stop stop-color="${light}" stop-opacity="${strength*(s.source==='moon'?.17:.22)}"/><stop offset="1" stop-color="${light}" stop-opacity="${strength*.035}"/></linearGradient><filter id="${id}-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${s.softness}"/></filter></defs><g data-solar-window-light="" clip-path="url(#${id}-floor)"><polygon points="${points(beam)}" fill="url(#${id}-light)"/><g clip-path="url(#${id}-beam)" filter="url(#${id}-soft)">${strips}</g></g>`;
  for(const n of nodes(svg,markup))group.insertBefore(n,insertion||null);
  return stringify(svg);
 }
 function place(source,where,w){
  const svg=parse(source),s=SolarModel.at(w.at,w.weather),id='solar-place-'+(++sequence),group=svg.querySelector('g[filter]'),opacity=s.direct*.17;
  let casts='';
  const post=(x,y,width,height)=>{const v=s.shadow(height,330);return polygon([[x-width/2,y],[x+width/2,y],[x+width/2+v.x,y+v.y],[x-width/2+v.x,y+v.y]],'#344d52',opacity,`data-caster="pillar" data-vector="${v.x},${v.y}"`);};
  if(where==='engawa'){
   casts=post(68,224,16,218)+post(375,224,13,218);
   const face=s.direction.x>0?'left':'right',x=face==='left'?60:72;
   casts+=`<path d="M${x} 0v218" stroke="#e1d8c2" stroke-width="2" opacity="${s.direct*.18}"/>`;
  }else{
   const v=s.shadow(147,290),end={x:43+v.x,y:230+v.y};
   casts=polygon([[39,230],[47,230],[end.x+4,end.y],[end.x-4,end.y]],'#324e50',opacity,`data-caster="tree" data-vector="${v.x},${v.y}"`);
   const angle=Math.atan2(v.y,v.x)*180/Math.PI,stretch=Math.min(105,30+Math.hypot(v.x,v.y)*.26);
   casts+=w.season==='winter'?`<g stroke="#344d52" stroke-width="2" opacity="${opacity*.8}" data-caster="bare-branches"><path d="M${43+v.x*.55} ${230+v.y*.55}l${v.x*.36-20} ${v.y*.36+9}m20-9 20-7"/></g>`:`<g transform="translate(${end.x} ${end.y}) rotate(${angle})" opacity="${opacity*.85}" data-caster="canopy"><ellipse cx="-12" cy="0" rx="${stretch}" ry="${10+Math.abs(v.y)*.05}" fill="#344d52"/><ellipse cx="-38" cy="-5" rx="${stretch*.6}" ry="12" fill="#344d52"/></g>`;
   const p=s.shadow(49,105);casts+=polygon([[339,260],[361,260],[358+p.x,260+p.y],[345+p.x,260+p.y]],'#344d52',opacity*.7,'data-caster="plant"');
  }
  const markup=`<defs><clipPath id="${id}-ground"><path d="${floor(where)}"/></clipPath><filter id="${id}-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${s.softness}"/></filter></defs><g data-solar-structure-shadow="" clip-path="url(#${id}-ground)" filter="url(#${id}-soft)">${casts}</g>`;
  const insertion=group.children[2]||null;for(const n of nodes(svg,markup))group.insertBefore(n,insertion);
  return stringify(svg);
 }
 function landscape(w,frame){
  const value={...w,phase:SolarModel.phase(w.at)},svg=parse(SeasonLandscape.art(value,frame,w.at)),s=SolarModel.at(w.at,w.weather);
  for(const circle of [...svg.children].filter(n=>n.localName==='circle'))circle.remove();
  if(s.source==='sun'&&w.weather==='sunny'){
   const circle=svg.ownerDocument.createElementNS(ns,'circle');circle.setAttribute('data-solar-disc','');circle.setAttribute('cx',s.screen.x);circle.setAttribute('cy',s.screen.y);circle.setAttribute('r',s.altitude<15?13:11);circle.setAttribute('fill',s.altitude<15?'#f4d6b0':'#f6ecd2');circle.setAttribute('opacity',String(s.direct*.86));
   // Behind the existing clouds and distant ridge, with no large glow halo.
   svg.insertBefore(circle,svg.querySelector(':scope > g')||svg.querySelector('[data-depth]'));
  }
  svg.dataset.solarSource=s.source;svg.dataset.solarAltitude=s.altitude;return stringify(svg);
 }
 const visible=el=>{for(let node=el;node&&node!==document;node=node.parentElement){const css=getComputedStyle(node);if(node.hidden||css.display==='none'||css.visibility==='hidden')return false;}return true;};
 function actor(stage){
  const meal=stage.querySelector('.room-care-animation:not([hidden])');
  if(meal){for(const group of meal.querySelectorAll(':scope > .care-idle,:scope > .care-munch,:scope > .care-joy-cat'))if(visible(group)){const img=group.matches('img')?group:group.querySelector('.care-body');if(img)return {group,img,meal:true};}}
  const group=stage.querySelector('.room-resident'),img=group?.querySelector('img');return img&&visible(group)?{group,img,meal:false}:null;
 }
 const assetKey=img=>img.dataset.assetKey||img.getAttribute('src')?.split('?')[0].replace('assets/cat-meals-v1/','meal/').replace('assets/cat-refresh-v1/','').replace(/\.png$/,'');
 function cat(stage,w,value=actor(stage)){
  if(!value)return '';const {group,img,meal}=value,a=IndoorCatScale.contact(assetKey(img));if(!a)return '';
  const s=SolarModel.at(w.at,w.weather),r=stage.getBoundingClientRect();if(!r.width)return '';const k=400/r.width;
  let bw,bh,fx,fy;
  if(meal){const b=img.getBoundingClientRect();bw=b.width*k;bh=b.height*k;fx=(b.left-r.left)*k+(a[2]+a[4])/2/a[0]*bw;fy=(b.top-r.top)*k+a[5]/a[1]*bh;}
  else{const css=getComputedStyle(group),matrix=new DOMMatrix(css.transform),origin=css.transformOrigin.split(' ').map(parseFloat);bw=parseFloat(css.width)*matrix.a*k;bh=parseFloat(css.height)*matrix.d*k;fx=(group.offsetLeft+origin[0]+matrix.e)*k;fy=(group.offsetTop+origin[1]+matrix.f)*k;}
  const ox=(a[2]+a[4])/2/a[0]*bw,oy=a[5]/a[1]*bh,h=(a[5]-a[3])/a[1]*bh;
  const sill=stage.dataset.place==='window',v=s.shadow(h,sill?27:140),id='solar-cat-'+(++sequence),c=-v.x/h,d=-v.y/h-.055,tx=fx-.82*ox-c*oy,ty=fy-d*oy;
  const imageTransform=meal?'none':getComputedStyle(img).transform,transform=imageTransform==='none'?'':`translate(${bw/2} ${bh/2}) ${imageTransform} translate(${-bw/2} ${-bh/2})`;
  // A masked ink silhouette on the support surface, never a second cat image node.
  const clip=sill?'M30 157h150v15H30Z':floor(stage.dataset.location);
  const opacity=s.direct*(stage.dataset.location==='room'?.065:.105)*(stage.dataset.location==='room'?s.southExposure:1);
  const svg=parse(`<svg xmlns="${ns}" class="solar-cat-shadow" viewBox="0 0 400 330" aria-hidden="true" data-vector="${v.x},${v.y}" data-source="${s.source}"><defs><clipPath id="${id}-support"><path d="${clip}"/></clipPath><mask id="${id}-alpha" maskUnits="userSpaceOnUse" x="${-bw}" y="${-bh}" width="${bw*3}" height="${bh*3}" style="mask-type:alpha"><image href="${img.getAttribute('src').replace(/&/g,'&amp;')}" width="${bw}" height="${bh}" transform="${transform}"/></mask><filter id="${id}-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${s.softness*.8}"/></filter></defs><g clip-path="url(#${id}-support)" opacity="${opacity}"><g filter="url(#${id}-soft)"><g transform="matrix(.82 0 ${c} ${d} ${tx} ${ty})"><rect x="${-bw}" y="${-bh}" width="${bw*3}" height="${bh*3}" fill="#283e48" mask="url(#${id}-alpha)"/></g></g></g></svg>`);
  return stringify(svg);
 }
 const entries=new WeakMap();let observer,resize;
 function update(stage,value){
  const bg=stage.querySelector('.room-background-layer:not([data-background-outgoing])');
  if(!value&&!bg?.dataset.lightAt)return;
  const w=SolarModel.world(value||{at:Number(bg.dataset.lightAt),weather:bg.dataset.lightWeather,season:bg.dataset.lightSeason}),s=SolarModel.at(w.at,w.weather),weights=SolarModel.weights(w.at),day=1-weights.night;
  stage.dataset.solarLight=s.source;stage.style.setProperty('--room-light-brightness',String(.78+.22*day));stage.style.setProperty('--room-light-saturation',String(.90+.10*day));
  stage.style.setProperty('--room-light-filter',day===1?'none':`brightness(${.78+.22*day}) saturate(${.90+.10*day})`);
  let entry=entries.get(stage);if(!entry){const holder=document.createElement('div');holder.className='room-cat-lighting';holder.setAttribute('aria-hidden','true');stage.append(holder);entry={holder};entries.set(stage,entry);resize?.observe(stage);}
  const source=actor(stage),signature=[w.at,w.weather,stage.dataset.location,stage.dataset.place,stage.clientWidth,source?.img.getAttribute('src'),source?.group.getAttribute('style'),stage.dataset.nightPose].join(':');
  if(entry.signature===signature)return;entry.signature=signature;const token={};entry.token=token;
  const draw=()=>{
   if(!stage.isConnected||entry.token!==token)return;
   const current=actor(stage);if(current?.img!==source?.img){entry.signature=null;update(stage,w);return;}
   const html=cat(stage,w,current),old=entry.holder.firstElementChild;
   if(entry.fade){entry.fade.cancel();entry.holder.querySelector('[data-shadow-outgoing]')?.remove();entry.fade=null;}
   entry.holder.innerHTML=html;
   if(old&&html&&!document.hidden&&!matchMedia('(prefers-reduced-motion: reduce)').matches){old.dataset.shadowOutgoing='true';entry.holder.append(old);const fade=old.animate([{opacity:1},{opacity:0}],{duration:1600,easing:'ease-in-out',fill:'forwards'});entry.fade=fade;fade.finished.catch(()=>{}).then(()=>{old.remove();if(entry.fade===fade)entry.fade=null;});}
   stage.dataset.solarAltitude=s.altitude;stage.dataset.solarAzimuth=s.azimuthUsed;stage.dataset.solarStrength=s.direct;
  };
  if(source&&!source.img.complete)source.img.decode().then(draw,()=>{});else draw();
 }
 function start(){
  if(observer||!document.body)return;
  const queued=new Set();let frame;
  const schedule=stage=>{if(!stage?.isConnected)return;queued.add(stage);if(!frame)frame=requestAnimationFrame(()=>{frame=null;for(const item of queued)update(item);queued.clear();});};
  resize=new ResizeObserver(rows=>rows.forEach(row=>{const e=entries.get(row.target);if(e)e.signature=null;schedule(row.target);}));
  const stages=node=>node.nodeType===1?[...(node.matches('.day-room')?[node]:[]),...node.querySelectorAll('.day-room')]:[];
  observer=new MutationObserver(rows=>{for(const row of rows){if(row.target.closest?.('.room-cat-lighting'))continue;const stage=row.target.closest?.('.day-room');if(stage)schedule(stage);for(const node of row.addedNodes||[])for(const item of stages(node))schedule(item);for(const node of row.removedNodes||[])for(const item of stages(node))if(!item.isConnected){resize.unobserve(item);entries.get(item)?.fade?.cancel();entries.delete(item);}}});
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','data-care-stage','data-location','data-place','data-coat','data-night-pose']});
  new MutationObserver(()=>document.querySelectorAll('.day-room').forEach(schedule)).observe(document.documentElement,{attributes:true,attributeFilter:['data-cat-state-pending','data-cat-own-ready']});
  document.querySelectorAll('.day-room').forEach(schedule);
 }
 return Object.freeze({room,place,landscape,cat,floor,palette,theme,update,start});
})();
SolarLighting.start();
