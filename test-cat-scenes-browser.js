const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'oyasumi-scenes-'));
const server=spawn(process.execPath,['server.js'],{stdio:'ignore'});
const browser=spawn(process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=9345',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
let socket;
(async()=>{
 let tabs;for(let i=0;i<60;i++){try{tabs=await(await fetch('http://127.0.0.1:9345/json')).json();break;}catch{await delay(250);}}
 assert(tabs,'Browser started');socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
 let serial=0;const pending=new Map(),errors=[],failedImages=[];
 socket.addEventListener('message',e=>{const d=JSON.parse(e.data);if(d.id){const p=pending.get(d.id);pending.delete(d.id);clearTimeout(p.timer);d.error?p.reject(d.error):p.resolve(d.result);}if(d.method==='Runtime.exceptionThrown')errors.push(d.params);if(d.method==='Network.responseReceived'&&d.params.response.url.includes('/assets/sleep-wake-cats/')&&d.params.response.status!==200)failedImages.push(d.params.response.url);});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;const timer=setTimeout(()=>reject(Error(method+' timed out')),30000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;};
 const waitFor=async expression=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await delay(100);}throw Error(expression);};
 const screenshot=async name=>{await delay(150);const shot=await send('Page.captureScreenshot',{format:'png'});fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync(`test-results/${name}.png`,Buffer.from(shot.data,'base64'));};
 await send('Runtime.enable');await send('Page.enable');await send('Network.enable');
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`globalThis.sceneMock={userId:'scene-preview',needsNickname:false,initialize:async()=> 'scene-preview',snapshot:async()=>({userId:'scene-preview',name:'検証猫',expression:'calm',coat:'calico',catRole:null,profileNote:null,profileComplete:true,ownPosts:[],reactions:{},feed:[],reactionCounts:{},awakeCount:0,sleepingCount:0,ownSleepCount:0,nightDate:'2026-10-05',trend:[],trendSupported:false,expressionSupported:true,myState:null,catCoatStatus:{nextChangeAt:null}})};Object.defineProperty(globalThis,'OyasumiAPI',{get:()=>sceneMock,set:()=>{},configurable:true});`});
 await send('Page.navigate',{url:'http://127.0.0.1:3000'});await waitFor('typeof ready!=="undefined"&&ready&&!busy');
 await evaluate('globalThis.baseSceneSnapshot=sceneMock.snapshot;globalThis.sceneCoat="calico";sceneMock.snapshot=async()=>({...await baseSceneSnapshot(),coat:sceneCoat})');
 const loadImages=()=>evaluate(`(async()=>{const images=[...document.querySelectorAll('.cat-scene image')];await Promise.all(images.map(el=>new Promise((resolve,reject)=>{const img=new Image();img.onload=resolve;img.onerror=()=>reject(new Error(el.getAttribute('href')));img.src=el.getAttribute('href')})));return images.length})()`);
 for(const width of [320,375,390,430]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
  for(const coat of ['calico','orange','brown','silver','black','white','tuxedo','gray','manul','sand','black-footed','fishing','snow-leopard','leopard','cheetah','jaguar']){
   for(const screen of ['rest','morning']){
    await evaluate(`sceneCoat=${JSON.stringify(coat)};state.coat=sceneCoat;state.lastSleep={finished:true,finishedAt:new Date().toISOString()};go(${JSON.stringify(screen)})`);
    assert.equal(await loadImages(),1);
    assert.equal(await evaluate('document.querySelector(".cat-scene").dataset.catCoat'),coat);
    assert.equal(await evaluate('document.querySelector(".cat-scene").dataset.catScene'),screen==='rest'?'sleeping':'awake');
    assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
    assert(await evaluate('(()=>{const r=document.querySelector(".cat-scene").getBoundingClientRect();return r.width>80&&Math.abs(r.width-r.height)<1})()'));
    if(coat==='calico')await screenshot(`cat-${screen}-${width}`);
    if(['snow-leopard','leopard','cheetah','jaguar'].includes(coat)){
     assert.equal(await evaluate('getComputedStyle(document.querySelector(".cat-scene")).borderRadius'),'50%');
     if(coat==='jaguar')await screenshot(`big-cat-${screen}-${width}`);
    }
   }
   if(['snow-leopard','leopard','cheetah','jaguar'].includes(coat))for(const action of ['relax','play','groom','doze','gaze']){
    await evaluate(`DayCats={...DayCats,current:()=>({id:${JSON.stringify(action)},label:'昼猫',key:${JSON.stringify(action)}})};go('home')`);
    await evaluate('document.querySelector(".day-cat-image").decode()');
    assert.equal(await evaluate('document.querySelector(".day-cat-image").dataset.catCoat'),coat);
    assert.equal(await evaluate('document.querySelector(".day-cat-image").dataset.dayScene'),action);
    assert(await evaluate('(()=>{const e=document.querySelector(".day-cat-image"),r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>150&&Math.abs(r.width-r.height)<1&&s.borderRadius==="50%"&&s.objectFit==="cover"&&document.documentElement.scrollWidth<=innerWidth})()'));
    if(coat==='jaguar')await screenshot(`big-cat-day-${action}-${width}`);
   }
  }
 }
 await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
 await evaluate('document.body.style.cssText="display:block;margin:0;padding:12px";document.body.innerHTML=`<div style="display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:8px">${["sleeping","awake"].flatMap(s=>CatFaces.coats.map(c=>`<div>${CatScenes.svg(s,c.id)}<small>${c.label} ${s}</small></div>`)).join("")}</div>`;document.querySelectorAll(".cat-scene").forEach(el=>el.style.cssText="width:100%;height:auto")');
 assert.equal(await loadImages(),32);await screenshot('cat-scenes-matrix');
 assert.deepEqual(errors,[]);assert.deepEqual(failedImages,[]);
 console.log('PASS scene browser: 32 sleep/wake images and 20 dedicated big-cat day images, actual screens at 320/375/390/430px, circular square frames, no overflow or runtime errors.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{socket?.close();browser.kill();server.kill();});
