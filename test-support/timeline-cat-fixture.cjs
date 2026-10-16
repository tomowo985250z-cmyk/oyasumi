// Replace only the Supabase transport; the app and production API run unchanged.
module.exports=function installTimelineTransport({user}){
 const f=globalThis.TimelineFixture={user,hidden:false};
 Object.defineProperty(document,'hidden',{configurable:true,get:()=>f.hidden});
 localStorage.setItem('oyasumi-dark-hint-seen','test');
 window.OyasumiConfig={url:'https://timeline-fixture.invalid',publishableKey:'fixture'};
 window.supabase={createClient:()=>({
  auth:{getSession:async()=>({data:{session:{user:{id:user}}}})},
  rpc:(name,args={})=>TimelineBackend({type:'rpc',user,name,args}),
  from:table=>{
   const query={type:'select',user,table,filters:[],orders:[]};
   const q={select:(fields,options)=>{query.fields=fields;query.head=!!options?.head;return q;},
    order:(key,options)=>{query.orders.push({key,...options});return q;},
    range:(start,end)=>{query.range=[start,end];return q;},limit:limit=>{query.limit=limit;return q;},
    maybeSingle:()=>{query.single=true;return q;},then:(resolve,reject)=>TimelineBackend(query).then(resolve,reject)};
   for(const method of ['eq','gt','gte','lt','in'])q[method]=(key,value)=>{query.filters.push({method,key,value});return q;};
   return q;
  }
 })};
};
