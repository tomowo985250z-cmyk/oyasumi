import {COMPANIES,holdingKey,portfolio,layoutTiles,tileTone} from './model.mjs';
import {validEntry} from '../monitor-shared/market.mjs';
import {fitTileLabels} from './labels.mjs';
const order=[...COMPANIES.map(company=>company.id),'heatmap'],map=document.getElementById('heatmap'),legend=document.getElementById('compact-labels');
const frames=new Map([...document.querySelectorAll('iframe')].map(frame=>[frame.dataset.company,frame]));
let current='canbas',quotes=null,history=null,quoteFailed=false,historyFailed=false,storageFailed=false,loading=false,raf=0;
let transition=null,swipeUntil=0,suppressClickUntil=0;
const yen=new Intl.NumberFormat('ja-JP',{maximumFractionDigits:0}),compactYen=new Intl.NumberFormat('ja-JP',{notation:'compact',maximumFractionDigits:1});
const money=value=>value===null?'評価額 —':'¥'+yen.format(value),smallMoney=value=>value===null?'評価額 —':'¥'+compactYen.format(value);
const rate=value=>value===null?'騰落率 —':(value>0?'+':value<0?'−':'')+Math.abs(value).toFixed(2)+'％';
const textMeasure=document.createElement('canvas').getContext('2d'),textFamily=getComputedStyle(document.body).fontFamily;
function measure(text,size,weight){textMeasure.font=weight+' '+size+'px '+textFamily;return textMeasure.measureText(text).width;}
function holdings(){
  const values={};storageFailed=false;for(const company of COMPANIES){
    const doc=frames.get(company.id)?.contentDocument,live=doc?.querySelector('.holding-shares');
    try{const saved=JSON.parse(localStorage.getItem(holdingKey(company.id))||'null'),unavailable=doc?.querySelector('.holding-storage')?.textContent.includes('利用できません');values[company.id]=unavailable&&live?live.value:saved?.currency==='JPY'?saved.shares:'';if(unavailable)storageFailed=true;}catch{storageFailed=true;values[company.id]=live?.value??'';}
  }return values;
}
function render(){
  if(current!=='heatmap')return;
  const view=portfolio(quotes,history,holdings()),width=map.clientWidth,height=map.clientHeight;if(!width||!height)return;
  document.getElementById('map-mode').textContent=view.mode==='weighted'?'保有時価の構成比':view.mode==='empty'?'保有なし・均等表示':'株価・為替不足・面積比未算出';
  document.getElementById('map-total').textContent=view.total===null?'合計 —':'合計 ¥'+yen.format(view.total);
  const rectangles=layoutTiles(view.tiles,width,height).map(rect=>({...rect,labels:fitTileLabels(rect.width,rect.height,{name:rect.name,short:rect.short,rate:rate(rect.percent),value:money(rect.value),compactValue:smallMoney(rect.value)},measure)})),tiny=rectangles.some(rect=>rect.labels.count<3);
  legend.hidden=!tiny;legend.style.gridTemplateColumns='repeat('+view.tiles.length+',minmax(0,1fr))';legend.replaceChildren();map.replaceChildren();
  for(const rect of rectangles){
    const tone=tileTone(rect.percent),tile=document.createElement('button');
    tile.className='tile '+tone.direction+(rect.labels.count===0?' tiny':'');tile.dataset.company=rect.id;tile.dataset.share=String(rect.share);
    Object.assign(tile.style,{left:rect.x/width*100+'%',top:rect.y/height*100+'%',width:rect.width/width*100+'%',height:rect.height/height*100+'%',padding:rect.labels.padding+'px',gap:rect.labels.gap+'px'});tile.style.setProperty('--tone',tone.opacity);
    const label=rect.name+'、'+rate(rect.percent)+'、'+money(rect.value)+'、構成比'+(rect.share*100).toFixed(2)+'％';tile.setAttribute('aria-label',label);tile.title=label;
    for(const [i,className]of ['tile-name','tile-rate','tile-value'].entries()){const row=rect.labels.rows[i],span=document.createElement('span');span.className=className;span.textContent=row.text;span.style.fontSize=row.size+'px';span.hidden=!row.visible;tile.append(span);}
    tile.addEventListener('click',()=>select(rect.id));map.append(tile);
    if(tiny){const button=document.createElement('button');button.className=tone.direction;button.setAttribute('aria-label',label);const name=document.createElement('span'),percent=document.createElement('strong'),value=document.createElement('span');name.textContent=rect.short;percent.textContent=rate(rect.percent);value.textContent=smallMoney(rect.value);button.append(name,percent,value);button.addEventListener('click',()=>select(rect.id));legend.append(button);}
  }
  const states=[];if(view.mode==='empty')states.push('株数未入力・0株のため均等表示');if(view.mode==='unavailable')states.push('価格未取得のため保有銘柄を仮の均等面積で表示');if(quoteFailed||view.stale||historyFailed||history?.result==='failed')states.push('古い株価・為替による参考表示');if(view.rateMissing)states.push('一部の騰落率を確認できません');if(storageFailed)states.push('端末内保存を利用できません');
  states.push('赤：上昇／緑：下落・円建て前日比');document.getElementById('map-status').textContent=states.join('。');map.setAttribute('aria-busy',String(loading));
}
function scheduleRender(){cancelAnimationFrame(raf);raf=requestAnimationFrame(render);}
function resetScroll(frame){
  const reset=()=>{if(current!==frame.dataset.company||frame.closest('.screen').hidden)return;const doc=frame.contentDocument;frame.contentWindow?.scrollTo({left:0,top:0,behavior:'instant'});if(doc?.scrollingElement){doc.scrollingElement.scrollTop=0;doc.scrollingElement.scrollLeft=0;}};
  requestAnimationFrame(()=>{reset();requestAnimationFrame(reset);});
}
function select(id,updateURL=true){
  if(!order.includes(id))return;const previous=current;current=id;
  for(const tab of document.querySelectorAll('[role=tab]')){const active=tab.dataset.screen===id;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;document.getElementById('screen-'+tab.dataset.screen).hidden=!active;}
  if(id!=='heatmap'){const frame=frames.get(id);if(!frame.hasAttribute('src'))frame.src='../'+id+'/';resetScroll(frame);}
  else scheduleRender();
  if(previous!==id){
    transition?.cancel();swipeUntil=performance.now()+180;
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
      const direction=order.indexOf(id)>order.indexOf(previous)?1:-1;
      transition=document.getElementById('screen-'+id).animate([{transform:'translateX('+direction*18+'px)',opacity:.75},{transform:'translateX(0)',opacity:1}],{duration:180,easing:'cubic-bezier(.22,.61,.36,1)'});
      transition.onfinish=()=>{if(id!=='heatmap')resetScroll(frames.get(id));};
    }
  }
  if(updateURL&&location.hash!=='#'+id)window.history.replaceState(null,'','#'+id);
}
function attachSwipe(doc){
  let start=null;
  doc.addEventListener('pointerdown',event=>{start=null;if(!event.isPrimary||(event.pointerType==='mouse'&&event.button!==0))return;suppressClickUntil=0;if(performance.now()<swipeUntil||event.target.closest('input,textarea,select,[contenteditable]:not([contenteditable=false])'))return;start={x:event.clientX,y:event.clientY,at:performance.now(),id:event.pointerId,axis:null};},{passive:true});
  const move=event=>{
    if(!start||event.pointerId!==start.id)return;
    const dx=event.clientX-start.x,x=Math.abs(dx),y=Math.abs(event.clientY-start.y);
    if(!start.axis&&Math.max(x,y)>=10){if(x>y*1.2)start.axis='x';else if(y>=x)start.axis='y';}
    if(start.axis!=='x')return;
    if(event.cancelable)event.preventDefault();
    if(x>=24&&x>y*1.2&&performance.now()-start.at<1200){
      start=null;suppressClickUntil=performance.now()+400;
      const next=order.indexOf(current)+(dx<0?1:-1);if(next>=0&&next<order.length)select(order[next]);
    }
  };
  doc.addEventListener('pointermove',move,{passive:false});
  doc.addEventListener('pointercancel',()=>{start=null;},{passive:true});
  doc.addEventListener('pointerup',event=>{move(event);start=null;},{passive:false});
  doc.addEventListener('click',event=>{if(performance.now()<suppressClickUntil){event.preventDefault();event.stopImmediatePropagation();}},true);
}
for(const [id,frame]of frames){frame.addEventListener('load',()=>{const doc=frame.contentDocument;if(!doc)return;const link=doc.createElement('link');link.rel='stylesheet';link.href=new URL('./embedded.css?v=2',import.meta.url).href;doc.head.append(link);
  resetScroll(frame);const pending=()=>['#monitor','[data-holdings]','[data-quote-summary]'].some(selector=>doc.querySelector(selector)?.getAttribute('aria-busy')==='true');if(pending()){const settled=new MutationObserver(()=>{if(!pending()){settled.disconnect();resetScroll(frame);}});settled.observe(doc.body,{subtree:true,attributes:true,attributeFilter:['aria-busy']});}
  const summary=doc.querySelector('[data-quote-summary]');if(summary){const normalizePrice=()=>{const price=summary.querySelector('.quote-summary-price strong');if(price?.textContent.includes('￥'))price.textContent=price.textContent.replaceAll('￥','¥');};new MutationObserver(normalizePrice).observe(summary,{subtree:true,childList:true,characterData:true});normalizePrice();}
  attachSwipe(doc);doc.addEventListener('input',event=>{if(event.target.closest('[data-holdings]'))scheduleRender();});doc.addEventListener('click',event=>{if(event.target.closest('.holding-clear'))scheduleRender();if(event.target.closest('.holding-reload'))void load();});});}
