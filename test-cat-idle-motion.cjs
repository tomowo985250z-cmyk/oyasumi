const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const {webkit,chromium}=require(process.env.OYASUMI_PLAYWRIGHT_PATH||'./output/webkit-tools/core/package'),places=require('./test-support/cat-places-fixture.cjs');
const edge=process.argv.includes('--edge'),published=process.argv.includes('--published'),engine=edge?'edge':'webkit',port=edge?9612:9611,base=published?'https://tomowo985250z-cmyk.github.io/oyasumi/':`http://127.0.0.1:${port}/`,out=path.join(__dirname,'output/cat-idle-motion',`${published?'published':'local'}-${engine}`);
const source=fs.readFileSync(path.join(__dirname,'test-home-post-choices.cjs'),'utf8'),fixture=source.slice(source.indexOf('function installFixture()'),source.indexOf('\n(async () =>'))+';installFixture();';
const server=published?null:spawn(process.execPath,['server.js'],{cwd:__dirname,env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'ignore'});let browser;
(async()=>{try{
 fs.mkdirSync(out,{recursive:true});for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await(edge?chromium:webkit).launch(edge?{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
 const context=await browser.newContext({viewport:{width:375,height:900},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'reduce'});await context.addInitScript({content:fixture});await context.addInitScript(places);
 await context.clock.install();const page=await context.newPage(),errors=[],failed=[],external=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
 await page.route('**/*',r=>{if(!r.request().url().startsWith(base)){external.push(r.request().url());return r.abort();}if(/\/(?:vendor\/supabase|supabase-api|update-client)\.js$/.test(new URL(r.request().url()).pathname))return r.fulfill({contentType:'text/javascript',body:''});return r.continue();});
 await page.goto(base);await page.waitForFunction(()=>ready&&!busy&&!refreshPromise&&!document.documentElement.hasAttribute('data-cat-state-pending'));
 const release=JSON.parse(fs.readFileSync(path.join(__dirname,'release.json'),'utf8')).release;assert.equal(await page.locator('meta[name=oyasumi-release]').getAttribute('content'),release);
 await page.evaluate(async()=>{
  NightClock.now=()=>HomePostFixture.at;go('stats');const w={...SeasonWeather.at(HomePostFixture.at),at:HomePostFixture.at,daylight:true,weather:'sunny'};
  DayRoom.world=()=>w;DayRoom.snapshot=()=>({day:w.day,location:'room',place:'corner',pose:'groom',away:false});
  const host=document.createElement('div');host.id='motion-check';host.style.cssText='position:fixed;left:22px;top:100px;width:calc(100% - 44px);z-index:40';document.body.append(host);host.innerHTML=DayRoom.stage('calico',HomePostFixture.owner,{home:true,status:'awake'},true);
  await Promise.all([...host.querySelectorAll('img')].map(i=>i.decode()));globalThis.MotionCheck={stage:host.firstElementChild};CatIdleMotion.sync();
 });
 await context.clock.runFor(6000);await page.waitForFunction(()=>MotionCheck.stage.dataset.solarLight&&RoomBackgrounds.settled(MotionCheck.stage)&&DayRoom.settled(MotionCheck.stage)&&!MotionCheck.stage.querySelector('[data-shadow-outgoing],[data-background-outgoing]'));
 await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>{Object.assign(MotionCheck,{img:MotionCheck.stage.querySelector('.room-resident>img'),initial:MotionCheck.stage.querySelector('.room-resident').outerHTML});CatIdleMotion.sync();});
 const selectedWidth=Number(process.argv.find(a=>a.startsWith('--width='))?.split('=')[1]);
 if(process.argv.includes('--matrix-only')||process.argv.includes('--guards-only')){
  await context.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
  let result;
  if(process.argv.includes('--matrix-only'))result={matrix:await require('./test-support/cat-idle-motion-matrix.cjs')(page,context.clock,out)};
  else{await page.evaluate(()=>document.querySelector('#motion-check').remove());result={lifecycle:await require('./test-support/cat-idle-motion-lifecycle.cjs')(page,context.clock)};}
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);assert.deepEqual(external,[]);fs.writeFileSync(path.join(out,selectedWidth?`matrix-${selectedWidth}.json`:'lifecycle.json'),JSON.stringify({pass:true,release,engine,...result,errors,failed,external},null,2));console.log('PASS split quiet motion '+engine+' '+(selectedWidth||'lifecycle'));return;
 }
 if(process.argv.includes('--lifecycle-only')){
  const previous=JSON.parse(fs.readFileSync(path.join(out,'report.json'),'utf8'));assert(previous.pass&&previous.release===release&&previous.matrix.length===192);
  await page.evaluate(()=>document.querySelector('#motion-check').remove());const lifecycle=await require('./test-support/cat-idle-motion-lifecycle.cjs')(page,context.clock);
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);assert.deepEqual(external,[]);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({...previous,lifecycle},null,2));console.log('PASS lifecycle '+engine+'; retained completed pixel matrix');return;
 }
 const stage=page.locator('#motion-check .day-room');await stage.screenshot({path:path.join(out,'waiting.png')});
 let waited=0;for(;waited<77000;waited+=1000){if(await stage.getAttribute('data-idle-gesture'))break;await context.clock.runFor(1000);}
 assert(waited>=35000&&waited<=76000,'First motion waits calmly: '+waited);assert.equal(await stage.getAttribute('data-idle-gesture'),'groom-lick');
 await context.clock.pauseAt(await page.evaluate(()=>Date.now()+1000));
 await page.evaluate(()=>{for(const a of MotionCheck.stage.getAnimations({subtree:true}))a.finish();MotionCheck.stage.querySelector('.cat-idle-detail').style.visibility='hidden';});const before=await stage.screenshot({path:path.join(out,'before.png')});await page.evaluate(()=>{MotionCheck.stage.querySelector('.cat-idle-detail').style.visibility='';MotionCheck.stage.querySelector('.cat-idle-detail>g').setAttribute('opacity',0);});const zero=await stage.screenshot({path:path.join(out,'zero.png')});
 await context.clock.runFor(1600);const peak=await stage.screenshot({path:path.join(out,'peak.png')});
 const compare=async(bufferA,bufferB)=>page.evaluate(async([a,b])=>{
  const load=async data=>{const i=new Image();i.src='data:image/png;base64,'+data;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(i,0,0);return{data:ctx.getImageData(0,0,c.width,c.height).data,width:c.width,height:c.height};};
  const x=await load(a),y=await load(b),stage=MotionCheck.stage.getBoundingClientRect(),r=MotionCheck.stage.querySelector('.room-resident>img').getBoundingClientRect(),box={left:r.left-stage.left,top:r.top-stage.top,width:r.width,height:r.height};let changed=0,outside=0,feet=0,largest=0;
  for(let py=0;py<x.height;py++)for(let px=0;px<x.width;px++){const i=(py*x.width+px)*4,d=Math.max(...[0,1,2,3].map(n=>Math.abs(x.data[i+n]-y.data[i+n])));if(d>2){changed++;largest=Math.max(largest,d);if(px<box.left+box.width*.52||px>box.left+box.width*.9||py<box.top+box.height*.32||py>box.top+box.height*.70)outside++;if(py>=box.top+box.height*.80)feet++;}}
  return{changed,outside,feet,largest,box};
 },[bufferA.toString('base64'),bufferB.toString('base64')]);
 const neutral=await compare(before,zero),moving=await compare(before,peak);console.log({engine,waited,neutral,moving});assert.equal(neutral.changed,0,'Neutral filter must paint identically');assert(moving.changed>0,'The grooming detail must actually move');assert.equal(moving.outside,0,'No paint changes outside the mouth/paw region');assert.equal(moving.feet,0,'Foot contact pixels stay unchanged');
 await context.clock.runFor(6000);assert.equal(await stage.getAttribute('data-idle-gesture'),null);const after=await stage.screenshot({path:path.join(out,'after.png')});assert.equal((await compare(before,after)).changed,0);
 assert(await page.evaluate(()=>MotionCheck.img===MotionCheck.stage.querySelector('.room-resident>img')&&MotionCheck.initial===MotionCheck.stage.querySelector('.room-resident').outerHTML));
 const matrix=await require('./test-support/cat-idle-motion-matrix.cjs')(page,context.clock,out);
 const lifecycle=await require('./test-support/cat-idle-motion-lifecycle.cjs')(page,context.clock);
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);assert.deepEqual(external,[]);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({pass:true,engine,published,release,waited,neutral,moving,matrix,lifecycle,errors,failed,external,productionDbWrites:0,physicalIPhoneTested:false},null,2));console.log('PASS quiet grooming '+engine);
}finally{await browser?.close();server?.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});

