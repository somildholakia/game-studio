import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {setTimeout as delay} from 'node:timers/promises';
test('development Vite gateway loads real authoritative simulation and advances server clock',async t=>{
 const server=await createServer({logLevel:'silent',server:{host:'127.0.0.1',port:0,strictPort:true}});
 t.after(()=>server.close());
 await server.listen(0);
 const origin='http://127.0.0.1:'+server.httpServer.address().port;
 const request=async body=>{const r=await fetch(origin+'/api/race',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,body:await r.json()};};
 const entity=(id,role,position)=>({id,name:id,kind:'box',role,position,scale:[1,1,1],rotation:[0,0,0],color:'#00aaff'});
 const project=JSON.stringify({version:1,name:'Race gateway',entities:[entity('player','player',[0,.75,0]),entity('goal','goal',[20,.75,0])]});
 const first=await request({action:'create',name:'Player',project});assert.equal(first.status,200,JSON.stringify(first.body));
 const {code,id,token}=first.body,member={code,id,token};
 const input=await request({action:'input',...member,sequence:0,input:{x:1,z:0,jump:false}});assert.equal(input.status,200);
 let snapshot;for(let i=0;i<20;i++){await delay(50);const result=await request({action:'snapshot',...member});assert.equal(result.status,200);snapshot=result.body.snapshot;if(snapshot.racers[0].position[0]>0.05)break;}
 assert.ok(snapshot.tick>0);assert.ok(snapshot.racers[0].position[0]>0.05);assert.equal(snapshot.racers[0].ack,0);
 assert.equal((await request({action:'leave',...member})).status,200);
});
