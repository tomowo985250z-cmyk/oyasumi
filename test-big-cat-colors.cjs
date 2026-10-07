const assert=require('node:assert/strict'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const {chromium,webkit}=require(process.env.OYASUMI_PLAYWRIGHT||'playwright');
require('./wild-cat-assets.js');require('./cat-faces.js');
const server=require('node:child_process').spawn(process.execPath,['server.js'],{stdio:'ignore',env:{...process.env,PORT:'3017'}});
(async()=>{
 const baseline=execFileSync('git',['show','25201b1:style.css'],{encoding:'utf8'}),updated=fs.readFileSync('style.css','utf8');
 for(const engine of ['chromium','webkit']){
  const browser=await (engine==='chromium'?chromium.launch({executablePath:process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true}):webkit.launch());
  try{
   const page=await browser.newPage({viewport:{width:1000,height:720}});
   for(const light of [false,true])for(const context of ['mini-row','profile-banner','public-profile-face','expression-choice']){
    const markup=CatFaces.coats.flatMap(c=>CatFaces.options.flatMap(e=>['peach','lilac','slate',''].map(color=>`<div class="${context}"><span class="avatar ${color}">${CatFaces.svg(e.id,c.id)}</span></div>`))).join('');
    await page.setContent(`<style id="theme">${baseline}</style><body class="${light?'light-mode':''}">${markup}</body>`);
    const measure=()=>page.locator('.avatar').evaluateAll(els=>els.map(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return {coat:el.firstElementChild.dataset.catCoat,bg:s.backgroundColor,border:s.borderTopColor,width:r.width,height:r.height,thickness:s.borderTopWidth,round:s.borderRadius};}));
    const before=await measure();await page.locator('#theme').evaluate((el,css)=>{el.textContent=css;},updated);const after=await measure();
    for(let i=0;i<after.length;i++){
     const current=after[i];if(!CatFaces.isBig(current.coat)){assert.deepEqual(current,before[i]);continue;}
     assert.equal(current.bg,'rgb(45, 113, 159)');assert.equal(current.border,'rgb(255, 168, 79)');
     assert.deepEqual({...current,bg:before[i].bg,border:before[i].border},before[i]);assert.equal(current.width,current.height);assert.equal(current.round,'50%');
    }
   }
   for(const width of [320,375,390,430]){
    await page.setViewportSize({width,height:620});
    await page.setContent(`<style>${updated}</style><body style="display:block;padding:12px"><div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px">${CatFaces.groups.find(g=>g.id==='big').coats.flatMap(c=>CatFaces.options.map(e=>`<span class="avatar peach" style="width:100%;height:auto;aspect-ratio:1">${CatFaces.svg(e.id,c.id).replace('href="assets/','href="http://127.0.0.1:3017/assets/')}</span>`)).join('')}</div></body>`);
    await page.locator('svg image').evaluateAll(els=>Promise.all(els.map(el=>{const image=new Image();image.src=el.getAttribute('href');return image.decode();})));
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:`test-results/big-cat-colors-${engine}-${width}.png`});
   }
  }finally{await browser.close();}
 }
 console.log('PASS big cat colors: 24 faces, all avatar color variants, four contexts, dark/light in Chromium/WebKit; basic/wild computed styles and all dimensions unchanged; 320/375/390/430px.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.kill());
