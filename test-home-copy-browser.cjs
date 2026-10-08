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
   assert.equal(await evaluate('document.querySelector(".awake-heading>span").textContent'),day?'最近の投稿':'今夜まだ起きてる人');
   assert.equal(await evaluate('document.querySelector("[data-trend-comment]").textContent'),day?'ここには、誰かがいるみたい':'今夜も、ひとりじゃないみたい');
   assert.equal(await evaluate('activeAwakeCount()'),1);assert.equal(await evaluate('document.querySelectorAll(".roof-cat").length'),1);
   assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
   assert(await evaluate(`(()=>{const a=document.querySelector('.awake-heading>span').getBoundingClientRect(),b=document.querySelector('.count').getBoundingClientRect();return a.right<=b.left})()`),'Heading and count do not overlap');
   if(time==='12:00:00.000'||time==='18:00:00.000'){
    const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(`test-results/home-copy-${day?'day':'night'}-${width}.png`,Buffer.from(shot.data,'base64'));
   }
  }
 }
 const before=await evaluate('JSON.stringify({feed:shared.feed,posts:state.posts,trend:shared.trend,awake:shared.awakeCount,sleeping:shared.sleepingCount})');
 for(const [boundary,heading] of [['06:00:00','最近の投稿'],['18:00:00','今夜まだ起きてる人']]){
  await evaluate(`shared.activeAwakePosts=[];globalThis.start=performance.now();NightClock.now=()=>Date.parse('2026-10-08T${boundary}+09:00')-300+performance.now()-start;go('home');document.querySelector('#share-dialog').showModal()`);
  await delay(600);
  assert.equal(await evaluate('document.querySelector(".awake-heading>span").textContent'),heading,'Offline automatic boundary switch');
  assert(await evaluate('document.querySelector("#share-dialog").open'),'Boundary preserves open dialog');
  await evaluate(`document.querySelector('#share-dialog').close()`);
 }
 await evaluate(`NightClock.now=()=>Date.parse('2026-10-09T06:00:00+09:00');document.dispatchEvent(new Event('visibilitychange'))`);
 assert.equal(await evaluate('document.querySelector(".awake-heading>span").textContent'),'最近の投稿','Resume updates copy');
 assert.equal(await evaluate('JSON.stringify({feed:shared.feed,posts:state.posts,trend:shared.trend,awake:shared.awakeCount,sleeping:shared.sleepingCount})'),before);
 assert.deepEqual(errors,[]);
 console.log('PASS home copy: JST boundaries in foreign timezone, 320/375/390/430px, offline automatic switch, resume, dialogs, three-hour count/cats and aggregates preserved.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{socket?.close();browser.kill();server.kill();});
