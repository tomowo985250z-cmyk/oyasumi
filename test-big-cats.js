const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),cp=require('node:child_process'),vm=require('node:vm');
require('./wild-cat-assets.js');require('./cat-faces.js');require('./cat-scenes.js');require('./cat-day-scenes.js');require('./roof-cats.js');
const baseline=vm.createContext({WildCatAssets});
vm.runInContext(cp.execFileSync('git',['show','HEAD:cat-faces.js'],{encoding:'utf8'}),baseline);
assert.deepEqual(CatFaces.groups.map(g=>[g.label,g.coats.length]),[['基本猫',8],['野生猫',4],['大ねこ',4]]);
for(const coat of baseline.CatFaces.coats)for(const expression of CatFaces.options)
 assert.equal(CatFaces.svg(expression.id,coat.id),baseline.CatFaces.svg(expression.id,coat.id),'Existing faces unchanged');
for(const dir of ['domestic-cats','wild-cats'])for(const file of fs.readdirSync('assets/'+dir).filter(f=>f.endsWith('.png')))
 assert.deepEqual(fs.readFileSync(`assets/${dir}/${file}`),cp.execFileSync('git',['show',`HEAD:assets/${dir}/${file}`],{maxBuffer:16*1024*1024}),'Existing image bytes unchanged');
const paths=new Set();
for(const coat of CatFaces.groups.find(g=>g.id==='big').coats){
 assert.equal(CatFaces.normalizeCoat(coat.id),coat.id);
 assert(CatFaces.palette(coat.id).fur);
 for(const expression of CatFaces.options){
  const svg=CatFaces.svg(expression.id,coat.id),match=svg.match(/href="(assets\/big-cats\/[^?]+)\?v=([a-f0-9]{16})"/);
  assert(match);paths.add(match[1]);
  const png=fs.readFileSync(match[1]);
  assert.equal(png.readUInt32BE(16),1254);assert.equal(png.readUInt32BE(20),1254);assert.equal(png[25],6);
  assert.equal(crypto.createHash('sha256').update(png).digest('hex').slice(0,16),match[2]);
  assert(svg.includes('preserveAspectRatio="xMidYMid meet"'));assert(svg.includes(`data-cat-expression="${expression.id}"`));
 }
 for(const scene of ['sleeping','awake'])assert(CatScenes.svg(scene,coat.id).includes('assets/sleep-wake-cats/'));
 for(const scene of DayCats.options)assert(DayCats.svg(scene.id,coat.id).includes('assets/day-cats/'));
 assert(!CatFaces.headMarkup(coat.id).includes('undefined'));
 assert(RoofCats.svg(coat.id,0,1).includes(`data-cat-coat="${coat.id}"`));
}
assert.equal(paths.size,24);
console.log('PASS big cats: 3 categories, 24 versioned RGBA faces, 6 expressions, dedicated scenes and unchanged basic/wild images/rendering.');
