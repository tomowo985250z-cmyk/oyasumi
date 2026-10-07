const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const {PGlite}=require(process.env.PGLITE_PATH||'@electric-sql/pglite');
 for(const days of [7,30]){
  const db=new PGlite();
  try{
   await db.exec(`create role anon;create role authenticated;create schema auth;
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
    create table public.oyasumi_profiles(user_id uuid primary key,nickname text,cat_coat text,cat_expression text,updated_at timestamptz default now());
    insert into public.oyasumi_profiles values('00000000-0000-0000-0000-000000000001','existing','calico','happy',now());`);
   await db.exec(fs.readFileSync('supabase/wild-cats.sql','utf8'));
   await db.exec(fs.readFileSync('supabase/cat-coat-cooldown.sql','utf8').replaceAll("interval '168 hours'",`interval '${days*24} hours'`));
   const before=(await db.query('select * from public.oyasumi_profiles')).rows;
   const migration=fs.readFileSync('supabase/big-cats.sql','utf8');await db.exec(migration);await db.exec(migration);
   assert.deepEqual((await db.query('select * from public.oyasumi_profiles')).rows,before);
   for(const [i,coat] of ['snow-leopard','leopard','cheetah','jaguar'].entries()){
    const uid=`00000000-0000-0000-0000-${String(i+2).padStart(12,'0')}`;
    await db.exec(`set test.uid='${uid}';set role authenticated`);
    assert.equal((await db.query('select public.oyasumi_set_cat_coat($1) as coat',[coat])).rows[0].coat,coat);
    const saved=(await db.query('select * from public.oyasumi_cat_coat_status()')).rows[0];
    assert.equal(new Date(saved.next_change_at)-new Date(saved.changed_at),days*86400000);
    await db.query('select public.oyasumi_set_cat_coat($1)',[coat]);
    assert.equal(String((await db.query('select * from public.oyasumi_cat_coat_status()')).rows[0].changed_at),String(saved.changed_at));
    await assert.rejects(db.query("select public.oyasumi_set_cat_coat('calico')"),e=>e.code==='P0030');
    await assert.rejects(db.query("select public.oyasumi_set_cat_coat('unknown')"),e=>e.code==='22023');
    await db.exec('reset role');
    await db.query(`update public.oyasumi_cat_coat_changes set changed_at=clock_timestamp()-interval '${days*24} hours' where user_id=$1`,[uid]);
    await db.exec('set role authenticated');await db.query("select public.oyasumi_set_cat_coat('calico')");await db.exec('reset role');
   }
   await db.exec("set test.uid='';set role anon");await assert.rejects(db.query("select public.oyasumi_set_cat_coat('jaguar')"),e=>e.code==='42501');
  }finally{await db.close();}
 }
 console.log('PASS big cats SQL: idempotent migration, existing data unchanged, four species, original 7/30-day durations retained, same-cat retry, expiry, invalid and anonymous denial.');
})().catch(e=>{console.error(e);process.exitCode=1;});
