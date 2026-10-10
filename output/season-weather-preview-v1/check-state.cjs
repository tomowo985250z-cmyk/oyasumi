const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const weather=require('./world-state.js'),cats=require('../day-room-preview-v1/room-state.js');
const source=fs.readFileSync(__dirname+'/world-state.js','utf8'),fresh={module:{exports:{}},Intl,Date,Object,Map,Math};vm.runInNewContext(source,fresh);
const counts={sunny:0,cloudy:0,rainy:0},transitions=[];let prior;
for(let i=0;i<1096;i++){
 const date=Date.parse('2026-01-01T14:00:00+09:00')+i*86400000,current=weather.at(date);
 counts[current.weather]++;
 assert.equal(current.weather,weather.at(date-14*3600000).weather,'Same JST day begins at midnight');
 assert.equal(current.weather,weather.at(date+9*3600000).weather,'Same weather through 23:00');
 assert.equal(JSON.stringify(current),JSON.stringify(fresh.module.exports.at(date)),'A second user/runtime has exactly the same world');
 if(prior){assert(!(prior==='sunny'&&current.weather==='rainy'||prior==='rainy'&&current.weather==='sunny'),'A cloudy day separates sun and rain');if(prior!==current.weather)transitions.push(i);}
 prior=current.weather;
}
assert(Object.values(counts).every(n=>n>50));assert(transitions.length>100);
for(const [date,expected]of[['2026-02-28T23:59:59+09:00','winter'],['2026-03-01T00:00:00+09:00','spring'],['2026-05-31T23:59:59+09:00','spring'],['2026-06-01T00:00:00+09:00','summer'],['2026-08-31T23:59:59+09:00','summer'],['2026-09-01T00:00:00+09:00','autumn'],['2026-11-30T23:59:59+09:00','autumn'],['2026-12-01T00:00:00+09:00','winter']])assert.equal(weather.at(Date.parse(date)).season,expected);
assert.equal(weather.at(Date.parse('2026-03-01T00:00:00+09:00')).day,'2026-03-01');
for(const [time,daylight]of[['05:59:59',false],['06:00:00',true],['17:59:59',true],['18:00:00',false]])assert.equal(weather.at(Date.parse(`2026-10-10T${time}+09:00`)).daylight,daylight);
// Out-of-order lookups, later dates and fresh reloads must not change history.
const backwards={module:{exports:{}},Intl,Date,Object,Map,Math};vm.runInNewContext(source,backwards);
for(const day of ['2030-04-01','2026-10-10','2027-12-31','2032-06-03','2026-03-01'])assert.equal(backwards.module.exports.at(Date.parse(day+'T14:00:00+09:00')).weather,weather.at(Date.parse(day+'T14:00:00+09:00')).weather);
let different=0;for(let i=0;i<100;i++){const date=Date.parse('2026-10-10T14:00:00+09:00')+i*86400000;if(JSON.stringify(cats.at(date,'cat-a'))!==JSON.stringify(cats.at(date,'cat-b')))different++;}assert(different>50);
require('../../test-timeline-visibility.js');
const report={pass:true,days:1096,counts,transitions:transitions.length,jstBoundaries:true,dayNightBoundaries:true,reloadAndOrderStable:true,sharedAcrossUsers:true,catsIndependent:true,threeHourExpiry:true,externalServices:false};fs.writeFileSync(__dirname+'/state-report.json',JSON.stringify(report,null,2));console.log('PASS shared seasonal weather',report);
