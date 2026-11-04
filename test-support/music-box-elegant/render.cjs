// Independent performances using the existing analytic tine/wood instrument.
// No samples, soundfonts, reference-recording data or harmony/pitch correction.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const synth=require('../music-box-expressive/synth.cjs'),original=require('../music-box-expressive/scores.json'),recipes=require('./voices.json').voices;
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function performance(source,p){
 const total=source.sourceSeconds,warp=t=>t+p.breathSeconds*Math.sin(Math.PI*Math.max(0,Math.min(1,t/total)))*Math.sin(2*Math.PI*t/p.phraseSeconds);
 const events=source.events.map(e=>{
  const upper=e.sourceTrack===1,melody=upper&&e.midi>=p.melodyFloor&&(p.allUpperMelody||e.duration>=p.melodyDuration||e.midi>=p.graceFloor);
  const shape=.91+p.swell*Math.sin(Math.PI*e.at/total)**2,phrase=1-p.phraseSwell/2+p.phraseSwell*Math.sin(Math.PI*e.at/p.phraseSeconds)**2;
  return {...e,at:warp(e.at),duration:warp(e.at+e.duration)-warp(e.at),velocity:e.velocity*shape*phrase*(melody?p.melodyGain:p.accompanimentGain)};
 });
 for(let i=0;i<events.length;i++){
  const e=events[i],old=source.events[i];assert.equal(e.midi,old.midi);assert.equal(e.sourceTrack,old.sourceTrack);assert(Number.isFinite(e.at)&&e.at>=0&&Number.isFinite(e.duration)&&e.duration>0&&Number.isFinite(e.velocity)&&e.velocity>0);
 }
 // A single smooth time map applies to every voice, including grace notes and chords.
 const sorted=source.events.map((e,i)=>({at:e.at,mapped:events[i].at})).sort((a,b)=>a.at-b.at);for(let i=1;i<sorted.length;i++){assert(sorted[i].mapped>=sorted[i-1].mapped);if(sorted[i].at===sorted[i-1].at)assert.equal(sorted[i].mapped,sorted[i-1].mapped);}
 return {...source,events,performanceEventHash:hash(events)};
}
function render(dir){
 dir=path.resolve(dir);if(fs.existsSync(dir)&&fs.readdirSync(dir).length)throw Error('Use a new or empty output directory');fs.mkdirSync(dir,{recursive:true});const rows=[];
 for(const voice of recipes){
  const source=voice.id==='moonlight-1'?require('./moonlight-1.score.json'):original.find(s=>s.id===voice.id);assert(source,'Source missing: '+voice.id);
  const score=performance(source,voice),made=synth(score,voice);made.meta.sourceNotes=source.events.length;made.meta.sourcePitchAndVoiceOrderPreserved=true;made.meta.simultaneousNotesRemainSimultaneous=true;made.meta.performance='Smooth phrase time map shared by all voices; quiet melodic voicing and continuous phrase dynamics; no missing, substituted or retuned score notes.';
  fs.writeFileSync(path.join(dir,voice.id+'.wav'),made.out,{flag:'wx'});fs.writeFileSync(path.join(dir,voice.id+'.json'),JSON.stringify(made.meta,null,2)+'\n',{flag:'wx'});rows.push(made.meta);console.log('RENDERED '+voice.id+' '+made.meta.seconds.toFixed(2)+'s '+made.meta.measuredFloatLufs.toFixed(2)+' LUFS');
 }
 fs.writeFileSync(path.join(dir,'renders.json'),JSON.stringify(rows,null,2)+'\n');return rows;
}
if(require.main===module){if(!process.argv[2])throw Error('Specify an empty output directory');render(process.argv[2]);}
module.exports={performance,render};
