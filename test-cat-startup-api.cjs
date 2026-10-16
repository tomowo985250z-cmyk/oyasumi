const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const own='00000000-0000-0000-0000-000000000001',other='00000000-0000-0000-0000-000000000002';
const at=Date.parse('2026-10-13T23:00:00+09:00'),calls=[],hints=[];
let identity=own,failCare=false,failOptional=false,flipIdentity=false,clientFetch,fetchSettings;
const profile={user_id:own,nickname:'test',cat_coat:'black',cat_expression:'surprised',cat_role:null,profile_note:''};
async function delayed(label,result,ms=80){const start=performance.now();await new Promise(r=>setTimeout(r,ms));calls.push({label,start,ms:performance.now()-start});return result;}
const client={auth:{getSession:()=>delayed('session',{data:{session:{user:{id:identity}}}},10)},rpc:async(name,args={})=>{
 let data;
 switch(name){
  case 'oyasumi_night_context':data=[{night_date:'2026-10-13',morning_night_date:'2026-10-12',server_now:new Date(at).toISOString(),next_reset_at:'2026-10-14T06:00:00+09:00'}];break;
  case 'oyasumi_tonight_counts':data=[{night_date:'2026-10-13',awake_count:0,sleeping_count:1,my_state:'sleep'}];break;
  case 'oyasumi_cat_care_status':if(flipIdentity)identity=other;return delayed(name,failCare?{error:{code:'57014'}}:{data:{allowanceVersion:2,sleepStateVersion:1,catState:'sleep',mealSleeping:true,day:'2026-10-13',mealSlot:'night',mealEligible:true,mealDone:false,treatGiven:false,treatCount:0,treatRecipients:[],receivedToday:0,receivedTotal:0,receivedDays:[]}});
  case 'oyasumi_cat_coat_status':data=[{next_change_at:null}];break;
  case 'oyasumi_cat_coat_cooldown_paused':data=true;break;
  case 'oyasumi_reaction_counts_v3':data=[];break;
  default:return delayed(name,failOptional?{error:{code:'57014'}}:{data:[]},350);
 }
 return delayed(name,{data});
},from:table=>{
 let fields='',head=false,single=false,filters={};const q={select:(v,o)=>{fields=v;head=!!o?.head;return q;},eq:(k,v)=>{filters[k]=v;return q;},gt:()=>q,in:()=>q,lt:()=>q,gte:()=>q,order:()=>q,limit:()=>q,range:()=>q,maybeSingle:()=>{single=true;return q;},then:(resolve,reject)=>{
  const result=table==='oyasumi_profiles'?{data:single?profile:[profile]}:head?{data:null,count:1}:{data:[]};
  return delayed(table+':'+fields+(single?':single':''),result).then(resolve,reject);
 }};return q;
}};
const sandbox={console,performance,setTimeout,clearTimeout,AbortController,AbortSignal,fetch:async(_input,options)=>{fetchSettings=options;return {};},OyasumiConfig:{url:'https://isolated.invalid',publishableKey:'test'},supabase:{createClient:(_url,_key,options)=>{clientFetch=options.global.fetch;return client;}},CatImages:{primeCoat:(...a)=>hints.push(['prime',...a]),confirmCoat:(...a)=>hints.push(['confirm',...a])}};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync('supabase-api.js','utf8'),sandbox);
(async()=>{
 const api=sandbox.OyasumiAPI,start=performance.now(),snapshot=await api.snapshot(),ms=performance.now()-start;
 assert.equal(snapshot.coat,'black');assert.equal(snapshot.expression,'surprised');assert.equal(snapshot.catCare.catState,'sleep');assert(snapshot.catStateResolved);
 await clientFetch('https://isolated.invalid/rest/v1/oyasumi_posts',{cache:'force-cache'});assert.equal(fetchSettings.cache,'no-store');
 const dir='output/cat-startup';fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(`${dir}/api-${process.argv.includes('--baseline')?'baseline':'optimized'}.json`,JSON.stringify({ms,calls,timings:api.timings||[],mode:'isolated delayed reads, not production latency',productionWrites:0},null,2));
 if(process.argv.includes('--baseline'))return console.log(`BASELINE snapshot ${Math.round(ms)}ms; ${calls.length} reads`);
 assert(ms<1400,`Independent reads must not serialize: ${ms}ms`);
 assert(hints.some(h=>h[0]==='prime'&&h[1]===own),'Prime only after the current session is known');
 assert(hints.some(h=>h[0]==='confirm'&&h[1]===own&&h[3]==='black'));
 failOptional=true;assert.equal((await api.snapshot()).coat,'black');
 failCare=true;assert.equal((await api.snapshot()).catStateResolved,false);failCare=false;
 flipIdentity=true;await assert.rejects(api.snapshot(),e=>e.code==='CAT_AUTH_CHANGED');
 console.log(`PASS startup API: ${Math.round(ms)}ms, parallel optional reads, current appearance/sleep, auth switch rejection, failures stay hidden; no network`);
})().catch(e=>{console.error(e);process.exitCode=1;});
