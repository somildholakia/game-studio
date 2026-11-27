import {once} from 'node:events';
import {pathToFileURL} from 'node:url';
import {createRefreshingJwtAuthenticator} from './backup-jwks.mjs';
import {loadCloudConfig} from './cloud-service.mjs';
import {createMatchmaker,createMatchmakingServer} from './matchmaking.mjs';
import {createRaceMatch} from '../dist-race/raceMatch.js';
export function buildMatchmakingService(config,{fetcher=fetch,autoTick=true,now=()=>performance.now()}={}){
 const identity=createRefreshingJwtAuthenticator({issuer:config.issuer,audience:config.audience,jwksUrl:config.jwksUrl,subjects:config.subjects,purpose:'race',fetcher});
 const matchmaker=createMatchmaker({createMatch:createRaceMatch,courses:config.courses,now});
 const server=createMatchmakingServer({matchmaker,authenticate:identity.authenticate,autoTick});
 return {identity,matchmaker,server};
}
async function main(){
 const config=await loadCloudConfig(process.argv[2]);
 if(!Number.isSafeInteger(config.port)||config.port<1024||config.port>65535)throw Error('Invalid private service port');
 const {server,identity}=buildMatchmakingService(config);
 if(!await identity.refresh())throw Error('Trusted signing keys unavailable');
 server.listen(config.port,'127.0.0.1');await once(server,'listening');console.log('Game Studio matchmaking listening on private loopback');
 const stop=()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),10000).unref();};
 process.once('SIGINT',stop);process.once('SIGTERM',stop);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(()=>{console.error('Matchmaking startup failed; check private identity and course configuration');process.exitCode=1;});
