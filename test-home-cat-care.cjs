const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {webkit,chromium}=require(process.env.OYASUMI_PLAYWRIGHT_PATH||'./output/webkit-tools/core/package');
const engine=process.argv.includes('--edge')?'edge':'webkit',port=engine==='edge'?9408:9407,base=`http://127.0.0.1:${port}/`;
const output=path.join(__dirname,'output/home-cat-care',engine);fs.mkdirSync(output,{recursive:true});
const source=fs.readFileSync(path.join(__dirname,'test-home-post-choices.cjs'),'utf8');
const fixture=source.slice(source.indexOf('function installFixture()'),source.indexOf('\n(async () =>'))+'\ninstallFixture();';
const server=spawn(process.execPath,['server.js'],{cwd:__dirname,env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'ignore'});
let browser;
(async()=>{try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await(engine==='edge'?chromium:webkit).launch(engine==='edge'?{executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,timezoneId:'America/Los_Angeles'});
 await context.addInitScript({content:fixture});
 await context.addInitScript(()=>{
  const f=HomePostFixture,api=OyasumiAPI,snapshot=api.snapshot;f.meals=new Set();f.treats=[];f.delay=100;f.mealCalls=0;f.failMeal=false;
  f.care=()=>({allowanceVersion:2,day:SleepFlow.night(f.at),mealSlot:CatCare.slot(f.at),mealEligible:true,mealDone:f.meals.has(SleepFlow.night(f.at)+':'+CatCare.slot(f.at)),treatGiven:false,treatCount:f.treats.length,treatRecipients:[...f.treats],receivedToday:2,receivedTotal:8,receivedDays:[{day:SleepFlow.day(f.at),count:2}]});
  api.snapshot=async()=>({...await snapshot(),catCare:f.care()});api.getCatCareStatus=async()=>f.care();
  api.giveCatMeal=async()=>{f.mealCalls++;await new Promise(r=>setTimeout(r,f.delay));if(f.failMeal)throw Error('Isolated meal failure');const key=SleepFlow.night(f.at)+':'+CatCare.slot(f.at),accepted=!f.meals.has(key);f.meals.add(key);return{accepted,status:f.care()};};
  api.giveCatTreat=async id=>{f.treats.push(id);return{accepted:true,status:f.care()};};
 });
 const page=await context.newPage(),errors=[],failed=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
 await page.route('**/*',route=>{const url=new URL(route.request().url());if(!url.href.startsWith(base))return route.abort();if(/\/(?:vendor\/supabase|supabase-api|update-client)\.js$/.test(url.pathname))return route.fulfill({contentType:'text/javascript',body:''});return route.continue();});
 await page.goto(base);await page.waitForFunction(()=>typeof ready!=='undefined'&&ready&&!busy);
 const settle=()=>page.waitForFunction(()=>!busy&&!CatCare.pending&&!refreshPromise&&!refreshQueued);
 const reset=async(time='2026-10-11T14:00:00+09:00',coat='calico')=>{
  await settle();await page.evaluate(async({time,coat})=>{HomePostFixture.reset();HomePostFixture.meals.clear();HomePostFixture.treats=[];HomePostFixture.mealCalls=0;HomePostFixture.failMeal=false;HomePostFixture.delay=100;HomePostFixture.at=Date.parse(time);NightClock.now=()=>HomePostFixture.at;state.lastSleep=null;document.querySelectorAll('dialog[open]').forEach(d=>d.close());await refreshShared();state.coat=coat;go('home');},{time,coat});
 };
 const layouts=[];
 for(const width of [320,375,390,430]){
  await page.setViewportSize({width,height:844});
  for(const hour of [0,5,6,11,12,14,17,18,23])for(const light of [false,true]){
   await reset(`2026-10-11T${String(hour).padStart(2,'0')}:00:00+09:00`);
   await page.evaluate(light=>{state.light=light;render();},light);
   assert(await page.locator('.home-room-unit .room-resident').isVisible());
   assert.equal(await page.locator('[data-cat-meal]').count(),1);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert.equal(await page.locator('.day-room').getAttribute('data-away'),'false');
   layouts.push({width,hour,light});
  }
  await page.evaluate(()=>go('profile'));assert.equal(await page.locator('.day-room,.care-scene,[data-cat-meal]').count(),0);
  assert(await page.locator('.profile-cat-button .avatar').isVisible());
 }
 // Former absence intervals never hide the cat; preserve the seeded moods/places.
 await reset();assert(await page.evaluate(()=>{for(let i=0;i<360;i++)if(DayRoomState.at(Date.parse('2026-10-11T12:00:00+09:00')+i*60000,shared.userId).away)return false;return true;}));
 assert(await page.evaluate(()=>DayRoom.stage('calico','other-cat',{status:'sleep'}).includes('data-day-scene')),'Other profiles retain their time-of-day artwork');
 const scenes=[];
 for(const width of [320,375,390,430]){
 await page.setViewportSize({width,height:844});
 for(const coat of await page.evaluate(()=>CatFaces.coats.map(c=>c.id))){
  await reset(undefined,coat);
  await page.evaluate(()=>{document.querySelector('[data-cat-meal]').click();document.querySelector('[data-cat-meal]').click();});
  await page.waitForSelector('.room-care-animation.care-playing');
  assert.equal(await page.evaluate(()=>HomePostFixture.mealCalls),1);
  assert(await page.evaluate(async()=>{const s=document.querySelector('.care-playing'),a=s.querySelector('.care-munch').getAnimations()[0];refreshCareCards();await refreshShared();return s.isConnected&&s.querySelector('.care-munch').getAnimations()[0]===a;}));
  for(const [time,selector] of [[500,'.care-idle'],[2500,'.care-munch'],[5000,'.care-joy-cat']]){
   const result=await page.evaluate(async({time,selector})=>{const s=document.querySelector('.care-playing');for(const a of s.getAnimations({subtree:true})){a.pause();a.currentTime=time;}await new Promise(requestAnimationFrame);const el=s.querySelector(selector),r=el.getBoundingClientRect();return{opacity:+getComputedStyle(el).opacity,width:r.width,height:r.height,visible:getComputedStyle(el).visibility,loaded:[...s.querySelectorAll('img')].every(i=>i.naturalWidth>0)};},{time,selector});
   assert(result.opacity>.9&&result.width>0&&result.height>0&&result.visible==='visible'&&result.loaded,JSON.stringify({coat,time,result}));
   if(coat==='calico')await page.screenshot({path:path.join(output,`meal-${width}-${time}.png`)});
  }
  scenes.push({width,coat});
 }
 console.log(`PASS ${engine} ${width}px: all 16 coats and 3 meal phases`);
 }
 // Other people's treats keep their existing room animation and duplicate lock.
 await reset();await page.evaluate(async()=>{HomePostFixture.peer=true;await refreshShared();go('timeline');});
 await page.locator('[data-public-profile=legacy-peer]').click();
 await page.locator('[data-cat-treat]').click();await page.waitForSelector('dialog .care-playing');
 assert(await page.locator('[data-cat-treat]').isDisabled());
 assert.equal(await page.locator('dialog .care-playing').getAttribute('data-care-kind'),'treat');
 assert(await page.locator('dialog .care-playing .care-bowl').isVisible());
 await page.evaluate(()=>{document.querySelector('#public-profile-dialog').close();document.querySelector('#public-profile-content').replaceChildren();});
 // Real visible time, natural return and restoration of a sleeping resident.
 await reset('2026-10-11T14:00:00+09:00');
 await page.locator('[data-home-choice=sleep]').click();await settle();await page.evaluate(()=>go('home'));
 assert.equal(await page.locator('.room-resident img').getAttribute('data-cat-scene'),'sleeping');
 await page.evaluate(()=>{globalThis.playbackMs=null;document.addEventListener('careplaybackend',e=>playbackMs=e.detail.visibleMs,{once:true});});
 await page.locator('[data-cat-meal]').click();await page.waitForSelector('.care-playing');
 const started=Date.now();await page.waitForFunction(()=>!document.querySelector('.care-playing'),{},{timeout:10000});
 assert(Date.now()-started>=5500);assert(await page.evaluate(()=>playbackMs>=6000&&DayRoom.playing===0));
 assert(await page.locator('.room-resident').isVisible());assert.equal(await page.locator('.room-resident img').getAttribute('data-cat-scene'),'sleeping');
 assert(await page.locator('[data-cat-meal]').isDisabled());
 // 3h does not reset the home cat; midnight does not reset it; 06:00 does.
 for(const time of ['2026-10-11T17:00:01+09:00','2026-10-12T00:00:00+09:00','2026-10-12T05:59:59.999+09:00']){
  await page.evaluate(time=>{HomePostFixture.at=Date.parse(time);DayRoom.sync();},time);assert.equal(await page.locator('.room-resident img').getAttribute('data-cat-scene'),'sleeping');
 }
 await page.evaluate(()=>{HomePostFixture.at=Date.parse('2026-10-12T06:00:00+09:00');checkNightBoundary();DayRoom.sync();});
 assert.equal(await page.evaluate(()=>homeCatStatus()),'');assert.equal(await page.locator('.room-resident img').getAttribute('data-cat-scene'),null);
 await page.evaluate(()=>refreshCareDay());assert.equal(await page.locator('[data-cat-meal]').isDisabled(),false);
 assert.equal(await page.evaluate(()=>CatCare.slot(Date.parse('2026-10-12T11:59:59.999+09:00'))),'morning');
 assert.equal(await page.evaluate(()=>CatCare.slot(Date.parse('2026-10-12T12:00:00+09:00'))),'night');
 // No restrictions on browsing/reactions/changes after sleeping.
 await reset();await page.evaluate(()=>{HomePostFixture.peer=true;});await page.locator('[data-home-choice=sleep]').click();await settle();
 await page.locator('#navigation [data-view=timeline]').click();await page.locator('[data-react=legacy-peer]').first().click();await settle();
 assert(await page.evaluate(()=>!!state.reactions['legacy-peer']));
 await page.evaluate(()=>{finishSleep();});assert(await page.locator('.rest-screen [data-view=home]').isVisible());
 await page.locator('#navigation [data-view=home]').click();assert.equal(await page.locator('[data-cat-meal]').count(),1);
 await page.evaluate(()=>go('home'));await page.locator('[data-home-choice=sleepless]').click();await settle();assert.equal(await page.evaluate(()=>homeCatStatus()),'awake');
 // Pending save survives navigation; returning cannot create a second RPC.
 await reset();await page.evaluate(()=>{HomePostFixture.delay=1000;document.querySelector('[data-cat-meal]').click();go('profile');go('home');document.querySelector('[data-cat-meal]').click();});
 await settle();assert.equal(await page.evaluate(()=>HomePostFixture.mealCalls),1);assert(await page.locator('[data-cat-meal]').isDisabled());
 await page.waitForSelector('.care-playing');await page.evaluate(()=>{go('timeline');go('home');document.querySelector('[data-cat-meal]').click();});
 await settle();assert.equal(await page.evaluate(()=>HomePostFixture.mealCalls),1);await page.waitForFunction(()=>DayRoom.playing===0);
 // Failed saves retry; a server-confirmed duplicate never replays.
 await reset();await page.evaluate(()=>{HomePostFixture.failMeal=true;document.querySelector('[data-cat-meal]').click();});await settle();assert.equal(await page.locator('[data-cat-meal]').isDisabled(),false);
 await page.evaluate(()=>{HomePostFixture.failMeal=false;HomePostFixture.meals.add(SleepFlow.night(HomePostFixture.at)+':'+CatCare.slot(HomePostFixture.at));document.querySelector('[data-cat-meal]').click();});await settle();assert.equal(await page.locator('.care-playing').count(),0);
 // Reduced motion follows the same three phases for the full six seconds.
 await page.emulateMedia({reducedMotion:'reduce'});await reset();await page.locator('[data-cat-meal]').click();await page.waitForSelector('.care-reduced[data-care-stage=plate]');
 await page.waitForSelector('.care-reduced[data-care-stage=munch]');await page.waitForSelector('.care-reduced[data-care-stage=joy]');await page.waitForFunction(()=>!document.querySelector('.care-reduced'));assert(await page.locator('.room-resident').isVisible());
 await page.emulateMedia({reducedMotion:'no-preference'});
 // Slow image decode must keep the normal cat visible until food can be shown.
 await reset();
 await page.route('**/*cold-meal*',async route=>{await new Promise(r=>setTimeout(r,800));await route.continue();});
 await page.evaluate(()=>{globalThis.originalMealVisual=CatCare.visual;CatCare.visual=(...args)=>originalMealVisual(...args).replace(/src="([^"]+)"/g,(_,src)=>`src="${src}${src.includes('?')?'&':'?'}cold-meal=1"`);document.querySelector('[data-cat-meal]').click();});
 await page.waitForFunction(()=>DayRoom.playing===1);
 assert(await page.locator('.room-resident').isVisible(),'Keep resident visible during image decode');
 await page.evaluate(()=>go('profile'));await page.waitForFunction(()=>DayRoom.playing===0);
 await page.evaluate(()=>{CatCare.visual=originalMealVisual;go('home');});assert(await page.locator('[data-cat-meal]').isDisabled());
 // Leaving a backgrounded animation must clear its lock without a phase timer.
 await reset();await page.locator('[data-cat-meal]').click();await page.waitForSelector('.care-playing');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));document.dispatchEvent(new Event('visibilitychange'));go('profile');});
 await page.waitForFunction(()=>DayRoom.playing===0);await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({pass:true,engine,layouts,coats:scenes,sixSecondPlayback:true,refreshPreservesAnimation:true,navigationDuplicatePrevention:true,sleepUntilSix:true,reducedMotion:true,productionDbWrites:false,errors,failed},null,2));
 console.log(`PASS ${engine}: ${layouts.length} mobile/time/theme layouts, ${scenes.length} coat/width combinations × 3 meal stages, six-second playback, 06:00/12:00, sleep interactions, duplicate/error recovery, reduced motion, cold decode and hidden navigation`);
 }finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
