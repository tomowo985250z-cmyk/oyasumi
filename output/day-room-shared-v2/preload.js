(() => {
  const params=new URLSearchParams(location.search),memory=new Map();
  for(const key of ['localStorage','sessionStorage'])Object.defineProperty(window,key,{value:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k)},configurable:true});
  localStorage.setItem('oyasumi-dark-hint-seen','preview');
  const clock={base:Date.parse(`2026-10-10T${params.get('hour')==='23'?'23':'14'}:00:00+09:00`),anchor:performance.now()};
  Date.now=()=>clock.base+performance.now()-clock.anchor;
  const own='00000000-0000-0000-0000-000000000001',other='00000000-0000-0000-0000-000000000002';
  const review=globalThis.RoomReviewData={coat:params.get('coat')||'calico',light:params.get('light')==='true',calls:[],clock};
  localStorage.setItem('oyasumi-local-v2',JSON.stringify({light:review.light}));
  const rpc=async(kind,data={})=>{
    review.calls.push(kind);
    const response=await fetch('/__care/'+kind,{method:'POST',headers:{'Content-Type':'application/json','x-preview-user':own},body:JSON.stringify(data)});
    const result=await response.json();if(!response.ok)throw Object.assign(Error(result.message),{code:result.code});return result;
  };
  const api={initialize:async()=>own,getCatCareStatus:()=>rpc('status'),giveCatMeal:()=>rpc('meal'),giveCatTreat:recipient=>rpc('treat',{recipient}),snapshot:async()=>{
    const post={id:'room-preview-post',userId:other,name:'おとなり',coat:'gray',expression:'calm',catRole:null,profileNote:'日なたで、のんびり。',status:'awake',time:Date.now()-40000,self:false,color:'slate'};
    const self={...post,id:'room-preview-own',userId:own,name:'こむぎ',coat:review.coat,status:'sleep',self:true,time:Date.now()-3600000};
    return {userId:own,name:'こむぎ',coat:review.coat,expression:'calm',catRole:null,profileNote:'今日も、マイペース。',profileComplete:true,needsCat:false,needsNickname:false,ownPosts:[self],feed:[post,self],reactions:{},reactionCounts:{},activeAwakePosts:[post],awakeCount:1,sleepingCount:1,ownSleepCount:1,nightDate:SleepFlow.night(Date.now()),trend:[],trendSupported:false,catCoatStatus:{nextChangeAt:null,temporarilyUnlocked:true},catCare:await rpc('status')};
  }};
  Object.defineProperty(window,'OyasumiAPI',{get:()=>api,set:()=>{},configurable:true});
  globalThis.RoomReviewRPC=rpc;
})();
