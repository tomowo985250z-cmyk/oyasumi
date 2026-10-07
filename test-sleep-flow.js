const assert = require('node:assert/strict');
require('./sleep-flow.js');
const f=SleepFlow;
const sleep={nightDate:'2026-10-03',at:'2026-10-03T23:00:00+09:00',finished:true};
const at=time=>Date.parse(time+'+09:00');
assert.equal(f.openView(sleep,[],at('2026-10-03T23:01:00')),'rest');
assert.equal(f.openView(sleep,[],at('2026-10-04T05:59:00')),'home');
assert.equal(f.openView(sleep,[],at('2026-10-04T06:00:00')),'morning');
assert.equal(f.openView(sleep,['2026-10-04'],at('2026-10-04T08:00:00')),'home');
assert.equal(f.openView(sleep,[],at('2026-10-04T12:00:00')),'home');
assert.equal(f.openView(null,[],at('2026-10-04T08:00:00')),'home');
assert.equal(f.openView({...sleep,at:'2026-10-04T07:00:00+09:00'},[],at('2026-10-04T07:01:00')),'rest');
assert.equal(f.openView({...sleep,at:'2026-10-04T07:00:00+09:00'},[],at('2026-10-04T09:00:00')),'rest','A report after 06:00 belongs to the new night');
for(const [reportTime,endTime] of [
 ['2026-10-04T06:10:00','2026-10-04T09:10:00'],
 ['2026-10-04T12:00:00','2026-10-04T15:00:00'],
 ['2026-10-04T20:00:00','2026-10-04T23:00:00'],
 ['2026-10-04T23:30:00','2026-10-05T02:30:00'],
 ['2026-10-04T17:00:00','2026-10-04T20:00:00']
]) {
 const report={...sleep,at:reportTime+'+09:00',finishedAt:reportTime+'+09:00'};
 const end=at(endTime);
 assert.equal(f.endAt(report),end);
 assert.equal(f.openView(report,[],end-1),'rest','Three hours minus 1ms');
 assert.equal(f.openView(report,[],end),'home','Exactly three hours');
 assert.equal(f.openView(report,[],end+1),'home');
 assert.equal(f.openView(JSON.parse(JSON.stringify(report)),[],end),'home','Saved state uses original timestamp');
 assert.equal(f.openView({...report,finished:false},[],end),'home','Animation cannot extend expiry');
 assert.equal(f.openView({...report,finishedAt:new Date(end).toISOString()},[],end),'home','Completing again cannot extend expiry');
 assert.equal(f.openView(report,[f.day(end-1)],end-1),'rest','Earlier morning receipt cannot shorten a new sleep');
}
assert.equal(f.openView({...sleep,at:'2026-10-04T17:00:00+09:00'},[],at('2026-10-04T18:00:00')),'rest','No fixed 18:00 expiry');
assert.equal(f.endAt({finishedAt:'2026-10-04T20:00:00+09:00'}),at('2026-10-04T23:00:00'),'Legacy completion timestamp fallback');
assert.equal(f.endAt({nightDate:'2026-10-03'}),null);
assert.equal(f.openView({...sleep,finishedAt:'2026-10-04T07:00:00+09:00'},[],at('2026-10-04T07:01:00')),'morning','Finishing a previous-night report cannot extend the night past 06:00');
assert.equal(f.openView({...sleep,finishedAt:'2026-10-04T07:00:00+09:00'},[],at('2026-10-04T09:00:00')),'morning');
assert.equal(f.openView({nightDate:'2026-10-03'},[],at('2026-10-04T08:00:00')),'morning','Keep old sleep records usable');
assert.equal(f.openView({...sleep,at:'invalid'},[],at('2026-10-04T08:00:00')),'morning');
const lateSleep={...sleep,at:'2026-10-04T05:59:00+09:00',finishedAt:'2026-10-04T05:59:30+09:00'};
assert.equal(f.openView(lateSleep,[],at('2026-10-04T05:59:59.999')),'rest');
assert.equal(f.openView(lateSleep,[],at('2026-10-04T06:00:00')),'rest','06:00 cannot shorten three-hour sleep');
assert.equal(f.openView({...lateSleep,finished:false},[],at('2026-10-04T06:00:00')),'home','Unfinished state is handled by the sleep animation');
assert.equal(f.day(at('2026-10-04T00:00:00')),'2026-10-04');
assert.equal(f.night(at('2026-10-04T00:00:00')),'2026-10-03');
assert.equal(f.night(at('2026-10-04T12:00:00')),'2026-10-04');
assert.equal(f.night(at('2026-10-04T05:59:59.999')),'2026-10-03');
assert.equal(f.night(at('2026-10-04T06:00:00')),'2026-10-04');
assert.equal(f.night(at('2026-10-05T05:59:59.999')),'2026-10-04');
assert.equal(f.previousNight(at('2026-10-04T06:00:00')),'2026-10-03');
assert.equal(f.night(Date.parse('2026-10-03T21:00:00Z')),'2026-10-04','Boundary is JST, independent of device timezone');
assert.equal(f.openView(lateSleep,[],at('2026-10-04T08:58:59.999')),'rest');
assert.equal(f.openView(lateSleep,[],at('2026-10-04T08:59:00')),'morning','Morning screen is available only after sleep expires');
assert.equal(f.openView(lateSleep,['2026-10-04'],at('2026-10-04T08:59:00')),'home');
console.log('PASS sleep flow: all-hour report +3h expiry, millisecond boundaries, midnight/06:00/18:00 crossings, saved/unfinished states and previous-night morning receipts.');
