const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={};vm.createContext(context);const roof=fs.readFileSync(path.join(__dirname,'roof-cats.js'),'utf8');vm.runInContext(roof.slice(roof.indexOf('globalThis.RoofMoon =')),context);vm.runInContext(fs.readFileSync(path.join(__dirname,'solar-model.js'),'utf8'),context);const model=context.SolarModel;
const days=['2026-03-21','2026-06-21','2026-09-26','2026-12-21'],seasons=[];let minutes=0,largestPaletteStep=0;
for(const date of days){
 const start=Date.parse(date+'T00:00:00+09:00'),daily=model.parameters(start+12*3600000),morning=model.at(start+(daily.sunrise+75)*60000),noon=model.at(start+daily.noon*60000),evening=model.at(start+(daily.sunset-65)*60000),night=model.at(start+21*3600000);
 assert(morning.shadow(40).x>0&&evening.shadow(40).x<0);assert(Math.abs(noon.azimuth-180)<1);assert(Math.hypot(...Object.values(morning.shadow(40)))>Math.hypot(...Object.values(noon.shadow(40))));assert(Math.hypot(...Object.values(evening.shadow(40)))>Math.hypot(...Object.values(noon.shadow(40))));
 assert(noon.direct>model.at(noon.at,'cloudy').direct&&model.at(noon.at,'cloudy').direct>model.at(noon.at,'rainy').direct);assert(night.direct<noon.direct*.24);
 let previous;
 for(let i=0;i<1440;i++){
  const at=start+i*60000,s=model.at(at),weights=model.weights(at);assert(Object.values(s.shadow(100)).every(Number.isFinite));assert(Object.values(weights).every(v=>v>=0&&v<=1));assert(Math.abs(Object.values(weights).reduce((a,b)=>a+b,0)-1)<1e-9);assert.equal(model.parameters(at).sunrise,daily.sunrise);assert.equal(model.parameters(at).sunset,daily.sunset);
  if(previous)for(const key of Object.keys(weights))largestPaletteStep=Math.max(largestPaletteStep,Math.abs(weights[key]-previous[key]));previous=weights;minutes++;
 }
 seasons.push({date,sunrise:model.clock(daily.sunrise),sunset:model.clock(daily.sunset),dayMinutes:daily.sunset-daily.sunrise,noonAltitude:noon.altitude});
}
assert(seasons[1].dayMinutes>seasons[3].dayMinutes+250);assert(largestPaletteStep<.05);assert.equal(model.phase(Date.parse('2026-06-21T15:00:00+09:00')),'day');assert.equal(model.phase(Date.parse('2026-12-21T17:00:00+09:00')),'night');
const out=path.join(__dirname,'output/solar-light-release');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'model-report.json'),JSON.stringify({pass:true,reference:model.reference,seasons,minutes,largestPaletteStep,productionDbWrites:0},null,2));console.log(`PASS solar model: ${minutes} minutes; opposite morning/evening, short noon shadows, seasonal daylight, weather, bounded continuous palette weights`);
