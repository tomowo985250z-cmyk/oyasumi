// Absolute JST time determines the room; refreshing never rolls a new state.
globalThis.DayRoomState=(() => {
  const minute=60000;
  const rules=Object.freeze({startHour:12,endHour:18,moveMin:30*minute,moveMax:90*minute,moodMin:10*minute,moodMax:30*minute,awayCountMax:2,awayMin:5*minute,awayMax:15*minute});
  const places=['window','cushion','corner'],poses=['relax','play','groom','doze','gaze'],cache=new Map();
  function hash(text){let value=2166136261;for(const c of text){value^=c.charCodeAt(0);value=Math.imul(value,16777619);}return value>>>0;}
  function random(seed){let value=hash(seed)||1;return()=>{value^=value<<13;value^=value>>>17;value^=value<<5;return(value>>>0)/4294967296;};}
  function dateKey(now){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
  function schedule(now,identity='local-cat'){
    const day=dateKey(now),key=identity+':'+day;if(cache.has(key))return cache.get(key);
    const start=Date.parse(day+'T12:00:00+09:00'),end=Date.parse(day+'T18:00:00+09:00');
    function events(kind,values,min,max){
      const rng=random(key+':'+kind),entries=[];let at=start,index=Math.floor(rng()*values.length);
      while(at<end){entries.push(Object.freeze({at,value:values[index]}));at+=Math.round(min+rng()*(max-min));index=(index+1+Math.floor(rng()*(values.length-1)))%values.length;}
      return Object.freeze(entries);
    }
    const rng=random(key+':away'),count=Math.floor(rng()*3),away=[];
    for(let i=0;i<count;i++){
      const section=(end-start-60*minute)/Math.max(1,count);
      const at=start+30*minute+i*section+rng()*(section-rules.awayMax);
      away.push(Object.freeze({start:Math.round(at),end:Math.round(at+rules.awayMin+rng()*(rules.awayMax-rules.awayMin))}));
    }
    const result=Object.freeze({day,start,end,places:events('place',places,rules.moveMin,rules.moveMax),moods:events('mood',poses,rules.moodMin,rules.moodMax),away:Object.freeze(away)});
    if(cache.size>=8)cache.delete(cache.keys().next().value);cache.set(key,result);return result;
  }
  function at(now=Date.now(),identity='local-cat'){
    const plan=schedule(now,identity),active=now>=plan.start&&now<plan.end;
    const place=plan.places.findLast(event=>event.at<=now)||plan.places[0],mood=plan.moods.findLast(event=>event.at<=now)||plan.moods[0];
    return Object.freeze({day:plan.day,active,place:place.value,pose:mood.value,away:active&&plan.away.some(period=>now>=period.start&&now<period.end)});
  }
  return Object.freeze({rules,schedule,at});
})();
if(typeof module!=='undefined')module.exports=DayRoomState;
