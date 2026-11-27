import {BackupError} from './backup-store.mjs';
const generation=v=>typeof v==='string'&&/^[1-9][0-9]{0,19}$/.test(v);
function unavailable(){throw new BackupError(503,'Object storage unavailable');}
function invalid(){throw new BackupError(500,'Object storage metadata is invalid');}
async function discard(response){try{await response.body?.cancel();}catch{}}
async function bounded(response,limit){
 const length=response.headers.get('content-length');
 if(length!==null&&(!/^\d+$/.test(length)||Number(length)>limit)){await discard(response);invalid();}
 if(!response.body)invalid();
 const reader=response.body.getReader(),parts=[];let count=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;count+=value.byteLength;if(count>limit){await reader.cancel();invalid();}parts.push(Buffer.from(value));}}
 finally{reader.releaseLock();}
 return Buffer.concat(parts,count);
}
/** Google Cloud Storage JSON API. Credentials come exclusively from a trusted server token supplier.
 * get returns an immutable generation snapshot; put is a compare-and-swap against that generation. */
export function createGcsObjectStore({bucket,accessToken,fetcher=fetch,timeoutMs=15000}){
 if(typeof bucket!=='string'||!/^[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]$/.test(bucket)||typeof accessToken!=='function'||typeof fetcher!=='function'||!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>60000)throw Error('Invalid object storage configuration');
 const base='https://storage.googleapis.com/storage/v1/b/'+encodeURIComponent(bucket)+'/o/';
 const upload='https://storage.googleapis.com/upload/storage/v1/b/'+encodeURIComponent(bucket)+'/o';
 const keyPath=key=>{if(typeof key!=='string'||!key.length||key.length>1024||!/^studio\/[a-zA-Z0-9/_-]+(?:\.json)?$/.test(key)||key.includes('//'))throw Error('Invalid object key');return encodeURIComponent(key);};
 async function request(url,options={}){
  try{const token=await accessToken();if(typeof token!=='string'||!token.length||token.length>8192||/[\x00-\x20\x7f]/.test(token))unavailable();
   return await fetcher(url,{...options,redirect:'error',signal:AbortSignal.timeout(timeoutMs),headers:{Authorization:'Bearer '+token,...options.headers}});
  }catch{unavailable();}
 }
 return {
  async get(key,maxBytes){
   if(!Number.isSafeInteger(maxBytes)||maxBytes<1)throw Error('Invalid object limit');
   const path=base+keyPath(key);
   for(let attempt=0;attempt<3;attempt++){
    const meta=await request(path);
    if(meta.status===404){await discard(meta);return null;}
    if(!meta.ok){await discard(meta);unavailable();}
    let m;try{m=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(await bounded(meta,32768)));}catch{invalid();}
    if(!generation(m?.generation)||typeof m.size!=='string'||!/^(?:0|[1-9][0-9]*)$/.test(m.size)||!Number.isSafeInteger(Number(m.size))||Number(m.size)>maxBytes)invalid();
    const response=await request(path+'?alt=media&generation='+m.generation);
    if(response.status===404||response.status===412){await discard(response);continue;}
    if(!response.ok){await discard(response);unavailable();}
    const bytes=await bounded(response,maxBytes);
    if(bytes.length!==Number(m.size))invalid();
    return {bytes,version:m.generation};
   }unavailable();
  },
  async put(key,bytes,expectedVersion){
   if(!Buffer.isBuffer(bytes)||!(expectedVersion===null||generation(expectedVersion)))throw Error('Invalid object update');
   const url=upload+'?uploadType=media&name='+keyPath(key)+'&ifGenerationMatch='+(expectedVersion??'0');
   const response=await request(url,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:bytes});
   if(response.status===412){await discard(response);return false;}
   if(!response.ok){await discard(response);unavailable();}
   await discard(response);return true;
  }
 };
}
