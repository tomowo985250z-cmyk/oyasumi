// Optional, additive cat care. Only server-confirmed actions play the animation.
globalThis.CatCare=(()=>{
 const pending=new Set(),active=new Map();
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
  const label=!fresh?'今日の記録を確認中':self?(status.mealDone?'今日のごはんはあげました':'ごはんをあげる'):(status.treatGiven?'今日のおやつは贈りました':'おやつを贈る');
  const days=Array.isArray(status.receivedDays)?status.receivedDays.filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(r.day)&&Number.isSafeInteger(r.count)&&r.count>0).slice(0,30):[];
  const history=self&&!compact?`<div class="care-received"><p>届いたおやつ <span>今日 ${status.receivedToday}個 · 累計 ${status.receivedTotal}個</span></p>${days.length?`<details><summary>日別の記録</summary><ul>${days.map(r=>`<li><time datetime="${r.day}">${r.day.replaceAll('-','/')}</time><span>${r.count}個</span></li>`).join('')}</ul></details>`:''}<p class="quiet-note">贈ってくれた人の名前は表示されません。</p></div>`:'';
  // Recipient comes from the post's UUID, never from display text.
  if(!self&&!/^[0-9a-f-]{36}$/i.test(recipient||''))return '';
  return `<section class="card cat-care${compact?' cat-care-compact':''}" data-care-compact="${compact}" data-care-owner="${self?'self':recipient}"><h2>${self?'猫のごはん':'小さなおやつ'}</h2>${visual(coat,kind)}<button class="cream-button" ${self?'data-cat-meal':`data-cat-treat="${recipient}"`} ${disabled?'disabled':''}>${label}</button><p class="quiet-note">${self?'おやすみを投稿した日に、1回。連続投稿は不要です。':'他の猫へ、1日合計1回。お返しは気にせずに。'}</p><p class="care-feedback" role="status" aria-live="polite"></p>${history}</section>`;
 }
 async function play(scene){
  if(!scene?.isConnected)return;
  let token=active.get(scene);if(token)return;
  token={};active.set(scene,token);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Decode off the interaction path: navigation and other controls stay available.
  await Promise.allSettled([...scene.querySelectorAll('img')].map(img=>img.decode()));
  if(!scene.isConnected||active.get(scene)!==token){active.delete(scene);return;}
  scene.classList.add(reduced?'care-reduced':'care-playing');
  await new Promise(resolve=>setTimeout(resolve,reduced?900:3000));
  if(active.get(scene)===token){scene.classList.remove('care-playing','care-reduced');active.delete(scene);}
 }
 function lock(key){if(pending.size)return false;pending.add(key);return true;}
 function unlock(key){pending.delete(key);}
 function restPrompt(status,coat){return valid(status)&&status.day===day(NightClock.now())&&status.mealEligible&&!status.mealDone?markup(status,coat,null,true,NightClock.now(),true):'';}
 return {valid,markup,visual,play,lock,unlock,restPrompt,get pending(){return pending.size>0},day};
})();