const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const source=fs.readFileSync('night-cats.js','utf8'),load=()=>{const context={Date,CatFaces:{normalizeCoat:coat=>coat},CatScenes:{svg:(scene,coat)=>`${scene}/${coat}`}};vm.runInNewContext(source,context);return context.NightCats;};
const cats=load(),reloaded=load(),start=Date.parse('2026-10-15T18:00:00+09:00');
const counts={seated:0,curl:0,stretch:0,window:0};
for(let identity=0;identity<100;identity++)for(let slot=0;slot<500;slot++){
 const at=start+Math.floor(slot/48)*86400000+slot%48*cats.interval,user='cat-'+identity;
 const before=cats.at(at,user),after=reloaded.at(at+cats.interval-1,user);
 assert.equal(before.pose,after.pose);assert.equal(before.key,after.key);
 if(slot<5)counts[before.pose]++;
}
assert.deepEqual(counts,{seated:200,curl:100,stretch:100,window:100});
const time=value=>Date.parse('2026-10-'+value+'+09:00');
assert(cats.at(time('16T05:59:59.999')));assert.equal(cats.at(time('16T06:00:00')),null);assert.equal(cats.at(time('15T17:59:59.999')),null);assert(cats.at(time('15T18:00:00')));
assert.equal(cats.at(time('15T23:59:59.999'),'one').night,cats.at(time('16T00:00:00'),'one').night);
for(const entry of JSON.parse(fs.readFileSync('assets/night-gestures-v1/manifest.json','utf8'))){
 const bytes=fs.readFileSync(entry.file);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),entry.sha256);
 let at=start;while(cats.at(at,'identity').pose!==entry.pose)at+=cats.interval;
 const frame=cats.frame(entry.coat,at,'identity','awake',true,false);
 assert(frame.html.includes(entry.file));assert.equal(frame.pose,entry.pose);
 assert.equal(cats.frame(entry.coat,at,'identity','sleep',true,false),null);
 assert.equal(cats.frame(entry.coat,at,'identity','awake',false,false),null);
 assert.equal(cats.frame(entry.coat,at,'identity','awake',true,true),null);
 assert(entry.visible.left>=0&&entry.visible.right<=400&&entry.visible.top>=0&&entry.visible.bottom<=330);
 assert.equal(entry.visible.bottom,{curl:251,stretch:277,window:161}[entry.pose]);
}
console.log('PASS night cats: deterministic reloads over 50,000 time/identity samples; 40/20/20/20, midnight, 06:00/18:00, sleep/day/profile exclusions, 48 image hashes and contact bounds.');
