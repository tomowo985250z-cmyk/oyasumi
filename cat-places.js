// Shared server-clock/JST plan, promoted from the approved three-place prototype.
// Identity and date determine every event. Rendering never rolls or saves a place.
globalThis.CatPlaces=(()=>{
 const MIN=60000,DAY=86400000,places=Object.freeze(['room','garden','engawa']),cache=new Map(),rhythms=new Map();
 const labels=Object.freeze({room:'猫部屋',garden:'お庭',engawa:'縁側'});
 const poses=Object.freeze(['relax','play','groom','doze','gaze']);
 const poseWeights=Object.freeze({room:Object.freeze([1,1,1,1,1]),garden:Object.freeze([1,4,4,1,0]),engawa:Object.freeze([4,0,1,5,0])});
 const nightPoseWeights=Object.freeze({room:Object.freeze([4,0,0,6,0]),garden:Object.freeze([6,0,0,4,0]),engawa:Object.freeze([3,0,0,7,0])});
 const rules=Object.freeze({startHour:6,endHour:18,moveMin:30*MIN,moveMax:120*MIN,moodMin:10*MIN,moodMax:30*MIN});
 function hash(value){let h=2166136261;for(const c of value)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
 function random(seed){let h=hash(seed)||1;return()=>{h^=h<<13;h^=h>>>17;h^=h<<5;return(h>>>0)/4294967296;};}
 function weights(w){
  let result={room:3,garden:4,engawa:4};
  if(w.season==='winter')result={room:7,garden:1,engawa:3};
  if(w.season==='summer'&&w.hour>=11&&w.hour<15)result={room:5,garden:1,engawa:7};
  if(w.hour<9)result.garden+=2;
  if(w.hour>=16)result.room+=3;
  if(w.weather==='cloudy')result.engawa+=2;
  if(w.weather==='rainy'){result.garden=0;result.room+=5;result.engawa+=3;}
  return result;
 }
 function nightWeights(w){
  const result=w.season==='winter'?{room:8,garden:1,engawa:2}:{room:5,garden:2,engawa:4};
  if(w.weather==='rainy'){result.garden=0;result.room+=4;result.engawa+=2;}
  return result;
 }
 function pose(place,roll,night=false){const weights=(night?nightPoseWeights:poseWeights)[place];let n=roll*weights.reduce((a,b)=>a+b,0);return poses.find((p,i)=>(n-=weights[i])<0)||'relax';}
 function moods(start,end,user,place,initial,night=false){
  const rng=random('cat-places-mood-v1:'+user+':'+start),entries=[];let at=start,current=initial;
  while(at<end){
   entries.push(Object.freeze({at,pose:current}));at+=((night?20:10)+Math.floor(rng()*(night?26:21)))*MIN;
   // Resolve a repeat using a separate draw without changing the movement RNG.
   let next=pose(place,rng(),night);if(next===current)next=pose(place,rng(),night);current=next;
  }
  return Object.freeze(entries);
 }
 function schedule(now,user='local-cat',night=false){
  user=String(user||'local-cat');const world=SeasonWeather.at(now);
  const start=Date.parse(world.day+(night?'T18:00:00+09:00':'T06:00:00+09:00'))-(night&&world.hour<6?DAY:0),end=start+12*60*MIN;
  const day=night?SeasonWeather.at(start).day:world.day,key=user+':'+day+(night?':night':'');
  if(cache.has(key))return cache.get(key);
  const rng=random((night?'cat-places-night-v1:':'cat-places-v1:')+user+':'+day),events=[];let at=start,previous;
  while(at<end){
   const w=SeasonWeather.at(at),preference=(night?nightWeights:weights)(w);
   // A garden visit must not continue into the next day's rain at midnight.
   if(night&&SeasonWeather.at(end-1).weather==='rainy')preference.garden=0;
   const candidates=places.filter(p=>p!==previous&&preference[p]>0);
   let roll=rng()*candidates.reduce((n,p)=>n+preference[p],0);
   const place=candidates.find(p=>(roll-=preference[p])<0)||candidates.at(-1);
   const min=night?60:30,max=night?180:120,remaining=Math.round((end-at)/MIN),duration=remaining<=max?remaining:min+Math.floor(rng()*(Math.min(max,remaining-min)-min+1));
   const initial=pose(place,rng(),night),finish=at+duration*MIN;
   events.push(Object.freeze({at,end:finish,place,pose:initial,duration,moods:moods(at,finish,user,place,initial,night)}));
   previous=place;at=finish;
  }
  const result=Object.freeze({day,start,end,events:Object.freeze(events)});
  if(cache.size>=128)cache.delete(cache.keys().next().value);cache.set(key,result);return result;
 }
 function rhythm(now,user='local-cat'){
  user=String(user||'local-cat');const w=SeasonWeather.at(now);
  const night=schedule(now-(w.daylight?12*60*MIN:0),user,true),key=user+':'+night.start;
  if(rhythms.has(key))return rhythms.get(key);
  // Keep each cat's preferred rhythm stable; actual homecoming and rest use
  // its existing movement/mood boundaries, rather than one global curfew.
  const preferred=night.start+(240+hash('cat-bedtime-v1:'+user)%181)*MIN;
  const home=night.events.find(e=>e.at>=preferred)||night.events.at(-1);
  const sleepAt=home.moods.find(m=>m.at>home.at)?.at||home.end;
  const morning=schedule(night.end,user),wakeOptions=morning.events.flatMap(e=>e.moods).filter(m=>m.at>morning.start).slice(0,3);
  const wakeAt=wakeOptions[hash('cat-wake-v1:'+user)%wakeOptions.length].at;
  const result=Object.freeze({returnAt:home.at,sleepAt,wakeAt});
  if(rhythms.size>=128)rhythms.delete(rhythms.keys().next().value);rhythms.set(key,result);return result;
 }
 function at(now,user='local-cat'){
  const world=SeasonWeather.at(now),plan=schedule(now,user,!world.daylight);
  const rest=rhythm(now,user);
  if(now>=rest.returnAt&&now<rest.wakeAt){
   const settling=now<rest.sleepAt,since=settling?rest.returnAt:rest.sleepAt;
   return Object.freeze({place:'room',pose:'doze',since,moodSince:since,nextAt:settling?rest.sleepAt:rest.wakeAt,world,night:!world.daylight,restState:settling?'settling':'sleeping'});
  }
  const entry=plan.events.find(e=>now>=e.at&&now<e.end),mood=entry.moods.findLast(e=>e.at<=now);
  return Object.freeze({place:entry.place,pose:mood.pose,since:entry.at,moodSince:mood.at,nextAt:entry.end,world,night:!world.daylight,restState:'awake'});
 }
 return Object.freeze({at,schedule,rhythm,weights,nightWeights,poseWeights,nightPoseWeights,labels,places,poses,rules});
})();
if(typeof module!=='undefined')module.exports=CatPlaces;
