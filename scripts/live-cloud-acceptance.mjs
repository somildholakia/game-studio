import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {loadCloudConfig,tokenFileSupplier} from '../server/cloud-service.mjs';
import {createGcsObjectStore} from '../server/gcs-objects.mjs';
import {createCloudBackupStore,replicateCloudTenant} from '../server/cloud-backup-store.mjs';
if(process.env.GAME_STUDIO_LIVE_CLOUD!=='1'){console.error('Explicit live cloud acceptance opt-in required');process.exit(2);}
try{
 const cfg=await loadCloudConfig(process.argv[2]);
 if(!Array.isArray(cfg.buckets)||cfg.buckets.length!==3||new Set(cfg.buckets.map(x=>x.bucket)).size!==3)throw Error('Three separate provisioned buckets required');
 const [primary,secondary,replacement]=cfg.buckets.map(x=>createGcsObjectStore({bucket:x.bucket,accessToken:tokenFileSupplier(x.tokenFile)}));
 const tenant='acceptance-'+randomBytes(12).toString('hex'),project='synthetic-game',store=createCloudBackupStore(primary);
 const first=Buffer.from('{"version":1,"name":"Synthetic initial"}'),second=Buffer.from('{"version":1,"name":"Synthetic revised"}');
 const a=await store.append(tenant,project,0,first);await store.append(tenant,project,1,second);
 await assert.rejects(store.append(tenant,project,1,first),e=>e.status===409);
 const copy=await replicateCloudTenant(primary,secondary,tenant);
 // Recovery has no dependency on the primary adapter or credentials.
 const restored=await replicateCloudTenant(secondary,replacement,tenant);
 const recovered=createCloudBackupStore(replacement);
 assert.deepEqual((await recovered.read(tenant,project,1)).bytes,first);assert.deepEqual((await recovered.read(tenant,project,2)).bytes,second);
 assert.deepEqual(await recovered.restore(tenant,project,1,2),{revision:3,sha:a.sha});
 console.log(JSON.stringify({scope:'live-google-cloud-storage',status:'passed',tenant,copy,restored,verifiedRevisions:3}));
}catch{console.error('Live cloud acceptance failed; no success evidence claimed');process.exitCode=1;}
