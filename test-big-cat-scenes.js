const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),cp=require('node:child_process'),vm=require('node:vm');
require('./wild-cat-assets.js');require('./cat-faces.js');require('./sleep-flow.js');require('./cat-scenes.js');require('./cat-day-scenes.js');require('./cat-coat-cooldown.js');
const baseline=vm.createContext({CatFaces,WildCatAssets,SleepFlow});
for(const file of ['cat-scenes.js','cat-day-scenes.js'])vm.runInContext(cp.execFileSync('git',['show','1291f93:'+file],{encoding:'utf8'}),baseline);
let count=0;
for(const coat of CatFaces.coats){
 for(const [renderer,actions] of [[CatScenes,['sleeping','awake']],[DayCats,DayCats.options.map(x=>x.id)]]){
  for(const action of actions){
   const markup=renderer.svg(action,coat.id);
   if(!CatFaces.isBig(coat.id)){
    assert.equal(markup,baseline[renderer===CatScenes?'CatScenes':'DayCats'].svg(action,coat.id));
    continue;
   }
   const match=markup.match(/(?:href|src)="(assets\/[^?]+)\?v=([a-f0-9]{16})"/);assert(match);
   const bytes=fs.readFileSync(match[1]);assert.equal(bytes.readUInt32BE(16),1254);assert.equal(bytes.readUInt32BE(20),1254);assert.equal(bytes[25],6);
   assert.equal(crypto.createHash('sha256').update(bytes).digest('hex').slice(0,16),match[2]);count++;
  }
 }
}
for(const dir of ['sleep-wake-cats','day-cats'])for(const file of cp.execFileSync('git',['ls-tree','--name-only','1291f93:assets/'+dir],{encoding:'utf8'}).trim().split('\n').filter(x=>x.endsWith('.png')))
 assert.deepEqual(fs.readFileSync(`assets/${dir}/${file}`),cp.execFileSync('git',['show',`1291f93:assets/${dir}/${file}`],{maxBuffer:16*1024*1024}));
assert.equal(count,28);assert.equal(CatScenes.settleDurationMs,6500);assert.deepEqual(DayCats.rules,{startHour:12,endHour:18,intervalHours:2});
assert(CatCoatCooldown.available({nextChangeAt:null,temporarilyUnlocked:true},Date.now()));
assert(CatCoatCooldown.message({nextChangeAt:null,temporarilyUnlocked:true},Date.now()).includes('一時解除中'));
assert(!CatCoatCooldown.available(null,Date.now()));
console.log('PASS big cat scenes: 28 dedicated versioned RGBA assets, existing scene bytes/rendering unchanged, original timing and temporary-state copy.');
