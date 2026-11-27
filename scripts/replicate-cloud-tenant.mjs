import {loadCloudConfig,replicateConfiguredTenant} from '../server/cloud-service.mjs';
try{
 if(process.argv.length!==4)throw Error('Expected configuration and tenant');
 const cfg=await loadCloudConfig(process.argv[2]);const result=await replicateConfiguredTenant(cfg,process.argv[3]);console.log(JSON.stringify({status:'verified-copy',...result}));
}catch{console.error('Replication failed; no new index is intentionally published before verification. Inspect the trusted storage configuration and destination history.');process.exitCode=1;}
