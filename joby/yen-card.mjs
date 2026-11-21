import {calculate} from '../monitor-shared/market.mjs';
import {yenQuote} from './yen-model.mjs';
const root=document.querySelector('[data-quote-summary="joby"]');
const time=v=>v?new Date(v).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',hour12:false})+' JST':'未取得';
const digits=new Intl.NumberFormat('ja-JP',{minimumFractionDigits:2,maximumFractionDigits:2});
const yen=n=>'¥'+digits.format(n),totalYen=n=>'¥'+new Intl.NumberFormat('ja-JP',{maximumFractionDigits:0}).format(n);
const signed=(n,format)=>(n>0?'+':n<0?'−':'')+format(Math.abs(n));
let data=null,history=null,dataFailed=false,historyFailed=false,busy=false;
function render(){
  if(!root)return;const view=yenQuote(data,history),{stock,fx,quote,rate,reference,price,change,percent}=view;
  const stale=dataFailed||historyFailed||stock?.result!=='success'||fx?.result!=='success'||history?.result!=='success'||[stock,fx].some(e=>!e?.lastSuccessAt||Date.now()-Date.parse(e.lastSuccessAt)>96*3600000);
  root.replaceChildren();root.dataset.direction=change>0?'up':change<0?'down':'flat';root.style.setProperty('--quote-tint',String(.04+Math.min(Math.abs(percent??0),10)*.018));
  const card=document.createElement('div');card.className='quote-summary-card';
  const priceLine=document.createElement('p');priceLine.className='quote-summary-price';priceLine.setAttribute('aria-label','現在株価（円換算）');const amount=document.createElement('strong');amount.textContent=price===null?'—':totalYen(Math.floor(price));priceLine.append(amount);card.append(priceLine);
  function line(label,value,className){const p=document.createElement('p'),caption=document.createElement('span'),number=document.createElement('strong');p.className=className;caption.textContent=label;number.textContent=value;p.append(caption,number);card.append(p);}
  line('前日比',change===null?'算出不可':signed(change,yen)+'（'+signed(percent,n=>n.toFixed(2)+'％')+'）','quote-summary-change');
  const holdings=document.querySelector('[data-holdings="joby"]'),cost=holdings?.querySelector('.holding-cost')?.value,shares=holdings?.querySelector('.holding-shares')?.value;
  const result=calculate(cost,shares,quote,rate);
  if(result)line('保有損益',signed(result.pnl,totalYen)+'（'+signed(result.percent,n=>n.toFixed(2)+'％')+'）','quote-summary-pnl '+(result.pnl>0?'quote-summary-profit':result.pnl<0?'quote-summary-loss':''));
  root.append(card);const note=document.createElement('p');note.className='quote-summary-note';
  const details=[stale?((fx?.result!=='success'?'為替取得失敗。':'')+(historyFailed||history?.result!=='success'?'前営業日の対応為替取得失敗。':'')+'取得失敗・時間経過：古いデータによる参考値です。'):'取得済み（リアルタイムではありません）。'];
  details.push(quote?'USD株価：$'+quote.price.toFixed(4).replace(/0+$/,'').replace(/\.$/,'')+' ／ 株価時点：'+time(quote.asOf)+' ／ 株価 最終取得成功：'+time(stock.lastSuccessAt):'USD株価を取得できません。');
  details.push(rate?'USD/JPY：'+rate.price+'円/USD ／ 為替時点：'+time(rate.asOf)+' ／ 為替 最終取得成功：'+time(fx.lastSuccessAt):'為替を取得できません。円換算できません。');
  details.push(reference?'前営業日終値：$'+reference.previousCloseUSD+' ／ 終値時点：'+time(reference.previousCloseAt)+' ／ 対応USD/JPY：'+reference.usdJpy+'円/USD（同時刻の1分足始値） ／ 前営業日円換算終値：'+yen(view.previous)+' ／ 対応為替 取得確認：'+time(reference.fxRetrievedAt):'前営業日終値に対応する為替を確認できないため、円建て前日比と背景の方向判定は行いません。');
  details.push('前日比には為替変動も含みます。保有損益とは別の指標です。');note.textContent=details.join('\n');note.style.whiteSpace='pre-line';root.append(note);root.setAttribute('aria-busy',String(busy));
}
async function load(){
  if(busy||!root)return;busy=true;root.setAttribute('aria-busy','true');
  async function read(url){const r=await fetch(url,{cache:'no-store',credentials:'omit'});if(!r.ok)throw Error('取得失敗');return r.json();}
  const [latest,past]=await Promise.allSettled([read(new URL('../monitor-shared/data/quotes.json',import.meta.url)),read(new URL('./data/yen-reference.json',import.meta.url))]);
  if(latest.status==='fulfilled'&&latest.value.version===1){const view=yenQuote(latest.value,null);if(view.stock&&view.fx){data=latest.value;dataFailed=false;}else dataFailed=true;}else dataFailed=true;
  if(past.status==='fulfilled'&&past.value.version===1&&Array.isArray(past.value.references)){history=past.value;historyFailed=false;}else historyFailed=true;
  busy=false;render();
}
if(root){document.addEventListener('input',e=>{if(e.target.closest('[data-holdings="joby"]'))render();});document.addEventListener('click',e=>{if(e.target.closest('[data-holdings="joby"] .holding-clear'))render();if(e.target.closest('[data-holdings="joby"] .holding-reload'))void load();});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void load();});setInterval(()=>{if(document.visibilityState==='visible')void load();},30*60000);void load();}
