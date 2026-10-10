// Optional, additive cat care. Only server-confirmed actions play the animation.
globalThis.CatCare=(()=>{
 const pending=new Set(),active=new Map(),messages=new Map(),durationMs=6000;
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function setFeedback(owner,text,failed=false){messages.set(owner,{text,failed});}
 function errorMessage(error){
  const code=error?.code;
  const reason=code==='P0040'?'今日（日本時間0時以降）の「おやすみ」「寝てみる」「早めに寝る」の投稿が必要です。前日分の投稿は対象外です。':code==='P0041'?'猫の情報を確認できません。プロフィールで猫を選んでから再試行してください。':code==='PGRST202'?'食事の保存機能がサーバーで見つかりません。時間をおいて再試行してください。':['42501','PGRST301','PGRST303','28000'].includes(code)?'認証または保存権限を確認できません。通信を確認してアプリを開き直してください。':code==='CARE_RESPONSE'?'保存応答を確認できませんでした。記録を再確認します。':code==='CARE_TIMEOUT'||error?.name==='AbortError'?'保存の確認が時間切れになりました。通信を確認して再試行してください。':'通信またはサーバーのエラーで保存を確認できませんでした。通信を確認して再試行してください。';
  return reason+(/^[A-Za-z0-9_-]{1,24}$/.test(code||'')?`（コード: ${code}）`:'');
 }
 function confirmed(result,self){return valid(result?.status)&&typeof result.accepted==='boolean'&&(self?result.status.mealDone:result.status.treatGiven)===true;}
 function deadline(work,ms=20000){let timer;return Promise.race([Promise.resolve().then(work),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(new Error('Care timeout'),{code:'CARE_TIMEOUT'})),ms);})]).finally(()=>clearTimeout(timer));}
 const day=now=>SleepFlow.day(now);
 const valid=s=>s&&/^\d{4}-\d{2}-\d{2}$/.test(s.day)&&['mealEligible','mealDone','treatGiven'].every(k=>typeof s[k]==='boolean')&&['receivedToday','receivedTotal'].every(k=>Number.isSafeInteger(s[k])&&s[k]>=0);
 function visual(coat,kind='meal'){
  coat=CatFaces.normalizeCoat(coat);kind=kind==='treat'?'treat':'meal';
  const file=frame=>`assets/cat-refresh-v1/${coat}/${frame}.png`;
  return `<div class="care-scene" data-care-coat="${coat}" data-care-kind="${kind}" aria-hidden="true"><img class="care-idle" src="${file('day-relax')}" alt="" width="152" height="152"><span class="care-munch"><img class="care-body" src="${file('day-relax')}" alt="" width="152" height="152"><img class="care-head" src="${file('day-relax')}" alt="" width="152" height="152"></span><img class="care-joy-cat" src="${file('day-play')}" alt="" width="152" height="152"><span class="care-bowl"><span class="care-food"><i></i><i></i><i></i></span></span><span class="care-joy">♥</span></div>`;
 }
 function markup(status,coat,recipient,self,now=NightClock.now(),compact=false){
  if(!valid(status))return '';
  const fresh=status.day===day(now),kind=self?'meal':'treat',disabled=!fresh||pending.size>0||(self?status.mealDone||!status.mealEligible:status.treatGiven);
  const label=!fresh?'今日の記録を確認中':self?(status.mealDone?'今日のごはんはあげました':!status.mealEligible?'今日のおやすみ投稿が必要です':'ごはんをあげる'):(status.treatGiven?'今日のおやつは贈りました':'おやつを贈る');
  const feedback=messages.get(self?'self':recipient)||{text:self&&fresh&&!status.mealEligible&&!status.mealDone?'日本時間の今日0時以降に「おやすみ」「寝てみる」「早めに寝る」を投稿すると、ごはんをあげられます。前日分の投稿は対象外です。':'',failed:false};
  const days=Array.isArray(status.receivedDays)?status.receivedDays.filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(r.day)&&Number.isSafeInteger(r.count)&&r.count>0).slice(0,30):[];
  const history=self&&!compact?`<div class="care-received"><p>届いたおやつ <span>今日 ${status.receivedToday}個 · 累計 ${status.receivedTotal}個</span></p>${days.length?`<details><summary>日別の記録</summary><ul>${days.map(r=>`<li><time datetime="${r.day}">${r.day.replaceAll('-','/')}</time><span>${r.count}個</span></li>`).join('')}</ul></details>`:''}<p class="quiet-note">贈ってくれた人の名前は表示されません。</p></div>`:'';
  // Recipient comes from the post's UUID, never from display text.
  if(!self&&!/^[0-9a-f-]{36}$/i.test(recipient||''))return '';
  return `<section class="card cat-care${compact?' cat-care-compact':''}" data-care-compact="${compact}" data-care-owner="${self?'self':recipient}"><h2>${self?'猫のごはん':'小さなおやつ'}</h2>${visual(coat,kind)}<p class="care-caption"><strong>${self?'ごはんだよ':'おやつだよ'}</strong><span class="care-serving" data-care-kind="${kind}"><span class="care-food" aria-hidden="true"><i></i><i></i><i></i></span>${self?'カリカリ':'小魚'}</span></p><button type="button" class="cream-button" ${self?'data-cat-meal':`data-cat-treat="${recipient}"`} ${disabled?'disabled':''}>${label}</button><p class="quiet-note">${self?'おやすみを投稿した日に、1回。連続投稿は不要です。':'他の猫へ、1日合計1回。お返しは気にせずに。'}</p><p class="care-feedback" role="${feedback.failed?'alert':'status'}" aria-live="${feedback.failed?'assertive':'polite'}">${escape(feedback.text)}</p>${history}</section>`;
 }
 async function play(scene){
  if(!scene?.isConnected)return;
  let token=active.get(scene);if(token)return;
  token={};active.set(scene,token);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Decode off the interaction path: navigation and other controls stay available.
  await Promise.allSettled([...scene.querySelectorAll('img')].map(img=>typeof img.decode==='function'?img.decode():new Promise(resolve=>{
   if(img.complete)return resolve();
   img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});
  })));
  if(!scene.isConnected||active.get(scene)!==token){active.delete(scene);return;}
  // Commit the newly inserted scene's initial style before starting CSS animations.
  // WebKit may otherwise coalesce insertion and playback into a single paint.
  scene.getBoundingClientRect();
  await new Promise(resolve=>requestAnimationFrame(resolve));
  if(!scene.isConnected||active.get(scene)!==token){active.delete(scene);return;}
  scene.classList.add(reduced?'care-reduced':'care-playing');
  // Count visible time, including reduced-motion mode. Backgrounding Safari/PWA
  // must not consume the meal while the user cannot see it.
  await new Promise(resolve=>{
   let elapsed=0,started=performance.now(),timer;
   const finish=()=>{
    clearTimeout(timer);document.removeEventListener('visibilitychange',visibility);
    scene.classList.remove('care-playing','care-reduced','care-paused');delete scene.dataset.careStage;
    scene.dispatchEvent(new CustomEvent('careplaybackend',{bubbles:true,detail:{visibleMs:elapsed}}));resolve();
   };
   const schedule=()=>{
    clearTimeout(timer);
    if(!scene.isConnected||active.get(scene)!==token)return finish();
    scene.dataset.careStage=elapsed<1000?'plate':elapsed<4000?'munch':'joy';
    if(elapsed>=durationMs)return finish();
    if(document.hidden){scene.classList.add('care-paused');return;}
    scene.classList.remove('care-paused');started=performance.now();
    const boundary=elapsed<1000?1000:elapsed<4000?4000:durationMs;
    timer=setTimeout(()=>{elapsed+=performance.now()-started;schedule();},Math.max(1,boundary-elapsed));
   };
   const visibility=()=>{
    if(document.hidden){elapsed+=performance.now()-started;clearTimeout(timer);scene.classList.add('care-paused');}
    else schedule();
   };
   document.addEventListener('visibilitychange',visibility);
   scene.dispatchEvent(new CustomEvent('careplaybackstart',{bubbles:true}));schedule();
  });
  if(active.get(scene)===token)active.delete(scene);
 }
 function lock(key){if(pending.size)return false;pending.add(key);return true;}
 function unlock(key){pending.delete(key);}
 function restPrompt(status,coat){return valid(status)&&status.day===day(NightClock.now())&&status.mealEligible?markup(status,coat,null,true,NightClock.now(),true):'';}
 return {durationMs,setFeedback,clearFeedback:()=>messages.clear(),errorMessage,confirmed,deadline,valid,markup,visual,play,lock,unlock,restPrompt,isPlaying:scene=>active.has(scene),get pending(){return pending.size>0},day};
})();
