const STORAGE_KEY = 'oyasumi-v1';
const LOCAL_KEY = 'oyasumi-local-v2';
const POST_OPTIONS = [
 { id: 'awake', text: '起きてるよ', sleeping: false },
 { id: 'sleep', text: 'もう寝るよ 🌙', sleeping: true },
 { id: 'try-sleep', text: '眠れないけど寝てみる 💤', sleeping: true },
 { id: 'early-sleep', text: 'お先に寝ます 👋', sleeping: true }
];
const reactionOptions = post => shared.reactionVersion === 3 ? PostReactions.options(post) : PostReactions.legacy;
const isSleeping = status => POST_OPTIONS.some(option => option.id === status && option.sleeping);
const DARK_HINT_KEY = 'oyasumi-dark-hint-seen';
let darkHintEligible=false,darkHintStarted,darkHintTimer;
try { const firstUse=!localStorage.getItem(DARK_HINT_KEY)&&!localStorage.getItem('oyasumi-local-v2')&&!localStorage.getItem('oyasumi-v1');const darkDevice=matchMedia('(prefers-color-scheme: dark)').matches;darkHintEligible=firstUse&&!darkDevice;if(firstUse&&darkDevice)localStorage.setItem(DARK_HINT_KEY,'skipped'); } catch { /* Don't repeat a hint when persistence is unavailable. */ }
function darkHint() {
 if(!darkHintEligible)return '';
 if(darkHintStarted===undefined){darkHintStarted=performance.now();try{localStorage.setItem(DARK_HINT_KEY,'1');}catch{darkHintEligible=false;return '';}}
 const elapsed=performance.now()-darkHintStarted;if(elapsed>=4000)return '';
 clearTimeout(darkHintTimer);darkHintTimer=setTimeout(()=>document.querySelector('.dark-mode-hint')?.remove(),4000-elapsed);
 return `<p class="dark-mode-hint" role="status" style="animation-delay:-${elapsed}ms">🌙 夜はダークモードがおすすめです</p>`;
}
const SHARE_PLACE = Object.freeze({ text: '眠る前に、少しだけ立ち寄れる場所です。', url: 'https://tomowo985250z-cmyk.github.io/oyasumi/' });
let reactionEffectPostId, reactionHeartTimer;
function clearReactionEffect() { clearTimeout(reactionHeartTimer);document.querySelector('.reaction-heart')?.remove(); }
function positionReactionEffect() {
 const cat=document.querySelector(`[data-react="${CSS.escape(reactionEffectPostId||'')}"]`)?.closest('.post')?.querySelector('.avatar');
 if(!cat)return;
 const box=cat.getBoundingClientRect();
 const heart=document.querySelector('.reaction-heart');
 if(heart){heart.style.left=`${Math.max(8,Math.min(innerWidth-28,box.left+box.width/2-10))}px`;heart.style.top=`${Math.max(8,box.top-28)}px`;}
}
function showReactionTap(button) {
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches)button.animate([
  {transform:'translateY(0) scale(1)'},{transform:'translateY(2px) scale(.98)',offset:.35},{transform:'translateY(0) scale(1)'}
 ],{duration:240,easing:'ease-out'});
 clearTimeout(reactionHeartTimer);document.querySelector('.reaction-heart')?.remove();
 if(!button.closest('.post')?.querySelector('.avatar'))return;
 reactionEffectPostId=button.dataset.react;
 const heart=document.createElement('span');heart.className='reaction-heart';heart.textContent='♥';heart.setAttribute('aria-hidden','true');
 document.body.append(heart);positionReactionEffect();
 reactionHeartTimer=setTimeout(()=>document.querySelector('.reaction-heart')?.remove(),1050);
}
function showShareURL() { const dialog=document.querySelector('#share-dialog');document.querySelector('#share-url').textContent=SHARE_PLACE.url;if(!dialog.open)dialog.showModal(); }
async function copyPlaceURL() { try { await navigator.clipboard.writeText(SHARE_PLACE.url);document.querySelector('#share-dialog').close();toast('URLをコピーしました'); } catch { showShareURL(); } }
async function sharePlace() { if(typeof navigator.share!=='function'){await copyPlaceURL();return;}try { await navigator.share({text:SHARE_PLACE.text,url:SHARE_PLACE.url}); } catch(error) { if(error.name!=='AbortError')showShareURL(); } }
const freshState = () => ({ name: '', expression: 'calm', coat: 'calico', catRole: null, profileNote: '', posts: [], reactions: {}, morningDays: [], light: false, lastSleep: null });
let localState = {};
// Read versions independently so damaged legacy data cannot discard valid records.
for (const key of [STORAGE_KEY, LOCAL_KEY]) {
 try { localState = { ...localState, ...JSON.parse(localStorage.getItem(key) || '{}') }; } catch { /* Leave this storage entry untouched and read the next. */ }
}
let state = { ...freshState(), coat: CatFaces.normalizeCoat(localState.lastSleep?.coat), name: localState.name, morningDays: Array.isArray(localState.morningDays) ? localState.morningDays : [], light: !!localState.light, lastSleep: localState.lastSleep || null };
state.skyRegion=SolarModel.setRegion(localState.skyRegion).id;
const savedName = NicknameRules.validate(state.name);
state.name = savedName.error ? freshState().name : savedName.name;
let shared = { userId: null, feed: [], reactionCounts: {}, awakeCount: null, sleepingCount: null, ownSleepCount: null, nightDate: null, trend: [], trendSupported: false };
let busy = false, ready = false, refreshPromise, connectionPromise;
// Local defaults and a restored page are not a confirmed cat identity/state.
let catStatePending=true, catStateRevision=0,ownCatPreview,timelinePreview;
const previewFresh=preview=>preview&&preview.revision===stateRevision&&preview.catRevision===catStateRevision&&!document.hidden&&(!preview.clock||preview.clock.serverNow+performance.now()-preview.clock.monotonicAt<preview.clock.resetAt)&&(!preview.catCare||CatCare.fresh(preview.catCare));
const catsResolved=()=>ready&&!catStatePending&&shared.catStateResolved!==false;
function syncCatVisibility(){
 const pending=!catsResolved(),root=document.documentElement,changed=root.hasAttribute('data-cat-state-pending')!==pending;
 root.toggleAttribute('data-cat-state-pending',pending);
 root.toggleAttribute('data-cat-own-ready',!!previewFresh(ownCatPreview));
 root.toggleAttribute('data-cat-timeline-ready',!!previewFresh(timelinePreview)||(ready&&!catStatePending));
 if(changed)document.dispatchEvent(new Event('catvisibilitychange'));
}
function invalidateCatState(){catStatePending=true;catStateRevision++;ownCatPreview=timelinePreview=undefined;syncCatVisibility();syncBusy();}
document.addEventListener('visibilitychange',invalidateCatState,{capture:true});
window.addEventListener('pagehide',invalidateCatState,{capture:true});
window.addEventListener('pageshow',event=>{if(event.persisted){invalidateCatState();void ensureConnection().then(()=>refreshShared()).catch(()=>{});}},{capture:true});
let stateRevision=0, refreshQueued=false, refreshSaved=false;
let view = SleepFlow.openView(state.lastSleep,state.morningDays,NightClock.now()), filter = 'all', toastTimer, restTimer, sleepShownAt;
const app = document.querySelector('#app');
const nav = document.querySelector('#navigation');
const icons = { home: '<path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9"/>', timeline: '<rect x="4" y="3" width="16" height="16" rx="3"/><path d="m8 19-2 3v-4M8 8h8M8 12h6"/>', stats: '<path d="M5 21V12h3v9M11 21V4h3v17M17 21V8h3v13"/>', profile: '<circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3Z"/>' };
const escapeHTML = text => String(text).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const timeLabel = date => new Date(date).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false });
const dayKey = () => SleepFlow.day(NightClock.now());
function save() { try { localStorage.setItem(LOCAL_KEY, JSON.stringify({ name: state.name, morningDays: state.morningDays, light: state.light, skyRegion: state.skyRegion, lastSleep: state.lastSleep })); } catch { toast('端末の設定を保存できませんでした。'); } }
function toast(message) { const el=document.querySelector('#toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),2800); }
const allPosts = () => PostCatExpressions.latest(view==='timeline'&&previewFresh(timelinePreview)?timelinePreview.feed:shared.feed,NightClock.now());
const statusText = (status,intent) => status === 'awake' && intent === 'sleepless' ? 'まだ眠れない…' : POST_OPTIONS.find(option => option.id === status)?.text || '';
const avatar = p => `<span class="avatar ${p.color || 'peach'}" ${p.appearanceReady===true?'data-cat-appearance-ready="true"':''} aria-hidden="true">${p.appearanceReady===false?'<span class="cat-face" data-cat-placeholder></span>':PostCatExpressions.svg(PostCatExpressions.forPost(p),p.coat)}</span>`;
function ownIconPost(){return PostCatExpressions.latest(state.posts,NightClock.now())[0];}
function ownIcon(){return avatar({...ownIconPost(),coat:state.coat,color:'peach'});}
const isOwnCat = person => person.self===true || (!!shared.userId && person.userId===shared.userId);
const staticCatIcon = (html,className,name) => `<span class="${className}" data-own-cat-icon role="img" aria-label="${escapeHTML(name)}の猫">${html}</span>`;
const postCatIcon = person => isOwnCat(person) ? staticCatIcon(avatar(person),'public-profile-cat',person.name) : `<button class="public-profile-cat" data-public-profile="${person.id}" aria-label="${escapeHTML(person.name)}のプロフィール">${avatar(person)}</button>`;
const header = (title='おやすみ', back=false, backAction='data-view="home" aria-label="ホームに戻る"') => `<header class="header">${back?`<button class="icon-button" ${backAction}>‹</button>`:'<span class="eyebrow">GOOD NIGHT</span>'}<h1 class="wordmark">${title}</h1><button class="icon-button" data-view="settings" aria-label="設定">⚙</button></header>`;
function navigation() { const items=[['home','ホーム'],['timeline','タイムライン'],['stats','みんなの記録'],['profile','マイページ']];nav.innerHTML=items.map(([id,label])=>`<button data-view="${id}" class="${view===id?'active':''}" ${view===id?'aria-current="page"':''}><svg viewBox="0 0 24 24" aria-hidden="true">${icons[id]}</svg>${label}</button>`).join('');nav.hidden=false; }
let roofMoonTimer,roofShootingTimer,roofNextShootingAt,roofBoundaryTimer;
function syncRoofSolar(){
 const scene=document.querySelector('.awake-roof');if(document.hidden||!scene)return;
 const w=DayRoom.world(),key=[SolarModel.region().id,Math.floor(w.at/60000),w.weather,w.season].join(':');
 if(scene.dataset.solarKey===key)return;scene.dataset.solarKey=key;
 const holder=document.createElementNS('http://www.w3.org/2000/svg','svg');holder.innerHTML=SolarSky.roof(w);
 const current=scene.querySelector('[data-roof-solar]');if(current)current.replaceWith(holder.firstElementChild);else scene.insertBefore(holder.firstElementChild,scene.querySelector(':scope > path'));
}

function syncRoofMoon() {
 clearTimeout(roofMoonTimer);
 const moons=document.querySelectorAll('.roof-moon,.room-window-moon');
 if(document.hidden||!moons.length)return;
 // Clock-driven decoration must not wait for a shooting star, a successful
 // network refresh or a full render. Keep the moon and cat nodes in place.
 const now=NightClock.now();
 for(const moon of moons)RoofMoon.update(moon,now);
 const scene=document.querySelector('.awake-roof');if(scene)SolarSky.updateRoof(scene,{...DayRoom.world(),at:now,cloudAt:now});
 roofMoonTimer=setTimeout(syncRoofMoon,1000);
}
function syncRoofSky() {
 clearTimeout(roofBoundaryTimer);
 if(!document.hidden&&view==='home'){
  const now=NightClock.now();roofBoundaryTimer=setTimeout(()=>{refreshDayScene();syncRoofSky();},Math.max(25,SolarModel.sky(now).nextRoofAt-now));
 }
 syncRoofSolar();
 clearTimeout(roofShootingTimer);
 const scene=document.querySelector('.awake-roof');
 syncRoofMoon();
 if(SolarModel.twilight(NightClock.now(),'roof').stars<.7||document.hidden||!scene||matchMedia('(prefers-reduced-motion: reduce)').matches){document.querySelectorAll('.roof-shooting-star').forEach(star=>{star.getAnimations().forEach(animation=>animation.cancel());star.remove();});roofNextShootingAt=undefined;return;}
 roofNextShootingAt??=performance.now()+15000+Math.random()*15000;
 roofShootingTimer=setTimeout(()=>{
  roofNextShootingAt=undefined;
  if(!scene.isConnected||document.hidden){syncRoofSky();return;}
  const star=document.createElementNS('http://www.w3.org/2000/svg','line'),x=8+Math.random()*42,y=5+Math.random()*16;
  star.classList.add('roof-shooting-star');star.setAttribute('x1',x);star.setAttribute('y1',y);star.setAttribute('x2',x+12);star.setAttribute('y2',y+5);star.setAttribute('stroke','#e5dfc6');star.setAttribute('stroke-width','.8');star.setAttribute('stroke-linecap','round');scene.append(star);
  const animation=star.animate([{opacity:0,transform:'translate(0,0)'},{opacity:.5,transform:'translate(8px,3px)',offset:.2},{opacity:0,transform:'translate(42px,18px)'}],{duration:700+Math.random()*300,easing:'ease-out'});
  animation.finished.then(()=>star.remove(),()=>star.remove());syncRoofSky();
 },Math.max(0,roofNextShootingAt-performance.now()));
}
document.addEventListener('visibilitychange',syncRoofSky);
window.addEventListener('pageshow',()=>{if(!document.hidden){checkNightBoundary();refreshDayScene();syncRoofSky();}});
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',syncRoofSky);
function activeAwakeCount() {
 return Array.isArray(shared.activeAwakePosts) ? TimelineVisibility.visible(shared.activeAwakePosts,NightClock.now()).length : shared.awakeCount;
}
let sentReactionPeople, sentPeopleRequest=0;
function sentKindness(){return sentReactionPeople?.nightDate===NightClock.night()&&sentReactionPeople.count>0?`<p class="quiet-note sent-kindness">今日は${sentReactionPeople.count}人に、やさしい気持ちを届けたよ 🐾</p>`:'';}
async function refreshSentReactionPeople(){
 if(!['sleep','rest'].includes(view)||!shared.userId||typeof OyasumiAPI.getSentReactionPeople!=='function')return;
 const request=++sentPeopleRequest,user=shared.userId,revision=stateRevision;
 // Hide the previous result while verifying the latest state on every entry.
 sentReactionPeople=undefined;document.querySelector('[data-sent-kindness]')?.replaceChildren();
 try{
  const result=await OyasumiAPI.getSentReactionPeople();
  if(request!==sentPeopleRequest||user!==shared.userId)return;
  if(revision!==stateRevision){void refreshSentReactionPeople();return;}
  if(result.nightDate!==NightClock.night()||!Number.isSafeInteger(result.count)||result.count<0)return;
  sentReactionPeople=result;
  const target=document.querySelector('[data-sent-kindness]');if(target)target.innerHTML=sentKindness();
 }catch{ /* Optional SQL may not be installed; never show a stale or false count. */ }
}
function awakeCats() {
 // The mounted row is fitted to the card by the existing solar update tick.
 const count=1,coats=[];
return `<span class="awake-cats" aria-hidden="true"><span class="awake-scene"><svg class="awake-roof" viewBox="0 0 208 150" focusable="false"><defs><linearGradient id="awake-roof-wash" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#23324b"/><stop offset="1" stop-color="#14213a"/></linearGradient><clipPath id="awake-roof-frame" clipPathUnits="userSpaceOnUse"><rect x="-256" y="0" width="720" height="150"/></clipPath></defs><g clip-path="url(#awake-roof-frame)">${SolarSky.roof(DayRoom.world())}${RoofRecline.surface()}</g></svg><span class="roof-cat-group" data-layout="mixed" data-cat-count="${count}">${RoofRecline.group(coats,count,NightClock.night())}</span></span></span>`;
}
function cardSkyStars() {
 // One gently jittered star per cell keeps the entire card balanced at every width.
 // Deterministic offsets prevent stars from jumping when counts refresh.
 const twinkle=new Map([[2,3.8],[13,4.7],[30,5.6],[45,4.2]]),cross=new Set([6,24,39]);
 return `<span class="card-sky-stars" aria-hidden="true">${Array.from({length:48},(_,i)=>{
  const x=((i%8)+.22+((i*37+11)%101)/100*.56)/8*100,y=(Math.floor(i/8)+.22+((i*53+29)%103)/102*.56)/6*100;
  const tone=i%4===0?'cool':'warm',color=tone==='cool'?'#d2ddec':i%2?'#ece2bd':'#e9d6a7';
  const size=cross.has(i)?2.8+(i%3)*.3:.8+(i%5)*.2,opacity=.42+(i%4)*.1;
  const classes=[cross.has(i)?'card-star-cross':'',twinkle.has(i)?'roof-twinkle':''].filter(Boolean).join(' ');
  const motion=twinkle.has(i)?`animation-duration:${twinkle.get(i)}s;animation-delay:-${i*.37}s;`:'';
  return `<i class="${classes}" data-star-tone="${tone}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%;width:${size}px;height:${size}px;--star-opacity:${opacity};opacity:${opacity};color:${color};${motion}"></i>`;
 }).join('')}${SolarSky.northernStars(DayRoom.world())}</span>`;
}
function homeCopy(now=NightClock.now()) {
 const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:SleepFlow.rules.timeZone,hour:'2-digit',hourCycle:'h23'}).format(now));
 return hour>=6&&hour<18 ? {heading:'最近の投稿',comment:'ここには、誰かがいるみたい'} : {heading:'今夜まだ起きてる人',comment:'今夜も、ひとりじゃないみたい'};
}
function countCard() { const now=NightClock.now(),copy=homeCopy(now),world=DayRoom.world();if(!SolarModel.sky(now).roofVisible)return '';return `<section class="card count-card roof-sky-card" ${DayRoom.attrs(world)}>${cardSkyStars()}<svg class="roof-moon-viewport" aria-hidden="true" focusable="false">${RoofMoon.svg(now)}</svg><h2 class="awake-heading"><span>今夜も、<span class="count">${activeAwakeCount() ?? '—'}<small>人</small></span>と同じ空の下。</span></h2>${awakeCats()}<p class="muted" data-trend-comment="${TonightTrend.classify(shared.trend)}">${copy.comment}</p></section>`; }
function actions() {
 // Both awake choices use the existing DB status; keep legacy early-sleep in POST_OPTIONS for history and counts.
 return `<div class="status-actions"><button class="status-button awake" data-post="awake" data-home-choice="relax"><span class="status-symbol sun-symbol" aria-hidden="true"><svg viewBox="0 0 48 48" focusable="false"><circle cx="24" cy="24" r="11"/><path d="M24 5v4M24 39v4M5 24h4M39 24h4M10.5 10.5l2.8 2.8M34.7 34.7l2.8 2.8M10.5 37.5l2.8-2.8M34.7 13.3l2.8-2.8" fill="none" stroke="#fff0c2" stroke-width="3" stroke-linecap="round"/></svg></span><span><strong><span class="post-label-text">起きてるよ</span></strong><small>（のんびり中）</small></span></button><button class="status-button sleep" data-post="sleep" data-home-choice="sleep"><span class="status-symbol moon-symbol" aria-hidden="true"><svg viewBox="0 0 48 48" focusable="false"><path d="M39 5C23-1 6 10 6 25C6 40 24 49 39 41C41 40 41 37 38 37C25 37 18 28 20 17C22 11 29 8 37 8C40 8 41 6 39 5Z"/></svg></span><span><strong><span class="post-label-text">もう寝るよ</span></strong><small>（おやすみする）</small></span></button><div class="extra-post-options"><button class="extra-post-button" data-post="awake" data-home-choice="sleepless"><span><strong><span class="post-label-line">まだ眠れない…</span></strong><small>（起きてる）</small></span></button><button class="extra-post-button" data-post="try-sleep" data-home-choice="try-sleep"><span><strong><span class="post-label-line">眠れないけど</span><span class="post-label-line">寝てみる <span class="post-label-emoji">💤</span></span></strong></span></button></div><p class="choice-note">ひとつ選ぶだけ。<br>寝る報告のあとは、スマホを置いて。</p></div>`;
}
function chart() { return `<section class="card chart"><h2>みんなの推移</h2>${TonightTrend.chart(shared.trend)}</section>`; }
function stats() {
 const summary=shared.tonightSummary;
 const count=summary?.sleepingCount??shared.sleepingCount;
 const limit=32,cats=[];
 if(summary)for(const group of summary.coats)for(let i=0;i<group.count&&cats.length<limit;i++)cats.push(CatScenes.svg('sleeping',group.coat));
 const hours=summary?.peakHours||[];
 return `${header('みんなの記録',true)}<section class="card count-card"><h2>おやすみした人</h2><div class="count">${count??'—'}<small> 人</small></div><p class="muted">最後の投稿でおやすみを報告した人</p></section><section class="card tonight-cats"><h2>おやすみ中の猫たち</h2>${summary?cats.length?`<div class="sleeping-cats" role="img" aria-label="おやすみした${count}人の猫たち"><div aria-hidden="true">${cats.join('')}</div></div>${count>cats.length?`<p class="muted">ほか ${count-cats.length} 人もおやすみしています</p>`:''}`:'<p class="muted">おやすみの報告は、これから。</p>':'<p class="muted">猫たちの様子を取得できませんでした。</p>'}<p class="summary-note">名前を出さず、選んだ毛色の猫で表示しています。</p></section><section class="card tonight-hours"><h2>おやすみが多い時間帯</h2>${summary?hours.length?`<div class="peak-hours">${hours.map(h=>`<p><strong>${String(h.hour).padStart(2,'0')}:00〜${String((h.hour+1)%24).padStart(2,'0')}:00</strong><span>${h.count} 人</span></p>`).join('')}</div><p class="summary-note">日本時間・一人につき最新のおやすみ報告</p>`:'<p class="muted">おやすみの報告が集まると表示されます。</p>':'<p class="muted">時間帯を取得できませんでした。</p>'}</section>${chart()}`;
}
// Use the DB's persisted latest report, even if its history row was deleted.
// Older servers retain the existing latest-post fallback during deployment.
function homeCatStatus(now=NightClock.now()) {
 if(CatCare.fresh(shared.catCare,now)&&shared.catCare.sleepStateVersion===1)return shared.catCare.catState||'';
 const post=state.posts[0]||shared.feed.find(p=>p.self);
 if(post&&SleepFlow.night(post.time)===SleepFlow.night(now))return isSleeping(post.status)?'sleep':'awake';
 const last=state.lastSleep;
 return !ready&&last&&SleepFlow.sleepNight(last)===SleepFlow.night(now)?'sleep':'';
}
function dayHero() { const key=DayRoom.homeKey(),room=DayRoom.snapshot(shared.userId),status=homeCatStatus();return `<section class="profile-room-unit home-room-unit own-cat-room" data-room-user="${shared.userId||''}"><section class="day-hero day-room-hero" data-day-bucket="${key}"${CatCare.morningBeg(shared.catCare,shared.userId)}>${DayRoom.stage(state.coat,shared.userId,{status,home:true},true)}<h2>${DayRoom.homeLabel(room,status)}</h2><p>${DayRoom.world().daylight?'また今夜 🌙':'ゆっくり、ひとやすみ 🌙'}</p><span class="cat-tap-hint">猫をタップで、ごはんのようすへ ›</span></section></section>`; }
function catMeal() {
 const room=DayRoom.stage(state.coat,shared.userId,{status:CatCare.sleeping(shared.catCare)?'sleep':homeCatStatus(),home:true});
 const care=shared.profileComplete?DayRoom.care(shared.catCare,state.coat,shared.userId,true):'<p class="quiet-note">名前と猫の種類を設定すると、ごはんをあげられます。</p><button class="text-button" data-view="profile">プロフィールを設定する</button>';
 return `${header('猫のごはん',true)}<section class="profile-room-unit own-cat-room cat-meal-room" data-room-user="${shared.userId||''}">${room}${care||'<p class="quiet-note">ごはんの記録を取得できませんでした。</p><button class="text-button" data-care-retry>もう一度確認する</button>'}</section>`;
}
let publicProfilePerson,publicProfileViewer,catTreatTarget,catTreatOrigin='timeline';
function catTreat() {
 const person=catTreatTarget?.viewer===shared.userId?catTreatTarget.person:null;
 if(!person||person.userId===shared.userId)return `${header('猫のおやつ',true)}<p class="quiet-note">タイムラインから、贈る猫を選んでください。</p><button class="text-button" data-view="timeline">タイムラインへ</button>`;
 const current=allPosts().find(post=>post.userId===person.userId&&post.appearanceReady!==false)||person;
 const room=DayRoom.stage(current.coat,current.userId,{status:current.status});
 const care=shared.profileComplete?DayRoom.care(shared.catCare,current.coat,current.userId,false):'<p class="quiet-note">名前と猫の種類を設定すると、おやつを贈れます。</p><button class="text-button" data-view="profile">プロフィールを設定する</button>';
 return `${header('猫のおやつ',true,'data-treat-back aria-label="プロフィールに戻る"')}<p class="treat-recipient">${escapeHTML(current.name)}さんの猫へ · ${escapeHTML(CatFaces.coatLabel(current.coat))}</p><section class="profile-room-unit cat-treat-room" data-room-user="${current.userId}">${room}${care||'<p class="quiet-note">おやつの記録を取得できませんでした。</p><button class="text-button" data-care-retry>もう一度確認する</button>'}</section>`;
}
function roleTag(role) { const label=CatRoles.label(role);return label?`<span class="cat-role-tag">${escapeHTML(label)}</span>`:''; }
function homeNote() { return `<section class="card home-note"><button class="profile-note-button" data-note-editor aria-label="自分のそっとひとことを編集"><span>そっとひとこと <small>編集 ›</small></span><span class="profile-note-text${state.profileNote?'':' is-empty'}">${escapeHTML(state.profileNote)||'タップして、ひとこと'}</span></button></section>`; }
function roleSetting() { return `<button class="setting-row role-setting" data-role-picker><span>職業 <small>任意</small></span><span class="setting-value">${CatRoles.label(state.catRole)||(state.catRole==='private'?'表示なし':'未設定')} ›</span></button>`; }
function home() { return `<div class="home-heading">${header()}${darkHint()}</div>${dayHero()}${FirstUseGuide.slot('home')}${countCard()}${homeNote()}${actions()}<section><div class="section-heading"><h2>みんなの様子</h2><small><span class="live-dot"></span>今夜のタイムライン</small></div><div class="mini-feed">${allPosts().slice(0,5).map(p=>`<div class="mini-row">${avatar(p)}<span class="mini-name">${escapeHTML(p.name)}</span><span class="mini-status ${isSleeping(p.status)?'sleeping':''}">${statusText(p.status,p.intent)}</span><time datetime="${new Date(p.time).toISOString()}">${timeLabel(p.time)}</time></div>`).join('')}</div></section><p class="quiet-note">眠れない夜も、ここではひとりじゃない。</p>`; }
function reactionButtons(post) {
 const counts = PostReactions.counts(shared.reactionCounts[post.id]);
 const old = shared.reactionVersion === 3 ? PostReactions.legacy.filter(option => counts[option.id] || state.reactions[post.id] === option.id) : [];
 return `<div class="reaction-options" role="group" aria-label="${escapeHTML(post.name)}へのリアクション">${reactionOptions(post).map(option => {
  const selected = state.reactions[post.id] === option.id;
  const count = shared.reactionCounts[post.id]?.[option.id] ?? 0;
  return `<button class="reaction ${selected?'selected':''}" data-react="${post.id}" data-reaction="${option.id}" aria-pressed="${selected}" aria-label="${escapeHTML(post.name)}に${option.text}のリアクション"><span class="reaction-label">${option.text}</span><span class="reaction-count">${count}</span></button>`;
 }).join('')}</div>${old.length ? `<details class="legacy-reactions"><summary>以前のリアクション（${old.reduce((sum,option)=>sum+counts[option.id],0)}個）</summary>${old.map(option=>`<p>${option.text} ${counts[option.id]}個${state.reactions[post.id] === option.id ? ` <button class="text-button" data-react="${post.id}" data-reaction="${option.id}" aria-label="${option.text}を取り消す">取り消す</button>` : ''}</p>`).join('')}</details>` : ''}`;
}
function timeline() {
 const posts = TimelineVisibility.visible(allPosts(),NightClock.now()).filter(post => filter==='all' || (filter==='sleep' ? isSleeping(post.status) : post.status==='awake'));
 return `${header()}<div class="tabs" aria-label="投稿の絞り込み">${[['all','みんな'],['awake','まだ起きてる'],['sleep','もう寝た']].map(([key,label])=>`<button data-filter="${key}" class="${filter===key?'active':''}" aria-pressed="${filter===key}">${label}</button>`).join('')}</div><div class="timeline-feed" aria-busy="${!ready}">${posts.length?posts.map(p=>`<article class="post">${postCatIcon(p)}<div class="post-body"><div class="post-top"><h2 class="post-name"><span class="post-nickname">${escapeHTML(p.name)}</span>${roleTag(p.catRole)}${p.self?'<span class="self-tag">あなた</span>':''}</h2>${p.self?`<button class="text-button" data-delete="${p.id}" aria-label="自分の投稿を削除">削除</button>`:''}</div><p class="post-text ${p.status==='awake'?'awake-text':''}">${statusText(p.status,p.intent)}</p>${p.profileNote?`<p class="timeline-profile-note">${escapeHTML(p.profileNote)}</p>`:''}<div class="post-bottom"><time datetime="${new Date(p.time).toISOString()}">${timeLabel(p.time)}</time></div>${reactionButtons(p)}</div></article>`).join(''):`<p class="empty"${ready?'':' role="status"'}>${ready?'まだ投稿がありません。<br>ホームから今の気持ちを伝えてみましょう。':'みんなの様子を読み込んでいます…'}</p>`}</div>`;
}
function sleep() { return `<section class="sleep-screen"><div class="sleep-art" aria-hidden="true"><span class="big-moon">☾</span><span class="star one">✦</span><span class="star two">✦</span><span class="star three">✦</span><span class="sleep-cat">${CatScenes.svg('sleeping',state.coat)}</span></div><h1>おやすみなさい<br>${escapeHTML(state.name)}さん 🌙</h1><div class="card">今夜は <strong>${state.lastSleep?.count ?? '—'}</strong> 人と一緒に<br>おやすみしました。</div><div data-sent-kindness>${sentKindness()}</div><p class="rest-message">今日もお疲れさまでした。<br>ゆっくり休んでくださいね。</p><button class="cream-button" data-finish-sleep>また明日 🌙</button><p class="quiet-note">これで今日のSNSは終了です。<br>スマホを置いて、ゆっくり休みましょう。</p><button class="text-button" data-view="home">ホームに戻る</button><p class="sample-tag">おやすみした時点の報告人数です</p></section>`; }
function rest() { const elapsed=CatScenes.elapsed(state.lastSleep?.finishedAt,NightClock.now()),settled=elapsed>=CatScenes.settleDurationMs;return `<section class="rest-screen" data-phase="${settled?'settled':'intro'}" style="--rest-duration:${CatScenes.settleDurationMs}ms;--rest-elapsed:-${elapsed}ms"><div class="rest-content"><div class="rest-cat" aria-hidden="true">${CatScenes.svg('sleeping',state.coat)}</div>${settled?'<h1>おやすみなさい 🌙</h1>':'<div class="rest-intro"><h1>また明日 🌙</h1><p class="rest-message">今日もおつかれさまでした<br>スマホを置いて、ゆっくり休もう</p></div>'}<div data-sent-kindness>${sentKindness()}</div><button class="cream-button" data-view="home">ホームに戻る</button></div></section>`; }
function morningReceipts() {
 const morningNight=SleepFlow.previousNight(NightClock.now());
 if(SleepFlow.night(NightClock.now())===morningNight)return '';
 const receipt=shared.morningReactions;
 const valid=receipt&&receipt.nightDate===morningNight&&receipt.nightDate===SleepFlow.sleepNight(state.lastSleep);
 const counts=valid?PostReactions.counts(receipt.counts || receipt):null;
 const total=valid?PostReactions.total(counts):null;
 if(total===0)return '';
 return `<section class="card morning-receipts">${valid?`<details data-receipt-night="${receipt.nightDate}"><summary id="morning-receipt-summary">昨日の投稿に、${total}個のやさしい気持ちが届いたよ 🐾</summary><div class="morning-reaction-grid">${PostReactions.all.filter(option=>counts[option.id]>0).map(option=>`<div><span>${option.text}</span><strong>${counts[option.id]}<small> 個</small></strong></div>`).join('')}</div></details>`:'<p class="muted">届いた言葉を取得できませんでした。</p>'}</section>`;
}
function morning() { const recorded=state.morningDays.includes(dayKey());return `<section class="morning"><div class="sunrise" aria-hidden="true"><span class="morning-cat">${CatScenes.svg('awake',state.coat)}</span></div><h1>おはようございます<br>${escapeHTML(state.name)}さん ☀️</h1><div class="card">昨夜は <strong>${state.lastSleep?.count ?? '—'}</strong> 人と一緒に<br>おやすみしました。</div>${morningReceipts()}<p>よく眠れましたか？<br>今日も良い一日になりますように！</p><button class="cream-button" data-morning ${recorded?'disabled':''}>${recorded?'おはようを記録しました ✓':'おはよう ☀️ を記録する'}</button><p class="muted">また今夜、ここで会いましょう。</p><p class="sample-tag">おやすみした時点の報告人数です</p></section>`; }
function catCoatSetting() { return `<section class="settings-section card cat-coat-setting"><h2>猫の種類</h2><button class="setting-row" data-coat-picker ${CatCoatCooldown.available(shared.catCoatStatus,NightClock.now())?'': 'disabled'}><span>${shared.needsCat?'猫の種類を選ぶ':CatFaces.coatLabel(state.coat)}</span><span>›</span></button><p class="quiet-note cat-coat-availability">${CatCoatCooldown.message(shared.catCoatStatus,NightClock.now())}</p></section>`; }
function renderCatPicker(){
 const expression=PostCatExpressions.forPost(ownIconPost());
 const choices=options=>options.map(option=>`<button type="button" class="expression-choice ${(!shared.needsCat&&state.coat===option.id)?'selected':''}" data-coat="${option.id}" aria-pressed="${!shared.needsCat&&state.coat===option.id}"><span class="avatar peach">${PostCatExpressions.svg(expression,option.id)}</span><span>${option.label}</span></button>`).join('');
 CatImages.render(document.querySelector('#expression-options'),CatFaces.groups.map(group=>`<h3 class="cat-group-title">${group.label}</h3>${choices(group.coats)}`).join(''),{resolved:ready});
 syncBusy();
}
function profile() { return `${header()}<section class="profile-page">${shared.profileComplete?'':'<section class="settings-section"><h2>投稿前にプロフィールを設定</h2><button class="setting-row" data-name>ニックネームを設定 ›</button><button class="setting-row" data-coat-picker>猫の種類を選ぶ ›</button></section>'}<div class="profile-banner">${staticCatIcon(shared.needsCat?'<span class="avatar peach" aria-hidden="true">🐾</span>':ownIcon(),'profile-cat-button',state.name||'自分')}<div><h1>${escapeHTML(state.name)||'ニックネーム未設定'}</h1>${roleTag(state.catRole)}<button class="profile-note-button" data-note-editor><span>そっとひとこと <small>編集 ›</small></span><span class="profile-note-text${state.profileNote ? '' : ' is-empty'}">${escapeHTML(state.profileNote)||'未入力'}</span></button></div></div>${catCoatSetting()}${roleSetting()}<div class="stats-grid profile-stats"><div class="stat">おやすみを伝えた回数<strong>${shared.ownSleepCount ?? '—'}<small> 回</small></strong></div><div class="stat">おはようした日数<strong>${state.morningDays.length}<small> 日</small></strong></div></div><details class="profile-history" data-history-user="${escapeHTML(shared.userId||'')}"><summary id="profile-history-summary">🐾 最近の記録を見る ＞</summary>${state.posts.length?state.posts.slice(0,12).map(p=>`<div class="history-row"><span>${new Date(p.time).toLocaleDateString('ja-JP',{month:'numeric',day:'numeric'})}</span><span class="history-status">${statusText(p.status,p.intent)}</span><time>${timeLabel(p.time)}</time></div>`).join(''):'<div class="card empty">まだ記録はありません。<br>今夜の「おやすみ」から始めましょう。</div>'}<p class="quiet-note">投稿の記録は、匿名アカウントに保存されます。</p></details></section>`; }
function settings() { return `${header('設定',true)}<section class="settings-section"><h2>プロフィール</h2><button class="setting-row" data-name><span>ニックネーム</span><span class="setting-value">${escapeHTML(state.name)} ›</span></button><button class="setting-row" data-coat-picker ${CatCoatCooldown.available(shared.catCoatStatus,NightClock.now())?'': 'disabled'} aria-label="猫の毛色を選ぶ"><span>猫の種類（毛色）</span><span class="expression-setting"><span class="avatar peach">${PostCatExpressions.svg(PostCatExpressions.forPost(ownIconPost()),state.coat)}</span><span class="setting-value">${shared.needsCat?'未設定':CatFaces.coatLabel(state.coat)} ›</span></span></button>${roleSetting()}</section><section class="settings-section"><h2>表示設定</h2><label class="setting-row"><span>ダークモード</span><input class="switch" type="checkbox" id="dark-switch" ${!state.light?'checked':''}></label><label class="setting-row"><span>空の地域</span><select class="solar-region-select" id="sky-region" aria-label="空の地域">${SolarModel.regions.map(region=>`<option value="${region.id}" ${region.id===SolarModel.region().id?'selected':''}>${region.label}</option>`).join('')}</select></label><div class="setting-row"><span>言語</span><span class="setting-value">日本語</span></div></section><section class="settings-section"><h2>使い方</h2>${FirstUseGuide.slot('settings')}</section><section class="settings-section"><h2>この初期版について</h2><div class="card settings-info">投稿・リアクション・今夜の人数は、みんなで共有しています。朝の記録と表示設定は、この端末に保存されます。人数の推移は、今夜の投稿をもとに集計しています。<br><br><strong>データ削除・機種変更の前に</strong><br>ログイン情報は、このブラウザに保存されます。ブラウザのデータ削除や別のブラウザ・端末への変更でログイン情報を失うと、同じ匿名アカウントには戻れません。現在、復元・引き継ぎ機能はありません。<br><br>朝の記録もブラウザのデータ削除で失われます。Supabaseに残る投稿などは削除されません。詳しくは下のプライバシーポリシーをご覧ください。<br><br>通知は今後の対応予定です。</div></section><section class="settings-section safety-links"><h2>安心して使うために</h2><button class="setting-row" data-safety="privacy">プライバシーポリシー ›</button><button class="setting-row" data-safety="rules">利用規約・安全ルール ›</button></section><button class="text-button share-place-button" data-share-place>この場所を教える 🌙</button>`; }
function preloadCats(next) {
 if(!catsResolved()||(shared.needsCat&&next!=='timeline'&&next!=='stats'))return;
 let markup='';
 if(next==='profile'||next==='settings')markup=PostCatExpressions.svg(PostCatExpressions.forPost(ownIconPost()),state.coat);
 else if(next==='sleep'||next==='rest')markup=CatScenes.svg('sleeping',state.coat);
 else if(next==='morning')markup=CatScenes.svg('awake',state.coat);
 else if(next==='home'||next==='catMeal')markup=DayRoom.image(state.coat,shared.userId,{status:homeCatStatus(),home:true});
 else if(next==='timeline')markup=TimelineVisibility.visible(allPosts(),NightClock.now()).filter(p=>p.appearanceReady!==false&&(filter==='all'||(filter==='sleep'?isSleeping(p.status):p.status==='awake'))).slice(0,4).map(p=>PostCatExpressions.svg(PostCatExpressions.forPost(p),p.coat)).join('');
 else if(next==='stats')markup=(shared.tonightSummary?.coats||[]).slice(0,4).map(p=>CatScenes.svg('sleeping',p.coat)).join('');
 CatImages.preload(markup,['home','catMeal'].includes(next)?{priority:'high',max:1}:{});
}
let renderedTimeline;
function render() { if(view!=='timeline')clearReactionEffect();clearTimeout(restTimer);document.body.classList.toggle('resting',view==='rest');document.body.classList.toggle('light-mode',state.light&&view!=='morning');renderedTimeline=view==='timeline'?timeline():undefined;CatImages.render(app,renderedTimeline??({home,catMeal,catTreat,timeline,sleep,rest,morning,profile,settings,stats}[view]||home)(),{resolved:ready,confirmed:[previewFresh(ownCatPreview)?'.own-cat-room .room-resident':'',previewFresh(timelinePreview)?'.post .avatar[data-cat-appearance-ready=true]':''].filter(Boolean).join(',')});navigation();syncBusy();syncCatVisibility();syncRoofSky();scheduleTimelineExpiry();if(view==='home'){preloadCats('profile');preloadCats('sleep');}if(view==='sleep'||view==='rest')preloadCats('morning');if(view==='sleep'){sleepShownAt??=NightClock.now();const pendingSleep=state.lastSleep;const remaining=Math.max(0,CatScenes.settleDurationMs-(NightClock.now()-sleepShownAt));restTimer=setTimeout(()=>{if(view==='sleep'&&state.lastSleep===pendingSleep)finishSleep(sleepShownAt);},remaining);}if(view==='rest'){const remaining=CatScenes.settleDurationMs-CatScenes.elapsed(state.lastSleep?.finishedAt,NightClock.now());if(remaining>0)restTimer=setTimeout(()=>{if(view==='rest')renderPreservingPosition();},remaining+20);} }
function go(next) { preloadCats(next);if(next==='sleep'&&view!=='sleep')sleepShownAt=NightClock.now();if(next!=='sleep')sleepShownAt=undefined;view=next;render();window.scrollTo(0,0);void refreshSentReactionPeople(); }
function preloadCatDestination(event) {
 const button=event.target.closest('button');if(!button)return;
 if(button.dataset.view)preloadCats(button.dataset.view);
 else if(button.dataset.post)preloadCats(isSleeping(button.dataset.post)?'sleep':'timeline');
 else if(button.dataset.publicProfile){const person=allPosts().find(p=>p.id===button.dataset.publicProfile);if(person&&person.appearanceReady!==false)CatImages.preload(DayRoom.stage(person.coat,person.userId,{status:person.status}));}
}
document.addEventListener('pointerdown',preloadCatDestination,{passive:true});
document.addEventListener('focusin',preloadCatDestination);
function syncBusy() {
 if(!catsResolved())document.querySelectorAll('[data-cat-meal],[data-cat-treat]').forEach(button=>{button.disabled=true;});
 document.querySelectorAll('[data-coat-picker]').forEach(button=>{button.disabled=busy||!CatCoatCooldown.available(shared.catCoatStatus,NightClock.now());});
 app.setAttribute('aria-busy',String(busy));
 document.querySelectorAll('[data-post],[data-react],[data-delete],[data-coat],#role-form button[type=submit],[data-note-editor],#delete-note,#note-form button[type=submit],#nickname-form button[type=submit]').forEach(button=>{button.disabled=busy||(!ready&&button.matches('[data-post],[data-react],[data-delete]'))||(button.hasAttribute('data-coat')&&!CatCoatCooldown.available(shared.catCoatStatus,NightClock.now()));});
}
let careRenderTimer;
function renderPreservingPosition(allowDialog=false) {
 if(!allowDialog&&document.querySelector('dialog[open]'))return;
 // A completed, unchanged feed needs neither node replacement nor scroll restoration.
 if(view==='timeline'&&ready&&!catStatePending&&renderedTimeline===timeline()){syncBusy();syncCatVisibility();scheduleTimelineExpiry();return;}
 clearTimeout(careRenderTimer);
 // Let a homecoming finish before an automatic refresh replaces its scene.
 if(!allowDialog&&view==='home'){
  DayRoom.sync();
  if([...app.querySelectorAll('.day-room')].some(stage=>!DayRoom.settled(stage))){
   careRenderTimer=setTimeout(()=>{if(view==='home')renderPreservingPosition();},120);return;
  }
 }
 // Detaching even the same node restarts CSS animations in WebKit. Defer only
 // automatic full renders; explicit navigation still renders immediately.
 if([...app.querySelectorAll('.care-scene')].some(scene=>CatCare.isPlaying(scene))){
  const currentView=view;careRenderTimer=setTimeout(()=>{if(view===currentView)renderPreservingPosition(allowDialog);},CatCare.durationMs+100);return;
 }
 const x=window.scrollX,y=window.scrollY,focused=document.activeElement;
 const openReceipt=app.querySelector('.morning-receipts details[open]')?.dataset.receiptNight;
 const openHistory=app.querySelector('.profile-history[open]')?.dataset.historyUser;
 const attributes=['data-view','data-filter','data-react','data-reaction','data-delete','data-post'];
 const selector=focused?.id?`#${CSS.escape(focused.id)}`:attributes.filter(key=>focused?.hasAttribute(key)).map(key=>`[${key}="${CSS.escape(focused.getAttribute(key))}"]`).join('');
 render();
 const receiptDetails=app.querySelector('.morning-receipts details');
 if(openReceipt&&receiptDetails?.dataset.receiptNight===openReceipt)receiptDetails.open=true;
 const historyDetails=app.querySelector('.profile-history');
 if(openHistory&&historyDetails?.dataset.historyUser===openHistory)historyDetails.open=true;
 if(window.scrollX!==x||window.scrollY!==y)window.scrollTo(x,y);
 if(selector)document.querySelector(selector)?.focus({preventScroll:true});
}
let nightBoundaryTimer;
let timelineExpiryTimer;
function scheduleTimelineExpiry() {
 clearTimeout(timelineExpiryTimer);
 if(!['timeline','home'].includes(view)||document.hidden)return;
 const posts=view==='home' ? shared.activeAwakePosts || [] : allPosts();
 const now=NightClock.now();let end=TimelineVisibility.nextExpiry(posts,now);
 if(view==='home') {
  const day=SleepFlow.day(now);
  const copyBoundary=[Date.parse(`${day}T06:00:00+09:00`),Date.parse(`${day}T18:00:00+09:00`),Date.parse(`${day}T06:00:00+09:00`)+86400000].find(at=>at>now);
  end=end===null?copyBoundary:Math.min(end,copyBoundary);
  const catBoundary=(Math.floor(now/(15*60000))+1)*15*60000;
  end=Math.min(end,catBoundary);
 }
 if(end!==null)timelineExpiryTimer=setTimeout(()=>{if(['timeline','home'].includes(view))renderPreservingPosition(true);},Math.min(2147483647,Math.max(0,end-now)+5));
}
function syncSleepView() {
 if(view!=='rest'&&view!=='sleep')return;
 const next=SleepFlow.openView(state.lastSleep,state.morningDays,NightClock.now());
 if(next==='morning'||SleepFlow.expired(state.lastSleep,NightClock.now())||(SleepFlow.endAt(state.lastSleep)===null&&SleepFlow.sleepNight(state.lastSleep)!==NightClock.night()))go(next);
 scheduleNightBoundary();
}
function checkNightBoundary() {
 syncSleepView();
 if(!shared.clock||shared.nightDate===NightClock.night())return;
 stateRevision++;
 ownCatPreview=timelinePreview=undefined;syncCatVisibility();
 shared={...shared,nightDate:NightClock.night(),feed:[],awakeCount:null,activeAwakePosts:null,sleepingCount:null,trend:[],tonightSummary:null,reactionCounts:{}};
 clearReactionEffect();
 if(SleepFlow.morningDue(state.lastSleep,state.morningDays,NightClock.now())&&(view==='rest'||view==='sleep'))go('morning');
 else if(document.querySelector('dialog[open]'))render();else renderPreservingPosition();
 if(!document.hidden)void refreshShared().catch(()=>{if(view!=='rest')toast('新しい夜のデータを取得できませんでした。');});
}
function scheduleNightBoundary() {
 clearTimeout(nightBoundaryTimer);
 const remaining=NightClock.remaining();
 const end=(view==='rest'||view==='sleep')?SleepFlow.endAt(state.lastSleep):null;
 const sleepRemaining=end!==null&&end>NightClock.now()?end-NightClock.now():null;
 const boundaries=[remaining,sleepRemaining].filter(value=>value!==null&&value>0);
 if(boundaries.length)nightBoundaryTimer=setTimeout(checkNightBoundary,Math.min(2147483647,Math.min(...boundaries)+5));
}
async function refreshShared() {
 if((busy||CatCare.pending)&&ready){refreshQueued=true;return;}
 if(refreshPromise)return refreshPromise;
 const revision=stateRevision,catRevision=catStateRevision;
 const accepts=payload=>revision===stateRevision&&catRevision===catStateRevision&&!busy&&!CatCare.pending&&!document.hidden&&payload.clock&&payload.clock.serverNow+performance.now()-payload.clock.monotonicAt<payload.clock.resetAt;
 refreshPromise=(async()=>{
  const snapshot=await OyasumiAPI.snapshot(0,{
   onIdentityChanged:()=>{if(revision===stateRevision&&catRevision===catStateRevision)invalidateCatState();},
   onOwnCat:own=>{
    if(!accepts(own)||!CatFaces.coats.some(c=>c.id===own.coat)||CatFaces.normalize(own.expression)!==own.expression||!CatCare.fresh(own.catCare,own.clock.serverNow+performance.now()-own.clock.monotonicAt)||!own.catCare.mealEligible)return;
    const appearanceChanged=state.coat!==own.coat||state.expression!==own.expression;
    const ownChanged=!catsResolved()||appearanceChanged||shared.userId!==own.userId||homeCatStatus()!==(own.catCare.catState||'');
    ownCatPreview={revision,catRevision,appearanceChanged,clock:own.clock,catCare:own.catCare};
    NightClock.sync(own.clock);state.coat=own.coat;state.expression=own.expression;state.name=own.name||state.name;
    shared={...shared,userId:own.userId,clock:own.clock,nightDate:shared.nightDate||own.clock.nightDate,catCare:own.catCare,needsCat:false,needsNickname:!own.name,profileComplete:!!own.name};
    if(view==='home'||view==='catMeal')CatImages.preload(DayRoom.image(state.coat,shared.userId,{status:homeCatStatus(),home:true}),{priority:'high',max:1});
    scheduleNightBoundary();
    if(ownChanged&&(view==='home'||view==='catMeal'))renderPreservingPosition(true);syncCatVisibility();
   }
   // Keep the mounted feed until the complete snapshot has names, notes,
   // roles and reactions. Cat-only progress must not publish provisional posts.
  });
  // A read started before a write/boundary must not overwrite the confirmed local result.
  if(revision!==stateRevision||catRevision!==catStateRevision||((busy||CatCare.pending)&&ready)||snapshot.clock&&snapshot.clock.serverNow+performance.now()-snapshot.clock.monotonicAt>=snapshot.clock.resetAt){refreshQueued=true;return;}
  const appearanceChanged=!ready||ownCatPreview?.appearanceChanged||state.coat!==CatFaces.normalizeCoat(snapshot.coat)||state.expression!==CatFaces.normalize(snapshot.expression);
  if(shared.userId!==snapshot.userId)CatCare.clearFeedback();NightClock.sync(snapshot.clock);shared=snapshot;state.name=snapshot.name;state.expression=CatFaces.normalize(snapshot.expression);state.coat=CatFaces.normalizeCoat(snapshot.coat);state.catRole=snapshot.catRole;state.profileNote=snapshot.profileNote;state.posts=snapshot.ownPosts;state.reactions=snapshot.reactions;
  if(state.lastSleep?.count===null&&state.lastSleep.postId&&snapshot.nightDate===state.lastSleep.nightDate&&snapshot.feed.some(post=>post.id===state.lastSleep.postId&&isSleeping(post.status)))state.lastSleep.count=snapshot.sleepingCount;
  syncSleepView();
  if(!ready&&['home','rest','morning'].includes(view))view=SleepFlow.openView(state.lastSleep,state.morningDays,NightClock.now());
  scheduleNightBoundary();
  const confirming=catStatePending;
  ownCatPreview=timelinePreview=undefined;
  ready=true;catStatePending=document.hidden;save();syncPublicProfile();if(view==='home')preloadCats('home');renderPreservingPosition(confirming);
  const picker=document.querySelector('#expression-dialog[open]');if(picker&&appearanceChanged)renderCatPicker();
  syncCatVisibility();void refreshSentReactionPeople();
  if(document.querySelector('dialog[open]'))refreshCareCards();
  scheduleCareDay();
 })();
 try{await refreshPromise;}catch(error){if(error.code==='CAT_AUTH_CHANGED')invalidateCatState();throw error;}finally{refreshPromise=undefined;startQueuedRefresh();}
}
async function ensureConnection() {
 if(!connectionPromise)connectionPromise=(async()=>{
  const userId=await OyasumiAPI.initialize();
  if(state.lastSleep?.userId&&state.lastSleep.userId!==userId){state.lastSleep=null;if(view==='rest'||view==='morning')go('home');}
  await refreshShared();
 })().catch(error=>{connectionPromise=undefined;throw error;});
 return connectionPromise;
}
async function mutation(work) {
 if(busy)return;
 busy=true;syncBusy();
 try{await ensureConnection();stateRevision++;checkNightBoundary();await work();}
 catch(error){clearReactionEffect();toast(error.code==='22023'?'少し待って、もう一度お試しください。':'通信できません。接続をご確認ください。');}
 finally{busy=false;syncBusy();startQueuedRefresh();}
}
function finishSleep(startedAt=NightClock.now()) { if(state.lastSleep){state.lastSleep.finished=true;state.lastSleep.coat=state.coat;state.lastSleep.finishedAt=new Date(startedAt).toISOString();save();}clearTimeout(toastTimer);document.querySelector('#toast').classList.remove('visible');go('rest');syncSleepView(); }
function startQueuedRefresh() {
 if(!refreshQueued||busy||CatCare.pending||refreshPromise)return;
 const saved=refreshSaved;refreshQueued=false;refreshSaved=false;
 void refreshShared().catch(()=>toast(saved?'保存済み。表示は後で更新します。':'最新の投稿を取得できませんでした。'));
}
function refreshAfterSave(saved=true) {
 refreshQueued=true;refreshSaved=refreshSaved||saved;startQueuedRefresh();
}
document.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;
 if(button.hasAttribute('data-care-retry')){void refreshShared().catch(()=>toast('記録を取得できませんでした。通信をご確認ください。'));return;}
 if(button.hasAttribute('data-share-place')){void sharePlace();return;}
 if(button.hasAttribute('data-copy-place')){void copyPlaceURL();return;}
 if(button.hasAttribute('data-close-share')){document.querySelector('#share-dialog').close();return;}
 if(button.hasAttribute('data-finish-sleep')){finishSleep();return;}
 if(button.dataset.view){go(button.dataset.view);if(button.dataset.view==='timeline')refreshAfterSave(false);return;}
 if(button.dataset.post){const status=button.dataset.post;if(!POST_OPTIONS.some(option=>option.id===status))return;void mutation(async()=>{
  if(!shared.profileComplete){go('profile');toast('名前と猫の種類を設定してください');return;}
  const row=await OyasumiAPI.submitPost(status,button.dataset.homeChoice);
  checkNightBoundary();
  const post={id:row.id,userId:row.user_id,status:row.choice,intent:row.post_intent,time:Date.parse(row.created_at),nightDate:row.night_date,order:row.event_order,name:state.name,expression:state.expression,coat:state.coat,catRole:state.catRole,profileNote:state.profileNote,self:true,color:'peach'};
  state.posts=[post,...state.posts.filter(p=>p.id!==post.id)];if(row.night_date===NightClock.night())shared.feed=[post,...shared.feed.filter(p=>p.userId!==post.userId)];
  // The confirmed submit RPC and its trigger have already saved this state.
  if(CatCare.fresh(shared.catCare)&&shared.catCare.sleepStateVersion===1&&SleepFlow.night(post.time)===NightClock.night())shared.catCare={...shared.catCare,catState:isSleeping(post.status)?'sleep':'awake',mealSleeping:isSleeping(post.status)};
  if(isSleeping(status)){state.lastSleep={count:null,postId:row.id,nightDate:row.night_date,userId:row.user_id,at:row.created_at,coat:state.coat,finished:false};save();}
  else if(state.lastSleep?.finished){state.lastSleep.finished=false;save();}
  go(isSleeping(status)?'sleep':'timeline');syncSleepView();if(status==='awake')toast('今の気持ちを伝えました');refreshAfterSave();
 });return;}
 if(button.dataset.filter){filter=button.dataset.filter;render();return;}
 if(button.dataset.react){const id=button.dataset.react,choice=button.dataset.reaction,post=allPosts().find(post=>post.id===id);if(!post||!(reactionOptions(post).some(option=>option.id===choice)||(state.reactions[id]===choice&&PostReactions.legacy.some(option=>option.id===choice))))return;if(!busy)showReactionTap(button);void mutation(async()=>{
  const previous=state.reactions[id],next=previous===choice?null:choice;
  try{await OyasumiAPI.setReaction(id,next);}catch(error){clearReactionEffect();throw error;}
  checkNightBoundary();
  const counts=PostReactions.counts(shared.reactionCounts[id]);
  if(previous)counts[previous]=Math.max(0,(counts[previous]||0)-1);if(next)counts[next]=(counts[next]||0)+1;
  if(!allPosts().some(post=>post.id===id)){refreshAfterSave();return;}
  shared.reactionCounts[id]=counts;if(next)state.reactions[id]=next;else delete state.reactions[id];
  renderPreservingPosition();
  toast(next?'リアクションを保存しました':'リアクションを取り消しました');refreshAfterSave();
 });return;}
 if(button.dataset.delete){const id=button.dataset.delete;if(!state.posts.some(p=>p.id===id&&p.self))return;void mutation(async()=>{
  const deleted=await OyasumiAPI.deletePost(id);if(!deleted){toast('投稿はすでに削除されています。');refreshAfterSave();return;}
  state.posts=state.posts.filter(p=>p.id!==id);shared.feed=shared.feed.filter(p=>p.id!==id);delete state.reactions[id];
  renderPreservingPosition();refreshAfterSave();toast('投稿を削除しました');
 });return;}
 if(button.hasAttribute('data-morning')){if(state.morningDays.includes(dayKey()))return;state.morningDays.push(dayKey());save();button.textContent='おはようを記録しました ✓';button.disabled=true;toast('おはよう。今日も良い一日を ☀️');return;}
 if(button.hasAttribute('data-name')){document.querySelector('#nickname').value=OyasumiAPI.needsNickname?'':state.name;clearNicknameError();document.querySelector('#nickname-dialog').showModal();document.querySelector('#nickname').focus();}
 if(button.hasAttribute('data-coat-picker')){
  if(!CatCoatCooldown.available(shared.catCoatStatus,NightClock.now()))return;
  document.querySelector('#expression-dialog').dataset.kind='coat';renderCatPicker();
  document.querySelector('#expression-error').textContent='';document.querySelector('#expression-dialog').showModal();syncBusy();
 }
 if(button.dataset.coat){const coat=button.dataset.coat;if(!CatFaces.coats.some(option=>option.id===coat))return;void mutation(async()=>{
  if(!CatCoatCooldown.available(shared.catCoatStatus,NightClock.now()))return;
  try{await OyasumiAPI.setCatCoat(coat);}
  catch(error){if(error.code==='P0030'){refreshAfterSave(false);document.querySelector('#expression-dialog').close();toast('猫の種類は7日に1回変更できます。');return;}document.querySelector('#expression-error').textContent=['PGRST202','PGRST204','42703'].includes(error.code)?'猫の保存機能は準備中です。':'保存できませんでした。もう一度お試しください。';return;}
  shared.catCoatStatus=null;shared.needsCat=false;shared.profileComplete=!shared.needsNickname;
  state.coat=coat;shared.coat=coat;for(const post of [...state.posts,...shared.feed])if(post.self)post.coat=coat;
  document.querySelector('#expression-dialog').close();render();refreshAfterSave();toast('猫の毛色を保存しました');
 });return;}
});
document.addEventListener('change',event=>{if(event.target.id==='sky-region'){state.skyRegion=SolarModel.setRegion(event.target.value).id;save();render();}if(event.target.id==='dark-switch'){state.light=!event.target.checked;save();render();}});
document.querySelector('#cancel-name').addEventListener('click',()=>document.querySelector('#nickname-dialog').close());
document.querySelector('#cancel-expression').addEventListener('click',()=>document.querySelector('#expression-dialog').close());
const roomWhispers=Object.freeze({steady:'今日も、ひとつずつ。',guardian:'安心して、ほっとひと息。',caring:'あなたにも、やさしい時間を。',watchful:'ここでは、ゆっくりしてね。',mechanic:'考えごとも、少しおやすみ。',maker:'積み重ねた日々に、ひと息。',welcoming:'いらっしゃい。くつろいでね。',foodie:'あたたかいものと、ひと息。',courier:'荷物をおろして、のんびり。',foresight:'先のことは、あとで考えよう。',creative:'ひらめきも、のんびり待とう。',independent:'自分のペースで、ゆっくり。',learner:'今日の学びに、ひとやすみ。',homely:'いつもの場所で、ひと息。',resting:'何もしない時間も、大切に。',carefree:'気の向くままに、のんびり。'});
function roomTime(now=NightClock.now()) { const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:SleepFlow.rules.timeZone,hour:'2-digit',hourCycle:'h23'}).format(now));return hour>=6&&hour<12?'morning':hour>=12&&hour<18?'day':'night'; }
function profileRoomCat(coat,now=NightClock.now(),status) {
 status=PostCatExpressions.state({status});
 const period=roomTime(now);
 if(status==='awake'||status==='sleep'){const pose=status==='awake'?'awake':'sleeping';return {period,pose,html:CatScenes.svg(pose,coat)};}
 const day=period==='day'?DayCats.current(now):null;
 return {period,pose:day?.id||(period==='morning'?'awake':'sleeping'),html:day?DayCats.svg(day.id,coat):CatScenes.svg(period==='morning'?'awake':'sleeping',coat)};
}
function profileRoomMarkup(person) {
 const coat=CatFaces.normalizeCoat(person.coat),status=PostCatExpressions.state(person),cat=profileRoomCat(coat,NightClock.now(),status);
 const whisper=CatRoles.label(person.catRole)?roomWhispers[person.catRole]:'ここで、一緒にひとやすみ。';
 const self=person.userId===shared.userId,stage=self?'':DayRoom.stage(coat,person.userId,{status},{profileCare:true,self});
 const room=`<section class="cat-room${self?' own-profile-whisper':''}" data-room-user="${person.userId||''}" data-time="${cat.period}" data-pose="${cat.pose}" data-coat="${coat}" data-post-status="${status}" aria-label="${self?'猫のつぶやき':'猫の小さなおへや'}">${stage}<p class="room-whisper">${escapeHTML(whisper)}</p><p class="room-whisper-label">おへやの猫のつぶやき</p></section>`;
 return DayRoom.unit(room,'',person.userId);
}
function syncProfileRoom() {
 syncPublicProfile();
 CatCare.syncNormal();
 for(const room of document.querySelectorAll('.cat-room')){
  if(room.closest('[data-feeding=true]'))continue;
  const cat=profileRoomCat(room.dataset.coat,NightClock.now(),room.dataset.postStatus);
  room.dataset.time=cat.period;room.dataset.pose=cat.pose;
 }
 DayRoom.sync();
}
function syncPublicProfile(){
 const dialog=document.querySelector('#public-profile-dialog');if(!dialog?.open||!publicProfilePerson)return;
 if(publicProfileViewer!==shared.userId){dialog.close();publicProfilePerson=undefined;return;}
 const current=allPosts().find(post=>post.userId===publicProfilePerson.userId);
 if(!current){dialog.close();publicProfilePerson=undefined;return;}
 if(current.appearanceReady===false||JSON.stringify(current)===JSON.stringify(publicProfilePerson))return;
 if([...dialog.querySelectorAll('.care-scene')].some(scene=>CatCare.isPlaying(scene)))return;
 publicProfilePerson={...current};CatImages.render(document.querySelector('#public-profile-content'),publicProfileRoom(current));
}
function publicProfileRoom(person) {
 const self=isOwnCat(person),icon=self?staticCatIcon(avatar(person),'public-profile-care-icon',person.name):`<button class="public-profile-care-icon" data-profile-care="${person.userId}" aria-label="この猫のおやつを開く">${avatar(person)}</button>`;
 return `<div class="public-profile-identity">${icon}<div><h3>${escapeHTML(person.name)}</h3><p class="public-profile-coat">${escapeHTML(CatFaces.coatLabel(person.coat))}</p>${roleTag(person.catRole)}</div></div>${profileRoomMarkup(person)}${self?'':'<p class="profile-cat-hint">猫をタップで、この猫のおやつへ ›</p>'}<h4>そっとひとこと</h4><p class="public-profile-note">${escapeHTML(person.profileNote)||'未入力'}</p>`;
}
setInterval(()=>{if(!document.hidden)syncProfileRoom();},5000);
document.addEventListener('roomcareend',syncProfileRoom);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)syncProfileRoom();});
document.addEventListener('click',event=>{
 const care=event.target.closest('[data-profile-care]');
 if(care){
  const person=publicProfileViewer===shared.userId?publicProfilePerson:null;
  if(!person||person.userId!==care.dataset.profileCare||person.appearanceReady===false||isOwnCat(person))return;
  catTreatOrigin=view;catTreatTarget={person:{...person},viewer:shared.userId};
  document.querySelector('#public-profile-dialog').close();go('catTreat');return;
 }
 if(event.target.closest('[data-treat-back]')){
  const person=catTreatTarget?.viewer===shared.userId?catTreatTarget.person:null;
  go(catTreatOrigin);if(person){publicProfilePerson=person;publicProfileViewer=shared.userId;CatImages.render(document.querySelector('#public-profile-content'),publicProfileRoom(person));document.querySelector('#public-profile-dialog').showModal();syncRoofSky();}return;
 }
 const edit=event.target.closest('[data-note-editor]');
 if(edit&&!busy){
  document.querySelector('#profile-note').value=state.profileNote||'';
  document.querySelector('#note-error').textContent='';document.querySelector('#profile-note').removeAttribute('aria-invalid');
  document.querySelector('#delete-note').hidden=!state.profileNote;
  document.querySelector('#note-dialog').showModal();document.querySelector('#profile-note').focus();
 }
 const button=event.target.closest('[data-public-profile]');if(!button)return;
 const person=allPosts().find(post=>post.id===button.dataset.publicProfile);if(!person||person.appearanceReady===false||isOwnCat(person))return;
 publicProfilePerson=person;publicProfileViewer=shared.userId;
 CatImages.render(document.querySelector('#public-profile-content'),publicProfileRoom(person));
 document.querySelector('#public-profile-dialog').showModal();
 syncRoofSky();
});
document.querySelector('#close-public-profile').addEventListener('click',()=>document.querySelector('#public-profile-dialog').close());
document.querySelector('#public-profile-dialog').addEventListener('close',renderPreservingPosition);
document.querySelector('#cancel-note').addEventListener('click',()=>document.querySelector('#note-dialog').close());
document.querySelector('#delete-note').addEventListener('click',()=>{if(busy)return;document.querySelector('#profile-note').value='';document.querySelector('#note-form').requestSubmit();});
document.querySelector('#profile-note').addEventListener('input',()=>{document.querySelector('#note-error').textContent='';document.querySelector('#profile-note').removeAttribute('aria-invalid');});
document.querySelector('#note-form').addEventListener('submit',event=>{
 event.preventDefault();if(busy)return;
 const input=document.querySelector('#profile-note');
 const result=NicknameRules.validate(input.value,{max:40,optional:true,countText:value=>[...value].length});
 if(result.error){document.querySelector('#note-error').textContent=result.error;input.setAttribute('aria-invalid','true');input.focus();return;}
 void mutation(async()=>{
  let note;
  try{note=await OyasumiAPI.setProfileNote(result.name);}
  catch(error){document.querySelector('#note-error').textContent=error.code==='22023'?error.message:'保存できませんでした。もう一度お試しください。';input.setAttribute('aria-invalid','true');throw error;}
  state.profileNote=note;shared.profileNote=note;
  for(const post of [...state.posts,...shared.feed])if(post.userId===shared.userId)post.profileNote=note;
  document.querySelector('#note-dialog').close();render();refreshAfterSave();toast('ひとことを保存しました');
 });
});
const roleWheel=document.querySelector('#role-wheel');
let selectedRoleIndex=0;
function selectRole(index, move=false) {
 selectedRoleIndex=Math.max(0,Math.min(CatRoles.options.length-1,index));
 const option=CatRoles.options[selectedRoleIndex];
 roleWheel.querySelectorAll('[role=option]').forEach((row,i)=>row.setAttribute('aria-selected',String(i===selectedRoleIndex)));
 roleWheel.setAttribute('aria-activedescendant',`role-option-${selectedRoleIndex}`);
 document.querySelector('#role-preview').textContent=option.cat?`あなたは${option.cat}です 🐱`:'猫ラベルは表示しません';
 if(move)roleWheel.scrollTop=selectedRoleIndex*44;
}
document.addEventListener('click',event=>{
 if(!event.target.closest('[data-role-picker]'))return;
 if(busy)return;
 roleWheel.innerHTML=CatRoles.options.map((option,index)=>`<div id="role-option-${index}" role="option" aria-selected="false" data-role-index="${index}">${escapeHTML(option.text)}</div>`).join('');
 document.querySelector('#role-error').textContent='';document.querySelector('#role-dialog').showModal();
 selectRole(Math.max(0,CatRoles.options.findIndex(option=>option.id===state.catRole)),true);roleWheel.focus();
});
roleWheel.addEventListener('scroll',()=>selectRole(Math.round(roleWheel.scrollTop/44)),{passive:true});
roleWheel.addEventListener('click',event=>{const row=event.target.closest('[data-role-index]');if(row)selectRole(Number(row.dataset.roleIndex),true);});
roleWheel.addEventListener('keydown',event=>{
 const index={ArrowUp:selectedRoleIndex-1,ArrowDown:selectedRoleIndex+1,Home:0,End:CatRoles.options.length-1}[event.key];
 if(index!==undefined){event.preventDefault();selectRole(index,true);}
});
document.querySelector('#cancel-role').addEventListener('click',()=>document.querySelector('#role-dialog').close());
document.querySelector('#role-form').addEventListener('submit',event=>{
 event.preventDefault();if(busy)return;
 const option=CatRoles.options[Math.max(0,Math.min(CatRoles.options.length-1,Math.round(roleWheel.scrollTop/44)))];
 void mutation(async()=>{
  try{await OyasumiAPI.setCatRole(option.id);}catch(error){document.querySelector('#role-error').textContent='保存できませんでした。もう一度お試しください。';throw error;}
  state.catRole=option.id;shared.catRole=option.id;
  for(const post of [...shared.feed,...state.posts])if(post.userId===shared.userId)post.catRole=option.id;
  document.querySelector('#role-dialog').close();render();refreshAfterSave();
  toast(option.cat?`あなたは${option.cat}です 🐱`:'猫ラベルを表示しない設定で保存しました');
 });
});
function clearNicknameError() { document.querySelector('#nickname-error').textContent='';document.querySelector('#nickname').removeAttribute('aria-invalid'); }
document.querySelector('#nickname').addEventListener('input',clearNicknameError);
document.querySelector('#nickname-form').addEventListener('submit',event=>{
 event.preventDefault();
 const input=document.querySelector('#nickname');
 const result=NicknameRules.validate(input.value);
 if(result.error){document.querySelector('#nickname-error').textContent=result.error;input.setAttribute('aria-invalid','true');input.focus();return;}
 void mutation(async()=>{
  let name;
  try{name=await OyasumiAPI.setNickname(result.name);}
  catch(error){if(['22023','23514'].includes(error.code)){document.querySelector('#nickname-error').textContent=error.code==='23514'?'1〜12文字で入力してください。':error.message;input.setAttribute('aria-invalid','true');input.focus();return;}throw error;}
  state.name=name;shared.name=name;shared.needsNickname=false;shared.profileComplete=!shared.needsCat;for(const p of [...state.posts,...shared.feed])if(p.self)p.name=name;
  save();document.querySelector('#nickname-dialog').close();render();refreshAfterSave();toast('名前を保存しました');
 });
});
render();syncSleepView();
void ensureConnection().catch(()=>{if(view!=='rest')toast('共有データに接続できません。');});
function refreshDayScene() {
 if(!catsResolved())return;
 DayRoom.sync();syncRoofSolar();
 const card=document.querySelector('.roof-sky-card'),world=DayRoom.world();
 const cardChanged=SolarModel.sky(NightClock.now()).roofVisible?(!card||card.dataset.worldDay!==world.day):Boolean(card);
 if(view==='home'&&((document.querySelector('.day-hero')?.dataset.dayBucket||null)!==DayRoom.homeKey()||cardChanged))renderPreservingPosition();
}
setInterval(()=>{if(!document.hidden)syncSleepView();if(!document.hidden&&view==='timeline')renderPreservingPosition(true);if(view==='rest'&&catsResolved())return;if(!document.hidden)refreshDayScene();if(!document.hidden&&!busy)void ensureConnection().then(()=>refreshShared()).catch(()=>{});},30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkNightBoundary();if(!document.hidden&&catsResolved()&&['timeline','home'].includes(view))renderPreservingPosition(true);if(!document.hidden)refreshDayScene();if(!document.hidden&&!busy)void ensureConnection().then(()=>refreshShared()).catch(()=>{if(view!=='rest')toast('最新の投稿を取得できませんでした。');});});
window.addEventListener('online',()=>{if(view==='rest'&&catsResolved())return;if(!busy)void ensureConnection().then(()=>refreshShared()).catch(()=>{});});

