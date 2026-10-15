const assert=require('node:assert/strict');require('./roof-cats.js');require('./season-landscape.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const attributes=svg=>({transform:svg.match(/ transform="translate\(([^ ]+) ([^)]+)\) scale\(([^)]+)\)"/).slice(1).map(Number),phase:svg.match(/data-moon-phase="([^"]+)"/)[1],path:svg.match(/<path d="([^"]+)" transform="([^"]+)"/).slice(1)});
for(let minute=0;minute<=1440;minute++){
 const now=Date.parse('2026-10-13T18:00:00+09:00')+minute*60000,r=attributes(RoofMoon.svg(now)),w=attributes(RoofMoon.svg(now,'window'));
 assert.equal(r.phase,w.phase);assert.deepEqual(r.path,w.path);
 near(w.transform[0],117+(r.transform[0]-194.5)*2);near(w.transform[1],43+(r.transform[1]-26)*.65);near(w.transform[2]/r.transform[2],12/7.5);
 const [x,y,size]=w.transform;assert(x-size*14/12>90&&x+size*14/12<150);assert(y-size*14/12>18&&y+size*14/12<70);
}
const epoch=Date.parse('2000-01-06T18:14:00Z'),cycle=29.530588853*86400000;
for(const phase of [0,.125,.25,.5,.75,.875,1]){
 const now=epoch+phase*cycle;assert.deepEqual(attributes(RoofMoon.svg(now)).path,attributes(RoofMoon.svg(now,'window')).path);
 const art=SeasonLandscape.art({daylight:false,day:'test'},'window',now),moon=RoofMoon.svg(now,'window');
 // Each SVG instance needs its own mask ID; compare the rendered geometry.
 assert.deepEqual(attributes(art),attributes(moon));
 assert(art.includes('data-moon-renderer="lit-mask-v2"'));
}
console.log('PASS shared moon: identical phase/shape and normalized size/trajectory, full-day window bounds and room renderer uses the shared clock input');
