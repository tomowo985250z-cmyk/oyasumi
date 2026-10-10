// Read-only verification of the deployed static release; never connects to DB.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),base='https://tomowo985250z-cmyk.github.io/oyasumi/';
const release=JSON.parse(fs.readFileSync(path.join(root,'release.json'),'utf8')).release;
const sha=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();
const htmlLocal=fs.readFileSync(path.join(root,'index.html'),'utf8');
const files=['index.html','release.json',...new Set([...htmlLocal.matchAll(/(?:src|href)="([^"?#]+)(?:\?[^"#]*)?"/g)].map(m=>m[1]).filter(file=>/\.(?:js|css|svg)$/.test(file)&&!file.startsWith('http'))),'assets/day-room/room.svg'];
const digest=bytes=>crypto.createHash('sha256').update(bytes.toString().replace(/\r\n/g,'\n')).digest('hex');
const fetchFile=async file=>{const r=await fetch(base+file+'?verify='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(20000)});assert(r.ok,`${file}: HTTP ${r.status}`);return Buffer.from(await r.arrayBuffer());};
(async()=>{
 for(let attempt=0;attempt<24;attempt++){
  try{
   const live=JSON.parse(await fetchFile('release.json')).release;
   if(live!==release){console.log(`Waiting for Pages: ${live}, expected ${release}`);}
   else {
    const html=(await fetchFile('')).toString();assert(html.includes(`content="${release}"`));assert.equal(digest(Buffer.from(html)),digest(Buffer.from(htmlLocal)),'published index content');
    const results=await Promise.allSettled(files.map(async file=>{const actual=digest(await fetchFile(file)),expected=digest(fs.readFileSync(path.join(root,file)));assert.equal(actual,expected,file+' published content');return {file,sha256:actual};}));
    for(const result of results)if(result.status==='rejected')throw result.reason;
    const hashes=results.map(result=>result.value);
    fs.writeFileSync(path.join(__dirname,'deployment.json'),JSON.stringify({sha,release,url:base,verifiedAt:new Date().toISOString(),files,hashes,dbWrites:false},null,2));
    console.log(`PASS published ${sha}: ${base} (release ${release}, ${files.length} matching resources)`);return;
   }
  }catch(e){console.log('Waiting for Pages: '+e.message);}
  if(attempt<23)await new Promise(resolve=>setTimeout(resolve,15000));
 }
 throw Error('The published release could not be verified within the polling window');
})().catch(e=>{console.error(e);process.exitCode=1;});
