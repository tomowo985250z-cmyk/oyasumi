const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {webkit,chromium}=require('./output/webkit-tools/core/package'),installTransport=require('./test-support/timeline-cat-fixture.cjs');
const edge=process.argv.includes('--edge'),engine=edge?'edge':'webkit',port=edge?9522:9521,base=`http://127.0.0.1:${port}/`,out=path.join(__dirname,'output/timeline-cat-state',engine);
fs.mkdirSync(out,{recursive:true});
const owner='00000000-0000-0000-0000-000000000001',peer='00000000-0000-0000-0000-000000000002';
const db={at:Date.parse('2026-10-16T14:00:00+09:00'),order:0,posts:[],writes:[],gates:[],holdProfiles:false,profiles:[owner,peer].map((user_id,i)=>({user_id,nickname:i?'となりの猫':'自分の猫',cat_coat:i?'manul':'calico',cat_expression:'surprised',cat_role:null,profile_note:''}))};
const night=at=>new Date(at+3*3600000).toISOString().slice(0,10),asleep=choice=>['sleep','try-sleep','early-sleep'].includes(choice);
function add(user,choice,intent){const row={id:`timeline-${++db.order}`,user_id:user,choice,post_intent:intent,created_at:new Date(++db.at).toISOString(),night_date:night(db.at),event_order:db.order};db.posts.push(row);return row;}
add(peer,'awake','relax');
function transport(q){
 let result;
 if(q.type==='rpc'){
  const n=night(db.at),latest=[...db.posts].sort((a,b)=>b.event_order-a.event_order).filter((r,i,rows)=>rows.findIndex(p=>p.user_id===r.user_id)===i),own=latest.find(p=>p.user_id===q.user);
  if(q.name==='oyasumi_night_context')result={data:[{night_date:n,morning_night_date:night(db.at-86400000),server_now:new Date(db.at).toISOString(),next_reset_at:new Date(Date.parse(n+'T06:00:00+09:00')+86400000).toISOString()}]};
  else if(q.name==='oyasumi_tonight_counts')result={data:[{night_date:n,awake_count:latest.filter(p=>!asleep(p.choice)).length,sleeping_count:latest.filter(p=>asleep(p.choice)).length,my_state:own?(asleep(own.choice)?'sleep':'awake'):null}]};
  else if(q.name==='oyasumi_cat_care_status')result={data:{allowanceVersion:2,sleepStateVersion:1,catState:own?(asleep(own.choice)?'sleep':'awake'):null,mealSleeping:!!own&&asleep(own.choice),day:n,mealSlot:'night',mealEligible:true,mealDone:false,treatGiven:false,treatCount:0,treatRecipients:[],receivedToday:0,receivedTotal:0,receivedDays:[]}};
  else if(q.name==='oyasumi_submit_post_v2'||q.name==='oyasumi_submit_post'){db.writes.push(q);result={data:add(q.user,q.args.p_choice,q.args.p_intent)};}
  else if(q.name==='oyasumi_cat_coat_status')result={data:[{next_change_at:null}]};
  else if(q.name==='oyasumi_cat_coat_cooldown_paused')result={data:true};
  else if(['oyasumi_morning_reactions_v2','oyasumi_tonight_summary','oyasumi_tonight_trend','oyasumi_reaction_counts_v3'].includes(q.name))result={data:[]};
  else result={error:{code:'PGRST202'}};
 }else{
  let rows=structuredClone(q.table==='oyasumi_profiles'?db.profiles:db.posts);
  for(const {method,key,value} of q.filters)rows=rows.filter(row=>method==='eq'?row[key]===value:method==='in'?value.includes(row[key]):method==='gt'?row[key]>value:method==='gte'?row[key]>=value:row[key]<value);
  for(const {key,ascending} of [...q.orders].reverse())rows.sort((a,b)=>(a[key]<b[key]?-1:a[key]>b[key]?1:0)*(ascending?1:-1));
  const count=rows.length;if(q.range)rows=rows.slice(q.range[0],q.range[1]+1);if(q.limit)rows=rows.slice(0,q.limit);
  result={data:q.head?null:q.single?rows[0]||null:rows,...(q.head?{count}:{})};
  if(db.holdProfiles&&q.table==='oyasumi_profiles'&&!q.single&&q.fields.includes('cat_expression')){
   db.holdProfiles=false;return new Promise(resolve=>db.gates.push(()=>resolve(result)));
  }
 }
 return result;
}
const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'ignore'});let browser;
(async()=>{try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await(edge?chromium:webkit).launch(edge?{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
 const errors=[],external=[],contexts=[],pages=[];
 for(const user of [owner,peer]){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});contexts.push(context);
  await context.exposeBinding('TimelineBackend',(_,query)=>transport(query));await context.addInitScript(installTransport,{user});
  const page=await context.newPage();pages.push(page);page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>{const url=new URL(r.request().url());if(!url.href.startsWith(base)){external.push(url.href);return r.abort();}if(/\/(?:vendor\/supabase|update-client)\.js$/.test(url.pathname))return r.fulfill({contentType:'text/javascript',body:''});return r.continue();});
  await page.goto(base);await page.waitForFunction(()=>ready&&!busy&&!refreshPromise&&!refreshQueued);await page.evaluate(()=>go('timeline'));
 }
 const [viewer,writer]=pages,settle=p=>p.waitForFunction(()=>ready&&!busy&&!refreshPromise&&!refreshQueued),checks=[];
 const icon=()=>viewer.locator(`[data-public-profile="${db.posts.at(-1).id}"] [data-cat-expression]`);
 const write=async intent=>{
  await settle(writer);await writer.evaluate(()=>go('home'));await writer.locator(`[data-home-choice="${intent}"]`).click();await settle(writer);
  const row=db.posts.at(-1);assert.equal(row.user_id,peer);await writer.evaluate(()=>go('timeline'));
  const local=await writer.locator('.post [data-own-cat-icon] [data-cat-expression]').getAttribute('data-cat-expression');
  assert(asleep(row.choice)?local==='sleeping':intent==='sleepless'?['restless','surprised'].includes(local):['calm','happy'].includes(local));return row;
 };
 for(const intent of ['sleep','relax','try-sleep','sleepless']){
  const row=await write(intent);await viewer.evaluate(()=>refreshShared());await settle(viewer);
  const expected=asleep(row.choice)?'sleeping':intent==='sleepless'?['restless','surprised']:['calm','happy'];
  const actual=await icon().getAttribute('data-cat-expression');assert(Array.isArray(expected)?expected.includes(actual):actual===expected);
  await viewer.locator(`[data-public-profile="${row.id}"]`).click();
  const room=viewer.locator('#public-profile-content .room-resident img');await room.evaluate(img=>img.decode());
  assert.equal(await viewer.locator('#public-profile-content .day-room').getAttribute('data-post-status'),asleep(row.choice)?'sleep':'awake');
  if(asleep(row.choice))assert.equal(await room.getAttribute('data-cat-scene'),'sleeping');
  checks.push({intent,choice:row.choice,post:row.id,expression:actual});await viewer.locator('#close-public-profile').click();
 }
 // An already-open profile follows a different device's latest sleep choice.
 let row=await write('relax');await viewer.evaluate(()=>refreshShared());await settle(viewer);await viewer.locator(`[data-public-profile="${row.id}"]`).click();
 row=await write('try-sleep');await viewer.evaluate(()=>refreshShared());await settle(viewer);
 assert.equal(await viewer.locator('#public-profile-content [data-cat-expression]').getAttribute('data-cat-expression'),'sleeping');
 assert.equal(await viewer.locator('#public-profile-content .room-resident img').getAttribute('data-cat-scene'),'sleeping');await viewer.locator('#close-public-profile').click();
 // Real navigation fetches new rows, rather than keeping the last mounted feed.
 await viewer.evaluate(()=>go('home'));row=await write('sleep');await viewer.locator('#navigation [data-view=timeline]').click();await settle(viewer);assert.equal(await icon().getAttribute('data-cat-expression'),'sleeping');
 await viewer.reload();await settle(viewer);await viewer.evaluate(()=>go('timeline'));assert.equal(await icon().getAttribute('data-cat-expression'),'sleeping');
 // A delayed read from before backgrounding must not win after resume.
 db.holdProfiles=true;await viewer.evaluate(()=>{void refreshShared();});await viewer.waitForFunction(()=>!!refreshPromise);
 for(let i=0;i<100&&!db.gates.length;i++)await new Promise(r=>setTimeout(r,20));assert(db.gates.length);
 row=await write('sleepless');await viewer.evaluate(()=>{TimelineFixture.hidden=true;document.dispatchEvent(new Event('visibilitychange'));TimelineFixture.hidden=false;document.dispatchEvent(new Event('visibilitychange'));});
 db.gates.shift()();await settle(viewer);assert(['restless','surprised'].includes(await icon().getAttribute('data-cat-expression')));
 row=await write('try-sleep');await viewer.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await settle(viewer);assert.equal(await icon().getAttribute('data-cat-expression'),'sleeping');
 // Concurrent direct API consumers also reject the older full result and its
 // delayed progressive callbacks, independently of the app's revision guard.
 db.holdProfiles=true;await viewer.evaluate(()=>{globalThis.oldProgress=[];globalThis.oldRead=OyasumiAPI.snapshot(0,{onTimeline:p=>oldProgress.push(p.feed.map(r=>r.id))}).then(()=>({accepted:true}),e=>({code:e.code}));});
 for(let i=0;i<100&&!db.gates.length;i++)await new Promise(r=>setTimeout(r,20));assert(db.gates.length);
 row=await write('relax');await viewer.evaluate(()=>OyasumiAPI.snapshot());const progressCount=await viewer.evaluate(()=>oldProgress.length);
 db.gates.shift()();assert.equal((await viewer.evaluate(()=>oldRead)).code,'CAT_READ_SUPERSEDED');assert.equal(await viewer.evaluate(()=>oldProgress.length),progressCount);
 await viewer.evaluate(()=>refreshShared());await settle(viewer);
 await viewer.clock.install();await viewer.clock.pauseAt(await viewer.evaluate(()=>Date.now()+1000));await settle(viewer);
 const matrix=[];
 for(const width of [320,375,390,430]){
  await viewer.setViewportSize({width,height:844});
  const cases=await viewer.evaluate(async()=>{
   const cases=[],now=NightClock.now();
   for(const coat of CatFaces.coats.map(c=>c.id))for(const [status,intent] of [['awake','relax'],['awake','sleepless'],['sleep','sleep'],['try-sleep','try-sleep'],['early-sleep','sleep']]){
    const post={id:`matrix-${coat}-${intent}-${status}`,userId:TimelineFixture.user===shared.userId?'00000000-0000-0000-0000-000000000002':'',status,intent,time:now-1000,order:10,name:'となり',coat,appearanceReady:true};
    // Feed order and timestamps disagree; event_order must choose the newer
    // valid post rather than the first row or the profile's manual expression.
    shared.feed=[{...post,id:'older-'+post.id,status:'awake',order:9,time:now-500},{...post,expression:'surprised'},{...post,id:'invalid-'+post.id,status:'invalid',order:11}];
    timelinePreview=undefined;go('timeline');const node=document.querySelector('.post [data-cat-expression]');
    if(!node)throw Error(JSON.stringify({coat,status,intent,now,current:NightClock.now(),view,feed:shared.feed,preview:timelinePreview,html:document.querySelector('#app').innerHTML.slice(0,1000)}));await node.decode();
    const expression=node.dataset.catExpression,expected=PostCatExpressions.state(post),html=publicProfileRoom(post),host=document.querySelector('#public-profile-content');CatImages.render(host,html);
    await Promise.all([...host.querySelectorAll('img')].map(img=>img.decode()));
    const stage=host.querySelector('.day-room'),image=stage.querySelector('.room-resident img');
    if(document.querySelectorAll('.post').length!==1||stage.dataset.postStatus!==expected||node.dataset.catCoat!==coat||expected==='sleep'&&(expression!=='sleeping'||image.dataset.catScene!=='sleeping'||stage.dataset.location!=='room'))throw Error(JSON.stringify({coat,status,intent,expression,expected,stage:stage.outerHTML}));
    if(document.documentElement.scrollWidth>innerWidth)throw Error('Horizontal overflow');cases.push({coat,status,intent,expression});
   }
   return cases;
  });matrix.push(...cases.map(c=>({width,...c})));await viewer.screenshot({path:path.join(out,`timeline-${width}.png`)});
  console.log(`PASS ${engine} ${width}px: all 16 coats × 5 current/legacy choices, latest valid row and sleeping room`);
 }
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({pass:true,engine,checks,matrix,crossDevice:true,openProfile:true,navigation:true,reload:true,resume:true,bfcache:true,staleReadRejected:true,productionDbWrites:0,fixtureWrites:db.writes.length,physicalIPhoneTested:false},null,2));
 console.log(`PASS ${engine}: real app/API saves across two isolated devices, ${matrix.length} state/coat/width checks, resume/reload/BFCache, superseded read and progress rejection; no production writes`);
}finally{for(const release of db.gates)release();await browser?.close();server.kill();}})().catch(e=>{fs.writeFileSync(path.join(out,'failure.txt'),e.stack);console.error(e);process.exitCode=1;});
