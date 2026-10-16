const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const {webkit,chromium}=require(process.env.OYASUMI_PLAYWRIGHT_PATH||'./output/webkit-tools/core/package'),places=require('./test-support/cat-places-fixture.cjs');
const edge=process.argv.includes('--edge'),published=process.argv.includes('--published'),engine=edge?'edge':'webkit',port=edge?9602:9601,base=published?'https://tomowo985250z-cmyk.github.io/oyasumi/':`http://127.0.0.1:${port}/`,out=path.join(__dirname,'output/first-use-guide',`${published?'published':'local'}-${engine}`);
const source=fs.readFileSync(path.join(__dirname,'test-home-post-choices.cjs'),'utf8'),fixture=source.slice(source.indexOf('function installFixture()'),source.indexOf('\n(async () =>'))+';installFixture();';
const server=published?null:spawn(process.execPath,['server.js'],{cwd:__dirname,env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'ignore'});let browser;
(async()=>{try{
 fs.mkdirSync(out,{recursive:true});for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await(edge?chromium:webkit).launch(edge?{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
 const report={pass:false,engine,published,release:JSON.parse(fs.readFileSync(path.join(__dirname,'release.json'),'utf8')).release,layouts:[],storage:[],errors:[],failed:[],external:[],productionDbWrites:0,physicalIPhoneTested:false};
 async function open(width,options={}){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:true,hasTouch:true,colorScheme:'dark',reducedMotion:'reduce',timezoneId:'Asia/Tokyo'});
  await context.addInitScript({content:'const guideNativeStorage=window.localStorage;'+fixture+'Object.defineProperty(window,"localStorage",{value:guideNativeStorage,configurable:true});'});
  await context.addInitScript(options=>{
   if(options.key)localStorage.setItem(options.key,options.value||'{}');
   if(options.blocked)Object.defineProperty(window,'localStorage',{get(){throw Error('Storage blocked');},configurable:true});
   if(options.readOnly){const storage=localStorage;Object.defineProperty(window,'localStorage',{value:{getItem:key=>storage.getItem(key),setItem(){throw Error('Storage full');}},configurable:true});}
  },options);await context.addInitScript(places);
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.failed.push(r.url());});
  await page.route('**/*',r=>{if(!r.request().url().startsWith(base)){report.external.push(r.request().url());return r.abort();}if(/\/(?:vendor\/supabase|supabase-api|update-client)\.js$/.test(new URL(r.request().url()).pathname))return r.fulfill({contentType:'text/javascript',body:''});return r.continue();});
  await page.goto(base);await page.waitForFunction(()=>ready&&!busy&&!refreshPromise&&!document.documentElement.hasAttribute('data-cat-state-pending'));
  assert.equal(await page.locator('meta[name=oyasumi-release]').getAttribute('content'),report.release);await page.evaluate(()=>{NightClock.now=()=>HomePostFixture.at;go('home');});
  await page.waitForFunction(()=>[...document.querySelectorAll('.day-room')].every(s=>DayRoom.settled(s)&&RoomBackgrounds.settled(s)&&[...s.querySelectorAll('img')].every(i=>i.complete&&i.naturalWidth)));
  return{context,page};
 }
 for(const width of [320,375,390,430]){
  const {context,page}=await open(width);
  assert.equal(await page.locator('.first-guide-invitation').count(),1);assert.equal(await page.locator('.first-guide-open,dialog[open]').count(),0);
  assert(await page.evaluate(()=>!document.activeElement.closest('[data-first-guide-slot]')&&scrollY===0));
  await page.screenshot({path:path.join(out,`home-entry-${width}.png`)});
  if(process.argv.includes('--preview')){await context.close();console.log('Saved initial home invitation preview');return;}
  await page.evaluate(()=>{globalThis.guideBefore={cat:document.querySelector('.home-room-unit .room-resident>img'),posts:JSON.stringify(state.posts),calls:HomePostFixture.calls.length,scroll:scrollY,storage:JSON.stringify(Object.entries(localStorage).filter(([key])=>key!=='oyasumi-first-guide-v1').sort())};});
  await page.locator('[data-first-guide-slot=home] [data-guide-action=open]').click();
  assert(await page.evaluate(()=>guideBefore.cat===document.querySelector('.home-room-unit .room-resident>img')&&guideBefore.posts===JSON.stringify(state.posts)&&guideBefore.calls===HomePostFixture.calls.length&&Math.abs(scrollY-guideBefore.scroll)<1));
  assert(await page.evaluate(()=>guideBefore.storage===JSON.stringify(Object.entries(localStorage).filter(([key])=>key!=='oyasumi-first-guide-v1').sort())),'Guide actions preserve all existing local storage values');
  assert.equal(await page.locator('.first-guide-topics>li').count(),3);assert.equal(await page.locator('dialog[open]').count(),0);
  assert(await page.evaluate(()=>document.activeElement.matches('.first-guide-heading h2')));
  for(const light of [false,true]){
   await page.evaluate(light=>{state.light=light;render();},light);
   const layout=await page.locator('.first-guide-open').evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return{left:r.left,right:r.right,overflow:el.scrollWidth>el.clientWidth,pageOverflow:document.documentElement.scrollWidth>innerWidth,position:s.position,background:s.backgroundColor,topics:[...el.querySelectorAll('h3')].map(h=>h.textContent),closeHeight:el.querySelector('button').getBoundingClientRect().height};});
   assert(layout.left>=0&&layout.right<=width&&!layout.overflow&&!layout.pageOverflow);assert.equal(layout.position,'static');assert(layout.closeHeight>=44);assert.equal(layout.background,light?'rgb(220, 228, 244)':'rgb(20, 33, 62)');
   assert.deepEqual(layout.topics,['猫の過ごし方','みんなの記録','眠る前の報告']);report.layouts.push({width,light,...layout});
   await page.locator('.first-guide-open').scrollIntoViewIfNeeded();await page.evaluate(()=>{const guide=document.querySelector('.first-guide-open').getBoundingClientRect(),nav=document.querySelector('#navigation').getBoundingClientRect();if(guide.bottom>nav.top)scrollBy(0,guide.bottom-nav.top+16);});
   await page.locator('.first-guide-open').screenshot({path:path.join(out,`guide-${width}-${light?'light':'dark'}.png`)});
  }
  // Navigation remains usable while the inline guide is open; focus is never trapped.
  await page.locator('#navigation [data-view=stats]').click();assert.equal(await page.locator('.wordmark').innerText(),'みんなの記録');await page.locator('#navigation [data-view=home]').click();
  await page.locator('[data-guide-action=close]').focus();if(width===320)await page.keyboard.press('Escape');else await page.locator('[data-guide-action=close]').click();
  assert.equal(await page.locator('.first-guide-open,.first-guide-invitation').count(),0);assert(await page.evaluate(()=>document.activeElement.matches('#app .header h1')));
  await page.reload();await page.waitForFunction(()=>ready&&!busy&&!refreshPromise);assert.equal(await page.locator('.first-guide-open,.first-guide-invitation').count(),0);
  await page.locator('.header [data-view=settings]').click();await page.locator('[data-guide-action=open]').click();assert.equal(await page.locator('.first-guide-topics>li').count(),3);
  await page.locator('.first-guide-open').screenshot({path:path.join(out,`settings-${width}.png`)});await page.locator('[data-guide-action=close]').click();assert(await page.locator('[data-guide-action=open]').evaluate(el=>el===document.activeElement));
  assert.equal(await page.evaluate(()=>HomePostFixture.calls.length+HomePostFixture.mealCalls+HomePostFixture.treatCalls),0);
  await context.close();
  const skipped=await open(width);await skipped.page.locator('[data-guide-action=skip]').click();assert.equal(await skipped.page.locator('.first-guide-invitation').count(),0);await skipped.page.reload();await skipped.page.waitForFunction(()=>ready&&!busy&&!refreshPromise);assert.equal(await skipped.page.locator('.first-guide-invitation').count(),0);await skipped.page.evaluate(()=>go('settings'));await skipped.page.locator('[data-guide-action=open]').click();assert.equal(await skipped.page.locator('.first-guide-topics>li').count(),3);await skipped.context.close();
  console.log(`PASS guide ${engine} ${width}px: optional entry, 3 topics, two themes, no scene replacement or save, skip/reload, settings replay, keyboard and navigation`);
 }
 for(const options of [{key:'oyasumi-local-v2'},{key:'oyasumi-v1'},{key:'oyasumi-dark-hint-seen',value:'1'},{key:'oyasumi-first-guide-v1',value:'seen'},{blocked:true},{readOnly:true}]){
  const {context,page}=await open(320,options);assert.equal(await page.locator('.first-guide-open,dialog[open]').count(),0);if(!options.readOnly)assert.equal(await page.locator('.first-guide-invitation').count(),0);
  await page.evaluate(()=>go('settings'));await page.locator('[data-guide-action=open]').click();assert.equal(await page.locator('.first-guide-topics>li').count(),3);await page.locator('[data-guide-action=close]').click();await page.evaluate(()=>go('home'));assert.equal(await page.locator('.first-guide-invitation').count(),0);report.storage.push({options,pass:true});await context.close();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.failed,[]);assert.deepEqual(report.external,[]);report.pass=true;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(`PASS ${engine}: first-use guide at all four widths; no production DB writes`);
}finally{await browser?.close();server?.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
