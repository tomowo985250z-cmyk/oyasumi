// Check deployments without touching profiles, auth, or local user data.
globalThis.OyasumiUpdates = (() => {
 const current=document.querySelector('meta[name="oyasumi-release"]')?.content;
 let running,lastCheck=0,pending,timer;
 const api={canReload:()=>false,check};
 const url=new URL(location.href);
 if(url.searchParams.get('_oyasumi_release')===current){
  url.searchParams.delete('_oyasumi_release');history.replaceState(null,'',url);
 }
 async function get(url,type) {
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
  try{
   const response=await fetch(url,{cache:'no-store',signal:controller.signal});
   if(!response.ok)throw new Error('Deployment not available');
   return type==='json'?await response.json():await response.text();
  }finally{clearTimeout(timeout);}
 }
 function apply() {
  clearTimeout(timer);
  if(!pending||document.hidden)return;
  if(!api.canReload()){timer=setTimeout(apply,5000);return;}
  try{
   const key='oyasumi-update-attempt';
   if(sessionStorage.getItem(key)===pending)return;
   sessionStorage.setItem(key,pending);
  }catch{return;}
  const target=new URL(location.href);target.searchParams.set('_oyasumi_release',pending);
  location.replace(target.href);
 }
 function check(force=false) {
  if(running)return running;
  if(document.hidden||!current||(!force&&Date.now()-lastCheck<30000))return Promise.resolve();
  lastCheck=Date.now();
  running=(async()=>{
   const manifestUrl=new URL('release.json',location.href);manifestUrl.searchParams.set('check',String(Date.now()));
   const manifest=await get(manifestUrl,'json');
   if(!/^[a-f0-9]{16}$/.test(manifest.release)||manifest.release===current)return;
   // Do not reload while Pages is serving mismatched files during deployment.
   const htmlUrl=new URL('index.html',location.href);htmlUrl.searchParams.set('_oyasumi_release',manifest.release);
   const html=await get(htmlUrl,'text');
   const advertised=new DOMParser().parseFromString(html,'text/html').querySelector('meta[name="oyasumi-release"]')?.content;
   if(advertised!==manifest.release)return;
   pending=manifest.release;apply();
  })().catch(()=>{/* Offline or incomplete deployment: keep the working app. */}).finally(()=>{running=undefined;});
  return running;
 }
 window.addEventListener('pageshow',()=>void check());
 window.addEventListener('focus',()=>void check());
 window.addEventListener('online',()=>void check());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(pending)apply();void check();}});
 void check();return api;
})();
