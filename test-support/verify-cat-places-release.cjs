// Serial per engine: all production writes are intercepted by existing fixtures.
const {spawnSync}=require('node:child_process'),fs=require('node:fs'),path=require('node:path');
const edge=process.argv.includes('--edge'),root=path.resolve(__dirname,'..'),flag=edge?['--edge']:[],out=path.join(root,'output/cat-places-production');fs.mkdirSync(out,{recursive:true});
const commands=[
 ['test-cat-places-poses.cjs',...flag],['test-night-cats.cjs'],['test-night-cats-browser.cjs',...flag],
 ['test-moon-motion.cjs',...flag],['test-cat-meal-motion.cjs','--focused',...flag],
 ['test-home-post-choices.cjs',...flag],['test-home-cat-care.cjs','--interactions-only',...flag],
 ['test-cat-startup-browser.cjs','--focused',...flag],['test-cat-image-assets.js'],['prepare-release.js','--check']
];
const file=path.join(out,'regression-'+(edge?'edge':'webkit')+'.json'),release=JSON.parse(fs.readFileSync(path.join(root,'release.json'),'utf8')).release;
const old=process.argv.includes('--resume')&&fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null,results=[];
for(const args of commands){
 const previous=old?.release===release&&old.results.find(r=>r.pass&&JSON.stringify(r.args)===JSON.stringify(args));
 if(previous){results.push(previous);continue;}
 console.log('Checking '+args.join(' '));const result=spawnSync(process.execPath,args,{cwd:root,windowsHide:true,stdio:'inherit'});
 results.push({args,pass:result.status===0});fs.writeFileSync(file,JSON.stringify({release,pass:results.length===commands.length&&results.every(r=>r.pass),results,productionDbWrites:0},null,2));
 if(result.status!==0){process.exitCode=1;break;}
}
