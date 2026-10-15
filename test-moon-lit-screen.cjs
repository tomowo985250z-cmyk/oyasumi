const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn,execFileSync}=require('node:child_process');
const {webkit,chromium}=require(process.env.OYASUMI_PLAYWRIGHT_PATH||'./output/webkit-tools/core/package');
const {PNG}=require('./output/webkit-tools/core/package/lib/utilsBundle');
const edge=process.argv.includes('--edge'),published=process.argv.includes('--published'),port=edge?9456:9455;
const base=published?'https://tomowo985250z-cmyk.github.io/oyasumi/':`http://127.0.0.1:${port}/`,output=path.join(__dirname,'output/moon-lit-only-v2',`${published?'published':'local'}-${edge?'edge':'webkit'}`);fs.mkdirSync(output,{recursive:true});
const source=fs.readFileSync('test-home-post-choices.cjs','utf8'),fixture=source.slice(source.indexOf('function installFixture()'),source.indexOf('\n(async () =>'))+'\ninstallFixture();';
const previous=execFileSync('git',['show','02333ed:roof-cats.js'],{encoding:'utf8',windowsHide:true});
const server=published?null:spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'ignore'});let browser;
(async()=>{try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await(edge?chromium:webkit).launch(edge?{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
 const context=await browser.newContext({viewport:{width:375,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2,reducedMotion:'reduce'});
 await context.addInitScript({content:fixture});await context.addInitScript(()=>{
  HomePostFixture.at=Date.parse('2026-10-15T23:00:00+09:00');Date.now=()=>HomePostFixture.at;
  const snapshot=OyasumiAPI.snapshot;OyasumiAPI.snapshot=async()=>{HomePostFixture.rows=[HomePostFixture.row('awake')];return snapshot();};
  const interval=setInterval;globalThis.litMoonIntervals=[];window.setInterval=(...args)=>{const id=interval(...args);litMoonIntervals.push(id);return id;};
 });
 const page=await context.newPage(),errors=[],failed=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
 await page.route('**/*',route=>{const u=new URL(route.request().url());if(!u.href.startsWith(base))return route.abort();if(/\/(?:vendor\/supabase|supabase-api|update-client)\.js$/.test(u.pathname))return route.fulfill({contentType:'text/javascript',body:''});return route.continue();});
 await page.goto(base);await page.waitForFunction(()=>typeof ready!=='undefined'&&ready&&!busy&&!refreshPromise);
 assert.equal(await page.locator('meta[name=oyasumi-release]').getAttribute('content'),JSON.parse(fs.readFileSync('release.json','utf8')).release);
 await page.evaluate(previous=>{
  litMoonIntervals.forEach(clearInterval);clearTimeout(roofMoonTimer);clearTimeout(roofShootingTimer);NightClock.now=()=>HomePostFixture.at;
  const current=RoofMoon,cats=RoofCats;Function(previous)();globalThis.PreviousMoon=RoofMoon;globalThis.RoofMoon=current;globalThis.RoofCats=cats;
 },previous);
 const rows=[],captures=[];
 for(const width of [320,375,390,430])for(const light of [false,true])for(const [label,fraction] of [['new',0],['crescent',.125],['half',.25],['full',.5],['waning',.875]]){
  await page.setViewportSize({width,height:844});
  const prepared=await page.evaluate(({fraction,light})=>{
   state.light=light;go('home');window.scrollTo(0,0);clearTimeout(roofMoonTimer);clearTimeout(roofShootingTimer);document.querySelectorAll('.roof-shooting-star').forEach(n=>n.remove());
   // screenshot(animations:disabled) finishes entry animations; measure that same state.
   document.getAnimations().forEach(animation=>{try{animation.finish();}catch{animation.cancel();}});
   const now=Date.parse('2000-01-06T18:14:00Z')+29.530588853*86400000*fraction,moons=[...document.querySelectorAll('.roof-moon,.home-room-unit .room-window-moon')],samples=[],geometry=[];
   for(const moon of moons){
    RoofMoon.update(moon,now);const path=moon.querySelector('mask path');if(!path||moon.querySelector('circle'))throw Error('Only masked moon light is allowed');
    const old=document.createElementNS('http://www.w3.org/2000/svg','svg');old.innerHTML=PreviousMoon.svg(now,moon.dataset.moonFrame);
    geometry.push({frame:moon.dataset.moonFrame,transform:moon.getAttribute('transform')===old.firstElementChild.getAttribute('transform'),path:path.getAttribute('d')===old.querySelector('path').getAttribute('d'),facing:path.getAttribute('transform')===old.querySelector('path').getAttribute('transform')});
    // WebKit getScreenCTM can omit the HTML ancestor's scale(1.2).
    // Screen bounds include that CSS scale; moon transforms have no rotation.
    const bounds=moon.getBoundingClientRect(),box=moon.getBBox(),inverse=path.transform.baseVal.consolidate().matrix.inverse();
    const screenPoint=(x,y)=>({x:bounds.x+(x-box.x)/box.width*bounds.width+scrollX,y:bounds.y+(y-box.y)/box.height*bounds.height+scrollY});
    const litAt=(x,y)=>path.isPointInFill(new DOMPoint(x,y).matrixTransform(inverse));
    for(let yy=-.75;yy<=.76;yy+=.15)for(let xx=-.75;xx<=.76;xx+=.15){
     if(xx*xx+yy*yy>.65)continue;
     const lit=litAt(xx,yy),safe=[[-.24,0],[.24,0],[0,-.24],[0,.24]].every(([dx,dy])=>litAt(xx+dx,yy+dy)===lit);if(!safe)continue;
     samples.push({frame:moon.dataset.moonFrame,...screenPoint(xx,yy),lit});
    }
    for(let i=0;i<16;i++){const a=i*Math.PI/8;samples.push({frame:moon.dataset.moonFrame,...screenPoint(1.35*Math.cos(a),1.35*Math.sin(a)),lit:false});}
   }
   return {samples,geometry,moonCount:moons.length};
  },{fraction,light});
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));window.scrollTo(0,0);});
  assert.equal(prepared.moonCount,2);assert(prepared.geometry.every(g=>g.transform&&g.path&&g.facing));
  const file=`${width}-${light?'light':'dark'}-${label}`,visible=await page.screenshot({path:path.join(output,file+'.png'),fullPage:true,animations:'disabled'});
  await page.evaluate(()=>document.querySelectorAll('.roof-moon,.room-window-moon').forEach(m=>m.style.visibility='hidden'));
  const hidden=await page.screenshot({path:path.join(output,file+'-sky.png'),fullPage:true,animations:'disabled'});
  const a=PNG.sync.read(visible),b=PNG.sync.read(hidden);assert.equal(a.width,b.width);assert.equal(a.height,b.height);
  const counts={roof:{transparent:0,lit:0,maxSkyDelta:0},window:{transparent:0,lit:0,maxSkyDelta:0}};
  for(const s of prepared.samples){const x=Math.round(s.x*2),y=Math.round(s.y*2);assert(x>=0&&x<a.width&&y>=0&&y<a.height);const pos=(y*a.width+x)*4,delta=Math.max(...[0,1,2,3].map(c=>Math.abs(a.data[pos+c]-b.data[pos+c])));
   // Edge rounds composited gradient colors by one channel level when an SVG
   // layer is hidden. WebKit must match exactly; either engine rejects a disk.
   if(!s.lit){assert(delta<=(edge?1:0),`${file}/${s.frame}: unlit sky changed at ${x},${y}: ${[...a.data.slice(pos,pos+4)]} vs ${[...b.data.slice(pos,pos+4)]}`);counts[s.frame].transparent++;counts[s.frame].maxSkyDelta=Math.max(counts[s.frame].maxSkyDelta,delta);}else if(delta>1)counts[s.frame].lit++;
  }
  for(const frame of ['roof','window']){assert(counts[frame].transparent>=16);if(fraction===0)assert.equal(counts[frame].lit,0);if(fraction===.25||fraction===.5)assert(counts[frame].lit>0,JSON.stringify({file,frame,counts,samples:prepared.samples.filter(s=>s.frame===frame&&s.lit).slice(0,3)}));}
  await page.evaluate(()=>document.querySelectorAll('.roof-moon,.room-window-moon').forEach(m=>m.style.removeProperty('visibility')));
  if(!light){await page.locator('.home-room-unit .day-room-world-window').screenshot({path:path.join(output,file+'-window.png')});await page.locator('.awake-roof').screenshot({path:path.join(output,file+'-roof.png')});captures.push({width,label,file});}
  rows.push({width,light,label,fraction,counts,geometry:prepared.geometry});
 }
 // An old mounted disk must be replaced on update, without replacing its host.
 const migration=await page.evaluate(()=>{
  const now=Date.parse('2026-10-15T23:00:00+09:00');return [...document.querySelectorAll('.roof-moon,.room-window-moon')].map(moon=>{
   const old=document.createElementNS('http://www.w3.org/2000/svg','svg');old.innerHTML=PreviousMoon.svg(now,moon.dataset.moonFrame);const legacy=old.firstElementChild;legacy.querySelector('circle').setAttribute('fill','#000');moon.replaceChildren(...legacy.childNodes);delete moon.dataset.moonRenderer;
   RoofMoon.update(moon,now);const path=moon.querySelector('mask path');RoofMoon.update(moon,now+1000);
   return !moon.querySelector('circle')&&moon.children.length===2&&path===moon.querySelector('mask path');
  });
 });assert(migration.every(Boolean));assert.equal(await page.evaluate(()=>HomePostFixture.calls.length),0);
 const board=await context.newPage();for(const c of captures)for(const frame of ['window','roof']){const f=c.file+'-'+frame+'.png';await board.route('https://preview.invalid/'+f,r=>r.fulfill({contentType:'image/png',body:fs.readFileSync(path.join(output,f))}));}
 await board.setViewportSize({width:1200,height:700});
 await board.setContent(`<html lang="ja"><meta charset="utf-8"><style>body{margin:20px;background:#071329;color:#f8f6ff;font:18px sans-serif}h1{font-size:27px}main{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}figure{margin:0}figcaption{margin:8px 0}img{width:100%;display:block}.pane{height:240px;object-fit:contain;background:#102039}.roof{margin-top:12px}</style><h1>375px · 実画面の月（窓と屋根）</h1><p>光る領域以外は夜空と同じ画素。新月・三日月・半月・満月。</p><main>${captures.filter(c=>c.width===375&&c.label!=='waning').map(c=>`<figure><figcaption>${({new:'新月',crescent:'三日月',half:'半月',full:'満月'})[c.label]}</figcaption><img class="pane" src="https://preview.invalid/${c.file}-window.png"><img class="roof" src="https://preview.invalid/${c.file}-roof.png"></figure>`).join('')}</main></html>`);
 await board.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth));await board.screenshot({path:path.join(output,'moon-phases-375.png'),fullPage:true});
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({pass:true,published,engine:edge?'Edge':'WebKit',actualIPhone:false,productionDbWrites:false,rows,migration,errors,failed},null,2));
 console.log(`PASS ${published?'published':'local'} ${edge?'Edge':'WebKit'}: ${rows.length} real-screen moon/sky pixel comparisons, new/crescent/half/full/waning, 320/375/390/430px, both themes; old-disk migration and node reuse; no DB writes.`);
}finally{await browser?.close();server?.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
