// Read-only verification of the files published by the main branch.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),base='https://tomowo985250z-cmyk.github.io/oyasumi/';
const release=JSON.parse(fs.readFileSync(path.join(root,'release.json'),'utf8')).release;
const files=['index.html','app.js','cat-image-assets.js','day-room.js','day-room.css','supabase-api.js','style.css','cat-care.js','post-cat-expressions.js'];
const hash=text=>crypto.createHash('sha256').update(text.replace(/\r\n/g,'\n')).digest('hex');
async function read(file){const response=await fetch(base+file+'?verify='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(15000)});assert(response.ok,file);return response.text();}
(async()=>{
 const until=Date.now()+300000;let failure;
 do{
  try{
   assert.equal(JSON.parse(await read('release.json')).release,release);
   await Promise.all(files.map(async file=>assert.equal(hash(await read(file)),hash(fs.readFileSync(path.join(root,file),'utf8')),file)));
   const out=path.join(root,'output/timeline-cat-state');fs.mkdirSync(out,{recursive:true});
   fs.writeFileSync(path.join(out,'deployment.json'),JSON.stringify({pass:true,release,url:base,verifiedFiles:files,at:new Date().toISOString(),productionWrites:0},null,2));
   console.log(`PASS Pages: ${release}; all ${files.length} files match the tested checkout`);return;
  }catch(error){failure=error.message;}
  await new Promise(resolve=>setTimeout(resolve,10000));
 }while(Date.now()<until);
 throw Error('Deployment timeout: '+failure);
})().catch(error=>{console.error(error);process.exitCode=1;});
