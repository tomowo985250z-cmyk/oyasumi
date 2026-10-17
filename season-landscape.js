// Original vector study: no images or artwork from existing games.
globalThis.SeasonLandscape=(()=>{
 let uid=0;
 const mix=(a,b,t)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');
 const seasons={
  spring:{sky:'#77bad6',horizon:'#d6e4ce',far:'#82a6a6',hill:'#658d77',field:'#9cb775',leaf:'#d99aab',leafLight:'#f2cdd1',green:'#668d5d',trunk:'#82715e'},
  summer:{sky:'#60acd3',horizon:'#cee1ce',far:'#739ca7',hill:'#4e806b',field:'#87a65d',leaf:'#507f58',leafLight:'#92ac69',green:'#5a854e',trunk:'#756d53'},
  autumn:{sky:'#7cacc4',horizon:'#e3d6af',far:'#91a2a1',hill:'#7c8a64',field:'#c1ae6d',leaf:'#b77344',leafLight:'#dca76a',green:'#7d8d50',trunk:'#80634e'},
  winter:{sky:'#87b3cd',horizon:'#d5ded9',far:'#91a6b3',hill:'#89988c',field:'#b5b29a',leaf:'#8a9387',leafLight:'#c3c7b6',green:'#8a997b',trunk:'#7a7c77'}
 };
 const phase=w=>w.phase||((w.daylight===false||w.hour<6||w.hour>=18)?'night':w.hour<10?'morning':w.hour>=16?'evening':'day');
 const cloudPath='M-62 18Q-82-1-60-12q-5-28 22-29 18-31 42-4 30-10 39 17 28 0 34 27Q86 20 55 22Z';
 const clouds=w=>[{x:65,y:76,scale:w.weather==='sunny'?.63:.93},{x:335,y:100,scale:w.weather==='sunny'?.53:1},...(w.season==='summer'&&w.weather==='sunny'?[{x:222,y:99,scale:.83}]:[]),...(w.weather!=='sunny'?[{x:220,y:25,scale:1.2}]:[])];
 let cloudContext,cloudShape;
 function cloudTransmission(w,point,radius=13){
  if(typeof Path2D!=='function'||typeof document==='undefined')return 1;
  cloudContext??=document.createElement('canvas').getContext('2d');cloudShape??=new Path2D(cloudPath);
  const samples=[[0,0],[-.55,0],[.55,0],[0,-.55],[0,.55]];
  return samples.reduce((sum,[dx,dy])=>sum+clouds(w).reduce((light,c)=>cloudContext.isPointInPath(cloudShape,(point.x+dx*radius-c.x)/c.scale,(point.y+dy*radius-c.y)/c.scale)?light*.18:light,1),0)/samples.length;
 }
 function theme(w){
  if(w.solar)return SolarLighting.theme(w);
  const p={...(seasons[w.season]||seasons.summer)},phase=SeasonLandscape.phase(w),cloud=w.weather!=='sunny',rain=w.weather==='rainy';
  if(cloud){p.sky=rain?'#718c9e':'#9cb3c0';p.horizon=rain?'#b5c6c2':'#d8dfd7';for(const key of ['far','hill','field','green','leaf','leafLight'])p[key]=mix(p[key],rain?'#52746d':'#8b9e92',rain?.24:.12);}
  if(phase==='morning'){p.sky=mix(p.sky,'#b9d8e6',.42);p.horizon=mix(p.horizon,'#e6e4cc',.18);}
  if(phase==='evening'){p.sky=rain?'#787f91':cloud?'#a99caa':'#b390a0';p.horizon=rain?'#afa6a0':cloud?'#d2b5a1':'#eeae78';for(const key of ['far','hill','field','green','leaf','leafLight'])p[key]=mix(p[key],'#997854',.24);}
  if(phase==='night'){p.sky=rain?'#142432':cloud?'#182b3b':'#0d2035';p.horizon=rain?'#2c424c':'#354c59';for(const key of ['far','hill','field','green','leaf','leafLight','trunk'])p[key]=mix(p[key],'#102532',.79);}
  p.cloud=phase==='night'?'#3b4e5d':rain?'#9eafb6':cloud?'#dce2df':phase==='evening'?'#eac19e':'#f2f4e9';p.cloudShade=phase==='night'?'#253948':rain?'#6e8b9d':cloud?'#a8bbc2':phase==='evening'?'#a68e9e':'#b7ced0';
  p.sun=phase==='evening'?'#ffe0a1':'#fff2cb';p.shadow=phase==='night'?'#0d2333':rain?'#425e6a':'#637b7d';
  p.wood=phase==='night'?'#41484b':rain?'#a18f7c':phase==='evening'?'#b49475':'#b49c81';p.woodLight=phase==='night'?'#606767':phase==='evening'?'#cfb393':'#cdbba2';
  return p;
 }
 function landscape(w,frame='window',now=globalThis.NightClock?.now()??Date.now()){
  w={...w,phase:phase(w)};
  const p=theme(w),wide=frame==='sky',id='country-'+(++uid),night=w.phase==='night',rain=w.weather==='rainy',cloud=w.weather!=='sunny';
  // A common 400 × 260 landscape also reads naturally through the room window.
  const cloudAt=({x,y,scale})=>`<g transform="translate(${x} ${y}) scale(${scale})"><path d="${cloudPath}" fill="${p.cloud}"/><path d="M-67 12q27 8 52 3t46 2 40-7q-3 15-24 14h-97q-17-1-17-12Z" fill="${p.cloudShade}" opacity=".38"/></g>`;
  const branchTree=(x,y,s)=>`<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0q5-43-3-89m3 58-25-29m26 13 25-31m-28 13-18-23m20 12 11-24" fill="none" stroke="${p.trunk}" stroke-width="4" stroke-linecap="round"/>${w.season==='winter'?'':`<path d="M-42-65q-17-20 4-32-4-23 20-22 17-21 37-3 26-8 33 16 23 7 15 27-9 20-36 16-28 13-47-2Z" fill="${p.leaf}"/><path d="M-41-88q6-16 23-13 7-20 24-12 19-7 29 10 22-3 22 16-20-5-32 3-21-6-33 2-18-10-33-6Z" fill="${p.leafLight}" opacity=".7"/>`}</g>`;
  const stars=night&&!rain?`<g fill="#f2e5c7" opacity="${cloud?.23:.7}">${Array.from({length:20},(_,i)=>`<circle cx="${14+(i*71)%375}" cy="${12+(i*31)%115}" r="${i%4? .7:1.1}"/>`).join('')}</g>`:'';
  const moon=night?`<g opacity="${rain?.12:cloud?.4:.95}" transform="${wide?'translate(160 -12) scale(1.25)':'translate(0 0)'}">${RoofMoon.svg(now,'window')}</g>`:'';
  const sun=!night&&!cloud?`<circle cx="${w.phase==='evening'?295:304}" cy="${w.phase==='evening'?130:w.phase==='morning'?96:53}" r="${w.phase==='evening'?18:14}" fill="${p.sun}" opacity=".9"/><circle cx="${w.phase==='evening'?295:304}" cy="${w.phase==='evening'?130:w.phase==='morning'?96:53}" r="36" fill="url(#${id}-glow)"/>`:'';
  const far=`<path data-depth="distant-ridge" d="M-20 163 21 142 57 154 95 119 128 140 163 111 210 148 247 126 289 147 334 110 375 142 420 127v133H-20Z" fill="${mix(p.far,p.sky,.34)}"/><path d="M-20 190 22 163q30-29 55-14l35-30 39 39q26-34 49-26l25 22 35-23q22-14 48 10l43-27 69 53v93H-20Z" fill="${p.far}"/><path d="M-8 200q51-40 98-12 32-50 80-24 47-36 90-12 44-16 75 7 44-26 81 16v85H-8Z" fill="${p.hill}"/>`;
  const fields=`<path d="M0 215q93-24 180-5t220-4v54H0Z" fill="${p.field}"/><path d="M90 220q87-6 153 5l-18 10q-75-14-166-2Z" fill="${mix(p.field,p.green,.3)}"/><path d="m190 219 25 41h8l-25-42Z" fill="${mix(p.field,night?'#364344':'#d5c5a4',.35)}"/><path d="M0 241q128-25 235 0t165-5v24H0Z" fill="${p.green}" opacity=".5"/><path d="M236 222h53v-16h-53Z" fill="${night?'#485254':'#d3c9b2'}"/><path d="m230 207 18-13h28l20 13Z" fill="${night?'#263744':'#6d7a79'}"/><path d="M246 213h7v9h-7Zm24-1h8v6h-8Z" fill="${night?'#948867':'#7b9994'}"/>`;
  const trees=branchTree(wide?14:112,260,wide?.72:.55)+branchTree(wide?388:302,265,wide?.82:.62);
  const rainfall=rain?`<g stroke="${night?'#b3c6ca':'#dce5e1'}" stroke-width=".8" opacity=".38">${Array.from({length:28},(_,i)=>`<path d="m${(i*61)%400} ${(i*37)%250} -3 11"/>`).join('')}</g>`:'';
  // Keep the original window moon geometry in its own native viewport at night.
  if(night&&!wide){
   const branch=x=>`<g stroke="${p.trunk}" stroke-width="2" fill="none" stroke-linecap="round"><path d="M${x} 180v-42m0 23-11-14m11 5 10-16"/></g>`;
   return `<svg class="season-landscape room-night-sky" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" data-season="${w.season}" data-weather="${w.weather}" data-jst-day="${w.day}"><defs><linearGradient id="${id}-window" x2="0" y2="1"><stop stop-color="${p.sky}"/><stop offset="1" stop-color="${p.horizon}"/></linearGradient></defs><path d="M0 0h160v180H0Z" fill="url(#${id}-window)"/><g fill="#e5e3d3" opacity="${rain?.08:cloud?.2:.55}">${Array.from({length:20},(_,i)=>`<circle cx="${10+(i%4)*40+((i*17)%19)}" cy="${10+Math.floor(i/4)*27+((i*13)%15)}" r="${i%5?.7:1.1}"/>`).join('')}</g><g opacity="${rain?.12:cloud?.4:1}">${RoofMoon.svg(now,'window')}</g>${cloud?`<path d="M-10 34q22-17 47-3t56-2 75 6v12q-47-9-81 0t-66-1-31-2Z" fill="${p.cloud}" opacity="${rain?.55:.3}"/>`:''}<path data-depth="distant-ridge" d="M-10 151 14 137 37 145 61 124 86 144 111 130 139 144 171 132v48H-10Z" fill="${p.far}"/><path data-depth="middle-hills" d="M0 157q35-22 76-5t84-6v34H0Z" fill="${p.hill}"/><path data-depth="near-trees" d="M0 173q43-16 88-7t72-3v17H0Z" fill="${p.green}"/>${w.season==='winter'?branch(9)+branch(151):`<g fill="${p.leaf}"><path d="M0 180v-43q14-14 22 1 13 10 2 18-5 9-11 6l-2 18ZM160 180v-49q-14-10-20 4-13 9-2 19 1 8 12 8l1 18Z"/></g>`}${rain?'<g stroke="#a1b7c0" opacity=".22"><path d="m22 77-2 8m34-23-2 8m42 27-2 7m35-29-2 8"/></g>':''}</svg>`;

  }
  return `<svg class="season-landscape country-landscape" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="${id}" x2="0" y2="1"><stop stop-color="${p.sky}"/><stop offset=".68" stop-color="${mix(p.sky,p.horizon,.55)}"/><stop offset="1" stop-color="${p.horizon}"/></linearGradient><radialGradient id="${id}-glow"><stop stop-color="${p.sun}" stop-opacity=".22"/><stop offset="1" stop-color="${p.sun}" stop-opacity="0"/></radialGradient></defs><path d="M0 0h400v260H0Z" fill="url(#${id})"/>${stars}${moon}${sun}<g data-sky-clouds opacity="${night?.35:1}">${clouds(w).map(cloudAt).join('')}</g>${far}${fields}${trees}${rainfall}</svg>`;
 }
 return Object.freeze({theme,art:landscape,mix,phase,cloudTransmission});
})();
