// Explicit production verification: isolated test accounts only. No schema/config changes.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {webkit}=require(process.env.OYASUMI_PLAYWRIGHT||'playwright');
(async()=>{const browser=await webkit.launch(),report=[];try{
 for(const standalone of [false,true]){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.addInitScript(value=>Object.defineProperty(navigator,'standalone',{value}),standalone);
  // Test the draft client against real RPCs before publishing. Other assets stay live.
  for(const file of ['index.html','app.js','cat-care.js','style.css'])await context.route('**/'+file+'*',route=>route.fulfill({path:file,contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'}));
  const page=await context.newPage(),responses=[];let postId;
  page.on('response',async response=>{if(response.url().endsWith('/rpc/oyasumi_give_cat_meal'))responses.push({http:response.status(),body:await response.json()});});
  try{
   await page.goto('https://tomowo985250z-cmyk.github.io/oyasumi/index.html?care-save-check='+Date.now());
   await page.waitForFunction(()=>typeof ready!=='undefined'&&ready&&!busy,{},{timeout:90000});
   await page.evaluate(async()=>{await OyasumiAPI.setNickname('食事タップ検証');await OyasumiAPI.setCatCoat('calico');await refreshShared();go('profile');});
   assert(await page.locator('[data-cat-meal]').isDisabled());assert((await page.locator('main .care-feedback').textContent()).includes('今日0時以降'));
   postId=await page.evaluate(async()=>{const post=await OyasumiAPI.submitPost('sleep');await refreshShared();go('profile');return post.id;});
   assert(await page.locator('[data-cat-meal]').isEnabled());
   await page.evaluate(()=>{globalThis.measuredCare=[];document.addEventListener('careplaybackend',e=>measuredCare.push(e.detail),{once:true});});
   const started=Date.now();await page.locator('[data-cat-meal]').tap();
   await page.waitForSelector('.care-playing',{timeout:30000});assert(await page.evaluate(()=>shared.catCare.mealDone));
   assert((await page.locator('[data-cat-meal]').textContent()).includes('あげました'));
   await page.waitForFunction(()=>measuredCare.length>0,{},{timeout:10000});const visibleMs=await page.evaluate(()=>measuredCare[0].visibleMs);
   assert(visibleMs>=6000&&visibleMs<7000);assert(Date.now()-started>=6000);assert(responses.some(r=>r.http===200&&r.body.accepted===true&&r.body.status.mealDone===true));
   await page.reload();await page.waitForFunction(()=>typeof ready!=='undefined'&&ready&&!busy,{},{timeout:90000});await page.evaluate(()=>go('profile'));
   assert(await page.locator('[data-cat-meal]').isDisabled());assert((await page.locator('[data-cat-meal]').textContent()).includes('あげました'));
   assert.equal(await page.evaluate(async()=>(await OyasumiAPI.client.rpc('oyasumi_cat_coat_cooldown_paused')).data),true);
   report.push({standalone,visibleMs,savedAfterReload:true,rpcConfirmed:true});console.log('PASS live WebKit touch, qualification, real meal save, measured duration, reload, paused cooldown: '+standalone);
  }finally{
   if(postId)await page.evaluate(id=>OyasumiAPI.deletePost(id),postId).catch(()=>{});
   await page.evaluate(()=>OyasumiAPI.client.auth.signOut({scope:'local'})).catch(()=>{});await context.close();
  }
 }
 fs.mkdirSync('output/cat-care-save',{recursive:true});fs.writeFileSync('output/cat-care-save/live-report.json',JSON.stringify({pass:true,actualIPhone:false,standaloneSimulation:true,testAccounts:2,testMealRecordsRetained:2,temporaryPostsRemoved:true,report},null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
