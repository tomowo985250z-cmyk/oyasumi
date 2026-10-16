const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),base='https://tomowo985250z-cmyk.github.io/oyasumi/',expected=JSON.parse(fs.readFileSync(path.join(root,'release.json'),'utf8')).release,hash=s=>crypto.createHash('sha256').update(s.replace(/\r\n/g,'\n')).digest('hex').slice(0,16);
(async()=>{for(let attempt=0;attempt<60;attempt++){
 try{
  const marker=await fetch(base+'release.json?motion-deploy='+Date.now(),{cache:'no-store'}).then(r=>{assert(r.ok);return r.json();}),html=await fetch(base,{cache:'no-store'}).then(r=>{assert(r.ok);return r.text();});
  if(marker.release!==expected||!html.includes(`name="oyasumi-release" content="${expected}"`))throw Error(`expected ${expected}, current ${marker.release}`);
  const resources=[...html.matchAll(/(?:src|href)="([^"?#]+)\?v=([a-f0-9]{16})"/g)].map(([,file,version])=>({file,version}));
  const checked=await Promise.all(resources.map(async({file,version})=>{const r=await fetch(new URL(file+'?v='+version,base));assert(r.ok,file);const source=Buffer.from(await r.arrayBuffer()).toString('utf8');assert.equal(hash(source),version,file+' public bytes');assert.equal(hash(fs.readFileSync(path.join(root,file),'utf8')),version,file+' local bytes');return file;}));
  assert(checked.includes('cat-idle-motion.js')&&checked.includes('cat-idle-motion.css'));const out=path.join(root,'output/cat-idle-motion');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'deployment.json'),JSON.stringify({pass:true,url:base,release:expected,checked,productionDbWrites:0},null,2));console.log(`PASS public motion deployment ${expected}: normal HTML and ${checked.length} resource hashes match.`);return;
 }catch(e){console.log('Waiting for consistent public files: '+e.message);}await new Promise(r=>setTimeout(r,10000));
}throw Error('Public deployment did not become consistent within ten minutes');})().catch(e=>{console.error(e);process.exitCode=1;});