for(const tab of document.querySelectorAll('[role=tab]')){tab.addEventListener('click',()=>select(tab.dataset.screen));tab.addEventListener('keydown',event=>{const index=order.indexOf(tab.dataset.screen),next=event.key==='ArrowRight'?(index+1)%4:event.key==='ArrowLeft'?(index+3)%4:event.key==='Home'?0:event.key==='End'?3:null;if(next!==null){event.preventDefault();select(order[next]);document.getElementById('tab-'+order[next]).focus();}});}
attachSwipe(document);window.addEventListener('hashchange',()=>select(location.hash.slice(1),false));window.addEventListener('storage',event=>{if(COMPANIES.some(company=>event.key===holdingKey(company.id))||event.key===null)scheduleRender();});
new ResizeObserver(scheduleRender).observe(map);
async function load(){
  if(loading)return;loading=true;map.setAttribute('aria-busy','true');document.getElementById('refresh').disabled=true;
  async function read(url){const response=await fetch(url,{cache:'no-store',credentials:'omit'});if(!response.ok)throw Error('公開データ取得失敗');return response.json();}
  const [latest,past]=await Promise.allSettled([read(new URL('../monitor-shared/data/quotes.json',import.meta.url)),read(new URL('../joby/data/yen-reference.json',import.meta.url))]);
  if(latest.status==='fulfilled'&&latest.value.version===1&&['canbas','kringle','joby','usdjpy'].every(id=>validEntry(latest.value.entries?.[id],id))){quotes=latest.value;quoteFailed=false;}else quoteFailed=true;
  if(past.status==='fulfilled'&&past.value.version===1&&Array.isArray(past.value.references)){history=past.value;historyFailed=false;}else historyFailed=true;
  loading=false;document.getElementById('refresh').disabled=false;scheduleRender();
}
document.getElementById('refresh').addEventListener('click',load);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){scheduleRender();void load();}});setInterval(()=>{if(document.visibilityState==='visible')void load();},30*60000);
select(order.includes(location.hash.slice(1))?location.hash.slice(1):'canbas',false);void load();
