// Preview controls only. All rooms, care controls and playback use application code.
(() => {
 const natural={world:DayRoom.world,snapshot:DayRoom.snapshot},originalRender=render;
 const surface=new URLSearchParams(location.search).get('surface');let override={};
 DayRoom.world=()=>({...natural.world(),...(override.season?{season:override.season}:{}),...(override.weather?{weather:override.weather}:{})});
 DayRoom.snapshot=(user,now)=>{
  const value=natural.snapshot(user,now),place=override.place;
  if(!place||place==='natural')return value;
  if(place==='away')return {...value,place:'cushion',pose:'doze',away:true};
  return {...value,place,pose:place==='window'?'gaze':place==='corner'?'groom':'doze',away:false};
 };
 function sample(){
  if(!['home','mypage','profile','sky'].includes(surface))return;
  document.body.dataset.roomSample=surface;
  let host=document.querySelector('#room-sample');if(!host){host=document.createElement('section');host.id='room-sample';document.body.append(host);}
  if(host.querySelector('[data-feeding=true]')){app.replaceChildren();return;}
  const peer=shared.feed.find(p=>!p.self);
  if(surface==='home')host.innerHTML=dayHero()||'<p class="muted">昼猫のホーム表示は12:00〜18:00です。</p>';
  if(surface==='sky')host.innerHTML=countCard();
  if(surface==='mypage'){const template=document.createElement('template');template.innerHTML=profile();host.replaceChildren(template.content.querySelector('.profile-room-unit'));}
  if(surface==='profile'&&peer)host.innerHTML=profileRoomMarkup(peer);
  app.replaceChildren();
 }
 render=function(){originalRender();sample();};
 globalThis.RoomReviewControl=async(options={})=>{
  if(options.coat){RoomReviewData.coat=CatFaces.normalizeCoat(options.coat);state.coat=RoomReviewData.coat;shared.coat=state.coat;for(const p of [...state.posts,...shared.feed])p.coat=state.coat;}
  if(options.date||options.hour||options.time){
   const w=natural.world(),before=NightClock.now(),time=options.time||((options.hour||String(w.hour).padStart(2,'0'))+':00');RoomReviewData.clock.base=Date.parse(`${options.date||w.day}T${time.length===5?time+':00':time}+09:00`);RoomReviewData.clock.anchor=performance.now();
   // Keep sample posts recent when moving the preview clock. Production's
   // three-hour timeline expiry remains untouched.
   const shift=NightClock.now()-before;for(const post of new Set([...state.posts,...shared.feed,...(shared.activeAwakePosts||[])]))post.time+=shift;
  }
  for(const k of ['place','season','weather'])if(k in options)override[k]=options[k];
  if(typeof options.light==='boolean')state.light=options.light;
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());go(options.view==='meal'?'profile':'home');
  if(options.view==='treat'||options.view==='self-profile'){go('timeline');document.querySelector(`[data-public-profile="${options.view==='treat'?'room-preview-post':'room-preview-own'}"]`)?.click();}
  await document.fonts.ready;await Promise.all([...document.images].map(img=>img.decode().catch(()=>{})));
  return {world:DayRoom.world(),cat:DayRoom.snapshot(shared.userId)};
 };
 addEventListener('message',event=>{if(event.origin!==location.origin||event.source!==parent||event.data?.type!=='season-control')return;RoomReviewControl(event.data.options).then(result=>parent.postMessage({type:'season-updated',...result},location.origin));});
 const query=new URLSearchParams(location.search),initial={};for(const k of ['place','season','weather','date','hour','coat'])if(query.has(k))initial[k]=query.get(k);if(query.has('light'))initial.light=query.get('light')==='true';
 globalThis.RoomReviewReady=ensureConnection().then(()=>RoomReviewControl(initial)).then(result=>{parent.postMessage({type:'season-ready',coats:CatFaces.coats.map(({id,label})=>({id,label})),...result},location.origin);return result;});
})();
