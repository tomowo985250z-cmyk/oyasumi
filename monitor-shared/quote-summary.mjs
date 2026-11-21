import {INSTRUMENTS,validEntry} from './market.mjs';

const time=value=>new Date(value).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',hour12:false})+' JST';
const signed=(value,format)=>(value>0?'+':value<0?'−':'')+format(Math.abs(value));
for(const root of document.querySelectorAll('[data-quote-summary]')) {
  const id=root.dataset.quoteSummary,definition=INSTRUMENTS[id];
  if(!definition||id==='usdjpy')continue;
  const money=new Intl.NumberFormat('ja-JP',{style:'currency',currency:definition.currency,maximumFractionDigits:4});
  let entry=null,busy=false;
  function render(failed=false) {
    root.replaceChildren();root.dataset.direction='flat';root.style.removeProperty('--quote-tint');
    const quote=entry?.quote,stale=failed||entry?.result!=='success'||!entry?.lastSuccessAt||Date.now()-Date.parse(entry.lastSuccessAt)>96*3600000;
    if(quote) {
      const change=quote.price-quote.previousClose,percent=change/quote.previousClose*100;
      root.dataset.direction=change>0?'up':change<0?'down':'flat';
      // One percent point adds 1.8% opacity; cap at 10 points for readability.
      root.style.setProperty('--quote-tint',String(0.04+Math.min(Math.abs(percent),10)*0.018));
      const metrics=document.createElement('div');metrics.className='quote-summary-metrics';
      for(const [label,value] of [['株価（'+definition.currency+'）',money.format(quote.price)],['前日比',signed(change,n=>money.format(n))],['騰落率',signed(percent,n=>n.toFixed(2)+'％')]]) {
        const item=document.createElement('span'),caption=document.createElement('span'),number=document.createElement('strong');
        caption.textContent=label;number.textContent=value;item.append(caption,number);metrics.append(item);
      }
      root.append(metrics);
    }
    const note=document.createElement('p');note.className='quote-summary-note';
    note.textContent=quote?(stale?'古いデータ（取得失敗または取得から時間が経過）・':'取得済み・')+'株価時点：'+time(quote.asOf)+' ／ 最終取得成功：'+time(entry.lastSuccessAt)+'。前日比・騰落率は保有損益とは別です。': '株価を取得できません。';
    root.append(note);root.setAttribute('aria-busy','false');
  }
  async function load() {
    if(busy)return;busy=true;root.setAttribute('aria-busy','true');
    try {
      const response=await fetch(new URL('./data/quotes.json',import.meta.url),{cache:'no-store',credentials:'omit'});
      if(!response.ok)throw Error('取得失敗');
      const data=await response.json();
      if(data.version!==1||!validEntry(data.entries?.[id],id))throw Error('必須項目を確認できません');
      entry=data.entries[id];render();
    }catch{render(true);}finally{busy=false;}
  }
  setInterval(()=>{if(document.visibilityState==='visible')void load();},30*60000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void load();});
  void load();
}
