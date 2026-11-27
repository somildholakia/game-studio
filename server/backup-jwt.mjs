import {createPublicKey,verify} from 'node:crypto';
const safeId=/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;
const keyId=/^[a-zA-Z0-9._-]{1,128}$/;
function segment(value){if(typeof value!=='string'||!/^[a-zA-Z0-9_-]+$/.test(value))throw Error('Invalid JWT encoding');const b=Buffer.from(value,'base64url');if(b.toString('base64url')!==value)throw Error('Noncanonical JWT encoding');return b;}
function object(value){const p=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(segment(value)));if(!p||typeof p!=='object'||Array.isArray(p))throw Error('Invalid JWT object');return p;}
function text(value,max){return typeof value==='string'&&value.length>0&&value.length<=max&&!/[\u0000-\u001f\u007f]/.test(value);}
/** Strict RS256 JWT access-token verifier. Only trusted, provisioned issuer keys and subject memberships are accepted. */
export function createJwtBackupAuthenticator({issuer,audience,jwks,subjects,now=()=>Math.floor(Date.now()/1000),maxLifetimeSec=900,clockSkewSec=30,purpose='backup'}){
 if(!['backup','race'].includes(purpose))throw Error('Invalid token purpose');
 let url;try{url=new URL(issuer);}catch{throw Error('Invalid token issuer');}
 if(typeof issuer!=='string'||url.protocol!=='https:'||url.username||url.password||url.search||url.hash||!text(audience,256)||!Number.isSafeInteger(maxLifetimeSec)||maxLifetimeSec<1||maxLifetimeSec>3600||!Number.isSafeInteger(clockSkewSec)||clockSkewSec<0||clockSkewSec>60)throw Error('Invalid token policy');
 if(!Array.isArray(jwks?.keys)||!jwks.keys.length||jwks.keys.length>16||!Array.isArray(subjects)||!subjects.length||subjects.length>1024)throw Error('Invalid identity configuration');
 const keys=new Map();for(const jwk of jwks.keys){
  if(!jwk||typeof jwk.kid!=='string'||!keyId.test(jwk.kid)||keys.has(jwk.kid)||jwk.kty!=='RSA'||(jwk.alg!==undefined&&jwk.alg!=='RS256')||(jwk.use!==undefined&&jwk.use!=='sig')||['d','p','q','dp','dq','qi','oth'].some(k=>Object.hasOwn(jwk,k))||(jwk.key_ops!==undefined&&(!Array.isArray(jwk.key_ops)||!jwk.key_ops.includes('verify'))))throw Error('Invalid issuer key');
  const key=createPublicKey({key:jwk,format:'jwk'}),bits=key.asymmetricKeyDetails?.modulusLength;if(key.asymmetricKeyType!=='rsa'||!bits||bits<2048||bits>4096)throw Error('Unsupported issuer key');keys.set(jwk.kid,key);
 }
 const memberships=new Map();for(const p of subjects){if(!p||!text(p.sub,255)||typeof p.tenant!=='string'||!safeId.test(p.tenant)||(purpose==='backup'&&typeof p.write!=='boolean')||(purpose==='race'&&(!text(p.name,32)||!p.name.trim()))||memberships.has(p.sub))throw Error('Invalid subject membership');memberships.set(p.sub,{tenant:p.tenant,write:p.write,name:p.name});}
 return header=>{
  if(typeof header!=='string'||header.length>8192||!header.startsWith('Bearer '))return null;
  try{
   const parts=header.slice(7).split('.');if(parts.length!==3)return null;
   const h=object(parts[0]);if(h.alg!=='RS256'||!['at+jwt','application/at+jwt'].includes(h.typ)||typeof h.kid!=='string'||Object.keys(h).some(k=>!['alg','typ','kid'].includes(k)))return null;
   const key=keys.get(h.kid);if(!key||!verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),key,segment(parts[2])))return null;
   const c=object(parts[1]),time=now();if(!Number.isSafeInteger(time)||c.iss!==issuer||!(c.aud===audience||(Array.isArray(c.aud)&&c.aud.length===1&&c.aud[0]===audience))||!text(c.sub,255)||!Number.isSafeInteger(c.exp)||!Number.isSafeInteger(c.iat)||c.exp<=c.iat||c.exp-c.iat>maxLifetimeSec||c.exp<=time-clockSkewSec||c.iat>time+clockSkewSec||(c.nbf!==undefined&&(!Number.isSafeInteger(c.nbf)||c.nbf>time+clockSkewSec||c.nbf>=c.exp)))return null;
   if(typeof c.scope!=='string'||c.scope.length>512)return null;const scopes=new Set(c.scope.split(' '));if(!scopes.has(purpose==='race'?'race:play':'backup:read'))return null;
   const p=memberships.get(c.sub);if(!p)return null;return purpose==='race'?{tenant:p.tenant,subject:c.sub,name:p.name.trim()}:{tenant:p.tenant,write:p.write&&scopes.has('backup:write')};
  }catch{return null;}
 };
}
