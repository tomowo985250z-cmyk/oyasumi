const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const {webkit,chromium}=require('./output/webkit-tools/core/package'),fixtureSetup=require('./test-support/cat-places-fixture.cjs');
const edge=process.argv.includes('--edge'),engine=edge?'Edge':'WebKit',port=edge?9504:9503,base=`http://127.0.0.1:${port}/`,out=path.join(__dirname,'output/cat-places-production','poses-'+engine.toLowerCase());fs.mkdirSync(out,{recursive:true});
const source=fs.readFileSync('test-home-post-choices.cjs','utf8'),fixture=source.slice(source.indexOf('function installFixture()'),source.indexOf('\n(async () =>'))+'\ninstallFixture();';
const server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'ignore'});let browser;
(async()=>{try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await(edge?chromium:webkit).launch(edge?{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
 const context=await browser.newContext({viewport:{width:375,height:900},deviceScaleFactor:1,isMobile:true,hasTouch:true,timezoneId:'America/Los_Angeles'});
 await context.addInitScript({content:fixture});await context.addInitScript(fixtureSetup);
 const page=await context.newPage(),errors=[],failed=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
 await page.route('**/*',r=>{if(!r.request().url().startsWith(base)){external.push(r.request().url());return r.abort();}if(/\/(vendor\/supabase|supabase-api|update-client)\.js$/.test(new URL(r.request().url()).pathname))return r.fulfill({contentType:'text/javascript',body:''});return r.continue();});
 await page.goto(base);await page.waitForFunction(()=>typeof ready!=='undefined'&&ready&&!busy&&!refreshPromise);
 const times=await page.evaluate(()=>{
  NightClock.now=()=>HomePostFixture.at;const times={},owner=HomePostFixture.owner;
  for(let d=0;d<60;d++){
   const plan=CatPlaces.schedule(Date.parse('2026-10-01T14:00:00+09:00')+d*86400000,owner);
   for(const e of plan.events)for(const m of e.moods)times[e.place+':'+m.pose]??=m.at+1000;
   if(Object.keys(times).length===12)return times;
  }throw Error('Not all supported place/pose combinations found');
 });
 const coats=await page.evaluate(()=>CatFaces.coats.map(c=>c.id)),cases=[];
 for(const coat of coats)for(const [key,at] of Object.entries(times)){
  await page.evaluate(({coat,at})=>{HomePostFixture.at=at;HomePostFixture.coat=coat;state.coat=coat;shared.catCare=HomePostFixture.care();go('home');},{coat,at});
  await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('.home-room-unit img')].map(i=>i.decode()));});
  const row=await page.evaluate(()=>{
   const stage=document.querySelector('.home-room-unit .day-room'),cat=stage.querySelector('.room-resident img'),r=stage.getBoundingClientRect(),c=cat.getBoundingClientRect();
   return {key:stage.dataset.location+':'+cat.dataset.dayScene,coat:cat.dataset.catCoat,loaded:cat.complete&&cat.naturalWidth>0,x:c.x-r.x,y:c.y-r.y,width:c.width,height:c.height,stageWidth:r.width,stageHeight:r.height,overflow:document.documentElement.scrollWidth>innerWidth};
  });
  assert.equal(row.key,key);assert.equal(row.coat,coat);assert(row.loaded&&!row.overflow);assert(row.x>=-1&&row.y>=-1&&row.x+row.width<=row.stageWidth+1&&row.y+row.height<=row.stageHeight+1);
  if(['calico','manul','snow-leopard'].includes(coat)){const clip=await page.locator('.home-room-unit .day-room').boundingBox();await page.screenshot({path:path.join(out,coat+'-'+key.replace(':','-')+'.png'),clip});}
  cases.push(row);
 }
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);assert.deepEqual(external,[]);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({pass:true,engine,release:JSON.parse(fs.readFileSync('release.json','utf8')).release,combinations:Object.keys(times),cases,errors,failed,external,productionDbWrites:0},null,2));
 console.log(`PASS ${engine}: all 16 coats × all 12 supported location/pose combinations, image decode and room/sill/ground placement.`);
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
