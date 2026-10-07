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


 await evaluate('refreshShared=async()=>{};ensureConnection=async()=>{};NightClock.remaining=()=>null;state.morningDays=[]');
 const reports=['2026-10-07T06:10:00+09:00','2026-10-07T12:00:00+09:00','2026-10-07T20:00:00+09:00','2026-10-07T23:30:00+09:00'];
 for(const width of [320,375,390,430]) {
  await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
  for(const report of reports) {
   const end=Date.parse(report)+3*3600000;
   await evaluate('globalThis.testEnd='+end+';NightClock.now=()=>testEnd;state.lastSleep={at:'+JSON.stringify(report)+',finished:true};go(SleepFlow.openView(state.lastSleep,[],NightClock.now()))');
   assert.equal(await evaluate('view'),'home','Saved state at +3h');
   await evaluate('go("rest");document.dispatchEvent(new Event("visibilitychange"))');
   assert.equal(await evaluate('view'),'home','Resume at +3h');
   await evaluate('globalThis.timerStart=performance.now();NightClock.now=()=>testEnd-80+performance.now()-timerStart;go("rest");syncSleepView()');
   assert.equal(await evaluate('view'),'rest','Before three hours');
   await delay(200);
   assert.equal(await evaluate('view'),'home','Actual expiry timer without server connection');
   assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
  }
  await evaluate('NightClock.now=()=>Date.parse("2026-10-07T18:00:00+09:00");state.lastSleep={at:"2026-10-07T17:00:00+09:00",finished:true};go("rest");syncSleepView()');
  assert.equal(await evaluate('view'),'rest','18:00 cannot shorten sleep');
  await evaluate('NightClock.now=()=>Date.parse("2026-10-07T06:00:00+09:00");state.lastSleep={at:"2026-10-07T05:59:00+09:00",finished:true};go("rest");syncSleepView()');
  assert.equal(await evaluate('view'),'rest','06:00 cannot shorten sleep');
  await evaluate('state.lastSleep.finished=false;go("sleep");syncSleepView()');
  assert.equal(await evaluate('view'),'sleep','06:00 cannot interrupt the pending animation');
 }
 await evaluate('state.lastSleep={at:"2026-10-07T20:00:00+09:00",finished:true};save()');
 await send('Page.addScriptToEvaluateOnNewDocument',{source:'Date.now=()=>Date.parse("2026-10-07T23:00:00+09:00")-3000+performance.now()'});
 await send('Page.reload',{ignoreCache:true});await delay(200);
 for(let i=0;i<60;i++){if(await evaluate('typeof go==="function"'))break;await delay(50);}
 assert.equal(await evaluate('view'),'rest','Actual offline startup before expiry');
 await delay(3100);
 assert.equal(await evaluate('view'),'home','Actual offline startup schedules expiry');
 await send('Page.addScriptToEvaluateOnNewDocument',{source:'Date.now=()=>Date.parse("2026-10-07T23:00:00+09:00")'});
 await send('Page.reload',{ignoreCache:true});await delay(200);
 for(let i=0;i<60;i++){if(await evaluate('typeof go==="function"'))break;await delay(50);}
 assert.equal(await evaluate('view'),'home','Actual startup with expired saved state');
 assert.deepEqual(errors,[]);
 console.log('PASS sleep duration browser: all four report examples at 320/375/390/430px; +3h startup/resume/timer/offline/saved state; 06:00/18:00 do not shorten sleep.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{socket?.close();browser.kill();server.kill();});
