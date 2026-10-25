// A post is its random seed: every viewer and reload chooses the same face.
// Profile preferences and cat-care/sleep state are deliberately not written.
globalThis.PostCatExpressions=(()=>{
 const candidates=Object.freeze({awake:Object.freeze(['calm','happy']),sleep:Object.freeze(['sleeping']),sleepless:Object.freeze(['restless','surprised']),'try-sleep':Object.freeze(['sleeping'])});
 function kind(post){
  const choice=post?.status??post?.choice,intent=post?.intent??post?.post_intent;
  if(choice==='awake')return intent==='sleepless'?'sleepless':'awake';
  if(choice==='try-sleep')return 'try-sleep';
  if(choice==='sleep'||choice==='early-sleep')return 'sleep';
  return null;
 }
 function forPost(post){
  const type=kind(post);if(!post?.id||!type)return 'calm';
  let hash=2166136261;for(const char of 'oyasumi-post-face-v1:'+post.id+':'+type)hash=Math.imul(hash^char.charCodeAt(0),16777619);
  hash^=hash>>>16;hash=Math.imul(hash,0x85ebca6b);hash^=hash>>>13;hash=Math.imul(hash,0xc2b2ae35);hash^=hash>>>16;
  const choices=candidates[type];return choices[(hash>>>0)%choices.length];
 }
 // Normalize the persisted choice once for icons, rooms and treats. Intent is
 // presentation metadata: both sleep choices persist a sleeping state.
 const state=post=>{const type=kind(post);return type==='sleep'||type==='try-sleep'?'sleep':type?'awake':'';};
 const time=post=>post?.time??Date.parse(post?.created_at);
 const night=at=>Math.floor((at+3*3600000)/86400000);
 function compare(a,b){
  const order=post=>String(post.order??post.event_order??'');
  const x=order(a),y=order(b);
  if(/^\d+$/.test(x)&&/^\d+$/.test(y)&&BigInt(x)!==BigInt(y))return BigInt(x)>BigInt(y)?1:-1;
  return time(a)-time(b)||String(a.id).localeCompare(String(b.id));
 }
 function latest(posts,now){
  const authors=new Map();
  for(const post of posts||[]){
   const at=time(post);if(!post?.id||!state(post)||!Number.isFinite(at)||at>now||night(at)!==night(now))continue;
   const author=post.userId||post.user_id||post.id,before=authors.get(author);
   if(!before||compare(post,before)>0)authors.set(author,post);
  }
  return [...authors.values()].sort((a,b)=>compare(b,a));
 }
 function svg(expression,coat){
  if(expression!=='sleeping')return CatFaces.svg(expression,coat);
  coat=CatFaces.normalizeCoat(coat);
  // Sleep alone uses the existing closed-eye manul artwork; preserve its
  // restored open-eye calm icon for awake reports and unposted profiles.
  const face=coat==='manul'?`<img class="cat-face" src="assets/cat-refresh-v1/manul/face-calm.png?v=17fa1f567688573e" alt="" aria-hidden="true" data-asset-key="manul/face-calm" data-cat-coat="manul" data-cat-expression="calm" data-expression="calm">`:CatFaces.svg('calm',coat);
  return face.replaceAll('data-cat-expression="calm"','data-cat-expression="sleeping"').replaceAll('data-expression="calm"','data-expression="sleeping"');
 }
 return Object.freeze({candidates,kind,state,latest,compare,forPost,svg});
})();
if(typeof module!=='undefined')module.exports=PostCatExpressions;
