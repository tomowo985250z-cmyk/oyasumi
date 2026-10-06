// Dedicated rear-view artwork. Existing profile, daytime and sleep cats are unchanged.
globalThis.RoofCats = (() => {
 const palettes={calico:['#fff6e8','#dd963d'],orange:['#e9ad68','#a66934'],brown:['#9a8060','#514536'],silver:['#b9bbbf','#6d747e'],black:['#383d48','#383d48'],white:['#f2eee6','#f2eee6'],tuxedo:['#343944','#f2eee6'],gray:['#969ba6','#969ba6'],manul:['#aca595','#70695e'],sand:['#dfc599','#a78d64'],'black-footed':['#c8ae83','#60513d'],fishing:['#a5a69a','#555e55'],unknown:['#7d899e','#7d899e']};
 const template='assets/roof-cats/rear-template.png?v=b1fa949ee33454cd';
 function svg(value,index) {
  const coat=Object.hasOwn(palettes,value)?value:'unknown', [fur,mark]=palettes[coat],mask=`roof-fur-${index}`;
  let pattern='';
  if(coat==='calico')pattern='<path d="M15 15Q50 12 46 46T25 85H8V15Z" fill="#dd963d"/><path d="M55 28Q82 14 94 42L80 70 59 60Z" fill="#45434a"/>';
  if(coat==='tuxedo')pattern='<path d="M10 65Q24 76 30 95H8Zm74-5q-8 15-7 36h22V60Z" fill="#f2eee6"/>';
  if(['orange','brown','silver','manul','sand'].includes(coat))pattern=`<path d="M24 28q26 9 51 0M24 43q26 10 51 0M21 58l14 5m41-5-14 5M18 75l16 5m45-5-14 5M79 85l3 12m7-15 4 12" fill="none" stroke="${mark}" stroke-width="4" stroke-linecap="round" opacity=".75"/>`;
  if(['black-footed','fishing'].includes(coat))pattern=`<g fill="${mark}" opacity=".85">${[[32,32],[58,30],[44,46],[69,49],[29,62],[53,65],[73,73],[40,80],[85,88]].map(([x,y])=>`<ellipse cx="${x}" cy="${y}" rx="3" ry="4"/>`).join('')}</g>`;
  return `<svg class="roof-cat" viewBox="0 0 100 150" aria-hidden="true" focusable="false" data-cat-coat="${coat}"><defs><mask id="${mask}" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="150" style="mask-type:alpha"><image href="${template}" width="100" height="150"/></mask></defs><g mask="url(#${mask})"><rect width="100" height="150" fill="${fur}"/><g transform="scale(1 1.5)">${pattern}</g><image href="${template}" width="100" height="150" style="mix-blend-mode:multiply"/></g></svg>`;
 }
 return Object.freeze({svg});
})();
