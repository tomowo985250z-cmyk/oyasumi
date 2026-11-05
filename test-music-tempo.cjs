// Check the retained v9 tempo revision; test-music-tine-clarity also requires the current tempos/durations to match it exactly.
const fs=require('fs'),assert=require('assert/strict'),crypto=require('crypto'),synth=require('./test-support/music-box-expressive/synth.cjs'),{performance}=require('./test-support/music-box-elegant/render.cjs'),scores=require('./test-support/music-box-expressive/scores.json'),before=require('./assets/classic-music-v8/voices.json').voices,after=require('./assets/classic-music-v9/voices.json').voices,oldProduction=require('./assets/classic-music-v8/production.json'),proof=require('./assets/classic-music-v9/production.json'),catalog={tracks:require('./assets/classic-music-v10/baseline.json').tracks};
const speeds={'clair-de-lune':1.10,'traumerei':1.10,'gymnopedie-1':1.10},hash=b=>crypto.createHash('sha256').update(b).digest('hex');
assert.equal(proof.tempoOnlyTargets.length,3);
for(const voice of after){
 const old=before.find(v=>v.id===voice.id),track=catalog.tracks.find(t=>t.id===voice.id),was=oldProduction.tracks.find(t=>t.id===voice.id),now=proof.tracks.find(t=>t.id===voice.id),speed=speeds[voice.id];
 assert.equal(hash(fs.readFileSync(track.url)),track.sha256);assert.equal(track.performanceEventHash,was.render.performanceEventHash);
 if(!speed){assert.deepEqual(voice,old);assert.equal(track.sha256,was.render.sha256);assert.equal(hash(JSON.stringify(track)),proof.untargetedTrackMetadataSha256[voice.id]);continue;}
 const {nativeTimeScale:previousScale,...oldTone}=old,{nativeTimeScale:currentScale,...newTone}=voice;assert.deepEqual(newTone,oldTone,'Only tempo parameter changes');assert.equal(currentScale,previousScale/speed);
 const source=scores.find(s=>s.id===voice.id);assert.deepEqual(performance(source,voice).events,performance(source,old).events,'Identical pitch, harmony, velocity, ornaments and phrase expression');
 for(const midi of [48,72])assert.equal(Buffer.compare(Buffer.from(synth.tine(midi,old).buffer),Buffer.from(synth.tine(midi,voice).buffer)),0,'Identical low/high tine pitch, timbre, envelope and decay in seconds');
 assert(Math.abs(track.seconds-was.period/speed)<2/24000);assert.equal(now.period,track.seconds);assert.equal(track.loopStart,now.loopStart);assert.equal(track.loopEnd,now.loopEnd);assert.equal(now.clipped,0);assert.equal(now.nonFinite,0);assert(now.oversampledPeak<1&&now.fullPeriodNativeRender&&now.nativeLoopRendered);assert(Math.abs(now.normalizedLufs-was.normalizedLufs)<.001);
}
assert(proof.worstCaseMixedHeadroomDb>0);console.log('PASS three generation-only tempo changes from v8; sample-identical tines/decay and note/velocity data, calibrated loudness, full PCM/loops; Air and Nocturne metadata/audio unchanged');
