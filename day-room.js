// Shared room composition; gazing cats sit by the window during daylight.
globalThis.DayRoom=(()=>{
 const active=new Map(),transitions=new WeakMap();
 const reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
 reducedMotion?.addEventListener?.('change',()=>{
  if(reducedMotion.matches)for(const stage of document.querySelectorAll('.day-room'))transitions.get(stage)?.animation?.cancel();
 });
 // Bottom transparent padding (%) in the unchanged art: morning, night,
 // relax, play, groom, doze, window gaze. Keep visible feet on the SVG sill.
 const windowPadding={
  'calico':[6.62,11.64,4.86,3.59,3.35,10.05,4.63],
  'orange':[5.34,14.51,3.27,3.03,3.11,9.65,4.47],
  'brown':[5.18,13.72,3.75,3.51,2.63,8.69,3.83],
  'silver':[6.54,12.28,3.51,3.27,3.11,9.33,4.23],
  'black':[6.46,14.91,3.99,3.59,4.15,10.61,3.59],
  'white':[4.23,11.24,3.11,3.27,2.71,9.01,1.99],
  'tuxedo':[4.31,13.48,3.19,2.39,1.99,8.53,3.67],
  'gray':[5.66,13.48,4.07,2.39,3.11,9.49,3.59],
  'manul':[7.66,13.80,5.10,2.47,6.22,8.05,4.39],
  'sand':[5.58,13.00,4.15,3.59,3.35,7.97,3.19],
  'black-footed':[7.26,15.23,5.66,4.15,2.79,9.09,3.67],
  'fishing':[7.66,15.39,4.78,3.67,3.67,9.97,4.31],
  'snow-leopard':[6.06,10.29,3.75,2.87,2.47,7.89,3.11],
  'leopard':[6.62,11.00,4.86,3.59,3.27,7.50,4.31],
  'cheetah':[7.50,13.00,4.23,3.99,3.19,8.53,3.83],
  'jaguar':[7.58,12.28,4.55,3.19,3.19,8.21,3.59],
 };
 function windowContact(html,coat){
  const frame=html.match(/data-asset-key="[^/]+\/([^"]+)"/)?.[1];
  const index=['morning','night','day-relax','day-play','day-groom','day-doze','day-gaze-window'].indexOf(frame);
  return windowPadding[CatFaces.normalizeCoat(coat)]?.[index]||0;
 }
 const world=()=>{const at=NightClock.now();return {...SeasonWeather.at(at),at};}
 // Local presentation preferences, isolated by the authenticated account.
 // It never changes account, posting, care or cat-location state.
 const lamps=new Map(),curtains=new Map(),shojis=new Map(),shojiMotions=new Map(),restored=new Set();let lampSequence=0;
 // Check ownership again at the write, even if a disabled control is reenabled.
 const canControlRoom=user=>{
  const viewer=typeof shared!=='undefined'?shared.userId:null;
  return typeof viewer==='string'&&!!viewer&&user===viewer&&
   (typeof OyasumiAPI==='undefined'||!('userId' in OyasumiAPI)||OyasumiAPI.userId===viewer);
 };
 const preferenceKey=user=>'oyasumi-room-preferences-v1:'+encodeURIComponent(user);
 function restorePreferences(user){
  if(!canControlRoom(user)||restored.has(user))return;
  restored.add(user);
  try{
   const saved=JSON.parse(localStorage.getItem(preferenceKey(user))||'null');
   if(saved?.version!==1)return;
   if(typeof saved.curtainClosed==='boolean')curtains.set(user,saved.curtainClosed);
   if(typeof saved.shojiClosed==='boolean')shojis.set(user,saved.shojiClosed);
   if(typeof saved.lampOn==='boolean')lamps.set(user,{on:saved.lampOn});
  }catch{ /* Invalid or unavailable storage leaves this account's defaults intact. */ }
 }
 function savePreferences(user){
  if(!canControlRoom(user))return;
  try{localStorage.setItem(preferenceKey(user),JSON.stringify({version:1,curtainClosed:curtains.get(user)===true,shojiClosed:shojis.get(user)===true,lampOn:lamps.get(user)?.on}));}
  catch{if(typeof toast==='function')toast('部屋の設定を端末に保存できませんでした。');}
 }
 function lampState(user,where,w){
  restorePreferences(user);
  const at=SolarModel.time(w),sun=SolarModel.parameters(at),altitude=sun.altitude;
  // Daylight always wins. At night a saved manual choice wins over automatic
  // dusk/dawn lighting, including following nights; daylight never clears it.
  const available=where==='room'&&SolarModel.phase(at)==='night',saved=lamps.get(user||'local-cat');
  const on=available&&(saved?.on??true);
  return {available,on,level:on?SolarModel.smooth(-.833,-6,altitude):0};
 }
 function lampMarkup(user,where,w){
  const s=lampState(user,where,w),id='room-lamp-'+(++lampSequence);
  // Local wall/floor bounce only. The live window and foreground cat stay clear.
  return `<svg class="room-warm-light" viewBox="0 0 400 330" aria-hidden="true" focusable="false" style="opacity:${s.level}"><defs><radialGradient id="${id}-amber"><stop stop-color="#f3bb72" stop-opacity=".34"/><stop offset=".42" stop-color="#edaf60" stop-opacity=".17"/><stop offset="1" stop-color="#e8ab60" stop-opacity="0"/></radialGradient><radialGradient id="${id}-floor"><stop stop-color="#edb367" stop-opacity=".24"/><stop offset=".48" stop-color="#e7a75a" stop-opacity=".11"/><stop offset="1" stop-color="#e0a256" stop-opacity="0"/></radialGradient><mask id="${id}-surfaces"><path fill="white" fill-rule="evenodd" d="M0 0H400V330H0Z M51 155V73a53 53 0 0 1 106 0v82Z"/></mask></defs><g mask="url(#${id}-surfaces)"><ellipse cx="334" cy="81" rx="91" ry="102" fill="url(#${id}-amber)"/><ellipse cx="262" cy="278" rx="110" ry="43" fill="url(#${id}-floor)"/></g></svg><svg class="room-sconce-art" viewBox="0 0 400 330" aria-hidden="true" focusable="false"><defs><linearGradient id="${id}-brass" x2="1" y2=".7"><stop stop-color="#8d7955"/><stop offset=".46" stop-color="#6a583e"/><stop offset="1" stop-color="#463e33"/></linearGradient><radialGradient id="${id}-milk" cx=".35" cy=".3" r=".85"><stop stop-color="var(--sconce-milk-top)"/><stop offset="1" stop-color="var(--sconce-milk-edge)"/></radialGradient><radialGradient id="${id}-lit" cx=".4" cy=".34" r=".8"><stop stop-color="#fff1d5"/><stop offset=".6" stop-color="#f4dfb4"/><stop offset="1" stop-color="#cfb88c"/></radialGradient></defs><g transform="translate(342 39)"><ellipse cx="20.5" cy="-.4" rx="6.6" ry="8.5" fill="#3e362d" opacity=".16"/><ellipse cx="19" cy="-1.5" rx="6" ry="8" fill="url(#${id}-brass)" stroke="#64543c" stroke-width=".6"/><ellipse cx="19" cy="-1.5" rx="4.2" ry="6.1" fill="none" stroke="#b3a17a" stroke-opacity=".35" stroke-width=".5"/><path d="M18 1c-13 0-10 11-17 12" fill="none" stroke="#403a30" stroke-width="3.2" stroke-linecap="round"/><path d="M18 .4c-11.5.2-10.5 10-17 12" fill="none" stroke="#968261" stroke-opacity=".5" stroke-width=".8"/><circle cx="0" cy="26" r="12.3" fill="url(#${id}-milk)" stroke="#948c79" stroke-width=".35"/><circle class="room-sconce-lit" cx="0" cy="26" r="12" fill="url(#${id}-lit)"/><path d="M-7 15q7-5 14 0l1 2q-8 3-16 0Z" fill="url(#${id}-brass)"/><path d="M-7 17q7 2 15 0" fill="none" stroke="#ae9670" stroke-width=".55"/></g></svg><button type="button" class="room-light-switch" aria-label="${s.on?'壁のランプを消す':'壁のランプをつける'}" aria-pressed="${s.on}" ${s.available&&canControlRoom(user)?'':'hidden disabled'}></button>`;
 }
 function syncLamp(stage,w=DayRoom.world()){
  const s=lampState(stage.dataset.roomUser,stage.dataset.location,w),light=stage.querySelector('.room-warm-light'),button=stage.querySelector('.room-light-switch');
  stage.toggleAttribute('data-room-preferences-pending',stage.dataset.roomHome==='true'&&!canControlRoom(stage.dataset.roomUser));
  if(light)light.style.opacity=String(s.level);
  if(button){button.hidden=!(s.available&&canControlRoom(stage.dataset.roomUser));button.disabled=button.hidden;button.setAttribute('aria-pressed',String(s.on));button.setAttribute('aria-label',s.on?'壁のランプを消す':'壁のランプをつける');}
  syncCurtain(stage,w,s);
  syncShoji(stage,w);
 }
 function curtainPalette(w,lamp){
  const palette=SolarLighting.palette(SolarModel.world(w),phase=>({left:phase==='night'?'#647477':'#d3d2c6',right:phase==='night'?'#54676e':'#c0c5bf'}));
  return Object.fromEntries(['left','right'].map(side=>[side,SeasonLandscape.mix(palette[side],'#e3d1b3',lamp.level*.24)]));
 }
 function curtainMarkup(user,where,w){
  const closed=curtains.get(user||'local-cat')===true,id='room-curtain-'+(++lampSequence),palette=curtainPalette(w,lampState(user,where,w));
  // Unequal curved folds, a gathered crown and a loose hem, rather than ruled
  // stripes. The same panels overlap at the centre and gather beside the frame.
  const shapes={
   left:'M44 12C60 4 79 9 89 7q12-2 20 5c-4 44 3 99-1 146q-9 5-21 1-12-3-22 1-13 3-21-2Z',
   right:'M104 12q15-7 31-3 15-5 30 3c-1 47-6 101 0 147q-11 3-20-1-10-2-20 3-12 3-22-3c4-49-2-99 1-146Z'
  };
  const folds={
   left:'<path d="M60 10c-7 46 4 90-2 150l9 1c7-49-5-100 1-152Z" fill="#30484b" opacity=".065"/><path d="M74 8c-6 48 7 103 0 151l9 2c4-51-6-101-2-153Z" fill="#fff4db" opacity=".10"/><path d="M94 8c-8 41 6 105-3 152l7 1c7-53-3-106 3-153Z" fill="#30484b" opacity=".075"/><path d="M108 14c-4 45 3 97 0 144" fill="none" stroke="#35494c" stroke-opacity=".16" stroke-width="1.4"/>',
   right:'<path d="M113 10c7 41-3 99 3 151l10-1c-8-53 3-101-4-151Z" fill="#fff4db" opacity=".085"/><path d="M133 8c-3 49 9 106 3 153l9-2c5-50-7-100-3-150Z" fill="#30484b" opacity=".075"/><path d="M153 8c-6 43 0 102-1 151l7 2c-4-53-4-104 2-151Z" fill="#fff4db" opacity=".075"/>'
  };
  const panel=side=>`<g class="room-curtain-panel room-curtain-${side}"><path d="${shapes[side]}" fill="var(--curtain-${side})"/><path d="${shapes[side]}" fill="url(#${id}-shade)"/><g clip-path="url(#${id}-${side})">${folds[side]}<path d="${side==='left'?'M46 16q12-7 25-2t35 0':'M106 16q12-7 25-2t32 0'}" fill="none" stroke="#fff4db" stroke-opacity=".13" stroke-width="2.5"/></g></g>`;
  return `<svg class="room-curtains" viewBox="0 0 400 330" aria-hidden="true" focusable="false" style="--curtain-left:${palette.left};--curtain-right:${palette.right}"><defs>${['left','right'].map(side=>`<clipPath id="${id}-${side}"><path d="${shapes[side]}"/></clipPath>`).join('')}<linearGradient id="${id}-shade" x2="1" y2=".08"><stop stop-color="#30484b" stop-opacity=".06"/><stop offset=".21" stop-color="#fff4db" stop-opacity=".07"/><stop offset=".48" stop-color="#30484b" stop-opacity=".05"/><stop offset=".76" stop-color="#fff4db" stop-opacity=".06"/><stop offset="1" stop-color="#30484b" stop-opacity=".10"/></linearGradient></defs>${panel('right')}${panel('left')}</svg><button type="button" class="room-curtain-switch" aria-label="${closed?'カーテンを開く':'カーテンを閉じる'}" aria-expanded="${!closed}" ${where==='room'&&canControlRoom(user)?'':'hidden disabled'}></button>`;
 }
 function syncCurtain(stage,w,lamp){
  const closed=curtains.get(stage.dataset.roomUser||'local-cat')===true,button=stage.querySelector('.room-curtain-switch');
  stage.dataset.curtainClosed=String(closed);
  if(button){button.hidden=stage.dataset.location!=='room'||!canControlRoom(stage.dataset.roomUser);button.disabled=button.hidden;button.setAttribute('aria-expanded',String(!closed));button.setAttribute('aria-label',closed?'カーテンを開く':'カーテンを閉じる');}
  const palette=curtainPalette(w,lamp),panels=stage.querySelector('.room-curtains');
  if(panels)for(const side of ['left','right'])panels.style.setProperty('--curtain-'+side,palette[side]);
 }
 const shojiClosed=user=>canControlRoom(user)&&shojis.get(user)===true;
 function shojiPalette(w){
  const colors=SolarLighting.palette(SolarModel.world(w),phase=>({paper:phase==='night'?'#abb2a2':phase==='evening'?'#d7bea0':phase==='morning'?'#e2decb':'#e0dfcb',light:phase==='night'?'#d8dfd2':phase==='evening'?'#f6d5a5':phase==='morning'?'#faf0d7':'#f7f5e6',wood:phase==='night'?'#53636a':phase==='evening'?'#ac8e70':'#b29d82',sidePaper:phase==='night'?'#637371':'#dad8c8',sideBack:phase==='night'?'#536365':'#c6c8bc'}));
  const wet=w.weather==='rainy'?.18:w.weather==='cloudy'?.08:0;
  colors.paper=SeasonLandscape.mix(colors.paper,'#b8bcb0',wet);return colors;
 }
 function shojiMarkup(user,where,w){
  if(where!=='engawa')return '';
  const id='engawa-shoji-'+(++lampSequence),p=shojiPalette(w),closed=shojiClosed(user),enabled=canControlRoom(user);
  // Static, low-contrast kozo fibres sit in the paper, behind the unchanged wooden grid.
  // A small vector tile is reused by all four leaves; no image, animation or live filter.
  const fibres=Array.from({length:38},(_,i)=>{
   const x=(1+(i*17.37)%33).toFixed(2),y=(1+(i*13.91)%45).toFixed(2),dx=(.45+(i%7)*.29)*(i%2?-1:1),dy=1.1+(i%5)*.46;
   return `<path d="M${x} ${y}q${(dx*.35).toFixed(2)} ${(dy*.55).toFixed(2)} ${dx.toFixed(2)} ${dy.toFixed(2)}"/>`;
  }).join('');
  // Four equal leaves stack in pairs and retract fully into the side pockets.
  // Closed outer joints overlap by one stile; the meeting joint stays at x=222.5.
  const panel=(side,inner=true)=>`<g class="${'engawa-shoji-panel '+(inner?'engawa-shoji-':'engawa-shoji-outer-')+side}" data-shoji-leaf="${inner?'inner':'outer'}-${side}"><rect data-shoji-paper="base" x="76" y="35" width="74.85" height="192" fill="var(--shoji-paper)"/><g data-shoji-paper="surface"><rect x="79.2" y="39" width="68.45" height="180.5" fill="url(#${id}-light)"/><rect x="79.2" y="39" width="68.45" height="180.5" fill="url(#${id}-washi)"/></g><path d="M113.425 39V219.5M79.2 84.125H147.65M79.2 129.25H147.65M79.2 174.375H147.65" fill="none" stroke="var(--shoji-wood)" stroke-width="1.05"/><path d="M76 35H150.85V227H76Z M79.2 39V219.5H147.65V39Z" fill="var(--shoji-wood)" fill-rule="evenodd"/><path d="M76.5 35.5H150.35M76.5 35.5V226.5M79.7 220H147.15" fill="none" stroke="#fff3d7" stroke-opacity=".25" stroke-width=".7"/><path d="M150.35 36V226.5H76.5M79.2 39H147.65V219.5" fill="none" stroke="#344243" stroke-opacity=".26" stroke-width=".7"/>${inner?`<rect x="${side==='left'?'148.35':'77.1'}" y="122" width="1.5" height="13" rx=".65" fill="#36413c" fill-opacity=".5"/><path d="M${side==='left'?'149.35':'78.2'} 123v11" stroke="#f5eedc" stroke-opacity=".22" stroke-width=".4"/>`:''}</g>`;
  const frame=`<g fill="var(--shoji-wood)"><path d="M63 32H380V37H63Z M63 225H380V231H63Z"/><path d="M63 37H76V225H63Z M369 37H380V225H369Z"/></g><path d="M76 37H369M76 226H369M76 37V225M369 37V225" fill="none" stroke="#344243" stroke-opacity=".42" stroke-width=".9"/><path d="M64 33H379M64 229.5H379M74.5 38V224M370.5 38V224" fill="none" stroke="#fff3d7" stroke-opacity=".24" stroke-width=".65"/>`;
  // Side pockets are part of the surround, rather than extra narrow shoji leaves.
  const pockets='<path d="M0 35H57.35V218H0Z M342.65 35H400V218H342.65Z" fill="var(--shoji-sideBack)"/>';
  const header='<path data-shoji-header d="M57.35 34.5H342.65V41.8H57.35Z" fill="var(--shoji-wood)"/><path d="M57.35 35H342.65" fill="none" stroke="#fff3d7" stroke-opacity=".24" stroke-width=".65"/>';
  return `<svg id="${id}" class="engawa-shoji" viewBox="0 0 400 330" aria-hidden="true" focusable="false" style="--shoji-paper:${p.paper};--shoji-light:${p.light};--shoji-wood:${p.wood};--shoji-sidePaper:${p.sidePaper};--shoji-sideBack:${p.sideBack}"><defs><clipPath id="${id}-opening"><path d="M76 35H369V227H76Z"/></clipPath><radialGradient data-shoji-paper-defs id="${id}-light" cx=".46" cy=".37" r=".82"><stop stop-color="var(--shoji-light)" stop-opacity=".45"/><stop offset=".58" stop-color="var(--shoji-light)" stop-opacity=".15"/><stop offset="1" stop-color="var(--shoji-light)" stop-opacity=".03"/></radialGradient><radialGradient data-shoji-paper-defs id="${id}-washi-soft"><stop stop-color="#fff8df" stop-opacity=".13"/><stop offset="1" stop-color="#fff8df" stop-opacity="0"/></radialGradient><pattern data-shoji-paper-defs id="${id}-washi" width="37" height="53" patternUnits="userSpaceOnUse"><ellipse cx="10" cy="19" rx="17" ry="26" fill="url(#${id}-washi-soft)"/><ellipse cx="33" cy="47" rx="13" ry="20" fill="url(#${id}-washi-soft)"/><g fill="none" stroke="#695c45" stroke-opacity=".085" stroke-width=".19" stroke-linecap="round">${fibres}</g><g fill="none" stroke="#fff9e9" stroke-opacity=".22" stroke-width=".26" stroke-linecap="round" transform="translate(1.3 1.7)">${fibres}</g></pattern><filter id="${id}-contact" x="-10%" y="-150%" width="120%" height="400%"><feGaussianBlur stdDeviation="1.2"/></filter></defs>${pockets}${header}${globalThis.EngawaInteriorStudy?.header(w,id)||''}<g class="engawa-shoji-assembly" transform="translate(.65 12.8) scale(.9)"><ellipse cx="221.5" cy="233.5" rx="158.5" ry="2.2" fill="#344243" opacity=".12" filter="url(#${id}-contact)"/><g clip-path="url(#${id}-opening)">${panel('left',false)}${panel('right',false)}${panel('left')}${panel('right')}</g>${frame}${globalThis.EngawaInteriorStudy?.frame(w,id)||''}</g></svg><button type="button" class="engawa-shoji-switch" aria-controls="${id}" aria-label="${closed?'障子を開く':'障子を閉じる'}" aria-expanded="${!closed}" ${enabled?'':'hidden disabled'}></button>`;
 }
 function syncShoji(stage,w){
  if(stage.hasAttribute('data-room-preferences-pending'))return;
  const user=stage.dataset.roomUser,available=stage.dataset.location==='engawa',closed=shojiClosed(user);
  stage.dataset.shojiClosed=String(closed);
  if(available&&!stage.querySelector('.engawa-shoji'))stage.querySelector('.room-resident')?.insertAdjacentHTML('beforebegin',shojiMarkup(user,'engawa',w));
  for(const button of stage.querySelectorAll('.engawa-shoji-switch')){button.hidden=!available||!canControlRoom(user);button.disabled=button.hidden;button.setAttribute('aria-expanded',String(!closed));button.setAttribute('aria-label',closed?'障子を開く':'障子を閉じる');}
  const panels=stage.querySelector('.engawa-shoji');if(available&&panels)for(const [key,color]of Object.entries(shojiPalette(w)))panels.style.setProperty('--shoji-'+key,color);
 }
 document.addEventListener('click',event=>{
  const shoji=event.target.closest?.('.engawa-shoji-switch'),shojiStage=shoji?.closest('.day-room');
  if(shojiStage){
   const user=shojiStage.dataset.roomUser;if(shoji.disabled||shojiStage.dataset.location!=='engawa'||!canControlRoom(user)||shojiMotions.has(user))return;
   event.preventDefault();const motion={};shojiMotions.set(user,motion);
   restorePreferences(user);shojis.set(user,!shojiClosed(user));savePreferences(user);
   const rooms=[...document.querySelectorAll('.day-room')].filter(item=>item.dataset.roomUser===user);
   for(const item of rooms)syncShoji(item,DayRoom.world());
   const animations=rooms.flatMap(item=>[...item.querySelectorAll('.engawa-shoji-panel')].flatMap(panel=>panel.getAnimations()));
   Promise.allSettled(animations.map(animation=>animation.finished)).then(()=>{if(shojiMotions.get(user)===motion)shojiMotions.delete(user);});
   return;
  }
  const curtain=event.target.closest?.('.room-curtain-switch'),curtainStage=curtain?.closest('.day-room');
  if(curtainStage){
   if(curtain.disabled||curtainStage.dataset.location!=='room'||!canControlRoom(curtainStage.dataset.roomUser))return;
   event.preventDefault();const user=curtainStage.dataset.roomUser;restorePreferences(user);curtains.set(user,curtains.get(user)!==true);savePreferences(user);
   for(const item of document.querySelectorAll('.day-room'))if((item.dataset.roomUser||'local-cat')===user)syncLamp(item);
   return;
  }
  const button=event.target.closest?.('.room-light-switch'),stage=button?.closest('.day-room');if(!stage)return;
  const w=DayRoom.world(),s=lampState(stage.dataset.roomUser,stage.dataset.location,w);if(button.disabled||!s.available||!canControlRoom(stage.dataset.roomUser))return;
  event.preventDefault();lamps.set(stage.dataset.roomUser,{on:!s.on});savePreferences(stage.dataset.roomUser);
  for(const item of document.querySelectorAll('.day-room'))if(item.dataset.roomUser===stage.dataset.roomUser)syncLamp(item,w);
 });
 const snapshot=(user,now=NightClock.now())=>{
  user=user||'local-cat';const room=DayRoomState.at(now,user),visit=CatPlaces.at(now,user);
  return {...room,location:visit.place,place:visit.restState==='awake'?room.place:'cushion',pose:visit.pose,restState:visit.restState,since:visit.since,moodSince:visit.moodSince,nextAt:visit.nextAt};
 };
 const attrs=w=>`data-world-day="${w.day}" data-world-season="${w.season}" data-world-weather="${w.weather}" data-world-daylight="${w.daylight}"`;
 const artwork=(room,coat,status,w,home=false)=>status==='sleep'||room.restState==='sleeping'?CatScenes.svg('sleeping',coat):w.daylight?DayCats.svg(room.pose,coat):CatScenes.svg(status==='awake'?'awake':'sleeping',coat);
 const location=(room,w,status)=>status==='sleep'?'room':room.location;
 const placement=(room,w,where)=>where!=='room'?'cushion':w.daylight&&room.pose==='gaze'?'window':room.place;
 const homeKey=()=>{
  const user=typeof shared!=='undefined'?shared.userId:null,room=snapshot(user);
  return room.day+':'+[room.location,room.pose,room.moodSince,room.restState,...(world().daylight?[]:[NightCats.at(NightClock.now(),user)?.key||'night'])].join(':');
 };
 const scenery=(where,w)=>RoomBackgrounds.markup(where,w);
 const sceneryKey=(where,w)=>RoomBackgrounds.key(where,w);
 const clockTime=(now=NightClock.now())=>{
  const japan=new Date(now+9*3600000),minute=japan.getUTCMinutes();
  return {stamp:Math.floor(now/60000),hour:(japan.getUTCHours()%12)*30+minute*.5,minute:minute*6};
 };
 function wallClock(){
  const time=clockTime(),ticks=Array.from({length:12},(_,i)=>`<path d="M20 7v${i%3===0?2:1}" transform="rotate(${i*30} 20 20)"/>`).join('');
  return `<svg class="room-wall-clock" viewBox="0 0 40 40" data-clock-minute="${time.stamp}" aria-hidden="true" focusable="false"><circle cx="20" cy="20.7" r="18" fill="#67594b" opacity=".12"/><image href="assets/bedroom-realism-v1/clock.webp" x="2" y="2" width="36" height="36"/><g fill="none" stroke="#9a8d79" stroke-width=".8" stroke-linecap="round">${ticks}</g><path class="room-clock-hour" d="M20 21v-9" transform="rotate(${time.hour} 20 20)" stroke="#6b6053" stroke-width="1.7" stroke-linecap="round"/><path class="room-clock-minute" d="M20 21v-12" transform="rotate(${time.minute} 20 20)" stroke="#6b6053" stroke-width="1.1" stroke-linecap="round"/><circle cx="20" cy="20" r="1.3" fill="#88735c"/></svg>`;
 }
 function syncClock(stage,time){
  const clock=stage.querySelector('.room-wall-clock');if(!clock||clock.dataset.clockMinute===String(time.stamp))return;
  clock.querySelector('.room-clock-hour').setAttribute('transform',`rotate(${time.hour} 20 20)`);
  clock.querySelector('.room-clock-minute').setAttribute('transform',`rotate(${time.minute} 20 20)`);
  clock.dataset.clockMinute=time.stamp;
 }
 const contactStyle=(place,where,html,coat,night)=>IndoorCatScale.style(html,where,place,night)+(place==='window'?`--window-cat-pad:${windowContact(html,coat)}%`:where!=='room'?`--ground-cat-pad:${windowContact(html,coat)-5}%`:'')+SceneryMaterials.contact(html,where,place,night,world());
 const homeLabel=(room,status)=>status==='sleep'?'すやすや、おやすみ中':room.restState==='sleeping'?'すやすや、ひとやすみ中':room.restState==='settling'?'お部屋で、ひとやすみ。':DayRoom.world().daylight?(DayCats.options.find(p=>p.id===room.pose)?.label||'のんびり中'):'今夜も、マイペース。';
 function stage(coat,user,cat,interactive=false,imageOnly=false){
  restorePreferences(user);
  if(cat?.status)cat={...cat,status:PostCatExpressions.state({status:cat.status})};
  const room=DayRoom.snapshot(user),w=DayRoom.world(),unselected=cat?.home&&typeof shared!=='undefined'&&shared.needsCat===true,pending=cat?.home&&!canControlRoom(user);
  const where=location(room,w,cat?.status);
  const night=unselected?null:NightCats.frame(coat,NightClock.now(),user,room.restState==='sleeping'?'sleep':cat?.status,cat?.home,w.daylight,where,room.pose,room.restState==='settling');
  const html=unselected?'<span data-cat-placeholder aria-hidden="true"></span>':night?.html||artwork(room,coat,cat?.status,w,cat?.home);
  if(imageOnly)return html;
  const tag=interactive?'button':'div',place=night?.place||placement(room,w,where);
  const style=contactStyle(place,where,html,coat,night),contact=style?` style="${style}"`:'';
  const target=interactive?.profileCare?`data-profile-care="${user}" aria-label="${interactive.self?'自分の猫のごはん':'この猫のおやつ'}を開く"`:'data-view="catMeal" aria-label="猫のごはんを開く"';
  return `<div class="day-room room-scene" ${attrs(w)} data-location="${where}" data-cat-rest="${room.restState}" data-curtain-closed="${curtains.get(user||'local-cat')===true}" data-shoji-closed="${shojiClosed(user)}" data-scenery-key="${sceneryKey(where,w)}" data-room-home="${!!cat?.home}"${pending?' data-room-preferences-pending':''}${night?` data-night-pose="${night.pose}" style="${night.style}"`:''} data-room-user="${user||''}" data-place="${place}" data-away="${room.away}" data-coat="${coat}" data-post-status="${cat?.status||''}"><div class="day-room-scenery" aria-hidden="true">${pending?'':scenery(where,w)}</div>${pending?'':lampMarkup(user,where,w)+curtainMarkup(user,where,w)+shojiMarkup(user,where,w)+wallClock()}<${tag} class="day-cat day-room-cat room-resident"${contact} ${interactive?'type="button" '+target:''} ${room.away?'aria-hidden="true"'+(interactive?' disabled tabindex="-1"':''):''}>${html}</${tag}></div>`;
 }
 function controls(html){
  const template=document.createElement('template');template.innerHTML=html;
  const card=template.content.firstElementChild;if(!card)return html;
  const scene=card.querySelector('.care-scene');scene.replaceChildren();scene.classList.add('room-care-proxy');scene.hidden=true;card.classList.add('room-care-controls');return template.innerHTML;
 }
 function care(status,coat,user,self){return controls(CatCare.markup(status,coat,user,self));}
 function unit(room,careHTML,user){return `<section class="profile-room-unit" data-room-user="${user||''}">${room}${careHTML}</section>`;}
 function isPlaying(scene){return active.has(scene?.closest('.profile-room-unit'));}
 async function play(proxy,playOriginal){
  const unit=proxy.closest('.profile-room-unit'),stage=unit?.querySelector('.room-scene');
  if(!unit?.isConnected||!stage||active.has(unit))return;
  cancelTransition(stage);
  const template=document.createElement('template');template.innerHTML=CatCare.visual(proxy.dataset.careCoat,proxy.dataset.careKind,{before:proxy.dataset.careBefore,after:proxy.dataset.careAfter});
  const animation=template.content.firstElementChild;animation.classList.add('room-care-animation');IndoorCatScale.prepareMeal(animation,stage.dataset.location);
  const resident=stage.querySelector('.room-resident'),token={animation,cancelled:false};
  let cancel;const cancelled=new Promise(resolve=>{cancel=()=>{token.cancelled=true;resolve(false);};});
  const size=()=>animation.style.setProperty('--room-care-scale',String(stage.classList.contains('day-room')?stage.clientWidth*.4/152:Math.min(208/152,stage.clientWidth/176)));
  // Keep the resident visible until the meal images have decoded and playback starts.
  animation.hidden=true;unit.dataset.catPlayback='preparing';
  animation.addEventListener('careplaybackstart',()=>{
   resident.hidden=true;unit.dataset.catPlayback='meal';unit.dataset.feeding='true';animation.hidden=false;
  },{once:true});
  stage.append(animation);size();const observer=new ResizeObserver(size);observer.observe(stage);
  const detached=new MutationObserver(()=>{if(!unit.isConnected)cancel();});detached.observe(document.body,{childList:true,subtree:true});
  active.set(unit,token);
  const ready=()=>new Promise(resolve=>{
   const check=()=>{if(token.cancelled||!unit.isConnected||(!document.hidden&&!document.documentElement.hasAttribute('data-cat-state-pending'))){document.removeEventListener('visibilitychange',check);document.removeEventListener('catvisibilitychange',check);resolve();}};
   document.addEventListener('visibilitychange',check);document.addEventListener('catvisibilitychange',check);cancelled.then(check);check();
  });
  try{
   await playOriginal(animation);
   if(!unit.isConnected||token.cancelled)return;
   unit.dataset.catPlayback='returning';
   // Keep the last meal frame while the next resident decodes. Only the unit
   // controller may swap meal -> resident, after the six visible seconds.
   while(unit.isConnected&&!token.cancelled){
    await ready();if(token.cancelled||!unit.isConnected)break;
    const next=readStage(stage);CatImages.render(resident,next.html);
    const decoded=await Promise.race([cancelled,Promise.allSettled([...resident.querySelectorAll('img')].map(img=>img.decode())).then(()=>true)]);
    if(!decoded||!unit.isConnected||token.cancelled)break;
    if(document.hidden||document.documentElement.hasAttribute('data-cat-state-pending'))continue;
    const current=readStage(stage);if(current.html!==next.html)continue;
    animation.hidden=true;applyStage(stage,current,true);
    delete unit.dataset.feeding;unit.dataset.catPlayback='resident';resident.hidden=false;break;
   }
  }finally{
   cancel();observer.disconnect();detached.disconnect();animation.hidden=true;animation.remove();
   active.delete(unit);delete unit.dataset.feeding;delete unit.dataset.catPlayback;resident.hidden=false;sync();
   document.dispatchEvent(new Event('roomcareend'));
  }
 }
 function readStage(stage){
  const status=stage.closest('.own-cat-room')?(CatCare.sleeping(shared.catCare)?'sleep':homeCatStatus()):stage.dataset.postStatus;
  const room=DayRoom.snapshot(stage.dataset.roomUser),w=DayRoom.world();
  const where=location(room,w,status),night=NightCats.frame(stage.dataset.coat,NightClock.now(),stage.dataset.roomUser,room.restState==='sleeping'?'sleep':status,stage.dataset.roomHome==='true',w.daylight,where,room.pose,room.restState==='settling');
  const place=night?.place||placement(room,w,where);
  const stamp=[room.day,place,room.pose,room.restState,room.away,where,stage.dataset.coat,status,w.day,w.season,w.weather,w.daylight,SeasonLandscape.phase(w),night?.pose].join(':');
  return {room,w,night,where,place,status,stamp,html:night?.html||artwork(room,stage.dataset.coat,status,w,stage.dataset.roomHome==='true')};
 }
 function applyStage(stage,value,prepared=false){
  const {room,w,night,where,place,status,stamp,html}=value,cat=stage.querySelector('.room-resident');
  stage.dataset.roomStamp=stamp;stage.dataset.postStatus=status;stage.dataset.location=where;stage.dataset.place=place;stage.dataset.away=String(room.away);
  stage.dataset.catRest=room.restState;
  // A pose owns only its placement. Keep ambient RGB, cloth and contact-shadow
  // properties installed by the lighting modules, including same-minute swaps.
  const placement=document.createElement('div').style;placement.cssText=night?.style||'';
  for(const key of ['left','top','width','height','rotation','flip']){
   const name='--night-'+key,value=placement.getPropertyValue(name);
   if(value)stage.style.setProperty(name,value);else stage.style.removeProperty(name);
  }
  if(night)stage.dataset.nightPose=night.pose;else delete stage.dataset.nightPose;
  stage.dataset.worldDay=w.day;stage.dataset.worldSeason=w.season;stage.dataset.worldWeather=w.weather;stage.dataset.worldDaylight=String(w.daylight);
  syncLamp(stage,w);
  cat.style.cssText=contactStyle(place,where,html,stage.dataset.coat,night);if(!prepared)CatImages.render(cat,html);
  cat.toggleAttribute('aria-hidden',room.away);if(cat.matches('button')){cat.disabled=room.away;if(room.away)cat.tabIndex=-1;else cat.removeAttribute('tabindex');}
  void RoomBackgrounds.update(stage,where,w);
  const hero=stage.closest('.day-room-hero'),heading=hero?.querySelector('h2');if(heading)heading.textContent=homeLabel(room,status);
  const caption=hero?.querySelector('p');if(caption)caption.textContent=w.daylight?'また今夜 🌙':'ゆっくり、ひとやすみ 🌙';
 }
 function sync(){
  if(document.hidden)return;
  const time=clockTime();
  for(const stage of document.querySelectorAll('.day-room')){
   syncClock(stage,time);
   syncLamp(stage);
   if(stage.hasAttribute('data-room-preferences-pending'))continue;
   if(stage.closest('.own-cat-room')&&((typeof catsResolved==='function'&&!catsResolved())||(typeof shared!=='undefined'&&shared.needsCat===true)))continue;
   if(active.has(stage.closest('.profile-room-unit'))||stage.closest('[data-feeding=true]'))continue;
   // The existing home refresh must not replace the scene mid-transition.
   const hero=stage.closest('.day-room-hero');if(hero)hero.dataset.dayBucket=homeKey();
   const next=readStage(stage);if(stage.dataset.roomStamp!==next.stamp)void transition(stage,next);
   else void RoomBackgrounds.update(stage,next.where,next.w);
   SolarSky.update(stage,next.w);
  }
 }
 function cancelTransition(stage){
  const token=transitions.get(stage);transitions.delete(stage);token?.animation?.cancel();
 }
 async function transition(stage,next){
  if(transitions.get(stage)?.stamp===next.stamp)return;
  cancelTransition(stage);
  const token={stamp:next.stamp};transitions.set(stage,token);
  const resident=stage.querySelector('.room-resident'),template=document.createElement('template');
  template.innerHTML=next.html;
  const images=[...template.content.querySelectorAll('img')];
  for(const image of images){image.loading='eager';image.decoding='async';image.fetchPriority=stage.closest('.own-cat-room')?'high':'low';}
  const visual=html=>{
   const copy=document.createElement('template');copy.innerHTML=html.replace(/\s(?:loading|decoding|fetchpriority)="[^"]*"/g,'');
   copy.content.querySelectorAll('.cat-idle-detail').forEach(node=>node.remove());
   return copy.content;
  };
  // Cached image attributes may be ordered differently; idle detail is additive.
  const unchanged=visual(resident.innerHTML).isEqualNode(visual(template.innerHTML)),content=document.createDocumentFragment();
  if(!unchanged){content.append(template.content);for(const image of images)image.src=image.getAttribute('src');}
  const valid=()=>transitions.get(stage)===token&&stage.isConnected&&!document.hidden&&!document.documentElement.hasAttribute('data-cat-state-pending')&&!isPlaying(stage);
  const fade=async(from,to,duration)=>{
   if(reducedMotion?.matches||typeof resident.animate!=='function')return;
   token.animation?.cancel();
   token.animation=resident.animate([{opacity:from},{opacity:to}],{duration,easing:'ease-in-out',fill:'forwards'});
   await token.animation.finished.catch(()=>{});
  };
  try{
   if(!unchanged)try{await Promise.all(images.map(image=>image.decode()));}catch{return;}
   if(!valid())return;
   let current=readStage(stage);
   if(current.stamp!==next.stamp||current.html!==next.html){void transition(stage,current);return;}
   const changed=!unchanged||stage.dataset.place!==current.place||stage.dataset.location!==current.where;
   const journey=stage.dataset.location!==current.where&&(!current.w.daylight||current.room.restState!=='awake'||stage.dataset.catRest!=='awake');
   if(changed)await fade(1,0,journey?450:120);
   if(!valid())return;
   current=readStage(stage);
   if(current.stamp!==next.stamp||current.html!==next.html){void transition(stage,current);return;}
   // Swap only one decoded cat, together with its original placement/scenery.
   if(!unchanged)resident.replaceChildren(...content.childNodes);
   applyStage(stage,current,true);CatImages.warm(stage);
   if(changed)await fade(0,1,journey?650:200);
  }finally{
   token.animation?.cancel();
   if(transitions.get(stage)===token)transitions.delete(stage);
  }
 }
 return {world,snapshot,attrs,stage,image:(coat,user,cat)=>stage(coat,user,cat,false,true),homeKey,homeLabel,care,controls,unit,play,isPlaying,sync,settled:stage=>!transitions.has(stage),get playing(){return active.size;}};
})();
