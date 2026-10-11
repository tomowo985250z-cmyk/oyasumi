const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {webkit,chromium}=require(process.env.OYASUMI_PLAYWRIGHT_PATH||'./output/webkit-tools/core/package');
const edge=process.argv.includes('--edge'),port=edge?9403:9402,base=`http://127.0.0.1:${port}/`;
const output=path.join(__dirname,'output/reactions-by-post-v1',edge?'edge':'webkit');fs.mkdirSync(output,{recursive:true});
const source=fs.readFileSync('test-home-post-choices.cjs','utf8');
const fixture=source.slice(source.indexOf('function installFixture()'),source.indexOf('\n(async () => {'));
const server=spawn(process.execPath,['server.js'],{cwd:__dirname,env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'ignore'});
const wait=ms=>new Promise(r=>setTimeout(r,ms));let browser;
(async()=>{try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await wait(100);}
 browser=await(edge?chromium:webkit).launch(edge?{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await context.addInitScript({content:fixture+';installFixture();'});
 const page=await context.newPage(),errors=[],failed=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});
 await page.route('**/*',route=>{const url=new URL(route.request().url());if(!url.href.startsWith(base))return route.abort();if(/\/(?:vendor\/supabase|supabase-api|update-client)\.js$/.test(url.pathname))return route.fulfill({contentType:'text/javascript',body:'// Isolated verification'});return route.continue();});
 await page.goto(base);await page.waitForFunction(()=>typeof ready!=='undefined'&&ready&&!busy);
 await page.evaluate(async()=>{
  NightClock.now=()=>HomePostFixture.at;
  const original=OyasumiAPI.snapshot;
  OyasumiAPI.snapshot=async()=>{const result=await original();return {...result,morningReactions:HomePostFixture.receipt||null,feed:HomePostFixture.peerPosts||result.feed};};
  const save=OyasumiAPI.setReaction;
  OyasumiAPI.setReaction=async(id,choice)=>{await new Promise(r=>setTimeout(r,70));if(HomePostFixture.reactionFail)throw Error('Isolated reaction failure');return save(id,choice);};
 });
 const settled=()=>page.waitForFunction(()=>!busy&&!refreshPromise&&!refreshQueued);
 const show=async(intent,legacy=false)=>{await settled();await page.evaluate(async({intent,legacy})=>{
  HomePostFixture.reset();HomePostFixture.reactionFail=false;HomePostFixture.receipt=null;filter='all';state.lastSleep=null;
  HomePostFixture.peerPosts=[{id:'peer-'+intent,userId:'peer',status:['relax','sleepless'].includes(intent)?'awake':intent==='early-sleep'?'early-sleep':intent,intent:intent==='early-sleep'?undefined:intent,time:HomePostFixture.at,nightDate:SleepFlow.night(HomePostFixture.at),name:'おとなり',expression:'calm',coat:'calico',self:false}];
  if(legacy)HomePostFixture.reactions['peer-'+intent]='comfort';
  await refreshShared();go('timeline');
 },{intent,legacy});};
 const layouts=[];
 for(const width of [320,375,390,430]){await page.setViewportSize({width,height:844});
  for(const light of [false,true])for(const intent of ['relax','sleep','sleepless','try-sleep']){
   await show(intent);await page.evaluate(light=>{state.light=light;render();},light);await page.evaluate(()=>document.fonts.ready);
   const layout=await page.evaluate(()=>{const bs=[...document.querySelectorAll('.reaction-options .reaction')],r=bs.map(b=>{const q=b.getBoundingClientRect();return{x:q.x,y:q.y,width:q.width,height:q.height,text:b.innerText,fit:b.scrollWidth<=b.clientWidth+1};});return{buttons:r,noOverflow:document.documentElement.scrollWidth<=innerWidth,labels:bs.map(b=>b.childNodes[0].textContent),ids:bs.map(b=>b.dataset.reaction)};});
   assert.equal(layout.buttons.length,4);assert(layout.noOverflow&&layout.buttons.every(b=>b.fit&&b.height>=44));
   const [a,b,c,d]=layout.buttons;assert(Math.abs(a.y-b.y)<1&&Math.abs(c.y-d.y)<1&&a.y<c.y&&a.x<b.x);
   assert.deepEqual(layout.labels,await page.evaluate(intent=>PostReactions.groups[intent].map(o=>o.text),intent));
   if(width===390&&!light)await page.screenshot({path:path.join(output,`${intent}-390.png`),fullPage:true});
   layouts.push({width,light,intent,...layout});
  }
 }
 await page.setViewportSize({width:390,height:844});
 for(const intent of ['relax','sleep','sleepless','try-sleep']){
  await show(intent);const options=await page.evaluate(intent=>PostReactions.groups[intent].map(o=>o.id),intent);
  for(const id of options){await page.locator(`[data-reaction="${id}"]`).click();await settled();assert.equal(await page.evaluate(intent=>state.reactions['peer-'+intent],intent),id);assert.equal(await page.locator('.reaction.selected').count(),1);assert.equal(await page.locator('.reaction-count').allTextContents().then(v=>v.reduce((a,n)=>a+Number(n),0)),1);}
  await page.locator(`[data-reaction="${options[3]}"]`).click();await settled();assert.equal(await page.locator('.reaction.selected').count(),0);
 }
 await show('sleepless');await page.evaluate(()=>{const b=document.querySelector('.reaction');b.click();b.click();});await settled();
 assert.equal(await page.evaluate(()=>HomePostFixture.calls.filter(c=>c.kind==='reaction').length),1,'Double tap is one mutation');
 await page.evaluate(()=>HomePostFixture.reactionFail=true);await page.locator('.reaction').nth(1).click();await settled();assert.equal(await page.locator('.reaction.selected').count(),1,'Failure retains previous choice');
 await page.evaluate(()=>HomePostFixture.reactionFail=false);await page.locator('.reaction').nth(1).click();await settled();
 assert.equal(await page.evaluate(()=>state.reactions['peer-sleepless']),'sleepless-here');
 await show('early-sleep',true);assert.equal(await page.locator('.reaction-options .reaction').count(),4);await page.locator('.legacy-reactions summary').click();assert((await page.locator('.legacy-reactions').innerText()).includes('無理せずね☺️ 1個'));
 await page.locator('.legacy-reactions [data-react]').click();await settled();assert.equal(await page.locator('.legacy-reactions').count(),0,'Legacy selection can be cancelled');
 await page.evaluate(async()=>{HomePostFixture.peerPosts=null;HomePostFixture.reset();go('home');await refreshShared();});
 await page.locator('[data-home-choice="relax"]').click();await settled();await page.evaluate(()=>go('home'));await page.locator('[data-home-choice="sleepless"]').click();await settled();
 assert.equal(await page.evaluate(()=>state.posts.length),2,'Distinct awake intents retain two histories');assert.equal(await page.evaluate(()=>shared.ownSleepCount),0);assert.equal(await page.locator('.post-text').textContent(),'まだ眠れない…');
 const morning=async(at,counts)=>{await settled();await page.evaluate(async({at,counts})=>{
  clearTimeout(toastTimer);document.querySelector('#toast').classList.remove('visible');
  HomePostFixture.at=Date.parse(at);HomePostFixture.peerPosts=null;HomePostFixture.receipt=counts===null?null:{nightDate:'2026-10-11',counts};
  state.lastSleep={postId:'old-sleep',userId:shared.userId,at:'2026-10-11T23:00:00+09:00',nightDate:'2026-10-11',count:3,finished:true};
  await refreshShared();go('morning');
 },{at,counts});};
 const morningCounts={'sleep-night':2,'relax-pace':1,'sleepless-here':3,comfort:1};
 await morning('2026-10-12T05:59:59.999+09:00',morningCounts);assert.equal(await page.locator('.morning-receipts').count(),0,'Hidden before JST 06:00');
 await morning('2026-10-12T06:00:00+09:00',morningCounts);assert.equal(await page.locator('.morning-receipts summary').textContent(),'昨日の投稿に、7個のやさしい気持ちが届いたよ 🐾');assert.equal(await page.locator('.morning-reaction-grid').isVisible(),false);
 await page.screenshot({path:path.join(output,'morning-collapsed-390.png'),fullPage:true});
 await page.locator('.morning-receipts summary').click();assert.equal(await page.locator('.morning-reaction-grid').isVisible(),true);assert.equal(await page.locator('.morning-reaction-grid>div').count(),4);
 await page.evaluate(async()=>{await refreshShared();});assert.equal(await page.locator('.morning-reaction-grid').isVisible(),true,'Polling retains the open breakdown');
 await page.screenshot({path:path.join(output,'morning-expanded-390.png'),fullPage:true});
 await page.locator('.morning-receipts summary').click();assert.equal(await page.locator('.morning-reaction-grid').isVisible(),false);
 await morning('2026-10-12T07:00:00+09:00',{});assert.equal(await page.locator('.morning-receipts').count(),0,'Zero is hidden');
 await morning('2026-10-12T07:00:00+09:00',null);assert((await page.locator('.morning-receipts').textContent()).includes('取得できませんでした'),'Fetch failure is not a false zero');
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({pass:true,engine:edge?'edge':'webkit',productionDbWrites:false,layouts,all16:true,cancel:true,duplicateTap:true,failureRecovery:true,legacyCancel:true,awakeIntents:true,morningTotal:true,morningToggle:true,zeroHidden:true,sixAm:true,errors,failed},null,2));
 console.log(`PASS reactions ${edge?'Edge':'WebKit'}: 32 mobile layouts, 16 reaction choices, replacement/cancel/double taps/retry, legacy cancellation, awake history and 06:00 morning total/details/zero/error states; no production DB writes.`);
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
