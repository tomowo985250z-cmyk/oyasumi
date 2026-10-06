const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const {PGlite}=require(process.env.PGLITE_PATH||'@electric-sql/pglite');const db=new PGlite();
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create function public.test_now() returns timestamptz language sql as $$select current_setting('test.now')::timestamptz$$;
 create function public.oyasumi_night_date_at(p_at timestamptz) returns date language sql as $$select ((p_at at time zone 'Asia/Tokyo')-interval '6 hours')::date$$;
 create function public.oyasumi_tonight_counts() returns table(night_date date) language sql as $$select public.oyasumi_night_date_at(public.test_now())$$;
 create table public.oyasumi_posts(user_id uuid not null,choice text not null check(choice in ('awake','sleep','try-sleep','early-sleep')),night_date date not null,created_at timestamptz not null,event_order bigint primary key);
 set test.uid='00000000-0000-0000-0000-000000000001';set test.now='2026-10-06T05:59:59+09:00';`);
 const sql=fs.readFileSync('supabase/tonight-trend.sql','utf8').replaceAll('statement_timestamp()','public.test_now()');
 await db.exec(sql);await db.exec(sql);
 let order=0;
 const post=async(user,choice,at)=>db.query(`insert into public.oyasumi_posts values($1,$2,public.oyasumi_night_date_at($3::timestamptz),$3::timestamptz,$4)`,[`00000000-0000-0000-0000-${String(user).padStart(12,'0')}`,choice,at,++order]);
 await post(1,'awake','2026-10-05T23:01:00+09:00');await post(1,'awake','2026-10-05T23:02:00+09:00');
 await post(1,'sleep','2026-10-06T00:01:00+09:00');await post(1,'awake','2026-10-06T01:01:00+09:00');
 await post(2,'try-sleep','2026-10-05T23:31:00+09:00');await post(3,'early-sleep','2026-10-06T02:01:00+09:00');
 await post(4,'awake','2026-10-06T06:00:00+09:00');
 const check=async()=>{
 const {rows}=await db.query('select * from public.oyasumi_tonight_trend()');
 for(const p of rows){
 const expected=(await db.query(`with latest as(select distinct on(user_id) user_id,choice from public.oyasumi_posts where night_date=$1 and created_at<=$2 order by user_id,event_order desc) select count(*)::int as total,count(*) filter(where choice='awake')::int as awake,count(*) filter(where choice<>'awake')::int as sleeping from latest`,[p.night_date,p.sampled_at])).rows[0];
 assert.equal(Number(p.awake_count)+Number(p.sleeping_count),expected.total);
 assert.equal(Number(p.awake_count),expected.awake);assert.equal(Number(p.sleeping_count),expected.sleeping);
 assert.equal(new Date(p.night_date).toISOString().slice(0,10),'2026-10-05');
 }
 return rows;
 };
 const rows=await check();assert.equal(Number(rows.at(-1).awake_count),1);assert.equal(Number(rows.at(-1).sleeping_count),2);
 assert(rows.some(p=>Number(p.awake_count)===0&&Number(p.sleeping_count)===2),'Latest-state transition without double counting');
 await db.query('delete from public.oyasumi_posts where user_id=$1',['00000000-0000-0000-0000-000000000002']);await check();
 await db.exec("set test.now='2026-10-06T06:00:00+09:00'");const reset=(await db.query('select * from public.oyasumi_tonight_trend()')).rows;
 assert.equal(reset.length,1);assert.equal(Number(reset[0].awake_count),1);assert.equal(Number(reset[0].sleeping_count),0);
 await db.exec("set test.now='2026-10-07T06:00:00+09:00'");assert.equal((await db.query('select * from public.oyasumi_tonight_trend()')).rows.length,0);
 await db.exec("set test.uid=''");await assert.rejects(db.query('select * from public.oyasumi_tonight_trend()'),e=>e.code==='42501');
 console.log('PASS SQL trend: common cohort partition at every sample, new participants, duplicate posts, all sleep choices, wake again, deletion, 05:59/06:00 reset, empty night, unauthenticated denial.');
 }finally{await db.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
