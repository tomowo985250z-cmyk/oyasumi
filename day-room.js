// Shared room composition; gazing cats sit by the window during daylight.
globalThis.DayRoom=(()=>{
 const active=new Map(),transitions=new WeakMap();
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
 const world=()=>SeasonWeather.at(NightClock.now());
 const snapshot=(user,now=NightClock.now())=>{
  user=user||'local-cat';const room=DayRoomState.at(now,user),visit=CatPlaces.at(now,user);
  return {...room,location:visit.place,pose:visit.night?room.pose:visit.pose,since:visit.since,moodSince:visit.moodSince,nextAt:visit.nextAt};
 };
 const attrs=w=>`data-world-day="${w.day}" data-world-season="${w.season}" data-world-weather="${w.weather}" data-world-daylight="${w.daylight}"`;
 const artwork=(room,coat,status,w,home=false)=>status==='sleep'?CatScenes.svg('sleeping',coat):w.daylight?DayCats.svg(room.pose,coat):CatScenes.svg(status==='awake'?'awake':'sleeping',coat);
 const location=(room,w,status)=>!w.daylight||status==='sleep'?'room':room.location;
 const placement=(room,w,where)=>where!=='room'?'cushion':w.daylight&&room.pose==='gaze'?'window':room.place;
 const homeKey=()=>{
  const user=typeof shared!=='undefined'?shared.userId:null,room=snapshot(user);
  return room.day+':'+(world().daylight?[room.location,room.pose,room.moodSince].join(':'):NightCats.at(NightClock.now(),user)?.key||'night');
 };
 const scenery=(where,w)=>RoomBackgrounds.markup(where,w);
 const sceneryKey=(where,w)=>RoomBackgrounds.key(where,w);
 const contactStyle=(place,where,html,coat,night)=>IndoorCatScale.style(html,where,place,night)+(place==='window'?`--window-cat-pad:${windowContact(html,coat)}%`:where!=='room'?`--ground-cat-pad:${windowContact(html,coat)-5}%`:'');
 const homeLabel=(room,status)=>status==='sleep'?'すやすや、おやすみ中':DayRoom.world().daylight?(DayCats.options.find(p=>p.id===room.pose)?.label||'のんびり中'):'今夜も、マイペース。';
 function stage(coat,user,cat,interactive=false){
  if(cat?.status)cat={...cat,status:PostCatExpressions.state({status:cat.status})};
  const room=DayRoom.snapshot(user),w=DayRoom.world(),unselected=cat?.home&&typeof shared!=='undefined'&&shared.needsCat===true;
  const night=unselected?null:NightCats.frame(coat,NightClock.now(),user,cat?.status,cat?.home,w.daylight);
  const html=unselected?'<span data-cat-placeholder aria-hidden="true"></span>':night?.html||artwork(room,coat,cat?.status,w,cat?.home);
  const where=location(room,w,cat?.status),tag=interactive?'button':'div',place=night?.place||placement(room,w,where);
  const style=contactStyle(place,where,html,coat,night),contact=style?` style="${style}"`:'';
  const target=interactive?.profileCare?`data-profile-care="${user}" aria-label="${interactive.self?'自分の猫のごはん':'この猫のおやつ'}を開く"`:'data-view="catMeal" aria-label="猫のごはんを開く"';
  return `<div class="day-room room-scene" ${attrs(w)} data-location="${where}" data-scenery-key="${sceneryKey(where,w)}" data-room-home="${!!cat?.home}"${night?` data-night-pose="${night.pose}" style="${night.style}"`:''} data-room-user="${user||''}" data-place="${place}" data-away="${room.away}" data-coat="${coat}" data-post-status="${cat?.status||''}"><div class="day-room-scenery" aria-hidden="true">${scenery(where,w)}</div><${tag} class="day-cat day-room-cat room-resident"${contact} ${interactive?'type="button" '+target:''} ${room.away?'aria-hidden="true"'+(interactive?' disabled tabindex="-1"':''):''}>${html}</${tag}></div>`;
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
  const night=NightCats.frame(stage.dataset.coat,NightClock.now(),stage.dataset.roomUser,status,stage.dataset.roomHome==='true',w.daylight);
  const where=location(room,w,status),place=night?.place||placement(room,w,where);
  const stamp=[room.day,place,room.pose,room.away,where,stage.dataset.coat,status,w.day,w.season,w.weather,w.daylight,SeasonLandscape.phase(w),night?.pose].join(':');
  return {room,w,night,where,place,status,stamp,html:night?.html||artwork(room,stage.dataset.coat,status,w,stage.dataset.roomHome==='true')};
 }
 function applyStage(stage,value,prepared=false){
  const {room,w,night,where,place,status,stamp,html}=value,cat=stage.querySelector('.room-resident');
  stage.dataset.roomStamp=stamp;stage.dataset.postStatus=status;stage.dataset.location=where;stage.dataset.place=place;stage.dataset.away=String(room.away);
  if(night){stage.dataset.nightPose=night.pose;stage.style.cssText=night.style;}else{delete stage.dataset.nightPose;stage.removeAttribute('style');}
  stage.dataset.worldDay=w.day;stage.dataset.worldSeason=w.season;stage.dataset.worldWeather=w.weather;stage.dataset.worldDaylight=String(w.daylight);
  cat.style.cssText=contactStyle(place,where,html,stage.dataset.coat,night);if(!prepared)CatImages.render(cat,html);
  cat.toggleAttribute('aria-hidden',room.away);if(cat.matches('button')){cat.disabled=room.away;if(room.away)cat.tabIndex=-1;else cat.removeAttribute('tabindex');}
  void RoomBackgrounds.update(stage,where,w);
  const hero=stage.closest('.day-room-hero'),heading=hero?.querySelector('h2');if(heading)heading.textContent=homeLabel(room,status);
  const caption=hero?.querySelector('p');if(caption)caption.textContent=w.daylight?'また今夜 🌙':'ゆっくり、ひとやすみ 🌙';
 }
 function sync(){
  if(document.hidden)return;
  for(const stage of document.querySelectorAll('.day-room')){
   if(stage.closest('.own-cat-room')&&((typeof catsResolved==='function'&&!catsResolved())||(typeof shared!=='undefined'&&shared.needsCat===true)))continue;
   if(active.has(stage.closest('.profile-room-unit'))||stage.closest('[data-feeding=true]'))continue;
   const next=readStage(stage);if(stage.dataset.roomStamp!==next.stamp)void transition(stage,next);
   else void RoomBackgrounds.update(stage,next.where,next.w);
  }
 }
 async function transition(stage,next){
  if(transitions.get(stage)?.stamp===next.stamp)return;
  const token={stamp:next.stamp};transitions.set(stage,token);
  const resident=stage.querySelector('.room-resident'),template=document.createElement('div');
  template.innerHTML=next.html;
  const images=[...template.querySelectorAll('img')];
  for(const image of images)image.loading='eager';
  const unchanged=resident.innerHTML===template.innerHTML;
  if(!unchanged){
   try{await Promise.all(images.map(image=>image.decode()));}catch{if(transitions.get(stage)===token)transitions.delete(stage);return;}
  }
  if(transitions.get(stage)!==token||!stage.isConnected)return;
  transitions.delete(stage);
  if(document.hidden||document.documentElement.hasAttribute('data-cat-state-pending')||isPlaying(stage))return;
  const current=readStage(stage);
  if(current.stamp!==next.stamp||current.html!==next.html){void transition(stage,current);return;}
  // The decoded cat, placement and scenery become visible in the same task.
  if(!unchanged)resident.replaceChildren(...template.childNodes);
  applyStage(stage,current,true);CatImages.warm(stage);
 }
 return {world,snapshot,attrs,stage,homeKey,homeLabel,care,controls,unit,play,isPlaying,sync,settled:stage=>!transitions.has(stage),get playing(){return active.size;}};
})();
