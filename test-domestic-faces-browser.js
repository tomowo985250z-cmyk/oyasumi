const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawn}=require('node:child_process');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'oyasumi-faces-'));
const server=spawn(process.execPath,['server.js'],{stdio:'ignore'});
const browser=spawn(process.env.EDGE_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=9344',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
let socket;
(async()=>{
 let tabs;for(let i=0;i<60;i++){try{tabs=await(await fetch('http://127.0.0.1:9344/json')).json();break;}catch{await delay(250);}}
 assert(tabs,'Browser started');socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
 let serial=0;const pending=new Map(),errors=[];
 socket.addEventListener('message',e=>{const d=JSON.parse(e.data);if(d.id){const p=pending.get(d.id);pending.delete(d.id);d.error?p.reject(d.error):p.resolve(d.result);}if(d.method==='Runtime.exceptionThrown')errors.push(d.params);});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;};
 await send('Runtime.enable');await send('Page.enable');
 await send('Page.navigate',{url:'http://127.0.0.1:3000/release.json'});await delay(500);
 await evaluate(`document.documentElement.innerHTML='<head><link rel="stylesheet" href="/style.css"></head><body></body>'`);
 for(const file of ['wild-cat-assets.js','cat-faces.js'])await evaluate(fs.readFileSync(file,'utf8'));
 for(const width of [320,375,390,430]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:1,mobile:true});
  await evaluate(`document.body.style.cssText='display:block;min-height:0;margin:0;padding:8px;box-sizing:border-box;width:100%';document.body.innerHTML=CatFaces.coats.map(c=>'<section style="display:block;width:100%;margin-bottom:6px"><p style="margin:0;font-size:12px">'+c.label+'</p><div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:2px">'+CatFaces.options.map(e=>'<div style="min-width:0">'+CatFaces.svg(e.id,c.id)+'</div>').join('')+'</div></section>').join('');document.querySelectorAll('.cat-face').forEach(el=>el.style.cssText='width:100%;height:auto;display:block')`);
  const result=await evaluate(`(async()=>{const images=[...document.querySelectorAll('svg image')];await Promise.all(images.map(el=>new Promise((resolve,reject)=>{const img=new Image();img.onload=resolve;img.onerror=()=>reject(new Error(el.getAttribute('href')));img.src=el.getAttribute('href')})));return {count:images.length,overflow:document.documentElement.scrollWidth>innerWidth,square:[...document.querySelectorAll('svg')].every(el=>{const r=el.getBoundingClientRect();return Math.abs(r.width-r.height)<1})}})()`);
  assert.deepEqual(result,{count:96,overflow:false,square:true});assert(await evaluate(`[...document.querySelectorAll('svg')].every(el=>el.getBoundingClientRect().width>40)`),'Visible image size');await delay(100);
  const shot=await send('Page.captureScreenshot',{format:'png'});fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync(`test-results/domestic-faces-${width}.png`,Buffer.from(shot.data,'base64'));
 }
 assert.deepEqual(errors,[]);console.log('PASS all cat faces browser: all 96 images load; square frames; no overflow at 320/375/390/430px; no runtime errors.');
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{socket?.close();browser.kill();server.kill();});
