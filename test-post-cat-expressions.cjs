const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const faces=require('./post-cat-expressions.js'),source=fs.readFileSync('post-cat-expressions.js','utf8');
const cases=[['awake','relax',['calm','happy']],['awake','sleepless',['restless','surprised']],['sleep','sleep',['sleepy','sleeping']],['try-sleep','try-sleep',['yawn','sleepy']],['early-sleep','sleep',['sleepy','sleeping']]];
const independent={};vm.createContext(independent);vm.runInContext(source,independent);
for(const [status,intent,allowed] of cases){
 const seen=new Set(),counts={};
 for(let i=0;i<1000;i++){
  const post={id:`post-${i}`,status,intent,expression:'surprised'},face=faces.forPost(post);assert(allowed.includes(face));seen.add(face);counts[face]=(counts[face]||0)+1;
  assert.equal(face,faces.forPost({...post,expression:'calm',coat:'black',name:'changed',catRole:'mechanic'}));assert.equal(face,independent.PostCatExpressions.forPost(JSON.parse(JSON.stringify(post))));assert.equal(face,faces.forPost({id:post.id,choice:status,post_intent:intent}));
 }assert.equal(seen.size,2);assert(Object.values(counts).every(n=>n>400&&n<600));
}
for(const post of [undefined,{}, {id:'no-choice'},{status:'sleep'},{id:'invalid',status:'unknown'}])assert.equal(faces.forPost(post),'calm');
for(const coat of fs.readdirSync('assets/cat-refresh-v1'))if(fs.statSync('assets/cat-refresh-v1/'+coat).isDirectory())for(const expression of ['calm','happy','restless','surprised','yawn','sleepy'])assert(fs.existsSync(`assets/cat-refresh-v1/${coat}/face-${expression}.png`));
assert(!fs.readFileSync('app.js','utf8').includes('setCatExpression('));assert(!fs.readFileSync('app.js','utf8').includes('data-expression-picker'));
console.log('PASS post faces: 5,000 choices, both candidates, stable across clients/reloads/preferences/coats, legacy rows, unposted calm, existing artwork, no manual write path.');
