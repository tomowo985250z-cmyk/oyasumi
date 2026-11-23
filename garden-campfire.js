// Small, grounded garden fire. Existing garden/cat/shishi geometry is untouched.
globalThis.GardenCampfire=(()=>{
 'use strict';
 let serial=0,queued=false;const fires=new Map(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function random(seed){return()=>{seed|=0;seed=seed+0x6d2b79f5|0;let n=Math.imul(seed^seed>>>15,1|seed);n^=n+Math.imul(n^n>>>7,61|n);return((n^n>>>14)>>>0)/4294967296;};}
 const seed=()=>crypto.getRandomValues(new Uint32Array(1))[0];
 function art(){const id='campfire-'+(++serial);return `<svg class="garden-campfire" viewBox="0 0 400 330" aria-hidden="true" focusable="false"><defs>
 <radialGradient id="${id}-ground"><stop stop-color="#f0a357" stop-opacity=".30"/><stop offset=".38" stop-color="#dc8944" stop-opacity=".13"/><stop offset="1" stop-color="#bf682f" stop-opacity="0"/></radialGradient>
 <radialGradient id="${id}-halo"><stop stop-color="#f2b666" stop-opacity=".10"/><stop offset="1" stop-color="#d37836" stop-opacity="0"/></radialGradient>
 <linearGradient id="${id}-flame" x1="0" y1="1" x2=".08" y2="0"><stop stop-color="#e7762e" stop-opacity=".75"/><stop offset=".34" stop-color="#eea04c" stop-opacity=".92"/><stop offset=".7" stop-color="#f6c577" stop-opacity=".84"/><stop offset="1" stop-color="#e5a85f" stop-opacity=".12"/></linearGradient>
 <linearGradient id="${id}-core" x1="0" y1="1" x2=".1" y2="0"><stop stop-color="#efad5c"/><stop offset=".5" stop-color="#ffe0a1" stop-opacity=".86"/><stop offset="1" stop-color="#f8d593" stop-opacity="0"/></linearGradient>
 <filter id="${id}-shadow" x="-30%" y="-100%" width="160%" height="300%"><feGaussianBlur stdDeviation="1.25"/></filter>
 <clipPath id="${id}-front"><path d="M-17-2 10-14 13-7-13 4Z M-30 2H30V12H-30Z"/></clipPath>
 </defs><g transform="translate(270 311)">
 <g class="campfire-light"><g class="campfire-light-pulse"><ellipse cx="-4" cy="-1" rx="76" ry="24" fill="url(#${id}-ground)"/><ellipse cx="0" cy="-20" rx="34" ry="40" fill="url(#${id}-halo)"/>
 <path d="M-39-33Q-24-27-7-29L-12-25-26-27Z" fill="#d9a36d" opacity=".075"/></g></g>
 <g class="campfire-fuel"><ellipse cx="1" cy="7" rx="29" ry="4" fill="#142019" opacity=".38" filter="url(#${id}-shadow)"/><image href="assets/garden-campfire-v1/fuel.webp" x="-30" y="-14" width="60" height="24"/></g>
 <g class="campfire-flames" fill="url(#${id}-flame)">
 <g class="campfire-tongue" data-flame="back" opacity=".62"><path d="M-12-3C-21-11-9-16-13-29C-3-24-3-19-5-15C2-19-1-29 5-35C3-22 18-13 8-3Z"/></g>
 <g class="campfire-tongue" data-flame="left"><path d="M-10-3C-20-10-9-17-12-23C-7-22-7-17-5-15C-7-27 4-29 0-41C12-31 5-25 10-18C14-11 12-5 5-2Z"/></g>
 <g class="campfire-tongue" data-flame="right" opacity=".8"><path d="M-1-3C-9-8-2-14-4-24C1-21 3-17 2-13C9-18 7-24 12-28C9-18 19-12 12-5L7-2Z"/></g>
 <g class="campfire-tongue" data-flame="core" fill="url(#${id}-core)"><path d="M-6-3C-12-9-2-12-5-20C2-18 1-13 2-10C5-14 6-16 5-22C13-14 10-7 6-3Z"/></g>
 </g>
 <g class="campfire-fuel" clip-path="url(#${id}-front)"><image href="assets/garden-campfire-v1/fuel.webp" x="-30" y="-14" width="60" height="24"/></g>
 </g></svg>`;}
 function animate(svg){const rng=random(seed()),animations=[];for(const [i,tongue]of [...svg.querySelectorAll('.campfire-tongue')].entries()){
  const frames=Array.from({length:19},(_,j)=>{const p=j===18?0:j,sway=Math.sin(p*1.73+i)*2.3+(rng()-.5)*1.4,height=.91+.16*rng();return{transform:'translate('+sway.toFixed(2)+'px,0) skewX('+((rng()-.5)*9).toFixed(2)+'deg) scale('+(.94+.12*rng()).toFixed(3)+','+height.toFixed(3)+')',opacity:i===0?.48+.16*rng():i===3?.76+.12*rng():.78+.18*rng()};});frames[18]={...frames[0]};animations.push(tongue.animate(frames,{duration:17300+i*3713,iterations:Infinity,easing:'ease-in-out'}));
  }
  const glow=svg.querySelector('.campfire-light-pulse');animations.push(glow.animate([{opacity:.78},{opacity:.92},{opacity:.81},{opacity:1},{opacity:.85},{opacity:.94},{opacity:.78}],{duration:11971,iterations:Infinity,easing:'ease-in-out'}));return animations;
 }
 function setPlaying(entry){const play=entry.visible&&!document.hidden&&!reduced.matches;for(const a of entry.animations)play?a.play():a.pause();}
 const observer=new IntersectionObserver(entries=>{for(const item of entries){const e=fires.get(item.target);if(e){e.visible=item.isIntersecting;setPlaying(e);}}});
 function sync(){queued=false;for(const [stage,e]of fires)if(!stage.isConnected||stage.dataset.location!=='garden'){e.animations.forEach(a=>a.cancel());observer.unobserve(stage);e.svg.remove();fires.delete(stage);}
  for(const stage of document.querySelectorAll('.day-room[data-location="garden"]:not([data-room-preferences-pending])')){
   let e=fires.get(stage);if(!e){stage.insertAdjacentHTML('beforeend',art());const svg=stage.querySelector(':scope>.garden-campfire');e={svg,visible:false,animations:reduced.matches?[]:animate(svg)};fires.set(stage,e);observer.observe(stage);}
   const w=globalThis.DayRoom?.world?.()||{},at=globalThis.SolarModel?.time(w)??Date.now(),night=globalThis.SolarModel?.weights(at).night??(stage.dataset.worldDaylight==='false'?1:0);
   e.svg.style.setProperty('--fire-night',night.toFixed(4));e.svg.style.setProperty('--fire-fuel-light',(.90-.42*night).toFixed(4));setPlaying(e);
  }
 }
 function schedule(){if(!queued){queued=true;queueMicrotask(sync);}}
 function init(){new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-location','data-world-season','data-world-weather','data-world-daylight','data-room-preferences-pending']});schedule();document.addEventListener('visibilitychange',schedule);reduced.addEventListener('change',()=>{for(const e of fires.values()){e.animations.forEach(a=>a.cancel());e.animations=reduced.matches?[]:animate(e.svg);}schedule();});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();

 // CC0 field recording: HECKFRICKER, Campfire 02. See the asset README.
 // The full 4m19s cycle has an offline 6s crossfade; native looping needs no timer.
 const recordingUrl='assets/garden-campfire-v1/campfire-recorded.mp3?v=dff8999e0449d842',loopStart=.0690625,loopEnd=259.681875;
 let recording;
 function loadRecording(context){
  if(!recording){
   const task=fetch(new URL(recordingUrl,document.baseURI),{cache:'force-cache'}).then(response=>{if(!response.ok)throw Error('Campfire audio unavailable');return response.arrayBuffer();}).then(bytes=>{
    const Offline=globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext;
    const decoder=Offline?new Offline(1,1,16000):context;
    return decoder.decodeAudioData(bytes);
   }).then(buffer=>{if(buffer.numberOfChannels!==1||buffer.duration<loopEnd)throw Error('Invalid campfire recording');return buffer;});
   recording=task;task.catch(()=>{if(recording===task)recording=null;});
  }
  return recording;
 }
 function createSound(context,destination){let running=false,loading=false,revision=0,total=0,retryAt=0,failed=false;const sources=new Set(),bus=context.createGain();bus.gain.value=0;bus.connect(destination);
  function start(){
   if(running||Date.now()<retryAt)return;running=true;loading=true;const ticket=++revision;
   loadRecording(context).then(buffer=>{
    if(ticket!==revision)return;loading=false;
    if(!running||context.state!=='running'){running=false;return;}
    const at=context.currentTime,source=context.createBufferSource();
    for(const previous of sources)try{previous.stop(at);}catch{}
    source.buffer=buffer;source.loop=true;source.loopStart=loopStart;source.loopEnd=loopEnd;source.connect(bus);sources.add(source);
    source.onended=()=>{source.disconnect();sources.delete(source);};
    bus.gain.cancelScheduledValues(at);bus.gain.setValueAtTime(0,at);bus.gain.linearRampToValueAtTime(.12,at+.5);
    source.start(at+.04,loopStart+random(seed())()*(loopEnd-loopStart));total++;failed=false;
   }).catch(()=>{if(ticket===revision){loading=false;running=false;failed=true;retryAt=Date.now()+60000;}});
  }
  function stop(immediate=false){running=false;loading=false;revision++;const t=context.currentTime,delay=immediate?0:.14;bus.gain.cancelScheduledValues(t);bus.gain.setValueAtTime(immediate?0:bus.gain.value,t);if(!immediate)bus.gain.linearRampToValueAtTime(0,t+delay);for(const source of sources)try{source.stop(t+delay);}catch{}}
  return{start,stop,inspect:()=>({running,loading,failed,sources:sources.size,segments:total,gain:bus.gain.value,nextAt:0,timer:false,duration:loopEnd-loopStart})};
 }
 return{createSound,inspect:()=>({fires:fires.size,animations:[...fires.values()].reduce((n,e)=>n+e.animations.length,0)})};
})();
document.dispatchEvent(new Event('campfirechange'));
