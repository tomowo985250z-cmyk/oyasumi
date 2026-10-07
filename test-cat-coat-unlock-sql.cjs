const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const {PGlite}=require(process.env.PGLITE_PATH||'@electric-sql/pglite'),db=new PGlite();
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;
   create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
   create table public.oyasumi_profiles(user_id uuid primary key,nickname text,cat_coat text,cat_expression text,updated_at timestamptz default now());`);
  for(const file of ['wild-cats','cat-coat-cooldown','big-cats'])await db.exec(fs.readFileSync('supabase/'+file+'.sql','utf8'));
  const uid='00000000-0000-0000-0000-000000000001';
  await db.exec(`set test.uid='${uid}';set role authenticated`);
  await db.query("select public.oyasumi_set_cat_coat('calico')");
  await assert.rejects(db.query("select public.oyasumi_set_cat_coat('jaguar')"),e=>e.code==='P0030');
  await db.exec('reset role');
  const unlock=fs.readFileSync('supabase/cat-coat-cooldown-temporary-unlock.sql','utf8');await db.exec(unlock);await db.exec(unlock);
  await db.exec('set role authenticated');
  assert.equal((await db.query('select public.oyasumi_cat_coat_cooldown_paused() as paused')).rows[0].paused,true);
  for(const coat of ['snow-leopard','leopard','cheetah','jaguar','calico'])await db.query('select public.oyasumi_set_cat_coat($1)',[coat]);
  const saved=(await db.query('select * from public.oyasumi_cat_coat_status()')).rows[0];assert.equal(saved.next_change_at,null);
  await db.query("select public.oyasumi_set_cat_coat('calico')");
  assert.equal(String((await db.query('select * from public.oyasumi_cat_coat_status()')).rows[0].changed_at),String(saved.changed_at));
  for(const sql of ['select * from public.oyasumi_cat_coat_cooldown_control','update public.oyasumi_cat_coat_cooldown_control set paused=false','delete from public.oyasumi_cat_coat_changes'])await assert.rejects(db.query(sql),e=>e.code==='42501');
  await assert.rejects(db.query("select public.oyasumi_set_cat_coat('unknown')"),e=>e.code==='22023');
  await db.exec('reset role');await db.exec(fs.readFileSync('supabase/cat-coat-cooldown-restore-seven-days.sql','utf8'));
  await db.exec('set role authenticated');
  const restored=(await db.query('select * from public.oyasumi_cat_coat_status()')).rows[0];
  assert.equal(new Date(restored.next_change_at)-new Date(saved.changed_at),7*86400000);
  await assert.rejects(db.query("select public.oyasumi_set_cat_coat('jaguar')"),e=>e.code==='P0030');
  await db.exec("reset role;set test.uid='';set role anon");
  await assert.rejects(db.query('select public.oyasumi_cat_coat_cooldown_paused()'),e=>e.code==='42501');
 }finally{await db.close();}
 console.log('PASS temporary unlock SQL: repeated apply, changes allowed, timer retained, same-cat retry, private control denied, invalid/anonymous denied, exact seven-day restoration.');
})().catch(e=>{console.error(e);process.exitCode=1;});
