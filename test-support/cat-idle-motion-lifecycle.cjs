const assert=require('node:assert/strict');
async function pending(page,clock){
 await page.evaluate(()=>{
  // Keep the fixture unresolved: normal periodic app refresh is allowed to
  // clear its real pending flag, which would end this test's blocked period.
  globalThis.PendingMotionFixture=new MutationObserver(()=>{if(!document.documentElement.hasAttribute('data-cat-state-pending'))document.documentElement.setAttribute('data-cat-state-pending','');});
  PendingMotionFixture.observe(document.documentElement,{attributes:true,attributeFilter:['data-cat-state-pending']});document.documentElement.setAttribute('data-cat-state-pending','');CatIdleMotion.sync();
 });
 await clock.runFor(80000);assert(await page.evaluate(()=>document.documentElement.hasAttribute('data-cat-state-pending')));assert.equal(await page.locator('#motion-lifecycle .cat-idle-detail').count(),0);
 await page.evaluate(()=>{PendingMotionFixture.disconnect();document.documentElement.removeAttribute('data-cat-state-pending');CatIdleMotion.sync();});await clock.runFor(30000);assert.equal(await page.locator('#motion-lifecycle .cat-idle-detail').count(),0,'No catch-up after pending resolves');
}
module.exports=async(page,clock)=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(async()=>{
  const host=document.createElement('div');host.id='motion-lifecycle';host.style.cssText='position:fixed;left:22px;top:100px;width:calc(100% - 44px);z-index:40';document.body.append(host);
  DayRoom.snapshot=()=>({day:'2026-10-15',location:'room',place:'corner',pose:'groom',away:false});
  const modes=['control','night','sleep','away','other-pose','meal','treat','begging','playback','feeding','care','offscreen','hidden'];
  globalThis.Lifecycle={host,log:[],units:new Map(),modes};
  for(const mode of modes){const unit=document.createElement('div');unit.className='profile-room-unit';unit.dataset.mode=mode;unit.style.cssText='position:absolute;top:0;left:0;width:100%';unit.innerHTML=DayRoom.stage('calico','lifecycle-'+mode,{home:true,status:'awake'},true);host.append(unit);Lifecycle.units.set(mode,unit);}
  await Promise.all([...host.querySelectorAll('img')].map(i=>i.decode()));
 });
 await clock.runFor(6000);
 await page.evaluate(()=>{
  for(const [mode,u] of Lifecycle.units){const s=u.querySelector('.day-room');if(mode==='night')s.dataset.worldDaylight='false';if(mode==='sleep')s.dataset.postStatus='sleep';if(mode==='away')s.dataset.away='true';if(mode==='other-pose')s.querySelector('.room-resident>img').dataset.assetKey='calico/day-relax';if(mode==='meal')u.classList.add('cat-meal-room');if(mode==='treat')u.classList.add('cat-treat-room');if(mode==='begging')u.dataset.morningBeg='true';if(mode==='playback')u.dataset.catPlayback='munch';if(mode==='feeding')u.dataset.feeding='true';if(mode==='care'){const c=document.createElement('div');c.className='room-care-animation';s.append(c);}if(mode==='offscreen')u.style.top='1200px';if(mode==='hidden')u.hidden=true;}
  new MutationObserver(rows=>{for(const r of rows)if(r.target.dataset.idleGesture)Lifecycle.log.push({mode:r.target.closest('[data-mode]').dataset.mode,at:performance.now()});}).observe(Lifecycle.host,{subtree:true,attributes:true,attributeFilter:['data-idle-gesture']});CatIdleMotion.sync();
 });
 if(process.argv.includes('--pending-only')){
  await page.emulateMedia({reducedMotion:'no-preference'});await pending(page,clock);await page.evaluate(()=>Lifecycle.host.remove());return{pendingState:true,noCatchup:true,resumedOnlyPending:true};
 }
 await clock.runFor(80000);assert.deepEqual(await page.evaluate(()=>Lifecycle.log),[],'Reduced motion stays still');
 await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>CatIdleMotion.sync());await clock.runFor(81000);
 const starts=await page.evaluate(()=>Lifecycle.log);assert(starts.length>0);assert(starts.every(x=>x.mode==='control'),'Night/sleep/away/other poses/care/hidden stages stay still');
 // A fresh eligible resident should stop immediately when feeding starts.
 await page.evaluate(()=>{const u=Lifecycle.units.get('control');u.querySelector('.day-room').dataset.roomUser='lifecycle-cancel';CatIdleMotion.sync();});
 let waited=0;for(;waited<77000;waited+=1000){if(await page.locator('[data-mode=control] .cat-idle-detail').count())break;await clock.runFor(1000);}assert(waited<77000);
 await page.evaluate(()=>{Lifecycle.units.get('control').dataset.feeding='true';CatIdleMotion.sync();});assert.equal(await page.locator('[data-mode=control] .cat-idle-detail').count(),0);
 await page.evaluate(()=>{delete Lifecycle.units.get('control').dataset.feeding;CatIdleMotion.sync();});await clock.runFor(30000);assert.equal(await page.locator('[data-mode=control] .cat-idle-detail').count(),0,'No catch-up after feeding');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));CatIdleMotion.sync();});await clock.runFor(80000);assert.equal(await page.locator('#motion-lifecycle .cat-idle-detail').count(),0);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));CatIdleMotion.sync();});await clock.runFor(30000);assert.equal(await page.locator('#motion-lifecycle .cat-idle-detail').count(),0,'No catch-up after a hidden tab');
 await pending(page,clock);
 const rules=await page.evaluate(()=>({rules:CatIdleMotion.rules,waits:Array.from({length:300},(_,n)=>[CatIdleMotion.wait('cat-'+n),CatIdleMotion.wait('cat-'+n,1)]),amplitude:[0,10,2300,4590,4600].map(t=>CatIdleMotion.amplitude(t))}));
 assert(rules.waits.every(([first,rest])=>first>=35000&&first<=75000&&rest>=120000&&rest<=240000));assert.equal(rules.amplitude[0],0);assert.equal(rules.amplitude[4],0);assert.equal(rules.amplitude[2],1);assert(rules.amplitude[1]<.001&&rules.amplitude[3]<.001);
 await page.evaluate(()=>Lifecycle.host.remove());return{excludedModes:12,reducedMotion:true,feedingCancellation:true,hiddenTab:true,pendingState:true,noCatchup:true,starts,rules:rules.rules};
};
