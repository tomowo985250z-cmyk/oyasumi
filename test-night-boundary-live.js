const assert=require('node:assert/strict');
require('node:vm').runInThisContext(require('node:fs').readFileSync('vendor/supabase.js','utf8'));
require('./supabase-config.js');require('./supabase-api.js');require('./sleep-flow.js');
const connection=createOyasumiConnection('night-boundary-'+Date.now());
(async()=>{
 await connection.initialize();
 const call=async(name,args)=>{const result=await connection.client.rpc(name,args);assert.ifError(result.error);return result.data;};
 for(const [at,night] of [['2026-10-04T05:59:59.999+09:00','2026-10-03'],['2026-10-04T06:00:00+09:00','2026-10-04'],['2026-10-05T05:59:59.999+09:00','2026-10-04']]){
  assert.equal(await call('oyasumi_night_date_at',{p_at:at}),night);
 }
 const snapshot=await connection.snapshot();
 assert.equal(snapshot.nightDate,SleepFlow.night(snapshot.clock.serverNow));
 assert.equal(snapshot.clock.morningNightDate,SleepFlow.previousNight(snapshot.clock.serverNow));
 assert.equal((await call('oyasumi_tonight_summary'))[0].night_date,snapshot.nightDate);
 assert(snapshot.feed.every(post=>post.nightDate===snapshot.nightDate&&SleepFlow.night(post.time)===snapshot.nightDate));
 const signedOut=supabase.createClient(OyasumiConfig.url,OyasumiConfig.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
 assert((await signedOut.rpc('oyasumi_night_context')).error);
 console.log('PASS live night boundary: SQL 05:59/06:00, authoritative JST clock, previous-night morning, shared summary/feed classification, unauthenticated denial.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>connection.client.auth.signOut({scope:'local'}));
