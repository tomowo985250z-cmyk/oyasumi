// Home-only rooftop composition. Four stable night patterns give each slot
// a reclining pose once in four nights, without changing the selected coat.
globalThis.RoofRecline=(()=>{
 const assets = {"black":{"version":"2a79f44d009ae901","reclining":[1536,1024,0.9873046875],"seated":[1024,1536,0.9752604166666666]},"black-footed":{"version":"e89bb3ca32fa2646","reclining":[1536,1024,0.986328125],"seated":[1024,1536,0.9733072916666666]},"brown":{"version":"d096c6a4f094ac67","reclining":[1536,1024,0.990234375],"seated":[1024,1536,0.9830729166666666]},"calico":{"version":"321e856cab3e252f","reclining":[1536,1024,0.9873046875],"seated":[1024,1536,0.966796875]},"cheetah":{"version":"65fd573380ee8f53","reclining":[1536,1024,0.986328125],"seated":[1024,1536,0.970703125]},"fishing":{"version":"4777dd312ee24c1d","reclining":[1536,1024,0.9892578125],"seated":[1024,1536,0.966796875]},"gray":{"version":"5e427168559423d6","reclining":[1536,1024,0.9921875],"seated":[1024,1536,0.9778645833333334]},"jaguar":{"version":"915f14e99728b9bb","reclining":[1536,1024,0.9873046875],"seated":[1024,1536,0.9791666666666666]},"leopard":{"version":"668808d912fee919","reclining":[1536,1024,0.9873046875],"seated":[1024,1536,0.9765625]},"manul":{"version":"ca9c669d3caab34e","reclining":[1536,1024,0.9892578125],"seated":[1024,1536,0.97265625]},"orange":{"version":"00f8fc9ea51d2439","reclining":[1536,1024,0.98828125],"seated":[1024,1536,0.9654947916666666]},"sand":{"version":"746109cc4193715f","reclining":[1536,1024,0.990234375],"seated":[1024,1536,0.98828125]},"silver":{"version":"5e90bce5ec2bd356","reclining":[1536,1024,0.984375],"seated":[1024,1536,0.974609375]},"snow-leopard":{"version":"b0aadf2daca20fb6","reclining":[1536,1024,0.986328125],"seated":[1024,1536,0.9720052083333334]},"tuxedo":{"version":"def2783aa67036c5","reclining":[1536,1024,0.98828125],"seated":[1024,1536,0.9778645833333334]},"white":{"version":"4657799f6ecfdace","reclining":[1536,1024,0.9921875],"seated":[1024,1536,0.9830729166666666]}};
 const ridge=x=>{const t=(-208+Math.sqrt(208*208+64*(x+8)))/32;return 75+2*t+6*t*t;};
 function plan(coats,count,night){
  count=Math.max(0,Math.min(3,Math.trunc(count)||0));
  const day=Math.floor(Date.parse(night+'T06:00:00+09:00')/86400000),phase=((day%4)+4)%4;
  const cats=Array.from({length:count},(_,i)=>{const coat=CatFaces.normalizeCoat(coats[i]),reclining=(phase+i)%4===0;return {coat,reclining,width:reclining?(count===3?70:78):68*.765};});
  const gap=count===3?2:6,span=cats.reduce((sum,cat)=>sum+cat.width,0)+gap*Math.max(0,count-1);
  let left=Math.min(count===3?102:104,182-span/2)-span/2;
  for(const cat of cats){
   const asset=assets[cat.coat],geometry=cat.reclining?asset.reclining:asset.seated;
   cat.height=cat.width*geometry[1]/geometry[0];cat.left=left;
   // Keep the extended forepaws on the far side of the plane, with rump/torso nearer.
   cat.contact=ridge(left+cat.width/2)+(cat.reclining?18:12);
   cat.top=cat.contact-cat.height*geometry[2];left+=cat.width+gap;
  }
  return cats;
 }
 function group(coats,count,night){
  return plan(coats,count,night).map(cat=>{
   const style=`--roof-cat-x:${cat.left}px;--roof-cat-y:${cat.top}px;--roof-cat-width:${cat.width}px;--roof-cat-height:${cat.height}px`;
   if(!cat.reclining)return RoofCats.svg(cat.coat).replace('>',` style="${style}">`);
   return `<img class="roof-cat" src="assets/roof-recline-v1/${cat.coat}.png?v=${assets[cat.coat].version}" alt="" aria-hidden="true" data-asset-key="recline/${cat.coat}" data-cat-coat="${cat.coat}" data-cat-pose="rear-reclining" style="${style}">`;
  }).join('');
 }
 return Object.freeze({plan,group,ridge});
})();
if(typeof module!=='undefined')module.exports=RoofRecline;
