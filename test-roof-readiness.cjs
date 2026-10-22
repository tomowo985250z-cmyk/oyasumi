// Real cache/navigation coverage plus controlled late-decode races. No Auth/DB requests.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const pw=require(process.env.OYASUMI_PLAYWRIGHT_PATH||'./output/webkit-tools/core/package'),edge=process.argv.includes('--edge'),root=__dirname,out=process.env.OYASUMI_ROOF_READINESS_OUTPUT||path.join(root,'output/roof-readiness');fs.mkdirSync(out,{recursive:true});
const fixture=fs.readFileSync(path.join(root,'test-support/cat-startup-fixture.cjs'),'utf8').replace('module.exports=','').replace(/ Object\.defineProperty\(document,'hidden',\{get:\(\)=>f.hidden,configurable:true\}\);/,'').trim().replace(/;$/,'');
function monitor(){
 const p=globalThis.RoofReadiness={frames:0,partial:[],states:[],events:[]};let prior='';
 for(const type of ['pageshow','pagehide','visibilitychange'])addEventListener(type,e=>p.events.push({type,persisted:!!e.persisted,hidden:document.hidden}));
 function frame(){
  p.frames++;const g=document.querySelector('.roof-cat-group'),pending=document.documentElement.hasAttribute('data-cat-state-pending');
  if(g&&globalThis.NightClock){const at=NightClock.now(),images=[...g.children],required=images.filter(i=>RoofRecline.presence(at,Number(i.dataset.roofRank),images.length)>.001),visible=required.filter(i=>getComputedStyle(i).visibility==='visible'&&i.naturalWidth);
   if(!pending&&visible.length&&visible.length!==required.length&&p.partial.length<20)p.partial.push({at,visible:visible.map(i=>i.dataset.catCoat),required:required.map(i=>i.dataset.catCoat)});
   const state={pending,hidden:getComputedStyle(g).visibility!=='visible',required:required.map(i=>i.dataset.catCoat),visible:visible.map(i=>i.dataset.catCoat)};const key=JSON.stringify(state);if(key!==prior){prior=key;p.states.push(state);}
  }requestAnimationFrame(frame);
 }requestAnimationFrame(frame);
}
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.json':'application/json','.mp3':'audio/mpeg'};
const report={pass:false,engine:edge?'Edge':'WebKit',cases:[],errors:[],external:[],productionDbRequests:0,physicalIPhone:false},hits=[];
const server=http.createServer((req,res)=>{const name=decodeURIComponent(new URL(req.url,'http://local').pathname).slice(1)||'index.html';hits.push(name);if(name==='away'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><meta name="viewport" content="width=device-width"><title>Away</title>');}const file=path.resolve(root,name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}let data=fs.readFileSync(file);if(['vendor/supabase.js','supabase-config.js'].includes(name))data=Buffer.from('');res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('Content-Security-Policy',"connect-src 'self'; worker-src 'self'");res.setHeader('Cache-Control','public,max-age=600');const etag='"'+crypto.createHash('sha256').update(data).digest('hex').slice(0,16)+'"';res.setHeader('ETag',etag);if(req.headers['if-none-match']===etag){res.writeHead(304);return res.end();}res.end(data);});
let browser;
(async()=>{try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}/`;browser=await(edge?pw.chromium:pw.webkit).launch(edge?{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
 for(const width of [320,375]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2,timezoneId:'Asia/Tokyo',reducedMotion:'no-preference'});
  await context.addInitScript({content:`(${fixture})({standalone:false,cache:'cold',coat:'black',asleep:false,at:Number(localStorage.getItem('roof-readiness-at'))||Date.parse('2026-10-22T23:00:00+09:00'),holdOptional:false,holdProfiles:false});
  {const create=supabase.createClient;supabase.createClient=(...args)=>{const client=create(...args),rpc=client.rpc;client.rpc=(...args)=>{const at=Number(localStorage.getItem('roof-readiness-at'));if(at)CatStartupFixture.at=at;return rpc(...args);};return client;};}`});await context.addInitScript(monitor);
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(base))report.external.push(r.url());});
  // Do not add route handlers: routing disables the HTTP cache under test.
  const settled=async()=>{await page.waitForFunction(()=>typeof ready!=='undefined'&&ready&&!refreshPromise&&!catStatePending&&!document.querySelector('.roof-cat-group')?.hasAttribute('data-cat-placeholder'),{},{timeout:20000});await page.locator('.roof-sky-card').scrollIntoViewIfNeeded();await page.waitForTimeout(100);};
  const record=async label=>{const row=await page.evaluate(label=>({label,...RoofReadiness,coats:[...document.querySelectorAll('.roof-cat-group>img')].map(i=>i.dataset.catCoat),ready,overflow:document.documentElement.scrollWidth>innerWidth}),label);row.width=width;assert.deepEqual(row.partial,[],label+' must never paint a partial cached row');assert(!row.overflow);report.cases.push(row);};
  await page.goto(base,{waitUntil:'domcontentloaded'});await settled();await record('cold');
  await page.locator('#navigation [data-view=profile]').tap();await page.locator('#navigation [data-view=home]').tap();await settled();await record('home-tab');
  await page.goto(base+'away');await page.goBack({waitUntil:'domcontentloaded'});await settled();await record('native-back');
  await page.reload({waitUntil:'domcontentloaded'});await settled();await record('reload');
  await page.goto(base+'away');await page.goto(base);await settled();await record('URL-revisit');
  await page.evaluate(()=>localStorage.setItem('roof-readiness-at',String(Date.parse('2026-10-23T23:00:00+09:00'))));await page.goto(base+'away');await page.goBack({waitUntil:'domcontentloaded'});await settled();assert.equal(await page.evaluate(()=>SleepFlow.night(NightClock.now())),'2026-10-23');await record('next-night-back');
  const cache=await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>/assets\/roof/.test(r.name)).map(r=>({url:r.name,transferSize:r.transferSize})));assert(cache.some(r=>r.transferSize===0),'Real warm HTTP/image cache must be exercised');
  // Native decoding still runs; only completion publication is held. This is
  // a race regression, separate from the unmodified navigation reproduction.
  await page.evaluate(()=>{
   const p=globalThis.DecodeRace={mode:'hold',tickets:[]},native=HTMLImageElement.prototype.decode;
   HTMLImageElement.prototype.decode=function(){const group=this.closest('.roof-cat-group');if(!group)return native.call(this);const mode=p.mode,source=this.getAttribute('src');return native.call(this).then(()=>{if(mode==='fail')throw new DOMException('Test decode failure','EncodingError');if(mode==='hold')return new Promise(resolve=>p.tickets.push({group,source,resolve}));});};
   go('profile');go('home');p.first=document.querySelector('.roof-cat-group');
  });
  await page.waitForFunction(()=>DecodeRace.tickets.some(t=>t.group===DecodeRace.first));
  assert(await page.evaluate(()=>{const g=document.querySelector('.roof-cat-group'),own=document.querySelector('.own-cat-room .room-resident img');return g.hasAttribute('data-cat-placeholder')&&own?.naturalWidth&&getComputedStyle(own).visibility==='visible'&&ready;}),'Home cat must not wait for roof decoding');
  await page.evaluate(()=>{go('profile');go('home');DecodeRace.second=document.querySelector('.roof-cat-group');});await page.waitForFunction(()=>DecodeRace.tickets.some(t=>t.group===DecodeRace.second));
  await page.evaluate(()=>{for(const ticket of DecodeRace.tickets)if(ticket.group===DecodeRace.first)ticket.resolve();});await page.waitForTimeout(80);
  assert(await page.evaluate(()=>document.querySelector('.roof-cat-group')===DecodeRace.second&&DecodeRace.second.hasAttribute('data-cat-placeholder')),'A prior screen decode cannot reveal the new screen');
  await record('old-decode-rejected');
  await page.evaluate(async()=>{DecodeRace.mode='pass';CatStartupFixture.at+=86400000;localStorage.setItem('roof-readiness-at',String(CatStartupFixture.at));invalidateCatState();await refreshShared();});await settled();
  const current=await page.evaluate(()=>{DecodeRace.current=document.querySelector('.roof-cat-group');return [...DecodeRace.current.children].map(i=>i.dataset.catCoat);});
  await page.evaluate(()=>DecodeRace.tickets.forEach(t=>t.resolve()));await page.waitForTimeout(80);assert(await page.evaluate(()=>document.querySelector('.roof-cat-group')===DecodeRace.current));assert.deepEqual(await page.locator('.roof-cat-group>img').evaluateAll(images=>images.map(i=>i.dataset.catCoat)),current);await record('old-night-decodes-rejected');
  await page.evaluate(()=>{DecodeRace.mode='fail';go('profile');go('home');});await page.waitForTimeout(150);assert(await page.locator('.roof-cat-group').evaluate(g=>g.hasAttribute('data-cat-placeholder')),'Failed image cannot release a partial row');await record('decode-failure-hidden');
  await page.evaluate(()=>{DecodeRace.mode='pass';go('profile');go('home');});await settled();await record('cache-recovery');await page.locator('.roof-sky-card').screenshot({path:path.join(out,`${report.engine}-${width}.png`)});
  const workers=await page.evaluate(async()=>({controller:navigator.serviceWorker?.controller?.scriptURL||null,registrations:navigator.serviceWorker?(await navigator.serviceWorker.getRegistrations()).length:0,cacheStorage:globalThis.caches?await caches.keys():[]}));assert.equal(workers.controller,null);report.cases.push({width,label:'cache-and-SW-audit',cache,workers});
  await context.close();console.log(`PASS ${report.engine} ${width}px: native navigation/cache, atomic initial paint, stale decode races and failure recovery`);
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.external,[]);report.pass=true;
}finally{await browser?.close();server.close();fs.writeFileSync(path.join(out,'result-'+report.engine+'.json'),JSON.stringify(report,null,2));}})().catch(e=>{console.error(e);process.exitCode=1;});
