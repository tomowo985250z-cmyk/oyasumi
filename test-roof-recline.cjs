const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
require('./wild-cat-assets.js');require('./cat-faces.js');require('./cat-scenes.js');require('./sleep-flow.js');require('./cat-day-scenes.js');require('./roof-cats.js');require('./cat-image-assets.js');require('./roof-recline.js');
const manifest=JSON.parse(fs.readFileSync('assets/roof-recline-v1/manifest.json','utf8'));
assert.deepEqual(manifest.map(x=>x.coat).sort(),CatFaces.coats.map(x=>x.id).sort());
for(const entry of manifest){const png=fs.readFileSync(entry.file);assert.equal(crypto.createHash('sha256').update(png).digest('hex'),entry.sha256);assert.equal(png[25],6);assert.equal(png.readUInt32BE(16),entry.reclining[0]);assert.equal(png.readUInt32BE(20),entry.reclining[1]);}
for(const {id:coat} of CatFaces.coats)for(const count of [0,1,2,3]){
 let total=0,lying=0;
 for(let d=15;d<19;d++){
  const night=`2026-10-${d}`,plan=RoofRecline.plan(Array(count).fill(coat),count,night);assert.equal(plan.length,count);
  assert(plan.filter(c=>c.reclining).length<=1);const repeat=RoofRecline.plan(Array(count).fill(coat),count,night);assert.deepEqual(plan,repeat);
  for(let i=0;i<plan.length;i++){const c=plan[i];assert.equal(c.coat,coat);assert(c.left>=0&&c.left+c.width<=182.001);assert(c.top>=0&&c.top+c.height<=110);if(i)assert(c.left>=plan[i-1].left+plan[i-1].width);
   assert.equal(c.width,c.reclining?(count===3?70:78):68*.765);assert(Math.abs(c.contact-RoofRecline.ridge(c.left+c.width/2)-(c.reclining?18:12))<1e-9);
  }
  const html=RoofRecline.group(Array(count).fill(coat),count,night);assert.equal((html.match(/<img /g)||[]).length,count);total+=count;lying+=plan.filter(c=>c.reclining).length;
 }
 if(total)assert.equal(lying/total,.25);
}
console.log('PASS reclining rooftop cats: 16 RGBA hashes, all coats/0–3 cats, stable exact 25% four-night selection, at most one reclining, approved sizes/spacing and roof-plane contacts.');
