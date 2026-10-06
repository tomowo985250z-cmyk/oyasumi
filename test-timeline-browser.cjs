const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn,execFileSync}=require('node:child_process');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const original=execFileSync('git',['show','HEAD:style.css'],{encoding:'utf8'});
const updated=fs.readFileSync('style.css','utf8');
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
 await evaluate('refreshShared=async()=>{};ensureConnection=async()=>{};shared.feed=[{id:"ui-peer",userId:"peer",name:"テスト猫",coat:"calico",expression:"sleepy",status:"awake",time:Date.now(),self:false}];shared.reactionCounts={"ui-peer":{goodnight:12,dream:345,tomorrow:6,comfort:789}};document.querySelector("link[rel=stylesheet]").disabled=true;globalThis.uiStyle=document.createElement("style");document.head.append(uiStyle)');
 await evaluate('uiStyle.textContent='+JSON.stringify(updated));
 await evaluate('globalThis.timelineFixture=[{id:"t-awake",userId:"peer",name:"Awake",coat:"calico",expression:"calm",status:"awake",self:false},{id:"t-sleep",userId:"sleep-peer",name:"Sleep",coat:"gray",expression:"sleepy",status:"sleep",self:false},{id:"t-try",userId:"try-peer",name:"Try",coat:"orange",expression:"calm",status:"try-sleep",self:false},{id:"t-early",userId:"early-peer",name:"Early",coat:"black",expression:"calm",status:"early-sleep",self:false}].map(p=>({...p,time:Date.now()}));state.posts=[];shared.feed=timelineFixture');
 const oldApp=execFileSync('git',['show','HEAD:app.js'],{encoding:'utf8'});
 const homeSource=oldApp.match(/function home\(\) \{[^\n]+/)[0];
 const countSource=oldApp.match(/function countCard\(\) \{[^\n]+/)[0];
 const actionSource=oldApp.match(/function actions\(\) \{[^\n]+/)[0];
 assert.equal(await evaluate('home.toString()'),homeSource);assert.equal(await evaluate('countCard.toString()'),countSource);assert.equal(await evaluate('actions.toString()'),actionSource);
 for(const width of [320,375,390,430]){
 await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});await evaluate('filter="all";shared.feed=timelineFixture;go("home")');
 const home=await evaluate('(()=>{const c=document.querySelector("main").cloneNode(true);c.querySelector(".dark-mode-hint")?.remove();return c.innerHTML})()');
 await evaluate('document.querySelector("nav [data-view=timeline]").click()');
 assert.equal(await evaluate('typeof timeline()'),'string');assert.equal(await evaluate('document.querySelectorAll(".post").length'),4);assert.equal(await evaluate('document.querySelectorAll(".reaction-options .reaction").length'),16);assert.equal(await evaluate('document.querySelectorAll("[data-public-profile]").length'),4);assert.equal(await evaluate('document.querySelectorAll("[data-delete]").length'),0);
 for(const [key,count] of [['awake',1],['sleep',3],['all',4]]){
 await evaluate('document.querySelector("[data-filter='+key+']").click()');assert.equal(await evaluate('document.querySelectorAll(".post").length'),count);assert.equal(await evaluate('document.querySelector("[data-filter='+key+']").getAttribute("aria-pressed")'),'true');
 assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
 }
 await evaluate('shared.feed=[];render()');assert(await evaluate('!!document.querySelector(".empty")&&!document.querySelector(".post")&&document.querySelector("main").textContent!=="undefined"'));
 await evaluate('shared.feed=timelineFixture;document.querySelector("nav [data-view=home]").click()');assert.equal(await evaluate('(()=>{const c=document.querySelector("main").cloneNode(true);c.querySelector(".dark-mode-hint")?.remove();return c.innerHTML})()'),home);
 for(const screen of ['profile','settings','stats']){await evaluate('go('+JSON.stringify(screen)+')');assert(await evaluate('document.querySelector("main").textContent.length>0&&document.querySelector("main").textContent!=="undefined"'));}
 console.log('PASS '+width+'px: timeline, 3 filters, 4 statuses, reactions/profile controls, empty state, navigation; home unchanged');
 }
 assert.deepEqual(errors,[]);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{socket?.close();browser.kill();server.kill();});