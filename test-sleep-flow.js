const assert = require('node:assert/strict');
require('./sleep-flow.js');
const f=SleepFlow;
const sleep={nightDate:'2026-10-03',at:'2026-10-03T23:00:00+09:00',finished:true};
const at=time=>Date.parse(time+'+09:00');
assert.equal(f.openView(sleep,[],at('2026-10-03T23:01:00')),'rest');
assert.equal(f.openView(sleep,[],at('2026-10-04T05:59:00')),'rest');
assert.equal(f.openView(sleep,[],at('2026-10-04T06:00:00')),'morning');
assert.equal(f.openView(sleep,['2026-10-04'],at('2026-10-04T08:00:00')),'home');
assert.equal(f.openView(sleep,[],at('2026-10-04T12:00:00')),'home');
assert.equal(f.openView(null,[],at('2026-10-04T08:00:00')),'home');
assert.equal(f.openView({...sleep,at:'2026-10-04T07:00:00+09:00'},[],at('2026-10-04T07:01:00')),'rest');
assert.equal(f.openView({...sleep,at:'2026-10-04T07:00:00+09:00'},[],at('2026-10-04T09:00:00')),'rest','A report after 06:00 belongs to the new night');
for(const reportAt of ['06:00:00','06:01:00','12:00:00','17:59:59']) {
 const daytime={...sleep,at:`2026-10-04T${reportAt}+09:00`};
 assert.equal(f.daytimeEnd(daytime),at('2026-10-04T18:00:00'));
 assert.equal(f.openView(daytime,[],at('2026-10-04T17:59:59.999')),'rest');
 for(const time of ['2026-10-04T18:00:00','2026-10-04T23:00:00','2026-10-05T06:00:00']) {
  assert.equal(f.openView(daytime,[],at(time)),'home');
  assert.equal(f.openView(JSON.parse(JSON.stringify(daytime)),[],at(time)),'home','Persisted state expires too');
  assert.equal(f.openView({...daytime,finished:false},[],at(time)),'home','Unfinished animation cannot extend daytime sleep');
  assert.equal(f.morningDue(daytime,[],at(time)),false,'Expired daytime sleep cannot reopen next morning');
 }
}
const evening={...sleep,at:'2026-10-04T18:00:00+09:00'};
assert.equal(f.daytimeEnd(evening),null);
assert.equal(f.openView(evening,[],at('2026-10-04T23:00:00')),'rest');
assert.equal(f.openView(evening,[],at('2026-10-05T06:00:00')),'morning');
assert.equal(f.daytimeEnd({nightDate:'2026-10-03'}),null,'Legacy records without report time retain night behavior');
assert.equal(f.openView({...sleep,finishedAt:'2026-10-04T07:00:00+09:00'},[],at('2026-10-04T07:01:00')),'morning','Finishing a previous-night report cannot extend the night past 06:00');
assert.equal(f.openView({...sleep,finishedAt:'2026-10-04T07:00:00+09:00'},[],at('2026-10-04T09:00:00')),'morning');
assert.equal(f.openView({nightDate:'2026-10-03'},[],at('2026-10-04T08:00:00')),'morning','Keep old sleep records usable');
assert.equal(f.openView({...sleep,at:'invalid'},[],at('2026-10-04T08:00:00')),'morning');
const lateSleep={...sleep,at:'2026-10-04T05:59:00+09:00',finishedAt:'2026-10-04T05:59:30+09:00'};
assert.equal(f.openView(lateSleep,[],at('2026-10-04T05:59:59.999')),'rest');
assert.equal(f.openView(lateSleep,[],at('2026-10-04T06:00:00')),'morning','06:00 overrides rest duration');
assert.equal(f.openView({...lateSleep,finished:false},[],at('2026-10-04T06:00:00')),'morning','Unfinished sleep screen also ends at 06:00');
assert.equal(f.day(at('2026-10-04T00:00:00')),'2026-10-04');
assert.equal(f.night(at('2026-10-04T00:00:00')),'2026-10-03');
assert.equal(f.night(at('2026-10-04T12:00:00')),'2026-10-04');
assert.equal(f.night(at('2026-10-04T05:59:59.999')),'2026-10-03');
assert.equal(f.night(at('2026-10-04T06:00:00')),'2026-10-04');
assert.equal(f.night(at('2026-10-05T05:59:59.999')),'2026-10-04');
assert.equal(f.previousNight(at('2026-10-04T06:00:00')),'2026-10-03');
assert.equal(f.night(Date.parse('2026-10-03T21:00:00Z')),'2026-10-04','Boundary is JST, independent of device timezone');
console.log('PASS sleep flow: 06:00/18:00 JST boundaries, daytime expiry including saved/unfinished states, evening and previous-night mornings, legacy records.');
