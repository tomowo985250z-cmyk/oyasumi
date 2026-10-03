const assert = require('node:assert/strict');
require('./tonight-trend.js');
require('./cat-faces.js');
const t=TonightTrend;
const point=(minutes,awake)=>({time:minutes*60000,awake,sleeping:0});
assert.equal(t.classify([],10),'insufficient');
assert.equal(t.classify([point(0,10)],10),'insufficient');
assert.equal(t.classify([point(0,10),point(10,20)],20),'insufficient');
assert.equal(t.classify([point(0,4),point(30,5)],5),'small');
assert.equal(t.classify([point(0,10),point(30,15)],15),'increasing');
assert.equal(t.classify([point(0,20),point(30,10)],10),'decreasing');
assert.equal(t.classify([point(0,10),point(30,11)],11),'steady');
assert.equal(t.classify([point(0,1),point(60,20),point(90,20)],20),'steady','Compare the recent interval, not the whole night');
assert.equal(t.classify([point(0,10),point(30,10)],null),'insufficient');
assert(!t.chart([]).includes('<svg'));
assert(t.chart([point(0,0)]).includes('<circle'));
assert(!t.chart([point(0,0),point(30,0)]).includes('NaN'));
assert(!t.chart([point(0,2),point(30,4)]).includes('サンプル'));
const old=t.messages.steady;t.messages.steady='変更テスト';assert.equal(t.comment([point(0,10),point(30,10)],10),'変更テスト');t.messages.steady=old;
const cats=new Set();
for(const coat of CatFaces.coats)for(const expression of CatFaces.options){
  const svg=CatFaces.svg(expression.id,coat.id);
  assert(svg.includes(`data-cat-coat="${coat.id}"`));assert(svg.includes(`data-cat-expression="${expression.id}"`));
  assert(!svg.includes('<image'));assert(!svg.includes('cat.svg'));cats.add(svg);
}
assert.equal(cats.size,40);
assert.equal(CatFaces.normalizeCoat('<script>'),'calico');
assert.equal(CatFaces.normalize('<script>'),'calm');
console.log('PASS trend logic: five comments, observation gaps, recent comparison, editable copy, empty/zero graphs and 40 distinct SVG cats.');
