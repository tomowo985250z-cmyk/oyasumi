const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const {webkit,chromium}=require(process.env.OYASUMI_PLAYWRIGHT_PATH||'./output/webkit-tools/core/package'),edge=process.argv.includes('--edge'),engine=edge?'edge':'webkit',port=edge?9576:9575,base=`http://127.0.0.1:${port}/`;
const source=fs.readFileSync(path.join(__dirname,'test-home-post-choices.cjs'),'utf8'),fixture=source.slice(source.indexOf('function installFixture()'),source.indexOf('\n(async () =>'))+'\ninstallFixture();';
const out=path.join(__dirname,'output/countryside-backgrounds/transition-paint-'+engine);fs.mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['server.js'],{cwd:__dirname,env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'ignore'});let browser;
(async()=>{try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await(edge?chromium:webkit).launch(edge?{executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}:{});
 const context=await browser.newContext({viewport:{width:375,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,reducedMotion:'no-preference'});await context.addInitScript({content:fixture});await context.addInitScript(()=>Object.defineProperty(document,'hidden',{configurable:true,value:false}));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>{if(!r.request().url().startsWith(base))return r.abort();if(/\/(?:vendor\/supabase|supabase-api|update-client)\.js$/.test(new URL(r.request().url()).pathname))return r.fulfill({contentType:'text/javascript',body:''});return r.continue();});
 await page.goto(base);await page.waitForFunction(()=>typeof ready!=='undefined'&&ready&&!busy&&!refreshPromise);
 const release=JSON.parse(fs.readFileSync(path.join(__dirname,'release.json'),'utf8')).release;assert.equal(await page.locator('meta[name=oyasumi-release]').getAttribute('content'),release);
 // Component paint check: mounted time-controller behavior is tested separately.
 await page.evaluate(()=>{DayRoom.sync=()=>{};});
 const samples=[];
 const pixel=async clip=>{const png=await page.screenshot({clip});return page.evaluate(async data=>{const i=new Image();i.src='data:image/png;base64,'+data;await i.decode();const c=document.createElement('canvas');c.width=c.height=1;const ctx=c.getContext('2d');ctx.drawImage(i,0,0);return [...ctx.getImageData(0,0,1,1).data].slice(0,3);},png.toString('base64'));};
 for(const width of [320,375,390,430]){
  await page.setViewportSize({width,height:844});
  await page.evaluate(async()=>{
   go('stats');document.querySelector('#app').innerHTML='<div class="day-room room-scene" id="paint-room"><div class="day-room-scenery"></div></div>';
   const stage=document.querySelector('#paint-room');globalThis.PaintWorld={day:'2026-07-15',season:'summer',weather:'sunny',hour:13,daylight:true};stage.querySelector('.day-room-scenery').innerHTML=RoomBackgrounds.markup('room',PaintWorld);stage.dataset.sceneryKey=RoomBackgrounds.key('room',PaintWorld);await Promise.all([...stage.querySelectorAll('img')].map(i=>i.decode()));
  });
  await page.locator('#paint-room').scrollIntoViewIfNeeded();
  const clip=await page.locator('.day-room-world-window').evaluate(el=>{const r=el.getBoundingClientRect();return{x:Math.floor(r.x+r.width*.3),y:Math.floor(r.y+r.height*.3),width:1,height:1};}),before=await pixel(clip);
  await page.evaluate(async()=>{await RoomBackgrounds.update(document.querySelector('#paint-room'),'room',{...PaintWorld,hour:17});const old=document.querySelector('[data-background-outgoing]');globalThis.PaintAnimation=old.getAnimations()[0];PaintAnimation.pause();PaintAnimation.currentTime=0;});
  const frames=[];
  for(const time of [0,800,1600]){await page.evaluate(async time=>{PaintAnimation.currentTime=time;await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);},time);frames.push(await pixel(clip));if(width===375)await page.locator('#paint-room').screenshot({path:path.join(out,`375-${time}.png`)});}
  assert(frames[0].every((v,i)=>Math.abs(v-before[i])<=2),JSON.stringify({width,before,frames}));
  assert(frames[0].reduce((n,v,i)=>n+Math.abs(v-frames[2][i]),0)>15,'Sky must actually change: '+JSON.stringify({width,frames}));
  assert(frames[1].every((v,i)=>Math.abs(v-(frames[0][i]+frames[2][i])/2)<4),'Painted sky must blend at midpoint: '+JSON.stringify({width,frames}));
  await page.evaluate(()=>PaintAnimation.finish());samples.push({width,before,frames});
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({pass:true,engine,release,samples,productionDbWrites:0,physicalIPhoneTested:false},null,2));console.log(`PASS ${engine}: all 4 widths paint the original sky, a blended midpoint, and the new sky`);
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
