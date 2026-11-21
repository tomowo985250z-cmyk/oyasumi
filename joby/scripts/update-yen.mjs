import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {previousSession,correspondingFX,validReference} from '../yen-model.mjs';
export async function updateYen(previous={},fetchImpl=fetch,at=new Date().toISOString()){
  const references=Array.isArray(previous.references)?previous.references.filter(validReference):[];
  async function get(url){const r=await fetchImpl(url,{headers:{Accept:'application/json','User-Agent':'OyasumiMonitor/1.0'},signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('公開データ HTTP '+r.status);return r.json();}
  try{
    const stockURL='https://query1.finance.yahoo.com/v8/finance/chart/JOBY?interval=1h&range=5d';
    const prior=previousSession(await get(stockURL),at),second=Date.parse(prior.previousCloseAt)/1000;
    const fxURL='https://query1.finance.yahoo.com/v8/finance/chart/JPY%3DX?interval=1m&period1='+second+'&period2='+(second+60);
    const fx=correspondingFX(await get(fxURL),prior.previousCloseAt);
    const reference={...prior,...fx,stockRetrievedAt:at,fxRetrievedAt:at,stockSourceURL:stockURL,fxSourceURL:fxURL};
    return {version:1,result:'success',lastAttemptAt:at,lastSuccessAt:at,error:null,references:[...references.filter(r=>r.sessionDate!==reference.sessionDate),reference].sort((a,b)=>a.sessionDate.localeCompare(b.sessionDate)).slice(-30)};
  }catch(e){return {version:1,result:'failed',lastAttemptAt:at,lastSuccessAt:previous.lastSuccessAt??null,error:String(e.message).slice(0,200),references};}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const file=new URL('../data/yen-reference.json',import.meta.url);let old={};try{old=JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
  const data=await updateYen(old);await writeFile(file,JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify({result:data.result,lastSuccessAt:data.lastSuccessAt,latest:data.references.at(-1),error:data.error}));if(data.result!=='success')process.exitCode=1;
}
