// An occasional local lick in the existing grooming painting. No pose, image,
// contact, scale, clock, care, API or persistence state is replaced.
globalThis.CatIdleMotion=(()=>{
 const rules=Object.freeze({duration:4600,firstMin:35000,firstMax:75000,restMin:120000,restMax:240000,maxShiftRatio:.009,maxClockGap:2500});
 const ns='http://www.w3.org/2000/svg',states=new Map(),entries=new Map(),reduce=matchMedia('(prefers-reduced-motion: reduce)');
 let sequence=0,frame,timer,lastTick,observer;
 const hash=value=>{let n=2166136261;for(const c of value)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
 const wait=(key,turn=0)=>(turn?rules.restMin:rules.firstMin)+hash(key+':'+turn)%((turn?rules.restMax-rules.restMin:rules.firstMax-rules.firstMin)+1);
 const amplitude=elapsed=>elapsed<=0||elapsed>=rules.duration?0:Math.sin(Math.PI*elapsed/rules.duration)**2;
 function node(tag,attrs={}){const el=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))el.setAttribute(key,value);return el;}
 function filter(entry,w,h){
  const id='cat-idle-lick-'+(++sequence),overlay=node('svg',{class:'cat-idle-detail',viewBox:`0 0 ${w} ${h}`,'aria-hidden':'true',focusable:'false'}),defs=node('defs');
  // A feathered interior patch is composited over the unmodified original.
  // No complete-cat filter, image swap, alpha-outline or foot pixel changes.
  const gradient=node('radialGradient',{id:id+'-fade'});gradient.append(node('stop',{offset:'.35','stop-color':'white'}),node('stop',{offset:'1','stop-color':'white','stop-opacity':0}));defs.append(gradient);
  const mask=node('mask',{id:id+'-mask',maskUnits:'userSpaceOnUse',x:w*.56,y:h*.36,width:w*.30,height:h*.30,style:'mask-type:alpha'});mask.append(node('ellipse',{cx:w*.71,cy:h*.51,rx:w*.15,ry:h*.15,fill:`url(#${id}-fade)`}));defs.append(mask);
  const f=node('filter',{id,filterUnits:'userSpaceOnUse',primitiveUnits:'userSpaceOnUse',x:-w*.1,y:-h*.1,width:w*1.2,height:h*1.2,'color-interpolation-filters':'sRGB'}),offset=node('feOffset',{in:'SourceGraphic',dx:0,dy:0});f.append(offset);defs.append(f);
  const detail=node('g',{mask:`url(#${id}-mask)`,opacity:0});detail.append(node('image',{href:entry.img.getAttribute('src'),width:w,height:h,filter:`url(#${id})`}));overlay.append(defs,detail);entry.resident.append(overlay);
  Object.assign(entry,{filter:overlay,detail,offset,filterWidth:w,filterHeight:h});entry.stage.dataset.idleGesture='groom-lick';
 }
 function clear(entry){
  entry.filter?.remove();entry.filter=entry.detail=entry.offset=null;delete entry.stage.dataset.idleGesture;
 }
 function actor(stage){
  if(stage.dataset.worldDaylight!=='true'||stage.dataset.postStatus==='sleep'||stage.dataset.away==='true')return;
  const unit=stage.closest('.profile-room-unit');
  if(stage.closest('.cat-meal-room,.cat-treat-room,[data-morning-beg=true]')||unit?.dataset.catPlayback||unit?.dataset.feeding==='true'||stage.querySelector('.room-care-animation'))return;
  const modal=document.querySelector('dialog[open]');if(modal&&!modal.contains(stage))return;
  const resident=stage.querySelector('.room-resident'),img=resident?.querySelector(':scope > img[data-asset-key$="/day-groom"]');
  if(!img?.complete||!img.naturalWidth||resident.hidden)return;
  const css=getComputedStyle(resident),r=resident.getBoundingClientRect(),nav=document.querySelector('#navigation'),bottom=nav&&!nav.hidden?Math.min(innerHeight,nav.getBoundingClientRect().top):innerHeight;
  if(css.display==='none'||css.visibility==='hidden'||r.width<=0||r.left<0||r.right>innerWidth||r.top<0||r.bottom>bottom)return;
  return{resident,img,w:parseFloat(css.width),h:parseFloat(css.height)};
 }
 function reset(state){state.next=state.started=undefined;}
 function sync(){
  clearTimeout(timer);cancelAnimationFrame(frame);timer=frame=undefined;
  const now=performance.now(),blocked=document.hidden||matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.hasAttribute('data-cat-state-pending'),gap=lastTick!==undefined&&now-lastTick>rules.maxClockGap;lastTick=now;
  if(blocked||gap)for(const state of states.values())reset(state);
  const seen=new Set(),used=new Set();let moving=false,nextDelay=1000;
  for(const stage of document.querySelectorAll('.day-room')){
   let entry=entries.get(stage);const source=blocked||gap?null:actor(stage);
   if(!source){if(entry){clear(entry);entries.delete(stage);}continue;}
   const key=[stage.dataset.roomUser||'local-cat',stage.dataset.coat,stage.dataset.location,stage.dataset.place,source.img.getAttribute('src')].join(':');
   let state=states.get(key);if(!state){state={turn:0};states.set(key,state);}used.add(key);
   if(state.next===undefined)state.next=now+wait(key,state.turn);
   if(!entry){entry={stage};entries.set(stage,entry);}seen.add(stage);
   if(entry.img!==source.img&&entry.filter)clear(entry);Object.assign(entry,source);
   if(state.started===undefined&&now>=state.next)state.started=now;
   if(state.started!==undefined){
    const elapsed=now-state.started;
    if(elapsed>=rules.duration){clear(entry);state.started=undefined;state.next=now+wait(key,++state.turn);}
    else{
     if(entry.filter&&(!entry.filter.isConnected||entry.filterWidth!==source.w||entry.filterHeight!==source.h))clear(entry);
     if(!entry.filter)filter(entry,source.w,source.h);
     const amount=amplitude(elapsed);entry.offset.setAttribute('dy',String(-source.w*rules.maxShiftRatio*amount));entry.detail.setAttribute('opacity',String(amount));moving=true;
    }
   }
   nextDelay=Math.min(nextDelay,Math.max(1,state.next-now));
  }
  for(const [stage,entry] of entries)if(!seen.has(stage)){clear(entry);entries.delete(stage);}
  for(const [key,state] of states)if(!used.has(key))reset(state);
  while(states.size>128){const key=[...states.keys()].find(k=>!used.has(k));if(key===undefined)break;states.delete(key);}
  if(blocked)return;
  if(moving)frame=requestAnimationFrame(sync);else timer=setTimeout(sync,nextDelay);
 }
 function request(){if(frame===undefined)frame=requestAnimationFrame(sync);}
 function start(){
  if(observer||!document.body)return;
  observer=new MutationObserver(rows=>{if(rows.some(row=>!row.target.closest?.('.cat-idle-detail')))request();});
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src','hidden','data-asset-key','data-location','data-place','data-post-status','data-world-daylight','data-feeding','data-cat-playback']});
  new MutationObserver(request).observe(document.documentElement,{attributes:true,attributeFilter:['data-cat-state-pending']});
  document.addEventListener('visibilitychange',request);document.addEventListener('scroll',request,{passive:true,capture:true});window.addEventListener('resize',request);reduce.addEventListener('change',request);request();
 }
 return Object.freeze({rules,wait,amplitude,sync,start});
})();
CatIdleMotion.start();


