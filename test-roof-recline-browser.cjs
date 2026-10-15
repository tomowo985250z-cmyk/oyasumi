const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {webkit,chromium}=require(process.env.OYASUMI_PLAYWRIGHT_PATH||'./output/webkit-tools/core/package');
const edge=process.argv.includes('--edge'),published=process.argv.includes('--published'),port=edge?9452:9451;
const base=published?'https://tomowo985250z-cmyk.github.io/oyasumi/':`http://127.0.0.1:${port}/`,output=path.join(__dirname,'output/roof-recline-production-v1',`${published?'published':'local'}-${edge?'edge':'webkit'}`);fs.mkdirSync(output,{recursive:true});
const source=fs.readFileSync('test-home-post-choices.cjs','utf8'),fixture=source.slice(source.indexOf('function installFixture()'),source.indexOf('\n(async () =>'))+'\ninstallFixture();';
const server=published?null:spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'ignore'});let browser;
(async()=>{try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await(edge?chromium:webkit).launch(edge?{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
 const context=await browser.newContext({viewport:{width:375,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
 await context.addInitScript({content:fixture});await context.addInitScript(()=>{HomePostFixture.at=Date.parse('2026-10-15T23:00:00+09:00');Date.now=()=>HomePostFixture.at;const snapshot=OyasumiAPI.snapshot;OyasumiAPI.snapshot=async()=>{HomePostFixture.rows=[HomePostFixture.row('awake')];return snapshot();};const interval=setInterval;globalThis.reclineIntervals=[];window.setInterval=(...args)=>{const id=interval(...args);reclineIntervals.push(id);return id;};});
 const page=await context.newPage(),errors=[],failed=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
 await page.route('**/*',route=>{const u=new URL(route.request().url());if(!u.href.startsWith(base))return route.abort();if(/\/(?:vendor\/supabase|supabase-api|update-client)\.js$/.test(u.pathname))return route.fulfill({contentType:'text/javascript',body:''});return route.continue();});
 await page.goto(base);await page.waitForFunction(()=>typeof ready!=='undefined'&&ready&&!busy&&!refreshPromise);
 assert.equal(await page.locator('meta[name=oyasumi-release]').getAttribute('content'),JSON.parse(fs.readFileSync('release.json','utf8')).release);
 await page.evaluate(()=>{reclineIntervals.forEach(clearInterval);NightClock.now=()=>HomePostFixture.at;NightClock.night=()=>SleepFlow.night(HomePostFixture.at);clearTimeout(roofMoonTimer);globalThis.reclineFootCache=new Map();});
 const cases=[];
 for(const width of [320,375,390,430]){
  await page.setViewportSize({width,height:844});
  const results=await page.evaluate(async()=>{
   const results=[];
   for(const {id:coat} of CatFaces.coats)for(const count of [0,1,2,3])for(let d=15;d<19;d++){
    HomePostFixture.at=Date.parse(`2026-10-${d}T23:00:00+09:00`);shared.activeAwakePosts=count?[{userId:'roof-test',status:'awake',coat,time:HomePostFixture.at}]:[];shared.feed=shared.activeAwakePosts;go('home');clearTimeout(roofMoonTimer);
    const group=document.querySelector('.roof-cat-group');if(!count){results.push({coat,count,night:d,absent:!group,overflow:document.documentElement.scrollWidth>innerWidth});continue;}
    const room=document.querySelector('.home-room-unit').outerHTML,moon=document.querySelector('.roof-moon').outerHTML;
    group.dataset.catCount=String(count);group.innerHTML=RoofRecline.group(Array(count).fill(coat),count,NightClock.night());
    const imgs=[...group.querySelectorAll('img')];await Promise.all(imgs.map(i=>i.decode()));const scene=document.querySelector('.awake-roof').getBoundingClientRect(),scale=scene.width/208;
    const plan=RoofRecline.plan(Array(count).fill(coat),count,NightClock.night()),contacts=[],boxes=[];
    for(let i=0;i<imgs.length;i++){
     const img=imgs[i];let foot=reclineFootCache.get(img.src);
     if(foot===undefined){const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const {data}=ctx.getImageData(0,0,canvas.width,canvas.height);let bottom=0;for(let y=0;y<canvas.height;y++){let solid=0;for(let x=0;x<canvas.width;x++)if(data[(y*canvas.width+x)*4+3]>=128)solid++;if(solid>=canvas.width*.03)bottom=y+1;}foot=bottom/canvas.height;reclineFootCache.set(img.src,foot);}
     const r=img.getBoundingClientRect();boxes.push({left:(r.left-scene.left)/scale,right:(r.right-scene.left)/scale,top:(r.top-scene.top)/scale,bottom:(r.bottom-scene.top)/scale});contacts.push({error:(r.top+r.height*foot-scene.top)/scale-plan[i].contact,pose:img.dataset.catPose,coat:img.dataset.catCoat,width:r.width/scale,src:img.getAttribute('src')});
    }
    const stable=group.innerHTML===RoofRecline.group(Array(count).fill(coat),count,NightClock.night());
    results.push({coat,count,night:d,contacts,boxes,stable,roomUnchanged:room===document.querySelector('.home-room-unit').outerHTML,moonUnchanged:moon===document.querySelector('.roof-moon').outerHTML,overflow:document.documentElement.scrollWidth>innerWidth});
   }return results;
  });
  for(const r of results){assert(!r.overflow);if(!r.count){assert(r.absent);continue;}assert(r.stable&&r.roomUnchanged&&r.moonUnchanged,JSON.stringify(r));assert(r.contacts.every(c=>c.coat===r.coat&&Math.abs(c.error)<.05),JSON.stringify(r));assert(r.boxes.every((b,i)=>b.left>=-.02&&b.right<=182.02&&b.top>=0&&b.bottom<=110&&(!i||b.left>=r.boxes[i-1].right-.02)),JSON.stringify(r));}
  cases.push(...results.map(r=>({width,...r})));console.log(`PASS ${width}px: ${results.length} all-coat/count/phase layouts`);
  await page.evaluate(()=>{HomePostFixture.at=Date.parse('2026-10-15T23:00:00+09:00');go('home');clearTimeout(roofMoonTimer);const group=document.querySelector('.roof-cat-group');group.dataset.catCount='3';group.innerHTML=RoofRecline.group(['calico','orange','gray'],3,NightClock.night());});
  await page.locator('.roof-cat-group img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));await page.screenshot({path:path.join(output,`home-${width}.png`)});await page.locator('.roof-sky-card').screenshot({path:path.join(output,`mixed-${width}.png`)});
 }
 // Actual home count/coat path, with no test replacement of its generated group.
 await page.evaluate(()=>{HomePostFixture.at=Date.parse('2026-10-15T23:00:00+09:00');shared.activeAwakePosts=[{userId:'1',status:'awake',coat:'jaguar',time:HomePostFixture.at},{userId:'2',status:'awake',coat:'white',time:HomePostFixture.at}];shared.feed=shared.activeAwakePosts;go('home');clearTimeout(roofMoonTimer);});
 assert.deepEqual(await page.locator('.roof-cat-group img').evaluateAll(imgs=>imgs.map(i=>i.dataset.catCoat)),['jaguar','white']);
 await page.locator('.home-room-unit .room-resident').tap();assert.equal(await page.evaluate(()=>view),'catMeal');assert.equal(await page.evaluate(()=>HomePostFixture.calls.length),0);
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({pass:true,published,engine:edge?'Edge':'WebKit',actualIPhone:false,productionDbWrites:false,cases,errors,failed},null,2));
 console.log(`PASS ${cases.length} reclining layouts, 16 coats × 0–3 cats × 4 night patterns × 4 widths; pixel-measured feet, spacing, stable selection, room/moon/coat/tap preserved, no DB writes.`);
}finally{await browser?.close();server?.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
