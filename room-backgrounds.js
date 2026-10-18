globalThis.RoomBackgrounds=(()=>{
 let uid=0;
 const source="<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"400\" height=\"330\" viewBox=\"0 0 400 330\" fill=\"none\">\n  <defs>\n    <linearGradient id=\"wall\" x2=\".2\" y2=\"1\"><stop stop-color=\"#a5b2c7\"/><stop offset=\"1\" stop-color=\"#c4c8d0\"/></linearGradient>\n    <linearGradient id=\"side\" x2=\"1\" y2=\"1\"><stop stop-color=\"#a7afbf\"/><stop offset=\"1\" stop-color=\"#b7b6c2\"/></linearGradient>\n    <linearGradient id=\"floor\" x2=\".3\" y2=\"1\"><stop stop-color=\"#c9b6a7\"/><stop offset=\"1\" stop-color=\"#e0cabb\"/></linearGradient>\n    <linearGradient id=\"sky\" x2=\"0\" y2=\"1\"><stop stop-color=\"#b4d4e3\"/><stop offset=\"1\" stop-color=\"#edf1df\"/></linearGradient>\n    <linearGradient id=\"wood\" x2=\"0\" y2=\"1\"><stop stop-color=\"#e3c7a8\"/><stop offset=\"1\" stop-color=\"#bea28d\"/></linearGradient>\n    <linearGradient id=\"pillow\" x2=\".3\" y2=\"1\"><stop stop-color=\"#bbb3ce\"/><stop offset=\"1\" stop-color=\"#8c8aa9\"/></linearGradient>\n    <radialGradient id=\"sun\"><stop stop-color=\"#fff1d6\" stop-opacity=\".5\"/><stop offset=\"1\" stop-color=\"#fff1d6\" stop-opacity=\"0\"/></radialGradient>\n    <filter id=\"paper\" x=\"0\" y=\"0\" width=\"100%\" height=\"100%\"><feTurbulence baseFrequency=\".7\" numOctaves=\"3\" seed=\"8\" stitchTiles=\"stitch\"/><feColorMatrix type=\"saturate\" values=\"0\"/><feComponentTransfer><feFuncA type=\"linear\" slope=\".055\"/></feComponentTransfer><feBlend in=\"SourceGraphic\" mode=\"soft-light\"/></filter>\n    <filter id=\"soft\"><feGaussianBlur stdDeviation=\"2.5\"/></filter>\n    <filter id=\"shadow\" x=\"-30%\" y=\"-40%\" width=\"160%\" height=\"180%\"><feGaussianBlur stdDeviation=\"4\"/></filter>\n    <clipPath id=\"view\"><path d=\"M51 155V73a53 53 0 0 1 106 0v82Z\"/></clipPath>\n  </defs>\n  <g filter=\"url(#paper)\">\n    <path fill=\"url(#wall)\" d=\"M0 0h400v243H0z\"/>\n    <path fill=\"url(#side)\" d=\"M309 0h91v255l-91-30Z\"/>\n    <path d=\"M309 0v225\" stroke=\"#8e98ac\" stroke-opacity=\".25\"/>\n    <path fill=\"url(#floor)\" d=\"m0 232 309-7 91 30v75H0Z\"/>\n    <path d=\"m0 232 309-7 91 30\" stroke=\"#e6d6c8\" stroke-width=\"6\"/>\n    <path d=\"m0 238 309-7 91 30\" stroke=\"#a58f84\" stroke-opacity=\".2\" stroke-width=\"2\"/>\n    <g stroke=\"#aa9284\" stroke-opacity=\".14\" stroke-width=\"1.2\"><path d=\"m0 280 400-6M22 330l29-93m65 93 14-95m85 95-6-97m105 97-28-98m109 98-30-82\"/><path d=\"M32 262h21m64 41h24m106-50h18m79 49h27\"/></g>\n    <ellipse cx=\"133\" cy=\"157\" rx=\"169\" ry=\"168\" fill=\"url(#sun)\"/>\n    <!-- Rounded window, quiet view, and a wide wooden perch. -->\n    <path d=\"M44 162V73a60 60 0 0 1 120 0v89Z\" fill=\"#718697\" fill-opacity=\".2\" filter=\"url(#soft)\" transform=\"translate(4 5)\"/>\n    <path d=\"M45 160V73a59 59 0 0 1 118 0v87Z\" fill=\"#efe2cf\"/>\n    <g clip-path=\"url(#view)\"><path fill=\"url(#sky)\" d=\"M48 14h112v150H48z\"/><circle cx=\"132\" cy=\"53\" r=\"13\" fill=\"#fff4d3\" opacity=\".8\"/><path d=\"M45 136q30-32 68-7 34-25 66-8v58H45\" fill=\"#a9b9ab\"/><path d=\"M43 151q26-18 55-6 26-23 70-4v30H43\" fill=\"#8fa69b\"/><path d=\"M64 70q7-9 14-4 7-9 13 2 12-4 15 5H61Z\" fill=\"#fff9ef\" opacity=\".65\"/></g>\n    <path d=\"M104 20v138m-53-50h106\" stroke=\"#eee1ce\" stroke-width=\"5\"/>\n    <path d=\"M42 25q-11 50-3 113l12 8q-2-60 10-115Z\" fill=\"#e6dbce\" opacity=\".85\"/>\n    <path d=\"M151 26q16 50 12 116l12-2q5-65-10-113Z\" fill=\"#ded1c5\"/>\n    <path d=\"m47 33-5 95m118-95 8 99\" stroke=\"#c4b8b3\" stroke-opacity=\".4\" stroke-width=\"2\"/>\n    <ellipse cx=\"105\" cy=\"195\" rx=\"76\" ry=\"10\" fill=\"#6f6d79\" opacity=\".12\" filter=\"url(#shadow)\"/>\n    <rect x=\"30\" y=\"158\" width=\"150\" height=\"12\" rx=\"5\" fill=\"url(#wood)\"/>\n    <path d=\"M45 170v43m119-43v42\" stroke=\"#b69b85\" stroke-width=\"8\" stroke-linecap=\"round\"/>\n    <path d=\"M46 170h116v17H46\" fill=\"#c3aa94\"/>\n    <path d=\"M38 161h131\" stroke=\"#f4e1c5\" stroke-width=\"2\" opacity=\".8\"/>\n    <!-- Linen rug and a softly rounded cushion. -->\n    <ellipse cx=\"208\" cy=\"280\" rx=\"111\" ry=\"31\" fill=\"#8d8490\" opacity=\".12\" filter=\"url(#shadow)\"/>\n    <ellipse cx=\"207\" cy=\"276\" rx=\"116\" ry=\"32\" fill=\"#ede0cb\"/>\n    <ellipse cx=\"207\" cy=\"276\" rx=\"108\" ry=\"27\" stroke=\"#d4c3b1\" stroke-width=\"1.5\" stroke-dasharray=\"2 4\"/>\n    <path d=\"M143 266q-7-29 15-35 42-11 85 0 20 9 13 34-47 25-113 1Z\" fill=\"#8f899d\" opacity=\".2\" filter=\"url(#soft)\"/>\n    <path d=\"M143 259q-5-24 13-29 43-11 85 0 19 6 13 29-45 21-111 0Z\" fill=\"url(#pillow)\"/>\n    <path d=\"M148 256q46 17 101 0\" stroke=\"#d6ccdf\" stroke-width=\"1.5\" opacity=\".7\"/>\n    <path d=\"m152 236 8 4m80-4-8 4\" stroke=\"#dfd6e4\" stroke-width=\"2\" opacity=\".6\" stroke-linecap=\"round\"/>\n    <!-- A little shaded corner with a plant and a woven basket. -->\n    <ellipse cx=\"332\" cy=\"252\" rx=\"38\" ry=\"12\" fill=\"#756b79\" opacity=\".13\" filter=\"url(#shadow)\"/>\n    <path d=\"M338 212q-9-43-3-71m4 52 18-22m-20 10-17-23\" stroke=\"#829281\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n    <g fill=\"#92a693\"><path d=\"M336 158q-27-4-22-24 23 0 22 24Z\"/><path d=\"M336 150q-12-26 4-38 17 18-4 38Z\"/><path d=\"M341 183q2-25 27-24 2 24-27 24Z\"/><path d=\"M333 183q-25-2-22-22 22-4 22 22Z\"/></g>\n    <path d=\"m322 207 6 31q11 8 24 0l6-31Z\" fill=\"#d7b4a4\"/><ellipse cx=\"340\" cy=\"208\" rx=\"18\" ry=\"5\" fill=\"#e6c9b9\"/>\n    <ellipse cx=\"286\" cy=\"243\" rx=\"27\" ry=\"10\" fill=\"#af9481\"/>\n    <path d=\"M259 242q0 29 27 29 28 0 28-29\" fill=\"#c4ab91\"/>\n    <path d=\"M263 246q23 14 47 0m-45 10q21 11 42 0m-38 9q16 6 32 0\" stroke=\"#e3c9ac\" stroke-width=\"2\"/>\n    <path d=\"m272 247 2 20m10-17v20m11-20-2 19m10-22-3 18\" stroke=\"#a68c77\" stroke-opacity=\".4\" stroke-width=\"1.5\"/>\n    <path d=\"M270 76h38v43h-38Z\" fill=\"#ece0cf\" transform=\"rotate(4 289 97)\"/>\n    <path d=\"M275 82h28v31h-28Z\" fill=\"#b5bdc5\" transform=\"rotate(4 289 97)\"/>\n    <path d=\"m278 105 7-9 6 6 5-4 5 9\" stroke=\"#e8dfcb\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>\n    <circle cx=\"294\" cy=\"90\" r=\"3\" fill=\"#e9dac0\"/>\n    <path d=\"M214 143h34\" stroke=\"#a5a4b2\" stroke-opacity=\".25\" stroke-width=\"2\" stroke-linecap=\"round\"/>\n    <ellipse cx=\"88\" cy=\"287\" rx=\"7\" ry=\"6\" fill=\"#b7a2ae\"/><path d=\"M84 284q5 1 7 6m-5-9q-1 5 5 10\" stroke=\"#e3cbd6\" stroke-width=\"1\"/>\n  </g>\n</svg>\n";
 const roomImages=new Map(),pending=new WeakMap(),fading=new WeakMap();
 const replace=(source,map)=>source.replace(/#[0-9a-f]{6}/gi,color=>map[color.toLowerCase()]||color);
 function place(where,w,colorOnly=false){
  const p=SeasonLandscape.theme(w),mix=SeasonLandscape.mix,night=w.phase==='night',wet=w.weather==='rainy';
  const oldLeaf={spring:'#d7b4c2',summer:'#93ad98',autumn:'#c69b7e',winter:'#b6bfc1'}[w.season];
  const map={
   '#aabbac':mix(p.green,p.field,.35),'#d6d2b5':mix(p.field,p.green,.14),'#99ac98':p.green,
   '#d7bfaa':p.wood,'#e7d3bf':p.woodLight,'#b39c87':mix(p.wood,'#74573e',.35),'#f1dbc2':mix(p.woodLight,'#fff0c8',.18),
   '#aa907f':mix(p.wood,'#674c40',.5),'#d9c9b4':mix(p.woodLight,'#8c795e',.12),'#e0d1bf':p.woodLight,
   '#9e9689':p.trunk,[oldLeaf]:p.leaf,'#ead8c0':p.leafLight,
   '#e5d9c4':night?'#666f6a':wet?'#b0b8aa':'#c7c4ad','#c2bbae':night?'#485651':'#9caa98','#f5e5cc':night?'#7e8880':'#dbd7bf',
   '#d9d2be':night?'#475d51':'#b5bfa5','#dfd6c3':night?'#536759':'#c1c4a9','#9bac91':p.green,'#879d89':p.green,
   '#c3a491':night?'#56564e':'#a7846b','#d9bba0':night?'#717060':'#c4a88d',
   '#b2bac4':night?'#3a4c59':'#96a5a9','#e3d6c3':night?'#536365':'#c6c8bc','#eae1d2':night?'#637371':'#dad8c8',
   '#bcab99':mix(p.wood,'#7d6c58',.2),'#b7a28e':mix(p.wood,'#725b40',.2),'#d7c0a7':p.woodLight,'#b29c88':mix(p.wood,'#6d573f',.2),'#d5bea5':p.woodLight,
   '#b3a193':mix(p.wood,'#635242',.3),'#d6bea6':p.woodLight,'#7d817d':p.shadow,'#b19b88':mix(p.wood,'#6b543a',.2),
   '#dbceb5':night?'#747c72':'#c9bfaa','#b9ae94':night?'#58665c':'#9e9e84','#8d7e80':p.shadow,
   '#aaa9b8':night?'#646e80':'#a09fb4','#d9d4df':night?'#838b98':'#c7c7d2',
   '#bac2b8':night?'#546d65':'#9db1a7','#e3dec9':night?'#7d8a79':'#c9cbb5','#9ba9a7':night?'#486971':'#6f9698',
   '#b7b5a0':night?'#535f54':'#a6aa91','#d7d9c8':night?'#7b9285':'#c5d4bf','#c1b7a7':night?'#657167':'#aca38f','#e4d8c7':night?'#7a8474':'#d2cbb5',
   '#fff0cf':'#ffe2a7','#fff0ce':'#ffdc97'
  };
  if(colorOnly)return map;
  let svg=replace(CatPlaceScenes.art(where,w),SolarLighting.palette(w,phase=>place(where,{...w,solar:false,phase},true))).replace('slope=".055"','slope=".025"')
   .replace(/<ellipse cx="220" cy="223"[^>]+\/>/,'')
   .replace(/<path d="M106 226h250l44 72H165Z"[^>]+\/>/,'');
  if(w.season==='winter'&&where==='garden')svg=svg.replace(/<g fill="[^"]+"><ellipse cx="22"[\s\S]*?<\/g>/,`<g stroke="${p.trunk}" stroke-width="2.5" fill="none" stroke-linecap="round"><path d="M43 121 20 67 8 40m23 48 23-40 19-19M20 67-4 53m58-5-8-24m9 48 27-12M8 40 25 19m29 29 23-7"/></g>`).replace(/<g fill="[^"]+" opacity=".25"><ellipse cx="34"[\s\S]*?<\/g>/,'');
  svg=svg.replace(/<g fill="[^"]+"><ellipse cx="343"/,`<g fill="${p.green}"><ellipse cx="343"`);
  const evening=w.phase==='evening',sunny=!night&&w.weather==='sunny',id='ground-'+(++uid);
  const shade="";
  // Light stays on a small exposed part of the ground, away from the cat.
  const moon="";
  const wetLight=wet?`<g stroke="${night?'#8ba8b0':'#b9cfcd'}" opacity=".16" stroke-width="1.2"><path d="M16 291h32m257 8h42m-68 19h29M71 274h13"/></g>`:'';
  return SolarLighting.place(svg.replace('</svg>',wetLight+'</svg>'),where,w);
 }
 function room(svg,w,colorOnly=false){
  const p=SeasonLandscape.theme(w),night=w.phase==='night',cloud=w.weather!=='sunny',rain=w.weather==='rainy',evening=w.phase==='evening';
  const wall=night?'#405360':rain?'#98a9af':cloud?'#a4b3b6':evening?'#acaeac':'#a2b6be';
  const side=night?'#344754':rain?'#859aa4':cloud?'#91a4ac':evening?'#939f9f':'#889faa';
  const floor=night?'#62655f':rain?'#a89e8d':evening?'#b4a086':'#b4a38e';
  const colors={
   '#a5b2c7':wall,'#c4c8d0':night?'#5b696b':rain?'#afbcb8':evening?'#c3bcb0':'#bec9c5',
   '#a7afbf':side,'#b7b6c2':night?'#4a5c65':rain?'#9caaae':evening?'#aaa99f':'#a1b0b5',
   '#c9b6a7':floor,'#e0cabb':night?'#7b7b6d':rain?'#c0b6a4':evening?'#cfb699':'#cdbba2',
   '#e3c7a8':p.woodLight,'#bea28d':p.wood,'#b69b85':p.wood,'#c3aa94':p.wood,
   '#92a693':p.green,'#829281':p.trunk,'#d7b4a4':night?'#68665c':'#b48f77','#e6c9b9':night?'#7e7b6b':'#c9ad91',
   '#ede0cb':night?'#8e9284':'#d7d0ba','#d4c3b1':night?'#727e72':'#bdb59e',
   '#efe2cf':night?'#7d8989':'#ded8c8','#eee1ce':night?'#7d8989':'#ded8c8',
   '#e6dbce':night?'#647477':'#d3d2c6','#ded1c5':night?'#54676e':'#c0c5bf',
   '#f4e1c5':night?'#8a9290':'#dcd0ba','#e6d6c8':night?'#6c7773':'#bfbcae',
   '#af9481':night?'#5c645f':'#978877','#c4ab91':night?'#71766b':'#b1a18a','#e3c9ac':night?'#85897b':'#c9b99f',
   '#ece0cf':night?'#73807e':'#d4d1c3','#b5bdc5':night?'#50636e':'#9faeb6','#e8dfcb':night?'#82918d':'#d8d5c0','#e9dac0':night?'#939584':'#d6c8aa',
   '#bbb3ce':night?'#88879c':'#aaa4be','#8c8aa9':night?'#636e86':'#8285a1','#d6ccdf':night?'#a1a5b2':'#c5c0d1','#dfd6e4':night?'#989fab':'#cec9d7',
   '#fff1d6':'#e6ded0'
  };
  if(colorOnly)return colors;
  let out=replace(svg,SolarLighting.palette(w,phase=>room(svg,{...w,solar:false,phase},true))).replace('slope=".055"','slope=".025"').replace(/<ellipse cx="133" cy="157"[^>]+\/>/,'');
  const id='room-light-'+(++uid),lightColor=night?'#b4cbd3':evening?'#efbd88':'#ece8ce';
  const strength=night?(cloud?.018:.075):cloud?0:evening?.19:.10;
  const sunlight="";
  const depth=`<path d="M308 0h92v255l-21-7V0Z" fill="${p.shadow}" opacity=".09"/><path d="m0 234 309-7 91 30v8l-92-29L0 243Z" fill="${p.shadow}" opacity=".08"/>`;
  // Put light on walls/floor behind the original furniture, not over the cat.
  return SolarLighting.room(out.replace('<!-- Rounded window',depth+'<!-- Rounded window'),w);
 }
 const world=w=>({...SolarModel.world(w),cloudAt:w.cloudAt??SolarModel.time(w)});
 const key=(where,w)=>[where,w.day,w.season,w.weather,Math.floor(SolarModel.time(w)/60000)].join(':');
 function markup(where,value){
  const w=world(value),night=w.phase==='night',cacheKey=[w.season,w.weather,w.phase,w.at].join(':');
  let content;
  if(where==='room'){
   if(roomImages.size>=32)roomImages.delete(roomImages.keys().next().value);
   if(!roomImages.has(cacheKey))roomImages.set(cacheKey,room(source,w));
   const art=roomImages.get(cacheKey),prefix='room-inline-'+(++uid)+'-';
   // Keep moonlit artwork unchanged. Daylight SVG stays editable so moving
   // clouds can dim the existing light without rebuilding the room image.
   content=(night?'<img class="day-room-art" src="data:image/svg+xml;charset=utf-8,'+encodeURIComponent(art)+'" alt="">':art.replace('<svg ','<svg class="day-room-art" aria-hidden="true" ').replace(/\bid="/g,'id="'+prefix).replace(/url\(#/g,'url(#'+prefix))+'<div class="day-room-world-window">'+SolarLighting.landscape(w)+'</div>';
  }else content='<div class="day-room-world-outdoors">'+SolarLighting.landscape(w,where)+'</div>'+place(where,w);
  const frame=SolarLighting.palette(w,phase=>({frame:phase==='night'?'#7d8989':'#ded8c8'})).frame;
  return '<div class="room-background-layer" data-background-location="'+where+'" data-light-at="'+w.at+'" data-light-weather="'+w.weather+'" data-light-season="'+w.season+'" data-background-phase="'+w.phase+'" style="--study-frame:'+frame+'">'+content+'</div>';
 }
 async function update(stage,where,w){
  SolarLighting.update(stage,w);
  const nextKey=key(where,w),holder=stage.querySelector('.day-room-scenery');
  if(stage.dataset.sceneryKey===nextKey){pending.delete(stage);return;}
  if(pending.get(stage)?.key===nextKey)return;
  const token={key:nextKey};pending.set(stage,token);
  // Images in template.content are inert and cannot decode before insertion.
  const container=document.createElement('div');container.innerHTML=markup(where,w);const next=container.firstElementChild;
  try{await Promise.all([...next.querySelectorAll('img')].map(i=>i.decode()));}catch{if(pending.get(stage)===token)pending.delete(stage);return;}
  if(pending.get(stage)!==token)return;
  pending.delete(stage);if(!stage.isConnected||!holder.isConnected)return;
  const fade=fading.get(stage);if(fade){fade.animation.cancel();fade.old.remove();fading.delete(stage);}
  const old=holder.firstElementChild;
  const animate=old?.dataset.backgroundLocation===where&&!document.hidden&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
  stage.dataset.sceneryKey=nextKey;
  holder.replaceChildren(next);
  if(animate){
   old.dataset.backgroundOutgoing='true';holder.append(old);
   const animation=old.animate([{opacity:1},{opacity:0}],{duration:1600,easing:'ease-in-out',fill:'forwards'}),entry={old,animation};fading.set(stage,entry);
   animation.finished.catch(()=>{}).then(()=>{old.remove();if(fading.get(stage)===entry)fading.delete(stage);});
  }
 }
 return Object.freeze({markup,key,update,settled:stage=>!pending.has(stage)&&!fading.has(stage)});
})();
