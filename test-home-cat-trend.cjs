const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
require('./tonight-trend.js');
const t = TonightTrend, day = 86400000, interval = 900000;
const at = Date.parse('2026-10-11T23:00:00+09:00');
const row = (age, user, status='awake', offset=0, order=1) => ({userId:String(user), status,
  time:at-age*day+offset, order, nightDate:new Date(at-age*day+9*3600000).toISOString().slice(0,10)});
const history = (n, days=7) => Array.from({length:days},(_,i)=>Array.from({length:n},(_,user)=>row(i+1,user))).flat();
const sample = (time, awake) => [{time,awake,sleeping:0}];
const cats = (awake, baseline, active=awake) => t.createCatIndicator()(active,sample(at,awake),baseline,at);
for (const active of [0,1,2]) assert.equal(cats(100,history(10),active),active);
assert.equal(cats(10,history(10),NaN),0);
for (const scale of [1,10,100]) {
  assert.equal(cats(5*scale,history(10*scale)),1);
  assert.equal(cats(10*scale,history(10*scale)),2);
  assert.equal(cats(15*scale,history(10*scale)),3);
}
assert.equal(cats(3,history(4)),2,'Absolute two-person margin suppresses small-population noise');
assert.equal(cats(100,history(2)),2,'Near-zero baseline does not amplify a ratio');
assert.equal(cats(100,history(10,2)),2,'At least three observed nights');
assert.equal(cats(100,[]),2);
assert.equal(t.createCatIndicator()(100,[],history(10),at),2,'Unavailable current chart sample is neutral');
assert.equal(cats(15,history(10),3),3,'Comparison uses chart population, independent of exact active count');
const mixed=[...history(10),row(1,0,'sleep',-1000,2),row(1,1,'try-sleep',0,2),row(1,2,'early-sleep',0,2),
  row(1,3,'awake',0,0),row(1,4,'sleep',1,2),row(8,'outside'),row(0,'today')];
assert.equal(t.catBaseline(mixed,at).average,67/7,'Latest event order, all sleep types, future-at-slot and seven-day exclusions');
assert.deepEqual(t.catBaseline([...mixed].reverse(),at),t.catBaseline(mixed,at),'Independent of paging order');
assert.equal(t.catBaseline([row(1,'later','awake',interval)],at).average,0,'Known night before first report is zero');
assert.equal(t.catBaseline([row(1,'bad','awake',0,NaN)],at).days,0);
assert.equal(t.catBaseline([{...row(1,'bad'),nightDate:'2026-10-01'}],at).days,0);
const midnight=at+2*3600000, beforeSix=at+7*3600000-1;
assert.equal(t.catBaseline(history(10),midnight).average,10,'Midnight retains the 06:00 night');
assert.equal(t.catBaseline(history(10),beforeSix).days,7);
assert.equal(t.catBaseline(history(10),beforeSix+1).days,6,'06:00 starts a new comparison window');
let indicator=t.createCatIndicator();
const check=(minutes,awake)=>indicator(10,sample(at+minutes*60000,awake),history(10),at+minutes*60000);
assert.equal(check(0,10),2);assert.equal(check(1,100),2,'Same-slot refresh cannot change cats');
assert.equal(check(15,15),2,'First high sample waits');assert.equal(check(30,15),3);
assert.equal(check(45,12),3,'High exit margin retains three');
assert.equal(check(60,10),3);assert.equal(check(75,10),2);
assert.equal(check(90,5),2);assert.equal(check(105,5),1);
assert.equal(check(120,8),1,'Low exit margin retains one');
assert.equal(check(135,10),1);assert.equal(check(150,10),2);
assert.equal(indicator(0,[],[],at+151*60000),0,'Immediate expiry overrides hold');
assert.equal(indicator(1,[],[],at+151*60000),1);
assert.equal(indicator(2,[],[],at+151*60000),2);
assert.equal(check(180,15),3,'Resume after a gap starts a fresh classification');
assert.equal(indicator(10,sample(beforeSix+1,15),history(10),beforeSix+1),2,'06:00 resets state and slot baseline');

// Exercise the actual background cache against a paged client, including its
// request budget and retry clock. No production DB writes or network requests.
const source=fs.readFileSync('supabase-api.js','utf8');
const cacheSource=source.slice(source.indexOf('  let historyCache;'),source.indexOf('  function checked('));
let monotonic=0, calls=[], dataset=[], fail=false, releasePage;
const client={from(table){assert.equal(table,'oyasumi_posts');const filters={};const query={
  select(fields){assert.equal(fields,'user_id,choice,created_at,event_order,night_date');return query;},
  gte(field,value){filters[field+'Min']=value;return query;},lt(field,value){filters[field+'Max']=value;return query;},
  order(field,options){assert.equal(field,'event_order');assert.equal(options.ascending,false);return query;},
  async range(start,end){calls.push({start,end,...filters});if(releasePage)await new Promise(resolve=>{releasePage=resolve;});if(fail)throw Error('offline');return {data:dataset.slice(start,end+1)};}
};return query;}};
const read=vm.runInNewContext(cacheSource+'trendHistory',{client,performance:{now:()=>monotonic},Date,Error,
  checked:result=>result.data});
const clock={nightDate:'2026-10-11'};
const settle=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
  dataset=Array.from({length:1200},(_,i)=>({user_id:String(i),choice:'awake',created_at:new Date(at-day).toISOString(),event_order:i,night_date:'2026-10-10'}));
  assert.equal(read(clock).length,0,'Initial load is nonblocking');
  await settle();assert.equal(read(clock).length,1200);assert.equal(calls.length,2);
  assert.equal(calls[0].night_dateMin,'2026-10-04');assert.equal(calls[0].night_dateMax,'2026-10-11');
  for(let i=0;i<120;i++)read(clock);
  assert.equal(calls.length,2,'Thirty-second snapshots reuse the hourly cache');
  monotonic+=3600000;fail=true;assert.equal(read(clock).length,1200);await settle();
  assert.equal(read(clock).length,1200,'Transient failure retains the last complete cache');
  const failedCalls=calls.length;monotonic+=299999;read(clock);assert.equal(calls.length,failedCalls);
  monotonic++;fail=false;dataset=Array.from({length:5001},()=>dataset[0]);read(clock);await settle();
  assert.equal(calls.length-failedCalls,6,'Maximum five 1000-row pages and one overflow probe');
  assert.equal(read(clock).length,1200,'Incomplete pages cannot replace valid counts');
  assert.equal(read({nightDate:'2026-10-12'}).length,0,'Night change invalidates cached rows');await settle();
  assert.equal(read({nightDate:'2026-10-12'}).length,0,'First oversized history uses neutral fallback');
  // Worst supported history, on a quarter-hour tick vs repeated re-renders.
  const large=history(700), bench=t.createCatIndicator();
  const begin=performance.now();bench(700,sample(at,700),large,at);const tickMs=performance.now()-begin;
  const repeat=performance.now();for(let i=0;i<10000;i++)bench(700,sample(at,700),large,at);
  const repeatMs=performance.now()-repeat;
  assert(tickMs<1000&&repeatMs<1000,'Bounded aggregation and cheap cached render');
  console.log(JSON.stringify({pass:true,historyRows:large.length,tickMs,repeatedRenders:10000,repeatMs,
    maxHistoryRequests:6,cacheMinutes:60,retryMinutes:5,productionDbWrites:false}));
})().catch(error=>{console.error(error);process.exitCode=1;});
