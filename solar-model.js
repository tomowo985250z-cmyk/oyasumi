// NOAA fractional-year solar equations. Original implementation; JST / Tokyo reference.
// https://gml.noaa.gov/grad/solcalc/solareqns.PDF
globalThis.SolarModel=(()=>{
 const rad=Math.PI/180,lat=35.7*rad,longitude=139.7,zone=9;
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
 function parameters(at){
  const local=new Date(at+zone*3600000),year=local.getUTCFullYear(),start=Date.UTC(year,0,1),days=(Date.UTC(year+1,0,1)-start)/86400000;
  const day=Math.floor((Date.UTC(year,local.getUTCMonth(),local.getUTCDate())-start)/86400000)+1,hour=local.getUTCHours()+local.getUTCMinutes()/60+local.getUTCSeconds()/3600;
  const g=2*Math.PI/days*(day-1+(hour-12)/24);
  const equation=229.18*(.000075+.001868*Math.cos(g)-.032077*Math.sin(g)-.014615*Math.cos(2*g)-.040849*Math.sin(2*g));
  const decl=.006918-.399912*Math.cos(g)+.070257*Math.sin(g)-.006758*Math.cos(2*g)+.000907*Math.sin(2*g)-.002697*Math.cos(3*g)+.00148*Math.sin(3*g);
  const hourAngle=(hour*60+equation+4*longitude-60*zone)/4-180,H=hourAngle*rad;
  const altitude=Math.asin(clamp(Math.sin(lat)*Math.sin(decl)+Math.cos(lat)*Math.cos(decl)*Math.cos(H),-1,1))/rad;
  const azimuth=(Math.atan2(Math.sin(H),Math.cos(H)*Math.sin(lat)-Math.tan(decl)*Math.cos(lat))/rad+180+360)%360;
  const gd=2*Math.PI/days*(day-1),dailyEquation=229.18*(.000075+.001868*Math.cos(gd)-.032077*Math.sin(gd)-.014615*Math.cos(2*gd)-.040849*Math.sin(2*gd)),dailyDecl=.006918-.399912*Math.cos(gd)+.070257*Math.sin(gd)-.006758*Math.cos(2*gd)+.000907*Math.sin(2*gd)-.002697*Math.cos(3*gd)+.00148*Math.sin(3*gd);
  const noon=720-4*longitude-dailyEquation+60*zone;
  const sunriseAngle=Math.acos(clamp(Math.cos(90.833*rad)/(Math.cos(lat)*Math.cos(dailyDecl))-Math.tan(lat)*Math.tan(dailyDecl),-1,1))/rad;
  return {at,hour,altitude,azimuth,noon,sunrise:noon-4*sunriseAngle,sunset:noon+4*sunriseAngle};
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
  const moonX=117+(moon.x-194.5)*2,moonY=43+(moon.y-26)*.65;
  const sunScreen={x:200-185*Math.sin(s.azimuth*rad),y:153-s.altitude*1.58};
  const moonScreen={x:160+moonX*1.25,y:-12+moonY*1.25};
  const source=day?'sun':'moon',opacity=weather==='sunny'?1:weather==='cloudy'?.22:.035;
  const altitude=day?s.altitude:clamp((153-moonScreen.y)/1.58,12,65);
  const azimuth=day?s.azimuth:180+Math.asin(clamp((moonScreen.x-200)/185,-1,1))/rad;
  const direction={x:Math.sin(azimuth*rad),y:-Math.cos(azimuth*rad)*.38};
  const direct=day?smooth(0,7,s.altitude)*opacity:(1-smooth(-8,-2,s.altitude))*moon.illumination*opacity*.23;
  const shadow=(height,cap=300)=>{const factor=1/Math.tan(Math.max(altitude,7)*rad),x=direction.x*height*factor,y=direction.y*height*factor,scale=Math.min(1,cap/Math.max(.001,Math.hypot(x,y)));return {x:x*scale,y:y*scale};};
  return {...s,source,phase:phase(at),direct,dawn,altitudeUsed:altitude,azimuthUsed:azimuth,screen:day?sunScreen:moonScreen,direction,shadow,moonIllumination:moon.illumination,southExposure:day?smooth(0,.55,-Math.cos(s.azimuth*rad)):.55,softness:weather==='sunny'?1.1:weather==='cloudy'?3:5};
 }
 const clock=minutes=>{const n=Math.round(minutes);return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');};
 return Object.freeze({at,parameters,phase,clock,clamp,smooth,time,world,weights,reference:{latitude:35.7,longitude,timezone:'Asia/Tokyo'}});
})();
