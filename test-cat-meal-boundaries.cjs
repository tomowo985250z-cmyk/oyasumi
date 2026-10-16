// Render-boundary matrix. API writes are isolated; no production account is used.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const {webkit,chromium}=require('./output/webkit-tools/core/package'),installPlaces=require('./test-support/cat-places-fixture.cjs');
const edge=process.argv.includes('--edge'),engine=edge?'edge':'webkit',port=edge?9514:9513,base=`http://127.0.0.1:${port}/`,out=path.join(__dirname,'output/cat-meal-rendering',engine+'-boundaries');fs.mkdirSync(out,{recursive:true});
const source=fs.readFileSync('test-home-post-choices.cjs','utf8'),fixture=source.slice(source.indexOf('function installFixture()'),source.indexOf('\n(async () =>'))+'\ninstallFixture();';
const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'ignore'});let browser;
(async()=>{try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await(edge?chromium:webkit).launch(edge?{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
 const context=await browser.newContext({viewport:{width:390,height:900},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 await context.addInitScript({content:fixture});await context.addInitScript(installPlaces);
 await context.addInitScript(()=>Object.defineProperty(navigator,'standalone',{value:true}));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>{if(!r.request().url().startsWith(base))return r.abort();if(/\/(vendor\/supabase|supabase-api|update-client)\.js$/.test(new URL(r.request().url()).pathname))return r.fulfill({contentType:'text/javascript',body:''});return r.continue();});
 await page.clock.install();await page.goto(base);await page.waitForFunction(()=>typeof ready!=='undefined'&&ready&&!busy&&!refreshPromise);
 const setup=await page.evaluate(()=>{
  NightClock.now=()=>HomePostFixture.at;go('profile');
  const host=document.createElement('section');host.id='meal-matrix';host.style.cssText='position:fixed;top:0;left:0;z-index:100;width:calc(100% - 32px);margin:16px';document.body.append(host);
  globalThis.matrixProbe=()=>{
   const unit=host.querySelector('.profile-room-unit'),stage=unit.querySelector('.day-room'),scene=stage.querySelector('.room-care-animation');
   const visible=el=>{if(!el||getComputedStyle(el).visibility!=='visible')return false;for(let n=el;n&&n.nodeType===1;n=n.parentElement){const s=getComputedStyle(n);if(s.display==='none'||Number(s.opacity)<.01)return false;}return true;};
   return {now:performance.now(),state:unit.dataset.catPlayback||'resident',phase:scene?.dataset.careStage,groups:[stage.querySelector('.room-resident img'),scene?.querySelector('.care-idle'),scene?.querySelector('.care-head img'),scene?.querySelector('.care-joy-cat')].map(visible),location:stage.dataset.location,overflow:document.documentElement.scrollWidth>innerWidth,events:CareEvents.map(e=>({...e})),playing:DayRoom.playing};
  };
  globalThis.startMatrix=async({coat,at,kind})=>{
   const f=HomePostFixture;f.at=at;f.coat=coat;shared.catCare=f.care();CareEvents.length=0;
   host.className=kind==='meal'?'own-cat-room':'';
   host.innerHTML=DayRoom.unit(DayRoom.stage(coat,f.owner,{home:kind==='meal',status:'awake'}),DayRoom.care(shared.catCare,coat,f.owner,kind==='meal'),f.owner);
   await Promise.all([...host.querySelectorAll('img')].map(i=>i.decode().catch(()=>{})));
   void CatCare.play(host.querySelector('.room-care-proxy'));globalThis.preparingFrame=matrixProbe();
   await Promise.all([...host.querySelectorAll('.room-care-animation img')].map(i=>i.decode().catch(()=>{})));
  };
  const times={night:Date.parse('2026-10-15T05:59:59+09:00')};
  for(let d=0;d<60;d++){const plan=CatPlaces.schedule(Date.parse('2026-10-01T14:00:00+09:00')+d*86400000,HomePostFixture.owner);for(const p of ['room','garden','engawa'])if(!times[p]){const e=plan.events.find(e=>e.place===p);if(e)times[p]=e.end-1000;}}
  return {times,coats:CatFaces.coats.map(c=>c.id)};
 });
 await page.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 const productionHash=crypto.createHash('sha256').update(['cat-care.js','day-room.js','day-room.css','style.css'].map(f=>fs.readFileSync(f,'utf8').replace(/\r\n/g,'\n')).join('\n')).digest('hex');
 const checkpoint=path.join(out,'checkpoint.json'),saved=process.argv.includes('--resume')&&fs.existsSync(checkpoint)?JSON.parse(fs.readFileSync(checkpoint,'utf8')):null;
 const cases=saved?.productionHash===productionHash?saved.cases:[],steps=[16,960,992,1008,1504,2000,3008,3968,4000,4016,5792,5808,5984,6000,6032];
 for(const reduced of process.argv.includes('--handoff-only')?[]:[false,true]){
  await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
  for(const width of [320,375,390,430]){
   await page.setViewportSize({width,height:900});
   for(const [index,coat] of setup.coats.entries())for(const [place,at] of Object.entries(setup.times)){
    if(cases.some(c=>c.reduced===reduced&&c.width===width&&c.coat===coat&&c.place===place))continue;
    const kind=index%2?'treat':'meal';
    await page.evaluate(args=>startMatrix(args),{coat,at,kind});
    const preparing=await page.evaluate(()=>preparingFrame);assert.deepEqual(preparing.groups,[true,false,false,false]);assert.equal(preparing.state,'preparing');
    await page.clock.runFor(32);
    let row=await page.evaluate(()=>matrixProbe());assert.equal(row.events[0]?.type,'careplaybackstart',JSON.stringify({coat,place,row}));
    const started=row.events[0].at,samples=[];
    for(const time of steps){
     const remaining=started+time-await page.evaluate(()=>performance.now());if(remaining>0)await page.clock.fastForward(remaining);
     if(time===3008)await page.evaluate(()=>{HomePostFixture.at+=2000;shared.catCare=HomePostFixture.care();DayRoom.sync();});
     row=await page.evaluate(()=>matrixProbe());samples.push({time,...row});
     assert.equal(row.groups.filter(Boolean).length,1,JSON.stringify({width,coat,place,reduced,time,row}));assert(!row.overflow);
     if(time<6000){assert.equal(row.location,place==='night'?'room':place);assert.equal(row.phase,time<1000?'plate':time<4000?'munch':'joy');assert.equal(row.groups[0],false);}
    }
    // Image decoding is asynchronous even with a paused playback clock.
    for(let i=0;i<20&&row.playing;i++){await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('#meal-matrix .room-resident img')].map(i=>i.decode().catch(()=>{})));});await page.clock.runFor(16);row=await page.evaluate(()=>matrixProbe());}
    if(row.playing||row.groups.filter(Boolean).length!==1){fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({width,coat,place,reduced,row,samples,html:await page.evaluate(()=>({root:document.documentElement.outerHTML.slice(0,550),unit:document.querySelector('#meal-matrix').outerHTML}))},null,2));}
    assert.equal(row.playing,0);assert.equal(row.groups.filter(Boolean).length,1,JSON.stringify({width,coat,place,reduced,row}));assert(row.groups[0]);
    const expected=await page.evaluate(()=>DayRoom.world().daylight?DayRoom.snapshot(HomePostFixture.owner).location:'room');assert.equal(row.location,expected);
    assert(row.events.find(e=>e.type==='careplaybackend').ms>=6000);
    if(coat==='calico'&&width===375){const clip=await page.locator('#meal-matrix .day-room').boundingBox();await page.screenshot({path:path.join(out,`${place}-${reduced?'reduced':'normal'}-after.png`),clip});}
    cases.push({width,coat,place,kind,reduced,at,samples,after:row});
    if(cases.length%16===0)fs.writeFileSync(checkpoint,JSON.stringify({productionHash,cases}));
   }
   console.log(`PASS ${engine} ${width}px reduced=${reduced}: 16 cats × 4 movement/day/night boundaries`);
  }
 }
 // A slow decoded return, pending own-cat exception and a second movement
 // during that wait must never reveal a resident behind the meal cat.
 await page.evaluate(args=>startMatrix(args),{coat:'calico',at:setup.times.garden,kind:'meal'});await page.clock.runFor(32);
 await page.evaluate(()=>{
  globalThis.originalDecode=HTMLImageElement.prototype.decode;globalThis.delayReturn=true;
  HTMLImageElement.prototype.decode=function(){const work=originalDecode.call(this);return this.closest('#meal-matrix .room-resident')&&delayReturn?work.then(()=>new Promise(resolve=>globalThis.releaseReturn=resolve)):work;};
 });
 await page.clock.fastForward(6000);await page.evaluate(async()=>{await originalDecode.call(document.querySelector('#meal-matrix .room-resident img'));});
 let delayed=await page.evaluate(()=>matrixProbe());assert.equal(delayed.state,'returning');assert.deepEqual(delayed.groups,[false,false,false,true]);
 await page.evaluate(()=>{document.documentElement.setAttribute('data-cat-state-pending','');document.documentElement.setAttribute('data-cat-own-ready','');document.dispatchEvent(new Event('catvisibilitychange'));});
 const pending=await page.evaluate(()=>matrixProbe());assert(!pending.groups[0]);assert(pending.groups.filter(Boolean).length<=1);
 await page.evaluate(()=>{HomePostFixture.at+=120*60000;delayReturn=false;releaseReturn();HTMLImageElement.prototype.decode=originalDecode;});
 await page.clock.fastForward(500);assert.equal((await page.evaluate(()=>matrixProbe())).state,'returning');
 await page.evaluate(()=>{document.documentElement.removeAttribute('data-cat-state-pending');document.documentElement.removeAttribute('data-cat-own-ready');document.dispatchEvent(new Event('catvisibilitychange'));});
 for(let i=0;i<20&&(await page.evaluate(()=>matrixProbe())).playing;i++){await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('#meal-matrix .room-resident img')].map(i=>i.decode()));});await page.clock.runFor(16);}
 const afterWait=await page.evaluate(()=>matrixProbe());assert.equal(afterWait.playing,0);assert.deepEqual(afterWait.groups,[true,false,false,false]);
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,process.argv.includes('--handoff-only')?'handoff.json':'report.json'),JSON.stringify({pass:true,engine,productionHash,cases,delayedReturn:{delayed,pending,afterWait},errors,productionDbWrites:0,physicalIPhoneTested:false},null,2));
 console.log(`PASS ${engine}: ${cases.length} playback cases / ${cases.length*steps.length} exclusive cat-phase checks`);
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
