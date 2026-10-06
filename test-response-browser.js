// Run: node test-response-browser.js (requires Edge, or EDGE_PATH).
// Controlled RPC/read promises exercise response ordering without writing to Supabase.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const server=spawn(process.execPath,['server.js'],{stdio:'ignore'});
const browser=spawn(process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=9345',`--user-data-dir=${fs.mkdtempSync(path.join(os.tmpdir(),'oyasumi-response-'))}`,'about:blank'],{stdio:'ignore'});
let socket;
(async()=>{
 let tabs;for(let i=0;i<60;i++){try{tabs=await(await fetch('http://127.0.0.1:9345/json')).json();break;}catch{await delay(250);}}
 assert(tabs,'Browser started');socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
 let serial=0;const pending=new Map(),errors=[];
 socket.addEventListener('message',e=>{const d=JSON.parse(e.data);if(d.id){const p=pending.get(d.id);pending.delete(d.id);d.error?p.reject(d.error):p.resolve(d.result);}if(d.method==='Runtime.exceptionThrown')errors.push(d.params);});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;};
 const wait=async(expression)=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await delay(25);}throw Error('Timed out: '+expression);};
 await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Network.setBlockedURLs',{urls:['*supabase.co*']});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:'globalThis.testIntervals=[];const originalInterval=setInterval;globalThis.setInterval=(fn,ms,...args)=>{testIntervals.push({fn,ms});return originalInterval(fn,ms,...args)}'});
 await send('Page.navigate',{url:'http://127.0.0.1:3000/'});await wait('typeof go==="function"');
 await evaluate('connectionPromise?.catch(()=>{})');
 await evaluate(`
 globalThis.testClock=(now=Date.parse('2026-10-06T01:00:00+09:00'))=>({serverNow:now,monotonicAt:performance.now(),resetAt:Date.parse(SleepFlow.night(now)+'T06:00:00+09:00')+86400000,nightDate:SleepFlow.night(now)});
 globalThis.testOwn=()=>({id:'own',userId:'self',self:true,name:'検証猫',status:'awake',coat:'calico',expression:'calm',time:NightClock.now(),nightDate:NightClock.night()});
 globalThis.testSnapshot=()=>structuredClone({...shared,clock:testClock(NightClock.now()),nightDate:NightClock.night(),name:state.name,expression:state.expression,coat:state.coat,catRole:state.catRole,profileNote:state.profileNote,ownPosts:state.posts,reactions:state.reactions,sleepingCount:42,catCoatStatus:shared.catCoatStatus||{nextChangeAt:NightClock.now()+30*86400000}});
 globalThis.testReset=()=>{clearTimeout(restTimer);clearReactionEffect();document.querySelectorAll('dialog[open]').forEach(d=>d.close());NightClock.sync(testClock());state={...freshState(),name:'検証猫',coat:'calico',catRole:'independent',profileNote:'以前のひとこと'};shared={userId:'self',name:state.name,expression:'calm',coat:'calico',catRole:state.catRole,profileNote:state.profileNote,needsNickname:false,needsCat:false,profileComplete:true,catCoatStatus:{nextChangeAt:null},clock:testClock(),nightDate:NightClock.night(),feed:[{id:'peer',userId:'other',name:'相手猫',status:'sleep',time:NightClock.now(),coat:'gray',expression:'sleepy'}],ownPosts:[],reactions:{},reactionCounts:{peer:{goodnight:3,dream:4,tomorrow:5,comfort:6}},awakeCount:12,sleepingCount:42,morningReactions:null};ready=true;busy=false;refreshQueued=false;refreshSaved=false;connectionPromise=Promise.resolve('self');globalThis.reads=[];globalThis.writes=[];go('home')};
 for(const method of ['submitPost','setReaction','deletePost','setCatExpression','setCatCoat','setNickname','setProfileNote','setCatRole'])OyasumiAPI[method]=(...args)=>new Promise((resolve,reject)=>writes.push({method,args,resolve,reject}));
 OyasumiAPI.snapshot=()=>new Promise((resolve,reject)=>reads.push({snapshot:testSnapshot(),resolve,reject}));testReset();
 `);
 const drain=async()=>{for(let i=0;i<100;i++){await evaluate('while(reads.length)reads.shift().resolve(testSnapshot())');if(await evaluate('!refreshPromise&&!refreshQueued'))return;await delay(25);}throw Error('Refresh did not settle');};
 const operations=[
  {method:'submitPost',setup:'go("home")',tap:'document.querySelector("[data-post=awake]").click()',field:'state.posts.length',before:0,after:1,result:{id:'posted',user_id:'self',choice:'awake',created_at:'2026-10-06T01:00:00+09:00',night_date:'2026-10-05',event_order:7}},
  {method:'setReaction',setup:'go("timeline")',tap:'document.querySelector("[data-reaction=goodnight]").click()',field:'state.reactions.peer||null',before:null,after:'goodnight',result:'goodnight'},
  {method:'deletePost',setup:'state.posts=[testOwn()];shared.feed.push(testOwn());go("timeline")',tap:'document.querySelector("[data-delete]").click()',field:'state.posts.length',before:1,after:0,result:true},
  {method:'setCatExpression',setup:'go("profile");document.querySelector("[data-expression-picker]").click()',tap:'document.querySelector("[data-expression=sleepy]").click()',field:'state.expression',before:'calm',after:'sleepy',result:'sleepy'},
  {method:'setCatCoat',setup:'go("settings");document.querySelector("[data-coat-picker]").click()',tap:'document.querySelector("[data-coat=gray]").click()',field:'state.coat',before:'calico',after:'gray',result:'gray'},
  {method:'setNickname',setup:'go("settings");document.querySelector("[data-name]").click();document.querySelector("#nickname").value="応答猫"',tap:'document.querySelector("#nickname-form").requestSubmit()',field:'state.name',before:'検証猫',after:'応答猫',result:'応答猫'},
  {method:'setProfileNote',setup:'go("profile");document.querySelector("[data-note-editor]").click();document.querySelector("#profile-note").value="新しいひとこと"',tap:'document.querySelector("#note-form").requestSubmit()',field:'state.profileNote',before:'以前のひとこと',after:'新しいひとこと',result:'新しいひとこと'},
  {method:'setCatRole',setup:'go("settings");document.querySelector("[data-role-picker]").click();selectRole(CatRoles.options.findIndex(o=>o.id==="mechanic"),true)',tap:'document.querySelector("#role-form").requestSubmit()',field:'state.catRole',before:'independent',after:'mechanic',result:'mechanic'}
 ];
 for(const op of operations){
  await evaluate('testReset();'+op.setup+';'+op.tap);await wait('writes.length===1');
  assert.equal(await evaluate('writes[0].method'),op.method);assert.equal(await evaluate(op.field),op.before,'No optimistic data changes: '+op.method);
  await evaluate(op.tap+';'+op.tap);assert.equal(await evaluate('writes.length'),1,'Double submit prevented');
  await evaluate('writes[0].resolve('+JSON.stringify(op.result)+')');await wait('!busy&&reads.length===1');
  assert.equal(await evaluate(op.field),op.after,'UI changes without read completion: '+op.method);
  assert.equal(await evaluate('document.querySelector("dialog[open]")'),null,'Successful edit closes immediately');
  if(op.method==='submitPost')assert.equal(await evaluate('view'),'timeline');
  if(op.method==='setCatCoat')assert.equal(await evaluate('CatCoatCooldown.available(shared.catCoatStatus,NightClock.now())'),false,'Coat remains locked until authoritative status');
  await evaluate('reads.shift().reject(new Error("Read offline"))');await wait('!refreshPromise');
  assert.equal(await evaluate(op.field),op.after,'Read failure does not roll back saved data');assert.equal(await evaluate('document.querySelector("#toast").textContent'),'保存済み。表示は後で更新します。');
  await evaluate('testReset();'+op.setup+';'+op.tap);await wait('writes.length===1');await evaluate('writes[0].reject(new Error("Save offline"))');await wait('!busy');
  assert.equal(await evaluate(op.field),op.before,'RPC failure leaves data unchanged: '+op.method);assert.equal(await evaluate('reads.length'),0);assert.equal(await evaluate('document.querySelector(".reaction-heart")'),null);
 }
 console.log('PASS all eight RPC operations: confirmed updates before reads, duplicate prevention, write failure and read-only failure.');
 // A second write must proceed while the first write's read is still pending.
 await evaluate('testReset();go("timeline");document.querySelector("[data-reaction=goodnight]").click()');await wait('writes.length===1');await evaluate('writes[0].resolve("goodnight")');await wait('!busy&&reads.length===1');
 await evaluate('document.querySelector("[data-reaction=dream]").click()');await wait('writes.length===2');await evaluate('writes[1].resolve("dream")');await wait('!busy');
 await evaluate('{const old=reads.shift();old.resolve(old.snapshot)}');await wait('reads.length===1');assert.equal(await evaluate('state.reactions.peer'),'dream','Stale response cannot restore earlier reaction');await drain();
 // The actual 30-second callback still reads data, and cannot block or overwrite a write.
 await evaluate('testIntervals.find(t=>t.ms===30000&&t.fn.toString().includes("refreshDayScene")).fn()');await wait('reads.length===1');
 await evaluate('document.querySelector("[data-reaction=comfort]").click()');await wait('writes.length===3');await evaluate('{const old=reads.shift();old.resolve(old.snapshot)}');await delay(30);assert.equal(await evaluate('state.reactions.peer'),'dream');
 await evaluate('writes[2].resolve("comfort")');await wait('!busy');await drain();assert.equal(await evaluate('state.reactions.peer'),'comfort');
 // Saving a sleep post transitions first, then fills its count without restarting the animation.
 await evaluate('testReset();document.querySelector("[data-post=sleep]").click()');await wait('writes.length===1');
 const sleepRow={...operations[0].result,id:'sleep-post',choice:'sleep'};await evaluate('writes[0].resolve('+JSON.stringify(sleepRow)+')');await wait('!busy&&reads.length===1');
 assert.equal(await evaluate('view'),'sleep');assert.equal(await evaluate('state.lastSleep.count'),null);const started=await evaluate('sleepShownAt');await drain();assert.equal(await evaluate('state.lastSleep.count'),42);assert.equal(await evaluate('sleepShownAt'),started);
 // Discard both an old snapshot and an old-night post when 06:00 passes during an RPC.
 await evaluate('testReset();NightClock.sync(testClock(Date.parse("2026-10-06T05:59:59+09:00")));shared.clock=testClock(NightClock.now());shared.nightDate=NightClock.night();void refreshShared();document.querySelector("[data-post=sleep]").click()');await wait('writes.length===1&&reads.length===1');
 await evaluate('NightClock.sync(testClock(Date.parse("2026-10-06T06:00:01+09:00")));checkNightBoundary();const old=reads.shift();old.snapshot.name="古い名前";old.resolve(old.snapshot)');await delay(30);
 const oldSleep={...sleepRow,created_at:'2026-10-06T05:59:59+09:00'};await evaluate('writes[0].resolve('+JSON.stringify(oldSleep)+')');await wait('!busy');
 assert.equal(await evaluate('view'),'morning');assert.equal(await evaluate('shared.nightDate'),'2026-10-06');assert.equal(await evaluate('shared.feed.length'),0);assert.equal(await evaluate('state.name'),'検証猫');await drain();
 // First-time profile prerequisites must be confirmed locally before the read finishes.
 await evaluate('testReset();shared.needsNickname=true;shared.profileComplete=false;go("settings");document.querySelector("[data-name]").click();document.querySelector("#nickname").value="応答猫";document.querySelector("#nickname-form").requestSubmit()');await wait('writes.length===1');await evaluate('writes[0].resolve("応答猫")');await wait('!busy');assert.equal(await evaluate('shared.profileComplete'),true);await drain();
 // Server cooldown rejection must not be described as a successful save.
 await evaluate('testReset();'+operations[4].setup+';'+operations[4].tap);await wait('writes.length===1');await evaluate('writes[0].reject({code:"P0030"})');await wait('!busy&&reads.length===1');await evaluate('reads.shift().reject(new Error("Read offline"))');await wait('!refreshPromise');assert(!await evaluate('document.querySelector("#toast").textContent.includes("保存済み")'));
 console.log('PASS subsequent writes during reads, stale response rejection, periodic refresh, sleep count, 06:00 boundary, profile prerequisites and cooldown.');
 for(const width of [320,375,390,430]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
  await evaluate('testReset();go("timeline")');await evaluate('document.fonts.ready');
  for(const choice of ['goodnight','dream','tomorrow','comfort']){
   const n=await evaluate('writes.length');await evaluate('document.querySelector("[data-reaction='+choice+']").click()');await wait('writes.length==='+Number(n+1));
   assert.equal(await evaluate('document.querySelectorAll(".reaction-heart").length'),1);assert.equal(await evaluate('document.querySelectorAll(".reaction-delivery").length'),0);assert(!await evaluate('document.body.textContent.includes("届きました")'));
   assert.deepEqual(await evaluate('(()=>{const e=document.querySelector(".reaction-heart"),s=getComputedStyle(e);return [e.textContent,s.fontSize,s.color,s.animationName,s.animationDuration]})()'),['♥','24px','rgba(255, 126, 161, 0.85)','reaction-heart-float','1s']);
   await evaluate('document.querySelector(".reaction-heart").getAnimations().forEach(a=>{a.pause();a.currentTime=350})');
   assert(await evaluate('(()=>{const h=document.querySelector(".reaction-heart").getBoundingClientRect(),c=document.querySelector(".public-profile-cat").getBoundingClientRect();return h.left>=0&&h.right<=innerWidth&&h.top>=0&&h.bottom<=c.top+2&&Math.abs((h.left+h.right-c.left-c.right)/2)<1})()'),'Heart near head with no overflow');
   assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
   if(choice==='comfort'){const shot=await send('Page.captureScreenshot',{format:'png'});fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/response-heart-'+width+'.png',Buffer.from(shot.data,'base64'));}
   await evaluate('writes['+n+'].resolve('+JSON.stringify(choice)+')');await wait('!busy');await drain();
   assert.equal(await evaluate('document.querySelector("#toast").textContent'),'リアクションを保存しました');await delay(1100);assert.equal(await evaluate('document.querySelector(".reaction-heart")'),null,'Acknowledgement does not replay heart');
  }
  console.log('PASS '+width+'px: four heart-only tap effects, head position, 24px bright pink, unchanged float and no overflow.');
 }
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await evaluate('testReset();go("timeline");document.querySelector("[data-reaction=comfort]").click()');await wait('writes.length===1');assert.equal(await evaluate('getComputedStyle(document.querySelector(".reaction-heart")).animationName'),'reaction-heart-fade');await evaluate('writes[0].resolve("comfort")');await wait('!busy');await drain();
 assert.deepEqual(errors,[]);console.log('PASS reduced motion and no browser exceptions.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{socket?.close();browser.kill();server.kill();});
