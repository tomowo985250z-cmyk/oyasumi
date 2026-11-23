const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const info=JSON.parse(fs.readFileSync('assets/garden-campfire-v1/audio.json','utf8'));
const encoded=fs.readFileSync('assets/garden-campfire-v1/campfire-recorded.mp3');
assert.equal(encoded.length,info.processing.encoded.bytes);
assert.equal(crypto.createHash('sha256').update(encoded).digest('hex'),info.processing.encoded.sha256);
assert.equal(info.license,'CC0 1.0 Universal');
assert(info.processing.seconds>250);assert.equal(info.processing.encoded.clipped,0);
assert(info.processing.encoded.peakDb<-9);assert(info.processing.encoded.seamStep<.002);
assert.equal(info.processing.sampleRate,16000);assert.equal(info.processing.channels,1);
assert(info.processing.encoded.decodedBytes<17*1024*1024);
const script=fs.readFileSync('garden-campfire.js','utf8');
const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
function harness(){
 let at=0,requests=0,decodes=0,resolveDownload,rejectDownload;
 const starts=[];
 const sandbox={console,crypto:crypto.webcrypto,Uint32Array,Math,Map,Set,URL,Event:class{},Date:{now:()=>at},
  matchMedia:()=>({matches:false,addEventListener(){}}),document:{baseURI:'https://local.invalid/index.html',readyState:'loading',addEventListener(){},dispatchEvent(){}},IntersectionObserver:class{},
  setTimeout(){throw Error('Recorded playback must not use a timer');},
  fetch(url,options){requests++;assert.match(String(url),/campfire-recorded\.mp3/);assert.equal(options.cache,'force-cache');return new Promise((resolve,reject)=>{resolveDownload=()=>resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});rejectDownload=reject;});}};
 vm.createContext(sandbox);vm.runInContext(script,sandbox);
 class Param{constructor(){this.value=0;}cancelScheduledValues(){}setValueAtTime(v){this.value=v;}linearRampToValueAtTime(v){this.value=v;}}
 const buffer={duration:info.processing.encoded.decodedSeconds,numberOfChannels:1,sampleRate:16000};
 const context={state:'running',currentTime:0,async decodeAudioData(){decodes++;return buffer;},createGain:()=>({gain:new Param(),connect(){}}),createBufferSource(){return{connect(){},disconnect(){this.disconnected=true;},start(time,offset){starts.push({source:this,time,offset});},stop(){this.onended?.();}};}};
 return{api:sandbox.GardenCampfire,context,starts,get requests(){return requests;},get decodes(){return decodes;},resolve:()=>resolveDownload(),reject:()=>rejectDownload(Error('offline')),advance:ms=>{at+=ms;}};
}
(async()=>{
 const h=harness(),sound=h.api.createSound(h.context,{});
 assert.equal(h.requests,0);sound.start();sound.start();assert.equal(h.requests,1);assert(sound.inspect().loading);
 sound.stop(true);h.resolve();await settle();assert.equal(h.starts.length,0,'OFF cancels an in-flight start');
 sound.start();await settle();assert.equal(h.requests,1);assert.equal(h.decodes,1);assert.equal(h.starts.length,1);
 const first=h.starts[0];assert.equal(first.source.loop,true);assert.equal(first.source.buffer.numberOfChannels,1);
 assert(first.offset>=first.source.loopStart&&first.offset<first.source.loopEnd);
 assert(Math.abs(first.source.loopEnd-first.source.loopStart-info.processing.seconds)<1e-8);
 sound.start();await settle();assert.equal(h.starts.length,1,'Repeated sync cannot duplicate playback');assert.equal(sound.inspect().timer,false);
 sound.stop();assert.equal(sound.inspect().sources,0);assert.equal(sound.inspect().running,false);
 sound.start();await settle();assert.equal(h.requests,1);assert.equal(h.decodes,1);assert.equal(h.starts.length,2);sound.stop(true);
 h.context.state='suspended';sound.start();await settle();assert.equal(h.starts.length,2);assert.equal(sound.inspect().running,false);
 h.context.state='running';sound.start();await settle();assert.equal(h.starts.length,3);sound.stop(true);
 const offline=harness(),failed=offline.api.createSound(offline.context,{});failed.start();offline.reject();await settle();
 assert.equal(failed.inspect().failed,true);failed.start();assert.equal(offline.requests,1,'Network failure has bounded retries');
 offline.advance(60001);failed.start();assert.equal(offline.requests,2);offline.resolve();await settle();assert.equal(failed.inspect().failed,false);failed.stop(true);
 console.log('PASS CC0 recording integrity, long cycle, bounded peaks/memory, lazy single fetch/decode, in-flight cancellation, duplicate start, native loop, shared mute cleanup, resume and retry backoff');
})().catch(error=>{console.error(error);process.exitCode=1;});
