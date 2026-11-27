import {describe,it,expect} from 'vitest';
import {Readable} from 'node:stream';
import {createRoomRegistry,createRoomMiddleware} from '../../server/room-proxy.mjs';
const fingerprint='abc-12345678-abcdef12',base={fingerprint,name:'Tester',position:[0,1,0]};
describe('local multiplayer presence registry',()=>{
 it('creates and joins a room, exchanges positions without exposing tokens, and leaves',()=>{
 let time=1000;const r=createRoomRegistry(()=>time);const a=r.handle({action:'create',...base}).body;const b=r.handle({action:'join',...base,name:'Second',code:a.code}).body;
 expect(b.peers[0].id).toBe(a.id);expect(JSON.stringify(b.peers)).not.toContain(a.token);
 const u=r.handle({action:'update',code:a.code,id:a.id,token:a.token,sequence:0,position:[3,1,0]});expect(u.status).toBe(200);expect(u.body.peers[0].id).toBe(b.id);
 time+=250;const v=r.handle({action:'update',code:b.code,id:b.id,token:b.token,sequence:0,position:[0,1,2]});expect(v.body.peers[0].position).toEqual([3,1,0]);
 expect(r.handle({action:'leave',code:a.code,id:a.id,token:a.token}).status).toBe(200);time+=250;expect(r.handle({action:'update',code:b.code,id:b.id,token:b.token,sequence:1,position:[0,1,2]}).body.peers).toEqual([]);
 });
 it('enforces level identity, membership, update bounds, sequence and idle expiry',()=>{
 let time=1000;const r=createRoomRegistry(()=>time),a=r.handle({action:'create',...base}).body;
 expect(r.handle({action:'join',...base,code:a.code,fingerprint:'fff-12345678-abcdef12'}).status).toBe(409);
 const update={action:'update',code:a.code,id:a.id,token:a.token,sequence:0,position:[0,1,0]};
 expect(r.handle({...update,token:'bad'}).status).toBe(403);expect(r.handle({...update,position:[Infinity,0,0]}).status).toBe(400);
 expect(r.handle(update).status).toBe(200);expect(r.handle(update).status).toBe(400);expect(r.handle({...update,sequence:1}).status).toBe(429);
 time+=30001;expect(r.handle({...update,sequence:1}).status).toBe(403);expect(r.handle({action:'join',...base,code:a.code}).status).toBe(404);
 });
 it('caps room size and rejects cross-origin requests',async()=>{
 const registry=createRoomRegistry(),a=registry.handle({action:'create',...base}).body;for(let i=0;i<7;i++)expect(registry.handle({action:'join',...base,code:a.code}).status).toBe(200);expect(registry.handle({action:'join',...base,code:a.code}).status).toBe(409);
 const req=Readable.from([JSON.stringify({action:'create',...base})]);req.url='/api/rooms';req.method='POST';req.socket={remoteAddress:'127.0.0.1'};req.headers={host:'127.0.0.1:5173',origin:'https://untrusted.example','content-type':'application/json'};
 const result=await new Promise(resolve=>{let status;createRoomMiddleware(registry)(req,{writeHead(s){status=s;},end(body){resolve({status,body:JSON.parse(body)});}},()=>{});});expect(result.status).toBe(403);
 });
});
