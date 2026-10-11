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
  if (frame === 'day-gaze') {
    const gazeFile = `assets/window-gaze-v1/${coat}.png`;
    const version = crypto.createHash('sha256').update(fs.readFileSync(gazeFile)).digest('hex').slice(0, 16);
    assert(markup.includes(`src="${gazeFile}?v=${version}"`));
    assert(markup.includes('data-cat-pose="window-rear"'));
    assert(markup.includes('data-day-scene="gaze"'));
    paths.add(file); // Preserve the original approved inventory without overwriting it.
    return;
  }
  if (coat === 'manul' && frame === 'face-calm') {
    assert.equal(markup, original.faces.svg('calm', 'manul'));
    assert(markup.includes('assets/wild-cats/manul-faces-calm.png?v='));
    paths.add(file); // The refresh inventory remains intact; this icon uses the original.
    return;
  }
  if (coat === 'manul' && frame.startsWith('face-')) {
    assert(markup.includes(`src="assets/manul-expressions-v2/${frame}.png"`));
    assert(fs.existsSync(`assets/manul-expressions-v2/${frame}.png`));
    paths.add(file);
    return;
  }
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
  for (const count of [1, 2, 3]) for (let index = 0; index < count; index++) {
    const rear = RoofCats.svg(coat, index, count);
    assert(rear.includes(`src="assets/roof-cats-v2/${coat}.png"`));
    assert(rear.includes('data-cat-pose="rear"'));
    const png = fs.readFileSync(`assets/roof-cats-v2/${coat}.png`);
    assert.equal(png.readUInt32BE(16), 1024);
    assert.equal(png.readUInt32BE(20), 1536);
    assert.equal(png[25], 6, 'rear RGBA PNG');
  }
}
assert.equal(paths.size, 208);
const gazeManifest = JSON.parse(fs.readFileSync('assets/window-gaze-v1/manifest.json', 'utf8'));
assert.deepEqual(gazeManifest.map(entry => entry.coat).sort(), CatFaces.coats.map(coat => coat.id).sort());
for (const entry of gazeManifest) {
  const png = fs.readFileSync(entry.file);
  assert.equal(crypto.createHash('sha256').update(png).digest('hex'), entry.sha256);
  assert.equal(png.readUInt32BE(16), png.readUInt32BE(20), 'Square window sprite');
  assert.equal(png[25], 6, 'Window sprite has RGBA transparency');
}
assert(DayCats.svg('gaze', 'invalid').includes('/calico.png?v='));
const rearManifest = JSON.parse(fs.readFileSync('assets/roof-cats-v2/manifest.json', 'utf8'));
assert.deepEqual(rearManifest.map(entry => entry.coat).sort(), CatFaces.coats.map(coat => coat.id).sort());
for (const entry of rearManifest) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(entry.file)).digest('hex'), entry.sha256);
assert(RoofCats.svg('invalid').includes('/calico.png'));
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
console.log('PASS approved images: 16 window-gazing PNG hashes, versions and mappings; all 208 original PNG hashes and other mappings, 16 rooftop images and selection/timing APIs retained.');
