import {fileURLToPath} from 'node:url';
import path from 'node:path';
export async function publish({repository=process.env.GITHUB_REPOSITORY,token=process.env.GITHUB_TOKEN,expectedCommit=process.env.CANBAS_COMMIT,fetchImpl=fetch,sleep=ms=>new Promise(r=>setTimeout(r,ms)),attempts=36}={}){
  if(!repository||!/^[\w.-]+\/[\w.-]+$/.test(repository)||!token||!/^[a-f0-9]{40}$/.test(expectedCommit||''))throw Error('公開に必要な設定を確認できません。');
  const base=`https://api.github.com/repos/${repository}`,headers={Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','User-Agent':'canbas-monitor'};
  async function request(suffix,method='GET'){const response=await fetchImpl(base+suffix,{method,headers,signal:AbortSignal.timeout(25000)});if(!response.ok)throw Error(`Pages公開確認に失敗しました（HTTP ${response.status}）。`);return response.json();}
  const pages=await request('/pages');
  if(pages.build_type!=='legacy'||pages.source?.branch!=='main'||pages.source?.path!=='/')throw Error('Pagesの既存公開設定が変更されています。自動的な設定変更は行いません。');
  await request('/pages/builds','POST');
  for(let i=0;i<attempts;i++){
    await sleep(10000);const build=await request('/pages/builds/latest');
    if(build.commit===expectedCommit&&build.status==='built')return {status:'built',commit:build.commit};
    if(build.commit===expectedCommit&&build.status==='errored')throw Error('GitHub Pagesの再公開が失敗しました。');
  }throw Error('GitHub Pagesの再公開完了を制限時間内に確認できませんでした。');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))try{console.log(JSON.stringify(await publish()));}catch(e){console.error(e.message);process.exitCode=1;}
