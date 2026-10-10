const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn,spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),base='http://127.0.0.1:9412',delay=ms=>new Promise(r=>setTimeout(r,ms));
const {webkit}=require('../webkit-tools/core/package');
const reviewOnly=process.argv.includes('--review-only');
const report={engine:'WebKit',actualIPhone:false,touch:true,scope:reviewOnly?'boundary-and-comparison':'full',geometry:[],seasons:[],feeding:[],boundaries:[],errors:[],requests:[]};
function run(args){const r=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',windowsHide:true});process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');assert.equal(r.status,0,args.join(' '));}
let server,browser;
(async()=>{
 if(!reviewOnly){
 run(['prepare-release.js']);
 for(const f of ['app.js','cat-care.js','day-room.js','day-room-state.js','season-weather.js','season-landscape.js','server.js'])run(['--check',f]);
 run(['prepare-release.js','--check']);
 for(const f of ['test-cat-day-scenes.js','test-cat-scenes.js','test-cat-image-assets.js','test-night-clock.js','test-timeline-visibility.js','test-cat-care-sql.cjs','test-cat-coat-unlock-sql.cjs'])run([f]);
 // The accepted state algorithms were copied without modification.
 assert.equal(fs.readFileSync(root+'/day-room-state.js','utf8'),fs.readFileSync(root+'/output/day-room-preview-v1/room-state.js','utf8'));
 assert.equal(fs.readFileSync(root+'/season-weather.js','utf8'),fs.readFileSync(root+'/output/season-weather-preview-v1/world-state.js','utf8'));
 assert.deepEqual(fs.readFileSync(root+'/assets/day-room/room.svg'),fs.readFileSync(root+'/output/day-room-preview-v1/room.svg'));
 run(['output/day-room-preview-v1/check-state.cjs']);run(['output/season-weather-preview-v1/check-state.cjs']);
 }
 server=spawn(process.execPath,[__dirname+'/serve.cjs'],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});server.stdout.on('data',b=>process.stdout.write(b));server.stderr.on('data',b=>process.stderr.write(b));
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await delay(100);}
 assert((await fetch(base)).ok);
 browser=await webkit.launch();const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,timezoneId:'America/Los_Angeles'}),page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(base))report.requests.push(r.url());});page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});
 await page.goto(base+'/app');await page.waitForFunction(()=>globalThis.RoomReviewReady);await page.evaluate(()=>RoomReviewReady);
 const selectors={home:'#app .day-room',meal:'#app .profile-room-unit .day-room',treat:'#public-profile-dialog .day-room','self-profile':'#public-profile-dialog .day-room'};
 async function control(view,extra={}){await page.evaluate(o=>RoomReviewControl(o),{view,date:'2026-10-10',hour:'14',place:'cushion',...extra});}
 async function geometry(view){return page.locator(selectors[view]).evaluate(stage=>{
  const cat=stage.querySelector('.room-resident'),a=stage.getBoundingClientRect(),b=cat.getBoundingClientRect(),art=stage.querySelector('.day-room-art').getBoundingClientRect();
  return {ratio:a.width/a.height,width:b.width/a.width,left:(b.left+b.width/2-a.left)/a.width,bottom:(a.bottom-b.bottom)/a.height,visible:getComputedStyle(cat).visibility,artFits:Math.abs(art.width-a.width)<1&&Math.abs(art.height-a.height)<1,overflow:document.documentElement.scrollWidth>innerWidth,loaded:cat.querySelector('img').naturalWidth>0,extraCats:stage.closest('.profile-room-unit')?.querySelector('.room-care-controls').querySelectorAll('img').length||0,window:[stage.dataset.worldSeason,stage.dataset.worldWeather]};
 });}
 if(!reviewOnly){
 for(const width of [320,360,375,390,393,402,414,428,430,440]){
  await page.setViewportSize({width,height:844});
  for(const view of ['home','meal','treat','self-profile'])for(const place of ['window','cushion','corner','away']){
   await control(view,{place});const g=await geometry(view),expected=place==='window'?[.31,.26,.482]:place==='corner'?[.35,.76,.155]:[.4,.5,.2];
   assert(Math.abs(g.ratio-400/330)<.003&&g.artFits&&!g.overflow&&g.loaded&&g.extraCats===0,JSON.stringify({width,view,place,g}));
   assert(Math.abs(g.width-expected[0])<.002&&Math.abs(g.left-expected[1])<.002&&Math.abs(g.bottom-expected[2])<.002,JSON.stringify({width,view,place,g}));assert.equal(g.visible,place==='away'?'hidden':'visible');
   report.geometry.push({width,view,place,...g});
  }console.log('PASS approved scene proportions, 4 scenes / 4 surfaces at '+width+'px');
 }
 await page.setViewportSize({width:390,height:844});
 for(const coat of await page.evaluate(()=>CatFaces.coats.map(c=>c.id)))for(const view of ['home','meal','treat']){await control(view,{coat,place:'corner'});assert((await geometry(view)).loaded);assert.equal(await page.locator(selectors[view]+' .room-resident img').getAttribute('data-cat-coat'),coat);}
 for(const season of ['spring','summer','autumn','winter'])for(const weather of ['sunny','cloudy','rainy'])for(const view of ['home','meal','treat']){
  await control(view,{season,weather});assert.deepEqual((await geometry(view)).window,[season,weather]);assert.equal(await page.locator(selectors[view]+' .season-landscape').getAttribute('data-season'),season);report.seasons.push({season,weather,view});
 }
 // Daytime profile artwork follows the approved room pose, independent of posts.
 for(const view of ['meal','treat']){await control(view);assert(await page.locator(selectors[view]).evaluate(s=>s.querySelector('.room-resident').innerHTML===DayCats.svg(DayRoom.snapshot(s.dataset.roomUser).pose,s.dataset.coat)));}
 for(const time of ['05:59:59','06:00:00','11:59:59','12:00:00','17:59:59','18:00:00'])for(const view of ['home','meal','treat']){
  await control(view,{time});const daylight=time>='06:00:00'&&time<'18:00:00',expected=view==='home'?!(time>='06:00:00'&&time<'12:00:00'):true;
  assert.equal(await page.locator(selectors[view]).count(),expected?1:0);report.boundaries.push({time,view,dayRoom:expected});
 }
 await control('meal');assert(await page.evaluate(()=>CatCoatCooldown.available(shared.catCoatStatus,NightClock.now())&&CatCoatCooldown.message(shared.catCoatStatus,NightClock.now()).includes('一時解除中')));report.temporaryUnlockRetained=true;
 for(const width of [320,390,440])for(const view of ['meal','self-profile','treat'])for(const away of [false,true]){
  await page.setViewportSize({width,height:844});await page.request.post(base+'/__care/reset');await page.evaluate(()=>refreshShared());await control(view,{place:away?'away':'cushion',coat:'calico'});
  const unit=page.locator(view==='meal'?'#app .profile-room-unit':'#public-profile-dialog .profile-room-unit'),button=unit.locator(view==='treat'?'[data-cat-treat]':'[data-cat-meal]');
  await page.evaluate(()=>{globalThis.playEvents=[];if(!globalThis.playListen){playListen=true;for(const name of ['careplaybackstart','careplaybackend'])document.addEventListener(name,e=>playEvents.push({name,time:performance.now(),ms:e.detail?.visibleMs}));}});
  await button.scrollIntoViewIfNeeded();const hit=await button.boundingBox();assert(hit&&hit.width>=44&&hit.height>=44);await button.tap();await unit.locator('.room-care-animation.care-playing').waitFor();
  const g=await unit.evaluate(u=>{const a=u.querySelector('.room-care-animation').getBoundingClientRect(),b=u.querySelector('.room-scene').getBoundingClientRect();return{inside:a.left>=b.left-1&&a.right<=b.right+1&&a.top>=b.top-1&&a.bottom<=b.bottom+1,residentHidden:getComputedStyle(u.querySelector('.room-resident')).visibility==='hidden',extraCats:u.querySelector('.room-care-controls').querySelectorAll('img').length};});assert(g.inside&&g.residentHidden&&g.extraCats===0);
  await page.evaluate(()=>{refreshCareCards();syncProfileRoom();renderPreservingPosition(true);});assert.equal(await unit.locator('.room-care-animation').count(),1);
  if(width===390&&view==='meal'&&!away)await unit.screenshot({path:__dirname+'/meal-390.png'});
  await page.waitForFunction(()=>DayRoom.playing===0,{},{timeout:12000});assert.equal(await unit.locator('.room-care-animation').count(),0);assert.equal(await unit.locator('.room-resident').evaluate(e=>getComputedStyle(e).visibility),away?'hidden':'visible');assert(await button.isDisabled());
  const ended=await page.evaluate(()=>playEvents.find(e=>e.name==='careplaybackend'));assert(ended.ms>=6000&&ended.ms<7500);report.feeding.push({width,view,away,visibleMs:ended.ms,...g});console.log(`PASS ${width}px ${view} ${away?'away':'home'}: original confirmed save and 6s playback`);
 }
 // Reduced motion, night and a day/night boundary while feeding.
 for(const reduced of [false,true]){
  await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});await page.request.post(base+'/__care/reset');await page.evaluate(()=>refreshShared());await control('treat',{hour:'23',place:'natural'});
  const unit=page.locator('#public-profile-dialog .profile-room-unit');await unit.locator('[data-cat-treat]').click();await unit.locator('.room-care-animation.'+(reduced?'care-reduced':'care-playing')).waitFor();await page.waitForFunction(()=>DayRoom.playing===0,{},{timeout:12000});assert.equal(await unit.locator('.day-room').count(),1);report.feeding.push({night:true,reduced});
 }
 }
 await page.emulateMedia({reducedMotion:'no-preference'});await page.request.post(base+'/__care/reset');await page.evaluate(()=>refreshShared());await control('meal',{time:'17:59:58',place:'cushion'});await page.locator('#app [data-cat-meal]').click();await page.locator('#app .room-care-animation.care-playing').waitFor();await page.waitForFunction(()=>DayRoom.playing===0,{},{timeout:12000});assert.equal(await page.locator('#app .profile-room-unit .day-room').getAttribute('data-world-daylight'),'false');report.boundaryRestored=true;
 // Comparison controls update every frame and the full-app link.
 await page.goto(base);await page.waitForFunction(()=>document.querySelector('[name=coat]').options.length===16);
 for(const place of ['window','cushion','corner','away']){await page.locator(`[data-reference-place="${place}"]`).click();assert.equal(await page.locator('[name=place]').inputValue(),place);assert.equal(await page.locator(`[data-reference-place="${place}"]`).getAttribute('aria-pressed'),'true');await page.waitForFunction(p=>[...document.querySelectorAll('iframe')].every(f=>f.contentWindow.DayRoom?.snapshot('test').away===(p==='away')&&f.contentWindow.DayRoom?.snapshot('test').place===(p==='away'?'cushion':p)),place);}
 // Isolated comparison samples also retain a running scene across refreshes.
 await page.selectOption('[name=place]','cushion');await page.evaluate(()=>document.querySelector('#care-reset').onclick());
 const frame=page.frames().find(f=>f.url().includes('surface=mypage'));
 await page.locator('iframe[title="マイページの猫部屋"]').scrollIntoViewIfNeeded();
 await frame.locator('[data-cat-meal]:enabled').waitFor();await frame.locator('[data-cat-meal]').click();await frame.locator('.room-care-animation.care-playing').waitFor();
 await frame.evaluate(()=>{globalThis.reviewAnimation=document.querySelector('.room-care-animation');render();});
 assert(await frame.evaluate(()=>reviewAnimation.isConnected&&document.querySelectorAll('.room-care-animation').length===1));await frame.waitForFunction(()=>DayRoom.playing===0,{},{timeout:12000});report.comparisonPlaybackPreserved=true;
 await page.selectOption('[name=place]','cushion');await page.setViewportSize({width:1760,height:1150});await page.waitForTimeout(500);await page.screenshot({path:__dirname+'/comparison-desktop.png',fullPage:true});
 for(const width of [320,390,430]){await page.setViewportSize({width,height:844});await page.waitForTimeout(250);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:__dirname+'/comparison-'+width+'.png',fullPage:true});}
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.requests,[]);fs.writeFileSync(__dirname+(reviewOnly?'/review-report.json':'/report.json'),JSON.stringify(report,null,2));console.log(reviewOnly?'PASS 18:00 playback boundary, reference scene buttons and comparison playback across refresh; no external requests.':'PASS shared daytime room, retained images/SQL/night sleep status, four seasons and weather; no external requests.');
})().catch(async e=>{console.error(e);if(browser){for(const context of browser.contexts())for(const page of context.pages()){await page.screenshot({path:__dirname+'/failure.png',fullPage:true}).catch(()=>{});for(const frame of page.frames())console.log(await frame.evaluate(()=>({url:location.href,buttons:[...document.querySelectorAll('[data-cat-meal]')].map(b=>({box:b.getBoundingClientRect().toJSON(),display:getComputedStyle(b).display,disabled:b.disabled})),sample:document.querySelector('#room-sample')?.getBoundingClientRect().toJSON()})).catch(()=>({})));}}process.exitCode=1;}).finally(async()=>{await browser?.close();server?.kill();});
