const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const scores=require('./test-support/music-box-expressive/scores.json'),voices=require('./test-support/music-box-elegant/voices.json').voices,arrange=require('./test-support/music-box-elegant/arrange.cjs'),{performance}=require('./test-support/music-box-elegant/render.cjs');
for(const p of voices){
 const source=scores.find(s=>s.id===p.id),score=arrange(source,p),again=arrange(source,p);
 assert.deepEqual(score,again,'Repeatable original arrangement');assert(score.arrangementStats.octaveMoves>0);
 for(const e of score.events){assert(source.events.some(old=>old.at===e.at&&old.sourceTrack===e.sourceTrack&&(e.midi-old.midi)%12===0),'Only octaves change from the current score');assert(e.velocity>0&&e.duration>0);if(e.role==='bass')assert(e.midi>=48&&e.midi<=60);}
 for(const e of source.events.filter(e=>e.sourceTrack===1))assert(score.events.some(n=>n.at===e.at&&n.midi===e.midi&&n.duration>=e.duration),'Every melody onset and pitch retained');
 assert.equal(new Set(score.events.map(e=>e.at+':'+e.midi)).size,score.events.length,'No doubled tine onsets');
 assert.equal(performance(source,p).sourceSeconds,source.sourceSeconds,'Existing duration retained');
 console.log('PASS '+p.id+' '+JSON.stringify(score.arrangementStats));
}
if(fs.existsSync('assets/classic-music-v13/production.json')){
 const catalog=require('./assets/classic-music-v1/catalog.json'),proof=require('./assets/classic-music-v13/production.json');
 assert.deepEqual(catalog.tracks.map(t=>t.id),voices.map(p=>p.id));assert(proof.pass&&proof.tracks.length===5);
 const implementation=fs.readFileSync('roof-music.js','utf8').replace(/\r\n/g,'\n').replace(/const tracks=\[.*?\],Audio=/,'TRACKS');assert.equal(crypto.createHash('sha256').update(implementation).digest('hex'),proof.playerImplementationSha256,'Playback and volume logic retained');
 for(const t of catalog.tracks){assert.equal(crypto.createHash('sha256').update(fs.readFileSync(t.url)).digest('hex'),t.sha256);const a=proof.tracks.find(a=>a.id===t.id);assert.equal(a.clipped,0);assert.equal(a.nonFinite,0);assert(a.oversampledPeak<1);assert(Math.abs(a.normalizedLufs+42)<.001);}
 assert(proof.worstCaseMixedHeadroomDb>6);
}
