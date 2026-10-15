const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {webkit,chromium}=require(process.env.OYASUMI_PLAYWRIGHT_PATH||'./output/webkit-tools/core/package');
const edge=process.argv.includes('--edge'),published=process.argv.includes('--published'),port=edge?9472:9471;
const base=published?'https://tomowo985250z-cmyk.github.io/oyasumi/':`http://127.0.0.1:${port}/`,output=path.join(__dirname,'output/cat-meal-controls',`${published?'published':'local'}-${edge?'edge':'webkit'}`);fs.mkdirSync(output,{recursive:true});
const source=fs.readFileSync('test-home-post-choices.cjs','utf8'),fixture=source.slice(source.indexOf('function installFixture()'),source.indexOf('\n(async () =>'))+'\ninstallFixture();';
const server=published?null:spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'ignore'});let browser;
(async()=>{try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,100));}
 browser=await(edge?chromium:webkit).launch(edge?{executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
 const context=await browser.newContext({viewport:{width:375,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2,timezoneId:'America/Los_Angeles',reducedMotion:'reduce'});
 await context.addInitScript({content:fixture});await context.addInitScript(()=>{
  const f=HomePostFixture,api=OyasumiAPI,snapshot=api.snapshot;f.done=false;f.asleep=false;f.mealCalls=0;f.at=Date.parse('2026-10-15T08:00:00+09:00');Date.now=()=>f.at;
  f.care=()=>({allowanceVersion:2,sleepStateVersion:1,catState:f.asleep?'sleep':'awake',day:SleepFlow.night(f.at),mealSlot:CatCare.slot(f.at),mealEligible:true,mealSleeping:f.asleep,mealDone:f.done,treatGiven:false,treatCount:0,treatRecipients:[],receivedToday:2,receivedTotal:8,receivedDays:[]});
  api.snapshot=async()=>({...await snapshot(),catCare:f.care()});api.getCatCareStatus=async()=>f.care();api.giveCatMeal=async()=>{f.mealCalls++;f.done=true;return{accepted:true,status:f.care()};};
 });
 const page=await context.newPage(),errors=[],failed=[];page.on('pageerror',error=>errors.push(error.message));page.on('response',response=>{if(response.status()>=400)failed.push(response.url());});
 await page.route('**/*',route=>{const url=new URL(route.request().url());if(!url.href.startsWith(base))return route.abort();if(/\/(?:vendor\/supabase|supabase-api|update-client)\.js$/.test(url.pathname))return route.fulfill({contentType:'text/javascript',body:''});return route.continue();});
 await page.goto(base);await page.waitForFunction(()=>typeof ready!=='undefined'&&ready&&!busy&&!refreshPromise);
 assert.equal(await page.locator('meta[name=oyasumi-release]').getAttribute('content'),JSON.parse(fs.readFileSync('release.json','utf8')).release);
 await page.evaluate(()=>{NightClock.now=()=>HomePostFixture.at;});
 const cases=[];
 for(const width of [320,375,390,430])for(const light of [false,true])for(const [label,time,nextText,nextISO] of [
  ['morning','2026-10-15T08:00:00+09:00','今日12:00から','2026-10-15T12:00:00+09:00'],
  ['afternoon','2026-10-15T14:00:00+09:00','明日6:00から','2026-10-16T06:00:00+09:00'],
  ['night','2026-10-15T23:00:00+09:00','明日6:00から','2026-10-16T06:00:00+09:00'],
  ['after-midnight','2026-10-16T01:00:00+09:00','今日6:00から','2026-10-16T06:00:00+09:00']])for(const done of [false,true]){
  await page.setViewportSize({width,height:844});
  await page.evaluate(async({light,time,done})=>{const f=HomePostFixture;f.at=Date.parse(time);f.done=done;f.asleep=false;state.light=light;CatCare.clearFeedback();if(done)CatCare.setFeedback('self','ごはんをあげました。');await refreshShared();go('catMeal');await document.fonts.ready;await Promise.all([...document.images].map(image=>image.decode().catch(()=>{})));},{light,time,done});
  const result=await page.evaluate(()=>{
   const section=document.querySelector('.cat-meal-room .cat-care'),serving=section.querySelector('.care-serving'),button=section.querySelector('[data-cat-meal]'),complete=section.querySelector('[data-cat-meal-complete]'),next=section.querySelector('.care-next time'),caption=section.querySelector('.care-caption');
   const control=button||complete,rect=control.getBoundingClientRect(),card=section.getBoundingClientRect(),css=getComputedStyle(serving),controlCss=getComputedStyle(control);
   return {caption:caption.textContent,border:css.borderWidth,foodColor:css.color,remaining:section.querySelectorAll('.care-remaining').length,buttons:section.querySelectorAll('button,[role=button]').length,button:!!button,disabled:button?.disabled,height:rect.height,buttonFits:rect.left>=card.left&&rect.right<=card.right,completeTag:complete?.tagName,completeBorder:controlCss.borderWidth,completeBackground:controlCss.backgroundColor,cursor:controlCss.cursor,nextText:next?.textContent,nextISO:next?.dateTime,feedback:section.querySelector('.care-feedback').textContent,text:section.innerText,overflow:document.documentElement.scrollWidth>innerWidth};
  });
  assert(result.caption.includes('ごはんだよ')&&result.caption.includes('カリカリ'));assert.equal(result.border,'0px');assert.equal(result.remaining,0);assert(!result.overflow&&result.buttonFits);
  if(done){assert.equal(result.buttons,0);assert.equal(result.completeTag,'P');assert.equal(result.completeBorder,'0px');assert.equal(result.completeBackground,'rgba(0, 0, 0, 0)');assert.notEqual(result.cursor,'pointer');assert.equal(result.nextText,nextText);assert.equal(Date.parse(result.nextISO),Date.parse(nextISO));assert.equal(result.feedback,'');assert.equal((result.text.match(/あげました/g)||[]).length,1);assert(!result.text.includes('残り'));}
  else{assert(result.button&&!result.disabled&&result.height>=56);assert.equal(result.buttons,1);assert(!result.nextText);}
  if(label==='morning'||label==='night')await page.screenshot({path:path.join(output,`${width}-${light?'light':'dark'}-${label}-${done?'done':'ready'}.png`),fullPage:true,animations:'disabled'});
  cases.push({width,light,label,done,...result});
 }
 // An already-fed sleeping cat cannot eat at noon; it wakes at the existing 06:00 reset.
 await page.evaluate(async()=>{HomePostFixture.at=Date.parse('2026-10-15T08:00:00+09:00');HomePostFixture.done=true;HomePostFixture.asleep=true;await refreshShared();go('catMeal');});
 assert.equal(await page.locator('.care-next time').innerText(),'明日6:00から');assert(await page.locator('.care-sleep-note').isVisible());assert.equal(await page.locator('[data-cat-meal]').count(),0);
 // Errors remain visible even when a saved record was recovered.
 await page.evaluate(()=>{CatCare.setFeedback('self','通信の確認が必要です。',true);refreshCareCards();});assert.equal(await page.locator('.care-feedback[role=alert]').innerText(),'通信の確認が必要です。');
 // Stale slots show no completion or obsolete next time; server confirmation restores the action.
 await page.evaluate(()=>{HomePostFixture.asleep=false;HomePostFixture.at=Date.parse('2026-10-15T12:00:00+09:00');refreshCareCards();});
 assert(await page.locator('[data-cat-meal]').isDisabled());assert.equal(await page.locator('.care-next,[data-cat-meal-complete]').count(),0);
 await page.evaluate(async()=>{HomePostFixture.done=false;await refreshCareDay();});assert(await page.locator('[data-cat-meal]').isEnabled());
 // Treat labels, framed serving and action stay unchanged.
 const treat=await page.evaluate(()=>{const holder=document.createElement('div');holder.innerHTML=CatCare.markup(shared.catCare,'calico','00000000-0000-0000-0000-000000000002',false);document.querySelector('#app').append(holder);const result={caption:holder.querySelector('.care-caption').textContent,border:getComputedStyle(holder.querySelector('.care-serving')).borderWidth,buttons:holder.querySelectorAll('[data-cat-treat]').length,mealCompletion:holder.querySelectorAll('[data-cat-meal-complete],.care-next').length};holder.remove();return result;});
 assert(treat.caption.includes('おやつだよ')&&treat.caption.includes('小魚'));assert.equal(treat.border,'1px');assert.equal(treat.buttons,1);assert.equal(treat.mealCompletion,0);
 const legacy=await page.evaluate(()=>{const holder=document.createElement('div');holder.innerHTML=CatCare.markup({day:SleepFlow.day(NightClock.now()),mealEligible:true,mealDone:true,treatGiven:false,receivedToday:0,receivedTotal:0},'calico',shared.userId,true);return holder.querySelector('.care-next time').textContent;});assert.equal(legacy,'明日0:00から');
 assert.equal(await page.evaluate(()=>HomePostFixture.mealCalls),0);assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 const board=await context.newPage();await board.setViewportSize({width:1280,height:900});
 await board.setContent(`<html lang="ja"><meta charset="utf-8"><style>body{margin:20px;background:#071329;color:#f8f6ff;font:18px sans-serif}h1{font-size:26px}main{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}figure{margin:0}figcaption{margin:12px 0}img{width:100%;display:block}</style><h1>猫のごはん · 375pxの実画面</h1><main>${[['morning','ready','朝・給餌前'],['morning','done','朝・給餌後'],['night','ready','夜・給餌前'],['night','done','夜・給餌後']].map(([time,status,label])=>`<figure><figcaption>${label}</figcaption><img src="data:image/png;base64,${fs.readFileSync(path.join(output,`375-dark-${time}-${status}.png`)).toString('base64')}"></figure>`).join('')}</main></html>`);
 await board.waitForFunction(()=>[...document.images].every(image=>image.complete&&image.naturalWidth));await board.screenshot({path:path.join(output,'meal-before-after-375.png'),fullPage:true});
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({pass:true,published,engine:edge?'Edge':'WebKit',physicalIPhoneTested:false,productionDbWrites:0,cases,sleepingDone:true,staleSlot:true,errorsPreserved:true,treatUnchanged:true,errors,failed},null,2));
 console.log(`PASS ${published?'published':'local'} ${edge?'Edge':'WebKit'}: ${cases.length} meal-control states at 320/375/390/430px, day/night themes, morning/noon/night/midnight; next meal time, plain completion, sleeping/stale/error states and unchanged treats; no DB writes.`);
}finally{await browser?.close();server?.kill();}})().catch(error=>{console.error(error);process.exitCode=1;});
