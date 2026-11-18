// Rebuild only the original piano voicing data from the existing Public Domain scores.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),root=path.resolve(__dirname,'../..'),sources=require('./source-scores.json'),audit=require('./arrangement.json'),catalog=require('../../assets/piano-v1/catalog.json'),round=n=>Math.round(n*1e6)/1e6;
for(const t of catalog.tracks){const s=sources.find(s=>s.id===t.id),v=audit.find(a=>a.id===t.id),upper=new Map();for(const e of s.events.filter(e=>e.sourceTrack===1))upper.set(e.at,Math.max(upper.get(e.at)||0,e.midi));const notes=[],groups=new Map();
 for(const e of s.events){const melody=e.sourceTrack===1&&e.midi===upper.get(e.at),bass=!melody&&((t.id==='air-g-string'?e.sourceTrack===4:e.sourceTrack===2)&&e.midi<58),role=melody?0:bass?1:2;let midi=e.midi;if(!melody){while(midi<(bass?45:53))midi+=12;while(midi>(bass?57:72))midi-=12;}
  const at=round(e.at*v.timeScale),duration=round(e.duration*v.timeScale),shape=.94+.045*Math.sin(Math.PI*at/t.loopEnd)**2,velocity=round(e.velocity*shape*(role===0?.70:role===1?.57:.44)),note=[at,midi,duration,velocity,role],key=at+':'+midi,previous=groups.get(key);
  if(previous){if(role<previous[4])previous.splice(0,5,...note);else if(role===previous[4]){previous[2]=Math.max(previous[2],duration);previous[3]=Math.max(previous[3],velocity);}}else{groups.set(key,note);notes.push(note);}
 }
 notes.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const old=JSON.parse(fs.readFileSync(path.join(root,t.url),'utf8')),score={id:t.id,title:t.title,seconds:t.loopEnd,phraseSeconds:old.phraseSeconds,notes};
 if(process.argv.includes('--check'))assert.deepEqual(score,old,t.id+' piano score is stale');else fs.writeFileSync(path.join(root,t.url),JSON.stringify(score)+'\n');
}
console.log('PASS all five piano voicings reproducible from retained score inputs');
