const assert=require('node:assert/strict');
require('./roof-cats.js');require('./sleep-flow.js');
const epoch=Date.parse('2000-01-06T18:14:00Z'),cycle=29.530588853*86400000;
const near=(actual,expected,tolerance=1e-8)=>assert(Math.abs(actual-expected)<tolerance,`${actual} != ${expected}`);
for(const [fraction,light] of [[0,0],[.125,(1-Math.SQRT1_2)/2],[.25,.5],[.5,1],[.75,.5],[.875,(1-Math.SQRT1_2)/2]]){
 const moon=RoofMoon.snapshot(epoch+fraction*cycle);
 near(moon.phase,fraction);near(moon.illumination,light);
 near(RoofMoon.snapshot(epoch+(fraction+1)*cycle).illumination,light);
 assert(RoofMoon.svg(epoch+fraction*cycle).includes(`scale(${fraction<=.5?1:-1} 1)`));
}
near(RoofMoon.snapshot(epoch-cycle/4).illumination,.5);
let previous;
for(let minute=0;minute<=1440;minute++){
 const moon=RoofMoon.snapshot(Date.parse('2026-10-11T18:00:00+09:00')+minute*60000);
 assert(moon.scale>=.9&&moon.scale<=1.15);
 assert(moon.x-7.5*moon.scale>182&&moon.x+7.5*moon.scale<208);
 assert(moon.y-7.5*moon.scale>5&&moon.y+7.5*moon.scale<47);
 if(previous){assert(Math.hypot(moon.x-previous.x,moon.y-previous.y)<.05);assert(Math.abs(moon.scale-previous.scale)<.001);}
 previous=moon;
}
for(const boundary of ['2026-10-12T00:00:00+09:00','2026-10-12T06:00:00+09:00']){
 const at=Date.parse(boundary),before=RoofMoon.snapshot(at-1),after=RoofMoon.snapshot(at);
 assert(Math.abs(before.phase-after.phase)<1e-8,'Moon does not reset at midnight or 06:00');
 assert(Math.hypot(before.x-after.x,before.y-after.y)<1e-5);
}
assert.equal(SleepFlow.night(Date.parse('2026-10-12T05:59:59.999+09:00')),'2026-10-11');
assert.equal(SleepFlow.night(Date.parse('2026-10-12T06:00:00+09:00')),'2026-10-12');
console.log('PASS moon: new/waxing/quarter/full/waning, 29.53-day cycle, all-day position/size bounds, midnight continuity and 06:00 night boundary.');
