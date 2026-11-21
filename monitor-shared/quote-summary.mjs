import {INSTRUMENTS,validEntry,calculate} from './market.mjs';

const time=value=>new Date(value).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',hour12:false})+' JST';
const signed=(value,format)=>(value>0?'+':value<0?'−':'')+format(Math.abs(value));
for(const root of document.querySelectorAll('[data-quote-summary]')) {
  const id=root.dataset.quoteSummary,definition=INSTRUMENTS[id];
  if(!definition||id==='usdjpy')continue;
  const money=new Intl.NumberFormat('ja-JP',{style:'currency',currency:definition.currency,maximumFractionDigits:4});
  const yen=new Intl.NumberFormat('ja-JP',{style:'currency',currency:'JPY',maximumFractionDigits:0});
  let entry=null,fx=null,busy=false,failed=false;
  function render() {
    root.replaceChildren();root.dataset.direction='flat';root.style.removeProperty('--quote-tint');
    const quote=entry?.quote,stale=failed||entry?.result!=='success'||!entry?.lastSuccessAt||Date.now()-Date.parse(entry.lastSuccessAt)>96*3600000;
    const card=document.createElement('div');card.className='quote-summary-card';
    const price=document.createElement('p');price.className='quote-summary-price';price.setAttribute('aria-label','現在株価（'+definition.currency+'）');
    const number=document.createElement('strong'),currency=document.createElement('small');number.textContent=quote?money.format(quote.price):'—';currency.textContent=definition.currency;price.append(number,currency);card.append(price);
    if(quote) {
      const change=quote.price-quote.previousClose,percent=change/quote.previousClose*100;
      root.dataset.direction=change>0?'up':change<0?'down':'flat';
      // One percent point adds 1.8% opacity; cap at 10 points for readability.
      root.style.setProperty('--quote-tint',String(0.04+Math.min(Math.abs(percent),10)*0.018));
      function line(label,value,className){const item=document.createElement('p'),caption=document.createElement('span'),number=document.createElement('strong');item.className=className;caption.textContent=label;number.textContent=value;item.append(caption,number);card.append(item);}
      line('前日比',signed(change,n=>money.format(n))+'（'+signed(percent,n=>n.toFixed(2)+'％')+'）','quote-summary-change');
      const holdings=document.querySelector('[data-holdings="'+id+'"]');
      let unitCost=holdings?.querySelector('.holding-cost')?.value,shares=holdings?.querySelector('.holding-shares')?.value;
      if(unitCost===undefined||shares===undefined){try{const saved=JSON.parse(localStorage.getItem('oyasumi:portfolio:v1:'+definition.symbol)||'null');if(saved?.currency==='JPY'){unitCost=saved.unitCost;shares=saved.shares;}}catch{}}
      const result=calculate(unitCost,shares,quote,id==='joby'?fx?.quote:null);
      if(result){
        line('保有損益',signed(result.pnl,n=>yen.format(n))+'（'+signed(result.percent,n=>n.toFixed(2)+'％')+'）','quote-summary-pnl '+(result.pnl>0?'quote-summary-profit':result.pnl<0?'quote-summary-loss':''));
      }
    }
    root.append(card);
    const note=document.createElement('p');note.className='quote-summary-note';
    const fxStale=id==='joby'&&(!fx?.quote||fx.result!=='success'||Date.now()-Date.parse(fx.lastSuccessAt)>96*3600000);
    note.textContent=quote?(stale||fxStale?'古いデータまたは取得不可（取得失敗・時間経過）。':'取得済み（リアルタイムではありません）。')+'株価時点：'+time(quote.asOf)+' ／ 株価 最終取得成功：'+time(entry.lastSuccessAt)+(id==='joby'?(fx?.quote?' ／ 為替時点：'+time(fx.quote.asOf)+' ／ 為替 最終取得成功：'+time(fx.lastSuccessAt):' ／ 為替を取得できません。円建て損益は計算できません。'):'')+'。前日比と保有損益は別の指標です。': '株価を取得できません。';
    root.append(note);root.setAttribute('aria-busy','false');
  }
  async function load() {
    if(busy)return;busy=true;root.setAttribute('aria-busy','true');
    try {
      const response=await fetch(new URL('./data/quotes.json',import.meta.url),{cache:'no-store',credentials:'omit'});
      if(!response.ok)throw Error('取得失敗');
      const data=await response.json();
      if(data.version!==1||!validEntry(data.entries?.[id],id))throw Error('必須項目を確認できません');
      entry=data.entries[id];fx=validEntry(data.entries?.usdjpy,'usdjpy')?data.entries.usdjpy:null;failed=false;render();
    }catch{failed=true;render();}finally{busy=false;}
  }
  document.addEventListener('input',event=>{if(event.target.closest('[data-holdings="'+id+'"]'))render();});
  document.addEventListener('click',event=>{if(event.target.closest('[data-holdings="'+id+'"] .holding-clear'))render();if(event.target.closest('[data-holdings="'+id+'"] .holding-reload'))void load();});
  setInterval(()=>{if(document.visibilityState==='visible')void load();},30*60000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void load();});
  void load();
}
