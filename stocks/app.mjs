const order=['canbas','kringle','joby'];
const frames=new Map([...document.querySelectorAll('iframe')].map(frame=>[frame.dataset.company,frame]));
let current='canbas',transition=null,swipeUntil=0,suppressClickUntil=0;
// Retire only this monitor's old portfolio entries; leave other app storage alone.
try{for(const symbol of ['4575.T','4884.T','JOBY'])localStorage.removeItem('oyasumi:portfolio:v1:'+symbol);}catch{}
function resetScroll(frame){
  const reset=()=>{if(current!==frame.dataset.company||frame.closest('.screen').hidden)return;const doc=frame.contentDocument;frame.contentWindow?.scrollTo({left:0,top:0,behavior:'instant'});if(doc?.scrollingElement){doc.scrollingElement.scrollTop=0;doc.scrollingElement.scrollLeft=0;}};
  requestAnimationFrame(()=>{reset();requestAnimationFrame(reset);});
}
function select(id,updateURL=true){
  if(!order.includes(id))id=order[0];const previous=current;current=id;
  for(const tab of document.querySelectorAll('[role=tab]')){const active=tab.dataset.screen===id;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;document.getElementById('screen-'+tab.dataset.screen).hidden=!active;}
  const frame=frames.get(id);if(!frame.hasAttribute('src'))frame.src='../'+id+'/';resetScroll(frame);
  if(previous!==id){
    transition?.cancel();swipeUntil=performance.now()+180;
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
      const direction=order.indexOf(id)>order.indexOf(previous)?1:-1;
      transition=document.getElementById('screen-'+id).animate([{transform:'translateX('+direction*18+'px)',opacity:.75},{transform:'translateX(0)',opacity:1}],{duration:180,easing:'cubic-bezier(.22,.61,.36,1)'});
      transition.onfinish=()=>resetScroll(frame);
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
for(const frame of frames.values())frame.addEventListener('load',()=>{
  const doc=frame.contentDocument;if(!doc)return;const link=doc.createElement('link');link.rel='stylesheet';link.href=new URL('./embedded.css?v=3',import.meta.url).href;doc.head.append(link);
  resetScroll(frame);const pending=()=>['#monitor','#ev-monitor'].some(selector=>doc.querySelector(selector)?.getAttribute('aria-busy')==='true');if(pending()){const settled=new MutationObserver(()=>{if(!pending()){settled.disconnect();resetScroll(frame);}});settled.observe(doc.body,{subtree:true,attributes:true,attributeFilter:['aria-busy']});}
  attachSwipe(doc);
});
for(const tab of document.querySelectorAll('[role=tab]')){
  tab.addEventListener('click',()=>select(tab.dataset.screen));
  tab.addEventListener('keydown',event=>{const index=order.indexOf(tab.dataset.screen),next=event.key==='ArrowRight'?(index+1)%order.length:event.key==='ArrowLeft'?(index+order.length-1)%order.length:event.key==='Home'?0:event.key==='End'?order.length-1:null;if(next!==null){event.preventDefault();select(order[next]);document.getElementById('tab-'+order[next]).focus();}});
}
attachSwipe(document);window.addEventListener('hashchange',()=>select(location.hash.slice(1)));
select(location.hash.slice(1));
