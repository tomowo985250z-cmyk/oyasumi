const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const {webkit,chromium}=require(process.env.OYASUMI_PLAYWRIGHT_PATH||'./output/webkit-tools/core/package');
const edge=process.argv.includes('--edge'),published=process.argv.includes('--published'),engine=edge?'edge':'webkit',port=edge?9594:9593;
const base=published?'https://tomowo985250z-cmyk.github.io/oyasumi/':`http://127.0.0.1:${port}/`,out=path.join(__dirname,'output/solar-light-release',`${published?'published':'local'}-${engine}`);
const text=fs.readFileSync(path.join(__dirname,'test-home-post-choices.cjs'),'utf8'),fixture=text.slice(text.indexOf('function installFixture()'),text.indexOf('\n(async () =>'))+';installFixture();';
const server=published?null:spawn(process.execPath,['server.js'],{cwd:__dirname,env:{...process.env,PORT:String(port)},stdio:'ignore',windowsHide:true});let browser;
(async()=>{try{
 fs.mkdirSync(out,{recursive:true});for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await(edge?chromium:webkit).launch(edge?{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
 const context=await browser.newContext({viewport:{width:375,height:900},isMobile:true,hasTouch:true,reducedMotion:'no-preference'});
 await context.addInitScript({content:fixture});await context.addInitScript(()=>Object.defineProperty(document,'hidden',{configurable:true,value:false}));
 const page=await context.newPage(),errors=[],failed=[],external=[],samples=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
 await page.route('**/*',r=>{if(!r.request().url().startsWith(base)){external.push(r.request().url());return r.abort();}if(/\/(?:vendor\/supabase|supabase-api|update-client)\.js$/.test(new URL(r.request().url()).pathname))return r.fulfill({contentType:'text/javascript',body:''});return r.continue();});
 await page.goto(base);await page.waitForFunction(()=>ready&&!busy&&!refreshPromise&&!document.documentElement.hasAttribute('data-cat-state-pending'));
 const release=JSON.parse(fs.readFileSync(path.join(__dirname,'release.json'),'utf8')).release;assert.equal(await page.locator('meta[name=oyasumi-release]').getAttribute('content'),release);
 for(const width of [320,375,390,430]){
  await page.setViewportSize({width,height:900});
  await page.evaluate(async()=>{
   go('stats');globalThis.SolarTransition={at:Date.parse('2026-09-26T09:00:00+09:00')};const t=SolarTransition;
   NightClock.now=()=>t.at;DayRoom.world=()=>({...SeasonWeather.at(t.at),at:t.at,weather:'sunny'});
   DayRoom.snapshot=()=>({day:'2026-09-26',location:'room',place:'corner',pose:'groom',away:false});
   document.querySelector('#app').innerHTML=DayRoom.stage('calico',HomePostFixture.owner,{home:true,status:'awake'});
   t.stage=document.querySelector('#app .day-room');await Promise.all([...t.stage.querySelectorAll('img')].map(i=>i.decode()));DayRoom.sync();
  });
  await page.waitForFunction(()=>SolarTransition.stage.querySelector('.solar-cat-shadow'));
  await page.evaluate(()=>{const t=SolarTransition;t.cat=t.stage.querySelector('.room-resident>img');t.background=t.stage.querySelector('.room-background-layer');t.at+=60000;DayRoom.sync();});
  await page.waitForFunction(()=>SolarTransition.stage.querySelector('[data-background-outgoing]'));
  const start=await page.evaluate(()=>{const t=SolarTransition,bg=t.stage.querySelector('[data-background-outgoing]'),shadow=t.stage.querySelector('[data-shadow-outgoing]');return{catUnchanged:t.cat===t.stage.querySelector('.room-resident>img'),backgroundHasNoCat:!bg.querySelector('.room-resident'),duration:bg.getAnimations()[0]?.effect.getTiming().duration,shadowDuration:shadow?.getAnimations()[0]?.effect.getTiming().duration,shadowCount:t.stage.querySelectorAll('.solar-cat-shadow').length};});
  assert(start.catUnchanged&&start.backgroundHasNoCat);assert.equal(start.duration,1600);assert.equal(start.shadowDuration,1600);assert.equal(start.shadowCount,2);
  await page.waitForFunction(()=>RoomBackgrounds.settled(SolarTransition.stage)&&!SolarTransition.stage.querySelector('[data-shadow-outgoing]'));
  const settled=await page.evaluate(()=>{const t=SolarTransition;return{catUnchanged:t.cat===t.stage.querySelector('.room-resident>img'),layers:t.stage.querySelectorAll('.room-background-layer').length,shadows:t.stage.querySelectorAll('.solar-cat-shadow').length,at:Number(t.stage.querySelector('.room-background-layer').dataset.lightAt)};});
  assert(settled.catUnchanged);assert.equal(settled.layers,1);assert.equal(settled.shadows,1);assert.equal(settled.at,Date.parse('2026-09-26T09:01:00+09:00'));
  await page.emulateMedia({reducedMotion:'reduce'});
  const rapid=await page.evaluate(async()=>{const t=SolarTransition;await Promise.all([10,11,12,13].map(hour=>{t.at=Date.parse(`2026-09-26T${hour}:00:00+09:00`);return RoomBackgrounds.update(t.stage,'room',DayRoom.world());}));return{at:Number(t.stage.querySelector('.room-background-layer:not([data-background-outgoing])').dataset.lightAt),outgoing:t.stage.querySelectorAll('[data-background-outgoing],[data-shadow-outgoing]').length,catUnchanged:t.cat===t.stage.querySelector('.room-resident>img')};});
  assert.equal(rapid.at,Date.parse('2026-09-26T13:00:00+09:00'));assert.equal(rapid.outgoing,0);assert(rapid.catUnchanged);
  await page.evaluate(async()=>{const t=SolarTransition;Object.defineProperty(document,'hidden',{configurable:true,value:true});t.at+=60000;await RoomBackgrounds.update(t.stage,'room',DayRoom.world());Object.defineProperty(document,'hidden',{configurable:true,value:false});});
  assert.equal(await page.locator('[data-background-outgoing],[data-shadow-outgoing]').count(),0);
  await page.emulateMedia({reducedMotion:'no-preference'});samples.push({width,start,settled,rapid});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);assert.deepEqual(external,[]);
 fs.writeFileSync(path.join(out,'transitions.json'),JSON.stringify({pass:true,engine,published,release,samples,errors,failed,external,productionDbWrites:0,physicalIPhoneTested:false},null,2));console.log(`PASS solar transitions ${engine}: minute sync, unchanged cat nodes, 1600ms light/shadow fades, cleanup, latest request, reduced motion and hidden document at all four widths`);
}finally{await browser?.close();server?.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
