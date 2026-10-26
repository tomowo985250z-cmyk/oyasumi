// Shared engawa tatami and plaster materials. One floor homography drives mat outlines, rush
// fibres, cloth bands and joints. Existing cats, furniture and clocks are shared.
globalThis.TatamiWallStudy=(()=>{
 if(!globalThis.EngawaInteriorStudy)return Object.freeze({disabled:true,version:1});
 const material=SceneryMaterials,interior=EngawaInteriorStudy,backgrounds=RoomBackgrounds,lighting=SolarLighting,ns='http://www.w3.org/2000/svg';let serial=0;
 const mats=[[0,0,2,1],[2,0,1,2],[0,1,1,2],[1,1,1,2],[2,2,1,2],[0,3,2,1]],depth=(1-1/1.21)/4,scaleY=104/(4*1.21),heri=.023;
 const project=(x,y)=>{const z=1-depth*y;return [200+(x-1.5)*(400/3)/z,226+scaleY*y/z];};
 const parse=s=>{const d=new DOMParser().parseFromString(s,'image/svg+xml');if(d.querySelector('parsererror'))throw Error('Invalid tatami/wall SVG');return d;};
 const serialize=d=>new XMLSerializer().serializeToString(d.documentElement);
 const number=n=>Number(n.toFixed(5)),points=p=>p.map(v=>v.map(number).join(',')).join(' ');
 function helpers(doc){return (tag,attrs={})=>{const n=doc.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};}
 function softFurnishings(doc,w){
  const svg=doc.documentElement,node=helpers(doc),main=svg.querySelector('g[filter]'),id='engawa-soft-'+(++serial),defs=node('defs',{'data-engawa-soft-defs':''}),mix=SeasonLandscape.mix;
  svg.querySelector('defs').append(defs);
  const p=SolarLighting.palette(SolarModel.world(w),phase=>({color:phase==='night'?'#879995':phase==='evening'?'#e8c8a2':phase==='morning'?'#f0f0df':'#f0ebdf'})),rgb=[1,3,5].map(i=>parseInt(p.color.slice(i,i+2),16)/255),tone=node('filter',{id:id+'-tone','color-interpolation-filters':'sRGB'});
  tone.innerHTML='<feColorMatrix type="saturate" values=".78"/><feComponentTransfer>'+['R','G','B'].map((c,i)=>'<feFunc'+c+' type="linear" slope="'+rgb[i]*.82+'" intercept="'+rgb[i]*.085+'"/>').join('')+'</feComponentTransfer>';defs.append(tone);
  const ceilingClip=node('clipPath',{id:id+'-ceiling'});ceilingClip.append(node('path',{d:'M0 0H400V26H0Z'}));defs.append(ceilingClip);
  const wood=node('pattern',{id:id+'-wood',patternUnits:'userSpaceOnUse',width:170,height:70});wood.append(node('image',{href:'assets/engawa-semi-real-v1/wood.webp?v=0ee8d8588835c769',width:170,height:70,preserveAspectRatio:'none'}));defs.append(wood);
  const ceiling=node('g',{'data-engawa-soft-material':'ceiling','clip-path':'url(#'+ceilingClip.id+')',style:'pointer-events:none'});
  ceiling.append(node('path',{d:'M0 0H400V26H0Z',fill:'url(#'+wood.id+')',filter:'url(#'+tone.id+')',opacity:'.66'}));
  ceiling.append(node('path',{d:'M0 24.8H400',stroke:'#4a3f32','stroke-width':'.6',opacity:'.14'}));main.append(ceiling);
  const cushion=[...main.querySelectorAll('path')].find(n=>n.getAttribute('d')?.startsWith('M138 262'));
  const oldSeam=[...main.querySelectorAll('path')].find(n=>n.getAttribute('d')?.startsWith('M144 258'));
  if(cushion){
   const clip=node('clipPath',{id:id+'-cushion'});clip.append(node('path',{d:cushion.getAttribute('d')}));defs.append(clip);
   const cloth=node('g',{'data-engawa-soft-material':'cushion','clip-path':'url(#'+clip.id+')',style:'pointer-events:none'});
   cloth.append(node('image',{href:'assets/engawa-semi-real-v1/cushion.webp?v=cb80c85472605d47',x:134,y:222,width:126,height:52,preserveAspectRatio:'none',filter:'url(#'+tone.id+')',opacity:'.88'}));
   cloth.append(node('path',{d:'M144 258q49 13 104 0',fill:'none',stroke:'#e2dce6','stroke-width':'.65','stroke-dasharray':'1.3 1.5',opacity:'.4'}));
   cloth.append(node('path',{d:'M145 260q49 13 102 0',fill:'none',stroke:'#514b5d','stroke-width':'.75',opacity:'.20'}));
   cushion.after(cloth);if(oldSeam){oldSeam.setAttribute('data-engawa-soft-legacy','seam');oldSeam.setAttribute('opacity','0');}
  }
  const rug=main.querySelector('ellipse[cx="204"][cy="262"]'),oldRim=main.querySelector('ellipse[cx="204"][cy="260"]');
  if(rug){
   const base=rug.getAttribute('fill'),clip=node('clipPath',{id:id+'-rug'});clip.append(node('ellipse',{cx:204,cy:262,rx:83,ry:13}));defs.append(clip);
   const gradient=node('radialGradient',{id:id+'-rug-tone',cx:'.42',cy:'.28',r:'.8'});gradient.innerHTML='<stop stop-color="'+mix(base,'#f0e3c8',.16)+'"/><stop offset=".66" stop-color="'+base+'"/><stop offset="1" stop-color="'+mix(base,'#484838',.19)+'"/>';defs.append(gradient);
   const cloth=node('g',{'data-engawa-soft-material':'rug','clip-path':'url(#'+clip.id+')',style:'pointer-events:none'});cloth.append(node('ellipse',{cx:204,cy:262,rx:83,ry:13,fill:'url(#'+gradient.id+')'}));
   const light=mix(base,'#f5ebd3',.30),dark=mix(base,'#514d3c',.32);
   for(let i=0;i<22;i++){
    const rx=81-i*3.45,ry=rx*13/83;
    cloth.append(node('ellipse',{cx:204,cy:262,rx,ry,fill:'none',stroke:i%2?light:dark,'stroke-width':i%2?'.36':'.52',opacity:'.31'}));
   }
   // Quiet woven fibres and a rounded braided rim, in the same floor plane.
   // All detail stays inside the original oval; size, palette and placement stay native.
   const fibre=node('pattern',{id:id+'-rug-fibre',patternUnits:'userSpaceOnUse',x:121,y:249,width:7.5,height:3.6});
   fibre.innerHTML='<path d="M-.8 1q2-.9 4 .1t4-.1M-.8 2.8q2 .8 4-.1t4 .1" fill="none" stroke="'+dark+'" stroke-width=".48" stroke-opacity=".28"/><path d="M.8 .2q-.5 1.5 .1 2.9m3.6-2.6q.6 1.3-.1 3" fill="none" stroke="'+light+'" stroke-width=".55" stroke-opacity=".46"/>';defs.append(fibre);
   cloth.append(node('ellipse',{cx:204,cy:262,rx:81,ry:12.7,fill:'url(#'+fibre.id+')'}));
   const stitches=[],glints=[];
   for(let i=0;i<112;i++){
    const t=i*Math.PI*2/112,point=(r,a)=>[204+r*Math.cos(a),262+r*13/83*Math.sin(a)].map(number).join(' ');
    stitches.push('M'+point(82,t-.012)+'Q'+point(80.2,t+.018)+' '+point(78.4,t-.012));
    if(i%3!==0)glints.push('M'+point(81.6,t-.017)+'Q'+point(80.1,t+.008)+' '+point(79,t-.012));
   }
   cloth.append(node('path',{d:stitches.join(''),fill:'none',stroke:dark,'stroke-width':'.65','stroke-linecap':'round',opacity:'.40'}));
   cloth.append(node('path',{d:glints.join(''),fill:'none',stroke:light,'stroke-width':'.4','stroke-linecap':'round',opacity:'.56'}));
   cloth.append(node('path',{d:'M122 262q82 23.6 164 0',fill:'none',stroke:dark,'stroke-width':'1.25',opacity:'.20'}));

   const weave=node('filter',{id:id+'-linen',x:0,y:0,width:'100%',height:'100%'});weave.innerHTML='<feTurbulence type="fractalNoise" baseFrequency=".55 .28" numOctaves="2" seed="41"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".07"/></feComponentTransfer><feBlend in="SourceGraphic" mode="soft-light"/>';defs.append(weave);
   cloth.style.filter='url(#'+weave.id+')';rug.after(cloth);if(oldRim){oldRim.setAttribute('data-engawa-soft-legacy','rim');oldRim.setAttribute('opacity','0');}
  }
 }

 function art(source,where,w){
  const original=material.art(source,where,w);if(where!=='engawa')return original;
  const doc=parse(original),svg=doc.documentElement,node=helpers(doc),old=svg.querySelector('[data-study-material="tatami-layout"]')||[...svg.querySelectorAll('[data-material="surface"]')].find(n=>n.querySelector('path[fill$="-weave)"]'));if(!old)throw Error('Expected native tatami surface missing');
  const id='tatami-plane-'+(++serial),defs=node('defs',{'data-tatami-wall-defs':''}),floor=node('g',{'data-study-material':'tatami-layout','data-tatami-wall-floor':'1','data-floor-projection':'homography','data-mat-layout':'6-jo-T-joints',style:'pointer-events:none'});
  svg.querySelector('defs').append(defs);
  const relief=node('filter',{id:id+'-relief',x:'0',y:'0',width:'100%',height:'100%','color-interpolation-filters':'sRGB'});relief.innerHTML='<feTurbulence type="fractalNoise" baseFrequency=".28" numOctaves="2" seed="17" result="fibre-noise"/><feColorMatrix in="fibre-noise" type="saturate" values="0"/><feComponentTransfer result="fibre-relief"><feFuncA type="linear" slope=".045"/></feComponentTransfer><feBlend in="SourceGraphic" in2="fibre-relief" mode="soft-light"/>';defs.append(relief);
  // Preserve the previous paper filter's geometry bounds outside this edit.
  const bounds=old.cloneNode(true);bounds.setAttribute('opacity','0');bounds.removeAttribute('data-study-material');bounds.setAttribute('data-preserved-paper-bounds','');for(const n of [bounds,...bounds.querySelectorAll('*')])for(const a of [...n.attributes])if(a.name.startsWith('data-tatami')||a.name==='data-world-size'||a.name==='data-long-axis')n.removeAttribute(a.name);floor.append(bounds);
  const tone=SolarLighting.palette(SolarModel.world(w),phase=>phase==='night'?{base:'#6f7863',light:'#a0a68a',dark:'#465342',cloth:'#3f4c40',thread:'#89917c'}:phase==='evening'?{base:'#b7b38b',light:'#ddd0a4',dark:'#788365',cloth:'#697057',thread:'#c0b98d'}:{base:'#b4bc96',light:'#d7d7af',dark:'#7b8c65',cloth:'#5c6c54',thread:'#bec6a0'});
  const mix=SeasonLandscape.mix;
  const planePoly=(coords,attrs={})=>node('polygon',{points:points(coords.map(p=>project(...p))),...attrs});
  const planeD=coords=>'M'+coords.map(p=>project(...p).map(number).join(' ')).join('L')+'Z';
  for(const [index,[x,y,width,height]]of mats.entries()){
   const alongX=width>height,local=(u,v)=>alongX?[x+u,y+v]:[x+v,y+u],rect=(u0,v0,u1,v1)=>[local(u0,v0),local(u1,v0),local(u1,v1),local(u0,v1)];
   const mat=node('g',{'data-tatami-mat':index,'data-world-size':width+' '+height,'data-long-axis':alongX?'x':'y','data-grain-direction':alongX?'y':'x',filter:'url(#'+relief.id+')'}),quad=[[x,y],[x+width,y],[x+width,y+height],[x,y+height]];
   const clip=node('clipPath',{id:id+'-mat-'+index});clip.append(planePoly(quad));defs.append(clip);mat.setAttribute('clip-path','url(#'+clip.id+')');
   const a=project(x,y),b=project(x+width,y+height),shade=node('linearGradient',{id:id+'-shade-'+index,gradientUnits:'userSpaceOnUse',x1:a[0],y1:a[1],x2:b[0],y2:b[1]});shade.innerHTML='<stop stop-color="'+mix(tone.base,tone.light,.065)+'"/><stop offset=".5" stop-color="'+tone.base+'"/><stop offset="1" stop-color="'+mix(tone.base,tone.dark,.045)+'"/>';defs.append(shade);
   mat.append(planePoly(quad,{fill:'url(#'+shade.id+')','data-tatami-surface':''}));
   const fibres=node('g',{'data-tatami-fibres':'','data-world-direction':alongX?'0,1':'1,0'});
   const batches=new Map(),batch=(coords,fill,opacity)=>{const key=fill+'|'+opacity;if(!batches.has(key))batches.set(key,{fill,opacity,paths:[]});batches.get(key).paths.push(planeD(coords));};
   // Rush/rib detail crosses the two heri. Subtle irregular widths avoid a
   // screen-aligned grid; every strip is projected in the same floor plane.
   for(let i=0;i<144;i++){
    const u=(i+.23+Math.sin(i*1.71+index)*.09)/72,a=.0033+(Math.sin(i*2.63)*.5+.5)*.0018;
    const phase=Math.round((Math.sin(i*1.23+index*2.1)+1)*2.5)/5;
    batch(rect(u,heri+.002,u+a,1-heri-.002),mix(tone.light,tone.dark,.23+phase*.36),'.54');
    if(i%3===0)batch(rect(u+a,heri+.004,u+a+.002,1-heri-.004),tone.light,'.24');
   }
   // Fine binding stitches are sparse and subordinate to the rush direction.
   for(let k=1;k<7;k++)for(let i=0;i<36;i++){
    const u=i/18+(k%2)*.015,v=k/7;
    batch(rect(u,v,u+.018,v+.0012),tone.dark,'.13');
   }
   for(const {fill,opacity,paths}of batches.values())fibres.append(node('path',{d:paths.join(''),fill,opacity}));
   mat.append(fibres);
   // Two full cloth bands lie INSIDE their own mat, with real world width.
   // Adjacent bands therefore meet separately instead of overlapping strokes.
   for(const [side,v0,v1]of [['a',0,heri],['b',1-heri,1]]){
    const band=node('g',{'data-tatami-heri':side,'data-world-width':heri});
    band.append(planePoly(rect(0,v0,2,v1),{fill:tone.cloth}));
    band.append(planePoly(rect(0,v0+.003,2,v1-.003),{fill:mix(tone.cloth,tone.light,.2),opacity:'.72'}));
    band.append(planePoly(rect(0,v0,2,v0+.0018),{fill:tone.dark,opacity:'.32'}));
    const stitches=[];for(let i=0;i<54;i++){const u=i/27+.005;stitches.push(planeD(rect(u,v0+.004,u+.011,v1-.004)));}band.append(node('path',{d:stitches.join(''),fill:tone.thread,opacity:'.2'}));
    // Ends are folded into a rectangular cap, not a picture-frame mitre.
    for(const u of [0,1.986])band.append(planePoly(rect(u,v0,u+.014,v1),{fill:mix(tone.cloth,tone.dark,.27),'data-heri-fold':''}));
    mat.append(band);
   }
   // Short sides carry only a close, quiet seam and a small rounded return.
   for(const u of [0,1.996]){
    mat.append(planePoly(rect(u,heri,u+.004,1-heri),{fill:tone.dark,opacity:'.30','data-tatami-short-seam':''}));
    mat.append(planePoly(rect(u+.003,heri+.002,Math.min(2,u+.006),1-heri-.002),{fill:tone.light,opacity:'.18'}));
   }
   floor.append(mat);
  }
  if(old.hasAttribute('data-study-material'))old.replaceWith(floor);
  else{
   // Keep the current paper-filter geometry and every existing foreground node.
   // The projected mat corners extend past the viewport; putting them inside
   // the old filtered group would move its noise texture over walls/furniture.
   const main=svg.querySelector('g[filter]'),nativeFloor=[...main.children].find(n=>n.getAttribute('d')==='M0 220h400v110H0Z');
   if(!nativeFloor)throw Error('Expected native tatami foundation missing');
   const strip=node('clipPath',{id:id+'-foundation-strip'});strip.append(node('rect',{x:-100,y:-100,width:600,height:326}));defs.append(strip);
   nativeFloor.setAttribute('data-tatami-legacy','foundation');nativeFloor.setAttribute('clip-path','url(#'+strip.id+')');
   old.setAttribute('data-tatami-legacy','weave');old.setAttribute('opacity','0');
   // Native lighting locates its canvas with g[filter]. Keep that canvas
   // first for this selector; CSS filters render the mat relief identically.
   for(const mat of floor.querySelectorAll('[data-tatami-mat][filter]')){mat.style.filter=mat.getAttribute('filter');mat.removeAttribute('filter');}
   svg.insertBefore(floor,main);
  }
  const bowl=svg.querySelector('[data-scene-object="water-bowl"]');
  if(bowl){
   const objectId='tatami-bowl-'+(++serial),p=SolarLighting.palette(SolarModel.world(w),phase=>({color:phase==='night'?'#879995':phase==='evening'?'#e8c8a2':phase==='morning'?'#f0f0df':'#f0ebdf'})),rgb=[1,3,5].map(i=>parseInt(p.color.slice(i,i+2),16)/255),filter=node('filter',{id:objectId,'color-interpolation-filters':'sRGB'}),ownDefs=node('defs',{'data-tatami-bowl-defs':''});
   filter.innerHTML='<feColorMatrix type="saturate" values=".78"/><feColorMatrix type="matrix" values="'+rgb[0]*.88+' 0 0 0 '+rgb[0]*.055+' 0 '+rgb[1]*.88+' 0 0 '+rgb[1]*.055+' 0 0 '+rgb[2]*.88+' 0 '+rgb[2]*.055+' 0 0 0 1 0"/>';ownDefs.append(filter);svg.querySelector('defs').append(ownDefs);
   const shadow=bowl.querySelector('ellipse')?.cloneNode(true);bowl.replaceChildren();if(shadow)bowl.append(shadow);
   bowl.append(node('image',{href:'assets/engawa-semi-real-v1/bowl.webp?v=12daf3306d75356a',x:-24.5,y:-25,width:49,height:28,preserveAspectRatio:'none',filter:'url(#'+objectId+')','data-engawa-semi-real-bowl':''}));
  }
  softFurnishings(doc,w);svg.dataset.tatamiWallStudy='1';return serialize(doc);
 }
 function place(source,where,w){
  const original=lighting.place(source,where,w);if(where!=='engawa')return original;
  const doc=parse(original),svg=doc.documentElement,node=helpers(doc),lantern=svg.querySelector('[data-scene-object="andon"]');if(!lantern)return original;
  const id='tatami-andon-'+(++serial),p=SolarLighting.palette(SolarModel.world(w),phase=>({color:phase==='night'?'#879995':phase==='evening'?'#e8c8a2':phase==='morning'?'#f0f0df':'#f0ebdf'})),rgb=[1,3,5].map(i=>parseInt(p.color.slice(i,i+2),16)/255),filter=node('filter',{id,'color-interpolation-filters':'sRGB'});
  filter.innerHTML='<feColorMatrix type="saturate" values=".78"/><feColorMatrix type="matrix" values="'+rgb[0]*.88+' 0 0 0 '+rgb[0]*.055+' 0 '+rgb[1]*.88+' 0 0 '+rgb[1]*.055+' 0 0 '+rgb[2]*.88+' 0 '+rgb[2]*.055+' 0 0 0 1 0"/>';
  const defs=node('defs',{'data-tatami-andon-defs':''});defs.append(filter);svg.querySelector('defs').append(defs);
  const shadow=lantern.querySelector('ellipse')?.cloneNode(true),paper=lantern.querySelector('[data-engawa-light]')?.cloneNode(true);lantern.replaceChildren();if(shadow)lantern.append(shadow);
  lantern.append(node('image',{href:'assets/engawa-semi-real-v1/andon.webp?v=b5a994fc29222f34',x:-17,y:-43,width:34,height:46,preserveAspectRatio:'none',filter:'url(#'+id+')','data-engawa-semi-real-andon':''}));
  if(paper){paper.setAttribute('d','M-10-32-2-31V-7L-10-8Z M0-31 7-30V-7L0-7Z');paper.setAttribute('fill-opacity','.56');lantern.append(paper);}
  // The floor light and structural shadows belong behind the unchanged
  // foreground geometry. Their solar vectors and intensities remain native.
  const main=svg.querySelector('g[filter]'),foreground=[...main.children].find(n=>n.getAttribute('d')?.startsWith('M0 0h75'));
  if(foreground)for(const layer of [svg.querySelector('[data-solar-edge]'),svg.querySelector('[data-solar-structure-shadow]')])if(layer)main.insertBefore(layer,foreground);
  return serialize(doc);
 }
 function header(w,key){
  const source=interior.header(w,key),doc=parse('<svg xmlns="'+ns+'">'+source+'</svg>'),svg=doc.documentElement,node=helpers(doc),id='plaster-wall-'+(++serial),defs=node('defs',{'data-tatami-wall-defs':''});
  svg.querySelectorAll('[data-study-shared-material="plaster"]').forEach(n=>n.remove());
  const world=SolarModel.world(w),sun=SolarSky.state(world,'engawa'),tone=SolarLighting.palette(world,phase=>phase==='night'?{base:'#65716d',light:'#80887d',dark:'#485752'}:phase==='evening'?{base:'#cfc1aa',light:'#e6d2b5',dark:'#a79b87'}:phase==='morning'?{base:'#d7cfbb',light:'#ece2cd',dark:'#b0ac97'}:{base:'#d6cdba',light:'#ede2cf',dark:'#b3ab98'}),mix=SeasonLandscape.mix;
  const rgb=[1,3,5].map(i=>parseInt(tone.base.slice(i,i+2),16)/255),filter=node('filter',{id:id+'-texture','color-interpolation-filters':'sRGB'});
  filter.innerHTML='<feColorMatrix type="saturate" values=".12"/><feComponentTransfer>'+['R','G','B'].map((c,i)=>'<feFunc'+c+' type="linear" slope="'+rgb[i]*.65+'" intercept="'+rgb[i]*.43+'"/>').join('')+'</feComponentTransfer>';defs.append(filter);
  const pattern=node('pattern',{id:id+'-plaster',patternUnits:'userSpaceOnUse',width:400,height:330});pattern.innerHTML=[0,342.65].map(x=>'<svg x="'+x+'" y="35" width="57.35" height="183" viewBox="253 5 43 50" preserveAspectRatio="none"><image href="assets/bedroom-realism-v1/shell.webp" width="400" height="330" data-tatami-wall-sample="same-bedroom-plaster"/></svg>').join('');defs.append(pattern);
  const grain=node('filter',{id:id+'-relief',x:'0',y:'0',width:'100%',height:'100%'});grain.innerHTML='<feTurbulence type="fractalNoise" baseFrequency=".13" numOctaves="2" seed="29"/><feDiffuseLighting surfaceScale=".35" diffuseConstant=".65" lighting-color="#fff5e0"><feDistantLight azimuth="'+(sun.direction.x>0?140:40)+'" elevation="58"/></feDiffuseLighting><feColorMatrix type="saturate" values="0"/>';defs.append(grain);
  const contact=node('linearGradient',{id:id+'-contact'});contact.innerHTML='<stop stop-color="'+tone.dark+'" stop-opacity=".27"/><stop offset="1" stop-color="'+tone.dark+'" stop-opacity="0"/>';defs.append(contact);
  const clip=node('clipPath',{id:id+'-area'});clip.innerHTML='<path d="M0 35H57.35V218H0Z M342.65 35H400V218H342.65Z"/>';defs.append(clip);svg.append(defs);
  // Close the uncovered 31..34.5 strip between the ceiling beam and the
  // stationary shoji header. The moving leaves and outdoor opening stay put.
  const beam=svg.querySelector('linearGradient[id$="-header-beam"]'),oldHeader=svg.querySelector('[data-interior-study="header"]');
  if(!beam||!oldHeader)throw Error('Expected shoji header material missing');
  const lintelTone=beam.cloneNode(true);lintelTone.id=id+'-lintel-tone';defs.append(lintelTone);
  const lintel=node('g',{'data-tatami-wall-lintel':'1',style:'pointer-events:none'}),oldFilter=oldHeader.getAttribute('filter')?.match(/#([^\)]+)/)?.[1],sourceFilter=oldFilter&&svg.querySelector('[id="'+oldFilter+'"]');
  if(sourceFilter){const f=sourceFilter.cloneNode(true);f.id=id+'-lintel-filter';defs.append(f);lintel.setAttribute('filter','url(#'+f.id+')');}
  lintel.append(node('path',{d:'M0 30.5H400V35H0Z',fill:'url(#'+lintelTone.id+')','data-shoji-gap-backing':''}));
  lintel.append(node('path',{d:'M0 32.5Q180 32.8 400 32.4',fill:'none',stroke:'#635746','stroke-width':'.35',opacity:'.14'}));svg.append(lintel);
  const walls=node('g',{'data-tatami-wall-plaster':'1','clip-path':'url(#'+clip.id+')',style:'pointer-events:none'});
  for(const [side,x,width]of [['left',0,57.35],['right',342.65,57.35]]){
   const grad=node('linearGradient',{id:id+'-'+side,x1:side==='left'?'0':'1',x2:side==='left'?'1':'0'});grad.innerHTML='<stop stop-color="'+tone.base+'"/><stop offset="1" stop-color="'+mix(tone.base,tone.light,.22+.34*sun.direct)+'"/>';defs.append(grad);
   walls.append(node('rect',{x,y:35,width,height:183,fill:'url(#'+grad.id+')'}));
   walls.append(node('rect',{x,y:35,width,height:183,fill:'url(#'+pattern.id+')',filter:'url(#'+filter.id+')',opacity:'.50'}));
   walls.append(node('rect',{x,y:35,width,height:183,fill:tone.base,filter:'url(#'+grain.id+')',opacity:'.035'}));
   const edge=node('rect',{x:side==='left'?x+width-3.2:x,y:35,width:3.2,height:183,fill:'url(#'+contact.id+')'});if(side==='left')edge.setAttribute('transform','translate('+(2*(x+width)-3.2)+' 0) scale(-1 1)');walls.append(edge);
  }
  // Small contact shadows stay entirely inside plaster, behind the woodwork.
  walls.append(node('path',{d:'M0 35H57.35V38H0Z M342.65 35H400V38H342.65Z',fill:tone.dark,opacity:'.10'}));svg.append(walls);
  return [...svg.childNodes].map(n=>new XMLSerializer().serializeToString(n)).join('');
 }
 globalThis.SceneryMaterials=Object.freeze({...material,art});
 globalThis.SolarLighting=Object.freeze({...lighting,place});
 globalThis.EngawaInteriorStudy=Object.freeze({...interior,header});
 const wallStates=new WeakMap();
 function syncWalls(stage,w){
  const shoji=stage.querySelector('.engawa-shoji');if(!shoji?.querySelector('[data-tatami-wall-plaster]'))return;
  const stamp=[Math.floor(SolarModel.time(w)/60000),w.season,w.weather].join(':');if(wallStates.get(stage)===stamp)return;
  const doc=parse('<svg xmlns="'+ns+'">'+header(w,'wall-refresh')+'</svg>'),anchor=shoji.querySelector(':scope > .engawa-shoji-assembly');
  shoji.querySelectorAll(':scope > [data-tatami-wall-defs],:scope > [data-tatami-wall-plaster],:scope > [data-tatami-wall-lintel]').forEach(n=>n.remove());
  for(const n of doc.documentElement.querySelectorAll(':scope > [data-tatami-wall-defs],:scope > [data-tatami-wall-plaster],:scope > [data-tatami-wall-lintel]'))shoji.insertBefore(document.importNode(n,true),anchor);
  wallStates.set(stage,stamp);
 }
 function update(stage,where,w){const pending=backgrounds.update(stage,where,w);if(where==='engawa')syncWalls(stage,w);return pending;}
 // Follow the app's existing clock. No extra timer, observer or UI handler.
 globalThis.RoomBackgrounds=Object.freeze({...backgrounds,update});
 return Object.freeze({art,header,project,mats:mats.map(m=>Object.freeze(m.slice())),heri,version:1});
})();
