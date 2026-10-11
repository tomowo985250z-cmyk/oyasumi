const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawn}=require('node:child_process');
const {webkit,chromium}=require(process.env.OYASUMI_PLAYWRIGHT_PATH||'./output/webkit-tools/core/package');
const edge=process.argv.includes('--edge'),port=edge?9415:9414,base=`http://127.0.0.1:${port}/`;
const output=path.join(__dirname,'output/roof-moon-v1',edge?'edge':'webkit');
fs.mkdirSync(output,{recursive:true});
const fixtureSource=fs.readFileSync('test-home-post-choices.cjs','utf8');
const fixture=fixtureSource.slice(fixtureSource.indexOf('function installFixture()'),fixtureSource.indexOf('\n(async () => {'));
const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'ignore'});
let browser;
(async()=>{try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await (edge?chromium:webkit).launch(edge?{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
 // A non-Japan device timezone must still use the app's JST clock.
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,timezoneId:'America/Los_Angeles'});
 await context.addInitScript({content:fixture+';installFixture();'});
 await context.addInitScript(()=>{const original=setInterval;globalThis.moonTestIntervals=[];window.setInterval=(...args)=>{const id=original(...args);moonTestIntervals.push(id);return id;};});
 const page=await context.newPage(),errors=[],failed=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
 await page.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(!url.href.startsWith(base)){external.push(url.href);return route.abort();}
  if(/\/(?:vendor\/supabase|supabase-api|update-client)\.js$/.test(url.pathname))return route.fulfill({contentType:'text/javascript',body:'// Isolated UI test; no production DB access.'});
  return route.continue();
 });
 await page.goto(base);
 await page.waitForFunction(()=>typeof ready!=='undefined'&&ready&&!busy);
 await page.evaluate(()=>{
  moonTestIntervals.forEach(clearInterval);
  // Keep all public clock reads on the fixture instant. NightClock's real
  // monotonic anchoring is covered separately by test-night-clock.js.
  NightClock.now=()=>HomePostFixture.at;
  NightClock.night=()=>SleepFlow.night(HomePostFixture.at);
  NightClock.morningNight=()=>SleepFlow.previousNight(HomePostFixture.at);
 });
 async function show(count,hour=23,light=false){
  await page.evaluate(({count,hour,light})=>{
   HomePostFixture.at=Date.parse(`2026-10-${hour<6?'12':'11'}T${String(Math.floor(hour)).padStart(2,'0')}:${hour%1?'59':'00'}:00+09:00`);
   const now=NightClock.now();state.light=light;state.lastSleep=null;
   HomePostFixture.rows=count?[HomePostFixture.row('awake')]:[];
   shared.activeAwakePosts=Array.from({length:count},(_,i)=>({userId:String(i),status:'awake',coat:['calico','orange','gray'][i],time:now-1000}));
   shared.feed=shared.activeAwakePosts;shared.trend=[];shared.trendHistory=[];
   shared.nightDate=SleepFlow.night(now);go('home');
  },{count,hour,light});
 }
 const layouts=[];
 for(const width of [320,360,375,390,402,414,430]){
  await page.setViewportSize({width,height:844});
  for(const count of [0,1,2,3])for(const light of [false,true])for(const hour of [18,21,0,3,5.99]){
   await show(count,hour,light);
   // Three active users use the existing neutral two-cat fallback. Force a
   // three-cat layout separately to cover the most crowded scene as well.
   if(count===3)await page.evaluate(()=>{const group=document.querySelector('.roof-cat-group');group.dataset.catCount='3';group.innerHTML=['calico','orange','gray'].map((coat,i)=>RoofCats.svg(coat,i,3)).join('');});
   const result=await page.evaluate(()=>{
    const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    const moon=document.querySelector('.roof-moon'),cats=[...document.querySelectorAll('.roof-cat')];
    const overlap=(a,b)=>a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y;
    const m=moon&&rect(moon),sky=document.querySelector('.awake-roof');
    const s=sky&&rect(sky),texts=[...document.querySelectorAll('.awake-heading,.roof-sky-card>p')].map(rect);
    const after=cats.map(cat=>({rect:rect(cat),foot:rect(cat).bottom}));
    cats.forEach((cat,i)=>cat.style.transform=cats.length===2&&i===1?'translateY(2px)':'none');
    const before=cats.map(cat=>({rect:rect(cat),foot:rect(cat).bottom}));
    cats.forEach(cat=>cat.style.removeProperty('transform'));
    return {overflow:document.documentElement.scrollWidth>innerWidth,cats:cats.length,stars:document.querySelectorAll('.card-sky-stars i').length,
     moonContained:!m||(m.x>=s.x&&m.right<=s.right&&m.y>=s.y&&m.bottom<=s.bottom),
     overlaps:!!m&&[...after.map(c=>c.rect),...texts].some(r=>overlap(m,r)),before,after,
     moonAnimations:moon?.getAnimations({subtree:true}).length||0};
   });
   assert.equal(result.cats,count);assert.equal(result.stars,48);
   assert(!result.overflow&&result.moonContained&&!result.overlaps);assert.equal(result.moonAnimations,0);
   for(let i=0;i<count;i++){
    assert(Math.abs(result.after[i].rect.width/result.before[i].rect.width-.85)<.0001);
    assert(Math.abs(result.after[i].rect.height/result.before[i].rect.height-.85)<.0001);
    assert(Math.abs(result.after[i].foot-result.before[i].foot)<.02,'Contact baseline remains fixed');
   }
   layouts.push({width,count,light,hour});
  }
  await show(2,23);
  await page.locator('.roof-sky-card').screenshot({path:path.join(output,`card-${width}.png`)});
 }
 await page.setViewportSize({width:390,height:844});await show(2);
 for(const hour of [18,21,0,3,5.99]){
  await show(2,hour);
  await page.locator('.roof-sky-card').screenshot({path:path.join(output,`time-${hour}.png`)});
 }
 // Rasterize the actual SVG path to verify the lit side and illuminated area.
 const phases=await page.evaluate(async()=>{
  const results=[],epoch=Date.parse('2000-01-06T18:14:00Z'),cycle=29.530588853*86400000;
  for(const fraction of [0,.125,.25,.375,.5,.625,.75,.875]){
   const holder=document.createElementNS('http://www.w3.org/2000/svg','svg');holder.innerHTML=RoofMoon.svg(epoch+cycle*fraction);
   const path=holder.querySelector('path');path.setAttribute('opacity','1');path.setAttribute('fill','white');
   const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="-1 -1 2 2">${path.outerHTML}</svg>`;
   const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);await img.decode();
   const canvas=document.createElement('canvas');canvas.width=canvas.height=100;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
   const data=ctx.getImageData(0,0,100,100).data;let left=0,right=0;
   for(let y=0;y<100;y++)for(let x=0;x<100;x++){const alpha=data[(y*100+x)*4+3]/255;if(x<50)left+=alpha;else right+=alpha;}
   results.push({fraction,left,right,area:(left+right)/(Math.PI*2500)});
  }return results;
 });
 for(const p of phases){assert(Math.abs(p.area-(1-Math.cos(p.fraction*2*Math.PI))/2)<.01);if(p.fraction>0&&p.fraction<.5)assert(p.right>p.left);if(p.fraction>.5)assert(p.left>p.right);}
 for(const fraction of [0,.125,.25,.5,.75,.875]){
  await page.evaluate(fraction=>{document.querySelector('.roof-moon').outerHTML=RoofMoon.svg(Date.parse('2000-01-06T18:14:00Z')+29.530588853*86400000*fraction);},fraction);
  await page.locator('.roof-sky-card').screenshot({path:path.join(output,`phase-${fraction}.png`)});
 }
 const resumes=[];
 await show(2,21);
 const hiddenMoon=await page.locator('.roof-moon').getAttribute('transform');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});HomePostFixture.at+=3600000;document.dispatchEvent(new Event('visibilitychange'));});
 assert.equal(await page.locator('.roof-moon').getAttribute('transform'),hiddenMoon,'Hidden page does not update the moon');
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
 assert.notEqual(await page.locator('.roof-moon').getAttribute('transform'),hiddenMoon);
 for(const event of ['visibilitychange','pageshow']){
  await show(2,21);const before=await page.locator('.roof-moon').getAttribute('transform');
  await page.evaluate(event=>{HomePostFixture.at+=2*3600000;if(event==='pageshow')window.dispatchEvent(new PageTransitionEvent(event,{persisted:true}));else document.dispatchEvent(new Event(event));},event);
  assert.notEqual(await page.locator('.roof-moon').getAttribute('transform'),before);
  resumes.push(event);
 }
 await page.emulateMedia({reducedMotion:'reduce'});await show(2);
 assert.equal(await page.locator('.roof-moon').count(),1);
 assert.equal(await page.evaluate(()=>document.querySelector('.roof-moon').getAnimations({subtree:true}).length),0);
 const boundaries=[];
 for(const event of ['visibilitychange','pageshow']){
  await show(2,5.99);
  await page.evaluate(()=>{HomePostFixture.at=Date.parse('2026-10-12T05:59:59.999+09:00');shared.clock={serverNow:HomePostFixture.at,monotonicAt:performance.now(),resetAt:HomePostFixture.at+1};render();});
  assert.equal(await page.locator('.roof-sky-card').count(),1);
  assert.equal(await page.evaluate(()=>NightClock.night()),'2026-10-11');
  await page.evaluate(event=>{HomePostFixture.at=Date.parse('2026-10-12T06:00:00+09:00');if(event==='pageshow')window.dispatchEvent(new PageTransitionEvent(event,{persisted:true}));else document.dispatchEvent(new Event(event));},event);
  assert.equal(await page.locator('.roof-sky-card').count(),0);
  assert.equal(await page.evaluate(()=>NightClock.night()),'2026-10-12');
  boundaries.push(event);
 }
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);assert.deepEqual(external,[]);
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({pass:true,engine:edge?'edge':'webkit',actualIPhone:false,productionDbAccess:false,layouts,phases,resumes,boundaries,errors,failed,external},null,2));
 console.log(`PASS ${edge?'Edge':'WebKit'}: ${layouts.length} layouts at 320–430px, fixed feet/85% cats, phase rasterization, resume and 06:00 boundary.`);
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
