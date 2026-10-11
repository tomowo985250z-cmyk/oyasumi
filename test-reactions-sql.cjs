const assert=require('node:assert/strict'),fs=require('node:fs');
const {PGlite}=require('@electric-sql/pglite');
require('./reactions.js');
(async()=>{const db=new PGlite();
const users=Array.from({length:5},(_,i)=>'00000000-0000-0000-0000-'+String(i+1).padStart(12,'0'));
try{
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create function public.test_now() returns timestamptz language sql stable as $$select current_setting('test.now')::timestamptz$$;
 create function public.oyasumi_night_date_at(p_at timestamptz) returns date language sql immutable strict set search_path='' as $$select ((p_at at time zone 'Asia/Tokyo')-interval '6 hours')::date$$;
 create function public.oyasumi_morning_night_date_at(p_at timestamptz) returns date language sql immutable strict set search_path='' as $$select public.oyasumi_night_date_at(p_at)-case when extract(hour from p_at at time zone 'Asia/Tokyo')>=6 then 1 else 0 end$$;
 create function public.oyasumi_night_date() returns date language sql stable as $$select public.oyasumi_night_date_at(public.test_now())$$;
 create table public.oyasumi_profiles(user_id uuid primary key);
 create table public.oyasumi_posts(id uuid primary key default gen_random_uuid(),user_id uuid references public.oyasumi_profiles on delete cascade,choice text not null check(choice in ('awake','sleep','try-sleep','early-sleep')),night_date date default public.oyasumi_night_date(),created_at timestamptz default clock_timestamp(),event_order bigint generated always as identity unique);
 create table public.oyasumi_reactions(post_id uuid references public.oyasumi_posts on delete cascade,user_id uuid references public.oyasumi_profiles on delete cascade,choice text check(choice in ('goodnight','dream','tomorrow')),updated_at timestamptz default clock_timestamp(),primary key(post_id,user_id));`);
 await db.exec(fs.readFileSync('test-fixtures/reactions-base.sql','utf8'));
 await db.exec(fs.readFileSync('supabase/reactions-four.sql','utf8'));
 await db.exec(fs.readFileSync('supabase/morning-reactions.sql','utf8'));
 for(const user of users)await db.query('insert into public.oyasumi_profiles values($1)',[user]);
 await db.exec(`select set_config('test.now','2026-10-11T23:00:00+09:00',false)`);
 const as=async user=>{await db.exec('reset role');await db.query("select set_config('test.uid',$1,false)",[user||'']);await db.exec('set role authenticated');};
 const sql=fs.readFileSync('supabase/reactions-by-post.sql','utf8');
 const submit=async(choice,intent)=>(await db.query('select * from public.oyasumi_submit_post_v2($1,$2)',[choice,intent])).rows[0];
 const react=async(id,choice)=>db.query('select public.oyasumi_set_reaction_v3($1,$2)',[id,choice]);
 const counts=async ids=>(await db.query('select * from public.oyasumi_reaction_counts_v3($1::uuid[])',[ids])).rows;
 const receipt=async()=>(await db.query('select * from public.oyasumi_morning_reactions_v2()')).rows[0];
 await as(users[0]);const old=(await db.query("select * from public.oyasumi_submit_post('awake')")).rows[0];
 await as(users[1]);await db.query("select public.oyasumi_set_reaction_v2($1,'comfort')",[old.id]);
 await db.exec('reset role');const before=(await db.query('select * from public.oyasumi_reactions')).rows;
 const original=(await db.query("select oid::regprocedure::text as id,prosrc from pg_proc where proname in ('oyasumi_submit_post','oyasumi_set_reaction','oyasumi_reaction_counts','oyasumi_morning_reactions','oyasumi_night_date_at','oyasumi_morning_night_date_at') order by proname")).rows;
 await db.exec(sql);await db.exec(sql);
 assert.deepEqual((await db.query('select * from public.oyasumi_reactions')).rows,before,'Migration preserves legacy records exactly');
 assert.deepEqual((await db.query("select oid::regprocedure::text as id,prosrc from pg_proc where proname in ('oyasumi_submit_post','oyasumi_set_reaction','oyasumi_reaction_counts','oyasumi_morning_reactions','oyasumi_night_date_at','oyasumi_morning_night_date_at') order by proname")).rows,original,'Original RPCs and clock definitions unchanged');
 assert.equal((await db.query('select post_intent from public.oyasumi_posts where id=$1',[old.id])).rows[0].post_intent,null);
 await as(users[0]);const posts=[];
 for(const [choice,intent] of [['awake','relax'],['awake','sleepless'],['sleep','sleep'],['try-sleep','try-sleep']]){
  const post=await submit(choice,intent);posts.push(post);assert.equal(post.choice,choice);assert.equal(post.post_intent,intent);
  const duplicates=await Promise.all([submit(choice,intent),submit(choice,intent)]);assert(duplicates.every(r=>r.id===post.id));
 }
 assert.notEqual(posts[0].id,posts[1].id,'Switching awake intent creates a separate historical post');
 await assert.rejects(submit('awake','sleep'),e=>e.code==='22023');await assert.rejects(submit('awake',null),e=>e.code==='22023');
 await as(users[1]);
 for(const post of posts){
  const options=PostReactions.options({status:post.choice,intent:post.post_intent});
  for(const {id} of options){await react(post.id,id);await react(post.id,id);const r=(await counts([post.id]))[0];assert.deepEqual(r.counts,{[id]:1});assert.equal(r.my_choice,id);}
  await assert.rejects(react(post.id,'goodnight'),e=>e.code==='22023');
  const wrong=PostReactions.options({status:post.choice==='awake'?'sleep':'awake'})[0].id;
  await assert.rejects(react(post.id,wrong),e=>e.code==='22023');
  assert.deepEqual((await counts([post.id]))[0].counts,{[options[3].id]:1},'Rejected replacement rolls back original record');
  await react(post.id,null);await react(post.id,null);assert.deepEqual((await counts([post.id]))[0].counts,{});
 }
 assert.equal((await counts([old.id]))[0].counts.comfort,1);await react(old.id,null);assert.deepEqual((await counts([old.id]))[0].counts,{});
 await db.query("select public.oyasumi_set_reaction_v2($1,'dream')",[old.id]);assert.equal((await counts([old.id]))[0].counts.dream,1,'Old clients remain compatible');
 await react(posts[0].id,'relax-time');await as(users[2]);await react(posts[0].id,'relax-time');
 assert.equal((await counts([posts[0].id]))[0].counts['relax-time'],2);
 await as(users[0]);await react(posts[0].id,'relax-time'); // Existing self-reaction rule remains; morning excludes it.
 await db.exec('reset role');
 for(const [i,post] of posts.entries())await db.query("update public.oyasumi_posts set night_date='2026-10-10',created_at='2026-10-10T23:00:00+09:00' where id=$1",[post.id]);
 await db.query("update public.oyasumi_posts set night_date='2026-10-10' where id=$1",[old.id]);
 await db.exec(sql.replaceAll('statement_timestamp()','public.test_now()'));
 for(const [at,night] of [['2026-10-11T05:59:59.999+09:00','2026-10-10'],['2026-10-11T06:00:00+09:00','2026-10-11']]){
  await db.query("select set_config('test.now',$1,false)",[at]);await as(users[0]);
  assert.equal((await db.query('select public.oyasumi_night_date()::text as d')).rows[0].d,night);
  let r=await receipt();assert.equal(r.night_date.toISOString().slice(0,10),'2026-10-10');assert.deepEqual(r.counts,{'relax-time':2,dream:1});
  await as(users[1]);assert.deepEqual((await receipt()).counts,{},'Only recipient can read morning totals');await db.exec('reset role');
 }
 await as(users[1]);assert.equal((await counts(posts.map(p=>p.id))).length,0,'Peer cannot read previous-night history');
 await assert.rejects(react(posts[0].id,null),e=>e.code==='22023','Previous-night peer cancellation follows original visibility');
 await as(users[0]);assert.equal((await counts(posts.map(p=>p.id))).length,4,'Author can still read all history');
 await assert.rejects(counts(Array(101).fill(old.id)),e=>e.code==='22023');await assert.rejects(counts(null),e=>e.code==='22023');
 await db.exec('reset role');await db.query("select set_config('test.now','2026-10-11T23:00:00+09:00',false)");await as(users[3]);
 for(let i=0;i<10;i++)await submit('awake',i%2?'sleepless':'relax');
 await assert.rejects(submit('sleep','sleep'),e=>e.code==='22023','Existing ten-per-minute limit retained');
 for(const user of ['',null]){await as(user);await assert.rejects(submit('awake','relax'),e=>e.code==='42501');await assert.rejects(react(old.id,null),e=>e.code==='42501');await assert.rejects(counts([]),e=>e.code==='42501');await assert.rejects(receipt(),e=>e.code==='42501');}
 await db.exec('reset role;set role anon');await assert.rejects(receipt(),e=>e.code==='42501');await assert.rejects(counts([]),e=>e.code==='42501');
 console.log('PASS reactions SQL: idempotent migration, unchanged historical records/RPCs/clocks, 16 valid choices, invalid choice rollback, replacement/cancel/deduplication, awake intent separation, 60-second dedupe/10-per-minute limit, legacy compatibility, private previous-night counts, JST 06:00 and self exclusion.');
}finally{await db.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
