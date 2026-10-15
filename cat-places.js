// Shared server-clock/JST plan, promoted from the approved three-place prototype.
// Identity and date determine every event. Rendering never rolls or saves a place.
globalThis.CatPlaces=(()=>{
 const MIN=60000,DAY=86400000,places=Object.freeze(['room','garden','engawa']),cache=new Map();
 const labels=Object.freeze({room:'猫部屋',garden:'お庭',engawa:'縁側'});
 const poses=Object.freeze(['relax','play','groom','doze','gaze']);
 const poseWeights=Object.freeze({room:Object.freeze([1,1,1,1,1]),garden:Object.freeze([1,4,4,1,0]),engawa:Object.freeze([4,0,1,5,0])});
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
 function pose(place,roll){let n=roll*poseWeights[place].reduce((a,b)=>a+b,0);return poses.find((p,i)=>(n-=poseWeights[place][i])<0)||'relax';}
 function moods(start,end,user,place,initial){
  const rng=random('cat-places-mood-v1:'+user+':'+start),entries=[];let at=start,current=initial;
  while(at<end){
   entries.push(Object.freeze({at,pose:current}));at+=(10+Math.floor(rng()*21))*MIN;
   // Resolve a repeat using a separate draw without changing the movement RNG.
   let next=pose(place,rng());if(next===current)next=pose(place,rng());current=next;
  }
  return Object.freeze(entries);
 }
 function schedule(now,user='local-cat'){
  user=String(user||'local-cat');const world=SeasonWeather.at(now),key=user+':'+world.day;
  if(cache.has(key))return cache.get(key);
  const start=Date.parse(world.day+'T06:00:00+09:00'),end=start+12*60*MIN;
  const rng=random('cat-places-v1:'+user+':'+world.day),events=[];let at=start,previous;
  while(at<end){
   const w=SeasonWeather.at(at),preference=weights(w),candidates=places.filter(p=>p!==previous&&preference[p]>0);
   let roll=rng()*candidates.reduce((n,p)=>n+preference[p],0);
   const place=candidates.find(p=>(roll-=preference[p])<0)||candidates.at(-1);
   const remaining=Math.round((end-at)/MIN),duration=remaining<=120?remaining:30+Math.floor(rng()*(Math.min(120,remaining-30)-30+1));
   const initial=pose(place,rng()),finish=at+duration*MIN;
   events.push(Object.freeze({at,end:finish,place,pose:initial,duration,moods:moods(at,finish,user,place,initial)}));
   previous=place;at=finish;
  }
  const result=Object.freeze({day:world.day,start,end,events:Object.freeze(events)});
  if(cache.size>=128)cache.delete(cache.keys().next().value);cache.set(key,result);return result;
 }
 function at(now,user='local-cat'){
  const plan=schedule(now,user),world=SeasonWeather.at(now);
  if(!world.daylight)return Object.freeze({place:'room',pose:'night',since:now<plan.start?plan.start-12*60*MIN:plan.end,nextAt:now<plan.start?plan.start:plan.start+DAY,world,night:true});
  const entry=plan.events.find(e=>now>=e.at&&now<e.end),mood=entry.moods.findLast(e=>e.at<=now);
  return Object.freeze({place:entry.place,pose:mood.pose,since:entry.at,moodSince:mood.at,nextAt:entry.end,world,night:false});
 }
 return Object.freeze({at,schedule,weights,poseWeights,labels,places,poses,rules});
})();
if(typeof module!=='undefined')module.exports=CatPlaces;
