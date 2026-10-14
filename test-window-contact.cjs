const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawn,execFileSync}=require('node:child_process');
const {webkit,chromium}=require(process.env.OYASUMI_PLAYWRIGHT_PATH||'./output/webkit-tools/core/package');
const edge=process.argv.includes('--edge'),published=process.argv.includes('--published');
const port=edge?9438:9437,base=published?'https://tomowo985250z-cmyk.github.io/oyasumi/':`http://127.0.0.1:${port}/`;
const output=path.join(__dirname,'output/window-contact',`${published?'published':'local'}-${edge?'edge':'webkit'}`);
fs.mkdirSync(output,{recursive:true});
const fixtureSource=fs.readFileSync('test-home-post-choices.cjs','utf8');
const fixture=fixtureSource.slice(fixtureSource.indexOf('function installFixture()'),fixtureSource.indexOf('\n(async () =>'))+'\ninstallFixture();';
// Stable pre-fix baseline: artwork, room composition and other placements.
const previous=execFileSync('git',['show','17a5bff:day-room.js'],{encoding:'utf8',windowsHide:true});
const server=published?null:spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'ignore'});
let browser;
(async()=>{try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await(edge?chromium:webkit).launch(edge?{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
 const cases=[],errors=[],failed=[];
 for(const standalone of [false,true]){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await context.addInitScript({content:fixture});
  await context.addInitScript(standalone=>{
   Object.defineProperty(navigator,'standalone',{value:standalone});
   const interval=setInterval;globalThis.contactIntervals=[];window.setInterval=(...args)=>{const id=interval(...args);contactIntervals.push(id);return id;};
  },standalone);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
  await page.route('**/*',route=>{const u=new URL(route.request().url());if(!u.href.startsWith(base))return route.abort();if(/\/(?:vendor\/supabase|supabase-api|update-client)\.js$/.test(u.pathname))return route.fulfill({contentType:'text/javascript',body:''});return route.continue();});
  await page.goto(base);await page.waitForFunction(()=>typeof ready!=='undefined'&&ready&&!busy&&!refreshPromise);
  assert.equal(await page.locator('meta[name=oyasumi-release]').getAttribute('content'),JSON.parse(fs.readFileSync('release.json','utf8')).release);
  await page.evaluate(previous=>{
   contactIntervals.forEach(clearInterval);NightClock.now=()=>HomePostFixture.at;
   const current=DayRoom;Function(previous)();globalThis.PreviousDayRoom=DayRoom;globalThis.DayRoom=current;
   globalThis.ContactRoom={day:'2026-10-14',active:true,place:'window',pose:'relax',away:false};
   DayRoom.snapshot=PreviousDayRoom.snapshot=()=>({...ContactRoom});
   globalThis.ContactCache=new Map();
   globalThis.setContactCase=({coat,hour,pose,status,place='window'})=>{
    state.coat=coat;HomePostFixture.at=Date.parse(`2026-10-14T${String(hour).padStart(2,'0')}:00:00+09:00`);
    state.posts=[{self:true,time:HomePostFixture.at,status}];state.lastSleep=null;shared.catCare={};ContactRoom.pose=pose;ContactRoom.place=place;
   };
   globalThis.measureContact=async()=>{
    const stage=document.querySelector('.home-room-unit .day-room'),cat=stage.querySelector('.room-resident'),img=cat.querySelector('img');await img.decode();
    let foot=ContactCache.get(img.src);
    if(foot===undefined){
     const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
     const {data}=ctx.getImageData(0,0,canvas.width,canvas.height);let bottom=0;
     // Ignore sparse antialiasing; measure the visible body, not the image box.
     for(let y=0;y<canvas.height;y++){let solid=0;for(let x=0;x<canvas.width;x++)if(data[(y*canvas.width+x)*4+3]>=128)solid++;if(solid>=canvas.width*.03)bottom=y+1;}
     foot=bottom/canvas.height;ContactCache.set(img.src,foot);
    }
    const s=stage.getBoundingClientRect(),c=cat.getBoundingClientRect();
    const before=document.createElement('div');before.innerHTML=PreviousDayRoom.stage(stage.dataset.coat,stage.dataset.roomUser,{status:homeCatStatus(),home:true},true);
    const normalized=stage.cloneNode(true);delete normalized.dataset.roomStamp;normalized.querySelector('.room-resident').removeAttribute('style');
    const expected=before.firstElementChild;
    normalized.querySelectorAll('img').forEach(i=>i.removeAttribute('loading'));
    return {place:stage.dataset.place,frame:img.dataset.assetKey,contactError:c.top+c.height*foot-(s.top+s.height*161/330),
     unchanged:normalized.outerHTML===expected.outerHTML,noOverflow:document.documentElement.scrollWidth<=innerWidth,
     catWidth:c.width,catX:c.left-s.left,roomWidth:s.width,foot,src:img.getAttribute('src'),
     ...(normalized.outerHTML===expected.outerHTML?{}:{actualMarkup:normalized.outerHTML,expectedMarkup:expected.outerHTML})};
   };
  },previous);
  for(const width of [320,375,390,430]){
   await page.setViewportSize({width,height:844});
   const results=await page.evaluate(async()=>{
    const results=[],scenarios=[{hour:7,pose:'relax',status:'awake'},...['relax','play','groom','doze','gaze'].map(pose=>({hour:14,pose,status:'awake'})),{hour:14,pose:'gaze',status:'sleep'},{hour:23,pose:'relax',status:'awake'},{hour:23,pose:'relax',status:'sleep'}];
    for(const {id:coat} of CatFaces.coats)for(const scenario of scenarios){
     setContactCase({coat,...scenario});go('home');let result=await measureContact();results.push({coat,...scenario,method:'render',...result});
     // Also exercise in-place image/time/coat updates.
     ContactRoom.place='cushion';DayRoom.sync();ContactRoom.place='window';DayRoom.sync();
     result=await measureContact();results.push({coat,...scenario,method:'sync',...result});
    }
    for(const place of ['cushion','corner'])for(const {id:coat} of CatFaces.coats){
     setContactCase({coat,hour:23,pose:'relax',status:'sleep',place});go('home');results.push({coat,method:'other-place',...await measureContact()});
    }
    return results;
   });
   for(const r of results){assert(r.unchanged&&r.noOverflow,JSON.stringify(r));if(r.place==='window')assert(Math.abs(r.contactError)<.35,JSON.stringify(r));else{assert(Math.abs(r.catWidth/r.roomWidth-(r.place==='cushion'?.4:.35))<.001);}}
   cases.push(...results.map(r=>({width,standalone,...r})));
   console.log(`PASS ${width}px ${standalone?'standalone':'browser'}: ${results.length} contact and placement cases`);
   await page.evaluate(()=>{setContactCase({coat:'fishing',hour:23,pose:'relax',status:'sleep'});go('home');});
   await page.locator('.room-resident img').evaluate(i=>i.decode());
   await page.screenshot({path:path.join(output,`home-night-${width}-${standalone?'standalone':'browser'}.png`)});
  }
  await page.setViewportSize({width:390,height:844});
  const shots=[];
  for(const coat of await page.evaluate(()=>CatFaces.coats.map(c=>c.id))){
   await page.evaluate(coat=>{setContactCase({coat,hour:23,pose:'relax',status:'sleep'});go('home');},coat);
   await page.locator('.room-resident img').evaluate(i=>i.decode());const file=`${coat}-night.png`;await page.locator('.day-room').screenshot({path:path.join(output,file)});shots.push(file);
  }
  await page.locator('.room-resident').tap();assert.equal(await page.evaluate(()=>view),'catMeal');
  assert.equal(await page.evaluate(()=>HomePostFixture.calls.length),0,'No DB write from viewing or tapping');
  const board=await context.newPage();for(const file of shots)await board.route(`https://preview.invalid/${file}`,r=>r.fulfill({contentType:'image/png',body:fs.readFileSync(path.join(output,file))}));
  await board.setViewportSize({width:1200,height:1100});
  await board.setContent(`<style>body{margin:16px;background:#071329;color:white;font:16px sans-serif}main{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}figure{margin:0}img{width:100%}</style><main>${shots.map(f=>`<figure><img src="https://preview.invalid/${f}"><figcaption>${f.replace('-night.png','')}</figcaption></figure>`).join('')}</main>`);
  await board.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth));await board.screenshot({path:path.join(output,'all-16-night.png'),fullPage:true});
  await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({pass:true,engine:edge?'Edge':'WebKit',actualIPhone:false,productionDbWrites:false,cases,errors,failed},null,2));
 console.log(`PASS ${published?'published':'local'} ${edge?'Edge':'WebKit'}: ${cases.length} cases, 16 coats, 4 widths, 9 time/pose/status scenarios, render/sync, browser/standalone, other placements and tap; no DB writes.`);
}finally{await browser?.close();server?.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
