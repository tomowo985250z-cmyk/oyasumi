const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {webkit,chromium}=require(process.env.OYASUMI_PLAYWRIGHT_PATH||'./output/webkit-tools/core/package');
const edge=process.argv.includes('--edge'),published=process.argv.includes('--published'),port=edge?9468:9467;
const base=published?'https://tomowo985250z-cmyk.github.io/oyasumi/':`http://127.0.0.1:${port}/`,output=path.join(__dirname,'output/moon-motion',`${published?'published':'local'}-${edge?'edge':'webkit'}`);
fs.mkdirSync(output,{recursive:true});
const source=fs.readFileSync('test-home-post-choices.cjs','utf8'),fixture=source.slice(source.indexOf('function installFixture()'),source.indexOf('\n(async () =>'))+'\ninstallFixture();';
const server=published?null:spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'ignore'});
let browser;
(async()=>{try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,100));}
 browser=await(edge?chromium:webkit).launch(edge?{executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
 const cases=[],errors=[],failed=[],external=[],start=Date.parse('2026-10-15T19:01:00+09:00');
 for(const width of [320,375,390,430])for(const standalone of [false,true])for(const reduced of [false,true]){
  const context=await browser.newContext({viewport:{width,height:1000},deviceScaleFactor:2,isMobile:true,hasTouch:true,timezoneId:'America/Los_Angeles',reducedMotion:reduced?'reduce':'no-preference'});
  await context.clock.install({time:start-10000});
  await context.addInitScript({content:fixture});
  await context.addInitScript(standalone=>{
   Object.defineProperty(navigator,'standalone',{value:standalone});const mm=matchMedia.bind(window);window.matchMedia=q=>q==='(display-mode: standalone)'?{matches:standalone,media:q,addEventListener(){},removeEventListener(){}}:mm(q);
   const f=HomePostFixture,snapshot=OyasumiAPI.snapshot;f.epoch=Date.now();f.started=performance.now();f.hold=false;f.reads=0;
   OyasumiAPI.snapshot=async()=>{
    f.reads++;if(f.hold)await new Promise(resolve=>f.release=resolve);
    f.at=f.epoch+performance.now()-f.started;if(!f.rows.length)f.rows=[f.row('awake')];
    return {...await snapshot(),clock:{serverNow:f.at,monotonicAt:performance.now(),resetAt:Date.parse(SleepFlow.night(f.at)+'T06:00:00+09:00')+86400000}};
   };
  },standalone);
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.status()>=400)failed.push(response.url());});
  await page.route('**/*',route=>{const url=new URL(route.request().url());if(!url.href.startsWith(base)){external.push(url.href);return route.abort();}if(/\/(?:vendor\/supabase|supabase-api|update-client)\.js$/.test(url.pathname))return route.fulfill({contentType:'text/javascript',body:''});return route.continue();});
  await page.goto(base);await page.waitForFunction(()=>typeof ready!=='undefined'&&ready&&!busy&&!refreshPromise);
  assert.equal(await page.locator('meta[name=oyasumi-release]').getAttribute('content'),JSON.parse(fs.readFileSync('release.json','utf8')).release);
  await context.clock.pauseAt(start);
  await page.evaluate(()=>{
   go('home');globalThis.MotionProbe={ticks:[],initialAt:NightClock.now(),originalClock:NightClock.now,originalCats:[...document.querySelectorAll('.roof-cat,.room-resident img')]};
   const original=RoofMoon;globalThis.RoofMoon={...original,update(element,at){original.update(element,at);MotionProbe.ticks.push({frame:element.dataset.moonFrame,at,monotonic:performance.now()});}};
   MotionProbe.nodes=[...document.querySelectorAll('.roof-moon,.home-room-unit .room-window-moon')].map(element=>({element,mask:element.querySelector('mask'),path:element.querySelector('mask path'),light:element.querySelector('[data-moon-light]')}));
   HomePostFixture.hold=true;void refreshShared();
  });
  const inspect=()=>page.evaluate(()=>{
   const now=NightClock.now(),renderedAt=MotionProbe.ticks.at(-1)?.at??MotionProbe.initialAt,snapshot=RoofMoon.snapshot(renderedAt),rows=[...document.querySelectorAll('.roof-moon,.home-room-unit .room-window-moon')].map(element=>{
    const frame=element.dataset.moonFrame,matrix=element.transform.baseVal.consolidate().matrix,path=element.querySelector('mask path'),mask=element.querySelector('mask'),light=element.querySelector('[data-moon-light]'),holder=document.createElementNS('http://www.w3.org/2000/svg','svg');holder.innerHTML=RoofMoon.svg(renderedAt,frame);
    return {frame,x:matrix.e,y:matrix.f,scale:matrix.a,phase:Number(element.dataset.moonPhase),path:path.getAttribute('d'),facing:path.getAttribute('transform'),expectedPath:holder.querySelector('path').getAttribute('d'),expectedFacing:holder.querySelector('path').getAttribute('transform'),maskId:mask.id,maskReference:light.getAttribute('mask'),noDisk:!element.querySelector('circle'),renderer:element.dataset.moonRenderer};
   });
   return {now,renderedAt,lagMs:now-renderedAt,snapshot,rows,clockUnchanged:NightClock.now===MotionProbe.originalClock,pendingRead:!!refreshPromise,reads:HomePostFixture.reads,overflow:document.documentElement.scrollWidth>innerWidth,nodesPreserved:MotionProbe.nodes.every(n=>n.element.isConnected&&n.mask===n.element.querySelector('mask')&&n.path===n.element.querySelector('mask path')&&n.light===n.element.querySelector('[data-moon-light]')),catsPreserved:MotionProbe.originalCats.every(n=>n.isConnected)};
  });
  const near=(a,b)=>assert(Math.abs(a-b)<1e-4,`${a} != ${b}`);
  const verify=async label=>{
   const result=await inspect();assert.equal(result.rows.length,2,label);assert(result.clockUnchanged&&result.pendingRead&&!result.overflow);assert(result.lagMs>=0&&result.lagMs<=1000,`${label}: moon update lag ${result.lagMs}ms`);
   const roof=result.rows.find(r=>r.frame==='roof'),window=result.rows.find(r=>r.frame==='window');
   near(roof.x,result.snapshot.x);near(roof.y,result.snapshot.y);near(roof.scale,result.snapshot.scale*7.5);near(window.x,117+(roof.x-194.5)*2);near(window.y,43+(roof.y-26)*.65);near(window.scale/roof.scale,1.6);
   assert.equal(roof.phase,window.phase);assert.equal(roof.phase,result.snapshot.phase);assert.equal(roof.path,window.path);
   for(const row of result.rows){assert.equal(row.path,row.expectedPath);assert.equal(row.facing,row.expectedFacing);assert.equal(row.maskReference,`url(#${row.maskId})`);assert(row.noDisk);assert.equal(row.renderer,'lit-mask-v2');}
   return {label,...result};
  };
  const samples=[await verify('19:01 initial')],initial=await page.evaluate(()=>MotionProbe.ticks.length);
  await context.clock.runFor(999);assert.equal(await page.evaluate(()=>MotionProbe.ticks.length),initial,'No early moon tick before 1000ms: '+JSON.stringify(await page.evaluate(()=>({ticks:MotionProbe.ticks,now:NightClock.now(),monotonic:performance.now()}))));
  await context.clock.runFor(1);samples.push(await verify('+1 second'));
  await context.clock.runFor(2000);samples.push(await verify('+3 seconds'));
  const ticks=await page.evaluate(()=>MotionProbe.ticks.slice());assert.equal(ticks.length,6);
  for(let i=0;i<ticks.length;i+=2){assert.equal(ticks[i].at,ticks[i+1].at);assert.notEqual(ticks[i].frame,ticks[i+1].frame);if(i)assert.equal(ticks[i].monotonic-ticks[i-2].monotonic,1000);}
  assert.notEqual(samples[0].rows[0].x,samples[1].rows[0].x,'Coordinates move on the first real timer tick');
  let elapsed=3000;
  for(const [label,target] of [['+1 minute',60000],['+30 minutes',1800000],['+1 hour',3600000]]){
   await context.clock.fastForward(target-elapsed);elapsed=target;samples.push(await verify(label));
  }
  // Room synchronization (30s) and cat poses (15min) can replace moon markup.
  // The dedicated one-second timer itself preserves all moon/mask/cat nodes.
  assert(samples.slice(0,3).every(sample=>sample.nodesPreserved&&sample.catsPreserved),'Ordinary ticks preserve both masks, their IDs and the cats');
  assert.notEqual(samples[0].rows[0].path,samples[1].rows[0].path,'Mask silhouette advances on the first tick');
  const paused=await page.evaluate(()=>{
   Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));
   return {ticks:MotionProbe.ticks.length,transforms:[...document.querySelectorAll('.roof-moon,.home-room-unit .room-window-moon')].map(n=>n.getAttribute('transform'))};
  });
  await context.clock.fastForward(3600000);await context.clock.runFor(2000);
  // A scheduled 15-minute home rerender may still replace hidden markup;
  // the dedicated moon timer itself must stop until visibility is restored.
  assert.equal(await page.evaluate(()=>MotionProbe.ticks.length),paused.ticks,'Hidden page stops the moon timer');
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});samples.push(await verify('visibilitychange resume +1 hour'));
  await context.clock.runFor(1000);samples.push(await verify('resume next second'));
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));});
  await context.clock.fastForward(1800000);await page.evaluate(()=>{delete document.hidden;window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});samples.push(await verify('BFCache pageshow +30 minutes'));
  await context.clock.runFor(1000);samples.push(await verify('BFCache next second'));
  const anchored=await page.evaluate(()=>NightClock.now());await context.clock.setSystemTime(Date.parse('2040-01-01T12:00:00Z'));near(await page.evaluate(()=>NightClock.now()),anchored);
  await context.clock.runFor(1000);samples.push(await verify('device wall clock changed, server time unchanged'));
  assert.equal(await page.evaluate(()=>HomePostFixture.calls.length),0);
  cases.push({width,standalone,reduced,samples,ticks,hiddenPaused:true,visibilityResume:true,bfcacheResume:true,deviceClockIndependent:true});await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);assert.deepEqual(external,[]);
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({pass:true,engine:edge?'Edge':'WebKit',published,release:JSON.parse(fs.readFileSync('release.json','utf8')).release,physicalIPhoneTested:false,productionDbWrites:0,cases,errors,failed,external},null,2));
 console.log(`PASS ${published?'published':'local'} ${edge?'Edge':'WebKit'}: ${cases.length} server-clock motion cases at 320/375/390/430px; exact 1000ms paired ticks, live mask/phase movement, pending network, hidden/resume/BFCache, device-clock independence; no DB writes.`);
}finally{await browser?.close();server?.kill();}})().catch(error=>{console.error(error);process.exitCode=1;});
