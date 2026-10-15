// Dedicated rear-view artwork. Existing profile, daytime and sleep cats are unchanged.
globalThis.RoofCats = (() => {
 const palettes={calico:['#fff6e8','#dd963d'],orange:['#e9ad68','#a66934'],brown:['#9a8060','#514536'],silver:['#b9bbbf','#6d747e'],black:['#383d48','#383d48'],white:['#f2eee6','#f2eee6'],tuxedo:['#343944','#f2eee6'],gray:['#969ba6','#969ba6'],manul:['#aca595','#70695e'],sand:['#dfc599','#a78d64'],'black-footed':['#c8ae83','#60513d'],fishing:['#a5a69a','#555e55'],unknown:['#7d899e','#7d899e']};
 Object.assign(palettes,{'snow-leopard':['#e5e3df','#69635e'],leopard:['#edbb6b','#554333'],cheetah:['#edbd75','#554333'],jaguar:['#e8b65e','#4d392d']});
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
  if(['snow-leopard','leopard','cheetah','jaguar'].includes(coat)){
   const spots=[[30,34],[57,35],[69,43],[35,49],[52,53],[24,61],[70,61],[42,68],[58,76],[27,79],[77,82]];
   return `<g opacity=".65">${spots.map(([x,y])=>coat==='cheetah'?`<circle cx="${x}" cy="${y}" r="2.5" fill="${mark}"/>`:`<circle cx="${x}" cy="${y}" r="3.5" fill="none" stroke="${mark}" stroke-width="1.5"/>${coat==='jaguar'?`<circle cx="${x}" cy="${y}" r="1" fill="${mark}"/>`:''}`).join('')}</g>`+tail;
  }
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

// Decorative moon, calculated from the same clock as the rest of the home card.
globalThis.RoofMoon = (() => {
 const cycleDays=29.530588853, dayMs=86400000;
 const epoch=Date.parse('2000-01-06T18:14:00Z'); // Reference new moon.
 const jst=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 let maskSequence=0;
 function snapshot(now) {
  const age=(now-epoch)/(cycleDays*dayMs),phase=((age%1)+1)%1;
  const parts=Object.fromEntries(jst.formatToParts(now).map(part=>[part.type,part.value]));
  const hours=Number(parts.hour)+Number(parts.minute)/60+Number(parts.second)/3600+(now%1000)/3600000;
  const angle=(hours-18)/24*Math.PI*2;
  // Stay in the clear strip to the right of even the three-cat arrangement.
  return {phase,illumination:(1-Math.cos(phase*Math.PI*2))/2,
   x:192+2.5*(1-Math.cos(angle)),y:26-11*Math.sin(angle),
   scale:1.025+.125*Math.cos(angle-.7)};
 }
 function drawing(now,frame='roof') {
  const moon=snapshot(now),cosine=Math.cos(moon.phase*Math.PI*2),rx=Math.abs(cosine);
  // Outer limb plus elliptical terminator: right-lit waxing, left-lit waning.
  const terminator=rx<1e-8?'L0 -1':`A${rx} 1 0 0 ${cosine>=0?0:1} 0 -1`;
  const path=`M0 -1A1 1 0 0 1 0 1${terminator}Z`;
  // The room's rounded right-hand pane has a different coordinate system.
  // Preserve its original center/radius and map the same temporal trajectory.
  const window=frame==='window',x=window?117+(moon.x-194.5)*2:moon.x,y=window?43+(moon.y-26)*.65:moon.y;
  return {phase:moon.phase,transform:`translate(${x} ${y}) scale(${(window?12:7.5)*moon.scale})`,path,facing:`scale(${moon.phase<=.5?1:-1} 1)`};
 }
 function surface(moon,frame){
  const window=frame==='window',radius=window?14/12:1,id='oyasumi-moon-lit-'+(++maskSequence);
  // The alpha mask is only the illuminated silhouette. No painted dark disk,
  // backing circle, shadow or sky-colored patch anywhere in the moon layer.
  return `<defs><mask id="${id}" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="${-radius}" y="${-radius}" width="${radius*2}" height="${radius*2}" style="mask-type:alpha"><path d="${moon.path}" transform="${moon.facing}" fill="#fff"/></mask></defs><rect data-moon-light x="${-radius}" y="${-radius}" width="${radius*2}" height="${radius*2}" fill="${window?'#efe1be':'#ddd8bf'}" opacity="${window?'1':'.6'}" stroke="none" mask="url(#${id})"/>`;
 }
 function svg(now,frame='roof') {
  const window=frame==='window',moon=drawing(now,frame);
  return `<g class="${window?'room-window-moon':'roof-moon'}" data-moon-renderer="lit-mask-v2" data-moon-frame="${window?'window':'roof'}" data-moon-phase="${moon.phase}" transform="${moon.transform}" style="filter:none">${surface(moon,frame)}</g>`;
 }
 function update(element,now) {
  const frame=element.dataset.moonFrame,moon=drawing(now,frame);
  // Migrate an already-mounted old moon too, instead of leaving its disk behind.
  if(element.dataset.moonRenderer!=='lit-mask-v2'||!element.querySelector('mask path')||!element.querySelector('[data-moon-light]')){
   element.innerHTML=surface(moon,frame);element.dataset.moonRenderer='lit-mask-v2';
  }
  const path=element.querySelector('mask path'),light=element.querySelector('[data-moon-light]');
  for(const child of [...element.children])if(child.localName!=='defs'&&child!==light)child.remove();
  element.style.filter='none';
  element.setAttribute('data-moon-phase',moon.phase);element.setAttribute('transform',moon.transform);
  path.setAttribute('d',moon.path);path.setAttribute('transform',moon.facing);
 }
 return Object.freeze({snapshot,svg,update});
})();
