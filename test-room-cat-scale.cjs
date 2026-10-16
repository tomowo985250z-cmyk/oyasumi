// Compare actual browser geometry with the pre-shrink transform on the same art.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {webkit,chromium}=require(process.env.OYASUMI_PLAYWRIGHT_PATH||'./output/webkit-tools/core/package'),places=require('./test-support/cat-places-fixture.cjs');
const edge=process.argv.includes('--edge'),published=process.argv.includes('--published'),engine=edge?'edge':'webkit',port=edge?9552:9551,base=published?'https://tomowo985250z-cmyk.github.io/oyasumi/':`http://127.0.0.1:${port}/`,out=path.join(__dirname,'output/room-cat-scale',`${published?'published':'local'}-${engine}`);
const source=fs.readFileSync('test-home-post-choices.cjs','utf8'),fixture=source.slice(source.indexOf('function installFixture()'),source.indexOf('\n(async () =>'))+';installFixture();';
const server=published?null:spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'ignore'});let browser;
(async()=>{try{
 fs.mkdirSync(out,{recursive:true});for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await(edge?chromium:webkit).launch(edge?{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,timezoneId:'Asia/Tokyo'});
 await context.addInitScript({content:fixture});await context.addInitScript(places);
 const page=await context.newPage(),errors=[],failed=[],matrix=[],meals=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
 await page.route('**/*',r=>{if(!r.request().url().startsWith(base))return r.abort();if(/\/(vendor\/supabase|supabase-api|update-client)\.js$/.test(new URL(r.request().url()).pathname))return r.fulfill({contentType:'text/javascript',body:''});return r.continue();});
 await page.goto(base);await page.waitForFunction(()=>ready&&!busy&&!refreshPromise);
 assert.equal(await page.locator('meta[name=oyasumi-release]').getAttribute('content'),JSON.parse(fs.readFileSync('release.json','utf8')).release);
 await page.evaluate(()=>{
  NightClock.now=()=>HomePostFixture.at;go('profile');
  const host=document.createElement('section');host.id='scale-matrix';host.className='own-cat-room';host.style.cssText='position:fixed;left:22px;top:16px;width:calc(100% - 44px);z-index:30';document.body.append(host);
  const silhouettes=new Map();
  function silhouette(img){
   const matrix=new DOMMatrix(getComputedStyle(img).transform),key=img.src+matrix.toString();if(silhouettes.has(key))return silhouettes.get(key);
   const w=img.naturalWidth,h=img.naturalHeight,side=Math.ceil(Math.hypot(w,h))+4,canvas=document.createElement('canvas');canvas.width=canvas.height=side;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.translate(side/2,side/2);ctx.transform(matrix.a,matrix.b,matrix.c,matrix.d,0,0);ctx.drawImage(img,-w/2,-h/2);
   const data=ctx.getImageData(0,0,side,side).data;let left=side,top=side,right=0,bottom=0;
   for(let y=0;y<side;y++)for(let x=0;x<side;x++)if(data[(y*side+x)*4+3]>=16){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1);}
   const result={left:left-side/2+w/2,top:top-side/2+h/2,right:right-side/2+w/2,bottom:bottom-side/2+h/2,width:w,height:h};silhouettes.set(key,result);return result;
  }
  const snapshot=DayRoom.snapshot,world=DayRoom.world;globalThis.actualSnapshot=snapshot;globalThis.actualWorld=world;
  const nights={};for(let at=Date.parse('2026-10-15T18:00:00+09:00');Object.keys(nights).length<4;at+=NightCats.interval)nights[NightCats.at(at,HomePostFixture.owner).pose]=at;
  globalThis.scaleCases=[...['relax','play','groom','doze','gaze'].map(pose=>({name:'day-'+pose,pose,place:pose==='gaze'?'window':pose==='groom'?'corner':'cushion',where:'room',at:Date.parse('2026-10-15T14:00:00+09:00')})),{name:'sleeping',status:'sleep',place:'cushion',where:'room',at:nights.seated},{name:'morning',status:'awake',home:false,place:'cushion',where:'room',at:nights.seated},...Object.entries(nights).map(([name,at])=>({name:'night-'+name,status:'awake',place:'cushion',where:'room',at})),...['garden','engawa'].flatMap(where=>['relax','play','groom','doze'].map(pose=>({name:where+'-'+pose,where,pose,place:'cushion',at:Date.parse('2026-10-15T14:00:00+09:00')})))];
  globalThis.makeScale=async(coat,c)=>{
   const f=HomePostFixture;f.at=c.at;f.coat=coat;f.sleep=c.status==='sleep';shared.catCare=f.care();state.coat=coat;
   DayRoom.snapshot=user=>({...snapshot(user),pose:c.pose||'relax',place:c.place,location:c.where,away:false});
   host.innerHTML=DayRoom.unit(DayRoom.stage(coat,f.owner,{home:c.home!==false,status:c.status||'awake'}),DayRoom.care(shared.catCare,coat,f.owner,true),f.owner);
   await Promise.all([...host.querySelectorAll('img')].map(i=>i.decode()));
  };
  globalThis.scaleProbe=()=>{
   const stage=host.querySelector('.day-room'),resident=stage.querySelector('.room-resident'),img=resident.querySelector('img'),s=stage.getBoundingClientRect(),b=resident.getBoundingClientRect(),i=img.getBoundingClientRect(),alpha=silhouette(img),k=b.width/alpha.width;
   return {where:stage.dataset.location,stageWidth:s.width,stageHeight:s.height,body:{left:b.left-s.left+alpha.left*k,right:b.left-s.left+alpha.right*k,top:b.top-s.top+alpha.top*k,bottom:b.top-s.top+alpha.bottom*k,height:(alpha.bottom-alpha.top)*k},image:{x:i.x-s.x,y:i.y-s.y,width:i.width,height:i.height},resident:{x:b.x-s.x,y:b.y-s.y,width:b.width,height:b.height},origin:getComputedStyle(resident).transformOrigin.split(' ').map(parseFloat),overflow:document.documentElement.scrollWidth>innerWidth};
  };
 });

 for(const width of [320,375,390,430]){
  await page.setViewportSize({width,height:844});
  const rows=await page.evaluate(async()=>{
   const rows=[];
   for(const coat of CatFaces.coats.map(c=>c.id))for(const c of scaleCases){
    await makeScale(coat,c);const resident=document.querySelector('#scale-matrix .room-resident'),scale=resident.style.getPropertyValue('--indoor-cat-scale');resident.style.setProperty('--indoor-cat-scale','1');const before=scaleProbe();resident.style.removeProperty('--indoor-cat-scale');const after=scaleProbe();
    rows.push({coat,pose:c.name,before,after});
   }return rows;
  });
  for(const row of rows){
   const {before:b,after:a}=row,ratio=a.image.width/b.image.width;
   assert(Math.abs(a.image.height/b.image.height-ratio)<.001,JSON.stringify(row));
   assert(Math.abs(a.body.height/b.body.height-(a.where==='room'?.9:1))<.0015,JSON.stringify(row));
   assert(Math.abs((a.body.left+a.body.right-b.body.left-b.body.right)/2)<.35,JSON.stringify(row));
   assert(Math.abs(a.body.bottom-b.body.bottom)<.35,JSON.stringify(row));
   assert(a.body.left>=-.5&&a.body.right<=a.stageWidth+.5&&a.body.top>=-.5&&a.body.bottom<=a.stageHeight+.5,JSON.stringify(row));
   assert(!a.overflow);matrix.push({width,...row});
  }
  await page.evaluate(()=>makeScale('calico',scaleCases.find(c=>c.name==='day-gaze')));await page.screenshot({path:path.join(out,`window-${width}.png`)});
  await page.evaluate(()=>makeScale('manul',scaleCases.find(c=>c.name==='night-curl')));await page.screenshot({path:path.join(out,`night-${width}.png`)});
  console.log(`PASS ${engine} ${width}px: ${rows.length} independently measured alpha-height, aspect, foot-contact and unclipped-body comparisons`);
 }
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({pass:true,engine,matrix,physicalIPhoneTested:false,productionDbWrites:0},null,2));console.log('PASS '+engine+': '+matrix.length+' actual alpha silhouette measurements, indoor .9 / outdoor 1, fixed feet and no clipping');
}finally{await browser?.close();server?.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
