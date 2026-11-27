import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {once} from 'node:events';
import {createBackupServer} from './backup-api.mjs';
import {createRefreshingJwtAuthenticator} from './backup-jwks.mjs';
import {createGcsObjectStore} from './gcs-objects.mjs';
import {createCloudBackupStore,replicateCloudTenant} from './cloud-backup-store.mjs';
/** A trusted deployment-side token file is rotated by a workload-identity agent.
 * It is never in the repository, project payload, browser or HTTP response. */
export function tokenFileSupplier(path){
 if(typeof path!=='string'||!path.length)throw Error('Access token file required');
 return async()=>{const bytes=await readFile(path);if(bytes.length>8192)throw Error('Access token exceeds limit');const token=new TextDecoder('utf-8',{fatal:true}).decode(bytes).trim();if(!token||/[\x00-\x20\x7f]/.test(token))throw Error('Invalid access token file');return token;};
}
export async function loadCloudConfig(path){
 if(typeof path!=='string'||!path.length)throw Error('Configuration file required');
 const bytes=await readFile(path);if(bytes.length>262144)throw Error('Configuration exceeds limit');
 const cfg=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 if(!cfg||typeof cfg!=='object'||Array.isArray(cfg))throw Error('Invalid cloud configuration');
 return cfg;
}
export function buildCloudService(cfg,{fetcher=fetch,accessToken=tokenFileSupplier(cfg.tokenFile)}={}){
 const identity=createRefreshingJwtAuthenticator({issuer:cfg.issuer,audience:cfg.audience,jwksUrl:cfg.jwksUrl,subjects:cfg.subjects,fetcher});
 const objects=createGcsObjectStore({bucket:cfg.bucket,accessToken,fetcher});
 const store=createCloudBackupStore(objects);
 return {server:createBackupServer({store,authenticate:identity.authenticate}),identity,store};
}
async function main(){
 const cfg=await loadCloudConfig(process.argv[2]);
 if(!Number.isSafeInteger(cfg.port)||cfg.port<1024||cfg.port>65535)throw Error('Invalid private service port');
 const {server,identity}=buildCloudService(cfg);
 if(!await identity.refresh())throw Error('Trusted identity keys could not be loaded');
 server.listen(cfg.port,'127.0.0.1');await once(server,'listening');
 console.log('Game Studio backup service listening on private loopback');
 const stop=()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),10000).unref();};
 process.once('SIGTERM',stop);process.once('SIGINT',stop);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(()=>{console.error('Cloud backup service startup failed; check private configuration and identity provider');process.exitCode=1;});
/** Explicit operator operation; never exposed to a tenant HTTP client. */
export async function replicateConfiguredTenant(cfg,tenant){
 if(cfg.sourceBucket===cfg.destinationBucket)throw Error('Source and recovery buckets must be distinct');
 const source=createGcsObjectStore({bucket:cfg.sourceBucket,accessToken:tokenFileSupplier(cfg.sourceTokenFile)});
 const destination=createGcsObjectStore({bucket:cfg.destinationBucket,accessToken:tokenFileSupplier(cfg.destinationTokenFile)});
 return replicateCloudTenant(source,destination,tenant);
}
