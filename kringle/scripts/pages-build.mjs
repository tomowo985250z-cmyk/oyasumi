// Reuse the existing stateless Pages publication checks without modifying CanBas.
import {publish} from '../../canbas/scripts/pages-build.mjs';
try{console.log(JSON.stringify(await publish({expectedCommit:process.env.KRINGLE_COMMIT})));}catch(e){console.error(e.message);process.exitCode=1;}
