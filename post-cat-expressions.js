// A post is its random seed: every viewer and reload chooses the same face.
// Profile preferences and cat-care/sleep state are deliberately not written.
globalThis.PostCatExpressions=(()=>{
 const candidates=Object.freeze({awake:Object.freeze(['calm','happy']),sleep:Object.freeze(['sleepy','sleeping']),sleepless:Object.freeze(['restless','surprised']),'try-sleep':Object.freeze(['yawn','sleepy'])});
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
 function svg(expression,coat){
  if(expression!=='sleeping')return CatFaces.svg(expression,coat);
  coat=CatFaces.normalizeCoat(coat);
  // Sleep alone uses the existing closed-eye manul artwork; preserve its
  // restored open-eye calm icon for awake reports and unposted profiles.
  const face=coat==='manul'?`<img class="cat-face" src="assets/cat-refresh-v1/manul/face-calm.png" alt="" aria-hidden="true" data-asset-key="manul/face-calm" data-cat-coat="manul" data-cat-expression="calm" data-expression="calm">`:CatFaces.svg('calm',coat);
  return face.replaceAll('data-cat-expression="calm"','data-cat-expression="sleeping"').replaceAll('data-expression="calm"','data-expression="sleeping"');
 }
 return Object.freeze({candidates,kind,forPost,svg});
})();
if(typeof module!=='undefined')module.exports=PostCatExpressions;
