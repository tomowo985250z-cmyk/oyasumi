// Shared major stars: subset of the existing d3-celestial catalog; its BSD-3
// license and provenance remain in assets/engawa-night-sky/. J2000 RA/Dec degrees.
// No catalog request, constellation lines or labels are needed for these anchors.
globalThis.NightConstellations=(()=>{
 const rad=Math.PI/180;
 const rows=[["Polaris","north",37.9545,89.2641,1.97,0.636],["Dubhe","dipper",165.932,61.751,1.81,1.061],["Merak","dipper",165.4603,56.3824,2.34,0.033],["Phecda","dipper",178.4577,53.6948,2.41,0.044],["Megrez","dipper",-176.1435,57.0326,3.32,0.077],["Alioth","dipper",-166.4927,55.9598,1.76,-0.022],["Mizar","dipper",-159.0186,54.9254,2.23,0.057],["Alkaid","dipper",-153.1148,49.3133,1.85,-0.099],["Caph","cassiopeia",2.2945,59.1498,2.28,0.38],["Schedar","cassiopeia",10.1268,56.5373,2.24,1.17],["Gamma-Cas","cassiopeia",14.1772,60.7167,2.15,-0.046],["Ruchbah","cassiopeia",21.454,60.2353,2.66,0.16],["Segin","cassiopeia",28.5989,63.6701,3.35,-0.15],["Betelgeuse","orion",88.7929,7.4071,0.45,1.5],["Rigel","orion",78.6345,-8.2016,0.18,-0.03],["Bellatrix","orion",81.2828,6.3497,1.64,-0.224],["Saiph","orion",86.9391,-9.6696,2.07,-0.168],["Alnitak","orion",85.1897,-1.9426,1.74,-0.199],["Alnilam","orion",84.0534,-1.2019,1.69,-0.184],["Mintaka","orion",83.0017,-0.2991,2.25,-0.175],["Antares","scorpius",-112.6481,-26.432,1.06,1.865],["Acrab","scorpius",-118.6407,-19.8055,2.56,-0.065],["Dschubba","scorpius",-119.9166,-22.6217,2.29,-0.117],["Pi-Sco","scorpius",-120.287,-26.1141,2.89,-0.18],["Shaula","scorpius",-96.5978,-37.1038,1.62,-0.231],["Lesath","scorpius",-97.309,-37.2958,2.7,-0.179],["Sargas","scorpius",-95.6703,-42.9978,1.86,0.406],["Epsilon-Sco","scorpius",-107.4591,-34.2932,2.29,1.144],["Mu-Sco","scorpius",-107.0324,-38.0474,3,-0.2],["Zeta-Sco","scorpius",-106.5011,-42.362,4.7,0.444],["Eta-Sco","scorpius",-101.9617,-43.2392,3.32,0.441],["Vega","lyra",-80.7653,38.7837,0.03,-0.001],["Deneb","cygnus",-49.642,45.2803,1.25,0.092],["Altair","aquila",-62.3042,8.8683,0.76,0.221],["Sadr","cygnus",-54.4429,40.2567,2.23,0.673],["Gienah","cygnus",-48.4472,33.9703,2.48,1.021],["Delta-Cyg","cygnus",-63.7563,45.1308,2.86,-0.002],["Albireo","cygnus",-67.3197,27.9597,3.05,1.088],["Sheliak","lyra",-77.48,33.3627,3.52,0.003],["Sulafat","lyra",-75.2641,32.6896,3.25,-0.049],["Tarazed","aquila",-63.4351,10.6133,2.72,1.507],["Alshain","aquila",-61.1717,6.4068,3.71,0.855],["Regulus","leo",152.093,11.9672,1.36,-0.087],["Denebola","leo",177.2649,14.5721,2.14,0.09],["Algieba","leo",154.9931,19.8415,2.01,1.128],["Zosma","leo",168.5271,20.5237,2.56,0.128],["Chertan","leo",168.56,15.4296,3.33,-0.003],["Adhafera","leo",154.1726,23.4173,3.43,0.307],["Epsilon-Leo","leo",146.4628,23.7743,2.97,0.808],["Arcturus","bootes",-146.0847,19.1824,-0.05,1.239],["Spica","virgo",-158.7018,-11.1613,0.98,-0.235],["Markab","pegasus",-13.8098,15.2053,2.49,-0.002],["Scheat","pegasus",-14.0564,28.0828,2.44,1.655],["Algenib","pegasus",3.309,15.1836,2.83,-0.19],["Alpheratz","andromeda",2.0969,29.0904,2.07,-0.038],["Mirach","andromeda",17.433,35.6206,2.07,1.576],["Almach","andromeda",30.9748,42.3297,2.1,1.37],["Sirius","canis-major",101.2872,-16.7161,-1.44,0.009],["Procyon","canis-minor",114.8255,5.225,0.4,0.432],["Aldebaran","taurus",68.9802,16.5093,0.87,1.538],["Capella","auriga",79.1723,45.998,0.08,0.795],["Pollux","gemini",116.329,28.0262,1.16,0.991],["Castor","gemini",113.6494,31.8883,1.58,0.034],["Elnath","taurus",81.573,28.6075,1.65,-0.13]];
 const vector=(ra,dec)=>[Math.cos(dec*rad)*Math.cos(ra*rad),Math.cos(dec*rad)*Math.sin(ra*rad),Math.sin(dec*rad)];
 const catalog=Object.freeze(rows.map(([id,group,ra,dec,mag,bv])=>Object.freeze({id,group,ra,dec,mag,bv,p:Object.freeze(vector(ra,dec))})));
 function basis(w){
  const at=Math.floor(SolarModel.time(w)/60000)*60000,region=SolarModel.region(),days=(at-Date.UTC(2000,0,1,12))/86400000,t=days/36525;
  // Existing local sidereal time convention (UTC, east-positive longitude).
  // https://aa.usno.navy.mil/faq/GAST and /faq/alt_az
  const lst=(280.460625+360.985647364185*days+region.longitude)%360;
  // J2000 to mean equator/equinox of date, IAU 1976 precession angles.
  const zeta=(2306.2181*t+.30188*t*t+.017998*t*t*t)*rad/3600,z=(2306.2181*t+1.09468*t*t+.018203*t*t*t)*rad/3600,theta=(2004.3109*t-.42665*t*t-.041833*t*t*t)*rad/3600;
  return {at,lst,region,cos:Math.cos(lst*rad),sin:Math.sin(lst*rad),cl:Math.cos(region.latitude*rad),sl:Math.sin(region.latitude*rad),cz:Math.cos(z),sz:Math.sin(z),cze:Math.cos(zeta),sze:Math.sin(zeta),ct:Math.cos(theta),st:Math.sin(theta)};
 }
 function horizontal(p,b){
  const a=b.cze*p[0]-b.sze*p[1],c=b.sze*p[0]+b.cze*p[1],d=b.ct*a-b.st*p[2],q=[b.cz*d-b.sz*c,b.sz*d+b.cz*c,b.st*a+b.ct*p[2]];
  const meridian=b.cos*q[0]+b.sin*q[1],east=-b.sin*q[0]+b.cos*q[1],north=b.cl*q[2]-b.sl*meridian,up=b.sl*q[2]+b.cl*meridian;
  return {east,north,up,altitude:Math.asin(Math.max(-1,Math.min(1,up)))/rad,azimuth:(Math.atan2(east,north)/rad+360)%360};
 }
 function project(p,b,where='engawa',visibleOnly=false){
  const h=horizontal(p,b),bearing=SolarModel.bearing(where)*rad,forward=h.north*Math.cos(bearing)+h.east*Math.sin(bearing),right=h.east*Math.cos(bearing)-h.north*Math.sin(bearing);
  const delta=((h.azimuth-SolarModel.bearing(where)+540)%360)-180,scale=where==='roof'?288:200,horizon=where==='roof'?221:153,denominator=1+forward;
  // One conformal stereographic camera; equal x/y scale preserves local shapes.
  const x=200+scale*right/Math.max(.000001,denominator),y=horizon-scale*h.up/Math.max(.000001,denominator);
  const inView=h.altitude>0&&Math.abs(delta)<=90&&x>=0&&x<=400&&y>=0&&y<horizon;
  return visibleOnly&&!inView?null:{...h,delta,x,y,inView};
 }
 function state(w,where){const b=basis(w);return {key:b.region.id+':'+b.at+':'+where,b,points:catalog.map(s=>({...s,...project(s.p,b,where)}))};}
 function opacity(s){return s.inView?(.32+.56*Math.max(0,Math.min(1,(4-s.mag)/4)))*SolarModel.smooth(0,5,s.altitude):0;}
 function markup(w,where){const s=state(w,where);return '<g data-major-stars="" data-facing="'+SolarModel.bearing(where)+'" data-major-key="'+s.key+'" pointer-events="none">'+s.points.map(p=>'<circle data-major-star="'+p.id+'" data-star-group="'+p.group+'" cx="'+p.x.toFixed(3)+'" cy="'+p.y.toFixed(3)+'" r="'+(.55+Math.max(0,Math.min(1,(4-p.mag)/5))*.58).toFixed(3)+'" fill="'+(p.bv>.8?'#e7d9bf':'#d5e3f3')+'" opacity="'+opacity(p).toFixed(4)+'"/>').join('')+'</g>';}
 function sync(layer,w,where){const key=SolarModel.region().id+':'+Math.floor(SolarModel.time(w)/60000)*60000+':'+where;if(layer.dataset.majorKey===key)return;const s=state(w,where);layer.querySelectorAll('[data-major-star]').forEach((star,i)=>{const p=s.points[i];star.setAttribute('cx',p.x.toFixed(3));star.setAttribute('cy',p.y.toFixed(3));star.setAttribute('opacity',opacity(p).toFixed(4));});layer.dataset.majorKey=s.key;}
 return Object.freeze({catalog,vector,basis,horizontal,project,state,markup,sync});
})();

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
 let starFieldDecode,starFieldReady=false;
 const pendingFields=new WeakSet();
 function updateStarField(card){
  const layer=card.querySelector('.card-sky-stars'),field=layer?.querySelector('.roof-star-field');
  const available=()=>{
   if(!card.isConnected||document.hidden||document.documentElement.hasAttribute('data-cat-state-pending'))return false;
   const r=card.getBoundingClientRect();return r.width>0&&r.top<innerHeight+120&&r.bottom>0;
  };
  if(!field||!available())return;
  if(layer.hasAttribute('data-deep-field-ready')){RoofMoon.detail?.(card);return;}
  if(pendingFields.has(layer))return;
  const mount=()=>{
   if(!available())return;
   layer.querySelectorAll('.roof-twinkle').forEach(star=>{star.style.animation='none';});
   field.style.background='center / cover no-repeat url("'+starFieldImage+'")';
   field.removeAttribute('data-roof-field-source');layer.setAttribute('data-deep-field-ready','');RoofMoon.detail?.(card);
  };
  if(starFieldReady){mount();return;}
  pendingFields.add(layer);
  if(!starFieldDecode){const image=new Image();image.decoding='async';image.fetchPriority='low';image.src=starFieldImage;starFieldDecode=image.decode().then(()=>{starFieldReady=true;return image;});}
  void starFieldDecode.then(()=>{pendingFields.delete(layer);mount();},()=>{pendingFields.delete(layer);starFieldDecode=undefined;});
 }
 window.addEventListener('scroll',()=>{const card=document.querySelector('.roof-sky-card');if(card)updateStarField(card);},{passive:true});
 // Same major-star calculation as the three window/outdoor scenes.
 function northernStars(w){return '<svg data-northern-stars="" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none">'+NightConstellations.markup(w,'roof')+'</svg>';}
 function updateNorthernStars(card,w){const layer=card.querySelector('[data-northern-stars] [data-major-stars]');if(layer)NightConstellations.sync(layer,w,'roof');}
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
   const cloudGroups=svg.querySelectorAll('[data-sky-clouds]');
   for(const cloudGroup of cloudGroups)SeasonLandscape.clouds(w,frame).forEach((c,i)=>cloudGroup.children[i]?.setAttribute('transform',`translate(${c.x} ${c.y}) scale(${c.scale})`));
   const t=SolarModel.twilight(SolarModel.time(w),frame),p=SeasonLandscape.theme({...w,solar:true,skyFrame:frame});
   svg.querySelector('[data-landscape-stars]')?.setAttribute('opacity',String(t.stars*(w.weather==='sunny'?.7:.23)));
   for(const cloudGroup of cloudGroups)cloudGroup.setAttribute('opacity',String(1-t.stars*.65));
   const stops=svg.querySelector('[data-landscape-gradient]')?.children;
   if(stops)[p.sky,SeasonLandscape.mix(p.sky,p.horizon,.55),p.horizon].forEach((color,i)=>stops[i].setAttribute('stop-color',color));
   svg.querySelectorAll('.room-window-moon').forEach(moon=>RoofMoon.update(moon,SolarModel.time(w)));
  }
  paintEngawa(svg,w);
  svg.dataset.solarSkyKey=key;svg.dataset.solarSource=s.source;svg.dataset.solarAltitude=s.altitude;
  svg.dataset.solarRegion=s.region;svg.dataset.solarPeriod=s.sky.sunPeriod||'';
 }
 // Approved sky55 study: terrain and cloud material only; all room geometry stays upstream.
 const engawaAssets={"assets":{"spring":{"file":"assets/engawa-sky55/country-spring-2147d2624e4261cf.webp","placement":{"x":69.05,"y":76.13653386454183,"width":263.7,"height":155.31346613545816}},"summer":{"file":"assets/engawa-sky55/country-summer-878d1971ea5ddf11.webp","placement":{"x":69.05,"y":75.82652694610778,"width":263.7,"height":155.6234730538922}},"autumn":{"file":"assets/engawa-sky55/country-autumn-a987b36d6c101218.webp","placement":{"x":69.05,"y":76.44530815109343,"width":263.7,"height":155.00469184890656}},"winter":{"file":"assets/engawa-sky55/country-winter-12a7ab239d7514a0.webp","placement":{"x":69.05,"y":76.75285714285712,"width":263.7,"height":154.69714285714286}}},"cloud":{"file":"assets/engawa-sky55/cloud-2b6c0afbfb51844e.webp"}};
 function engawaMatrix(brightness,saturation,t){
  const l=[.2126,.7152,.0722],temperature=[1+t.evening*.16-t.night*.20,1-t.evening*.025,1-t.evening*.19+t.night*.15];
  return [0,1,2].flatMap(row=>[...l.map((v,col)=>Number((brightness*temperature[row]*((1-saturation)*v+(row===col?saturation:0))).toFixed(5))),0,0]).concat([0,0,0,1,0]).join(' ');
 }
 // Window anchors in the unchanged seasonal photo pixels, below the roof eaves.
 // Project through each image's existing geometry; no extra buildings or timers.
 // Fixed photo-window locations: 1–2 panes per house, with restrained distance variation.
 const commonHomeWindows={
  room:[[323,489,1,.92],[342,489,.92,.82],[548,488,.73,.72],[672,489,.65,.64]],
  garden:[[929,488,.68,.69],[1018,488,.72,.75],[1110,489,.65,.63],[1234,490,.83,.8],[1251,490,.72,.69],[1517,486,.9,.83],[1532,486,.76,.73]],
  engawa:[[207,324,1,.92],[223,324,.88,.79],[345,322,.65,.65]]
 };
 const homeWindowAnchors={spring:commonHomeWindows,summer:commonHomeWindows,autumn:commonHomeWindows,winter:{
  room:[[323,482,1,.92],[342,482,.92,.82],[548,483,.73,.72],[672,486,.65,.64]],
  garden:[[929,484,.68,.69],[1018,485,.72,.75],[1110,486,.65,.63],[1234,487,.83,.8],[1251,487,.72,.69],[1517,483,.9,.83],[1532,483,.76,.73]],
  engawa:[[205,320,1,.92],[221,320,.88,.79],[345,320,.65,.65]]
 }};
 function distantHomes(svg,w){
  const photo=svg.querySelector('[data-village-terrain],[data-sky55-terrain]');if(!photo)return;
  let lights=svg.querySelector(':scope > [data-distant-home-lights]');
  if(!lights){lights=document.createElementNS(ns,'g');lights.setAttribute('data-distant-home-lights','');lights.setAttribute('pointer-events','none');lights.setAttribute('aria-hidden','true');photo.after(lights);}
  const panoramic=photo.hasAttribute('data-village-terrain'),kind=panoramic?'village':'engawa',width=panoramic?2172:768,height=panoramic?724:512,
   x=Number(photo.getAttribute('x')),y=Number(photo.getAttribute('y')),sx=Number(photo.getAttribute('width'))/width,sy=Number(photo.getAttribute('height'))/height,key=w.season+':'+kind+':'+x+':'+y;
  if(lights.dataset.windows!==key){
   const defs=svg.querySelector('defs'),id=photo.getAttribute('filter').match(/#([^)'"]+)/)[1]+'-home-soft',view=panoramic?(svg.dataset.villageFrame==='window'?'room':'garden'):'engawa';
   if(!defs.querySelector('[id="'+id+'-glow"]'))defs.insertAdjacentHTML('beforeend','<radialGradient id="'+id+'-glow"><stop stop-color="#e7b777" stop-opacity=".17"/><stop offset=".5" stop-color="#dfad6d" stop-opacity=".059"/><stop offset="1" stop-color="#dfad6d" stop-opacity="0"/></radialGradient><filter id="'+id+'-edge" x="-65%" y="-95%" width="230%" height="290%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="'+(.52*sx)+' '+(.52*sy)+'"/></filter>');
   lights.replaceChildren();for(const [px,py,size,strength] of (homeWindowAnchors[w.season]||commonHomeWindows)[view]){
    const cx=x+px*sx,cy=y+py*sy;if(cx<2||cx>398||cy<0||cy>260)continue;
    const window=document.createElementNS(ns,'g');window.setAttribute('data-distant-home-window','');window.setAttribute('opacity',strength);
    const halo=document.createElementNS(ns,'ellipse');for(const [k,v]of Object.entries({cx,cy,rx:4.6*sx*size,ry:3.1*sy*size,fill:'url(#'+id+'-glow)'}))halo.setAttribute(k,v);
    const pane=document.createElementNS(ns,'rect');for(const [k,v]of Object.entries({x:cx-1.6*sx*size,y:cy-1.15*sy*size,width:3.2*sx*size,height:2.3*sy*size,rx:.7*sx*size,ry:.65*sy*size,fill:'#efc58a',opacity:'1',filter:'url(#'+id+'-edge)'}))pane.setAttribute(k,v);
    window.append(halo,pane);lights.append(window);
   }lights.dataset.windows=key;
  }
  const at=SolarModel.time(w),night=SolarModel.phase(at)==='night',level=night?SolarModel.smooth(-.833,-6,SolarModel.parameters(at).altitude):0;
  lights.setAttribute('opacity',String(.94*level*(w.weather==='rainy'?.6:w.weather==='cloudy'?.85:1)));
 }
 function paintEngawa(svg,w){
  if(!svg.hasAttribute('data-sky55'))return;
  const t=SolarModel.weights(SolarModel.time(w)),wet=w.weather==='rainy'?.72:w.weather==='cloudy'?.86:1;
  svg.querySelector('[data-sky55-tone="terrain"]').setAttribute('values',engawaMatrix((t.day+t.morning*.90+t.evening*.67+t.night*.24)*wet,t.day*.90+t.morning*.86+t.evening*.79+t.night*.38,t));
  svg.querySelector('[data-sky55-tone="cloud"]').setAttribute('values',engawaMatrix((t.day+t.morning*.93+t.evening*.75+t.night*.26)*wet,.82,t));
  distantHomes(svg,w);
 }
 function engawa(svg,w){
  // The complete original vector background remains available for restoration.
  if(new URLSearchParams(location.search).get('background')==='original')return svg;
  const asset=engawaAssets.assets[w.season]||engawaAssets.assets.summer,defs=svg.querySelector('defs'),id=defs.querySelector('[id]').id+'-sky55';
  const opening='<rect x="69.05" y="62.25" width="263.7" height="169.2"/>';
  defs.insertAdjacentHTML('beforeend',`<clipPath id="${id}-opening">${opening}</clipPath><mask id="${id}-outside" maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="260"><rect width="400" height="260" fill="white"/>${opening.replace('/>',' fill="black"/>')}</mask>`+['terrain','cloud'].map(name=>`<filter id="${id}-${name}" color-interpolation-filters="sRGB"><feColorMatrix data-sky55-tone="${name}" type="matrix"/></filter>`).join(''));
  const outside='url(#'+id+'-outside)';
  // Preserve the old scene under translucent room pixels and outside the opening.
  const rain=svg.querySelector(':scope > .weather-rain');
  let terrain=svg.querySelector(':scope > [data-depth="distant-ridge"]');
  while(terrain&&terrain!==rain){terrain.setAttribute('mask',outside);terrain=terrain.nextElementSibling;}
  const clouds=svg.querySelector('[data-sky-clouds]');
  if(clouds){
   const photographic=clouds.cloneNode(false);
   for(const original of clouds.children){
    const cloud=document.createElementNS(ns,'g');cloud.setAttribute('transform',original.getAttribute('transform'));
    cloud.innerHTML=`<image href="${engawaAssets.cloud.file}" x="-115" y="-70" width="230" height="130" preserveAspectRatio="xMidYMid meet" filter="url(#${id}-cloud)"/>`;photographic.append(cloud);
   }
   const layer=document.createElementNS(ns,'g');layer.setAttribute('clip-path','url(#'+id+'-opening)');layer.append(photographic);clouds.after(layer);clouds.setAttribute('mask',outside);
  }
  const photo=document.createElementNS(ns,'image');
  for(const [key,value]of Object.entries(asset.placement))photo.setAttribute(key,value);
  photo.setAttribute('href',asset.file);photo.setAttribute('preserveAspectRatio','none');photo.setAttribute('filter','url(#'+id+'-terrain)');photo.setAttribute('data-sky55-terrain',w.season);
  if(rain)svg.insertBefore(photo,rain);else svg.append(photo);
  svg.setAttribute('data-sky55','');paintEngawa(svg,w);return svg;
 }

 const villageAssets={"summer":{"file":"assets/village-world/summer-99ca9901877f7fb3.webp","width":2172,"height":724,"sha256":"99ca9901877f7fb3a0c70825cf1654f3d9f7eeb797567bf82cb0fb26ef2fb680","sourceSha256":"ba57bd20859e9fb36ffcafaa4ae322a2b287b1c5f1c31e25eff51fc68d792822"},"spring":{"file":"assets/village-world/spring-11246b324c900fcd.webp","width":2172,"height":724,"sha256":"11246b324c900fcd7be3984f72d4199fb71c41e91c861c9dfc43883982c3ba13","sourceSha256":"d8f4489012a9bd1fa4922b34a558dd7954cc2a686ba0b589ea3c6ab20188201c"},"autumn":{"file":"assets/village-world/autumn-cf7e918c3553880e.webp","width":2172,"height":724,"sha256":"cf7e918c3553880e827eb177916b3d8f79e50ab6c5c805fd7e39d475b164ef5f","sourceSha256":"0c759a4c5e02225d501ded0e2d6d208f6b123e398a13fda53f46790436ec35ac"},"winter":{"file":"assets/village-world/winter-5363dd264f58d617.webp","width":2172,"height":724,"sha256":"5363dd264f58d6172a39d4c5c79bdb518d1f448c8ce4544f951f93c7bc51fef2","sourceSha256":"8772212a2af0a6a4e2d7c0dd778f655ec653d1449874d220c6123841e01135e9"}};
// One north-origin panorama, projected with the same 180-degree map as the sun.
function village(svg,w,frame){
 if(new URLSearchParams(location.search).get('village')==='existing')return svg;
 const asset=villageAssets[w.season]||villageAssets.summer,defs=svg.querySelector('defs'),id=defs.querySelector('[id]').id+'-village';
 defs.insertAdjacentHTML('beforeend',`<clipPath id="${id}-view"><rect width="400" height="260"/></clipPath>`+['terrain','cloud'].map(name=>`<filter id="${id}-${name}" color-interpolation-filters="sRGB"><feColorMatrix data-sky55-tone="${name}" type="matrix"/></filter>`).join(''));
 const rain=svg.querySelector(':scope > .weather-rain');let old=svg.querySelector(':scope > [data-depth="distant-ridge"]');while(old&&old!==rain){old.style.display='none';old=old.nextElementSibling;}
 const clouds=svg.querySelector('[data-sky-clouds]');if(clouds){
  clouds.style.display='none';const layer=document.createElementNS(ns,'g'),photoClouds=clouds.cloneNode(false);photoClouds.style.removeProperty('display');photoClouds.removeAttribute('style');layer.setAttribute('clip-path',`url(#${id}-view)`);
  for(const original of clouds.children){const cloud=document.createElementNS(ns,'g');cloud.setAttribute('transform',original.getAttribute('transform'));cloud.innerHTML=`<image href="${engawaAssets.cloud.file}" x="-115" y="-70" width="230" height="130" preserveAspectRatio="xMidYMid meet" filter="url(#${id}-cloud)"/>`;photoClouds.append(cloud);}layer.append(photoClouds);clouds.after(layer);
 }
 const photo=document.createElementNS(ns,'image'),height=800*asset.height/asset.width;
 for(const [key,value]of Object.entries({x:200-SolarModel.bearing(frame)*400/180,y:260-height,width:800,height,href:asset.file,preserveAspectRatio:'none',filter:`url(#${id}-terrain)`,'data-village-terrain':w.season}))photo.setAttribute(key,value);
 if(rain)svg.insertBefore(photo,rain);else svg.append(photo);svg.setAttribute('data-sky55','');svg.dataset.villageFrame=frame;svg.dataset.viewBearing=SolarModel.bearing(frame);paintEngawa(svg,w);return svg;
}

 function landscape(w,frame='window'){
  const value={...w,solar:true,phase:SolarModel.phase(w.at),skyFrame:frame},svg=parse(SceneryMaterials.art(SeasonLandscape.art(value,frame==='window'?'window':'sky',w.at),'landscape',value));
  paint(svg,w,frame);return stringify(frame==='engawa'?engawa(svg,w):['window','garden'].includes(frame)?village(svg,w,frame):svg);
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

// Approved engawa night sky. Uses the existing clock; original landscape remains available.
globalThis.EngawaNightSky=(()=>{
 const base=SolarSky,ns='http://www.w3.org/2000/svg',rad=Math.PI/180;
 const enabled=new URLSearchParams(location.search).get('sky')!=='existing';
 let stars=null,loading=null,sequence=0;const cache=new Map();
 const vector=(ra,dec)=>[Math.cos(dec*rad)*Math.cos(ra*rad),Math.cos(dec*rad)*Math.sin(ra*rad),Math.sin(dec*rad)];
 const pole=vector(192.8594812065348,27.12825118085622),alpha=192.8594812065348*rad;
 const u=[-Math.sin(alpha),Math.cos(alpha),0],v=[-pole[2]*Math.cos(alpha),-pole[2]*Math.sin(alpha),Math.cos(27.12825118085622*rad)];
 function galactic(l,b=0){const t=(l-32.9319185680026)*rad,c=Math.cos(b*rad);return u.map((a,i)=>c*(Math.cos(t)*a+Math.sin(t)*v[i])+Math.sin(b*rad)*pole[i]);}
 const basis=NightConstellations.basis;
 const projectVector=NightConstellations.project;
 function makeCatalog(catalog){
  const output=catalog.map(([ra,dec,mag,bv])=>({p:vector(ra,dec),mag,warm:bv>.8,real:true}));
  // Major anchors are drawn once, separately from the existing faint catalog.
  for(let i=output.length-1;i>=0;i--)if(NightConstellations.catalog.some(s=>s.p.reduce((n,x,k)=>n+x*output[i].p[k],0)>.9999999))output.splice(i,1);
  let seed=0x534b5937;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  // Decorative faint stars are fixed in celestial coordinates, never screen noise.
  for(let i=0;i<9200;i++){
   const l=random()*360,b=(random()+random()+random()+random()-2)*11;
   const p=i<6000?galactic(l,b):vector(random()*360,Math.asin(random()*2-1)/rad);
   output.push({p,mag:6.15+random()*1.9,warm:random()<.24,real:false});
  }
  return output;
 }
 function ready(){
  if(!enabled)return Promise.resolve();
  loading??=fetch('assets/engawa-night-sky/bright-stars-a154f0df99454d3d.json',{priority:'low'}).then(r=>{if(!r.ok)throw Error('Star catalog unavailable');return r.json();}).then(data=>{stars=makeCatalog(data);return refresh();});
  return loading;
 }
 async function refresh(){
  const stages=[...document.querySelectorAll('.day-room[data-location="engawa"],.day-room[data-location="room"],.day-room[data-location="garden"]')];
  for(const stage of stages){const cat=stage.querySelector('.room-resident img');try{if(cat&&!cat.complete)await cat.decode();}catch{}if(!stage.isConnected)continue;
   const bg=stage.querySelector('.room-background-layer:not([data-background-outgoing])');if(!bg)continue;
   const w={at:NightClock.now(),weather:bg.dataset.lightWeather,season:bg.dataset.lightSeason};
   updateStage(stage,w);
  }
 }
 function state(w,where='engawa'){
  const b=basis(w),key=[b.region.id,b.at,w.weather].join(':')+(where==='engawa'?'':':'+where);if(cache.has(key))return cache.get(key);
  const moon=RoofMoon.snapshot(b.at),darkness=SolarModel.twilight(b.at,where).stars;
  const glare=moon.illumination*moon.opacity*SolarModel.smooth(0,18,moon.altitude);
  const weather=w.weather==='rainy'?.002:w.weather==='cloudy'?.075:1;
  const strength=weather*(1-.72*glare),milkyStrength=(w.weather==='sunny'?1:w.weather==='cloudy'?.012:0)*(1-.90*glare);
  const sizes=[.16,.24,.34,.48,.68,.94],paths=Array.from({length:12},()=>[]);let visible=0,realVisible=0;
  if(stars)for(const s of stars){
   const p=projectVector(s.p,b,where,true);if(!p||p.altitude<.8||p.x<(where==='engawa'?67:0)||p.x>(where==='engawa'?335:400)||p.y<(where==='engawa'?60:0)||p.y>158)continue;
   const bin=Math.max(0,Math.min(5,Math.floor((7.8-s.mag)*.72))),k=bin+(s.warm?6:0);
   paths[k].push(`M${p.x.toFixed(2)} ${p.y.toFixed(2)}h.01`);visible++;if(s.real)realVisible++;
  }
  function band(layer){let path='';const noise=n=>{const q=Math.sin(n*127.1+layer*311.7)*43758.5453;return q-Math.floor(q);};
   for(let l=0;l<360;l+=3){
    if(noise(l+.9)<.14)continue;
    const latitude=(noise(l+.17)*2-1)*(layer===0?8:layer===3?3:5)+2.2*Math.sin(l*rad*3);
    const p=projectVector(galactic(l,latitude),b,where);if(p.altitude<-5||Math.abs(p.delta)>98)continue;
    const scale=layer===0?1:layer===1?.53:layer===2?.32:.24,rx=(10+noise(l+.31)*10)*scale,ry=(5+noise(l+.64)*5)*scale;
    path+=`M${(p.x-rx).toFixed(2)} ${p.y.toFixed(2)}a${rx.toFixed(2)} ${ry.toFixed(2)} 0 1 0 ${(rx*2).toFixed(2)} 0a${rx.toFixed(2)} ${ry.toFixed(2)} 0 1 0 ${(-rx*2).toFixed(2)} 0Z`;
   }return path;
  }
  const result={...b,key,darkness,glare,strength,milkyStrength,sizes,paths:paths.map(p=>p.join('')),bands:[band(0),band(1),band(2),band(3)],visible,realVisible};
  if(cache.size>12)cache.delete(cache.keys().next().value);cache.set(key,result);return result;
 }
 function active(w,where='engawa'){const at=SolarModel.time(w);return SolarModel.phase(at)==='night'&&SolarModel.twilight(at,where).stars>0;}
 function sync(svg,w,where='engawa'){
  const layer=svg.querySelector('[data-engawa-night-study]');if(!layer)return;
  const s=state(w,where);layer.setAttribute('opacity',active(w,where)?s.darkness:0);
  if(layer.dataset.skyKey===s.key)return;
  layer.dataset.skyKey=s.key;layer.dataset.facing=SolarModel.bearing(where);layer.dataset.visibleStars=s.visible;layer.dataset.realStars=s.realVisible;layer.dataset.glare=s.glare.toFixed(4);
  const major=layer.querySelector('[data-major-stars]');if(major){NightConstellations.sync(major,w,where);major.setAttribute('opacity',(s.strength).toFixed(4));}
  layer.querySelector('[data-night-fine-stars]').setAttribute('opacity',s.strength.toFixed(4));
  layer.querySelectorAll('[data-night-star-bin]').forEach((p,i)=>p.setAttribute('d',s.paths[i]));
  layer.querySelector('[data-night-milky-way]').setAttribute('opacity',s.milkyStrength.toFixed(4));
  layer.querySelectorAll('[data-milky-band]').forEach((p,i)=>p.setAttribute('d',s.bands[i]));
  // A moonlit sky has less deep contrast, without changing the existing moon.
  layer.querySelector('[data-night-haze]').setAttribute('opacity',(.03+s.glare*.075+(w.weather==='cloudy'?.10:w.weather==='rainy'?.12:0)).toFixed(4));
 }
 function decorate(svg,w,where='engawa'){
  if(svg.querySelector('[data-engawa-night-study]')){sync(svg,w,where);return svg;}
  const id='engawa-night-'+(++sequence),defs=svg.querySelector('defs');
  defs.insertAdjacentHTML('beforeend',`<clipPath id="${id}-view"><rect x="69.05" y="62.25" width="263.7" height="169.2"/></clipPath><mask id="${id}-outside" maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="260"><rect width="400" height="260" fill="white"/><rect x="69.05" y="62.25" width="263.7" height="169.2" fill="black"/></mask><linearGradient id="${id}-blue" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#030916"/><stop offset=".64" stop-color="#071225"/><stop offset="1" stop-color="#192b3b"/></linearGradient><filter id="${id}-soft" x="-30%" y="-100%" width="160%" height="300%"><feGaussianBlur stdDeviation="3.6"/></filter>`);
  const layer=document.createElementNS(ns,'g');layer.setAttribute('data-engawa-night-study','');layer.setAttribute('clip-path',`url(#${id}-view)`);layer.setAttribute('pointer-events','none');
  const sizes=[.20,.29,.38,.48,.68,.94],alphas=[.30,.38,.46,.51,.68,.83];
  layer.innerHTML=`<rect x="69.05" y="62.25" width="263.7" height="169.2" fill="url(#${id}-blue)"/><rect data-night-haze="" x="69.05" y="62.25" width="263.7" height="169.2" fill="#6e849a"/><g data-night-milky-way="" filter="url(#${id}-soft)"><path data-milky-band="" fill="#a8b9cc" opacity=".10"/><path data-milky-band="" fill="#c2c8cc" opacity=".12"/><path data-milky-band="" fill="#839bb6" opacity=".09"/><path data-milky-band="" fill="#030b1a" opacity=".09"/></g><g data-night-fine-stars="" fill="none" stroke-linecap="round">${Array.from({length:12},(_,i)=>`<path data-night-star-bin="${i}" stroke="${i<6?'#ccdbed':'#e1d8c4'}" stroke-width="${sizes[i%6]*2}" opacity="${alphas[i%6]}"/>`).join('')}</g>`;
  layer.insertAdjacentHTML('beforeend',NightConstellations.markup(w,where));
  const oldStars=svg.querySelector('[data-landscape-stars]');if(oldStars)oldStars.setAttribute('mask',`url(#${id}-outside)`);
  const anchor=oldStars||[...svg.children].find(n=>n.querySelector?.('.room-window-moon'))||svg.querySelector('[data-sky-clouds]');
  if(where!=='engawa'){for(const n of [...defs.querySelectorAll(`[id^="${id}"] rect`),...layer.querySelectorAll('rect')]){n.setAttribute('x',0);n.setAttribute('y',0);n.setAttribute('width',400);n.setAttribute('height',260);}}
  if(anchor)svg.insertBefore(layer,anchor);else svg.append(layer);sync(svg,w,where);return svg;
 }
 function updateStage(stage,w){
  if(!enabled||!['engawa','room','garden'].includes(stage.dataset.location)||(stage.dataset.location!=='engawa'&&new URLSearchParams(location.search).get('village')==='existing'))return;
  const where=stage.dataset.location==='room'?'window':stage.dataset.location;
  if(!stars){if(active(w,where))void ready();return;}
  for(const svg of stage.querySelectorAll('.country-landscape')){if(active(w,where))decorate(svg,w,where);else sync(svg,w,where);}
 }
 globalThis.SolarSky=Object.freeze({...base,landscape(w,frame='window'){
  const source=base.landscape(w,frame);if(!enabled||!['engawa','window','garden'].includes(frame)||(frame!=='engawa'&&new URLSearchParams(location.search).get('village')==='existing')||!active(w,frame))return source;
  void ready();if(!stars)return source;
  const svg=new DOMParser().parseFromString(source,'image/svg+xml').documentElement;return new XMLSerializer().serializeToString(decorate(svg,w,frame));
 },update(stage,w){base.update(stage,w);updateStage(stage,w);}});
 return Object.freeze({enabled,ready,state,project:(ra,dec,w,where='engawa')=>projectVector(vector(ra,dec),basis(w),where),basis,galactic,base,active});
})();

// Shared cloud material and compositor motion. Sky, solar illumination and cats
// remain upstream; only cloud groups receive these bounded animations.
globalThis.EngawaCloudStudy=(()=>{
 const base=SolarSky,ns='http://www.w3.org/2000/svg',enabled=new URLSearchParams(location.search).get('clouds')!=='existing',reduced=matchMedia('(prefers-reduced-motion: reduce)'),motions=new Map();let serial=0;
 const active=w=>Number.isFinite(SolarModel.time(w));let textureReady=false,loading;
 const wrap=(n,span)=>((n%span)+span)%span,epoch=Date.parse('2026-08-13T12:00:00+09:00'),left=-280,span=960;
 function ready(){if(!enabled)return Promise.resolve();return loading??=(async()=>{const image=new Image();image.decoding='async';image.fetchPriority='low';image.src='assets/engawa-clouds/cloud-atlas-4520be7164e53700.webp';await image.decode();textureReady=true;for(const stage of document.querySelectorAll('.day-room[data-location="engawa"],.day-room[data-location="room"],.day-room[data-location="garden"]'))updateStage(stage,DayRoom.world());})();}
 function layout(w,still=reduced.matches,where='engawa'){
  const seconds=still?0:(SolarModel.time(w)-epoch)/1000,turn=(270-SolarModel.bearing(where))*400/180,season={spring:.92,summer:1,autumn:1.04,winter:.80}[w.season]||1;
  const groups=w.weather==='sunny'?[[1,146,80,133,80,.60,.18,137],[3,430,119,96,51,.34,.113,191],[0,697,53,112,61,.28,.146,223]]:[[2,106,71,239,127,.64,.147,163],[0,418,94,160,101,.52,.104,211],[1,722,119,178,94,.33,.128,257]];
  return groups.map(([tile,x,y,width,height,opacity,speed,morph],i)=>{
   speed*=season;const progress=wrap(x+turn-left+seconds*speed,span)/span;
   return{tile,x:left+progress*span,y:y+({spring:1,summer:-2,autumn:2,winter:4}[w.season]||0),width,height,opacity,speed,duration:span/speed*1000,progress,morph:morph*1000,morphPhase:still?0:wrap(seconds/morph+i*.31,1)};
  });
 }
 function cancel(layer){const e=motions.get(layer);if(!e)return;for(const item of e.items)for(const a of item.animations)a.cancel();motions.delete(layer);}
 function visible(layer){const stage=layer.closest('.day-room');if(document.hidden||reduced.matches||!stage)return false;const r=stage.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight;}
 function sync(){for(const[layer,e]of motions){if(!layer.isConnected||e.items.some(i=>!i.node.isConnected)){cancel(layer);continue;}const play=visible(layer);for(const item of e.items)for(const a of item.animations){if(play&&a.playState==='paused')a.play();else if(!play&&a.playState!=='paused')a.pause();}}}
 function animate(layer,shapes,seeds){
  if(!layer.isConnected||typeof layer.animate!=='function')return;
  let e=motions.get(layer);if(e&&e.items[0]?.node!==layer.firstElementChild){cancel(layer);e=null;}
  if(!e&&!visible(layer))return;
  if(!e){
   e={items:[]};motions.set(layer,e);
   shapes.forEach((s,i)=>{
    const node=layer.children[i],shape=node.firstElementChild;
    const drift=node.animate([{transform:`translate(${left}px,${s.y}px)`},{transform:`translate(${left+span}px,${s.y}px)`}],{duration:s.duration,iterations:Infinity,easing:'linear'});
    const morph=shape.animate([{transform:'translate(0px,0px) scale(1,1)'},{transform:'translate(1px,-.6px) scale(1.025,.982)',offset:.37},{transform:'translate(-.5px,.7px) scale(.988,1.022)',offset:.73},{transform:'translate(0px,0px) scale(1,1)'}],{duration:s.morph,iterations:Infinity,easing:'ease-in-out'});
    drift.pause();morph.pause();drift.currentTime=(seeds?.[i]??s.progress)*s.duration;morph.currentTime=s.morphPhase*s.morph;
    e.items.push({node,animations:[drift,morph],speed:s.speed,duration:s.duration});
   });
  }
  sync();
 }
 function cleanup(svg){
  const layer=svg.querySelector('[data-engawa-cloud-study]');if(layer){cancel(layer);layer.remove();}svg.querySelectorAll('[data-engawa-cloud-def]').forEach(n=>n.remove());
  const original=svg.querySelector('[data-engawa-cloud-original]');if(original){original.style.removeProperty('display');if(!original.getAttribute('style'))original.removeAttribute('style');original.removeAttribute('data-engawa-cloud-original');}
 }
 function decorate(svg,w){
  let layer=svg.querySelector('[data-engawa-cloud-study]');
  if(!layer){const original=[...svg.querySelectorAll('[data-sky-clouds]')].find(g=>!g.hasAttribute('mask')&&g.parentElement.hasAttribute('clip-path'));if(!original)return;
   const id='cloud-study-'+(++serial),defs=svg.querySelector('defs');
   defs.insertAdjacentHTML('beforeend',`<filter data-engawa-cloud-def="" id="${id}-tone" color-interpolation-filters="sRGB" x="-10%" y="-15%" width="120%" height="130%"><feColorMatrix data-engawa-cloud-tone="" type="matrix"/><feGaussianBlur stdDeviation=".32"/></filter><linearGradient data-engawa-cloud-def="" id="${id}-feather"><stop stop-color="white" stop-opacity="0"/><stop offset=".07" stop-color="white"/><stop offset=".93" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient><mask data-engawa-cloud-def="" id="${id}-mask" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#${id}-feather)"/></mask>`);
   layer=document.createElementNS(ns,'g');layer.setAttribute('data-engawa-cloud-study','');layer.setAttribute('pointer-events','none');layer.dataset.id=id;
   original.dataset.engawaCloudOriginal='';original.style.display='none';original.after(layer);
  }
  const shapes=layout(w,undefined,svg.dataset.villageFrame||'engawa'),id=layer.dataset.id,key=w.season+':'+w.weather+':'+shapes.length;
  if(layer.dataset.material!==key){cancel(layer);layer.innerHTML=shapes.map((s,i)=>`<g data-cloud-item="${i}" filter="url(#${id}-tone)" mask="url(#${id}-mask)"><g data-cloud-shape=""><svg data-cloud-viewport="" viewBox="0 0 320 320" preserveAspectRatio="none" overflow="hidden"><image href="assets/engawa-clouds/cloud-atlas-4520be7164e53700.webp" x="${-(s.tile%2)*320}" y="${-Math.floor(s.tile/2)*320}" width="640" height="640"/></svg></g></g>`).join('');layer.dataset.material=key;}
  const t=SolarModel.weights(SolarModel.time(w)),wet=w.weather==='rainy'?.80:w.weather==='cloudy'?.93:1,night=1-.82*(t.night||0);
  // Continue from the still position when motion is enabled, without a jump.
  const seeds=layer.dataset.cloudPlaced?[...layer.children].map(g=>wrap((g.transform.baseVal.consolidate()?.matrix.e??left)-left,span)/span):null;
  shapes.forEach((s,i)=>{const g=layer.children[i],v=g.querySelector('[data-cloud-viewport]');g.setAttribute('opacity',String(s.opacity*night));g.setAttribute('transform',`translate(${s.x.toFixed(3)} ${s.y})`);for(const[k,n]of Object.entries({x:-s.width/2,y:-s.height/2,width:s.width,height:s.height}))v.setAttribute(k,n);});
  const bright=(t.day+t.morning*.98+t.evening*.89+t.night*.28)*wet,l=[.2126,.7152,.0722],temp=[1+t.evening*.12+t.morning*.025,1-t.evening*.02,1-t.evening*.14];
  const matrix=[0,1,2].flatMap(row=>[...l.map((n,col)=>+(bright*.80*temp[row]*(n*.78+(row===col?.22:0))).toFixed(5)),0,+(bright*.16*temp[row]).toFixed(5)]).concat([0,0,0,1,0]).join(' ');
  svg.querySelector('[data-engawa-cloud-tone]').setAttribute('values',matrix);animate(layer,shapes,seeds);layer.dataset.cloudPlaced='1';
 }
 function updateStage(stage,w){if(!enabled||!['engawa','room','garden'].includes(stage.dataset.location)||(stage.dataset.location!=='engawa'&&new URLSearchParams(location.search).get('village')==='existing'))return;if(active(w)&&!textureReady){void ready();return;}for(const svg of stage.querySelectorAll('.country-landscape'))active(w)?decorate(svg,w):cleanup(svg);sync();}
 globalThis.SolarSky=Object.freeze({...base,landscape(w,frame='window'){const source=base.landscape(w,frame);if(!enabled||!['engawa','window','garden'].includes(frame)||(frame!=='engawa'&&new URLSearchParams(location.search).get('village')==='existing')||!active(w))return source;void ready();if(!textureReady)return source;const svg=new DOMParser().parseFromString(source,'image/svg+xml').documentElement;decorate(svg,w);return new XMLSerializer().serializeToString(svg);},update(stage,w){base.update(stage,w);updateStage(stage,w);}});
 // No additional frame loop or timer: compositor animations sleep when hidden,
 // outside the viewport, or reduced motion is requested. Prune replaced skies.
 let queued=false;const schedule=()=>{if(!queued){queued=true;queueMicrotask(()=>{queued=false;sync();});}};
 if(enabled){document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});const observe=()=>new MutationObserver(schedule).observe(document.querySelector('#app')||document.body,{subtree:true,childList:true});if(document.body)observe();else document.addEventListener('DOMContentLoaded',observe,{once:true});}
 return Object.freeze({enabled,ready,active,layout,base,inspect(){sync();return{layers:motions.size,animations:[...motions.values()].reduce((n,e)=>n+e.items.length*2,0),reduced:reduced.matches,entries:[...motions.values()].flatMap(e=>e.items.map(i=>({speed:i.speed,duration:i.duration,states:i.animations.map(a=>a.playState),times:i.animations.map(a=>a.currentTime)})))};}});
})();
