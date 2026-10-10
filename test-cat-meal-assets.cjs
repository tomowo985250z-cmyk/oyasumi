const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
require('./wild-cat-assets.js');require('./cat-faces.js');require('./sleep-flow.js');
globalThis.NightClock={now:()=>Date.parse('2026-10-10T14:00:00+09:00')};
require('./cat-meal-assets.js');require('./cat-care.js');
const manifest=JSON.parse(fs.readFileSync('assets/cat-meals-v1/manifest.json','utf8'));
assert.equal(manifest.length,96);assert.equal(new Set(manifest.map(a=>a.file)).size,96);
for(const {id:coat} of CatFaces.coats){
 const entries=manifest.filter(a=>a.coat===coat);
 assert.deepEqual(entries.map(a=>a.id).sort(),['after-1','after-2','after-3','before-1','before-2','before-3']);
 for(const entry of entries){
  assert.equal(entry.file,`assets/cat-meals-v1/${coat}/${entry.id}.png`);
  const png=fs.readFileSync(entry.file),sha=crypto.createHash('sha256').update(png).digest('hex');
  assert.equal(sha,entry.sha256);assert.equal(png.readUInt32BE(16),png.readUInt32BE(20));assert.equal(png[25],6);
  const [group,index]=entry.id.split('-');assert.equal(CatMealAssets.src(coat,group,index),entry.file+'?v='+sha.slice(0,16));
 }
 for(const kind of ['meal','treat'])for(const before of [1,2,3])for(const after of [1,2,3]){
  const html=CatCare.visual(coat,kind,{before,after});
  assert(html.includes(`src="${CatMealAssets.src(coat,'before',before)}"`));
  assert(html.includes(`src="${CatMealAssets.src(coat,'after',after)}"`));
  assert.equal((html.match(new RegExp(`src="assets/cat-refresh-v1/${coat}/day-relax.png"`,'g'))||[]).length,2,'Chewing artwork retained');
 }
 const status={day:CatCare.day(NightClock.now()),mealEligible:true,mealDone:false,treatGiven:false,receivedToday:0,receivedTotal:0};
 const before=CatCare.markup(status,coat,null,true),after=CatCare.markup({...status,mealDone:true},coat,null,true);
 assert.equal(before.match(/data-care-after="(\d)"/)[1],after.match(/data-care-after="(\d)"/)[1]);
 assert(after.includes('class="care-scene care-finished"'));assert(!before.includes('class="care-scene care-finished"'));
 assert(!CatCare.markup({...status,day:'2026-10-09',mealDone:true},coat,null,true).includes('class="care-scene care-finished"'),'Stale completion must reset');
}
assert(CatMealAssets.src('invalid','invalid',99).includes('/calico/before-1.png?v='));
assert.equal(CatCare.durationMs,6000);
console.log('PASS 96 approved meal PNG hashes, all references/version hashes, 288 expression/food pairs, stable saved expressions, midnight reset, original chewing artwork and six-second duration');
