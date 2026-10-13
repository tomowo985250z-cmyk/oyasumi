module.exports=function installStartupFixture(options){
 const own='00000000-0000-0000-0000-000000000001';
 const f=globalThis.CatStartupFixture={...options,own,started:performance.now(),calls:[],frames:[],violations:[],firstOwn:null,firstFast:null,firstSlow:null,hidden:false,careGates:[],optionalGates:[],profileGates:[]};
 Object.defineProperty(navigator,'standalone',{value:f.standalone});
 const mm=matchMedia.bind(window);window.matchMedia=q=>q==='(display-mode: standalone)'?{matches:f.standalone,media:q,addEventListener(){},removeEventListener(){}}:mm(q);
 Object.defineProperty(document,'hidden',{get:()=>f.hidden,configurable:true});
 const scope='https://isolated.invalid|oyasumi-auth',key='oyasumi-confirmed-coat-v1:'+scope;
 localStorage.setItem('oyasumi-dark-hint-seen','test');
 if(f.cache==='corrupt')localStorage.setItem(key,'{');
 else if(f.cache!=='cold'&&!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({version:1,userId:f.cache==='foreign'?'foreign-user':own,coat:f.cache==='stale'||f.cache==='foreign'?'orange':'black',at:Date.now()-(f.cache==='expired'?8*86400000:0)}));
 if(f.cache==='blocked')for(const method of ['getItem','setItem','removeItem'])Storage.prototype[method]=()=>{throw Error('Storage blocked');};
 f.profiles=Array.from({length:41},(_,i)=>({user_id:i?`00000000-0000-0000-0001-${String(i).padStart(12,'0')}`:own,nickname:'cat'+i,cat_coat:i?(i<=20?'gray':'white'):f.coat,cat_expression:i?(i<=20?'happy':'yawn'):'surprised',cat_role:null,profile_note:''}));
 f.rows=()=>f.profiles.map((p,i)=>({id:`post-${i}`,user_id:p.user_id,choice:i?'awake':f.asleep?'sleep':'awake',post_intent:i?'relax':f.asleep?'sleep':'relax',created_at:new Date(f.at-1000).toISOString(),night_date:SleepFlow.night(f.at),event_order:50-i}));
 const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const read=async(label,result,ms=90,gate)=>{const start=performance.now();if(gate)await new Promise(resolve=>gate.push(resolve));await wait(ms);f.calls.push({label,start,ms:performance.now()-start});return result;};
 const auth={getSession:()=>read('session',{data:{session:{user:{id:f.authChanged?'other-user':own}}}},15),signInAnonymously:()=>{throw Error('Unexpected auth write');}};
 const rpc=(name,args={})=>{
  const night=SleepFlow.night(f.at);let data;
  if(name==='oyasumi_night_context')data=[{night_date:night,morning_night_date:SleepFlow.previousNight(f.at),server_now:new Date(f.at).toISOString(),next_reset_at:new Date(Date.parse(night+'T06:00:00+09:00')+86400000).toISOString()}];
  else if(name==='oyasumi_tonight_counts')data=[{night_date:night,awake_count:40,sleeping_count:f.asleep?1:0,my_state:f.asleep?'sleep':'awake'}];
  else if(name==='oyasumi_cat_care_status')return read(name,f.failCare?{error:{code:'57014'}}:{data:{allowanceVersion:2,sleepStateVersion:1,catState:f.asleep?'sleep':'awake',mealSleeping:f.asleep,day:night,mealSlot:'night',mealEligible:true,mealDone:false,treatGiven:false,treatCount:0,treatRecipients:[],receivedToday:0,receivedTotal:0,receivedDays:[]}},180,f.holdCare?f.careGates:null);
  else if(name==='oyasumi_cat_coat_status')data=[{next_change_at:null}];
  else if(name==='oyasumi_cat_coat_cooldown_paused')data=true;
  else if(name==='oyasumi_reaction_counts_v3')data=[];
  else if(['oyasumi_morning_reactions_v2','oyasumi_tonight_summary','oyasumi_tonight_trend'].includes(name))return read(name,{data:[]},700,f.holdOptional?f.optionalGates:null);
  else return read(name,{error:{code:'PGRST202'}});
  return read(name,{data});
 };
 const from=table=>{
  let fields='',single=false,head=false,filters={},ids,range=[0,99];
  const q={select:(v,o)=>{fields=v;head=!!o?.head;return q;},eq:(k,v)=>{filters[k]=v;return q;},gt:()=>q,gte:()=>q,lt:()=>q,in:(k,v)=>{if(k==='user_id')ids=v;return q;},order:()=>q,limit:()=>q,range:(a,b)=>{range=[a,b];return q;},maybeSingle:()=>{single=true;return q;},then:(resolve,reject)=>{
   let data,ms=90;
   if(table==='oyasumi_profiles'){
    const profiles=f.profiles.map(p=>p.user_id===own?{...p,cat_coat:f.coat}:p);
    data=single?profiles.find(p=>p.user_id===filters.user_id):profiles.filter(p=>!ids||ids.includes(p.user_id));
    if(single)ms=180;else if(fields.includes('cat_expression'))ms=ids?.some(id=>profiles.findIndex(p=>p.user_id===id)>20)?650:100;
   }else data=head?null:f.rows().filter(r=>!filters.user_id||r.user_id===filters.user_id).slice(range[0],range[1]+1);
   return read(table+':'+fields+(single?':single':''),{data,...(head?{count:1}:{})},ms,f.holdProfiles&&ms===650?f.profileGates:null).then(resolve,reject);
  }};return q;
 };
 window.OyasumiConfig={url:'https://isolated.invalid',publishableKey:'test'};
 window.supabase={createClient:()=>({auth,rpc,from})};
 f.releaseCare=()=>{f.holdCare=false;f.careGates.splice(0).forEach(r=>r());};
 f.releaseOptional=()=>{f.holdOptional=false;f.optionalGates.splice(0).forEach(r=>r());};
 f.releaseProfiles=()=>{f.holdProfiles=false;f.profileGates.splice(0).forEach(r=>r());};
 function frame(){
  const now=performance.now();
  for(const img of document.querySelectorAll('#app img[data-asset-key]')){
   if(!img.naturalWidth||getComputedStyle(img).visibility!=='visible')continue;
   if(img.closest('.home-room-unit .room-resident')){
    f.firstOwn??=now;
    if(img.dataset.catCoat!==f.coat)f.violations.push('wrong own coat '+img.dataset.catCoat);
    if(f.asleep&&img.dataset.catScene!=='sleeping')f.violations.push('awake cat while sleeping');
   }
   const post=img.closest('[data-public-profile]');
   if(post){const i=Number(post.dataset.publicProfile.replace('post-','')),p=f.profiles[i];
    if(!p||img.dataset.catCoat!==(i?p.cat_coat:f.coat)||img.dataset.catExpression!==p.cat_expression)f.violations.push('wrong author '+i);
    if(i>0&&i<=20)f.firstFast??=now;if(i>20)f.firstSlow??=now;
   }
  }
  requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
 new MutationObserver(()=>{
  const root=document.documentElement,cat=document.querySelector('.home-room-unit .room-resident img[src]');
  if(cat){f.ownNodeAt??=performance.now();if(root.hasAttribute('data-cat-own-ready')||!root.hasAttribute('data-cat-state-pending'))f.ownStateAt??=performance.now();}
 }).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['src','data-cat-own-ready','data-cat-state-pending']});
};
