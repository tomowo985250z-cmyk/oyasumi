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
  const value=cached.value,view=SolarModel.facing(value,where),sun=value.source==='sun';
  const transmission=SeasonLandscape.cloudTransmission(w,view.sunPoint,13,where),horizon=view.inView?SeasonLandscape.horizonTransmission(view.sunPoint):1;
  const weather=w.weather==='sunny'?1:w.weather==='cloudy'?.22:.035;
  return {...value,...(sun?view:{}),sunPoint:view.sunPoint,inView:view.inView,weatherOpacity:weather,cloudTransmission:transmission,horizonTransmission:horizon,
   direct:sun?value.direct*view.exposure*transmission*horizon:value.direct,southExposure:sun?1:value.southExposure,sunOpacity:value.sky.sunOpacity*weather};
 }
 function disc(s,frame,width=400,height=260){
  const opacity=s.sky.gardenOpacity*s.weatherOpacity;
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
  if(s.phase!=='night'){
   const cloudGroup=svg.querySelector('[data-sky-clouds]');
   if(cloudGroup)SeasonLandscape.clouds(w,frame).forEach((c,i)=>cloudGroup.children[i]?.setAttribute('transform',`translate(${c.x} ${c.y}) scale(${c.scale})`));
  }
  svg.dataset.solarSkyKey=key;svg.dataset.solarSource=s.source;svg.dataset.solarAltitude=s.altitude;
  svg.dataset.solarRegion=s.region;svg.dataset.solarPeriod=s.sky.sunPeriod||'';
 }
 function landscape(w,frame='window'){
  const value={...w,phase:SolarModel.phase(w.at),skyFrame:frame},svg=parse(SeasonLandscape.art(value,frame==='window'?'window':'sky',w.at));
  paint(svg,w,frame);return stringify(svg);
 }
 function roof(w){
  const s=state(w),group=document.createElementNS(ns,'g');group.setAttribute('data-roof-solar','');
  group.dataset.solarRegion=s.region;group.dataset.solarPeriod=s.sky.sunPeriod||'';
  return stringify(group);
 }
 function morningLight(w){
  const s=state(w,'room');return s.source==='sun'?s.direct:0;
 }
 function update(stage,w){
  if(document.hidden)return;
  for(const svg of stage.querySelectorAll('.day-room-scenery .season-landscape'))paint(svg,w,svg.closest('.day-room-world-window')?'window':svg.closest('[data-background-location]')?.dataset.backgroundLocation||'sky');
 }
 return Object.freeze({state,landscape,roof,update,morningLight});
})();
