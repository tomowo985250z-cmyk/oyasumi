// Isolated local review server. All writes go to this in-memory PGlite only.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),{PGlite}=require('../../node_modules/@electric-sql/pglite');
const root=path.resolve(__dirname,'../..'),db=new PGlite(),port=9390;
const own='00000000-0000-0000-0000-000000000001',other='00000000-0000-0000-0000-000000000002';
async function init(){await db.exec(`create role anon;create role authenticated;create schema auth;create function auth.uid() returns uuid language sql as $$select nullif(current_setting('preview.uid',true),'')::uuid$$;create table public.oyasumi_profiles(user_id uuid primary key,cat_coat text);create table public.oyasumi_posts(user_id uuid,choice text,created_at timestamptz);`);await db.exec(fs.readFileSync(path.join(root,'supabase/cat-care.sql'),'utf8'));for(const id of [own,other]){await db.query(`insert into public.oyasumi_profiles values($1,'calico')`,[id]);await db.query(`insert into public.oyasumi_posts values($1,'sleep',clock_timestamp())`,[id]);}}
async function rpc(user,name,recipient){return db.transaction(async tx=>{await tx.query("select set_config('preview.uid',$1,true)",[user]);await tx.exec('set local role authenticated');return (await tx.query('select public.'+name+(name==='oyasumi_give_cat_treat'?'($1)':'()')+' as result',name==='oyasumi_give_cat_treat'?[recipient]:[])).rows[0].result;});}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.json':'application/json'};
(async()=>{await init();http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://127.0.0.1:'+port);res.setHeader('Cache-Control','no-store');
 if(url.pathname.startsWith('/__care/')){
  if(req.headers.origin&&req.headers.origin!=='http://127.0.0.1:'+port){res.writeHead(403);return res.end();}
  const user=req.headers['x-preview-user']===other?other:own;
  let body='';for await(const chunk of req){body+=chunk;if(body.length>4096)throw Error('Request too large');}const data=body?JSON.parse(body):{};
  let result;
  if(url.pathname==='/__care/reset'){await db.exec('delete from public.oyasumi_cat_meals;delete from public.oyasumi_cat_treats;delete from public.oyasumi_posts');for(const id of [own,other])await db.query(`insert into public.oyasumi_posts values($1,'sleep',clock_timestamp())`,[id]);result={ok:true};}
  else if(url.pathname==='/__care/post'){await db.query('insert into public.oyasumi_posts values($1,$2,clock_timestamp())',[user,data.choice]);result={ok:true};}
  else {const name=({'/__care/status':'oyasumi_cat_care_status','/__care/meal':'oyasumi_give_cat_meal','/__care/treat':'oyasumi_give_cat_treat'})[url.pathname];if(!name){res.writeHead(404);return res.end();}result=await rpc(user,name,data.recipient);}
  res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(result));
 }
 let relative=decodeURIComponent(url.pathname).replace(/^\//,'')||'test-support/cat-care/index.html';
 const file=path.resolve(root,relative);if(!file.startsWith(root+path.sep)||!types[path.extname(file)]||relative.startsWith('.')||(!relative.startsWith('assets/')&&!relative.startsWith('test-support/cat-care/')&&relative.includes('/'))){res.writeHead(404);return res.end();}
 let bytes=fs.readFileSync(file);
 if(relative==='test-support/cat-care/screen.html'){
  let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\s*<script[^>]+src="(?:vendor\/supabase|supabase-config|supabase-api|update-client)\.js[^>]*>\s*<\/script>/g,'');
  html=html.replace('<head>','<head><base href="/"><meta http-equiv="Content-Security-Policy" content="connect-src \'self\'; object-src \'none\'"><script src="test-support/cat-care/preload.js"></script>').replace('</head>','<script src="test-support/cat-care/controller.js" defer></script></head>');bytes=Buffer.from(html);
 }
 res.setHeader('Content-Type',types[path.extname(file)]);res.end(bytes);
 }catch(error){res.statusCode=error.code?.startsWith('P')||error.code==='22023'?400:500;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({message:error.message,code:error.code}));}}).listen(port,'127.0.0.1',()=>console.log('Local cat care preview: http://127.0.0.1:'+port+'/'));})().catch(e=>{console.error(e);process.exitCode=1});