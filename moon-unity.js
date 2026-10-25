// Shared lunar material reuses the existing clock, silhouette and viewing geometry.
globalThis.MoonUnity=(()=>{
 const baseSky=SolarSky,baseMoon=RoofMoon,entries=new WeakMap();let queued=false;
 function strength(w,where,closed=false){const at=SolarModel.time(w),m=RoofMoon.snapshot(at),night=SolarModel.twilight(at,where).stars,weather=w.weather==='rainy'?.10:w.weather==='cloudy'?.42:1;const phase=Math.sqrt(m.illumination),above=SolarModel.smooth(0,12,m.altitude)*m.opacity,lunar=SolarModel.smooth(.001,.02,m.illumination);return (where==='room'?.035:where==='engawa'?.045:.05)*night*above*weather*(.38+.95*phase)*lunar*(closed?.18:1);}
 function visible(el){const r=el.getBoundingClientRect();return el.isConnected&&!document.hidden&&r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth;}
 function sync(stage,w){if(document.hidden)return;const where=stage.dataset.location;if(!['room','engawa','garden'].includes(where)||stage.hasAttribute('data-room-preferences-pending'))return;const frame=where==='room'?'window':where,moon=RoofMoon.snapshot(SolarModel.time(w));
  for(const element of stage.querySelectorAll('.room-window-moon')){const view=SolarModel.facing({azimuth:moon.azimuth,altitude:moon.altitude,altitudeUsed:moon.altitude},frame);const available=()=>visible(stage)&&view.inView&&moon.opacity>0&&moon.illumination>.001&&stage.querySelector('.room-resident img')?.naturalWidth>0;baseMoon.detailElement(element,available);baseMoon.update(element,SolarModel.time(w));}
  let entry=entries.get(stage);if(!entry){const layer=document.createElement('div');layer.className='moon-ambient-light';layer.setAttribute('aria-hidden','true');stage.append(layer);entry={layer};entries.set(stage,entry);}
  const closed=where==='room'?stage.dataset.curtainClosed==='true':where==='engawa'&&stage.dataset.shojiClosed==='true',alpha=strength(w,where,closed),value=alpha.toFixed(5);entry.layer.hidden=alpha<=0;if(entry.layer.style.opacity!==value)entry.layer.style.opacity=value;entry.layer.dataset.moonIllumination=moon.illumination.toFixed(5);
 }
 function all(){if(document.hidden)return;for(const stage of document.querySelectorAll('.day-room'))sync(stage,DayRoom.world());for(const moon of document.querySelectorAll('.roof-moon'))baseMoon.update(moon,NightClock.now());}
 function request(){if(queued||document.hidden)return;queued=true;requestAnimationFrame(()=>{queued=false;all();});}
 globalThis.SolarSky=Object.freeze({...baseSky,update(stage,w){baseSky.update(stage,w);sync(stage,w);}});
 function start(){new MutationObserver(rows=>{if(rows.some(r=>!r.target.closest?.('.moon-ambient-light,[data-moon-material],.room-window-moon,.roof-moon')))request();}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['data-location','data-world-season','data-world-daylight','data-shoji-closed','data-curtain-closed']});document.addEventListener('scroll',request,{passive:true,capture:true});document.addEventListener('visibilitychange',request);window.addEventListener('resize',request);request();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 return Object.freeze({sync,all,strength,material:baseMoon.material});
})();
