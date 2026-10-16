const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {webkit,chromium}=require('./output/webkit-tools/core/package'),installPlacesFixture=require('./test-support/cat-places-fixture.cjs');
const edge=process.argv.includes('--edge'),published=process.argv.includes('--published'),engine=edge?'Edge':'WebKit',port=edge?9502:9501;
const base=published?'https://tomowo985250z-cmyk.github.io/oyasumi/':`http://127.0.0.1:${port}/`,out=path.join(__dirname,'output/cat-places-production',`${published?'published':'local'}-${engine.toLowerCase()}`);fs.mkdirSync(out,{recursive:true});
const source=fs.readFileSync('test-home-post-choices.cjs','utf8'),fixture=source.slice(source.indexOf('function installFixture()'),source.indexOf('\n(async () =>'))+'\ninstallFixture();';
const server=published?null:spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'ignore'});let browser;
(async()=>{try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await(edge?chromium:webkit).launch(edge?{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
 const errors=[],failed=[],external=[],contexts=[],pages=[];
 for(const role of ['own','other']){
  const c=await browser.newContext({viewport:{width:375,height:950},deviceScaleFactor:1,isMobile:true,hasTouch:true,timezoneId:role==='own'?'Asia/Tokyo':'America/Los_Angeles'});
  await c.addInitScript({content:fixture});await c.addInitScript(installPlacesFixture);contexts.push(c);
  const p=await c.newPage();pages.push(p);p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
  await p.route('**/*',r=>{if(!r.request().url().startsWith(base)){external.push(r.request().url());return r.abort();}if(/\/(vendor\/supabase|supabase-api|update-client)\.js(?:\?|$)/.test(new URL(r.request().url()).pathname))return r.fulfill({contentType:'text/javascript',body:''});return r.continue();});
  await p.goto(base+'?viewer='+role);await p.waitForFunction(()=>typeof ready!=='undefined'&&ready&&!busy&&!refreshPromise&&!refreshQueued);
  await p.evaluate(()=>NightClock.now=()=>HomePostFixture.at);
 }
 const [home,peer]=pages,settle=p=>p.waitForFunction(()=>!busy&&!refreshPromise&&!refreshQueued&&!CatCare.pending),decode=p=>p.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
 const release=JSON.parse(fs.readFileSync('release.json','utf8')).release;assert.equal(await home.locator('meta[name=oyasumi-release]').getAttribute('content'),release);
 const times=await home.evaluate(()=>{
  for(let d=0;d<60;d++){const plan=CatPlaces.schedule(Date.parse('2026-10-01T14:00:00+09:00')+d*86400000,shared.userId);if(new Set(plan.events.map(e=>e.place)).size===3)return Object.fromEntries(CatPlaces.places.map(p=>[p,plan.events.find(e=>e.place===p).at+1000]));}
  throw Error('No natural-weather day with all three places');
 });
 const show=async(p,{at,coat='calico',sleep=false,meal=false})=>{
  await p.bringToFront();await settle(p);await p.evaluate(({at,coat,sleep,meal})=>{
   const f=HomePostFixture;f.at=at;f.coat=coat;f.sleep=sleep;shared.catCare=f.care();document.querySelectorAll('dialog[open]').forEach(d=>d.close());
   if(f.viewer===f.owner){state.coat=coat;go(meal?'catMeal':'home');}
   else{go('timeline');publicProfilePerson=f.person();publicProfileViewer=shared.userId;CatImages.render(document.querySelector('#public-profile-content'),publicProfileRoom(publicProfilePerson));document.querySelector('#public-profile-dialog').showModal();}
  },{at,coat,sleep,meal});await decode(p);
 };
 const sample=p=>p.evaluate(()=>{
  const stage=document.querySelector(HomePostFixture.viewer===HomePostFixture.owner?'.home-room-unit .day-room':'#public-profile-content .day-room'),cat=stage.querySelector('.room-resident img'),r=stage.getBoundingClientRect(),c=cat.getBoundingClientRect();
  return {location:stage.dataset.location,place:stage.dataset.place,pose:cat.dataset.dayScene,night:stage.dataset.nightPose||null,coat:cat.dataset.catCoat,src:cat.getAttribute('src'),loaded:cat.complete&&cat.naturalWidth>0,overflow:document.documentElement.scrollWidth>innerWidth,relative:{x:c.x-r.x,y:c.y-r.y,width:c.width,height:c.height},stageWidth:r.width};
 });
 const cases=[],coats=await home.evaluate(()=>CatFaces.coats.map(c=>c.id));
 for(const width of process.argv.includes('--care-only')?[]:[320,360,375,390,402,414,430]){
  for(const p of pages)await p.setViewportSize({width,height:950});
  for(const coat of coats)for(const [place,at] of Object.entries(times)){
   for(const p of pages)await show(p,{at,coat});const a=await sample(home),b=await sample(peer);
   assert.equal(a.location,place);assert.equal(b.location,place);assert.equal(a.pose,b.pose);assert.equal(a.src,b.src);assert.equal(a.coat,coat);
   if(!(a.loaded&&b.loaded&&!a.overflow&&!b.overflow)){
    fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({width,coat,place,a,b},null,2));
    for(let i=0;i<pages.length;i++)await pages[i].screenshot({path:path.join(out,'failure-'+i+'.png'),fullPage:true});
   }
   assert(a.loaded&&b.loaded&&!a.overflow&&!b.overflow,JSON.stringify({width,coat,place,a,b}));
   for(const s of [a,b]){assert(s.relative.x>=-1&&s.relative.y>=-1);assert(s.relative.x+s.relative.width<=s.stageWidth+1);assert(s.relative.y+s.relative.height<=s.stageWidth*330/400+1);}
   if(place!=='room'){assert.equal(a.place,'cushion');assert(Math.abs(a.relative.width/a.stageWidth-.4)<.001);assert.notEqual(a.pose,'gaze');}
   if(width===375){const clip=await home.locator('.home-room-unit .day-room').boundingBox();await home.screenshot({path:path.join(out,`${coat}-${place}-375.png`),clip});}
   cases.push({width,coat,place,at,home:a,profile:b});
  }console.log(`PASS ${engine} ${width}px: 16 cats × 3 places on home and another viewer's profile`);
 }
 // Fresh documents and independent viewer timezones retain a shared location/pose.
 for(let i=0;i<pages.length;i++){
  const p=pages[i];await p.goto(base+'?viewer='+(i?'other':'own')+'&at='+times.garden+'&coat=manul');await settle(p);await p.evaluate(()=>NightClock.now=()=>HomePostFixture.at);
  const navigate=async()=>{if(i){await p.evaluate(()=>go('timeline'));await p.locator('[data-public-profile=owner-post]').click();}else await p.evaluate(()=>go('home'));await decode(p);};
  await navigate();const previous=await sample(p);await p.reload();await settle(p);await p.evaluate(()=>NightClock.now=()=>HomePostFixture.at);await navigate();
  const fresh=await sample(p);assert.equal(fresh.location,previous.location);assert.equal(fresh.pose,previous.pose);assert.equal(fresh.src,previous.src);
 }
 const playbacks=[];
 for(const [place,start] of Object.entries(times))for(const kind of ['meal','treat']){
  const p=kind==='meal'?home:peer;
  const end=await p.evaluate(start=>CatPlaces.at(start,HomePostFixture.owner).nextAt,start);await show(p,{at:end-1000,meal:kind==='meal'});
  if(kind==='treat')await p.locator('#public-profile-content .public-profile-care-icon').click();
  await p.evaluate(()=>{HomePostFixture.meals.clear();HomePostFixture.treats=[];HomePostFixture.mealCalls=0;HomePostFixture.treatCalls=0;shared.catCare=HomePostFixture.care();CareEvents.length=0;refreshCareCards();});
  const before=await p.locator('.cat-'+kind+'-room .day-room').getAttribute('data-location');assert.equal(before,place);
  await p.locator(kind==='meal'?'[data-cat-meal]':'[data-cat-treat]').click();await p.waitForSelector('.care-playing');
  await p.evaluate(end=>{HomePostFixture.at=end+1000;shared.catCare=HomePostFixture.care();DayRoom.sync();renderPreservingPosition();},end);
  assert.equal(await p.locator('.cat-'+kind+'-room .day-room').getAttribute('data-location'),place);
  await p.waitForFunction(()=>DayRoom.playing===0,null,{timeout:15000});await settle(p);
  const result=await p.evaluate(kind=>({events:CareEvents,calls:kind==='meal'?HomePostFixture.mealCalls:HomePostFixture.treatCalls,where:document.querySelector('.room-scene').dataset.location,expected:CatPlaces.at(NightClock.now(),HomePostFixture.owner).place}),kind);
  assert.equal(result.calls,1);assert.equal(result.where,result.expected);assert.equal(result.events.find(e=>e.type==='careplaybackreturn').where,place);assert(result.events.find(e=>e.type==='careplaybackend').ms>=6000);playbacks.push({place,kind,...result});
 }
 // Sleeping residents return to the same room on either account; nights keep the original gestures.
 for(const p of pages){await show(p,{at:times.garden,sleep:true});assert.equal((await sample(p)).location,'room');}
 assert.equal(await home.locator('img[data-cat-scene=sleeping]').count(),1);
 for(const time of ['2026-10-15T05:59:59','2026-10-15T06:00:00','2026-10-15T17:59:59','2026-10-15T18:00:00','2026-10-15T23:59:59','2026-10-16T00:00:00']){
  const at=Date.parse(time+'+09:00');for(const p of pages){await show(p,{at});assert.equal((await sample(p)).location,await p.evaluate(()=>CatPlaces.at(NightClock.now(),HomePostFixture.owner).place));}
 }
 // The real mounted sync follows a movement boundary and resumes after backgrounding.
 await contexts[0].clock.install();await home.goto(base+'?at='+times.garden);await settle(home);
 await home.evaluate(()=>{NightClock.now=()=>HomePostFixture.at;const f=HomePostFixture;f.at=CatPlaces.at(f.at,f.owner).nextAt-2000;go('home');});
 await home.evaluate(()=>{HomePostFixture.at+=6000;});await contexts[0].clock.runFor(5100);
 assert.equal((await sample(home)).location,await home.evaluate(()=>CatPlaces.at(HomePostFixture.at,HomePostFixture.owner).place));
 await home.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));HomePostFixture.at+=120*60000;Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await settle(home);
 assert.equal((await sample(home)).location,await home.evaluate(()=>CatPlaces.at(HomePostFixture.at,HomePostFixture.owner).place));
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);assert.deepEqual(external,[]);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({pass:true,engine,published,release,cases,playbacks,reloadStable:true,independentViewers:true,serverClock:true,sleepPreserved:true,nightRoom:true,backgroundResume:true,productionDbWrites:0,errors,failed,external,physicalIPhoneTested:false},null,2));
 console.log(`PASS ${engine}: ${cases.length} home/profile pairs, actual meal/treat saves and six-second playback in every location, reload and day/night/resume.`);
}finally{await browser?.close();server?.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