window.addEventListener('scroll',positionReactionEffect,{passive:true});window.addEventListener('resize',positionReactionEffect);
if(globalThis.OyasumiUpdates)OyasumiUpdates.canReload=()=>!busy&&!CatCare.pending&&![...document.querySelectorAll('.care-scene')].some(scene=>CatCare.isPlaying(scene))&&view!=='sleep'&&view!=='rest'&&!document.querySelector('dialog[open]');

// Care saves use their own pending state; playback never blocks other controls.
function refreshCareCards() {
 const replaced=new Map();
 for(const section of document.querySelectorAll('.cat-care')){
  const self=section.dataset.careOwner==='self',coat=section.querySelector('.care-scene').dataset.careCoat;
  const template=document.createElement('template');template.innerHTML=CatCare.markup(shared.catCare,coat,section.dataset.careOwner,self,NightClock.now(),section.dataset.careCompact==='true');
  if(section.classList.contains('room-care-controls'))template.innerHTML=DayRoom.controls(template.innerHTML);
  const next=template.content.firstElementChild;if(next){
   const scene=section.querySelector('.care-scene');
   if(CatCare.isPlaying(scene)){
    // Update controls/history without removing the playing scene from the tree.
    for(const child of [...section.children])if(child!==scene)child.remove();
    let before=true;
    for(const child of [...next.children]){
     if(child.classList.contains('care-scene')){before=false;continue;}
     section.insertBefore(child,before?scene:null);
    }
    replaced.set(section,section);continue;
   }
   section.replaceWith(next);replaced.set(section,next);
  }else section.remove();
 }
 return replaced;
}

