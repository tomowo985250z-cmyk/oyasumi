const assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
(async()=>{const db=new PGlite();const ids=Array.from({length:5},(_,i)=>'00000000-0000-0000-0000-'+String(i+1).padStart(12,'0'));
try{
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create table public.oyasumi_profiles(user_id uuid primary key,cat_coat text,nickname text);
 create table public.oyasumi_posts(user_id uuid,choice text,created_at timestamptz);
 create table public.oyasumi_cat_coat_cooldown_control(singleton boolean primary key,paused boolean);insert into public.oyasumi_cat_coat_cooldown_control values(true,true);`);
 for(const [i,id] of ids.entries())await db.query('insert into public.oyasumi_profiles values($1,$2,$3)',[id,'calico','猫'+i]);
 const sql=fs.readFileSync('supabase/cat-care.sql','utf8');await db.exec(sql);await db.exec(sql);
 const as=async id=>{await db.exec('reset role');await db.query("select set_config('test.uid',$1,false)",[id||'']);await db.exec('set role authenticated')};
 const status=async()=> (await db.query('select public.oyasumi_cat_care_status() as s')).rows[0].s;
 const meal=async()=> (await db.query('select public.oyasumi_give_cat_meal() as s')).rows[0].s;
 const treat=async id=> (await db.query('select public.oyasumi_give_cat_treat($1) as s',[id])).rows[0].s;
 await as(ids[0]);let s=await status();assert.equal(s.mealEligible,false);assert.equal(s.receivedTotal,0);await assert.rejects(meal(),e=>e.code==='P0040');
 // A treat needs no sleeping post or streak; only one total, even to a different cat.
 assert.equal((await treat(ids[1])).accepted,true);assert.equal((await treat(ids[2])).accepted,false);
 await assert.rejects(treat(ids[0]),e=>e.code==='22023');await assert.rejects(treat(null),e=>e.code==='22023');await assert.rejects(treat('00000000-0000-0000-0000-000000000099'),e=>e.code==='P0041');
 for(const table of ['oyasumi_cat_meals','oyasumi_cat_treats'])for(const statement of ['select * from ','delete from '])await assert.rejects(db.exec(statement+'public.'+table),e=>e.code==='42501');
 await assert.rejects(db.query('insert into public.oyasumi_cat_treats values($1,$2,current_date,now())',[ids[0],ids[2]]),e=>e.code==='42501');
 await db.exec('reset role');await db.query(`insert into public.oyasumi_posts values($1,'sleep',clock_timestamp()-interval '30 days')`,[ids[0]]);
 await as(ids[0]);await assert.rejects(meal(),e=>e.code==='P0040');
 // All existing sleeping choices qualify independently; an awake report never does.
 for(const [i,choice] of ['sleep','try-sleep','early-sleep'].entries()){
  await db.exec('reset role');await db.query('insert into public.oyasumi_posts values($1,$2,clock_timestamp())',[ids[i],choice]);await as(ids[i]);
  assert.equal((await status()).mealEligible,true);
  const calls=await Promise.all([meal(),meal(),meal()]);assert.equal(calls.filter(r=>r.accepted).length,1);assert.equal((await status()).mealDone,true);
 }
 await db.exec('reset role');await db.query(`insert into public.oyasumi_posts values($1,'awake',clock_timestamp())`,[ids[4]]);await as(ids[4]);await assert.rejects(meal(),e=>e.code==='P0040');
 // Three different senders, no recipient statistics for another user and no sender fields.
 await as(ids[2]);assert.equal((await treat(ids[1])).accepted,true);await as(ids[3]);const race=await Promise.all([treat(ids[1]),treat(ids[2])]);assert.equal(race.filter(r=>r.accepted).length,1);
 await as(ids[1]);s=await status();assert.equal(s.receivedToday,3);assert.equal(s.receivedTotal,3);assert.deepEqual(s.receivedDays,[{day:s.day,count:3}]);assert(!JSON.stringify(s).includes(ids[0]));assert.deepEqual(Object.keys(s).sort(),['day','mealEligible','mealDone','receivedDays','receivedToday','receivedTotal','treatGiven'].sort());
 // Past-day records count toward total/history but do not consume today's allowance.
 await db.exec('reset role');await db.query(`insert into public.oyasumi_cat_treats values($1,$2,((clock_timestamp() at time zone 'Asia/Tokyo')::date-1),clock_timestamp()-interval '1 day')`,[ids[4],ids[1]]);await as(ids[4]);assert.equal((await status()).treatGiven,false);assert.equal((await treat(ids[1])).accepted,true);await as(ids[1]);s=await status();assert.equal(s.receivedToday,4);assert.equal(s.receivedTotal,5);assert.equal(s.receivedDays.length,2);
 // No direct editing/removal; anonymous and authenticated-without-uid RPCs fail.
 await as('');await assert.rejects(status(),e=>e.code==='42501');await assert.rejects(meal(),e=>e.code==='42501');await assert.rejects(treat(ids[1]),e=>e.code==='42501');await db.exec('reset role;set role anon');await assert.rejects(status(),e=>e.code==='42501');await assert.rejects(meal(),e=>e.code==='42501');await assert.rejects(treat(ids[1]),e=>e.code==='42501');
 await db.exec('reset role');assert.equal((await db.query('select paused from public.oyasumi_cat_coat_cooldown_control')).rows[0].paused,true);assert.equal((await db.query('select count(*)::int as n from public.oyasumi_profiles')).rows[0].n,5);
 // Deterministic JST 00:00 eligibility checks in an isolated database only.
 for(const [at,expected] of [['2026-10-10T14:59:59.999Z',true],['2026-10-10T15:00:00.000Z',false]]){
  const fixed=sql.replaceAll('clock_timestamp()',`'${at}'::timestamptz`);await db.exec(fixed);await db.exec('delete from public.oyasumi_cat_meals;delete from public.oyasumi_posts');await db.query(`insert into public.oyasumi_posts values($1,'sleep','2026-10-10T14:59:59Z')`,[ids[0]]);await as(ids[0]);assert.equal((await status()).mealEligible,expected);if(expected)assert.equal((await meal()).accepted,true);else await assert.rejects(meal(),e=>e.code==='P0040');await db.exec('reset role');
 }
 // The same giver regains a single allowance at JST midnight; totals persist.
 await db.exec('delete from public.oyasumi_cat_treats');
 await db.exec(sql.replaceAll('clock_timestamp()',"'2026-10-10T14:59:59.999Z'::timestamptz"));await as(ids[0]);
 assert.equal((await treat(ids[1])).accepted,true);assert.equal((await treat(ids[2])).accepted,false);
 await db.exec('reset role');await db.exec(sql.replaceAll('clock_timestamp()',"'2026-10-10T15:00:00.000Z'::timestamptz"));await as(ids[0]);assert.equal((await status()).treatGiven,false);
 assert.equal((await treat(ids[1])).accepted,true);assert.equal((await treat(ids[2])).accepted,false);
 await as(ids[1]);s=await status();assert.equal(s.receivedToday,1);assert.equal(s.receivedTotal,2);assert.deepEqual(s.receivedDays,[{day:'2026-10-11',count:1},{day:'2026-10-10',count:1}]);
 console.log('PASS cat care SQL: additive/idempotent migration, authenticated-only RPCs, private tables, own-day sleep eligibility, all sleep choices, no streak, global daily treat, duplicate/racing requests, anonymous day/total history, JST midnight and paused cooldown preserved.');
 fs.mkdirSync('output/cat-care-v1',{recursive:true});fs.writeFileSync('output/cat-care-v1/sql-report.json',JSON.stringify({pass:true,productionDbAccess:false,engine:'PGlite 0.3.14',dailyTreat:'one per giver in total',dayBoundary:'00:00 Asia/Tokyo'},null,2));
}finally{await db.close()}})().catch(e=>{console.error(e);process.exitCode=1});
