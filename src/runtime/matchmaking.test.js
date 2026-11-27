import {it,expect} from 'vitest';
import {generateKeyPairSync,sign} from 'node:crypto';
import {once} from 'node:events';
import {entity} from '../core/project';
import {createRaceMatch} from './raceMatch';
import {createMatchmaker,createMatchmakingServer} from '../../server/matchmaking.mjs';
import {createJwtBackupAuthenticator} from '../../server/backup-jwt.mjs';
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const key={...publicKey.export({format:'jwk'}),kid:'race-key',alg:'RS256',use:'sig'};
const issuer='https://identity.example.test/',audience='studio-race';
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
function token(sub,patch={}){const raw=encode({alg:'RS256',typ:'at+jwt',kid:key.kid})+'.'+encode({iss:issuer,aud:audience,sub,iat:100,exp:400,scope:'race:play',...patch});return 'Bearer '+raw+'.'+sign('RSA-SHA256',Buffer.from(raw),privateKey).toString('base64url');}
const subjects=[{sub:'alice',tenant:'red',name:'Alice'},{sub:'bob',tenant:'red',name:'Bob'},{sub:'eve',tenant:'blue',name:'Eve'},{sub:'dan',tenant:'red',name:'Dan'}];
const project=JSON.stringify({version:1,name:'Test course',entities:[{...entity('box'),role:'player',position:[0,.75,0]},{...entity('sphere'),role:'collectible',position:[2,.75,0]},{...entity('box'),role:'goal',position:[4,.75,0]}]});
const input={x:1,z:0,jump:false};
it('pairs only authenticated tenant/course peers and rejects stolen tickets, forged claims, and replay',async()=>{
 let time=0;
 const matchmaker=createMatchmaker({createMatch:createRaceMatch,courses:[{id:'course',project},{id:'other',project}],now:()=>time});
 const authenticate=createJwtBackupAuthenticator({issuer,audience,jwks:{keys:[key]},subjects,purpose:'race',now:()=>200});
 const server=createMatchmakingServer({matchmaker,authenticate,autoTick:false});server.listen(0,'127.0.0.1');await once(server,'listening');
 const base='http://127.0.0.1:'+server.address().port+'/v1/matchmaking';
 const request=async (auth,body)=>{const r=await fetch(base,{method:'POST',headers:{...(auth?{Authorization:auth}:{}),'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
 const join={action:'join',course:'course'};
 try{
  expect((await request(null,join)).status).toBe(401);
  expect((await request(token('alice',{scope:'backup:read'}),join)).status).toBe(401);
  expect((await request(token('alice',{aud:'wrong'}),join)).status).toBe(401);
  expect((await request(token('unknown'),join)).status).toBe(401);
  const a=(await request(token('alice',{tenant:'blue',name:'Fake'}),join)).body;expect(a.phase).toBe('queued');
  expect((await request(token('alice'),join)).body.ticket).toBe(a.ticket);
  const e=(await request(token('eve',{tenant:'red'}),join)).body;expect(e.phase).toBe('queued');
  const d=(await request(token('dan'),{action:'join',course:'other'})).body;expect(d.phase).toBe('queued');
  const b=(await request(token('bob'),join)).body;expect(b.phase).toBe('matched');
  const getA=()=>request(token('alice'),{action:'poll',ticket:a.ticket});
  const first=(await getA()).body;expect(first.snapshot).toEqual(b.snapshot);expect(first.snapshot.racers.map(r=>r.name)).toEqual(['Alice','Bob']);
  for(const who of ['bob','eve','dan'])expect((await request(token(who),{action:'poll',ticket:a.ticket})).status).toBe(404);
  expect((await request(token('alice'),{action:'input',ticket:a.ticket,sequence:0,input,position:[999,0,0]})).status).toBe(400);
  expect((await request(token('alice'),{action:'input',ticket:a.ticket,sequence:0,input})).status).toBe(200);
  expect((await request(token('alice'),{action:'input',ticket:a.ticket,sequence:0,input})).status).toBe(400);
  for(let i=0;i<60;i++){if(i===30)expect((await request(token('alice'),{action:'input',ticket:a.ticket,sequence:1,input})).status).toBe(200);time+=1000/60;matchmaker.pump();}
  const final=(await getA()).body;expect(final.snapshot.phase).toBe('finished');expect(final.snapshot.winnerId).toBe(first.id);
  expect((await request(token('bob'),{action:'poll',ticket:b.ticket})).body.snapshot).toEqual(final.snapshot);
  expect((await request(token('eve'),{action:'poll',ticket:e.ticket})).body.phase).toBe('queued');
  expect((await request(token('alice'),{action:'leave',ticket:a.ticket})).body.phase).toBe('left');
  expect((await getA()).status).toBe(404);
  time+=31000;matchmaker.pump();expect(matchmaker.counts()).toEqual({tickets:0,matches:0,queues:0});
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
it('enforces tenant and global capacity, rejects switching queue without leaving',()=>{
 let time=0;const m=createMatchmaker({createMatch:createRaceMatch,courses:[{id:'course',project},{id:'other',project}],now:()=>time,maxTickets:2,maxPerTenant:1});
 const a={tenant:'red',subject:'a',name:'A'},b={tenant:'red',subject:'b',name:'B'},c={tenant:'blue',subject:'c',name:'C'};
 const j={action:'join',course:'course'},first=m.handle(a,j);
 expect(first.status).toBe(200);expect(m.handle(a,{action:'join',course:'other'}).status).toBe(409);expect(m.handle(b,j).status).toBe(429);expect(m.handle(c,j).status).toBe(200);
 time+=31000;m.pump();expect(m.counts().tickets).toBe(0);expect(m.handle(b,j).status).toBe(200);
});
