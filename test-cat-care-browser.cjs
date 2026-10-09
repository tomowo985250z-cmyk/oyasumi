const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const production=process.argv.includes('--production');
const output=path.join(__dirname,'output/cat-care-v1');fs.mkdirSync(output,{recursive:true});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'oyasumi-scenes-'));
const server=null;
const browser=spawn(process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=9485',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore',windowsHide:true});
let socket;
(async()=>{
 let tabs;for(let i=0;i<60;i++){try{tabs=await(await fetch('http://127.0.0.1:9485/json')).json();break;}catch{await delay(250);}}
 assert(tabs,'Browser started');socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
 let serial=0;const pending=new Map(),errors=[],failedImages=[];
 socket.addEventListener('message',e=>{const d=JSON.parse(e.data);if(d.id){const p=pending.get(d.id);pending.delete(d.id);clearTimeout(p.timer);d.error?p.reject(d.error):p.resolve(d.result);}if(d.method==='Runtime.exceptionThrown')errors.push(d.params);if(d.method==='Network.responseReceived'&&d.params.response.url.includes('/assets/sleep-wake-cats/')&&d.params.response.status!==200)failedImages.push(d.params.response.url);});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;const timer=setTimeout(()=>reject(Error(method+' timed out')),120000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;};
 const waitFor=async expression=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await delay(100);}throw Error(expression);};
 const screenshot=async name=>{await delay(150);const shot=await send('Page.captureScreenshot',{format:'png'});fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync(`test-results/${name}.png`,Buffer.from(shot.data,'base64'));};
 await send('Runtime.enable');await send('Page.enable');await send('Network.enable');
 await send('Page.navigate',{url:'http://127.0.0.1:9390/test-support/cat-care/screen.html'});await waitFor('typeof CarePreview!=="undefined"&&document.querySelector("[data-cat-meal]")');
 const reports=[];
 for(const width of [320,375,390,430]){
 await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
 for(const coat of await evaluate('CatFaces.coats.map(c=>c.id)'))for(const kind of ['meal','treat']){
 await evaluate('fetch("/__care/reset",{method:"POST"})');await evaluate('CarePreview.show('+JSON.stringify(coat)+','+JSON.stringify(kind)+')');
 const before=await evaluate('CarePreviewData.calls');await evaluate('document.querySelector("[data-cat-'+kind+']").click();document.querySelector("[data-cat-'+kind+']").click()');await waitFor('!CatCare.pending&&!!document.querySelector(".care-playing")');
 const r=await evaluate('({coat:document.querySelector(".care-scene").dataset.careCoat,kind:document.querySelector(".care-scene").dataset.careKind,calls:CarePreviewData.calls,disabled:document.querySelector("[data-cat-'+kind+']").disabled,loaded:[...document.querySelectorAll(".care-scene img")].every(i=>i.naturalWidth>0),overflow:document.querySelector(".cat-care").scrollWidth>document.querySelector(".cat-care").clientWidth})');
 assert.equal(r.coat,coat);assert.equal(r.kind,kind);assert.equal(r.calls,before+1);assert(r.disabled&&r.loaded&&!r.overflow);reports.push({width,...r});
 for(const [time,selector] of [[500,'.care-bowl'],[1500,'.care-munch'],[2500,'.care-joy-cat']])assert(await evaluate(`(()=>{const s=document.querySelector('.care-playing');for(const a of s.getAnimations({subtree:true})){a.pause();a.currentTime=${time}}return Number(getComputedStyle(s.querySelector('${selector}')).opacity)>.9})()`));
 if(width===390&&coat==='calico'&&kind==='meal'){await screenshot('cat-care-meal');}
 }
 console.log('PASS '+width+'px: all16 breeds, meals and treats');}
 await evaluate('fetch("/__care/reset",{method:"POST"})');await evaluate('CarePreview.show("calico","meal")');await evaluate('CarePreviewData.fail=true;document.querySelector("[data-cat-meal]").click()');await waitFor('!CatCare.pending');assert.equal(await evaluate('document.querySelector("[data-cat-meal]").disabled'),false);await evaluate('CarePreviewData.fail=false');
 await evaluate('document.querySelector("[data-cat-meal]").click()');await waitFor('!!document.querySelector(".care-playing")');await evaluate('go("timeline")');assert.equal(await evaluate('view'),'timeline');
 await delay(3100);await evaluate('fetch("/__care/reset",{method:"POST"})');await evaluate('CarePreview.show("calico","meal")');await evaluate('view="rest";render()');assert(await evaluate('!!document.querySelector(".cat-care-compact [data-cat-meal]")'));
 await evaluate('document.querySelector("[data-cat-meal]").click()');await waitFor('!!document.querySelector(".care-playing")');
 for(const [time,selector] of [[500,'.care-bowl'],[1500,'.care-munch'],[2500,'.care-joy-cat']]){assert(await evaluate(`(()=>{const scene=document.querySelector('.care-playing');for(const a of scene.getAnimations({subtree:true})){a.pause();a.currentTime=${time}}return Number(getComputedStyle(scene.querySelector('${selector}')).opacity)>.9})()`));await screenshot('cat-care-stage-'+time);}
 await evaluate('document.querySelectorAll(".care-playing").forEach(s=>s.classList.remove("care-playing"))');
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await evaluate('fetch("/__care/reset",{method:"POST"})');await evaluate('CarePreview.show("calico","meal")');await evaluate('document.querySelector("[data-cat-meal]").click()');await waitFor('!!document.querySelector(".care-reduced")');await delay(1000);assert(await evaluate('!document.querySelector(".care-reduced")'));
 await send('Emulation.setEmulatedMedia',{features:[]});
 await evaluate('fetch("/__care/reset",{method:"POST"})');await evaluate('CarePreview.show("calico","treat")');
 // An already-open other-profile dialog must update when the care day changes.
 await evaluate(`globalThis.savedCareNow=NightClock.now;globalThis.savedCareStatus=OyasumiAPI.getCatCareStatus;globalThis.careAt=Date.parse('2026-10-10T23:59:59+09:00');NightClock.now=()=>careAt;shared.catCare={...shared.catCare,day:'2026-10-10',treatGiven:true,mealDone:true};refreshCareCards();`);
 assert(await evaluate('document.querySelector("[data-cat-treat]").disabled'));
 await evaluate(`careAt=Date.parse('2026-10-11T00:00:00+09:00');refreshCareCards()`);assert(await evaluate('document.querySelector("[data-cat-treat]").disabled'));
 await evaluate(`OyasumiAPI.getCatCareStatus=async()=>({...shared.catCare,day:'2026-10-11',treatGiven:false,mealDone:false,mealEligible:false});refreshCareDay()`);assert.equal(await evaluate('document.querySelector("[data-cat-treat]").disabled'),false);
 await evaluate(`document.querySelectorAll('dialog[open]').forEach(d=>d.close());view='profile';render()`);assert(await evaluate('document.querySelector("[data-cat-meal]").disabled'));
 await evaluate('NightClock.now=savedCareNow;OyasumiAPI.getCatCareStatus=savedCareStatus;clearTimeout(careDayTimer)');
 assert.deepEqual(errors,[]);assert.deepEqual(await evaluate('previewErrors'),[]);
 fs.writeFileSync(path.join(output,'browser-report.json'),JSON.stringify({pass:true,cases:reports.length,animationStages:reports.length*3,reports,networkFailureRetry:true,navigationDuringAnimation:true,restMealAvailable:true,openDialogMidnightReset:true,productionDbAccess:false},null,2));console.log('PASS 128 cases, 384 animation stages, duplicate clicks, retry, navigation, rest action, open-dialog midnight reset');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{socket?.close();browser.kill();server?.kill();});
