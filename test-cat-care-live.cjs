// Explicit production smoke test: creates isolated anonymous test accounts.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
vm.runInThisContext(fs.readFileSync('vendor/supabase.js','utf8'));require('./supabase-config.js');require('./supabase-api.js');
const users=['a','b','c'].map(id=>createOyasumiConnection('care-live-'+id+'-'+Date.now())),posts=[];
(async()=>{
 for(const [i,u] of users.entries()){await u.initialize();await u.setNickname('ごはん検証'+String.fromCharCode(65+i));await u.setCatCoat('calico');}
 const [a,b,c]=users;assert.equal((await a.client.rpc('oyasumi_cat_coat_cooldown_paused')).data,true);
 await assert.rejects(a.giveCatMeal(),e=>e.code==='P0040');posts.push([a,(await a.submitPost('sleep')).id]);
 const meals=await Promise.all([a.giveCatMeal(),a.giveCatMeal()]);assert.equal(meals.filter(x=>x.accepted).length,1);assert.equal((await a.getCatCareStatus()).mealDone,true);
 assert.equal((await a.giveCatTreat(b.userId)).accepted,true);assert.equal((await a.giveCatTreat(c.userId)).accepted,false);
 const received=await b.getCatCareStatus();assert.equal(received.receivedToday,1);assert.equal(received.receivedTotal,1);assert.deepEqual(received.receivedDays,[{day:received.day,count:1}]);assert(!JSON.stringify(received).includes(a.userId));
 const reread=createOyasumiConnection('care-live-reload-'+Date.now());const session=(await a.client.auth.getSession()).data.session;assert.ifError((await reread.client.auth.setSession({access_token:session.access_token,refresh_token:session.refresh_token})).error);await reread.initialize();assert.equal((await reread.getCatCareStatus()).mealDone,true);assert.equal((await reread.getCatCareStatus()).treatGiven,true);
 for(const t of ['oyasumi_cat_meals','oyasumi_cat_treats'])assert((await a.client.from(t).select('*')).error);
 assert.equal((await a.client.rpc('oyasumi_cat_coat_cooldown_paused')).data,true);
 fs.mkdirSync('output/cat-care-v1',{recursive:true});fs.writeFileSync('output/cat-care-v1/production-live-report.json',JSON.stringify({pass:true,realMealSave:true,parallelMealDuplicateBlocked:true,realTreatSave:true,secondRecipientBlocked:true,anonymousDayTotalHistory:true,sessionReloadPersistence:true,privateTables:true,cooldownPaused:true,testAccounts:3,testRecordsRetained:'care history retained; only own temporary sleep post cleaned'},null,2));console.log('PASS production: actual meal/treat saves, duplicates, second recipient, anonymous history, persistence, private tables, paused cooldown');
})().catch(e=>{console.error(e.message);process.exitCode=1}).finally(async()=>{for(const [u,id] of posts)try{await u.deletePost(id)}catch{}for(const u of users)await u.client.auth.signOut({scope:'local'});});
