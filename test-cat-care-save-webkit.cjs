const assert=require('node:assert/strict'),fs=require('node:fs');
const {webkit}=require(process.env.OYASUMI_PLAYWRIGHT||'playwright');
(async()=>{const browser=await webkit.launch();const report=[];try{
 for(const standalone of [false,true]){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.addInitScript(value=>Object.defineProperty(navigator,'standalone',{value}),standalone);
  await context.addInitScript(()=>globalThis.OyasumiUpdates={});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:9390/test-support/cat-care/screen.html');await page.waitForFunction(()=>globalThis.CarePreview&&document.querySelector('[data-cat-meal]'));
  await page.evaluate(()=>{globalThis.savedCareMeal=OyasumiAPI.giveCatMeal;globalThis.savedCareStatus=OyasumiAPI.getCatCareStatus;globalThis.savedDeadline=CatCare.deadline;});
  const prepare=async()=>page.evaluate(async()=>{OyasumiAPI.giveCatMeal=savedCareMeal;OyasumiAPI.getCatCareStatus=savedCareStatus;CatCare.deadline=savedDeadline;CatCare.clearFeedback();busy=false;await fetch('/__care/reset',{method:'POST'});await CarePreview.show('calico','meal');});
  await prepare();await page.evaluate(()=>{shared.catCare.mealEligible=false;refreshCareCards();});
  assert(await page.locator('[data-cat-meal]').isDisabled());assert((await page.locator('main .care-feedback').textContent()).includes('今日0時以降'));
  await prepare();await page.evaluate(()=>busy=true);await page.locator('[data-cat-meal]').tap();assert((await page.locator('main .care-feedback').textContent()).includes('ほかの操作'));
  for(const code of ['P0040','P0041','PGRST202','42501','PGRST301','CARE_RESPONSE','CARE_TIMEOUT','NETWORK']){
   await prepare();await page.evaluate(code=>{OyasumiAPI.giveCatMeal=async()=>{throw {code}};},code);
   await page.locator('[data-cat-meal]').tap();await page.waitForFunction(()=>!CatCare.pending);
   const feedback=await page.locator('main .care-feedback').textContent();assert(feedback.includes(code));assert(!await page.locator('.care-playing').count());
   await page.evaluate(()=>refreshShared());assert.equal(await page.locator('main .care-feedback').textContent(),feedback);report.push({standalone,error:code,pass:true});
  }
  for(const accepted of [true,'true']){
   await prepare();await page.evaluate(accepted=>{OyasumiAPI.giveCatMeal=async()=>({accepted,status:{...shared.catCare,mealDone:false}});},accepted);
   await page.locator('[data-cat-meal]').tap();await page.waitForFunction(()=>!CatCare.pending);assert(!await page.locator('.care-playing').count());assert((await page.locator('main .care-feedback').textContent()).includes('CARE_RESPONSE'));
  }
  await prepare();await page.evaluate(()=>{CatCare.deadline=work=>savedDeadline(work,80);OyasumiAPI.giveCatMeal=()=>new Promise(()=>{});});
  await page.locator('[data-cat-meal]').tap();await page.waitForFunction(()=>!CatCare.pending);assert((await page.locator('main .care-feedback').textContent()).includes('CARE_TIMEOUT'));
  await prepare();await page.evaluate(()=>{OyasumiAPI.giveCatMeal=async()=>{await new Promise(r=>setTimeout(r,250));return savedCareMeal();};});
  await page.locator('[data-cat-meal]').tap();assert.equal(await page.evaluate(()=>OyasumiUpdates.canReload()),false);await page.evaluate(()=>{refreshCareCards();void refreshShared();});
  await page.waitForSelector('main .care-playing');assert.equal(await page.evaluate(()=>OyasumiUpdates.canReload()),false);assert((await page.locator('[data-cat-meal]').textContent()).includes('あげました'));assert(await page.evaluate(()=>shared.catCare.mealDone));
  // Natural, visible six-second playback and phase timing in both motion modes.
  for(const reduced of [false,true]){
   await prepare();await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
   await page.evaluate(()=>{globalThis.careTiming=[];document.addEventListener('careplaybackend',e=>careTiming.push(e.detail),{once:true});});
   const started=Date.now();await page.locator('[data-cat-meal]').tap();await page.waitForSelector(reduced?'.care-reduced':'.care-playing');
   await page.waitForFunction(()=>document.querySelector('.care-scene[data-care-stage="munch"]'));assert(Date.now()-started>=900);
   await page.evaluate(()=>refreshShared());await page.waitForFunction(()=>document.querySelector('.care-scene[data-care-stage="joy"]'));assert(Date.now()-started>=3900);
   const joyAt=Date.now();await page.waitForFunction(()=>careTiming.length>0);assert(Date.now()-joyAt>=1800);
   const visibleMs=await page.evaluate(()=>careTiming[0].visibleMs);assert(visibleMs>=6000&&visibleMs<7000);assert(Date.now()-started>=5900);assert.equal(await page.evaluate(()=>OyasumiUpdates.canReload()),true);
   assert(await page.locator('main .care-caption').isVisible());report.push({standalone,reduced,visibleMs,pass:true});
  }
  await prepare();await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>{globalThis.careHidden=false;Object.defineProperty(document,'hidden',{configurable:true,get:()=>careHidden});globalThis.backgroundTiming=[];document.addEventListener('careplaybackend',e=>backgroundTiming.push(e.detail),{once:true});});
  const backgroundStart=Date.now();await page.locator('[data-cat-meal]').tap();await page.waitForSelector('.care-playing');
  await page.waitForTimeout(1200);await page.evaluate(()=>{careHidden=true;document.dispatchEvent(new Event('visibilitychange'));});
  const paused=await page.evaluate(()=>({stage:document.querySelector('.care-playing').dataset.careStage,time:document.querySelector('.care-playing .care-munch').getAnimations()[0].currentTime}));
  await page.waitForTimeout(1500);assert.equal(await page.evaluate(()=>document.querySelector('.care-playing').dataset.careStage),paused.stage);
  assert(Math.abs(await page.evaluate(()=>document.querySelector('.care-playing .care-munch').getAnimations()[0].currentTime)-paused.time)<100);
  await page.evaluate(()=>{careHidden=false;document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForFunction(()=>backgroundTiming.length>0,{},{timeout:9000});assert(Date.now()-backgroundStart>=7400);
  report.push({standalone,backgroundPause:true,visibleMs:await page.evaluate(()=>backgroundTiming[0].visibleMs),pass:true});
  assert.deepEqual(errors,[]);await context.close();console.log('PASS WebKit taps, eligibility, RPC errors, strict success, timeout, refresh race, measured six seconds: '+standalone);
 }
 fs.mkdirSync('output/cat-care-save',{recursive:true});fs.writeFileSync('output/cat-care-save/report.json',JSON.stringify({pass:true,actualIPhone:false,standaloneSimulation:true,report},null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
