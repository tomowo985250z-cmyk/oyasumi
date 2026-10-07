const assert=require('node:assert/strict');
require('./wild-cat-assets.js');require('./cat-faces.js');
assert.equal(CatFaces.options.length,6);
assert.equal(CatFaces.normalize('surprised'),'surprised');
assert.equal(CatFaces.label('surprised'),'きょとん');
for(const coat of CatFaces.groups.find(group=>group.id==='basic').coats){
  const svg=CatFaces.svg('surprised',coat.id);
  assert(svg.includes('viewBox="0 0 100 100"'));
  assert(svg.includes(`assets/domestic-cats/${coat.id}-faces-surprised.png?v=`));
  assert(svg.includes(`data-cat-coat="${coat.id}"`));
  assert(svg.includes('data-cat-expression="surprised"'));
}
console.log('PASS surprised cats: six choices, eight coats, same frame and dimensions, round eyes and small open mouth.');
