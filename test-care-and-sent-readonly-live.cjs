// Production smoke test: a fresh anonymous auth session, read-only application RPCs.
// Does not create profiles/posts/reactions/care records or call any saving RPC.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
vm.runInThisContext(fs.readFileSync('vendor/supabase.js','utf8'));
require('./supabase-config.js');require('./supabase-api.js');
const connection=createOyasumiConnection('care-sent-readonly-'+Date.now());
(async()=>{
 try{
  await connection.initialize();
  const snapshot=await connection.snapshot();
  const [care,people]=await Promise.all([connection.getCatCareStatus(),connection.getSentReactionPeople()]);
  assert.equal(care.allowanceVersion,2);assert.equal(care.day,snapshot.clock.nightDate);
  assert.equal(care.mealSlot,snapshot.clock.serverNow<Date.parse(care.day+'T12:00:00+09:00')?'morning':'night');
  assert.equal(care.mealDone,false);assert.equal(care.mealEligible,false,'Fresh account has no cat profile');
  assert.equal(care.treatCount,0);assert.equal(care.treatGiven,false);assert.deepEqual(care.treatRecipients,[]);
  assert.equal(care.receivedToday,0);assert.equal(care.receivedTotal,0);
  assert.deepEqual(people,{nightDate:snapshot.clock.nightDate,count:0});
  assert.equal(snapshot.catCare.allowanceVersion,2);assert.equal(snapshot.ownPosts.length,0);
  assert.equal(snapshot.reactionVersion,3);assert.equal(snapshot.trendSupported,true);
  assert(snapshot.tonightSummary,'Existing summary RPC remains available');
  assert(Number.isSafeInteger(snapshot.awakeCount)&&snapshot.awakeCount>=0);
  assert(Number.isSafeInteger(snapshot.sleepingCount)&&snapshot.sleepingCount>=0);
  for(const name of ['oyasumi_morning_reactions_v2','oyasumi_cat_coat_cooldown_paused']){
   const result=await connection.client.rpc(name);assert.ifError(result.error);
  }
  for(const table of ['oyasumi_cat_meals','oyasumi_cat_treats']){
   const result=await connection.client.from(table).select('*').limit(1);
   assert.equal(result.error?.code,'42501',table+' must remain private');
  }
  const helper=await connection.client.rpc('oyasumi_cat_care_status_at',{p_now:new Date().toISOString()});
  assert.equal(helper.error?.code,'42501','Internal helper must not be callable by clients');
  const anonymous=supabase.createClient(OyasumiConfig.url,OyasumiConfig.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
  for(const name of ['oyasumi_cat_care_status','oyasumi_sent_reaction_people']){
   const result=await anonymous.rpc(name);assert.equal(result.error?.code,'42501','Unauthenticated RPC denied');
  }
  const report={pass:true,checkedAt:new Date().toISOString(),careVersion:care.allowanceVersion,nightDate:care.day,mealSlot:care.mealSlot,
   sentReactionPeopleRpc:true,existingReadRpcs:true,privateTables:true,privateHelper:true,unauthenticatedDenied:true,
   applicationWrites:0,authSessionsCreated:1,existingDataReadOnly:true};
  fs.mkdirSync('output/care-and-sent-v2',{recursive:true});
  fs.writeFileSync('output/care-and-sent-v2/readonly-live-report.json',JSON.stringify(report,null,2));
  console.log('PASS production read-only: care v2 and sent-people RPC, current 06:00 day/meal slot, existing counts/trend/summary/reactions, private tables/helper and unauthenticated denial. No application data writes.');
 }finally{await connection.client.auth.signOut({scope:'local'});}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
