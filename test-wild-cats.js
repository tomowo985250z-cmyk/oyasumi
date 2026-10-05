const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),cp=require('node:child_process');
require('./wild-cat-assets.js');require('./cat-faces.js');require('./cat-scenes.js');require('./cat-day-scenes.js');
const originals=vm.createContext({});vm.runInContext(cp.execFileSync('git',['show','51da7d2:cat-faces.js'],{encoding:'utf8'}),originals);
for(const coat of originals.CatFaces.coats)for(const expression of CatFaces.options){
 const svg=CatFaces.svg(expression.id,coat.id);
 assert(svg.includes(`assets/domestic-cats/${coat.id}-faces-${expression.id}.png?v=`),'Approved domestic artwork');
}
assert.equal(CatFaces.coats.length,12);
const paths=new Set();
const crypto=require('node:crypto');
for(const coat of originals.CatFaces.coats){
 assert.equal(CatFaces.baseMarkup(coat.id),originals.CatFaces.baseMarkup(coat.id),'Sleep/wake base art unchanged');
 for(const expression of CatFaces.options){
  const svg=CatFaces.svg(expression.id,coat.id);
  const match=svg.match(/href="(assets\/domestic-cats\/[^?]+)\?v=([a-f0-9]{16})"/);
  assert(match,'Versioned domestic image');const png=fs.readFileSync(match[1]);
  assert.equal(png.readUInt32BE(16),512);assert.equal(png.readUInt32BE(20),512);
  assert.equal(crypto.createHash('sha256').update(png).digest('hex').slice(0,16),match[2]);
 }
}
for(const file of fs.readdirSync('assets/wild-cats').filter(f=>f.endsWith('.png')))
 assert.deepEqual(fs.readFileSync('assets/wild-cats/'+file),cp.execFileSync('git',['show','HEAD:assets/wild-cats/'+file],{maxBuffer:16*1024*1024}),'Wild artwork unchanged');
for(const cat of WildCatAssets.species){
 assert.equal(CatFaces.normalizeCoat(cat.id),cat.id);
 for(const expression of CatFaces.options){const svg=CatFaces.svg(expression.id,cat.id);assert(svg.includes(`data-cat-expression="${expression.id}"`));check(svg);}
 for(const action of DayCats.options){const svg=DayCats.svg(action.id,cat.id);assert(svg.includes(`data-day-scene="${action.id}"`));check(svg);}
 for(const scene of ['awake','sleeping'])assert(CatScenes.svg(scene,cat.id).includes(`data-cat-coat="${cat.id}"`));
}
function check(svg){
 const match=svg.match(/href="(assets\/wild-cats\/[^?]+)\?v=([a-f0-9]{16})"/);assert(match,'Versioned cropped image');paths.add(match[1]);
 const png=fs.readFileSync(match[1]);assert.equal(png.subarray(1,4).toString(),'PNG');assert(png.readUInt32BE(16)>=180);assert(png.readUInt32BE(20)>=180);
}
assert.equal(paths.size,44);
console.log('PASS wild cats: 24 expressions, 20 day actions, versioned individual PNGs, safe normalization, sleep/wake reuse and all 48 domestic faces available.');
