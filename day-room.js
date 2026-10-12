// Shared room composition; gazing cats sit by the window during daylight.
globalThis.DayRoom=(()=>{
 const active=new Map();
 const world=()=>SeasonWeather.at(NightClock.now());
 const snapshot=(user,now=NightClock.now())=>DayRoomState.at(now,user||'local-cat');
 const attrs=w=>`data-world-day="${w.day}" data-world-season="${w.season}" data-world-weather="${w.weather}" data-world-daylight="${w.daylight}"`;
 const artwork=(room,coat,status,w,home=false)=>home&&status==='sleep'?CatScenes.svg('sleeping',coat):w.daylight?DayCats.svg(room.pose,coat):CatScenes.svg(status==='awake'?'awake':'sleeping',coat);
 const placement=(room,w)=>w.daylight&&room.pose==='gaze'?'window':room.place;
 const homeKey=()=>DayRoom.world().day+':'+(DayCats.current(NightClock.now())?.key||'night');
 const homeLabel=(room,status)=>status==='sleep'?'すやすや、おやすみ中':DayRoom.world().daylight?(DayCats.options.find(p=>p.id===room.pose)?.label||'のんびり中'):'今夜も、マイペース。';
 function stage(coat,user,cat,interactive=false){
  const room=DayRoom.snapshot(user),w=DayRoom.world(),html=artwork(room,coat,cat?.status,w,cat?.home);
  const tag=interactive?'button':'div';
  return `<div class="day-room room-scene" ${attrs(w)} data-room-user="${user||''}" data-place="${placement(room,w)}" data-away="${room.away}" data-coat="${coat}" data-post-status="${cat?.status||''}"><img class="day-room-art" src="assets/day-room/room.svg" alt="" aria-hidden="true"><div class="day-room-night-light" aria-hidden="true"></div><div class="day-room-world-window" aria-hidden="true">${SeasonLandscape.art(w)}</div><${tag} class="day-cat day-room-cat room-resident" ${interactive?'type="button" data-view="catMeal" aria-label="猫のごはんを開く"':''} ${room.away?'aria-hidden="true"'+(interactive?' disabled tabindex="-1"':''):''}>${html}</${tag}></div>`;
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
  const template=document.createElement('template');template.innerHTML=CatCare.visual(proxy.dataset.careCoat,proxy.dataset.careKind,{before:proxy.dataset.careBefore,after:proxy.dataset.careAfter});
  const animation=template.content.firstElementChild;animation.classList.add('room-care-animation');
  const size=()=>animation.style.setProperty('--room-care-scale',String(stage.classList.contains('day-room')?stage.clientWidth*.4/152:Math.min(208/152,stage.clientWidth/176)));
  // Keep the resident visible until the meal images have decoded and playback starts.
  animation.style.visibility='hidden';
  animation.addEventListener('careplaybackstart',()=>{animation.style.removeProperty('visibility');unit.dataset.feeding='true';},{once:true});
  animation.addEventListener('careplaybackreturn',()=>{delete unit.dataset.feeding;sync();unit.dataset.feeding='true';unit.classList.add('room-care-returning');},{once:true});
  stage.append(animation);size();const observer=new ResizeObserver(size);observer.observe(stage);
  active.set(unit,animation);
  try{await playOriginal(animation);}finally{
   observer.disconnect();animation.remove();active.delete(unit);delete unit.dataset.feeding;unit.classList.remove('room-care-returning');delete stage.dataset.roomStamp;sync();
   document.dispatchEvent(new Event('roomcareend'));
  }
 }
 function sync(){
  if(document.hidden)return;
  for(const stage of document.querySelectorAll('.day-room')){
   if(stage.closest('[data-feeding=true]'))continue;
   if(stage.closest('.own-cat-room'))stage.dataset.postStatus=CatCare.sleeping(shared.catCare)?'sleep':homeCatStatus();
   const room=DayRoom.snapshot(stage.dataset.roomUser),w=DayRoom.world(),cat=stage.querySelector('.room-resident');
   const stamp=[room.day,room.place,room.pose,room.away,stage.dataset.coat,stage.dataset.postStatus,w.day,w.season,w.weather,w.daylight].join(':');
   if(stage.dataset.roomStamp!==stamp){
    stage.dataset.roomStamp=stamp;
    stage.dataset.place=placement(room,w);stage.dataset.away=String(room.away);
    stage.dataset.worldDay=w.day;stage.dataset.worldSeason=w.season;stage.dataset.worldWeather=w.weather;stage.dataset.worldDaylight=String(w.daylight);
    CatImages.render(cat,artwork(room,stage.dataset.coat,stage.dataset.postStatus,w,!!stage.closest('.own-cat-room')));
    cat.toggleAttribute('aria-hidden',room.away);
    if(cat.matches('button')){cat.disabled=room.away;if(room.away)cat.tabIndex=-1;else cat.removeAttribute('tabindex');}
    stage.querySelector('.day-room-world-window').innerHTML=SeasonLandscape.art(w);
    const hero=stage.closest('.day-room-hero'),heading=hero?.querySelector('h2');if(heading)heading.textContent=homeLabel(room,stage.dataset.postStatus);
    const caption=hero?.querySelector('p');if(caption)caption.textContent=w.daylight?'また今夜 🌙':'ゆっくり、ひとやすみ 🌙';
   }
  }
 }
 return {world,snapshot,attrs,stage,homeKey,homeLabel,care,controls,unit,play,isPlaying,sync,get playing(){return active.size;}};
})();
