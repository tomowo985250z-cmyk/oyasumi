const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const browserPath = process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'oyasumi-browser-'));
const server = spawn(process.execPath, ['server.js'], { stdio: 'ignore' });
const browser = spawn(browserPath, ['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=9333',`--user-data-dir=${profile}`,'about:blank'], {stdio:'ignore'});
let socket, evaluate, send;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const oldData = JSON.stringify({name:'旧ねこ',posts:[{id:'old-local-post',status:'awake',time:Date.now()}],reactions:{'old-local-post':'dream'},morningDays:['2026-01-01'],light:false});
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
  const action=async selector=>{await click(selector);await waitFor('!busy');};
  const screenshot=async filename=>{await delay(200);const data=await send('Page.captureScreenshot',{format:'png'});fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync(`test-results/${filename}`,Buffer.from(data.data,'base64'));};
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`if(!localStorage.getItem('oyasumi-test-seeded')){localStorage.setItem('oyasumi-v1',${JSON.stringify(oldData)});localStorage.setItem('oyasumi-test-seeded','yes');}`});
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await send('Page.navigate',{url:'http://127.0.0.1:3000'});
  await waitFor('typeof ready!=="undefined" && ready && !busy');
  assert.equal(await evaluate('localStorage.getItem(STORAGE_KEY)'),oldData,'Legacy data must remain intact');
  assert.equal(await evaluate('state.posts.length'),0,'Legacy posts must not be uploaded');
  assert.equal(await evaluate('state.name'),'旧ねこ');
  assert.deepEqual(await evaluate('state.morningDays'),['2026-01-01']);
  if(process.argv.includes('--preview-cats')){
    await evaluate('go("profile")');await click('[data-expression-picker]');
    assert.equal(await evaluate('document.querySelectorAll("[data-expression]").length'),5);
    assert(await evaluate('Array.from(document.querySelectorAll("#expression-options use")).every(el=>el.getAttribute("href")==="cat.svg#cat-base")'));
    assert.equal(await evaluate('CatFaces.normalize("<script>")'),'calm');
    await screenshot('cat-expressions-mobile.png');
    await send('Emulation.setDeviceMetricsOverride',{width:320,height:720,deviceScaleFactor:1,mobile:true});
    assert(await evaluate('document.querySelector("#expression-dialog").getBoundingClientRect().right<=innerWidth'));
    assert(await evaluate('document.querySelector("#expression-dialog").getBoundingClientRect().bottom<=innerHeight'));
    await click('#cancel-expression');assert.equal(await evaluate('state.expression'),'calm');
    await evaluate('go("settings")');await click('[data-coat-picker]');
    assert.equal(await evaluate('document.querySelectorAll("[data-coat]").length'),8);
    await screenshot('cat-coats-mobile.png');
    assert(await evaluate('document.querySelector("#expression-dialog").getBoundingClientRect().bottom<=innerHeight'));
    await click('#cancel-expression');
    for(const coat of ['calico','orange','brown','silver','black','white','tuxedo','gray']){
      for(const expression of ['calm','sleepy','yawn','restless','happy']){
        await evaluate(`state.coat=${JSON.stringify(coat)};state.expression=${JSON.stringify(expression)};go("profile")`);
        assert.equal(await evaluate('document.querySelector(".profile-banner .cat-face").dataset.catCoat'),coat);
        await click('[data-expression-picker]');
        assert(await evaluate(`Array.from(document.querySelectorAll('#expression-options .cat-face')).every(el=>el.dataset.catCoat===${JSON.stringify(coat)})`));
        await click('#cancel-expression');
      }
    }
    await evaluate('state.coat="calico";state.expression="calm";go("home")');
    assert.equal(await evaluate('localStorage.getItem(STORAGE_KEY)'),oldData);assert.deepEqual(errors,[]);
    console.log('PASS cat preview: 40 SVG coat/expression combinations, eight coat choices and five expressions, mobile picker, cancellation, safe defaults and preserved existing shared-data loading. Persistence test still requires SQL migration.');
    return;
  }
  assert(await evaluate('shared.expressionSupported'),'Run supabase/cat-appearance.sql before browser expression tests.');
  const userId=await evaluate('shared.userId');
  await action('[data-post="awake"]');assert.equal(await evaluate('view'),'timeline');assert.equal(await evaluate('state.posts.length'),1);
  const firstId=await evaluate('state.posts[0].id');
  await evaluate('go("home")');await action('[data-post="awake"]');assert.equal(await evaluate('state.posts.length'),1,'Repeated post must be deduplicated');
  await evaluate('globalThis.peer=createOyasumiConnection("oyasumi-browser-peer");await peer.initialize("検証ほし");globalThis.peerPost=await peer.submitPost("awake");await refreshShared()');
  const peerId=await evaluate('peerPost.id');
  assert(await evaluate(`shared.feed.some(p=>p.id===${JSON.stringify(peerId)}&&!p.self)`));
  assert.equal(await evaluate(`document.querySelectorAll('[data-delete="${peerId}"]').length`),0,'Peer posts have no delete control');
  for(const choice of ['goodnight','dream','tomorrow']){await action(`[data-react="${peerId}"][data-reaction="${choice}"]`);assert.equal(await evaluate(`state.reactions[${JSON.stringify(peerId)}]`),choice);assert.equal(await evaluate(`(await peer.snapshot()).reactionCounts[${JSON.stringify(peerId)}][${JSON.stringify(choice)}]`),1);}
  await action(`[data-react="${peerId}"][data-reaction="tomorrow"]`);assert.equal(await evaluate(`state.reactions[${JSON.stringify(peerId)}]`),undefined);
  await evaluate(`await peer.setReaction(${JSON.stringify(firstId)},'dream');await refreshShared()`);assert.equal(await evaluate(`shared.reactionCounts[${JSON.stringify(firstId)}].dream`),1);
  await evaluate('window.scrollTo(0,150);globalThis.previousScroll=window.scrollY;await refreshShared()');assert.equal(await evaluate('window.scrollY'),await evaluate('previousScroll'),'Refresh must preserve scroll');
  await click('[data-filter="sleep"]');assert.equal(await evaluate('document.querySelectorAll(".awake-text").length'),0);
  for(const choice of ['sleep','try-sleep','early-sleep']){await evaluate('go("home")');await action(`[data-post="${choice}"]`);assert.equal(await evaluate('view'),'sleep');assert.equal(await evaluate('shared.myState'),'sleep');assert.equal(await evaluate('state.lastSleep.count'),await evaluate('shared.sleepingCount'));}
  assert.equal(await evaluate('state.posts.length'),4);
  for(const coat of ['calico','orange','brown','silver','black','white','tuxedo','gray']){
    await evaluate('go("settings")');await click('[data-coat-picker]');await action(`[data-coat="${coat}"]`);
    assert.equal(await evaluate('state.coat'),coat);
    await evaluate('go("profile")');
    assert.equal(await evaluate('document.querySelector(".profile-banner .cat-face").dataset.catCoat'),coat);
  }
  await evaluate('go("profile")');await click('[data-expression-picker]');
  assert.equal(await evaluate('document.querySelectorAll("[data-expression]").length'),5);
  for(const expression of ['calm','sleepy','yawn','restless','happy']){
    await action(`[data-expression="${expression}"]`);
    assert.equal(await evaluate('state.expression'),expression);
    assert.equal(await evaluate('state.coat'),'gray','Expression changes must retain the selected coat');
    assert.equal(await evaluate('document.querySelector("#expression-dialog").open'),false);
    await evaluate('go("profile")');assert.equal(await evaluate('document.querySelector(".profile-banner .cat-face").dataset.catExpression'),expression);
    await evaluate('go("timeline")');assert(await evaluate(`Array.from(document.querySelectorAll('.post')).filter(p=>p.querySelector('.self-tag')).every(p=>p.querySelector('.cat-face').dataset.catExpression===${JSON.stringify(expression)})`));
    await evaluate('go("profile")');await click('[data-expression-picker]');
  }
  await evaluate('await refreshShared()');assert(await evaluate('document.querySelector("#expression-dialog").open'),'Refresh must not close expression picker');
  await screenshot('cat-expressions-mobile.png');await click('#cancel-expression');
  await evaluate('await peer.setCatCoat("black");await peer.setCatExpression("restless");await refreshShared();filter="all";go("timeline")');
  assert.equal(await evaluate(`document.querySelector('[data-react="${peerId}"]').closest('.post').querySelector('.cat-face').dataset.catExpression`),'restless');
  assert.equal(await evaluate(`document.querySelector('[data-react="${peerId}"]').closest('.post').querySelector('.cat-face').dataset.catCoat`),'black');
  assert.equal(await evaluate('state.posts.length'),4,'Expressions must not create posts');
  await evaluate('go("sleep")');
  await click('[data-view="morning"]');await click('[data-morning]');assert.equal(await evaluate('state.morningDays.length'),2);
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
  assert.equal(await evaluate('state.coat'),'gray','Reload must preserve the shared coat');
  await evaluate('go("home")');await send('Network.enable');await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  await action('[data-post="sleep"]');assert.equal(await evaluate('view'),'home','Failed post must not show completion');assert.equal(await evaluate('state.posts.length'),4);assert((await evaluate('document.querySelector("#toast").textContent')).includes('通信'));
  await evaluate('go("profile")');await click('[data-expression-picker]');await action('[data-expression="calm"]');
  assert.equal(await evaluate('state.expression'),'happy','Failed expression save must retain the existing expression');assert(await evaluate('document.querySelector("#expression-error").textContent.length>0'));await click('#cancel-expression');await evaluate('go("home")');
  await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  await waitFor('!refreshPromise');
  await evaluate('globalThis.originalFetch=fetch;globalThis.fetch=async(input,options)=>{if(String(input).includes("/rpc/oyasumi_tonight_counts"))throw new Error("Simulated count refresh failure");return originalFetch(input,options)}');
  await action('[data-post="sleep"]');assert.equal(await evaluate('view'),'sleep','A saved post remains successful if count refresh fails');assert.equal(await evaluate('state.posts.length'),5);assert.equal(await evaluate('state.lastSleep.count'),null);
  await evaluate('globalThis.fetch=originalFetch;await refreshShared()');
  for(const width of [320,390,430,1280]){await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<500});for(const page of ['home','timeline','sleep','morning','profile','settings','stats']){await evaluate(`go(${JSON.stringify(page)})`);assert(await evaluate('document.documentElement.scrollWidth<=window.innerWidth'),`Overflow ${page} at ${width}`);assert.equal(await evaluate('document.querySelectorAll("textarea,input:not([type=checkbox]):not(#nickname),[contenteditable=true]").length'),0);}}
  await send('Emulation.setDeviceMetricsOverride',{width:320,height:720,deviceScaleFactor:1,mobile:true});await evaluate('go("profile")');await click('[data-expression-picker]');
  assert(await evaluate('document.querySelector("#expression-dialog").getBoundingClientRect().right<=innerWidth'));
  assert(await evaluate('document.querySelector("#expression-dialog").getBoundingClientRect().bottom<=innerHeight'));await click('#cancel-expression');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await evaluate('go("home")');await screenshot('home-mobile.png');await evaluate('go("timeline")');await screenshot('timeline-mobile.png');
  await action('[data-delete]');assert.equal(await evaluate('state.posts.length'),4);
  assert.equal(await evaluate('localStorage.getItem(STORAGE_KEY)'),oldData);
  assert.deepEqual(errors,[]);
  console.log('PASS browser: all five shared cat expressions, profile/feed/sleep rendering, expression persistence and offline failure, anonymous session, shared posts/reactions/counts, nickname checks, preserved legacy data, mobile widths and no runtime errors.');
})().catch(error=>{console.error('FAIL browser:',error.message);process.exitCode=1;}).finally(async()=>{
  if(evaluate){try{await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});await evaluate('globalThis.fetch=globalThis.originalFetch||fetch;for(const post of state.posts)await OyasumiAPI.deletePost(post.id);if(localStorage.getItem("oyasumi-browser-peer")){const cleanupPeer=globalThis.peer||createOyasumiConnection("oyasumi-browser-peer");await cleanupPeer.initialize();for(const post of (await cleanupPeer.snapshot()).ownPosts)await cleanupPeer.deletePost(post.id)}');}catch(error){console.error('Browser test cleanup failed:',error.message);process.exitCode=1;}}
  socket?.close();browser.kill();server.kill();
});
