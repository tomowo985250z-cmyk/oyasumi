const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const state=require('./room-state.js'),rules=state.rules;
const source=fs.readFileSync(require.resolve('./room-state.js'),'utf8');
let minMove=Infinity,maxMove=0,minMood=Infinity,maxMood=0,minAway=Infinity,maxAway=0,totalAway=0;
const counts=new Set();
for(let day=0;day<366;day++)for(const identity of ['cat-one','cat-two','00000000-0000-0000-0000-000000000001']){
 const now=Date.parse('2026-10-10T14:00:00+09:00')+day*86400000,plan=state.schedule(now,identity);
 for(const [events,min,max,kind] of [[plan.places,rules.moveMin,rules.moveMax,'place'],[plan.moods,rules.moodMin,rules.moodMax,'mood']])for(let i=1;i<events.length;i++){
  const gap=events[i].at-events[i-1].at;assert(gap>=min&&gap<=max);assert.notEqual(events[i].value,events[i-1].value);
  if(kind==='place'){minMove=Math.min(minMove,gap);maxMove=Math.max(maxMove,gap);}else{minMood=Math.min(minMood,gap);maxMood=Math.max(maxMood,gap);}
 }
 assert(plan.away.length<=2);counts.add(plan.away.length);totalAway+=plan.away.length;
 for(const span of plan.away){const duration=span.end-span.start;assert(duration>=rules.awayMin&&duration<=rules.awayMax);assert(span.start>=plan.start&&span.end<=plan.end);minAway=Math.min(minAway,duration);maxAway=Math.max(maxAway,duration);
  assert.equal(state.at(span.start-1,identity).away,false);assert.equal(state.at(span.start,identity).away,true);assert.equal(state.at(span.end-1,identity).away,true);assert.equal(state.at(span.end,identity).away,false);
 }
 assert.equal(state.at(plan.start-1,identity).active,false);assert.equal(state.at(plan.start,identity).active,true);assert.equal(state.at(plan.end,identity).active,false);
 const sandbox={module:{exports:{}},Intl,Date,Object,Map,Math};vm.runInNewContext(source,sandbox);
 assert.equal(JSON.stringify(sandbox.module.exports.schedule(now,identity)),JSON.stringify(plan),'A fresh process produces the same entire day');
 assert.equal(JSON.stringify(sandbox.module.exports.at(now,identity)),JSON.stringify(state.at(now,identity)));
}
assert.deepEqual([...counts].sort(),[0,1,2]);
const report={days:366,identities:3,cases:1098,totalAway,awayCounts:[...counts].sort(),placeRangeMinutes:[minMove/60000,maxMove/60000],moodRangeMinutes:[minMood/60000,maxMood/60000],absenceRangeMinutes:[minAway/60000,maxAway/60000],restartDeterministic:true,timezone:'Asia/Tokyo'};
fs.writeFileSync(require('node:path').join(__dirname,'state-report.json'),JSON.stringify(report,null,2));console.log('PASS deterministic room schedule',report);
