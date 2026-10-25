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
   const weights=SolarModel.weights(SolarModel.time(w)),night=weights.night||0;
   stage.style.setProperty('--harmony-contact-opacity',round(.18-.045*night));stage.style.setProperty('--harmony-cast-opacity',round(.79-.16*night));e.stamp=stamp;
  }
  contact(stage);
 }
 function update(stage,w){const result=solar.update(stage,w);apply(stage,w);return result;}
 function backgroundUpdate(stage,where,w){const pending=backgrounds.update(stage,where,w);apply(stage,w);return pending;}
 function applyRoof(card,w){
  if(!card?.isConnected)return;const e=install(card),stamp=[Math.floor(SolarModel.time(w)/60000),w.season].join(':');
  if(e.stamp!==stamp){for(const mode of Object.keys(e.filters)){const p=parameters({...w,weather:'sunny'},'roof',mode),f=e.filters[mode];f.saturation.setAttribute('values',p[1]);for(const[i,n]of [...f.rgb.children].entries()){n.setAttribute('slope',round(p[0]*p[2]*p[i+3]));n.setAttribute('intercept',round(p[0]*(1-p[2])*.46));}}e.stamp=stamp;}
  const group=card.querySelector('.roof-cat-group'),scene=group?.parentElement;if(!group||!scene)return;
  let contacts=scene.querySelector(':scope > [data-cat-harmony-roof-contact]');if(!contacts){contacts=document.createElement('span');contacts.dataset.catHarmonyRoofContact='';contacts.setAttribute('aria-hidden','true');scene.insertBefore(contacts,group);}
  contacts.style.transform=getComputedStyle(group).transform;
  const cats=[...group.querySelectorAll(':scope > img.roof-cat')];while(contacts.children.length>cats.length)contacts.lastElementChild.remove();
  for(const[i,cat]of cats.entries()){
   let spot=contacts.children[i];if(!spot){spot=document.createElement('span');contacts.append(spot);}
   const x=parseFloat(cat.style.getPropertyValue('--roof-cat-x')),width=parseFloat(cat.style.getPropertyValue('--roof-cat-width')),reclining=cat.dataset.catPose==='rear-reclining',y=roof.ridge(x+width/2)+(reclining?18:12);
   spot.style.cssText=`left:${x+width/2}px;top:${y-1}px;width:${width*(reclining?.62:.46)}px;height:3px;opacity:${Number(cat.style.opacity)*.16}`;
  }
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
