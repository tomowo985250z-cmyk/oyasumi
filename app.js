const STORAGE_KEY = 'oyasumi-v1';
const LOCAL_KEY = 'oyasumi-local-v2';
const POST_OPTIONS = [
 { id: 'awake', text: 'まだ寝れない…', sleeping: false },
 { id: 'sleep', text: 'もう寝るよ 🌙', sleeping: true },
 { id: 'try-sleep', text: '眠れないけど寝てみる 💤', sleeping: true },
 { id: 'early-sleep', text: 'お先に寝ます 👋', sleeping: true }
];
const REACTION_OPTIONS = [{ id: 'goodnight', text: 'おやすみ🌙' }, { id: 'dream', text: 'いい夢を💤' }, { id: 'tomorrow', text: 'また明日👋' }, { id: 'comfort', text: '無理せずね☺️' }];
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
try { localState = { ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'), ...JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}') }; } catch { /* Leave old storage untouched. */ }
let state = { ...freshState(), coat: CatFaces.normalizeCoat(localState.lastSleep?.coat), name: localState.name, morningDays: Array.isArray(localState.morningDays) ? localState.morningDays : [], light: !!localState.light, lastSleep: localState.lastSleep || null };
const savedName = NicknameRules.validate(state.name);
state.name = savedName.error ? freshState().name : savedName.name;
let shared = { userId: null, feed: [], reactionCounts: {}, awakeCount: null, sleepingCount: null, ownSleepCount: null, nightDate: null, trend: [], trendSupported: false };
let busy = false, ready = false, refreshPromise, connectionPromise;
let stateRevision=0, refreshQueued=false, refreshSaved=false;
let view = SleepFlow.openView(state.lastSleep,state.morningDays,NightClock.now()), filter = 'all', toastTimer, restTimer, sleepShownAt;
const app = document.querySelector('#app');
const nav = document.querySelector('#navigation');
const icons = { home: '<path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9"/>', timeline: '<rect x="4" y="3" width="16" height="16" rx="3"/><path d="m8 19-2 3v-4M8 8h8M8 12h6"/>', stats: '<path d="M5 21V12h3v9M11 21V4h3v17M17 21V8h3v13"/>', profile: '<circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3Z"/>' };
const escapeHTML = text => String(text).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const timeLabel = date => new Date(date).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false });
const dayKey = () => SleepFlow.day(NightClock.now());
function save() { try { localStorage.setItem(LOCAL_KEY, JSON.stringify({ name: state.name, morningDays: state.morningDays, light: state.light, lastSleep: state.lastSleep })); } catch { toast('端末の設定を保存できませんでした。'); } }
function toast(message) { const el=document.querySelector('#toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),2800); }
const allPosts = () => shared.feed;
const statusText = status => POST_OPTIONS.find(option => option.id === status)?.text || '';
const avatar = p => `<span class="avatar ${p.color || 'peach'}" aria-hidden="true">${CatFaces.svg(p.expression,p.coat)}</span>`;
const header = (title='おやすみ', back=false) => `<header class="header">${back?'<button class="icon-button" data-view="home" aria-label="ホームに戻る">‹</button>':'<span class="eyebrow">GOOD NIGHT</span>'}<h1 class="wordmark">${title}</h1><button class="icon-button" data-view="settings" aria-label="設定">⚙</button></header>`;
function navigation() { if(view==='rest'){nav.innerHTML='';nav.hidden=true;return;}const items=[['home','ホーム'],['timeline','タイムライン'],['stats','今夜の様子'],['profile','マイページ']];nav.innerHTML=items.map(([id,label])=>`<button data-view="${id}" class="${view===id?'active':''}" ${view===id?'aria-current="page"':''}><svg viewBox="0 0 24 24" aria-hidden="true">${icons[id]}</svg>${label}</button>`).join('');nav.hidden=view==='sleep'; }
function roofStars() {
 const stars=[[14,14,.6],[29,8,.4],[8,44,.45],[30,37,.75],[10,60,.5],[25,70,.4],[61,2,.5],[102,3,.65],[120,1,.4],[150,4,1],[199,7,.4],[194,32,.8],[184,44,.45],[202,58,.5],[179,70,.4],[18.5,30,1.5],[167.3,6,1.3],[195.5,64,1.5]];
 const cool=new Set([2,6,10,13,16]),twinkle=new Map([[0,3.8],[9,4.7],[11,5.6],[15,4.2]]);
 return `<g class="roof-stars" opacity=".46">${stars.map(([x,y,r],i)=>{const tone=cool.has(i)?'cool':'warm',color=tone==='cool'?'#d2ddec':i%2?'#ece2bd':'#e9d6a7',motion=twinkle.has(i)?` class="roof-twinkle" style="animation-duration:${twinkle.get(i)}s;animation-delay:-${i*.37}s"`:'';return i<15?`<circle data-star-tone="${tone}" cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${i%3===0?1:.6}"${motion}/>`:`<path data-star-tone="${tone}" d="M${x-r} ${y}h${r*2}m-${r}-${r}v${r*2}" fill="none" stroke="${color}" stroke-width=".7" stroke-linecap="round"${motion}/>`;}).join('')}</g>`;
}
let roofShootingTimer,roofNextShootingAt;
function syncRoofSky() {
 clearTimeout(roofShootingTimer);
 const scene=document.querySelector('.awake-roof');
 if(document.hidden||!scene||matchMedia('(prefers-reduced-motion: reduce)').matches){document.querySelectorAll('.roof-shooting-star').forEach(star=>{star.getAnimations().forEach(animation=>animation.cancel());star.remove();});roofNextShootingAt=undefined;return;}
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
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',syncRoofSky);
function awakeCats() {
 const count=Number.isFinite(shared.awakeCount)?Math.min(3,Math.max(0,shared.awakeCount)):0;
 if(!count)return '';
 const users=new Set(),coats=[];
 for(const post of shared.feed){if(post.status!=='awake'||users.has(post.userId))continue;users.add(post.userId);coats.push(post.coat);if(coats.length===count)break;}
return `<span class="awake-cats" aria-hidden="true"><span class="awake-scene"><svg class="roof-overhead-stars" viewBox="0 0 208 20" focusable="false" style="position:absolute;left:0;top:-10px;width:208px;height:20px;pointer-events:none"><g fill="#f0e3b5" opacity=".65"><circle data-star-tone="warm" cx="38" cy="6" r=".7"/><circle data-star-tone="warm" cx="108" cy="8" r=".8"/><circle data-star-tone="warm" cx="160" cy="5" r=".65"/></g></svg><svg class="awake-roof" viewBox="0 0 208 110" focusable="false"><defs><linearGradient id="awake-roof-wash" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#23324b"/><stop offset="1" stop-color="#14213a"/></linearGradient></defs><path d="M-14 75Q96 76 222 83l-24 31H4Z" fill="url(#awake-roof-wash)"/><path d="M-8 75Q96 76 216 83" fill="none" stroke="#586982" stroke-width="1.2" stroke-linecap="round" opacity=".5"/><g fill="none" stroke="#465772" stroke-width=".8" stroke-linecap="round" opacity=".38"><path d="M2 86q17 4 34 1m0 0q17 4 34 1m0 0q17 4 34 1m0 0q17 4 34 1m0 0q17 4 34 1m0 0q17 4 34 1M-12 99q17 4 34 1m0 0q17 4 34 1m0 0q17 4 34 1m0 0q17 4 34 1m0 0q17 4 34 1m0 0q17 4 34 1"/><path d="m36 87-4 10m38-9-4 10m38-9-4 10m38-9-4 10m38-9-4 10"/></g>${roofStars()}<path class="roof-moon" d="M180 12a7 7 0 1 0 7 11 7.5 7.5 0 0 1-7-11Z" fill="#ddd8bf" opacity=".48"/></svg><span class="roof-cat-group" data-cat-count="${count}">${Array.from({length:count},(_,index)=>RoofCats.svg(coats[index],index,count)).join('')}</span></span></span>`;
}
function cardSkyStars() {
 // Percentage positions follow the card; fixed dot sizes keep the existing quiet scale.
 const stars=[[7,6,.9,.24],[22,9,.6,.22],[43,5,.7,.18],[68,8,.5,.2],[89,6,.9,.24],[96,20,.6,.18],[5,24,.7,.2],[12,35,.9,.32],[91,36,.6,.3],[4,48,.5,.2],[8,61,.8,.3],[94,53,.9,.3],[89,68,.6,.26],[5,78,.7,.18],[95,80,.5,.18],[11,91,.9,.22],[27,94,.6,.2],[48,95,.8,.18],[72,92,.5,.22],[91,93,.9,.22],[18,70,.5,.24],[82,74,.7,.22],[23,23,.5,.12],[77,24,.6,.12],[25,84,.5,.1],[74,85,.5,.1]];
 return `<span class="card-sky-stars" aria-hidden="true">${stars.map(([x,y,r,opacity],i)=>`<i style="left:${x}%;top:${y}%;width:${r*2}px;height:${r*2}px;opacity:${opacity};background:${i%4===0?'#d2ddec':i%2?'#ece2bd':'#e9d6a7'}"></i>`).join('')}</span>`;
}
function countCard() { return `<section class="card count-card roof-sky-card">${cardSkyStars()}<h2 class="awake-heading"><span>今夜まだ起きてる人</span><span class="count">${shared.awakeCount ?? '—'}<small> 人</small></span></h2>${awakeCats()}<p class="muted" data-trend-comment="${TonightTrend.classify(shared.trend)}">今夜も、ひとりじゃないみたい</p></section>`; }
function actions() { const captions={"early-sleep":"（また明日）"};return `<div class="status-actions"><button class="status-button awake" data-post="awake"><span class="status-symbol" aria-hidden="true">😴</span><span><strong><span class="post-label-text">まだ寝れない…</span></strong><small>（いま起きてる）</small></span></button><button class="status-button sleep" data-post="sleep"><span class="status-symbol moon-symbol" aria-hidden="true"><svg viewBox="0 0 48 48" focusable="false"><path d="M39 5C23-1 6 10 6 25C6 40 24 49 39 41C41 40 41 37 38 37C25 37 18 28 20 17C22 11 29 8 37 8C40 8 41 6 39 5Z"/></svg></span><span><strong><span class="post-label-text">もう寝るよ</span></strong><small>（おやすみする）</small></span></button><div class="extra-post-options">${POST_OPTIONS.slice(2).map(option=>`<button class="extra-post-button" data-post="${option.id}"><span><strong>${option.id === 'try-sleep' ? '<span class="post-label-line">眠れないけど</span><span class="post-label-line">寝てみる <span class="post-label-emoji">💤</span></span>' : '<span class="post-label-line">お先に寝ます <span class="post-label-emoji">👋</span></span>'}</strong>${captions[option.id] ? `<small>${captions[option.id]}</small>` : ''}</span></button>`).join('')}</div><p class="choice-note">ひとつ選ぶだけ。<br>寝る報告のあとは、スマホを置いて。</p></div>`; }
function chart() { return `<section class="card chart"><h2>今夜の推移</h2>${TonightTrend.chart(shared.trend)}</section>`; }
function stats() {
 const summary=shared.tonightSummary;
 const count=summary?.sleepingCount??shared.sleepingCount;
 const limit=32,cats=[];
 if(summary)for(const group of summary.coats)for(let i=0;i<group.count&&cats.length<limit;i++)cats.push(CatScenes.svg('sleeping',group.coat));
 const hours=summary?.peakHours||[];
 return `${header('今夜の様子',true)}<section class="card count-card"><h2>今夜のおやすみ人数</h2><div class="count">${count??'—'}<small> 人</small></div><p class="muted">今夜、最後におやすみを報告した人</p></section><section class="card tonight-cats"><h2>いまの猫たち</h2>${summary?cats.length?`<div class="sleeping-cats" role="img" aria-label="今夜おやすみした${count}人の猫たち"><div aria-hidden="true">${cats.join('')}</div></div>${count>cats.length?`<p class="muted">ほか ${count-cats.length} 人もおやすみしています</p>`:''}`:'<p class="muted">今夜のおやすみは、これから。</p>':'<p class="muted">猫たちの様子を取得できませんでした。</p>'}<p class="summary-note">名前を出さず、選んだ毛色の猫で表示しています。</p></section><section class="card tonight-hours"><h2>おやすみが多い時間帯</h2>${summary?hours.length?`<div class="peak-hours">${hours.map(h=>`<p><strong>${String(h.hour).padStart(2,'0')}:00〜${String((h.hour+1)%24).padStart(2,'0')}:00</strong><span>${h.count} 人</span></p>`).join('')}</div><p class="summary-note">日本時間・一人につき最新のおやすみ報告</p>`:'<p class="muted">おやすみの報告が集まると表示されます。</p>':'<p class="muted">時間帯を取得できませんでした。</p>'}</section>${chart()}`;
}
function dayHero() { const scene=DayCats.current();return scene ? `<section class="day-hero" data-day-bucket="${scene.key}"><button class="day-cat" data-day-cat-tap aria-label="昼猫をなでる">${DayCats.svg(scene.id,state.coat)}</button><h2>${scene.label}</h2><p>また今夜 🌙</p></section>` : ''; }
function roleTag(role) { const label=CatRoles.label(role);return label?`<span class="cat-role-tag">${escapeHTML(label)}</span>`:''; }
function roleSetting() { return `<button class="setting-row role-setting" data-role-picker><span>職業 <small>任意</small></span><span class="setting-value">${CatRoles.label(state.catRole)||(state.catRole==='private'?'表示なし':'未設定')} ›</span></button>`; }
function home() { return `<div class="home-heading">${header()}${darkHint()}</div>${dayHero()}${countCard()}${actions()}<section><div class="section-heading"><h2>みんなの様子</h2><small><span class="live-dot"></span>今夜のタイムライン</small></div><div class="mini-feed">${allPosts().slice(0,5).map(p=>`<div class="mini-row">${avatar(p)}<span class="mini-name">${escapeHTML(p.name)}</span><span class="mini-status ${isSleeping(p.status)?'sleeping':''}">${statusText(p.status)}</span><time datetime="${new Date(p.time).toISOString()}">${timeLabel(p.time)}</time></div>`).join('')}</div></section><p class="quiet-note">眠れない夜も、ここではひとりじゃない。</p>`; }
function reactionButtons(post) {
 return `<div class="reaction-options" role="group" aria-label="${escapeHTML(post.name)}へのリアクション">${REACTION_OPTIONS.map(option => {
  const selected = state.reactions[post.id] === option.id;
  const count = shared.reactionCounts[post.id]?.[option.id] ?? 0;
  return `<button class="reaction ${selected?'selected':''}" data-react="${post.id}" data-reaction="${option.id}" aria-pressed="${selected}" aria-label="${escapeHTML(post.name)}に${option.text}のリアクション">${option.text}<span class="reaction-count${count >= 100 ? ' compact-count' : ''}"${count >= 100 ? ` style="--count-digits:${String(count).length};--count-scale:${Math.min(.55,16/(String(count).length*9))}"` : ''}>${count >= 100 ? `<span>${count}</span>` : count}</span></button>`;
 }).join('')}</div>`;
}
function timeline() {
 const posts = allPosts().filter(post => filter==='all' || (filter==='sleep' ? isSleeping(post.status) : post.status==='awake'));
 return `${header()}<div class="tabs" aria-label="投稿の絞り込み">${[['all','みんな'],['awake','まだ起きてる'],['sleep','もう寝た']].map(([key,label])=>`<button data-filter="${key}" class="${filter===key?'active':''}" aria-pressed="${filter===key}">${label}</button>`).join('')}</div><div>${posts.length?posts.map(p=>`<article class="post"><button class="public-profile-cat" data-public-profile="${p.id}" aria-label="${escapeHTML(p.name)}のプロフィール">${avatar(p)}</button><div class="post-body"><div class="post-top"><h2 class="post-name"><span class="post-nickname">${escapeHTML(p.name)}</span>${roleTag(p.catRole)}${p.self?'<span class="self-tag">あなた</span>':''}</h2>${p.self?`<button class="text-button" data-delete="${p.id}" aria-label="自分の投稿を削除">削除</button>`:''}</div><p class="post-text ${p.status==='awake'?'awake-text':''}">${statusText(p.status)}</p><div class="post-bottom"><time datetime="${new Date(p.time).toISOString()}">${timeLabel(p.time)}</time></div>${reactionButtons(p)}</div></article>`).join(''):'<p class="empty">まだ投稿がありません。<br>ホームから今の気持ちを伝えてみましょう。</p>'}</div>`;
}
function sleep() { return `<section class="sleep-screen"><div class="sleep-art" aria-hidden="true"><span class="big-moon">☾</span><span class="star one">✦</span><span class="star two">✦</span><span class="star three">✦</span><span class="sleep-cat">${CatFaces.svg(state.expression,state.coat)}</span></div><h1>おやすみなさい<br>${escapeHTML(state.name)}さん 🌙</h1><div class="card">今夜は <strong>${state.lastSleep?.count ?? '—'}</strong> 人と一緒に<br>おやすみしました。</div><p class="rest-message">今日もお疲れさまでした。<br>ゆっくり休んでくださいね。</p><button class="cream-button" data-finish-sleep>また明日 🌙</button><p class="quiet-note">これで今日のSNSは終了です。<br>スマホを置いて、ゆっくり休みましょう。</p><button class="text-button" data-view="home">ホームに戻る</button><p class="sample-tag">おやすみした時点の報告人数です</p></section>`; }
function rest() { const elapsed=CatScenes.elapsed(state.lastSleep?.finishedAt,NightClock.now()),settled=elapsed>=CatScenes.settleDurationMs;return `<section class="rest-screen" data-phase="${settled?'settled':'intro'}" style="--rest-duration:${CatScenes.settleDurationMs}ms;--rest-elapsed:-${elapsed}ms"><div class="rest-content"><div class="rest-cat" aria-hidden="true">${CatScenes.svg('sleeping',state.coat)}</div>${settled?'<h1>おやすみなさい 🌙</h1>':'<div class="rest-intro"><h1>また明日 🌙</h1><p class="rest-message">今日もおつかれさまでした<br>スマホを置いて、ゆっくり休もう</p></div>'}</div></section>`; }
function morningReceipts() {
 const morningNight=SleepFlow.previousNight(NightClock.now());
 if(SleepFlow.night(NightClock.now())===morningNight)return '';
 const receipt=shared.morningReactions;
 const valid=receipt&&receipt.nightDate===morningNight&&receipt.nightDate===SleepFlow.sleepNight(state.lastSleep);
 const labels={goodnight:'おやすみ 🌙',dream:'いい夢を 💤',tomorrow:'また明日 👋',comfort:'無理せずね ☺️'};
 const total=valid?Object.keys(labels).reduce((sum,id)=>sum+receipt[id],0):null;
 if(total===0)return '';
 return `<section class="card morning-receipts"><h2>きのう、あなたに届いたおやすみ</h2>${valid?`<div class="morning-reaction-grid">${Object.entries(labels).map(([id,label])=>`<div><span>${label}</span><strong>${receipt[id]}<small> 個</small></strong></div>`).join('')}</div><p>${total}個のやさしい言葉が届いていました</p>`:'<p class="muted">届いた言葉を取得できませんでした。</p>'}</section>`;
}
function morning() { const recorded=state.morningDays.includes(dayKey());return `<section class="morning"><div class="sunrise" aria-hidden="true"><span class="morning-cat">${CatScenes.svg('awake',state.coat)}</span></div><h1>おはようございます<br>${escapeHTML(state.name)}さん ☀️</h1><div class="card">昨夜は <strong>${state.lastSleep?.count ?? '—'}</strong> 人と一緒に<br>おやすみしました。</div>${morningReceipts()}<p>よく眠れましたか？<br>今日も良い一日になりますように！</p><button class="cream-button" data-morning ${recorded?'disabled':''}>${recorded?'おはようを記録しました ✓':'おはよう ☀️ を記録する'}</button><p class="muted">また今夜、ここで会いましょう。</p><p class="sample-tag">おやすみした時点の報告人数です</p></section>`; }
function catCoatSetting() { return `<section class="settings-section card cat-coat-setting"><h2>猫の種類</h2><button class="setting-row" data-coat-picker ${CatCoatCooldown.available(shared.catCoatStatus,NightClock.now())?'': 'disabled'}><span>${shared.needsCat?'猫の種類を選ぶ':CatFaces.coatLabel(state.coat)}</span><span>›</span></button><p class="quiet-note cat-coat-availability">${CatCoatCooldown.message(shared.catCoatStatus,NightClock.now())}</p></section>`; }
function profile() { return `${header()}${shared.profileComplete?'':'<section class="settings-section"><h2>投稿前にプロフィールを設定</h2><button class="setting-row" data-name>ニックネームを設定 ›</button><button class="setting-row" data-coat-picker>猫の種類を選ぶ ›</button></section>'}<div class="profile-banner"><button class="profile-cat-button" ${shared.needsCat?'data-coat-picker':'data-expression-picker'} aria-label="${shared.needsCat?'猫の種類を選ぶ':'猫の表情を変更'}">${shared.needsCat?'<span class="avatar peach" aria-hidden="true">🐾</span>':avatar({expression:state.expression,coat:state.coat,color:'peach'})}</button><div><h1>${escapeHTML(state.name)||'ニックネーム未設定'}</h1>${roleTag(state.catRole)}<button class="profile-note-button" data-note-editor><span>そっとひとこと ›</span><span class="profile-note-text${state.profileNote ? '' : ' is-empty'}">${escapeHTML(state.profileNote)||'未入力'}</span></button></div></div>${catCoatSetting()}${roleSetting()}<div class="stats-grid"><div class="stat">おやすみを伝えた回数<strong>${shared.ownSleepCount ?? '—'}<small> 回</small></strong></div><div class="stat">おはようした日数<strong>${state.morningDays.length}<small> 日</small></strong></div></div><div class="section-heading"><h2>最近の記録</h2></div>${state.posts.length?state.posts.slice(0,12).map(p=>`<div class="history-row"><span>${new Date(p.time).toLocaleDateString('ja-JP',{month:'numeric',day:'numeric'})}</span><span class="history-status">${statusText(p.status)}</span><time>${timeLabel(p.time)}</time></div>`).join(''):'<div class="card empty">まだ記録はありません。<br>今夜の「おやすみ」から始めましょう。</div>'}<p class="quiet-note">投稿の記録は、匿名アカウントに保存されます。</p>`; }
function settings() { return `${header('設定',true)}<section class="settings-section"><h2>プロフィール</h2><button class="setting-row" data-name><span>ニックネーム</span><span class="setting-value">${escapeHTML(state.name)} ›</span></button><button class="setting-row" data-coat-picker ${CatCoatCooldown.available(shared.catCoatStatus,NightClock.now())?'': 'disabled'} aria-label="猫の毛色を選ぶ"><span>猫の種類（毛色）</span><span class="expression-setting"><span class="avatar peach">${CatFaces.svg(state.expression,state.coat)}</span><span class="setting-value">${shared.needsCat?'未設定':CatFaces.coatLabel(state.coat)} ›</span></span></button>${roleSetting()}</section><section class="settings-section"><h2>表示設定</h2><label class="setting-row"><span>ダークモード</span><input class="switch" type="checkbox" id="dark-switch" ${!state.light?'checked':''}></label><div class="setting-row"><span>言語</span><span class="setting-value">日本語</span></div></section><section class="settings-section"><h2>この初期版について</h2><div class="card settings-info">投稿・リアクション・今夜の人数は、みんなで共有しています。朝の記録と表示設定は、この端末に保存されます。人数の推移は、今夜の投稿をもとに集計しています。<br><br>匿名アカウントは端末ごとに異なります。通知は今後の対応予定です。</div></section><section class="settings-section safety-links"><h2>安心して使うために</h2><button class="setting-row" data-safety="privacy">プライバシーポリシー ›</button><button class="setting-row" data-safety="rules">利用規約・安全ルール ›</button></section><button class="text-button share-place-button" data-share-place>この場所を教える 🌙</button>`; }
function render() { if(view!=='timeline')clearReactionEffect();clearTimeout(restTimer);document.body.classList.toggle('resting',view==='rest');document.body.classList.toggle('light-mode',state.light&&view!=='morning');app.innerHTML=({home,timeline,sleep,rest,morning,profile,settings,stats}[view]||home)();navigation();syncBusy();syncRoofSky();if(view==='sleep'){sleepShownAt??=NightClock.now();const pendingSleep=state.lastSleep;const remaining=Math.max(0,CatScenes.settleDurationMs-(NightClock.now()-sleepShownAt));restTimer=setTimeout(()=>{if(view==='sleep'&&state.lastSleep===pendingSleep)finishSleep(sleepShownAt);},remaining);}if(view==='rest'){const remaining=CatScenes.settleDurationMs-CatScenes.elapsed(state.lastSleep?.finishedAt,NightClock.now());if(remaining>0)restTimer=setTimeout(()=>{if(view==='rest')render();},remaining+20);} }
function go(next) { if(next==='sleep'&&view!=='sleep')sleepShownAt=NightClock.now();if(next!=='sleep')sleepShownAt=undefined;view=next;render();window.scrollTo(0,0); }
function syncBusy() {
 document.querySelectorAll('[data-coat-picker]').forEach(button=>{button.disabled=busy||!CatCoatCooldown.available(shared.catCoatStatus,NightClock.now());});
 app.setAttribute('aria-busy',String(busy));
 document.querySelectorAll('[data-post],[data-react],[data-delete],[data-expression],[data-coat],#role-form button[type=submit],#note-form button[type=submit],#nickname-form button[type=submit]').forEach(button=>{button.disabled=busy||(button.hasAttribute('data-coat')&&!CatCoatCooldown.available(shared.catCoatStatus,NightClock.now()));});
}
function renderPreservingPosition() {
 if(document.querySelector('dialog[open]'))return;
 const x=window.scrollX,y=window.scrollY,focused=document.activeElement;
 const attributes=['data-view','data-filter','data-react','data-reaction','data-delete','data-post'];
 const selector=focused?.id?`#${CSS.escape(focused.id)}`:attributes.filter(key=>focused?.hasAttribute(key)).map(key=>`[${key}="${CSS.escape(focused.getAttribute(key))}"]`).join('');
 render();window.scrollTo(x,y);
 if(selector)document.querySelector(selector)?.focus({preventScroll:true});
}
let nightBoundaryTimer;
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
 shared={...shared,nightDate:NightClock.night(),feed:[],awakeCount:null,sleepingCount:null,trend:[],tonightSummary:null,reactionCounts:{}};
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
 if(busy&&ready){refreshQueued=true;return;}
 if(refreshPromise)return refreshPromise;
 const revision=stateRevision;
 refreshPromise=(async()=>{
  const snapshot=await OyasumiAPI.snapshot();
  // A read started before a write/boundary must not overwrite the confirmed local result.
  if(revision!==stateRevision||(busy&&ready)||snapshot.clock&&snapshot.clock.serverNow+performance.now()-snapshot.clock.monotonicAt>=snapshot.clock.resetAt){refreshQueued=true;return;}
  NightClock.sync(snapshot.clock);shared=snapshot;state.name=snapshot.name;state.expression=CatFaces.normalize(snapshot.expression);state.coat=CatFaces.normalizeCoat(snapshot.coat);state.catRole=snapshot.catRole;state.profileNote=snapshot.profileNote;state.posts=snapshot.ownPosts;state.reactions=snapshot.reactions;
  if(state.lastSleep?.count===null&&state.lastSleep.postId&&snapshot.nightDate===state.lastSleep.nightDate&&snapshot.feed.some(post=>post.id===state.lastSleep.postId&&isSleeping(post.status)))state.lastSleep.count=snapshot.sleepingCount;
  syncSleepView();
  if(!ready&&['home','rest','morning'].includes(view))view=SleepFlow.openView(state.lastSleep,state.morningDays,NightClock.now());
  scheduleNightBoundary();
  ready=true;save();renderPreservingPosition();
 })();
 try{await refreshPromise;}finally{refreshPromise=undefined;startQueuedRefresh();}
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
 if(!refreshQueued||busy||refreshPromise)return;
 const saved=refreshSaved;refreshQueued=false;refreshSaved=false;
 void refreshShared().catch(()=>toast(saved?'保存済み。表示は後で更新します。':'最新の投稿を取得できませんでした。'));
}
function refreshAfterSave(saved=true) {
 refreshQueued=true;refreshSaved=refreshSaved||saved;startQueuedRefresh();
}
document.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;
 if(button.hasAttribute('data-day-cat-tap')){const cat=button.querySelector('.cat-day-scene');if(cat&&!matchMedia('(prefers-reduced-motion: reduce)').matches){cat.getAnimations().forEach(animation=>animation.cancel());cat.animate([{transform:'translateY(0)',offset:0},{transform:'translateY(-6px)',offset:.45},{transform:'translateY(0)',offset:1}],{duration:400,easing:'ease-in-out'});}return;}
 if(button.hasAttribute('data-share-place')){void sharePlace();return;}
 if(button.hasAttribute('data-copy-place')){void copyPlaceURL();return;}
 if(button.hasAttribute('data-close-share')){document.querySelector('#share-dialog').close();return;}
 if(button.hasAttribute('data-finish-sleep')){finishSleep();return;}
 if(button.dataset.view){go(button.dataset.view);return;}
 if(button.dataset.post){const status=button.dataset.post;if(!POST_OPTIONS.some(option=>option.id===status))return;void mutation(async()=>{
  if(!shared.profileComplete){go('profile');toast('名前と猫の種類を設定してください');return;}
  const row=await OyasumiAPI.submitPost(status);
  checkNightBoundary();
  const post={id:row.id,userId:row.user_id,status:row.choice,time:Date.parse(row.created_at),nightDate:row.night_date,order:row.event_order,name:state.name,expression:state.expression,coat:state.coat,catRole:state.catRole,profileNote:state.profileNote,self:true,color:'peach'};
  state.posts=[post,...state.posts.filter(p=>p.id!==post.id)];if(row.night_date===NightClock.night())shared.feed=[post,...shared.feed.filter(p=>p.userId!==post.userId)];
  if(isSleeping(status)){state.lastSleep={count:null,postId:row.id,nightDate:row.night_date,userId:row.user_id,at:row.created_at,coat:state.coat,finished:false};save();}
  else if(state.lastSleep?.finished){state.lastSleep.finished=false;save();}
  go(isSleeping(status)?'sleep':'timeline');syncSleepView();if(status==='awake')toast('今の気持ちを伝えました');refreshAfterSave();
 });return;}
 if(button.dataset.filter){filter=button.dataset.filter;render();return;}
 if(button.dataset.react){const id=button.dataset.react,choice=button.dataset.reaction;if(!REACTION_OPTIONS.some(option=>option.id===choice)||!allPosts().some(post=>post.id===id))return;if(!busy)showReactionTap(button);void mutation(async()=>{
  const previous=state.reactions[id],next=previous===choice?null:choice;
  try{await OyasumiAPI.setReaction(id,next);}catch(error){clearReactionEffect();throw error;}
  checkNightBoundary();
  const counts=shared.reactionCounts[id]||{goodnight:0,dream:0,tomorrow:0,comfort:0};
  if(previous)counts[previous]=Math.max(0,counts[previous]-1);if(next)counts[next]+=1;
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
 if(button.hasAttribute('data-morning')){if(!state.morningDays.includes(dayKey()))state.morningDays.push(dayKey());save();render();toast('おはよう。今日も良い一日を ☀️');return;}
 if(button.hasAttribute('data-name')){document.querySelector('#nickname').value=OyasumiAPI.needsNickname?'':state.name;clearNicknameError();document.querySelector('#nickname-dialog').showModal();document.querySelector('#nickname').focus();}
 if(button.hasAttribute('data-expression-picker')||button.hasAttribute('data-coat-picker')){
  const coatPicker=button.hasAttribute('data-coat-picker');
  if(coatPicker&&!CatCoatCooldown.available(shared.catCoatStatus,NightClock.now()))return;
  document.querySelector('#expression-title').textContent=coatPicker?'猫の種類（毛色）':'猫の表情';
  document.querySelector('#expression-options').setAttribute('aria-label',coatPicker?'猫の毛色の選択肢':'猫の表情の選択肢');
  document.querySelector('#expression-description').textContent=coatPicker?'好きな毛色を、ひとつ。':'今の気分に合う表情を、ひとつ。';
  document.querySelector('#expression-options').innerHTML=(coatPicker?CatFaces.coats:CatFaces.options).map(option=>`${coatPicker&&option.id===WildCatAssets.species[0].id?'<h3 class="cat-group-title">🐾 野生の猫たち</h3>':''}<button type="button" class="expression-choice ${(coatPicker?(shared.needsCat?null:state.coat):state.expression)===option.id?'selected':''}" data-${coatPicker?'coat':'expression'}="${option.id}" aria-pressed="${(coatPicker?(shared.needsCat?null:state.coat):state.expression)===option.id}"><span class="avatar peach">${CatFaces.svg(coatPicker?state.expression:option.id,coatPicker?option.id:state.coat)}</span><span>${option.label}</span></button>`).join('');
  document.querySelector('#expression-error').textContent='';document.querySelector('#expression-dialog').showModal();syncBusy();
 }
 if(button.dataset.expression||button.dataset.coat){const coatPicker=Boolean(button.dataset.coat);const value=button.dataset.coat||button.dataset.expression;const expression=coatPicker?state.expression:value;const coat=coatPicker?value:state.coat;if(!(coatPicker?CatFaces.coats:CatFaces.options).some(option=>option.id===value))return;void mutation(async()=>{
  if(coatPicker&&!CatCoatCooldown.available(shared.catCoatStatus,NightClock.now()))return;
  try{if(coatPicker)await OyasumiAPI.setCatCoat(coat);else await OyasumiAPI.setCatExpression(expression);}
  catch(error){if(coatPicker&&error.code==='P0030'){refreshAfterSave(false);document.querySelector('#expression-dialog').close();toast('猫の種類は30日に1回変更できます。');return;}document.querySelector('#expression-error').textContent=['PGRST202','PGRST204','42703'].includes(error.code)?'猫の保存機能は準備中です。':'保存できませんでした。もう一度お試しください。';return;}
  if(coatPicker){shared.catCoatStatus=null;shared.needsCat=false;shared.profileComplete=!shared.needsNickname;}
  state.expression=expression;shared.expression=expression;state.coat=coat;shared.coat=coat;for(const post of [...state.posts,...shared.feed])if(post.self){post.expression=expression;post.coat=coat;}
  document.querySelector('#expression-dialog').close();render();refreshAfterSave();toast(coatPicker?'猫の毛色を保存しました':'猫の表情を保存しました');
 });return;}
});
document.addEventListener('change',event=>{if(event.target.id==='dark-switch'){state.light=!event.target.checked;save();render();}});
document.querySelector('#cancel-name').addEventListener('click',()=>document.querySelector('#nickname-dialog').close());
document.querySelector('#cancel-expression').addEventListener('click',()=>document.querySelector('#expression-dialog').close());
document.addEventListener('click',event=>{
 const edit=event.target.closest('[data-note-editor]');
 if(edit&&!busy){
  document.querySelector('#profile-note').value=state.profileNote||'';
  document.querySelector('#note-error').textContent='';document.querySelector('#profile-note').removeAttribute('aria-invalid');
  document.querySelector('#note-dialog').showModal();document.querySelector('#profile-note').focus();
 }
 const button=event.target.closest('[data-public-profile]');if(!button)return;
 const person=allPosts().find(post=>post.id===button.dataset.publicProfile);if(!person)return;
 document.querySelector('#public-profile-content').innerHTML=`<div class="public-profile-face">${avatar(person)}</div><h3>${escapeHTML(person.name)}</h3>${roleTag(person.catRole)}<h4>そっとひとこと</h4><p class="public-profile-note">${escapeHTML(person.profileNote)||'未入力'}</p>`;
 document.querySelector('#public-profile-dialog').showModal();
});
document.querySelector('#close-public-profile').addEventListener('click',()=>document.querySelector('#public-profile-dialog').close());
document.querySelector('#public-profile-dialog').addEventListener('close',renderPreservingPosition);
document.querySelector('#cancel-note').addEventListener('click',()=>document.querySelector('#note-dialog').close());
document.querySelector('#profile-note').addEventListener('input',()=>{document.querySelector('#note-error').textContent='';document.querySelector('#profile-note').removeAttribute('aria-invalid');});
document.querySelector('#note-form').addEventListener('submit',event=>{
 event.preventDefault();if(busy)return;
 const input=document.querySelector('#profile-note');
 const result=NicknameRules.validate(input.value,{max:20,optional:true,countText:value=>[...value].length});
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
function refreshDayScene() { if(view==='home'&&(document.querySelector('.day-hero')?.dataset.dayBucket||null)!==(DayCats.current()?.key||null))renderPreservingPosition(); }
setInterval(()=>{if(!document.hidden)syncSleepView();if(view==='rest')return;if(!document.hidden)refreshDayScene();if(!document.hidden&&!busy)void ensureConnection().then(()=>refreshShared()).catch(()=>{});},30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkNightBoundary();if(!document.hidden)refreshDayScene();if(view==='rest')return;if(!document.hidden&&!busy)void ensureConnection().then(()=>refreshShared()).catch(()=>toast('最新の投稿を取得できませんでした。'));});
window.addEventListener('online',()=>{if(view==='rest')return;if(!busy)void ensureConnection().then(()=>refreshShared()).catch(()=>{});});

window.addEventListener('scroll',positionReactionEffect,{passive:true});window.addEventListener('resize',positionReactionEffect);
if(globalThis.OyasumiUpdates)OyasumiUpdates.canReload=()=>!busy&&view!=='sleep'&&view!=='rest'&&!document.querySelector('dialog[open]');
