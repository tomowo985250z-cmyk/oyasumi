// Inspect painted frames, not merely the existence of CSS animations.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn,execFileSync}=require('node:child_process');
const {webkit,chromium}=require('./output/webkit-tools/core/package'),installPlaces=require('./test-support/cat-places-fixture.cjs');
const edge=process.argv.includes('--edge'),baseline=process.argv.includes('--baseline'),engine=edge?'edge':'webkit',port=edge?9512:9511,base=`http://127.0.0.1:${port}/`;
const reduced=process.argv.includes('--reduced'),out=path.join(__dirname,'output/cat-meal-rendering',(baseline?'baseline-':'')+engine+(reduced?'-reduced':''));fs.mkdirSync(out,{recursive:true});
const source=fs.readFileSync('test-home-post-choices.cjs','utf8'),fixture=source.slice(source.indexOf('function installFixture()'),source.indexOf('\n(async () =>'))+'\ninstallFixture();';
const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'ignore'});let browser;
(async()=>{try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await(edge?chromium:webkit).launch(edge?{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
 // Keep full-playback sampling affordable for the Windows software renderer.
 // test-cat-meal-motion.cjs separately checks moving, painted head pixels at 3x.
 const ctx=await browser.newContext({viewport:{width:390,height:900},deviceScaleFactor:baseline?3:1,isMobile:true,hasTouch:true,reducedMotion:reduced?'reduce':'no-preference'});
 await ctx.addInitScript(()=>{Object.defineProperty(navigator,'standalone',{value:true});const original=matchMedia.bind(window);window.matchMedia=q=>q==='(display-mode: standalone)'?{matches:true,media:q,addEventListener(){},removeEventListener(){}}:original(q);});
 await ctx.addInitScript({content:fixture});await ctx.addInitScript(installPlaces);
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>{if(!r.request().url().startsWith(base))return r.abort();const file=new URL(r.request().url()).pathname.slice(1);if(baseline&&['cat-care.js','day-room.js','day-room.css','style.css'].includes(file))return r.fulfill({contentType:file.endsWith('.css')?'text/css':'text/javascript',body:execFileSync('git',['show','c0f9f87:'+file],{encoding:'utf8'})});if(/\/(vendor\/supabase|supabase-api|update-client)\.js$/.test('/'+file))return r.fulfill({contentType:'text/javascript',body:''});return r.continue();});
 await page.goto(base);await page.waitForFunction(()=>typeof ready!=='undefined'&&ready&&!busy&&!refreshPromise);
 await page.evaluate(()=>{NightClock.now=()=>HomePostFixture.at;go('catMeal');});
 const samples=[];
 await page.evaluate(()=>{globalThis.RenderProbe=[];const visible=el=>{if(!el)return 0;const own=getComputedStyle(el);if(own.visibility!=='visible')return 0;let opacity=1;for(let n=el;n&&n.nodeType===1;n=n.parentElement){const s=getComputedStyle(n);if(s.display==='none')return 0;opacity*=Number(s.opacity);}return opacity;};globalThis.probeLayers=()=>{const s=document.querySelector('.room-care-animation');return {resident:visible(document.querySelector('.room-resident img')),idle:visible(s?.querySelector('.care-idle')),munch:visible(s?.querySelector('.care-head img')),joy:visible(s?.querySelector('.care-joy-cat')),head:s?.querySelector('.care-head').getBoundingClientRect().y,stage:s?.dataset.careStage,feeding:document.querySelector('.profile-room-unit')?.dataset.feeding};};});
 if(!baseline)await page.evaluate(()=>document.addEventListener('careplaybackstart',()=>{
  // Start inside the playback event, before browser protocol/screenshot work
  // can consume any of the three-second chewing phase.
  globalThis.FrameSamples=[];const until=performance.now()+6800;
  globalThis.FrameCaptureDone=new Promise(resolve=>{
   const tick=()=>{FrameSamples.push({time:performance.now(),...probeLayers()});if(performance.now()<until)requestAnimationFrame(tick);else resolve();};requestAnimationFrame(tick);
  });
 },{once:true}));
 await page.locator('[data-cat-meal]').click();await page.waitForSelector('.care-playing,.care-reduced');
 if(baseline){
  // Pause the visual timeline to expose transition overlap before the six-second timer finishes.
  for(const ms of [500,950,1000,1050,1500,3950,4000,4050]){
   await page.evaluate(ms=>{const s=document.querySelector('.care-playing,.care-reduced');for(const a of s.getAnimations({subtree:true})){a.pause();a.currentTime=ms;}if(s.classList.contains('care-reduced'))s.dataset.careStage=ms<1000?'plate':ms<4000?'munch':'joy';},ms);
   const row=await page.evaluate(()=>probeLayers());samples.push({ms,...row});
   if([1000,4000].includes(ms)){const clip=await page.locator('.day-room').boundingBox();await page.screenshot({path:path.join(out,ms+'.png'),clip});}
  }
  await page.evaluate(()=>{const unit=document.querySelector('.profile-room-unit');unit.classList.add('room-care-returning');for(const a of unit.getAnimations({subtree:true})){a.pause();a.currentTime=a.animationName?.startsWith('room-meal')?100:5900;}});
  samples.push({ms:5900,...await page.evaluate(()=>probeLayers())});const clip=await page.locator('.day-room').boundingBox();await page.screenshot({path:path.join(out,'5900.png'),clip});
  await page.evaluate(()=>{document.documentElement.setAttribute('data-cat-state-pending','');document.documentElement.setAttribute('data-cat-own-ready','');});samples.push({pendingOwnReady:true,...await page.evaluate(()=>probeLayers())});
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({baseline:true,engine,samples,errors},null,2));console.log(JSON.stringify(samples));
 }else{
  // WebKit screenshot readback can block painting for over a second on
  // Windows. Measure uninterrupted rAF first, then capture a separate visual
  // replay without another save request. Both passes keep the real clock.
  const frames=await page.evaluate(async()=>{await FrameCaptureDone;return FrameSamples;});
  await page.waitForFunction(()=>DayRoom.playing===0);
  await page.evaluate(()=>{void CatCare.play(document.querySelector('.room-care-proxy'));});
  await page.waitForSelector('.care-playing,.care-reduced');
  const started=Date.now();let i=0;
  while(Date.now()-started<6800){
   const row=await page.evaluate(()=>probeLayers());samples.push({time:Date.now()-started,...row});
   const clip=await page.locator('.day-room').boundingBox();await page.screenshot({path:path.join(out,'frame-'+String(i++).padStart(3,'0')+'.png'),clip});
   await page.waitForTimeout(70);
  }
  const chew=frames.filter(s=>s.stage==='munch');
  // Persist failed measurements too, so an old passing report cannot hide a
  // failed run and frame starvation can be distinguished from frozen motion.
  fs.writeFileSync(path.join(out,'continuous.json'),JSON.stringify({pass:false,engine,reduced,samples,frames,errors,physicalIPhoneTested:false},null,2));
  assert(samples.every(s=>[s.resident,s.idle,s.munch,s.joy].filter(v=>v>.01).length<=1),JSON.stringify(samples.filter(s=>[s.resident,s.idle,s.munch,s.joy].filter(v=>v>.01).length>1)));
  assert(frames.every(s=>[s.resident,s.idle,s.munch,s.joy].filter(v=>v>.01).length===1),'Every painted frame must contain exactly one cat');
  assert(chew.length>10,`Expected >10 chewing frames, got ${chew.length} of ${frames.length}; see ${path.join(out,'continuous.json')}`);const travel=Math.max(...chew.map(s=>s.head))-Math.min(...chew.map(s=>s.head));assert(travel>1);
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'continuous.json'),JSON.stringify({pass:true,engine,reduced,samples,frames,headTravel:travel,errors,physicalIPhoneTested:false},null,2));
  const board=await ctx.newPage();await board.setViewportSize({width:Math.max(720,samples.length*230),height:380});
  await board.setContent(`<meta charset="utf-8"><style>body{margin:20px;background:#101f32;color:#f8f4e8;font:14px sans-serif}h1{font-size:20px}main{display:flex;gap:12px}figure{margin:0;width:218px}img{width:100%;display:block}figcaption{margin-top:8px}</style><h1>${engine} / ${reduced?'視差効果を減らす：オン':'通常設定'} / ホーム画面起動を再現</h1><p>実時間の連続撮影。各ラベルは撮影開始時刻。</p><main>${samples.map((s,index)=>`<figure><img src="data:image/png;base64,${fs.readFileSync(path.join(out,'frame-'+String(index).padStart(3,'0')+'.png')).toString('base64')}"><figcaption>${s.time}ms / ${s.stage||'通常猫へ復帰'}</figcaption></figure>`).join('')}</main>`);
  await board.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth));await board.screenshot({path:path.join(out,'filmstrip.png'),fullPage:true});
  console.log(`PASS ${engine} continuous screenshots=${samples.length}, rendered frame samples=${frames.length}, head travel=${travel}`);
 }
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
