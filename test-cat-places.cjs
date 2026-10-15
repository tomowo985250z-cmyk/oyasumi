const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
global.SeasonWeather=require('./season-weather.js');const Places=require('./cat-places.js');
const context={SeasonWeather,Map,Object,Date,Math,String};vm.runInNewContext(fs.readFileSync('test-fixtures/cat-places-prototype-state.js','utf8'),context);
const reloaded={SeasonWeather,Map,Object,Date,Math,String};vm.runInNewContext(fs.readFileSync('cat-places.js','utf8'),reloaded);
const counts={room:{},garden:{},engawa:{}},weather=new Set(),seasons=new Set();let schedules=0,samples=0;
for(let month=1;month<=12;month++)for(let day=10;day<15;day++)for(let id=0;id<5;id++){
 const at=Date.parse(`2026-${String(month).padStart(2,'0')}-${day}T14:00:00+09:00`),user='cat-'+id,plan=Places.schedule(at,user),w=SeasonWeather.at(at);
 weather.add(w.weather);seasons.add(w.season);assert.equal(plan.events[0].at,plan.start);assert.equal(plan.events.at(-1).end,plan.end);
 const original=context.CatPlaces.schedule(at,user);assert.deepEqual(plan.events.map(e=>[e.at,e.end,e.place]),Array.from(original.events,e=>[e.at,e.end,e.place]));
 let previous;
 for(const e of plan.events){
  assert(e.duration>=30&&e.duration<=120);assert.notEqual(e.place,previous);previous=e.place;
  if(w.weather==='rainy')assert.notEqual(e.place,'garden');
  for(const mood of e.moods){
   assert(mood.at>=e.at&&mood.at<e.end);assert(Places.poseWeights[e.place][Places.poses.indexOf(mood.pose)]>0);
   const current=Places.at(mood.at,user),fresh=reloaded.CatPlaces.at(mood.at,user);
   assert.equal(current.place,e.place);assert.equal(current.pose,mood.pose);assert.equal(fresh.place,current.place);assert.equal(fresh.pose,current.pose);
   counts[e.place][mood.pose]=(counts[e.place][mood.pose]||0)+1;samples++;
  }
  assert.equal(Places.at(e.end-1,user).place,e.place);
 }schedules++;
}
assert.equal(weather.size,3);assert.equal(seasons.size,4);assert.equal(Object.keys(counts.room).length,5);
const total=p=>Object.values(counts[p]).reduce((a,b)=>a+b,0);
assert((counts.garden.play+counts.garden.groom)/total('garden')>.65);
assert((counts.engawa.doze+counts.engawa.relax)/total('engawa')>.8);
for(const time of ['05:59:59.999','18:00:00','23:59:59.999'])assert.equal(Places.at(Date.parse('2026-10-15T'+time+'+09:00'),'cat').place,'room');
assert.equal(Places.at(Date.parse('2026-10-15T06:00:00+09:00'),'cat').night,false);
assert(Places.weights({season:'winter',hour:14,weather:'sunny'}).room>Places.weights({season:'spring',hour:14,weather:'sunny'}).room);
assert(Places.weights({season:'summer',hour:14,weather:'sunny'}).garden<Places.weights({season:'summer',hour:8,weather:'sunny'}).garden);
console.log(`PASS cat places: ${schedules} day plans / ${samples} moods, unchanged prototype moves, 30–120 minutes, all seasons/weather, reload stability, weighted poses and night boundaries. ${JSON.stringify(counts)}`);
