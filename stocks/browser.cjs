const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),pw=require(process.env.OYASUMI_PLAYWRIGHT||path.resolve(root,'../../webkit-tools/core/package')),out=path.resolve(root,'../stocks-check-'+Date.now());fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+decodeURIComponent(u.pathname)+(u.pathname.endsWith('/')?'index.html':''));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(error,body)=>{if(error)return res.writeHead(404).end();res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'})[path.extname(file)]||'application/octet-stream'});res.end(body);});});
const companies=['canbas','kringle','joby'],symbols=['4575.T','4884.T','JOBY'],retired=/monitor-shared|yen-reference|yen-card|update-yen|finance\.yahoo|heatmap/;
(async()=>{let browser;const report={cases:[],errors:[]};try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=process.env.STOCKS_BASE||'http://127.0.0.1:'+server.address().port;browser=await pw.webkit.launch({headless:true});
 for(const [width,height]of [[320,568],[375,667],[390,844],[430,932]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true}),page=await context.newPage(),requests=[];
  page.on('pageerror',error=>report.errors.push(error.message));page.on('request',request=>requests.push({url:request.url(),method:request.method()}));
  await context.addInitScript(()=>{try{if(!localStorage.getItem('oyasumi:test:app-preserved')){for(const symbol of ['4575.T','4884.T','JOBY'])localStorage.setItem('oyasumi:portfolio:v1:'+symbol,JSON.stringify({currency:'JPY',unitCost:'500',shares:'10'}));localStorage.setItem('oyasumi:test:app-preserved','untouched');}}catch{}});
  const active=async id=>page.waitForFunction(id=>document.getElementById('tab-'+id)?.getAttribute('aria-selected')==='true',id);
  const settled=async()=>page.evaluate(()=>Promise.all(document.getAnimations().map(animation=>animation.finished.catch(()=>{}))));
  async function ready(id){
   const frame=await(await page.locator('iframe[data-company="'+id+'"]').elementHandle()).contentFrame();
   await frame.waitForFunction(()=>document.getElementById('monitor')?.getAttribute('aria-busy')==='false'&&(!document.getElementById('ev-monitor')||document.getElementById('ev-monitor').getAttribute('aria-busy')==='false'));
   assert.equal(await frame.locator('[data-quote-summary],[data-holdings],.holding-inputs,.quote-summary-card').count(),0);
   assert.equal(await frame.locator('meta[name=robots]').count(),1);assert.deepEqual((await frame.locator('meta[name=robots]').getAttribute('content')).split(',').map(s=>s.trim()).sort(),['noarchive','nofollow','noindex']);
   assert.equal(await frame.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   return frame;
  }
  async function top(frame){await settled();await frame.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))));await frame.waitForFunction(()=>scrollY===0&&document.scrollingElement.scrollTop===0);}
  async function swipe(frame,direction){await settled();await frame.locator('body').evaluate((node,direction)=>{const end=direction==='left'?-26:26;for(const [type,x,y]of [['pointerdown',0,0],['pointermove',end/2,6],['pointermove',end,12],['pointerup',end,12]])node.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:7,pointerType:'touch',isPrimary:true,clientX:150+x,clientY:150+y,button:0}));},direction);}
  await page.goto(base+'/stocks/#heatmap');await active('canbas');assert.equal(new URL(page.url()).hash,'#canbas');assert.deepEqual(await page.locator('[role=tab]').allTextContents(),['キャンバス','クリングル','Joby']);assert.equal(await page.locator('.screen').count(),3);
  assert.equal(await page.locator('#heatmap,#screen-heatmap,[data-holdings],[data-quote-summary]').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight||document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(await page.evaluate(()=>['4575.T','4884.T','JOBY'].map(symbol=>localStorage.getItem('oyasumi:portfolio:v1:'+symbol))),[null,null,null]);assert.equal(await page.evaluate(()=>localStorage.getItem('oyasumi:test:app-preserved')),'untouched');
  const frames={};
  for(const id of companies){
   await page.locator('#tab-'+id).click();await active(id);const frame=frames[id]=await ready(id);await top(frame);
   if(id==='canbas'){assert.equal(await frame.locator('.country').count(),8);assert.equal(await frame.locator('#ev-pipelines > article').count(),2);assert.equal(await frame.locator('#ev-sources [data-source]').count(),4);assert(await frame.locator('#changes-title').isVisible());}
   if(id==='kringle'){assert.equal(await frame.locator('.pipeline-card').count(),4);assert.equal(await frame.locator('.registry-source').count(),4);assert.equal(await frame.locator('.source-card').count(),4);}
   if(id==='joby'){assert.equal(await frame.locator('.stage-card').count(),5);assert.equal(await frame.locator('[role=progressbar]').count(),10);assert.equal(await frame.locator('.stage-card .change-mark').count(),3);assert.equal(await frame.locator('#sources .source-card').count(),4);}
   const filter=frame.locator(id==='canbas'?'#ev-category':'#category');await filter.selectOption(id==='joby'?'資金調達':'治験');await filter.selectOption('all');
   const history=frame.locator(id==='canbas'?'#ev-history-count':'#history-count');await history.click();assert(await history.evaluate(node=>node.closest('details').open));assert.equal(await frame.locator(id==='canbas'?'#ev-history':id==='kringle'?'#history-list':'#history').count(),1);
   await frame.locator(id==='canbas'?'#ev-reload':'#reload').click();await ready(id);
   await page.locator('#tab-'+id).click();await top(frame);await page.screenshot({path:path.join(out,id+'-'+width+'.png')});
   await frame.evaluate(()=>scrollTo(0,450));await frame.waitForFunction(()=>scrollY>100);
  }
  await swipe(frames.joby,'left');await active('joby'); // No fourth screen at the right boundary.
  await swipe(frames.joby,'right');await active('kringle');await top(frames.kringle);await swipe(frames.kringle,'right');await active('canbas');await top(frames.canbas);
  await swipe(frames.canbas,'right');await active('canbas');await swipe(frames.canbas,'left');await active('kringle');await top(frames.kringle);
  const preserved=await frames.kringle.evaluate(()=>{
   const send=(target,type,x,y)=>{const event=new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:33,pointerType:'touch',isPrimary:true,clientX:150+x,clientY:150+y,button:0});target.dispatchEvent(event);return event.defaultPrevented;};
   send(document.body,'pointerdown',0,0);const vertical=send(document.body,'pointermove',8,16);send(document.body,'pointermove',40,24);send(document.body,'pointerup',40,24);
   const input=document.getElementById('category');send(input,'pointerdown',0,0);send(input,'pointermove',-40,0);send(input,'pointerup',-40,0);return vertical;
  });assert.equal(preserved,false);await active('kringle');
  await page.locator('#tab-canbas').click();await top(frames.canbas);
  const duplicate=await page.evaluate(()=>{
   const body=id=>document.querySelector('iframe[data-company='+id+']').contentDocument.body;
   const send=(node,type,x)=>node.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:41,pointerType:'touch',isPrimary:true,clientX:150+x,clientY:150,button:0}));
   for(const id of ['canbas','kringle']){const node=body(id);send(node,'pointerdown',0);send(node,'pointermove',-26);send(node,'pointermove',-90);send(node,'pointerup',-90);}
   return document.querySelector('[role=tab][aria-selected=true]').dataset.screen;
  });assert.equal(duplicate,'kringle');await top(frames.kringle);
  await page.locator('#tab-joby').click();await top(frames.joby);await page.locator('#tab-joby').focus();await page.keyboard.press('ArrowRight');await active('canbas');await top(frames.canbas);await page.keyboard.press('End');await active('joby');await page.keyboard.press('Home');await active('canbas');await top(frames.canbas);
  await page.addStyleTag({content:'#app{padding-top:59px;padding-bottom:34px}'});const bounds=await page.locator('#screen-canbas iframe').boundingBox();assert(bounds.y>=59);assert(bounds.y+bounds.height<=height-34+.1);assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight||document.documentElement.scrollWidth>innerWidth),false);
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#tab-joby').click();await active('joby');assert.equal(await page.evaluate(()=>document.getAnimations().length),0);await top(frames.joby);
  if(width===375||width===390)for(const [index,id]of companies.entries()){
   await page.evaluate(symbol=>localStorage.setItem('oyasumi:portfolio:v1:'+symbol,'old-entry'),symbols[index]);const standalone=await context.newPage();standalone.on('pageerror',error=>report.errors.push(error.message));standalone.on('request',request=>requests.push({url:request.url(),method:request.method()}));await standalone.goto(base+'/'+id+'/');await standalone.waitForFunction(()=>document.getElementById('monitor')?.getAttribute('aria-busy')==='false');
   assert.equal(await standalone.locator('[data-holdings],[data-quote-summary]').count(),0);assert.equal(await standalone.evaluate(symbol=>localStorage.getItem('oyasumi:portfolio:v1:'+symbol),symbols[index]),null);assert.equal(await standalone.evaluate(()=>localStorage.getItem('oyasumi:test:app-preserved')),'untouched');await standalone.close();
  }
  assert(requests.every(request=>request.method==='GET'&&request.url.startsWith(base+'/')&&!retired.test(new URL(request.url).pathname)),'No price/FX/portfolio resources or external API requests');
  report.cases.push({width,height,threeScreens:true,tabsSwipeKeyboard:true,noFourthScreen:true,topReset:true,verticalScroll:true,filtersHistoryReload:true,clinicalAndCertificationPreserved:true,changeMarksPreserved:true,noMarketUIOrRequests:true,onlyOldPortfolioStorageRemoved:true,safeArea:true,reducedMotion:true});await context.close();
 }
 for(const path of ['/monitor-shared/data/quotes.json','/joby/data/yen-reference.json']){const response=await fetch(base+path);assert.equal(response.status,404,'Retired public JSON must be absent: '+path);}
 assert.equal(report.errors.length,0);report.pass=true;
}catch(error){report.pass=false;report.error=error.stack;process.exitCode=1;}finally{if(browser)await browser.close();server.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}})();
