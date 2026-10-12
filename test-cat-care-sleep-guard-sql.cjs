const assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const {ids,read,base,windows,guard}=require('./test-support/cat-care-sql.cjs');
(async()=>{
 const db=new PGlite();
 try{
  await db.exec(base());
  await assert.rejects(db.exec(guard()),e=>e.code==='55000');await db.exec('rollback');
  assert.equal((await db.query("select to_regclass('public.oyasumi_cat_post_states') as t")).rows[0].t,null);
  await db.query("insert into public.oyasumi_cat_meals values($1,'2026-10-11','2026-10-11T05:59:00+09:00')",[ids[0]]);
  await db.query("insert into public.oyasumi_cat_treats values($1,$2,'2026-10-11','2026-10-11T05:59:00+09:00')",[ids[0],ids[1]]);
  const snapshot=async()=>({meals:(await db.query('select user_id,care_date,created_at from public.oyasumi_cat_meals order by created_at')).rows,treats:(await db.query('select giver_id,recipient_id,care_date,created_at from public.oyasumi_cat_treats order by created_at')).rows,posts:(await db.query('select * from public.oyasumi_posts order by event_order')).rows});
  await db.query("insert into public.oyasumi_posts(user_id,choice,created_at) values($1,'sleep','2026-10-11T08:00:00+09:00'),($1,'awake','2026-10-11T08:00:00+09:00'),($2,'sleep','2026-10-11T08:00:00+09:00')",[ids[0],ids[1]]);
  const before=await snapshot();
  await db.exec(windows());
  await db.exec('alter table public.oyasumi_cat_meals drop constraint oyasumi_cat_meals_pkey;alter table public.oyasumi_cat_meals add primary key(user_id,care_date);');
  await assert.rejects(db.exec(guard()),e=>e.code==='55000');await db.exec('rollback');
  await db.exec(windows());
  await db.exec("begin;create or replace function public.oyasumi_night_date_at(p_at timestamptz) returns date language sql immutable strict as $$select ((p_at at time zone 'Asia/Tokyo')-interval '18 hours')::date$$;");
  await assert.rejects(db.exec(guard()),e=>e.code==='55000');await db.exec('rollback');
  assert.equal((await db.query("select to_regclass('public.oyasumi_cat_post_states') as t")).rows[0].t,null,'Wrong date boundary rejects before creating state');
  await db.exec(guard());await db.exec(guard());
  assert.deepEqual(await snapshot(),before,'Existing post/meal/treat rows and timestamps are preserved');
  const definitions=async()=>(await db.query("select proname,prosrc,proacl::text from pg_proc where proname in ('oyasumi_cat_care_status_at','oyasumi_cat_care_status','oyasumi_give_cat_meal','oyasumi_give_cat_treat','oyasumi_submit_post','oyasumi_submit_post_v2') order by proname")).rows;
  const installed=await definitions();await db.exec(windows());assert.deepEqual(await definitions(),installed,'Windows reapplication must not downgrade guard/permissions');await db.exec(guard());assert.deepEqual(await definitions(),installed);assert.deepEqual(await snapshot(),before);
  await db.exec(read('supabase/reactions-by-post.sql'));assert.notDeepEqual(await definitions(),installed,'Recreating v2 requires guard afterwards');await db.exec(guard());assert.deepEqual(await definitions(),installed,'Guard safely restores v2 after a post migration');assert.deepEqual(await snapshot(),before);
  const as=async id=>{await db.exec('reset role');await db.query("select set_config('test.uid',$1,false)",[id||'']);await db.exec('set role authenticated');};
  const at=async time=>db.query("select set_config('test.now',$1,false)",[time]);
  const status=async()=>(await db.query('select public.oyasumi_cat_care_status() as s')).rows[0].s;
  const meal=async()=>(await db.query('select public.oyasumi_give_cat_meal() as s')).rows[0].s;
  const treat=async id=>(await db.query('select public.oyasumi_give_cat_treat($1) as s',[id])).rows[0].s;
  const post=async(choice,legacy=false)=>(await db.query(legacy?'select * from public.oyasumi_submit_post($1)':'select * from public.oyasumi_submit_post_v2($1,$2)',legacy?[choice]:[choice,choice==='awake'?'relax':choice==='try-sleep'?'try-sleep':'sleep'])).rows[0];
  await at('2026-10-11T09:00:00+09:00');await as(ids[0]);assert.equal((await status()).catState,'awake','Latest same-timestamp order is backfilled');
  await as(ids[1]);assert.equal((await status()).catState,'sleep');await assert.rejects(meal(),e=>e.code==='P0042');
  for(const [i,choice] of ['sleep','try-sleep','early-sleep'].entries()){
   await as(ids[i+2]);const slept=await post(choice,i===2);assert.equal((await status()).catState,'sleep');await assert.rejects(meal(),e=>e.code==='P0042');
   assert.equal((await post(choice,i===2)).id,slept.id,'Existing 60s duplicate suppression retained');
   await db.query('select public.oyasumi_delete_post($1)',[slept.id]);assert.equal((await status()).catState,'sleep','Deleting latest sleep cannot restore an older state');await assert.rejects(meal(),e=>e.code==='P0042');
   const awake=await post('awake',i===2);assert.equal((await status()).catState,'awake');assert.equal((await meal()).accepted,true);assert.equal((await meal()).accepted,false);
   await db.query('select public.oyasumi_delete_post($1)',[awake.id]);assert.equal((await status()).catState,'awake','Deleting awake does not revive old sleep');
   await db.exec('reset role');await db.exec(guard());await db.exec(windows());await as(ids[i+2]);assert.equal((await status()).catState,'awake','Reapplying after deletion preserves state');
  }
  await as(ids[5]);const older=await post('sleep');await post('awake');
  await db.query("update public.oyasumi_posts set choice='try-sleep',post_intent='try-sleep' where id=$1",[older.id]);assert.equal((await status()).catState,'awake','Older history updates do not override latest order');
  const newest=await post('sleep');await db.query("update public.oyasumi_posts set choice='awake',post_intent='relax' where id=$1",[newest.id]);assert.equal((await status()).catState,'awake','Current-record update follows new choice');
  await db.query("update public.oyasumi_posts set choice='sleep',post_intent='sleep' where id=$1",[newest.id]);await db.query('delete from public.oyasumi_posts where user_id=$1',[ids[5]]);assert.equal((await status()).catState,'sleep','Removing all history retains state');
  for(const time of ['2026-10-11T13:00:00+09:00','2026-10-12T00:00:00+09:00','2026-10-12T05:59:59.999+09:00']){await at(time);assert.equal((await status()).catState,'sleep');await assert.rejects(meal(),e=>e.code==='P0042');}
  await at('2026-10-12T06:00:00+09:00');let s=await status();assert.equal(s.catState,null);assert.equal(s.mealSleeping,false);assert.equal(s.sleepStateVersion,1);assert.equal((await meal()).accepted,true);
  await at('2026-10-12T11:59:59.999+09:00');assert.equal((await meal()).accepted,false);await at('2026-10-12T12:00:00+09:00');assert.equal((await meal()).accepted,true);assert.equal((await meal()).accepted,false);
  assert.equal((await treat(ids[0])).accepted,true);assert.equal((await treat(ids[0])).accepted,false);assert.equal((await treat(ids[1])).accepted,true);assert.equal((await treat(ids[2])).accepted,false);await assert.rejects(treat(ids[5]),e=>e.code==='22023');
  await post('try-sleep');await assert.rejects(meal(),e=>e.code==='P0042','Sleeping rejects duplicate meals too');await post('awake');assert.equal((await meal()).accepted,false,'Awake never replenishes allowance');
  await as(ids[6]);await db.exec('begin');await post('sleep');assert.equal((await status()).catState,'sleep');await db.exec('rollback');assert.equal((await status()).catState,null,'Rollback rolls state back with post');
  // Deleting a newer report exposes an older same-choice row to legacy dedupe.
  // It must create a new report instead of returning that row without a trigger.
  for(const [i,legacy] of [false,true].entries()){
   await as(ids[7]);await at(`2026-10-${13+i*2}T09:00:00+09:00`);
   const oldSleep=await post('sleep',legacy),deletedAwake=await post('awake',legacy);
   await db.query('select public.oyasumi_delete_post($1)',[deletedAwake.id]);assert.equal((await status()).catState,'awake');
   const newSleep=await post('sleep',legacy);assert.notEqual(newSleep.id,oldSleep.id);assert.equal((await status()).catState,'sleep');assert.equal((await post('sleep',legacy)).id,newSleep.id,'Ordinary dedupe still works');
   const oldAwake=await post('awake',legacy),deletedSleep=await post('try-sleep',legacy);
   await db.query('select public.oyasumi_delete_post($1)',[deletedSleep.id]);assert.equal((await status()).catState,'sleep');
   const newAwake=await post('awake',legacy);assert.notEqual(newAwake.id,oldAwake.id);assert.equal((await status()).catState,'awake');assert.equal((await post('awake',legacy)).id,newAwake.id);
   await at(`2026-10-${14+i*2}T09:00:00+09:00`);
   for(let n=0;n<10;n++)await post(n%2?'awake':'sleep',legacy);
   await assert.rejects(post('sleep',legacy),e=>e.code==='22023','Ten-per-minute limit remains');
   await post('awake',legacy); // Dedupe still precedes rate rejection.
  }
  for(const name of ['oyasumi_cat_post_choice_at','oyasumi_cat_is_sleeping_at','oyasumi_cat_care_status_at'])await assert.rejects(db.query('select public.'+name+'(public.test_now())'),e=>e.code==='42501');
  for(const query of ['select * from public.oyasumi_cat_post_states','delete from public.oyasumi_cat_post_states','truncate public.oyasumi_cat_post_states',"update public.oyasumi_cat_post_states set choice='awake'","insert into public.oyasumi_cat_post_states values('"+ids[6]+"','2026-10-12',999,'awake',public.test_now())"])await assert.rejects(db.query(query),e=>e.code==='42501');
  await db.exec('reset role');const sourceRpc=(await db.query("select prosrc from pg_proc where proname='oyasumi_submit_post_v2'")).rows[0].prosrc;assert(sourceRpc.includes('pg_advisory_xact_lock(hashtextextended(v_user::text,0))'));
  assert.equal((await db.query("select count(*)::int as n from pg_trigger where tgname='oyasumi_cat_post_state' and not tgisinternal")).rows[0].n,1);
  assert.equal((await db.query("select count(*)::int as n from pg_trigger where tgname='oyasumi_cat_post_state_lock' and not tgisinternal")).rows[0].n,1);
  const permissions=(await db.query("select proname,has_function_privilege('anon',oid,'EXECUTE') as anon,has_function_privilege('authenticated',oid,'EXECUTE') as authenticated from pg_proc where proname in ('oyasumi_lock_cat_post_state','oyasumi_capture_cat_post_state','oyasumi_cat_post_choice_at','oyasumi_cat_is_sleeping_at','oyasumi_cat_care_status_at')")).rows;assert.equal(permissions.length,5);assert(permissions.every(p=>!p.anon&&!p.authenticated));
  const submits=(await db.query("select has_function_privilege('anon',oid,'EXECUTE') as anon,has_function_privilege('authenticated',oid,'EXECUTE') as authenticated from pg_proc where proname in ('oyasumi_submit_post','oyasumi_submit_post_v2')")).rows;assert.equal(submits.length,2);assert(submits.every(p=>!p.anon&&p.authenticated));
  await db.exec(read('supabase/cat-care-state-inspect.sql'));
  for(const role of ['anon','authenticated']){await db.exec('reset role');await db.query("select set_config('test.uid','',false)");await db.exec('set role '+role);await assert.rejects(meal(),e=>e.code==='42501');await assert.rejects(status(),e=>e.code==='42501');}
  console.log('PASS persisted latest-state SQL: backfill, sleep/awake, legacy/v2 submit, update/delete/rollback, 3h/midnight/06:00/12:00, two meals/treats, private state/helpers, order/reapplication and exact old-row preservation. Local DB only.');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
