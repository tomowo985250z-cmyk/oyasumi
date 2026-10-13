const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {webkit,chromium}=require('./output/webkit-tools/core/package');
const source=fs.readFileSync('test-home-post-choices.cjs','utf8');
const fixture=source.slice(source.indexOf('function installFixture()'),source.indexOf('\n(async () =>'))+'\ninstallFixture();';
const edge=process.argv.includes('--edge'),engine=edge?'edge':'webkit',published=process.argv.includes('--published');
const expectedRelease=JSON.parse(fs.readFileSync('release.json','utf8')).release;
const output=path.join(__dirname,'output/cat-loading',`${published?'published':'local'}-${engine}${process.argv.includes('--focused')?'-focused':''}`);fs.mkdirSync(output,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(/\/(?:vendor\/supabase|supabase-api|update-client)\.js$/.test(url.pathname)){res.setHeader('Content-Type','text/javascript');return res.end('// Isolated API; no production writes.');}
 const file=path.resolve(__dirname,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
 if(!file.startsWith(__dirname+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
 if(/\.(png|svg)$/.test(file))res.setHeader('Cache-Control','public,max-age=600');
 const send=()=>fs.createReadStream(file).pipe(res);
 if(/\/assets\/.*\.png$/.test(url.pathname))setTimeout(send,120);else send();
});
function delayedFixture(options){
 const f=globalThis.CatLoadingFixture={...options,hold:true,gates:[],calls:0,fail:false,stateResolved:true,frames:[],violations:[],hidden:false};
 Object.defineProperty(navigator,'standalone',{value:f.standalone});
 const mm=window.matchMedia.bind(window);window.matchMedia=q=>q==='(display-mode: standalone)'?{...mm(q),matches:f.standalone,addEventListener(){},removeEventListener(){}}:mm(q);
 Object.defineProperty(document,'hidden',{get:()=>f.hidden,configurable:true});
 Date.now=()=>f.rest?f.at:Date.parse('2026-10-10T01:00:00+09:00');
 localStorage.setItem('oyasumi-local-v2',JSON.stringify({lastSleep:{coat:'orange',at:f.rest?new Date(f.at-3600000).toISOString():'2026-10-08T23:00:00+09:00',finished:true,finishedAt:new Date(f.at-3500000).toISOString(),nightDate:'2026-10-08'},morningDays:[]}));
 const api=OyasumiAPI,original=api.snapshot;
 api.snapshot=async()=>{
  f.calls++;HomePostFixture.at=f.at;
  const result=await original(),at=f.at,catState=f.catState;
  const snapshot={...result,coat:f.coat,expression:f.expression,catStateResolved:f.stateResolved,
   clock:{serverNow:at,monotonicAt:performance.now(),resetAt:Date.parse(SleepFlow.night(at)+'T06:00:00+09:00')+86400000,nightDate:SleepFlow.night(at)},
   catCare:{allowanceVersion:2,sleepStateVersion:1,catState,mealSleeping:catState==='sleep',day:SleepFlow.night(at),mealSlot:CatCare.slot(at),mealEligible:true,mealDone:false,treatGiven:false,treatCount:0,treatRecipients:[],receivedToday:0,receivedTotal:0,receivedDays:[]}};
  if(f.hold)await new Promise(resolve=>f.gates.push(resolve));
  if(f.fail)throw Error('Isolated delayed failure');
  return snapshot;
 };
 f.release=()=>{f.hold=false;f.gates.splice(0).forEach(resolve=>resolve());};
 f.expectedScene=()=>{
  if(f.catState==='sleep')return 'sleeping';
  const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tokyo',hour:'2-digit',hourCycle:'h23'}).format(f.at));
  return hour>=6&&hour<18?'day:'+DayRoomState.at(f.at,'00000000-0000-0000-0000-000000000001').pose:'awake';
 };
 function frame(){
  for(const image of document.querySelectorAll('#app img[data-asset-key]')){
   if(getComputedStyle(image).visibility!=='visible'||!image.naturalWidth)continue;
   const key=image.dataset.assetKey;
   if(!f.frames.includes(key))f.frames.push(key);
   if(image.dataset.catCoat!==f.coat)f.violations.push('Wrong coat: '+key);
   if(image.closest('.own-cat-room')&&(image.dataset.catScene||'day:'+image.dataset.dayScene)!==f.expectedScene())f.violations.push('Wrong sleep/time pose: '+key);
   if(image.closest('.profile-banner')&&image.dataset.catExpression!==PostCatExpressions.forPost(ownIconPost()))f.violations.push('Wrong expression: '+key);
  }
  requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
}
let browser;
(async()=>{try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=published?'https://tomowo985250z-cmyk.github.io/oyasumi/':`http://127.0.0.1:${server.address().port}/`;
 browser=await(edge?chromium:webkit).launch(edge?{executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
 const reports=[];
 for(const standalone of process.argv.includes('--focused')?[false]:[false,true])for(const width of process.argv.includes('--focused')?[320]:[320,375,390,430])for(const scenario of process.argv.includes('--focused')?['day-awake','rest-sleep']:['morning-awake','day-awake','day-sleep','night-sleep','rest-sleep']){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,timezoneId:'America/Los_Angeles'});
  await context.addInitScript({content:fixture});
  await context.addInitScript(delayedFixture,{standalone,coat:'black',expression:'surprised',catState:scenario.endsWith('sleep')?'sleep':'awake',rest:scenario==='rest-sleep',at:Date.parse(`2026-10-12T${scenario.startsWith('morning')?'08':scenario.startsWith('day')?'14':'23'}:00:00+09:00`)});
  const page=await context.newPage(),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/assets/'))requests.push(r.url());});
  if(published)await page.route('**/*',route=>{const u=new URL(route.request().url());if(!u.href.startsWith(base))return route.abort();if(/\/(?:vendor\/supabase|supabase-api|update-client)\.js$/.test(u.pathname))return route.fulfill({contentType:'text/javascript',body:''});return route.continue();});
  await page.goto(base,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>CatLoadingFixture.gates.length>0);
  assert.equal(await page.locator('meta[name=oyasumi-release]').getAttribute('content'),expectedRelease);
  const hidden=async()=>{
   assert(await page.locator('html').evaluate(el=>el.hasAttribute('data-cat-state-pending')));
   assert.equal(await page.locator('#app img[data-asset-key]').evaluateAll(images=>images.filter(i=>getComputedStyle(i).visibility==='visible').length),0);
  };
  await hidden();
  const geometry=scenario==='rest-sleep'?'.rest-cat':'.day-room';
  const before=await page.locator(geometry).boundingBox();assert(before.width>=144&&before.height>=144);
  if(width===320&&scenario==='day-awake')await page.screenshot({path:path.join(output,`${standalone?'pwa':'browser'}-pending.png`)});
  assert.equal(await page.locator('[data-cat-placeholder][src]').count(),0);
  await page.waitForTimeout(200);await hidden();assert(!requests.some(u=>/\/calico\//.test(u)||/\/orange\//.test(u)),'No provisional coat requested');
  await page.evaluate(()=>CatLoadingFixture.release());
  await page.waitForFunction(()=>ready&&!refreshPromise&&!document.documentElement.hasAttribute('data-cat-state-pending'));
  await page.waitForFunction(()=>document.querySelector('.room-resident img,.rest-cat img')?.naturalWidth>0);
  const after=await page.locator(geometry).boundingBox();assert.equal(after.width,before.width);assert.equal(after.height,before.height);
  if(scenario==='rest-sleep'){assert.equal(await page.locator('.rest-cat img').getAttribute('data-cat-coat'),'black');await page.evaluate(()=>go('home'));}
  assert.equal(await page.locator('.room-resident img').getAttribute('data-cat-coat'),'black');
  if(scenario.endsWith('sleep'))assert.equal(await page.locator('.room-resident img').getAttribute('data-cat-scene'),'sleeping');
  assert.equal(await page.locator('.day-room').getAttribute('data-room-user'),'00000000-0000-0000-0000-000000000001');
  if(scenario==='day-awake')assert.equal(await page.locator('.room-resident img').getAttribute('data-day-scene'),await page.evaluate(()=>DayRoomState.at(CatLoadingFixture.at,shared.userId).pose));
  await page.evaluate(()=>{go('profile');});await page.waitForFunction(()=>document.querySelector('.profile-banner img')?.naturalWidth>0);
  assert.equal(await page.locator('.profile-banner img').getAttribute('data-cat-expression'),'calm');
  await page.evaluate(()=>go('home'));
  assert(await page.evaluate(()=>{const cat=document.querySelector('.room-resident img');DayRoom.sync();DayRoom.sync();render();return cat===document.querySelector('.room-resident img');}),'Same confirmed image node is reused');
  // Navigation during revalidation must not expose the previous identity/state.
  await page.evaluate(()=>{const f=CatLoadingFixture;f.hidden=true;document.dispatchEvent(new Event('visibilitychange'));f.hold=true;f.coat='white';f.expression='yawn';f.catState='sleep';f.hidden=false;document.dispatchEvent(new Event('visibilitychange'));go('catMeal');});
  await page.waitForFunction(()=>CatLoadingFixture.gates.length>0);await hidden();
  await page.evaluate(()=>CatLoadingFixture.release());await page.waitForFunction(()=>!refreshPromise&&!document.documentElement.hasAttribute('data-cat-state-pending'));
  await page.waitForFunction(()=>document.querySelector('.room-resident img')?.naturalWidth>0);
  assert.equal(await page.locator('.room-resident img').getAttribute('data-cat-coat'),'white');assert(await page.locator('[data-cat-meal]').isDisabled());
  // BFCache/pageshow: hold the restored image until a new read succeeds.
  await page.evaluate(()=>{CatLoadingFixture.previousCat=document.querySelector('.room-resident img');window.dispatchEvent(new Event('pagehide'));CatLoadingFixture.hold=true;window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
  await page.waitForFunction(()=>CatLoadingFixture.gates.length>0);await hidden();await page.evaluate(()=>CatLoadingFixture.release());
  await page.waitForFunction(()=>!refreshPromise&&!document.documentElement.hasAttribute('data-cat-state-pending'));
  assert(await page.evaluate(()=>CatLoadingFixture.previousCat===document.querySelector('.room-resident img')),'Unchanged resume reuses the confirmed image');
  // A failed optional care read does not fall back to an awake/default cat.
  await page.evaluate(async()=>{CatLoadingFixture.stateResolved=false;await refreshShared();});await hidden();
  await page.evaluate(async()=>{CatLoadingFixture.stateResolved=true;await refreshShared();});await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-cat-state-pending'));
  if(width===320&&!standalone&&scenario==='day-awake'){
   // Reads begun before backgrounding OR while hidden cannot reveal on resume.
   for(const duringHidden of [false,true]){
    await page.evaluate(duringHidden=>{const f=CatLoadingFixture;f.hold=true;if(duringHidden){f.hidden=true;document.dispatchEvent(new Event('visibilitychange'));}void refreshShared();},duringHidden);await page.waitForFunction(()=>CatLoadingFixture.gates.length===1);
    await page.evaluate(duringHidden=>{const f=CatLoadingFixture;if(!duringHidden){f.hidden=true;document.dispatchEvent(new Event('visibilitychange'));}f.catState=f.catState==='sleep'?'awake':'sleep';f.hidden=false;document.dispatchEvent(new Event('visibilitychange'));f.gates.shift()();},duringHidden);
    await page.waitForFunction(()=>CatLoadingFixture.gates.length===1);await hidden();
    await page.evaluate(()=>CatLoadingFixture.release());await page.waitForFunction(()=>!refreshPromise&&!refreshQueued&&!document.documentElement.hasAttribute('data-cat-state-pending'));
   }
   // Offline resume stays hidden, then recovers on the existing online event.
   await page.evaluate(()=>{const f=CatLoadingFixture;f.hidden=true;document.dispatchEvent(new Event('visibilitychange'));f.fail=true;f.hidden=false;document.dispatchEvent(new Event('visibilitychange'));});
   await page.waitForFunction(()=>!refreshPromise);await hidden();
   await page.evaluate(()=>{CatLoadingFixture.fail=false;window.dispatchEvent(new Event('online'));});await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-cat-state-pending'));
   // A picker left open across backgrounding also uses the newly confirmed cat.
   await page.evaluate(()=>go('profile'));await page.locator('.profile-page [data-coat-picker]').click();
   await page.evaluate(()=>{const f=CatLoadingFixture;f.hidden=true;document.dispatchEvent(new Event('visibilitychange'));f.coat='gray';f.expression='happy';f.hold=true;f.hidden=false;document.dispatchEvent(new Event('visibilitychange'));});
   await page.waitForFunction(()=>CatLoadingFixture.gates.length>0);await hidden();await page.evaluate(()=>CatLoadingFixture.release());
   await page.waitForFunction(()=>!refreshPromise&&!document.documentElement.hasAttribute('data-cat-state-pending'));
   assert(await page.locator('#expression-options [data-coat]').evaluateAll(choices=>choices.length===16&&choices.every(c=>c.querySelector('[data-cat-coat]')?.dataset.catCoat===c.dataset.coat)));
   assert.equal(await page.locator('#expression-options [aria-pressed=true]').getAttribute('data-coat'),'gray');
   await page.locator('#cancel-expression').click();
  }
  const beforeReload=await page.evaluate(()=>({violations:CatLoadingFixture.violations,frames:CatLoadingFixture.frames}));assert.deepEqual(beforeReload.violations,[]);
  // A reload starts hidden again, including a warm image cache/PWA launch.
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>CatLoadingFixture.gates.length>0);await hidden();
  await page.evaluate(()=>CatLoadingFixture.release());await page.waitForFunction(()=>ready&&!refreshPromise&&!document.documentElement.hasAttribute('data-cat-state-pending'));
  await page.waitForFunction(()=>document.querySelector('.room-resident img,.rest-cat img')?.naturalWidth>0);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(output,`${standalone?'pwa':'browser'}-${width}-${scenario}.png`)});
  const observed=await page.evaluate(()=>({violations:CatLoadingFixture.violations,frames:CatLoadingFixture.frames}));assert.deepEqual(observed.violations,[]);assert.deepEqual(errors,[]);
  reports.push({standalone,width,scenario,geometry:{before,after},beforeReload,...observed});await context.close();
  console.log(`PASS ${engine} ${standalone?'PWA':'browser'} ${width} ${scenario}`);
 }
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({pass:true,engine,published,release:expectedRelease,productionWrites:0,reports},null,2));
}finally{await browser?.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
