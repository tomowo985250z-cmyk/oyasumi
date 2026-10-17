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
 function state(w){
  const at=Math.floor(SolarModel.time(w)/60000)*60000,key=[SolarModel.region().id,at,w.weather,w.season].join(':');
  if(cached?.key===key)return cached.value;
  const value=SolarModel.at(at,w.weather);
  // South-facing 180-degree panorama: east at the left, west at the right.
  // Never clamp the sun into an opening or lift it over the illustrated hills.
  const sunPoint={x:200+(value.azimuth-180)*400/180,y:153-value.altitude*1.58};
  const transmission=SeasonLandscape.cloudTransmission(w,sunPoint);
  const weather=w.weather==='sunny'?1:w.weather==='cloudy'?.22:.035;
  const result={...value,sunPoint,weatherOpacity:weather,inView:value.azimuth>=90&&value.azimuth<=270&&value.altitude>=-.833,direct:value.direct*transmission,cloudTransmission:transmission,sunOpacity:value.sky.sunOpacity*weather};
  cached={key,value:result};return result;
 }
 function disc(s,frame,width=400,height=260){
  const opacity=(frame==='engawa'?s.sky.eveningOpacity:frame==='garden'||frame==='sky'?s.sky.gardenOpacity:0)*s.weatherOpacity;
  if(opacity<=0||!s.inView)return null;
  const point={x:s.sunPoint.x*width/400,y:s.sunPoint.y*height/260};
  const node=document.createElementNS(ns,'circle');node.setAttribute('data-solar-disc','');
  node.setAttribute('cx',point.x);node.setAttribute('cy',point.y);node.setAttribute('r',String(13*width/400));
  node.setAttribute('fill','#f4d6b0');node.setAttribute('opacity',String(opacity*s.cloudTransmission));return node;
 }
 function paint(svg,w,frame){
  const s=state(w),key=[s.region,s.at,w.weather,w.season,frame].join(':');
  if(svg.dataset.solarSkyKey===key)return;
  let group=svg.querySelector(':scope > [data-solar-sky]');
  if(!group){
   // The published sun/glow are direct circles. Stars and the moon are nested.
   for(const circle of [...svg.children].filter(n=>n.localName==='circle'))circle.remove();
   group=document.createElementNS(ns,'g');group.setAttribute('data-solar-sky','');
   svg.insertBefore(group,svg.querySelector(':scope > g')||svg.querySelector('[data-depth]'));
  }
  const box=svg.viewBox.baseVal,node=disc(s,frame,box.width,box.height);group.replaceChildren(...(node?[node]:[]));
  svg.dataset.solarSkyKey=key;svg.dataset.solarSource=s.source;svg.dataset.solarAltitude=s.altitude;
  svg.dataset.solarRegion=s.region;svg.dataset.solarPeriod=s.sky.sunPeriod||'';
 }
 function landscape(w,frame='window'){
  const value={...w,phase:SolarModel.phase(w.at)},svg=parse(SeasonLandscape.art(value,frame==='window'?'window':'sky',w.at));
  paint(svg,w,frame);return stringify(svg);
 }
 function roof(w){
  const s=state(w),group=document.createElementNS(ns,'g');group.setAttribute('data-roof-solar','');
  group.dataset.solarRegion=s.region;group.dataset.solarPeriod=s.sky.sunPeriod||'';
  return stringify(group);
 }
 function morningLight(w){
  const s=state(w);return s.source==='sun'?s.direct*s.sky.morningOpacity/.72:0;
 }
 function update(stage,w){
  if(document.hidden)return;
  for(const svg of stage.querySelectorAll('.day-room-scenery .season-landscape'))paint(svg,w,svg.closest('.day-room-world-window')?'window':svg.closest('[data-background-location]')?.dataset.backgroundLocation||'sky');
 }
 return Object.freeze({state,landscape,roof,update,morningLight});
})();
