import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {SOURCES,validateReviewed} from '../model.mjs';
import {retrieve} from './sources.mjs';
const directoryDefault=fileURLToPath(new URL('../data/',import.meta.url));
export const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function read(file){try{return JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw Error('保存済みデータを読み取れません。');}}
async function write(file,value){await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file+'.tmp',JSON.stringify(value,null,2)+'\n');await fs.rename(file+'.tmp',file);}
export function differences(before,after,source,confirmedAt){
 const out=[],old=new Map(before.entries.map(e=>[e.id,e])),fresh=new Map(after.entries.map(e=>[e.id,e]));
 const add=(e,field,a,b,kind='updated')=>out.push({id:hash([source,confirmedAt,e.id,field,a,b]).slice(0,24),source,entityId:e.id,title:e.title,url:e.url,field,before:a??null,after:b??null,kind,confirmedAt});
 for(const e of after.entries){const p=old.get(e.id);if(!p){add(e,'掲載','前回データなし','新たに取得','added');continue;}for(const [label,key] of [['名称','title'],['公式リンク','url']])if(p[key]!==e[key])add(e,label,p[key],e[key]);for(const field of new Set([...Object.keys(p.fields),...Object.keys(e.fields)]))if(JSON.stringify(p.fields[field]??null)!==JSON.stringify(e.fields[field]??null))add(e,field,p.fields[field],e.fields[field]);}
 for(const e of before.entries)if(!fresh.has(e.id))add(e,'掲載','掲載あり','掲載なし','removed');return out;
}
function reviewedRecord(reviewed){return {entries:[...reviewed.events.map(e=>({id:e.id,title:e.title,url:e.source.url,fields:{'日付':e.dateText||e.date,'期間末':e.dateEnd||null,'分類':e.category,'日付区分':e.certainty,'進捗':e.progress,'詳細':e.detail,'出典':e.source.title,'出典ページ':e.source.page,'確認日':e.reviewedAt}})),...reviewed.pipelines.map(p=>({id:'pipeline-'+p.id,title:p.title,url:p.source.url,fields:{'開発段階':p.stage,'段階の状態':p.state,'詳細':p.note,'確認日':p.reviewedAt}}))].sort((a,b)=>a.id.localeCompare(b.id))};}
export async function update({directory=directoryDefault,fetchImpl=fetch,now=new Date(),reviewed,fetchSource=retrieve}={}){
 const at=now.toISOString(),eventsFile=path.join(directory,'events.json'),statusFile=path.join(directory,'status.json'),old=await read(eventsFile),oldStatus=await read(statusFile);
 if(old&&(old.schemaVersion!==1||!old.sources||!Array.isArray(old.history)))throw Error('保存済みデータの形式を確認できません。');
 const data=old?structuredClone(old):{schemaVersion:1,sources:{},reviewed:null,history:[]},status={schemaVersion:1,sources:{}},results=[];let changed=!old;
 const reviewedData=validateReviewed(reviewed||await read(path.join(directory,'reviewed.json')));
 function accept(source,record,extra={}){const prior=data.sources[source],digest=hash(record);if(prior&&prior.hash!==hash(prior.record))throw Error('保存済みデータのハッシュが一致しません。');if(!prior||prior.hash!==digest){const changes=prior?differences(prior.record,record,source,at):[];data.sources[source]={record,hash:digest,observedAt:at,latestChanges:changes.length?changes:prior?.latestChanges||[],...extra};if(changes.length)data.history.push(...changes);else if(!prior)data.history.push({id:hash([source,at]).slice(0,24),source,entityId:source,title:source==='reviewed'?'確認済み資料':SOURCES[source].name,field:'初回記録',before:null,after:'初回の正常データを保存',kind:'baseline',confirmedAt:at,url:source==='reviewed'?SOURCES.ir.url:SOURCES[source].url});changed=true;}return data.sources[source];}
 // Each source is committed independently. A partial failure cannot overwrite
 // another source's good snapshot, nor turn a failed attempt into a success.
 for(const source of Object.keys(SOURCES)){const prior=data.sources[source],health=oldStatus?.sources?.[source];try{const result=await fetchSource(source,{fetchImpl,previous:prior?.record,lastSuccessAt:health?.lastSuccessAt}),entry=accept(source,result.record);status.sources[source]={result:'success',dataResult:!prior?'initial':prior.hash===entry.hash?'unchanged':'changed',lastAttemptAt:at,lastSuccessAt:at,snapshotHash:entry.hash,error:null,coverage:result.coverage};results.push({source,ok:true,entries:entry.record.entries.length});}catch(e){status.sources[source]={result:'failed',dataResult:null,lastAttemptAt:at,lastSuccessAt:health?.lastSuccessAt||prior?.observedAt||null,snapshotHash:prior?.hash||null,error:e.message,coverage:health?.coverage||null};results.push({source,ok:false,error:e.message});}}
 accept('reviewed',reviewedRecord(reviewedData));if(JSON.stringify(data.reviewed)!==JSON.stringify(reviewedData)){data.reviewed=reviewedData;changed=true;}
 if(changed)await write(eventsFile,data);await write(statusFile,status);return {ok:results.every(r=>r.ok),changed,results,data,status};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))try{const result=await update();console.log(JSON.stringify({ok:result.ok,changed:result.changed,sources:result.results}));if(!result.ok)process.exitCode=1;}catch(e){console.error(e.message);process.exitCode=1;}
