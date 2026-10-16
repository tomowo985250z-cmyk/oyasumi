const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn,execFileSync}=require('node:child_process');
const {webkit,chromium}=require(process.env.OYASUMI_PLAYWRIGHT_PATH||'./output/webkit-tools/core/package');
const edge=process.argv.includes('--edge'),published=process.argv.includes('--published'),engine=edge?'edge':'webkit',port=edge?9572:9571;
const base=published?'https://tomowo985250z-cmyk.github.io/oyasumi/':`http://127.0.0.1:${port}/`,out=path.join(__dirname,'output/countryside-backgrounds',`${published?'published':'local'}-${engine}`);fs.mkdirSync(out,{recursive:true});
const fixtureFile=fs.readFileSync(path.join(__dirname,'test-home-post-choices.cjs'),'utf8'),fixture=fixtureFile.slice(fixtureFile.indexOf('function installFixture()'),fixtureFile.indexOf('\n(async () =>'))+'\ninstallFixture();';
const baseline=execFileSync('git',['show','f2aed746d0bc23ec6e8d2b12e40d93138866345a:day-room.js'],{cwd:__dirname,encoding:'utf8'}).replace(/\bDayRoom\b/g,'BaselineDayRoom');
const server=published?null:spawn(process.execPath,['server.js'],{cwd:__dirname,env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'ignore'});let browser;
(async()=>{try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await(edge?chromium:webkit).launch(edge?{executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
 const context=await browser.newContext({viewport:{width:375,height:1000},deviceScaleFactor:1,isMobile:true,hasTouch:true,timezoneId:'America/Los_Angeles',reducedMotion:'no-preference'});
 await context.addInitScript({content:fixture});await context.addInitScript(()=>Object.defineProperty(document,'hidden',{configurable:true,value:false}));
 const page=await context.newPage(),errors=[],failed=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
 await page.route('**/*',r=>{if(!r.request().url().startsWith(base)){external.push(r.request().url());return r.abort();}if(/\/(?:vendor\/supabase|supabase-api|update-client)\.js$/.test(new URL(r.request().url()).pathname))return r.fulfill({contentType:'text/javascript',body:''});return r.continue();});
 await page.goto(base);await page.waitForFunction(()=>typeof ready!=='undefined'&&ready&&!busy&&!refreshPromise);
 const release=JSON.parse(fs.readFileSync(path.join(__dirname,'release.json'),'utf8')).release;assert.equal(await page.locator('meta[name=oyasumi-release]').getAttribute('content'),release);
 await page.addScriptTag({content:baseline});
 await page.addStyleTag({content:'#background-verification{position:relative;width:100%;max-width:430px;margin:auto;background:#071329;padding:0 22px 20px;box-sizing:border-box}#background-verification>h2{font:13px sans-serif;color:#d3dfdb;padding:14px 0 8px;margin:0}#background-verification .day-room{margin:0 0 14px}'});
 await page.evaluate(()=>{
  go('stats');const host=document.createElement('section');host.id='background-verification';document.querySelector('.app-shell').append(host);
  globalThis.BackgroundCheck={owner:'00000000-0000-0000-0000-000000000001',world:null,snapshot:null,originalWorld:DayRoom.world,originalSnapshot:DayRoom.snapshot};
  DayRoom.world=BaselineDayRoom.world=()=>BackgroundCheck.world;DayRoom.snapshot=BaselineDayRoom.snapshot=()=>BackgroundCheck.snapshot;
  NightClock.now=()=>BackgroundCheck.world?.at||HomePostFixture.at;
  BackgroundCheck.set=(season='summer',hour=13,weather='sunny',place='room',pose='relax')=>{
   const date=`2026-${{spring:'04',summer:'07',autumn:'10',winter:'01'}[season]}-15`,at=Date.parse(date+'T'+String(hour).padStart(2,'0')+':00:00+09:00');
   BackgroundCheck.world={...SeasonWeather.at(at),season,weather,hour,daylight:hour>=6&&hour<18,at};
   BackgroundCheck.snapshot={day:date,location:place,place:pose==='gaze'?'window':'cushion',pose,away:false};
  };
 });
 const matrix=[],cats=[],transitions=[];
 for(const width of [320,375,390,430]){
  await page.setViewportSize({width,height:1000});
  for(const season of ['spring','summer','autumn','winter'])for(const hour of [7,13,17,21])for(const weather of ['sunny','cloudy','rainy']){
   const rows=await page.evaluate(async({season,hour,weather})=>{
    const f=BackgroundCheck;f.set(season,hour,weather);const host=document.querySelector('#background-verification');host.replaceChildren();const results=[];
    for(const where of ['room','engawa','garden']){
     const holder=document.createElement('div');holder.innerHTML=DayRoom.stage('calico',f.owner,{status:'awake'});const stage=holder.firstElementChild;stage.dataset.location=where;
     stage.querySelector('.day-room-scenery').innerHTML=RoomBackgrounds.markup(where,f.world);if(hour===21&&where!=='room')stage.querySelector('.room-resident').hidden=true;
     host.insertAdjacentHTML('beforeend',`<h2>${season} / ${hour}:00 / ${weather} / ${where}${hour===21&&where!=='room'?'（夜の屋外は背景配色のみ）':''}</h2>`);host.append(stage);
     await Promise.all([...stage.querySelectorAll('img')].map(i=>i.decode()));
     const r=stage.getBoundingClientRect(),bg=stage.querySelector('.room-background-layer'),svg=bg.querySelector('svg');
     results.push({where,season,hour,weather,phase:bg.dataset.backgroundPhase,stageWidth:r.width,height:r.height,loaded:[...stage.querySelectorAll('img')].every(i=>i.complete&&i.naturalWidth>0),backgroundFilter:getComputedStyle(bg.querySelector('.day-room-art,.day-room-place-art')).filter,depth:!!svg.querySelector('[data-depth=distant-ridge]'),oneCat:stage.querySelectorAll('.room-resident').length===1,overflow:document.documentElement.scrollWidth>innerWidth});
    }return results;
   },{season,hour,weather});
   for(const r of rows){assert(r.loaded&&r.oneCat&&!r.overflow,JSON.stringify(r));assert.equal(r.stageWidth,width-44);assert(Math.abs(r.height-r.stageWidth*.825)<.1);assert.equal(r.backgroundFilter,'none');assert(r.depth);matrix.push({width,...r});}
   if(width===375&&season==='summer'&&weather==='sunny')await page.locator('#background-verification').screenshot({path:path.join(out,`375-${hour}.png`)});
  }
  // Compare cats against the published renderer, including every day action and night gesture.
  for(const coat of await page.evaluate(()=>CatFaces.coats.map(c=>c.id))){
   const rows=await page.evaluate(async coat=>{
    const host=document.querySelector('#background-verification'),f=BackgroundCheck,rows=[];
    const cases=[...['room','engawa','garden'].flatMap(where=>['relax','play','groom','doze','gaze'].map(pose=>({hour:13,where,pose,status:'awake'}))),...[20,21,22,23].map(hour=>({hour,where:'room',pose:'relax',status:'awake'})),{hour:7,where:'room',pose:'doze',status:'sleep'},{hour:21,where:'room',pose:'doze',status:'sleep'}];
    for(const c of cases){
     f.set('summer',c.hour,'sunny',c.where,c.pose);host.innerHTML=DayRoom.stage(coat,f.owner,{home:true,status:c.status})+BaselineDayRoom.stage(coat,f.owner,{home:true,status:c.status});
     await Promise.all([...host.querySelectorAll('img')].map(i=>i.decode()));const [a,b]=host.querySelectorAll('.day-room'),x=a.querySelector('.room-resident'),y=b.querySelector('.room-resident');
     y.style.setProperty('--room-cat-scale','1');const geo=(cat,stage)=>{const r=cat.getBoundingClientRect(),s=stage.getBoundingClientRect();return [r.x-s.x,r.y-s.y,r.width,r.height];};
     rows.push({...c,coat,identical:x.innerHTML.replace(/ loading="eager"/g,'')===y.innerHTML.replace(/ loading="eager"/g,''),a:geo(x,a),b:geo(y,b),samePlace:a.dataset.location===b.dataset.location&&a.dataset.place===b.dataset.place,loaded:[...host.querySelectorAll('img')].every(i=>i.complete&&i.naturalWidth>0)});
    }return rows;
   },coat);
   for(const r of rows){assert(r.identical&&r.samePlace&&r.loaded,JSON.stringify(r));const ratio=r.a[2]/r.b[2];assert(ratio<=(r.where==='room'?.9:1)+.002,JSON.stringify(r));assert(Math.abs(r.a[3]/r.b[3]-ratio)<.002,JSON.stringify(r));cats.push({width,...r});}
  }
  // Real mounted DayRoom.sync must update time independently of unchanged cat moods.
  await page.evaluate(()=>{const f=BackgroundCheck;f.set();const host=document.querySelector('#background-verification');host.innerHTML=DayRoom.stage('calico',f.owner,{status:'awake'});DayRoom.sync();});
  await page.locator('#background-verification').scrollIntoViewIfNeeded();
  for(const hour of [17,21,7,13]){
   await page.evaluate(hour=>{BackgroundCheck.set('summer',hour,'sunny');DayRoom.sync();},hour);
    try{await page.waitForFunction(()=>!!document.querySelector('[data-background-outgoing]'));}catch(e){console.error(await page.evaluate(()=>({world:BackgroundCheck.world,hidden:document.hidden,reduce:matchMedia('(prefers-reduced-motion: reduce)').matches,stages:[...document.querySelectorAll('.day-room')].map(s=>({key:s.dataset.sceneryKey,stamp:s.dataset.roomStamp,settled:RoomBackgrounds.settled(s),layers:[...s.querySelectorAll('.room-background-layer')].map(l=>({...l.dataset}))}))})));throw e;}
    await page.waitForFunction(()=>{const old=document.querySelector('[data-background-outgoing]');if(!old)return false;const opacity=Number(getComputedStyle(old).opacity);return opacity>0&&opacity<1;});
   const state=await page.evaluate(()=>{const s=document.querySelector('#background-verification .day-room'),old=s.querySelector('[data-background-outgoing]');return {opacity:Number(getComputedStyle(old).opacity),duration:old.getAnimations()[0].effect.getTiming().duration,layers:s.querySelectorAll('.room-background-layer').length,cats:s.querySelectorAll('.room-resident').length,oldHasCat:!!old.querySelector('.room-resident'),key:s.dataset.sceneryKey};});
    assert(state.opacity>0&&state.opacity<1,JSON.stringify(state));assert.equal(state.duration,1600);assert.equal(state.layers,2);assert.equal(state.cats,1);assert(!state.oldHasCat);transitions.push({width,hour,...state});
   await page.waitForFunction(()=>RoomBackgrounds.settled(document.querySelector('#background-verification .day-room')));assert.equal(await page.locator('[data-background-outgoing]').count(),0);
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{BackgroundCheck.set('winter',21,'rainy');DayRoom.sync();});await page.waitForFunction(()=>RoomBackgrounds.settled(document.querySelector('#background-verification .day-room')));assert.equal(await page.locator('[data-background-outgoing]').count(),0);await page.emulateMedia({reducedMotion:'no-preference'});
  console.log(`PASS ${engine} ${width}px: 144 backgrounds, 16 cats × 21 actions/poses, time transitions and reduced motion`);
 }
 // A delayed background decode keeps the old complete background and one resident.
 await page.evaluate(()=>{BackgroundCheck.set();document.querySelector('#background-verification').innerHTML=DayRoom.stage('calico',BackgroundCheck.owner,{status:'awake'});DayRoom.sync();globalThis.originalBackgroundDecode=HTMLImageElement.prototype.decode;HTMLImageElement.prototype.decode=function(){return this.src.startsWith('data:image/svg+xml')?new Promise(resolve=>globalThis.releaseBackgroundDecode=()=>originalBackgroundDecode.call(this).then(resolve)):originalBackgroundDecode.call(this);};BackgroundCheck.set('spring',17,'sunny');DayRoom.sync();});
 await page.waitForFunction(()=>typeof releaseBackgroundDecode==='function');
 assert.equal(await page.locator('#background-verification .room-background-layer').count(),1);assert.equal(await page.locator('#background-verification .room-resident').count(),1);
 // Return to the original time before decode: the stale pending scene must not commit.
 await page.evaluate(async()=>{BackgroundCheck.set();DayRoom.sync();HTMLImageElement.prototype.decode=originalBackgroundDecode;await releaseBackgroundDecode();await new Promise(resolve=>setTimeout(resolve,50));});
 assert.equal(await page.locator('#background-verification .room-background-layer').getAttribute('data-background-phase'),'day');
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);assert.deepEqual(external,[]);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({pass:true,engine,published,release,widths:[320,375,390,430],matrix,cats,transitions,slowDecode:true,staleDecodeCancelled:true,reducedMotion:true,productionDbWrites:0,physicalIPhoneTested:false,errors,failed,external},null,2));
 console.log(`PASS ${engine}: ${matrix.length} backgrounds; ${cats.length} published cat comparisons; smooth time changes; no external API or DB writes`);
}finally{await browser?.close();server?.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
