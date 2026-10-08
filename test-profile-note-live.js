const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
vm.runInThisContext(fs.readFileSync('vendor/supabase.js','utf8'));vm.runInThisContext(fs.readFileSync('nickname.js','utf8'));
require('./supabase-config.js');require('./supabase-api.js');
const a=createOyasumiConnection('note-a-'+Date.now()),b=createOyasumiConnection('note-b-'+Date.now());let post;
const invalid=['あ'.repeat(41),'https://example.jp','ねこ@example.jp','090-1234-5678','０９０１２３４５６７８','死ね','死♡ね','セックス','fuck','s♡e♡x','<script>','a\u200b'];
(async()=>{
 for(const value of ['', 'あ'.repeat(40),'今日もゆっくり🌙'])assert.equal(NicknameRules.validate(value,{max:40,optional:true,countText:v=>[...v].length}).error,'');
 for(const value of invalid)assert(NicknameRules.validate(value,{max:40,optional:true,countText:v=>[...v].length}).error,value);
 await a.initialize();await b.initialize();assert.equal((await a.snapshot()).profileNote,'');
 await a.setNickname('ひとこと猫');await a.setCatCoat('gray');await a.setCatRole('mechanic');
 post=await a.submitPost('awake');
 for(const note of ['あ'.repeat(40),'今日もゆっくり🌙','']){
  assert.equal(await a.setProfileNote(note),note);const snap=await b.snapshot();
  assert.equal(snap.feed.find(p=>p.id===post.id).profileNote,note);
 }
 await a.setProfileNote('今夜ものんびり');
 for(const value of invalid)await assert.rejects(()=>a.setProfileNote(value),value);
 const own=await a.snapshot();assert.equal(own.profileNote,'今夜ものんびり');assert.equal(own.name,'ひとこと猫');assert.equal(own.coat,'gray');assert.equal(own.catRole,'mechanic');
 assert.equal((await b.snapshot()).profileNote,'');
 assert((await b.client.from('oyasumi_profiles').update({profile_note:'不正変更'}).eq('user_id',a.userId)).error);
 const visitor=supabase.createClient(OyasumiConfig.url,OyasumiConfig.publishableKey,{auth:{persistSession:false}});
 assert((await visitor.rpc('oyasumi_set_profile_note',{p_note:'こんにちは'})).error);
 console.log('PASS profile notes: 40/41 characters, empty, contact/abuse/symbol screening in client and DB, sharing, identity/direct-write denial, existing profile preserved.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
 if(post)await a.deletePost(post.id);await a.client.auth.signOut({scope:'local'});await b.client.auth.signOut({scope:'local'});
});
