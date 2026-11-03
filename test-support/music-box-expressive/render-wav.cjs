// Existing recordings are never overwritten. Supply a new or empty directory.
const fs=require('node:fs'),path=require('node:path'),synth=require('./synth.cjs'),scores=require('./scores.json'),{voices}=require('./voices.json');
if(!process.argv[2])throw Error('Specify an empty output directory');const dir=path.resolve(process.argv[2]);if(fs.existsSync(dir)&&fs.readdirSync(dir).length)throw Error('Output directory must be empty');fs.mkdirSync(dir,{recursive:true});
for(const score of scores){const {out,meta}=synth(score,voices.find(v=>v.id===score.id));fs.writeFileSync(path.join(dir,score.id+'.wav'),out,{flag:'wx'});fs.writeFileSync(path.join(dir,score.id+'.json'),JSON.stringify(meta,null,2)+'\n',{flag:'wx'});console.log(score.id+' '+meta.seconds.toFixed(2)+'s');}
