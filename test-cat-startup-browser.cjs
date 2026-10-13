const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{spawnSync}=require('node:child_process');
const {webkit,chromium}=require(process.env.OYASUMI_PLAYWRIGHT_PATH||'./output/webkit-tools/core/package');
const installFixture=require('./test-support/cat-startup-fixture.cjs');
const edge=process.argv.includes('--edge'),engine=edge?'edge':'webkit',baseline=process.argv.includes('--baseline'),published=process.argv.includes('--published');
const output=path.join(__dirname,'output/cat-startup',`${baseline?'baseline':published?'published':'local'}-${engine}`);fs.mkdirSync(output,{recursive:true});
const baselineRef='dab00b8',old={};if(baseline)for(const file of ['index.html','supabase-api.js','app.js','cat-image-assets.js','style.css']){const r=spawnSync('git',['show',baselineRef+':'+file],{encoding:'utf8',windowsHide:true});assert.equal(r.status,0);old[file]=r.stdout;}
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),name=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname).slice(1),file=path.resolve(__dirname,name);
 if(!file.startsWith(__dirname+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
 if(/\.(png|svg)$/.test(file))res.setHeader('Cache-Control','public,max-age=600');
 const send=()=>res.end(old[name]||fs.readFileSync(file));if(name.endsWith('.png'))setTimeout(send,180);else send();
});
let browser;
(async()=>{try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=published?'https://tomowo985250z-cmyk.github.io/oyasumi/':`http://127.0.0.1:${server.address().port}/`;
 browser=await(edge?chromium:webkit).launch(edge?{executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
 const cases=[];
 for(const standalone of baseline||process.argv.includes('--focused')?[true]:[false,true])for(const width of baseline||process.argv.includes('--focused')?[390]:[320,375,390,430])for(const asleep of baseline||process.argv.includes('--focused')?[false]:[false,true]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,timezoneId:'America/Los_Angeles'});
  await context.addInitScript(installFixture,{standalone,cache:'cold',coat:'black',asleep,at:Date.parse(`2026-10-13T${asleep?'23':'14'}:00:00+09:00`)});
  const page=await context.newPage(),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/assets/'))requests.push({url:r.url(),at:Date.now()});});
  await page.route('**/*',route=>{const u=new URL(route.request().url());if(!u.href.startsWith(base))return route.abort();if(/\/(?:vendor\/supabase|supabase-config|update-client)\.js$/.test(u.pathname))return route.fulfill({contentType:'text/javascript',body:''});return route.continue();});
  await page.goto(base,{waitUntil:'domcontentloaded'});
  if(published)assert.equal(await page.locator('meta[name=oyasumi-release]').getAttribute('content'),JSON.parse(fs.readFileSync('release.json','utf8')).release);
  await page.waitForFunction(()=>CatStartupFixture.firstOwn!==null);
  const own=await page.evaluate(()=>{
   const f=CatStartupFixture,img=document.querySelector('.home-room-unit .room-resident img'),resource=performance.getEntriesByName(img.src).at(-1),images=CatImages.timings||[];
   const decoded=images.filter(t=>t.stage==='image-decode'&&new URL(t.src,location.href).href===img.src).map(t=>t.start+t.ms),imageReady=decoded.length?Math.min(...decoded):resource?.responseEnd||f.ownNodeAt;
   return{ms:f.firstOwn-f.started,full:ready,stateReadyMs:f.ownStateAt-f.started,imageReadyMs:imageReady-f.started,drawWaitMs:Math.max(0,f.firstOwn-Math.max(f.ownStateAt,imageReady)),resource:resource?{duration:resource.duration,transferSize:resource.transferSize}:null,api:OyasumiAPI.timings||[],images};
  });
  if(!baseline)assert.equal(own.full,false,'Home cat should precede unrelated data');
  await page.evaluate(()=>go('timeline'));await page.waitForFunction(()=>CatStartupFixture.firstFast!==null);
  if(!baseline){
   assert.equal(await page.evaluate(()=>CatStartupFixture.firstSlow),null,'Fast author batch must not wait for the slow batch');
   await page.locator('[data-public-profile=post-21]').evaluate(button=>button.click());
   assert.equal(await page.locator('#public-profile-dialog[open]').count(),0,'Unknown appearance cannot open a guessed profile cat');
  }
  await page.waitForFunction(()=>ready&&!refreshPromise&&CatStartupFixture.firstSlow!==null);
  const first=await page.evaluate(()=>({ownMs:CatStartupFixture.firstOwn-CatStartupFixture.started,fastMs:CatStartupFixture.firstFast-CatStartupFixture.started,slowMs:CatStartupFixture.firstSlow-CatStartupFixture.started,api:OyasumiAPI.timings||[],images:CatImages.timings||[],violations:CatStartupFixture.violations}));
  assert.deepEqual(first.violations,[]);assert.deepEqual(errors,[]);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert(!requests.some(r=>/\/(?:calico|orange)\//.test(r.url)),'No provisional own artwork requested');
  await page.screenshot({path:path.join(output,`${width}-${standalone?'pwa':'browser'}-${asleep?'sleep':'awake'}.png`)});
  // Warm reload keeps only a user-bound coat hint; all expressions/sleep are fresh.
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>CatStartupFixture.firstOwn!==null&&ready&&!refreshPromise);
  const warm=await page.evaluate(()=>({ownMs:CatStartupFixture.firstOwn-CatStartupFixture.started,api:OyasumiAPI.timings||[],images:CatImages.timings||[],violations:CatStartupFixture.violations}));
  assert.deepEqual(warm.violations,[]);assert.deepEqual(errors,[]);
  cases.push({standalone,width,asleep,ownPhase:own,cold:first,warm});await context.close();console.log(`PASS ${engine} ${width} ${standalone?'PWA':'browser'} ${asleep?'sleep':'awake'}: own ${Math.round(first.ownMs)}ms, fast author ${Math.round(first.fastMs)}ms`);
 }
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({pass:true,engine,baseline,baselineRef,published,mode:'isolated delayed Supabase reads and image responses',physicalIPhoneTested:false,productionWrites:0,cases},null,2));
}finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
