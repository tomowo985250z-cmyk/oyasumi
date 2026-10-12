// Real, isolated PostgreSQL cluster. Never accepts a production connection URL.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawn,spawnSync}=require('node:child_process');
const {ids,base,windows,guard}=require('./test-support/cat-care-sql.cjs');
let bin=process.env.OYASUMI_PG_BIN||path.join(__dirname,'output/cat-care-postgres/binaries/pgsql/bin');
const port=55439,host='127.0.0.1',user='cat_care_test';
const root=path.join(__dirname,'output/cat-care-postgres');fs.mkdirSync(root,{recursive:true});
// Windows PostgreSQL cannot bootstrap UTF8 under a non-ASCII data path.
// Use an isolated ASCII system-temp path; reports stay in the workspace.
const tempRoot=process.platform==='win32'?path.join(process.env.SystemRoot,'Temp'):require('node:os').tmpdir();
const scratch=fs.mkdtempSync(path.join(tempRoot,'oyasumi-cat-care-'));
const data=path.join(scratch,'data');
if(process.platform==='win32'&&/[^\x00-\x7f]/.test(bin)){
 const distribution=path.join(scratch,'pgsql');fs.cpSync(path.dirname(bin),distribution,{recursive:true});bin=path.join(distribution,'bin');
}
const executable=name=>path.join(bin,name+(process.platform==='win32'?'.exe':''));
const connectionEnv={...process.env};for(const key of Object.keys(connectionEnv))if(key.startsWith('PG'))delete connectionEnv[key];connectionEnv.PGCONNECT_TIMEOUT='5';
const version=spawnSync(executable('postgres'),['--version'],{encoding:'utf8',windowsHide:true});
assert.equal(version.status,0,'Set OYASUMI_PG_BIN to portable PostgreSQL binaries');
function run(sql,{id=null,marker=false}={}){
 let out='',err='',mark;const marked=new Promise(resolve=>mark=resolve);
 const child=spawn(executable('psql'),['-X','-qAt','--no-password','-h',host,'-p',String(port),'-U',user,'-d','postgres','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose'],{windowsHide:true,stdio:['pipe','pipe','pipe'],env:connectionEnv});
 const done=new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',code=>resolve({code,out,err}));});
 child.stdout.on('data',b=>{out+=b;if(out.includes('LOCKED'))mark();});child.stderr.on('data',b=>err+=b);
 child.stdin.end(`set statement_timeout='8s';${id?`set test.uid='${id}';set role authenticated;`:''}\n${sql}\n`);
 return marker?{done,marked}:done;
}
const ok=async(sql,options)=>{const result=await run(sql,options);assert.equal(result.code,0,result.err);return result.out.trim().split(/\r?\n/).filter(Boolean);};
const meal='select public.oyasumi_give_cat_meal()->>\'accepted\';';
const post=choice=>`select id from public.oyasumi_submit_post_v2('${choice}','${choice==='awake'?'relax':choice==='try-sleep'?'try-sleep':'sleep'}');`;
const hold=async(sql,id)=>{const task=run(`begin;${sql}select 'LOCKED';select pg_sleep(1.2);commit;`,{id,marker:true});await Promise.race([task.marked,task.done.then(r=>{throw Error(r.err||'Holder ended before marker');})]);return task;};
let server;
(async()=>{try{
 const init=spawnSync(executable('initdb'),['-D',data,'-U',user,'--auth=trust','--encoding=UTF8','--locale=C'],{encoding:'utf8',windowsHide:true,cwd:scratch});assert.equal(init.status,0,init.stderr);
 const log=fs.openSync(path.join(data,'server.log'),'a');server=spawn(executable('postgres'),['-D',data,'-h',host,'-p',String(port),'-c','max_connections=30'],{windowsHide:true,stdio:['ignore',log,log]});fs.closeSync(log);
 let ready=false;for(let i=0;i<80;i++){const probe=await run('select 1;');if(probe.code===0){ready=true;break;}await new Promise(r=>setTimeout(r,100));}assert(ready,'Isolated local server starts');
 assert.equal(path.resolve((await ok('show data_directory;'))[0]).toLowerCase(),path.resolve(data).toLowerCase(),'Never write to a cluster other than the one this test created');
 await ok(base()+windows()+guard()+`create table public.test_clock(at timestamptz);insert into public.test_clock values('2026-10-11T14:00:00+09:00');
 create or replace function public.test_now() returns timestamptz language sql volatile as $$select at from public.test_clock$$;grant select on public.test_clock to authenticated;`);
 // A committed sleep must be seen after waiting on the same user's post lock.
 let holder=await hold(post('sleep'),ids[0]),started=Date.now();let rejected=await run(meal,{id:ids[0]});assert.notEqual(rejected.code,0);assert(rejected.err.includes('P0042'));assert(Date.now()-started>400);assert.equal((await holder.done).code,0);
 // Awake releases the sleep restriction; eight concurrent meals spend one slot.
 holder=await hold(post('awake'),ids[0]);const pending=Array.from({length:8},()=>run(meal,{id:ids[0]}));const meals=await Promise.all(pending);assert.equal((await holder.done).code,0);assert(meals.every(r=>r.code===0),JSON.stringify(meals));assert.equal(meals.filter(r=>r.out.trim()==='true').length,1);
 // Three distinct recipients racing, plus duplicates: never over two cats.
 const treats=await Promise.all([ids[1],ids[1],ids[2],ids[3],ids[3]].map(id=>run(`select public.oyasumi_give_cat_treat('${id}')->>'accepted';`,{id:ids[0]})));assert(treats.every(r=>r.code===0));assert.equal(treats.filter(r=>r.out.trim()==='true').length,2);
 // A meal that commits first is valid; a subsequent sleep still waits for it.
 holder=await hold(meal,ids[1]);started=Date.now();await ok(post('try-sleep'),{id:ids[1]});assert(Date.now()-started>400);assert.equal((await holder.done).code,0);assert.deepEqual(await ok("select public.oyasumi_cat_care_status()->>'catState';",{id:ids[1]}),['sleep']);
 // DELETE has no RPC-level user lock here: the BEFORE STATEMENT trigger
 // must acquire it before row locks, avoiding inversion with reactions.
 const postId=(await ok(post('sleep'),{id:ids[2]}))[0];
 const reactionHolder=run(`begin;select pg_advisory_xact_lock(hashtextextended('${ids[2]}',0));select 'LOCKED';select pg_sleep(.6);select id from public.oyasumi_posts where id='${postId}' for key share;commit;`,{id:ids[2],marker:true});await reactionHolder.marked;
 const deleted=await run(`delete from public.oyasumi_posts where id='${postId}';`,{id:ids[2]});assert.equal(deleted.code,0,deleted.err);assert.equal((await reactionHolder.done).code,0);
 rejected=await run(meal,{id:ids[2]});assert(rejected.err.includes('P0042'),'Deletion cannot erase persisted sleep');
 // Per-user locking: another user can feed while this user is locked.
 holder=await hold(`select pg_advisory_xact_lock(hashtextextended('${ids[0]}',0));`,ids[0]);started=Date.now();await ok(meal,{id:ids[4]});assert(Date.now()-started<1100);assert.equal((await holder.done).code,0);
 // Advance the clock while a meal is waiting: date and slot are read AFTER lock.
 await ok("update public.test_clock set at='2026-10-12T05:59:59.999+09:00';");holder=await hold(`select pg_advisory_xact_lock(hashtextextended('${ids[0]}',0));`,ids[0]);
 const boundary=run("select public.oyasumi_give_cat_meal();",{id:ids[0]});await ok("update public.test_clock set at='2026-10-12T06:00:00+09:00';");const result=await boundary;assert.equal(result.code,0,result.err);assert.equal((await holder.done).code,0);const atSix=JSON.parse(result.out.trim());assert(atSix.accepted);assert.equal(atSix.status.day,'2026-10-12');assert.equal(atSix.status.mealSlot,'morning');assert.equal(atSix.status.catState,null);
 await ok("update public.test_clock set at='2026-10-12T11:59:59.999+09:00';");holder=await hold(`select pg_advisory_xact_lock(hashtextextended('${ids[0]}',0));`,ids[0]);const noon=run("select public.oyasumi_give_cat_meal();",{id:ids[0]});await ok("update public.test_clock set at='2026-10-12T12:00:00+09:00';");const atNoon=await noon;assert.equal(atNoon.code,0,atNoon.err);assert.equal((await holder.done).code,0);assert.equal(JSON.parse(atNoon.out.trim()).status.mealSlot,'night');assert(JSON.parse(atNoon.out.trim()).accepted);
 // Both post RPCs must derive night_date and created_at after waiting, too.
 for(const [i,sql] of [post('sleep'),"select id from public.oyasumi_submit_post('sleep');"].entries()){
  await ok(`update public.test_clock set at='2026-10-${13+i}T05:59:59.999+09:00';`);
  holder=await hold(`select pg_advisory_xact_lock(hashtextextended('${ids[6]}',0));`,ids[6]);const pendingPost=run(sql,{id:ids[6]});
  let waiting=false;for(let n=0;n<20;n++){if((await ok("select exists(select 1 from pg_stat_activity where pid<>pg_backend_pid() and wait_event='advisory' and query like '%oyasumi_submit_post%');"))[0]==='t'){waiting=true;break;}await new Promise(r=>setTimeout(r,20));}assert(waiting,'Post actually waits before the clock advances');
  await ok(`update public.test_clock set at='2026-10-${13+i}T06:00:00+09:00';`);const saved=await pendingPost;assert.equal(saved.code,0,saved.err);assert.equal((await holder.done).code,0);
  assert.deepEqual(await ok(`select night_date::text from public.oyasumi_posts where id='${saved.out.trim()}';`),[`2026-10-${13+i}`]);
  assert.deepEqual(await ok("select public.oyasumi_cat_care_status()->>'catState';",{id:ids[6]}),['sleep']);
 }
 const report={pass:true,postgres:version.stdout.trim(),realConnections:true,concurrentMeals:8,concurrentTreats:5,sleepBeforeMeal:true,mealBeforeSleep:true,deleteReactionNoDeadlock:true,independentUsers:true,boundariesAfterLock:['06:00','12:00'],postBoundaryAfterLock:['legacy','v2'],productionOperations:0};fs.writeFileSync(path.join(root,'concurrency-report.json'),JSON.stringify(report,null,2));console.log('PASS native PostgreSQL: real concurrent post/meal/treat sessions, one accepted meal, two recipients, deletion/reaction lock order, per-user isolation and meal/post boundaries after lock.');
}finally{
 if(server){const stopped=spawnSync(executable('pg_ctl'),['-D',data,'stop','-m','fast','-w'],{encoding:'utf8',windowsHide:true});if(stopped.status!==0)server.kill();}
}})().catch(e=>{console.error(e);process.exitCode=1;});
