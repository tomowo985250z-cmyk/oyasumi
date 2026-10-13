const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {webkit,chromium}=require(process.env.OYASUMI_PLAYWRIGHT_PATH||'./output/webkit-tools/core/package'),installFixture=require('./test-support/cat-startup-fixture.cjs');
const engine=process.argv.includes('--edge')?'edge':'webkit',port=engine==='edge'?9422:9421,base=`http://127.0.0.1:${port}/`;
const selected=process.argv.find(a=>a.startsWith('--case='))?.slice(7);
const output=path.join(__dirname,'output/cat-startup',`security-${engine}${selected?'-'+selected:''}`);fs.mkdirSync(output,{recursive:true});
const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'ignore'});let browser;
(async()=>{try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await(engine==='edge'?chromium:webkit).launch(engine==='edge'?{executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
 const cases=[];
 for(const cache of ['warm','stale','foreign','expired','corrupt','blocked','failed-care','held-care','auth-change','stale-progress','early-meal','unknown-author','missing-coat','initial-pageshow'].filter(c=>!selected||c===selected)){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.addInitScript(installFixture,{standalone:true,cache,coat:cache==='missing-coat'?null:'black',asleep:cache!=='early-meal',at:Date.parse('2026-10-13T23:00:00+09:00'),failCare:cache==='failed-care',holdCare:['held-care','auth-change'].includes(cache),holdOptional:['stale-progress','early-meal','unknown-author','initial-pageshow'].includes(cache),holdProfiles:cache==='unknown-author'});
  const page=await context.newPage(),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await page.route('**/*',route=>{const u=new URL(route.request().url());if(!u.href.startsWith(base))return route.abort();if(/\/(?:vendor\/supabase|supabase-config|update-client)\.js$/.test(u.pathname))return route.fulfill({contentType:'text/javascript',body:''});return route.continue();});
  await page.goto(base,{waitUntil:'domcontentloaded'});
  if(cache==='held-care'||cache==='auth-change'){
   await page.waitForFunction(()=>CatStartupFixture.careGates.length>0);await page.waitForTimeout(300);
   assert.equal(await page.evaluate(()=>CatStartupFixture.firstOwn),null,'Cached artwork cannot reveal unresolved sleep');
   await page.evaluate(cache=>{if(cache==='auth-change')CatStartupFixture.authChanged=true;CatStartupFixture.releaseCare();},cache);
  }
  if(cache==='missing-coat'){
   await page.waitForFunction(()=>ready&&!refreshPromise);
   assert.equal(await page.locator('.home-room-unit .room-resident img').count(),0);assert(await page.locator('.home-room-unit .room-resident').boundingBox());
   await page.evaluate(()=>DayRoom.sync());assert.equal(await page.locator('.home-room-unit .room-resident img').count(),0);
   await page.evaluate(()=>go('timeline'));await page.waitForFunction(()=>CatStartupFixture.firstFast!==null);
   assert.equal(await page.locator('[data-public-profile=post-0] .avatar img').count(),0);
   assert.equal(await page.evaluate(()=>localStorage.getItem('oyasumi-confirmed-coat-v1:https://isolated.invalid|oyasumi-auth')),null);
  }else if(cache==='failed-care'||cache==='auth-change'){
   await page.waitForFunction(()=>CatStartupFixture.calls.some(c=>c.label==='oyasumi_cat_care_status')&&!refreshPromise);
   assert.equal(await page.evaluate(()=>CatStartupFixture.firstOwn),null);
   assert(await page.locator('html').evaluate(el=>el.hasAttribute('data-cat-state-pending')));
  }else{
   await page.waitForFunction(()=>CatStartupFixture.firstOwn!==null);
   if(cache==='initial-pageshow'){
    const revision=await page.evaluate(()=>stateRevision);
    await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:false})));
    assert.equal(await page.evaluate(()=>stateRevision),revision,'Initial pageshow is not a new care day');
    assert(await page.locator('.home-room-unit .room-resident img').isVisible());
    await page.evaluate(()=>go('timeline'));await page.waitForFunction(()=>CatStartupFixture.firstFast!==null);
    await page.evaluate(()=>{CatStartupFixture.releaseOptional();go('home');});
   }
   if(cache==='early-meal'){
    await page.locator('.home-room-unit .room-resident').evaluate(button=>button.click());assert(await page.locator('[data-cat-meal]').isDisabled());
    await page.locator('[data-cat-meal]').evaluate(button=>{button.disabled=false;button.click();});
    assert(!await page.evaluate(()=>CatStartupFixture.calls.some(c=>c.label==='oyasumi_give_cat_meal')));assert.equal(await page.locator('.care-playing').count(),0);
    await page.evaluate(()=>{CatStartupFixture.releaseOptional();go('home');});
   }
   if(cache==='unknown-author'){
    await page.evaluate(()=>go('timeline'));await page.waitForFunction(()=>CatStartupFixture.firstFast!==null&&CatStartupFixture.profileGates.length>0);
    assert(await page.locator('[data-public-profile=post-21] [data-cat-placeholder]').count());
    await page.locator('[data-public-profile=post-21]').evaluate(button=>button.click());assert.equal(await page.locator('#public-profile-dialog[open]').count(),0);
    await page.evaluate(()=>{CatStartupFixture.releaseProfiles();CatStartupFixture.releaseOptional();go('home');});
   }
   if(cache==='stale-progress'){
    await page.evaluate(()=>{const f=CatStartupFixture;f.hidden=true;document.dispatchEvent(new Event('visibilitychange'));f.coat='white';f.asleep=false;f.hidden=false;document.dispatchEvent(new Event('visibilitychange'));});
    assert(await page.locator('.home-room-unit .room-resident img').evaluate(img=>getComputedStyle(img).visibility==='hidden'));
    await page.evaluate(()=>CatStartupFixture.releaseOptional());
   }
   await page.waitForFunction(()=>ready&&!refreshPromise&&!refreshQueued&&!document.documentElement.hasAttribute('data-cat-state-pending'));
   await page.waitForFunction(()=>document.querySelector('.home-room-unit .room-resident img')?.naturalWidth>0);
   const expected=cache==='stale-progress'?'white':'black';assert.equal(await page.locator('.home-room-unit .room-resident img').getAttribute('data-cat-coat'),expected);
   await page.evaluate(()=>go('profile'));await page.waitForFunction(()=>document.querySelector('.profile-banner img')?.naturalWidth>0);
   assert.equal(await page.locator('.profile-banner img').getAttribute('data-cat-expression'),'surprised');
   if(cache!=='blocked')assert.deepEqual(await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('oyasumi-confirmed-coat-v1:https://isolated.invalid|oyasumi-auth'))).sort()),['at','coat','userId','version']);
  }
  assert.deepEqual(await page.evaluate(()=>CatStartupFixture.violations),[]);assert.deepEqual(errors,[]);
  if(cache==='foreign')assert(!requests.some(u=>u.includes('/orange/')),'Another identity cannot warm old coat images');
  await page.screenshot({path:path.join(output,cache+'.png')});cases.push(cache);await context.close();console.log(`PASS ${engine} cache/security: ${cache}`);
 }
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({pass:true,engine,cases,productionWrites:0,physicalIPhoneTested:false},null,2));
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
