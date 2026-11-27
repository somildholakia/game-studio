import {createServer} from 'node:http';
import {performance} from 'node:perf_hooks';
import {setTimeout as sleep} from 'node:timers/promises';
import {writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import assert from 'node:assert/strict';
import {createRoomMiddleware,createRoomRegistry} from '../server/room-proxy.mjs';
const roomCount=32,membersPerRoom=8,rounds=8;
const fingerprint='abc-12345678-abcdef12';
const handler=createRoomMiddleware(createRoomRegistry());
const server=createServer((req,res)=>handler(req,res,()=>{res.writeHead(404);res.end();}));
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const origin='http://127.0.0.1:'+server.address().port;
const rooms=[],latency=[];
let calls=0,updates=0,bytes=0;
async function call(body,expected=200,measure=false){
 const start=performance.now();
 const res=await fetch(origin+'/api/rooms',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
 const raw=await res.text(),data=JSON.parse(raw);
 calls++;bytes+=Buffer.byteLength(raw);
 if(measure)latency.push(performance.now()-start);
 assert.equal(res.status,expected,JSON.stringify(data));return data;
}
const initial=(action,name,code)=>({action,name,code,fingerprint,position:[0,1,0]});
try{
 // Exercise all documented room and member slots with real HTTP clients.
 for(let i=0;i<roomCount;i++){
  const a=await call(initial('create','R'+i+'-0'));
  const members=[a,...await Promise.all(Array.from({length:membersPerRoom-1},(_,j)=>call(initial('join','R'+i+'-'+(j+1),a.code))))];
  assert.equal(new Set(members.map(m=>m.id)).size,membersPerRoom);
  assert.equal(new Set(members.map(m=>m.token)).size,membersPerRoom);
  rooms.push(members);
 }
 await call(initial('create','Over capacity'),429);
 await call(initial('join','Over capacity',rooms[0][0].code),409);
 const started=performance.now();
 for(let sequence=0;sequence<rounds;sequence++){
  await sleep(110);
  await Promise.all(rooms.flatMap((members,i)=>members.map(async(m,j)=>{
   const data=await call({action:'update',code:m.code,id:m.id,token:m.token,sequence,position:[sequence,j,i]},200,true);
   assert.equal(data.peers.length,membersPerRoom-1);
   const expected=new Set(members.filter(x=>x.id!==m.id).map(x=>x.id));
   assert.deepEqual(new Set(data.peers.map(x=>x.id)),expected);
   assert.ok(data.peers.every(x=>!Object.hasOwn(x,'token')&&x.name.startsWith('R'+i+'-')));
   updates++;
  })));
 }
 const elapsed=performance.now()-started;
 const a=rooms[0][0],b=rooms[1][0];
 await call({action:'update',code:b.code,id:a.id,token:a.token,sequence:rounds,position:[0,1,0]},403);
 await call({action:'update',code:a.code,id:a.id,token:a.token,sequence:rounds-1,position:[0,1,0]},400);
 for(const members of rooms)await Promise.all(members.map(m=>call({action:'leave',code:m.code,id:m.id,token:m.token})));
 await call(initial('join','Expired',a.code),404);
 const replacement=await call(initial('create','Replacement'));await call({action:'leave',code:replacement.code,id:replacement.id,token:replacement.token});
 latency.sort((x,y)=>x-y);
 const p95=latency[Math.ceil(latency.length*.95)-1];
 const report={scope:'local loopback presence; no WAN or authoritative gameplay',node:process.version,rooms:roomCount,clients:roomCount*membersPerRoom,rounds,updates,calls,responseBytes:bytes,elapsedMs:Math.round(elapsed),updatesPerSecond:Math.round(updates/elapsed*1000),p95Ms:Math.round(p95),maxMs:Math.round(latency.at(-1)),budget:{p95Ms:3000,updates:roomCount*membersPerRoom*rounds}};
 console.log(JSON.stringify(report,null,2));
 if(process.argv[2]){mkdirSync(dirname(process.argv[2]),{recursive:true});writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');}
 assert.equal(updates,roomCount*membersPerRoom*rounds);assert.ok(p95<3000,'Loopback p95 exceeded the generous CI regression budget');
}finally{await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}
