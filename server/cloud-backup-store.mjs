import {createHash} from 'node:crypto';
import {BackupError} from './backup-store.mjs';
const ident=/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;
const shaPattern=/^[a-f0-9]{64}$/;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
function fail(status,message){throw new BackupError(status,message);}
function id(v){if(typeof v!=='string'||!ident.test(v))fail(400,'Invalid identifier');return v;}
function validRevision(v){if(!Number.isSafeInteger(v)||v<1)fail(400,'Invalid revision');}
const indexKey=tenant=>'studio/'+id(tenant)+'/index.json';
const blobKey=(tenant,project,hash)=>'studio/'+id(tenant)+'/'+id(project)+'/blobs/'+hash+'.json';
const MAX_INDEX=128000;
function options({maxBytes=10_000_000,maxProjects=16,maxVersions=16}={}){
 if(!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>10_000_000||!Number.isSafeInteger(maxProjects)||maxProjects<1||maxProjects>16||!Number.isSafeInteger(maxVersions)||maxVersions<1||maxVersions>16)throw Error('Invalid cloud backup quotas');return {maxBytes,maxProjects,maxVersions};
}
function parseIndex(bytes,limits){
 try{
  const raw=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(raw?.version!==1||!Array.isArray(raw.projects)||raw.projects.length>limits.maxProjects)throw Error();
  const projects=new Map();for(const p of raw.projects){if(!p||typeof p.id!=='string'||!ident.test(p.id)||projects.has(p.id)||!Array.isArray(p.revisions)||p.revisions.length<1||p.revisions.length>limits.maxVersions)throw Error();
   projects.set(p.id,p.revisions.map((r,i)=>{if(!r||r.revision!==i+1||typeof r.sha!=='string'||!shaPattern.test(r.sha)||!Number.isSafeInteger(r.size)||r.size<1||r.size>limits.maxBytes)throw Error();return {revision:r.revision,sha:r.sha,size:r.size};}));
  }return projects;
 }catch{fail(500,'Cloud backup index is invalid');}
}
const encode=projects=>Buffer.from(JSON.stringify({version:1,projects:[...projects].map(([id,revisions])=>({id,revisions}))}));
async function index(objects,tenant,limits){const record=await objects.get(indexKey(tenant),MAX_INDEX);return record?{projects:parseIndex(record.bytes,limits),version:record.version}:{projects:new Map(),version:null};}
async function readBlob(objects,tenant,project,record,limits){
 const result=await objects.get(blobKey(tenant,project,record.sha),limits.maxBytes);
 if(!result||result.bytes.length!==record.size||sha(result.bytes)!==record.sha)fail(500,'Cloud backup integrity check failed');
 return result.bytes;
}
async function ensureBlob(objects,tenant,project,record,bytes,limits){
 await objects.put(blobKey(tenant,project,record.sha),bytes,null);await readBlob(objects,tenant,project,record,limits);
}
/** Async, generation-CAS object storage adapter; one tenant index atomically governs project/version quotas.
 * Unreferenced content from failed concurrent writes is possible; the operator owns retention and garbage collection. */
export function createCloudBackupStore(objects,config={}){
 const limits=options(config);
 async function append(tenant,project,expected,bytes){
  id(tenant);id(project);
  if(!Number.isSafeInteger(expected)||expected<0)fail(400,'Invalid expected revision');
  if(!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>limits.maxBytes)fail(413,'Invalid backup size');
  bytes=Buffer.from(bytes);const record={revision:expected+1,sha:sha(bytes),size:bytes.length};
  for(let attempt=0;attempt<4;attempt++){
   const {projects,version}=await index(objects,tenant,limits),history=projects.get(project)??[];
   if(history.length!==expected)fail(409,'Backup revision conflict');
   if(history.length>=limits.maxVersions||(!history.length&&projects.size>=limits.maxProjects))fail(429,'Cloud backup quota reached');
   await ensureBlob(objects,tenant,project,record,bytes,limits);
   projects.set(project,[...history,record]);
   if(await objects.put(indexKey(tenant),encode(projects),version))return {revision:record.revision,sha:record.sha};
  }fail(409,'Concurrent backup update; retry after refreshing');
 }
 async function read(tenant,project,revision){
  id(project);validRevision(revision);
  const {projects}=await index(objects,tenant,limits),record=projects.get(project)?.[revision-1];if(!record)fail(404,'Backup revision not found');
  return {revision,sha:record.sha,bytes:await readBlob(objects,tenant,project,record,limits)};
 }
 return {append,read,async list(tenant,project){id(project);const {projects}=await index(objects,tenant,limits);return (projects.get(project)??[]).map(({revision,sha})=>({revision,sha}));},async restore(tenant,project,revision,expected){const source=await read(tenant,project,revision);return append(tenant,project,expected,source.bytes);}};
}
/** Operator-only separate-storage copy of one consistent source tenant index.
 * Never overwrites divergent history; destination is published only after every referenced blob verifies. */
export async function replicateCloudTenant(source,destination,tenant,config={}){
 if(source===destination)throw Error('Separate object stores are required');
 const limits=options(config),snapshot=await index(source,tenant,limits),target=await index(destination,tenant,limits);
 for(const [project,history] of target.projects){const original=snapshot.projects.get(project);if(!original||history.length>original.length||history.some((r,i)=>r.sha!==original[i].sha||r.size!==original[i].size))fail(409,'Destination backup history diverged');}
 let revisions=0,bytes=0;
 for(const [project,history] of snapshot.projects)for(const r of history){const data=await readBlob(source,tenant,project,r,limits);await ensureBlob(destination,tenant,project,r,data,limits);revisions++;bytes+=data.length;}
 if(!await destination.put(indexKey(tenant),encode(snapshot.projects),target.version))fail(409,'Destination changed during replication');
 return {projects:snapshot.projects.size,revisions,bytes};
}
