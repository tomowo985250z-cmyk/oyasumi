const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http');
const {webkit}=require(process.env.OYASUMI_PLAYWRIGHT||'playwright');
const update=fs.readFileSync('update-client.js','utf8');
const realHtml=fs.readFileSync('index.html','utf8');
const realFiles=new Set(['index.html','release.json',...Array.from(realHtml.matchAll(/(?:src|href)="([^"?]+)\?v=/g),match=>match[1])]);
for(const file of fs.readdirSync('assets/wild-cats'))realFiles.add('assets/wild-cats/'+file);
const first='aaaaaaaaaaaaaaaa',second='bbbbbbbbbbbbbbbb';
let release=first,htmlRelease=first,manifestRequests=0;
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 res.setHeader('Cache-Control','max-age=600');
 if(url.pathname.startsWith('/real/')){
  const file=url.pathname.slice(6)||'index.html';
  if(!realFiles.has(file)){res.statusCode=404;res.end();return;}
  const extension=file.split('.').at(-1);
  res.setHeader('Content-Type',({html:'text/html',js:'text/javascript',css:'text/css',json:'application/json',svg:'image/svg+xml',png:'image/png'})[extension]);
  res.end(fs.readFileSync(file));return;
 }
 if(url.pathname==='/release.json'){
  manifestRequests++;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({release}));
 }else if(url.pathname==='/index.html'||url.pathname==='/'){
  res.setHeader('Content-Type','text/html');
  res.end(`<meta name="oyasumi-release" content="${htmlRelease}"><link rel="stylesheet" href="style.css?v=${htmlRelease}"><script src="app.js?v=${htmlRelease}"></script><script src="update-client.js?v=${htmlRelease}"></script><script>OyasumiUpdates.canReload=()=>globalThis.safe!==false</script><p>Cache fixture</p>`);
 }else if(url.pathname==='/update-client.js'){res.setHeader('Content-Type','text/javascript');res.end(update);}
 else if(url.pathname==='/app.js'){res.setHeader('Content-Type','text/javascript');res.end(`globalThis.loadedRelease='${url.searchParams.get('v')}'`);}
 else if(url.pathname==='/style.css'){res.setHeader('Content-Type','text/css');res.end(`body{color:${url.searchParams.get('v')===first?'rgb(10, 20, 30)':'rgb(30, 40, 50)'}}`);}
 else{res.statusCode=404;res.end();}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}/`;
 const browser=await webkit.launch();
 try{
  for(const standalone of [false,true])for(const width of [320,375,390,430]){
   release=htmlRelease=first;
   const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});
   if(standalone)await context.addInitScript(()=>Object.defineProperty(navigator,'standalone',{value:true}));
   const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto(base);await page.waitForFunction(()=>globalThis.loadedRelease==='aaaaaaaaaaaaaaaa');
   const stored={'oyasumi-auth':'existing-anonymous-session','oyasumi-local-v2':'existing-profile-settings','oyasumi-v1':'existing-legacy-data'};
   await page.evaluate(values=>{for(const [key,value] of Object.entries(values))localStorage.setItem(key,value)},stored);
   await page.evaluate(()=>{globalThis.safe=false});
   release=second;htmlRelease=first;
   await page.evaluate(()=>OyasumiUpdates.check(true));assert.equal(await page.evaluate(()=>loadedRelease),first,'Partial deployment must not reload');
   htmlRelease=second;
   await context.setOffline(true);await page.evaluate(()=>OyasumiUpdates.check(true));
   assert.equal(await page.evaluate(()=>loadedRelease),first,'Offline keeps working app');await context.setOffline(false);
   await page.evaluate(()=>OyasumiUpdates.check(true));
   assert.equal(await page.evaluate(()=>loadedRelease),first,'Editing/saving guard defers update');
   await page.evaluate(()=>{globalThis.safe=true;document.dispatchEvent(new Event('visibilitychange'))});
   await page.waitForFunction(()=>globalThis.loadedRelease==='bbbbbbbbbbbbbbbb');
   assert.equal(await page.evaluate(()=>getComputedStyle(document.body).color),'rgb(30, 40, 50)','New CSS loaded');
   assert.deepEqual(await page.evaluate(()=>Object.fromEntries(['oyasumi-auth','oyasumi-local-v2','oyasumi-v1'].map(key=>[key,localStorage.getItem(key)]))),stored);
   assert.equal(new URL(page.url()).searchParams.has('_oyasumi_release'),false,'Clean URL after successful update');
   await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
   const requests=manifestRequests;await page.evaluate(()=>OyasumiUpdates.check(true));assert(manifestRequests>requests,'Version probe hits network');
   assert.deepEqual(errors,[]);await context.close();
  }
  for(const standalone of process.env.CACHE_FIXTURE_ONLY?[]:[false,true]){
   const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
   if(standalone)await context.addInitScript(()=>Object.defineProperty(navigator,'standalone',{value:true}));
   const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto(process.env.TEST_BASE_URL||base+'real/');await page.waitForFunction(()=>typeof ready!=='undefined'&&ready&&!busy,{},{timeout:60000});
   const user=await page.evaluate(()=>shared.userId);
   assert.equal(await page.evaluate(()=>OyasumiUpdates.canReload()),true);
   await page.evaluate(()=>{busy=true});assert.equal(await page.evaluate(()=>OyasumiUpdates.canReload()),false);
   await page.evaluate(()=>{busy=false;go('rest')});assert.equal(await page.evaluate(()=>OyasumiUpdates.canReload()),false);
   await page.evaluate(()=>go('home'));
   for(const width of [320,375,390,430]){
    await page.setViewportSize({width,height:844});
    for(const screen of ['home','profile','settings']){
     await page.evaluate(screen=>go(screen),screen);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    }
   }
   for(const width of [320,375,390,430]){
    await page.setViewportSize({width,height:844});await page.evaluate(()=>go('settings'));
    for(const kind of ['privacy','rules']){
     await page.click(`[data-safety="${kind}"]`);
     assert(await page.locator('#safety-dialog').isVisible());
     assert.equal(await page.locator('#safety-dialog').evaluate(dialog=>dialog.scrollTop),0,'Open explanations from the beginning');
     assert(await page.evaluate(()=>document.querySelector('#safety-dialog').scrollWidth<=document.querySelector('#safety-dialog').clientWidth));
     await page.screenshot({path:`test-results/safety-${standalone?'standalone':'safari'}-${kind}-${width}.png`});
     await page.click('[data-close-safety]');
    }
    await page.click('[data-name]');assert((await page.locator('#nickname-help').textContent()).includes('SNS ID'));
    await page.click('#nickname-dialog [data-safety="rules"]');await page.click('[data-close-safety]');
    assert(await page.locator('#nickname-dialog').isVisible());await page.click('#cancel-name');
    await page.evaluate(()=>go('profile'));await page.click('[data-note-editor]');
    assert((await page.locator('#note-help').textContent()).includes('学校名'));
    assert(await page.evaluate(()=>document.querySelector('#note-dialog').scrollWidth<=document.querySelector('#note-dialog').clientWidth));
    await page.click('#cancel-note');
   }
   await page.reload();await page.waitForFunction(()=>typeof ready!=='undefined'&&ready&&!busy,{},{timeout:60000});
   assert.equal(await page.evaluate(()=>shared.userId),user,'Anonymous identity remains after reload');
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log(process.env.CACHE_FIXTURE_ONLY?'PASS WebKit cache fixture: browser and standalone simulation at 320/375/390/430px, new JS/CSS, resume, partial deployment/offline/edit guards, preserved local storage, no loop; no production DB access.':'PASS WebKit cache update: browser and standalone simulation at 320/375/390/430px, new JS/CSS, resume, partial deployment/offline/edit guards, preserved auth/settings/history, no loop; privacy/rules and input guidance at all four widths; real app pages and Supabase identity reload.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server.close());
