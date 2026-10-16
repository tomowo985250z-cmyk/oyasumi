// Independently rasterize visible alpha, including rotated art, rather than boxes.
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
  function silhouette(img,untransformed=false){
   const matrix=new DOMMatrix(untransformed?undefined:getComputedStyle(img).transform),key=img.src+matrix.toString();if(silhouettes.has(key))return silhouettes.get(key);
   const w=img.naturalWidth,h=img.naturalHeight,side=Math.ceil(Math.hypot(w,h))+4,canvas=document.createElement('canvas');canvas.width=matrix.isIdentity?w:side;canvas.height=matrix.isIdentity?h:side;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.translate(canvas.width/2,canvas.height/2);ctx.transform(matrix.a,matrix.b,matrix.c,matrix.d,0,0);ctx.drawImage(img,-w/2,-h/2);
   const cw=canvas.width,ch=canvas.height,data=ctx.getImageData(0,0,cw,ch).data;let left=cw,top=ch,right=0,bottom=0;
   for(let y=0;y<ch;y++)for(let x=0;x<cw;x++)if(data[(y*cw+x)*4+3]>=16){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1);}
   const result={left:left-cw/2+w/2,top:top-ch/2+h/2,right:right-cw/2+w/2,bottom:bottom-ch/2+h/2,width:w,height:h};silhouettes.set(key,result);return result;
  }
  const snapshot=DayRoom.snapshot,world=DayRoom.world;globalThis.actualSnapshot=snapshot;globalThis.actualWorld=world;
  const nights={};for(let at=Date.parse('2026-10-15T18:00:00+09:00');Object.keys(nights).length<4;at+=NightCats.interval)nights[NightCats.at(at,HomePostFixture.owner).pose]=at;
  globalThis.scaleCases=[...['relax','play','groom','doze','gaze'].map(pose=>({name:'day-'+pose,pose,place:pose==='gaze'?'window':pose==='groom'?'corner':'cushion',where:'room',at:Date.parse('2026-10-15T14:00:00+09:00')})),{name:'sleeping',status:'sleep',place:'cushion',where:'room',at:nights.seated},{name:'morning',status:'awake',home:false,place:'cushion',where:'room',at:nights.seated},...Object.entries(nights).map(([name,at])=>({name:'night-'+name,status:'awake',place:'cushion',where:'room',at})),...['garden','engawa'].flatMap(where=>['relax','play','groom','doze'].map(pose=>({name:where+'-'+pose,where,pose,place:'cushion',at:Date.parse('2026-10-15T14:00:00+09:00')})))];
  scaleCases.push(...scaleCases.filter(c=>c.where==='room'&&!c.name.startsWith('night-')&&c.pose!=='gaze').flatMap(c=>['window','cushion','corner'].filter(place=>place!==c.place).map(place=>({...c,name:c.name+'-'+place,place}))));
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
  globalThis.mealScaleRows=async()=>{
   const rows=[];
   for(const coat of scaleCoats)for(const where of ['room','engawa','garden']){
    await makeScale(coat,{pose:'relax',place:'cushion',where,at:Date.parse('2026-10-15T14:00:00+09:00')});
    const stage=host.querySelector('.day-room');stage.insertAdjacentHTML('beforeend',CatCare.visual(coat));
    const animation=stage.querySelector('.care-scene');animation.classList.add('room-care-animation');animation.style.setProperty('--room-care-scale',stage.clientWidth*.4/152);
    for(const [phase,count] of [['before',3],['munch',1],['after',3]])for(let variant=1;variant<=count;variant++){
     const group=animation.querySelector(phase==='before'?':scope > .care-idle':phase==='after'?':scope > .care-joy-cat':'.care-munch'),img=group.matches('img')?group:group.querySelector('.care-body');
     if(phase!=='munch')img.src=CatMealAssets.src(coat,phase,variant);
     await Promise.all([...animation.querySelectorAll('img')].map(i=>i.decode()));IndoorCatScale.prepareMeal(animation,where);group.hidden=false;
     const probe=()=>{const s=stage.getBoundingClientRect(),r=img.getBoundingClientRect(),a=silhouette(img,true),b=animation.querySelector('.care-bowl').getBoundingClientRect(),k=r.width/a.width;return {stageWidth:s.width,stageHeight:s.height,body:{left:r.left-s.left+a.left*k,right:r.left-s.left+a.right*k,top:r.top-s.top+a.top*k,bottom:r.top-s.top+a.bottom*k,height:(a.bottom-a.top)*k},image:{width:r.width,height:r.height},bowl:[b.x-s.x,b.y-s.y,b.width,b.height]};};
     const scale=group.style.getPropertyValue('--room-cat-scale');group.style.setProperty('--room-cat-scale',where==='room'?'.9':'1');const before=probe();group.style.setProperty('--room-cat-scale',scale);const after=probe();
     rows.push({coat,where,phase,variant,before,after});group.hidden=true;
    }
   }return rows;
  };
 });

 await page.evaluate(focused=>{globalThis.scaleCoats=focused?['fishing','snow-leopard']:CatFaces.coats.map(c=>c.id);},process.argv.includes('--focused'));
 const selectedWidth=Number(process.argv.find(a=>a.startsWith('--width='))?.split('=')[1]);
 for(const width of [320,375,390,430].filter(w=>!selectedWidth||w===selectedWidth)){
  await page.setViewportSize({width,height:844});
  const rows=await page.evaluate(async()=>{
   const rows=[];
   for(const coat of scaleCoats)for(const c of scaleCases){
    await makeScale(coat,c);const resident=document.querySelector('#scale-matrix .room-resident'),scale=resident.style.getPropertyValue('--room-cat-scale');resident.style.setProperty('--room-cat-scale',document.querySelector('#scale-matrix .day-room').dataset.location==='room'?'.9':'1');const before=scaleProbe();resident.style.setProperty('--room-cat-scale',scale);const after=scaleProbe();
    rows.push({coat,pose:c.name,before,after});
   }return rows;
  });
  for(const row of rows){
   const {before:b,after:a}=row,ratio=a.image.width/b.image.width;
   assert(Math.abs(a.image.height/b.image.height-ratio)<.001,JSON.stringify(row));
   const extent=s=>Math.max(s.body.right-s.body.left,s.body.height),reference=rows.find(r=>r.coat==='fishing'&&r.pose==='day-groom').before,target=extent(reference)/reference.stageWidth*a.stageWidth;
   assert(Math.abs(extent(a)-Math.min(extent(b),target))<.12,JSON.stringify(row));
   assert(ratio<=1.001,'Small cats must never be enlarged');
   assert(Math.abs((a.body.left+a.body.right-b.body.left-b.body.right)/2)<.35,JSON.stringify(row));
   assert(Math.abs(a.body.bottom-b.body.bottom)<.35,JSON.stringify(row));
   assert(a.body.left>=-.5&&a.body.right<=a.stageWidth+.5&&a.body.top>=-.5&&a.body.bottom<=a.stageHeight+.5,JSON.stringify(row));
   assert(!a.overflow);matrix.push({width,...row});
  }
  const mealRows=await page.evaluate(()=>mealScaleRows()),ref=rows.find(r=>r.coat==='fishing'&&r.pose==='day-groom').before,targetRatio=Math.max(ref.body.height,ref.body.right-ref.body.left)/ref.stageWidth;
  for(const row of mealRows){const {before:b,after:a}=row,extent=s=>Math.max(s.body.height,s.body.right-s.body.left);assert(Math.abs(extent(a)-Math.min(extent(b),a.stageWidth*targetRatio))<.12,JSON.stringify(row));assert(Math.abs(a.image.width/b.image.width-a.image.height/b.image.height)<.001);assert(Math.abs(a.body.bottom-b.body.bottom)<.1);assert(Math.abs((a.body.left+a.body.right-b.body.left-b.body.right)/2)<.1);assert.deepEqual(a.bowl,b.bowl);assert(a.body.left>=-.5&&a.body.right<=a.stageWidth+.5&&a.body.top>=-.5&&a.body.bottom<=a.stageHeight+.5);meals.push({width,...row});}
  if(width===375)for(const [coat,name] of [['fishing','day-groom'],['snow-leopard','engawa-groom']]){await page.evaluate(({coat,name})=>makeScale(coat,scaleCases.find(c=>c.name===name)),{coat,name});const stage=page.locator('#scale-matrix .day-room');await stage.screenshot({path:path.join(out,coat+'-'+name+'-after.png')});await stage.locator('.room-resident').evaluate(el=>el.style.setProperty('--room-cat-scale',el.closest('.day-room').dataset.location==='room'?'.9':'1'));await stage.screenshot({path:path.join(out,coat+'-'+name+'-before.png')});}
  await page.evaluate(()=>makeScale('calico',scaleCases.find(c=>c.name==='day-gaze')));await page.screenshot({path:path.join(out,`window-${width}.png`)});
  await page.evaluate(()=>makeScale('manul',scaleCases.find(c=>c.name==='night-curl')));await page.screenshot({path:path.join(out,`night-${width}.png`)});
  console.log(`PASS ${engine} ${width}px: ${rows.length} independent silhouette limits, unchanged small cats, aspect, feet and no clipping`);
 }
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);fs.writeFileSync(path.join(out,selectedWidth?`report-${selectedWidth}.json`:'report.json'),JSON.stringify({pass:true,engine,matrix,meals,reference:'fishing/day-groom at former indoor corner .9 scale',shrinkOnly:true,physicalIPhoneTested:false,productionDbWrites:0},null,2));console.log('PASS '+engine+': '+matrix.length+' actual silhouettes and '+meals.length+' meal frames, common body limit, fixed feet/dishes and no clipping');
}finally{await browser?.close();server?.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
