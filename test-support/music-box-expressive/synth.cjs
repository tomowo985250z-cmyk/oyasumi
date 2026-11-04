// Offline analytic plucked-tine instrument. Each composition supplies its own voice.
const crypto=require('node:crypto'),{meter}=require('./loudness.cjs'),rate=24000,tau=2*Math.PI;
const variation=seed=>{let x=(seed+1)*2654435761>>>0;x^=x>>>16;x=Math.imul(x,2246822507);x^=x>>>13;return(x>>>0)/4294967295*2-1;};
function tine(midi,p){
 // Fade the optional low-tine treatment out at E4; upper tines remain identical.
 const x=Math.max(0,Math.min(1,(64-midi)/16)),low=(p.bassClarity||0)*x*x*(3-2*x);
 const v=variation(midi),f=440*2**((midi-69)/12)*2**(v*p.tineCents/1200),decay=p.decay*2**((72-midi)/p.decaySpan)*(1+.018*v)*(1-low),tail=decay*9,n=Math.ceil(tail*rate),out=new Float64Array(n),weights=[1,...p.metal],decays=[1,.39,.19,.085],phases=[0,.12,.25,.4],slow=p.slowWeight*(1-low);
 const modes=p.modes.map((ratio,i)=>({hz:f*ratio,weight:weights[i]*(i?1+.04*v:1)*(i?1-low*.6:1+low*.35),d:decay*decays[i],phase:phases[i],fund:i===0}));
 // A weak neighbouring tine/body mode gives slow natural beating, not a harmony correction.
 modes.push({hz:f*2**((p.tineCents*.7)/1200),weight:p.pairedTineWeight*(1-low),d:decay*.8,phase:0,fund:false});
 for(const m of modes){if(m.hz>=rate/2)continue;const spectral=1/Math.sqrt(1+(m.hz/p.lidHz)**6),step=tau*m.hz/rate,fast=Math.exp(-1/(rate*m.d*.88)),late=Math.exp(-1/(rate*m.d*1.6)),other=Math.exp(-1/(rate*m.d)),driftHz=.31+.025*v,driftPhase=tau*driftHz;
  let a=1,b=1;for(let j=0;j<n;j++){const t=j/rate,phase=step*j+m.phase+(m.hz*(2**(p.driftCents/1200)-1)/driftHz)*(1-Math.cos(driftPhase*t)),envelope=m.fund?(1-slow)*a+slow*b:a;out[j]+=m.weight*spectral*Math.sin(phase)*envelope;a*=m.fund?fast:other;b*=late;}
 }
 for(let j=0;j<n;j++){const t=j/rate,attack=1-Math.exp(-((t/(p.attackMs/1000))**2)),end=Math.min(1,(tail-t)/.12);out[j]*=attack*end;}
 return out;
}
function body(samples,p){
 const n=samples.length,dry=Float64Array.from(samples);
 for(const [seconds,weight]of [[.013,p.reflection],[.037,p.reflection*.62],[.081,p.reflection*.28]]){const delay=Math.round(seconds*rate);for(let i=0;i<n;i++)samples[i]+=dry[(i-delay+n)%n]*weight;}
 for(const [index,hz]of p.wood.entries()){const q=1.4+index*.2,w=tau*hz/rate,alpha=Math.sin(w)/(2*q),norm=1/(1+alpha),b0=alpha*norm,a1=-2*Math.cos(w)*norm,a2=(1-alpha)*norm;let x1=0,x2=0,y1=0,y2=0;const filter=x=>{const y=b0*x-b0*x2-a1*y1-a2*y2;x2=x1;x1=x;y2=y1;y1=y;return y;};for(let i=Math.max(0,n-rate);i<n;i++)filter(dry[i]);for(let i=0;i<n;i++)samples[i]+=p.woodAmount/(index+1)*filter(dry[i]);}
}
function synth(score,p){
 const n=Math.round(score.sourceSeconds*p.nativeTimeScale*rate),samples=new Float64Array(n),cache=new Map();
 score.events.forEach((e,index)=>{if(!cache.has(e.midi))cache.set(e.midi,tine(e.midi,p));const wave=cache.get(e.midi),start=Math.round(e.at*p.nativeTimeScale*rate),register=p.bassWeight+(1-p.bassWeight)/(1+Math.exp(-(e.midi-59)/7)),velocity=e.velocity**p.dynamicExponent*register*(1+.017*variation(index+1000));for(let j=0;j<wave.length;j++)samples[(start+j)%n]+=wave[j]*velocity;});
 body(samples,p);const before=meter(samples,rate),artisticGain=10**((p.nominalLufs-before.lufs)/20),gain=Math.min(artisticGain,.89/before.peak),out=Buffer.alloc(44+n*2);if(!Number.isFinite(gain)||gain<=0)throw Error('Invalid gain');
 out.write('RIFF');out.writeUInt32LE(out.length-8,4);out.write('WAVEfmt ',8);out.writeUInt32LE(16,16);out.writeUInt16LE(1,20);out.writeUInt16LE(1,22);out.writeUInt32LE(rate,24);out.writeUInt32LE(rate*2,28);out.writeUInt16LE(2,32);out.writeUInt16LE(16,34);out.write('data',36);out.writeUInt32LE(n*2,40);
 for(let i=0;i<n;i++){const value=samples[i]*gain;if(!Number.isFinite(value)||Math.abs(value)>=1)throw Error('Non-finite/clipped PCM');out.writeInt16LE(Math.round(value*32767),44+i*2);}
 return{out,meta:{id:score.id,rate,seconds:n/rate,notes:score.events.length,sourceEventHash:score.sourceEventHash,performanceEventHash:score.performanceEventHash,nativeTimeScale:p.nativeTimeScale,removedTempoScale:score.removedTempoScale,timeScale:p.nativeTimeScale/score.removedTempoScale,nominalLufs:p.nominalLufs,measuredFloatLufs:before.lufs+20*Math.log10(gain),rmsDb:before.rmsDb+20*Math.log10(gain),peakDb:before.peakDb+20*Math.log10(gain),technicalPeakProtectionApplied:gain<artisticGain,seamStep:Math.abs(samples[0]-samples[n-1])*gain,sha256:crypto.createHash('sha256').update(out).digest('hex')}};
}
module.exports=synth;module.exports.tine=tine;
