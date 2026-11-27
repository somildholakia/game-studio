import {createHash,timingSafeEqual} from 'node:crypto';
import {createServer} from 'node:http';
import {BackupError} from './backup-store.mjs';
const ident=/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;
const hex=/^[a-f0-9]{64}$/;
const hash=value=>createHash('sha256').update(value).digest();
/** Scoped opaque service credentials, not an end-user identity provider. Store only SHA-256 of high-entropy tokens. */
export function createBackupAuthenticator(credentials){
 if(!Array.isArray(credentials)||!credentials.length||credentials.length>64)throw Error('Invalid backup credentials');
 const seen=new Set(),principals=credentials.map(c=>{if(!c||typeof c.tokenHash!=='string'||!hex.test(c.tokenHash)||typeof c.tenant!=='string'||!ident.test(c.tenant)||typeof c.write!=='boolean'||seen.has(c.tokenHash))throw Error('Invalid backup credential');seen.add(c.tokenHash);return {digest:Buffer.from(c.tokenHash,'hex'),tenant:c.tenant,write:c.write};});
 return header=>{if(typeof header!=='string'||!/^Bearer [a-f0-9]{64}$/.test(header))return null;const candidate=hash(header.slice(7));let result=null;for(const p of principals)if(timingSafeEqual(candidate,p.digest))result={tenant:p.tenant,write:p.write};return result;};
}
function fail(status,message){throw new BackupError(status,message);}
function send(res,status,body,headers={}){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(body));}
function expected(req){const value=req.headers['if-match'];if(typeof value!=='string'||!/^"(?:0|[1-9][0-9]{0,3})"$/.test(value))fail(428,'Expected revision in If-Match required');return Number(value.slice(1,-1));}
async function readBody(req,limit){
 const length=req.headers['content-length'];if(length!==undefined&&(!/^\d+$/.test(length)||Number(length)>limit))fail(413,'Backup exceeds request limit');
 const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>limit)fail(413,'Backup exceeds request limit');chunks.push(chunk);}
 const bytes=Buffer.concat(chunks);try{const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));if(!value||typeof value!=='object'||Array.isArray(value))throw Error();}catch{fail(400,'Invalid project JSON');}return bytes;
}
/** Standalone reference HTTP API. Bind privately; TLS, external identity, distributed quotas and storage are deployment concerns. */
export function createBackupServer({store,authenticate,maxBytes=10_000_000,maxConcurrent=8}){
 if(!Number.isSafeInteger(maxBytes)||maxBytes<=0||!Number.isSafeInteger(maxConcurrent)||maxConcurrent<=0)throw Error('Invalid API quotas');
 let active=0;
 const server=createServer({requestTimeout:15000,headersTimeout:10000,maxHeaderSize:8192},(req,res)=>{
  if(active>=maxConcurrent){send(res,429,{error:'Backup service busy'},{Connection:'close'});return;}active++;
  void (async()=>{
   const p=await authenticate(req.headers.authorization);if(!p)fail(401,'Authentication required');
   const match=/^\/v1\/projects\/([a-zA-Z0-9][a-zA-Z0-9_-]{0,63})\/revisions(?:\/([1-9][0-9]{0,3})(\/restore)?)?$/.exec(req.url||'');
   if(!match)fail(404,'Backup endpoint not found');const [,project,number,restore]=match,revision=number?Number(number):null;
   if(req.method==='GET'&&!restore){if(revision===null){send(res,200,{revisions:await store.list(p.tenant,project)});return;}const record=await store.read(p.tenant,project,revision);res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Disposition':'attachment; filename="project.json"','Content-Length':record.bytes.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','ETag':'"'+record.sha+'"'});res.end(record.bytes);return;}
   if((req.method==='PUT'&&revision===null)||(req.method==='POST'&&restore)){
    if(!p.write)fail(403,'Write permission required');const head=expected(req);
    if(restore){if(req.headers['transfer-encoding']||Number(req.headers['content-length']||0)!==0)fail(400,'Restore must not include a body');send(res,201,await store.restore(p.tenant,project,revision,head));return;}
    if(req.headers['content-type']?.split(';')[0].trim().toLowerCase()!=='application/json')fail(415,'JSON required');
    const bytes=await readBody(req,maxBytes);send(res,201,await store.append(p.tenant,project,head,bytes));return;
   }fail(405,'Method not allowed');
  })().catch(e=>{if(!res.headersSent&&!res.destroyed)send(res,e instanceof BackupError?e.status:500,{error:e instanceof BackupError?e.message:'Backup operation failed'},{Connection:'close'});else if(!res.destroyed)res.end();}).finally(()=>{active--;});
 });
 server.maxConnections=64;return server;
}
