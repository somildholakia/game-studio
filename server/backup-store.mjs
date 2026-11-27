import {createHash,randomBytes} from 'node:crypto';
import {mkdirSync,readdirSync,readFileSync,openSync,writeFileSync,fsyncSync,closeSync,linkSync,unlinkSync} from 'node:fs';
import {join,resolve} from 'node:path';
const idPattern=/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;
const revisionPattern=/^([0-9]{4})-([a-f0-9]{64})\.json$/;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export class BackupError extends Error{constructor(status,message){super(message);this.status=status;}}
function reject(status,message){throw new BackupError(status,message);}
function id(value){if(typeof value!=='string'||!idPattern.test(value))reject(400,'Invalid identifier');return value;}
function syncDirectory(path){const fd=openSync(path,'r');try{fsyncSync(fd);}finally{closeSync(fd);}}
function directory(path){mkdirSync(path,{mode:0o700,recursive:true});return path;}
function entries(path){try{return readdirSync(path,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return [];throw e;}}
function records(path){const found=entries(path).filter(e=>e.isFile()&&revisionPattern.test(e.name)).map(e=>{const [,number,sha]=revisionPattern.exec(e.name);return {revision:Number(number),sha,file:e.name};}).sort((a,b)=>a.revision-b.revision);if(found.some((r,i)=>r.revision!==i+1))reject(500,'Backup history is inconsistent');return found;}
/** Single-process, dedicated Linux filesystem reference adapter. Root must be private to the service account. */
export function createBackupStore(root,{maxBytes=10_000_000,maxProjects=16,maxVersions=16}={}){
 if(![maxBytes,maxProjects,maxVersions].every(n=>Number.isSafeInteger(n)&&n>0)||maxVersions>9999)throw Error('Invalid backup quotas');
 const base=directory(resolve(root));
 function paths(tenant,project){const parent=join(base,id(tenant));return {parent,path:join(parent,id(project))};}
 function readRecord(path,record){if(!record)reject(404,'Backup revision not found');const bytes=readFileSync(join(path,record.file));if(bytes.length>maxBytes||digest(bytes)!==record.sha)reject(500,'Backup integrity check failed');return {revision:record.revision,sha:record.sha,bytes};}
 function append(tenant,project,expected,bytes){
  const {parent,path}=paths(tenant,project);if(!Number.isSafeInteger(expected)||expected<0)reject(400,'Invalid expected revision');
  if(!Buffer.isBuffer(bytes)||bytes.length===0||bytes.length>maxBytes)reject(413,'Invalid backup size');
  const history=records(path);if(expected!==history.length)reject(409,'Backup revision conflict');
  if(history.length>=maxVersions)reject(429,'Backup revision quota reached');
  const projects=entries(parent).filter(e=>e.isDirectory());
  if(!history.length&&!projects.some(e=>e.name===project)&&projects.length>=maxProjects)reject(429,'Backup project quota reached');
  directory(parent);directory(path);syncDirectory(base);syncDirectory(parent);
  const revision=expected+1,sha=digest(bytes),file=String(revision).padStart(4,'0')+'-'+sha+'.json';
  const temp=join(path,'.tmp-'+randomBytes(16).toString('hex'));let fd;
  try{fd=openSync(temp,'wx',0o600);writeFileSync(fd,bytes);fsyncSync(fd);closeSync(fd);fd=undefined;linkSync(temp,join(path,file));syncDirectory(path);}
  finally{if(fd!==undefined)closeSync(fd);try{unlinkSync(temp);}catch(e){if(e.code!=='ENOENT')throw e;}}
  return {revision,sha};
 }
 return {append,list(tenant,project){return records(paths(tenant,project).path).map(({revision,sha})=>({revision,sha}));},read(tenant,project,revision){if(!Number.isSafeInteger(revision)||revision<1)reject(400,'Invalid revision');const {path}=paths(tenant,project);return readRecord(path,records(path).find(r=>r.revision===revision));},restore(tenant,project,revision,expected){const {path}=paths(tenant,project);if(!Number.isSafeInteger(revision)||revision<1)reject(400,'Invalid revision');const source=readRecord(path,records(path).find(r=>r.revision===revision));return append(tenant,project,expected,source.bytes);}};
}
