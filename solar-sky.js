// Sunrise/sunset decoration only. No cat geometry, shadows or background manager.
globalThis.SolarSky=(()=>{
 const ns='http://www.w3.org/2000/svg';
 const parse=source=>{
  const normalized=(/<svg[^>]*\bxmlns=/.test(source)?source:source.replace('<svg ',`<svg xmlns="${ns}" `)).replace(/\s(data-[\w-]+)(?=\s|>)/g,' $1=""');
  const doc=new DOMParser().parseFromString(normalized,'image/svg+xml');
  if(doc.querySelector('parsererror'))throw Error(doc.querySelector('parsererror').textContent);return doc.documentElement;
 };
 const stringify=node=>new XMLSerializer().serializeToString(node);
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
  const s=state(w),group=document.createElementNS(ns,'g');group.setAttribute('data-roof-solar','');
  const sky=parse(SeasonLandscape.art({...w,solar:true,skyFrame:'roof'},'sky',w.at)),clouds=sky.querySelector('[data-sky-clouds]');
  const veil=document.createElementNS(ns,'g');veil.setAttribute('transform','scale(.52 .42)');veil.append(clouds);group.append(veil);
  group.dataset.solarRegion=s.region;group.dataset.solarPeriod=s.sky.sunPeriod||'';
  return stringify(group);
 }
 function updateRoof(scene,w){
  const card=scene.closest('.roof-sky-card');if(!card)return;
  const t=SolarModel.twilight(SolarModel.time(w),'roof'),p=SeasonLandscape.theme({...w,solar:true,skyFrame:'roof'});
  card.style.setProperty('--roof-sky',p.sky);card.style.setProperty('--roof-horizon',p.horizon);
  card.style.setProperty('--roof-stars',String(t.stars*(w.weather==='sunny'?1:w.weather==='cloudy'?.4:.12)));
  const group=scene.querySelector('[data-sky-clouds]');
  group?.setAttribute('opacity',String(1-t.stars*.65));
  if(group)SeasonLandscape.clouds(w,'roof').forEach((c,i)=>group.children[i]?.setAttribute('transform',`translate(${c.x} ${c.y}) scale(${c.scale})`));
  RoofRecline.update(card.querySelector('.roof-cat-group'),SolarModel.time(w));
 }
 function morningLight(w){
  const s=state(w,'room');return s.source==='sun'?s.direct:0;
 }
 function update(stage,w){
  if(document.hidden)return;
  for(const svg of stage.querySelectorAll('.day-room-scenery .season-landscape'))paint(svg,w,svg.closest('.day-room-world-window')?'window':svg.closest('[data-background-location]')?.dataset.backgroundLocation||'sky');
 }
 return Object.freeze({state,landscape,roof,updateRoof,update,morningLight});
})();
