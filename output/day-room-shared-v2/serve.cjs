// Read-only application source with a separate, ephemeral care database.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {PGlite}=require('../../node_modules/@electric-sql/pglite');
const root=path.resolve(__dirname,'../..'),db=new PGlite(),port=Number(process.env.SHARED_ROOM_PREVIEW_PORT)||9412;
const own='00000000-0000-0000-0000-000000000001',other='00000000-0000-0000-0000-000000000002';
const prefix='/output/day-room-shared-v2/',roomPrefix='/output/day-room-shared-v2/';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.json':'application/json'};
async function seed(){await db.exec('delete from public.oyasumi_cat_meals;delete from public.oyasumi_cat_treats;delete from public.oyasumi_posts');for(const id of [own,other])await db.query(`insert into public.oyasumi_posts values($1,'sleep',clock_timestamp())`,[id]);}
async function init(){await db.exec(`create role anon;create role authenticated;create schema auth;create function auth.uid() returns uuid language sql as $$select nullif(current_setting('preview.uid',true),'')::uuid$$;create table public.oyasumi_profiles(user_id uuid primary key,cat_coat text);create table public.oyasumi_posts(user_id uuid,choice text,created_at timestamptz);`);await db.exec(fs.readFileSync(path.join(root,'supabase/cat-care.sql'),'utf8'));for(const id of [own,other])await db.query('insert into public.oyasumi_profiles values($1,$2)',[id,'calico']);await seed();}
async function rpc(name,recipient){return db.transaction(async tx=>{await tx.query("select set_config('preview.uid',$1,true)",[own]);await tx.exec('set local role authenticated');return(await tx.query('select public.'+name+(name==='oyasumi_give_cat_treat'?'($1)':'()')+' as result',name==='oyasumi_give_cat_treat'?[recipient]:[])).rows[0].result;});}
(async()=>{
 await init();
 const server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://127.0.0.1:'+port);res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Security-Policy',"connect-src 'self'; object-src 'none'; base-uri 'self'");
  if(url.pathname.startsWith('/__care/')){
   if(req.method!=='POST'||(req.headers.origin&&req.headers.origin!=='http://127.0.0.1:'+port)){res.writeHead(403);return res.end();}
   let body='';for await(const chunk of req){body+=chunk;if(body.length>4096)throw Error('Request too large');}const data=body?JSON.parse(body):{};
   let result;
   if(url.pathname==='/__care/reset'){await seed();result={ok:true};}
   else {const name=({'/__care/status':'oyasumi_cat_care_status','/__care/meal':'oyasumi_give_cat_meal','/__care/treat':'oyasumi_give_cat_treat'})[url.pathname];if(!name){res.writeHead(404);return res.end();}result=await rpc(name,data.recipient);}
   res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(result));
  }
  if(url.pathname==='/app'){
   let html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/\s*<script[^>]+src="(?:vendor\/supabase|supabase-config|supabase-api|update-client)\.js[^>]*>\s*<\/script>/g,'');
   html=html.replace('<head>',`<head><base href="/"><script src="${roomPrefix}preload.js"></script>`).replace('</head>',`<link rel="stylesheet" href="${prefix}sample.css"><script src="${prefix}preview-app.js" defer></script></head>`);
   res.setHeader('Content-Type',types['.html']);return res.end(html);
  }
  const relative=url.pathname==='/'?'output/day-room-shared-v2/index.html':decodeURIComponent(url.pathname).replace(/^\//,'');
  const file=path.resolve(root,relative),extension=path.extname(file);
  if(!file.startsWith(root+path.sep)||!types[extension]||relative.split(/[\\/]/).some(p=>p.startsWith('.'))||(!relative.startsWith('assets/')&&!relative.startsWith('output/day-room-preview-v1/')&&!relative.startsWith('output/day-room-shared-v2/')&&relative.includes('/'))){res.writeHead(404);return res.end();}
  if(relative.startsWith('assets/'))res.setHeader('Cache-Control','public, max-age=3600');
  const bytes=fs.readFileSync(file);res.setHeader('Content-Type',types[extension]);res.end(bytes);
 }catch(error){res.statusCode=error.code?.startsWith('P')||error.code==='22023'?400:error.code==='ENOENT'?404:500;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({message:error.message,code:error.code}));}});
 server.listen(port,'127.0.0.1',()=>console.log(`Season/weather preview: http://127.0.0.1:${port}/`));
 process.on('SIGTERM',()=>server.close(()=>db.close().then(()=>process.exit())));
})().catch(e=>{console.error(e);process.exitCode=1;});
