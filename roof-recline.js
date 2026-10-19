// Home-only rooftop composition. Four stable night patterns give each slot
// a reclining pose once in four nights, without changing the selected coat.
globalThis.RoofRecline=(()=>{
 const assets = {"black":{"version":"2a79f44d009ae901","reclining":[1536,1024,0.9873046875],"seated":[1024,1536,0.9752604166666666]},"black-footed":{"version":"e89bb3ca32fa2646","reclining":[1536,1024,0.986328125],"seated":[1024,1536,0.9733072916666666]},"brown":{"version":"d096c6a4f094ac67","reclining":[1536,1024,0.990234375],"seated":[1024,1536,0.9830729166666666]},"calico":{"version":"321e856cab3e252f","reclining":[1536,1024,0.9873046875],"seated":[1024,1536,0.966796875]},"cheetah":{"version":"65fd573380ee8f53","reclining":[1536,1024,0.986328125],"seated":[1024,1536,0.970703125]},"fishing":{"version":"4777dd312ee24c1d","reclining":[1536,1024,0.9892578125],"seated":[1024,1536,0.966796875]},"gray":{"version":"5e427168559423d6","reclining":[1536,1024,0.9921875],"seated":[1024,1536,0.9778645833333334]},"jaguar":{"version":"915f14e99728b9bb","reclining":[1536,1024,0.9873046875],"seated":[1024,1536,0.9791666666666666]},"leopard":{"version":"668808d912fee919","reclining":[1536,1024,0.9873046875],"seated":[1024,1536,0.9765625]},"manul":{"version":"ca9c669d3caab34e","reclining":[1536,1024,0.9892578125],"seated":[1024,1536,0.97265625]},"orange":{"version":"00f8fc9ea51d2439","reclining":[1536,1024,0.98828125],"seated":[1024,1536,0.9654947916666666]},"sand":{"version":"746109cc4193715f","reclining":[1536,1024,0.990234375],"seated":[1024,1536,0.98828125]},"silver":{"version":"5e90bce5ec2bd356","reclining":[1536,1024,0.984375],"seated":[1024,1536,0.974609375]},"snow-leopard":{"version":"b0aadf2daca20fb6","reclining":[1536,1024,0.986328125],"seated":[1024,1536,0.9720052083333334]},"tuxedo":{"version":"def2783aa67036c5","reclining":[1536,1024,0.98828125],"seated":[1024,1536,0.9778645833333334]},"white":{"version":"4657799f6ecfdace","reclining":[1536,1024,0.9921875],"seated":[1024,1536,0.9830729166666666]}};
 const ridge=x=>{const t=(-208+Math.sqrt(208*208+64*(x+8)))/32;return 75+2*t+6*t*t;};
 // Continue the original quadratic and individual tile courses; never scale
 // the roof or its cats horizontally to fit a wider card.
 function surface(){
  const left=-256,right=464;
  const curve=(origin,linear)=>{
   const t=x=>(-linear+Math.sqrt(linear*linear+64*(x-origin)))/32;
   const a=t(left),b=t(right),y=t=>75+2*t+6*t*t;
   return `M${left} ${y(a)}Q${left+(b-a)*(linear/2+16*a)} ${y(a)+(b-a)*(1+6*a)} ${right} ${y(b)}`;
  };
  const rows=[[2,86],[-12,99]].map(([x,y])=>Array.from({length:23},(_,n)=>{const i=n-9;return `M${x+34*i} ${y+i}q17 4 34 1`;}).join('')).join('');
  const joints=Array.from({length:23},(_,n)=>{const i=n-9;return `M${36+34*i} ${87+i}l-4 10`;}).join('');
  return `<g transform="translate(0 40)"><path data-roof-surface="" d="${curve(-14,220)}L${right} 114H${left}Z" fill="url(#awake-roof-wash)"/><path d="${curve(-8,208)}" fill="none" stroke="#586982" stroke-width="1.2" stroke-linecap="round" opacity=".5"/><g fill="none" stroke="#465772" stroke-width=".8" stroke-linecap="round" opacity=".38"><path d="${rows}"/><path d="${joints}"/></g>${SceneryMaterials.roof(curve(-14,220)+`L${right} 114H${left}Z`)}</g>`;
 }
 const gapMinimum=6,edgeCrop=8,layouts=new WeakMap();
 const coatGroups=['basic','wild','big'].map(id=>CatFaces.groups.find(group=>group.id===id).coats.map(coat=>coat.id));
 function plan(coats,count,night,width){
  count=Math.max(0,Math.min(Object.keys(assets).length,Math.trunc(count)||0));
  const day=Math.floor(Date.parse(night+'T06:00:00+09:00')/86400000),phase=((day%4)+4)%4;
  // Decorative coats/poses are stable for the solar night, independent of posts.
  // Keep each pose at its existing 90% size, even when the row fills up.
  // Reuse the seeded FNV/xorshift pattern used by the existing cat schedules.
  let seed=2166136261;for(const c of 'roof-coats-v1:'+night)seed=Math.imul(seed^c.charCodeAt(0),16777619);seed=seed||1;
  const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296;},used=new Set();
  const cats=Array.from({length:count},(_,i)=>{
   // Choose the category first so duplicate avoidance never changes its odds.
   const roll=random(),pool=coatGroups[roll<.85?0:roll<.97?1:2],fresh=pool.filter(coat=>!used.has(coat)),choices=fresh.length?fresh:pool;
   const coat=CatFaces.normalizeCoat(coats[i]||choices[Math.floor(random()*choices.length)]),reclining=(phase+i)%4===0;used.add(coat);
   return {coat,reclining,width:.9*(reclining?78:68*.765)};
  });
  const bodyWidth=cats.reduce((sum,cat)=>sum+cat.width,0),gap=Number.isFinite(width)&&count>1?Math.max(gapMinimum,(width+2*edgeCrop-bodyWidth)/(count-1)):gapMinimum;
  const span=bodyWidth+gap*Math.max(0,count-1);let left=104-span/2;
  for(const cat of cats){
   const asset=assets[cat.coat],geometry=cat.reclining?asset.reclining:asset.seated;
   cat.height=cat.width*geometry[1]/geometry[0];cat.left=left;
   // Keep the extended forepaws on the far side of the plane, with rump/torso nearer.
   cat.contact=ridge(left+cat.width/2)+(cat.reclining?18:12);
   cat.top=cat.contact-cat.height*geometry[2];left+=cat.width+gap;
  }
  [...cats].sort((a,b)=>Math.abs(a.left+a.width/2-104)-Math.abs(b.left+b.width/2-104)).forEach((cat,rank)=>{cat.rank=rank;});
  return cats;
 }
 function capacity(width,night){
  let count=1;
  for(let n=2;n<=Object.keys(assets).length;n++){
   const cats=plan([],n,night),span=cats.at(-1).left+cats.at(-1).width-cats[0].left;
   if(span>width+2*edgeCrop)break;count=n;
  }
  return count;
 }
 function presence(at,rank,count=3){
  const n=SolarModel.nightSpan(at),minute=60000,midnight=(n.dusk+n.dawn)/2;
  const arrival=rank<2?n.start+rank*.4*(n.dusk-n.start):n.dusk+(midnight-n.dusk)*(rank-1)/Math.max(1,count-2);
  const departure=rank===0?n.dawn:rank===1?n.dawn-20*minute:n.dawn-20*minute-70*minute*(rank-1)/Math.max(1,count-2);
  const fade=rank===0?Math.min(10*minute,(n.end-n.dawn)*.75):10*minute;
  return n.visible?Math.min(SolarModel.smooth(arrival,arrival+fade,at),1-SolarModel.smooth(departure,departure+fade,at)):0;
 }
 function update(element,at){
  if(!element)return;
  if(document.documentElement.hasAttribute('data-cat-state-pending'))return;
  const scene=element.closest('.awake-scene'),card=element.closest('.roof-sky-card');if(!scene||!card)return;
  const scale=scene.getBoundingClientRect().width/208;if(!scale)return;
  const width=card.clientWidth/scale,n=SolarModel.nightSpan(at),night=new Date(n.start+9*3600000).toISOString().slice(0,10),key=night+':'+width.toFixed(2);
  if(layouts.get(element)!==key){
   const count=capacity(width,night);element.innerHTML=group([],count,night,at,width);element.dataset.catCount=String(count);layouts.set(element,key);
  }
  for(const cat of element.children){
   const rank=Number(cat.dataset.roofRank),count=element.children.length;cat.style.opacity=presence(at,rank,count);
   // The existing clock tick warms only cats arriving within two minutes.
   if(cat.dataset.roofSrc&&(presence(at,rank,count)>0||presence(at+120000,rank,count)>0)){cat.src=cat.dataset.roofSrc;delete cat.dataset.roofSrc;globalThis.CatImages?.warm(element);}
  }
 }
 function group(coats,count,night,at=NightClock.now(),width){
  return plan(coats,count,night,width).map(cat=>{
   const style=`--roof-cat-x:${cat.left}px;--roof-cat-y:${cat.top}px;--roof-cat-width:${cat.width}px;--roof-cat-height:${cat.height}px;opacity:${presence(at,cat.rank,count)}`;
   let html=!cat.reclining?RoofCats.svg(cat.coat).replace('>',` data-roof-rank="${cat.rank}" style="${style}">`):`<img class="roof-cat" src="assets/roof-recline-v1/${cat.coat}.png?v=${assets[cat.coat].version}" alt="" aria-hidden="true" data-asset-key="recline/${cat.coat}" data-cat-coat="${cat.coat}" data-cat-pose="rear-reclining" data-roof-rank="${cat.rank}" style="${style}">`;
   html=html.replace('<img ','<img loading="eager" decoding="async" fetchpriority="low" ');
   return presence(at,cat.rank,count)>0||presence(at+120000,cat.rank,count)>0?html:html.replace(' src="',' data-roof-src="');
  }).join('');
 }
 return Object.freeze({plan,group,ridge,presence,update,surface,capacity});
})();
if(typeof module!=='undefined')module.exports=RoofRecline;
