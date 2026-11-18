// Decode the licensed sample bank once. Render new takes off the UI thread;
// the roof player retains its existing volume, fades, pause position and scene gates.
globalThis.PianoPlayer=(()=>{
 'use strict';
 let bank,worker,ready,serial=0;const pending=new Map(),scores=new Map();
 const base=new URL('.',document.currentScript.src);
 const asset=file=>new URL(file,base);
 async function json(file){const r=await fetch(asset(file));if(!r.ok)throw Error('Piano data unavailable');return r.json();}
 async function init(context){
  if(ready)return ready;
  ready=(async()=>{try{
   bank=await json('assets/piano-v1/catalog.json');
   const samples=[];
   // Sequential decoding bounds temporary memory on phones.
   for(const row of bank.samples){const response=await fetch(asset(row.url));if(!response.ok)throw Error('Piano sample unavailable');const a=await context.decodeAudioData(await response.arrayBuffer()),start=Math.round((row.trimStart||0)*a.sampleRate),length=Math.min(a.length-start,a.sampleRate*10),pcm=new Float32Array(length);for(let c=0;c<a.numberOfChannels;c++){const channel=a.getChannelData(c);for(let i=0;i<length;i++)pcm[i]+=channel[start+i]/a.numberOfChannels;}samples.push({midi:row.midi,rate:a.sampleRate,pcm});}
   worker=new Worker(asset('piano-renderer.js?v='+bank.rendererVersion));
   await new Promise((resolve,reject)=>{worker.onmessage=({data})=>{if(data.ready)return resolve();const entry=pending.get(data.id);if(!entry)return;pending.delete(data.id);data.error?entry.reject(Error(data.error)):entry.resolve(data);};worker.onerror=()=>{reject(Error('Piano renderer unavailable'));for(const entry of pending.values())entry.reject(Error('Piano renderer failed'));pending.clear();worker.terminate();worker=null;ready=null;};worker.postMessage({samples},samples.map(s=>s.pcm.buffer));});
  }catch(e){ready=null;throw e;}})();return ready;
 }
 async function render(context,track,signal){
  const aborted=()=>{if(signal?.aborted)throw new DOMException('Aborted','AbortError');};aborted();await init(context);aborted();
  if(!scores.has(track.id))scores.set(track.id,json(track.url).catch(e=>{scores.delete(track.id);throw e;}));const score=await scores.get(track.id);aborted();
  const seed=crypto.getRandomValues(new Uint32Array(1))[0],id=++serial;
  const result=await new Promise((resolve,reject)=>{const cancel=()=>{pending.delete(id);reject(new DOMException('Aborted','AbortError'));};signal?.addEventListener('abort',cancel,{once:true});pending.set(id,{resolve:r=>{signal?.removeEventListener('abort',cancel);resolve(r);},reject:e=>{signal?.removeEventListener('abort',cancel);reject(e);}});worker.postMessage({id,score,seed});});aborted();
  const buffer=context.createBuffer(1,result.pcm.length,result.rate);buffer.copyToChannel(result.pcm,0);return buffer;
 }
 return{render};
})();
