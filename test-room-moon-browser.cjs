const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {webkit,chromium}=require(process.env.OYASUMI_PLAYWRIGHT_PATH||'./output/webkit-tools/core/package');
const engine=process.argv.includes('--edge')?'edge':'webkit',published=process.argv.includes('--published'),port=engine==='edge'?9426:9425;
const base=published?'https://tomowo985250z-cmyk.github.io/oyasumi/':`http://127.0.0.1:${port}/`,output=path.join(__dirname,'output/room-moon',`${published?'published':'local'}-${engine}`);fs.mkdirSync(output,{recursive:true});
const source=fs.readFileSync('test-home-post-choices.cjs','utf8'),fixture=source.slice(source.indexOf('function installFixture()'),source.indexOf('\n(async () =>'))+'\ninstallFixture();';
const server=published?null:spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'ignore'});let browser;
(async()=>{try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await(engine==='edge'?chromium:webkit).launch(engine==='edge'?{executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
 const cases=[],errors=[];
 for(const standalone of process.argv.includes('--focused')?[true]:[false,true]){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,timezoneId:'America/Los_Angeles'});
  await context.addInitScript({content:fixture});
  await context.addInitScript(standalone=>{
   Object.defineProperty(navigator,'standalone',{value:standalone});const mm=matchMedia.bind(window);window.matchMedia=q=>q==='(display-mode: standalone)'?{matches:standalone,media:q,addEventListener(){},removeEventListener(){}}:mm(q);
   HomePostFixture.at=Date.parse('2026-10-14T03:00:00+09:00');Date.now=()=>HomePostFixture.at;
   const snapshot=OyasumiAPI.snapshot;OyasumiAPI.snapshot=async()=>{if(!HomePostFixture.rows.length)HomePostFixture.rows=[HomePostFixture.row('awake')];return snapshot();};
   const interval=setInterval;globalThis.roomMoonIntervals=[];window.setInterval=(...args)=>{const id=interval(...args);roomMoonIntervals.push(id);return id;};
  },standalone);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{const u=new URL(route.request().url());if(!u.href.startsWith(base))return route.abort();if(/\/(?:vendor\/supabase|supabase-api|update-client)\.js$/.test(u.pathname))return route.fulfill({contentType:'text/javascript',body:''});return route.continue();});
  await page.goto(base);await page.waitForFunction(()=>typeof ready!=='undefined'&&ready&&!refreshPromise);
  if(published)assert.equal(await page.locator('meta[name=oyasumi-release]').getAttribute('content'),JSON.parse(fs.readFileSync('release.json','utf8')).release);
  await page.evaluate(()=>{roomMoonIntervals.forEach(clearInterval);NightClock.now=()=>HomePostFixture.at;});
  const inspect=()=>page.evaluate(()=>{
   const roof=document.querySelector('.roof-moon'),moon=document.querySelector('.home-room-unit .room-window-moon'),pane=document.querySelector('.home-room-unit .day-room-world-window');
   if(!roof||!moon)return {missing:true};
   const r=roof.transform.baseVal.consolidate().matrix,w=moon.transform.baseVal.consolidate().matrix,m=moon.getBoundingClientRect(),p=pane.getBoundingClientRect();
   let clipped=false;const arch=p.height*.3926;
   for(let i=0;i<16;i++){
    const angle=i/16*Math.PI*2,x=m.x+m.width/2+Math.cos(angle)*m.width/2-p.x,y=m.y+m.height/2+Math.sin(angle)*m.height/2-p.y;
    if(x<0||x>p.width||y<0||y>p.height||(y<arch&&Math.pow((x-p.width/2)/(p.width/2),2)+Math.pow((y-arch)/arch,2)>1.02))clipped=true;
   }
   return {phase:moon.dataset.moonPhase,roofPhase:roof.dataset.moonPhase,expected:RoofMoon.snapshot(NightClock.now()).phase,path:moon.querySelector('path').getAttribute('d'),roofPath:roof.querySelector('path').getAttribute('d'),facing:moon.querySelector('path').getAttribute('transform'),roofFacing:roof.querySelector('path').getAttribute('transform'),scaleRatio:w.a/r.a,xError:w.e-(117+(r.e-194.5)*2),yError:w.f-(43+(r.f-26)*.65),clipped,gridOverlap:m.left<p.left+p.width*.5236||m.bottom>p.top+p.height*.6333,overflow:document.documentElement.scrollWidth>innerWidth};
  });
  const verify=async()=>{const r=await inspect();assert(!r.missing);assert.equal(r.phase,r.roofPhase);assert.equal(Number(r.phase),r.expected);assert.equal(r.path,r.roofPath);assert.equal(r.facing,r.roofFacing);assert(Math.abs(r.scaleRatio-1.6)<1e-5&&Math.abs(r.xError)<1e-4&&Math.abs(r.yError)<1e-4);assert(!r.clipped&&!r.gridOverlap&&!r.overflow,JSON.stringify(r));return r;};
  const show=async(time,light=false)=>page.evaluate(({time,light})=>{
   HomePostFixture.at=Date.parse(time);state.light=light;HomePostFixture.rows=[HomePostFixture.row('awake')];
   const p={userId:shared.userId,status:'awake',coat:'calico',time:HomePostFixture.at};shared.activeAwakePosts=[p];shared.feed=[p];shared.nightDate=SleepFlow.night(HomePostFixture.at);go('home');
  },{time,light});
  for(const width of process.argv.includes('--focused')?[390]:[320,375,390,430]){
   await page.setViewportSize({width,height:844});
   for(const light of [false,true])for(const [date,hour] of [['13','18:00'],['13','21:00'],['14','00:00'],['14','03:00'],['14','05:59']]){
    await show(`2026-10-${date}T${hour}:00+09:00`,light);cases.push({width,standalone,light,hour,...await verify()});
    if(hour==='21:00')await page.locator('.home-room-unit').screenshot({path:path.join(output,`${width}-${standalone?'pwa':'browser'}-${light?'light':'dark'}.png`)});
   }
  }
  await show('2026-10-13T18:00:00+09:00');await verify();
  await page.evaluate(()=>{globalThis.originalRoomMoon=document.querySelector('.room-window-moon');globalThis.originalRoofMoon=document.querySelector('.roof-moon');globalThis.originalRoomCat=document.querySelector('.room-resident img');globalThis.beforeMoon=originalRoomMoon.getAttribute('transform');HomePostFixture.at+=1800000;});
  await page.waitForFunction(()=>document.querySelector('.room-window-moon').getAttribute('transform')!==beforeMoon);await verify();
  assert(await page.evaluate(()=>originalRoomMoon===document.querySelector('.room-window-moon')&&originalRoofMoon===document.querySelector('.roof-moon')&&originalRoomCat===document.querySelector('.room-resident img')),'One-second ticks preserve moon/cat nodes');
  const paused=await page.locator('.room-window-moon').getAttribute('transform');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));HomePostFixture.at+=1800000;});
  await page.waitForTimeout(1200);assert.equal(await page.locator('.room-window-moon').getAttribute('transform'),paused);
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await page.waitForFunction(()=>!refreshPromise);await verify();
  await page.evaluate(()=>{HomePostFixture.at+=1800000;window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});await page.waitForFunction(()=>!refreshPromise);await verify();
  // The shared timer continues when only the room window is on screen.
  await page.evaluate(()=>{go('catMeal');globalThis.roomOnlyBefore=document.querySelector('.room-window-moon').getAttribute('transform');HomePostFixture.at+=1800000;});
  assert.equal(await page.locator('.roof-moon').count(),0);await page.waitForFunction(()=>document.querySelector('.room-window-moon').getAttribute('transform')!==roomOnlyBefore);
  await page.evaluate(async()=>{HomePostFixture.peer=true;await refreshShared();go('timeline');});await page.locator('[data-public-profile=legacy-peer]').click();
  await page.evaluate(()=>{globalThis.dialogMoonBefore=document.querySelector('dialog .room-window-moon').getAttribute('transform');HomePostFixture.at+=1800000;});
  await page.waitForFunction(()=>document.querySelector('dialog .room-window-moon').getAttribute('transform')!==dialogMoonBefore);
  await page.evaluate(()=>document.querySelector('#public-profile-dialog').close());
  await page.reload();await page.waitForFunction(()=>ready&&!refreshPromise);await verify();
  await page.evaluate(()=>{roomMoonIntervals.forEach(clearInterval);NightClock.now=()=>HomePostFixture.at;});
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{globalThis.reducedMoonBefore=document.querySelector('.room-window-moon').getAttribute('transform');HomePostFixture.at+=900000;});
  await page.waitForFunction(()=>document.querySelector('.room-window-moon').getAttribute('transform')!==reducedMoonBefore);await verify();
  await show('2026-10-14T14:00:00+09:00');assert.equal(await page.locator('.roof-moon,.room-window-moon').count(),0);assert(await page.locator('.season-landscape').isVisible());
  await context.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({pass:true,engine,published,cases,sharedTick:true,resume:true,reload:true,roomOnly:true,dialog:true,reducedMotion:true,physicalIPhoneTested:false,productionWrites:0,errors},null,2));
 console.log(`PASS ${engine}: ${cases.length} room/roof moon layouts, matching phases/normalized motion, window arch/grid bounds, shared ticks, resume/reload, room-only/dialog and reduced motion`);
}finally{await browser?.close();server?.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
