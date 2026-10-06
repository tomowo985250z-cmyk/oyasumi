// Dedicated rear-view artwork. Existing profile, daytime and sleep cats are unchanged.
globalThis.RoofCats = (() => {
 const palettes={calico:['#fff6e8','#dd963d'],orange:['#e9ad68','#a66934'],brown:['#9a8060','#514536'],silver:['#b9bbbf','#6d747e'],black:['#383d48','#383d48'],white:['#f2eee6','#f2eee6'],tuxedo:['#343944','#f2eee6'],gray:['#969ba6','#969ba6'],manul:['#aca595','#70695e'],sand:['#dfc599','#a78d64'],'black-footed':['#c8ae83','#60513d'],fishing:['#a5a69a','#555e55'],unknown:['#7d899e','#7d899e']};
 const templates=['storybook-upright','storybook-relaxed','storybook-rounded'];
 const versions=['afdac2a62e721459','e30e2af13cad743e','c187710ce839af2d'];
 function coatPainting(coat,mark) {
  // Filled, tapered markings follow the spine/flanks rather than crossing the
  // whole silhouette as uniform lines. The existing template supplies fur texture.
  const spine=`<path d="M48 25q-4 13-1 24l-3 16 3 18q6-8 5-20l3-15q-4-14-3-23Z" fill="${mark}" opacity=".45"/>`;
  const flanks=`<g fill="${mark}" opacity=".62"><path d="M20 47q14 0 20 8-13-4-23-2Zm-2 13q17-1 23 7-15-4-26-1Zm0 15q15-1 21 6-10-2-23 2ZM76 45q-12 2-16 10 12-6 20-5Zm6 14q-13 0-21 9 12-5 23-3Zm0 15q-12-2-19 7 13-4 22-1Z"/></g>`;
  const tail=`<g fill="${mark}" opacity=".65"><path d="m77 87 6-3q-1 7 3 11l-5 1q-4-5-4-9Zm11-5 4-2q2 7 6 10l-5 3q-5-5-5-11Z"/></g>`;
  if(coat==='calico')return '<g><path d="M20 8q23-6 27 14-12 2-10 13-18 5-26-3Z" fill="#d99646"/><path d="M54 13q28-9 34 18-17 11-30 4 8-12-4-22Z" fill="#45434a"/><path d="M19 48q21-10 26 8-7 13-2 24-17 15-31-1Z" fill="#d99646"/><path d="M63 51q24-2 27 17-7 12-19 8-19-7-8-25Z" fill="#45434a"/><path d="M62 87q17-8 24 2l11 12H67Z" fill="#d99646"/></g>';
  if(coat==='tuxedo')return '<path d="M8 73q17 0 20 19l-7 8H5Zm79-4q-13 9-14 23l10 8h18V75Zm6 15q-4 9-1 16h12V80Z" fill="#f2eee6"/>';
  if(['orange','brown','silver'].includes(coat))return spine+flanks+tail+`<g fill="${mark}" opacity=".45"><path d="M27 15q10 5 13 16-8-6-16-8Zm45 0q-12 7-13 17 8-6 15-10Z"/></g>`;
  if(coat==='sand')return `<g fill="${mark}" opacity=".33"><path d="M23 10q7-2 10 8l-9 1Zm43 1q7-3 10 7l-9 2ZM18 78q11-1 15 4l-17 3Zm55-2q10-1 15 3l-12 5Z"/></g>`+tail;
  if(coat==='manul')return `<g fill="${mark}" opacity=".2">${Array.from({length:24},(_,i)=>{const x=27+(i*17%47),y=34+(i*11%48);return `<path d="m${x} ${y} 2-2 1 5-2 2Z"/>`;}).join('')}</g>`+`<g opacity=".55">${tail}</g>`;
  if(['black-footed','fishing'].includes(coat)){
   const spots=[[30,34,3,4],[57,35,2,5],[69,43,3,3],[35,49,3,4],[52,53,2,4],[24,61,3,4],[70,61,3,4],[42,68,3,3],[58,76,3,4],[27,79,3,3],[77,82,3,3]];
   return `<g fill="${mark}" opacity=".72">${spots.map(([x,y,w,h])=>`<path d="M${x} ${y}q${w+1} -${h} ${w+2} 0t-${w} ${h}q-${w+1} 0 -2 -${h}Z"/>`).join('')}</g>`+(coat==='fishing'?`<g opacity=".65">${spine}</g>`:'<path d="M10 90h22l-3 10H8Zm58 1h20l4 9H70Z" fill="#51483c" opacity=".8"/>')+tail;
  }
  return '';
 }
 function svg(value,index,count=3) {
  const coat=Object.hasOwn(palettes,value)?value:'unknown', [fur,mark]=palettes[coat],mask=`roof-fur-${index}`;
  const poseIndex=count===2?[0,2][index]:index%templates.length,pose=templates[poseIndex],template=`assets/roof-cats/${pose}.png?v=${versions[poseIndex]}`;
  const pattern=coatPainting(coat,mark),wash=`roof-wash-${index}`,soft=`roof-soft-${index}`;
  const placement=poseIndex===1?'translate(100 0) scale(-1 1)':'';
  const direction=poseIndex===1?'':'translate(100 0) scale(-1 1)';
  return `<svg class="roof-cat" viewBox="0 0 100 150" aria-hidden="true" focusable="false" data-cat-coat="${coat}" data-cat-pose="${pose}" data-cat-facing="moon"><defs><linearGradient id="${wash}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${fur}"/><stop offset=".55" stop-color="${fur}"/><stop offset="1" stop-color="${mark}" stop-opacity=".85"/></linearGradient><filter id="${soft}" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation=".65"/></filter><mask id="${mask}" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="150" style="mask-type:alpha"><image href="${template}" width="100" height="150"/></mask></defs><ellipse class="roof-contact" cx="50" cy="141" rx="27" ry="3" fill="#0d172b" opacity=".26"/><g transform="${direction}"><g mask="url(#${mask})"><rect width="100" height="150" fill="url(#${wash})"/><g transform="scale(1 1.5)" filter="url(#${soft})"><g transform="${placement}">${pattern}</g></g><image href="${template}" width="100" height="150" style="mix-blend-mode:multiply"/></g></g></svg>`;
 }
 return Object.freeze({svg});
})();
