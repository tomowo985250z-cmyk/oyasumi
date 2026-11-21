import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {INSTRUMENTS,normalizeQuote,recordResult} from './market.mjs';
export async function update(previous={},fetchImpl=fetch,at=new Date().toISOString()) {
  const entries={};
  await Promise.all(Object.entries(INSTRUMENTS).map(async([id,d])=>{
    try {
      const r=await fetchImpl('https://query1.finance.yahoo.com/v8/finance/chart/'+encodeURIComponent(d.symbol)+'?interval=1d&range=5d',{headers:{Accept:'application/json','User-Agent':'OyasumiMonitor/1.0'},signal:AbortSignal.timeout(25000)});
      if (!r.ok) throw Error('株価提供元 HTTP '+r.status);
      const quote=normalizeQuote(await r.json(),id,at);
      entries[id]=recordResult(previous.entries?.[id],id,quote,at);
    } catch(e) { entries[id]=recordResult(previous.entries?.[id],id,null,at,String(e.message).slice(0,200)); }
  }));
  return {version:1,provider:'Yahoo Finance',entries};
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const file=new URL('./data/quotes.json',import.meta.url);let previous={};
  try {previous=JSON.parse(await readFile(file,'utf8'));} catch(e) {if(e.code!=='ENOENT')throw e;}
  const result=await update(previous);await mkdir(new URL('./data/',import.meta.url),{recursive:true});await writeFile(file,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(Object.fromEntries(Object.entries(result.entries).map(([id,e])=>[id,{result:e.result,asOf:e.quote?.asOf??null,error:e.error}]))));
  if(Object.values(result.entries).some(e=>e.result!=='success'))process.exitCode=1;
}
