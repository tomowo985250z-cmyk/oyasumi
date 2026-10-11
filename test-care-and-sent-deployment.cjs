// Wait for GitHub Pages, then verify the deployed files against this checkout.
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const base='https://tomowo985250z-cmyk.github.io/oyasumi/',release=JSON.parse(fs.readFileSync('release.json','utf8')).release;
const files=['app.js','cat-care.js','day-room.js','supabase-api.js','style.css'];
const hash=text=>crypto.createHash('sha256').update(text.replace(/\r\n/g,'\n')).digest('hex');
async function read(file){const response=await fetch(base+file+'?verify='+Date.now(),{headers:{'Cache-Control':'no-cache'},signal:AbortSignal.timeout(15000)});assert(response.ok,file+': HTTP '+response.status);return response.text();}
(async()=>{
 const until=Date.now()+300000;let last;
 do{
  try{
   assert.equal(JSON.parse(await read('release.json')).release,release,'Published release marker');
   const html=await read('index.html');assert(html.includes(`<meta name="oyasumi-release" content="${release}">`));
   for(const file of files){assert.equal(hash(await read(file)),hash(fs.readFileSync(file,'utf8')),file+' published contents');}
   const report={pass:true,checkedAt:new Date().toISOString(),url:base,release,verifiedFiles:files,applicationWrites:0};
   fs.mkdirSync('output/care-and-sent-v2',{recursive:true});fs.writeFileSync('output/care-and-sent-v2/deployment-report.json',JSON.stringify(report,null,2));
   console.log('PASS GitHub Pages: release '+release+', HTML marker and all five changed JS/CSS files match the tested checkout.');return;
  }catch(error){last=error.message;}
  await new Promise(resolve=>setTimeout(resolve,10000));
 }while(Date.now()<until);
 throw new Error('Pages verification timed out: '+last);
})().catch(error=>{console.error(error.message);process.exitCode=1;});
