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
const freshState = () => ({ name: 'ともを', expression: 'calm', coat: 'calico', posts: [], reactions: {}, morningDays: [], light: false, lastSleep: null });
let localState = {};
try { localState = { ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'), ...JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}') }; } catch { /* Leave old storage untouched. */ }
let state = { ...freshState(), coat: CatFaces.normalizeCoat(localState.lastSleep?.coat), name: localState.name, morningDays: Array.isArray(localState.morningDays) ? localState.morningDays : [], light: !!localState.light, lastSleep: localState.lastSleep || null };
const savedName = NicknameRules.validate(state.name);
state.name = savedName.error ? freshState().name : savedName.name;
let shared = { userId: null, feed: [], reactionCounts: {}, awakeCount: null, sleepingCount: null, ownSleepCount: null, nightDate: null, trend: [], trendSupported: false };
let busy = false, ready = false, refreshPromise, connectionPromise;
let view = SleepFlow.openView(state.lastSleep,state.morningDays), filter = 'all', toastTimer, restTimer, sleepShownAt;
const app = document.querySelector('#app');
const nav = document.querySelector('#navigation');
const icons = { home: '<path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9"/>', timeline: '<rect x="4" y="3" width="16" height="16" rx="3"/><path d="m8 19-2 3v-4M8 8h8M8 12h6"/>', stats: '<path d="M5 21V12h3v9M11 21V4h3v17M17 21V8h3v13"/>', profile: '<circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3Z"/>' };
const escapeHTML = text => String(text).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const timeLabel = date => new Date(date).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false });
const dayKey = () => SleepFlow.day();
function save() { try { localStorage.setItem(LOCAL_KEY, JSON.stringify({ name: state.name, morningDays: state.morningDays, light: state.light, lastSleep: state.lastSleep })); } catch { toast('端末の設定を保存できませんでした。'); } }
function toast(message) { const el=document.querySelector('#toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),2800); }
const allPosts = () => shared.feed;
const statusText = status => POST_OPTIONS.find(option => option.id === status)?.text || '';
const avatar = p => `<span class="avatar ${p.color || 'peach'}" aria-hidden="true">${CatFaces.svg(p.expression,p.coat)}</span>`;
const header = (title='おやすみ', back=false) => `<header class="header">${back?'<button class="icon-button" data-view="home" aria-label="ホームに戻る">‹</button>':'<span class="eyebrow">GOOD NIGHT</span>'}<h1 class="wordmark">${title}</h1><button class="icon-button" data-view="settings" aria-label="設定">⚙</button></header>`;
function navigation() { if(view==='rest'){nav.innerHTML='';nav.hidden=true;return;}const items=[['home','ホーム'],['timeline','タイムライン'],['stats','今夜の様子'],['profile','マイページ']];nav.innerHTML=items.map(([id,label])=>`<button data-view="${id}" class="${view===id?'active':''}" ${view===id?'aria-current="page"':''}><svg viewBox="0 0 24 24" aria-hidden="true">${icons[id]}</svg>${label}</button>`).join('');nav.hidden=view==='sleep'; }
function countCard() { return `<section class="card count-card"><h2>今夜まだ起きてる人</h2><div class="count">${shared.awakeCount ?? '—'}<small> 人</small></div><p class="muted" data-trend-comment="${TonightTrend.classify(shared.trend)}">${escapeHTML(TonightTrend.comment(shared.trend))}</p></section>`; }
function actions() { return `<div class="status-actions"><button class="status-button awake" data-post="awake"><span class="status-symbol" aria-hidden="true">😴</span><span><strong>まだ寝れない…</strong><small>（いま起きてる）</small></span></button><button class="status-button sleep" data-post="sleep"><span class="status-symbol moon-symbol" aria-hidden="true">☾</span><span><strong>もう寝るよ 🌙</strong><small>（おやすみする）</small></span></button><div class="extra-post-options">${POST_OPTIONS.slice(2).map(option=>`<button class="extra-post-button" data-post="${option.id}">${option.text}</button>`).join('')}</div><p class="choice-note">ひとつ選ぶだけ。寝る報告のあとは、スマホを置いて。</p></div>`; }
function chart() { return `<section class="card chart"><h2>今夜の推移</h2>${TonightTrend.chart(shared.trend)}</section>`; }
function stats() {
 const summary=shared.tonightSummary;
 const count=summary?.sleepingCount??shared.sleepingCount;
 const limit=32,cats=[];
 if(summary)for(const group of summary.coats)for(let i=0;i<group.count&&cats.length<limit;i++)cats.push(CatScenes.svg('sleeping',group.coat));
 const hours=summary?.peakHours||[];
 return `${header('今夜の様子',true)}<section class="card count-card"><h2>今夜のおやすみ人数</h2><div class="count">${count??'—'}<small> 人</small></div><p class="muted">今夜、最後におやすみを報告した人</p></section><section class="card tonight-cats"><h2>いまの猫たち</h2>${summary?cats.length?`<div class="sleeping-cats" role="img" aria-label="今夜おやすみした${count}人の猫たち"><div aria-hidden="true">${cats.join('')}</div></div>${count>cats.length?`<p class="muted">ほか ${count-cats.length} 人もおやすみしています</p>`:''}`:'<p class="muted">今夜のおやすみは、これから。</p>':'<p class="muted">猫たちの様子を取得できませんでした。</p>'}<p class="summary-note">名前を出さず、選んだ毛色の猫で表示しています。</p></section><section class="card tonight-hours"><h2>おやすみが多い時間帯</h2>${summary?hours.length?`<div class="peak-hours">${hours.map(h=>`<p><strong>${String(h.hour).padStart(2,'0')}:00〜${String((h.hour+1)%24).padStart(2,'0')}:00</strong><span>${h.count} 人</span></p>`).join('')}</div><p class="summary-note">日本時間・一人につき最新のおやすみ報告</p>`:'<p class="muted">おやすみの報告が集まると表示されます。</p>':'<p class="muted">時間帯を取得できませんでした。</p>'}</section>${chart()}`;
}
function dayHero() { const scene=DayCats.current();return scene ? `<section class="day-hero" data-day-bucket="${scene.key}"><div class="day-cat">${DayCats.svg(scene.id,state.coat)}</div><h2>${scene.label}</h2><p>また今夜 🌙</p></section>` : ''; }
function home() { return `${header()}${dayHero()}${countCard()}${actions()}<section><div class="section-heading"><h2>みんなの様子</h2><small><span class="live-dot"></span>今夜のタイムライン</small></div><div class="mini-feed">${allPosts().slice(0,5).map(p=>`<div class="mini-row">${avatar(p)}<span class="mini-name">${escapeHTML(p.name)}</span><span class="mini-status ${isSleeping(p.status)?'sleeping':''}">${statusText(p.status)}</span><time datetime="${new Date(p.time).toISOString()}">${timeLabel(p.time)}</time></div>`).join('')}</div><p class="sample-tag">今夜の投稿を共有しています</p></section><p class="quiet-note">眠れない夜も、ここではひとりじゃない。</p>`; }
function reactionButtons(post) {
 return `<div class="reaction-options" role="group" aria-label="${escapeHTML(post.name)}へのリアクション">${REACTION_OPTIONS.map(option => {
  const selected = state.reactions[post.id] === option.id;
  const count = shared.reactionCounts[post.id]?.[option.id] ?? 0;
  return `<button class="reaction ${selected?'selected':''}" data-react="${post.id}" data-reaction="${option.id}" aria-pressed="${selected}" aria-label="${escapeHTML(post.name)}に${option.text}のリアクション">${option.text}<span class="reaction-count">${count}</span></button>`;
 }).join('')}</div>`;
}
function timeline() {
 const posts = allPosts().filter(post => filter==='all' || (filter==='sleep' ? isSleeping(post.status) : post.status==='awake'));
 return `${header()}<div class="tabs" aria-label="投稿の絞り込み">${[['all','みんな'],['awake','まだ起きてる'],['sleep','もう寝た']].map(([key,label])=>`<button data-filter="${key}" class="${filter===key?'active':''}" aria-pressed="${filter===key}">${label}</button>`).join('')}</div><div>${posts.length?posts.map(p=>`<article class="post">${avatar(p)}<div class="post-body"><div class="post-top"><h2 class="post-name">${escapeHTML(p.name)}${p.self?'<span class="self-tag">あなた</span>':''}</h2>${p.self?`<button class="text-button" data-delete="${p.id}" aria-label="自分の投稿を削除">削除</button>`:''}</div><p class="post-text ${p.status==='awake'?'awake-text':''}">${statusText(p.status)}</p><div class="post-bottom"><time datetime="${new Date(p.time).toISOString()}">${timeLabel(p.time)}</time></div>${reactionButtons(p)}</div></article>`).join(''):'<p class="empty">まだ投稿がありません。<br>ホームから今の気持ちを伝えてみましょう。</p>'}</div><p class="sample-tag">今夜の投稿を共有しています</p>`;
}
function sleep() { return `<section class="sleep-screen"><div class="sleep-art" aria-hidden="true"><span class="big-moon">☾</span><span class="star one">✦</span><span class="star two">✦</span><span class="star three">✦</span><span class="sleep-cat">${CatFaces.svg(state.expression,state.coat)}</span></div><h1>おやすみなさい<br>${escapeHTML(state.name)}さん 🌙</h1><div class="card">今夜は <strong>${state.lastSleep?.count ?? '—'}</strong> 人と一緒に<br>おやすみしました。</div><p class="rest-message">今日もお疲れさまでした。<br>ゆっくり休んでくださいね。</p><button class="cream-button" data-finish-sleep>また明日 🌙</button><p class="quiet-note">これで今日のSNSは終了です。<br>スマホを置いて、ゆっくり休みましょう。</p><button class="text-button" data-view="home">ホームに戻る</button><p class="sample-tag">おやすみした時点の報告人数です</p></section>`; }
function rest() { const elapsed=CatScenes.elapsed(state.lastSleep?.finishedAt),settled=elapsed>=CatScenes.settleDurationMs;return `<section class="rest-screen" data-phase="${settled?'settled':'intro'}" style="--rest-duration:${CatScenes.settleDurationMs}ms;--rest-elapsed:-${elapsed}ms"><div class="rest-content"><div class="rest-cat" aria-hidden="true">${CatScenes.svg('sleeping',state.coat)}</div>${settled?'<h1>おやすみなさい 🌙</h1>':'<div class="rest-intro"><h1>また明日 🌙</h1><p class="rest-message">今日もおつかれさまでした<br>スマホを置いて、ゆっくり休もう</p></div>'}</div></section>`; }
function morning() { const recorded=state.morningDays.includes(dayKey());return `<section class="morning"><div class="sunrise" aria-hidden="true"><span class="morning-cat">${CatScenes.svg('awake',state.coat)}</span></div><h1>おはようございます<br>${escapeHTML(state.name)}さん ☀️</h1><div class="card">昨夜は <strong>${state.lastSleep?.count ?? '—'}</strong> 人と一緒に<br>おやすみしました。</div><p>よく眠れましたか？<br>今日も良い一日になりますように！</p><button class="cream-button" data-morning ${recorded?'disabled':''}>${recorded?'おはようを記録しました ✓':'おはよう ☀️ を記録する'}</button><p class="muted">また今夜、ここで会いましょう。</p><p class="sample-tag">おやすみした時点の報告人数です</p></section>`; }
function profile() { return `${header()}<div class="profile-banner"><button class="profile-cat-button" data-expression-picker aria-label="猫の表情を変更">${avatar({expression:state.expression,coat:state.coat,color:'peach'})}</button><div><h1>${escapeHTML(state.name)}</h1><p>今夜も、自分のペースで。</p></div></div><div class="stats-grid"><div class="stat">おやすみを伝えた回数<strong>${shared.ownSleepCount ?? '—'}<small> 回</small></strong></div><div class="stat">おはようした日数<strong>${state.morningDays.length}<small> 日</small></strong></div></div><div class="section-heading"><h2>最近の記録</h2></div>${state.posts.length?state.posts.slice(0,12).map(p=>`<div class="history-row"><span>${new Date(p.time).toLocaleDateString('ja-JP',{month:'numeric',day:'numeric'})}</span><span class="history-status">${statusText(p.status)}</span><time>${timeLabel(p.time)}</time></div>`).join(''):'<div class="card empty">まだ記録はありません。<br>今夜の「おやすみ」から始めましょう。</div>'}<p class="quiet-note">投稿の記録は、匿名アカウントに保存されます。</p>`; }
function settings() { return `${header('設定',true)}<section class="settings-section"><h2>プロフィール</h2><button class="setting-row" data-name><span>ニックネーム</span><span class="setting-value">${escapeHTML(state.name)} ›</span></button><button class="setting-row" data-coat-picker aria-label="猫の毛色を選ぶ"><span>猫の種類（毛色）</span><span class="expression-setting"><span class="avatar peach">${CatFaces.svg(state.expression,state.coat)}</span><span class="setting-value">${CatFaces.coatLabel(state.coat)} ›</span></span></button></section><section class="settings-section"><h2>表示設定</h2><label class="setting-row"><span>ダークモード</span><input class="switch" type="checkbox" id="dark-switch" ${!state.light?'checked':''}></label><div class="setting-row"><span>言語</span><span class="setting-value">日本語</span></div></section><section class="settings-section"><h2>この初期版について</h2><div class="card settings-info">投稿・リアクション・今夜の人数は、みんなで共有しています。朝の記録と表示設定は、この端末に保存されます。人数の推移は、今夜の投稿をもとに集計しています。<br><br>匿名アカウントは端末ごとに異なります。通知は今後の対応予定です。</div></section>`; }
function render() { clearTimeout(restTimer);document.body.classList.toggle('resting',view==='rest');document.body.classList.toggle('light-mode',state.light&&view!=='morning');app.innerHTML=({home,timeline,sleep,rest,morning,profile,settings,stats}[view]||home)();navigation();syncBusy();if(view==='sleep'){sleepShownAt??=Date.now();const pendingSleep=state.lastSleep;const remaining=Math.max(0,CatScenes.settleDurationMs-(Date.now()-sleepShownAt));restTimer=setTimeout(()=>{if(view==='sleep'&&state.lastSleep===pendingSleep)finishSleep(sleepShownAt);},remaining);}if(view==='rest'){const remaining=CatScenes.settleDurationMs-CatScenes.elapsed(state.lastSleep?.finishedAt);if(remaining>0)restTimer=setTimeout(()=>{if(view==='rest')render();},remaining+20);} }
function go(next) { if(next==='sleep'&&view!=='sleep')sleepShownAt=Date.now();if(next!=='sleep')sleepShownAt=undefined;view=next;render();window.scrollTo(0,0); }
function syncBusy() {
 app.setAttribute('aria-busy',String(busy));
 document.querySelectorAll('[data-post],[data-react],[data-delete],[data-expression],[data-coat],#nickname-form button[type=submit]').forEach(button=>{button.disabled=busy;});
}
function renderPreservingPosition() {
 if(document.querySelector('#nickname-dialog').open||document.querySelector('#expression-dialog').open)return;
 const x=window.scrollX,y=window.scrollY,focused=document.activeElement;
 const attributes=['data-view','data-filter','data-react','data-reaction','data-delete','data-post'];
 const selector=focused?.id?`#${CSS.escape(focused.id)}`:attributes.filter(key=>focused?.hasAttribute(key)).map(key=>`[${key}="${CSS.escape(focused.getAttribute(key))}"]`).join('');
 render();window.scrollTo(x,y);
 if(selector)document.querySelector(selector)?.focus({preventScroll:true});
}
async function refreshShared() {
 if(refreshPromise)return refreshPromise;
 refreshPromise=(async()=>{
  const snapshot=await OyasumiAPI.snapshot();
  shared=snapshot;state.name=snapshot.name;state.expression=CatFaces.normalize(snapshot.expression);state.coat=CatFaces.normalizeCoat(snapshot.coat);state.posts=snapshot.ownPosts;state.reactions=snapshot.reactions;
  ready=true;save();renderPreservingPosition();
 })();
 try{await refreshPromise;}finally{refreshPromise=undefined;}
}
async function ensureConnection() {
 if(!connectionPromise)connectionPromise=(async()=>{
  const userId=await OyasumiAPI.initialize(state.name);
  if(state.lastSleep?.userId&&state.lastSleep.userId!==userId){state.lastSleep=null;if(view==='rest'||view==='morning')go('home');}
  await refreshShared();
 })().catch(error=>{connectionPromise=undefined;throw error;});
 return connectionPromise;
}
async function mutation(work) {
 if(busy)return;
 busy=true;syncBusy();
 try{await ensureConnection();if(refreshPromise)await refreshPromise;await work();}
 catch(error){toast(error.code==='22023'?'少し待って、もう一度お試しください。':'通信できません。接続をご確認ください。');}
 finally{busy=false;syncBusy();}
}
function finishSleep(startedAt=Date.now()) { if(state.lastSleep){state.lastSleep.finished=true;state.lastSleep.coat=state.coat;state.lastSleep.finishedAt=new Date(startedAt).toISOString();save();}clearTimeout(toastTimer);document.querySelector('#toast').classList.remove('visible');go('rest'); }
async function refreshAfterSave() {
 try{await refreshShared();return true;}
 catch{toast('保存済み。表示は後で更新します。');return false;}
}
document.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;
 if(button.hasAttribute('data-finish-sleep')){finishSleep();return;}
 if(button.dataset.view){go(button.dataset.view);return;}
 if(button.dataset.post){const status=button.dataset.post;if(!POST_OPTIONS.some(option=>option.id===status))return;void mutation(async()=>{
  const row=await OyasumiAPI.submitPost(status);
  const post={id:row.id,userId:row.user_id,status:row.choice,time:Date.parse(row.created_at),nightDate:row.night_date,order:row.event_order,name:state.name,expression:state.expression,coat:state.coat,self:true,color:'peach'};
  state.posts=[post,...state.posts.filter(p=>p.id!==post.id)];shared.feed=[post,...shared.feed.filter(p=>p.userId!==post.userId)];
  const refreshed=await refreshAfterSave();
  if(isSleeping(status)){state.lastSleep={count:refreshed?shared.sleepingCount:null,nightDate:row.night_date,userId:row.user_id,at:row.created_at,coat:state.coat,finished:false};save();}
  else if(state.lastSleep?.finished){state.lastSleep.finished=false;save();}
  go(isSleeping(status)?'sleep':'timeline');if(status==='awake')toast('今の気持ちを伝えました');
 });return;}
 if(button.dataset.filter){filter=button.dataset.filter;render();return;}
 if(button.dataset.react){const id=button.dataset.react,choice=button.dataset.reaction;if(!REACTION_OPTIONS.some(option=>option.id===choice)||!allPosts().some(post=>post.id===id))return;void mutation(async()=>{
  const previous=state.reactions[id],next=previous===choice?null:choice;
  await OyasumiAPI.setReaction(id,next);
  const counts=shared.reactionCounts[id]||{goodnight:0,dream:0,tomorrow:0,comfort:0};
  if(previous)counts[previous]=Math.max(0,counts[previous]-1);if(next)counts[next]+=1;
  shared.reactionCounts[id]=counts;if(next)state.reactions[id]=next;else delete state.reactions[id];
  renderPreservingPosition();await refreshAfterSave();
 });return;}
 if(button.dataset.delete){const id=button.dataset.delete;if(!state.posts.some(p=>p.id===id&&p.self))return;void mutation(async()=>{
  const deleted=await OyasumiAPI.deletePost(id);if(!deleted){toast('投稿はすでに削除されています。');await refreshAfterSave();return;}
  state.posts=state.posts.filter(p=>p.id!==id);shared.feed=shared.feed.filter(p=>p.id!==id);delete state.reactions[id];
  renderPreservingPosition();await refreshAfterSave();toast('投稿を削除しました');
 });return;}
 if(button.hasAttribute('data-morning')){if(!state.morningDays.includes(dayKey()))state.morningDays.push(dayKey());save();render();toast('おはよう。今日も良い一日を ☀️');return;}
 if(button.hasAttribute('data-name')){document.querySelector('#nickname').value=state.name;clearNicknameError();document.querySelector('#nickname-dialog').showModal();document.querySelector('#nickname').focus();}
 if(button.hasAttribute('data-expression-picker')||button.hasAttribute('data-coat-picker')){
  const coatPicker=button.hasAttribute('data-coat-picker');
  document.querySelector('#expression-title').textContent=coatPicker?'猫の種類（毛色）':'猫の表情';
  document.querySelector('#expression-options').setAttribute('aria-label',coatPicker?'猫の毛色の選択肢':'猫の表情の選択肢');
  document.querySelector('#expression-description').textContent=coatPicker?'好きな毛色を、ひとつ。':'今の気分に合う表情を、ひとつ。';
  document.querySelector('#expression-options').innerHTML=(coatPicker?CatFaces.coats:CatFaces.options).map(option=>`<button type="button" class="expression-choice ${(coatPicker?state.coat:state.expression)===option.id?'selected':''}" data-${coatPicker?'coat':'expression'}="${option.id}" aria-pressed="${(coatPicker?state.coat:state.expression)===option.id}"><span class="avatar peach">${CatFaces.svg(coatPicker?state.expression:option.id,coatPicker?option.id:state.coat)}</span><span>${option.label}</span></button>`).join('');
  document.querySelector('#expression-error').textContent='';document.querySelector('#expression-dialog').showModal();syncBusy();
 }
 if(button.dataset.expression||button.dataset.coat){const coatPicker=Boolean(button.dataset.coat);const value=button.dataset.coat||button.dataset.expression;const expression=coatPicker?state.expression:value;const coat=coatPicker?value:state.coat;if(!(coatPicker?CatFaces.coats:CatFaces.options).some(option=>option.id===value))return;void mutation(async()=>{
  try{if(coatPicker)await OyasumiAPI.setCatCoat(coat);else await OyasumiAPI.setCatExpression(expression);}
  catch(error){document.querySelector('#expression-error').textContent=['PGRST202','PGRST204','42703'].includes(error.code)?'猫の保存機能は準備中です。':'保存できませんでした。もう一度お試しください。';return;}
  state.expression=expression;shared.expression=expression;state.coat=coat;shared.coat=coat;for(const post of [...state.posts,...shared.feed])if(post.self){post.expression=expression;post.coat=coat;}
  document.querySelector('#expression-dialog').close();render();await refreshAfterSave();toast(coatPicker?'猫の毛色を保存しました':'猫の表情を保存しました');
 });return;}
});
document.addEventListener('change',event=>{if(event.target.id==='dark-switch'){state.light=!event.target.checked;save();render();}});
document.querySelector('#cancel-name').addEventListener('click',()=>document.querySelector('#nickname-dialog').close());
document.querySelector('#cancel-expression').addEventListener('click',()=>document.querySelector('#expression-dialog').close());
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
  state.name=name;for(const p of [...state.posts,...shared.feed])if(p.self)p.name=name;
  save();document.querySelector('#nickname-dialog').close();render();await refreshAfterSave();toast('名前を保存しました');
 });
});
render();
void ensureConnection().catch(()=>{if(view!=='rest')toast('共有データに接続できません。');});
function refreshDayScene() { if(view==='home'&&(document.querySelector('.day-hero')?.dataset.dayBucket||null)!==(DayCats.current()?.key||null))renderPreservingPosition(); }
setInterval(()=>{if(view==='rest')return;if(!document.hidden)refreshDayScene();if(!document.hidden&&!busy)void ensureConnection().then(()=>refreshShared()).catch(()=>{});},30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshDayScene();if(!document.hidden&&!busy&&(view==='rest'||view==='sleep')&&SleepFlow.morningDue(state.lastSleep,state.morningDays))go('morning');if(view==='rest')return;if(!document.hidden&&!busy)void ensureConnection().then(()=>refreshShared()).catch(()=>toast('最新の投稿を取得できませんでした。'));});
window.addEventListener('online',()=>{if(view==='rest')return;if(!busy)void ensureConnection().then(()=>refreshShared()).catch(()=>{});});
