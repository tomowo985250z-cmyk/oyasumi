// Local browser fixtures intercept all API writes. Never load SQL or deploy here.
const {spawnSync}=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),commands=[
 ['test-support/build-night-cat-review.cjs'],
 ['test-cat-day-scenes.js'],['test-cat-scenes.js'],['test-cat-image-assets.js'],
 ['test-moon-motion.cjs'],['test-moon-motion.cjs','--edge'],
 ['test-cat-meal-motion.cjs','--focused'],['test-cat-meal-motion.cjs','--focused','--edge']
];
const reportFile=path.join(root,'output/night-cats-v1/regression-report.json');
const prior=process.argv.includes('--resume')&&fs.existsSync(reportFile)?JSON.parse(fs.readFileSync(reportFile,'utf8')):null;
const results=[];
for(const args of commands){
 const previous=prior?.results.find(r=>r.pass&&JSON.stringify(r.args)===JSON.stringify(args));
 if(previous){results.push(previous);continue;}
 console.log('Checking '+args.join(' '));const started=Date.now();
 const result=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit',windowsHide:true});
 results.push({args,pass:result.status===0,elapsedMs:Date.now()-started});
 if(result.status!==0){console.error(result.error||'Check failed');process.exitCode=1;break;}
}
fs.writeFileSync(reportFile,JSON.stringify({pass:results.length===commands.length&&results.every(r=>r.pass),results,productionDbWrites:0},null,2));