// New care allowances reset at 06:00 / 12:00; legacy servers retain midnight.
let careDayTimer;
function scheduleCareDay(){
 clearTimeout(careDayTimer);
 if(!CatCare.valid(shared.catCare))return;
 const now=NightClock.now(),next=CatCare.nextBoundary(shared.catCare,now);
 careDayTimer=setTimeout(refreshCareDay,Math.max(20,next-now+20));
}
async function refreshCareDay(){
 if(!CatCare.valid(shared.catCare))return;
 // Disable yesterday's controls immediately, including an open profile dialog.
 if(!CatCare.fresh(shared.catCare))refreshCareCards();
 const user=shared.userId,revision=stateRevision;
 try{
  const status=await OyasumiAPI.getCatCareStatus();
  if(user===shared.userId&&revision===stateRevision&&!CatCare.pending&&CatCare.valid(status)){
   shared.catCare=status;refreshCareCards();
  }
 }catch{ /* Keep stale controls disabled; retry without affecting other features. */ }
 clearTimeout(careDayTimer);
 if(CatCare.fresh(shared.catCare))scheduleCareDay();
 else careDayTimer=setTimeout(refreshCareDay,10000);
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&CatCare.valid(shared.catCare)&&!CatCare.fresh(shared.catCare))void refreshCareDay();});
document.addEventListener('click',async event=>{
 const button=event.target?.closest?.('[data-cat-meal],[data-cat-treat]');
 if(!button||button.disabled||!catsResolved())return;
 const section=button.closest('.cat-care'),self=button.hasAttribute('data-cat-meal'),user=shared.userId;
 const owner=section.dataset.careOwner;
 const feedback=(message,failed=false)=>{
  CatCare.setFeedback(owner,message,failed);
  for(const card of document.querySelectorAll('.cat-care'))if(card.dataset.careOwner===owner){const node=card.querySelector('.care-feedback');node.textContent=message;node.setAttribute('role',failed?'alert':'status');node.setAttribute('aria-live',failed?'assertive':'polite');}
 };
 if(self&&CatCare.sleeping(shared.catCare)){feedback('おやすみ中は、ごはんをあげられません。');refreshCareCards();return;}
 if(busy){feedback('ほかの操作を保存中です。完了してからもう一度押してください。');return;}
 if(!CatCare.lock('save')){feedback('記録しています。少しお待ちください。');return;}
 document.querySelectorAll('[data-cat-meal],[data-cat-treat]').forEach(b=>b.disabled=true);
 feedback('記録しています…');stateRevision++;
 let result,message,play=false,failed=false;
 try{
  result=await CatCare.deadline(()=>self?OyasumiAPI.giveCatMeal():OyasumiAPI.giveCatTreat(button.dataset.catTreat));
  if(!CatCare.confirmed(result,self,button.dataset.catTreat))throw Object.assign(new Error('Invalid care response'),{code:'CARE_RESPONSE'});
  if(shared.userId!==user)return;
  shared.catCare=result.status;
  play=result.accepted===true&&(!self||!CatCare.sleeping(result.status));
  message=result.accepted?(self?'ごはんをあげました。':'おやつをそっと贈りました。'):(self?'今日のごはんはあげています。':'今日のおやつは贈っています。');
 }catch(error){
  failed=true;message=CatCare.errorMessage(error);
  if(shared.userId===user)feedback(message,true);
  try{const status=await CatCare.deadline(()=>OyasumiAPI.getCatCareStatus(),5000);if(shared.userId===user&&CatCare.valid(status)){
   shared.catCare=status;
   if(self?status.mealDone:CatCare.given(status,button.dataset.catTreat))message+=' 今日の保存済み記録を確認しました。重ねて保存しません。';
  }}catch{message+=' 記録の再確認もできませんでした。通信回復後に再試行してください。';}
 }finally{
  stateRevision++;CatCare.unlock('save');
  if(shared.userId===user){
   feedback(message,failed);refreshCareCards();
   const next=[...document.querySelectorAll('.cat-care')].find(card=>card.dataset.careOwner===owner);
   if(next&&play)void CatCare.play(next.querySelector('.care-scene'));
  }
  startQueuedRefresh();
 }
});
