const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),base='https://tomowo985250z-cmyk.github.io/oyasumi/';
const hash=s=>crypto.createHash('sha256').update(s.replace(/\r\n/g,'\n')).digest('hex').slice(0,16);
(async()=>{
 const expected=JSON.parse(fs.readFileSync(path.join(root,'release.json'))).release;
 const html=await fetch(base,{cache:'no-store'}).then(r=>{assert(r.ok);return r.text();});
 const marker=await fetch(base+'release.json?roof-poses='+Date.now(),{cache:'no-store'}).then(r=>r.json());
 assert.equal(marker.release,expected);assert(html.includes(`name="oyasumi-release" content="${expected}"`));
 const resources=[...html.matchAll(/(?:src|href)="([^"?#]+)\?v=([a-f0-9]{16})"/g)];
 // Response.text() strips a UTF-8 BOM; hash the retained source bytes instead.
 for(const [,file,version] of resources){const r=await fetch(base+file+'?v='+version);assert(r.ok,file);assert.equal(hash(Buffer.from(await r.arrayBuffer()).toString('utf8')),version,file);assert.equal(hash(fs.readFileSync(path.join(root,file),'utf8')),version);}
 const images=[];
 for(const m of JSON.parse(fs.readFileSync(path.join(root,'assets/roof-poses-v1/manifest.json')))){
  const r=await fetch(base+m.file+'?v='+m.sha256.slice(0,16));assert.equal(r.status,200);assert(r.headers.get('content-type').includes('image/webp'));
  assert.equal(crypto.createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex'),m.sha256);images.push(m.file);
 }
 const proof={pass:true,release:expected,url:base,resources:resources.length,images,productionDbRequests:0};
 fs.mkdirSync(path.join(root,'output/roof-poses-release'),{recursive:true});fs.writeFileSync(path.join(root,'output/roof-poses-release/deployment.json'),JSON.stringify(proof,null,2));console.log(proof);
})().catch(e=>{console.error(e);process.exitCode=1});
