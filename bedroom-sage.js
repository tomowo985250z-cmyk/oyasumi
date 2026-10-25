// Isolated bedroom comparison: existing production lighting remains installed.
// The room selects one replacement RGB filter, never a stack of ambient filters.
globalThis.BedroomSageStudy=(()=>{
 const solar=SolarLighting,backgrounds=RoomBackgrounds,entries=new WeakMap(),ns='http://www.w3.org/2000/svg';let serial=0;
 const round=n=>Number(n.toFixed(5));
 const element=(tag,attrs={})=>{const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
 function install(stage){
  let e=entries.get(stage);if(e)return e;
  const svg=element('svg',{'data-bedroom-sage-defs':'','aria-hidden':'true',focusable:'false',width:0,height:0,style:'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none'}),defs=element('defs'),id='bedroom-sage-'+(++serial),filters={};svg.append(defs);
  for(const mode of ['ambient','shade','lamp']){
   const f=element('filter',{id:id+'-'+mode,x:0,y:0,width:'100%',height:'100%','color-interpolation-filters':'sRGB'}),saturation=element('feColorMatrix',{type:'saturate',values:1}),rgb=element('feComponentTransfer');
   for(const c of ['R','G','B'])rgb.append(element('feFunc'+c,{type:'linear',slope:1,intercept:0}));f.append(saturation,rgb);defs.append(f);filters[mode]={saturation,rgb};stage.style.setProperty('--bedroom-sage-'+mode,'url("#'+f.id+'")');
  }
  // Map the two existing daytime cloth bases to #B8BEA5. Existing folds,
  // night/lamp palette, alpha, shapes and open/close transforms remain native.
  for(const[side,ratios]of Object.entries({left:[184/211,190/210,165/198],right:[184/192,190/197,165/191]})){
   const f=element('filter',{id:id+'-'+side,x:'-5%',y:'-5%',width:'110%',height:'110%','color-interpolation-filters':'sRGB'}),rgb=element('feComponentTransfer');
   for(const[i,c]of ['R','G','B'].entries())rgb.append(element('feFunc'+c,{type:'linear',slope:ratios[i]}));f.append(rgb);defs.append(f);stage.style.setProperty('--bedroom-sage-'+side,'url("#'+f.id+'")');
  }
  stage.append(svg);stage.dataset.bedroomSage='1';e={svg,filters,stamp:null,parameters:{}};entries.set(stage,e);return e;
 }
 function apply(stage,value){
  if(!stage?.isConnected||stage.dataset.location!=='room')return;
  const bg=stage.querySelector('.room-background-layer:not([data-background-outgoing])'),w=value||{at:+bg?.dataset.lightAt,season:bg?.dataset.lightSeason,weather:bg?.dataset.lightWeather};
  if(!Number.isFinite(SolarModel.time(w)))return;
  const e=install(stage),stamp=[Math.floor(SolarModel.time(w)/60000),w.season,w.weather].join(':');if(e.stamp===stamp)return;
  const night=SolarModel.weights(SolarModel.time(w)).night||0;
  for(const mode of ['ambient','shade','lamp']){
   const p=CatLightHarmony.parameters(w,'room',mode); // Adopted seasonal, moon, shade and lamp response.
   p[0]+=-.002*(1-night)+.004*night;p[1]-=.008;p[2]-=.012;
   const f=e.filters[mode];f.saturation.setAttribute('values',round(p[1]));
   for(const[i,n]of [...f.rgb.children].entries()){n.setAttribute('slope',round(p[0]*p[2]*p[i+3]));n.setAttribute('intercept',round(p[0]*(1-p[2])*.46));}
   e.parameters[mode]=p.map(round);
  }
  stage.style.setProperty('--bedroom-sage-contact-opacity',round(.195-.05*night));e.stamp=stamp;
 }
 globalThis.SolarLighting=Object.freeze({...solar,update(stage,w){const result=solar.update(stage,w);apply(stage,w);return result;}});
 globalThis.RoomBackgrounds=Object.freeze({...backgrounds,update(stage,where,w){const result=backgrounds.update(stage,where,w);apply(stage,w);return result;}});
 return Object.freeze({apply,inspect(stage){const e=entries.get(stage);return e?{stamp:e.stamp,parameters:e.parameters,filters:e.svg.querySelectorAll('filter').length}:null;}});
})();
