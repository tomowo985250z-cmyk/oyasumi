const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {webkit,chromium}=require(process.env.OYASUMI_PLAYWRIGHT_PATH||'./output/webkit-tools/core/package');
const engine=process.argv.includes('--edge')?'edge':'webkit',published=process.argv.includes('--published');
// Windows WebKit uses software rasterization; CSS-width checks use standard DPR.
const deviceScaleFactor=engine==='webkit'?1:3;
const port=engine==='edge'?9412:9411,base=published?'https://tomowo985250z-cmyk.github.io/oyasumi/':`http://127.0.0.1:${port}/`;
const output=path.join(__dirname,'output/cat-meal-motion',`${published?'published':'local'}-${engine}`);fs.mkdirSync(output,{recursive:true});
const source=fs.readFileSync(path.join(__dirname,'test-home-post-choices.cjs'),'utf8');
const fixture=source.slice(source.indexOf('function installFixture()'),source.indexOf('\n(async () =>'))+'\ninstallFixture();';
const server=published?null:spawn(process.execPath,['server.js'],{cwd:__dirname,env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'ignore'});
let browser;
(async()=>{try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await(engine==='edge'?chromium:webkit).launch(engine==='edge'?{executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
 const release=JSON.parse(fs.readFileSync('release.json','utf8')).release,focused=process.argv.includes('--focused'),selectedWidth=Number(process.argv.find(a=>a.startsWith('--width='))?.split('=')[1]),checkpoint=path.join(output,focused?'checkpoint-focused.json':'checkpoint.json');
 const saved=fs.existsSync(checkpoint)?JSON.parse(fs.readFileSync(checkpoint,'utf8')):null;if(saved)assert.equal(saved.release,release);
 const cases=saved?.cases||[],errors=[];let ordinal=0;
 for(const standalone of process.argv.includes('--focused')?[true]:[false,true])for(const reduced of [false,true]){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor,isMobile:true,hasTouch:true,reducedMotion:reduced?'reduce':'no-preference'});
  await context.addInitScript({content:fixture});
  await context.addInitScript(standalone=>{
   // Parallel engines model independent visible devices, regardless of OS focus.
   Object.defineProperty(document,'hidden',{configurable:true,value:false});
   Object.defineProperty(navigator,'standalone',{value:standalone});
   const mm=matchMedia.bind(window);window.matchMedia=q=>q==='(display-mode: standalone)'?{matches:standalone,media:q,addEventListener(){},removeEventListener(){}}:mm(q);
   const api=OyasumiAPI,snapshot=api.snapshot;
   api.snapshot=async()=>({...await snapshot(),coat:HomePostFixture.coat||'calico',catCare:{allowanceVersion:2,sleepStateVersion:1,catState:'awake',mealSleeping:false,day:SleepFlow.night(HomePostFixture.at),mealSlot:CatCare.slot(HomePostFixture.at),mealEligible:true,mealDone:false,treatGiven:false,treatCount:0,treatRecipients:[],receivedToday:0,receivedTotal:0,receivedDays:[]}});
  },standalone);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(!url.href.startsWith(base))return route.abort();
   if(/\/(?:vendor\/supabase|supabase-api|update-client)\.js$/.test(url.pathname))return route.fulfill({contentType:'text/javascript',body:''});
   return route.continue();
  });
  await page.goto(base);await page.waitForFunction(()=>typeof ready!=='undefined'&&ready&&!busy&&!document.documentElement.hasAttribute('data-cat-state-pending'));
  if(published)assert.equal(await page.locator('meta[name="oyasumi-release"]').getAttribute('content'),JSON.parse(fs.readFileSync('release.json','utf8')).release);
  for(const width of process.argv.includes('--focused')?[390]:[320,375,390,430])for(const night of [false,true]){
   const index=ordinal++;if(selectedWidth&&width!==selectedWidth)continue;if(cases.some(c=>c.width===width&&c.night===night&&c.reduced===reduced&&c.standalone===standalone))continue;
   await page.bringToFront();
   await page.setViewportSize({width,height:844});
   const coat=await page.evaluate(i=>CatFaces.coats[i%16].id,index);
   const name=`${width}-${coat}-${standalone?'standalone':'browser'}-${night?'night':'day'}-${reduced?'reduced':'normal'}`;
   await page.evaluate(async({night,coat})=>{
    go('home');HomePostFixture.coat=coat;HomePostFixture.at=Date.parse(`2026-10-11T${night?'23':'14'}:00:00+09:00`);NightClock.now=()=>HomePostFixture.at;
    await refreshShared();go('catMeal');await Promise.all([...document.querySelectorAll('.cat-meal-room .room-resident img')].map(i=>i.decode()));
    const log=globalThis.MealPaint={running:true,frames:[],events:[]};
    for(const type of ['careplaybackstart','careplaybackend'])document.addEventListener(type,e=>log.events.push({type,t:performance.now(),ms:e.detail?.visibleMs}),{once:true,capture:true});
    const visible=el=>{for(let p=el;p&&p!==document;p=p.parentElement){const s=getComputedStyle(p);if(p.hidden||s.display==='none'||s.visibility==='hidden'||s.opacity==='0')return false;}return true;};
    const tick=()=>{if(!log.running)return;const unit=document.querySelector('.cat-meal-room'),scene=unit?.querySelector('.room-care-animation'),groups=[...unit.querySelectorAll('.room-resident,.room-care-animation>.care-idle,.room-care-animation>.care-munch,.room-care-animation>.care-joy-cat')].filter(visible);
     const loaded=groups.every(g=>[...(g.matches('img')?[g]:g.querySelectorAll('img'))].every(i=>i.complete&&i.naturalWidth>0));
     log.frames.push({t:performance.now(),phase:scene?.dataset.careStage||unit.dataset.catPlayback||'resident',cats:groups.length,loaded});requestAnimationFrame(tick);};requestAnimationFrame(tick);
    void CatCare.play(document.querySelector('.room-care-proxy'));
   },{night,coat});
   await page.waitForSelector('.room-care-animation:is(.care-playing,.care-reduced)[data-care-stage=munch]');
   assert.equal(await page.locator('.room-care-animation').getAttribute('data-care-coat'),coat);
   await page.locator('.room-care-animation').scrollIntoViewIfNeeded();
   await page.evaluate(()=>{
    const scene=document.querySelector('.room-care-animation'),head=scene.querySelector('.care-head'),body=scene.querySelector('.care-body');
    if(head.tagName!=='SPAN'||getComputedStyle(head).clipPath!=='none'||getComputedStyle(head.querySelector('.care-head-crop')).overflow!=='hidden'||head.querySelector('img').getAnimations().length)throw Error('Head motion and image crop must be separate');
    // Observe layout and screenshots concurrently: screenshot latency on software
    // WebKit must not consume another 1.1 seconds before the first painted sample.
    const log=globalThis.HeadSamples={samples:[],done:false},start=performance.now();
    const tick=()=>{log.samples.push({time:performance.now(),headY:head.getBoundingClientRect().top,bodyY:body.getBoundingClientRect().top,stage:scene.dataset.careStage});if(performance.now()-start<1100)requestAnimationFrame(tick);else log.done=true;};requestAnimationFrame(tick);
   });
   // Keep the real playback clock running while taking painted frames. Mixing
   // pauseAt/runFor with screenshot rAF ticks can rewind the virtual clock.
   const pose=()=>page.evaluate(()=>{
    const scene=document.querySelector('.room-care-animation');
    const r=scene.getBoundingClientRect(),head=scene.querySelector('.care-head');
    return{clip:{x:Math.ceil(r.left),y:Math.ceil(r.top),width:Math.floor(r.width),height:Math.floor(r.height*.52)},top:head.style.top,phase:scene.dataset.careStage,time:performance.now(),paused:scene.classList.contains('care-paused'),pending:document.documentElement.hasAttribute('data-cat-state-pending')};
   });
   const first=await pose(),down=await page.screenshot({clip:first.clip});
   await page.waitForTimeout(reduced?170:110);const second=await pose(),up=await page.screenshot({clip:first.clip});
   await page.waitForTimeout(reduced?210:130);const third=await pose(),last=await page.screenshot({clip:first.clip});
   assert([first,second,third].every(p=>p.phase==='munch'&&!p.paused&&!p.pending),JSON.stringify({first,second,third}));
   assert(new Set([first.top,second.top,third.top]).size>1,JSON.stringify({width,night,reduced,first,second,third}));
   for(const [i,frame] of [down,up,last].entries())fs.writeFileSync(path.join(output,name+'-'+i+'.png'),frame);
   const painted=await page.evaluate(async sources=>{
    const pixels=async src=>{const img=new Image();img.src='data:image/png;base64,'+src;await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;});const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return ctx.getImageData(0,0,c.width,c.height).data;};
    const frames=await Promise.all(sources.map(pixels));return Math.max(...frames.slice(1).map(b=>{const a=frames[0];let changed=0;for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>20)changed++;return changed;}));
   },[down,up,last].map(frame=>frame.toString('base64')));
   assert(painted>Math.ceil(80*deviceScaleFactor**2/9),`Head pixels must repaint, not only computed layout: ${JSON.stringify({painted,width,night,reduced,standalone,first,second,third})}`);
   await page.waitForFunction(()=>HeadSamples.done);const samples=await page.evaluate(()=>HeadSamples.samples);
   assert(samples.length>=3,`Head must paint across multiple real animation frames: ${JSON.stringify(samples)}`);
   assert(samples.every(s=>s.stage==='munch'),JSON.stringify({width,night,reduced,standalone,samples}));
   assert(samples.at(-1).time-samples[0].time>400,JSON.stringify(samples));
   assert(Math.max(...samples.map(s=>s.headY))-Math.min(...samples.map(s=>s.headY))>1,`Head moves vertically, including reduced motion: ${JSON.stringify(samples)}`);
   assert(Math.max(...samples.map(s=>s.bodyY))-Math.min(...samples.map(s=>s.bodyY))<.1,'Body stays still');
   await page.waitForSelector('.room-care-animation[data-care-stage=joy]');
   await page.screenshot({path:path.join(output,name+'-joy-room.png'),clip:await page.locator('.cat-meal-room .day-room').boundingBox()});
   await page.waitForFunction(()=>DayRoom.playing===0&&!document.querySelector('.room-care-animation'),{},{timeout:15000});
   const lifetime=await page.evaluate(async()=>{await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);MealPaint.running=false;return {frames:MealPaint.frames,events:MealPaint.events};});
   await page.screenshot({path:path.join(output,name+'-resident-room.png'),clip:await page.locator('.cat-meal-room .day-room').boundingBox()});
   fs.writeFileSync(path.join(output,name+'-frames.json'),JSON.stringify(lifetime,null,2));
   assert(lifetime.frames.length>=3);assert(lifetime.frames.every(f=>f.cats===1&&f.loaded),JSON.stringify({width,coat,night,reduced,standalone,bad:lifetime.frames.filter(f=>f.cats!==1||!f.loaded)}));
   for(const phase of ['plate','munch','joy','resident'])assert(lifetime.frames.some(f=>f.phase===phase),`${name}: painted ${phase}`);
   const start=lifetime.events.find(e=>e.type==='careplaybackstart'),end=lifetime.events.find(e=>e.type==='careplaybackend');assert(start&&end&&end.ms>=6000&&end.t-start.t>=5980,JSON.stringify(lifetime.events));
   assert.deepEqual(errors,[]);
   cases.push({width,coat,standalone,night,reduced,frames:samples.length,lifetimeFrames:lifetime.frames.length,sixSecondMs:end.t-start.t,onePaintedCat:true,headTravel:Math.max(...samples.map(s=>s.headY))-Math.min(...samples.map(s=>s.headY)),changedPixels:painted});
   fs.writeFileSync(checkpoint,JSON.stringify({release,engine,cases},null,2));
   console.log(`PASS ${engine} ${width}px ${coat} ${night?'night':'day'} ${reduced?'reduced':'normal'}: ${lifetime.frames.length} live frames, one loaded cat, moving head and six visible seconds`);
   await page.evaluate(()=>go('home'));
  }
  await context.close();
 }
 assert.deepEqual(errors,[]);
 const complete=cases.length===(focused?4:32);fs.writeFileSync(path.join(output,complete?'report.json':`report-${selectedWidth}.json`),JSON.stringify({pass:true,complete,release,engine,deviceScaleFactor,cases,physicalIPhoneTested:false,standaloneEmulated:true,productionDbWrites:0,errors},null,2));
 console.log(`PASS ${engine}: ${cases.length} browser/standalone, width and day/night combinations; live head movement, stationary body and painted pixel differences`);
}finally{await browser?.close();server?.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
