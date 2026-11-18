// Original octave voicing of the existing score; no imported arrangement or audio.
const crypto=require('node:crypto');
const hash=events=>crypto.createHash('sha256').update(JSON.stringify(events)).digest('hex');
function arrange(source,p){
 const groups=new Map(),events=source.events.map(e=>({...e}));
 for(const e of events){const key=e.at;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(e);}
 const previous=new Map();
 for(const group of [...groups.values()].sort((a,b)=>a[0].at-b[0].at)){
  const upper=group.filter(e=>e.sourceTrack===1),top=Math.max(...upper.map(e=>e.midi));
  const occupied=new Set();
  for(const e of upper){
   // Keep the upper voice and its intervals intact, including ornaments and cadences.
   e.role='melody';occupied.add(e.midi);
   if(e.midi<top-4&&e.midi<p.melodyFloor)e.role='inner';
  }
  const lower=group.filter(e=>e.sourceTrack!==1).sort((a,b)=>a.midi-b.midi);
  for(const e of lower){
   const original=e.midi,bass=original<53||(source.id==='air-g-string'&&e.sourceTrack===4);
   e.role=bass?'bass':'harmony';
   const low=bass?p.arrangement.bassFloor:p.arrangement.harmonyFloor,high=bass?60:76;
   const candidates=[];for(let midi=original-48;midi<=original+48;midi+=12)if(midi>=low&&midi<=high)candidates.push(midi);
   const last=previous.get(e.sourceTrack),cost=midi=>Math.abs(midi-original)*.35+(last==null?0:Math.abs(midi-last)*.22)+[...occupied].reduce((n,k)=>n+(k===midi?16:Math.abs(k-midi)<3?7:0),0)+(Number.isFinite(top)&&midi>=top?10:0);
   e.midi=candidates.sort((a,b)=>cost(a)-cost(b)||a-b)[0];
   if(!Number.isInteger(e.midi))throw Error('Unvoiced note');
   previous.set(e.sourceTrack,e.midi);occupied.add(e.midi);
   e.velocity*=bass?p.arrangement.bassGain:p.arrangement.harmonyGain;
  }
 }
 // Octave folding can make unisons. One tine carries that onset without a doubled hit.
 const result=[],seen=new Map();
 for(const e of events){const key=e.at+':'+e.midi,prior=seen.get(key);if(prior){prior.velocity=Math.max(prior.velocity,e.velocity);prior.duration=Math.max(prior.duration,e.duration);if(e.role==='melody')Object.assign(prior,{role:e.role,sourceTrack:e.sourceTrack});}else{seen.set(key,e);result.push(e);}}
 return {...source,events:result,sourceEventHash:source.sourceEventHash,arrangementInputHash:hash(source.events),arrangementEventHash:hash(result),arrangementStats:{inputNotes:events.length,notes:result.length,octaveMoves:events.filter((e,i)=>e.midi!==source.events[i].midi).length,mergedUnisons:events.length-result.length}};
}
module.exports=arrange;
