import {parseProject,type Project} from '../core/project';
export type BackupRevision={revision:number;sha:string};
const ident=/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/,hash=/^[a-f0-9]{64}$/;
const MAX_BYTES=10_000_000,MAX_VERSIONS=16;
export function validBackupTarget(id:string,token:string){return ident.test(id)&&token.length>0&&token.length<=8000&&/^[A-Za-z0-9._~-]+$/.test(token);}
export class BackupRequestError extends Error{constructor(public status:number){super(status===401?'Backup authentication failed':status===403?'Backup write permission denied':status===409?'Remote history changed. Refresh history before retrying.':status===404?'Backup service or revision not found':status===429?'Backup quota or service limit reached':'Backup request failed ('+status+')');}}
async function bounded(response:Response,limit:number){
 const length=response.headers.get('content-length');if(length!==null&&(!/^\d+$/.test(length)||Number(length)>limit)){await response.body?.cancel();throw Error('Backup response exceeds limit');}
 if(!response.body)throw Error('Backup response is empty');
 const reader=response.body.getReader(),chunks:Uint8Array[]=[];let total=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>limit){await reader.cancel();throw Error('Backup response exceeds limit');}chunks.push(value);}}finally{reader.releaseLock();}
 const bytes=new Uint8Array(total);let at=0;for(const part of chunks){bytes.set(part,at);at+=part.length;}return bytes;
}
function decode(bytes:Uint8Array){return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}
async function digest(bytes:Uint8Array){const copy=new Uint8Array(bytes);return [...new Uint8Array(await crypto.subtle.digest('SHA-256',copy.buffer))].map(n=>n.toString(16).padStart(2,'0')).join('');}
function readRecord(raw:unknown,revision:number):BackupRevision{const r=raw as BackupRevision;if(!r||r.revision!==revision||typeof r.sha!=='string'||!hash.test(r.sha))throw Error('Invalid backup revision response');return {revision:r.revision,sha:r.sha};}
export function createBackupClient(id:string,token:string,fetcher:typeof fetch=fetch){
 if(!validBackupTarget(id,token))throw Error('Invalid backup project ID or access token');
 const base='/v1/projects/'+encodeURIComponent(id)+'/revisions';
 async function request(path:string,method:string,signal:AbortSignal,body?:Uint8Array,head?:number){
  const response=await fetcher(base+path,{method,signal,redirect:'error',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{}),...(head!==undefined?{'If-Match':'"'+head+'"'}:{})},...(body?{body:new Uint8Array(body).buffer}:{})});
  if(!response.ok){try{await response.body?.cancel();}catch{}throw new BackupRequestError(response.status);}return response;
 }
 async function json(response:Response){if(!response.headers.get('content-type')?.includes('application/json'))throw Error('Cloud backup requires the configured same-origin backup service.');return JSON.parse(decode(await bounded(response,32768)));}
 return {
  async list(signal:AbortSignal):Promise<BackupRevision[]>{const data=await json(await request('','GET',signal));if(!Array.isArray(data?.revisions)||data.revisions.length>MAX_VERSIONS)throw Error('Invalid backup history');return data.revisions.map((r:unknown,i:number)=>readRecord(r,i+1));},
  async read(record:BackupRevision,signal:AbortSignal):Promise<Project>{
   readRecord(record,record.revision);if(!Number.isSafeInteger(record.revision)||record.revision<1||record.revision>MAX_VERSIONS)throw Error('Invalid revision');
   const response=await request('/'+record.revision,'GET',signal);if(response.headers.get('etag')!=='"'+record.sha+'"'){await response.body?.cancel();throw Error('Backup revision integrity metadata mismatch');}
   const bytes=await bounded(response,MAX_BYTES);if(await digest(bytes)!==record.sha)throw Error('Backup integrity verification failed');return parseProject(decode(bytes));
  },
  async save(project:Project,head:number,signal:AbortSignal){
   if(!Number.isInteger(head)||head<0||head>=MAX_VERSIONS)throw Error('Invalid backup revision precondition');
   const raw=JSON.stringify(project);parseProject(raw);const bytes=new TextEncoder().encode(raw);if(bytes.length>MAX_BYTES)throw Error('Project exceeds backup size limit');
   const record=readRecord(await json(await request('','PUT',signal,bytes,head)),head+1);if(record.sha!==await digest(bytes))throw Error('Backup save integrity metadata mismatch');return record;
  },
  async restore(record:BackupRevision,head:number,signal:AbortSignal){
   if(!Number.isInteger(head)||head<1||head>=MAX_VERSIONS||!Number.isInteger(record.revision)||record.revision<1||record.revision>head)throw Error('Invalid restore precondition');
   const restored=readRecord(await json(await request('/'+record.revision+'/restore','POST',signal,undefined,head)),head+1);if(restored.sha!==record.sha)throw Error('Backup restore integrity metadata mismatch');return restored;
  }
 };
}
