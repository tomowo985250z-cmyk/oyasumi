const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {webkit,chromium}=require(process.env.OYASUMI_PLAYWRIGHT_PATH||'./output/webkit-tools/core/package');
const engine=process.argv.includes('--edge')?'edge':'webkit',published=process.argv.includes('--published'),port=engine==='edge'?9438:9437;
const base=published?'https://tomowo985250z-cmyk.github.io/oyasumi/':`http://127.0.0.1:${port}/`,output=path.join(__dirname,'output/profile-compact',`${published?'published':'local'}-${engine}`);fs.mkdirSync(output,{recursive:true});
const source=fs.readFileSync('test-home-post-choices.cjs','utf8'),fixture=source.slice(source.indexOf('function installFixture()'),source.indexOf('\n(async () =>'))+'\ninstallFixture();';
const server=published?null:spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'ignore'});let browser;
(async()=>{try{
 for(let i=0;i<60;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await(engine==='edge'?chromium:webkit).launch(engine==='edge'?{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
 const context=await browser.newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true});await context.addInitScript({content:fixture});
 await context.addInitScript(()=>{
  const f=HomePostFixture,api=OyasumiAPI,snapshot=api.snapshot;Date.now=()=>f.at;f.treats=new Set();f.treatCalls=[];f.mealCalls=0;
  f.peers=[2,3,4].map((n,i)=>({id:'peer-'+n,userId:'00000000-0000-0000-0000-'+String(n).padStart(12,'0'),name:['おとなり','ひとやすみ','ゆっくり'][i],coat:['snow-leopard','gray','black'][i],expression:'calm',catRole:['caring','watchful','mechanic'][i],profileNote:'今夜も、ひとやすみ。',status:i===1?'sleep':'awake',time:f.at,nightDate:'2026-10-11',order:n,self:false,color:'peach',appearanceReady:true}));
  f.care=()=>({allowanceVersion:2,sleepStateVersion:1,catState:f.rows[0]?.choice==='awake'?'awake':f.rows.length?'sleep':null,day:SleepFlow.night(f.at),mealSlot:CatCare.slot(f.at),mealEligible:true,mealDone:false,mealSleeping:false,treatGiven:f.treats.size>=2,treatCount:f.treats.size,treatRecipients:[...f.treats],receivedToday:2,receivedTotal:8,receivedDays:[]});
  api.snapshot=async()=>{if(!f.rows.length)f.rows=[f.row('awake')];return {...await snapshot(),name:'確認ねこ',catRole:'mechanic',profileNote:'今夜ものんびり。',feed:[...f.rows.map(row=>({id:row.id,userId:row.user_id,name:'確認ねこ',coat:'calico',expression:'calm',catRole:'mechanic',profileNote:'今夜ものんびり。',status:row.choice,time:f.at,nightDate:SleepFlow.night(f.at),order:row.event_order,self:true,color:'peach'})),...f.peers],catCare:f.care()};};api.getCatCareStatus=async()=>f.care();
  api.giveCatTreat=async id=>{f.treatCalls.push(id);await new Promise(r=>setTimeout(r,120));const accepted=f.treats.size<2&&!f.treats.has(id);if(accepted)f.treats.add(id);return{accepted,status:f.care()};};
  api.giveCatMeal=async()=>{f.mealCalls++;throw Error('Meals must not be submitted by treat navigation');};
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{const u=new URL(route.request().url());if(!u.href.startsWith(base))return route.abort();if(/\/(?:vendor\/supabase|supabase-api|update-client)\.js$/.test(u.pathname))return route.fulfill({contentType:'text/javascript',body:''});return route.continue();});
 await page.goto(published?base+'?verify='+Date.now():base);await page.waitForFunction(()=>typeof ready!=='undefined'&&ready&&!busy&&!refreshPromise);await page.evaluate(()=>document.fonts.ready);
 if(published)assert.equal(await page.locator('meta[name=oyasumi-release]').getAttribute('content'),JSON.parse(fs.readFileSync('release.json','utf8')).release);
 const staticTap=async(selector,expectedView)=>{
  const icon=page.locator(selector);assert(await icon.isVisible());
  assert(await icon.evaluate(el=>el.tagName==='SPAN'&&el.tabIndex===-1&&!el.closest('button,a,[data-view],[data-public-profile],[data-profile-care],[data-coat-picker]')));
  await icon.hover();const box=await icon.boundingBox();await page.mouse.down();
  const pressed=await icon.evaluate(el=>{const s=getComputedStyle(el);return{cursor:s.cursor,filter:s.filter,transform:s.transform};});await page.mouse.up();
  assert.deepEqual(pressed,{cursor:'default',filter:'none',transform:'none'});await icon.tap();
  assert.equal(await page.evaluate(()=>view),expectedView);assert.deepEqual(await icon.boundingBox(),box);
 };
 const layouts=[];
 for(const width of [320,350,375,390,430])for(const light of [false,true]){
  await page.setViewportSize({width,height:568});await page.evaluate(light=>{state.light=light;go('profile');},light);
  assert.equal(await page.locator('.profile-banner h1').innerText(),'確認ねこ');assert.equal(await page.locator('.profile-page .room-scene,.profile-page .day-room-art').count(),0);assert.equal(await page.locator('[data-expression-picker]').count(),0);assert(await page.locator('.profile-page [data-coat-picker]').isVisible());assert(await page.locator('[data-role-picker]').isVisible());assert(await page.locator('[data-note-editor]').isVisible());assert(await page.locator('[data-history-user]').isVisible());assert.equal(await page.locator('[data-cat-meal],[data-cat-treat]').count(),0);
  const own=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,contentBottom:document.querySelector('.profile-history').getBoundingClientRect().bottom,navTop:document.querySelector('nav').getBoundingClientRect().top}));assert(!own.overflow);assert(own.contentBottom<=own.navTop,JSON.stringify({width,own}));
  await staticTap('.profile-cat-button','profile');assert.equal(await page.locator('.profile-page>.profile-cat-hint').count(),0);assert.equal(await page.locator('dialog[open]').count(),0);
  if(width===320||width===430)await page.screenshot({path:path.join(output,`own-${width}-${light?'light':'dark'}.png`)});
  await page.evaluate(()=>go('timeline'));await staticTap('.post [data-own-cat-icon]','timeline');assert.equal(await page.locator('dialog[open]').count(),0);assert(await page.locator('[data-delete=home-post-1]').isVisible());
  // A retained own-profile dialog also renders an inert icon.
  await page.evaluate(()=>{const person=allPosts().find(p=>p.id==='home-post-1');CatImages.render(document.querySelector('#public-profile-content'),publicProfileRoom(person));document.querySelector('#public-profile-dialog').showModal();});await staticTap('.public-profile-care-icon','timeline');
  assert.equal(await page.locator('#public-profile-content .room-scene,#public-profile-content .day-room-art').count(),0);
  assert(await page.locator('.public-profile-care-icon .avatar').isVisible());assert.equal(await page.locator('.public-profile-identity h3').innerText(),'確認ねこ');assert.equal(await page.locator('.public-profile-coat').innerText(),'三毛');assert.equal(await page.locator('.public-profile-note').innerText(),'今夜ものんびり。');assert.equal(await page.locator('.room-whisper').innerText(),'考えごとも、少しおやすみ。');
  const self=await page.evaluate(()=>{const d=document.querySelector('#public-profile-dialog'),identity=d.querySelector('.public-profile-identity').getBoundingClientRect(),whisper=d.querySelector('.room-whisper').getBoundingClientRect();return{overflow:d.scrollWidth>d.clientWidth,fits:d.scrollHeight<=d.clientHeight,gap:whisper.top-identity.bottom};});assert(!self.overflow&&self.fits&&self.gap>=0&&self.gap<=16,JSON.stringify({width,self}));
  if(width===320||width===430)await page.screenshot({path:path.join(output,`self-${width}-${light?'light':'dark'}.png`)});
  await page.locator('#close-public-profile').click();await page.locator('[data-public-profile=peer-2]').click();
  assert.equal(await page.locator('#public-profile-content .cat-care').count(),0);assert.equal(await page.locator('#public-profile-content [data-cat-treat]').count(),0);assert.equal(await page.locator('.public-profile-coat').innerText(),'ユキヒョウ');
  await page.locator('#public-profile-content .room-resident img').evaluate(img=>img.decode());assert(await page.locator('#public-profile-content .room-resident img').isVisible());
  const other=await page.evaluate(()=>{const d=document.querySelector('#public-profile-dialog');return{overflow:d.scrollWidth>d.clientWidth,fits:d.scrollHeight<=d.clientHeight,dialogHeight:d.getBoundingClientRect().height,whisper:document.querySelector('.room-whisper').textContent};});assert(!other.overflow&&other.fits,JSON.stringify({width,other}));
  if(width===320||width===430)await page.screenshot({path:path.join(output,`other-${width}-${light?'light':'dark'}.png`)});
  await page.locator('.public-profile-care-icon').click();assert.equal(await page.locator('.wordmark').innerText(),'猫のおやつ');assert.equal(await page.locator('[data-cat-meal]').count(),0);assert.equal(await page.locator('[data-cat-treat]').getAttribute('data-cat-treat'),'00000000-0000-0000-0000-000000000002');assert.equal(await page.locator('.cat-treat-room .room-resident img').getAttribute('data-cat-coat'),'snow-leopard');
  if(width===320||width===430)await page.screenshot({path:path.join(output,`treat-${width}-${light?'light':'dark'}.png`)});
  await page.locator('[data-treat-back]').click();assert(await page.locator('#public-profile-dialog').isVisible());assert.equal(await page.locator('.public-profile-identity h3').innerText(),'おとなり');await page.locator('#close-public-profile').click();layouts.push({width,light,own,self,other});
 }
 // Home still opens meals; profile editors and settings remain reachable.
 await page.evaluate(()=>go('home'));await page.locator('.home-room-unit .room-resident').tap();assert.equal(await page.locator('.wordmark').innerText(),'猫のごはん');assert.equal(await page.locator('[data-cat-treat]').count(),0);assert(await page.locator('[data-cat-meal]').isVisible());
 await page.evaluate(()=>go('profile'));await page.locator('.profile-page [data-coat-picker]').click();assert(await page.locator('#expression-dialog').isVisible());assert.equal(await page.locator('#expression-options button[data-coat]').count(),16);assert.equal(await page.locator('button[data-expression]').count(),0);await page.locator('#cancel-expression').click();await page.locator('[data-note-editor]').click();assert.equal(await page.locator('#profile-note').inputValue(),'今夜ものんびり。');await page.locator('#cancel-note').click();
 await page.locator('[data-role-picker]').click();assert(await page.locator('#role-dialog').isVisible());await page.evaluate(()=>document.querySelector('#role-dialog').close());
 await page.locator('.header [data-view=settings]').click();assert(await page.locator('[data-name]').isVisible());
 // During incomplete setup, tapping the placeholder stays inert and the explicit picker works.
 await page.evaluate(()=>{shared.needsCat=true;shared.profileComplete=false;go('profile');});await staticTap('.profile-cat-button','profile');assert.equal(await page.locator('dialog[open]').count(),0);await page.locator('.cat-coat-setting [data-coat-picker]').click();assert(await page.locator('#expression-dialog').isVisible());await page.locator('#cancel-expression').click();await page.evaluate(()=>{shared.needsCat=false;shared.profileComplete=true;render();});
 // Full notes and names remain available even when scrolling is necessary.
 await page.evaluate(()=>{go('profile');state.name='あ'.repeat(12);state.profileNote='ゆ'.repeat(40);render();});assert.equal(await page.locator('.profile-note-text').innerText(),'ゆ'.repeat(40));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.evaluate(()=>{go('timeline');shared.feed[1].name='あ'.repeat(12);shared.feed[1].profileNote='ゆ'.repeat(40);render();});await page.locator('[data-public-profile=peer-2]').click();assert.equal(await page.locator('.public-profile-note').innerText(),'ゆ'.repeat(40));assert(await page.evaluate(()=>{const d=document.querySelector('#public-profile-dialog');return d.scrollWidth<=d.clientWidth;}));await page.locator('#close-public-profile').click();
 // Do not submit on navigation; duplicate taps, per-recipient and two-cat limits persist.
 assert.deepEqual(await page.evaluate(()=>HomePostFixture.treatCalls),[]);
 await page.locator('[data-public-profile=peer-2]').click();await page.locator('#public-profile-content .room-resident').click();await page.evaluate(()=>{document.querySelector('[data-cat-treat]').click();document.querySelector('[data-cat-treat]').click();});await page.waitForSelector('.cat-treat-room .care-playing');assert.equal(await page.evaluate(()=>HomePostFixture.treatCalls.length),1);
 assert.equal(await page.locator('.care-playing').getAttribute('data-care-kind'),'treat');assert(await page.locator('[data-cat-treat]').isDisabled());await page.waitForFunction(()=>!document.querySelector('.care-playing'),{},{timeout:10000});assert(await page.locator('.cat-treat-room .room-resident').isVisible());
 await page.locator('[data-treat-back]').click();await page.locator('.public-profile-care-icon').click();assert(await page.locator('[data-cat-treat]').isDisabled());
 await page.evaluate(()=>go('timeline'));await page.locator('[data-public-profile=peer-3]').click();await page.locator('.public-profile-care-icon').click();assert(await page.locator('[data-cat-treat]').isEnabled());await page.locator('[data-cat-treat]').click();await page.waitForSelector('.care-playing');await page.waitForFunction(()=>!document.querySelector('.care-playing'),{},{timeout:10000});
 await page.evaluate(()=>go('timeline'));await page.locator('[data-public-profile=peer-4]').click();await page.locator('.public-profile-care-icon').click();assert(await page.locator('[data-cat-treat]').isDisabled());assert.equal(await page.evaluate(()=>HomePostFixture.treatCalls.length),2);assert.equal(await page.evaluate(()=>HomePostFixture.mealCalls),0);
 // An account change cannot reuse the selected recipient from the prior account.
 await page.evaluate(()=>{shared.userId='00000000-0000-0000-0000-000000000099';render();});assert.equal(await page.locator('[data-cat-treat]').count(),0);
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({pass:true,layouts,interactions:['inert own icons and pressed styles','home meal','peer profile','peer treat','room tap','return profile','editing/settings','incomplete setup','long text','duplicate lock','recipient lock','two-cat limit','viewer isolation'],productionWrites:0},null,2));console.log(`PASS ${engine}: 10 profile layouts at SE height; inert own icons; home meals; peer profiles/treats; editing and limits.`);
}finally{await browser?.close();server?.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
