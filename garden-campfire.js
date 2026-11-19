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

 // Original procedural wood crackle: fresh noise and grains for every segment.
 // Never repeat a short recording; adjacent 48s segments have complementary fades.
 function soundBuffer(context,value=seed()){
  const rng=random(value),rate=16000,n=48*rate,out=context.createBuffer(1,n,rate),pcm=out.getChannelData(0);let brown=0,low=0,high=0;
  for(let i=0;i<n;i++){const white=rng()*2-1;brown=.993*brown+.007*white;low+=.16*(white-low);high+=.035*(low-high);const swell=.85+.10*Math.sin(i/rate*.39)+.05*Math.sin(i/rate*.73);pcm[i]=(.018*(low-high)+.065*brown)*swell;}
  let at=.04;while(at<48){at+=.065+(rng()**1.6)*.55;const start=Math.floor(at*rate),duration=.022+rng()*.11,length=Math.ceil(duration*rate),amplitude=.025+.060*rng()**2,alpha=.18+.42*rng(),ring=720+rng()*2000;let state=0,body=0;
   for(let j=0;j<length&&start+j<n;j++){const t=j/rate,envelope=(1-Math.exp(-t/.0025))*Math.exp(-t/(duration*.19));state+=alpha*((rng()*2-1)-state);body=.72*body+.28*state;pcm[start+j]+=amplitude*envelope*(state*.8+body*.35+Math.sin(2*Math.PI*ring*t)*Math.exp(-t/.009)*.08);}
  }
  let power=0,peak=0;for(const x of pcm){power+=x*x;peak=Math.max(peak,Math.abs(x));}const gain=Math.min(.075/Math.sqrt(power/n),.42/peak);for(let i=0;i<n;i++)pcm[i]*=gain;return out;
 }
 function createSound(context,destination){let running=false,timer,nextAt=0,total=0;const sources=new Set(),bus=context.createGain();bus.gain.value=0;bus.connect(destination);
  function add(at){const buffer=soundBuffer(context),source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;source.connect(gain);gain.connect(bus);gain.gain.value=0;gain.gain.setValueAtTime(0,at);for(let i=1;i<=24;i++)gain.gain.linearRampToValueAtTime(Math.sin(i/24*Math.PI/2),at+i/24*2.5);gain.gain.setValueAtTime(1,at+45.5);for(let i=1;i<=24;i++)gain.gain.linearRampToValueAtTime(Math.cos(i/24*Math.PI/2),at+45.5+i/24*2.5);const entry={source,gain};sources.add(entry);source.onended=()=>{source.disconnect();gain.disconnect();sources.delete(entry);};source.start(at);total++;nextAt=at+45.5;timer=setTimeout(()=>{timer=null;if(!running||context.state!=='running')return;add(Math.max(context.currentTime+.04,nextAt));},Math.max(0,nextAt-context.currentTime-6)*1000);}
  function start(){if(running)return;running=true;const t=context.currentTime;bus.gain.cancelScheduledValues(t);bus.gain.setValueAtTime(bus.gain.value,t);bus.gain.linearRampToValueAtTime(.12,t+.3);add(t+.04);}
  function stop(immediate=false){clearTimeout(timer);timer=null;running=false;const t=context.currentTime,delay=immediate?0:.14;bus.gain.cancelScheduledValues(t);bus.gain.setValueAtTime(immediate?0:bus.gain.value,t);if(!immediate)bus.gain.linearRampToValueAtTime(0,t+delay);for(const entry of sources)try{entry.source.stop(t+delay);}catch{}}
  return{start,stop,inspect:()=>({running,sources:sources.size,segments:total,gain:bus.gain.value,nextAt,timer:timer!==null&&timer!==undefined})};
 }
 return{createSound,soundBuffer,inspect:()=>({fires:fires.size,animations:[...fires.values()].reduce((n,e)=>n+e.animations.length,0)})};
})();
document.dispatchEvent(new Event('campfirechange'));
