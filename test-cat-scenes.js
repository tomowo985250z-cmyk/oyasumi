const assert=require('node:assert/strict');
require('./wild-cat-assets.js');require('./cat-faces.js');require('./cat-scenes.js');
const before=CatFaces.coats.filter(coat=>!WildCatAssets.isWild(coat.id)).flatMap(c=>CatFaces.options.map(e=>CatFaces.svg(e.id,c.id)));
const scenes=new Set();
for(const coat of CatFaces.coats.filter(coat=>!WildCatAssets.isWild(coat.id))){
  for(const scene of ['sleeping','awake']){
    const svg=CatScenes.svg(scene,coat.id);scenes.add(svg);
    assert(svg.includes(`data-cat-coat="${coat.id}"`));assert(svg.includes(`data-cat-scene="${scene}"`));
    assert(!svg.includes('data-cat-expression'));
    if(scene==='awake')assert(svg.includes('data-awake-eyes'),'Every coat must have open eyes');
  }
}
assert.equal(scenes.size,16);assert.equal(CatFaces.options.length,6);
assert.deepEqual(CatFaces.coats.filter(coat=>!WildCatAssets.isWild(coat.id)).flatMap(c=>CatFaces.options.map(e=>CatFaces.svg(e.id,c.id))),before);
assert.equal(CatScenes.elapsed('2026-10-03T23:00:00+09:00',Date.parse('2026-10-03T23:00:03+09:00')),3000);
assert.equal(CatScenes.elapsed('2026-10-03T23:00:00+09:00',Date.parse('2026-10-03T23:00:08+09:00')),6500);
assert.equal(CatScenes.elapsed('invalid'),6500);
assert.equal(CatScenes.elapsed(undefined),6500);
assert.equal(CatScenes.elapsed('2026-10-03T23:00:00+09:00',Date.parse('2026-10-03T22:00:00+09:00')),0);
console.log('PASS cat scenes: 16 separate scene SVGs, eight coats with open eyes, six separate profile expressions and 6.5-second ending timing.');
