// Shared cat ambient lighting. Original pixels, transforms, clocks and controls
// are shared. RGB-only filters keep the alpha silhouette completely unchanged.
globalThis.CatLightHarmony=(()=>{
 const solar=SolarLighting,backgrounds=RoomBackgrounds,roof=RoofRecline,sky=SolarSky,ns='http://www.w3.org/2000/svg',entries=new WeakMap();let serial=0;
 const clamp=(a,b,v)=>Math.max(a,Math.min(b,v)),round=n=>Number(n.toFixed(5));
 const values={
  room:{morning:[.965,.955,.975,1.014,1,.986],day:[.96,.95,.975,1.008,1,.99],evening:[.94,.945,.965,1.022,1,.972],night:[.765,.925,.96,.985,1,1.017]},
  engawa:{morning:[.95,.955,.975,1.012,1,.99],day:[.945,.95,.975,1.005,1.003,.996],evening:[.93,.945,.965,1.024,1,.972],night:[.765,.925,.96,.991,1,1.012]},
  garden:{morning:[.975,.965,.98,1.013,1.002,.989],day:[.975,.965,.98,1,1.004,1],evening:[.945,.95,.97,1.027,1,.97],night:[.745,.93,.96,.985,1.002,1.019]},
  roof:{morning:[.98,.97,.985,1.015,1,.988],day:[.98,.97,.985,1,1,1.003],evening:[.95,.955,.975,1.025,1,.972],night:[.755,.935,.965,.985,1,1.021]}
 };
 function parameters(w,where,mode='ambient',warmth=0){
  const world=SolarModel.world(w),weights=SolarModel.weights(SolarModel.time(world)),light=SolarSky.state(world,where),base=values[where]||values.room;
  const result=Array.from({length:6},(_,i)=>Object.entries(weights).reduce((n,[phase,weight])=>n+weight*base[phase][i],0)),night=weights.night||0,day=1-night;
  // Small environmental bounce; no simulated beam passes through an occluder.
  result[0]+=night*.018*clamp(0,1,light.source==='moon'?light.direct:0);
  if(w.season==='winter'){result[1]-=.008;result[3]-=.003*day;result[5]+=.004*day;}
  if(w.season==='summer'&&where==='garden')result[4]+=.003*day;
  if(w.season==='autumn'){result[3]+=.003*day;result[5]-=.003*day;}
  if(w.weather!=='sunny'){result[0]-=.012*day;result[1]-=.008;}
  if(mode==='shade'){
   result[0]-=.035*day;result[3]=1+(result[3]-1)*.25;result[5]=1+(result[5]-1)*.35;
  }
  if(where==='engawa'){result[0]+=.05*warmth;result[3]+=.036*warmth;result[5]-=.035*warmth;}
  if(mode==='white'&&where==='roof')result[0]+=.055*night;
  if(mode==='lamp'&&where==='room'){
   result[0]+=.105*night;result[1]+=.01*night;result[3]+=.031*night;result[5]-=.044*night;
  }
  result[0]=clamp(.73,.995,result[0]);result[1]=clamp(.90,.98,result[1]);result[2]=clamp(.95,.99,result[2]);
  // The tatami and shaded garden need quieter highlights than open-sky cats.
  // Keep the bedroom/roof response and native moon/lantern/shade calculation.
  if(where==='engawa'||where==='garden'){
   result[0]-=(where==='garden'?.020:.014)*day+.002*night;
   result[1]-=where==='garden'?.035:.025;result[2]-=where==='garden'?.022:.014;
  }
  return result.map(round);
 }
 function element(tag,attrs={}){const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;}
 function install(stage){
  let e=entries.get(stage);if(e)return e;
  const svg=element('svg',{'aria-hidden':'true',focusable:'false',width:0,height:0,'data-cat-harmony-defs':'',style:'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none'}),defs=element('defs'),id='cat-harmony-'+(++serial),filters={};svg.append(defs);
  for(const mode of ['ambient','shade','lamp',...(stage.matches('.roof-sky-card')?['white']:[])]){
   const filter=element('filter',{id:id+'-'+mode,x:0,y:0,width:'100%',height:'100%','color-interpolation-filters':'sRGB'}),saturation=element('feColorMatrix',{type:'saturate',values:1}),rgb=element('feComponentTransfer');
   for(const c of ['R','G','B'])rgb.append(element('feFunc'+c,{type:'linear',slope:1,intercept:0}));filter.append(saturation,rgb);defs.append(filter);filters[mode]={filter,saturation,rgb};stage.style.setProperty('--harmony-'+mode,'url("#'+filter.id+'")');
  }
  stage.append(svg);stage.dataset.catHarmony='1';e={svg,filters,stamp:null};entries.set(stage,e);return e;
 }
 function contact(stage){
  const group=stage.querySelector(':scope > .room-resident'),img=group?.querySelector('img');if(!img)return;
  const key=img.dataset.assetKey||img.getAttribute('src')?.replace('assets/cat-refresh-v1/','').replace(/\.png(?:\?.*)?$/,''),a=IndoorCatScale.contact(key);if(!a)return;
  const style=getComputedStyle(img),width=parseFloat(style.width),height=parseFloat(style.height);if(!width||!height)return;
  const origin=style.transformOrigin.split(' ').map(parseFloat),matrix=new DOMMatrix(style.transform),raw=[(a[2]+a[4])/2/a[0]*width,a[5]/a[1]*height],point=new DOMPoint(raw[0]-origin[0],raw[1]-origin[1]).matrixTransform(matrix),x=(point.x+origin[0])/width*100,y=(point.y+origin[1])/height*100;
  const vars={x,y,width:clamp(28,72,(a[4]-a[2])/a[0]*65),height:stage.dataset.place==='window'?3.2:4.5};
  for(const[k,v]of Object.entries(vars)){const name='--harmony-contact-'+k,value=round(v)+'%';if(group.style.getPropertyValue(name)!==value)group.style.setProperty(name,value);}
 }
 function lanternWarmth(stage){
  if(stage.dataset.location!=='engawa')return 0;
  const level=clamp(0,1,Number(stage.querySelector('[data-engawa-light]')?.getAttribute('opacity'))||0),r=stage.getBoundingClientRect();if(!level||!r.width)return 0;
  const actor=[...stage.querySelectorAll('.room-care-animation .care-body,.room-care-animation img.care-idle,.room-care-animation img.care-joy-cat,.room-resident>img')].find(n=>{const b=n.getBoundingClientRect();return b.width&&b.height&&getComputedStyle(n).visibility!=='hidden';});if(!actor)return 0;
  const b=actor.getBoundingClientRect(),x=(b.left+b.width/2-r.left)*400/r.width,y=(b.bottom-r.top)*400/r.width;
  return round(level*Math.max(0,1-Math.hypot(x-37,y-268)/220));
 }
 function apply(stage,value){
  if(!stage?.isConnected||!values[stage.dataset.location])return;
  const bg=stage.querySelector('.room-background-layer:not([data-background-outgoing])'),w=value||{at:+bg?.dataset.lightAt,season:bg?.dataset.lightSeason,weather:bg?.dataset.lightWeather};if(!Number.isFinite(SolarModel.time(w)))return;
  const e=install(stage),where=stage.dataset.location,warmth=lanternWarmth(stage),stamp=[Math.floor(SolarModel.time(w)/60000),w.season,w.weather,where,warmth].join(':');e.lanternWarmth=warmth;
  if(e.stamp!==stamp){
   for(const mode of ['ambient','shade','lamp']){
    const p=parameters(w,where,mode,warmth),f=e.filters[mode];f.saturation.setAttribute('values',p[1]);for(const[i,n]of [...f.rgb.children].entries()){n.setAttribute('slope',round(p[0]*p[2]*p[i+3]));n.setAttribute('intercept',round(p[0]*(1-p[2])*.46));}
   }
   const weights=SolarModel.weights(SolarModel.time(w)),night=weights.night||0,soften=where==='engawa'||where==='garden';
   const curve=soften?[0,.25,.5,.74+.005*night,.95+.025*night]:[0,.25,.5,.75,1];
   for(const f of Object.values(e.filters)){
    if(soften&&!f.highlights){f.highlights=element('feComponentTransfer');for(const c of ['R','G','B'])f.highlights.append(element('feFunc'+c,{type:'table'}));f.filter.append(f.highlights);}
    if(!soften&&f.highlights){f.highlights.remove();delete f.highlights;}
    if(f.highlights)for(const n of f.highlights.children)n.setAttribute('tableValues',curve.join(' '));
   }
   stage.style.setProperty('--harmony-contact-opacity',round(soften?.23-.06*night:.18-.045*night));stage.style.setProperty('--harmony-cast-opacity',round(.79-.16*night));e.stamp=stamp;
  }
  contact(stage);
 }
 function update(stage,w){const result=solar.update(stage,w);apply(stage,w);return result;}
 function backgroundUpdate(stage,where,w){const pending=backgrounds.update(stage,where,w);apply(stage,w);return pending;}
 // Reuse each original image's alpha, projected behind its measured feet.
 // The shared moon is in front of the cats: all casts extend down the roof plane.
 // Static, feathered local offsets: the original pixels and layout are reused.
 // Head, back and ear/tail regions remain distinct; no whole-cat transform.
 function roofPostures(cats,e){
  if(!e.postures)e.postures=new Map();
  const field=(cx,cy,rx,ry,axis,from,to)=>'<svg xmlns="'+ns+'" viewBox="0 0 100 100"><defs><radialGradient id="soft"><stop offset=".3" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></radialGradient><linearGradient id="shift" x2="'+(axis==='x'?'1':'0')+'" y2="'+(axis==='y'?'1':'0')+'"><stop stop-color="'+from+'"/><stop offset="1" stop-color="'+to+'"/></linearGradient><mask id="region"><ellipse cx="'+cx+'" cy="'+cy+'" rx="'+rx+'" ry="'+ry+'" fill="url(#soft)"/></mask></defs><rect width="100" height="100" fill="rgb(50%,50%,50%)"/><rect width="100" height="100" fill="url(#shift)" mask="url(#region)"/></svg>';
  for(const cat of cats){
   const kind=({0:1,1:0,2:2,3:3})[cat.dataset.roofRank]||0,reclining=cat.dataset.catPose==='rear-reclining',key=kind+':'+reclining;
   cat.dataset.roofPosture=['original','head-tilt','rounded-back','ear-tail'][kind];
   if(!kind){cat.style.removeProperty('--roof-posture-filter');continue;}
   let filter=e.postures.get(key);
   if(!filter){
    filter=element('filter',{id:e.filters.ambient.filter.id+'-posture-'+kind+'-'+Number(reclining),x:0,y:0,width:'100%',height:'100%',primitiveUnits:'objectBoundingBox','color-interpolation-filters':'sRGB'});
    const head=reclining?[76,26,21,28]:[50,20,28,24],back=reclining?[43,49,32,34]:[50,59,33,29],ear=reclining?[76,18,16,14]:[30,12,13,12],tail=reclining?[27,73,25,22]:[65,87,26,13],region=kind===1?head:kind===2?back:ear;
    const rx=kind===1?['rgb(20%,50%,50%)','rgb(80%,50%,50%)']:kind===2?['rgb(70%,50%,50%)','rgb(30%,50%,50%)']:['rgb(73%,50%,50%)','rgb(73%,50%,50%)'];
    const ry=kind===1?['rgb(50%,80%,50%)','rgb(50%,20%,50%)']:kind===2?['rgb(50%,75%,50%)','rgb(50%,75%,50%)']:['rgb(50%,50%,50%)','rgb(50%,50%,50%)'];
    for(const [i,colors]of [rx,ry].entries()){
     let svg=field(...region,i===0?(kind===1?'y':'x'):'x',...colors);
     if(kind===3&&i===0){const extra=field(...tail,'y','rgb(38%,50%,50%)','rgb(24%,50%,50%)'),inner=extra.slice(extra.indexOf('<defs>'),extra.lastIndexOf('</svg>')).replaceAll('soft','tail-soft').replaceAll('shift','tail-shift').replaceAll('region','tail-region').replace('<rect width="100" height="100" fill="rgb(50%,50%,50%)"/>','');svg=svg.replace('</svg>',inner+'</svg>');}
     const map='posture-map-'+i;filter.append(element('feImage',{href:'data:image/svg+xml,'+encodeURIComponent(svg),x:0,y:0,width:1,height:1,preserveAspectRatio:'none',result:map}));
     filter.append(element('feDisplacementMap',{in:i?'posture-x':'SourceGraphic',in2:map,scale:kind===1?.075:kind===2?.065:.055,xChannelSelector:'R',yChannelSelector:'G',result:i?'posture-xy':'posture-x'}));
    }
    e.svg.querySelector('defs').append(filter);e.postures.set(key,filter);
   }
   cat.style.setProperty('--roof-posture-filter','url("#'+filter.id+'")');
  }
 }
 function roofCasts(card,w,cats,e){
  const surface=card.querySelector('[data-roof-surface]');if(!surface)return;
  const at=SolarModel.time(w),moon=RoofMoon.snapshot(at),night=SolarModel.phase(at)==='night',candidates=cats.filter(c=>c.getAttribute('src')&&c.complete&&c.naturalWidth&&!c.hasAttribute('data-cat-placeholder'));
  const chosen=candidates;
  let cast=e.roofCasts;
  if(!cast||cast.layer.parentNode!==surface.parentNode){
   const id=e.filters.ambient.filter.id+'-roof-cast',layer=element('g',{'data-roof-moon-casts':'','pointer-events':'none'}),defs=element('defs'),clip=element('clipPath',{id:id+'-plane'}),soft=element('filter',{id:id+'-soft',x:'-30%',y:'-60%',width:'160%',height:'220%'});
   clip.append(element('path',{d:surface.getAttribute('d')}));soft.append(element('feGaussianBlur',{stdDeviation:'.7'}));const fade=element('linearGradient',{id:id+'-fade',x2:0,y1:0,y2:1});for(const [offset,opacity]of [[0,.16],[.55,.5],[1,.95]])fade.append(element('stop',{offset,'stop-color':'#101c2d','stop-opacity':opacity}));defs.append(clip,soft,fade);layer.append(defs);const ink=element('g',{'clip-path':'url(#'+clip.id+')'});layer.append(ink);surface.parentNode.append(layer);cast={id,layer,defs,ink,entries:new Map()};e.roofCasts=cast;
  }
  cast.layer.style.opacity=night?String(moon.opacity*moon.illumination*.22):'0';
  card.toggleAttribute('data-roof-cat-cast',night&&chosen.length>0);
  for(const [cat,item]of cast.entries)if(!chosen.includes(cat)){item.group.remove();item.mask.remove();cast.entries.delete(cat);}
  const scene=card.querySelector('.awake-scene'),scale=scene.getBoundingClientRect().width/208,lightX=104+(.5-moon.progress)*(card.clientWidth/scale+15);
  for(const cat of chosen){
   let item=cast.entries.get(cat);if(!item){const id=cast.id+'-'+cat.dataset.roofRank,mask=element('mask',{id,x:0,y:0,maskUnits:'userSpaceOnUse',maskContentUnits:'userSpaceOnUse',style:'mask-type:alpha'}),image=element('image',{x:0,y:0,preserveAspectRatio:'none'});mask.append(image);cast.defs.append(mask);const group=element('g',{'data-roof-cat-cast':cat.dataset.roofRank}),blur=element('g',{filter:'url(#'+cast.id+'-soft)'}),body=element('rect',{x:0,y:0,fill:'url(#'+cast.id+'-fade)',mask:'url(#'+id+')'});blur.append(body);group.append(blur);cast.ink.append(group);item={group,mask,image,body};cast.entries.set(cat,item);}
   const x=parseFloat(cat.style.getPropertyValue('--roof-cat-x')),top=parseFloat(cat.style.getPropertyValue('--roof-cat-y')),width=parseFloat(cat.style.getPropertyValue('--roof-cat-width')),height=parseFloat(cat.style.getPropertyValue('--roof-cat-height')),cx=x+width/2,reclining=cat.dataset.catPose==='rear-reclining',foot=roof.ridge(cx)+(reclining?18:12),fy=foot-top;
   const length=clamp(8,18,height*.22*(1.25-.4*moon.altitude/48)),dx=clamp(-7,7,(cx-lightX)*.05),a=.88,b=(roof.ridge(cx+1)-roof.ridge(cx-1))*.44,c=-dx/fy,d=-length/fy,tx=cx-a*width/2-c*fy,ty=foot-b*width/2-d*fy;
   const posture=cat.style.getPropertyValue('--roof-posture-filter'),key=[cat.getAttribute('src'),x,top,width,height,length,dx,posture].join(':');
   if(item.key!==key){item.key=key;for(const n of [item.mask,item.image,item.body]){n.setAttribute('width',width);n.setAttribute('height',height);}item.image.setAttribute('href',cat.getAttribute('src'));if(posture)item.image.setAttribute('filter',posture);else item.image.removeAttribute('filter');item.body.setAttribute('transform','matrix('+[a,b,c,d,tx,ty].join(' ')+')');item.group.dataset.castVector=dx+','+length;}
   item.group.style.opacity=cat.style.opacity;
  }
 }
 function applyRoof(card,w){
  if(!card?.isConnected)return;const e=install(card),stamp=[Math.floor(SolarModel.time(w)/60000),w.season].join(':');
  if(e.stamp!==stamp){for(const mode of Object.keys(e.filters)){const p=parameters({...w,weather:'sunny'},'roof',mode),f=e.filters[mode];f.saturation.setAttribute('values',p[1]);for(const[i,n]of [...f.rgb.children].entries()){n.setAttribute('slope',round(p[0]*p[2]*p[i+3]));n.setAttribute('intercept',round(p[0]*(1-p[2])*.46));}}e.stamp=stamp;}
  const moonInk=RoofMoon.snapshot(SolarModel.time(w));card.style.setProperty('--roof-night-ink',SolarModel.phase(SolarModel.time(w))==='night'?moonInk.opacity*moonInk.illumination:0);
  const group=card.querySelector('.roof-cat-group'),scene=group?.parentElement;if(!group||!scene)return;
  let contacts=scene.querySelector(':scope > [data-cat-harmony-roof-contact]');if(!contacts){contacts=document.createElement('span');contacts.dataset.catHarmonyRoofContact='';contacts.setAttribute('aria-hidden','true');scene.insertBefore(contacts,group);}
  contacts.style.transform=getComputedStyle(group).transform;
  const cats=[...group.querySelectorAll(':scope > img.roof-cat')];while(contacts.children.length>cats.length)contacts.lastElementChild.remove();
  for(const[i,cat]of cats.entries()){
   let spot=contacts.children[i];if(!spot){spot=document.createElement('span');contacts.append(spot);}
   const x=parseFloat(cat.style.getPropertyValue('--roof-cat-x')),width=parseFloat(cat.style.getPropertyValue('--roof-cat-width')),reclining=cat.dataset.catPose==='rear-reclining',y=roof.ridge(x+width/2)+(reclining?18:12);
   const moon=RoofMoon.snapshot(SolarModel.time(w)),lightX=104+(.5-moon.progress)*(card.clientWidth/(scene.getBoundingClientRect().width/208)+15),dx=Math.max(-5,Math.min(5,(x+width/2-lightX)*.035)),level=SolarModel.phase(SolarModel.time(w))==='night'?moon.opacity*moon.illumination:0;
   spot.style.cssText=`left:${x+width/2}px;top:${y-1}px;width:${width*(reclining?.62:.46)}px;height:3px;opacity:${Number(cat.style.opacity)*(.16+.025*level)};--roof-cast-x:${dx}px;--roof-cast-level:${level}`;
  }
  roofPostures(cats,e);
  roofCasts(card,w,cats,e);
 }
 function roofUpdate(element,at){const result=roof.update(element,at);applyRoof(element?.closest('.roof-sky-card'),{...DayRoom.world(),at});return result;}
 function skyRoofUpdate(scene,w){const result=sky.updateRoof(scene,w);applyRoof(scene?.closest('.roof-sky-card'),w);return result;}
 globalThis.SolarLighting=Object.freeze({...solar,update});
 globalThis.RoomBackgrounds=Object.freeze({...backgrounds,update:backgroundUpdate});
 globalThis.RoofRecline=Object.freeze({...roof,update:roofUpdate});
 globalThis.SolarSky=Object.freeze({...sky,updateRoof:skyRoofUpdate});
 // Entry, resize and minute changes already reach these shared update methods.
 // Native lamp and shoji state selects variants in CSS, without extra observers.
 return Object.freeze({parameters,apply,applyRoof,inspect:stage=>{const e=entries.get(stage);return e?{where:stage.dataset.location||(stage.matches('.roof-sky-card')?'roof':null),stamp:e.stamp,lanternWarmth:e.lanternWarmth||0,filters:Object.fromEntries(Object.entries(e.filters).map(([k,f])=>[k,{saturation:+f.saturation.getAttribute('values'),rgb:[...f.rgb.children].map(n=>[+n.getAttribute('slope'),+n.getAttribute('intercept')])}]))}:null;}});
})();
