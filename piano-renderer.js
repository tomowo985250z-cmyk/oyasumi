// Sampled acoustic piano. Pure rendering code shared by the worker and verification.
// No oscillators, pitch jitter, compression, or time stretching.
(function(root){
 'use strict';
 const rate=24000;
 function random(seed){return()=>{seed|=0;seed=seed+0x6d2b79f5|0;let n=Math.imul(seed^seed>>>15,1|seed);n^=n+Math.imul(n^n>>>7,61|n);return((n^n>>>14)>>>0)/4294967296;};}
 function performance(score,seed){
  const rng=random(seed),phrase=score.phraseSeconds,anchors=Array.from({length:Math.ceil(score.seconds/phrase)+2},()=>rng()*2-1);
  function warp(t){const p=t/phrase,i=Math.floor(p),f=p-i,s=f*f*(3-2*f),breath=.035*Math.sin(2*Math.PI*p)*(1+.2*anchors[i]),drift=.018*((1-s)*anchors[i]+s*anchors[i+1]);return t+(breath+drift)*Math.sin(Math.PI*Math.min(1,t/score.seconds));}
  const groups=new Map();for(const n of score.notes){if(!groups.has(n[0]))groups.set(n[0],[]);groups.get(n[0]).push(n);}
  const times=[...groups.keys()].sort((a,b)=>a-b),events=[];
  times.forEach((at,i)=>{const gap=Math.min(at-(times[i-1]??at-1),(times[i+1]??at+1)-at),spread=Math.min(.018,gap*.18),jitter=(rng()*2-1)*Math.min(.003,gap*.08),group=groups.get(at).sort((a,b)=>a[1]-b[1]);let harmony=0;
   for(const n of group){const [at,midi,duration,velocity,role]=n,arc=1+.04*Math.sin(Math.PI*at/phrase)**2,hand=role===0?0:Math.min(spread,.006+(role===2?harmony++*.004:0));
    events.push({at:Math.max(0,warp(at)+jitter+hand+(rng()*2-1)*Math.min(.001,gap*.025)),midi,duration:warp(at+duration)-warp(at),velocity:velocity*arc*(.975+.05*rng()),role,color:.97+.06*rng(),tail:.94+.12*rng()});
   }
  });
  events.sort((a,b)=>a.at-b.at||a.midi-b.midi);return events;
 }
 function measure(samples){
  const coefficients=(hz,q,gain)=>{const k=Math.tan(Math.PI*hz/rate),a0=1+k/q+k*k,a=[1,2*(k*k-1)/a0,(1-k/q+k*k)/a0];if(gain===null)return{b:[1,-2,1],a};const vh=10**(gain/20),vb=vh**.4996667741545416;return{b:[(vh+vb*k/q+k*k)/a0,2*(k*k-vh)/a0,(vh-vb*k/q+k*k)/a0],a};};
  const filters=[coefficients(1681.974450955533,.7071752369554196,3.999843853973347),coefficients(38.13547087602444,.5003270373238773,null)].map(c=>({...c,x1:0,x2:0,y1:0,y2:0})),hop=2400,block=9600,ring=new Float64Array(block),energies=[];let total=0,peak=0;
  for(let i=0;i<samples.length;i++){let x=samples[i];peak=Math.max(peak,Math.abs(x));for(const f of filters){const y=f.b[0]*x+f.b[1]*f.x1+f.b[2]*f.x2-f.a[1]*f.y1-f.a[2]*f.y2;f.x2=f.x1;f.x1=x;f.y2=f.y1;f.y1=y;x=y;}const power=x*x,index=i%block;total+=power-ring[index];ring[index]=power;if(i+1>=block&&(i+1-block)%hop===0)energies.push(Math.max(0,total/block));}
  const lufs=e=>-.691+10*Math.log10(Math.max(1e-30,e)),mean=a=>a.reduce((s,x)=>s+x,0)/Math.max(1,a.length),absolute=energies.filter(e=>lufs(e)>-70),threshold=lufs(mean(absolute))-10,gated=absolute.filter(e=>lufs(e)>threshold);
  return{lufs:lufs(mean(gated)),peak};
 }
 function filter(samples,hz,high){const k=Math.tan(Math.PI*hz/rate),q=Math.SQRT1_2,z=1/(1+k/q+k*k),b=high?[z,-2*z,z]:[k*k*z,2*k*k*z,k*k*z],a1=2*(k*k-1)*z,a2=(1-k/q+k*k)*z;let x1=0,x2=0,y1=0,y2=0;for(let i=0;i<samples.length;i++){const x=samples[i],y=b[0]*x+b[1]*x1+b[2]*x2-a1*y1-a2*y2;x2=x1;x1=x;y2=y1;y1=y;samples[i]=y;}}
 function render(score,samples,seed){
  const events=performance(score,seed),tones=new Map(),mix=new Float32Array(Math.round(score.seconds*rate));
  function tone(midi){if(tones.has(midi))return tones.get(midi);const root=samples.reduce((a,b)=>Math.abs(a.midi-midi)<=Math.abs(b.midi-midi)?a:b),a=root.pcm,step=2**((midi-root.midi)/12)*root.rate/rate,n=Math.min(rate*9,Math.floor((a.length-1)/step)),out=new Float32Array(n);let power=0;
   for(let j=0;j<n;j++){const at=j*step,i=Math.floor(at);out[j]=a[i]*(1-(at-i))+a[i+1]*(at-i);if(j<rate*.35)power+=out[j]**2;}
   const gain=.16/Math.sqrt(Math.max(1e-12,power/Math.min(n,rate*.35)));for(let j=0;j<n;j++)out[j]*=gain*(1-Math.exp(-((j/(rate*.006))**2)));tones.set(midi,out);return out;
  }
  const next=new Map();for(let i=events.length-1;i>=0;i--){const e=events[i];e.next=next.get(e.midi)??Infinity;next.set(e.midi,e.at);}
  for(const e of events){const a=tone(e.midi),start=Math.round(e.at*rate),hold=Math.min(e.duration+(e.role===0?.30:.16),e.role===1?2.8:4.5),release=Math.min(hold,Math.max(.04,e.next-e.at-.012)),tail=.20*e.tail,cutoff=(e.role===0?3100:3500)*e.color,alpha=1-Math.exp(-2*Math.PI*cutoff/rate);let low=0;
   const length=Math.min(a.length,mix.length-start,Math.ceil((release+tail*11.6)*rate));for(let j=0;j<length;j++){const t=j/rate,damper=t<release?1:Math.exp(-(t-release)/tail);low+=alpha*(a[j]-low);mix[start+j]+=low*e.velocity*damper;}
  }
  // Quiet diffuse reflections; use the original samples for each tap (no feedback).
  const taps=[[552,.045],[1224,.026],[1992,.012]];for(let j=mix.length-1;j>=0;j--)for(const [delay,weight]of taps)if(j>=delay)mix[j]+=mix[j-delay]*weight;
  filter(mix,55,true);filter(mix,3400,false);
  for(let j=0;j<mix.length;j++)mix[j]*=Math.min(1,j/(rate*.025))*Math.min(1,(mix.length-1-j)/(rate*1.8));
  // Static gain for each complete take: preserve phrasing and prevent inter-song jumps.
  const raw=measure(mix),gain=Math.min(10**((-26-raw.lufs)/20),.70/Math.max(raw.peak,1e-12));for(let j=0;j<mix.length;j++)mix[j]*=gain;
  return{pcm:mix,rate,lufs:raw.lufs+20*Math.log10(gain),peak:raw.peak*gain,seed};
 }
 root.PianoRender={performance,render,measure,filter,rate};
 if(typeof module!=='undefined')module.exports=root.PianoRender;
 if(typeof WorkerGlobalScope!=='undefined'&&root instanceof WorkerGlobalScope){let samples;root.onmessage=({data})=>{if(data.samples){samples=data.samples;root.postMessage({ready:true});return;}try{const result=render(data.score,samples,data.seed);root.postMessage({id:data.id,...result},[result.pcm.buffer]);}catch(e){root.postMessage({id:data.id,error:e.message});}};}
})(globalThis);
