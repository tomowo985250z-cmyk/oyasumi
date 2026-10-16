const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const faces=require('./post-cat-expressions.js'),source=fs.readFileSync('post-cat-expressions.js','utf8');
const cases=[['awake','relax',['calm','happy']],['awake','sleepless',['restless','surprised']],['sleep','sleep',['sleeping']],['try-sleep','try-sleep',['sleeping']],['early-sleep','sleep',['sleeping']]];
const independent={};vm.createContext(independent);vm.runInContext(source,independent);
for(const [status,intent,allowed] of cases){
 const seen=new Set(),counts={};
 for(let i=0;i<1000;i++){
  const post={id:`post-${i}`,status,intent,expression:'surprised'},face=faces.forPost(post);assert(allowed.includes(face));seen.add(face);counts[face]=(counts[face]||0)+1;
  assert.equal(face,faces.forPost({...post,expression:'calm',coat:'black',name:'changed',catRole:'mechanic'}));assert.equal(face,independent.PostCatExpressions.forPost(JSON.parse(JSON.stringify(post))));assert.equal(face,faces.forPost({id:post.id,choice:status,post_intent:intent}));
 }assert.equal(seen.size,allowed.length);if(allowed.length===2)assert(Object.values(counts).every(n=>n>400&&n<600));
}
for(const post of [undefined,{}, {id:'no-choice'},{status:'sleep'},{id:'invalid',status:'unknown'}])assert.equal(faces.forPost(post),'calm');
for(const coat of fs.readdirSync('assets/cat-refresh-v1'))if(fs.statSync('assets/cat-refresh-v1/'+coat).isDirectory())for(const expression of ['calm','happy','restless','surprised','yawn','sleepy'])assert(fs.existsSync(`assets/cat-refresh-v1/${coat}/face-${expression}.png`));
assert(!fs.readFileSync('app.js','utf8').includes('setCatExpression('));assert(!fs.readFileSync('app.js','utf8').includes('data-expression-picker'));
const now=Date.parse('2026-10-16T14:00:00+09:00'),post=(id,status,order,at=now-1000)=>({id,userId:'peer',status,order,time:at});
assert.equal(faces.state({status:'try-sleep'}),'sleep');assert.equal(faces.state({choice:'early-sleep'}),'sleep');
const latest=faces.latest([post('old','awake','9007199254740992',now-500),post('current','try-sleep','9007199254740993',now-1000),post('invalid','unknown','9007199254740994'),post('future','awake','9007199254740995',now+1000),post('previous-night','sleep','9999999999999999',now-86400000)],now);
assert.deepEqual(latest.map(p=>p.id),['current']);assert.equal(faces.state(latest[0]),'sleep');
console.log('PASS post faces: 5,000 choices, deterministic awake faces and closed-eye sleep choices, latest valid author state, bigint order, future/invalid/previous-night exclusion; no manual write path.');
