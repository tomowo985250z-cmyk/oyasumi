// BS.1770 K weighting and gated mono integrated energy. Original JS implementation.
// Coefficient equations cross-checked against libebur128; 400ms blocks,75% overlap,
// -70LUFS absolute / -10LU relative gates as documented by ITU/EBU.
function meter(samples,rate=24000){
 const coefficients=(hz,q,gain)=>{const k=Math.tan(Math.PI*hz/rate),a0=1+k/q+k*k,a=[1,2*(k*k-1)/a0,(1-k/q+k*k)/a0];if(gain===null)return{b:[1,-2,1],a};const vh=10**(gain/20),vb=vh**.4996667741545416;return{b:[(vh+vb*k/q+k*k)/a0,2*(k*k-vh)/a0,(vh-vb*k/q+k*k)/a0],a};};
 const filters=[coefficients(1681.974450955533,.7071752369554196,3.999843853973347),coefficients(38.13547087602444,.5003270373238773,null)].map(c=>({...c,x1:0,x2:0,y1:0,y2:0})),hop=Math.round(rate*.1),block=Math.round(rate*.4),ring=new Float64Array(block),energies=[];let total=0,rawSum=0,peak=0;
 for(let i=0;i<samples.length;i++){let x=samples[i];rawSum+=x*x;peak=Math.max(peak,Math.abs(x));for(const f of filters){const y=f.b[0]*x+f.b[1]*f.x1+f.b[2]*f.x2-f.a[1]*f.y1-f.a[2]*f.y2;f.x2=f.x1;f.x1=x;f.y2=f.y1;f.y1=y;x=y;}const power=x*x,index=i%block;total+=power-ring[index];ring[index]=power;if(i+1>=block&&(i+1-block)%hop===0)energies.push(Math.max(0,total/block));}
 const lufs=e=>-.691+10*Math.log10(Math.max(1e-30,e)),mean=a=>a.reduce((s,x)=>s+x,0)/Math.max(1,a.length),absolute=energies.filter(e=>lufs(e)>-70),threshold=lufs(mean(absolute))-10,gated=absolute.filter(e=>lufs(e)>threshold),loudness=lufs(mean(gated));
 return{lufs:loudness,rmsDb:10*Math.log10(rawSum/samples.length),peakDb:20*Math.log10(peak),peak,blockCount:energies.length,gatedBlocks:gated.length,relativeGateLufs:threshold,rate};
}
function wav(file){const b=require('node:fs').readFileSync(file),rate=b.readUInt32LE(24);if(b.toString('ascii',36,40)!=='data'||b.readUInt16LE(34)!==16)throw Error('Expected simple16bit mono WAV');const samples=Float64Array.from({length:(b.length-44)/2},(_,i)=>b.readInt16LE(44+2*i)/32768);return{samples,rate};}
module.exports={meter,wav};
