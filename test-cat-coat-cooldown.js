const assert=require('node:assert/strict'),fs=require('node:fs');
require('./cat-coat-cooldown.js');
const now=Date.parse('2026-10-05T10:00:00Z'),end=now+30*86400000;
assert(CatCoatCooldown.available({nextChangeAt:null},now));
assert(!CatCoatCooldown.available(null,now));
assert(!CatCoatCooldown.available({nextChangeAt:end},end-1));
assert(CatCoatCooldown.available({nextChangeAt:end},end));
assert(CatCoatCooldown.message({nextChangeAt:end},now).includes('2026/11/4 19:00'));
(async()=>{
 const {PGlite}=require(process.env.PGLITE_PATH||'@electric-sql/pglite');const db=new PGlite();
 try {
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create table public.oyasumi_profiles(user_id uuid primary key,nickname text,cat_coat text,cat_expression text default 'calm',updated_at timestamptz default now());
 insert into public.oyasumi_profiles values('00000000-0000-0000-0000-000000000001','既存猫','calico','happy',now());`);
 const migration=fs.readFileSync('supabase/cat-coat-cooldown.sql','utf8');await db.exec(migration);await db.exec(migration);
 assert.equal((await db.query('select count(*)::int as n from public.oyasumi_cat_coat_changes')).rows[0].n,0);
 await db.exec(fs.readFileSync('supabase/wild-cats.sql','utf8'));
 const user='00000000-0000-0000-0000-000000000001';await db.exec(`set test.uid='${user}';set role authenticated`);
 assert.equal((await db.query('select * from public.oyasumi_cat_coat_status()')).rows[0].next_change_at,null);
 await db.query(`select public.oyasumi_set_cat_coat('calico')`);
 const first=(await db.query('select * from public.oyasumi_cat_coat_status()')).rows[0];
 assert.equal(new Date(first.next_change_at)-new Date(first.changed_at),30*86400000);
 for(const coat of ['orange','manul','sand','black-footed','fishing'])await assert.rejects(db.query('select public.oyasumi_set_cat_coat($1)',[coat]),e=>e.code==='P0030');
 await db.query(`select public.oyasumi_set_cat_coat('calico')`);
 assert.equal(String((await db.query('select * from public.oyasumi_cat_coat_status()')).rows[0].changed_at),String(first.changed_at));
 await assert.rejects(db.query(`update public.oyasumi_cat_coat_changes set changed_at='2000-01-01'`),e=>e.code==='42501');
 await assert.rejects(db.query(`update public.oyasumi_profiles set cat_coat='white'`),e=>e.code==='42501');
 await db.exec('reset role');
 await assert.rejects(db.query(`update public.oyasumi_profiles set cat_coat='white' where user_id=$1`,[user]),e=>e.code==='P0030');
 await db.query(`update public.oyasumi_profiles set nickname='名前だけ',cat_expression='sleepy' where user_id=$1`,[user]);
 await db.query(`update public.oyasumi_cat_coat_changes set changed_at=clock_timestamp()-interval '719 hours' where user_id=$1`,[user]);
 await db.exec('set role authenticated');await assert.rejects(db.query(`select public.oyasumi_set_cat_coat('manul')`),e=>e.code==='P0030');await db.exec('reset role');
 await db.query(`update public.oyasumi_cat_coat_changes set changed_at=clock_timestamp()-interval '720 hours' where user_id=$1`,[user]);
 await db.exec('set role authenticated');await db.query(`select public.oyasumi_set_cat_coat('manul')`);
 await assert.rejects(db.query(`select public.oyasumi_set_cat_coat('calico')`),e=>e.code==='P0030');
 await db.exec('reset role');await db.exec(`set test.uid='00000000-0000-0000-0000-000000000002';set role authenticated`);
 await db.query(`select public.oyasumi_set_cat_coat('fishing')`);
 await assert.rejects(db.query(`select public.oyasumi_set_cat_coat('black')`),e=>e.code==='P0030');
 await db.exec('reset role');
 for(const coat of ['calico','orange','brown','silver','black','white','tuxedo','gray','manul','sand','black-footed','fishing']){
  await db.query(`update public.oyasumi_cat_coat_changes set changed_at=clock_timestamp()-interval '721 hours' where user_id=$1`,[user]);
  await db.exec(`set test.uid='${user}';set role authenticated`);await db.query('select public.oyasumi_set_cat_coat($1)',[coat]);await db.exec('reset role');
 }
 await db.exec(`set test.uid='00000000-0000-0000-0000-000000000003';set role authenticated`);
 const concurrent=await Promise.allSettled(['orange','manul'].map(coat=>db.query('select public.oyasumi_set_cat_coat($1)',[coat])));
 assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,1);assert.equal(concurrent.find(r=>r.status==='rejected').reason.code,'P0030');
 await db.exec(`reset role;set test.uid='';set role anon`);
 await assert.rejects(db.query('select * from public.oyasumi_cat_coat_status()'),e=>e.code==='42501');
 console.log('PASS cat cooldown: initial save, unchanged existing profiles, 30-day boundary, same-cat retry, 12 species, SQL/RPC bypass denial, private timestamps, unrelated edits, anonymous denial.');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
