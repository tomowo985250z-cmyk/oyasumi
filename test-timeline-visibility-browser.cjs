const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const server=spawn(process.execPath,['server.js'],{stdio:'ignore'});
const browser=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=9344',`--user-data-dir=${fs.mkdtempSync(path.join(os.tmpdir(),'oyasumi-ui-'))}`,'about:blank'],{stdio:'ignore'});
let socket;
(async()=>{
 let tabs;for(let i=0;i<60;i++){try{tabs=await(await fetch('http://127.0.0.1:9344/json')).json();break;}catch{await delay(250);}}
 assert(tabs);socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
 let serial=0;const pending=new Map(),errors=[];
 socket.addEventListener('message',e=>{const d=JSON.parse(e.data);if(d.id){const p=pending.get(d.id);pending.delete(d.id);d.error?p.reject(d.error):p.resolve(d.result);}if(d.method==='Runtime.exceptionThrown')errors.push(d.params);});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;};
 await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Network.setBlockedURLs',{urls:['*supabase.co*']});
 await send('Page.navigate',{url:'http://127.0.0.1:3000/'});
 for(let i=0;i<60;i++){if(await evaluate('typeof go==="function"'))break;await delay(100);}



 await evaluate('globalThis.testNow=Date.parse("2026-10-07T23:00:00+09:00");NightClock.now=()=>testNow;NightClock.remaining=()=>86400000;ensureConnection=async()=>{};ready=true;globalThis.rawTimeline=["awake","sleep","try-sleep","early-sleep"].flatMap((status,index)=>[1,0,-1].map(delta=>({id:status+delta,userId:status+delta,status,time:testNow-10800000+delta,name:"???",coat:"calico",expression:"calm",self:index===0})));state.posts=structuredClone(rawTimeline);shared.feed=rawTimeline;shared.awakeCount=42;shared.sleepingCount=58;shared.trend=[{awake:42,sleeping:58,time:testNow}];globalThis.beforeData=JSON.stringify({feed:shared.feed,posts:state.posts,trend:shared.trend});OyasumiAPI.snapshot=async()=>({...shared,feed:rawTimeline,ownPosts:state.posts,reactions:state.reactions,name:state.name,expression:state.expression,coat:state.coat,clock:{serverNow:testNow,monotonicAt:performance.now(),resetAt:testNow+86400000}})');
 for(const width of [320,375,390,430]) {
  await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
  for(const [tab,count] of [['all',4],['awake',1],['sleep',3]]) {
   await evaluate('testNow=Date.parse("2026-10-07T23:00:00+09:00");shared.nightDate=SleepFlow.night(testNow);filter='+JSON.stringify(tab)+';go("timeline")');
   assert.equal(await evaluate('document.querySelectorAll(".post").length'),count);
   await evaluate('testNow++;document.dispatchEvent(new Event("visibilitychange"))');
   assert.equal(await evaluate('document.querySelectorAll(".post").length'),0,'Resume expires all tabs at exactly +3h');
   await evaluate('refreshShared()');
   assert.equal(await evaluate('document.querySelectorAll(".post").length'),0,'Refresh cannot restore expired rows');
   assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
  }
 }
 await evaluate('filter="all";globalThis.start=performance.now();NightClock.now=()=>Date.parse("2026-10-07T23:00:00+09:00")-1000+performance.now()-start;go("timeline");document.querySelector("#share-dialog").showModal()');
 assert.equal(await evaluate('document.querySelectorAll(".post").length'),12);
 await delay(1200);
 assert.equal(await evaluate('document.querySelectorAll(".post").length'),0,'Automatic timer without fetching');
 assert.equal(await evaluate('JSON.stringify({feed:shared.feed,posts:state.posts,trend:shared.trend})'),await evaluate('beforeData'),'History, raw feed and chart data survive');
 assert.equal(await evaluate('shared.awakeCount+shared.sleepingCount'),100);
 assert.equal(await evaluate('allPosts().length'),12,'Home feed and stored records unchanged');
 assert(await evaluate('document.querySelector("#share-dialog").open'),'Expiry preserves open dialogs');
 await evaluate('document.querySelector("#share-dialog").close();NightClock.now=()=>testNow;testNow=Date.parse("2026-10-07T23:00:00+09:00");shared.activeAwakePosts=rawTimeline.filter(p=>p.status==="awake");go("home")');
 for(const width of [320,375,390,430]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
  await evaluate('testNow=Date.parse("2026-10-07T23:00:00+09:00");go("home")');
  assert.equal(await evaluate('activeAwakeCount()'),1);
  assert.equal(await evaluate('document.querySelectorAll(".roof-cat").length'),1);
  assert.equal(await evaluate('document.querySelectorAll(".mini-row").length'),5);
  await evaluate('testNow++;document.dispatchEvent(new Event("visibilitychange"))');
  assert.equal(await evaluate('activeAwakeCount()'),0);
  assert.equal(await evaluate('document.querySelectorAll(".roof-cat").length'),0);
  assert.equal(await evaluate('document.querySelectorAll(".mini-row").length'),5,'Home everyone feed survives expiry');
  assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
 }
 await evaluate('globalThis.start=performance.now();NightClock.now=()=>Date.parse("2026-10-07T23:00:00+09:00")-1000+performance.now()-start;go("home")');
 assert.equal(await evaluate('activeAwakeCount()'),3);
 await delay(1200);assert.equal(await evaluate('document.querySelectorAll(".roof-cat").length'),0,'Home expiry timer works offline');
 assert.equal(await evaluate('document.querySelectorAll(".mini-row").length'),5);
 await evaluate('OyasumiAPI.snapshot=()=>new Promise(()=>{});shared.clock={};shared.nightDate="2026-10-07";NightClock.night=()=>"2026-10-08";NightClock.now=()=>Date.parse("2026-10-08T06:00:00+09:00");checkNightBoundary()');
 assert.equal(await evaluate('document.querySelectorAll(".mini-row").length'),0,'Home everyone feed clears only at 06:00');
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`globalThis.facesMock={initialize:async()=> 'expiry-test',snapshot:async()=>({userId:'expiry-test',name:'Expiry test',expression:'calm',coat:'calico',ownPosts:[{id:'expired',status:'awake',time:Date.now()-10801000}],reactions:{},feed:[{id:'expired',status:'awake',time:Date.now()-10801000,name:'Expiry test',coat:'calico',expression:'calm'}],reactionCounts:{},awakeCount:1,sleepingCount:0,ownSleepCount:0,nightDate:null,trend:[],trendSupported:false,catCoatStatus:{nextChangeAt:null}})};Object.defineProperty(globalThis,'OyasumiAPI',{get:()=>facesMock,set:()=>{},configurable:true});`});
 await send('Page.reload');
 for(let i=0;i<60;i++){if(await evaluate('typeof ready!=="undefined"&&ready'))break;await delay(100);}
 assert(await evaluate('ready'),'Reload snapshot is ready');
 await evaluate('go("timeline")');
 assert.equal(await evaluate('document.querySelectorAll(".post").length'),0,'Fresh startup/reload hides old server posts');
 await evaluate('go("profile")');
 assert.equal(await evaluate('document.querySelectorAll(".history-row").length'),1,'Reload retains expired history');
 assert.deepEqual(errors,[]);
 console.log('PASS expiry browser: timeline and home awake count/cats expire at +3h across 320/375/390/430px, resume/offline timer; home everyone feed stays until 06:00, history/counts/trend retained.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{socket?.close();browser.kill();server.kill();});
