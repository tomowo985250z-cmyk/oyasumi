// Guard musical content and removal of the old transforms, not an aesthetic preset.
const assert=require('node:assert/strict'),crypto=require('node:crypto'),scores=require('./scores.json'),prior=require('../music-box-sleep/scores.json'),{voices}=require('./voices.json'),hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
assert.equal(scores.length,12);assert.equal(new Set(scores.map(s=>s.id)).size,12);
for(const score of scores){const old=prior.find(s=>s.id===score.id),p=voices.find(v=>v.id===score.id);assert(p);assert.equal(score.sourceEventHash,hash(old.events));assert.equal(score.performanceEventHash,hash(score.events));assert.equal(score.events.length,old.events.length);
 for(let i=0;i<score.events.length;i++){const a=score.events[i],b=old.events[i];assert.equal(a.midi,b.midi);assert.equal(a.sourceMidi,b.sourceMidi);assert.equal(a.sourceTrack,b.sourceTrack);assert.equal(a.cadence,b.cadence);assert.equal(a.at,b.at/score.removedTempoScale);assert.equal(a.duration,b.duration/score.removedTempoScale);if(score.id==='clair-de-lune')assert.equal(a.velocity,b.velocity);else{const register=a.midi>=60?.66:a.midi>=48?.36:.23;assert(Math.abs((.25+.75*Math.sqrt(a.velocity))*register-b.velocity)<1e-9);}}
}
assert(scores.find(s=>s.id==='fur-elise').removedTempoScale>1);assert(scores.find(s=>s.id==='twinkle-star').removedTempoScale>1);
console.log('PASS twelve source pitch/chord/event sequences, relative rhythm, recovered source dynamics and removal of the old tempo ceiling.');
