const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const {PGlite}=require(process.env.PGLITE_PATH||'@electric-sql/pglite'),db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;
   create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
   create table public.oyasumi_profiles(user_id uuid primary key,profile_note text, nickname text,updated_at timestamptz default now());
   alter table public.oyasumi_profiles add constraint oyasumi_profile_note_length check(char_length(profile_note)<=20);
   insert into public.oyasumi_profiles values('00000000-0000-0000-0000-000000000001','既存のひとこと','既存猫',now());`);
  const sql=fs.readFileSync('supabase/profile-note.sql','utf8');await db.exec(sql);await db.exec(sql);
  assert.equal((await db.query('select profile_note from public.oyasumi_profiles')).rows[0].profile_note,'既存のひとこと');
  await db.exec(`set test.uid='00000000-0000-0000-0000-000000000001';set role authenticated`);
  for(const note of ['あ'.repeat(40),'🌙'.repeat(40),'','今日もゆっくり'])assert.equal((await db.query('select public.oyasumi_set_profile_note($1) as note',[note])).rows[0].note,note);
  for(const note of ['あ'.repeat(41),'🌙'.repeat(41),'https://example.jp','猫@example.jp','090-1234-5678','死♡ね','<script>','a\u200b'])await assert.rejects(db.query('select public.oyasumi_set_profile_note($1)',[note]),e=>e.code==='22023');
  await db.exec('reset role');
  assert.equal((await db.query('select nickname from public.oyasumi_profiles')).rows[0].nickname,'既存猫');
  await assert.rejects(db.query("update public.oyasumi_profiles set profile_note=$1",['あ'.repeat(41)]),e=>e.code==='23514');
  await db.exec(`set test.uid='';set role authenticated`);await assert.rejects(db.query("select public.oyasumi_set_profile_note('こんにちは')"),e=>e.code==='42501');
  console.log('PASS profile note SQL: 20→40 upgrade, repeated migration, existing data, 40/41 Japanese/emoji, empty deletion, contact/abuse screening and authentication.');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
