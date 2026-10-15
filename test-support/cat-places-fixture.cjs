// Installed after the existing isolated app fixture. No real auth or API writes.
module.exports=function installPlacesFixture(){
 // These contexts model two different people, both viewing their own screen.
 // A headless browser's focused tab must not put the other account into hiding.
 Object.defineProperty(document,'hidden',{configurable:true,value:false});
 const q=new URLSearchParams(location.search),f=HomePostFixture,api=OyasumiAPI,original=api.snapshot;
 f.owner='00000000-0000-0000-0000-000000000001';f.visitor='00000000-0000-0000-0000-000000000002';
 f.viewer=q.get('viewer')==='other'?f.visitor:f.owner;f.coat=q.get('coat')||'calico';f.sleep=false;
 f.at=Number(q.get('at'))||Date.parse('2026-10-15T14:00:00+09:00');f.meals=new Set();f.treats=[];f.mealCalls=0;f.treatCalls=0;
 f.care=()=>({allowanceVersion:2,sleepStateVersion:1,catState:f.viewer===f.owner&&f.sleep?'sleep':'awake',mealSleeping:f.viewer===f.owner&&f.sleep,day:SleepFlow.night(f.at),mealSlot:CatCare.slot(f.at),mealEligible:true,mealDone:f.meals.has(SleepFlow.night(f.at)+':'+CatCare.slot(f.at)),treatGiven:false,treatCount:f.treats.length,treatRecipients:[...f.treats],receivedToday:0,receivedTotal:0,receivedDays:[]});
 f.person=()=>({id:'owner-post',userId:f.owner,name:'居場所ねこ',coat:f.coat,expression:'calm',catRole:null,profileNote:'ひとやすみ中',status:f.sleep?'sleep':'awake',intent:f.sleep?'sleep':null,time:f.at,nightDate:SleepFlow.night(f.at),order:1,self:f.viewer===f.owner,appearanceReady:true,color:'peach'});
 api.initialize=async()=>f.viewer;
 api.snapshot=async()=>{
  const base=await original(),person=f.person();
  return {...base,userId:f.viewer,coat:f.viewer===f.owner?f.coat:'black',ownPosts:f.viewer===f.owner?[person]:[],feed:[person],activeAwakePosts:f.sleep?[]:[person],myState:f.viewer===f.owner&&f.sleep?'sleep':'awake',catCare:f.care(),clock:{serverNow:f.at,monotonicAt:performance.now(),resetAt:Date.parse(SleepFlow.night(f.at)+'T06:00:00+09:00')+86400000}};
 };
 api.getCatCareStatus=async()=>f.care();
 api.giveCatMeal=async()=>{f.mealCalls++;const key=SleepFlow.night(f.at)+':'+CatCare.slot(f.at),accepted=!f.meals.has(key);f.meals.add(key);return {accepted,status:f.care()};};
 api.giveCatTreat=async recipient=>{f.treatCalls++;const accepted=!f.treats.includes(recipient);if(accepted)f.treats.push(recipient);return {accepted,status:f.care()};};
 globalThis.CareEvents=[];for(const type of ['careplaybackstart','careplaybackreturn','careplaybackend'])document.addEventListener(type,e=>CareEvents.push({type,at:performance.now(),where:e.target.closest('.room-scene')?.dataset.location,ms:e.detail?.visibleMs}));
};
