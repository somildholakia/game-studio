import {createJwtBackupAuthenticator} from './backup-jwt.mjs';
function safeHeader(header){
 if(typeof header!=='string'||header.length>8192||!header.startsWith('Bearer '))return null;
 try{const parts=header.slice(7).split('.');if(parts.length!==3||parts.some(p=>!/^[a-zA-Z0-9_-]+$/.test(p)))return null;
 const raw=Buffer.from(parts[0],'base64url');if(raw.toString('base64url')!==parts[0])return null;const h=JSON.parse(raw.toString('utf8'));
 return h?.alg==='RS256'&&['at+jwt','application/at+jwt'].includes(h.typ)&&typeof h.kid==='string'&&/^[a-zA-Z0-9._-]{1,128}$/.test(h.kid)&&Object.keys(h).every(k=>['alg','typ','kid'].includes(k))?h.kid:null;
 }catch{return null;}
}
async function loadJson(response){
 if(!response.ok||!response.body)throw Error('Identity keys unavailable');
 const reader=response.body.getReader(),chunks=[];let size=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536){await reader.cancel();throw Error('Identity key response exceeds limit');}chunks.push(Buffer.from(value));}}
 finally{reader.releaseLock();}
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks,size)));
}
/** Explicitly pinned HTTPS JWKS endpoint, bounded refresh and fail-closed expiration.
 * Never follows token-supplied key URLs or redirects. Membership remains server configuration. */
export function createRefreshingJwtAuthenticator({jwksUrl,fetcher=fetch,cacheMs=300000,minRefreshMs=30000,clock=()=>performance.now(),...policy}){
 const url=new URL(jwksUrl);
 if(url.protocol!=='https:'||url.username||url.password||url.hash||url.search||!Number.isSafeInteger(cacheMs)||cacheMs<1000||cacheMs>3600000||!Number.isSafeInteger(minRefreshMs)||minRefreshMs<1000||minRefreshMs>cacheMs)throw Error('Invalid trusted JWKS configuration');
 let cached=null,pending=null,lastAttempt=-Infinity;
 async function refresh(){
  if(pending)return pending;
  const time=clock();if(time-lastAttempt<minRefreshMs)return false;lastAttempt=time;
  pending=(async()=>{try{
   const response=await fetcher(url.href,{redirect:'error',signal:AbortSignal.timeout(5000),headers:{Accept:'application/json'}});
   const jwks=await loadJson(response),auth=createJwtBackupAuthenticator({...policy,jwks});
   cached={auth,ids:new Set(jwks.keys.map(k=>k.kid)),expires:clock()+cacheMs};return true;
  }catch{return false;}finally{pending=null;}})();
  return pending;
 }
 const authenticate=async header=>{
  const kid=safeHeader(header);if(!kid)return null;
  if(!cached||clock()>=cached.expires||!cached.ids.has(kid))await refresh();
  if(!cached||clock()>=cached.expires)return null;return cached.auth(header);
 };
 return {authenticate,refresh};
}
