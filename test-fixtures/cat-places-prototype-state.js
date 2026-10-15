// Prototype only. Pure, shared JST schedule: no random-at-render, storage or DB.
globalThis.CatPlaces=(()=>{
 const MIN=60000,DAY=86400000,places=['room','garden','engawa'],cache=new Map();
 const labels=Object.freeze({room:'猫部屋',garden:'お庭',engawa:'縁側'});
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
 function schedule(now,user,overrides={}){
  const world=SeasonWeather.at(now),key=[world.day,user,overrides.weather,overrides.season].join('|');
  if(cache.has(key))return cache.get(key);
  const start=Date.parse(world.day+'T06:00:00+09:00'),end=start+12*60*MIN;
  const rng=random('cat-places-v1:'+String(user||'demo-cat')+':'+world.day),events=[];
  let at=start,previous;
  while(at<end){
   const w={...SeasonWeather.at(at),...overrides},preference=weights(w);
   const candidates=places.filter(p=>p!==previous&&preference[p]>0),total=candidates.reduce((n,p)=>n+preference[p],0);
   let roll=rng()*total;const place=candidates.find(p=>(roll-=preference[p])<0)||candidates.at(-1);
   const remaining=Math.round((end-at)/MIN),duration=remaining<=120?remaining:30+Math.floor(rng()*(Math.min(120,remaining-30)-30+1));
   const pose=['relax','groom','doze'][Math.floor(rng()*3)];
   events.push(Object.freeze({at,end:at+duration*MIN,place,pose,duration,weather:w.weather,season:w.season}));
   previous=place;at+=duration*MIN;
  }
  const result=Object.freeze({day:world.day,start,end,events:Object.freeze(events)});
  if(cache.size>=128)cache.delete(cache.keys().next().value);cache.set(key,result);return result;
 }
 function at(now,user,overrides={}){
  const plan=schedule(now,user,overrides),world={...SeasonWeather.at(now),...overrides};
  if(!world.daylight)return {place:'room',pose:'night',since:now<plan.start?plan.start-12*60*MIN:plan.end,nextAt:now<plan.start?plan.start:plan.start+DAY,world,night:true};
  const entry=plan.events.find(e=>now>=e.at&&now<e.end);
  return {...entry,since:entry.at,nextAt:entry.end,world,night:false};
 }
 return Object.freeze({at,schedule,weights,labels,places,version:1});
})();
if(typeof module!=='undefined')module.exports=CatPlaces;
