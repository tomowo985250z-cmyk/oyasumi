// Reuse existing settings/commit checks; cancelled overlapping builds can leave
// the legacy build endpoint stale even after a successful Pages Actions deploy.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {publish} from '../../canbas/scripts/pages-build.mjs';
export async function publishKringle({expectedCommit=process.env.KRINGLE_COMMIT,fetchImpl=fetch,...options}={}){
 let grace=0,confirmedRun=null;
 const result=await publish({...options,expectedCommit,fetchImpl:async(url,init)=>{
  const response=await fetchImpl(url,init);if(!url.endsWith('/pages/builds/latest')||!response.ok)return response;
  const build=await response.clone().json();if(build.commit!==expectedCommit||build.status!=='errored')return response;
  const runsResponse=await fetchImpl(url.replace('/pages/builds/latest','/actions/runs?per_page=20'),init);if(!runsResponse.ok)return response;
  const runs=(await runsResponse.json()).workflow_runs;if(!Array.isArray(runs))return response;
  const matching=runs.filter(r=>r.name==='pages build and deployment'&&r.head_sha===expectedCommit),success=matching.find(r=>r.status==='completed'&&r.conclusion==='success');
  if(success){confirmedRun=success.id;return new Response(JSON.stringify({...build,status:'built'}));}
  const active=matching.some(r=>r.status!=='completed'),failed=matching.some(r=>r.conclusion==='failure');
  if(active||(!failed&&grace++<6))return new Response(JSON.stringify({...build,status:'building'}));return response;
 }});
 return {...result,...confirmedRun?{confirmedBy:'pages-actions',runId:confirmedRun}:{}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))try{console.log(JSON.stringify(await publishKringle()));}catch(e){console.error(e.message);process.exitCode=1;}
