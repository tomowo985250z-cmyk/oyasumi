const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {webkit,chromium}=require(process.env.OYASUMI_PLAYWRIGHT_PATH||'./output/webkit-tools/core/package'),installPlaces=require('./test-support/cat-places-fixture.cjs');
const engine=process.argv.includes('--edge')?'edge':'webkit',base='http://127.0.0.1:9563/',out=path.join(__dirname,'output/nature-sounds/local-'+engine);fs.mkdirSync(out,{recursive:true});
const source=fs.readFileSync('test-home-post-choices.cjs','utf8'),fixture=(source.slice(source.indexOf('function installFixture()'),source.indexOf('\n(async () =>'))+'\ninstallFixture();').replace(/ const storage = new Map\(\);[\s\S]*?(?= localStorage.setItem\('oyasumi-dark-hint-seen')/,'');
function audioProbe(){
 const p=window.NatureAudioProbe={contexts:[],starts:[],sources:[],requests:[],resumes:[],timers:new Map(),trusted:false};
 const nativeTimeout=window.setTimeout.bind(window),nativeClear=window.clearTimeout.bind(window);
 for(const type of ['click','pointerup','change','input','keydown'])document.addEventListener(type,e=>{if(e.isTrusted){p.trusted=true;nativeTimeout(()=>p.trusted=false,0);}},{capture:true});
 window.setTimeout=(fn,delay,...args)=>{const id=nativeTimeout(fn,delay,...args);if(delay>=45000&&delay<=90000&&new Error().stack.includes('nature-sounds.js'))p.timers.set(id,{fn,delay});return id;};
 window.clearTimeout=id=>{p.timers.delete(id);return nativeClear(id);};
 p.fireChime=()=>{const entry=[...p.timers][0];if(!entry)throw Error('No chime scheduled');window.clearTimeout(entry[0]);entry[1].fn();};
 const nativeFetch=window.fetch.bind(window);
 window.fetch=async(...args)=>{
  const response=await nativeFetch(...args),url=String(args[0]);
  if(url.includes('/assets/nature-sounds-v1/')){
   const name=url.split('/').pop().split('.')[0];p.requests.push(name);const original=response.arrayBuffer.bind(response);
   response.arrayBuffer=async()=>{const data=await original();if(p.delayNext===name){p.delayNext=null;await new Promise(resolve=>p.release=resolve);}data.natureKey=name;return data;};
  }return response;
 };
 const Native=window.AudioContext||window.webkitAudioContext;p.available=!!Native;if(!Native)return;
 function Wrapped(...args){
  const ctx=new Native(...args);p.contexts.push({ctx,trusted:p.trusted});const resume=ctx.resume.bind(ctx),decode=ctx.decodeAudioData.bind(ctx),create=ctx.createBufferSource.bind(ctx),gain=ctx.createGain.bind(ctx);
  ctx.resume=(...args)=>{p.resumes.push(p.trusted);return resume(...args);};
  ctx.decodeAudioData=data=>{const name=data.natureKey;return decode(data).then(buffer=>{buffer.natureKey=name;return buffer;});};
  ctx.createBufferSource=()=>{const s=create(),row={source:s,ended:false},start=s.start.bind(s),connect=s.connect.bind(s);p.sources.push(row);s.addEventListener('ended',()=>row.ended=true);s.start=(...args)=>{row.name=s.buffer.natureKey;p.starts.push({name:row.name,duration:s.buffer.duration});return start(...args);};s.connect=(target,...args)=>{row.gain=target;return connect(target,...args);};return s;};
  ctx.createGain=()=>{const g=gain(),connect=g.connect.bind(g);g.connect=(target,...args)=>{if(target===ctx.destination){p.master=g;p.analyser=ctx.createAnalyser();p.analyser.fftSize=2048;p.analyser.connect(target);return connect(p.analyser,...args);}return connect(target,...args);};return g;};
  return ctx;
 }
 Wrapped.prototype=Native.prototype;window.AudioContext=Wrapped;if(window.webkitAudioContext)window.webkitAudioContext=Wrapped;
}
const server=spawn(process.execPath,['server.js'],{cwd:__dirname,env:{...process.env,PORT:'9563'},windowsHide:true,stdio:'ignore'});let browser;
(async()=>{try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await (engine==='edge'?chromium:webkit).launch(engine==='edge'?{executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});const cases=[];
 for(const width of [320,375]){
  const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  await context.addInitScript({content:fixture});await context.addInitScript(installPlaces);await context.addInitScript(audioProbe);
  const page=await context.newPage(),errors=[],external=[];let releaseEngine,holdEngine=width===320;page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>{if(!r.request().url().startsWith(base)){external.push(r.request().url());return r.abort();}const file=new URL(r.request().url()).pathname;if(file==='/nature-sounds.js'&&holdEngine)return new Promise(resolve=>{releaseEngine=()=>{holdEngine=false;resolve(r.continue());};});if(/\/(vendor\/supabase|supabase-api|update-client)\.js$/.test(file))return r.fulfill({contentType:'text/javascript',body:''});if(file==='/scenery-materials.js')return r.fulfill({path:path.join(__dirname,'scenery-materials.js')});return r.continue();});
  const seed=async()=>{
   await page.waitForFunction(()=>ready&&!busy&&!refreshPromise&&!refreshQueued);
   await page.evaluate(async()=>{const f=HomePostFixture;for(let day=0;day<30;day++){const s=CatPlaces.schedule(Date.parse('2026-10-21T12:00:00+09:00')+day*86400000,f.owner),e=s.events.find(e=>e.place==='engawa');if(e){f.at=e.at+1000;break;}}f.coat='black';NightClock.now=()=>f.at;await refreshShared();go('home');const original=DayRoom.world;window.NatureTestWorld={season:'autumn',weather:'sunny',at:Date.parse('2026-10-21T12:00:00+09:00')};DayRoom.world=()=>({...original(),...NatureTestWorld});});
   await page.waitForFunction(()=>document.querySelector('.home-room-unit .day-room')?.dataset.location==='engawa'&&DayRoom.settled(document.querySelector('.home-room-unit .day-room')));
  };
  const settings=()=>page.evaluate(()=>go('settings')),home=()=>page.evaluate(()=>go('home')),toggle=()=>page.locator('[data-nature-sounds-toggle]');
  const active=()=>page.evaluate(()=>NatureAudioProbe.sources.filter(s=>s.name&&!s.ended).map(s=>s.name).sort());
  const environment=async value=>{await page.evaluate(value=>{Object.assign(NatureTestWorld,value);const s=document.querySelector('.day-room[data-location=engawa]');s.setAttribute('data-world-weather',NatureTestWorld.weather);s.setAttribute('data-world-season',NatureTestWorld.season);},value);await page.waitForTimeout(100);};
  const waitTrack=name=>page.waitForFunction(name=>NatureAudioProbe.sources.some(s=>s.name===name&&!s.ended),name,{timeout:15000});
  const wallTap=async()=>{const s=await page.locator('.home-room-unit .day-room').boundingBox();await page.touchscreen.tap(s.x+s.width*.08,s.y+s.height*.4);};
  await page.goto(base,{waitUntil:'domcontentloaded'});await seed();await page.waitForTimeout(150);
  assert.equal(await page.evaluate(()=>NatureAudioProbe.contexts.length),0);assert.deepEqual(await page.evaluate(()=>NatureAudioProbe.requests),[]);assert(await page.locator('.home-room-unit .room-resident').isVisible());if(releaseEngine){assert.equal(await page.evaluate(()=>typeof NatureSounds),'undefined');releaseEngine();await page.waitForFunction(()=>!!globalThis.NatureSounds);}
  await settings();assert.equal(await toggle().isChecked(),false);assert.equal(await page.locator('[data-nature-sounds-volume]').inputValue(),'25');assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
  await page.screenshot({path:path.join(out,'settings-'+width+'.png')});
  if(!await page.evaluate(()=>NatureAudioProbe.available)){
   assert(await toggle().isDisabled());assert((await page.locator('[data-nature-sounds-status]').innerText()).includes('再生できません'));
   await page.locator('[data-nature-sounds-volume]').focus();await page.keyboard.press('ArrowRight');await page.reload();await seed();await settings();assert.equal(await page.locator('[data-nature-sounds-volume]').inputValue(),'26');assert.deepEqual(await page.evaluate(()=>NatureAudioProbe.requests),[]);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
   cases.push({width,initialOff:true,noInitialAudioRequests:true,unsupportedAudioNotice:true,volumeRestored:true,audioUnavailableInThisBrowserBuild:true});console.log('PASS '+width+'px: UI, OFF default and restored volume; this WebKit build has no Web Audio API');await context.close();continue;
  }
  await toggle().check();await page.waitForFunction(()=>NatureAudioProbe.contexts[0]?.ctx.state==='running');
  assert.deepEqual(await page.evaluate(()=>NatureAudioProbe.requests),[],'No audio files on the settings screen');
  await page.locator('[data-nature-sounds-volume]').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('[data-nature-sounds-volume]').inputValue(),'26');
  await page.evaluate(()=>NatureAudioProbe.delayNext='wind');await home();await page.waitForFunction(()=>!!NatureAudioProbe.release);
  await settings();await toggle().uncheck();await page.evaluate(()=>NatureAudioProbe.release());await page.waitForTimeout(400);
  assert.deepEqual(await page.evaluate(()=>NatureAudioProbe.starts),[],'OFF wins over a pending download');
  await toggle().check();await home();await waitTrack('wind');await page.waitForTimeout(1800);
  const signal=await page.evaluate(()=>{const p=NatureAudioProbe,v=new Float32Array(p.analyser.fftSize);p.analyser.getFloatTimeDomainData(v);return {rms:Math.sqrt(v.reduce((n,x)=>n+x*x,0)/v.length),gain:p.master.gain.value,constructorsTrusted:p.contexts.every(c=>c.trusted),starts:p.starts};});
  assert(signal.rms>1e-7,'Real decoded audio produces output');assert(Math.abs(signal.gain-.13)<.001);assert(signal.constructorsTrusted);assert(signal.starts.every(s=>s.duration>1));
  const starts=await page.evaluate(()=>NatureAudioProbe.starts.length),stage=page.locator('.home-room-unit .day-room');
  await stage.locator('.engawa-shoji-switch').tap({position:{x:12,y:12}});await page.waitForTimeout(2150);await stage.locator('.engawa-shoji-switch').tap({position:{x:12,y:12}});await page.waitForTimeout(2150);
  assert.equal(await page.evaluate(()=>NatureAudioProbe.starts.length),starts,'Shoji does not change audio in phase one');
  await stage.locator('.room-resident').tap();assert.equal(await page.evaluate(()=>view),'catMeal');await home();
  const roomPreferences=await page.evaluate(()=>localStorage.getItem('oyasumi-room-preferences-v1:'+encodeURIComponent(HomePostFixture.owner)));
  await environment({season:'autumn',weather:'sunny',at:Date.parse('2026-10-21T21:00:00+09:00')});await waitTrack('insects');await page.waitForTimeout(1600);assert.deepEqual(await active(),['insects','wind']);
  await environment({season:'summer',weather:'rainy',at:Date.parse('2026-07-15T21:00:00+09:00')});await waitTrack('rain');await page.waitForTimeout(1600);assert.deepEqual(await active(),['rain']);assert.equal(await page.evaluate(()=>NatureAudioProbe.timers.size),0);
  await environment({season:'summer',weather:'sunny',at:Date.parse('2026-07-15T12:00:00+09:00')});await waitTrack('wind');await page.waitForTimeout(1600);assert.deepEqual(await active(),['wind']);
  assert.equal(await page.evaluate(()=>NatureAudioProbe.requests.includes('chime')),false);assert(await page.evaluate(()=>[...NatureAudioProbe.timers.values()].every(t=>t.delay>=45000&&t.delay<=90000)&&NatureAudioProbe.timers.size===1));
  await page.evaluate(()=>NatureAudioProbe.fireChime());await waitTrack('chime');assert(await page.evaluate(()=>NatureAudioProbe.sources.filter(s=>s.name==='chime').every(s=>s.source.loop===false)));
  await environment({season:'winter',weather:'sunny',at:Date.parse('2026-01-15T12:00:00+09:00')});await page.waitForTimeout(1600);assert.equal(await page.evaluate(()=>NatureAudioProbe.timers.size),0);assert.deepEqual(await active(),['wind']);
  await settings();await page.waitForTimeout(1600);assert.deepEqual(await active(),[],'No continuing ambience outside engawa');
  await toggle().uncheck();await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>NatureAudioProbe.contexts[0].ctx.state),'suspended');
  await toggle().check();await home();await waitTrack('wind');
  await page.reload();await seed();await page.waitForTimeout(250);
  assert.equal(await page.evaluate(()=>NatureAudioProbe.contexts.length),0,'Restored ON still needs a fresh user gesture');assert.deepEqual(await page.evaluate(()=>NatureAudioProbe.requests),[]);
  await settings();assert(await toggle().isChecked());assert.equal(await page.locator('[data-nature-sounds-volume]').inputValue(),'26');await home();await wallTap();await waitTrack('wind');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>NatureAudioProbe.contexts[0].ctx.state),'suspended');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>NatureAudioProbe.contexts[0].ctx.state),'suspended');await wallTap();await waitTrack('wind');
  await settings();await toggle().uncheck();await page.waitForTimeout(400);assert.deepEqual(await active(),[]);assert.equal(await page.evaluate(()=>NatureAudioProbe.contexts[0].ctx.state),'suspended');assert.equal(await page.evaluate(()=>localStorage.getItem('oyasumi-room-preferences-v1:'+encodeURIComponent(HomePostFixture.owner))),roomPreferences);
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
  cases.push({width,initialOff:true,noInitialAudioRequests:true,trustedGestureRequired:true,realAudioRms:signal.rms,offStopsPendingAndActiveAudio:true,volumeAndOnRestored:true,weatherAndNightSwitch:true,summerOnlyOccasionalChime:true,hiddenPageSilent:true,shojiAndCatControlsPreserved:true,roomPreferencesUnchanged:true});console.log('PASS '+width+'px: real audio, lazy load, ON/OFF, restore, weather/night/summer rules and unchanged cat/shoji controls');await context.close();
 }
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({pass:true,engine,cases,productionDbWrites:0},null,2));
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
