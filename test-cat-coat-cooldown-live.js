const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
vm.runInThisContext(fs.readFileSync('vendor/supabase.js','utf8'));
require('./supabase-config.js');require('./supabase-api.js');
const stamp=Date.now(),a=createOyasumiConnection('cooldown-a-'+stamp),b=createOyasumiConnection('cooldown-b-'+stamp);
const connections=[a,b],posts=[];let existing=[];let passed=false;
const checked=r=>{if(r.error)throw r.error;return r.data;};
const status=async c=>checked(await c.client.rpc('oyasumi_cat_coat_status'))[0];
(async()=>{
 await a.initialize();await b.initialize();
 existing=checked(await a.client.from('oyasumi_profiles').select('user_id,nickname,cat_coat,cat_expression,cat_role,profile_note').neq('user_id',a.userId).neq('user_id',b.userId).limit(5));
 assert(existing.length>0,'Existing profiles available for read-only comparison');
 for(const [c,name,coat] of [[a,'制限検証通常猫','black'],[b,'制限検証野生猫','manul']]){
  await c.setNickname(name);assert.equal((await status(c)).changed_at,null);
  const before=await c.snapshot();assert(before.needsCat);
  const paused=before.catCoatStatus.temporarilyUnlocked===true;
  await c.setCatCoat(coat);const first=await status(c),own=await c.snapshot();
  assert.equal(own.coat,coat);assert.equal(own.needsCat,false);assert(own.profileComplete);
  if(paused)assert.equal(first.next_change_at,null);
  else assert.equal(Date.parse(first.next_change_at)-Date.parse(first.changed_at),7*86400000);
  assert(Date.parse(first.changed_at)<=Date.parse(first.server_now));
  assert.equal(own.catCoatStatus.nextChangeAt,paused?null:Date.parse(first.next_change_at));
  for(const target of ['calico','orange','brown','silver','black','white','tuxedo','gray','manul','sand','black-footed','fishing'].filter(x=>x!==coat)){
   if(paused)await c.setCatCoat(target);
   else await assert.rejects(()=>c.setCatCoat(target),e=>e.code==='P0030');
  }
  await c.setCatCoat(coat);if(paused)Object.assign(first,await status(c));
  assert.equal((await status(c)).changed_at,first.changed_at);
  await assert.rejects(()=>c.setCatCoat('invalid'),e=>e.code==='22023');
  for(const request of [
   ()=>c.client.from('oyasumi_cat_coat_changes').update({changed_at:'2000-01-01'}).eq('user_id',c.userId),
   ()=>c.client.from('oyasumi_cat_coat_changes').delete().eq('user_id',c.userId),
   ()=>c.client.from('oyasumi_cat_coat_changes').insert({user_id:c.userId,changed_at:'2000-01-01'}),
   ()=>c.client.from('oyasumi_cat_coat_changes').select('*'),
   ()=>c.client.from('oyasumi_profiles').update({cat_coat:'orange'}).eq('user_id',c.userId)
  ]){const result=await request();assert(result.error,'Direct write/read denied');assert.equal(result.error.code,'42501');}
  assert.equal((await status(c)).changed_at,first.changed_at);
  await c.setCatExpression('surprised');await c.setProfileNote('制限テスト');await c.setCatRole('steady');await c.setNickname(name);
  const after=await c.snapshot();assert.equal(after.expression,'surprised');assert.equal(after.profileNote,'制限テスト');assert.equal(after.catRole,'steady');assert.equal(after.coat,coat);
  assert.equal((await status(c)).changed_at,first.changed_at);
 }
 for(const [c,choice] of [[a,'awake'],[b,'sleep']]){const post=await c.submitPost(choice);posts.push({c,id:post.id});}
 const [awake,sleep]=posts;const peer=await b.snapshot();assert(peer.feed.some(p=>p.id===awake.id&&p.coat==='black'&&p.expression==='surprised'));
 assert((await a.snapshot()).feed.some(p=>p.id===sleep.id&&p.coat==='manul'));assert((await a.snapshot()).myState==='awake');assert((await b.snapshot()).myState==='sleep');
 for(const reaction of ['goodnight','dream','tomorrow','comfort']){await b.setReaction(awake.id,reaction);assert.equal((await a.snapshot()).reactionCounts[awake.id][reaction],1);}
 await a.setReaction(sleep.id,'comfort');assert.equal((await b.snapshot()).reactionCounts[sleep.id].comfort,1);
 await b.setReaction(awake.id,null);assert.equal((await a.snapshot()).reactionCounts[awake.id].comfort,0);
 const visitor=supabase.createClient(OyasumiConfig.url,OyasumiConfig.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
 for(const [name,args] of [['oyasumi_cat_coat_status',{}],['oyasumi_set_cat_coat',{p_coat:'white'}]])assert((await visitor.rpc(name,args)).error);
 const afterExisting=checked(await a.client.from('oyasumi_profiles').select('user_id,nickname,cat_coat,cat_expression,cat_role,profile_note').in('user_id',existing.map(x=>x.user_id)));
 assert.deepEqual(afterExisting.sort((x,y)=>x.user_id.localeCompare(y.user_id)),existing.sort((x,y)=>x.user_id.localeCompare(y.user_id)));
 passed=true;console.log('PASS LIVE: initial saves and all 12 coats under current DB cooldown mode, same-coat retry, private timestamps/tamper/delete/direct-update denied, expression/name/note/role unaffected, two posts and all four reactions, '+existing.length+' existing profiles unchanged (read-only comparison), unauthenticated denial.');
})().catch(e=>{console.error('FAIL LIVE:',e.message,e.code||'');process.exitCode=1;}).finally(async()=>{
 for(const {c,id} of posts){try{assert(await c.deletePost(id));assert(!(await c.snapshot()).ownPosts.some(p=>p.id===id));console.log('CLEANUP: test post deleted (reactions cascade).');}catch(e){console.error('CLEANUP FAILED:',e.message);process.exitCode=1;}}
 for(const c of connections){try{await c.client.auth.signOut({scope:'local'});c.client.auth.stopAutoRefresh();}catch(e){console.error('SIGNOUT FAILED:',e.message);process.exitCode=1;}}
 console.log('REMAINING: two anonymous test auth accounts/profiles and their cooldown records; public client cannot delete them. No existing user was modified.');
});
