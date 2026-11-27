import {it,expect} from 'vitest';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {createRaceMatch} from './raceMatch';
import {entity} from '../core/project';
import {createRaceRegistry,createRaceMiddleware} from '../../server/race-proxy.mjs';
it('exchanges server-derived snapshots over real loopback HTTP with independent member tokens',async()=>{
 let time=0;const registry=createRaceRegistry(createRaceMatch,()=>time);const middleware=createRaceMiddleware(async()=>registry);const server=createServer((req,res)=>middleware(req,res,()=>{res.writeHead(404);res.end();}));server.listen(0,'127.0.0.1');await once(server,'listening');
 const origin='http://127.0.0.1:'+server.address().port;
 const request=async body=>{const res=await fetch(origin+'/api/race',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:res.status,body:await res.json()};};
 try{
  const project=JSON.stringify({version:1,name:'Race',entities:[{...entity('box'),role:'player',position:[0,.75,0]},{...entity('box'),role:'goal',position:[20,.75,0]}]});
  const created=await request({action:'create',name:'A',project});expect(created.status).toBe(200);const {code,id,token}=created.body;
  const joined=await request({action:'join',code,name:'B'});expect(joined.status).toBe(200);expect(joined.body.project).toBe(created.body.project);
  const a={code,id,token},b={code,id:joined.body.id,token:joined.body.token};
  expect((await request({action:'input',...a,token:b.token,sequence:0,input:{x:1,z:0,jump:false}})).status).toBe(403);
  expect((await request({action:'input',...a,sequence:0,input:{x:1,z:0,jump:false},position:[99,0,0]})).status).toBe(400);
  expect((await request({action:'input',...a,sequence:0,input:{x:1,z:0,jump:false}})).status).toBe(200);
  for(let i=0;i<4;i++){time+=100;registry.pump();}
  const first=await request({action:'snapshot',...a}),second=await request({action:'snapshot',...b});
  expect(first.body.snapshot).toEqual(second.body.snapshot);expect(first.body.snapshot.tick).toBeGreaterThan(0);expect(first.body.snapshot.racers.find(r=>r.id===a.id).position[0]).toBeGreaterThan(1);expect(first.body.snapshot.racers.find(r=>r.id===b.id).position[0]).toBe(0);
  expect((await request({action:'input',...a,sequence:0,input:{x:-1,z:0,jump:false}})).status).toBe(400);
  expect((await request({action:'leave',...b})).status).toBe(200);expect((await request({action:'snapshot',...a})).body.snapshot.racers).toHaveLength(1);
  time+=31000;expect((await request({action:'snapshot',...a})).status).toBe(403);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
