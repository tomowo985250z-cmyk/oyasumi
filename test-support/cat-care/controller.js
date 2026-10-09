globalThis.CarePreview={async show(coat='calico',kind='meal'){
 CarePreviewData.coat=CatFaces.normalizeCoat(coat);document.querySelectorAll('dialog[open]').forEach(d=>d.close());await new Promise(r=>setTimeout(r,0));await refreshShared();
 go(kind==='meal'?'profile':'timeline');if(kind==='treat')document.querySelector('[data-public-profile]').click();
 await Promise.all([...document.images].map(i=>i.decode()));return true;
}};
ensureConnection().then(()=>{const p=new URLSearchParams(location.search);return CarePreview.show(p.get('coat')||'calico',p.get('kind')||'meal')});