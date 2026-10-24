globalThis.SpringPetals=(()=>{
 const entries=new Map(),reduce=matchMedia('(prefers-reduced-motion: reduce)');let timer,queued=false,pageHidden=false;
 const random=(a,b)=>a+Math.random()*(b-a),visible=stage=>{const b=stage.getBoundingClientRect();return b.width>0&&b.height>0&&b.bottom>0&&b.right>0&&b.top<innerHeight&&b.left<innerWidth;};
 function clear(entry){for(const p of entry.particles){p.animation.cancel();p.node.remove();}entry.particles.clear();entry.layer.remove();}
 function spawn(entry){const stage=entry.stage,b=stage.getBoundingClientRect(),scale=b.width/400,night=stage.dataset.worldDaylight==='false',gust=entry.turn%4===3,count=gust?Math.floor(random(5,9)):Math.floor(random(1,night?3:4));entry.turn++;let last=0;
  for(let i=0;i<count&&entry.particles.size<8;i++){const el=document.createElement('i'),startX=random(12,150),startY=random(25,135),dx=random(gust?130:70,gust?240:170),duration=random(16000,24000),delay=random(0,gust?2000:1400),rotation=random(-70,60),size=random(2.5,4);el.className='spring-petal';el.style.cssText=`left:${startX*scale}px;top:${startY*scale}px;width:${size*scale}px;height:${size*1.6*scale}px;`;entry.layer.append(el);
   const transform=(x,y,r,tilt)=>`translate3d(${x*scale}px,${y*scale}px,0) rotate(${r}deg) rotateY(${tilt}deg)`,endY=350-startY,opacity=night?.24:.63;
   const animation=el.animate([{transform:transform(0,0,rotation,20),opacity:0,offset:0},{transform:transform(dx*.16,40,rotation+80,140),opacity,offset:.17},{transform:transform(dx*.4,115,rotation+180,30),opacity,offset:.43},{transform:transform(dx*.72,210,rotation+300,190),opacity,offset:.72},{transform:transform(dx,endY,rotation+430,330),opacity,offset:1}],{duration,delay,easing:'linear',fill:'both'});const item={node:el,animation};entry.particles.add(item);animation.finished.catch(()=>{}).then(()=>{entry.particles.delete(item);el.remove();});last=Math.max(last,duration+delay);
  }
  entry.next=performance.now()+last+random(gust?11000:5000,gust?23000:14000);
 }
 function sync(){clearTimeout(timer);timer=undefined;const blocked=document.hidden||reduce.matches||pageHidden,seen=new Set();let wait=Infinity;
  for(const stage of document.querySelectorAll('.day-room[data-location=garden][data-world-season=spring]')){if(!stage.querySelector('.room-resident')||stage.dataset.roomPreferencesPending!==undefined)continue;seen.add(stage);let entry=entries.get(stage);if(!entry){const layer=document.createElement('div');layer.className='spring-petals';layer.setAttribute('aria-hidden','true');stage.append(layer);entry={stage,layer,particles:new Set(),turn:0,next:performance.now()+random(3000,6500),paused:false};entries.set(stage,entry);}const active=!blocked&&visible(stage);
   if(reduce.matches){for(const p of entry.particles){p.animation.cancel();p.node.remove();}entry.particles.clear();}
   if(!active){if(!entry.paused){entry.remaining=Math.max(0,entry.next-performance.now());entry.paused=true;for(const p of entry.particles)p.animation.pause();}continue;}
   if(entry.paused){entry.paused=false;entry.next=performance.now()+(entry.remaining||4000);for(const p of entry.particles)p.animation.play();}
   if(performance.now()>=entry.next)spawn(entry);wait=Math.min(wait,Math.max(100,entry.next-performance.now()));
  }
  for(const [stage,entry]of entries)if(!seen.has(stage)||!stage.isConnected){clear(entry);entries.delete(stage);}
  if(Number.isFinite(wait))timer=setTimeout(sync,wait);
 }
 function request(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync();});}
 function start(){new MutationObserver(rows=>{if(rows.some(r=>!r.target.closest?.('.spring-petals')))request();}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-location','data-world-season','data-world-daylight','hidden']});document.addEventListener('visibilitychange',()=>{if(document.hidden)sync();else request();});window.addEventListener('pagehide',()=>{pageHidden=true;sync();});window.addEventListener('pageshow',()=>{pageHidden=false;request();});document.addEventListener('scroll',request,{passive:true,capture:true});window.addEventListener('resize',request);reduce.addEventListener('change',request);request();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 return Object.freeze({sync,inspect:()=>({timer:timer!==undefined,reduced:reduce.matches,entries:[...entries.values()].map(e=>({count:e.particles.size,paused:e.paused,next:e.next,turn:e.turn,states:[...e.particles].map(p=>p.animation.playState)}))})});
})();
