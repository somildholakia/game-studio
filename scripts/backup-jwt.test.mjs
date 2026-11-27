import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {createJwtBackupAuthenticator} from '../server/backup-jwt.mjs';
import {createBackupServer} from '../server/backup-api.mjs';
import {createBackupStore} from '../server/backup-store.mjs';
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const key={...publicKey.export({format:'jwk'}),kid:'current',alg:'RS256',use:'sig'};
const issuer='https://identity.example.test/',audience='studio-backup',time=10000;
const config={issuer,audience,jwks:{keys:[key]},subjects:[{sub:'alice',tenant:'a',write:true},{sub:'bob',tenant:'b',write:true},{sub:'reader',tenant:'a',write:false}],now:()=>time};
const encode=p=>Buffer.from(JSON.stringify(p)).toString('base64url');
function token(claims={},header={}){const content=encode({alg:'RS256',typ:'at+jwt',kid:'current',...header})+'.'+encode({iss:issuer,aud:audience,sub:'alice',iat:time-1,exp:time+300,scope:'backup:read backup:write',...claims});return content+'.'+sign('RSA-SHA256',Buffer.from(content),privateKey).toString('base64url');}
test('requires signed access token, pinned issuer and audience, expiry, trusted membership and scopes',()=>{
 const authenticate=createJwtBackupAuthenticator(config),check=(claims,header)=>authenticate('Bearer '+token(claims,header));
 assert.deepEqual(check({tenant:'b'}),{tenant:'a',write:true});assert.deepEqual(check({sub:'bob'}),{tenant:'b',write:true});assert.deepEqual(check({sub:'reader'}),{tenant:'a',write:false});assert.deepEqual(check({scope:'backup:read'}),{tenant:'a',write:false});
 for(const claims of [{iss:'https://evil.example/'},{aud:'other'},{aud:[audience,'other']},{exp:time-31},{iat:time+31},{exp:time+1000},{nbf:time+31},{sub:'unknown'},{scope:'backup:write'}])assert.equal(check(claims),null);
 for(const header of [{alg:'none'},{typ:'JWT'},{kid:'unknown'},{jku:'https://evil.example/keys'},{crit:['x']}])assert.equal(check({},header),null);
 const valid=token().split('.');valid[1]=encode({iss:issuer,aud:audience,sub:'bob',iat:time-1,exp:time+300,scope:'backup:read backup:write'});assert.equal(authenticate('Bearer '+valid.join('.')),null);
 assert.throws(()=>createJwtBackupAuthenticator({...config,jwks:{keys:[key,key]}}));assert.throws(()=>createJwtBackupAuthenticator({...config,subjects:[config.subjects[0],config.subjects[0]]}));
});
test('real HTTP enforces token subject and scope independently of claimed tenant',async t=>{
 const root=mkdtempSync(join(tmpdir(),'studio-jwt-'));const server=createBackupServer({store:createBackupStore(root),authenticate:createJwtBackupAuthenticator(config)});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));rmSync(root,{recursive:true,force:true});});
 const url='http://127.0.0.1:'+server.address().port+'/v1/projects/game/revisions';
 const request=(claims,method='GET',path='',body)=>fetch(url+path,{method,body,headers:{Authorization:'Bearer '+token(claims),...(body?{'Content-Type':'application/json','If-Match':'"0"'}:{})}});
 assert.equal((await request({tenant:'b'},'PUT','','{"name":"a"}')).status,201);assert.equal((await request({sub:'bob'},'GET','/1')).status,404);assert.equal((await request({sub:'reader'},'GET','/1')).status,200);assert.equal((await request({sub:'reader'},'PUT','','{}')).status,403);assert.equal((await request({scope:'backup:read'},'PUT','','{}')).status,403);assert.equal((await request({aud:'wrong'})).status,401);
});
