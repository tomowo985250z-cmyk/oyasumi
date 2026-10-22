// Exercise the real home render, image cache and stale snapshot guards without Auth/DB traffic.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {webkit,chromium}=require(process.env.OYASUMI_PLAYWRIGHT_PATH||'./output/webkit-tools/core/package');
const root=__dirname,out=process.env.OYASUMI_ROOF_REVIEW||path.join(root,'output/roof-startup'),baseline=process.argv.includes('--baseline'),edge=process.argv.includes('--edge');fs.mkdirSync(out,{recursive:true});
const fixtureSource=fs.readFileSync(path.join(root,'test-home-post-choices.cjs'),'utf8');
const fixture=fixtureSource.slice(fixtureSource.indexOf('function installFixture()'),fixtureSource.indexOf('\n(async () =>'))+'\ninstallFixture();';
function probe(){
 const f=HomePostFixture,p=globalThis.RoofStartupProbe={at:Date.parse('2026-10-22T23:00:00+09:00'),hidden:false,hold:true,reads:[],layoutHeld:false,mounts:[],violations:[],frames:0,ownAt:null,homeAt:null,started:performance.now()};
 Object.defineProperty(document,'hidden',{get:()=>p.hidden,configurable:true});Date.now=()=>Date.parse('2026-10-21T23:00:00+09:00');
 const snapshot=OyasumiAPI.snapshot;
 OyasumiAPI.snapshot=async(_limit,callbacks={})=>{
  f.at=p.at;f.rows=[f.row('awake')];const result=await snapshot(),at=p.at,clock={serverNow:at,monotonicAt:performance.now(),nightDate:SleepFlow.night(at),resetAt:Date.parse(SleepFlow.night(at)+'T06:00:00+09:00')+86400000};
  const care={allowanceVersion:2,sleepStateVersion:1,catState:'awake',mealSleeping:false,day:SleepFlow.night(at),mealSlot:CatCare.slot(at),mealEligible:true,mealDone:false,treatGiven:false,treatCount:0,treatRecipients:[],receivedToday:0,receivedTotal:0,receivedDays:[]};
  const row={at,release:null};p.reads.push(row);
  callbacks.onOwnCat?.({userId:result.userId,coat:result.coat,expression:result.expression,name:result.name,clock,catCare:care});
  if(p.hold)await new Promise(resolve=>row.release=resolve);
  // An old progress callback and completion can both arrive after invalidation.
  callbacks.onOwnCat?.({userId:result.userId,coat:result.coat,expression:result.expression,name:result.name,clock,catCare:care});
  row.done=true;return {...result,clock,catCare:care,catStateResolved:true};
 };
 p.release=()=>{p.hold=false;for(const read of p.reads)read.release?.();};
 const rect=Element.prototype.getBoundingClientRect;
 Element.prototype.getBoundingClientRect=function(){const r=rect.call(this);return p.layoutHeld&&this.matches('.awake-scene')?new DOMRect(r.x,r.y,0,r.height):r;};
 p.expected=()=>{
  const g=document.querySelector('.roof-cat-group');if(!g)return null;const card=g.closest('.roof-sky-card'),scene=g.closest('.awake-scene'),scale=rect.call(scene).width/208,at=NightClock.now(),n=SolarModel.nightSpan(at),night=new Date(n.start+9*3600000).toISOString().slice(0,10),width=card.clientWidth/scale;
  return {at,night,width,plan:RoofRecline.plan([],RoofRecline.capacity(width,night),night,width)};
 };
 p.inspect=kind=>{
  const g=document.querySelector('.roof-cat-group');if(!g)return;
  const pending=document.documentElement.hasAttribute('data-cat-state-pending'),visible=getComputedStyle(g).visibility==='visible',expected=p.expected();
  const actual=[...g.children].map(c=>({coat:c.dataset.catCoat,rank:Number(c.dataset.roofRank),x:parseFloat(c.style.getPropertyValue('--roof-cat-x')),y:parseFloat(c.style.getPropertyValue('--roof-cat-y')),width:parseFloat(c.style.getPropertyValue('--roof-cat-width')),pose:c.dataset.catPose,loaded:!!c.naturalWidth,opacity:Number(getComputedStyle(c).opacity)}));
  const wrong=actual.length!==expected.plan.length||actual.some((c,i)=>{const e=expected.plan[i];return !e||c.coat!==e.coat||c.rank!==e.rank||Math.abs(c.x-e.left)>.001||Math.abs(c.y-e.top)>.001||Math.abs(c.width-e.width)>.001;});
  if(kind==='mount')p.mounts.push({pending,visible,wrong,count:actual.length,expected:expected.plan.length,loaded:actual.some(c=>c.loaded)});
  if(kind==='frame'&&visible&&!pending&&wrong&&actual.some(c=>c.loaded&&c.opacity>.001)&&p.violations.length<30)p.violations.push({kind,at:performance.now(),actual,expected:expected.plan.map(c=>({coat:c.coat,rank:c.rank,x:c.left}))});
 };
 const replace=Element.prototype.replaceChildren;
 Element.prototype.replaceChildren=function(...nodes){const r=replace.apply(this,nodes);if(this.id==='app'&&this.querySelector('.home-heading')){p.homeAt??=performance.now();p.inspect('mount');}return r;};
 function frame(){p.frames++;p.inspect('frame');const own=document.querySelector('.own-cat-room .room-resident img');if(own?.naturalWidth&&getComputedStyle(own).visibility==='visible')p.ownAt??=performance.now();requestAnimationFrame(frame);}requestAnimationFrame(frame);
}
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'};
const server=http.createServer((req,res)=>{const name=decodeURIComponent(new URL(req.url,'http://local').pathname).slice(1)||'index.html',file=path.resolve(root,name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');if(/\.(png|svg)$/.test(file))res.setHeader('Cache-Control','public,max-age=600');if(['vendor/supabase.js','supabase-config.js','supabase-api.js','update-client.js'].includes(name))return res.end('');const send=()=>res.end(fs.readFileSync(file));if(name.endsWith('.png'))setTimeout(send,80);else send();});
let browser;const report={pass:false,baseline,engine:edge?'Edge':'WebKit',cases:[],errors:[],external:[],productionDbRequests:0,physicalIPhone:false};
(async()=>{try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}/`;
 browser=await(edge?chromium:webkit).launch(edge?{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
 for(const width of [320,375]){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:true,hasTouch:true,deviceScaleFactor:2,timezoneId:'Asia/Tokyo',reducedMotion:'reduce'});await context.addInitScript({content:fixture});await context.addInitScript(probe);
  const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>report.errors.push(e.message));await page.route('**/*',route=>{if(route.request().url().startsWith(base))return route.continue();report.external.push(route.request().url());return route.abort();});
  const completed=()=>page.waitForFunction(()=>ready&&!refreshPromise&&!catStatePending&&document.querySelector('.roof-cat-group')?.children.length===RoofStartupProbe.expected()?.plan.length);
  const record=async label=>{
   const row=await page.evaluate(label=>{const p=RoofStartupProbe,g=document.querySelector('.roof-cat-group');return {label,ready,pending:catStatePending,count:g?.children.length||0,groupHidden:g?getComputedStyle(g).visibility!=='visible':true,homeMs:p.homeAt-p.started,ownMs:p.ownAt-p.started,ownBeforeFull:!!p.ownAt&&p.reads.some(r=>!r.done),frames:p.frames,mounts:p.mounts,violations:p.violations,night:p.expected()?.night,plan:p.expected()?.plan,actual:[...g?.children||[]].map(c=>({coat:c.dataset.catCoat,rank:Number(c.dataset.roofRank),x:parseFloat(c.style.getPropertyValue('--roof-cat-x')),y:parseFloat(c.style.getPropertyValue('--roof-cat-y')),width:parseFloat(c.style.getPropertyValue('--roof-cat-width')),opacity:Number(c.style.opacity)})),calls:HomePostFixture.calls.length,overflow:document.documentElement.scrollWidth>innerWidth};},label);
   row.width=width;assert(!row.overflow);assert.equal(row.calls,0);if(!baseline)assert.deepEqual(row.violations,[]);report.cases.push(row);return row;
  };
  for(const cold of [true,false]){
   if(cold)await page.goto(base,{waitUntil:'domcontentloaded'});else await page.reload({waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>RoofStartupProbe.ownAt!==null&&RoofStartupProbe.reads.some(r=>r.release));const pending=await record(cold?'first-pending':'reload-pending');assert(pending.ownBeforeFull&&!pending.ready,'Own home renders before the held snapshot');if(!baseline)assert.equal(pending.count,0);
   await page.evaluate(()=>RoofStartupProbe.release());await completed();await page.waitForTimeout(150);await record(cold?'first-ready':'reload-ready');
  }
  // Hold measured layout while entering home, then allow the ordinary sky tick.
  await page.evaluate(()=>{RoofStartupProbe.layoutHeld=true;go('settings');go('home');});await page.locator('.roof-sky-card').scrollIntoViewIfNeeded();await page.waitForTimeout(180);const entering=await record('switch-before-layout');if(!baseline)assert.equal(entering.count,0);
  await page.locator('.roof-sky-card').screenshot({path:path.join(out,`${baseline?'before':'after'}-${report.engine}-${width}-layout-pending.png`)});
  await page.evaluate(()=>{RoofStartupProbe.layoutHeld=false;syncRoofMoon();});await completed();await page.waitForTimeout(150);await record('switch-ready');
  // A refresh from the previous visible page finishes after hidden/BFCache invalidation.
  await page.evaluate(()=>{const p=RoofStartupProbe;p.hold=true;p.oldGroup=document.querySelector('.roof-cat-group');void refreshShared();});await page.waitForFunction(()=>RoofStartupProbe.reads.at(-1).release);
  await page.evaluate(()=>{const p=RoofStartupProbe;p.hidden=true;document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));p.at+=86400000;p.hidden=false;document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
  await page.waitForTimeout(80);const revisit=await record('revisit-pending');assert(revisit.pending);if(!baseline)assert.equal(revisit.count,0);
  await page.evaluate(()=>{const p=RoofStartupProbe;for(const r of p.reads)if(r.at<p.at)r.release?.();});await page.waitForFunction(()=>RoofStartupProbe.reads.some(r=>r.at===RoofStartupProbe.at&&r.release));await page.waitForTimeout(80);const stale=await record('stale-read-rejected');assert(stale.pending,'The previous read cannot resolve the current page');if(!baseline)assert.equal(stale.count,0);
  await page.evaluate(()=>RoofStartupProbe.release());await completed();await page.waitForTimeout(150);await record('revisit-ready');
  await page.evaluate(()=>{const p=RoofStartupProbe;go('settings');go('home');const before=document.querySelector('.roof-cat-group').innerHTML;RoofRecline.update(p.oldGroup,p.at-86400000);if(document.querySelector('.roof-cat-group').innerHTML!==before)throw Error('Detached render overwrote current roof');});await completed();await record('late-detached-update');
  for(const phase of ['arrival','midnight','departure']){
   await page.evaluate(async phase=>{const p=RoofStartupProbe,n=SolarModel.nightSpan(p.at);p.at=phase==='arrival'?n.start+5*60000:phase==='midnight'?(n.dusk+n.dawn)/2:n.dawn-5*60000;await refreshShared();},phase);await completed();await page.waitForTimeout(100);await record(phase);
  }
  await page.locator('.roof-sky-card').screenshot({path:path.join(out,`${baseline?'before':'after'}-${report.engine}-${width}-ready.png`)});
  const final=await page.evaluate(()=>({mounts:RoofStartupProbe.mounts,violations:RoofStartupProbe.violations}));
  if(baseline)assert(final.mounts.some(m=>m.visible&&m.wrong&&m.count>0),'Baseline must reproduce the provisional visible commit');else {assert.deepEqual(final.violations,[]);assert(!final.mounts.some(m=>m.visible&&m.wrong&&m.count>0));}
  await context.close();console.log(`PASS ${report.engine} ${width}px ${baseline?'baseline reproduced':'cold/reload/switch/revisit/stale async/solar phases'}`);
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.external,[]);report.pass=true;
}finally{await browser?.close();server.close();fs.writeFileSync(path.join(out,`${baseline?'baseline':'result'}-${report.engine}.json`),JSON.stringify(report,null,2));}})().catch(e=>{console.error(e);process.exitCode=1;});
