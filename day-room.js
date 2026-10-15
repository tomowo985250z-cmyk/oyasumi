// Shared room composition; gazing cats sit by the window during daylight.
globalThis.DayRoom=(()=>{
 const active=new Map();
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
 const artwork=(room,coat,status,w,home=false)=>home&&status==='sleep'?CatScenes.svg('sleeping',coat):w.daylight?DayCats.svg(room.pose,coat):CatScenes.svg(status==='awake'?'awake':'sleeping',coat);
 const location=(room,w,status)=>!w.daylight||status==='sleep'?'room':room.location;
 const placement=(room,w,where)=>where!=='room'?'cushion':w.daylight&&room.pose==='gaze'?'window':room.place;
 const homeKey=()=>{
  const user=typeof shared!=='undefined'?shared.userId:null,room=snapshot(user);
  return room.day+':'+(world().daylight?[room.location,room.pose,room.moodSince].join(':'):NightCats.at(NightClock.now(),user)?.key||'night');
 };
 const scenery=(where,w)=>where==='room'?`<img class="day-room-art" src="assets/day-room/room.svg" alt=""><div class="day-room-night-light"></div><div class="day-room-world-window">${SeasonLandscape.art(w)}</div>`:`<div class="day-room-world-outdoors">${SeasonLandscape.art(w,'sky')}</div>${CatPlaceScenes.art(where,w)}`;
 const sceneryKey=(where,w)=>[where,w.day,w.season,w.weather,w.daylight].join(':');
 const contactStyle=(place,where,html,coat)=>place==='window'?`--window-cat-pad:${windowContact(html,coat)}%`:where!=='room'?`--ground-cat-pad:${windowContact(html,coat)-5}%`:'';
 const homeLabel=(room,status)=>status==='sleep'?'すやすや、おやすみ中':DayRoom.world().daylight?(DayCats.options.find(p=>p.id===room.pose)?.label||'のんびり中'):'今夜も、マイペース。';
 function stage(coat,user,cat,interactive=false){
  const room=DayRoom.snapshot(user),w=DayRoom.world(),unselected=cat?.home&&typeof shared!=='undefined'&&shared.needsCat===true;
  const night=unselected?null:NightCats.frame(coat,NightClock.now(),user,cat?.status,cat?.home,w.daylight);
  const html=unselected?'<span data-cat-placeholder aria-hidden="true"></span>':night?.html||artwork(room,coat,cat?.status,w,cat?.home);
  const where=location(room,w,cat?.status),tag=interactive?'button':'div',place=night?.place||placement(room,w,where);
  const style=contactStyle(place,where,html,coat),contact=style?` style="${style}"`:'';
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
  const animation=template.content.firstElementChild;animation.classList.add('room-care-animation');
  const size=()=>animation.style.setProperty('--room-care-scale',String(stage.classList.contains('day-room')?stage.clientWidth*.4/152:Math.min(208/152,stage.clientWidth/176)));
  // Keep the resident visible until the meal images have decoded and playback starts.
  animation.style.visibility='hidden';
  animation.addEventListener('careplaybackstart',()=>{animation.style.removeProperty('visibility');unit.dataset.feeding='true';},{once:true});
  animation.addEventListener('careplaybackreturn',()=>{unit.classList.add('room-care-returning');},{once:true});
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
   if(stage.closest('.own-cat-room')&&((typeof catsResolved==='function'&&!catsResolved())||(typeof shared!=='undefined'&&shared.needsCat===true)))continue;
   if(active.has(stage.closest('.profile-room-unit'))||stage.closest('[data-feeding=true]'))continue;
   if(stage.closest('.own-cat-room'))stage.dataset.postStatus=CatCare.sleeping(shared.catCare)?'sleep':homeCatStatus();
   const room=DayRoom.snapshot(stage.dataset.roomUser),w=DayRoom.world(),cat=stage.querySelector('.room-resident');
   const night=NightCats.frame(stage.dataset.coat,NightClock.now(),stage.dataset.roomUser,stage.dataset.postStatus,stage.dataset.roomHome==='true',w.daylight);
   const where=location(room,w,stage.dataset.postStatus),stamp=[room.day,room.place,room.pose,room.away,where,stage.dataset.coat,stage.dataset.postStatus,w.day,w.season,w.weather,w.daylight,night?.pose].join(':');
   if(stage.dataset.roomStamp!==stamp){
    stage.dataset.roomStamp=stamp;
    stage.dataset.location=where;stage.dataset.place=night?.place||placement(room,w,where);stage.dataset.away=String(room.away);
    if(night){stage.dataset.nightPose=night.pose;stage.style.cssText=night.style;}
    else{delete stage.dataset.nightPose;stage.removeAttribute('style');}
    stage.dataset.worldDay=w.day;stage.dataset.worldSeason=w.season;stage.dataset.worldWeather=w.weather;stage.dataset.worldDaylight=String(w.daylight);
    const html=night?.html||artwork(room,stage.dataset.coat,stage.dataset.postStatus,w,stage.dataset.roomHome==='true');
    cat.style.cssText=contactStyle(stage.dataset.place,where,html,stage.dataset.coat);
    CatImages.render(cat,html);
    cat.toggleAttribute('aria-hidden',room.away);
    if(cat.matches('button')){cat.disabled=room.away;if(room.away)cat.tabIndex=-1;else cat.removeAttribute('tabindex');}
    const backgroundKey=sceneryKey(where,w);
    if(stage.dataset.sceneryKey!==backgroundKey){stage.dataset.sceneryKey=backgroundKey;stage.querySelector('.day-room-scenery').innerHTML=scenery(where,w);}
    const hero=stage.closest('.day-room-hero'),heading=hero?.querySelector('h2');if(heading)heading.textContent=homeLabel(room,stage.dataset.postStatus);
    const caption=hero?.querySelector('p');if(caption)caption.textContent=w.daylight?'また今夜 🌙':'ゆっくり、ひとやすみ 🌙';
   }
  }
 }
 return {world,snapshot,attrs,stage,homeKey,homeLabel,care,controls,unit,play,isPlaying,sync,get playing(){return active.size;}};
})();
