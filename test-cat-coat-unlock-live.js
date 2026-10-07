const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
vm.runInThisContext(fs.readFileSync('vendor/supabase.js','utf8'));require('./supabase-config.js');require('./supabase-api.js');
const a=createOyasumiConnection('unlock-a-'+Date.now()),b=createOyasumiConnection('unlock-b-'+Date.now());let post;
(async()=>{
 await a.initialize();await b.initialize();
 const flag=await a.client.rpc('oyasumi_cat_coat_cooldown_paused');assert.ifError(flag.error);assert.equal(flag.data,true,'DB temporary unlock must be applied');
 for(const coat of ['calico','snow-leopard','leopard','cheetah','jaguar']){
  await a.setCatCoat(coat);const own=await a.snapshot();assert.equal(own.coat,coat);assert.equal(own.catCoatStatus.nextChangeAt,null);assert.equal(own.catCoatStatus.temporarilyUnlocked,true);
  const status=(await a.client.rpc('oyasumi_cat_coat_status')).data[0];assert(status.changed_at);assert.equal(status.next_change_at,null);
  await a.setCatCoat(coat);assert.equal((await a.client.rpc('oyasumi_cat_coat_status')).data[0].changed_at,status.changed_at);
  post=await a.submitPost('sleep');assert.equal((await b.snapshot()).feed.find(p=>p.id===post.id).coat,coat);
  assert((await b.client.from('oyasumi_profiles').update({cat_coat:'black'}).eq('user_id',a.userId)).error);
  await a.deletePost(post.id);post=null;
 }
 for(const request of [a.client.from('oyasumi_cat_coat_cooldown_control').select('*'),a.client.from('oyasumi_cat_coat_cooldown_control').update({paused:false}).eq('singleton',true)])assert((await request).error);
 const visitor=supabase.createClient(OyasumiConfig.url,OyasumiConfig.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});assert((await visitor.rpc('oyasumi_cat_coat_cooldown_paused')).error);
 console.log('PASS live unlock: one user repeatedly saves all four large cats, readback/peer sharing, timer retained, private control and peer/anonymous access denied; remains paused.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(post)await a.deletePost(post.id);await a.client.auth.signOut({scope:'local'});await b.client.auth.signOut({scope:'local'});});
