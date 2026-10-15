const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {webkit,chromium}=require(process.env.OYASUMI_PLAYWRIGHT_PATH||'./output/webkit-tools/core/package');
const edge=process.argv.includes('--edge'),published=process.argv.includes('--published'),port=edge?9492:9491;
const base=published?'https://tomowo985250z-cmyk.github.io/oyasumi/':`http://127.0.0.1:${port}/`,output=path.join(__dirname,'output/night-cats-v1',`${published?'published':'local'}-${edge?'edge':'webkit'}`);
fs.mkdirSync(output,{recursive:true});
const manifest=JSON.parse(fs.readFileSync('assets/night-gestures-v1/manifest.json','utf8')),coats=[...new Set(manifest.map(e=>e.coat))];
const source=fs.readFileSync('test-home-post-choices.cjs','utf8'),fixture=source.slice(source.indexOf('function installFixture()'),source.indexOf('\n(async () =>'))+'\ninstallFixture();';
const server=published?null:spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'ignore'});let browser;
(async()=>{try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await(edge?chromium:webkit).launch(edge?{executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
 const context=await browser.newContext({viewport:{width:375,height:900},deviceScaleFactor:2,isMobile:true,hasTouch:true,timezoneId:'America/Los_Angeles',reducedMotion:'reduce'});
 await context.addInitScript({content:fixture});
 await context.addInitScript(()=>{
  const f=HomePostFixture,api=OyasumiAPI,snapshot=api.snapshot,submit=api.submitPost,q=new URLSearchParams(location.search);
  f.at=Number(q.get('at'))||Date.parse('2026-10-15T23:00:00+09:00');f.coat=q.get('coat')||'calico';f.sleep=false;f.meals=new Set();f.mealCalls=0;
  f.care=()=>({allowanceVersion:2,sleepStateVersion:1,catState:f.sleep?'sleep':'awake',mealSleeping:f.sleep,day:SleepFlow.night(f.at),mealSlot:CatCare.slot(f.at),mealEligible:true,mealDone:f.meals.has(SleepFlow.night(f.at)+':'+CatCare.slot(f.at)),treatGiven:false,treatCount:0,treatRecipients:[],receivedToday:0,receivedTotal:0,receivedDays:[]});
  api.snapshot=async()=>{if(!f.rows.length)f.rows=[f.row('awake')];return {...await snapshot(),coat:f.coat,catCare:f.care(),clock:{serverNow:f.at,monotonicAt:performance.now(),resetAt:Date.parse(SleepFlow.night(f.at)+'T06:00:00+09:00')+86400000}};};
  api.getCatCareStatus=async()=>f.care();api.submitPost=async(...args)=>{const row=await submit(...args);f.sleep=row.choice!=='awake';return row;};
  api.giveCatMeal=async()=>{f.mealCalls++;const key=SleepFlow.night(f.at)+':'+CatCare.slot(f.at),accepted=!f.meals.has(key);f.meals.add(key);return {accepted,status:f.care()};};
 });
 const page=await context.newPage(),errors=[],failed=[],external=[],cases=[],transitions=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
 await page.route('**/*',route=>{const url=new URL(route.request().url());if(!url.href.startsWith(base)){external.push(url.href);return route.abort();}if(/\/(?:vendor\/supabase|supabase-api|update-client)\.js$/.test(url.pathname))return route.fulfill({contentType:'text/javascript',body:''});return route.continue();});
 const settle=()=>page.waitForFunction(()=>typeof ready!=='undefined'&&ready&&!busy&&!refreshPromise&&!refreshQueued);
 const decode=()=>page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
 await page.goto(base);await settle();assert.equal(await page.locator('meta[name=oyasumi-release]').getAttribute('content'),JSON.parse(fs.readFileSync('release.json','utf8')).release);
 const times=await page.evaluate(()=>Object.fromEntries(['seated','curl','stretch','window'].map(pose=>{let at=Date.parse('2026-10-15T18:00:00+09:00');while(NightCats.at(at,shared.userId).pose!==pose)at+=NightCats.interval;return [pose,at];})));
 for(const width of [320,360,375,390,402,414,430]){
  await page.setViewportSize({width,height:900});
  for(const coat of coats)for(const pose of ['seated','curl','stretch','window']){
   await page.evaluate(({at,coat})=>{HomePostFixture.at=at;HomePostFixture.coat=coat;HomePostFixture.sleep=false;shared.catCare=HomePostFixture.care();state.coat=coat;NightClock.now=()=>HomePostFixture.at;go('home');},{at:times[pose],coat});await decode();
   const result=await page.evaluate(()=>{
    const room=document.querySelector('.home-room-unit .day-room'),image=room.querySelector('.room-resident img'),r=room.getBoundingClientRect(),ir=image.getBoundingClientRect();
    return {pose:room.dataset.nightPose,place:room.dataset.place,loaded:image.complete&&image.naturalWidth>0,coat:image.dataset.catCoat,src:image.getAttribute('src'),overflow:document.documentElement.scrollWidth>innerWidth,width:r.width,rect:{x:ir.x-r.x,y:ir.y-r.y,width:ir.width,height:ir.height},callCount:HomePostFixture.calls.length};
   });
   assert.equal(result.pose,pose);assert.equal(result.coat,coat);assert(result.loaded&&!result.overflow);assert.equal(result.callCount,0);
   if(pose!=='seated'){
    const entry=manifest.find(e=>e.coat===coat&&e.pose===pose),s=result.width/400,p=entry.placement;
    // Image element dimensions/placement and the measured transformed alpha silhouette.
    const angle=p.rotation*Math.PI/180,bw=Math.abs(Math.cos(angle))*p.width+Math.abs(Math.sin(angle))*p.height,bh=Math.abs(Math.sin(angle))*p.width+Math.abs(Math.cos(angle))*p.height;
    assert(Math.abs(result.rect.width-bw*s)<.3);
    assert(Math.abs(result.rect.height-bh*s)<.3);
    assert(Math.abs(result.rect.x-(p.left+(p.width-bw)/2)*s)<.3);
    assert(Math.abs(result.rect.y-(p.top+(p.height-bh)/2)*s)<.3);
    assert(entry.visible.left>=0&&entry.visible.right<=400&&entry.visible.top>=0);
    assert.equal(entry.visible.bottom,{curl:251,stretch:277,window:161}[pose]);
    assert.equal(result.place,{curl:'cushion',stretch:'corner',window:'window'}[pose]);
   }
   if(width===375){const clip=await page.locator('.home-room-unit .day-room').boundingBox();await page.screenshot({path:path.join(output,`${coat}-${pose}-375.png`),clip,animations:'disabled'});}
   if(coat==='calico'&&pose==='window')await page.screenshot({path:path.join(output,`home-${width}.png`)});
   cases.push({width,coat,...result});
  }
  console.log(`PASS ${edge?'Edge':'WebKit'} ${width}px: all 16 coats × 4 night poses`);
 }
 // Real reloads within one slot retain both chosen gesture and placement.
 for(const [pose,at] of Object.entries(times)){
  await page.goto(base+`?at=${at}&coat=manul`);await settle();await page.evaluate(()=>{NightClock.now=()=>HomePostFixture.at;go('home');});await decode();
  const before=await page.locator('.home-room-unit .room-resident').innerHTML(),style=await page.locator('.home-room-unit .day-room').getAttribute('style');
  await page.reload();await settle();await page.evaluate(()=>{NightClock.now=()=>HomePostFixture.at;go('home');});await decode();
  assert.equal(await page.locator('.home-room-unit .day-room').getAttribute('data-night-pose'),pose);assert.equal(await page.locator('.home-room-unit .room-resident').innerHTML(),before);assert.equal(await page.locator('.home-room-unit .day-room').getAttribute('style'),style);
 }
 // A mounted room follows time changes and removes night geometry in daylight/sleep.
 for(const time of ['2026-10-15T23:59:59','2026-10-16T00:00:00','2026-10-16T05:59:59','2026-10-16T06:00:00','2026-10-16T11:59:59','2026-10-16T12:00:00','2026-10-16T17:59:59','2026-10-16T18:00:00']){
  await page.evaluate(time=>{HomePostFixture.at=Date.parse(time+'+09:00');shared.catCare=HomePostFixture.care();DayRoom.sync();},time);await decode();
  const row=await page.evaluate(()=>{const room=document.querySelector('.home-room-unit .day-room'),i=room.querySelector('.room-resident img'),s=DayRoom.snapshot(shared.userId),w=DayRoom.world();return{pose:room.dataset.nightPose||null,expected:NightCats.at(NightClock.now(),shared.userId)?.pose||null,style:room.style.cssText,daylight:w.daylight,originalDay:!w.daylight||i.outerHTML.replace(/ loading="eager"/g,'')===DayCats.svg(s.pose,state.coat)};});
  assert.equal(row.pose,row.expected);if(row.daylight){assert.equal(row.style,'');assert(row.originalDay);}transitions.push({time,...row});
 }
 // No renderer changes for other people's rooms or explicit sleeping cats.
 for(const coat of coats){
  const row=await page.evaluate(({coat,at})=>{HomePostFixture.at=at;HomePostFixture.sleep=true;shared.catCare=HomePostFixture.care();state.coat=coat;go('home');DayRoom.sync();const home=document.querySelector('.home-room-unit .day-room');return{sleep:home.querySelector('img[data-cat-scene=sleeping]')?.getAttribute('src'),pose:home.dataset.nightPose||null,style:home.style.cssText,peer:DayRoom.stage(coat,'peer',{status:'awake'}).includes('data-night-pose')};},{coat,at:times.window});
  assert(row.sleep?.includes(`/cat-refresh-v1/${coat}/night.png`));assert.equal(row.pose,null);assert.equal(row.style,'');assert.equal(row.peer,false);
 }
 // Feed once from every gesture and return to its same supported pose.
 for(const [pose,at] of Object.entries(times)){
  await page.evaluate(at=>{HomePostFixture.at=at;HomePostFixture.sleep=false;HomePostFixture.meals.clear();HomePostFixture.mealCalls=0;shared.catCare=HomePostFixture.care();state.coat='calico';go('home');},at);
  await page.locator('.home-room-unit .room-resident').click();assert.equal(await page.locator('.cat-meal-room .day-room').getAttribute('data-night-pose'),pose);
  await page.locator('[data-cat-meal]').click();await page.waitForSelector('.care-playing,.care-reduced');await page.waitForFunction(()=>!document.querySelector('.care-playing,.care-reduced'),{},{timeout:12000});await decode();
  assert.equal(await page.locator('.cat-meal-room .day-room').getAttribute('data-night-pose'),pose);assert(await page.locator('.cat-meal-room .room-resident').isVisible());assert(await page.locator('[data-cat-meal-complete]').isVisible());assert.equal(await page.evaluate(()=>HomePostFixture.mealCalls),1);
 }
 // Background resume refreshes the selected slot without choosing at random.
 await page.evaluate(at=>{HomePostFixture.at=at;go('home');Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));HomePostFixture.at+=NightCats.interval;delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));},times.curl);await settle();await decode();
 assert(await page.evaluate(()=>document.querySelector('.home-room-unit .day-room').dataset.nightPose===NightCats.at(NightClock.now(),shared.userId).pose));
 // Advance real browser timers with the original server-anchored NightClock.
 // Existing fixture reads advance from monotonic time, as a server would.
 await context.clock.install({time:Date.parse('2026-10-15T18:01:00+09:00')});
 await context.addInitScript(()=>{
  const f=HomePostFixture,snapshot=OyasumiAPI.snapshot;f.epoch=f.at;f.started=performance.now();
  OyasumiAPI.snapshot=async()=>{f.at=f.epoch+performance.now()-f.started;return snapshot();};
 });
 await page.goto(base+`?at=${Date.parse('2026-10-15T18:01:00+09:00')}&coat=calico`);await settle();
 const timed=[];for(const advance of [0,14*60000,15*60000,15*60000]){
  if(advance)await context.clock.fastForward(advance);
  await context.clock.runFor(1000);await settle();
  const row=await page.evaluate(()=>({at:NightClock.now(),pose:document.querySelector('.home-room-unit .day-room').dataset.nightPose,expected:NightCats.at(NightClock.now(),shared.userId).pose}));
  assert.equal(row.pose,row.expected);timed.push(row);
 }
 assert(new Set(timed.map(r=>r.pose)).size>=3,'Real 15-minute timers change gestures without reloading');
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);assert.deepEqual(external,[]);
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({pass:true,engine:edge?'Edge':'WebKit',published,release:JSON.parse(fs.readFileSync('release.json','utf8')).release,cases,transitions,timed,reloadStable:true,feedingReturn:true,sleepPreserved:true,resume:true,productionDbWrites:0,physicalIPhoneTested:false,errors,failed,external},null,2));
 console.log(`PASS night cats ${edge?'Edge':'WebKit'}: ${cases.length} coat/pose/width scenes, actual reloads, mounted day/night boundaries, sleeping cats, four feeding returns and background resume; API isolated, no DB writes.`);
}finally{await browser?.close();server?.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
