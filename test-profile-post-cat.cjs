const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const production=process.argv.includes('--production');
const output=path.join(__dirname,production?'output/profile-post-cat-production-v1':'output/profile-post-cat-v1');fs.mkdirSync(output,{recursive:true});
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'oyasumi-scenes-'));
const server=production?null:spawn(process.execPath,['server.js'],{stdio:'ignore',windowsHide:true});
const browser=spawn(process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=9482',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore',windowsHide:true});
let socket;
(async()=>{
 let tabs;for(let i=0;i<60;i++){try{tabs=await(await fetch('http://127.0.0.1:9482/json')).json();break;}catch{await delay(250);}}
 assert(tabs,'Browser started');socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
 let serial=0;const pending=new Map(),errors=[],failedImages=[];
 socket.addEventListener('message',e=>{const d=JSON.parse(e.data);if(d.id){const p=pending.get(d.id);pending.delete(d.id);clearTimeout(p.timer);d.error?p.reject(d.error):p.resolve(d.result);}if(d.method==='Runtime.exceptionThrown')errors.push(d.params);if(d.method==='Network.responseReceived'&&d.params.response.url.includes('/assets/sleep-wake-cats/')&&d.params.response.status!==200)failedImages.push(d.params.response.url);});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;const timer=setTimeout(()=>reject(Error(method+' timed out')),120000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;};
 const waitFor=async expression=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await delay(100);}throw Error(expression);};
 const screenshot=async name=>{await delay(150);const shot=await send('Page.captureScreenshot',{format:'png'});fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync(`test-results/${name}.png`,Buffer.from(shot.data,'base64'));};
 await send('Runtime.enable');await send('Page.enable');await send('Network.enable');
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`globalThis.sceneMock={userId:'scene-preview',needsNickname:false,initialize:async()=> 'scene-preview',snapshot:async()=>({userId:'scene-preview',name:'検証猫',expression:'calm',coat:'calico',catRole:null,profileNote:null,profileComplete:true,ownPosts:[],reactions:{},feed:[],reactionCounts:{},awakeCount:0,sleepingCount:0,ownSleepCount:0,nightDate:'2026-10-05',trend:[],trendSupported:false,expressionSupported:true,myState:null,catCoatStatus:{nextChangeAt:null}})};Object.defineProperty(globalThis,'OyasumiAPI',{get:()=>sceneMock,set:()=>{},configurable:true});`});
 await send('Network.setBlockedURLs',{urls:['*supabase.co*','ws://*','wss://*']});
 await send('Page.navigate',{url:(production?'https://tomowo985250z-cmyk.github.io/oyasumi/':'http://127.0.0.1:3000/')+'?profile-check='+Date.now()});await waitFor('typeof ready!=="undefined"&&ready&&!busy');

 if(production)assert.equal(await evaluate('document.querySelector("meta[name=oyasumi-release]").content'),JSON.parse(fs.readFileSync('release.json','utf8')).release);
 const baseline=`function previousProfileRoomCat(coat,now=NightClock.now()) {
 const period=roomTime(now),day=period==='day'?DayCats.current(now):null;
 return {period,pose:day?.id||(period==='morning'?'awake':'sleeping'),html:day?DayCats.svg(day.id,coat):CatScenes.svg(period==='morning'?'awake':'sleeping',coat)};
 }`;
 await evaluate(baseline);
 await evaluate(`globalThis.testAt=Date.parse('2026-10-10T22:00:00+09:00');globalThis.NightClock={...NightClock,now:()=>testAt,sync:()=>{}};sceneMock.snapshot=async()=>structuredClone(globalThis.testSnapshot);`);
 const matrices=[];
 for(const width of [320,375,390,430]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
  const reports=await evaluate(`(async()=>{
   const reports=[];
   for(const {id:coat} of CatFaces.coats)for(const status of ['awake','sleep','try-sleep','early-sleep'])for(const hour of [8,13,22]){
    document.querySelectorAll('dialog[open]').forEach(d=>d.close());await new Promise(resolve=>setTimeout(resolve,0));
    testAt=Date.parse('2026-10-10T'+String(hour).padStart(2,'0')+':00:00+09:00');
    const expression=CatFaces.options[CatFaces.coats.findIndex(c=>c.id===coat)%6].id;
    const post={id:'post-check',userId:'person-check',name:'確認猫',coat,expression,catRole:'mechanic',profileNote:'ひとやすみ',status,time:testAt,self:false,color:'slate'};
    globalThis.testSnapshot={userId:'scene-preview',name:'確認',coat:'calico',expression:'calm',profileComplete:true,ownPosts:[],feed:[post],reactions:{},reactionCounts:{},awakeCount:status==='awake'?1:0,sleepingCount:0,activeAwakePosts:status==='awake'?[post]:[],ownSleepCount:0,nightDate:SleepFlow.night(testAt),trend:[],trendSupported:false,catCoatStatus:{nextChangeAt:null,temporarilyUnlocked:true}};
    shared=structuredClone(testSnapshot);state={...freshState(),name:shared.name,coat:'calico'};view='timeline';filter='all';ready=true;busy=false;render();
    const button=document.querySelector('[data-public-profile="post-check"]'),avatar=button.querySelector('.avatar'),avatarMarkup=avatar.innerHTML,rect=avatar.getBoundingClientRect(),style={borderRadius:getComputedStyle(avatar).borderRadius,overflow:getComputedStyle(avatar).overflow};
    button.click();
    const dialog=document.querySelector('#public-profile-dialog'),room=dialog.querySelector('.cat-room'),image=room.querySelector('.room-cat img');await image.decode();
    const original=previousProfileRoomCat(coat,testAt);
    const expected=status==='awake'?CatScenes.svg('awake',coat):status==='sleep'?CatScenes.svg('sleeping',coat):original.html;
    const r={width:innerWidth,coat,status,hour,opened:dialog.open,bodyCorrect:room.querySelector('.room-cat').innerHTML===expected,periodCorrect:room.dataset.time===roomTime(testAt),loaded:image.naturalWidth===1254&&image.naturalHeight===1254,circle:Math.abs(rect.width-rect.height)<.1&&style.borderRadius==='50%'&&style.overflow==='hidden',avatarUnchanged:button.querySelector('.avatar').innerHTML===avatarMarkup,note:dialog.querySelector('.public-profile-note').textContent==='ひとやすみ',noOverflow:dialog.scrollWidth<=dialog.clientWidth};
    testAt=Date.parse('2026-10-11T18:00:00+09:00');syncProfileRoom();await room.querySelector('.room-cat img').decode();
    r.afterSync=room.dataset.time===roomTime(testAt)&&room.querySelector('.room-cat').innerHTML===(status==='awake'?CatScenes.svg('awake',coat):status==='sleep'?CatScenes.svg('sleeping',coat):previousProfileRoomCat(coat,testAt).html);
    r.pass=r.opened&&r.bodyCorrect&&r.periodCorrect&&r.loaded&&r.circle&&r.avatarUnchanged&&r.note&&r.noOverflow&&r.afterSync;reports.push(r);
   }return reports;
  })()`);
  fs.writeFileSync(path.join(output,'matrix-'+width+'.json'),JSON.stringify(reports,null,2));assert.equal(reports.length,192);assert(reports.every(r=>r.pass),JSON.stringify(reports.filter(r=>!r.pass)));matrices.push({width,cases:reports.length});console.log('PASS '+width+'px: 192 profile icon click cases');
 }
 assert.deepEqual(errors,[]);assert.deepEqual(failedImages,[]);
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({pass:true,production,cases:768,matrices,dbWrites:false,errors},null,2));
 console.log('PASS all16 breeds, four post choices, all periods, real clicks, circular avatars, live room updates.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{socket?.close();browser.kill();server?.kill();});