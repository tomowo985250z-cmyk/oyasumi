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
 function theme(w){
  const p=palette(w,phase=>SeasonLandscape.theme({...w,solar:false,phase}));
  if(!w.solar)return p;
  const t=SolarModel.twilight(SolarModel.time(w),w.skyFrame||'sky'),mix=SeasonLandscape.mix,weather=w.weather==='sunny'?1:w.weather==='cloudy'?.55:.25;
  p.sky=mix(p.sky,'#233d62',t.blue*.8);p.horizon=mix(p.horizon,'#596e91',t.blue*.85);
  p.sky=mix(p.sky,'#607b9d',(t.glow-t.warm)*.6*weather);
  p.horizon=mix(p.horizon,'#90a4b8',(t.glow-t.warm)*.5*weather);
  p.sky=mix(p.sky,t.morning?'#c6a9b1':'#ba929e',t.warm*.38*weather);
  p.horizon=mix(p.horizon,t.morning?'#d7a297':'#e2a17f',t.warm*.78*weather);
  p.cloud=mix(p.cloud,t.morning?'#b4b4ca':'#c6b0b0',t.warm*.45*weather);
  return p;
 }
 function nodes(svg,html){const fragment=parse(`<svg xmlns="${ns}">${html}</svg>`);return [...fragment.childNodes].map(n=>svg.ownerDocument.importNode(n,true));}
 const floor=where=>where==='room'?'M0 236 309 228 400 258v72H0Z':where==='garden'?'M0 222q89-19 184-2t216-2v112H0Z':'M0 224h400v106H0Z';
 const illumination=(w,where)=>globalThis.SolarSky?SolarSky.state(w,where):SolarModel.at(w.at,w.weather);
 // Reuse the existing sun, region/season, cloud and weather calculations.
 function edgeLight(w,where){
  if(!['room','engawa'].includes(where))return 0;
  const at=w.cloudAt??SolarModel.time(w),p=SolarModel.parameters(at),age=(where==='room'?at-p.sunriseAt:p.sunsetAt-at)/60000;
  const fade=SolarModel.smooth(0,15,age)*(1-SolarModel.smooth(75,135,age))*SolarModel.smooth(-.833,4,p.altitude);
  if(!fade)return 0;
  const sun=SolarModel.facing({...p,altitudeUsed:p.altitude},where),weather=illumination(w,where).weatherOpacity??(w.weather==='sunny'?1:w.weather==='cloudy'?.22:.035);
  const cloud=SeasonLandscape.cloudTransmission(w,sun.sunPoint,13,where),horizon=SeasonLandscape.horizonTransmission(sun.sunPoint);
  const strength=fade*sun.exposure*(.3+.7*cloud)*(.35+.65*horizon);
  return (where==='room'?strength*(2-strength):strength)*weather;
 }
 function edgeMarkup(w,where,id,svg){
  const level=edgeLight(w,where),morning=where==='room',color=morning?'#ffd17c':'#efa86c';
  const beam=morning?'M49 235 157 232 392 346 128 360Z':'M78 225 352 225 344 329 37 313Z';
  // Follow the existing seasonal cloth geometry, including the winter blanket.
  const blanket=morning?svg.querySelector('[data-season-furniture="kotatsu"]'):null;
  const cushion=blanket?.querySelector('path[d^="M136 250"]')||[...svg.querySelectorAll('path')].find(n=>n.getAttribute('d')?.startsWith(morning?'M143 259':'M138 262'));
  const shadows=morning?[76,104,133].map(x=>polygon([[x-1.5,233],[x+1.5,233],[128+(x-49)*264/108+4,360],[128+(x-49)*264/108-4,360]],'#71553b',.22)).join(''):'';
  const reflection=encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><defs><linearGradient id="warm" x1="0" y1="0" x2="'+(morning?'1':'0')+'" y2="'+(morning?'.3':'1')+'"><stop stop-color="'+color+'" stop-opacity="'+(morning?'.38':'.14')+'"/><stop offset=".6" stop-color="'+color+'" stop-opacity="'+(morning?'.12':'.035')+'"/><stop offset="1" stop-color="'+color+'" stop-opacity="0"/></linearGradient></defs><path fill="url(#warm)" d="M0 0h100v100H0Z"/></svg>');
  return `<defs><clipPath id="${id}-edge-floor"><path d="${floor(where)}"/></clipPath><clipPath id="${id}-edge-band"><path d="${beam}"/></clipPath><linearGradient id="${id}-edge-beam" x1="0" y1="0" x2="${morning?'.6':'0'}" y2="1"><stop stop-color="${color}" stop-opacity="${morning?'.85':'.36'}"/><stop offset=".5" stop-color="${color}" stop-opacity="${morning?'.60':'.18'}"/><stop offset="1" stop-color="${color}" stop-opacity="${morning?'.20':'0'}"/></linearGradient><radialGradient id="${id}-edge-bounce" cx="${morning?'.2':'.5'}" cy="0" r="1"><stop stop-color="${color}" stop-opacity="${morning?'.28':'.12'}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient><filter id="${id}-edge-soft" x="-20%" y="-30%" width="140%" height="160%"><feGaussianBlur stdDeviation="${morning?'1.8':'3'}"/></filter><filter id="${id}-edge-cat" data-solar-edge-reflection="" x="0" y="0" width="100%" height="100%" primitiveUnits="objectBoundingBox" color-interpolation-filters="sRGB"><feImage href="data:image/svg+xml,${reflection}" x="0" y="0" width="1" height="1" preserveAspectRatio="none"/><feComponentTransfer><feFuncA data-solar-edge-strength="" type="linear" slope="${level}"/></feComponentTransfer><feComposite in2="SourceGraphic" operator="in"/><feBlend in2="SourceGraphic" mode="screen"/></filter></defs><g data-solar-edge="" data-solar-window-light="" data-solar-direct="" data-light-factor="1" opacity="${level}" clip-path="url(#${id}-edge-floor)" pointer-events="none"><path d="${beam}" fill="url(#${id}-edge-beam)" filter="url(#${id}-edge-soft)"/><g data-solar-edge-shadow="" clip-path="url(#${id}-edge-band)" filter="url(#${id}-edge-soft)">${shadows}</g><path d="${cushion?.getAttribute('d')||''}" transform="${blanket?.getAttribute('transform')||''}" fill="url(#${id}-edge-bounce)"/></g>`;
 }
 // Match the room's dusk threshold; share the existing clock, with no new timer.
 const lanternLevel=w=>SolarModel.smooth(-.833,-6,SolarModel.parameters(SolarModel.time(w)).altitude);
 function lantern(w,id){
  const level=lanternLevel(w),p=palette(w,phase=>phase==='night'?{wood:'#695b49',paper:'#817760',edge:'#4d483e'}:{wood:'#a08869',paper:'#ded1b6',edge:'#806d55'});
  const reflection=encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><defs><linearGradient id="warm"><stop stop-color="#efbd78" stop-opacity=".16"/><stop offset=".55" stop-color="#efbd78" stop-opacity=".035"/><stop offset="1" stop-color="#efbd78" stop-opacity="0"/></linearGradient></defs><path fill="url(#warm)" d="M0 0h100v100H0Z"/></svg>');
  return `<defs data-engawa-lantern-defs=""><filter id="${id}-lamp-reflection" data-engawa-reflection="" x="0" y="0" width="100%" height="100%" primitiveUnits="objectBoundingBox" color-interpolation-filters="sRGB"><feImage href="data:image/svg+xml,${reflection}" x="0" y="0" width="1" height="1" preserveAspectRatio="none"/><feComponentTransfer><feFuncA data-engawa-reflection-strength="" type="linear" slope="0"/></feComponentTransfer><feComposite in2="SourceGraphic" operator="in"/><feBlend in2="SourceGraphic" mode="screen"/></filter><clipPath id="${id}-lamp-floor"><path d="${floor('engawa')}"/></clipPath><radialGradient id="${id}-lamp-glow"><stop stop-color="#e9bf7c" stop-opacity=".378"/><stop offset=".55" stop-color="#e9bf7c" stop-opacity=".126"/><stop offset="1" stop-color="#e9bf7c" stop-opacity="0"/></radialGradient><linearGradient id="${id}-paper" x2="0" y2="1"><stop stop-color="#efd6a4"/><stop offset=".5" stop-color="#ffe4b4"/><stop offset="1" stop-color="#cba26d"/></linearGradient></defs><g data-engawa-light="" opacity="${level}" pointer-events="none" clip-path="url(#${id}-lamp-floor)"><ellipse cx="48" cy="266" rx="164" ry="38" fill="url(#${id}-lamp-glow)"/></g><g data-engawa-lantern="" data-scene-object="andon" transform="translate(37 268)" pointer-events="none"><ellipse cy="1" rx="17" ry="3" fill="#354346" opacity=".19"/><path d="M-11-37 9-37 14-34V-3L9 1h-20Z" fill="${p.wood}"/><path d="M9-35 13-33V-4L9-1Z" fill="${p.edge}"/><path d="M-8-34H7V-4H-8Z" fill="${p.paper}"/><path data-engawa-light="" opacity="${level}" d="M-8-34H7V-4H-8Z" fill="url(#${id}-paper)"/><path d="M-1-34V-4M-8-19H7" fill="none" stroke="${p.wood}" stroke-width="1.2"/><path d="M-13-38 8-39 15-35 13-33-12-35ZM-13-3 10-3 15-1 11 2h-24Z" fill="${p.wood}"/><path d="M-11-37 8-38M-11-1H9" stroke="#e1c6a0" stroke-opacity=".3" stroke-width=".8"/></g>`;
 }
 function room(source,w){
  const svg=parse(source),s=illumination(w,'room'),id='solar-room-'+(++sequence),v=s.shadow(90,150),strength=s.direct*s.southExposure,unit=1;
  const group=svg.querySelector('g[filter]'),insertion=[...group.childNodes].find(n=>n.nodeType===8&&n.textContent.includes('Rounded window'));
  const beam=[[49,233],[157,230],[174+v.x,258+v.y],[36+v.x,263+v.y]],center=104;
  const strips=[center,76,133].map((x,i)=>polygon([[x-2,232],[x+2,232],[x+v.x+4,261+v.y],[x+v.x-4,261+v.y]],'#334951',unit*(i?.065:.12))).join('');
  const light=s.source==='moon'?'#bed0d5':s.altitude<22?'#edcfaa':'#efe8d5';
  const markup=`<defs><clipPath id="${id}-floor"><path d="${floor('room')}"/></clipPath><clipPath id="${id}-beam"><polygon points="${points(beam)}"/></clipPath><linearGradient id="${id}-light" x2=".25" y2="1"><stop stop-color="${light}" stop-opacity="${unit*(s.source==='moon'?.17:.22)}"/><stop offset="1" stop-color="${light}" stop-opacity="${unit*.035}"/></linearGradient><filter id="${id}-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${s.softness}"/></filter></defs><g data-solar-window-light="" data-solar-direct="" data-light-factor="1" opacity="${strength}" clip-path="url(#${id}-floor)"><polygon points="${points(beam)}" fill="url(#${id}-light)"/><g clip-path="url(#${id}-beam)" filter="url(#${id}-soft)">${strips}</g></g>`;
  for(const n of nodes(svg,markup))group.insertBefore(n,insertion||null);
  for(const n of nodes(svg,edgeMarkup(w,'room',id,svg)))group.append(n);
  return stringify(svg);
 }
 function place(source,where,w){
  const svg=parse(source),s=illumination(w,where),id='solar-place-'+(++sequence),group=svg.querySelector('g[filter]'),opacity=.17;
  const support=(name,fallback)=>{const object=svg.querySelector(`[data-scene-object="${name}"]`),matrix=object?.transform.baseVal.consolidate()?.matrix;return matrix?{x:matrix.e,y:matrix.f,height:Number(object.dataset.height)||fallback.height}:fallback;};
  let casts='';
  const post=(x,y,width,height)=>{const v=s.shadow(height,330);return polygon([[x-width/2,y],[x+width/2,y],[x+width/2+v.x,y+v.y],[x-width/2+v.x,y+v.y]],'#344d52',opacity,`data-caster="pillar" data-vector="${v.x},${v.y}"`);};
  if(where==='engawa'){
   casts=post(68,224,16,218)+post(375,224,13,218);
   const face=s.direction.x>0?'left':'right',x=face==='left'?60:72;
   casts+=`<path d="M${x} 0v218" stroke="#e1d8c2" stroke-width="2" opacity="${.18}"/>`;
  }else{
   const tree=support('garden-tree',{x:43,y:230,height:147}),v=s.shadow(tree.height,290),end={x:tree.x+v.x,y:tree.y+v.y};
   casts=polygon([[tree.x-4,tree.y],[tree.x+4,tree.y],[end.x+4,end.y],[end.x-4,end.y]],'#324e50',opacity,`data-caster="tree" data-vector="${v.x},${v.y}"`);
   const angle=Math.atan2(v.y,v.x)*180/Math.PI,stretch=Math.min(105,30+Math.hypot(v.x,v.y)*.26);
   casts+=w.season==='winter'?`<g stroke="#344d52" stroke-width="2" opacity="${opacity*.8}" data-caster="bare-branches"><path d="M${tree.x+v.x*.55} ${tree.y+v.y*.55}l${v.x*.36-20} ${v.y*.36+9}m20-9 20-7"/></g>`:`<g transform="translate(${end.x} ${end.y}) rotate(${angle})" opacity="${opacity*.85}" data-caster="canopy"><ellipse cx="-12" cy="0" rx="${stretch}" ry="${10+Math.abs(v.y)*.05}" fill="#344d52"/><ellipse cx="-38" cy="-5" rx="${stretch*.6}" ry="12" fill="#344d52"/></g>`;
   const plant=support('potted-plant',{x:350,y:260,height:49}),p=s.shadow(plant.height,105);casts+=polygon([[plant.x-12,plant.y],[plant.x+12,plant.y],[plant.x+9+p.x,plant.y+p.y],[plant.x-7+p.x,plant.y+p.y]],'#344d52',opacity*.7,`data-caster="plant" data-vector="${p.x},${p.y}"`);
  }
  const markup=`<defs><clipPath id="${id}-ground"><path d="${floor(where)}"/></clipPath><filter id="${id}-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${s.softness}"/></filter></defs><g data-solar-structure-shadow="" data-solar-direct="" data-light-factor="1" opacity="${s.direct}" clip-path="url(#${id}-ground)" filter="url(#${id}-soft)">${casts}</g>`;
  const insertion=group.children[2]||null;for(const n of nodes(svg,markup))group.insertBefore(n,insertion);
  if(where==='engawa'){for(const n of nodes(svg,edgeMarkup(w,where,id,svg)))group.append(n);for(const n of nodes(svg,lantern(w,id)))group.append(n);}
  return stringify(svg);
 }
 function landscape(w,frame){
  if(globalThis.SolarSky)return SolarSky.landscape(w,frame);
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
  const night=SolarModel.phase(SolarModel.time(w))==='night';
  if(night&&(stage.dataset.nightShadowSource==='lamp'||stage.dataset.nightShadowActor==='care'))return '';
  const s=illumination(w,stage.dataset.location),r=stage.getBoundingClientRect();if(!r.width)return '';const k=400/r.width;
  let bw,bh,fx,fy;
  if(meal){const b=img.getBoundingClientRect();bw=b.width*k;bh=b.height*k;fx=(b.left-r.left)*k+(a[2]+a[4])/2/a[0]*bw;fy=(b.top-r.top)*k+a[5]/a[1]*bh;}
  else{const css=getComputedStyle(group),matrix=new DOMMatrix(css.transform),origin=css.transformOrigin.split(' ').map(parseFloat);bw=parseFloat(css.width)*matrix.a*k;bh=parseFloat(css.height)*matrix.d*k;fx=(group.offsetLeft+origin[0]+matrix.e)*k;fy=(group.offsetTop+origin[1]+matrix.f)*k;}
  const ox=(a[2]+a[4])/2/a[0]*bw,oy=a[5]/a[1]*bh,h=(a[5]-a[3])/a[1]*bh;
  const sill=stage.dataset.place==='window',v=s.shadow(h,sill?27:night?38:140),id='solar-cat-'+(++sequence),c=-v.x/h,d=-v.y/h-.055,tx=fx-.82*ox-c*oy,ty=fy-d*oy;
  const imageTransform=meal?'none':getComputedStyle(img).transform,transform=imageTransform==='none'?'':`translate(${bw/2} ${bh/2}) ${imageTransform} translate(${-bw/2} ${-bh/2})`;
  // A masked ink silhouette on the support surface, never a second cat image node.
  const clip=sill&&!meal?'M30 157h150v15H30Z':SceneryMaterials.support(stage,meal)||floor(stage.dataset.location);
  const factor=night&&stage.dataset.location==='garden'?.18:stage.dataset.location==='room'?.065:.105,opacity=s.direct*factor*(stage.dataset.location==='room'?s.southExposure:1);
  const svg=parse(`<svg xmlns="${ns}" class="solar-cat-shadow" viewBox="0 0 400 330" aria-hidden="true" data-vector="${v.x},${v.y}" data-source="${s.source}"><defs><clipPath id="${id}-support"><path d="${clip}"/></clipPath><mask id="${id}-alpha" maskUnits="userSpaceOnUse" x="${-bw}" y="${-bh}" width="${bw*3}" height="${bh*3}" style="mask-type:alpha"><image href="${img.getAttribute('src').replace(/&/g,'&amp;')}" width="${bw}" height="${bh}" transform="${transform}"/></mask><filter id="${id}-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${night?Math.max(1.4,s.softness):s.softness*.8}"/></filter>${night?`<linearGradient id="${id}-fade" x2="0" y1="1" y2="0"><stop stop-color="#24394b" stop-opacity=".95"/><stop offset=".55" stop-color="#24394b" stop-opacity=".45"/><stop offset="1" stop-color="#24394b" stop-opacity=".08"/></linearGradient>`:''}</defs><g clip-path="url(#${id}-support)" opacity="${opacity}"><g filter="url(#${id}-soft)"><g transform="matrix(.82 0 ${c} ${d} ${tx} ${ty})"><rect x="${-bw}" y="${-bh}" width="${bw*3}" height="${bh*3}" fill="${night?`url(#${id}-fade)`:'#283e48'}" mask="url(#${id}-alpha)"/></g></g></g></svg>`);
  {
   const group=svg.querySelector(':scope > g');group.dataset.solarDirect='';group.dataset.lightFactor=String(factor);
  }
  return stringify(svg);
 }

 // Thin support-surface ink only: no cat filter, image, pose or lamp brightness.
 // Reuse the existing actor/contact table, moon vector and lighting update tick.
 const nightEntries=new WeakMap();
 function nightShadows(stage,w){
  const where=stage.dataset.location,at=SolarModel.time(w),night=SolarModel.phase(at)==='night',moon=illumination(w,where);
  const lamp=where==='room'?stage.querySelector('.room-light-switch:not([hidden])')?.getAttribute('aria-pressed')==='true':where==='engawa'&&stage.dataset.engawaPendant==='on';
  const level=night?(where==='garden'?(moon.source==='moon'?moon.direct:0):lamp?1:0):0;
  let e=nightEntries.get(stage);if(!e){e={};nightEntries.set(stage,e);}
  const light=where==='room'?{x:342,y:65}:{x:200,y:20},color=where==='garden'?'#26394d':'#574331';
  const vector=(x,y,length)=>{if(where==='garden')return moon.shadow(length,30);const dx=x-light.x,dy=(y-light.y)*.36,n=Math.hypot(dx,dy)||1;return{x:dx/n*length,y:dy/n*length};};
  const oval=(x,y,width,length)=>{
   const v=vector(x,y,length),id='night-fade-'+(++sequence),end={x:x+v.x,y:y+v.y};
   return '<defs><linearGradient id="'+id+'" gradientUnits="userSpaceOnUse" x1="'+x+'" y1="'+y+'" x2="'+end.x+'" y2="'+end.y+'"><stop stop-color="'+color+'" stop-opacity=".85"/><stop offset=".6" stop-color="'+color+'" stop-opacity=".34"/><stop offset="1" stop-color="'+color+'" stop-opacity="0"/></linearGradient></defs><path d="M'+(x-width)+' '+y+'Q'+x+' '+(y-2)+' '+(x+width)+' '+y+'Q'+(x+width+v.x*.6)+' '+(y+v.y*.6)+' '+(end.x+width*.55)+' '+end.y+'Q'+end.x+' '+(end.y+2)+' '+(end.x-width*.55)+' '+end.y+'Q'+(x-width+v.x*.6)+' '+(y+v.y*.6)+' '+(x-width)+' '+y+'Z" fill="url(#'+id+')"/>';
  };
  const bg=stage.querySelector('.room-background-layer:not([data-background-outgoing])'),svg=bg?.querySelector('svg[data-bedroom-realism],svg[data-garden-revision],svg[data-tatami-wall-study]');
  if(svg&&e.background!==svg){
   e.background=svg;const id='night-support-'+(++sequence),defs=svg.querySelector('defs');
   defs.insertAdjacentHTML('beforeend','<filter id="'+id+'" x="-35%" y="-200%" width="170%" height="500%"><feGaussianBlur stdDeviation="2.1"/></filter><clipPath id="'+id+'-plane"><path d="'+(where==='engawa'?'M0 228H400V330H0Z':floor(where))+'"/></clipPath>');
   const add=(object,x,y,width,length)=>{if(!object)return;const g=document.createElementNS(ns,'g');g.dataset.nightObjectShadow='';g.style.cssText='pointer-events:none;transition:opacity 260ms ease';g.setAttribute('filter','url(#'+id+')');g.setAttribute('clip-path','url(#'+id+'-plane)');g.dataset.nightAnchor=[x,y,width,length].join(',');g.setAttribute('opacity','0');object.before(g);};
   if(where==='room'){
    add(svg.querySelector('[data-scene-object="potted-plant"]'),340,246,16,14);
    add(svg.querySelector('[data-season-furniture="kotatsu"]'),207,296,78,17);
    const basket=svg.querySelector('[data-scene-object="basket"]');if(basket){const m=basket.transform.baseVal.consolidate()?.matrix;if(m)add(basket,m.e,m.f,23,9);}
   }else if(where==='engawa'){
    add(svg.querySelector('[data-scene-object="andon"]'),37,270,12,5);
    add(svg.querySelector('[data-scene-object="water-bowl"]'),322,266,17,6);
    add(svg.querySelector('path[d^="M60 0h16"]'),68,228,8,7);
    add(svg.querySelector('path[d^="M369 0h13"]'),375.5,228,6.5,7);
   }else if(where==='garden'){
    const fade=document.createElementNS(ns,'linearGradient');fade.id=id+'-tree';for(const [k,v]of Object.entries({gradientUnits:'userSpaceOnUse',x1:0,y1:-252,x2:0,y2:0}))fade.setAttribute(k,v);fade.innerHTML='<stop stop-color="#293e50" stop-opacity=".12"/><stop offset=".6" stop-color="#293e50" stop-opacity=".38"/><stop offset="1" stop-color="#293e50" stop-opacity=".9"/>';defs.append(fade);e.treeFade=fade.id;
    for(const stone of svg.querySelectorAll('[data-garden-stone]')){const image=stone.querySelector('image'),x=+image.getAttribute('x'),y=+image.getAttribute('y'),width=+image.getAttribute('width'),height=+image.getAttribute('height');add(stone,x+width/2,y+height-2,width*.43,10);}
   }
  }
  // The existing tree projection already follows the moon. Keep its geometry;
  // only use cool shadow ink at night, restoring its original daytime ink.
  for(const n of svg?.querySelectorAll('[data-caster="cherry-photo"] rect')||[])n.setAttribute('fill',night&&e.treeFade?'url(#'+e.treeFade+')':'#293d36');
  const directionKey=[where,moon.source,Math.round(moon.azimuthUsed),Math.round(moon.altitudeUsed)].join(':');
  for(const n of svg?.querySelectorAll('[data-night-object-shadow]')||[]){if(n.dataset.nightDirection!==directionKey){n.innerHTML=oval(...n.dataset.nightAnchor.split(',').map(Number));n.dataset.nightDirection=directionKey;}n.setAttribute('opacity',String(level*(where==='garden'?.50:.12)));}
  stage.dataset.nightShadowSource=level>0?(where==='garden'?'moon':'lamp'):'';stage.style.setProperty('--night-contact-strength',String(1+.16*level));
  const a=actor(stage);stage.dataset.nightShadowActor=level>0&&a?.meal?'care':'';
  if(!a?.meal){if(e.holder){e.holder.style.opacity='0';e.holder.replaceChildren();}return;}
  const contact=a&&IndoorCatScale.contact(assetKey(a.img)),r=stage.getBoundingClientRect();
  const b=a?.img.getBoundingClientRect(),key=[where,level,stage.dataset.place,stage.dataset.nightPose,b?.x,b?.y,b?.width,b?.height,a?.img.getAttribute('src')].join(':');if(e.key===key)return;e.key=key;
  if(!e.holder){const holder=document.createElement('div');holder.className='room-night-shadows';holder.setAttribute('aria-hidden','true');stage.append(holder);e.holder=holder;}
  e.holder.style.opacity=String(level*(where==='garden'?.40:.13));
  if(!level||!contact||!r.width||!b?.width){e.holder.replaceChildren();return;}
  const k=400/r.width,matrix=new DOMMatrix(getComputedStyle(a.img).transform),u=(contact[2]+contact[4])/2/contact[0],x=(b.left-r.left+b.width*(matrix.a<0?1-u:u))*k,y=(b.top-r.top+b.height*contact[5]/contact[1])*k;
  const width=Math.max(8,Math.min(29,(contact[4]-contact[2])/contact[0]*b.width*k*.34)),id='night-contact-'+(++sequence),support=stage.dataset.place==='window'&&!a.meal?'M30 157h150v15H30Z':SceneryMaterials.support(stage,a.meal)||floor(where);
  e.holder.innerHTML='<svg viewBox="0 0 400 330" focusable="false" data-night-source="'+(where==='garden'?'moon':'lamp')+'"><defs><clipPath id="'+id+'-floor"><path d="'+support+'"/></clipPath><filter id="'+id+'" x="-100%" y="-200%" width="300%" height="500%"><feGaussianBlur stdDeviation="1.6"/></filter></defs><g clip-path="url(#'+id+'-floor)"><g filter="url(#'+id+')">'+oval(x,y,width,where==='engawa'?4:7)+'</g></g></svg>';
 }

 const entries=new WeakMap();let observer,resize,motionTimer;
 function update(stage,value){
  const bg=stage.querySelector('.room-background-layer:not([data-background-outgoing])');
  if(!value&&!bg?.dataset.lightAt)return;
  const input=value||{at:Number(bg.dataset.lightAt),cloudAt:NightClock.now(),weather:bg.dataset.lightWeather,season:bg.dataset.lightSeason};
  const w={...SolarModel.world(input),cloudAt:input.cloudAt??SolarModel.time(input)},s=illumination(w,stage.dataset.location),weights=SolarModel.weights(w.at),day=1-weights.night;
  nightShadows(stage,w);
  const source=actor(stage),level=stage.dataset.location==='engawa'?lanternLevel(w):0;
  for(const node of stage.querySelectorAll('[data-engawa-light]'))node.setAttribute('opacity',String(level));
  let warmth=0;
  if(level&&source){const r=stage.getBoundingClientRect(),b=source.group.getBoundingClientRect();if(r.width)warmth=level*Math.max(0,1-Math.hypot((b.left+b.width/2-r.left)*400/r.width-37,(b.bottom-r.top)*400/r.width-268)/220);}
  for(const node of stage.querySelectorAll('[data-solar-direct]'))node.setAttribute('opacity',String(s.direct*Number(node.dataset.lightFactor)));
  const edge=stage.dataset.location==='room'&&stage.dataset.curtainClosed==='true'?0:edgeLight(w,stage.dataset.location);
  for(const node of stage.querySelectorAll('[data-solar-edge]'))node.setAttribute('opacity',String(edge));
  stage.dataset.solarLight=s.source;stage.style.setProperty('--room-light-brightness',String(.78+.22*day));stage.style.setProperty('--room-light-saturation',String(.90+.10*day));
  stage.style.setProperty('--room-light-filter',day===1?'none':`brightness(${.78+.22*day}) saturate(${.90+.10*day})`);
  if(warmth)stage.style.setProperty('--room-light-filter',`brightness(${.78+.22*day+.08*warmth}) saturate(${.90+.10*day+.04*warmth}) sepia(${.10*warmth})`);
  const reflection=bg?.querySelector('[data-engawa-reflection]');
  if(warmth&&reflection){reflection.querySelector('[data-engawa-reflection-strength]').setAttribute('slope',String(warmth));stage.style.setProperty('--room-light-filter',stage.style.getPropertyValue('--room-light-filter')+` url("#${reflection.id}")`);}
  const sunlight=bg?.querySelector('[data-solar-edge-reflection]');
  if(sunlight){sunlight.querySelector('[data-solar-edge-strength]').setAttribute('slope',String(edge));if(edge)stage.style.setProperty('--room-light-filter',stage.style.getPropertyValue('--room-light-filter').replace(/^none$/,'')+` url("#${sunlight.id}")`);}
  let entry=entries.get(stage);if(!entry){const holder=document.createElement('div');holder.className='room-cat-lighting';holder.setAttribute('aria-hidden','true');stage.append(holder);entry={holder};entries.set(stage,entry);resize?.observe(stage);}
  const signature=[w.at,w.weather,stage.dataset.location,stage.dataset.place,stage.clientWidth,source?.img.getAttribute('src'),source?.group.getAttribute('style'),stage.dataset.nightPose,stage.dataset.nightShadowSource,stage.dataset.nightShadowActor].join(':');
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
  const queued=new Set();let frame,wakeMotion=()=>{};
  const schedule=stage=>{if(!stage?.isConnected)return;queued.add(stage);wakeMotion();if(!frame)frame=requestAnimationFrame(()=>{frame=null;for(const item of queued)update(item);queued.clear();});};
  resize=new ResizeObserver(rows=>rows.forEach(row=>{const e=entries.get(row.target);if(e)e.signature=null;schedule(row.target);}));
  const stages=node=>node.nodeType===1?[...(node.matches('.day-room')?[node]:[]),...node.querySelectorAll('.day-room')]:[];
  observer=new MutationObserver(rows=>{for(const row of rows){if(row.target.closest?.('.room-cat-lighting,.room-night-shadows,[data-night-object-shadow]'))continue;const stage=row.target.closest?.('.day-room');if(stage)schedule(stage);for(const node of row.addedNodes||[])for(const item of stages(node))schedule(item);for(const node of row.removedNodes||[])for(const item of stages(node))if(!item.isConnected){resize.unobserve(item);entries.get(item)?.fade?.cancel();entries.delete(item);}}});
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','data-care-stage','data-location','data-place','data-coat','data-night-pose','data-curtain-closed','data-engawa-pendant','aria-pressed']});
  new MutationObserver(()=>document.querySelectorAll('.day-room').forEach(schedule)).observe(document.documentElement,{attributes:true,attributeFilter:['data-cat-state-pending','data-cat-own-ready']});
  document.querySelectorAll('.day-room').forEach(schedule);
  // One shared 1 Hz clock: move existing cloud groups and update opacity only.
  // Cat/structure geometry is still rebuilt by the existing minute signature.
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const pulse=()=>{
   clearTimeout(motionTimer);motionTimer=null;if(document.hidden)return;
   const at=NightClock.now();let active=false;
   for(const stage of document.querySelectorAll('.day-room')){
    const bg=stage.querySelector('.room-background-layer:not([data-background-outgoing])');if(!bg)continue;
    const r=stage.getBoundingClientRect();if(!r.width||!r.height||r.bottom<0||r.top>innerHeight)continue;
    const w={at,cloudAt:at,weather:bg.dataset.lightWeather,season:bg.dataset.lightSeason};
    active=true;SolarSky.update(stage,w);update(stage,w);
   }
   if(!reduced.matches&&active)motionTimer=setTimeout(pulse,1000);
  };
  wakeMotion=()=>{if(!motionTimer&&!document.hidden&&!reduced.matches)motionTimer=setTimeout(pulse,1000);};
  document.addEventListener('visibilitychange',pulse);reduced.addEventListener('change',pulse);
  addEventListener('scroll',wakeMotion,{passive:true});
  motionTimer=setTimeout(pulse,1000);
 }
 return Object.freeze({room,place,landscape,cat,floor,palette,theme,update,start});
})();
SolarLighting.start();
