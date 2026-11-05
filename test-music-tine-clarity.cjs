const fs=require('fs'),assert=require('assert/strict'),crypto=require('crypto');
const synth=require('./test-support/music-box-expressive/synth.cjs'),{performance}=require('./test-support/music-box-elegant/render.cjs'),scores=require('./test-support/music-box-expressive/scores.json');
const voices=require('./test-support/music-box-elegant/voices.json').voices,baseline=require('./assets/classic-music-v11/baseline.json'),proof=require('./assets/classic-music-v11/production.json'),catalog=require('./assets/classic-music-v1/catalog.json'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const player=fs.readFileSync('roof-music.js','utf8');
const sourceHash=b=>hash(b.toString().replace(/\r\n/g,'\n'));
assert.equal(sourceHash(player.replace(/const tracks=\[.*?\],Audio=/,'TRACKS')),baseline.validatedPlayerImplementationSha256,'No playback or fade changes');
for(const[file,sha]of Object.entries(baseline.generatorSha256))assert.equal(sourceHash(fs.readFileSync(file)),sha,'Reused generator implementation');
const lateFraction=a=>{let total=0,late=0;for(let i=0;i<a.length;i++){total+=a[i]*a[i];if(i>=48000)late+=a[i]*a[i];}return late/total;};
const attackRatio=a=>{let early=0,late=0;for(let i=0;i<2400;i++)early+=(a[i]||0)**2;for(let i=48000;i<72000;i++)late+=(a[i]||0)**2;return early/late;};
for(const p of voices){
 const before=baseline.voices.find(v=>v.id===p.id),track=catalog.tracks.find(t=>t.id===p.id),old=baseline.tracks.find(t=>t.id===p.id),a=proof.tracks.find(t=>t.id===p.id);
 const{bassClarity:strength,midClarity,...same}=p,{bassClarity:prior,...original}=before;assert.deepEqual(same,original,'Only low/mid tine clarity changes');assert(strength>prior&&midClarity>0);
 const source=scores.find(s=>s.id===p.id);assert.deepEqual(performance(source,p),performance(source,before));assert.equal(p.nativeTimeScale,before.nativeTimeScale);assert.equal(track.seconds,old.seconds);assert.equal(track.performanceEventHash,old.performanceEventHash);assert.deepEqual(track.tempo,old.tempo);assert.equal(track.loopStart,old.loopStart);assert.equal(track.loopEnd,old.loopEnd);
 for(const midi of [36,48,55,60,64,69]){const b=synth.tine(midi,before),n=synth.tine(midi,p);assert(lateFraction(n)<lateFraction(b),'Less low-frequency late energy');assert(attackRatio(n)>attackRatio(b),'Clearer attack relative to late resonance');}
 for(const midi of [76,84,96])assert.equal(Buffer.compare(Buffer.from(synth.tine(midi,before).buffer),Buffer.from(synth.tine(midi,p).buffer)),0,'Higher tines remain sample-identical');
 assert.equal(hash(fs.readFileSync(track.url)),track.sha256);assert.equal(a.period,old.seconds);assert.equal(a.clipped,0);assert.equal(a.nonFinite,0);assert(a.nativeLoopRendered&&a.fullPeriodNativeRender&&a.oversampledPeak<1);assert(Math.abs(a.normalizedLufs-before.playbackLufs)<.001);
}
assert.equal(proof.tracks.length,5);assert(proof.worstCaseMixedHeadroomDb>0);console.log('PASS five clearer low-tine attacks/tails, exact upper waveforms and generator/player, unchanged notes/tempo/dynamics/loudness, full PCM and loop safety');
