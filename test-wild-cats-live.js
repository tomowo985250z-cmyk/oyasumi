const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
vm.runInThisContext(fs.readFileSync('vendor/supabase.js','utf8'));
require('./wild-cat-assets.js');require('./supabase-config.js');require('./supabase-api.js');
const a=createOyasumiConnection('wild-a-'+Date.now()),b=createOyasumiConnection('wild-b-'+Date.now());let post;
(async()=>{
 await a.initialize();await b.initialize();await a.setNickname('野生猫の検証');await a.setCatCoat('calico');
 const before=await a.snapshot();post=await a.submitPost('sleep');
 for(const cat of WildCatAssets.species){
  await a.setCatCoat(cat.id);
  for(const expression of ['calm','sleepy','yawn','restless','happy','surprised']){
   await a.setCatExpression(expression);
   const peer=await b.snapshot(),shared=peer.feed.find(p=>p.id===post.id);
   assert.equal(shared.coat,cat.id);assert.equal(shared.expression,expression);
   assert(peer.tonightSummary.coats.some(c=>c.coat===cat.id&&c.count>=1));
  }
  const own=await a.snapshot();assert.equal(own.coat,cat.id);assert.equal(own.needsCat,false);
  const {data:{session},error:sessionError}=await a.client.auth.getSession();assert.ifError(sessionError);
  const reloaded=createOyasumiConnection('wild-reload-'+cat.id+'-'+Date.now());
  try{
   const restored=await reloaded.client.auth.setSession({access_token:session.access_token,refresh_token:session.refresh_token});assert.ifError(restored.error);
   await reloaded.initialize();assert.equal(reloaded.userId,a.userId);
   assert.equal((await reloaded.snapshot()).coat,cat.id,'Fresh connection must read the persisted species');
  }finally{await reloaded.client.auth.stopAutoRefresh();}
  assert.equal(own.name,before.name);assert.equal(own.catRole,before.catRole);assert.equal(own.profileNote,before.profileNote);
  assert((await b.client.from('oyasumi_profiles').update({cat_coat:'calico'}).eq('user_id',a.userId)).error);
  assert.equal((await a.snapshot()).coat,cat.id,'Denied peer update must leave the species unchanged');
 }
 await assert.rejects(()=>a.setCatCoat('unknown-wild'));
 const visitor=supabase.createClient(OyasumiConfig.url,OyasumiConfig.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
 assert((await visitor.rpc('oyasumi_set_cat_coat',{p_coat:'manul'})).error);
 await b.setReaction(post.id,'comfort');assert.equal((await a.snapshot()).reactionCounts[post.id].comfort,1);
 await a.setCatCoat('calico');assert.equal((await a.snapshot()).coat,'calico');
 console.log('PASS live wild cats: 4 species × 6 shared expressions, selection readback, counts, unchanged profile, ownership/unauthenticated/invalid-value denial and reactions.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
 if(post)await a.deletePost(post.id);await a.client.auth.signOut({scope:'local'});await b.client.auth.signOut({scope:'local'});
});
