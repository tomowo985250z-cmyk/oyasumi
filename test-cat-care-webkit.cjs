const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {webkit}=require(process.env.OYASUMI_PLAYWRIGHT||'playwright');
const output=path.join(__dirname,'output/cat-care-webkit');fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await webkit.launch();const reports=[];
 try{
  for(const standalone of [false,true]){
   const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'});
   await context.addInitScript(value=>Object.defineProperty(navigator,'standalone',{value}),standalone);
   const page=await context.newPage(),errors=[],failed=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(r.url().includes('/assets/cat-refresh-v1/')&&r.status()!==200)failed.push(r.url());});
   await page.goto('http://127.0.0.1:9390/test-support/cat-care/screen.html');
   await page.waitForFunction(()=>globalThis.CarePreview&&document.querySelector('[data-cat-meal]'));
   const coats=await page.evaluate(()=>CatFaces.coats.map(c=>c.id));assert.equal(coats.length,16);
   for(const width of process.argv.includes('--rest-only')?[]:[320,375,390,430]){
    await page.setViewportSize({width,height:844});
    for(const coat of coats)for(const kind of ['meal','treat']){
     await page.evaluate(async({coat,kind})=>{await fetch('/__care/reset',{method:'POST'});await CarePreview.show(coat,kind);},{coat,kind});
     // Reinsert scene images without pre-decoding the new image elements.
     await page.evaluate(()=>{document.querySelectorAll('.care-playing,.care-reduced').forEach(s=>s.classList.remove('care-playing','care-reduced'));const s=document.querySelector('.cat-care:not(dialog:not([open]) *) .care-scene');s.outerHTML=CatCare.visual(s.dataset.careCoat,s.dataset.careKind);});
     await page.locator(`[data-cat-${kind}]`).click({force:true});
     await page.waitForSelector('.care-playing',{state:'attached'});
     assert(await page.evaluate(async()=>{const scene=document.querySelector('.care-playing'),animation=scene.querySelector('.care-munch').getAnimations()[0];refreshCareCards();await refreshShared();return scene.isConnected&&CatCare.isPlaying(scene)&&scene.querySelector('.care-munch').getAnimations()[0]===animation;}),'Refresh must keep the same WebKit animation');
     for(const [time,selector] of [[500,'.care-bowl'],[1500,'.care-munch'],[2500,'.care-joy-cat']]){
      const result=await page.evaluate(async({time,selector})=>{const scene=document.querySelector('.care-playing');for(const a of scene.getAnimations({subtree:true})){a.pause();a.currentTime=time;}await new Promise(requestAnimationFrame);const item=scene.querySelector(selector),box=item.getBoundingClientRect();return {opacity:Number(getComputedStyle(item).opacity),width:box.width,height:box.height,images:[...scene.querySelectorAll('img')].every(i=>i.complete&&i.naturalWidth>0),visible:getComputedStyle(item).visibility};},{time,selector});
      assert(result.opacity>.9&&result.width>0&&result.height>0&&result.images&&result.visible==='visible',JSON.stringify({standalone,width,coat,kind,time,result}));
      if(width===390&&coat==='calico'&&kind==='meal')await page.screenshot({path:path.join(output,`${standalone?'standalone':'browser'}-${time}.png`)});
     }
     reports.push({standalone,width,coat,kind});
    }
    console.log(`PASS WebKit ${standalone?'standalone simulation':'browser'} ${width}px: 16 coats, meal/treat, refresh, 3 stages`);
   }
   assert(await page.evaluate(async()=>{
    await fetch('/__care/reset',{method:'POST'});await CarePreview.show('calico','meal');
    document.querySelectorAll('.care-playing').forEach(s=>s.classList.remove('care-playing'));
    state.lastSleep={finishedAt:new Date(NightClock.now()-CatScenes.settleDurationMs+600).toISOString()};
    view='rest';render();document.querySelector('[data-cat-meal]').click();
    let scene;for(let i=0;i<100&&!scene;i++){await new Promise(r=>setTimeout(r,16));scene=document.querySelector('.cat-care-compact .care-playing');}
    if(!scene)return false;
    await new Promise(r=>setTimeout(r,1000));return scene.isConnected&&CatCare.isPlaying(scene)&&scene.classList.contains('care-playing');
   }),'Rest settling timer must not interrupt feeding');
   console.log('PASS WebKit rest settling timer: '+(standalone?'standalone simulation':'browser'));
   // Missing decode() still plays, including the compact resting screen.
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.evaluate(async()=>{await fetch('/__care/reset',{method:'POST'});await CarePreview.show('calico','meal');view='rest';render();for(const img of document.querySelectorAll('.care-scene img'))img.decode=undefined;document.querySelector('[data-cat-meal]').click();});
   await page.waitForSelector('.care-reduced');assert(await page.locator('.care-reduced .care-joy-cat').isVisible());
   await page.waitForFunction(()=>!document.querySelector('.care-reduced'));
   assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);await context.close();
  }
  fs.writeFileSync(path.join(output,process.argv.includes('--rest-only')?'rest-report.json':'report.json'),JSON.stringify({engine:'Playwright WebKit',actualIPhone:false,standalone:'navigator.standalone simulation; not installed iOS PWA',cases:reports.length,stages:reports.length*3,restSettlingTimer:true,pass:true,reports},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
