const assert=require('node:assert/strict');
require('node:vm').runInThisContext(require('node:fs').readFileSync('vendor/supabase.js','utf8'));
require('./supabase-config.js');require('./supabase-api.js');require('./cat-roles.js');
const a=createOyasumiConnection('role-a-'+Date.now()), b=createOyasumiConnection('role-b-'+Date.now());let post;
(async()=>{
 await a.initialize();await b.initialize();assert.equal((await a.snapshot()).catRole,null);
 await a.setCatRole('steady');assert.equal((await a.snapshot()).profileComplete,false,'Role never completes required nickname/cat setup');
 await a.setNickname('職業ねこ');await a.setCatCoat('silver');await a.setCatExpression('surprised');
 post=await a.submitPost('awake');
 for(const option of CatRoles.options){
  await a.setCatRole(option.id);
  const own=await a.snapshot(),other=await b.snapshot();
  assert.equal(own.catRole,option.id);assert.equal(other.feed.find(p=>p.id===post.id).catRole,option.id);
  assert.equal(own.name,'職業ねこ');assert.equal(own.coat,'silver');assert.equal(own.expression,'surprised');assert(own.profileComplete);
 }
 await assert.rejects(()=>a.setCatRole('医師'));await assert.rejects(()=>a.setCatRole('invalid'));
 assert((await b.client.from('oyasumi_profiles').update({cat_role:'steady'}).eq('user_id',a.userId)).error);
 const visitor=supabase.createClient(OyasumiConfig.url,OyasumiConfig.publishableKey,{auth:{persistSession:false}});
 assert((await visitor.rpc('oyasumi_set_cat_role',{p_role:'steady'})).error);
 assert.equal((await b.snapshot()).catRole,null,'Unrelated profile remains unset');
 console.log('PASS live roles: 18 choices saved/shared, raw occupations denied, anonymous/direct-write denial, optional setup and existing profile preserved.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
 if(post)await a.deletePost(post.id);await a.client.auth.signOut({scope:'local'});await b.client.auth.signOut({scope:'local'});
});
