const assert = require('node:assert/strict');
require('node:vm').runInThisContext(require('node:fs').readFileSync(require('node:path').join(__dirname,'vendor/supabase.js'),'utf8'));
require('./supabase-config.js');
require('./supabase-api.js');
const a = createOyasumiConnection('oyasumi-test-a-' + Date.now());
const b = createOyasumiConnection('oyasumi-test-b-' + Date.now());
const created = new Set();
async function run() {
  await a.initialize('検証ねこA');await b.initialize('検証ねこB');
  assert.notEqual(a.userId,b.userId);
  const base=await a.snapshot();
  assert(base.trendSupported,'Run supabase/tonight-trend.sql in SQL Editor before testing shared trends.');
  assert(base.expressionSupported,'Run supabase/cat-appearance.sql in SQL Editor before testing cat expression persistence.');
  const first=await a.submitPost('awake');created.add(first.id);
  const trendWithAwake=await a.snapshot();
  assert.equal(trendWithAwake.trend.at(-1).awake,trendWithAwake.awakeCount);
  assert.equal(trendWithAwake.trend.at(-1).sleeping,trendWithAwake.sleepingCount);
  // Supabaseとテスト端末の時計にはわずかな差があるため1分まで許容。
  assert(trendWithAwake.trend.every((point,index,list)=>point.time<=Date.now()+60000&&(index===0||point.time>list[index-1].time)));
  assert(trendWithAwake.trend.length<=97);
  const duplicate=await a.submitPost('awake');assert.equal(first.id,duplicate.id);
  let snap=await b.snapshot();assert(snap.feed.some(p=>p.id===first.id));assert(snap.awakeCount>=base.awakeCount+1);
  const forged=await b.client.from('oyasumi_posts').insert({user_id:a.userId,choice:'awake'});assert(forged.error,'Direct inserts must be denied');
  assert.equal(await b.deletePost(first.id),false,'Cannot delete another user’s post');
  const readOnly=await b.client.from('oyasumi_profiles').update({nickname:'不正更新'}).eq('user_id',a.userId);assert(readOnly.error,'Direct profile updates must be denied');
  for(const choice of ['goodnight','dream','tomorrow','comfort']){await b.setReaction(first.id,choice);snap=await a.snapshot();assert.equal(snap.reactionCounts[first.id][choice],1);assert(!snap.reactions[first.id]);assert.equal((await b.snapshot()).reactions[first.id],choice);}
  assert.equal((await a.client.from('oyasumi_reactions').select('*').eq('post_id',first.id)).data.length,0,'Reaction identities stay private');
  await b.setReaction(first.id,null);assert.equal((await a.snapshot()).reactionCounts[first.id].comfort,0);
  for(const bad of ['not-a-choice']){await assert.rejects(()=>a.submitPost(bad));await assert.rejects(()=>b.setReaction(first.id,bad));}
  for(const name of ['a@b.jp','死ね','あ'.repeat(13)])await assert.rejects(()=>a.setNickname(name));
  await a.setNickname('検証つきA');assert.equal((await b.snapshot()).feed.find(p=>p.id===first.id).name,'検証つきA');
  for(const expression of ['calm','sleepy','yawn','restless','happy']){
    await a.setCatExpression(expression);
    snap=await b.snapshot();
    assert.equal(snap.feed.find(p=>p.id===first.id).expression,expression,'Other users must see the selected expression');
    assert.equal((await a.snapshot()).expression,expression);
  }
  for(const coat of ['calico','orange','brown','silver','black','white','tuxedo','gray']){
    await a.setCatCoat(coat);
    for(const expression of ['calm','sleepy','yawn','restless','happy']){
      await a.setCatExpression(expression);
      const other=(await b.snapshot()).feed.find(p=>p.id===first.id);
      assert.equal(other.coat,coat);assert.equal(other.expression,expression);
    }
  }
  await assert.rejects(()=>a.setCatCoat('unknown'));
  assert((await b.client.from('oyasumi_profiles').update({cat_coat:'black'}).eq('user_id',a.userId)).error);
  await assert.rejects(()=>a.setCatExpression('other-cat'));
  const forgedExpression=await b.client.from('oyasumi_profiles').update({cat_expression:'restless'}).eq('user_id',a.userId);
  assert(forgedExpression.error,'Direct expression updates must be denied');
  assert.equal((await a.snapshot()).expression,'happy');
  for(const choice of ['sleep','try-sleep','early-sleep']){const post=await a.submitPost(choice);created.add(post.id);snap=await b.snapshot();assert(snap.feed.some(p=>p.id===post.id));const own=await a.snapshot();assert.equal(own.myState,'sleep');assert.equal(own.trend.at(-1).awake,own.awakeCount);assert.equal(own.trend.at(-1).sleeping,own.sleepingCount);assert(snap.sleepingCount>=base.sleepingCount+1);}
  await b.setReaction(first.id,'dream');await a.deletePost(first.id);created.delete(first.id);assert(!(await b.snapshot()).feed.some(p=>p.id===first.id));
  const comfortPost=await a.submitPost('awake');created.add(comfortPost.id);
  await b.setReaction(comfortPost.id,'comfort');
  assert.equal((await b.snapshot()).reactions[comfortPost.id],'comfort');
  await b.setReaction(comfortPost.id,'dream');
  const switched=await a.snapshot();assert.equal(switched.reactionCounts[comfortPost.id].comfort,0);assert.equal(switched.reactionCounts[comfortPost.id].dream,1);
  const signedOut=globalThis.supabase.createClient(OyasumiConfig.url,OyasumiConfig.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
  assert((await signedOut.rpc('oyasumi_tonight_counts')).error,'Unauthenticated RPC must be denied');
  assert((await signedOut.rpc('oyasumi_set_cat_expression',{p_expression:'happy'})).error,'Unauthenticated expression updates must be denied');
  assert((await signedOut.rpc('oyasumi_set_cat_coat',{p_coat:'black'})).error);
  assert((await signedOut.rpc('oyasumi_tonight_trend')).error,'Unauthenticated trend reads must be denied');
  assert((await signedOut.rpc('oyasumi_set_reaction_v2',{p_post_id:comfortPost.id,p_choice:'comfort'})).error);
  assert((await signedOut.rpc('oyasumi_reaction_counts_v2',{p_post_ids:[comfortPost.id]})).error);
  const rows=await signedOut.from('oyasumi_posts').select('*');assert(rows.error||rows.data.length===0,'Unauthenticated data must be denied');
  console.log('PASS live Supabase: two identities, shared posts/names/counts and all five cat expressions, invalid expression/unauthenticated/direct-write denial, reaction privacy, duplicate protection and ownership.');
}
run().catch(error=>{console.error('FAIL live Supabase:',error.message);process.exitCode=1;}).finally(async()=>{
  for(const id of created){try{await a.deletePost(id);}catch{console.error('Test post cleanup failed:',id);process.exitCode=1;}}
  await Promise.all([a.client.auth.signOut({scope:'local'}),b.client.auth.signOut({scope:'local'})]);
});
