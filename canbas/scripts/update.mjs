import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {retrieve,hash,changes,SourceError} from './ctis.mjs';
import {TRIAL_ID,totals} from '../model.mjs';
const defaultDirectory=fileURLToPath(new URL('../data/',import.meta.url));
async function read(file){try{return JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw new SourceError('saved_data','保存済み情報を正常に読み取れません。');}}
async function write(file,value){await fs.mkdir(path.dirname(file),{recursive:true});const temporary=file+'.tmp';await fs.writeFile(temporary,JSON.stringify(value,null,2)+'\n');await fs.rename(temporary,file);}
export async function update({directory=defaultDirectory,fetchImpl=fetch,now=new Date()}={}){
  const attemptedAt=now.toISOString(),snapshotFile=path.join(directory,'trial.json'),statusFile=path.join(directory,'status.json');let previous=null,oldStatus=null;
  try{
    previous=await read(snapshotFile);oldStatus=await read(statusFile);
    if(previous&&(previous.schemaVersion!==1||previous.record?.trialId!==TRIAL_ID||previous.snapshotHash!==hash(previous.record)))throw new SourceError('saved_data','保存済み治験情報の整合性を確認できません。');
    const record=await retrieve(fetchImpl),snapshotHash=hash(record),dataResult=!previous?'initial':previous.snapshotHash===snapshotHash?'unchanged':'changed';
    const snapshot=dataResult==='unchanged'?previous:{schemaVersion:1,snapshotHash,observedAt:attemptedAt,comparison:{previousSuccessAt:previous?(oldStatus?.lastSuccessAt||previous.observedAt):null,previousSnapshotHash:previous?.snapshotHash||null,changes:previous?changes(previous.record,record):[]},record};
    const status={schemaVersion:1,lastAttemptAt:attemptedAt,lastSuccessAt:attemptedAt,result:'success',dataResult,snapshotHash,error:null};
    if(dataResult!=='unchanged')await write(snapshotFile,snapshot);
    await write(statusFile,status);
    return {ok:true,dataResult,snapshot,status,totals:totals(record)};
  }catch(error){
    const status={schemaVersion:1,lastAttemptAt:attemptedAt,lastSuccessAt:oldStatus?.lastSuccessAt||previous?.observedAt||null,result:'failed',dataResult:null,snapshotHash:previous?.snapshotHash||null,error:{code:error instanceof SourceError?error.code:'update_error',message:error instanceof SourceError?error.message:'情報の更新を完了できませんでした。'}};
    await write(statusFile,status);
    return {ok:false,status};
  }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=await update();if(result.ok)console.log(JSON.stringify({result:result.dataResult,...result.totals,lastSuccessAt:result.status.lastSuccessAt}));else{console.error(result.status.error.message);process.exitCode=1;}
}
