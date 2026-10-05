const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),cp=require('node:child_process');
require('./wild-cat-assets.js');require('./cat-faces.js');require('./cat-scenes.js');require('./cat-day-scenes.js');
const originals=vm.createContext({});vm.runInContext(cp.execFileSync('git',['show','51da7d2:cat-faces.js'],{encoding:'utf8'}),originals);
for(const coat of originals.CatFaces.coats)for(const expression of CatFaces.options)
 assert.equal(CatFaces.svg(expression.id,coat.id),originals.CatFaces.svg(expression.id,coat.id),'Existing cat artwork remains identical');
assert.equal(CatFaces.coats.length,12);
const paths=new Set();
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
console.log('PASS wild cats: 24 expressions, 20 day actions, versioned individual PNGs, safe normalization, sleep/wake reuse and all 48 original cat faces unchanged.');
