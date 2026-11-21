import {INSTRUMENTS,validEntry,calculate} from './market.mjs';
const yen=new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY',maximumFractionDigits:0});
const decimal=new Intl.NumberFormat('ja-JP',{maximumFractionDigits:4});
const usd=new Intl.NumberFormat('ja-JP',{style:'currency',currency:'USD',maximumFractionDigits:4});
const when=v=>v?new Date(v).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',hour12:false})+' JST':'未取得';
const sign=(n,format)=> (n>0?'+':n<0?'−':'')+format(Math.abs(n));
for(const root of document.querySelectorAll('[data-holdings]')) {
  const id=root.dataset.holdings,d=INSTRUMENTS[id];if(!d||id==='usdjpy')continue;
  const key='oyasumi:portfolio:v1:'+d.symbol;
  root.innerHTML=`<h2>株価・保有株式</h2><div class="holding-market"><p class="holding-state" role="status">株価を読み込んでいます。</p><div class="holding-quote"></div><p class="holding-dates"></p><button type="button" class="holding-reload">株価データを再読込</button><p class="holding-caption">通常取引の取得済みデータ。市場時間帯に約30分間隔で取得（遅延・休場あり）。再読込は公開データの読み直しです。<a class="holding-provider" target="_blank" rel="noopener noreferrer">Yahoo Finance</a></p></div><div class="holding-private"><h3>保有分の評価・損益（円建て）</h3><div class="holding-inputs"><label>取得単価（1株あたり・円）<input class="holding-cost" type="text" inputmode="decimal" autocomplete="off" maxlength="16" placeholder="未入力"></label><label>保有株数（株）<input class="holding-shares" type="text" inputmode="decimal" autocomplete="off" maxlength="16" placeholder="未入力"></label></div><p class="holding-help">両方を正の数で入力すると表示します（小数6桁まで）。</p><div class="holding-results" hidden aria-live="polite"></div><p class="holding-storage">入力情報はこの端末のブラウザ内だけに自動保存します。外部送信・GitHub保存は行いません。</p><button type="button" class="holding-clear">この銘柄の入力を消去</button><p class="holding-caption">手数料・税金を含まない参考値。${id==='joby'?'USD株価×USD/JPYで円換算し、円での取得単価と比較します。為替変動も損益に含みます。':''}</p></div>`;
  const $=s=>root.querySelector(s),cost=$('.holding-cost'),shares=$('.holding-shares'),results=$('.holding-results'),state=$('.holding-state');
  $('.holding-provider').href='https://finance.yahoo.com/quote/'+encodeURIComponent(d.symbol)+'/';
  let data=null,loadFailed=false;
  const storageError=()=>{$('.holding-storage').textContent='端末内保存を利用できません。この画面内でのみ計算します。';};
  try {const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved?.currency==='JPY'){if(typeof saved.unitCost==='string')cost.value=saved.unitCost.slice(0,16);if(typeof saved.shares==='string')shares.value=saved.shares.slice(0,16);}}catch{storageError();}
  function draw() {
    const entry=data?.entries?.[id],fx=data?.entries?.usdjpy,q=entry?.quote,rate=fx?.quote;
    const stale=loadFailed || entry?.result!=='success' || (id==='joby' && fx?.result!=='success') || [entry,...(id==='joby'?[fx]:[])].some(e=>!e?.lastSuccessAt || Date.now()-Date.parse(e.lastSuccessAt)>96*3600000);
    state.textContent=!q?'株価を取得できません。保有損益は計算できません。':id==='joby'&&!rate?'為替を取得できません。円換算・保有損益は計算できません。':stale?'取得失敗または取得から時間が経過：古いデータで参考計算しています。':'取得済み株価（リアルタイムではありません）';
    state.classList.toggle('holding-stale',stale);
    const area=$('.holding-quote');area.replaceChildren();
    function line(label,value){const p=document.createElement('p'),b=document.createElement('strong');p.append(label+'：');b.textContent=value;p.append(b);area.append(p);}
    if(q){line('株価（'+q.currency+'）',q.currency==='USD'?usd.format(q.price):yen.format(q.price));const change=q.price-q.previousClose;line('株価の前日比（保有損益ではありません）',sign(change,n=>q.currency==='USD'?usd.format(n):yen.format(n))+' / '+sign(change/q.previousClose*100,n=>n.toFixed(2)+'％'));}
    if(id==='joby'&&rate){line('USD/JPY（1 USDあたり）',decimal.format(rate.price)+' 円');if(q)line('円換算株価（1株あたり）',decimal.format(Math.floor(q.price*rate.price))+' 円');}
    $('.holding-dates').textContent='株価時点：'+when(q?.asOf)+'\n株価 最終取得成功日時：'+when(entry?.lastSuccessAt)+'\n株価 取得試行日時：'+when(entry?.lastAttemptAt)+(id==='joby'?'\n為替時点：'+when(rate?.asOf)+'\n為替 最終取得成功日時：'+when(fx?.lastSuccessAt)+'\n為替 取得試行日時：'+when(fx?.lastAttemptAt):'');
    const calc=calculate(cost.value,shares.value,q,id==='joby'?rate:null);results.hidden=!calc;
    if(calc){results.replaceChildren();for(const [label,value] of [['評価額',yen.format(calc.value)],['取得総額',yen.format(calc.invested)],['含み損益',sign(calc.pnl,n=>yen.format(n))],['損益率',sign(calc.percent,n=>n.toFixed(2)+'％')]]){const p=document.createElement('p');p.textContent=label+'：'+value;if(label==='含み損益'||label==='損益率')p.className=calc.pnl>0?'holding-gain':calc.pnl<0?'holding-loss':'';results.append(p);}if(stale){const p=document.createElement('p');p.className='holding-stale';p.textContent='古いデータによる参考値';results.append(p);}}
  }
  function save(){try{localStorage.setItem(key,JSON.stringify({version:1,currency:'JPY',unitCost:cost.value,shares:shares.value}));}catch{storageError();}draw();}
  cost.addEventListener('input',save);shares.addEventListener('input',save);
  $('.holding-clear').addEventListener('click',()=>{cost.value=shares.value='';try{localStorage.removeItem(key);}catch{storageError();}draw();});
  async function load(){root.setAttribute('aria-busy','true');$('.holding-reload').disabled=true;try{const response=await fetch(new URL('./data/quotes.json',import.meta.url),{cache:'no-store',credentials:'omit'});if(!response.ok)throw Error('取得失敗');const body=await response.json();if(body.version!==1 || !validEntry(body.entries?.[id],id) || (id==='joby'&&!validEntry(body.entries?.usdjpy,'usdjpy')))throw Error('必須項目の欠落');data=body;loadFailed=false;}catch{loadFailed=true;}finally{draw();root.setAttribute('aria-busy','false');$('.holding-reload').disabled=false;}}
  $('.holding-reload').addEventListener('click',load);
  setInterval(()=>{if(document.visibilityState==='visible'&&root.getAttribute('aria-busy')!=='true')void load();},30*60000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&root.getAttribute('aria-busy')!=='true')void load();});
  void load();
}
