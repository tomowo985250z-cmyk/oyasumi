import {publishKringle} from '../../kringle/scripts/pages-build.mjs';
try{console.log(JSON.stringify(await publishKringle({expectedCommit:process.env.CANBAS_COMMIT})));}catch(e){console.error(e.message);process.exitCode=1;}
