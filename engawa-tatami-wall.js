// Shared engawa tatami and plaster materials. One floor homography drives mat outlines, rush
// fibres, cloth bands and joints. Existing cats, furniture and clocks are shared.
globalThis.TatamiWallStudy=(()=>{
 if(!globalThis.EngawaInteriorStudy)return Object.freeze({disabled:true,version:1});
 const material=SceneryMaterials,interior=EngawaInteriorStudy,backgrounds=RoomBackgrounds,lighting=SolarLighting,ns='http://www.w3.org/2000/svg';let serial=0;
 const mats=[[0,0,2,1],[2,0,1,2],[0,1,1,2],[1,1,1,2],[2,2,1,2],[0,3,2,1]],depth=(1-1/1.21)/4,scaleY=104/(4*1.21),heri=.023;
 const project=(x,y)=>{const z=1-depth*y;return [200+(x-1.5)*(400/3)/z,226+scaleY*y/z];};
 const parse=s=>{const d=new DOMParser().parseFromString(s,'image/svg+xml');if(d.querySelector('parsererror'))throw Error('Invalid tatami/wall SVG');return d;};
 const serialize=d=>new XMLSerializer().serializeToString(d.documentElement);
 const number=n=>Number(n.toFixed(5)),points=p=>p.map(v=>v.map(number).join(',')).join(' ');
 function helpers(doc){return (tag,attrs={})=>{const n=doc.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};}
 function softFurnishings(doc,w){
  const svg=doc.documentElement,node=helpers(doc),main=svg.querySelector('g[filter]'),id='engawa-soft-'+(++serial),defs=node('defs',{'data-engawa-soft-defs':''}),mix=SeasonLandscape.mix;
  svg.querySelector('defs').append(defs);
  const p=SolarLighting.palette(SolarModel.world(w),phase=>({color:phase==='night'?'#8a9992':phase==='evening'?'#e8c8a2':phase==='morning'?'#eee9d9':'#ede5d5'})),rgb=[1,3,5].map(i=>parseInt(p.color.slice(i,i+2),16)/255),tone=node('filter',{id:id+'-tone','color-interpolation-filters':'sRGB'});
  tone.innerHTML='<feColorMatrix type="saturate" values=".75"/><feComponentTransfer>'+['R','G','B'].map((c,i)=>'<feFunc'+c+' type="linear" slope="'+rgb[i]*.82+'" intercept="'+rgb[i]*.085+'"/>').join('')+'</feComponentTransfer>';defs.append(tone);
  const ceilingClip=node('clipPath',{id:id+'-ceiling'});ceilingClip.append(node('path',{d:'M0 0H400V26H0Z'}));defs.append(ceilingClip);
  const wood=node('pattern',{id:id+'-wood',patternUnits:'userSpaceOnUse',width:170,height:70});wood.append(node('image',{href:'assets/engawa-semi-real-v1/wood.webp?v=0ee8d8588835c769',width:170,height:70,preserveAspectRatio:'none'}));defs.append(wood);
  const ceiling=node('g',{'data-engawa-soft-material':'ceiling','clip-path':'url(#'+ceilingClip.id+')',style:'pointer-events:none'});
  ceiling.append(node('path',{d:'M0 0H400V26H0Z',fill:'url(#'+wood.id+')',filter:'url(#'+tone.id+')',opacity:'.66'}));
  ceiling.append(node('path',{d:'M0 24.8H400',stroke:'#4a3f32','stroke-width':'.6',opacity:'.14'}));main.append(ceiling);
  const cushion=[...main.querySelectorAll('path')].find(n=>n.getAttribute('d')?.startsWith('M138 262'));
  const oldSeam=[...main.querySelectorAll('path')].find(n=>n.getAttribute('d')?.startsWith('M144 258'));
  if(cushion){
   const clip=node('clipPath',{id:id+'-cushion'});clip.append(node('path',{d:cushion.getAttribute('d')}));defs.append(clip);
   const cloth=node('g',{'data-engawa-soft-material':'cushion','clip-path':'url(#'+clip.id+')',style:'pointer-events:none'});
   cloth.append(node('image',{href:'assets/engawa-semi-real-v1/cushion.webp?v=cb80c85472605d47',x:134,y:222,width:126,height:52,preserveAspectRatio:'none',filter:'url(#'+tone.id+')',opacity:'.88'}));
   cloth.append(node('path',{d:'M144 258q49 13 104 0',fill:'none',stroke:'#e2dce6','stroke-width':'.65','stroke-dasharray':'1.3 1.5',opacity:'.4'}));
   cloth.append(node('path',{d:'M145 260q49 13 102 0',fill:'none',stroke:'#514b5d','stroke-width':'.75',opacity:'.20'}));
   cushion.after(cloth);if(oldSeam){oldSeam.setAttribute('data-engawa-soft-legacy','seam');oldSeam.setAttribute('opacity','0');}
  }
  const rug=main.querySelector('ellipse[cx="204"][cy="262"]'),oldRim=main.querySelector('ellipse[cx="204"][cy="260"]');
  if(rug){
   const base=mix(rug.getAttribute('fill'),'#a6a58a',.18),light=mix(base,'#eee4cb',.23),dark=mix(base,'#555b49',.28);
   // The native footprint supports a stuffed cotton pad, with a lower front
   // roll and a stitched top. Keep it behind the unchanged cushion and cat.
   const face='M132 250Q202 248 275 250Q280 250 281 254Q283 258 286 264Q288 267 281 269Q260 271 241 270Q212 272 188 270Q157 272 127 269Q120 267 122 263Q125 258 127 254Q128 251 132 250Z';
   const side='M122 262Q119 269 126 272Q155 276 183 274Q211 276 239 274Q262 275 282 272Q288 270 286 263L281 254H129Z';
   const gradient=node('radialGradient',{id:id+'-rug-tone',cx:'.42',cy:'.28',r:'.8'});gradient.innerHTML='<stop stop-color="'+mix(base,'#f0e3c8',.16)+'"/><stop offset=".66" stop-color="'+base+'"/><stop offset="1" stop-color="'+mix(base,'#484838',.19)+'"/>';defs.append(gradient);
   const edge=node('linearGradient',{id:id+'-rug-roll',gradientUnits:'userSpaceOnUse',x1:0,y1:267,x2:0,y2:275});edge.innerHTML='<stop stop-color="'+light+'"/><stop offset=".35" stop-color="'+base+'"/><stop offset="1" stop-color="'+dark+'"/>';defs.append(edge);
   const cloth=node('g',{'data-engawa-soft-material':'rug','data-cloth-pad':'cotton',style:'pointer-events:none'});
   cloth.append(node('path',{d:side,fill:'url(#'+edge.id+')'}));cloth.append(node('path',{d:face,fill:'url(#'+gradient.id+')'}));
   const fibre=node('pattern',{id:id+'-rug-fibre',patternUnits:'userSpaceOnUse',x:121,y:249,width:7.5,height:3.6});
   fibre.innerHTML='<path d="M0 .8h7.5M0 2.7h7.5" fill="none" stroke="'+dark+'" stroke-width=".35" stroke-opacity=".12"/><path d="M1.2 .2l.9 .7m3 1.2.7 .6" fill="none" stroke="'+light+'" stroke-width=".45" stroke-opacity=".22"/>';defs.append(fibre);
   cloth.append(node('path',{d:face,fill:'url(#'+fibre.id+')'}));
   cloth.append(node('path',{d:'M132 252Q203 250 274 252L282 263Q285 266 278 267Q204 271 130 267Q124 266 126 262Z',fill:'none',stroke:dark,'stroke-width':'.55','stroke-dasharray':'1.4 2',opacity:'.32'}));
   cloth.append(node('path',{d:'M126 269Q204 275 283 269',fill:'none',stroke:light,'stroke-width':'.75',opacity:'.32'}));
   cloth.append(node('path',{d:'M127 262q3 2 8 1m142-9q-2 4-1 7M133 267q6-1 10 0m121 0q7 1 14-2',fill:'none',stroke:dark,'stroke-width':'.6','stroke-linecap':'round',opacity:'.19'}));
   cloth.append(node('path',{d:'M128 256q1 4 4 5m134-9q6 1 9 3M135 268q11 1 19 .5',fill:'none',stroke:light,'stroke-width':'.65','stroke-linecap':'round',opacity:'.22'}));
   rug.setAttribute('cy','273');rug.setAttribute('ry','3');rug.setAttribute('fill',dark);rug.setAttribute('opacity','.15');
   rug.after(cloth);if(oldRim){oldRim.setAttribute('data-engawa-soft-legacy','rim');oldRim.setAttribute('opacity','0');}
  }
 }

 // A small, lived-in corner stays below the opening and outside the cat's pad.
 // All detail is static SVG, using the same solar palette as the room materials.
 function livedInDetails(doc,w){
  const svg=doc.documentElement,node=helpers(doc),main=svg.querySelector('g[filter]'),id='engawa-lived-in-'+(++serial);
  const p=SolarLighting.palette(SolarModel.world(w),phase=>phase==='night'?{wood:'#75624c',edge:'#968064',dark:'#403c32',cloth:'#a4a18b',thread:'#626958',cup:'#b9b6a0',blue:'#697d81',tea:'#61553a'}:phase==='evening'?{wood:'#ad8053',edge:'#cfaa76',dark:'#68503b',cloth:'#d6c7a3',thread:'#82765f',cup:'#e5d3ae',blue:'#718383',tea:'#887143'}:{wood:'#a78257',edge:'#c9a97b',dark:'#6b5740',cloth:'#d6cfaf',thread:'#80816a',cup:'#e2ddc6',blue:'#6b828d',tea:'#827347'});
  const defs=node('defs',{'data-engawa-lived-in-defs':''});
  defs.innerHTML=`<linearGradient id="${id}-wood" x1="0" y1="0" x2=".25" y2="1"><stop stop-color="${p.edge}"/><stop offset=".45" stop-color="${p.wood}"/><stop offset="1" stop-color="${SeasonLandscape.mix(p.wood,p.dark,.18)}"/></linearGradient><linearGradient id="${id}-cup" x1="0" y1="0" x2="1" y2="0"><stop stop-color="${SeasonLandscape.mix(p.cup,p.dark,.18)}"/><stop offset=".35" stop-color="${p.cup}"/><stop offset="1" stop-color="${SeasonLandscape.mix(p.cup,p.dark,.12)}"/></linearGradient>`;
  svg.querySelector('defs').append(defs);
  const floor=svg.querySelector('[data-tatami-wall-floor]'),wear=node('g',{'data-engawa-lived-in':'tatami-wear','pointer-events':'none'});
  wear.innerHTML=`<path d="M67 288q24-3 48 1m-58 3q33-3 63 1M246 319q20-2 39-.5m-27 3q15-1 28-.4" fill="none" stroke="${p.cloth}" stroke-width="1.8" stroke-linecap="round" opacity=".12"/><path d="M73 291h6m18 .4h10m149 28h8m8 2h7" stroke="${p.thread}" stroke-width=".45" opacity=".13"/>`;
  floor.append(wear);
  const pad=main.querySelector('[data-cloth-pad="cotton"]');
  if(pad){const repair=node('g',{'data-engawa-lived-in':'mended-pad','pointer-events':'none'});repair.innerHTML=`<path d="M129 266q9 3 20 2m110-1q10 1 19-1" fill="none" stroke="${p.cloth}" stroke-width="1.1" opacity=".26"/><path d="m133 267 .5 2m2-1.5.4 1.8m2-1.4.4 1.8m2-1.5.4 1.7" fill="none" stroke="${p.thread}" stroke-width=".55" opacity=".6"/>`;pad.append(repair);}
  const table=node('g',{'data-engawa-lived-in':'tea-table','data-scene-object':'tea-table',transform:'translate(-3 0)','pointer-events':'none','aria-hidden':'true'});
  table.innerHTML=`<ellipse cx="310" cy="324" rx="39" ry="3.8" fill="${p.dark}" opacity=".14"/><path d="m280 301-2 21 5 .4 3-19m48-1 3 20 5-.6-2-22" fill="${p.dark}"/><path d="m281 304-1 15m58-14 2 14" fill="none" stroke="${p.wood}" stroke-width="1.8"/><path d="M270 296Q310 320 350 296V301Q310 325 270 301Z" fill="${p.dark}"/><path d="M271 301q39 24 78 0" fill="none" stroke="${p.wood}" stroke-width="1.2" opacity=".8"/><ellipse cx="310" cy="296" rx="40" ry="12" fill="url(#${id}-wood)"/><path d="M272 296q38 21 76 0" fill="none" stroke="${p.edge}" stroke-width=".85" opacity=".65"/><path d="M279 292q21-5 49-1m-52 4q29-5 62-.4m-53 4q23-3 48-.6m-44 2q17 2 34 .1" fill="none" stroke="${p.dark}" stroke-width=".48" stroke-linecap="round" opacity=".24"/><path d="M280 299q8 3 16 3m32-.2 8-1.8m-38-11 10-.2" fill="none" stroke="${p.edge}" stroke-width=".8" stroke-linecap="round" opacity=".5"/><path d="M286 294q4-1 7 0t-7 .7" fill="none" stroke="${p.dark}" stroke-width=".4" opacity=".25"/><ellipse cx="324" cy="295" rx="8.4" ry="1.8" fill="${p.dark}" opacity=".18"/><g data-engawa-teacup=""><path d="M317 281l1.2 11q5.8 3.6 11.6 0L331 281Z" fill="url(#${id}-cup)"/><path d="M320 293q4 1.8 8 0" fill="none" stroke="${p.dark}" stroke-width=".6" opacity=".45"/><ellipse cx="324" cy="281" rx="7" ry="2.4" fill="${p.cup}"/><ellipse cx="324" cy="281" rx="5.5" ry="1.45" fill="${p.tea}"/><path d="M320 285v3m2-2v4m5-5v4" stroke="${p.blue}" stroke-width=".7" opacity=".72"/></g>`;
  main.append(table);
 }

 function summerIncense(doc,w){
  const svg=doc.documentElement;
  svg.querySelectorAll('[data-summer-incense]').forEach(n=>n.remove());
  if(w.season!=='summer')return;
  const node=helpers(doc),id='summer-incense-'+(++serial),p=SolarLighting.palette(SolarModel.world(w),phase=>phase==='night'?{glaze:'#727b72',light:'#9ca393',blue:'#3f5867',inside:'#293b38',green:'#41614b',ember:'#897458',smoke:'#a0afa6',shadow:'#27362e'}:phase==='evening'?{glaze:'#c7b79c',light:'#e2d0ad',blue:'#576d7a',inside:'#66634f',green:'#69754e',ember:'#ae8053',smoke:'#998e76',shadow:'#574d3a'}:{glaze:'#d1cdbb',light:'#e6e2d3',blue:'#536c83',inside:'#5a6255',green:'#5e7d56',ember:'#ab805c',smoke:'#7a8578',shadow:'#4a5342'}),defs=node('defs');
  const glaze=node('linearGradient',{id:id+'-glaze',x1:'.2',y1:0,x2:'.7',y2:1});glaze.innerHTML='<stop stop-color="'+p.light+'"/><stop offset=".6" stop-color="'+p.glaze+'"/><stop offset="1" stop-color="'+SeasonLandscape.mix(p.glaze,p.shadow,.18)+'"/>';defs.append(glaze);
  const group=node('g',{'data-summer-incense':'pig','data-season-object':'summer-incense','aria-hidden':'true','pointer-events':'none',transform:'translate(365 306)'});group.append(defs);
  const style=node('style');style.textContent=`
   [data-summer-incense] .incense-smoke{fill:none;stroke-width:.7;stroke-linecap:round;opacity:0;transform-box:fill-box;transform-origin:50% 100%;animation:country-incense-rise 15s ease-in-out infinite}
   [data-summer-incense] .incense-smoke:nth-child(2){animation-delay:-5s}
   [data-summer-incense] .incense-smoke:nth-child(3){animation-delay:-10s}
   @keyframes country-incense-rise{0%{opacity:0;transform:translate(0,2px) scale(.9,.78)}24%{opacity:.14}45%{transform:translate(-1px,-5px) scale(1,.93)}62%{opacity:.09}100%{opacity:0;transform:translate(2px,-13px) scale(1.15,1.02)}}
   @media(prefers-reduced-motion:reduce){[data-summer-incense] .incense-smoke{animation:none;opacity:.055;transform:translate(0,-3px)}}
  `;group.append(style);
  const body=node('g',{'data-incense-pot':''});
  body.innerHTML=`<ellipse cx="1" cy="3" rx="18" ry="2.8" fill="${p.shadow}" opacity=".17"/><path d="M-10-2l1 5h4l1-5M8-2l1 4h4l1-5" fill="${p.glaze}"/><path d="M-10-17C-5-22 10-22 16-15c6 7 2 16-6 17H-5c-9-2-12-12-5-19Z" fill="url(#${glaze.id})"/><path d="m-6-18-1-6q6 1 6 6m6-1 3-5q4 3 3 6" fill="${p.glaze}" stroke="${p.light}" stroke-width=".45"/><path d="M5-14q3-4 6-1m-4 3q4-1 5 2m0 5q-3-2-5 0" fill="none" stroke="${p.blue}" stroke-width=".9" stroke-linecap="round" opacity=".8"/><circle cx="-1" cy="-17" r=".55" fill="${p.blue}"/><ellipse cx="-9" cy="-9" rx="8.1" ry="9.1" fill="${p.glaze}" stroke="${p.light}" stroke-width=".75"/><ellipse data-incense-opening="" cx="-9" cy="-9" rx="6.2" ry="6.9" fill="${p.inside}"/><path d="M-14-13q-2 5 .5 8" fill="none" stroke="${p.blue}" stroke-width=".65" opacity=".5"/>`;
  const spiral=[];for(let i=0;i<=90;i++){const t=i/90,r=4.8-3.9*t,a=.3+Math.PI*5*t;spiral.push((i?'L':'M')+Number((-9+r*Math.cos(a)).toFixed(2))+' '+Number((-9+r*Math.sin(a)).toFixed(2)));}
  body.append(node('path',{'data-incense-coil':'',d:spiral.join(''),fill:'none',stroke:p.green,'stroke-width':'.65','stroke-linecap':'round'}),node('circle',{cx:-4.41,cy:-7.58,r:.4,fill:p.ember}));group.append(body);
  const smoke=node('g',{'data-incense-smoke':'',transform:'translate(-4.41 -7.58)',stroke:p.smoke});
  for(const d of ['M0 0C-1-4 2-6 .5-10S-2-16 .5-22','M0 0C1-3-1.5-7-.4-11S2-17 0-23','M0 0C-1.2-3 1-6 0-10S-1.5-17 1-22'])smoke.append(node('path',{class:'incense-smoke',d}));group.append(smoke);
  svg.querySelector('g[filter]').append(group);
 }

 function outsideVeranda(doc,w){
  const svg=doc.documentElement,node=helpers(doc),world=SolarModel.world(w),s=SolarSky.state(world,'engawa'),id='outside-veranda-'+(++serial),mix=SeasonLandscape.mix;
  const p=SolarLighting.palette(world,phase=>phase==='night'?{wood:'#485957',light:'#67736a',dark:'#303e3e'}:phase==='evening'?{wood:'#ac8b65',light:'#c6a67b',dark:'#74614c'}:phase==='morning'?{wood:'#b3a082',light:'#cdbb9b',dark:'#80715b'}:{wood:'#ae9a7b',light:'#c7b496',dark:'#796d59'}),wet=w.weather==='rainy'?.18:w.weather==='cloudy'?.07:0;
  for(const k of ['wood','light','dark'])p[k]=mix(p[k],'#536768',wet);
  const defs=node('defs',{'data-outside-veranda-defs':''}),clip=node('clipPath',{id:id+'-floor'});clip.innerHTML='<path d="M69.05 205.5H332.75V219H69.05Z"/>';defs.append(clip);
  const grain=node('linearGradient',{id:id+'-wood',x1:0,y1:0,x2:0,y2:1});grain.innerHTML='<stop stop-color="'+mix(p.wood,p.light,.25+.2*s.direct)+'"/><stop offset=".5" stop-color="'+p.wood+'"/><stop offset="1" stop-color="'+mix(p.wood,p.dark,.14)+'"/>';defs.append(grain);
  svg.querySelector('defs').append(defs);
  const group=node('g',{'data-outside-veranda':'','data-light-source':s.source,'pointer-events':'none','aria-hidden':'true','clip-path':'url(#'+clip.id+')'});
  group.innerHTML='<path d="M69.05 205.5H332.75V219H69.05Z" fill="url(#'+grain.id+')"/><path d="M69 210.1H333M136 205.5l-.6 4.6m116 0 .6 8.9" fill="none" stroke="'+p.dark+'" stroke-width=".55" stroke-opacity=".28"/><path d="M83 207.7q26-.6 57 0m18 .2q36-.6 70 0m22-.2q30-.4 65 .1M92 212.9q24-.6 50 0m17 .3q33-.6 61 0m43-.3q25-.4 50 .1" fill="none" stroke="'+p.light+'" stroke-width=".4" stroke-opacity=".22"/><path d="M69 205.6H333" stroke="'+p.dark+'" stroke-width=".6" stroke-opacity=".24"/>';
  const v=s.shadow(218,60),shade=node('g',{'data-veranda-cast':'',opacity:Number((s.direct*.16).toFixed(5)),fill:p.dark});
  for(const x of [69.05,328.75])shade.append(node('path',{d:'M'+x+' 205.5h4l'+v.x+' '+v.y+'h-4Z'}));group.append(shade);
  const main=svg.querySelector('g[filter]'),sill=[...main.children].find(n=>n.getAttribute('d')==='M0 215h400v9H0Z');main.insertBefore(group,sill||main.firstChild);
 }
 function art(source,where,w){
  const original=material.art(source,where,w);if(where!=='engawa')return original;
  const doc=parse(original),svg=doc.documentElement,node=helpers(doc),old=svg.querySelector('[data-study-material="tatami-layout"]')||[...svg.querySelectorAll('[data-material="surface"]')].find(n=>n.querySelector('path[fill$="-weave)"]'));if(!old)throw Error('Expected native tatami surface missing');
  const id='tatami-plane-'+(++serial),defs=node('defs',{'data-tatami-wall-defs':''}),floor=node('g',{'data-study-material':'tatami-layout','data-tatami-wall-floor':'1','data-floor-projection':'homography','data-mat-layout':'6-jo-T-joints',style:'pointer-events:none'});
  svg.querySelector('defs').append(defs);
  const relief=node('filter',{id:id+'-relief',x:'0',y:'0',width:'100%',height:'100%','color-interpolation-filters':'sRGB'});relief.innerHTML='<feTurbulence type="fractalNoise" baseFrequency=".28" numOctaves="2" seed="17" result="fibre-noise"/><feColorMatrix in="fibre-noise" type="saturate" values="0"/><feComponentTransfer result="fibre-relief"><feFuncA type="linear" slope=".045"/></feComponentTransfer><feBlend in="SourceGraphic" in2="fibre-relief" mode="soft-light"/>';defs.append(relief);
  // Preserve the previous paper filter's geometry bounds outside this edit.
  const bounds=old.cloneNode(true);bounds.setAttribute('opacity','0');bounds.removeAttribute('data-study-material');bounds.setAttribute('data-preserved-paper-bounds','');for(const n of [bounds,...bounds.querySelectorAll('*')])for(const a of [...n.attributes])if(a.name.startsWith('data-tatami')||a.name==='data-world-size'||a.name==='data-long-axis')n.removeAttribute(a.name);floor.append(bounds);
  const tone=SolarLighting.palette(SolarModel.world(w),phase=>phase==='night'?{base:'#6f7562',light:'#9ba087',dark:'#485041',cloth:'#424b3f',thread:'#858c79'}:phase==='evening'?{base:'#c0ad88',light:'#dec49b',dark:'#827960',cloth:'#6e6c55',thread:'#bdb58d'}:{base:'#b3b197',light:'#cec7a7',dark:'#7e8068',cloth:'#646b57',thread:'#b9bea0'});
  const mix=SeasonLandscape.mix;
  const planePoly=(coords,attrs={})=>node('polygon',{points:points(coords.map(p=>project(...p))),...attrs});
  const planeD=coords=>'M'+coords.map(p=>project(...p).map(number).join(' ')).join('L')+'Z';
  // Individually clipped mats leave antialiased gaps over the pale scene
  // backdrop. Back those gaps with quiet joint ink as the room turns dark.
  floor.append(planePoly([[0,0],[3,0],[3,4],[0,4]],{fill:tone.dark,opacity:SolarModel.weights(SolarModel.time(w)).night}));
  for(const [index,[x,y,width,height]]of mats.entries()){
   const alongX=width>height,local=(u,v)=>alongX?[x+u,y+v]:[x+v,y+u],rect=(u0,v0,u1,v1)=>[local(u0,v0),local(u1,v0),local(u1,v1),local(u0,v1)];
   const mat=node('g',{'data-tatami-mat':index,'data-world-size':width+' '+height,'data-long-axis':alongX?'x':'y','data-grain-direction':alongX?'y':'x',filter:'url(#'+relief.id+')'}),quad=[[x,y],[x+width,y],[x+width,y+height],[x,y+height]];
   const clip=node('clipPath',{id:id+'-mat-'+index});clip.append(planePoly(quad));defs.append(clip);mat.setAttribute('clip-path','url(#'+clip.id+')');
   const a=project(x,y),b=project(x+width,y+height),shade=node('linearGradient',{id:id+'-shade-'+index,gradientUnits:'userSpaceOnUse',x1:a[0],y1:a[1],x2:b[0],y2:b[1]});shade.innerHTML='<stop stop-color="'+mix(tone.base,tone.light,.065)+'"/><stop offset=".5" stop-color="'+tone.base+'"/><stop offset="1" stop-color="'+mix(tone.base,tone.dark,.045)+'"/>';defs.append(shade);
   mat.append(planePoly(quad,{fill:'url(#'+shade.id+')','data-tatami-surface':''}));
   const fibres=node('g',{'data-tatami-fibres':'','data-world-direction':alongX?'0,1':'1,0'});
   const batches=new Map(),batch=(coords,fill,opacity)=>{const key=fill+'|'+opacity;if(!batches.has(key))batches.set(key,{fill,opacity,paths:[]});batches.get(key).paths.push(planeD(coords));};
   // Rush/rib detail crosses the two heri. Subtle irregular widths avoid a
   // screen-aligned grid; every strip is projected in the same floor plane.
   for(let i=0;i<144;i++){
    const u=(i+.23+Math.sin(i*1.71+index)*.09)/72,a=.0033+(Math.sin(i*2.63)*.5+.5)*.0018;
    const phase=Math.round((Math.sin(i*1.23+index*2.1)+1)*2.5)/5;
    batch(rect(u,heri+.002,u+a,1-heri-.002),mix(tone.light,tone.dark,.23+phase*.36),'.54');
    if(i%3===0)batch(rect(u+a,heri+.004,u+a+.002,1-heri-.004),tone.light,'.24');
   }
   // Fine binding stitches are sparse and subordinate to the rush direction.
   for(let k=1;k<7;k++)for(let i=0;i<36;i++){
    const u=i/18+(k%2)*.015,v=k/7;
    batch(rect(u,v,u+.018,v+.0012),tone.dark,'.13');
   }
   for(const {fill,opacity,paths}of batches.values())fibres.append(node('path',{d:paths.join(''),fill,opacity}));
   mat.append(fibres);
   // Two full cloth bands lie INSIDE their own mat, with real world width.
   // Adjacent bands therefore meet separately instead of overlapping strokes.
   for(const [side,v0,v1]of [['a',0,heri],['b',1-heri,1]]){
    const band=node('g',{'data-tatami-heri':side,'data-world-width':heri});
    band.append(planePoly(rect(0,v0,2,v1),{fill:tone.cloth}));
    band.append(planePoly(rect(0,v0+.003,2,v1-.003),{fill:mix(tone.cloth,tone.light,.2),opacity:'.72'}));
    band.append(planePoly(rect(0,v0,2,v0+.0018),{fill:tone.dark,opacity:'.32'}));
    const stitches=[];for(let i=0;i<54;i++){const u=i/27+.005;stitches.push(planeD(rect(u,v0+.004,u+.011,v1-.004)));}band.append(node('path',{d:stitches.join(''),fill:tone.thread,opacity:'.2'}));
    // Ends are folded into a rectangular cap, not a picture-frame mitre.
    for(const u of [0,1.986])band.append(planePoly(rect(u,v0,u+.014,v1),{fill:mix(tone.cloth,tone.dark,.27),'data-heri-fold':''}));
    mat.append(band);
   }
   // Short sides carry only a close, quiet seam and a small rounded return.
   for(const u of [0,1.996]){
    mat.append(planePoly(rect(u,heri,u+.004,1-heri),{fill:tone.dark,opacity:'.30','data-tatami-short-seam':''}));
    mat.append(planePoly(rect(u+.003,heri+.002,Math.min(2,u+.006),1-heri-.002),{fill:tone.light,opacity:'.18'}));
   }
   floor.append(mat);
  }
  if(old.hasAttribute('data-study-material'))old.replaceWith(floor);
  else{
   // Keep the current paper-filter geometry and every existing foreground node.
   // The projected mat corners extend past the viewport; putting them inside
   // the old filtered group would move its noise texture over walls/furniture.
   const main=svg.querySelector('g[filter]'),nativeFloor=[...main.children].find(n=>n.getAttribute('d')==='M0 220h400v110H0Z');
   if(!nativeFloor)throw Error('Expected native tatami foundation missing');
   const strip=node('clipPath',{id:id+'-foundation-strip'});strip.append(node('rect',{x:-100,y:-100,width:600,height:326}));defs.append(strip);
   nativeFloor.setAttribute('data-tatami-legacy','foundation');nativeFloor.setAttribute('clip-path','url(#'+strip.id+')');
   old.setAttribute('data-tatami-legacy','weave');old.setAttribute('opacity','0');
   // Native lighting locates its canvas with g[filter]. Keep that canvas
   // first for this selector; CSS filters render the mat relief identically.
   for(const mat of floor.querySelectorAll('[data-tatami-mat][filter]')){mat.style.filter=mat.getAttribute('filter');mat.removeAttribute('filter');}
   svg.insertBefore(floor,main);
  }
  const bowl=svg.querySelector('[data-scene-object="water-bowl"]');
  if(bowl){
   const objectId='tatami-bowl-'+(++serial),p=SolarLighting.palette(SolarModel.world(w),phase=>({color:phase==='night'?'#879995':phase==='evening'?'#e8c8a2':phase==='morning'?'#f0f0df':'#f0ebdf'})),rgb=[1,3,5].map(i=>parseInt(p.color.slice(i,i+2),16)/255),filter=node('filter',{id:objectId,'color-interpolation-filters':'sRGB'}),ownDefs=node('defs',{'data-tatami-bowl-defs':''});
   filter.innerHTML='<feColorMatrix type="saturate" values=".78"/><feColorMatrix type="matrix" values="'+rgb[0]*.88+' 0 0 0 '+rgb[0]*.055+' 0 '+rgb[1]*.88+' 0 0 '+rgb[1]*.055+' 0 0 '+rgb[2]*.88+' 0 '+rgb[2]*.055+' 0 0 0 1 0"/>';ownDefs.append(filter);svg.querySelector('defs').append(ownDefs);
   const shadow=bowl.querySelector('ellipse')?.cloneNode(true);bowl.replaceChildren();if(shadow)bowl.append(shadow);
   bowl.append(node('image',{href:'assets/engawa-semi-real-v1/bowl.webp?v=12daf3306d75356a',x:-24.5,y:-25,width:49,height:28,preserveAspectRatio:'none',filter:'url(#'+objectId+')','data-engawa-semi-real-bowl':''}));
  }
  softFurnishings(doc,w);livedInDetails(doc,w);summerIncense(doc,w);svg.dataset.tatamiWallStudy='1';return serialize(doc);
 }
 function place(source,where,w){
  const original=lighting.place(source,where,w);if(where!=='engawa')return original;
  const doc=parse(original),svg=doc.documentElement,node=helpers(doc),lantern=svg.querySelector('[data-scene-object="andon"]');if(!lantern)return original;
  outsideVeranda(doc,w);
  const id='tatami-andon-'+(++serial),p=SolarLighting.palette(SolarModel.world(w),phase=>({color:phase==='night'?'#879995':phase==='evening'?'#e8c8a2':phase==='morning'?'#f0f0df':'#f0ebdf'})),rgb=[1,3,5].map(i=>parseInt(p.color.slice(i,i+2),16)/255),filter=node('filter',{id,'color-interpolation-filters':'sRGB'});
  filter.innerHTML='<feColorMatrix type="saturate" values=".78"/><feColorMatrix type="matrix" values="'+rgb[0]*.88+' 0 0 0 '+rgb[0]*.055+' 0 '+rgb[1]*.88+' 0 0 '+rgb[1]*.055+' 0 0 '+rgb[2]*.88+' 0 '+rgb[2]*.055+' 0 0 0 1 0"/>';
  const defs=node('defs',{'data-tatami-andon-defs':''});defs.append(filter);svg.querySelector('defs').append(defs);
  const shadow=lantern.querySelector('ellipse')?.cloneNode(true),paper=lantern.querySelector('[data-engawa-light]')?.cloneNode(true);lantern.replaceChildren();if(shadow)lantern.append(shadow);
  lantern.append(node('image',{href:'assets/engawa-semi-real-v1/andon.webp?v=b5a994fc29222f34',x:-17,y:-43,width:34,height:46,preserveAspectRatio:'none',filter:'url(#'+id+')','data-engawa-semi-real-andon':''}));
  if(paper){paper.setAttribute('d','M-10-32-2-31V-7L-10-8Z M0-31 7-30V-7L0-7Z');paper.setAttribute('fill-opacity','.644');lantern.append(paper);}
  // The floor light and structural shadows belong behind the unchanged
  // foreground geometry. Their solar vectors and intensities remain native.
  const main=svg.querySelector('g[filter]'),foreground=[...main.children].find(n=>n.getAttribute('d')?.startsWith('M0 0h75'));
  if(foreground)for(const layer of [svg.querySelector('[data-solar-edge]'),svg.querySelector('[data-solar-structure-shadow]')])if(layer)main.insertBefore(layer,foreground);
  return serialize(doc);
 }
 function header(w,key){
  const source=interior.header(w,key),doc=parse('<svg xmlns="'+ns+'">'+source+'</svg>'),svg=doc.documentElement,node=helpers(doc),id='plaster-wall-'+(++serial),defs=node('defs',{'data-tatami-wall-defs':''});
  svg.querySelectorAll('[data-study-shared-material="plaster"]').forEach(n=>n.remove());
  const world=SolarModel.world(w),sun=SolarSky.state(world,'engawa'),tone=SolarLighting.palette(world,phase=>phase==='night'?{base:'#696e65',light:'#828478',dark:'#4c554c'}:phase==='evening'?{base:'#d0bda1',light:'#e5ccaa',dark:'#a9967e'}:phase==='morning'?{base:'#d5c8af',light:'#e8dabf',dark:'#b1a58c'}:{base:'#d2c4ac',light:'#e6d7bd',dark:'#b2a48c'}),mix=SeasonLandscape.mix;
  const rgb=[1,3,5].map(i=>parseInt(tone.base.slice(i,i+2),16)/255),filter=node('filter',{id:id+'-texture','color-interpolation-filters':'sRGB'});
  filter.innerHTML='<feColorMatrix type="saturate" values=".12"/><feComponentTransfer>'+['R','G','B'].map((c,i)=>'<feFunc'+c+' type="linear" slope="'+rgb[i]*.65+'" intercept="'+rgb[i]*.43+'"/>').join('')+'</feComponentTransfer>';defs.append(filter);
  const pattern=node('pattern',{id:id+'-plaster',patternUnits:'userSpaceOnUse',width:400,height:330});pattern.innerHTML=[0,342.65].map(x=>'<svg x="'+x+'" y="35" width="57.35" height="183" viewBox="253 5 43 50" preserveAspectRatio="none"><image href="assets/bedroom-realism-v1/shell.webp" width="400" height="330" data-tatami-wall-sample="same-bedroom-plaster"/></svg>').join('');defs.append(pattern);
  const grain=node('filter',{id:id+'-relief',x:'0',y:'0',width:'100%',height:'100%'});grain.innerHTML='<feTurbulence type="fractalNoise" baseFrequency=".13" numOctaves="2" seed="29"/><feDiffuseLighting surfaceScale=".35" diffuseConstant=".65" lighting-color="#fff5e0"><feDistantLight azimuth="'+(sun.direction.x>0?140:40)+'" elevation="58"/></feDiffuseLighting><feColorMatrix type="saturate" values="0"/>';defs.append(grain);
  const contact=node('linearGradient',{id:id+'-contact'});contact.innerHTML='<stop stop-color="'+tone.dark+'" stop-opacity=".27"/><stop offset="1" stop-color="'+tone.dark+'" stop-opacity="0"/>';defs.append(contact);
  const clip=node('clipPath',{id:id+'-area'});clip.innerHTML='<path d="M0 35H57.35V218H0Z M342.65 35H400V218H342.65Z"/>';defs.append(clip);svg.append(defs);
  // Close the uncovered 31..34.5 strip between the ceiling beam and the
  // stationary shoji header. The moving leaves and outdoor opening stay put.
  const beam=svg.querySelector('linearGradient[id$="-header-beam"]'),oldHeader=svg.querySelector('[data-interior-study="header"]');
  if(!beam||!oldHeader)throw Error('Expected shoji header material missing');
  const lintelTone=beam.cloneNode(true);lintelTone.id=id+'-lintel-tone';defs.append(lintelTone);
  const lintel=node('g',{'data-tatami-wall-lintel':'1',style:'pointer-events:none'}),oldFilter=oldHeader.getAttribute('filter')?.match(/#([^\)]+)/)?.[1],sourceFilter=oldFilter&&svg.querySelector('[id="'+oldFilter+'"]');
  if(sourceFilter){const f=sourceFilter.cloneNode(true);f.id=id+'-lintel-filter';defs.append(f);lintel.setAttribute('filter','url(#'+f.id+')');}
  lintel.append(node('path',{d:'M0 30.5H400V35H0Z',fill:'url(#'+lintelTone.id+')','data-shoji-gap-backing':''}));
  lintel.append(node('path',{d:'M0 32.5Q180 32.8 400 32.4',fill:'none',stroke:'#635746','stroke-width':'.35',opacity:'.14'}));svg.append(lintel);
  const walls=node('g',{'data-tatami-wall-plaster':'1','clip-path':'url(#'+clip.id+')',style:'pointer-events:none'});
  for(const [side,x,width]of [['left',0,57.35],['right',342.65,57.35]]){
   const grad=node('linearGradient',{id:id+'-'+side,x1:side==='left'?'0':'1',x2:side==='left'?'1':'0'});grad.innerHTML='<stop stop-color="'+tone.base+'"/><stop offset="1" stop-color="'+mix(tone.base,tone.light,.22+.34*sun.direct)+'"/>';defs.append(grad);
   walls.append(node('rect',{x,y:35,width,height:183,fill:'url(#'+grad.id+')'}));
   walls.append(node('rect',{x,y:35,width,height:183,fill:'url(#'+pattern.id+')',filter:'url(#'+filter.id+')',opacity:'.50'}));
   walls.append(node('rect',{x,y:35,width,height:183,fill:tone.base,filter:'url(#'+grain.id+')',opacity:'.035'}));
   const edge=node('rect',{x:side==='left'?x+width-3.2:x,y:35,width:3.2,height:183,fill:'url(#'+contact.id+')'});if(side==='left')edge.setAttribute('transform','translate('+(2*(x+width)-3.2)+' 0) scale(-1 1)');walls.append(edge);
  }
  // Small contact shadows stay entirely inside plaster, behind the woodwork.
  walls.append(node('path',{d:'M0 35H57.35V38H0Z M342.65 35H400V38H342.65Z',fill:tone.dark,opacity:'.10'}));svg.append(walls);
  return [...svg.childNodes].map(n=>new XMLSerializer().serializeToString(n)).join('');
 }
 globalThis.SceneryMaterials=Object.freeze({...material,art});
 globalThis.SolarLighting=Object.freeze({...lighting,place});
 globalThis.EngawaInteriorStudy=Object.freeze({...interior,header});
 const wallStates=new WeakMap();
 function syncWalls(stage,w){
  const shoji=stage.querySelector('.engawa-shoji');if(!shoji?.querySelector('[data-tatami-wall-plaster]'))return;
  const stamp=[Math.floor(SolarModel.time(w)/60000),w.season,w.weather].join(':');if(wallStates.get(stage)===stamp)return;
  const doc=parse('<svg xmlns="'+ns+'">'+header(w,'wall-refresh')+'</svg>'),anchor=shoji.querySelector(':scope > .engawa-shoji-assembly');
  shoji.querySelectorAll(':scope > [data-tatami-wall-defs],:scope > [data-tatami-wall-plaster],:scope > [data-tatami-wall-lintel]').forEach(n=>n.remove());
  for(const n of doc.documentElement.querySelectorAll(':scope > [data-tatami-wall-defs],:scope > [data-tatami-wall-plaster],:scope > [data-tatami-wall-lintel]'))shoji.insertBefore(document.importNode(n,true),anchor);
  wallStates.set(stage,stamp);
 }
 function update(stage,where,w){const pending=backgrounds.update(stage,where,w);if(where==='engawa')syncWalls(stage,w);return pending;}
 // Follow the app's existing clock. No extra timer, observer or UI handler.
 globalThis.RoomBackgrounds=Object.freeze({...backgrounds,update});
 return Object.freeze({art,header,project,mats:mats.map(m=>Object.freeze(m.slice())),heri,version:1});
})();
