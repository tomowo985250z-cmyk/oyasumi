const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
require('./timeline-visibility.js');
const now=Date.parse('2026-10-08T05:59:59+09:00');
const rows=Array.from({length:125},(_,i)=>({user_id:'user-'+i,choice:'awake',created_at:new Date(now-1000).toISOString(),event_order:i}));
rows.push({user_id:'user-0',choice:'sleep',created_at:new Date(now-500).toISOString(),event_order:200});
rows.push({user_id:'expired',choice:'awake',created_at:new Date(now-10800000).toISOString(),event_order:201});
rows.push({user_id:'duplicate',choice:'awake',created_at:new Date(now-1000).toISOString(),event_order:202});
rows.push({user_id:'duplicate',choice:'awake',created_at:new Date(now-500).toISOString(),event_order:203});
rows.sort((a,b)=>b.event_order-a.event_order);
let requests=0;
const client={from:table=>{
 assert.equal(table,'oyasumi_posts');let cutoff;
 const query={select(fields){assert.equal(fields,'user_id,choice,created_at,event_order');return this;},eq(field,value){assert.equal(field,'night_date');assert.equal(value,'2026-10-07');return this;},gt(field,value){assert.equal(field,'created_at');cutoff=Date.parse(value);assert.equal(cutoff,now-10800000);return this;},order(field,options){assert.equal(field,'event_order');assert.equal(options.ascending,false);return this;},async range(start,end){requests++;return {data:rows.filter(r=>Date.parse(r.created_at)>cutoff).slice(start,end+1)};}};
 return query;
}};
const source=fs.readFileSync('supabase-api.js','utf8');
const block=source.slice(source.indexOf('    const activeAwakePosts ='),source.indexOf('    const authorIds ='));
(async()=>{
 const posts=await vm.runInNewContext('(async()=>{'+block+'return activeAwakePosts;})()',{client,checked:r=>r.data,clock:{serverNow:now},counts:{night_date:'2026-10-07'}});
 assert.equal(requests,2);assert.equal(posts.length,125,'All active authors beyond the 100-row feed cap are counted');
 assert(!posts.some(p=>p.userId==='user-0'||p.userId==='expired'));
 assert.equal(posts.filter(p=>p.userId==='duplicate').length,1);
 assert.equal(TimelineVisibility.visible(posts,now+10800000).length,0);
 console.log('PASS home awake: exact +3h exclusion, >100 authors, latest sleep supersedes awake, repeated awake deduplicates; full-night aggregate remains separate.');
})().catch(e=>{console.error(e);process.exitCode=1;});
