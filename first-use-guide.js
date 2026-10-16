// A voluntary, device-local introduction. Read eligibility before app defaults.
globalThis.FirstUseGuide=(()=>{
 const key='oyasumi-first-guide-v1';let invitation=false,expanded;
 try{invitation=!localStorage.getItem(key)&&!['oyasumi-local-v2','oyasumi-v1','oyasumi-dark-hint-seen'].some(k=>localStorage.getItem(k));}catch{ /* The settings entry also works without storage. */ }
 function remember(){invitation=false;try{localStorage.setItem(key,'seen');}catch{ /* Keep the choice for this visit. */ }}
 function content(scope){
  const id='first-guide-'+scope;
  if(expanded===scope)return `<section class="first-guide first-guide-open" aria-labelledby="${id}-title"><div class="first-guide-heading"><h2 id="${id}-title" tabindex="-1">この場所の過ごし方</h2><button type="button" class="text-button" data-guide-action="close" aria-expanded="true" aria-controls="${id}-body">閉じる</button></div><div id="${id}-body"><ol class="first-guide-topics"><li><h3>猫の過ごし方</h3><p>猫は部屋・お庭・縁側で、季節や時間に合わせて過ごします。猫をタップすると、ごはんのようすへ。</p></li><li><h3>みんなの記録</h3><p>「みんなの記録」では、おやすみした猫や、みんなの投稿から集まった記録を眺められます。</p></li><li><h3>眠る前の報告</h3><p>ホームで今の気分をひとつ選ぶだけ。「もう寝るよ」などで、おやすみを伝えられます。</p></li></ol><p class="first-guide-note">案内は、設定の「使い方の案内」からいつでも開けます。</p></div></section>`;
  if(scope==='settings')return `<button type="button" class="setting-row" data-guide-action="open" aria-expanded="false"><span>使い方の案内</span><span class="setting-value" aria-hidden="true">›</span></button>`;
  if(invitation)return `<aside class="first-guide first-guide-invitation" aria-label="はじめての方へ"><p>はじめての方へ</p><div class="first-guide-actions"><button type="button" class="text-button" data-guide-action="open" aria-expanded="false">案内を見る</button><button type="button" class="text-button" data-guide-action="skip">スキップ</button></div></aside>`;
  return '';
 }
 const slot=scope=>`<div data-first-guide-slot="${scope}">${content(scope)}</div>`;
 function change(scope,action){
  expanded=action==='open'?scope:undefined;remember();
  for(const holder of document.querySelectorAll('[data-first-guide-slot]'))holder.innerHTML=content(holder.dataset.firstGuideSlot);
  const holder=document.querySelector(`[data-first-guide-slot="${scope}"]`),target=action==='open'?holder?.querySelector('h2'):holder?.querySelector('[data-guide-action=open]');
  if(target)target.focus({preventScroll:true});
  else{const heading=document.querySelector('#app .header h1');if(heading){heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});heading.addEventListener('blur',()=>heading.removeAttribute('tabindex'),{once:true});}}
 }
 document.addEventListener('click',event=>{const button=event.target.closest?.('[data-guide-action]'),holder=button?.closest('[data-first-guide-slot]');if(holder)change(holder.dataset.firstGuideSlot,button.dataset.guideAction);});
 document.addEventListener('keydown',event=>{const holder=event.target.closest?.('[data-first-guide-slot]');if(event.key==='Escape'&&holder&&expanded===holder.dataset.firstGuideSlot){event.preventDefault();change(holder.dataset.firstGuideSlot,'close');}});
 return Object.freeze({slot});
})();
