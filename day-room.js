// Shared composition from day-room-preview-v1. Cat artwork stays untouched.
globalThis.DayRoom=(()=>{
 const active=new Map();
 const world=()=>SeasonWeather.at(NightClock.now());
 const snapshot=(user,now=NightClock.now())=>DayRoomState.at(now,user||'local-cat');
 const attrs=w=>`data-world-day="${w.day}" data-world-season="${w.season}" data-world-weather="${w.weather}" data-world-daylight="${w.daylight}"`;
 function stage(coat,user,cat,interactive=false){
  const room=DayRoom.snapshot(user),w=DayRoom.world(),html=cat?.html||DayCats.svg(room.pose,coat);
  const tag=interactive?'button':'div';
  return `<div class="day-room room-scene" ${attrs(w)} data-room-user="${user||''}" data-place="${room.place}" data-away="${room.away}" data-coat="${coat}" data-post-status="${cat?.status||''}"><img class="day-room-art" src="assets/day-room/room.svg" alt="" aria-hidden="true"><div class="day-room-world-window" aria-hidden="true">${SeasonLandscape.art(w)}</div><${tag} class="day-cat day-room-cat room-cat room-resident" ${interactive?'type="button" data-day-cat-tap aria-label="昼猫をなでる"':''} ${room.away?'aria-hidden="true"'+(interactive?' disabled tabindex="-1"':''):''}>${html}</${tag}></div>`;
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
  const template=document.createElement('template');template.innerHTML=CatCare.visual(proxy.dataset.careCoat,proxy.dataset.careKind);
  const animation=template.content.firstElementChild;animation.classList.add('room-care-animation');
  const size=()=>animation.style.setProperty('--room-care-scale',String(stage.classList.contains('day-room')?stage.clientWidth*.4/152:Math.min(208/152,stage.clientWidth/176)));
  stage.append(animation);size();const observer=new ResizeObserver(size);observer.observe(stage);
  active.set(unit,animation);unit.dataset.feeding='true';
  try{await playOriginal(animation);}finally{observer.disconnect();animation.remove();active.delete(unit);delete unit.dataset.feeding;sync();document.dispatchEvent(new Event('roomcareend'));}
 }
 function sync(){
  if(document.hidden)return;
  for(const stage of document.querySelectorAll('.day-room')){
   if(stage.closest('[data-feeding=true]'))continue;
   const room=DayRoom.snapshot(stage.dataset.roomUser),w=DayRoom.world(),cat=stage.querySelector('.room-resident');
   const stamp=[room.day,room.place,room.pose,room.away,stage.dataset.coat,stage.dataset.postStatus,w.day,w.season,w.weather,w.daylight].join(':');
   if(stage.dataset.roomStamp!==stamp){
    stage.dataset.roomStamp=stamp;
    stage.dataset.place=room.place;stage.dataset.away=String(room.away);
    stage.dataset.worldDay=w.day;stage.dataset.worldSeason=w.season;stage.dataset.worldWeather=w.weather;stage.dataset.worldDaylight=String(w.daylight);
    const status=stage.dataset.postStatus;
    cat.innerHTML=status==='awake'||status==='sleep'?CatScenes.svg(status==='awake'?'awake':'sleeping',stage.dataset.coat):DayCats.svg(room.pose,stage.dataset.coat);
    cat.toggleAttribute('aria-hidden',room.away);
    if(cat.matches('button')){cat.disabled=room.away;if(room.away)cat.tabIndex=-1;else cat.removeAttribute('tabindex');}
    stage.querySelector('.day-room-world-window').innerHTML=SeasonLandscape.art(w);
    const heading=stage.closest('.day-room-hero')?.querySelector('h2');if(heading)heading.textContent=DayCats.options.find(p=>p.id===room.pose)?.label||'のんびり中';
   }
  }
 }
 return {world,snapshot,attrs,stage,care,controls,unit,play,isPlaying,sync,get playing(){return active.size;}};
})();
