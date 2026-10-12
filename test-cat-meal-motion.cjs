const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {webkit,chromium}=require(process.env.OYASUMI_PLAYWRIGHT_PATH||'./output/webkit-tools/core/package');
const engine=process.argv.includes('--edge')?'edge':'webkit',published=process.argv.includes('--published');
const port=engine==='edge'?9412:9411,base=published?'https://tomowo985250z-cmyk.github.io/oyasumi/':`http://127.0.0.1:${port}/`;
const output=path.join(__dirname,'output/cat-meal-motion',`${published?'published':'local'}-${engine}`);fs.mkdirSync(output,{recursive:true});
const source=fs.readFileSync(path.join(__dirname,'test-home-post-choices.cjs'),'utf8');
const fixture=source.slice(source.indexOf('function installFixture()'),source.indexOf('\n(async () =>'))+'\ninstallFixture();';
const server=published?null:spawn(process.execPath,['server.js'],{cwd:__dirname,env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'ignore'});
let browser;
(async()=>{try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await(engine==='edge'?chromium:webkit).launch(engine==='edge'?{executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
 const cases=[],errors=[];
 for(const standalone of process.argv.includes('--focused')?[true]:[false,true]){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
  await context.addInitScript({content:fixture});
  await context.addInitScript(standalone=>{
   Object.defineProperty(navigator,'standalone',{value:standalone});
   const mm=matchMedia.bind(window);window.matchMedia=q=>q==='(display-mode: standalone)'?{matches:standalone,media:q,addEventListener(){},removeEventListener(){}}:mm(q);
   const api=OyasumiAPI,snapshot=api.snapshot;
   api.snapshot=async()=>({...await snapshot(),catCare:{allowanceVersion:2,sleepStateVersion:1,catState:'awake',mealSleeping:false,day:SleepFlow.night(HomePostFixture.at),mealSlot:CatCare.slot(HomePostFixture.at),mealEligible:true,mealDone:false,treatGiven:false,treatCount:0,treatRecipients:[],receivedToday:0,receivedTotal:0,receivedDays:[]}});
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
   await page.setViewportSize({width,height:844});
   await page.evaluate(async night=>{
    go('home');HomePostFixture.at=Date.parse(`2026-10-11T${night?'23':'14'}:00:00+09:00`);NightClock.now=()=>HomePostFixture.at;
    await refreshShared();go('catMeal');void CatCare.play(document.querySelector('.room-care-proxy'));
   },night);
   await page.waitForSelector('.room-care-animation.care-playing');
   const samples=await page.evaluate(async()=>{
    const scene=document.querySelector('.care-playing'),head=scene.querySelector('.care-head'),body=scene.querySelector('.care-body'),animation=head.getAnimations()[0];
    if(!animation)throw Error('Missing head animation');
    if(head.tagName!=='SPAN'||getComputedStyle(head).clipPath!=='none'||getComputedStyle(head.querySelector('.care-head-crop')).overflow!=='hidden'||head.querySelector('img').getAnimations().length)throw Error('Head motion and image crop must be separate');
    while(animation.currentTime<1150)await new Promise(requestAnimationFrame);
    const samples=[],start=animation.currentTime,end=performance.now()+3000;
    while(animation.currentTime-start<680&&performance.now()<end){await new Promise(requestAnimationFrame);samples.push({time:animation.currentTime,headY:(head.getBoundingClientRect().top+head.getBoundingClientRect().bottom)/2,bodyY:body.getBoundingClientRect().top,transform:getComputedStyle(head).transform,playState:getComputedStyle(head).animationPlayState});}
    return samples;
   });
   assert(samples.length>=3,`Head must paint across multiple real animation frames: ${JSON.stringify(samples)}`);
   assert(samples.every(s=>s.playState==='running'));
   assert(samples.at(-1).time-samples[0].time>400,JSON.stringify(samples));
   assert(Math.max(...samples.map(s=>s.headY))-Math.min(...samples.map(s=>s.headY))>1,`Head moves vertically: ${JSON.stringify(samples)}`);
   assert(Math.max(...samples.map(s=>s.bodyY))-Math.min(...samples.map(s=>s.bodyY))<.1,'Body stays still');
   const pose=async time=>page.evaluate(async time=>{
    const scene=document.querySelector('.care-playing');for(const a of scene.getAnimations({subtree:true})){a.pause();a.currentTime=time;}
    await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);
    const r=scene.getBoundingClientRect(),head=scene.querySelector('.care-head');
    return{clip:{x:Math.ceil(r.left),y:Math.ceil(r.top),width:Math.floor(r.width),height:Math.floor(r.height*.52)},transform:getComputedStyle(head).transform};
   },time);
   const first=await pose(1320),down=await page.screenshot({clip:first.clip});
   const second=await pose(1620),up=await page.screenshot({clip:first.clip});
   assert.notEqual(first.transform,second.transform);
   const painted=await page.evaluate(async([first,second])=>{
    const pixels=async src=>{const img=new Image();img.src='data:image/png;base64,'+src;await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;});const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return ctx.getImageData(0,0,c.width,c.height).data;};
    const a=await pixels(first),b=await pixels(second);let changed=0;for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>20)changed++;return changed;
   },[down.toString('base64'),up.toString('base64')]);
   assert(painted>80,`Head pixels must repaint, not only computed transform: ${painted}`);
   const name=`${width}-${standalone?'standalone':'browser'}-${night?'night':'day'}`;
   fs.writeFileSync(path.join(output,name+'-down.png'),down);fs.writeFileSync(path.join(output,name+'-up.png'),up);
   cases.push({width,standalone,night,frames:samples.length,headTravel:Math.max(...samples.map(s=>s.headY))-Math.min(...samples.map(s=>s.headY)),changedPixels:painted});
   await page.evaluate(()=>go('home'));await page.waitForFunction(()=>DayRoom.playing===0);
  }
  await context.close();
 }
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({pass:true,engine,cases,physicalIPhoneTested:false,standaloneEmulated:true,productionDbWrites:0,errors},null,2));
 console.log(`PASS ${engine}: ${cases.length} browser/standalone, width and day/night combinations; live head movement, stationary body and painted pixel differences`);
}finally{await browser?.close();server?.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
