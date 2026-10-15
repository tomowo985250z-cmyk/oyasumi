const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawn,execFileSync}=require('node:child_process');
const {webkit,chromium}=require(process.env.OYASUMI_PLAYWRIGHT_PATH||'./output/webkit-tools/core/package');
const edge=process.argv.includes('--edge'),port=edge?9440:9439,base=`http://127.0.0.1:${port}/`;
const output=path.join(__dirname,'output/moon-transparency',edge?'edge':'webkit');fs.mkdirSync(output,{recursive:true});
const source=fs.readFileSync('test-home-post-choices.cjs','utf8');
const fixture=source.slice(source.indexOf('function installFixture()'),source.indexOf('\n(async () =>'))+'\ninstallFixture();';
const previous=execFileSync('git',['show','1c8decf:roof-cats.js'],{encoding:'utf8',windowsHide:true});
const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'ignore'});let browser;
(async()=>{try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await(edge?chromium:webkit).launch(edge?{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
 const results=[],errors=[],failed=[];
 for(const standalone of [false,true]){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await context.addInitScript({content:fixture});
  await context.addInitScript(standalone=>{
   Object.defineProperty(navigator,'standalone',{value:standalone});
   HomePostFixture.at=Date.parse('2026-10-15T23:00:00+09:00');Date.now=()=>HomePostFixture.at;
   const snapshot=OyasumiAPI.snapshot;OyasumiAPI.snapshot=async()=>{if(!HomePostFixture.rows.length)HomePostFixture.rows=[HomePostFixture.row('awake')];return snapshot();};
   const interval=setInterval;globalThis.transparencyIntervals=[];window.setInterval=(...args)=>{const id=interval(...args);transparencyIntervals.push(id);return id;};
  },standalone);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
  await page.route('**/*',route=>{const u=new URL(route.request().url());if(!u.href.startsWith(base))return route.abort();if(/\/(?:vendor\/supabase|supabase-api|update-client)\.js$/.test(u.pathname))return route.fulfill({contentType:'text/javascript',body:''});return route.continue();});
  await page.goto(base);await page.waitForFunction(()=>typeof ready!=='undefined'&&ready&&!busy&&!refreshPromise);
  await page.evaluate(previous=>{
   transparencyIntervals.forEach(clearInterval);clearTimeout(roofMoonTimer);NightClock.now=()=>HomePostFixture.at;
   const current=RoofMoon,cats=RoofCats;Function(previous)();globalThis.PreviousRoofMoon=RoofMoon;globalThis.RoofMoon=current;globalThis.RoofCats=cats;
   globalThis.moonEpoch=Date.parse('2000-01-06T18:14:00Z');globalThis.moonCycle=29.530588853*86400000;
  },previous);
  // Rasterize the complete moon, not only its lit path: any painted back disk
  // must make this differ from the lit path on transparent and gradient skies.
  const raster=await page.evaluate(async()=>{
   const rasterize=async(body,sky='')=>{
    const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="-1.5 -1.5 3 3">${sky}${body}</svg>`);await img.decode();
    const canvas=document.createElement('canvas');canvas.width=canvas.height=120;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);return ctx.getImageData(0,0,120,120).data;
   };
   const sky='<defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#1e304d"/><stop offset="1" stop-color="#52627c"/></linearGradient></defs><rect x="-1.5" y="-1.5" width="3" height="3" fill="url(#sky)"/><circle cx="-.5" cy="0" r=".03" fill="#f5e6c2"/>';
   const rows=[];
   for(const frame of ['roof','window'])for(let i=0;i<64;i++){
    const fraction=i/64,now=moonEpoch+moonCycle*fraction,holder=document.createElementNS('http://www.w3.org/2000/svg','svg');holder.innerHTML=RoofMoon.svg(now,frame);
    const moon=holder.firstElementChild,path=moon.querySelector('path');
    const old=document.createElementNS('http://www.w3.org/2000/svg','svg');old.innerHTML=PreviousRoofMoon.svg(now,frame);
    const geometryUnchanged=moon.getAttribute('transform')===old.firstElementChild.getAttribute('transform')&&path.outerHTML===old.querySelector('path').outerHTML&&moon.querySelector('circle').getAttribute('r')===old.querySelector('circle').getAttribute('r')&&JSON.stringify(RoofMoon.snapshot(now))===JSON.stringify(PreviousRoofMoon.snapshot(now));
    moon.removeAttribute('transform');let transparent=true,skyVisible=true;
    for(const backdrop of ['',sky]){const actual=await rasterize(moon.outerHTML,backdrop),litOnly=await rasterize(path.outerHTML,backdrop);const same=actual.every((n,j)=>n===litOnly[j]);if(backdrop)skyVisible=same;else transparent=same;}
    rows.push({frame,fraction,geometryUnchanged,transparent,skyVisible});
   }return rows;
  });
  for(const r of raster)assert(r.geometryUnchanged&&r.transparent&&r.skyVisible,JSON.stringify(r));
  results.push(...raster.map(r=>({standalone,...r})));
  for(const width of [320,375,390,430]){
   await page.setViewportSize({width,height:844});
   for(const fraction of [0,.0625,.125,.25,.375,.5,.625,.75,.875,.9375]){
    const layout=await page.evaluate(fraction=>{
     go('home');clearTimeout(roofMoonTimer);const now=moonEpoch+moonCycle*fraction,rows=[];
     for(const moon of document.querySelectorAll('.roof-moon,.room-window-moon')){
      RoofMoon.update(moon,now);const svg=moon.ownerSVGElement,old=document.createElementNS('http://www.w3.org/2000/svg','g');old.innerHTML=PreviousRoofMoon.svg(now,moon.dataset.moonFrame);svg.append(old);
      const a=moon.getBoundingClientRect(),b=old.firstElementChild.getBoundingClientRect();
      rows.push({frame:moon.dataset.moonFrame,sameBounds:['x','y','width','height'].every(k=>Math.abs(a[k]-b[k])<.001)});old.remove();
     }
     return {rows,overflow:document.documentElement.scrollWidth>innerWidth};
    },fraction);
    assert.equal(layout.rows.length,2);assert(layout.rows.every(r=>r.sameBounds)&&!layout.overflow,JSON.stringify(layout));
    if(width===390&&!standalone&&[.125,.25,.5,.875].includes(fraction))await page.screenshot({path:path.join(output,`home-phase-${fraction}.png`),fullPage:true});
   }
   await page.evaluate(()=>{go('home');clearTimeout(roofMoonTimer);});
   await page.screenshot({path:path.join(output,`home-${width}-${standalone?'standalone':'browser'}.png`)});
  }
  assert.equal(await page.evaluate(()=>HomePostFixture.calls.length),0);await context.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({pass:true,actualIPhone:false,productionDbWrites:false,results,mobileWidths:[320,375,390,430],errors,failed},null,2));
 console.log(`PASS ${edge?'Edge':'WebKit'}: 64 phases × roof/window × browser/standalone, pixel-exact transparent and gradient-sky comparisons; unchanged geometry at 320/375/390/430px; no DB writes.`);
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
