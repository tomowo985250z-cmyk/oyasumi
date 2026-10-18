// NOAA fractional-year solar equations. Original implementation; JST / Tokyo reference.
// https://gml.noaa.gov/grad/solcalc/solareqns.PDF
globalThis.SolarModel=(()=>{
 const rad=Math.PI/180,zone=9,minuteMs=60000,dayMs=86400000;
 const regions=Object.freeze([
  {id:'tokyo',label:'東京',latitude:35.7,longitude:139.7},
  {id:'sapporo',label:'札幌',latitude:43.06,longitude:141.35},
  {id:'osaka',label:'大阪',latitude:34.69,longitude:135.5},
  {id:'naha',label:'那覇',latitude:26.21,longitude:127.68}
 ].map(Object.freeze));
 let region=regions[0];const dailyCache=new Map();
 const setRegion=id=>(region=regions.find(value=>value.id===id)||regions[0]);
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
 const bearing=where=>({room:90,window:90,engawa:270,garden:180,sky:180,roof:0}[where]??180);
 const cast=(altitude,direction)=>(height,cap=300)=>{const factor=1/Math.tan(Math.max(altitude,7)*rad),x=direction.x*height*factor,y=direction.y*height*factor,scale=Math.min(1,cap/Math.max(.001,Math.hypot(x,y)));return {x:x*scale,y:y*scale};};
 function facing(s,where){
  const delta=((s.azimuth-bearing(where)+540)%360)-180,direction={x:-Math.sin(delta*rad),y:Math.cos(delta*rad)*.38};
  return {...s,delta,sunPoint:{x:200+delta*400/180,y:153-s.altitude*1.58},inView:Math.abs(delta)<=90&&s.altitude>=-.833,
   exposure:where==='garden'||where==='sky'?1:Math.max(0,Math.cos(delta*rad)),direction,shadow:cast(s.altitudeUsed,direction)};
 }
 function parameters(at){
  const lat=region.latitude*rad,longitude=region.longitude;
  const local=new Date(at+zone*3600000),year=local.getUTCFullYear(),start=Date.UTC(year,0,1),days=(Date.UTC(year+1,0,1)-start)/86400000;
  const day=Math.floor((Date.UTC(year,local.getUTCMonth(),local.getUTCDate())-start)/86400000)+1,hour=local.getUTCHours()+local.getUTCMinutes()/60+local.getUTCSeconds()/3600;
  const g=2*Math.PI/days*(day-1+(hour-12)/24);
  const equation=229.18*(.000075+.001868*Math.cos(g)-.032077*Math.sin(g)-.014615*Math.cos(2*g)-.040849*Math.sin(2*g));
  const decl=.006918-.399912*Math.cos(g)+.070257*Math.sin(g)-.006758*Math.cos(2*g)+.000907*Math.sin(2*g)-.002697*Math.cos(3*g)+.00148*Math.sin(3*g);
  const hourAngle=(hour*60+equation+4*longitude-60*zone)/4-180,H=hourAngle*rad;
  const altitude=Math.asin(clamp(Math.sin(lat)*Math.sin(decl)+Math.cos(lat)*Math.cos(decl)*Math.cos(H),-1,1))/rad;
  const azimuth=(Math.atan2(Math.sin(H),Math.cos(H)*Math.sin(lat)-Math.tan(decl)*Math.cos(lat))/rad+180+360)%360;
  const dayStart=Date.UTC(year,local.getUTCMonth(),local.getUTCDate())-zone*3600000,key=region.id+':'+dayStart;
  let daily=dailyCache.get(key);
  if(!daily){
   const gd=2*Math.PI/days*(day-1),dailyEquation=229.18*(.000075+.001868*Math.cos(gd)-.032077*Math.sin(gd)-.014615*Math.cos(2*gd)-.040849*Math.sin(2*gd)),dailyDecl=.006918-.399912*Math.cos(gd)+.070257*Math.sin(gd)-.006758*Math.cos(2*gd)+.000907*Math.sin(2*gd)-.002697*Math.cos(3*gd)+.00148*Math.sin(3*gd);
   const noon=720-4*longitude-dailyEquation+60*zone;
   const sunriseAngle=Math.acos(clamp(Math.cos(90.833*rad)/(Math.cos(lat)*Math.cos(dailyDecl))-Math.tan(lat)*Math.tan(dailyDecl),-1,1))/rad;
   // Civil twilight: solar centre six degrees below the unobstructed horizon.
   const civilAngle=Math.acos(clamp(Math.cos(96*rad)/(Math.cos(lat)*Math.cos(dailyDecl))-Math.tan(lat)*Math.tan(dailyDecl),-1,1))/rad;
   daily={dayStart,noon,sunrise:noon-4*sunriseAngle,sunset:noon+4*sunriseAngle,civilDawn:noon-4*civilAngle,civilDusk:noon+4*civilAngle,region:region.id};
   if(dailyCache.size>=16)dailyCache.delete(dailyCache.keys().next().value);
   dailyCache.set(key,daily);
  }
  return {at,hour,altitude,azimuth,...daily,sunriseAt:dayStart+daily.sunrise*minuteMs,sunsetAt:dayStart+daily.sunset*minuteMs,civilDawnAt:dayStart+daily.civilDawn*minuteMs,civilDuskAt:dayStart+daily.civilDusk*minuteMs};
 }
 // One decorative night, continuous across JST midnight. Not an ephemeris for
 // lunar rise/set: the illustrated moon deliberately spans sunset to sunrise.
 function nightSpan(at){
  const today=parameters(at),before=at<today.sunriseAt;
  const evening=before?parameters(today.dayStart-1):today;
  const morning=before?today:parameters(today.dayStart+dayMs);
  const start=evening.sunsetAt,end=morning.sunriseAt;
  return {start,end,dusk:evening.civilDuskAt,dawn:morning.civilDawnAt,progress:clamp((at-start)/(end-start)),visible:at>=start&&at<end};
 }
 function twilight(at,where='sky'){
  const s=parameters(at),morning=s.hour*60<s.noon;
  const facingGlow=(1+Math.cos((bearing(where)-(morning?90:270))*rad))/2;
  const glow=smooth(-6,-1,s.altitude)*(1-smooth(5,16,s.altitude));
  return {stars:1-smooth(-10,-3,s.altitude),blue:smooth(-12,-6,s.altitude)*(1-smooth(-3,2,s.altitude)),
   warm:glow*(.12+.88*facingGlow),glow,morning};
 }
 // Decoration only. Keep the cat activity and posting-day boundaries unchanged.
 function sky(at,s=parameters(at)){
  const dawnAge=(at-s.sunriseAt)/minuteMs,duskAge=(s.sunsetAt-at)/minuteMs;
  const edge=age=>smooth(0,8,age)*(1-smooth(30,60,age));
  const morning=edge(dawnAge),evening=edge(duskAge),roofStart=s.sunsetAt,roofEnd=s.sunriseAt;
  const nextRoofAt=at<roofEnd?roofEnd:at<roofStart?roofStart:parameters(at+dayMs).sunriseAt;
  const daylight=at>=s.sunriseAt&&at<s.sunsetAt?smooth(-.833,3,s.altitude):0;
  return {region:s.region,sunriseAt:s.sunriseAt,sunsetAt:s.sunsetAt,civilDawnAt:s.civilDawnAt,civilDuskAt:s.civilDuskAt,roofVisible:at<roofEnd||at>=roofStart,nextRoofAt,
   morningOpacity:.72*morning,eveningOpacity:.64*daylight*weights(at).evening,gardenOpacity:.64*daylight,
   sunOpacity:.72*Math.max(morning,evening),sunPeriod:morning>0?'morning':evening>0?'evening':null};
 }
 function phase(at){const s=parameters(at);return s.altitude<-.833?'night':s.hour*60<s.noon&&s.altitude<28?'morning':s.hour*60>s.noon&&s.altitude<22?'evening':'day';}
 function time(w={}){return Number.isFinite(w.at)?w.at:w.day&&Number.isFinite(w.hour)?Date.parse(w.day+'T00:00:00+09:00')+w.hour*3600000:globalThis.NightClock?.now()??Date.now();}
 function world(w){const at=Math.floor(time(w)/60000)*60000;return {...w,at,solar:true,phase:phase(at)};}
 function weights(at){
  const s=parameters(at),noon=parameters(at+(s.noon-s.hour*60)*60000),daylight=smooth(-8,5,s.altitude),low=1-smooth(12,Math.min(40,noon.altitude*.85),s.altitude),morning=s.hour*60<s.noon?low*daylight:0,evening=s.hour*60>=s.noon?low*daylight:0;
  return {morning,day:daylight-morning-evening,evening,night:1-daylight};
 }
 function at(at,weather='sunny'){
  const s=parameters(at),day=s.altitude>0,dawn=smooth(-5,5,s.altitude),moon=RoofMoon.snapshot(at);
  // Preserve the app's illustrated moon trajectory/phase, rather than inventing a second moon.
  const sunScreen={x:200-185*Math.sin(s.azimuth*rad),y:153-s.altitude*1.58};
  const moonScreen={x:200+(moon.azimuth-180)*400/180,y:153-moon.altitude*1.58};
  const source=day?'sun':'moon',opacity=weather==='sunny'?1:weather==='cloudy'?.22:.035;
  const altitude=day?s.altitude:Math.max(0,moon.altitude);
  const azimuth=day?s.azimuth:moon.azimuth;
  const direction={x:Math.sin(azimuth*rad),y:-Math.cos(azimuth*rad)*.38};
  const direct=day?smooth(0,7,s.altitude)*opacity:(1-smooth(-8,-2,s.altitude))*moon.illumination*moon.opacity*opacity*.23;
  const shadow=cast(altitude,direction);
  return {...s,source,phase:phase(at),direct,dawn,altitudeUsed:altitude,azimuthUsed:azimuth,screen:day?sunScreen:moonScreen,sunScreen,sky:sky(at,s),direction,shadow,moonIllumination:moon.illumination,southExposure:day?smooth(0,.55,-Math.cos(s.azimuth*rad)):.55,softness:weather==='sunny'?1.1:weather==='cloudy'?3:5};
 }
 const clock=minutes=>{const n=Math.round(minutes);return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');};
 return Object.freeze({at,parameters,phase,clock,clamp,smooth,time,world,weights,sky,nightSpan,twilight,regions,setRegion,bearing,facing,region:()=>region,reference:{latitude:35.7,longitude:139.7,timezone:'Asia/Tokyo'}});
})();
