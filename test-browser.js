const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const browserPath = process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'oyasumi-browser-'));
const server = spawn(process.execPath, ['server.js'], { stdio: 'ignore' });
const browser = spawn(browserPath, ['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=9333',`--user-data-dir=${profile}`,'about:blank'], {stdio:'ignore'});
let socket;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  let tabs;
  for(let i=0;i<60;i++){try{tabs=await (await fetch('http://127.0.0.1:9333/json')).json();break;}catch{await delay(250);}}
  assert(tabs,'Browser did not start');
  socket = new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
  let id=0;const pending=new Map();const errors=[];
  socket.addEventListener('message',event=>{const data=JSON.parse(event.data);if(data.id){const p=pending.get(data.id);pending.delete(data.id);data.error?p.reject(data.error):p.resolve(data.result);}if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails.text);});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});socket.send(JSON.stringify({id:key,method,params}));});
  const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert(!result.exceptionDetails,JSON.stringify(result.exceptionDetails));return result.result.value;};
  const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await send('Page.navigate',{url:'http://127.0.0.1:3000'});await delay(600);
  await evaluate('localStorage.clear(); location.reload()');await delay(400);
  assert(await evaluate('document.body.innerText.includes("今夜まだ起きてる人")'));
  await click('[data-post="awake"]');assert.equal(await evaluate('state.posts.length'),1);
  const reaction='[data-react="sample-0"][data-reaction="goodnight"]';await click(reaction);assert.equal(await evaluate('state.reactions["sample-0"]'),'goodnight');await click(reaction);assert.equal(await evaluate('Object.keys(state.reactions).length'),0);
  await click('[data-react="sample-0"][data-reaction="dream"]');assert.equal(await evaluate('state.reactions["sample-0"]'),'dream');
  await click('[data-react="sample-0"][data-reaction="tomorrow"]');assert.equal(await evaluate('state.reactions["sample-0"]'),'tomorrow');assert.equal(await evaluate('document.querySelectorAll("[data-react=sample-0][aria-pressed=true]").length'),1);
  await click('[data-react="sample-0"][data-reaction="tomorrow"]');assert.equal(await evaluate('Object.keys(state.reactions).length'),0);
  await click('[data-filter="sleep"]');assert.equal(await evaluate('document.querySelectorAll(".awake-text").length'),0);
  await click('[data-view="home"]');await click('[data-post="sleep"]');assert(await evaluate('document.body.innerText.includes("おやすみなさい")'));
  for(const [status,text] of [['try-sleep','眠れないけど寝てみる 💤'],['early-sleep','お先に寝ます 👋']]){await click('[data-view="home"]');await click(`[data-post="${status}"]`);assert(await evaluate('document.body.innerText.includes("おやすみなさい")'));assert.equal(await evaluate('state.posts[0].status'),status);await evaluate('go("timeline"); filter="sleep"; render()');assert(await evaluate(`document.querySelector('.post-text').textContent===${JSON.stringify(text)}`));}
  await evaluate('go("home")');await click('[data-post="early-sleep"]');assert.equal(await evaluate('state.posts.length'),4,'Duplicate taps must not add a second post');
  await click('[data-view="morning"]');await click('[data-morning]');assert.equal(await evaluate('state.morningDays.length'),1);assert(await evaluate('document.querySelector("[data-morning]").disabled'));
  await click('[data-view="profile"]');await click('[data-view="settings"]');await click('[data-name]');
  const submitName = value => evaluate(`document.querySelector('#nickname').value=${JSON.stringify(value)};document.querySelector('#nickname').dispatchEvent(new Event('input'));document.querySelector('#nickname-form').requestSubmit()`);
  const beforeNickname = await evaluate('JSON.stringify({posts:state.posts,reactions:state.reactions,morningDays:state.morningDays,light:state.light})');
  for(const [value,reason] of [ ['', '1〜12文字'], ['あ'.repeat(13),'1〜12文字'], ['example.com','連絡先'], ['https://a.jp','連絡先'], ['a@b.jp','連絡先'], ['ａ＠ｂ．ｊｐ','連絡先'], ['０９０１２３４５６７８','連絡先'], ['03-1234-5678','連絡先'], ['死ね','不適切'], ['キチガイ','不適切'], ['セックス','不適切'], ['ﾁﾝｺ','不適切'], ['fuck','不適切'], ['f.u.c.k','不適切'], ['nigger','不適切'], ['ね\u200bこ','記号'], ['<b>ねこ</b>','記号'] ]) {
   await submitName(value);assert(await evaluate('document.querySelector("#nickname-dialog").open'));
   assert((await evaluate('document.querySelector("#nickname-error").textContent')).includes(reason),`Nickname reason: ${value}`);
   assert.equal(await evaluate('state.name'),'ともを');assert.equal(await evaluate('JSON.parse(localStorage.getItem(STORAGE_KEY)).name'),'ともを');
  }
  await delay(150);fs.mkdirSync('test-results',{recursive:true});const nameShot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('test-results/nickname-mobile.png',Buffer.from(nameShot.data,'base64'));
  await evaluate('document.querySelector("#nickname").value="ねこ";document.querySelector("#nickname").dispatchEvent(new Event("input"))');assert.equal(await evaluate('document.querySelector("#nickname-error").textContent'),'');
  for(const name of ['あ','あ'.repeat(12),'🌙'.repeat(12),'👨‍👩‍👧‍👦','ピエロ','あほうどり','Sussex','  月ねこ  ']) { assert.equal(await evaluate(`NicknameRules.validate(${JSON.stringify(name)}).error`),''); }
  await submitName('月ねこ');assert.equal(await evaluate('state.name'),'月ねこ');assert.equal(await evaluate('document.querySelector("#nickname-dialog").open'),false);
  assert.equal(await evaluate('JSON.stringify({posts:state.posts,reactions:state.reactions,morningDays:state.morningDays,light:state.light})'),beforeNickname,'Nickname updates must preserve other data');
  await click('[data-name]');await evaluate('document.querySelector("#nickname").value="未保存"');await click('#cancel-name');assert.equal(await evaluate('state.name'),'月ねこ');
  await evaluate('go("timeline")');await click('[data-react="sample-0"][data-reaction="dream"]');
  await send('Page.reload');await delay(400);assert.equal(await evaluate('state.posts.length'),4);assert.equal(await evaluate('state.name'),'月ねこ');assert.equal(await evaluate('state.reactions["sample-0"]'),'dream');
  await evaluate('go("settings")');await click('[data-name]');await submitName('あ'.repeat(12));
  for(const width of [320,390,430,1280]){await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:width<500});for(const page of ['home','timeline','sleep','morning','profile','settings','stats']){await evaluate(`go(${JSON.stringify(page)})`);assert(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'),`Overflow: ${page} at ${width}`);assert.equal(await evaluate('document.querySelectorAll("textarea,input:not([type=checkbox]):not(#nickname),[contenteditable=true]").length'),0,'Only nickname may accept free text');}}
  await send('Emulation.setDeviceMetricsOverride',{width:320,height:720,deviceScaleFactor:1,mobile:true});await evaluate('go("settings")');await click('[data-name]');await submitName('a@b.jp');await delay(150);
  assert(await evaluate('document.querySelector("#nickname-dialog").getBoundingClientRect().right <= window.innerWidth'));
  assert(await evaluate('document.querySelector("#nickname-dialog").getBoundingClientRect().bottom <= window.innerHeight'));await click('#cancel-name');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await evaluate('go("home")');await delay(150);
  const capture=await send('Page.captureScreenshot',{format:'png'});fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/home-mobile.png',Buffer.from(capture.data,'base64'));
  await evaluate('go("timeline")');await delay(150);assert.equal(await evaluate('document.querySelectorAll(".header").length'),1);const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('test-results/timeline-mobile.png',Buffer.from(shot.data,'base64'));
  await click('[data-delete]');assert.equal(await evaluate('state.posts.length'),3);
  await evaluate('localStorage.setItem(STORAGE_KEY,JSON.stringify({name:"自由入力の旧名",posts:[{id:"old",status:"sleep",time:Date.now(),count:0}],reactions:["sample-0"],morningDays:[]}));location.reload()');await delay(400);
  assert.equal(await evaluate('state.name'),'自由入力の旧名');assert.equal(await evaluate('state.posts.length'),1);assert.equal(await evaluate('state.reactions["sample-0"]'),'goodnight');
  await evaluate('const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));saved.name="a@b.jp";localStorage.setItem(STORAGE_KEY,JSON.stringify(saved));location.reload()');await delay(400);
  assert.equal(await evaluate('state.name'),'ともを');assert.equal(await evaluate('state.posts.length'),1);assert.equal(await evaluate('state.reactions["sample-0"]'),'goodnight');
  assert.deepEqual(errors,[]);console.log('PASS: preset-only communication, nickname length/contact/profanity checks and inline reasons, Unicode names, cancellation, persistence, other-data preservation, legacy names, unsafe legacy fallback, responsive widths, no runtime errors.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{socket?.close();browser.kill();server.kill();});
