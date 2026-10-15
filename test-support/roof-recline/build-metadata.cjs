const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const {webkit}=require(process.env.OYASUMI_PLAYWRIGHT_PATH||'../../output/webkit-tools/core/package');const root=path.resolve(__dirname,'../..'),port=9450,base=`http://127.0.0.1:${port}/`;
const coats=fs.readdirSync(path.join(root,'assets/roof-cats-v2')).filter(f=>/^[a-z-]+\.png$/.test(f)).map(f=>f.slice(0,-4)).sort();
const server=spawn(process.execPath,['server.js'],{cwd:root,env:{...process.env,PORT:String(port)},windowsHide:true,stdio:'ignore'});let browser;
(async()=>{try{
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await webkit.launch();const page=await browser.newPage();await page.route(base,r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html></html>'}));await page.goto(base);
 const measurements=await page.evaluate(async coats=>{
  const rows=[];
  for(const coat of coats){const row={coat};for(const pose of ['seated','reclining']){
   const img=new Image();img.src=`assets/${pose==='seated'?'roof-cats-v2':'roof-recline-v1'}/${coat}.png`;await img.decode();
   const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const {data}=ctx.getImageData(0,0,canvas.width,canvas.height);
   let bottom=0,transparent=0;for(let y=0;y<canvas.height;y++){let solid=0;for(let x=0;x<canvas.width;x++){const alpha=data[(y*canvas.width+x)*4+3];if(alpha>=128)solid++;if(alpha===0)transparent++;}if(solid>=canvas.width*.03)bottom=y+1;}
   if(transparent<canvas.width*canvas.height*.08)throw Error(coat+'/'+pose+' must be transparent');
   row[pose]=[canvas.width,canvas.height,bottom/canvas.height];
  }rows.push(row);}return rows;
 },coats);
 const manifest=measurements.map(row=>{const file=`assets/roof-recline-v1/${row.coat}.png`;return {...row,file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')};});
 fs.writeFileSync(path.join(root,'assets/roof-recline-v1/manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log('PASS metadata: '+manifest.length+' reclining + seated alpha footprints measured, genuine transparency preserved.');
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
