const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {webkit,chromium}=require('./output/webkit-tools/core/package');
const edge=process.argv.includes('--edge'),published=process.argv.includes('--published'),port=edge?9412:9411,base=published?'https://tomowo985250z-cmyk.github.io/oyasumi/':`http://127.0.0.1:${port}/`;
const out=path.join(__dirname,'output/care-and-sent-v2',(published?'published-':'')+(edge?'edge':'webkit'));fs.mkdirSync(out,{recursive:true});
const source=fs.readFileSync('test-home-post-choices.cjs','utf8'),fixture=source.slice(source.indexOf('function installFixture()'),source.indexOf('\n(async () => {'));
const server=published?null:spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'ignore'});
let browser;
(async()=>{try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await(edge?chromium:webkit).launch(edge?{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const persistentFixture=fixture.split(/\r?\n/).filter(line=>!line.includes('const storage = new Map()')&&!line.includes("for (const key of ['localStorage', 'sessionStorage'])")).join('\n');
 await context.addInitScript({content:persistentFixture+';installFixture();'});const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{const url=new URL(route.request().url());if(!url.href.startsWith(base))return route.abort();if(/\/(?:vendor\/supabase|supabase-api|update-client)\.js$/.test(url.pathname))return route.fulfill({contentType:'text/javascript',body:'// isolated'});return route.continue();});
 await page.goto(base);await page.waitForFunction(()=>typeof ready!=='undefined'&&ready&&!busy);
 if(published)assert.equal(await page.locator('meta[name="oyasumi-release"]').getAttribute('content'),JSON.parse(fs.readFileSync('release.json','utf8')).release,'Published release must match the tested source');
 await page.evaluate(()=>{
  NightClock.now=()=>HomePostFixture.at;
  globalThis.careData={meals:[],treats:[],calls:0,people:3,peopleCalls:0};
  careData.status=()=>({allowanceVersion:2,day:CatCare.day(HomePostFixture.at),mealSlot:CatCare.slot(HomePostFixture.at),mealEligible:true,
   mealDone:careData.meals.includes(CatCare.day(HomePostFixture.at)+CatCare.slot(HomePostFixture.at)),treatGiven:careData.treats.length>=2,treatCount:careData.treats.length,treatRecipients:[...careData.treats],receivedToday:0,receivedTotal:0,receivedDays:[]});
  OyasumiAPI.getCatCareStatus=async()=>careData.status();
  OyasumiAPI.giveCatMeal=async()=>{careData.calls++;await new Promise(r=>setTimeout(r,50));const key=CatCare.day(HomePostFixture.at)+CatCare.slot(HomePostFixture.at),accepted=!careData.meals.includes(key);if(accepted)careData.meals.push(key);return {accepted,status:careData.status()};};
  OyasumiAPI.giveCatTreat=async id=>{careData.calls++;await new Promise(r=>setTimeout(r,50));const accepted=!careData.treats.includes(id)&&careData.treats.length<2;if(accepted)careData.treats.push(id);return {accepted,status:careData.status()};};
  OyasumiAPI.getSentReactionPeople=async()=>{careData.peopleCalls++;await new Promise(r=>setTimeout(r,30));return{nightDate:NightClock.night(),count:careData.people};};
  const original=OyasumiAPI.snapshot;OyasumiAPI.snapshot=async()=>({...await original(),catCare:careData.status()});
 });
 const peers=['00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004'];
 for(const width of [320,375,390,430]){
  await page.setViewportSize({width,height:844});
  await page.evaluate(async()=>{HomePostFixture.at=Date.parse('2026-10-12T06:00:00+09:00');careData.meals=[];careData.treats=[];await refreshShared();go('profile');});
  assert(await page.locator('[data-cat-meal]').isEnabled(),'Morning needs no post');
  const before=await page.evaluate(()=>careData.calls);
  await page.evaluate(()=>{const b=document.querySelector('[data-cat-meal]');b.click();b.click();});
  await page.waitForFunction(()=>!CatCare.pending&&!!document.querySelector('.care-playing'));
  assert.equal(await page.evaluate(()=>careData.calls),before+1);
  await page.waitForFunction(()=>!document.querySelector('.care-playing'),{},{timeout:9000});
  assert.equal(await page.locator('.care-finished').count(),0,'After six seconds return to ordinary artwork');
  assert(await page.locator('.care-idle img,.care-idle svg').first().isVisible());
  assert(await page.locator('[data-cat-meal]').isDisabled());
  await page.evaluate(()=>{HomePostFixture.at=Date.parse('2026-10-12T11:59:59+09:00');refreshCareCards();});assert(await page.locator('[data-cat-meal]').isDisabled());
  await page.evaluate(()=>{HomePostFixture.at=Date.parse('2026-10-12T12:00:00+09:00');refreshCareCards();});assert(await page.locator('[data-cat-meal]').isDisabled(),'Stale slot disabled before server confirmation');
  await page.evaluate(()=>refreshCareDay());assert(await page.locator('[data-cat-meal]').isEnabled());
  for(const [index,id] of peers.entries()){
   await page.evaluate(id=>{document.querySelector('#public-profile-content').innerHTML=CatCare.markup(shared.catCare,'calico',id,false);const d=document.querySelector('#public-profile-dialog');if(!d.open)d.showModal();},id);
   if(index<2){await page.locator(`[data-cat-treat="${id}"]`).click();await page.waitForFunction(()=>!CatCare.pending);}
   else assert(await page.locator(`[data-cat-treat="${id}"]`).isDisabled(),'Third cat unavailable');
   if(index===0){await page.evaluate(()=>refreshCareCards());assert(await page.locator(`[data-cat-treat="${id}"]`).isDisabled(),'Same recipient locked');}
  }
  await page.evaluate(()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());careData.people=3;HomePostFixture.at=Date.parse('2026-10-12T23:00:00+09:00');state.lastSleep={at:new Date(HomePostFixture.at).toISOString(),nightDate:NightClock.night(),finished:true,finishedAt:new Date(HomePostFixture.at-10000).toISOString()};go('rest');});
  await page.waitForSelector('.sent-kindness');assert.equal(await page.locator('.sent-kindness').textContent(),'今日は3人に、やさしい気持ちを届けたよ 🐾');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(out,`rest-${width}.png`),fullPage:true});
  await page.evaluate(()=>{careData.people=1;go('home');go('rest');});await page.waitForFunction(()=>document.querySelector('.sent-kindness')?.textContent.includes('1人'));
  await page.evaluate(()=>{careData.people=0;go('home');go('rest');});await page.waitForTimeout(80);assert.equal(await page.locator('.sent-kindness').count(),0);
  await page.evaluate(()=>{HomePostFixture.at=Date.parse('2026-10-13T06:00:00+09:00');render();});assert.equal(await page.locator('.sent-kindness').count(),0,'Prior-day cached count never appears');
 }
 const begging=await page.evaluate(()=>{
  HomePostFixture.at=Date.parse('2026-10-14T07:00:00+09:00');const status=careData.status();let chosen;
  for(let i=0;i<100;i++){if(CatCare.begDecision('test-'+i,status.day)){chosen='test-'+i;break;}}
  const first=CatCare.morningBeg(status,chosen),repeat=CatCare.morningBeg(status,chosen);
  const after=CatCare.morningBeg({...status,mealDone:true},chosen),later=CatCare.morningBeg(status,chosen,HomePostFixture.at+5000);
  let yes=0;for(let i=0;i<10000;i++)yes+=CatCare.begDecision('user-'+i,status.day);
  return{first,repeat,after,later,rate:yes/10000,day:status.day,chosen};
 });
 assert(begging.first&&begging.repeat&&begging.after===''&&begging.later==='');assert(begging.rate>.32&&begging.rate<.38,JSON.stringify(begging));
 await page.evaluate(()=>{careData.people=3;go('sleep');globalThis.savedSleepCat=document.querySelector('.sleep-cat');globalThis.savedSleepStart=sleepShownAt;});
 await page.waitForSelector('.sent-kindness');
 assert(await page.evaluate(()=>savedSleepCat.isConnected&&sleepShownAt===savedSleepStart),'Latest count does not reset the six-second sleep transition');
 await page.reload();await page.waitForFunction(()=>typeof ready!=='undefined'&&ready);
 const persisted=await page.evaluate(({chosen,day})=>{
  const saved=Number(localStorage.getItem('oyasumi-morning-beg-v1:'+chosen+':'+day));
  const status={allowanceVersion:2,day,mealSlot:'morning',mealEligible:true,mealDone:false,treatGiven:false,treatCount:0,treatRecipients:[],receivedToday:0,receivedTotal:0};
  return {saved,repeat:CatCare.morningBeg(status,chosen,saved+5000)};
 },begging);
 assert(persisted.saved>0&&persisted.repeat==='','Reload cannot reroll or repeat the daily morning gesture');
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({pass:true,widths:[320,375,390,430],begging,productionDbWrites:false,errors},null,2));
 console.log(`PASS ${edge?'Edge':'WebKit'} care/sent: four mobile widths, six-second return, 06:00/12:00, duplicate taps, two distinct treats, current sent count/zero/day reset, stable morning decision and 35% distribution.`);
}finally{await browser?.close();server?.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
