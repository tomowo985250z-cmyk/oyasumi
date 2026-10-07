const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const browserPath = process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const profile = process.env.OYASUMI_TEST_PROFILE || fs.mkdtempSync(path.join(os.tmpdir(), 'oyasumi-browser-'));
if(process.env.OYASUMI_TEST_PROFILE){
  assert.equal(path.dirname(path.resolve(profile)),path.resolve(os.tmpdir()));
  assert(path.basename(profile).startsWith('oyasumi-browser-'),'Reuse only a dedicated test profile');
}
const server = spawn(process.execPath, ['server.js'], { stdio: 'ignore' });
const browser = spawn(browserPath, ['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=9333',`--user-data-dir=${profile}`,'about:blank'], {stdio:'ignore'});
let socket, evaluate, send;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const oldData = JSON.stringify({name:'旧ねこ',posts:[{id:'old-local-post',status:'awake',time:Date.now()}],reactions:{'old-local-post':'dream'},morningDays:['2026-01-01'],light:false});
const seedKey = 'oyasumi-test-seeded-' + Date.now();
(async () => {
  let tabs;
  for(let i=0;i<60;i++){try{tabs=await (await fetch('http://127.0.0.1:9333/json')).json();break;}catch{await delay(250);}}
  assert(tabs,'Browser did not start');
  socket = new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
  let id=0;const pending=new Map();const errors=[];
  socket.addEventListener('message',event=>{const data=JSON.parse(event.data);if(data.id){const p=pending.get(data.id);if(!p)return;pending.delete(data.id);clearTimeout(p.timer);data.error?p.reject(data.error):p.resolve(data.result);}if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails.text);});
  send=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;const timer=setTimeout(()=>{pending.delete(key);reject(new Error(`Timeout: ${method}`));},45000);pending.set(key,{resolve,reject,timer});socket.send(JSON.stringify({id:key,method,params}));});
  evaluate=async expression=>{const source=expression.includes('await ')?`(async()=>{${expression.includes(';')?expression:`return (${expression});`}})()`:expression;const result=await send('Runtime.evaluate',{expression:source,returnByValue:true,awaitPromise:true});assert(!result.exceptionDetails,JSON.stringify(result.exceptionDetails));return result.result.value;};
  const waitFor=async(expression,timeout=30000)=>{const deadline=Date.now()+timeout;while(Date.now()<deadline){if(await evaluate(expression))return;await delay(100);}throw new Error(`Condition timed out: ${expression}; toast: ${await evaluate('document.querySelector("#toast").textContent')}`);};
  const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const action=async selector=>{await click(selector);await waitFor('!busy&&!refreshPromise&&!refreshQueued');};
  const screenshot=async filename=>{await delay(200);const data=await send('Page.captureScreenshot',{format:'png'});fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync(`test-results/${filename}`,Buffer.from(data.data,'base64'));return data.data;};
  await send('Runtime.enable');
  await send('Page.enable');
