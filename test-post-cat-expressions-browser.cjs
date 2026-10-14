const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {webkit,chromium}=require(process.env.OYASUMI_PLAYWRIGHT_PATH||'./output/webkit-tools/core/package');
const engine=process.argv.includes('--edge')?'edge':'webkit',published=process.argv.includes('--published'),port=engine==='edge'?9440:9439,base=published?'https://tomowo985250z-cmyk.github.io/oyasumi/':`http://127.0.0.1:${port}/`;
const output=path.join(__dirname,'output/post-cat-expressions',`${published?'published':'local'}-${engine}`);fs.mkdirSync(output,{recursive:true});
const source=fs.readFileSync('test-home-post-choices.cjs','utf8'),fixture=source.slice(source.indexOf('function installFixture()'),source.indexOf('\n(async () =>'))+'\ninstallFixture();';
const server=published?null:spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'ignore'});let browser;
(async()=>{try{
 for(let i=0;i<60;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await(engine==='edge'?chromium:webkit).launch(engine==='edge'?{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
 const context=await browser.newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true});await context.addInitScript({content:fixture});
 await context.addInitScript(()=>{
  const f=HomePostFixture,api=OyasumiAPI,snapshot=api.snapshot;Date.now=()=>f.at;f.coat='calico';f.manualWrites=0;f.initial=true;f.at=Date.parse('2026-10-13T23:00:00+09:00');
  api.setCatExpression=async()=>{f.manualWrites++;throw Error('Manual expression writes are disabled');};
  api.setCatCoat=async coat=>{f.coat=coat;};
  api.snapshot=async()=>{if(f.initial){f.initial=false;f.rows=[{...f.row('sleep'),id:'reload-stable',post_intent:'sleep'}];}const s=await snapshot();return{...s,expression:'surprised',coat:f.coat,ownPosts:s.ownPosts.map(p=>({...p,expression:'surprised',coat:f.coat})),feed:s.feed.map(p=>({...p,expression:'restless',coat:f.coat}))};};
 });
 const page=await context.newPage(),errors=[],failed=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/assets/')&&r.status()>=400)failed.push(r.url());});
 await page.route('**/*',route=>{const u=new URL(route.request().url());if(!u.href.startsWith(base))return route.abort();if(/\/(?:vendor\/supabase|supabase-api|update-client)\.js$/.test(u.pathname))return route.fulfill({contentType:'text/javascript',body:''});return route.continue();});
 await page.goto(published?base+'?verify='+Date.now():base);const settled=()=>page.waitForFunction(()=>typeof ready!=='undefined'&&ready&&!busy&&!refreshPromise&&!refreshQueued);await settled();
 if(published)assert.equal(await page.locator('meta[name=oyasumi-release]').getAttribute('content'),JSON.parse(fs.readFileSync('release.json','utf8')).release);
 const face=locator=>locator.locator('[data-cat-expression]').getAttribute('data-cat-expression');
 await page.evaluate(()=>go('profile'));const before=await face(page.locator('.profile-cat-button'));await page.reload();await settled();await page.evaluate(()=>go('profile'));assert.equal(await face(page.locator('.profile-cat-button')),before);
 const reports=[];
 for(const width of [320,375,390,430]){
  await page.setViewportSize({width,height:568});
  for(const [status,intent,allowed] of [['awake','relax',['calm','happy']],['awake','sleepless',['restless','surprised']],['sleep','sleep',['sleepy','sleeping']],['try-sleep','try-sleep',['yawn','sleepy']],['early-sleep','sleep',['sleepy','sleeping']]]){
   // Exercise both candidates and the restored manul artwork explicitly.
   for(const variant of [0,1]){
    const r=await page.evaluate(async({status,intent,variant,width})=>{
     const f=HomePostFixture;f.coat=variant?'manul':'snow-leopard';let id;
     for(let i=0;i<100;i++){const p={id:`auto-${width}-${i}`,status,intent};if(PostCatExpressions.forPost(p)===PostCatExpressions.candidates[PostCatExpressions.kind(p)][variant]){id=p.id;break;}}
     f.rows=[{...f.row(status),id,post_intent:intent}];await refreshShared();go('timeline');return{id,expected:PostCatExpressions.forPost(state.posts[0]),coat:f.coat};
    },{status,intent,variant,width});assert(allowed.includes(r.expected));
    const icon=page.locator('.post [data-own-cat-icon]');await icon.locator('img').evaluate(img=>img.decode());assert.equal(await face(icon),r.expected);await icon.tap();assert.equal(await page.locator('#public-profile-dialog').isVisible(),false);assert.equal(await page.evaluate(()=>view),'timeline');
    await page.evaluate(id=>{const post=shared.feed.find(p=>p.id===id);post.self=false;post.userId='00000000-0000-0000-0000-000000000002';render();},r.id);
    await page.locator(`[data-public-profile="${r.id}"]`).tap();const publicIcon=page.locator('.public-profile-care-icon');assert.equal(await face(publicIcon),r.expected);assert.equal(await publicIcon.locator('[data-cat-coat]').getAttribute('data-cat-coat'),r.coat);await page.locator('#close-public-profile').click();
    await page.evaluate(()=>go('profile'));assert.equal(await face(page.locator('.profile-cat-button')),r.expected);assert.equal(await page.locator('[data-expression-picker],button[data-expression]').count(),0);assert(await page.locator('.profile-page [data-coat-picker]').isVisible());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.evaluate(async()=>{state.expression='yawn';shared.expression='happy';await refreshShared();render();});assert.equal(await face(page.locator('.profile-cat-button')),r.expected);
    await page.evaluate(()=>go('settings'));assert.equal(await face(page.locator('.expression-setting')),r.expected);
    reports.push({width,status,intent,variant,...r});
   }
  }
  await page.evaluate(async()=>{HomePostFixture.rows=[];await refreshShared();go('profile');});assert.equal(await face(page.locator('.profile-cat-button')),'calm');
  await page.screenshot({path:path.join(output,`unposted-${width}.png`)});
 }
 // Type selection is retained, saves only the coat, and keeps this post's face.
 await page.evaluate(async()=>{HomePostFixture.rows=[{...HomePostFixture.row('awake'),id:'type-change',post_intent:'sleepless'}];await refreshShared();go('profile');});const expression=await face(page.locator('.profile-cat-button'));await page.locator('.profile-page [data-coat-picker]').click();assert.equal(await page.locator('#expression-options button[data-coat]').count(),16);await page.locator('#expression-options button[data-coat=black]').click();await settled();await page.evaluate(()=>go('profile'));assert.equal(await face(page.locator('.profile-cat-button')),expression);assert.equal(await page.locator('.profile-cat-button [data-cat-coat]').getAttribute('data-cat-coat'),'black');
 await page.screenshot({path:path.join(output,'profile-auto.png')});assert.equal(await page.evaluate(()=>HomePostFixture.manualWrites),0);
 // A prior-night report is not a current report after the 06:00 boundary.
 await page.evaluate(()=>{HomePostFixture.at=Date.parse('2026-10-14T06:00:00+09:00');NightClock.now=()=>HomePostFixture.at;go('profile');});assert.equal(await face(page.locator('.profile-cat-button')),'calm');
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({pass:true,reports,unpostedWidths:4,reloadFixed:true,coatSelection:true,manualWrites:0,productionWrites:0},null,2));console.log(`PASS ${engine}: ${reports.length} face cases, timeline/public/own/settings consistency, reload fixed, unposted calm, type change, 06:00, zero expression writes.`);
}finally{await browser?.close();server?.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
