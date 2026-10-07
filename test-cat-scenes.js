const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
require('./wild-cat-assets.js');require('./cat-faces.js');require('./cat-scenes.js');
const before=CatFaces.coats.filter(coat=>!WildCatAssets.isWild(coat.id)).flatMap(c=>CatFaces.options.map(e=>CatFaces.svg(e.id,c.id)));
const scenes=new Set();
// Frozen hashes of the adopted originals; review files are not required in a checkout.
const adoptedWildHashes={
 'black-footed-sleeping':'0e5d612860780f86fc4a754f9a57b4597f63ed18deb922126308ec431d92c932',
 'black-footed-waking':'9edc00522c0ce5dd51bb95c47773c0236f2f5896484ccfba093f37dba0b14d07',
 'fishing-sleeping':'fef7d30e495ba769b30665db9ab3f5e55ad3759797d2a94f95cbb468a52f779b',
 'fishing-waking':'186f8712604ba35f90d91bed2d2ee21b784299e98e304648d9fdd6fb6024c12c',
 'manul-sleeping':'4ae855526bd2b75f0060a1c7c04f8a8404decdcc397111b90bc126c58990ba40',
 'manul-waking':'3854460b63766d140eb33cab6b8e6c4fdaced5de9759de91907d4fb319573227',
 'sand-sleeping':'0969774e942fc6978332814567fa79356fe2826e3188f9df0635f27dafc66b29',
 'sand-waking':'d45e13d77e43470e606e4893068f8820b80a104ab40d0ddaea12952109f64dab'
};
for(const coat of CatFaces.coats.filter(coat=>!CatFaces.isBig(coat.id))){
  for(const scene of ['sleeping','awake']){
    const svg=CatScenes.svg(scene,coat.id);scenes.add(svg);
    assert(svg.includes(`data-cat-coat="${coat.id}"`));assert(svg.includes(`data-cat-scene="${scene}"`));
    assert(!svg.includes('data-cat-expression'));
    const match=svg.match(/href="(assets\/sleep-wake-cats\/[^?]+)\?v=([a-f0-9]{16})"/);
    assert(match,'Each scene must use a versioned dedicated image');
    const png=fs.readFileSync(match[1]);
    assert.equal(crypto.createHash('sha256').update(png).digest('hex').slice(0,16),match[2]);
    assert.equal(png.readUInt32BE(16),png.readUInt32BE(20),'Square image');
    assert.equal(png[25],6,'RGBA transparency');
    if(WildCatAssets.isWild(coat.id))assert.equal(crypto.createHash('sha256').update(png).digest('hex'),adoptedWildHashes[`${coat.id}-${scene==='awake'?'waking':'sleeping'}`],'Adopted wild image is byte-for-byte unchanged');
  }
}
assert.equal(scenes.size,24);assert.equal(CatFaces.options.length,6);
assert.equal(CatScenes.svg('unknown','unknown'),CatScenes.svg('sleeping','calico'));
assert.deepEqual(CatFaces.coats.filter(coat=>!WildCatAssets.isWild(coat.id)).flatMap(c=>CatFaces.options.map(e=>CatFaces.svg(e.id,c.id))),before);
assert.equal(CatScenes.elapsed('2026-10-03T23:00:00+09:00',Date.parse('2026-10-03T23:00:03+09:00')),3000);
assert.equal(CatScenes.elapsed('2026-10-03T23:00:00+09:00',Date.parse('2026-10-03T23:00:08+09:00')),6500);
assert.equal(CatScenes.elapsed('invalid'),6500);
assert.equal(CatScenes.elapsed(undefined),6500);
assert.equal(CatScenes.elapsed('2026-10-03T23:00:00+09:00',Date.parse('2026-10-03T22:00:00+09:00')),0);
console.log('PASS cat scenes: 24 dedicated versioned RGBA images, eight adopted wild images unchanged, preserved profile expressions, safe fallback and 6.5-second timing.');
