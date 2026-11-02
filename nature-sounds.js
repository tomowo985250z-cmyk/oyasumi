function initNatureSounds(){
globalThis.NatureSounds=(()=>{
 const key='oyasumi-nature-sounds-v1',Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
 const names={room:'寝室',engawa:'縁側',garden:'庭',roof:'屋根'},distance={room:[.28,1650],engawa:[.68,3000],garden:[.9,4400],roof:[.56,3800]};
 let prefs={enabled:false,volume:.25},context,master,limiter,unlocked=false,timer,offTimer,queued=false,lastScene=null,focused=null,currentPlan=null,pendingKey=null,revision=0,sequence=0;
 const buffers=new Map(),pending=new Set(),layers=new Set(),ramps=new WeakMap(),now=()=>context?.currentTime||0;
 try{const p=JSON.parse(localStorage.getItem(key)||'null');if(p?.version===1)prefs={enabled:p.enabled===true,volume:Number.isFinite(p.volume)?Math.max(0,Math.min(1,p.volume)):.25};}catch{}
 function valueAt(param,t=now()){const old=ramps.get(param);return old?(t>=old.end?old.target:old.value+(old.target-old.value)*Math.max(0,(t-old.start)/(old.end-old.start))):param.value;}
 function ramp(param,target,seconds=4){const old=ramps.get(param);if(old?.target===target)return;const t=now(),value=valueAt(param,t);param.cancelScheduledValues(t);param.setValueAtTime(value,t);param.linearRampToValueAtTime(target,t+seconds);ramps.set(param,{value,target,start:t,end:t+seconds});}
 function save(){try{localStorage.setItem(key,JSON.stringify({version:1,...prefs}));}catch{status('この端末に音の設定を保存できませんでした。');}}
 function status(text){for(const n of document.querySelectorAll('[data-nature-sounds-status]'))if(n.textContent!==text)n.textContent=text;}
 function settingsMarkup(){return '<section class="settings-section nature-sounds-settings"><h2>自然音</h2><label class="setting-row"><span>田舎の自然音</span><input class="switch" type="checkbox" data-nature-sounds-toggle aria-label="自然音" '+(prefs.enabled?'checked ':'')+(Audio?'':'disabled')+'></label><label class="setting-row"><span>音量 <output data-nature-sounds-level>'+Math.round(prefs.volume*100)+'%</output></span><input class="nature-sounds-volume" type="range" min="0" max="100" step="1" value="'+Math.round(prefs.volume*100)+'" data-nature-sounds-volume aria-label="自然音の音量"></label><p class="quiet-note" data-nature-sounds-status aria-live="polite">'+(Audio?'風をほのかに残し、遠くの声が静かな間をあけて聞こえます。画面を移動しても続きます。':'このブラウザでは自然音を再生できません。')+'</p><p class="quiet-note"><a href="assets/countryside-audio-v2/credits.html" target="_blank" rel="noopener">自然音の出典</a></p></section>';}
 function visible(el){if(!el?.isConnected)return 0;const b=el.getBoundingClientRect();if(!b.width||!b.height)return 0;return Math.max(0,Math.min(b.right,innerWidth)-Math.max(b.left,0))*Math.max(0,Math.min(b.bottom,innerHeight)-Math.max(b.top,0));}
 function detect(){const modal=document.querySelector('dialog[open]'),root=modal||document.querySelector('#app'),candidates=[...(root?.querySelectorAll('.day-room:not([data-room-preferences-pending]),.roof-sky-card')||[])];let selected=focused&&candidates.includes(focused)&&visible(focused)>0?focused:null;if(!selected)selected=candidates.map(el=>({el,area:visible(el)})).filter(n=>n.area>0).sort((a,b)=>b.area-a.area)[0]?.el;if(selected){const place=selected.matches('.roof-sky-card')?'roof':selected.dataset.location;if(names[place])lastScene={place,element:selected};}return lastScene?.place||'room';}
 function environment(){const place=detect(),w=globalThis.DayRoom?.world?.()||{season:'winter',weather:'sunny',phase:'night',at:Date.now()},phase=globalThis.SolarModel?.phase?.(w.at)||w.phase||'night';return {place,season:w.season,weather:w.weather,phase};}
 const calls=new Set(['bird','summer-dawn','higurashi','insects']);
 function planFor(e){const night=e.phase==='night',summer=e.season==='summer',autumn=e.season==='autumn',levels={};if(e.weather==='rainy')levels.rain=.38;else{levels[summer&&['engawa','garden'].includes(e.place)?'wind-chime':'wind']=.38;if(summer&&e.phase==='morning')levels['summer-dawn']=.16;else if(summer&&e.phase==='evening')levels.higurashi=.14;else if((summer||autumn)&&(night||e.phase==='evening'))levels.insects=night?.14:.12;else if(e.season!=='winter'&&['morning','day'].includes(e.phase))levels.bird=e.phase==='morning'?.18:.12;}for(const name of calls)if(levels[name])levels[name]*=.8;const [gain,cutoff]=distance[e.place];return {...e,levels,gain:gain*(night?.65:1),cutoff:night?cutoff*.82:cutoff};}
 function load(name){if(!buffers.has(name)){pending.add(name);const task=fetch(new URL('assets/countryside-audio-v2/'+name+'.wav',document.baseURI)).then(r=>{if(!r.ok)throw Error('Audio unavailable '+name);return r.arrayBuffer();}).then(bytes=>context.decodeAudioData(bytes));buffers.set(name,task);task.catch(()=>{if(buffers.get(name)===task)buffers.delete(name);}).finally(()=>pending.delete(name));}return buffers.get(name);}
 // Four-minute virtual loops reuse the decoded short buffers. No long WAV,
 // time stretching, new voices, workers or additional scheduling timers.
 const loopSeconds=240,patterns=new Map();
 function longPattern(name,bufferSeconds){
  const key=name+':'+bufferSeconds;if(patterns.has(key))return patterns.get(key);
  let seed=2166136261;for(const c of name)seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;
  const pick=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},out=[];
  if(!calls.has(name)){
   const intervals=Array.from({length:28},()=>7+pick()*3),total=intervals.reduce((a,b)=>a+b,0);let at=0;
   for(const value of intervals){const span=value*loopSeconds/total,duration=span+3;out.push({at,duration,offset:pick()*Math.max(0,bufferSeconds-duration),gain:.96+pick()*.08,fadeIn:3,fadeOut:3});at+=span;}
  }else{
   const insect=name==='insects';let at=7+pick()*10;
   while(at<loopSeconds-18){const duration=(insect?10:8)+pick()*(insect?4:3);out.push({at,duration,offset:pick()*Math.max(0,bufferSeconds-duration),gain:.85+pick()*.15,fadeIn:3,fadeOut:4});at+=duration+(insect?24:32)+pick()*29;}
  }
  patterns.set(key,out);return out;
 }
 function segmentLevel(clip,t){if(t<0||t>=clip.duration)return 0;return clip.gain*Math.sin(Math.min(1,t/clip.fadeIn)*Math.PI/2)*Math.sin(Math.min(1,(clip.duration-t)/clip.fadeOut)*Math.PI/2);}
 function segment(layer,clip,at){
  const t=now(),elapsed=Math.max(0,t-at),remaining=clip.duration-elapsed;if(remaining<=.02)return;
  const source=context.createBufferSource(),gain=context.createGain(),start=Math.max(t,at),grain={source,gain,start,end:at+clip.duration};
  source.buffer=layer.buffer;source.loop=false;source.connect(gain);gain.connect(layer.filter);gain.gain.setValueAtTime(segmentLevel(clip,elapsed),start);
  // Equal-power entry/exit, sampled as short native ramps (iPhone compatible).
  const marks=[clip.fadeIn,clip.duration-clip.fadeOut,clip.duration];for(let i=1;i<16;i++){marks.push(clip.fadeIn*i/16,clip.duration-clip.fadeOut+clip.fadeOut*i/16);}
  for(const mark of [...new Set(marks)].sort((a,b)=>a-b))if(mark>elapsed)gain.gain.linearRampToValueAtTime(segmentLevel(clip,mark),at+mark);
  layer.grains.add(grain);source.onended=()=>{source.disconnect();gain.disconnect();layer.grains.delete(grain);if(layer.retiring&&!layer.grains.size)disconnect(layer);};
  source.start(start,clip.offset+elapsed,remaining);
 }
 function fill(layer){
  if(layer.retiring)return;const t=now(),until=t+45,pattern=longPattern(layer.name,layer.buffer.duration);
  for(let cycle=Math.floor((t-layer.buffer.duration)/loopSeconds);cycle<=Math.floor(until/loopSeconds);cycle++)for(const clip of pattern){
   const at=cycle*loopSeconds+clip.at;if(at<=layer.scheduledUntil||at>=until||at+clip.duration<=t)continue;
   segment(layer,clip,at);layer.scheduledUntil=at;
  }
 }
 function disconnect(layer){layers.delete(layer);for(const g of [...layer.grains]){g.source.onended=null;g.source.stop();g.source.disconnect();g.gain.disconnect();}layer.grains.clear();for(const node of [layer.filter,layer.gain,layer.pan])node?.disconnect();}
 function level(layer,p,seconds=4){ramp(layer.gain.gain,(p.levels[layer.name]||0)*p.gain,seconds);ramp(layer.filter.frequency,p.cutoff,seconds);}
 function retire(layer,seconds=4){if(layer.retiring)return;layer.retiring=true;ramp(layer.gain.gain,0,seconds);const t=now();for(const grain of [...layer.grains]){if(grain.start>t){grain.source.onended=null;grain.source.stop();grain.source.disconnect();grain.gain.disconnect();layer.grains.delete(grain);}else grain.source.stop(t+seconds);}if(!layer.grains.size)disconnect(layer);}
 function start(name,buffer,p){
  if([...layers].some(l=>l.name===name&&!l.retiring))return;
  const filter=context.createBiquadFilter(),gain=context.createGain(),pan=context.createStereoPanner?.(),layer={id:++sequence,name,buffer,filter,gain,pan,grains:new Set(),scheduledUntil:-Infinity,started:now()};
  gain.gain.value=0;filter.type='lowpass';filter.Q.value=.4;filter.frequency.value=p.cutoff;filter.connect(gain);
  if(pan){gain.connect(pan);pan.connect(master);pan.pan.value=name.startsWith('wind')?-.05:.06;}else gain.connect(master);
  layers.add(layer);level(layer,p);fill(layer);
 }
 function clearTimer(){clearTimeout(timer);timer=undefined;}
 function schedule(){clearTimer();if(prefs.enabled&&unlocked&&prefs.volume>0&&!document.hidden&&context?.state==='running')timer=setTimeout(sync,20000);}
 function sync(){detect();if(!prefs.enabled||!unlocked||prefs.volume===0||document.hidden||context?.state!=='running'){clearTimer();return;}const p=planFor(environment()),key=JSON.stringify(p);if(pendingKey&&pendingKey!==key){revision++;pendingKey=null;}if(key!==JSON.stringify(currentPlan)&&key!==pendingKey){const token=++revision;pendingKey=key;const tracks=Object.keys(p.levels);Promise.all(tracks.map(name=>load(name))).then(decoded=>{if(token!==revision||!prefs.enabled||!unlocked||prefs.volume===0||document.hidden||context.state!=='running')return;currentPlan=p;pendingKey=null;for(const layer of layers)if(!p.levels[layer.name])retire(layer);else if(!layer.retiring)level(layer,p);tracks.forEach((name,i)=>start(name,decoded[i],p));status(names[p.place]+'の音。風を残し、遠くの声が穏やかに聞こえます。');}).catch(()=>{if(token===revision){pendingKey=null;status('音を読み込めませんでした。もう一度ONにしてください。');}});}for(const layer of layers)fill(layer);schedule();}
 function requestSync(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync();});}
 function unlock(){if(!prefs.enabled||prefs.volume===0||document.hidden||!Audio)return;clearTimeout(offTimer);try{if(!context){context=new Audio();master=context.createGain();master.gain.value=0;limiter=context.createDynamicsCompressor();limiter.threshold.value=-16;limiter.knee.value=8;limiter.ratio.value=8;limiter.attack.value=.006;limiter.release.value=.25;master.connect(limiter);limiter.connect(context.destination);context.addEventListener('statechange',()=>{if(context.state!=='running'){unlocked=false;clearTimer();}else if(prefs.enabled){unlocked=true;sync();}});}const finish=()=>{if(!prefs.enabled||document.hidden)return;unlocked=context.state==='running';if(unlocked){ramp(master.gain,.68*prefs.volume,.4);sync();}};if(context.state==='running')finish();else context.resume().then(finish).catch(()=>status('画面をタップすると自然音を再開できます。'));}catch{status('このブラウザでは自然音を再生できません。');}}
 function off(){revision++;pendingKey=null;clearTimer();currentPlan=null;for(const layer of layers)retire(layer,.18);if(master)ramp(master.gain,0,.18);unlocked=false;const saved=context;clearTimeout(offTimer);offTimer=setTimeout(()=>{if(!prefs.enabled&&saved?.state==='running')void saved.suspend().catch(()=>{});},220);}
 function ui(){for(const n of document.querySelectorAll('[data-nature-sounds-toggle]'))n.checked=prefs.enabled;for(const n of document.querySelectorAll('[data-nature-sounds-level]'))n.textContent=Math.round(prefs.volume*100)+'%';}
 document.addEventListener('change',e=>{if(!e.target.matches('[data-nature-sounds-toggle]'))return;prefs.enabled=e.target.checked;save();ui();if(prefs.enabled){if(e.isTrusted)unlock();}else off();});
 document.addEventListener('input',e=>{if(!e.target.matches('[data-nature-sounds-volume]'))return;prefs.volume=Math.max(0,Math.min(1,Number(e.target.value)/100));save();ui();if(master)ramp(master.gain,.68*prefs.volume,.3);if(prefs.volume===0){revision++;pendingKey=null;clearTimer();if(context?.state==='running')void context.suspend().catch(()=>{});}else if(e.isTrusted)unlock();});
 const gesture=e=>{if(!e.isTrusted)return;focused=e.target.closest?.('.day-room,.roof-sky-card')||focused;if(prefs.enabled&&!e.target.matches('[data-nature-sounds-toggle]'))unlock();else requestSync();};document.addEventListener('pointerup',gesture,{capture:true,passive:true});document.addEventListener('click',gesture,{capture:true,passive:true});document.addEventListener('keydown',e=>{if(['Enter',' ','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))gesture(e);},{capture:true});
 function pause(){revision++;pendingKey=null;unlocked=false;clearTimer();if(master){master.gain.cancelScheduledValues(now());master.gain.setValueAtTime(0,now());ramps.delete(master.gain);}if(context?.state==='running')void context.suspend().catch(()=>{});}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();else requestSync();});window.addEventListener('pagehide',pause);document.addEventListener('scroll',()=>{focused=null;requestSync();},{passive:true,capture:true});window.addEventListener('resize',requestSync);
 new MutationObserver(requestSync).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-location','data-world-season','data-world-weather','data-world-daylight','open']});requestSync();
 return {settingsMarkup,planFor,inspect:()=>({prefs:{...prefs},unlocked,state:context?.state||'none',environment:environment(),plan:currentPlan,playing:[...layers].map(l=>({id:l.id,name:l.name,loop:true,loopSeconds,bufferSeconds:l.buffer.duration,scheduledGrains:l.grains.size,activeGrains:[...l.grains].filter(g=>g.start<=now()&&g.end>now()).length,started:l.started,retiring:!!l.retiring,gain:valueAt(l.gain.gain)})),pending:[...pending],timer:timer!==undefined,buffers:[...buffers.keys()]})};
})();
for(const node of document.querySelectorAll('[data-nature-sounds-pending]'))node.outerHTML=NatureSounds.settingsMarkup();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initNatureSounds,{once:true});else initNatureSounds();
