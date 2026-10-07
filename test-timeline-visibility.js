const assert=require('node:assert/strict');
require('./timeline-visibility.js');
const duration=3*3600000;
for(const now of ['2026-10-07T06:00:00+09:00','2026-10-07T18:00:00+09:00','2026-10-08T02:30:00+09:00'].map(Date.parse)) {
 const posts=['awake','sleep','try-sleep','early-sleep'].flatMap(status=>[
  {id:status+'-before',status,time:now-duration+1},
  {id:status+'-exact',status,time:now-duration},
  {id:status+'-after',status,time:now-duration-1}
 ]);
 const saved=structuredClone(posts);
 assert.deepEqual(TimelineVisibility.visible(posts,now).map(p=>p.id),posts.filter(p=>p.id.endsWith('-before')).map(p=>p.id));
 assert.equal(TimelineVisibility.nextExpiry(posts,now),now+1);
 assert.deepEqual(TimelineVisibility.visible(posts,now+1),[]);
 assert.equal(TimelineVisibility.nextExpiry(posts,now+1),null);
 assert.deepEqual(posts,saved,'Display expiry never mutates feed/history data');
}
assert.deepEqual(TimelineVisibility.visible([{time:NaN}],0),[]);
console.log('PASS timeline visibility: all four choices, +3h millisecond boundary, midnight/06:00/18:00, immutable data and next deadline.');
