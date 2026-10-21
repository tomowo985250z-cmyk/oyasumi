function initNatureSounds(){
// Real nature recordings only. No audio context or media request before a trusted gesture.
globalThis.NatureSounds=(()=>{
 const key='oyasumi-nature-sounds-v1',defaults={enabled:false,volume:.25},Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
 let prefs={...defaults},context,master,unlocked=false,revision=0,planKey='',chimeTimer,queued=false;
 const buffers=new Map(),active=new Map(),playing=new Set();
 try{const value=JSON.parse(localStorage.getItem(key)||'null');if(value?.version===1)prefs={enabled:value.enabled===true,volume:typeof value.volume==='number'&&Number.isFinite(value.volume)?Math.max(0,Math.min(1,value.volume)):defaults.volume};}catch{}
 const versions={"wind":"e41143ddeb52921a","rain":"7882131803a89de3","insects":"aa57fb0ce1f73392","chime":"aef1cd2c5d0da541"};
 function settingsMarkup(){
  const percent=Math.round(prefs.volume*100);
  return '<section class="settings-section nature-sounds-settings"><h2>自然音</h2><label class="setting-row"><span>縁側の自然音</span><input class="switch" type="checkbox" data-nature-sounds-toggle aria-label="縁側の自然音" '+(prefs.enabled?'checked ':'')+(Audio?'':'disabled')+'></label><label class="setting-row"><span>音量 <output data-nature-sounds-level>'+percent+'%</output></span><input class="nature-sounds-volume" type="range" min="0" max="100" step="1" value="'+percent+'" data-nature-sounds-volume aria-label="自然音の音量" aria-valuetext="'+percent+'%"></label><p class="quiet-note" data-nature-sounds-status aria-live="polite">'+(Audio?'縁側で、季節や天気に合う自然音が流れます。':'このブラウザでは自然音を再生できません。')+'</p></section>';
 }
 function status(text){
  for(const node of document.querySelectorAll('[data-nature-sounds-status]'))if(node.textContent!==text)node.textContent=text;
 }
 function save(){
  try{localStorage.setItem(key,JSON.stringify({version:1,...prefs}));}
  catch{status('この端末に自然音の設定を保存できませんでした。');}
 }
 function ramp(param,target,seconds){
  const now=context.currentTime,value=param.value;
  param.cancelScheduledValues(now);param.setValueAtTime(value,now);param.linearRampToValueAtTime(target,now+seconds);
 }
 function retire(layer,seconds){
  ramp(layer.gain.gain,0,seconds);
  layer.source.stop(context.currentTime+seconds);
 }
 function halt(seconds=1.4){
  revision++;planKey='';clearTimeout(chimeTimer);chimeTimer=undefined;
  for(const layer of playing)retire(layer,seconds);
  active.clear();
 }
 function scene(){
  if(document.hidden)return null;
  const modal=document.querySelector('dialog[open]'),root=modal||document.querySelector('#app');
  const stage=root?.querySelector('.day-room[data-location="engawa"]:not([data-room-preferences-pending])');
  return stage&&stage.getClientRects().length?stage:null;
 }
 function environment(){
  if(!scene())return null;
  const w=DayRoom.world(),night=SolarModel.phase(w.at)==='night',rain=w.weather==='rainy';
  return {tracks:rain?[['rain',1]]:[['wind',night?.55:1],...((w.season==='summer'||w.season==='autumn')&&night?[['insects',.65]]:[])],chime:w.season==='summer'&&!rain,night};
 }
 function load(name){
  if(!buffers.has(name)){
   const url=new URL('assets/nature-sounds-v1/'+name+'.mp3?v='+versions[name],document.baseURI);
   const promise=fetch(url).then(response=>{if(!response.ok)throw Error('Audio unavailable');return response.arrayBuffer();}).then(data=>context.decodeAudioData(data));
   buffers.set(name,promise);promise.catch(()=>{if(buffers.get(name)===promise)buffers.delete(name);});
  }
  return buffers.get(name);
 }
 function start(name,buffer,level,loop){
  const source=context.createBufferSource(),gain=context.createGain(),layer={name,source,gain};
  source.buffer=buffer;source.loop=loop;gain.gain.value=0;source.connect(gain);gain.connect(master);
  source.onended=()=>{playing.delete(layer);if(active.get(name)===layer)active.delete(name);source.disconnect();gain.disconnect();};
  playing.add(layer);if(loop)active.set(name,layer);
  source.start();ramp(gain.gain,level,loop?1.4:.08);
 }
 function error(token){
  if(token===revision&&prefs.enabled)status('自然音を再生できませんでした。もう一度ONにしてください。');
 }
 function scheduleChime(token){
  clearTimeout(chimeTimer);
  chimeTimer=setTimeout(()=>{
   chimeTimer=undefined;
   const next=unlocked&&prefs.enabled&&prefs.volume>0&&environment();
   if(token!==revision||!next?.chime)return;
   load('chime').then(buffer=>{
    if(token!==revision||!unlocked||!prefs.enabled||!environment()?.chime)return;
    start('chime',buffer,next.night?.3:.5,false);scheduleChime(token);
   }).catch(()=>error(token));
  },45000+Math.random()*45000);
 }
 function sync(){
  if(!prefs.enabled||!unlocked||!context||context.state!=='running'||prefs.volume===0){if(planKey)halt(.18);return;}
  const next=environment();
  if(!next){if(planKey)halt();return;}
  const id=JSON.stringify(next);if(id===planKey)return;
  const token=++revision;planKey=id;clearTimeout(chimeTimer);
  for(const [name,layer]of active)if(!next.tracks.some(([wanted])=>wanted===name)){retire(layer,1.4);active.delete(name);}
  if(!next.chime)for(const layer of playing)if(layer.name==='chime')retire(layer,1.4);
  for(const [name,level]of next.tracks){
   const layer=active.get(name);
   if(layer){ramp(layer.gain.gain,level,1.4);continue;}
   load(name).then(buffer=>{if(token===revision&&prefs.enabled&&unlocked&&context.state==='running'&&JSON.stringify(environment())===id)start(name,buffer,level,true);}).catch(()=>error(token));
  }
  if(next.chime)scheduleChime(token);
 }
 function unlock(){
  if(!prefs.enabled||prefs.volume===0||document.hidden||!Audio)return;
  try{
   if(!context){
    context=new Audio();master=context.createGain();master.gain.value=.5*prefs.volume;master.connect(context.destination);
    context.addEventListener('statechange',()=>{if(context.state!=='running'){unlocked=false;halt(0);}});
   }
   // Resume synchronously inside the user event, before fetching or decoding audio.
   context.resume().then(()=>{
    if(!prefs.enabled||document.hidden)return;
    unlocked=context.state==='running';
    if(unlocked){ramp(master.gain,.5*prefs.volume,.18);sync();}
   }).catch(()=>status('画面を操作して、自然音をもう一度お試しください。'));
  }catch{status('このブラウザでは自然音を再生できません。');}
 }
 document.addEventListener('change',event=>{
  if(!event.target.matches('[data-nature-sounds-toggle]'))return;
  prefs.enabled=event.target.checked;save();
  if(prefs.enabled){if(event.isTrusted)unlock();}
  else{
   halt(.18);unlocked=false;
   const current=context;
   setTimeout(()=>{if(!prefs.enabled&&current?.state==='running')void current.suspend().catch(()=>{});},200);
  }
 });
 document.addEventListener('input',event=>{
  if(!event.target.matches('[data-nature-sounds-volume]'))return;
  prefs.volume=Math.max(0,Math.min(1,Number(event.target.value)/100));save();
  const percent=Math.round(prefs.volume*100);
  event.target.setAttribute('aria-valuetext',percent+'%');
  for(const node of document.querySelectorAll('[data-nature-sounds-level]'))node.textContent=percent+'%';
  if(master)ramp(master.gain,.5*prefs.volume,.18);
  if(event.isTrusted)unlock();
  if(prefs.volume===0)halt(.18);
 });
 const gesture=event=>{
  if(event.isTrusted&&prefs.enabled&&!event.target.closest('[data-nature-sounds-toggle]')&&!event.target.closest('label')?.querySelector('[data-nature-sounds-toggle]'))unlock();
 };
 document.addEventListener('click',gesture,{capture:true,passive:true});
 document.addEventListener('pointerup',gesture,{capture:true,passive:true});
 document.addEventListener('keydown',event=>{if(['Enter',' ','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))gesture(event);},{capture:true});
 function pause(){
  unlocked=false;halt(0);
  if(context?.state==='running')void context.suspend().catch(()=>{});
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
 window.addEventListener('pagehide',pause);
 // Observe scene changes, not shoji state. Door acoustics belong to the next phase.
 new MutationObserver(()=>{
  if(!prefs.enabled||!unlocked||queued)return;
  queued=true;requestAnimationFrame(()=>{queued=false;sync();});
 }).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-location','data-world-season','data-world-weather','data-world-daylight','data-solar-light','open']});
 setInterval(()=>{if(prefs.enabled&&unlocked)sync();},30000);
 return {settingsMarkup};
})();

 for(const node of document.querySelectorAll("[data-nature-sounds-pending]"))node.outerHTML=NatureSounds.settingsMarkup();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initNatureSounds,{once:true});else initNatureSounds();
