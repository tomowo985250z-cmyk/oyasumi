const assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
(async()=>{
 const db=new PGlite(),id='00000000-0000-0000-0000-000000000001';
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;
   create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
   create function public.test_now() returns timestamptz language sql as $$select current_setting('test.now')::timestamptz$$;
   create table public.oyasumi_profiles(user_id uuid primary key,cat_coat text);
   create table public.oyasumi_posts(user_id uuid,choice text,created_at timestamptz,event_order bigint generated always as identity);`);
  await db.query('insert into public.oyasumi_profiles values($1,$2)',[id,'calico']);
  for(const file of ['cat-care.sql','cat-care-two-windows.sql','cat-care-sleep-guard.sql','cat-care-sleep-guard.sql'])await db.exec(fs.readFileSync('supabase/'+file,'utf8').replaceAll('clock_timestamp()','public.test_now()'));
  const at=async time=>db.query("select set_config('test.now',$1,false)",[time]);
  const status=async()=>(await db.query('select public.oyasumi_cat_care_status() as s')).rows[0].s;
  const meal=async()=>(await db.query('select public.oyasumi_give_cat_meal() as s')).rows[0].s;
  const post=async(choice,time)=>{await db.exec('reset role');await db.query('insert into public.oyasumi_posts(user_id,choice,created_at) values($1,$2,$3)',[id,choice,time]);await db.exec('set role authenticated');};
  await db.query("select set_config('test.uid',$1,false)",[id]);await db.exec('set role authenticated');
  await at('2026-10-11T06:00:00+09:00');assert.equal((await meal()).accepted,true);assert.equal((await meal()).accepted,false);
  await at('2026-10-11T14:00:00+09:00');assert.equal((await status()).mealSleeping,false);
  for(const choice of ['sleep','try-sleep','early-sleep']){
   await post(choice,'2026-10-11T14:00:00+09:00');assert.equal((await status()).mealSleeping,true);
   await assert.rejects(meal(),e=>e.code==='P0042');
   await post('awake','2026-10-11T14:00:00+09:00');assert.equal((await status()).mealSleeping,false);
  }
  await post('sleep','2026-10-11T14:00:00+09:00');
  for(const time of ['2026-10-11T18:00:00+09:00','2026-10-12T00:00:00+09:00','2026-10-12T05:59:59.999+09:00']){await at(time);assert.equal((await status()).mealSleeping,true);await assert.rejects(meal(),e=>e.code==='P0042');}
  await db.exec('reset role');assert.equal((await db.query('select count(*) as n from public.oyasumi_cat_meals')).rows[0].n,1);await db.exec('set role authenticated');
  await at('2026-10-12T06:00:00+09:00');assert.equal((await status()).mealSleeping,false);assert.equal((await meal()).accepted,true);assert.equal((await meal()).accepted,false);
  await at('2026-10-12T12:00:00+09:00');assert.equal((await meal()).accepted,true);
  await post('sleep','2026-10-12T12:00:00+09:00');await assert.rejects(meal(),e=>e.code==='P0042','Sleep guard precedes duplicate response');
  await assert.rejects(db.query('select public.oyasumi_cat_is_sleeping_at(public.test_now())'),e=>e.code==='42501');
  await db.exec('reset role');await db.query("select set_config('test.uid','',false)");await db.exec('set role authenticated');await assert.rejects(meal(),e=>e.code==='42501');
  console.log('PASS sleep guard SQL: three sleep choices, latest awake at identical time, 3h/midnight/06:00/12:00, zero writes on rejection, duplicate guard, private helper, idempotence. Local DB only.');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
