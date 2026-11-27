import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createServer} from 'node:http';
import {createObservability} from '../server/observability.mjs';
test('bounds samples, records status and aborts exactly once, never retains arbitrary request data',()=>{
 let time=0;const o=createObservability({now:()=>time});
 function start(path='/api/ai/plan?apiKey=private-secret'){
 const res=new EventEmitter();res.statusCode=200;res.writableFinished=false;o.middleware({url:path,headers:{authorization:'private-secret'}},res,()=>{});return res;
 }
 const a=start();assert.equal(o.snapshot().routes['/api/ai/plan'].active,1);time=10;a.writableFinished=true;a.emit('finish');a.emit('close');
 const b=start();b.statusCode=429;time=20;b.emit('finish');b.emit('close');
 const c=start();c.statusCode=502;time=30;c.emit('finish');const d=start();d.emit('close');
 for(let i=0;i<300;i++){const res=start();time++;res.emit('finish');}
 start('/other?private-secret');const s=o.snapshot(),row=s.routes['/api/ai/plan'];
 assert.equal(row.requests,304);assert.equal(row.ok,301);assert.equal(row.clientErrors,1);assert.equal(row.rateLimited,1);assert.equal(row.serverErrors,1);assert.equal(row.aborted,1);assert.equal(row.active,0);assert.equal(row.samples,256);assert.equal(row.p95Ms,1);assert.ok(!JSON.stringify(s).includes('private-secret'));
});
test('loopback metrics endpoint rejects cross-origin access and reports aggregates',async t=>{
 const o=createObservability(),server=createServer((req,res)=>o.middleware(req,res,()=>{res.writeHead(429);res.end('limited');}));
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
 const origin='http://127.0.0.1:'+server.address().port;
 async function post(path,header=origin){return fetch(origin+path,{method:'POST',headers:{Origin:header,'Content-Type':'application/json'},body:'{}'});}
 await (await post('/api/rooms?private-secret')).text();
 assert.equal((await post('/api/local/metrics','https://bad.example')).status,403);
 const response=await post('/api/local/metrics');assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');const s=await response.json();assert.equal(s.routes['/api/rooms'].rateLimited,1);assert.equal(s.routes['/api/rooms'].active,0);assert.ok(!JSON.stringify(s).includes('private-secret'));
});
