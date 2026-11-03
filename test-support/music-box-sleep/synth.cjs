const crypto=require('node:crypto'),config=require('./mastering-config.json'),{meter}=require('./loudness.cjs'),sr=24000,tau=2*Math.PI,cache=new Map(),p=config.instrument;
const variation=seed=>{let x=(seed+1)*2654435761>>>0;x^=x>>>16;x=Math.imul(x,2246822507);x^=x>>>13;return(x>>>0)/4294967295*2-1;};
function tine(midi){
 if(cache.has(midi))return cache.get(midi);
 const f=440*2**((midi-69)/12),v=variation(midi),decay=Math.min(p.decayMaxSeconds,p.decayBaseSeconds*2**((72-midi)/43))*(1+.012*v),body=Math.max(.44,Math.min(1,(f/220)**.65)),high=1/Math.sqrt(1+(f/2800)**4),lowWeight=Math.max(0,Math.min(1,(280-f)/142)),support=lowWeight**2*(3-2*lowWeight),n=Math.round(p.tailSeconds*sr),out=new Float64Array(n);
 const modes=p.modes.filter(([h])=>f*h<9500);for(let j=0;j<n;j++){const t=j/sr,attack=1-Math.exp(-((t/(p.attackMs/1000))**2)),end=Math.min(1,(p.tailSeconds-t)/.10);let value=0;
  for(const [h,weight,d]of modes){const envelope=h===1?p.fastWeight*Math.exp(-t/(decay*p.fastDecayScale))+p.slowWeight*Math.exp(-t/(decay*p.slowDecayScale)):Math.exp(-t/(decay*d));value+=weight*(h===1?1:1+.015*v)*Math.sin(tau*f*h*t)*envelope/Math.sqrt(1+(f*h/4300)**8);}
  value+=support*(p.lowHarmonicSupport[0]*Math.sin(tau*f*2*t)*Math.exp(-t/(decay*.72))+p.lowHarmonicSupport[1]*Math.sin(tau*f*3*t)*Math.exp(-t/(decay*.52)));
  out[j]=value*attack*end*body*high;
 }
 cache.set(midi,out);return out;
}
function biquad(samples,hz,q,type){const k=Math.tan(Math.PI*hz/sr),norm=1/(1+k/q+k*k),b=type==='lowpass'?[k*k*norm,2*k*k*norm,k*k*norm]:[norm,-2*norm,norm],a1=2*(k*k-1)*norm,a2=(1-k/q+k*k)*norm;let x1=0,x2=0,y1=0,y2=0;const filter=x=>{const y=b[0]*x+b[1]*x1+b[2]*x2-a1*y1-a2*y2;x2=x1;x1=x;y2=y1;y1=y;return y;};for(let i=Math.max(0,samples.length-sr);i<samples.length;i++)filter(samples[i]);for(let i=0;i<samples.length;i++)samples[i]=filter(samples[i]);}
module.exports=function synth(score,{id,sourceSeconds,timeScale,targetLufs}){
 const n=Math.round(sourceSeconds*timeScale*sr),samples=new Float64Array(n),originalHash=crypto.createHash('sha256').update(JSON.stringify(score.events)).digest('hex');
 score.events.forEach((e,index)=>{const wave=tine(e.midi),start=Math.round(e.at*timeScale*sr),velocity=e.velocity*(1+.008*variation(index+1000));for(let j=0;j<wave.length;j++)samples[(start+j)%n]+=wave[j]*velocity;});
 const dry=Float64Array.from(samples);for(const [seconds,weight]of p.earlyReflections){const delay=Math.round(seconds*sr);for(let i=0;i<n;i++)samples[i]+=dry[(i-delay+n)%n]*weight;}
 for(const [hz,q,amount]of p.woodBody){const w=tau*hz/sr,alpha=Math.sin(w)/(2*q),norm=1/(1+alpha),b0=alpha*norm,a1=-2*Math.cos(w)*norm,a2=(1-alpha)*norm;let x1=0,x2=0,y1=0,y2=0;const filter=x=>{const y=b0*x-b0*x2-a1*y1-a2*y2;x2=x1;x1=x;y2=y1;y1=y;return y;};for(let i=n-sr;i<n;i++)filter(dry[i]);for(let i=0;i<n;i++)samples[i]+=amount*filter(dry[i]);}
 biquad(samples,p.highpassHz,Math.SQRT1_2,'highpass');biquad(samples,p.lowpassHz,Math.SQRT1_2,'lowpass');
 const before=meter(samples,sr),gain=10**((targetLufs-before.lufs)/20),out=Buffer.alloc(44+n*2);if(before.peak*gain>=.8)throw Error('Unexpected peak '+id);out.write('RIFF');out.writeUInt32LE(out.length-8,4);out.write('WAVEfmt ',8);out.writeUInt32LE(16,16);out.writeUInt16LE(1,20);out.writeUInt16LE(1,22);out.writeUInt32LE(sr,24);out.writeUInt32LE(sr*2,28);out.writeUInt16LE(2,32);out.writeUInt16LE(16,34);out.write('data',36);out.writeUInt32LE(n*2,40);for(let i=0;i<n;i++)out.writeInt16LE(Math.round(samples[i]*gain*32767),44+2*i);
 return{out,meta:{id,rate:sr,seconds:n/sr,notes:score.events.length,sourceSeconds,timeScale,targetLufs,measuredFloatLufs:before.lufs+20*Math.log10(gain),rmsDb:before.rmsDb+20*Math.log10(gain),peakDb:before.peakDb+20*Math.log10(gain),seamStep:Math.abs(samples[0]-samples[n-1])*gain,sourceEventHash:originalHash,sourcePitchesAndRelativeTimingPreserved:true,sha256:crypto.createHash('sha256').update(out).digest('hex')}};
};
module.exports.tine=tine;
