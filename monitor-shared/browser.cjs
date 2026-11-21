const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),pw=require(process.env.OYASUMI_PLAYWRIGHT||path.resolve(root,'../../webkit-tools/core/package'));
const out=path.resolve(root,'../holdings-verification',String(Date.now()));fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+decodeURIComponent(url.pathname)+(url.pathname.endsWith('/')?'index.html':''));if(!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{if(e)return res.writeHead(404).end();res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'})[path.extname(file)]||'application/octet-stream'});res.end(b);});});
(async()=>{let browser;const report={cases:[],errors:[]};try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=process.env.HOLDINGS_BASE||'http://127.0.0.1:'+server.address().port;
 browser=await pw.webkit.launch({headless:true});
 const original=JSON.parse(fs.readFileSync(path.join(__dirname,'data/quotes.json'),'utf8'));
 for(const width of [375,390]){
  const ctx=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true}),page=await ctx.newPage(),requests=[];let data=structuredClone(original),fail=false;
  page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>requests.push({url:r.url(),post:r.postData()}));
  await page.route('**/monitor-shared/data/quotes.json',r=>r.fulfill({status:fail?503:200,contentType:'application/json',body:fail?'unavailable':JSON.stringify(data)}));
  for(const [id,cost] of [['canbas','500'],['kringle','400'],['joby','450']]){
   await page.goto(base+'/'+id+'/');await page.waitForFunction(()=>document.querySelector('[data-holdings]')?.getAttribute('aria-busy')==='false'&&document.querySelector('#monitor')?.getAttribute('aria-busy')==='false');
   const widget=page.locator('[data-holdings]'),inputs=widget.locator('input'),result=widget.locator('.holding-results');assert(await result.isHidden());
   if(id==='canbas'){assert.equal(await page.locator('.country').count(),8);await page.waitForFunction(()=>document.querySelector('#ev-monitor').getAttribute('aria-busy')==='false');assert(await page.locator('#ev-data').isVisible());}
   if(id==='kringle')assert.equal(await page.locator('.pipeline-card').count(),4);
   if(id==='joby'){assert.equal(await page.locator('[role=progressbar]').count(),10);assert((await widget.innerText()).includes('円換算株価'));assert((await widget.locator('.holding-dates').innerText()).includes('為替 最終取得成功日時'));}
   assert((await widget.innerText()).includes('前日比（保有損益ではありません）'));
   const count=requests.length;await inputs.nth(0).fill(cost);await inputs.nth(1).fill('10.5');assert(await result.isVisible());assert.equal(await widget.locator('.holding-gain').count(),2);
   const gainColor=await widget.locator('.holding-gain').first().evaluate(e=>getComputedStyle(e).color);assert.equal(gainColor,'rgb(188, 37, 56)');
   assert.equal(requests.length,count,'typing does not send any request');
   const quote=data.entries[id].quote,unitJPY=quote.price*(id==='joby'?data.entries.usdjpy.quote.price:1),expectedPnl=(unitJPY-Number(cost))*10.5;
   const expected=new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY',maximumFractionDigits:0}).format(expectedPnl);assert((await result.innerText()).includes('含み損益：+'+expected));
   await page.reload();await page.waitForFunction(()=>document.querySelector('[data-holdings]').getAttribute('aria-busy')==='false');assert.equal(await inputs.nth(0).inputValue(),cost);assert.equal(await inputs.nth(1).inputValue(),'10.5');
   await inputs.nth(0).fill('9999');assert.equal(await widget.locator('.holding-loss').count(),2);assert.equal(await widget.locator('.holding-loss').first().evaluate(e=>getComputedStyle(e).color),'rgb(23, 93, 182)');
   await inputs.nth(0).fill(cost);await widget.screenshot({path:path.join(out,id+'-'+width+'.png')});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await inputs.nth(1).fill('');assert(await result.isHidden());await inputs.nth(1).fill('10.5');
   async function reloadQuote(){await widget.locator('.holding-reload').click();await page.waitForFunction(()=>document.querySelector('[data-holdings]').getAttribute('aria-busy')==='false');}
   fail=true;await reloadQuote();assert((await widget.locator('.holding-state').innerText()).includes('古いデータ'));assert(await result.isVisible());fail=false;
   if(id==='joby'){
    data.entries.usdjpy.result='failed';data.entries.usdjpy.error='HTTP 429';await reloadQuote();assert((await widget.locator('.holding-state').innerText()).includes('古いデータ'));assert((await result.innerText()).includes('古いデータによる参考値'));
    data.entries.usdjpy=structuredClone(original.entries.usdjpy);await reloadQuote();assert(!(await widget.locator('.holding-state').innerText()).includes('古いデータ'));
    const newPage=await ctx.newPage();await newPage.goto(base+'/joby/');await newPage.waitForFunction(()=>document.querySelector('[data-holdings]').getAttribute('aria-busy')==='false');assert.equal(await newPage.locator('.holding-cost').inputValue(),cost);await newPage.close();
   }
   report.cases.push({id,width,restored:true,noInputNetwork:true,profitLossColors:true,stale:true,overflow:false});
  }
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('oyasumi:portfolio:v1:4575.T')).unitCost),'500');
  await page.locator('.holding-clear').click();assert(await page.locator('.holding-results').isHidden());assert.equal(await page.evaluate(()=>localStorage.getItem('oyasumi:portfolio:v1:JOBY')),null);assert(await page.evaluate(()=>!!localStorage.getItem('oyasumi:portfolio:v1:4575.T')));
  assert(requests.every(r=>!r.post),'no holding information sent in request bodies');assert(requests.every(r=>r.url.startsWith(base+'/')),'same origin requests only');assert(requests.every(r=>!r.url.includes('unitCost')&&!r.url.includes('shares')));
  await ctx.close();
 }
 const ctx=await browser.newContext({viewport:{width:375,height:844}});await ctx.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw Error('blocked');}});});const page=await ctx.newPage();await page.goto(base+'/joby/');await page.waitForFunction(()=>document.querySelector('[data-holdings]').getAttribute('aria-busy')==='false');await page.locator('.holding-cost').fill('500');await page.locator('.holding-shares').fill('1');assert(await page.locator('.holding-results').isVisible());assert((await page.locator('.holding-storage').innerText()).includes('利用できません'));report.cases.push({storageUnavailable:true,passed:true});await ctx.close();
 assert.equal(report.errors.length,0);report.pass=true;
}catch(e){report.pass=false;report.error=e.stack;process.exitCode=1;}finally{if(browser)await browser.close();server.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));}})();
