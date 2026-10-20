// Sunrise/sunset decoration only. No cat geometry, shadows or background manager.
globalThis.SolarSky=(()=>{
 const ns='http://www.w3.org/2000/svg';
 const parse=source=>{
  const normalized=(/<svg[^>]*\bxmlns=/.test(source)?source:source.replace('<svg ',`<svg xmlns="${ns}" `)).replace(/\s(data-[\w-]+)(?=\s|>)/g,' $1=""');
  const doc=new DOMParser().parseFromString(normalized,'image/svg+xml');
  if(doc.querySelector('parsererror'))throw Error(doc.querySelector('parsererror').textContent);return doc.documentElement;
 };
 const stringify=node=>new XMLSerializer().serializeToString(node);
 // Original, prebuilt SVG: one shared decode, requested on entering the roof.
 const starFieldImage='assets/roof-deep-sky-69add6de01f676a4.svg';
 let starFieldDecode,starFieldReady=false,starFieldNode;
 const pendingFields=new WeakSet();
 function updateStarField(card){
  if(scrollY<=0)return;
  const layer=card.querySelector('.card-sky-stars'),own=card.closest('#app')?.querySelector('.home-room-unit .room-resident img');
  const available=()=>{
   if(!card.isConnected||document.hidden||scrollY<=0||document.documentElement.hasAttribute('data-cat-state-pending')||own&&(!own.complete||!own.naturalWidth))return false;
   const rect=card.getBoundingClientRect();return rect.width>0&&rect.top<innerHeight/2&&rect.bottom>0;
  };
  if(!layer||layer.hasAttribute('data-deep-field-ready')||pendingFields.has(layer)||!available())return;
  const mount=()=>{
   if(!available())return;
   if(!starFieldNode){
    starFieldNode=document.createElement('span');starFieldNode.className='roof-star-field';starFieldNode.style.cssText='position:absolute;inset:0;background:center/cover no-repeat url("'+starFieldImage+'")';
    const app=card.closest('#app');if(app)new MutationObserver(()=>{if(!starFieldNode.isConnected)starFieldNode.remove();}).observe(app,{childList:true});
   }
   layer.querySelectorAll('.roof-twinkle').forEach(star=>{star.style.animation='none';});
   layer.querySelectorAll(':scope > i').forEach(star=>star.remove());layer.prepend(starFieldNode);layer.setAttribute('data-deep-field-ready','');
  };
  if(starFieldReady){mount();return;}
  pendingFields.add(layer);
  // Yield a paint to the cat; retry through the existing sky tick if hidden.
  requestAnimationFrame(()=>setTimeout(()=>{
   if(!available()){pendingFields.delete(layer);return;}
   if(!starFieldDecode){const image=new Image();image.decoding='async';image.src=starFieldImage;starFieldDecode=image.decode().then(()=>{starFieldReady=true;return image;});}
   void starFieldDecode.then(()=>{pendingFields.delete(layer);mount();},()=>{pendingFields.delete(layer);starFieldDecode=undefined;});
  },0));
 }
 window.addEventListener('scroll',()=>{const card=document.querySelector('.roof-sky-card');if(card)updateStarField(card);},{passive:true});
 // ICRS/J2000 RA degrees, declination degrees, visual magnitude:
 // Polaris; Dubhe..Alkaid; Caph, Schedar, gamma Cas, Ruchbah, Segin.
 // https://iauarchive.eso.org/public/themes/naming_stars/
 // https://simbad.cds.unistra.fr/simbad/sim-id?Ident=gam+Cas
 const northCatalog=[
  [37.955,89.264,1.97],
  [165.932,61.751,1.81],[165.460,56.382,2.34],[178.458,53.695,2.41],
  [183.857,57.033,3.32],[193.507,55.960,1.76],[200.981,54.925,2.23],[206.885,49.313,1.85],
  [2.295,59.150,2.28],[10.127,56.537,2.24],[14.177,60.717,2.39],[21.454,60.235,2.66],[28.599,63.670,3.35]
 ];
 function northState(w){
  const at=Math.floor(SolarModel.time(w)/60000)*60000,region=SolarModel.region(),rad=Math.PI/180;
  // UTC is sufficient for this decorative GMST; longitude is east-positive.
  // https://aa.usno.navy.mil/faq/GAST
  const days=(at-Date.UTC(2000,0,1,12))/86400000,lst=(280.460625+360.985647364185*days+region.longitude)%360;
  const latitude=region.latitude*rad,cy=221-288*Math.tan(latitude/2);
  // Stereographic view centred on the north celestial pole, east on the right.
  // Isotropic SVG scaling retains both asterism shapes on narrow cards.
  const points=northCatalog.map(([ra,dec,mag])=>{
   const h=(lst-ra)*rad,d=dec*rad,r=288*Math.tan((90-dec)*rad/2);
   const altitude=Math.asin(Math.sin(latitude)*Math.sin(d)+Math.cos(latitude)*Math.cos(d)*Math.cos(h))/rad;
   return {x:200-r*Math.sin(h),y:cy-r*Math.cos(h),opacity:(.65+(3.5-mag)*.04)*SolarModel.smooth(0,5,altitude)};
  });
  return {key:region.id+':'+at,region:region.id,points};
 }
 function northernStars(w){
  const s=northState(w);
  return '<svg data-northern-stars="" data-north-key="'+s.key+'" data-north-region="'+s.region+'" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none">'+s.points.map((p,i)=>{
   const alpha=Number(p.opacity.toFixed(3)),twinkle=[0,6,10].includes(i);
   return '<circle data-northern-star="'+i+'" cx="'+p.x.toFixed(3)+'" cy="'+p.y.toFixed(3)+'" r="'+(i===0?1.05:.65+(3.5-northCatalog[i][2])*.12).toFixed(2)+'" fill="'+(i%4===0?'#ece2bd':'#d2ddec')+'" opacity="'+alpha+'"'+(twinkle?' class="roof-twinkle" style="--star-opacity:'+alpha+';animation-duration:'+(7+i*.2)+'s;animation-delay:-'+i+'s"':'')+'/>';
  }).join('')+'</svg>';
 }
 function updateNorthernStars(card,w){
  const sky=card.querySelector('[data-northern-stars]');if(!sky)return;
  const region=SolarModel.region().id,key=region+':'+Math.floor(SolarModel.time(w)/60000)*60000;
  // Keep the current sky still under reduced motion; explicit remount/region
  // changes can show a new dated sky. Reuse the existing shared update tick.
  if(sky.dataset.northKey===key||matchMedia('(prefers-reduced-motion: reduce)').matches&&sky.dataset.northRegion===region)return;
  const s=northState(w);
  [...sky.children].forEach((star,i)=>{const p=s.points[i];star.setAttribute('cx',p.x.toFixed(3));star.setAttribute('cy',p.y.toFixed(3));star.setAttribute('opacity',p.opacity.toFixed(3));star.style.setProperty('--star-opacity',p.opacity.toFixed(3));});
  sky.dataset.northKey=s.key;sky.dataset.northRegion=s.region;
 }
 let cached;
 function state(w,where='garden'){
  const at=Math.floor(SolarModel.time(w)/60000)*60000,key=[SolarModel.region().id,at,w.weather,w.season].join(':');
  if(cached?.key!==key)cached={key,value:SolarModel.at(at,w.weather)};
  const value=cached.value,sun=value.source==='sun',view=SolarModel.facing(sun?value:{...value,altitude:value.altitudeUsed,azimuth:value.azimuthUsed},where);
  const transmission=SeasonLandscape.cloudTransmission(w,view.sunPoint,13,where),horizon=view.inView?SeasonLandscape.horizonTransmission(view.sunPoint):1;
  const weather=w.weather==='sunny'?1:w.weather==='cloudy'?.22:.035;
  return {...value,direction:view.direction,shadow:view.shadow,sunPoint:view.sunPoint,inView:view.inView,exposure:view.exposure,weatherOpacity:weather,cloudTransmission:transmission,horizonTransmission:horizon,
   direct:value.direct*view.exposure*transmission*horizon*(view.inView?1:0),southExposure:1,sunOpacity:value.sky.sunOpacity*weather};
 }
 function disc(s,frame,width=400,height=260){
  const opacity=s.source==='sun'?s.sky.gardenOpacity*s.weatherOpacity:0;
  if(opacity<=0||!s.inView)return null;
  const point={x:s.sunPoint.x*width/400,y:s.sunPoint.y*height/260};
  const node=document.createElementNS(ns,'circle');node.setAttribute('data-solar-disc','');
  node.setAttribute('cx',point.x);node.setAttribute('cy',point.y);node.setAttribute('r',String(13*width/400));
  node.setAttribute('fill','#f4d6b0');node.setAttribute('opacity',String(opacity*s.cloudTransmission));return node;
 }
 function paint(svg,w,frame){
  const s=state(w,frame),key=[s.region,s.at,w.weather,w.season,frame].join(':');
  let group=svg.querySelector(':scope > [data-solar-sky]');
  if(!group){
   // The published sun/glow are direct circles. Stars and the moon are nested.
   for(const circle of [...svg.children].filter(n=>n.localName==='circle'))circle.remove();
   group=document.createElementNS(ns,'g');group.setAttribute('data-solar-sky','');
   svg.insertBefore(group,svg.querySelector(':scope > g')||svg.querySelector('[data-depth]'));
  }
  const box=svg.viewBox.baseVal,node=disc(s,frame,box.width,box.height),old=group.firstElementChild;
  if(node&&old){for(const a of node.attributes)if(old.getAttribute(a.name)!==a.value)old.setAttribute(a.name,a.value);}
  else if(node||old)group.replaceChildren(...(node?[node]:[]));
  {
   const cloudGroup=svg.querySelector('[data-sky-clouds]');
   if(cloudGroup)SeasonLandscape.clouds(w,frame).forEach((c,i)=>cloudGroup.children[i]?.setAttribute('transform',`translate(${c.x} ${c.y}) scale(${c.scale})`));
   const t=SolarModel.twilight(SolarModel.time(w),frame),p=SeasonLandscape.theme({...w,solar:true,skyFrame:frame});
   svg.querySelector('[data-landscape-stars]')?.setAttribute('opacity',String(t.stars*(w.weather==='sunny'?.7:.23)));
   cloudGroup?.setAttribute('opacity',String(1-t.stars*.65));
   const stops=svg.querySelector('[data-landscape-gradient]')?.children;
   if(stops)[p.sky,SeasonLandscape.mix(p.sky,p.horizon,.55),p.horizon].forEach((color,i)=>stops[i].setAttribute('stop-color',color));
   svg.querySelectorAll('.room-window-moon').forEach(moon=>RoofMoon.update(moon,SolarModel.time(w)));
  }
  svg.dataset.solarSkyKey=key;svg.dataset.solarSource=s.source;svg.dataset.solarAltitude=s.altitude;
  svg.dataset.solarRegion=s.region;svg.dataset.solarPeriod=s.sky.sunPeriod||'';
 }
 function landscape(w,frame='window'){
  const value={...w,solar:true,phase:SolarModel.phase(w.at),skyFrame:frame},svg=parse(SceneryMaterials.art(SeasonLandscape.art(value,frame==='window'?'window':'sky',w.at),'landscape',value));
  paint(svg,w,frame);return stringify(svg);
 }
 function roof(w){
  w={...w,weather:'sunny'}; // The rooftop is a separate calm sky, not shared weather.
  const s=state(w),group=document.createElementNS(ns,'g');group.setAttribute('data-roof-solar','');
  // This special clear sky has no clouds at any hour, independent of weather.
  group.dataset.solarRegion=s.region;group.dataset.solarPeriod=s.sky.sunPeriod||'';
  return stringify(group);
 }
 function updateRoof(scene,w){
  w={...w,weather:'sunny'};
  const card=scene.closest('.roof-sky-card');if(!card)return;
  updateNorthernStars(card,w);
  const t=SolarModel.twilight(SolarModel.time(w),'roof'),p=SeasonLandscape.theme({...w,solar:true,skyFrame:'roof'});
  const depth=SolarModel.smooth(.35,1,t.stars);
  card.style.setProperty('--roof-sky',SeasonLandscape.mix(p.sky,'#02050e',depth));card.style.setProperty('--roof-horizon',SeasonLandscape.mix(p.horizon,'#070e1c',depth));
  card.style.setProperty('--roof-stars',String(t.stars*(w.weather==='sunny'?1:w.weather==='cloudy'?.4:.12)));
  updateStarField(card);
  RoofRecline.update(card.querySelector('.roof-cat-group'),SolarModel.time(w));
 }
 function morningLight(w){
  const s=state(w,'room');return s.source==='sun'?s.direct:0;
 }
 function update(stage,w){
  if(document.hidden)return;
  for(const svg of stage.querySelectorAll('.day-room-scenery .season-landscape'))paint(svg,w,svg.closest('.day-room-world-window')?'window':svg.closest('[data-background-location]')?.dataset.backgroundLocation||'sky');
 }
 return Object.freeze({state,landscape,roof,updateRoof,update,morningLight,northernStars});
})();