if(process.argv.includes('--test-big-cats')||process.argv.includes('--test-awake-cats')||process.argv.includes('--test-day-cat-tap')||process.argv.includes('--test-domestic-faces-preview')||process.argv.includes('--test-cat-coat-cooldown')||process.argv.includes('--test-reaction-effects'))await send('Page.addScriptToEvaluateOnNewDocument',{source:`globalThis.facesMock={userId:'faces-preview',needsNickname:false,initialize:async()=> 'faces-preview',setNickname:async()=>{},setCatCoat:async()=>{},snapshot:async()=>({userId:'faces-preview',name:'検証猫',expression:'calm',coat:'calico',catRole:null,profileNote:null,ownPosts:[],reactions:{},feed:[],reactionCounts:{},awakeCount:0,sleepingCount:0,ownSleepCount:0,nightDate:'2026-10-05',trend:[],trendSupported:false,expressionSupported:true,myState:null,catCoatStatus:{nextChangeAt:null}})};Object.defineProperty(globalThis,'OyasumiAPI',{get:()=>facesMock,set:()=>{},configurable:true});`});
  if(!process.argv.includes('--test-first-nickname')&&!process.argv.includes('--test-dark-hint'))await send('Page.addScriptToEvaluateOnNewDocument',{source:`if(!localStorage.getItem(${JSON.stringify(seedKey)})){${process.env.OYASUMI_TEST_PROFILE ? "localStorage.removeItem('oyasumi-local-v2');" : ''}localStorage.setItem('oyasumi-v1',${JSON.stringify(oldData)});localStorage.setItem(${JSON.stringify(seedKey)},'yes');}`});
  if(process.argv.includes('--test-dark-hint'))await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:process.argv.includes('--dark-device')?'dark':'light'}]});
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await send('Page.navigate',{url:baseUrl});
  if(process.argv.includes('--test-dark-hint')){
    await waitFor('typeof view!=="undefined"');
    if(process.argv.includes('--dark-device')){
      assert.equal(await evaluate('document.querySelector(".dark-mode-hint")'),null);
      await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:'light'}]});
      await send('Page.reload');await waitFor('typeof view!=="undefined"');
      assert.equal(await evaluate('document.querySelector(".dark-mode-hint")'),null,'A skipped first visit must not become a later hint');
      console.log('PASS hint: dark device does not display the first-use advice.');return;
    }
    assert.equal(await evaluate('document.querySelector(".dark-mode-hint").textContent'),'🌙 夜はダークモードがおすすめです');
    await send('Emulation.setDeviceMetricsOverride',{width:320,height:844,deviceScaleFactor:1,mobile:true});await screenshot('dark-hint-320.png');
    assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
    await evaluate('render()');
    await waitFor('!document.querySelector(".dark-mode-hint")',5000);
    await evaluate('go("profile");go("home")');assert.equal(await evaluate('document.querySelector(".dark-mode-hint")'),null);
    await send('Page.reload');await waitFor('typeof view!=="undefined"');assert.equal(await evaluate('document.querySelector(".dark-mode-hint")'),null);
    console.log('PASS hint: first-use light device, four-second removal despite rerender, no repeat on navigation/reload, 320px layout.');return;
  }
  await waitFor('typeof ready!=="undefined" && ready && !busy');
  if(!process.argv.includes('--test-first-nickname'))await evaluate('await OyasumiAPI.setNickname("旧ねこ");await OyasumiAPI.setCatCoat("calico");await refreshShared()');
  if(process.argv.includes('--test-big-cats')){
    await evaluate('globalThis.bigSnapshot=facesMock.snapshot;globalThis.bigCoat="snow-leopard";globalThis.bigExpression="calm";facesMock.snapshot=async()=>({...await bigSnapshot(),profileComplete:true,needsCat:false,coat:bigCoat,expression:bigExpression});facesMock.setCatCoat=async c=>{bigCoat=c};facesMock.setCatExpression=async e=>{bigExpression=e};await refreshShared()');
    for(const width of [320,375,390,430]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
      await evaluate('go("profile")');await click('[data-coat-picker]');
      assert.deepEqual(await evaluate('Array.from(document.querySelectorAll(".cat-group-title"),e=>e.textContent)'),['基本猫','野生猫','大ねこ']);
      assert.equal(await evaluate('document.querySelectorAll("[data-coat]").length'),16);
      assert(await evaluate('document.querySelector("#expression-dialog").getBoundingClientRect().right<=innerWidth'));
      await screenshot(`big-cats-picker-${width}.png`);await evaluate('document.querySelector("#expression-dialog").scrollTop=10000');await screenshot(`big-cats-picker-bottom-${width}.png`);await action('[data-coat="snow-leopard"]');assert.equal(await evaluate('state.coat'),'snow-leopard');
      for(const coat of ['snow-leopard','leopard','cheetah','jaguar'])for(const expression of ['calm','sleepy','yawn','restless','happy','surprised']){
        await evaluate(`bigCoat=${JSON.stringify(coat)};bigExpression=${JSON.stringify(expression)};await refreshShared();shared.feed=[{id:'big-peer-post',userId:'big-peer',name:'大ねこ',coat:bigCoat,expression:bigExpression,time:Date.now(),status:'awake',self:false}];filter='all';go('profile')`);
        assert.equal(await evaluate('document.querySelector(".profile-cat-button .cat-face").dataset.catCoat'),coat);
        await click('[data-expression-picker]');assert.equal(await evaluate('document.querySelectorAll("[data-expression]").length'),6);await action(`[data-expression="${expression}"]`);
        await evaluate('shared.feed=[{id:"big-peer-post",userId:"big-peer",name:"大ねこ",profileNote:"",catRole:null,coat:bigCoat,expression:bigExpression,time:Date.now(),status:"awake",self:false}];go("timeline")');assert.equal(await evaluate('document.querySelector(".post .cat-face").dataset.catExpression'),expression);
        await click('[data-public-profile]');
        assert.equal(await evaluate('document.querySelector(".public-profile-face .cat-face").dataset.catCoat'),coat);
        assert.equal(await evaluate('document.querySelector(".public-profile-face .cat-face").dataset.catExpression'),expression);
        const geometry=await evaluate('(()=>{const e=document.querySelector(".public-profile-face .avatar"),r=e.getBoundingClientRect(),s=getComputedStyle(e);return {square:Math.abs(r.width-r.height)<1,round:s.borderRadius==="50%",overflow:document.documentElement.scrollWidth>innerWidth}})()');
        assert.deepEqual(geometry,{square:true,round:true,overflow:false});
        await evaluate('await Promise.all(Array.from(document.querySelectorAll("svg image"),e=>{const i=new Image();i.src=e.getAttribute("href");return i.decode()}))');
        if(coat==='jaguar'&&expression==='surprised')await screenshot(`big-cats-public-${width}.png`);
        await evaluate('document.querySelector("#public-profile-dialog").close()');
      }
      await evaluate('go("profile")');await screenshot(`big-cats-profile-${width}.png`);
    }
    assert.deepEqual(errors,[]);console.log('PASS big cats UI: 24 faces in profile/timeline/public profile, six expression choices, three categories, round square frames, all assets decoded, 320/375/390/430px.');return;
  }
  if(process.argv.includes('--test-awake-cats')){
await evaluate('globalThis.awakeFixture=[{id:"sleep",userId:"s",status:"sleep",coat:"black"},{id:"a",userId:"a",status:"awake",coat:"orange"},{id:"dup",userId:"a",status:"awake",coat:"black"},{id:"b",userId:"b",status:"awake",coat:"gray"},{id:"c",userId:"c",status:"awake",coat:"manul"}].map(post=>({...post,time:Date.now(),name:"検証猫",expression:"calm"}));globalThis.beforeButtons=actions()');
    for(const width of [320,375,390,430]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
      for(const count of [null,0,1,2,3,8,12345]){
        await evaluate(`shared.awakeCount=${count};shared.feed=awakeFixture;go("home")`);
        assert.equal(await evaluate('document.querySelectorAll(".awake-cats .roof-cat").length'),Math.min(3,count||0));
        assert.equal(await evaluate('document.querySelector(".count").textContent.trim()'),`${count??'—'} 人`);
        assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
        assert.equal(await evaluate('actions()'),await evaluate('beforeButtons'));
        assert(await evaluate('(()=>{const h=document.querySelector(".awake-heading"),p=h.parentElement.querySelector("p");return h.getBoundingClientRect().bottom<=p.getBoundingClientRect().top})()'),'Heading and description never overlap, including zero/loading');
        assert(await evaluate('document.querySelector(".count").closest(".awake-heading")!==null'),'Exact count belongs to the heading');
        if(count){
          assert(await evaluate('(()=>{const s=getComputedStyle(document.querySelector(".awake-cats"));return parseFloat(s.width)>=240&&parseFloat(s.width)<250&&s.height==="132px"})()'));
          assert(await evaluate('(()=>{const r=document.querySelector(".awake-scene").getBoundingClientRect();return Math.abs(r.width-249.6)<.1&&Math.abs(r.height-132)<.1})()'),'Entire composition scales by 1.2');
          assert.deepEqual(await evaluate('(()=>{const s=getComputedStyle(document.querySelector(".roof-cat"));return [s.width,s.height]})()'),['68px','102px'],'Cats are 1.42 times larger');
          assert.equal(await evaluate('document.querySelectorAll(".roof-stars circle").length'),15);
          assert.equal(await evaluate('document.querySelectorAll(".roof-stars path").length'),3);
          assert.equal(await evaluate('document.querySelectorAll("[data-star-tone=warm]").length'),16);
          assert.equal(await evaluate('document.querySelectorAll("[data-star-tone=cool]").length'),5);
          assert.equal(await evaluate('document.querySelectorAll(".roof-twinkle").length'),4);
          assert(await evaluate('Array.from(document.querySelectorAll(".roof-twinkle"),e=>parseFloat(getComputedStyle(e).animationDuration)).every(s=>s>=3&&s<=6)'));
          assert.deepEqual(await evaluate('(()=>{const h=document.querySelector(".awake-heading"),p=h.parentElement.querySelector("p");return [getComputedStyle(h).top,getComputedStyle(p).top]})()'),['6px','-6px']);
          assert.equal(await evaluate('document.querySelectorAll(".roof-moon").length'),1);
          assert(await evaluate('document.querySelector(".awake-heading").getBoundingClientRect().bottom<=document.querySelector(".awake-cats").getBoundingClientRect().top'));
        }
        assert.equal(await evaluate('document.querySelectorAll(".awake-cats .cat-scene,.awake-cats .cat-face").length'),0,'No circular profile icons in rooftop scene');
        assert.equal(await evaluate('document.querySelectorAll(".awake-roof").length'),count?1:0);
        if(count>=3){
          assert.deepEqual(await evaluate('Array.from(document.querySelectorAll(".awake-cats .roof-cat"),e=>e.dataset.catCoat)'),['orange','gray','manul']);
          assert.deepEqual(await evaluate('Array.from(document.querySelectorAll(".awake-cats .roof-cat"),e=>e.dataset.catPose)'),['storybook-upright','storybook-relaxed','storybook-rounded']);
          assert(await evaluate('(()=>{const r=Array.from(document.querySelectorAll(".awake-cats .roof-cat"),e=>e.getBoundingClientRect());return r[1].left<r[0].right&&r[2].left<r[1].right&&r.every(e=>e.top===r[0].top)})()'));
        }
        if(count===2){
          assert.deepEqual(await evaluate('Array.from(document.querySelectorAll(".roof-cat"),e=>e.dataset.catPose)'),['storybook-upright','storybook-rounded']);
          assert.deepEqual(await evaluate('Array.from(document.querySelectorAll(".roof-cat"),e=>e.dataset.catFacing)'),['moon','moon']);
          assert.equal(await evaluate('document.querySelectorAll(".roof-contact").length'),2);
          assert.equal(await evaluate('getComputedStyle(document.querySelectorAll(".roof-cat")[1]).transform'),'matrix(1, 0, 0, 1, 0, 2)');
        }
        if(count===3){await evaluate('await Promise.all(Array.from(document.querySelectorAll(".awake-cats image"),e=>{const image=new Image();image.src=e.getAttribute("href");return image.decode()}))');await screenshot(`awake-cats-${width}.png`);}
        if(count===2){await evaluate('await Promise.all(Array.from(document.querySelectorAll(".awake-cats image"),e=>{const image=new Image();image.src=e.getAttribute("href");return image.decode()}))');await screenshot(`roof-pair-${width}.png`);}
      }
      await evaluate('shared.feed=[];shared.awakeCount=3;go("home")');assert.equal(await evaluate('document.querySelectorAll(".awake-cats .roof-cat").length'),3);
      assert.deepEqual(await evaluate('Array.from(document.querySelectorAll(".awake-cats .roof-cat"),e=>e.dataset.catCoat)'),['unknown','unknown','unknown']);
    }
    for(const coat of await evaluate('CatFaces.coats.map(c=>c.id)')){
      await evaluate(`shared.awakeCount=1;shared.feed=[{...awakeFixture[1],coat:${JSON.stringify(coat)}}];go("home")`);
      assert.equal(await evaluate('document.querySelector(".roof-cat").dataset.catCoat'),coat);
    }
    await send('Emulation.setDeviceMetricsOverride',{width:320,height:844,deviceScaleFactor:1,mobile:true});
    for(const coats of [['calico','orange','brown'],['silver','black','white'],['tuxedo','gray','manul'],['sand','black-footed','fishing']]){
      await evaluate(`shared.awakeCount=3;shared.feed=${JSON.stringify(coats)}.map((coat,i)=>({...awakeFixture[1],id:'coat-'+i,userId:'coat-'+i,coat}));go("home")`);
      await evaluate('await Promise.all(Array.from(document.querySelectorAll(".awake-cats image"),e=>{const image=new Image();image.src=e.getAttribute("href");return image.decode()}))');
      const clip=await evaluate('(()=>{const r=document.querySelector(".count-card").getBoundingClientRect();return {x:r.left,y:r.top+scrollY,width:r.width,height:r.height,scale:1}})()');
      const shot=await send('Page.captureScreenshot',{format:'png',clip});fs.writeFileSync(`test-results/roof-coats-${coats.join('-')}.png`,Buffer.from(shot.data,'base64'));
    }
    await evaluate('globalThis.skyRandom=Math.random;globalThis.skyTimeout=setTimeout;globalThis.skyDelays=[];Math.random=()=>.5;globalThis.setTimeout=(fn,ms,...args)=>{skyDelays.push(ms);return skyTimeout(fn,ms,...args)};roofNextShootingAt=undefined;syncRoofSky()');
    assert(await evaluate('roofNextShootingAt-performance.now()>22000&&roofNextShootingAt-performance.now()<=22500'));
    await evaluate('roofNextShootingAt=performance.now()-1;syncRoofSky()');await waitFor('document.querySelectorAll(".roof-shooting-star").length===1');
    assert.equal(await evaluate('document.querySelector(".roof-shooting-star").getAnimations()[0].effect.getTiming().duration'),850);
    assert(await evaluate('skyDelays.at(-1)>22000&&skyDelays.at(-1)<=22500'),'Next star is spaced 15–30 seconds apart');
    await delay(1000);assert.equal(await evaluate('document.querySelectorAll(".roof-shooting-star").length'),0);
    await evaluate('Math.random=skyRandom;globalThis.setTimeout=skyTimeout;globalThis.keepSkyTime=roofNextShootingAt;render()');assert.equal(await evaluate('roofNextShootingAt'),await evaluate('keepSkyTime'),'Refresh does not postpone the scheduled star');
    await evaluate('go("timeline")');assert.equal(await evaluate('roofNextShootingAt'),undefined);
    await evaluate('go("home")');await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await waitFor('roofNextShootingAt===undefined');
    assert(await evaluate('Array.from(document.querySelectorAll(".roof-twinkle"),e=>getComputedStyle(e).animationName).every(n=>n==="none")'));
    assert.deepEqual(errors,[]);console.log('PASS roof cats: 0/1/2/max3, exact count, rear-view template, roof silhouette, all 12 coats, overlapping group, unique awake users, neutral fallback, unchanged buttons and no overflow at 320/375/390/430px.');return;
  }
  if(process.argv.includes('--test-day-cat-tap')){
    await evaluate('globalThis.originalDayCats=DayCats;globalThis.dayNow=Date.parse("2026-10-03T12:00:00+09:00");globalThis.DayCats={...DayCats,current:()=>originalDayCats.current(dayNow)};go("home");globalThis.tapRequests=0;globalThis.fetch=()=>{tapRequests++;throw new Error("Unexpected tap request")};for(const key of Object.keys(facesMock))if(typeof facesMock[key]==="function")facesMock[key]=()=>{tapRequests++;throw new Error("Unexpected tap API call")};globalThis.beforeTapState=JSON.stringify(state)');
    for(const width of [320,375,390,430]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
      await evaluate('go("home");globalThis.tapImage=document.querySelector(".cat-day-scene");globalThis.beforeImage=tapImage.outerHTML;globalThis.beforeHero=document.querySelector(".day-hero").textContent;globalThis.beforeHeading=document.querySelector(".day-hero h2").getBoundingClientRect().top');
      await click('[data-day-cat-tap]');
      assert.equal(await evaluate('tapImage.getAnimations()[0].effect.getTiming().duration'),400);
      await evaluate('tapImage.getAnimations()[0].pause();tapImage.getAnimations()[0].currentTime=180');
      assert(await evaluate('(()=>{const y=new DOMMatrix(getComputedStyle(tapImage).transform).m42;return y>=-6&&y<-4})()'));
      assert.equal(await evaluate('document.querySelector(".day-hero h2").getBoundingClientRect().top'),await evaluate('beforeHeading'));
      assert.equal(await evaluate('tapImage.outerHTML'),await evaluate('beforeImage'));
      assert.equal(await evaluate('document.querySelector(".day-hero").textContent'),await evaluate('beforeHero'));
      assert.equal(await evaluate('document.querySelectorAll(".reaction-heart,.reaction-delivery,audio").length'),0);
      assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
      await screenshot(`day-cat-tap-${width}.png`);
      await evaluate('for(let i=0;i<30;i++)document.querySelector("[data-day-cat-tap]").click()');
      assert.equal(await evaluate('tapImage.getAnimations().length'),1);
      await delay(500);assert.equal(await evaluate('tapImage.getAnimations().length'),0);
      assert.equal(await evaluate('getComputedStyle(tapImage).transform'),'none');
    }
    assert.equal(await evaluate('tapRequests'),0);assert.equal(await evaluate('JSON.stringify(state)'),await evaluate('beforeTapState'));
    const oldBucket=await evaluate('document.querySelector(".day-hero").dataset.dayBucket');
    await evaluate('dayNow+=2*3600000;refreshDayScene()');assert.notEqual(await evaluate('document.querySelector(".day-hero").dataset.dayBucket'),oldBucket);
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await click('[data-day-cat-tap]');assert.equal(await evaluate('document.querySelector(".cat-day-scene").getAnimations().length'),0);
    assert.deepEqual(errors,[]);console.log('PASS day cat tap: 400ms gentle hop, cat image only, 30 rapid taps, no requests or saved changes, unchanged two-hour rotation and no overflow at 320/375/390/430px.');return;
  }
  if(process.argv.includes('--test-cat-coat-cooldown')){
    await evaluate('globalThis.coatCalls=0;globalThis.nextCoatChange=null;globalThis.savedCoat="calico";globalThis.baseCoatSnapshot=facesMock.snapshot;facesMock.snapshot=async()=>({...await baseCoatSnapshot(),profileComplete:true,needsCat:false,coat:savedCoat,catCoatStatus:{nextChangeAt:nextCoatChange}});facesMock.setCatCoat=async coat=>{coatCalls++;savedCoat=coat;nextCoatChange=NightClock.now()+7*86400000};await refreshShared();go("profile")');
    assert.equal(await evaluate('document.querySelector("[data-coat-picker]").disabled'),false);
    await click('[data-coat-picker]');
    assert.equal(await evaluate('document.querySelectorAll("[data-coat]").length'),16);
    await action('[data-coat="manul"]');
    assert.equal(await evaluate('coatCalls'),1);
    assert.equal(await evaluate('state.coat'),'manul');
    for(const width of [320,375,390,430]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
      await evaluate('go("profile")');
      assert.equal(await evaluate('document.querySelector("[data-coat-picker]").disabled'),true);
      assert(await evaluate('document.querySelector(".cat-coat-availability").textContent.includes("次回変更可能")'));
      assert(await evaluate('document.querySelector(".cat-coat-availability").textContent.includes("7日間")'));
      assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
      await screenshot(`cat-coat-cooldown-${width}.png`);
    }
    await click('[data-coat-picker]');assert.equal(await evaluate('document.querySelector("#expression-dialog").open'),false);
    await evaluate('document.querySelector("#expression-options").innerHTML=`<button data-coat="orange">変更</button>`;document.querySelector("[data-coat=orange]").click()');await delay(200);
    assert.equal(await evaluate('coatCalls'),1,'Programmatic stale choice must also be blocked');
    await evaluate('go("settings")');assert.equal(await evaluate('document.querySelector("[data-coat-picker]").disabled'),true);
    await evaluate('go("profile")');await click('[data-expression-picker]');assert.equal(await evaluate('document.querySelectorAll("[data-expression]").length'),6);await click('#cancel-expression');
    await evaluate('nextCoatChange=NightClock.now()-1;await refreshShared();go("profile")');
    assert.equal(await evaluate('document.querySelector("[data-coat-picker]").disabled'),false);
    await click('[data-coat-picker]');await action('[data-coat="orange"]');assert.equal(await evaluate('coatCalls'),2);
    await evaluate('facesMock.snapshot=async()=>({...await baseCoatSnapshot(),profileComplete:true,needsCat:false,coat:savedCoat,catCoatStatus:{nextChangeAt:null,temporarilyUnlocked:true}});facesMock.setCatCoat=async coat=>{coatCalls++;savedCoat=coat};await refreshShared()');
    for(const width of [320,375,390,430]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
      for(const coat of ['snow-leopard','leopard','cheetah','jaguar']){
        await evaluate('go("profile")');assert.equal(await evaluate('document.querySelector("[data-coat-picker]").disabled'),false);
        assert(await evaluate('document.querySelector(".cat-coat-availability").textContent.includes("一時解除中")'));
        await click('[data-coat-picker]');await action(`[data-coat="${coat}"]`);assert.equal(await evaluate('state.coat'),coat);
        assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
      }
      await screenshot(`cat-coat-unlocked-${width}.png`);
    }
    await evaluate('facesMock.snapshot=async()=>({...await baseCoatSnapshot(),catCoatStatus:null});await refreshShared();go("profile")');
    assert.equal(await evaluate('document.querySelector("[data-coat-picker]").disabled'),true);
    assert.deepEqual(errors,[]);console.log('PASS cat cooldown UI: first save, 12 species, next date, four mobile widths, settings/picker/stale-choice lock, expiry unlock, expression unaffected, unavailable status blocked.');return;
  }
  if(process.argv.includes('--test-domestic-faces-preview')){
    const coats=['calico','orange','brown','silver','black','white','tuxedo','gray'];
    for(const width of [320,375,390,430]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
      for(const coat of coats){
        await evaluate(`state.coat=${JSON.stringify(coat)};go("profile")`);
        await click('[data-expression-picker]');
        assert.equal(await evaluate('document.querySelectorAll("#expression-options .cat-face image").length'),6);
        assert(await evaluate('return await Promise.all(Array.from(document.querySelectorAll("#expression-options .cat-face image"),async el=>{const img=new Image();img.src=el.getAttribute("href");await img.decode();return img.naturalWidth===512&&img.naturalHeight===512})).then(results=>results.every(Boolean))'));
        assert(await evaluate('document.documentElement.scrollWidth<=innerWidth && document.querySelector("#expression-dialog").getBoundingClientRect().right<=innerWidth && document.querySelector("#expression-dialog").getBoundingClientRect().bottom<=innerHeight'));
        if(coat==='black'||coat==='orange')await screenshot(`domestic-faces-picker-${coat}-${width}.png`);
        await click('#cancel-expression');
      }
    }
    assert.deepEqual(errors,[]);
    console.log('PASS domestic face picker: 48 images decoded, 320/375/390/430px, no overflow or runtime errors.');return;
  }
  if(process.argv.includes('--test-domestic-cats-preview')){
    const coats=['calico','orange','brown','silver','black','white','tuxedo','gray'];
    for(const width of [320,375,390,430]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
      for(const coat of coats)for(const scene of ['relax','play','groom','doze','gaze']){
        await evaluate(`state.coat=${JSON.stringify(coat)};DayCats={...DayCats,current:()=>({id:${JSON.stringify(scene)},label:"昼猫",key:${JSON.stringify(scene)}})};go("home")`);
        await evaluate('await document.querySelector(".day-cat-image").decode()');
        assert.deepEqual(await evaluate('(()=>{const el=document.querySelector(".day-cat-image"),r=el.getBoundingClientRect(),s=getComputedStyle(el);return {square:Math.abs(r.width-r.height)<.1,round:s.borderRadius,fit:s.objectFit,overflow:document.documentElement.scrollWidth>innerWidth}})()'),{square:true,round:'50%',fit:'cover',overflow:false});
      }
      await screenshot(`domestic-day-home-${width}.png`);
    }
    assert.deepEqual(errors,[]);
    console.log('PASS domestic daytime images: 40 assets decoded, true circles, unchanged hero layout, 320/375/390/430px, no runtime errors.');return;
  }
  if(process.argv.includes('--test-wild-cats-preview')){
    await evaluate('globalThis.wildBase=await OyasumiAPI.snapshot();OyasumiAPI.setCatCoat=async()=>{};OyasumiAPI.setCatExpression=async()=>{};OyasumiAPI.snapshot=async()=>({...wildBase,coat:state.coat,expression:state.expression,feed:[{id:"wild-preview",userId:shared.userId,name:state.name,status:"awake",time:NightClock.now(),nightDate:shared.nightDate,self:true,coat:state.coat,expression:state.expression}]});await refreshShared()');
    for(const width of [320,375,390,430]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
      await evaluate('go("settings")');await click('[data-coat-picker]');
      assert.equal(await evaluate('document.querySelectorAll("[data-coat]").length'),16);
      assert.equal(await evaluate('document.querySelector(".cat-group-title").textContent'),'基本猫');
      assert(await evaluate('document.querySelector("#expression-dialog").scrollWidth<=document.querySelector("#expression-dialog").clientWidth'));
      await screenshot(`wild-picker-${width}.png`);await click('#cancel-expression');
      for(const coat of ['manul','sand','black-footed','fishing']){
        await evaluate('go("settings")');await click('[data-coat-picker]');await action(`[data-coat="${coat}"]`);
        assert.equal(await evaluate('state.coat'),coat);
        await evaluate('go("profile")');await click('[data-expression-picker]');
        for(const expression of ['calm','sleepy','yawn','restless','happy','surprised']){
          await action(`[data-expression="${expression}"]`);assert.equal(await evaluate('state.expression'),expression);
          assert.equal(await evaluate('document.querySelector(".profile-banner .cat-face").dataset.catCoat'),coat);
          await evaluate('go("timeline")');assert.equal(await evaluate('document.querySelector(".post .cat-face").dataset.catCoat'),coat);
          await evaluate('go("profile")');await click('[data-expression-picker]');
        }
        await screenshot(`wild-expressions-${coat}-${width}.png`);await click('#cancel-expression');
        for(const scene of ['relax','play','groom','doze','gaze']){
          await evaluate(`DayCats={...DayCats,current:()=>({id:${JSON.stringify(scene)},label:"昼猫",key:${JSON.stringify(scene)}})};go("home")`);
          assert.equal(await evaluate('document.querySelector(".cat-day-scene").dataset.catCoat'),coat);
          assert.equal(await evaluate('document.querySelector(".cat-day-scene").dataset.dayScene'),scene);
          assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
        }
        await screenshot(`wild-day-${coat}-${width}.png`);
        await evaluate('state.lastSleep={nightDate:NightClock.night(),at:new Date(NightClock.now()).toISOString(),finishedAt:new Date(NightClock.now()).toISOString(),finished:true};go("sleep")');
        assert.equal(await evaluate('document.querySelector(".sleep-cat .cat-face").dataset.catCoat'),coat);
        await evaluate('go("rest")');assert.equal(await evaluate('document.querySelector(".rest-cat .cat-scene").dataset.catCoat'),coat);
      }
    }
    await evaluate('for(const cat of WildCatAssets.species)for(const [kind,options] of [["faces",CatFaces.options],["day",DayCats.options]])for(const frame of options){const svg=WildCatAssets.image(kind,cat.id,frame.id);const url=svg.match(/href="([^"]+)"/)[1];const asset=new Image();asset.src=url;await asset.decode();if(asset.naturalWidth<180)throw new Error("Missing crop")}');
    assert.deepEqual(errors,[]);console.log('PASS wild cat preview: 12 choices, separate wild group, 24 expressions, 20 actions, sleep reuse, all 44 image assets decoded, 320/375/390/430px, no runtime errors.');return;
  }
  if(process.argv.includes('--test-night-boundary')){
    await evaluate('globalThis.boundaryBase=await OyasumiAPI.snapshot();globalThis.boundaryAPI=OyasumiAPI.snapshot;globalThis.boundaryHistory=[{id:"00000000-0000-4000-8000-000000000001",userId:shared.userId,name:state.name,status:"awake",time:Date.parse("2026-10-04T05:30:00+09:00"),nightDate:"2026-10-03",self:true,coat:state.coat,expression:state.expression},{id:"00000000-0000-4000-8000-000000000002",userId:shared.userId,name:state.name,status:"sleep",time:Date.parse("2026-10-04T05:59:00+09:00"),nightDate:"2026-10-03",self:true,coat:state.coat,expression:state.expression}]');
    for(const width of [320,375,390,430]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
      await evaluate('globalThis.boundaryStage="before";globalThis.boundaryBefore={...boundaryBase,nightDate:"2026-10-03",feed:[boundaryHistory[1]],ownPosts:boundaryHistory.slice(),awakeCount:0,sleepingCount:1,tonightSummary:{sleepingCount:1,coats:[{coat:"calico",count:1}],peakHours:[{hour:5,count:1}]},trend:[{time:Date.parse("2026-10-04T05:59:00+09:00"),awake:0,sleeping:1}],clock:{serverNow:Date.parse("2026-10-04T05:59:58.800+09:00"),monotonicAt:performance.now(),resetAt:Date.parse("2026-10-04T06:00:00+09:00"),nightDate:"2026-10-03",morningNightDate:"2026-10-03"}};OyasumiAPI.snapshot=async()=>boundaryStage==="before"?boundaryBefore:new Promise(resolve=>{globalThis.boundaryRelease=resolve});await refreshShared();go("timeline");boundaryStage="after"');
      assert.equal(await evaluate('document.querySelectorAll(".post").length'),1);
      await screenshot(`night-before-${width}.png`);
      await waitFor('typeof boundaryRelease==="function"');
      assert.equal(await evaluate('shared.nightDate'),'2026-10-04');
      assert.equal(await evaluate('document.querySelectorAll(".post").length'),0,'Old posts disappear at 06:00 before fetching finishes');
      assert.equal(await evaluate('state.posts.length'),2,'History stays intact');
      assert.equal(await evaluate('shared.tonightSummary'),null);assert.equal(await evaluate('shared.trend.length'),0);
      await screenshot(`night-cleared-${width}.png`);
      await evaluate('globalThis.boundaryNew={...boundaryHistory[0],id:"00000000-0000-4000-8000-000000000003",nightDate:"2026-10-04",time:Date.parse("2026-10-04T06:00:01+09:00")};boundaryRelease({...boundaryBase,nightDate:"2026-10-04",feed:[boundaryNew],ownPosts:[boundaryNew,...boundaryHistory],awakeCount:1,sleepingCount:0,tonightSummary:{sleepingCount:0,coats:[],peakHours:[]},trend:[{time:boundaryNew.time,awake:1,sleeping:0}],morningReactions:{nightDate:"2026-10-03",goodnight:1,dream:1,tomorrow:1,comfort:1},clock:{serverNow:boundaryNew.time,monotonicAt:performance.now(),resetAt:Date.parse("2026-10-05T06:00:00+09:00"),nightDate:"2026-10-04",morningNightDate:"2026-10-03"}});globalThis.boundaryRelease=undefined');
      await waitFor('!refreshPromise');
      assert.equal(await evaluate('document.querySelectorAll(".post").length'),1);assert.equal(await evaluate('shared.feed[0].nightDate'),'2026-10-04');
      assert.equal(await evaluate('state.posts.length'),3);
      await evaluate('go("stats")');assert.equal(await evaluate('document.querySelectorAll(".sleeping-cats .cat-scene").length'),0);
      assert.equal(await evaluate('shared.tonightSummary.sleepingCount'),0);assert.equal(await evaluate('shared.trend[0].awake'),1);
      assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
      await evaluate('state.lastSleep={nightDate:"2026-10-03",at:"2026-10-03T23:00:00+09:00"};go("morning")');
      assert.equal(await evaluate('document.querySelector(".morning-receipts p").textContent'),'4個のやさしい言葉が届いていました');
    }
    for(const width of [320,375,390,430])for(const screen of ['rest','sleep']){
      await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
      await evaluate(`state.morningDays=[];state.lastSleep={nightDate:"2026-10-03",at:"2026-10-04T05:59:00+09:00",finishedAt:"2026-10-04T05:59:30+09:00",finished:${screen==='rest'}};globalThis.wakeClock={serverNow:Date.parse("2026-10-04T05:59:59.600+09:00"),monotonicAt:performance.now(),resetAt:Date.parse("2026-10-04T06:00:00+09:00")};NightClock.sync(wakeClock);shared={...boundaryBase,nightDate:"2026-10-03",clock:wakeClock};OyasumiAPI.snapshot=async()=>({...boundaryBase,nightDate:"2026-10-04",clock:{serverNow:Date.parse("2026-10-04T06:00:01+09:00"),monotonicAt:performance.now(),resetAt:Date.parse("2026-10-05T06:00:00+09:00")}});go(${JSON.stringify(screen)});scheduleNightBoundary()`);
      assert.equal(await evaluate('view'),screen);
      await waitFor('view==="morning"&&!refreshPromise');
      assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
      assert.equal(await evaluate('document.body.classList.contains("resting")'),false);
      await screenshot(`six-morning-${screen}-${width}.png`);
      await evaluate('go("rest");checkNightBoundary()');
      assert.equal(await evaluate('view'),'morning','Resume switches even when the shared night already refreshed');
      await evaluate('NightClock.sync({serverNow:Date.parse("2026-10-04T12:00:00+09:00"),monotonicAt:performance.now(),resetAt:Date.parse("2026-10-05T06:00:00+09:00")});shared.nightDate=NightClock.night();go("rest");checkNightBoundary()');
      assert.equal(await evaluate('view'),'home','Previous-night screen must not return after the morning window');
    }
    await evaluate('state.lastSleep=null;OyasumiAPI.snapshot=boundaryAPI;await refreshShared();go("home")');
    assert.deepEqual(errors,[]);console.log('PASS night boundary: 05:59→06:00 automatic clear and sleep/rest→morning at 320/375/390/430px, resume, no stale counts/cats/chart, retained history, latest new-night post, previous-night morning receipts.');return;
  }
  if(process.argv.includes('--test-profile-note')){
    await evaluate('globalThis.peer=createOyasumiConnection("oyasumi-browser-peer");await peer.initialize();await peer.setNickname("ひとこと猫");await peer.setCatCoat("gray");await peer.setCatRole("mechanic");await peer.setProfileNote("今夜ものんびり");globalThis.notePeerPost=await peer.submitPost("awake");await refreshShared();go("profile")');
    for(const width of [320,390,430]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
      await click('[data-note-editor]');
      for(const value of ['あ'.repeat(21),'https://example.jp','a@example.jp','090-1234-5678','死ね']){
        await evaluate(`document.querySelector("#profile-note").value=${JSON.stringify(value)}`);await action('#note-form button[type=submit]');
        assert(await evaluate('document.querySelector("#note-dialog").open&&document.querySelector("#note-error").textContent.length>0'));
      }
      await evaluate('document.querySelector("#profile-note").value="あ".repeat(20)');await action('#note-form button[type=submit]');
      assert.equal(await evaluate('state.profileNote'),'あ'.repeat(20));
      assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
      await screenshot(`profile-note-${width}.png`);await evaluate('go("timeline")');
      await click(`[data-public-profile="${await evaluate('notePeerPost.id')}"]`);
      assert.equal(await evaluate('document.querySelector("#public-profile-content h3").textContent'),'ひとこと猫');
      assert(await evaluate('(()=>{const r=document.querySelector(".public-profile-face .avatar").getBoundingClientRect();return r.width===112&&r.height===112})()'),'Public profile cat is 112px');
      assert.equal(await evaluate('document.querySelector("#public-profile-content .cat-role-tag").textContent'),'メカ猫');
      assert.equal(await evaluate('document.querySelector(".public-profile-note").textContent'),'今夜ものんびり');
      assert.equal(await evaluate('document.querySelectorAll("#public-profile-dialog button").length'),1,'Only closing, no contact/follow/history controls');
      assert.equal(await evaluate('document.querySelector("#public-profile-dialog").textContent.includes("IT・技術")'),false);
      assert(await evaluate('document.querySelector("#public-profile-dialog").getBoundingClientRect().right<=innerWidth'));
      await screenshot(`public-profile-${width}.png`);await click('#close-public-profile');await evaluate('go("profile")');
    }
    await send('Page.reload');await waitFor('typeof ready!=="undefined"&&ready&&!busy');assert.equal(await evaluate('state.profileNote'),'あ'.repeat(20));
    await evaluate('go("profile")');await click('[data-note-editor]');await evaluate('document.querySelector("#profile-note").value=""');await action('#note-form button[type=submit]');assert.equal(await evaluate('state.profileNote'),'');
    await click('[data-note-editor]');await evaluate('document.querySelector("#profile-note").value="変更しない"');await click('#cancel-note');assert.equal(await evaluate('state.profileNote'),'');
    await evaluate('globalThis.peer=createOyasumiConnection("oyasumi-browser-peer");await peer.initialize();globalThis.notePeerPost=(await peer.snapshot()).ownPosts[0];await peer.setProfileNote("");await peer.setCatRole("private");await refreshShared();go("timeline")');
    await click(`[data-public-profile="${await evaluate('notePeerPost.id')}"]`);
    assert.equal(await evaluate('document.querySelector("#public-profile-content .cat-role-tag")'),null);
    assert.equal(await evaluate('document.querySelector(".public-profile-note").textContent'),'未入力');await click('#close-public-profile');
    assert.deepEqual(errors,[]);console.log('PASS profile note UI: 320/390/430px, validation reasons, save/restart/clear/cancel, public cat/name/role/note only, hidden private role.');return;
  }
  if(process.argv.includes('--test-cat-roles')||process.argv.includes('--test-cat-roles-mock')){
    if(process.argv.includes('--test-cat-roles-mock'))await evaluate('globalThis.testRole=null;OyasumiAPI.setCatRole=async role=>{testRole=role};refreshAfterSave=async()=>true;shared.feed=[{id:"role-preview",userId:shared.userId,name:state.name,coat:state.coat,expression:state.expression,status:"awake",time:Date.now(),self:true}]');
    else await evaluate('globalThis.roleTestPost=await OyasumiAPI.submitPost("awake");await refreshShared()');
    await evaluate('go("profile")');
    assert.equal(await evaluate('state.catRole'),null,'Existing profile starts unset');
    for(const width of [320,390,430]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
      await click('[data-role-picker]');
      assert.equal(await evaluate('document.querySelectorAll("#role-wheel [role=option]").length'),18);
      await evaluate('document.querySelector("#role-wheel").scrollTop=12*44');
      await waitFor('selectedRoleIndex===12');
      assert.equal(await evaluate('document.querySelector("#role-preview").textContent'),'あなたはマイペース猫です 🐱');
      await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40});
      await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40});
      await waitFor('selectedRoleIndex===13');
      assert.equal(await evaluate('document.querySelector("#role-preview").textContent'),'あなたはまなび猫です 🐱');
      assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
      assert(await evaluate('document.querySelector("#role-dialog").getBoundingClientRect().right<=innerWidth'));
      await screenshot(`role-wheel-${width}.png`);
      await action('#role-form button[type=submit]');
      assert.equal(await evaluate('document.querySelector(".profile-banner .cat-role-tag").textContent'),'まなび猫');
      await screenshot(`role-profile-${width}.png`);
      await evaluate('go("timeline")');
      assert(await evaluate('Array.from(document.querySelectorAll(".post .cat-role-tag"),e=>e.textContent).includes("まなび猫")'));
      assert(await evaluate('Array.from(document.querySelectorAll(".post .cat-role-tag")).every(e=>e.parentElement.classList.contains("post-name"))'),'Cat label belongs beside the nickname');
      assert(await evaluate('(()=>{const label=document.querySelector(".post-name .cat-role-tag"),name=label.parentElement.querySelector(".post-nickname"),a=name.getBoundingClientRect(),b=label.getBoundingClientRect();return b.left>=a.right&&Math.abs(b.top-a.top)<10})()'),'Short nickname and cat label share a row');
      assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
      assert.equal(await evaluate('document.querySelector("main").textContent.includes("学生")'),false);
      await screenshot(`role-timeline-${width}.png`);
      await evaluate('go("profile")');
    }
    if(!process.argv.includes('--test-cat-roles-mock')){
      await send('Page.reload');await waitFor('typeof ready!=="undefined"&&ready&&!busy');
      assert.equal(await evaluate('state.catRole'),'learner','Role persists across restart');await evaluate('go("profile")');
    }
    await click('[data-role-picker]');await evaluate('selectRole(17,true)');await action('#role-form button[type=submit]');
    assert.equal(await evaluate('document.querySelector(".profile-banner .cat-role-tag")'),null);
    await evaluate('go("timeline")');assert.equal(await evaluate('document.querySelector(".post .cat-role-tag")'),null);
    await evaluate('go("profile")');await click('[data-role-picker]');await evaluate('selectRole(1,true)');await click('#cancel-role');
    assert.equal(await evaluate('state.catRole'),'private','Cancel preserves saved choice');
    await evaluate('OyasumiAPI.setCatRole=async()=>{throw new Error("Offline")}');
    await click('[data-role-picker]');await evaluate('selectRole(1,true)');await action('#role-form button[type=submit]');
    assert.equal(await evaluate('state.catRole'),'private','Failure preserves saved choice');
    assert(await evaluate('document.querySelector("#role-dialog").open'));
    assert(await evaluate('document.querySelector("#role-error").textContent.length>0'));
    await click('#cancel-role');assert.deepEqual(errors,[]);
    console.log('PASS role wheel: 320/390/430px, scrolling, keyboard, cat-only labels, optional/private, save/restart, cancel and failure.');return;
  }
  if(process.argv.includes('--test-morning-reactions')){
    await evaluate('NightClock.sync({serverNow:Date.parse("2026-10-04T06:00:00+09:00"),monotonicAt:performance.now(),resetAt:Date.parse("2026-10-05T06:00:00+09:00")});shared.nightDate="2026-10-04";state.lastSleep={nightDate:"2026-10-03"};shared.morningReactions={nightDate:"2026-10-03",goodnight:2,dream:3,tomorrow:1,comfort:4};go("morning")');
    for(const width of [320,375,390,430]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
      assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
      assert.equal(await evaluate('document.querySelector(".morning-receipts h2").textContent'),'きのう、あなたに届いたおやすみ');
      assert.equal(await evaluate('document.querySelector(".morning-receipts p").textContent'),'10個のやさしい言葉が届いていました');
      assert.deepEqual(await evaluate('Array.from(document.querySelectorAll(".morning-reaction-grid strong"),e=>parseInt(e.textContent))'),[2,3,1,4]);
      await screenshot(`morning-receipts-${width}.png`);
    }
    await evaluate('shared.morningReactions=null;render()');
    assert.equal(await evaluate('document.querySelector(".morning-reaction-grid")'),null);
    await evaluate('shared.morningReactions={nightDate:"2000-01-01",goodnight:9,dream:0,tomorrow:0,comfort:0};render()');
    assert.equal(await evaluate('document.querySelector(".morning-reaction-grid")'),null,'A different night must never be displayed');
    await evaluate('shared.morningReactions={nightDate:"2026-10-03",goodnight:0,dream:0,tomorrow:0,comfort:0};render()');
    assert.equal(await evaluate('document.querySelector(".morning-receipts")'),null,'Zero receipts leave the normal morning screen');
    await screenshot('morning-receipts-zero.png');
    await evaluate('shared.morningReactions.comfort=1;render()');
    assert.deepEqual(await evaluate('Array.from(document.querySelectorAll(".morning-reaction-grid strong"),e=>parseInt(e.textContent))'),[0,0,0,1]);
    await evaluate('NightClock.sync({serverNow:Date.parse("2026-10-04T05:59:59+09:00"),monotonicAt:performance.now(),resetAt:Date.parse("2026-10-04T06:00:00+09:00")});render()');
    assert.equal(await evaluate('document.querySelector(".morning-receipts")'),null,'Receipts are shown from 06:00');
    assert.deepEqual(errors,[]);
    console.log('PASS morning receipts: four counts and total from 06:00, 320/375/390/430px, failed fetch and wrong-night protection, zero hidden and mixed zero counts.');return;
  }
  if(process.argv.includes('--test-reaction-effects')||process.argv.includes('--test-reaction-effects-live')){
    await evaluate('globalThis.originalEffectRefresh=refreshAfterSave;globalThis.originalEffectSet=OyasumiAPI.setReaction');
    if(!process.argv.includes('--test-reaction-effects-live'))await evaluate('refreshShared=async()=>{}');
    await evaluate('shared.feed=[{id:"effect-preview",userId:"other",name:"テスト猫",status:"sleep",time:Date.now(),coat:"gray",expression:"calm",self:false}];globalThis.effectCalls=0;OyasumiAPI.setReaction=()=>{effectCalls++;return new Promise(resolve=>{globalThis.effectRelease=resolve})};refreshAfterSave=async()=>true;go("timeline")');
    if(process.argv.includes('--test-reaction-effects-live')){
      await evaluate('globalThis.peer=createOyasumiConnection("oyasumi-browser-peer");await peer.initialize();await peer.setNickname("演出ねこ");await peer.setCatCoat("gray");globalThis.effectPost=await peer.submitPost("awake");await refreshShared();refreshAfterSave=originalEffectRefresh;OyasumiAPI.setReaction=(id,choice)=>{effectCalls++;return new Promise((resolve,reject)=>{globalThis.effectRelease=async()=>{try{await originalEffectSet(id,choice);resolve()}catch(error){reject(error)}}})};go("timeline")');
    }
    for(const width of [320,375,390,430]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
      await evaluate('go("profile")');
      assert(await evaluate('(()=>{const r=document.querySelector(".profile-cat-button .avatar").getBoundingClientRect();return r.width===111&&r.height===111})()'),'Profile cat grows by about 1.35');
      await evaluate('globalThis.iconName=state.name;state.name="あいうえおかきくけこさし";render()');
      assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'Long profile name must fit');
      assert(await evaluate('(()=>{const a=document.querySelector(".profile-cat-button").getBoundingClientRect(),b=document.querySelector(".profile-banner>div").getBoundingClientRect();return a.right<=b.left&&b.right<=innerWidth})()'),'Cat and profile text must not overlap');
      await screenshot(`profile-cat-size-${width}.png`);
      await evaluate('state.name=iconName;go("timeline")');
      assert(await evaluate('(()=>{const r=document.querySelector(".post .avatar").getBoundingClientRect();return r.width===60&&r.height===60})()'),'Timeline cat is 60px');
      assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'),'Timeline must fit');
      assert.deepEqual(await evaluate('Array.from(document.querySelectorAll(".post [data-reaction]"),el=>el.firstChild.textContent.trim())').then(values=>values.slice(0,4)),['おやすみ🌙','いい夢を💤','また明日👋','無理せずね☺️']);
      await delay(150);
      for(const choice of ['goodnight','dream','tomorrow','comfort']){
        const before=await evaluate('effectCalls');
        await click(process.argv.includes('--test-reaction-effects-live')?`[data-react="${await evaluate('effectPost.id')}"][data-reaction="${choice}"]`:`[data-reaction="${choice}"]`);await waitFor('typeof effectRelease==="function"&&busy');
        assert.equal(await evaluate('document.querySelectorAll(".reaction-delivery").length'),0);
        assert.equal(await evaluate('document.body.textContent.includes("届きました")'),false);
        assert.equal(await evaluate('document.querySelectorAll(".reaction-heart").length'),1);
        assert.equal(await evaluate('document.querySelector(".reaction-heart").textContent'),'♥');
        assert.equal(await evaluate('getComputedStyle(document.querySelector(".reaction-heart")).color'),'rgba(255, 126, 161, 0.85)');
        assert.equal(await evaluate('getComputedStyle(document.querySelector(".reaction-heart")).fontSize'),'24px');
        assert(await evaluate('Array.from(document.querySelectorAll("[data-react]")).some(button=>button.getAnimations().length>0)'),'Reaction button presses briefly');
        await evaluate('for(let i=0;i<8;i++)document.querySelector("[data-reaction=goodnight]").click()');
        assert.equal(await evaluate('document.querySelectorAll(".reaction-heart").length'),1,'Rapid taps keep one heart');
        await screenshot(`reaction-heart-${choice}-${width}.png`);
        assert.equal(await evaluate('effectCalls'),before+1,'Rapid taps must not send duplicate reactions');
        await delay(1300);await evaluate('effectRelease();globalThis.effectRelease=undefined');await waitFor(`state.reactions[globalThis.effectPost?.id||"effect-preview"]===${JSON.stringify(choice)}`);
        assert.equal(await evaluate('document.querySelector(".reaction-heart")'),null,'Heart expires and is not replayed by save acknowledgement');
        assert.equal(await evaluate('state.reactions[globalThis.effectPost?.id||"effect-preview"]'),choice);
        await evaluate('renderPreservingPosition();window.dispatchEvent(new Event("scroll"));window.dispatchEvent(new Event("resize"))');
        assert.equal(await evaluate('document.querySelectorAll(".reaction-delivery").length'),0);
        await screenshot(`reaction-${choice}-${width}.png`);
        await waitFor('!busy');
        if(process.argv.includes('--test-reaction-effects-live')){
          assert.equal(await evaluate(`(await peer.snapshot()).reactionCounts[effectPost.id][${JSON.stringify(choice)}]`),1);
        }
      }
    }
    await evaluate('OyasumiAPI.setReaction=async()=>{throw new Error("Offline")};state.reactions={};go("timeline")');
    await click('[data-reaction="comfort"]');await waitFor('!busy&&!document.querySelector(".reaction-delivery")');
    assert.equal(await evaluate('document.querySelector(".reaction-heart")'),null,'Failure cleans up the heart');
    await evaluate('go("home")');
    assert.equal(await evaluate('Array.from(document.querySelectorAll("[data-post]")).some(button=>button.getAnimations().length>0)'),false,'Post buttons have no reaction press effect');
    assert.deepEqual(errors,[]);
    console.log('PASS reaction effects: heart only at 320/375/390/430px, brighter 24px pink heart, button press, immediate feedback without success claim, one-second cleanup without replay, rapid-tap deduplication and failure cleanup.');return;
  }
  if(process.argv.includes('--test-share')){
    await evaluate('go("settings");Object.defineProperty(navigator,"share",{configurable:true,value:async data=>{globalThis.sharedPlaceData=data}})');
    await click('[data-share-place]');
    assert.deepEqual(await evaluate('sharedPlaceData'),{text:'眠る前に、少しだけ立ち寄れる場所です。',url:'https://tomowo985250z-cmyk.github.io/oyasumi/'});
    await evaluate('Object.defineProperty(navigator,"share",{configurable:true,value:async()=>{throw new DOMException("Cancelled","AbortError")}})');
    await click('[data-share-place]');assert.equal(await evaluate('document.querySelector("#share-dialog").open'),false);
    await evaluate('Object.defineProperty(navigator,"share",{configurable:true,value:undefined});Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:async text=>{globalThis.copiedPlaceURL=text}}})');
    await click('[data-share-place]');await waitFor('typeof copiedPlaceURL!=="undefined"');
    assert.equal(await evaluate('copiedPlaceURL'),'https://tomowo985250z-cmyk.github.io/oyasumi/');
    await evaluate('Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:async()=>{throw new Error("Denied")}}})');
    await click('[data-share-place]');await waitFor('document.querySelector("#share-dialog").open');
    assert.equal(await evaluate('document.querySelector("#share-url").textContent'),'https://tomowo985250z-cmyk.github.io/oyasumi/');
    for(const width of [320,390,430]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
      assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
      assert(await evaluate('document.querySelector("#share-dialog").getBoundingClientRect().right<=innerWidth'));
      await screenshot(`share-dialog-${width}.png`);
    }
    await click('[data-close-share]');
    await waitFor('!document.querySelector("#toast").classList.contains("visible")');
    for(const width of [320,390,430]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
      await evaluate('document.querySelector("[data-share-place]").scrollIntoView()');await screenshot(`share-settings-${width}.png`);
      assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
    }
    await evaluate('go("home")');assert.equal(await evaluate('document.querySelector("[data-share-place]")'),null);
    console.log('PASS share: native API payload/cancel, clipboard, denied clipboard fallback, discreet settings placement at 320/390/430px.');return;
  }
  if(process.argv.includes('--test-first-nickname')){
    assert.equal(await evaluate('(await OyasumiAPI.client.from("oyasumi_profiles").select("nickname,cat_coat").eq("user_id",shared.userId)).data.length'),0,'New sign-in must not create a provisional profile');
    for(const choice of ['awake','sleep','try-sleep','early-sleep']){await evaluate('go("home")');await action(`[data-post="${choice}"]`);assert.equal(await evaluate('view'),'profile');assert.equal(await evaluate('state.posts.length'),0);}
    for(const width of [320,390,430]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
      assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
      await screenshot(`profile-setup-${width}.png`);
    }
    await evaluate('globalThis.catFirst=createOyasumiConnection("oyasumi-cat-first");await catFirst.initialize();await catFirst.setCatCoat("gray")');
    assert(await evaluate('(await catFirst.snapshot()).needsNickname'));
    assert.equal(await evaluate('(await catFirst.snapshot()).needsCat'),false);
    assert.equal(await evaluate('(await catFirst.client.from("oyasumi_profiles").select("nickname").eq("user_id",catFirst.userId).single()).data.nickname'),null,'Selecting a cat must not generate a nickname');
    await evaluate('go("settings")');await click('[data-name]');
    assert.equal(await evaluate('document.querySelector("#nickname").value'),'');
    assert.equal(await evaluate('document.querySelector("#nickname").placeholder'),'なんて呼べばいい？');
    await click('#cancel-name');await send('Page.reload');await waitFor('typeof ready!=="undefined"&&ready&&!busy');
    await evaluate('go("settings")');await click('[data-name]');
    assert.equal(await evaluate('document.querySelector("#nickname").value'),'','An unfinished first registration stays blank after reload');
    await evaluate('document.querySelector("#nickname").value="ともを";document.querySelector("#nickname-form").requestSubmit()');await waitFor('!busy&&!document.querySelector("#nickname-dialog").open');
    assert.equal(await evaluate('shared.profileComplete'),false);
    assert.equal(await evaluate('(await OyasumiAPI.client.from("oyasumi_profiles").select("cat_coat").eq("user_id",shared.userId).single()).data.cat_coat'),null);
    for(const choice of ['awake','sleep','try-sleep','early-sleep']){await evaluate('go("home")');await action(`[data-post="${choice}"]`);assert.equal(await evaluate('view'),'profile');assert.equal(await evaluate('state.posts.length'),0);}
    await click('[data-coat-picker]');await action('[data-coat="gray"]');
    assert.equal(await evaluate('shared.profileComplete'),true);
    await evaluate('go("home")');await action('[data-post="sleep"]');assert.equal(await evaluate('view'),'sleep');assert.equal(await evaluate('state.posts.length'),1);
    await send('Page.reload');await waitFor('typeof ready!=="undefined"&&ready&&!busy');
    await evaluate('go("settings")');await click('[data-name]');
    assert.equal(await evaluate('document.querySelector("#nickname").value'),'ともを','A registered user named ともを must keep the name');
    console.log('PASS onboarding: no provisional profile, unset/partial setup blocks sleep and opens my page, both saved allow posting, registered name preserved.');return;
  }
  assert.equal(await evaluate('localStorage.getItem(STORAGE_KEY)'),oldData,'Legacy data must remain intact');
  assert.equal(await evaluate('state.posts.length'),0,'Legacy posts must not be uploaded');
  assert.equal(await evaluate('state.name'),'旧ねこ');
  assert.deepEqual(await evaluate('state.morningDays'),['2026-01-01']);
  // 演出の時刻だけ固定し、認証・Supabaseの時計は変更しない。
  const dayFixture = `globalThis.DayCats={...DayCats,current:()=>DayCatsOriginalCurrent(Date.parse('2026-10-03T12:00:00+09:00'))};go('home');`;
  await evaluate('globalThis.DayCatsOriginal=DayCats;globalThis.DayCatsOriginalCurrent=DayCats.current');
  await evaluate(dayFixture);
  const dayAction = await evaluate('document.querySelector(".cat-day-scene").dataset.dayScene');
  for(const width of [320,390,430]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
    await evaluate('go("home")');
    assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
    assert.equal(await evaluate('document.querySelector(".cat-day-scene").dataset.catCoat'),await evaluate('state.coat'));
    assert.equal(await evaluate('document.querySelector(".cat-day-scene").dataset.dayScene'),dayAction);
    assert.equal(await evaluate('document.body.classList.contains("light-mode")'),false);
    await screenshot(`day-home-${width}.png`);
  }
  await evaluate('globalThis.DayCats={...DayCatsOriginal,current:()=>DayCatsOriginalCurrent(Date.parse("2026-10-03T14:00:00+09:00"))};refreshDayScene()');
  assert.notEqual(await evaluate('document.querySelector(".cat-day-scene").dataset.dayScene'),dayAction,'Time advancement updates the home without a reload');
  await evaluate(dayFixture);
  const reloadFixture = await send('Page.addScriptToEvaluateOnNewDocument',{source:`addEventListener('DOMContentLoaded',()=>{globalThis.DayCatsOriginal=DayCats;globalThis.DayCatsOriginalCurrent=DayCats.current;${dayFixture}});`});
  await send('Page.reload');await waitFor('typeof ready!=="undefined"&&ready&&!busy&&!!document.querySelector(".cat-day-scene")');
  assert.equal(await evaluate('document.querySelector(".cat-day-scene").dataset.dayScene'),dayAction);
  await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:reloadFixture.identifier});
  if(process.argv.includes('--preview-day')){
    await send('Emulation.setDeviceMetricsOverride',{width:1280,height:1000,deviceScaleFactor:1,mobile:false});
    await evaluate('document.body.style.display="block";document.body.style.padding="20px";document.querySelector(".desktop-intro").style.display="none";nav.hidden=true;document.querySelector(".app-shell").style.cssText="width:100%;max-width:none;border:0";app.innerHTML=`<div style="display:grid;grid-template-columns:repeat(8,1fr);gap:12px">${DayCats.options.flatMap(scene=>CatFaces.coats.map(coat=>`<div style="text-align:center">${DayCats.svg(scene.id,coat.id)}<small>${coat.label}・${scene.label}</small></div>`)).join("")}</div>`');
    assert.equal(await evaluate('document.querySelectorAll(".cat-day-scene").length'),80);
    await screenshot('cat-day-matrix.png');console.log('PASS daytime preview: 80 patterns, stable reload, dark home at 320/390/430px.');return;
  }
  await evaluate('globalThis.DayCats={...DayCatsOriginal,current:()=>DayCatsOriginalCurrent(Date.parse("2026-10-03T18:00:00+09:00"))};go("home")');
  assert.equal(await evaluate('document.querySelector(".day-hero")'),null);
  await evaluate('globalThis.DayCats=DayCatsOriginal;go("home")');
  if(process.argv.includes('--test-sleep-timer')){
    await action('[data-post="sleep"]');
    for(const width of [320,390,430]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
      await evaluate('go("home");go("sleep")');
      assert.equal(await evaluate('view'),'sleep');
      const beforePng=await screenshot(`automatic-before-${width}.png`);
      const started=Date.now();
      await delay(3500);
      await evaluate('render();await refreshShared()');
      await waitFor('view==="rest"&&document.querySelector(".rest-screen").dataset.phase==="settled"',5000);
      assert(Date.now()-started<8500,'Refresh must not restart the 6.5-second timer');
      assert.equal(await evaluate('getComputedStyle(document.querySelector(".rest-screen")).backgroundColor'),'rgb(0, 0, 0)');
      assert.equal(await evaluate('app.textContent.trim()'),'おやすみなさい 🌙');
      assert.equal(await evaluate('document.querySelectorAll("#app button,#navigation button").length'),0);
      const afterPng=await screenshot(`automatic-dark-${width}.png`);
      const readPixels=async png=>evaluate(`const img=new Image();img.src=${JSON.stringify('data:image/png;base64,')}+${JSON.stringify(png)};await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);return [Array.from(ctx.getImageData(0,0,1,1).data),Array.from(ctx.getImageData(1,400,1,1).data)];`);
      const beforePixels=await readPixels(beforePng),afterPixels=await readPixels(afterPng);
      assert(beforePixels.every(pixel=>pixel.slice(0,3).some(value=>value>0)),'Before pixels must be visibly different from black');
      assert.deepEqual(afterPixels,[[0,0,0,255],[0,0,0,255]],'After pixels must actually be black');
      await evaluate('render();await refreshShared()');
      assert.equal(await evaluate('view'),'rest');
      assert.equal(await evaluate('getComputedStyle(document.querySelector(".rest-screen")).backgroundColor'),'rgb(0, 0, 0)','Refresh must not remove darkening');
    }
    await send('Page.reload');await waitFor('typeof ready!=="undefined"&&ready&&!busy');
    assert.equal(await evaluate('view'),'rest');
    await evaluate('go("home");go("sleep");go("profile")');await delay(6700);
    assert.equal(await evaluate('view'),'profile','Leaving sleep must cancel the timer');
    console.log('PASS automatic ending: real sleep post, 6.5-second darkening without another tap, refresh competition, reload and navigation cancellation at 320/390/430px.');return;
  }
  if(process.argv.includes('--preview-stats')){
    assert(await evaluate('!!shared.tonightSummary'));
    for(const width of [320,390,430]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
      await evaluate('go("stats")');
      assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
      assert(await evaluate('(()=>{const r=document.createRange();r.selectNodeContents(document.querySelector(".wordmark"));return r.getClientRects().length===1})()'),'Tonight heading must fit one line');
      assert.equal(await evaluate('document.querySelectorAll("#app [data-post],.tonight-cats a,.tonight-cats button").length'),0);
      await screenshot(`tonight-summary-final-${width}.png`);
    }
    console.log('PASS tonight summary layout: live data, single-line title and no duplicate actions at 320/390/430px.');return;
  }
  if(process.argv.includes('--preview-dark')){
    for(const width of [320,390,430]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
      await evaluate('state.lastSleep={finished:true,finishedAt:new Date().toISOString()};go("rest")');
      assert.equal(await evaluate('document.querySelector(".rest-screen").dataset.phase'),'intro');
      await waitFor('document.querySelector(".rest-screen").dataset.phase==="settled"',10000);
      const png=await screenshot(`sleep-dark-pixels-${width}.png`);
      const pixels=await evaluate(`const img=new Image();img.src=${JSON.stringify('data:image/png;base64,') }+${JSON.stringify(png)};await img.decode();const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);return [Array.from(ctx.getImageData(0,0,1,1).data),Array.from(ctx.getImageData(1,400,1,1).data)];`);
      assert.deepEqual(pixels,[[0,0,0,255],[0,0,0,255]],'Rendered background pixels must actually be black');
      assert.equal(await evaluate('app.textContent.trim()'),'おやすみなさい 🌙');
      assert.equal(await evaluate('document.querySelectorAll("#app button,#navigation button").length'),0);
    }
    console.log('PASS dark ending: real 6.5-second transitions and black screenshot pixels at 320/390/430px.');return;
  }
  if(process.argv.includes('--preview-scenes')){
    await send('Emulation.setDeviceMetricsOverride',{width:1280,height:600,deviceScaleFactor:1,mobile:false});
    await evaluate('document.body.style.display="block";document.body.style.padding="20px";document.querySelector(".desktop-intro").style.display="none";nav.hidden=true;document.querySelector(".app-shell").style.cssText="width:100%;max-width:none;border:0";app.innerHTML=`<div style="display:grid;grid-template-columns:repeat(8,1fr);gap:12px">${["awake","sleeping"].flatMap(scene=>CatFaces.coats.map(coat=>`<div style="text-align:center">${CatScenes.svg(scene,coat.id)}<small>${coat.label}・${scene==="awake"?"目覚めた猫":"寝ている猫"}</small></div>`)).join("")}</div>`');
    assert.equal(await evaluate('document.querySelectorAll(".cat-scene").length'),24);
    assert.equal(await evaluate('document.querySelectorAll(".cat-scene image").length'),24);
    await screenshot('cat-scenes-matrix.png');
    console.log('PASS scene preview: twelve sleeping and twelve gently waking cats.');return;
  }
  if(process.argv.includes('--preview-cats')){
    await evaluate('go("home")');await screenshot('home-layout-mobile.png');
    await evaluate('globalThis.previewFeed=shared.feed;shared.feed=[{id:"preview-layout",name:"検証猫",status:"awake",time:Date.now(),expression:"calm",coat:"calico",self:false}]');
    for(const width of [320,390,430]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
      await evaluate('go("home")');
      assert(await evaluate('(()=>{const [a,b]=Array.from(document.querySelectorAll(".status-button"),el=>el.getBoundingClientRect());return Math.abs(a.width-b.width)<1&&a.height===b.height&&a.top===b.top})()'));
      assert.equal(await evaluate('getComputedStyle(document.querySelector(".status-button.sleep")).backgroundImage'),'linear-gradient(125deg, rgb(255, 172, 163), rgb(252, 129, 155))');
      assert.equal(await evaluate('getComputedStyle(document.querySelector(".status-button.awake")).backgroundImage'),'linear-gradient(125deg, rgb(131, 152, 255), rgb(88, 108, 227))');
      await evaluate('go("timeline")');
      assert(await evaluate('(()=>{const r=Array.from(document.querySelector(".reaction-options").children,el=>el.getBoundingClientRect());return r.length===4&&r[0].top===r[1].top&&r[2].top===r[3].top&&r[2].top>r[0].top&&Math.abs(r[0].width-r[1].width)<1})()'));
      assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
    }
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    await evaluate('go("timeline")');await screenshot('reactions-layout-mobile.png');
    await evaluate('shared.feed=previewFeed;go("home")');
    await evaluate('go("profile")');await click('[data-expression-picker]');
    assert.equal(await evaluate('document.querySelectorAll("[data-expression]").length'),6);
    assert.equal(await evaluate('document.querySelectorAll("#expression-options .cat-face").length'),6);
    assert.equal(await evaluate('CatFaces.normalize("<script>")'),'calm');
    await screenshot('cat-expressions-mobile.png');
    await send('Emulation.setDeviceMetricsOverride',{width:320,height:720,deviceScaleFactor:1,mobile:true});
    assert(await evaluate('document.querySelector("#expression-dialog").getBoundingClientRect().right<=innerWidth'));
    assert(await evaluate('document.querySelector("#expression-dialog").getBoundingClientRect().bottom<=innerHeight'));
    await click('#cancel-expression');assert.equal(await evaluate('state.expression'),'calm');
    await evaluate('go("settings")');await click('[data-coat-picker]');
    assert.equal(await evaluate('document.querySelectorAll("[data-coat]").length'),16);
    await screenshot('cat-coats-mobile.png');
    assert(await evaluate('document.querySelector("#expression-dialog").getBoundingClientRect().bottom<=innerHeight'));
    await click('#cancel-expression');
    for(const coat of ['calico','orange','brown','silver','black','white','tuxedo','gray']){
      for(const expression of ['calm','sleepy','yawn','restless','surprised','happy']){
        await evaluate(`state.coat=${JSON.stringify(coat)};state.expression=${JSON.stringify(expression)};go("profile")`);
        assert.equal(await evaluate('document.querySelector(".profile-banner .cat-face").dataset.catCoat'),coat);
        await click('[data-expression-picker]');
        assert(await evaluate(`Array.from(document.querySelectorAll('#expression-options .cat-face')).every(el=>el.dataset.catCoat===${JSON.stringify(coat)})`));
        await click('#cancel-expression');
      }
    }
    await evaluate('state.coat="calico";state.expression="calm";go("home")');
    await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
    await evaluate('document.body.style.display="block";document.body.style.padding="20px";document.querySelector(".desktop-intro").style.display="none";document.querySelector(".app-shell").style.cssText="width:100%;max-width:none;border:0";app.innerHTML=`<div style="display:grid;grid-template-columns:repeat(8,1fr);gap:12px">${CatFaces.options.flatMap(expression=>CatFaces.coats.map(coat=>`<div style="text-align:center">${CatFaces.svg(expression.id,coat.id)}<small>${coat.label}・${expression.label}</small></div>`)).join("")}</div>`');
    await screenshot('cat-matrix.png');
    assert.equal(await evaluate('localStorage.getItem(STORAGE_KEY)'),oldData);assert.deepEqual(errors,[]);
    console.log('PASS UI preview: equal status buttons, unchanged blue/pink, 2x2 reactions at 320/390/430px, 48 SVG cats, mobile picker and legacy data. This preview does not test shared persistence.');
    return;
  }
  assert(await evaluate('shared.expressionSupported'),'Run supabase/cat-appearance.sql before browser expression tests.');
  assert(await evaluate('shared.trendSupported'),'Run supabase/tonight-trend.sql before browser tests.');
  await evaluate('go("stats")');
  assert(!(await evaluate('document.querySelector("#app").textContent')).includes('サンプル'));
  assert(await evaluate('!!shared.tonightSummary'),'Run supabase/tonight-summary.sql before browser tests.');
  assert.equal(await evaluate('document.querySelectorAll("#app [data-post],#app [data-view=profile]").length'),0);
  assert(!(await evaluate('app.textContent')).includes('今夜まだ起きてる人'));
  await evaluate('go("home")');
  const userId=await evaluate('shared.userId');
  await action('[data-post="awake"]');assert.equal(await evaluate('view'),'timeline');assert.equal(await evaluate('state.posts.length'),1);
  const firstId=await evaluate('state.posts[0].id');
  await evaluate('go("home")');await action('[data-post="awake"]');assert.equal(await evaluate('state.posts.length'),1,'Repeated post must be deduplicated');
  await evaluate('globalThis.peer=createOyasumiConnection("oyasumi-browser-peer");await peer.initialize();await peer.setNickname("検証ほし");await peer.setCatCoat("calico");globalThis.peerPost=await peer.submitPost("awake");await refreshShared()');
  const peerId=await evaluate('peerPost.id');
  assert(await evaluate(`shared.feed.some(p=>p.id===${JSON.stringify(peerId)}&&!p.self)`));
  assert.equal(await evaluate(`document.querySelectorAll('[data-delete="${peerId}"]').length`),0,'Peer posts have no delete control');
  for(const choice of ['goodnight','dream','tomorrow','comfort']){await action(`[data-react="${peerId}"][data-reaction="${choice}"]`);assert.equal(await evaluate(`state.reactions[${JSON.stringify(peerId)}]`),choice);assert.equal(await evaluate(`(await peer.snapshot()).reactionCounts[${JSON.stringify(peerId)}][${JSON.stringify(choice)}]`),1);}
  await action(`[data-react="${peerId}"][data-reaction="comfort"]`);assert.equal(await evaluate(`state.reactions[${JSON.stringify(peerId)}]`),undefined);
  await evaluate(`await peer.setReaction(${JSON.stringify(firstId)},'dream');await refreshShared()`);assert.equal(await evaluate(`shared.reactionCounts[${JSON.stringify(firstId)}].dream`),1);
  await evaluate('window.scrollTo(0,150);globalThis.previousScroll=window.scrollY;await refreshShared()');assert.equal(await evaluate('window.scrollY'),await evaluate('previousScroll'),'Refresh must preserve scroll');
  await click('[data-filter="sleep"]');assert.equal(await evaluate('document.querySelectorAll(".awake-text").length'),0);
  for(const choice of ['sleep','try-sleep','early-sleep']){await evaluate('go("home")');await action(`[data-post="${choice}"]`);assert.equal(await evaluate('view'),'sleep');assert.equal(await evaluate('shared.myState'),'sleep');assert.equal(await evaluate('state.lastSleep.count'),await evaluate('shared.sleepingCount'));}
  assert.equal(await evaluate('state.posts.length'),4);
  await evaluate('filter="all";go("timeline")');
  assert.equal(await evaluate('shared.feed.filter(p=>p.self).length'),1,'Only the newest own post belongs in the timeline');
  assert.equal(await evaluate('document.querySelectorAll(".post .self-tag").length'),1);
  assert.equal(await evaluate('shared.feed.find(p=>p.self).id'),await evaluate('state.posts[0].id'));
  assert.equal(await evaluate('shared.tonightSummary.sleepingCount'),await evaluate('shared.sleepingCount'),'Repeated sleep posts count each person once');
  for(const width of [320,390,430]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
    await evaluate('go("stats")');
    assert.equal(await evaluate('document.querySelectorAll(".sleeping-cats .cat-scene").length'),await evaluate('Math.min(32,shared.tonightSummary.sleepingCount)'));
    assert.equal(await evaluate('document.querySelectorAll(".tonight-cats button,.tonight-cats a,#app [data-post]").length'),0);
    assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
    assert.equal(await evaluate('document.querySelector(".count").textContent.trim()'),await evaluate('`${shared.tonightSummary.sleepingCount} 人`'));
    await screenshot(`tonight-summary-${width}.png`);
  }
  await evaluate('if(refreshPromise)await refreshPromise;globalThis.summaryFetch=fetch;globalThis.fetch=async(input,options)=>{if(String(input).includes("/rpc/oyasumi_tonight_summary"))throw new Error("Simulated summary failure");return summaryFetch(input,options)};await refreshShared();go("stats")');
  assert.equal(await evaluate('shared.tonightSummary'),null);
  assert.equal(await evaluate('document.querySelectorAll(".sleeping-cats .cat-scene").length'),0);
  assert(await evaluate('Number.isFinite(shared.sleepingCount)'));
  await evaluate('globalThis.fetch=summaryFetch;await refreshShared()');
  // Check persisted appearance under the current server-controlled cooldown mode.
  const persistedCoat=await evaluate('state.coat');
  for(const coat of [persistedCoat]){
    await evaluate('go("settings")');assert.equal(await evaluate('document.querySelector("[data-coat-picker]").disabled'),await evaluate('!CatCoatCooldown.available(shared.catCoatStatus,NightClock.now())'));
    assert.equal(await evaluate('state.coat'),coat);
    assert(await evaluate(`shared.tonightSummary.coats.some(c=>c.coat===${JSON.stringify(coat)}&&c.count>=1)`),'Sleeping cat aggregates must reflect the selected coat');
    await evaluate('go("profile")');
    assert.equal(await evaluate('document.querySelector(".profile-banner .cat-face").dataset.catCoat'),coat);
  }
  await evaluate('go("profile")');await click('[data-expression-picker]');
  assert.equal(await evaluate('document.querySelectorAll("[data-expression]").length'),6);
  for(const expression of ['calm','sleepy','yawn','restless','surprised','happy']){
    await action(`[data-expression="${expression}"]`);
    assert.equal(await evaluate('state.expression'),expression);
    assert.equal(await evaluate('state.coat'),persistedCoat,'Expression changes must retain the selected coat');
    assert.equal(await evaluate('document.querySelector("#expression-dialog").open'),false);
    await evaluate('go("profile")');assert.equal(await evaluate('document.querySelector(".profile-banner .cat-face").dataset.catExpression'),expression);
    await evaluate('go("timeline")');assert(await evaluate(`Array.from(document.querySelectorAll('.post')).filter(p=>p.querySelector('.self-tag')).every(p=>p.querySelector('.cat-face').dataset.catExpression===${JSON.stringify(expression)})`));
    await evaluate('go("profile")');await click('[data-expression-picker]');
  }
  await evaluate('await refreshShared()');assert(await evaluate('document.querySelector("#expression-dialog").open'),'Refresh must not close expression picker');
  await screenshot('cat-expressions-mobile.png');await click('#cancel-expression');
  await click('[data-expression-picker]');await action('[data-expression="surprised"]');
  await send('Page.reload');await waitFor('typeof ready!=="undefined"&&ready&&!busy');
  assert.equal(await evaluate('state.expression'),'surprised','Reload must preserve the shared surprised expression');
  await evaluate('globalThis.peer=createOyasumiConnection("oyasumi-browser-peer");await peer.initialize()');
  await evaluate('go("profile")');
  for(const width of [320,390,430]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
    assert.equal(await evaluate('document.querySelector(".profile-banner .cat-face").dataset.catExpression'),'surprised');
    assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
    await click('[data-expression-picker]');
    assert(await evaluate('(()=>{const r=document.querySelector("#expression-dialog").getBoundingClientRect();return r.right<=innerWidth&&r.bottom<=innerHeight})()'));
    await screenshot(`surprised-picker-${width}.png`);await click('#cancel-expression');
  }
  await click('[data-expression-picker]');await action('[data-expression="happy"]');
  await evaluate('await peer.setCatExpression("restless");await refreshShared();filter="all";go("timeline")');
  assert.equal(await evaluate(`document.querySelector('[data-react="${peerId}"]').closest('.post').querySelector('.cat-face').dataset.catExpression`),'restless');
  assert.equal(await evaluate(`document.querySelector('[data-react="${peerId}"]').closest('.post').querySelector('.cat-face').dataset.catCoat`),'calico');
  assert.equal(await evaluate('state.posts.length'),4,'Expressions must not create posts');
  await evaluate('go("sleep")');
  assert.equal(await evaluate('document.querySelector("[data-finish-sleep]").textContent'),'また明日 🌙');
  await click('[data-finish-sleep]');assert.equal(await evaluate('view'),'rest');
  assert.equal(await evaluate('document.querySelector(".rest-cat .cat-scene").dataset.catScene'),'sleeping');
  assert.equal(await evaluate('document.querySelector(".rest-cat .cat-scene").dataset.catCoat'),persistedCoat);
  assert.equal(await evaluate('state.expression'),'happy','Scene must not change the selected profile expression');
  assert.equal(await evaluate('state.lastSleep.coat'),persistedCoat);
  assert.equal(await evaluate('document.querySelectorAll("#app button,#app .post,#navigation button").length'),0);
  assert.equal(await evaluate('getComputedStyle(document.querySelector("#navigation")).display'),'none');
  assert((await evaluate('app.textContent')).includes('今日もおつかれさまでした'));
  assert((await evaluate('app.textContent')).includes('スマホを置いて、ゆっくり休もう'));
  assert(!(await evaluate('app.textContent')).includes('おはようございます'));
  assert.equal(await evaluate('state.posts.length'),4,'Ending must not create a new post');
  for(const width of [320,390,430]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
    assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
    assert.equal(await evaluate('document.querySelectorAll("#app button,#navigation button").length'),0);
  }
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await screenshot('sleep-ending-mobile.png');
  await waitFor('document.querySelector(".rest-screen").dataset.phase==="settled"',10000);
  assert.equal(await evaluate('app.textContent.trim()'),'おやすみなさい 🌙');
  assert.equal(await evaluate('document.querySelectorAll("#app button,#app .rest-message,#app .count,#app .post,#app .chart,#navigation button").length'),0);
  assert.equal(await evaluate('document.querySelector(".rest-cat .cat-scene").dataset.catCoat'),persistedCoat);
  assert(Number(await evaluate('getComputedStyle(document.querySelector(".rest-screen"),"::before").opacity'))>=0.6);
  for(const width of [320,390,430]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
    assert(await evaluate('(()=>{const el=document.querySelector(".rest-screen"),r=el.getBoundingClientRect(),s=getComputedStyle(el);return s.backgroundColor==="rgb(0, 0, 0)"&&s.position==="fixed"&&r.left===0&&r.top===0&&r.width===innerWidth&&r.height===innerHeight&&getComputedStyle(el,"::before").opacity==="1"})()'),'Final dark background must cover the whole mobile viewport');
    assert.equal(await evaluate('app.textContent.trim()'),'おやすみなさい 🌙');
    assert.equal(await evaluate('document.querySelector(".rest-cat .cat-scene").dataset.catScene'),'sleeping');
    await screenshot(`sleep-dark-${width}.png`);
  }
  await screenshot('sleep-settled-mobile.png');
  await send('Page.reload');await waitFor('typeof ready!=="undefined" && ready && !busy');
  assert.equal(await evaluate('view'),'rest','Night reload must preserve the quiet ending');
  assert.equal(await evaluate('document.querySelector(".rest-screen").dataset.phase'),'settled','Reload must not restart the introduction');
  assert.equal(await evaluate('shared.userId'),userId);
  await evaluate('globalThis.actualDateNow=Date.now;globalThis.savedSleep=JSON.parse(JSON.stringify(state.lastSleep));Date.now=()=>Date.parse("2026-10-04T08:00:00+09:00");NightClock.sync({serverNow:Date.now(),monotonicAt:performance.now(),resetAt:Date.now()+86400000});shared.nightDate=NightClock.night();state.lastSleep={...savedSleep,nightDate:"2026-10-03",at:"2026-10-03T23:00:00+09:00",finishedAt:"2026-10-03T23:01:00+09:00",finished:true};document.dispatchEvent(new Event("visibilitychange"))');
  await waitFor('view==="morning"&&!refreshPromise');
  assert.equal(await evaluate('document.querySelector(".morning-cat .cat-scene").dataset.catScene'),'awake');
  assert.equal(await evaluate('document.querySelector(".morning-cat .cat-scene").dataset.catCoat'),persistedCoat);
  assert.equal(await evaluate('state.expression'),'happy');
  await screenshot('morning-cat-mobile.png');
  await click('[data-morning]');assert.equal(await evaluate('state.morningDays.length'),2);
  await click('[data-morning]');assert.equal(await evaluate('state.morningDays.length'),2,'Morning record remains idempotent');
  await evaluate('Date.now=actualDateNow;NightClock.sync(shared.clock);shared.nightDate=shared.clock.nightDate;state.lastSleep={...savedSleep,finished:false};save();go("settings")');
  await evaluate('go("settings")');await click('[data-name]');
  const submitName=value=>evaluate(`document.querySelector('#nickname').value=${JSON.stringify(value)};document.querySelector('#nickname').dispatchEvent(new Event('input'));document.querySelector('#nickname-form').requestSubmit()`);
  for(const [value,reason] of [['','1〜12文字'],['あ'.repeat(13),'1〜12文字'],['a@b.jp','連絡先'],['０９０１２３４５６７８','連絡先'],['死ね','不適切'],['<b>ねこ</b>','記号']]){await submitName(value);assert((await evaluate('document.querySelector("#nickname-error").textContent')).includes(reason));assert.equal(await evaluate('state.name'),'旧ねこ');}
  await submitName('👨‍👩‍👧‍👦'.repeat(2));await waitFor('!busy');assert((await evaluate('document.querySelector("#nickname-error").textContent')).includes('1〜12文字'),'Server-side errors must stay inline');
  await evaluate('document.querySelector("#nickname").value="入力中";await refreshShared()');assert.equal(await evaluate('document.querySelector("#nickname").value'),'入力中','Refresh must preserve nickname drafts');
  await submitName('月ねこ');await waitFor('!busy');assert.equal(await evaluate('state.name'),'月ねこ');assert.equal(await evaluate('document.querySelector("#nickname-dialog").open'),false);
  await click('[data-name]');await evaluate('document.querySelector("#nickname").value="未保存"');await click('#cancel-name');assert.equal(await evaluate('state.name'),'月ねこ');
  await send('Page.reload');await waitFor('typeof ready!=="undefined" && ready && !busy');
  assert.equal(await evaluate('shared.userId'),userId,'Reload must reuse the anonymous identity');assert.equal(await evaluate('state.posts.length'),4);assert.equal(await evaluate('state.name'),'月ねこ');assert.equal(await evaluate('state.morningDays.length'),2);
  assert.equal(await evaluate('state.expression'),'happy','Reload must preserve the shared expression');
  assert.equal(await evaluate('state.coat'),persistedCoat,'Reload must preserve the shared coat');
  await evaluate('go("home")');await send('Network.enable');await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  await action('[data-post="sleep"]');assert.equal(await evaluate('view'),'home','Failed post must not show completion');assert.equal(await evaluate('state.posts.length'),4);assert((await evaluate('document.querySelector("#toast").textContent')).includes('通信'));
  await evaluate('go("profile")');await click('[data-expression-picker]');await action('[data-expression="calm"]');
  assert.equal(await evaluate('state.expression'),'happy','Failed expression save must retain the existing expression');assert(await evaluate('document.querySelector("#expression-error").textContent.length>0'));await click('#cancel-expression');await evaluate('go("home")');
  await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  await waitFor('!refreshPromise');
  await evaluate('if(refreshPromise)await refreshPromise;globalThis.originalFetch=fetch;globalThis.fetch=async(input,options)=>{if(String(input).includes("/rpc/oyasumi_tonight_counts"))throw new Error("Simulated count refresh failure");return originalFetch(input,options)}');
  await action('[data-post="sleep"]');assert.equal(await evaluate('view'),'sleep','A saved post remains successful if count refresh fails');assert.equal(await evaluate('state.posts.length'),5);assert.equal(await evaluate('state.lastSleep.count'),null);
  assert.equal(await evaluate('document.querySelector(".sleep-cat .cat-face").dataset.catCoat'),persistedCoat);
  assert.equal(await evaluate('state.posts[0].coat'),persistedCoat);
  assert.equal(await evaluate('state.posts[0].expression'),'happy');
  await evaluate('globalThis.fetch=originalFetch;await refreshShared()');
  await evaluate('if(refreshPromise)await refreshPromise;globalThis.fetch=async(input,options)=>{if(String(input).includes("/rpc/oyasumi_tonight_trend"))throw new Error("Simulated trend refresh failure");return originalFetch(input,options)};await refreshShared();go("stats")');
  assert.equal(await evaluate('shared.trend.length'),0);
  assert(!(await evaluate('document.querySelector(".chart").textContent')).includes('サンプル'));
  await evaluate('go("home")');
  assert.equal(await evaluate('document.querySelector("[data-trend-comment]").dataset.trendComment'),'insufficient');
  assert(await evaluate('Number.isFinite(shared.awakeCount)'),'Trend failure must preserve existing counts');
  await evaluate('globalThis.fetch=originalFetch;await refreshShared()');
  for(const width of [320,390,430,1280]){await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<500});for(const page of ['home','timeline','sleep','rest','morning','profile','settings','stats']){await evaluate(`go(${JSON.stringify(page)})`);assert(await evaluate('document.documentElement.scrollWidth<=window.innerWidth'),`Overflow ${page} at ${width}`);assert.equal(await evaluate('document.querySelectorAll("textarea,input:not([type=checkbox]):not(#nickname):not(#profile-note),[contenteditable=true]").length'),0);}}
  await send('Emulation.setDeviceMetricsOverride',{width:320,height:720,deviceScaleFactor:1,mobile:true});await evaluate('go("profile")');await click('[data-expression-picker]');
  assert(await evaluate('document.querySelector("#expression-dialog").getBoundingClientRect().right<=innerWidth'));
  assert(await evaluate('document.querySelector("#expression-dialog").getBoundingClientRect().bottom<=innerHeight'));await click('#cancel-expression');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await evaluate('go("stats")');await screenshot('trend-mobile.png');await evaluate('go("home")');await screenshot('home-mobile.png');await evaluate('go("timeline")');await screenshot('timeline-mobile.png');
  await evaluate('go("home")');
  for(const width of [320,390,430]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
    assert(await evaluate('(()=>{const [a,b]=Array.from(document.querySelectorAll(".status-button"),el=>el.getBoundingClientRect());return Math.abs(a.width-b.width)<1&&a.height===b.height&&a.top===b.top})()'));
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".status-button")).textAlign'),'center');
    assert.equal(await evaluate('document.querySelectorAll(".count .people").length'),0);
    assert(await evaluate('(()=>{const el=document.querySelector(".count"),range=document.createRange();range.selectNodeContents(el);const text=range.getBoundingClientRect(),box=el.getBoundingClientRect();return Math.abs((text.left+text.right)-(box.left+box.right))<2})()'),'Count must be centered');
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".status-button.sleep")).backgroundImage'),'linear-gradient(125deg, rgb(255, 172, 163), rgb(252, 129, 155))');
    assert.equal(await evaluate('getComputedStyle(document.querySelector(".status-button.awake")).backgroundImage'),'linear-gradient(125deg, rgb(131, 152, 255), rgb(88, 108, 227))');
    await evaluate('filter="all";go("timeline")');
    assert(await evaluate('(()=>{const r=Array.from(document.querySelector(".reaction-options").children,el=>el.getBoundingClientRect());return r.length===4&&r[0].top===r[1].top&&r[2].top===r[3].top&&r[2].top>r[0].top&&Math.abs(r[0].width-r[1].width)<1})()'));
    assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));
    await evaluate('go("home")');
  }
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await screenshot('home-mobile.png');await evaluate('go("timeline")');await screenshot('timeline-mobile.png');
  await action('[data-delete]');assert.equal(await evaluate('state.posts.length'),4);
  assert.equal(await evaluate('localStorage.getItem(STORAGE_KEY)'),oldData);
  assert.deepEqual(errors,[]);
  console.log('PASS browser: all six shared cat expressions, profile/feed/sleep rendering, expression persistence and offline failure, anonymous session, shared posts/reactions/counts, nickname checks, preserved legacy data, mobile widths and no runtime errors.');
})().catch(error=>{console.error('FAIL browser:',error.stack);process.exitCode=1;}).finally(async()=>{
  if(evaluate){try{await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});await evaluate('globalThis.fetch=globalThis.originalFetch||fetch;for(const post of state.posts)await OyasumiAPI.deletePost(post.id);if(localStorage.getItem("oyasumi-browser-peer")){const cleanupPeer=globalThis.peer||createOyasumiConnection("oyasumi-browser-peer");await cleanupPeer.initialize();for(const post of (await cleanupPeer.snapshot()).ownPosts)await cleanupPeer.deletePost(post.id)}');}catch(error){console.error('Browser test cleanup failed:',error.message);process.exitCode=1;}}
  socket?.close();browser.kill();server.kill();
});
