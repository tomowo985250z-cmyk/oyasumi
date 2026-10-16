const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async(page,clock,out)=>{
 const selectedWidth=Number(process.argv.find(a=>a.startsWith('--width='))?.split('=')[1]),focused=process.argv.includes('--focused'),expected=focused?9:48;
 const progressFile=path.join(out,`matrix-progress-${focused?'focused-':''}${selectedWidth||'all'}.json`),release=await page.locator('meta[name=oyasumi-release]').getAttribute('content');
 const progress=fs.existsSync(progressFile)?JSON.parse(fs.readFileSync(progressFile,'utf8')):null;if(progress)assert.equal(progress.release,release);
 const rows=progress?.rows||[];
 await page.evaluate(()=>document.querySelector('#motion-check').remove());
 for(const width of [320,375,390,430].filter(w=>!selectedWidth||w===selectedWidth)){
  if(rows.filter(r=>r.width===width).length===expected)continue;
  await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(async focused=>{
   document.querySelector('#motion-matrix')?.remove();const host=document.createElement('div');host.id='motion-matrix';document.body.append(host);const style=document.createElement('style');style.textContent='#motion-matrix .room-background-layer,#motion-matrix .room-cat-lighting{display:none}';host.append(style);
   const poses=new Map();DayRoom.snapshot=user=>poses.get(user)||{day:'2026-10-15',location:'room',place:'corner',pose:'groom',away:false};
   for(const coat of CatFaces.coats.map(c=>c.id).filter(id=>!focused||['calico','fishing','snow-leopard'].includes(id)))for(const where of ['room','engawa','garden']){
    const user='motion-'+innerWidth+'-'+coat+'-'+where;poses.set(user,{day:'2026-10-15',location:where,place:where==='room'?'corner':'cushion',pose:'groom',away:false});
    const wrap=document.createElement('div');wrap.style.cssText='position:fixed;left:22px;top:100px;width:calc(100% - 44px);z-index:40;opacity:0';wrap.dataset.key=coat+'/'+where;
    wrap.innerHTML=DayRoom.stage(coat,user,{home:true,status:'awake'},true);host.append(wrap);
   }
   await Promise.all([...host.querySelectorAll('img')].map(i=>i.decode()));
   globalThis.Matrix={poses,items:[...host.querySelectorAll('[data-key]')].map(wrap=>({wrap,stage:wrap.firstElementChild}))};
  },focused);
  await clock.runFor(6000);
  await page.evaluate(()=>{for(const {stage} of Matrix.items)for(const a of stage.getAnimations({subtree:true}))a.finish();});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>{
   for(const item of Matrix.items){item.img=item.stage.querySelector('.room-resident>img');item.original=item.img.outerHTML;const r=item.img.getBoundingClientRect();item.geometry=[r.x,r.y,r.width,r.height];}
   CatIdleMotion.sync();
  });
  const completed=new Set(rows.filter(r=>r.width===width).map(r=>r.key));
  for(let elapsed=0;elapsed<=90000&&completed.size<expected;elapsed+=1000){
   await clock.runFor(1000);
   const candidates=await page.evaluate(()=>Matrix.items.filter(i=>Number(i.stage.querySelector('.cat-idle-detail>g')?.getAttribute('opacity'))>.8).map(i=>i.wrap.dataset.key));
   for(const key of candidates){if(completed.has(key))continue;
    await page.evaluate(key=>{const item=Matrix.items.find(i=>i.wrap.dataset.key===key);Matrix.active=item;item.wrap.style.zIndex='50';item.wrap.style.opacity='1';for(const a of item.stage.getAnimations({subtree:true}))a.finish();item.stage.querySelector('.cat-idle-detail').style.visibility='hidden';},key);
    const locator=page.locator(`[data-key="${key}"] .day-room`),before=await locator.screenshot();
    await page.evaluate(()=>Matrix.active.stage.querySelector('.cat-idle-detail').style.visibility='');const moving=await locator.screenshot();
    const result=await page.evaluate(async([a,b])=>{
     const load=async data=>{const i=new Image();i.src='data:image/png;base64,'+data;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(i,0,0);return{pixels:ctx.getImageData(0,0,c.width,c.height).data,width:c.width,height:c.height};};
     const x=await load(a),y=await load(b),item=Matrix.active,s=item.stage.getBoundingClientRect(),r=item.img.getBoundingClientRect(),box={x:r.left-s.left,y:r.top-s.top,width:r.width,height:r.height};let changed=0,outside=0,feet=0;
     for(let py=0;py<x.height;py++)for(let px=0;px<x.width;px++){const at=(py*x.width+px)*4;if([0,1,2,3].some(n=>Math.abs(x.pixels[at+n]-y.pixels[at+n])>2)){changed++;if(px<box.x+.52*box.width||px>box.x+.90*box.width||py<box.y+.32*box.height||py>box.y+.70*box.height)outside++;if(py>=box.y+.8*box.height)feet++;}}
     const dy=Number(item.stage.querySelector('.cat-idle-detail feOffset').getAttribute('dy'))*r.width/parseFloat(getComputedStyle(item.stage.querySelector('.room-resident')).width),sameImage=item.img===item.stage.querySelector('.room-resident>img')&&item.original===item.img.outerHTML,sameGeometry=item.geometry.every((v,n)=>Math.abs(v-[r.x,r.y,r.width,r.height][n])<.02);item.wrap.style.zIndex='40';item.wrap.style.opacity='0';return{changed,outside,feet,dy,box,sameImage,sameGeometry,overflow:document.documentElement.scrollWidth>innerWidth};
    },[before.toString('base64'),moving.toString('base64')]);
    assert(result.changed>0,`${width} ${key}: visible subtle motion`);assert.equal(result.outside,0,`${width} ${key}: local paint only`);assert.equal(result.feet,0);assert(result.sameImage&&result.sameGeometry);assert(!result.overflow);assert(Math.abs(result.dy)<result.box.width*.0091);
    rows.push({width,key,...result});completed.add(key);
    fs.writeFileSync(progressFile,JSON.stringify({release,rows},null,2));
    if(key==='calico/room'||key==='snow-leopard/engawa'){fs.writeFileSync(path.join(out,`${width}-${key.replace('/','-')}-still.png`),before);fs.writeFileSync(path.join(out,`${width}-${key.replace('/','-')}-lick.png`),moving);}
   }
  }
  if(completed.size!==expected)console.log(await page.evaluate(()=>Matrix.items.slice(0,3).map(i=>({key:i.wrap.dataset.key,data:{...i.stage.dataset},src:i.stage.querySelector('img[data-asset-key]')?.dataset.assetKey,rect:i.stage.querySelector('.room-resident').getBoundingClientRect().toJSON(),hidden:document.hidden,nav:document.querySelector('#navigation')?.getBoundingClientRect().toJSON(),css:getComputedStyle(i.stage.querySelector('.room-resident')).visibility,modal:document.querySelector('dialog[open]')?.outerHTML.slice(0,100),pending:document.documentElement.hasAttribute('data-cat-state-pending'),reduce:matchMedia('(prefers-reduced-motion:reduce)').matches,time:performance.now()}))));assert.equal(completed.size,expected,`${width}: all 16 breeds at 3 places must move`);
  await clock.runFor(7000);
  assert.equal(await page.locator('#motion-matrix .cat-idle-detail').count(),0,'Return to the exact original painting');
  await clock.runFor(40000);assert.equal(await page.locator('#motion-matrix .cat-idle-detail').count(),0,'No immediate repetition');
  console.log(`PASS ${width}px: ${expected} breeds/places, mouth-only pixels, fixed feet/geometry, quiet intervals`);
 }
 await page.evaluate(()=>document.querySelector('#motion-matrix')?.remove());return rows;
};






