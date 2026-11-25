const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
require(path.join(root,'wild-cat-assets.js'));require(path.join(root,'cat-faces.js'));require(path.join(root,'roof-recline.js'));
const source=fs.readFileSync(path.join(root,'roof-recline.js'),'utf8');
for(const m of JSON.parse(fs.readFileSync(path.join(root,'assets/roof-poses-v1/manifest.json')))){
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,m.file))).digest('hex'),m.sha256);
 assert(source.includes(m.sha256.slice(0,16)),m.id+' content version');
}
const counts={},categories={basic:0,wild:0,big:0};let total=0,reclining=0;
for(let d=0;d<1461;d++){
 const night=new Date(Date.UTC(2026,0,1+d)).toISOString().slice(0,10),plan=RoofRecline.plan([],6,night);
 assert.deepEqual(RoofRecline.plan([],6,night),plan,'Stable nightly selection');
 assert.equal(new Set(plan.map(c=>c.coat)).size,6,'No duplicate coats for these seeded nights');
 for(const c of plan){
  total++;reclining+=+c.reclining;
  categories[CatFaces.groups.find(g=>g.coats.some(x=>x.id===c.coat)).id]++;
  const key=c.pose||c.coat+(c.reclining?'/recline':'/rear');counts[key]=(counts[key]||0)+1;
  if(c.pose)assert(!c.reclining&&(c.pose==='loaf'?c.coat==='calico':c.coat==='gray'));
 }
}
const normal=CatFaces.groups.find(g=>g.id==='basic').coats.map(c=>counts[c.id+'/rear']||0),average=normal.reduce((a,b)=>a+b)/normal.length;
console.log({total,reclining,categories,loaf:counts.loaf,sideSit:counts['side-sit'],ordinarySeatedAverage:average});
for(const pose of ['loaf','side-sit'])assert(counts[pose]>average*.7&&counts[pose]<average*1.3,pose+' must enter the ordinary seated candidate pool at comparable frequency');
assert(Math.abs(reclining/total-.25)<.001);
for(const [group,rate] of [['basic',.85],['wild',.12],['big',.03]])assert(Math.abs(categories[group]/total-rate)<.015);
for(const width of [190,230,280,330])for(let d=0;d<365;d++){
 const night=new Date(Date.UTC(2026,0,1+d)).toISOString().slice(0,10),count=RoofRecline.capacity(width,night),plan=RoofRecline.plan([],count,night,width);
 assert.equal(plan.length,count);assert(plan.at(-1).left+plan.at(-1).width-plan[0].left<=width+16.001);
 for(let i=1;i<plan.length;i++)assert(plan[i].left>=plan[i-1].left+plan[i-1].width+5.999);
}
console.log('PASS ordinary candidate frequency, 85/12/3 categories, 25% reclining, deterministic selection, capacity, spacing and asset versions.');
