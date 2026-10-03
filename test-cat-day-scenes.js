const assert = require('node:assert/strict');
require('./cat-faces.js'); require('./cat-scenes.js'); require('./sleep-flow.js');
const profileBefore = CatFaces.coats.flatMap(c => CatFaces.options.map(e => CatFaces.svg(e.id,c.id)));
const scenesBefore = CatFaces.coats.flatMap(c => ['awake','sleeping'].map(s => CatScenes.svg(s,c.id)));
require('./cat-day-scenes.js');
const patterns = new Set();
for (const coat of CatFaces.coats) for (const scene of DayCats.options) {
  const svg = DayCats.svg(scene.id,coat.id); patterns.add(svg);
  assert(svg.includes(`data-cat-coat="${coat.id}"`));
  assert(svg.includes(`data-day-scene="${scene.id}"`));
  assert(!svg.includes('data-cat-expression'));
}
assert.equal(patterns.size,40);
const at = time => Date.parse(`2026-10-03T${time}:00+09:00`);
for (const time of ['00:00','06:00','11:59','18:00','23:59']) assert.equal(DayCats.current(at(time)),null);
assert.deepEqual(DayCats.current(at('12:00')),DayCats.current(at('13:59')));
assert.notEqual(DayCats.current(at('13:59')).id,DayCats.current(at('14:00')).id);
assert.notEqual(DayCats.current(at('15:59')).id,DayCats.current(at('16:00')).id);
assert.deepEqual(DayCats.current(at('12:00')),DayCats.current(Date.parse('2026-10-03T03:00:00Z')));
const actions = new Set();
for(let day=3;day<8;day++) for(const hour of [12,14,16]) actions.add(DayCats.current(Date.parse(`2026-10-0${day}T${hour}:00:00+09:00`)).id);
assert.equal(actions.size,5);
const stable = DayCats.current(at('12:00'));
delete require.cache[require.resolve('./cat-day-scenes.js')];require('./cat-day-scenes.js');
assert.deepEqual(DayCats.current(at('12:00')),stable,'Reloading the module retains the action');
assert.deepEqual(CatFaces.coats.flatMap(c => CatFaces.options.map(e => CatFaces.svg(e.id,c.id))),profileBefore);
assert.deepEqual(CatFaces.coats.flatMap(c => ['awake','sleeping'].map(s => CatScenes.svg(s,c.id))),scenesBefore);
console.log('PASS daytime cats: 40 separate patterns, JST noon–18:00, stable two-hour actions, five-action rotation, unchanged profile and sleep/wake cats.');
