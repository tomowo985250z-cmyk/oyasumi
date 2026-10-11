globalThis.PostReactions = (() => {
 const groups = {
  relax: [['relax-time','🌷いい時間を'],['relax-day','🐾今日もぼちぼち'],['relax-pace','🍀自分のペースで'],['relax-easy','🐱のんびりいこう']],
  sleep: [['sleep-night','🌙おやすみ'],['sleep-dream','✨いい夢を'],['sleep-tomorrow','🐱また明日ね'],['sleep-rest','🌸ゆっくり休んで']],
  sleepless: [['sleepless-patience','🍀焦らずね'],['sleepless-here','🐱ここにいるよ'],['sleepless-kind','🌷無理しないでね'],['sleepless-easy','🌙ゆっくりいこう']],
  'try-sleep': [['try-night','🌙そっとおやすみ'],['try-kind','🍀無理せずね'],['try-rest','✨休めますように'],['try-easy','🐾ゆっくりね']]
 };
 const legacy = [['goodnight','おやすみ🌙'],['dream','いい夢を💤'],['tomorrow','また明日👋'],['comfort','無理せずね☺️']].map(([id,text]) => Object.freeze({id,text}));
 for (const key of Object.keys(groups)) groups[key] = Object.freeze(groups[key].map(([id,text]) => Object.freeze({id,text})));
 const all = Object.freeze([...Object.values(groups).flat(),...legacy]);
 function intent(post) {
  if (post.status === 'awake') return post.intent === 'sleepless' ? 'sleepless' : 'relax';
  return post.status === 'try-sleep' ? 'try-sleep' : 'sleep';
 }
 function counts(values = {}) {
  return Object.fromEntries(all.map(({id}) => [id, Number.isSafeInteger(Number(values[id])) && Number(values[id]) > 0 ? Number(values[id]) : 0]));
 }
 const options = post => groups[intent(post)];
 const total = values => Object.values(counts(values)).reduce((sum,n) => sum+n,0);
 return Object.freeze({groups:Object.freeze(groups),legacy:Object.freeze(legacy),all,intent,options,counts,total});
})();
