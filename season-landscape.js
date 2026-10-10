globalThis.SeasonLandscape=(()=>{
 const palettes={spring:{sky:'#c3dce6',haze:'#f5e9df',hill:'#b6c5ac',leaf:'#e8b9c9',light:'#f4d6dc',trunk:'#a28c89'},summer:{sky:'#aed2e8',haze:'#e4e9d4',hill:'#9db8a5',leaf:'#93b3a2',light:'#bad1b1',trunk:'#8d9c8e'},autumn:{sky:'#bdcfdb',haze:'#f2dfc9',hill:'#b7b5a1',leaf:'#cd9c7c',light:'#e0ba8d',trunk:'#9a8580'},winter:{sky:'#c2d2df',haze:'#e6e8e6',hill:'#b9c3c3',leaf:'#b2bcc0',light:'#d8dcdd',trunk:'#8f9caa'}};
 function art(world,frame='window'){
  if(world.daylight===false&&frame==='window')return night(world);
  const p=palettes[world.season]||palettes.autumn,w=frame==='sky'?400:160,h=frame==='sky'?260:180,sky=frame==='sky';
  const sx=n=>(n*w).toFixed(1),sy=n=>(n*h).toFixed(1);
  const rainy=world.weather==='rainy',cloudy=world.weather!=='sunny',id=`world-${world.season}-${world.weather}-${frame}`;
  const tint=rainy?'#aebdca':cloudy?'#c3ccd3':p.sky;
  const cloud=(x,y,scale,fill,opacity)=>`<g transform="translate(${sx(x)} ${sy(y)}) scale(${scale})" fill="${fill}" opacity="${opacity}"><path d="M-42 11q-8-17 8-22 0-20 17-21 13-15 25 0 24-3 25 20 24-1 23 23Z"/></g>`;
  function tree(x,scale,variant){
   const stem=`<g fill="none" stroke="${p.trunk}" stroke-width="2.2" stroke-linecap="round"><path d="M0 0q-2-27 0-58m0 33-18-18m18 8 17-23m-17 9-12-17m13 9 8-17m-26 32-7-12m36-3 7-12"/></g>`;
   const leaves=world.season==='winter'?`<g fill="#eef1ec" opacity=".5"><ellipse cx="-14" cy="-47" rx="8" ry="2"/><ellipse cx="12" cy="-58" rx="6" ry="1.5"/></g>`:`<g fill="${variant?p.light:p.leaf}"><ellipse cx="-16" cy="-51" rx="22" ry="18"/><ellipse cx="12" cy="-56" rx="25" ry="20"/><ellipse cx="-1" cy="-70" rx="22" ry="17"/></g><g fill="${p.light}" opacity=".6"><ellipse cx="-16" cy="-58" rx="10" ry="6"/><ellipse cx="10" cy="-70" rx="13" ry="7"/></g>`;
   const blossom=world.season==='spring'?`<g fill="#fff0ec" opacity=".8">${[[-26,-54],[-6,-73],[12,-62],[23,-49],[-12,-45],[3,-51]].map(([cx,cy])=>`<circle cx="${cx}" cy="${cy}" r="2"/>`).join('')}</g>`:'';
   return `<g transform="translate(${sx(x)} ${sy(.99)}) scale(${scale})">${stem}${leaves}${blossom}</g>`;
  }
  const trees=world.season==='summer'?`${tree(.16,sky?1:.7,false)}${tree(.86,sky?1.1:.8,true)}`:sky?`${tree(.06,1.05,false)}${tree(.94,1.2,true)}`:`${tree(.25,.8,false)}${tree(.92,.9,true)}`;
  const rain=rainy?`<g stroke="#728ea4" stroke-width="${sky?.8:.55}" stroke-linecap="round" opacity=".3">${Array.from({length:sky?18:12},(_,i)=>{const x=((i*29+13)%100)/100,y=((i*43+7)%75)/100;return `<path d="m${sx(x)} ${sy(y)} -${sky?3:1.8} ${sky?10:7}"/>`;}).join('')}</g>`:'';
  const summerCloud=world.season==='summer'?`${cloud(.34,.38,sky?1.45:.8,cloudy?'#e8eceb':'#fffaf0',.9)}${cloud(.55,.28,sky?1.15:.65,cloudy?'#e3e8e9':'#fffdf5',.84)}`:'';
  return `<svg class="season-landscape" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" data-season="${world.season}" data-weather="${world.weather}" data-jst-day="${world.day}"><defs><linearGradient id="${id}" x2="0" y2="1"><stop stop-color="${tint}"/><stop offset="1" stop-color="${p.haze}"/></linearGradient></defs><path fill="url(#${id})" d="M0 0h${w}v${h}H0z"/>${!cloudy?`<circle cx="${sx(.76)}" cy="${sy(.23)}" r="${sky?15:10}" fill="#fff0cc" opacity=".86"/>`:''}${cloud(.19,.26,sky?1:.52,cloudy?'#e6e9e8':'#fff9ee',cloudy?.82:.6)}${cloud(.83,.34,sky?1.2:.56,cloudy?'#e1e5e6':'#fffaf1',cloudy?.8:.58)}${summerCloud}${cloudy?cloud(.51,.12,sky?1.5:.76,rainy?'#c6d0d6':'#d9e0e3',.7):''}<g opacity="${sky?.4:.85}"><path d="M0 ${sy(.87)}Q${sx(.22)} ${sy(.71)} ${sx(.5)} ${sy(.86)}T${w} ${sy(.82)}V${h}H0Z" fill="${p.hill}"/>${trees}</g>${world.season==='autumn'&&!sky?'<g fill="#c99072" opacity=".6"><ellipse cx="31" cy="168" rx="3" ry="1"/><ellipse cx="102" cy="175" rx="2" ry="1"/></g>':''}${rain}</svg>`;
 }
 function night(world){
  const stars=Array.from({length:20},(_,i)=>{const x=10+(i%4)*40+((i*17)%19),y=10+Math.floor(i/4)*27+((i*13)%15);return `<circle cx="${x}" cy="${y}" r="${i%5===0?1.1:.7}" opacity="${.42+i%4*.1}"/>`;}).join('');
  return `<svg class="season-landscape room-night-sky" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" data-weather="clear-night" data-jst-day="${world.day}"><defs><linearGradient id="room-night-gradient" x2="0" y2="1"><stop stop-color="#1e304d"/><stop offset="1" stop-color="#52627c"/></linearGradient></defs><path fill="url(#room-night-gradient)" d="M0 0h160v180H0z"/><g fill="#f5e6c2">${stars}</g><circle cx="117" cy="43" r="14" fill="#e8dcb8" opacity=".14"/><path d="M121 31a12 12 0 1 0 7 19 13 13 0 0 1-7-19Z" fill="#efe1be"/><path d="M0 154q35-22 76-5t84-6v37H0Z" fill="#35495c"/><path d="M0 169q43-16 88-7t72-3v21H0Z" fill="#304353"/></svg>`;
 }
 return Object.freeze({art});
})();
