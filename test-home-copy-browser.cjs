const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const server=spawn(process.execPath,['server.js'],{stdio:'ignore'});
const browser=spawn(process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=9345',`--user-data-dir=${fs.mkdtempSync(path.join(os.tmpdir(),'oyasumi-copy-'))}`,'about:blank'],{stdio:'ignore'});
let socket;
(async()=>{
 let tabs;for(let i=0;i<60;i++){try{tabs=await(await fetch('http://127.0.0.1:9345/json')).json();break;}catch{await delay(250);}}
 assert(tabs);socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
 let serial=0;const pending=new Map(),errors=[];
 socket.addEventListener('message',e=>{const d=JSON.parse(e.data);if(d.id){const p=pending.get(d.id);pending.delete(d.id);d.error?p.reject(d.error):p.resolve(d.result);}if(d.method==='Runtime.exceptionThrown')errors.push(d.params);});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;};
 await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Network.setBlockedURLs',{urls:['*supabase.co*']});
 await send('Emulation.setTimezoneOverride',{timezoneId:'America/Los_Angeles'});
 await send('Page.navigate',{url:'http://127.0.0.1:3000/'});
 for(let i=0;i<60;i++){if(await evaluate('typeof go==="function"'))break;await delay(100);}
 await evaluate(`ensureConnection=async()=>{};refreshShared=async()=>{};NightClock.remaining=()=>null;ready=true;globalThis.testNow=0;NightClock.now=()=>testNow;shared.awakeCount=42;shared.sleepingCount=58;shared.trend=[{awake:42,sleeping:58}];state.posts=[];shared.feed=[];shared.activeAwakePosts=[]`);
 fs.mkdirSync('test-results',{recursive:true});
 for(const width of [320,375,390,430]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
  for(const [time,day] of [['05:59:59.999',false],['06:00:00.000',true],['12:00:00.000',true],['17:59:59.999',true],['18:00:00.000',false],['23:59:59.999',false],['00:00:00.000',false]]){
   await evaluate(`testNow=Date.parse('2026-10-08T${time}+09:00');shared.activeAwakePosts=[{id:'recent',userId:'recent',status:'awake',time:testNow-1000,coat:'calico',expression:'calm'},{id:'expired',userId:'expired',status:'awake',time:testNow-10800000,coat:'calico',expression:'calm'}];go('home')`);
   assert.equal(await evaluate('document.querySelectorAll(".roof-sky-card").length'),day?0:1);
   if(!day){assert.equal(await evaluate('document.querySelector(".awake-heading>span").textContent'),'今夜まだ起きてる人');assert.equal(await evaluate('document.querySelector("[data-trend-comment]").textContent'),'今夜も、ひとりじゃないみたい');}
   assert.equal(await evaluate('activeAwakeCount()'),1);assert.equal(await evaluate('document.querySelectorAll(".roof-cat").length'),day?0:1);
   assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
   if(!day)assert(await evaluate(`(()=>{const a=document.querySelector('.awake-heading>span').getBoundingClientRect(),b=document.querySelector('.count').getBoundingClientRect();return a.right<=b.left})()`),'Heading and count do not overlap');
   if(time==='12:00:00.000'||time==='18:00:00.000'){
    const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(`test-results/home-copy-${day?'day':'night'}-${width}.png`,Buffer.from(shot.data,'base64'));
   }
  }
 }
 const before=await evaluate('JSON.stringify({feed:shared.feed,posts:state.posts,trend:shared.trend,awake:shared.awakeCount,sleeping:shared.sleepingCount})');
 for(const [boundary,visible] of [['06:00:00',false],['18:00:00',true]]){
  await evaluate(`shared.activeAwakePosts=[];globalThis.start=performance.now();NightClock.now=()=>Date.parse('2026-10-08T${boundary}+09:00')-300+performance.now()-start;go('home');document.querySelector('#share-dialog').showModal()`);
  await delay(600);
  assert.equal(await evaluate('!!document.querySelector(".roof-sky-card")'),visible,'Offline automatic boundary switch');
  assert(await evaluate('document.querySelector("#share-dialog").open'),'Boundary preserves open dialog');
  await evaluate(`document.querySelector('#share-dialog').close()`);
 }
 await evaluate(`NightClock.now=()=>Date.parse('2026-10-09T06:00:00+09:00');document.dispatchEvent(new Event('visibilitychange'))`);
 assert.equal(await evaluate('document.querySelector(".roof-sky-card")'),null,'Resume hides the daytime card');
 assert.equal(await evaluate('JSON.stringify({feed:shared.feed,posts:state.posts,trend:shared.trend,awake:shared.awakeCount,sleeping:shared.sleepingCount})'),before);
 await evaluate(`shared.tonightSummary={sleepingCount:40,coats:[{coat:'calico',count:40}],peakHours:[{hour:23,count:40}]};shared.sleepingCount=40;shared.trend=[{time:Date.parse('2026-10-08T06:00:00+09:00'),awake:2,sleeping:3},{time:Date.parse('2026-10-08T23:00:00+09:00'),awake:1,sleeping:40}];globalThis.recordsBefore=JSON.stringify(shared);go('home');globalThis.homeLowerBefore=document.querySelector('.section-heading').parentElement.outerHTML`);
 for(const width of [320,375,390,430]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
  let dayText;
  for(const hour of ['12','23']){
   await evaluate(`NightClock.now=()=>Date.parse('2026-10-08T${hour}:00:00+09:00');go('stats')`);
   assert.equal(await evaluate('document.querySelector("#navigation [data-view=stats]").textContent'),'みんなの記録');
   assert.equal(await evaluate('document.querySelector(".wordmark").textContent'),'みんなの記録');
   assert.equal(await evaluate('document.querySelector(".count-card h2").textContent'),'おやすみした人');
   assert.equal(await evaluate('document.querySelector(".count-card .count").textContent'),'40 人');
   assert.equal(await evaluate('document.querySelectorAll(".sleeping-cats .cat-scene").length'),32);
   assert.equal(await evaluate('document.querySelector(".peak-hours").textContent'),'23:00〜00:0040 人');
   assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
   assert(await evaluate(`!app.textContent.includes('今夜')&&!app.innerHTML.includes('今夜')`));
   const text=await evaluate('app.textContent');if(hour==='12')dayText=text;else assert.equal(text,dayText,'Records copy identical day and night');
  }
  const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});fs.writeFileSync(`test-results/records-copy-${width}.png`,Buffer.from(shot.data,'base64'));
 }
 assert.equal(await evaluate('JSON.stringify(shared)'),await evaluate('recordsBefore'),'Rendering leaves aggregate data unchanged');
 await evaluate(`go('home')`);
 assert.equal(await evaluate('document.querySelector(".section-heading").parentElement.outerHTML'),await evaluate('homeLowerBefore'),'Home lower feed unchanged');
 for(const [summary,count,label] of [[{sleepingCount:0,coats:[],peakHours:[]},0,'0 人'],[null,7,'7 人'],[null,null,'— 人']]){
  await evaluate(`shared.tonightSummary=${JSON.stringify(summary)};shared.sleepingCount=${JSON.stringify(count)};shared.trend=[];go('stats')`);
  assert.equal(await evaluate('document.querySelector(".count-card .count").textContent'),label);
  assert.equal(await evaluate('document.querySelectorAll(".sleeping-cats .cat-scene").length'),0);
  assert(await evaluate(`!app.innerHTML.includes('今夜')`),'Empty/failure copy is neutral');
 }
 await evaluate(`globalThis.savedNotes=[];OyasumiAPI.setProfileNote=async value=>{savedNotes.push(value);return value};NightClock.now=()=>Date.parse('2026-10-08T23:00:00+09:00');shared.userId='self-note';state.profileNote='自分のひとこと';shared.profileNote=state.profileNote;state.name='検証猫';state.posts=[];shared.feed=[{id:'mine',userId:'self-note',self:true,name:'検証猫',status:'awake',time:NightClock.now()-1000,coat:'calico',expression:'calm',profileNote:state.profileNote},{id:'peer',userId:'peer-note',self:false,name:'隣の猫',status:'sleep',time:NightClock.now()-1000,coat:'gray',expression:'calm',profileNote:'あ'.repeat(40)}];globalThis.notePostsBefore=shared.feed.map(p=>({id:p.id,status:p.status,time:p.time}));go('home')`);
 const submitNote=async(value,from='home')=>{
  await evaluate(`go(${JSON.stringify(from)});document.querySelector('[data-note-editor]').click();document.querySelector('#profile-note').value=${JSON.stringify(value)};document.querySelector('#note-form').requestSubmit()`);
  for(let i=0;i<60;i++){if(await evaluate('!busy'))break;await delay(50);}
 };
 for(const width of [320,375,390,430]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
  await submitNote('あ'.repeat(40));
  assert.equal(await evaluate('state.profileNote'),'あ'.repeat(40));
  assert.equal(await evaluate('document.querySelector(".home-note .profile-note-text").textContent'),'あ'.repeat(40));
  assert(await evaluate(`(()=>{const p=document.querySelector('.home-note .profile-note-text');return getComputedStyle(p).webkitLineClamp==='2'&&p.getBoundingClientRect().height<=48.1})()`),'Home note has at most two lines');
  await evaluate(`go('timeline')`);
  assert.equal(await evaluate('document.querySelectorAll(".timeline-profile-note").length'),2);
  assert.equal(await evaluate('document.querySelectorAll(".post [data-note-editor],.post input,.post [contenteditable]").length'),0,'Timeline notes are read only');
  assert(await evaluate(`Array.from(document.querySelectorAll('.timeline-profile-note')).every(p=>getComputedStyle(p).webkitLineClamp==='2'&&p.getBoundingClientRect().height<=41.7)`));
  assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
  let shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(`test-results/timeline-notes-${width}.png`,Buffer.from(shot.data,'base64'));
  await evaluate(`document.querySelector('[data-public-profile="peer"]').click()`);
  assert.equal(await evaluate('document.querySelector(".public-profile-note").textContent'),'あ'.repeat(40));
  assert.equal(await evaluate('document.querySelectorAll("#public-profile-dialog [data-note-editor],#public-profile-dialog input").length'),0);
  await evaluate(`document.querySelector('#public-profile-dialog').close();go('home');document.querySelector('[data-note-editor]').click()`);
  assert(await evaluate('document.querySelector("#note-dialog").scrollWidth<=document.querySelector("#note-dialog").clientWidth'));
  shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(`test-results/note-editor-${width}.png`,Buffer.from(shot.data,'base64'));
  await evaluate(`document.querySelector('#cancel-note').click()`);
  shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(`test-results/home-note-${width}.png`,Buffer.from(shot.data,'base64'));
 }
 const savedCount=await evaluate('savedNotes.length');
 for(const value of ['あ'.repeat(41),'https://example.jp','ねこ@example.jp','090-1234-5678','死♡ね','<script>','a\u200b']){
  await submitNote(value);
  assert(await evaluate('document.querySelector("#note-error").textContent.length>0'));
  assert.equal(await evaluate('savedNotes.length'),savedCount,'Invalid input never calls API');
  await evaluate(`document.querySelector('#cancel-note').click()`);
 }
 await submitNote('マイページで編集','profile');
 await evaluate(`go('home')`);assert.equal(await evaluate('document.querySelector(".home-note .profile-note-text").textContent'),'マイページで編集');
 assert.equal(await evaluate('shared.feed.find(p=>!p.self).profileNote'),'あ'.repeat(40),'Peer note unchanged');
 await evaluate(`go('home');document.querySelector('[data-note-editor]').click();document.querySelector('#delete-note').click()`);
 for(let i=0;i<60;i++){if(await evaluate('!busy'))break;await delay(50);}
 assert.equal(await evaluate('state.profileNote'),'');assert.equal(await evaluate('savedNotes.at(-1)'),'');
 await submitNote('投稿が消えても残る');
 await evaluate(`NightClock.now=()=>Date.parse('2026-10-09T02:00:00+09:00');go('timeline')`);
 assert.equal(await evaluate('document.querySelectorAll(".post").length'),0);
 await evaluate(`go('home');document.querySelector('[data-note-editor]').click()`);
 assert.equal(await evaluate('document.querySelector("#profile-note").value'),'投稿が消えても残る');
 await evaluate(`document.querySelector('#cancel-note').click();OyasumiAPI.setProfileNote=async()=>{throw Error('offline')}`);
 await submitNote('失敗した保存');
 assert.equal(await evaluate('state.profileNote'),'投稿が消えても残る');
 assert(await evaluate('document.querySelector("#note-dialog").open'),'Failed save stays editable');
 assert.equal(await evaluate('document.querySelector("#profile-note").value'),'失敗した保存');
 assert.deepEqual(await evaluate('shared.feed.map(p=>({id:p.id,status:p.status,time:p.time}))'),await evaluate('notePostsBefore'),'Note edits never modify posts');
 await evaluate(`document.querySelector('#cancel-note').click()`);
  for(const width of [320,375,390,430]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
  for(const [hour,period] of [['05','night'],['06','morning'],['11','morning'],['12','day'],['17','day'],['18','night']]){
   await evaluate(`NightClock.now=()=>Date.parse('2026-10-08T${hour}:00:00+09:00');document.querySelector('#public-profile-content').innerHTML=publicProfileRoom({name:'おへやの猫',coat:'calico',expression:'calm',catRole:'mechanic',profileNote:'あ'.repeat(40)});document.querySelector('#public-profile-dialog').showModal()`);
   assert.equal(await evaluate('document.querySelector(".cat-room").dataset.time'),period);
   assert.equal(await evaluate('document.querySelector(".public-profile-note").textContent'),'あ'.repeat(40));
   assert(await evaluate('document.querySelector("#public-profile-dialog").scrollWidth<=document.querySelector("#public-profile-dialog").clientWidth'));
   assert.equal(await evaluate('document.querySelectorAll("#public-profile-dialog [data-note-editor],#public-profile-dialog input").length'),0);
   if(['06','12','18'].includes(hour)){const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(`test-results/cat-room-${period}-${width}.png`,Buffer.from(shot.data,'base64'));}
   await evaluate('document.querySelector("#public-profile-dialog").close()');
  }
 }
 assert.equal(await evaluate('Object.keys(roomWhispers).length'),16);
 for(const role of await evaluate('CatRoles.options.filter(o=>o.cat).map(o=>o.id)')){
  assert(await evaluate(`publicProfileRoom({name:'猫',coat:'calico',expression:'calm',catRole:${JSON.stringify(role)}}).includes(roomWhispers[${JSON.stringify(role)}])`));
 }
 for(const role of [null,'private','unknown'])assert(await evaluate(`publicProfileRoom({name:'猫',coat:'calico',expression:'calm',catRole:${JSON.stringify(role)}}).includes('ここで、いっしょにひとやすみ。')`));
 for(const coat of await evaluate('CatFaces.coats.map(c=>c.id)'))assert(await evaluate(`publicProfileRoom({name:'猫',coat:${JSON.stringify(coat)},expression:'calm'}).includes(CatFaces.svg('calm',${JSON.stringify(coat)}))`));
 await evaluate(`document.querySelector('#public-profile-content').innerHTML=publicProfileRoom({name:'猫',coat:'calico',expression:'calm'});document.querySelector('#public-profile-dialog').showModal();NightClock.now=()=>Date.parse('2026-10-08T12:00:00+09:00');document.dispatchEvent(new Event('visibilitychange'))`);
 assert.equal(await evaluate('document.querySelector(".cat-room").dataset.time'),'day');
 await evaluate(`document.querySelector('#close-public-profile').click()`);
 assert.deepEqual(errors,[]);
 console.log('PASS home, records and notes: 320/375/390/430px; JST copy boundaries, records day/night, counts/hours/trend; own home/profile edit and deletion, 40/41-character screening, read-only two-line timeline notes, +3h editor retention, failed-save draft, unchanged posts and home lower feed.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{socket?.close();browser.kill();server.kill();});
