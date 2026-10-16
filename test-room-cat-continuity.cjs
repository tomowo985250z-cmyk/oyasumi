// Observe the live renderer while an uncached next pose takes time to load.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {webkit,chromium}=require(process.env.OYASUMI_PLAYWRIGHT_PATH||'./output/webkit-tools/core/package');
const edge=process.argv.includes('--edge'),engine=edge?'edge':'webkit',port=edge?9572:9571,base=`http://127.0.0.1:${port}/`,out=path.join(__dirname,'output/indoor-cat-review/continuity-'+engine);
const source=fs.readFileSync('test-home-post-choices.cjs','utf8'),fixture=source.slice(source.indexOf('function installFixture()'),source.indexOf('\n(async () =>'))+';installFixture();';
const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'ignore'});let browser;
(async()=>{try{
 fs.mkdirSync(out,{recursive:true});for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await(edge?chromium:webkit).launch(edge?{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
 const context=await browser.newContext({viewport:{width:375,height:844},isMobile:true,hasTouch:true});await context.addInitScript({content:fixture});
 const page=await context.newPage(),errors=[],cases=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async r=>{const url=new URL(r.request().url());if(!url.href.startsWith(base))return r.abort();if(/\/(vendor\/supabase|supabase-api|update-client)\.js$/.test(url.pathname))return r.fulfill({contentType:'text/javascript',body:''});if(url.searchParams.has('continuity'))await new Promise(resolve=>setTimeout(resolve,700));return r.continue();});
 await page.goto(base);await page.waitForFunction(()=>ready&&!busy&&!document.documentElement.hasAttribute('data-cat-state-pending'));
 await page.evaluate(()=>{
  go('profile');Object.defineProperty(document,'hidden',{configurable:true,value:false});HomePostFixture.at=Date.parse('2026-10-15T14:00:00+09:00');NightClock.now=()=>HomePostFixture.at;
  const snapshot=DayRoom.snapshot,svg=DayCats.svg;globalThis.Continuity={pose:'relax',nonce:0,samples:[],running:false};
  DayRoom.snapshot=user=>({...snapshot(user),pose:Continuity.pose,place:Continuity.pose==='groom'?'corner':'cushion',location:'room',away:false});
  DayCats.svg=(pose,coat)=>svg(pose,coat).replace(/src="([^"]+)"/,(_,src)=>`src="${src}&continuity=${Continuity.nonce}"`);
  const host=document.createElement('div');host.id='continuity';host.style.cssText='position:fixed;left:22px;top:16px;width:calc(100% - 44px);z-index:30';document.body.append(host);
  globalThis.mountContinuity=async()=>{Continuity.pose='relax';host.innerHTML=DayRoom.stage('calico',HomePostFixture.owner,{home:true,status:'awake'});await Promise.all([...host.querySelectorAll('img')].map(i=>i.decode()));};
  globalThis.observeContinuity=()=>{Continuity.samples=[];Continuity.running=true;const tick=()=>{if(!Continuity.running)return;const stage=host.querySelector('.day-room'),cats=[...stage.querySelectorAll('.room-resident')].filter(c=>getComputedStyle(c).display!=='none'&&getComputedStyle(c).visibility!=='hidden'),img=cats[0]?.querySelector('img');Continuity.samples.push({t:performance.now(),cats:cats.length,loaded:!!(img?.complete&&img.naturalWidth),key:img?.dataset.assetKey,place:stage.dataset.place});requestAnimationFrame(tick);};requestAnimationFrame(tick);};
 });
 for(const width of [320,375,390,430]){
  await page.setViewportSize({width,height:844});await page.bringToFront();await page.evaluate(()=>mountContinuity());
  await page.evaluate(async()=>{observeContinuity();await new Promise(requestAnimationFrame);Continuity.nonce++;Continuity.pose='groom';DayRoom.sync();});
  await page.waitForTimeout(180);if(width===375)await page.locator('#continuity').screenshot({path:path.join(out,'loading.png')});
  await page.waitForFunction(()=>{const i=document.querySelector('#continuity .room-resident img');return i?.dataset.assetKey==='calico/day-groom'&&i.complete&&i.naturalWidth>0;});
  const samples=await page.evaluate(async()=>{await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);Continuity.running=false;return Continuity.samples;});
  const bad=samples.filter(s=>s.cats!==1||!s.loaded||s.place!==(s.key?.endsWith('day-groom')?'corner':'cushion'));
  cases.push({width,frames:samples.length,badFrames:bad.length,samples});
  fs.writeFileSync(path.join(out,'observations.json'),JSON.stringify(cases,null,2));
  assert(samples.length>=3);assert.deepEqual(bad,[],`${engine} ${width}px must retain one painted cat and its original contact until the next pose is ready`);
  // An obsolete delayed decode must not replace a more recent pose.
  await page.evaluate(()=>{Continuity.nonce++;Continuity.pose='play';DayRoom.sync();Continuity.pose='relax';DayRoom.sync();});
  await page.waitForTimeout(1000);assert.equal(await page.locator('#continuity .room-resident img').getAttribute('data-asset-key'),'calico/day-relax');
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({pass:true,engine,cases,staleDecodeCancelled:true,physicalIPhoneTested:false,productionDbWrites:0},null,2));console.log(`PASS ${engine}: all four widths retain one painted cat during cold pose loading and reject obsolete poses`);
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
