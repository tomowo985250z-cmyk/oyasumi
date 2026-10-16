const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{execFileSync,spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),original=path.resolve(root,'../..'),out=path.join(root,'output/solar-light-release');
const release=JSON.parse(fs.readFileSync(path.join(root,'release.json'),'utf8')).release,lockFile=path.join(out,'baseline-lock.json'),lock=JSON.parse(fs.readFileSync(lockFile,'utf8'));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const [file,expected] of Object.entries(lock.rootFiles))assert.equal(hash(fs.readFileSync(path.join(original,file))),expected,'Preserve original pending work: '+file);
assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),lock.commit,'Release baseline');
const changed=execFileSync('git',['diff','--name-only','HEAD'],{cwd:root,encoding:'utf8'}).trim().split('\n');
assert(!changed.some(f=>/^(?:assets|supabase)\//.test(f)),'Preserve original images and database sources');
const summaries=[],reports=[];
for(const engine of ['edge','webkit']){
 const files=[`output/solar-light-release/local-${engine}/report.json`,`output/solar-light-release/local-${engine}/transitions.json`,`output/room-cat-scale/local-${engine}/report.json`,`output/cat-meal-motion/local-${engine}/report.json`,`output/indoor-cat-review/continuity-${engine}/report.json`,`output/cat-places-production/local-${engine}/report.json`,`output/countryside-backgrounds/transition-paint-${engine}/report.json`,`output/home-post-choices-v1/local-${engine}/report.json`,`output/cat-meal-controls/local-${engine}/report.json`,`output/night-cats-v1/local-${engine}/report.json`,`output/timeline-cat-state/${engine}/report.json`,`output/cat-loading/local-${engine}/report.json`];
 const data=files.map(file=>{const absolute=path.join(root,file),r=JSON.parse(fs.readFileSync(absolute,'utf8'));assert.equal(r.pass,true,file);if(r.release)assert.equal(r.release,release,file+' release');assert(fs.statSync(absolute).mtimeMs>fs.statSync(lockFile).mtimeMs,file+' must be from this integration');assert(!r.productionDbWrites,file+' must isolate production data');reports.push(file);return r;});
 const solar=data[0],meal=data[3];assert.equal(solar.matrix.length,576);assert.equal(solar.cats.length,768);assert.equal(data[1].samples.length,4);assert.equal(meal.cases.length,32);
 summaries.push({engine,backgrounds:solar.matrix.length,unchangedCatComparisons:solar.cats.length,transitionWidths:data[1].samples.length,mealCases:meal.cases.length,liveMealFrames:meal.cases.reduce((n,c)=>n+c.lifetimeFrames,0),minimumVisibleMealMs:Math.min(...meal.cases.map(c=>c.sixSecondMs))});
}
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
for(const command of pkg.scripts.check.split(' && ')){
 const [node,...args]=command.split(' ');assert.equal(node,'node');const result=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit',windowsHide:true});assert.equal(result.status,0,command);
}
fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({pass:true,release,baseline:lock.commit,summaries,reports,originalTrackedFilesPreserved:Object.keys(lock.rootFiles).length,originalPendingWorkUnchanged:true,backgroundAndCatAssetsUnchanged:true,productionDbWrites:0,physicalIPhoneTested:false},null,2));
console.log(`PASS solar release ${release}: ${reports.length} fresh browser reports, release checks, original work and assets preserved.`);
