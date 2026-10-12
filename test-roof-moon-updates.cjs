const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {webkit,chromium}=require(process.env.OYASUMI_PLAYWRIGHT_PATH||'./output/webkit-tools/core/package');
const engine=process.argv.includes('--edge')?'edge':'webkit',published=process.argv.includes('--published');
const port=engine==='edge'?9418:9417,base=published?'https://tomowo985250z-cmyk.github.io/oyasumi/':`http://127.0.0.1:${port}/`;
const output=path.join(__dirname,'output/roof-moon-updates',`${published?'published':'local'}-${engine}`);fs.mkdirSync(output,{recursive:true});
const source=fs.readFileSync('test-home-post-choices.cjs','utf8');
const fixture=source.slice(source.indexOf('function installFixture()'),source.indexOf('\n(async () =>'))+'\ninstallFixture();';
const server=published?null:spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'ignore'});
let browser;
(async()=>{try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await(engine==='edge'?chromium:webkit).launch(engine==='edge'?{executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
 const cases=[],errors=[],external=[];
 for(const standalone of process.argv.includes('--focused')?[true]:[false,true]){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,timezoneId:'America/Los_Angeles'});
  await context.addInitScript({content:fixture});
  await context.addInitScript(standalone=>{
   Object.defineProperty(navigator,'standalone',{value:standalone});
   const mm=matchMedia.bind(window);window.matchMedia=q=>q==='(display-mode: standalone)'?{matches:standalone,media:q,addEventListener(){},removeEventListener(){}}:mm(q);
   const f=HomePostFixture;f.at=Number(new URL(location.href).searchParams.get('moon-at'))||Date.parse('2026-10-11T21:00:00+09:00');f.hold=false;f.gates=[];
   f.release=()=>{f.hold=false;f.gates.splice(0).forEach(resolve=>resolve());};
   const api=OyasumiAPI,snapshot=api.snapshot;
   api.snapshot=async()=>{if(f.hold)await new Promise(resolve=>f.gates.push(resolve));if(!f.rows.length)f.rows=[f.row('awake')];return {...await snapshot(),clock:{serverNow:f.at,monotonicAt:performance.now(),resetAt:Date.parse(SleepFlow.night(f.at)+'T06:00:00+09:00')+86400000}};};
   const interval=setInterval;globalThis.moonTestIntervals=[];window.setInterval=(...args)=>{const id=interval(...args);moonTestIntervals.push(id);return id;};
  },standalone);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());if(!url.href.startsWith(base)){external.push(url.href);return route.abort();}
   if(/\/(?:vendor\/supabase|supabase-api|update-client)\.js$/.test(url.pathname))return route.fulfill({contentType:'text/javascript',body:''});
   return route.continue();
  });
  const ready=async()=>{
   await page.waitForFunction(()=>typeof ready!=='undefined'&&ready&&!busy&&!refreshPromise);
   await page.evaluate(()=>{moonTestIntervals.forEach(clearInterval);NightClock.now=()=>HomePostFixture.at;NightClock.night=()=>SleepFlow.night(HomePostFixture.at);NightClock.morningNight=()=>SleepFlow.previousNight(HomePostFixture.at);});
  };
  const expected=()=>page.waitForFunction(()=>{
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.innerHTML=RoofMoon.svg(NightClock.now());
   const moon=document.querySelector('.roof-moon'),next=svg.firstElementChild;
   return moon?.getAttribute('transform')===next.getAttribute('transform')&&moon?.getAttribute('data-moon-phase')===next.getAttribute('data-moon-phase')&&moon?.querySelector('path').getAttribute('d')===next.querySelector('path').getAttribute('d')&&moon?.querySelector('path').getAttribute('transform')===next.querySelector('path').getAttribute('transform');
  },{},{timeout:3500});
  await page.goto(base);await ready();
  if(published)assert.equal(await page.locator('meta[name="oyasumi-release"]').getAttribute('content'),JSON.parse(fs.readFileSync('release.json','utf8')).release);
  for(const width of process.argv.includes('--focused')?[390]:[320,375,390,430])for(const reduced of [false,true]){
   await page.setViewportSize({width,height:844});await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
   await page.evaluate(()=>{
    HomePostFixture.at=Date.parse('2026-10-11T21:00:00+09:00');HomePostFixture.rows=[HomePostFixture.row('awake')];shared.activeAwakePosts=[{userId:'moon-test',status:'awake',coat:'calico',time:HomePostFixture.at}];shared.feed=shared.activeAwakePosts;go('home');
    globalThis.originalMoon=document.querySelector('.roof-moon');globalThis.originalMoonPath=originalMoon.querySelector('path');globalThis.originalRoofCats=[...document.querySelectorAll('.roof-cat')];
    globalThis.initialMoonTransform=originalMoon.getAttribute('transform');const matrix=originalMoon.transform.baseVal.consolidate().matrix;globalThis.initialMoonMatrix={x:matrix.e,y:matrix.f,scale:matrix.a};HomePostFixture.hold=true;HomePostFixture.at+=3600000;
   });
   // No network refresh, shooting star, explicit render or manual moon sync.
   await expected();
   assert(await page.evaluate(()=>document.querySelector('.roof-moon')===originalMoon&&originalMoon.querySelector('path')===originalMoonPath&&originalRoofCats.every((cat,i)=>cat===document.querySelectorAll('.roof-cat')[i])),'Clock updates preserve the moon and cats');
   assert.notEqual(await page.locator('.roof-moon').getAttribute('transform'),await page.evaluate(()=>initialMoonTransform));
   const movement=await page.evaluate(()=>{const matrix=document.querySelector('.roof-moon').transform.baseVal.consolidate().matrix;return {x:matrix.e-initialMoonMatrix.x,y:matrix.f-initialMoonMatrix.y,scale:matrix.a-initialMoonMatrix.scale};});
   assert(Math.abs(movement.x)>.1&&Math.abs(movement.y)>.1&&Math.abs(movement.scale)>.0001,'Both position and size change with the clock');
   const hidden=await page.locator('.roof-moon').getAttribute('transform');
   await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));HomePostFixture.at+=3600000;});
   await page.waitForTimeout(1150);assert.equal(await page.locator('.roof-moon').getAttribute('transform'),hidden);
   await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await expected();
   await page.evaluate(()=>{HomePostFixture.at+=3600000;window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});await expected();
   assert(await page.evaluate(()=>document.querySelector('.roof-moon')===originalMoon),'BFCache-style resume updates before pending network reads finish');
   await page.evaluate(()=>HomePostFixture.release());await page.waitForFunction(()=>!refreshPromise&&!refreshQueued);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.locator('.roof-sky-card').screenshot({path:path.join(output,`${width}-${standalone?'standalone':'browser'}-${reduced?'reduced':'motion'}.png`)});
   cases.push({width,standalone,reduced,movement,updatesWithoutNetwork:true,hiddenPaused:true,resumed:true});
  }
  const reloadAt=Date.parse('2026-10-12T03:00:00+09:00');
  await page.evaluate(at=>history.replaceState(null,'','?moon-at='+at),reloadAt);await page.reload();await ready();await expected();
  assert.equal(await page.evaluate(()=>HomePostFixture.at),reloadAt);
  await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({pass:true,engine,cases,reload:true,physicalIPhoneTested:false,standaloneEmulated:true,productionDbWrites:0,errors,external},null,2));
 console.log(`PASS ${engine}: ${cases.length} live clock/width/standalone/reduced-motion cases, pending network, hidden/resume/pageshow and reload`);
}finally{await browser?.close();server?.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
