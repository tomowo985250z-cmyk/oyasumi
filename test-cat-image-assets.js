const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
require('./wild-cat-assets.js');
require('./cat-faces.js');
require('./cat-scenes.js');
require('./sleep-flow.js');
require('./cat-day-scenes.js');
require('./roof-cats.js');
const original = {faces: CatFaces, scenes: CatScenes, day: DayCats};
require('./cat-image-assets.js');
assert.equal(CatFaces.coats, original.faces.coats);
assert.equal(CatFaces.options, original.faces.options);
assert.equal(CatFaces.normalizeCoat, original.faces.normalizeCoat);
assert.equal(DayCats.current, original.day.current);
assert.equal(DayCats.rules, original.day.rules);
assert.equal(CatScenes.elapsed, original.scenes.elapsed);
assert.equal(CatScenes.settleDurationMs, original.scenes.settleDurationMs);
const manifest = JSON.parse(fs.readFileSync('assets/cat-refresh-v1/manifest.json', 'utf8').replace(/^\uFEFF/, ''));
assert.equal(manifest.length, 208);
const paths = new Set();
function check(markup, coat, frame) {
  const file = `assets/cat-refresh-v1/${coat}/${frame}.png`;
  assert(markup.includes(`src="${file}"`));
  assert(markup.includes(`data-asset-key="${coat}/${frame}"`));
  assert(markup.startsWith('<img '));
  paths.add(file);
}
for (const {id: coat} of CatFaces.coats) {
  for (const {id: expression} of CatFaces.options) check(CatFaces.svg(expression, coat), coat, 'face-' + expression);
  check(CatScenes.svg('awake', coat), coat, 'morning');
  check(CatScenes.svg('sleeping', coat), coat, 'night');
  for (const {id: pose} of DayCats.options) check(DayCats.svg(pose, coat), coat, 'day-' + pose);
  check(RoofCats.svg(coat, 0, 3), coat, 'morning');
}
assert.equal(paths.size, 208);
for (const entry of manifest) {
  assert(paths.has(entry.file));
  const png = fs.readFileSync(entry.file);
  assert.equal(png.readUInt32BE(16), 1254);
  assert.equal(png.readUInt32BE(20), 1254);
  assert.equal(png[25], 6, 'RGBA PNG');
  assert.equal(crypto.createHash('sha256').update(png).digest('hex'), entry.sha256.toLowerCase());
}
assert(CatFaces.svg('invalid', 'invalid').includes('/calico/face-calm.png'));
assert(DayCats.svg('invalid', 'invalid').includes('/calico/day-relax.png'));
console.log('PASS approved images: all 208 PNG hashes, dimensions, mappings, fallbacks; original selection rules and timing APIs retained.');
