const STORAGE_KEY = 'oyasumi-v1';
const POST_OPTIONS = [
 { id: 'awake', text: 'まだ寝れない…', sleeping: false },
 { id: 'sleep', text: 'もう寝るよ 🌙', sleeping: true },
 { id: 'try-sleep', text: '眠れないけど寝てみる 💤', sleeping: true },
 { id: 'early-sleep', text: 'お先に寝ます 👋', sleeping: true }
];
const REACTION_OPTIONS = [{ id: 'goodnight', text: 'おやすみ 🌙' }, { id: 'dream', text: 'いい夢を 💤' }, { id: 'tomorrow', text: 'また明日 👋' }];
const isSleeping = status => POST_OPTIONS.some(option => option.id === status && option.sleeping);
const freshState = () => ({ name: 'ともを', posts: [], reactions: {}, morningDays: [], light: false });
let state;
try { state = { ...freshState(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; if (!Array.isArray(state.posts) || !Array.isArray(state.morningDays)) state = freshState(); } catch { state = freshState(); }
// Keep existing posts and migrate the first prototype's single reaction to a preset.
state.posts = state.posts.filter(post => post && POST_OPTIONS.some(option => option.id === post.status));
if (Array.isArray(state.reactions)) state.reactions = Object.fromEntries(state.reactions.map(id => [id, 'goodnight']));
if (!state.reactions || typeof state.reactions !== 'object') state.reactions = {};
state.reactions = Object.fromEntries(Object.entries(state.reactions).filter(([, choice]) => REACTION_OPTIONS.some(option => option.id === choice)));
const savedName = NicknameRules.validate(state.name);
state.name = savedName.error ? freshState().name : savedName.name;
let view = 'home', filter = 'all', toastTimer;
const app = document.querySelector('#app');
const nav = document.querySelector('#navigation');
const icons = { home: '<path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9"/>', timeline: '<rect x="4" y="3" width="16" height="16" rx="3"/><path d="m8 19-2 3v-4M8 8h8M8 12h6"/>', stats: '<path d="M5 21V12h3v9M11 21V4h3v17M17 21V8h3v13"/>', profile: '<circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3Z"/>' };
const escapeHTML = text => String(text).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const timeLabel = date => new Date(date).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false });
const dayKey = () => new Date().toLocaleDateString('sv-SE');
const seeds = [ ['たろう','sleep','🐱','slate',12],['みき','awake','🐱','lilac',8],['ハル','sleep','🐱','peach',6],['sora','awake','🐱','slate',4],['なつ','sleep','🐱','peach',10],['K','awake','🐱','lilac',3] ].map((p,i) => ({ id:'sample-'+i,name:p[0],status:p[1],avatar:p[2],color:p[3],count:p[4],time:Date.now()-(i+1)*60000,sample:true }));
function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { toast('端末に保存できませんでした。この画面では操作できます。'); } }
function toast(message) { const el=document.querySelector('#toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),2800); }
const allPosts = () => [...state.posts.map(p => ({...p,name:state.name})), ...seeds];
const statusText = status => POST_OPTIONS.find(option => option.id === status)?.text || '';
const avatar = p => `<span class="avatar ${p.color || 'peach'}" aria-hidden="true"><img src="cat.svg" alt=""></span>`;
const header = (title='おやすみ', back=false) => `<header class="header">${back?'<button class="icon-button" data-view="home" aria-label="ホームに戻る">‹</button>':'<span class="eyebrow">GOOD NIGHT</span>'}<h1 class="wordmark">${title}</h1><button class="icon-button" data-view="settings" aria-label="設定">⚙</button></header>`;
function navigation() { const items=[['home','ホーム'],['timeline','タイムライン'],['stats','今夜の様子'],['profile','マイページ']];nav.innerHTML=items.map(([id,label])=>`<button data-view="${id}" class="${view===id?'active':''}" ${view===id?'aria-current="page"':''}><svg viewBox="0 0 24 24" aria-hidden="true">${icons[id]}</svg>${label}</button>`).join('');nav.hidden=view==='sleep'; }
function countCard() { return `<section class="card count-card"><h2>今夜まだ起きてる人</h2><div class="count"><span class="people" aria-hidden="true">♟</span>${934+(state.posts[0]?.status==='awake'?1:0)}<small> 人</small></div><p class="muted">みんな、そろそろ寝始めています 🌙</p></section>`; }
function actions() { return `<div class="status-actions"><button class="status-button awake" data-post="awake"><span class="status-symbol" aria-hidden="true">😴</span><span><strong>まだ寝れない…</strong><small>（いま起きてる）</small></span></button><button class="status-button sleep" data-post="sleep"><span class="status-symbol moon-symbol" aria-hidden="true">☾</span><span><strong>もう寝るよ 🌙</strong><small>（おやすみする）</small></span></button><div class="extra-post-options">${POST_OPTIONS.slice(2).map(option=>`<button class="extra-post-button" data-post="${option.id}">${option.text}</button>`).join('')}</div><p class="choice-note">ひとつ選ぶだけ。寝る報告のあとは、スマホを置いて。</p></div>`; }
function chart() { return `<section class="card chart"><h2>今夜の推移</h2><svg viewBox="0 0 320 160" role="img" aria-label="サンプル：起きている人数は22時の1320人から1時の187人へ減少"><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#779aff" stop-opacity=".25"/><stop offset="1" stop-color="#779aff" stop-opacity="0"/></linearGradient></defs><path class="grid" d="M42 20h266M42 58h266M42 96h266M42 134h266"/><text x="0" y="24">1,500</text><text x="0" y="62">1,000</text><text x="10" y="100">500</text><text x="26" y="138">0</text><path class="area" d="M44 36 87 56 131 70 175 88 219 104 263 118 306 128V134H44Z"/><path class="curve" d="M44 36 87 56 131 70 175 88 219 104 263 118 306 128"/><g fill="#a6bcff"><circle cx="44" cy="36" r="3"/><circle cx="87" cy="56" r="3"/><circle cx="131" cy="70" r="3"/><circle cx="175" cy="88" r="3"/><circle cx="219" cy="104" r="3"/><circle cx="263" cy="118" r="3"/><circle cx="306" cy="128" r="3"/></g><text x="30" y="156">22時</text><text x="119" y="156">23時</text><text x="212" y="156">0時</text><text x="288" y="156">1時</text></svg><p class="sample-tag">サンプルデータ</p></section>`; }
function home() { return `${header()}${countCard()}${actions()}<section><div class="section-heading"><h2>みんなの様子</h2><small><span class="live-dot"></span>今夜のタイムライン</small></div><div class="mini-feed">${allPosts().slice(0,5).map(p=>`<div class="mini-row">${avatar(p)}<span class="mini-name">${escapeHTML(p.name)}</span><span class="mini-status ${isSleeping(p.status)?'sleeping':''}">${statusText(p.status)}</span><time datetime="${new Date(p.time).toISOString()}">${timeLabel(p.time)}</time></div>`).join('')}</div><p class="sample-tag">ほかの人の投稿はサンプルです</p></section><p class="quiet-note">眠れない夜も、ここではひとりじゃない。</p>`; }
function reactionButtons(post) {
 return `<div class="reaction-options" role="group" aria-label="${escapeHTML(post.name)}へのリアクション">${REACTION_OPTIONS.map(option => {
  const selected = state.reactions[post.id] === option.id;
  const count = (option.id === 'goodnight' ? post.count : 0) + Number(selected);
  return `<button class="reaction ${selected?'selected':''}" data-react="${post.id}" data-reaction="${option.id}" aria-pressed="${selected}" aria-label="${escapeHTML(post.name)}に${option.text}のリアクション">${option.text}<span class="reaction-count">${count}</span></button>`;
 }).join('')}</div>`;
}
function timeline() {
 const posts = allPosts().filter(post => filter==='all' || (filter==='sleep' ? isSleeping(post.status) : post.status==='awake'));
 return `${header()}<div class="tabs" aria-label="投稿の絞り込み">${[['all','みんな'],['awake','まだ起きてる'],['sleep','もう寝た']].map(([key,label])=>`<button data-filter="${key}" class="${filter===key?'active':''}" aria-pressed="${filter===key}">${label}</button>`).join('')}</div><div>${posts.length?posts.map(p=>`<article class="post">${avatar(p)}<div class="post-body"><div class="post-top"><h2 class="post-name">${escapeHTML(p.name)}${!p.sample?'<span class="self-tag">あなた</span>':''}</h2>${!p.sample?`<button class="text-button" data-delete="${p.id}" aria-label="自分の投稿を削除">削除</button>`:''}</div><p class="post-text ${p.status==='awake'?'awake-text':''}">${statusText(p.status)}</p><div class="post-bottom"><time datetime="${new Date(p.time).toISOString()}">${timeLabel(p.time)}</time></div>${reactionButtons(p)}</div></article>`).join(''):'<p class="empty">まだ投稿がありません。<br>ホームから今の気持ちを伝えてみましょう。</p>'}</div><p class="sample-tag">ほかの人の投稿はサンプルです</p>`;
}
function sleep() { return `<section class="sleep-screen"><div class="sleep-art" aria-hidden="true"><span class="big-moon">☾</span><span class="star one">✦</span><span class="star two">✦</span><span class="star three">✦</span><span class="sleep-cat"><img src="cat.svg" alt=""></span></div><h1>おやすみなさい<br>${escapeHTML(state.name)}さん 🌙</h1><div class="card">今夜は <strong>23</strong> 人と一緒に<br>おやすみしました。</div><p class="rest-message">今日もお疲れさまでした。<br>ゆっくり休んでくださいね。</p><button class="cream-button" data-view="morning">また明日 ☀️</button><p class="quiet-note">これで今日のSNSは終了です。<br>スマホを置いて、ゆっくり休みましょう。</p><button class="text-button" data-view="home">ホームに戻る</button><p class="sample-tag">一緒に寝る人数はサンプルです</p></section>`; }
function morning() { const recorded=state.morningDays.includes(dayKey());return `<section class="morning"><div class="sunrise" aria-hidden="true">▂ ▅ ▃ ▆ ▄ ▂ ▅</div><h1>おはようございます<br>${escapeHTML(state.name)}さん ☀️</h1><div class="card">昨夜は <strong>23</strong> 人と一緒に<br>おやすみしました。<p aria-hidden="true">🐱 🐱 🐱 🐱 🐱</p></div><p>よく眠れましたか？<br>今日も良い一日になりますように！</p><button class="cream-button" data-morning ${recorded?'disabled':''}>${recorded?'おはようを記録しました ✓':'おはよう ☀️ を記録する'}</button><p class="muted">また今夜、ここで会いましょう。</p><p class="sample-tag">一緒に寝る人数はサンプルです</p></section>`; }
function profile() { return `${header()}<div class="profile-banner"><span class="avatar peach" aria-hidden="true"><img src="cat.svg" alt=""></span><div><h1>${escapeHTML(state.name)}</h1><p>今夜も、自分のペースで。</p></div></div><div class="stats-grid"><div class="stat">おやすみを伝えた回数<strong>${state.posts.filter(p=>isSleeping(p.status)).length}<small> 回</small></strong></div><div class="stat">おはようした日数<strong>${state.morningDays.length}<small> 日</small></strong></div></div><div class="section-heading"><h2>最近の記録</h2></div>${state.posts.length?state.posts.slice(0,12).map(p=>`<div class="history-row"><span>${new Date(p.time).toLocaleDateString('ja-JP',{month:'numeric',day:'numeric'})}</span><span class="history-status">${statusText(p.status)}</span><time>${timeLabel(p.time)}</time></div>`).join(''):'<div class="card empty">まだ記録はありません。<br>今夜の「おやすみ」から始めましょう。</div>'}<p class="quiet-note">あなたの記録は、この端末に保存されます。</p>`; }
function settings() { return `${header('設定',true)}<section class="settings-section"><h2>プロフィール</h2><button class="setting-row" data-name><span>ニックネーム</span><span class="setting-value">${escapeHTML(state.name)} ›</span></button><div class="setting-row"><span>アイコン</span><span aria-label="猫のアイコン">🐱</span></div></section><section class="settings-section"><h2>表示設定</h2><label class="setting-row"><span>ダークモード</span><input class="switch" type="checkbox" id="dark-switch" ${!state.light?'checked':''}></label><div class="setting-row"><span>言語</span><span class="setting-value">日本語</span></div></section><section class="settings-section"><h2>この初期版について</h2><div class="card settings-info">投稿とリアクションは、この端末内だけに保存されます。ほかの人の投稿・人数・今夜の推移はサンプルです。<br><br>実際のユーザーとの共有や通知は、今後の対応予定です。</div></section>`; }
function render() { document.body.classList.toggle('light-mode',state.light&&view!=='morning');app.innerHTML=({home,timeline,sleep,morning,profile,settings,stats:()=>`${header()}${countCard()}${actions()}${chart()}`}[view]||home)();navigation(); }
function go(next) { view=next;render();window.scrollTo(0,0); }
document.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;
 if(button.dataset.view){go(button.dataset.view);return;}
 if(button.dataset.post){const status=button.dataset.post;if(!POST_OPTIONS.some(option=>option.id===status))return;const last=state.posts[0];if(last&&last.status===status&&Date.now()-last.time<60000){go(isSleeping(status)?'sleep':'timeline');toast('今の気持ちは、もう届いています');return;}state.posts.unshift({id:'post-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),status,time:Date.now(),count:0,color:'peach',avatar:'🐱'});save();go(isSleeping(status)?'sleep':'timeline');if(status==='awake')toast('今の気持ちを伝えました');return;}
 if(button.dataset.filter){filter=button.dataset.filter;render();return;}
 if(button.dataset.react){const id=button.dataset.react,choice=button.dataset.reaction;if(!REACTION_OPTIONS.some(option=>option.id===choice)||!allPosts().some(post=>post.id===id))return;if(state.reactions[id]===choice)delete state.reactions[id];else state.reactions[id]=choice;save();render();return;}
 if(button.dataset.delete){state.posts=state.posts.filter(p=>p.id!==button.dataset.delete);delete state.reactions[button.dataset.delete];save();render();toast('投稿を削除しました');return;}
 if(button.hasAttribute('data-morning')){if(!state.morningDays.includes(dayKey()))state.morningDays.push(dayKey());save();render();toast('おはよう。今日も良い一日を ☀️');return;}
 if(button.hasAttribute('data-name')){document.querySelector('#nickname').value=state.name;clearNicknameError();document.querySelector('#nickname-dialog').showModal();document.querySelector('#nickname').focus();}
});
document.addEventListener('change',event=>{if(event.target.id==='dark-switch'){state.light=!event.target.checked;save();render();}});
document.querySelector('#cancel-name').addEventListener('click',()=>document.querySelector('#nickname-dialog').close());
function clearNicknameError() { document.querySelector('#nickname-error').textContent='';document.querySelector('#nickname').removeAttribute('aria-invalid'); }
document.querySelector('#nickname').addEventListener('input',clearNicknameError);
document.querySelector('#nickname-form').addEventListener('submit',event=>{
 event.preventDefault();
 const input=document.querySelector('#nickname');
 const result=NicknameRules.validate(input.value);
 if(result.error){document.querySelector('#nickname-error').textContent=result.error;input.setAttribute('aria-invalid','true');input.focus();return;}
 state.name=result.name;save();document.querySelector('#nickname-dialog').close();render();toast('名前を保存しました');
});
save();
render();
