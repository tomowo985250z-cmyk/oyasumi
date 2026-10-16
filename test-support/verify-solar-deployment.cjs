const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),base='https://tomowo985250z-cmyk.github.io/oyasumi/',expected=JSON.parse(fs.readFileSync(path.join(root,'release.json'),'utf8')).release;
const hash=s=>crypto.createHash('sha256').update(s.replace(/\r\n/g,'\n')).digest('hex').slice(0,16);
(async()=>{
 for(let attempt=0;attempt<60;attempt++){
  try{
   const marker=await fetch(base+'release.json?solar-deploy='+Date.now(),{cache:'no-store'}).then(r=>{assert(r.ok);return r.json();});
   const html=await fetch(base,{cache:'no-store'}).then(r=>{assert(r.ok);return r.text();});
   if(marker.release!==expected||!html.includes(`name="oyasumi-release" content="${expected}"`))throw Error(`expected ${expected}, current ${marker.release}`);
   const resources=[...html.matchAll(/(?:src|href)="([^"?#]+)\?v=([a-f0-9]{16})"/g)].map(([,file,version])=>({file,version}));
   const checked=await Promise.all(resources.map(async({file,version})=>{const response=await fetch(new URL(file+'?v='+version,base));assert(response.ok,file);assert.equal(hash(await response.text()),version,file+' public bytes');assert.equal(hash(fs.readFileSync(path.join(root,file),'utf8')),version,file+' local bytes');return file;}));
   for(const file of ['solar-model.js','solar-lighting.js','room-backgrounds.js','indoor-cat-scale.js','season-landscape.js','day-room.js','day-room.css'])assert(checked.includes(file),file);
   const out=path.join(root,'output/solar-light-release');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'deployment.json'),JSON.stringify({pass:true,url:base,release:expected,checked,productionDbWrites:0,physicalIPhoneTested:false},null,2));
   console.log(`PASS public solar deployment ${expected}: regular HTML, release marker and ${checked.length} resource hashes match.`);return;
  }catch(e){console.log('Waiting for consistent public files: '+e.message);}
  await new Promise(r=>setTimeout(r,10000));
 }throw Error('Public deployment did not become consistent within ten minutes');
})().catch(e=>{console.error(e);process.exitCode=1;});
