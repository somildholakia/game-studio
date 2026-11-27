import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {once} from 'node:events';
import {buildMatchmakingService} from '../server/matchmaking-service.mjs';
test('built matchmaking service loads pinned keys and pairs signed users over HTTP',async t=>{
 const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048}),jwk={...publicKey.export({format:'jwk'}),kid:'current',alg:'RS256',use:'sig'};
 const issuer='https://identity.example.test/',audience='studio-race',jwksUrl=issuer+'keys';
 const object=(id,role,position)=>({id,name:id,kind:'box',role,position,rotation:[0,0,0],scale:[1,1,1],color:'#6688bb'});
 const project=JSON.stringify({version:1,name:'Course',entities:[object('player','player',[0,.75,0]),object('goal','goal',[8,.75,0])]});
 const {server,identity}=buildMatchmakingService({issuer,audience,jwksUrl,subjects:[{sub:'a',tenant:'one',name:'A'},{sub:'b',tenant:'one',name:'B'}],courses:[{id:'course',project}]},{autoTick:false,fetcher:async(url,opts)=>{assert.equal(url,jwksUrl);assert.equal(opts.redirect,'error');return new Response(JSON.stringify({keys:[jwk]}));}});
 assert.equal(await identity.refresh(),true);server.listen(0,'127.0.0.1');await once(server,'listening');t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
 const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
 function token(sub){const now=Math.floor(Date.now()/1000),raw=encode({alg:'RS256',typ:'at+jwt',kid:'current'})+'.'+encode({iss:issuer,aud:audience,sub,iat:now,exp:now+300,scope:'race:play'});return 'Bearer '+raw+'.'+sign('RSA-SHA256',Buffer.from(raw),privateKey).toString('base64url');}
 const request=async sub=>{const response=await fetch('http://127.0.0.1:'+server.address().port+'/v1/matchmaking',{method:'POST',headers:{Authorization:token(sub),'Content-Type':'application/json'},body:'{"action":"join","course":"course"}'});assert.equal(response.status,200);return response.json();};
 assert.equal((await request('a')).phase,'queued');const b=await request('b');assert.equal(b.phase,'matched');assert.equal(b.snapshot.phase,'running');assert.equal(b.snapshot.racers.length,2);assert.equal((await request('a')).snapshot.racers.length,2);
});
