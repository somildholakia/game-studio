import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {createRefreshingJwtAuthenticator} from '../server/backup-jwks.mjs';
const issuer='https://identity.example.test/',jwksUrl='https://identity.example.test/keys',audience='studio-backup';
const keys=['old','new'].map(kid=>{const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});return {privateKey,jwk:{...publicKey.export({format:'jwk'}),kid,alg:'RS256',use:'sig'}};});
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
function token(key){const raw=encode({alg:'RS256',typ:'at+jwt',kid:key.jwk.kid})+'.'+encode({iss:issuer,aud:audience,sub:'user',iat:100,exp:300,scope:'backup:read backup:write'});return 'Bearer '+raw+'.'+sign('RSA-SHA256',Buffer.from(raw),key.privateKey).toString('base64url');}
test('coalesces refresh, rotates trusted keys, throttles unknown keys and fails closed after cache expiry',async()=>{
 let time=0,calls=0,active=[keys[0].jwk],offline=false;
 const auth=createRefreshingJwtAuthenticator({issuer,audience,jwksUrl,subjects:[{sub:'user',tenant:'a',write:true}],now:()=>200,clock:()=>time,cacheMs:10000,minRefreshMs:1000,fetcher:async(url,options)=>{
  calls++;assert.equal(url,jwksUrl);assert.equal(options.redirect,'error');if(offline)throw Error('offline');return new Response(JSON.stringify({keys:active}),{headers:{'Content-Type':'application/json'}});
 }});
 const expected={tenant:'a',write:true};assert.deepEqual(await Promise.all([auth.authenticate(token(keys[0])),auth.authenticate(token(keys[0]))]),[expected,expected]);assert.equal(calls,1);
 active=[keys[1].jwk];assert.equal(await auth.authenticate(token(keys[1])),null);assert.equal(calls,1);
 time=1001;assert.deepEqual(await auth.authenticate(token(keys[1])),expected);assert.equal(calls,2);assert.equal(await auth.authenticate(token(keys[0])),null);assert.equal(calls,2);
 offline=true;time=12000;assert.equal(await auth.authenticate(token(keys[1])),null);assert.equal(calls,3);assert.equal(await auth.authenticate(token(keys[1])),null);assert.equal(calls,3);
 assert.equal(await auth.authenticate('Bearer bad'),null);assert.equal(calls,3);
});
