// Shared synthetic weather. Date only: no account, position, API or storage.
globalThis.SeasonWeather=(()=>{
 const dayMs=86400000,anchor=Date.UTC(2000,0,1)/dayMs;
 const seasons=Object.freeze(['winter','winter','spring','spring','spring','summer','summer','summer','autumn','autumn','autumn','winter']);
 const labels=Object.freeze({spring:'春 · 桜',summer:'夏 · 入道雲',autumn:'秋 · 紅葉',winter:'冬 · 冬木立',sunny:'晴れ',cloudy:'曇り',rainy:'雨'});
 const weatherNames=['sunny','cloudy','rainy'],days=new Map([[anchor,0]]);let lastDay=anchor,lastWeather=0;
 function hash(text){let h=2166136261;for(const c of text){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}h^=h>>>16;h=Math.imul(h,0x85ebca6b);h^=h>>>13;h=Math.imul(h,0xc2b2ae35);h^=h>>>16;return(h>>>0)/4294967296;}
 function weather(index){
  if(index<anchor)return weatherNames[Math.floor(hash('oyasumi-weather-before:'+index)*3)];
  for(let d=lastDay+1;d<=index;d++){
   const r=hash('oyasumi-shared-weather-v1:'+d);
   lastWeather=lastWeather===0?(r<.8?0:1):lastWeather===1?(r<.3?0:r<.8?1:2):(r<.4?1:2);days.set(d,lastWeather);
  }
  if(index>lastDay)lastDay=index;return weatherNames[days.get(index)];
 }
 function at(now=Date.now()){
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
  const day=`${parts.year}-${parts.month}-${parts.day}`,hour=Number(parts.hour),index=Date.parse(day+'T00:00:00Z')/dayMs;
  return Object.freeze({day,season:seasons[Number(parts.month)-1],weather:weather(index),daylight:hour>=6&&hour<18,hour});
 }
 return Object.freeze({at,labels,seasons});
})();
if(typeof module!=='undefined')module.exports=SeasonWeather;
