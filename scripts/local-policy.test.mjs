import {test} from 'node:test';
import assert from 'node:assert/strict';
import {localJsonError,createUpstreamBudget} from '../server/local-policy.mjs';
const req={method:'POST',socket:{remoteAddress:'127.0.0.1'},headers:{host:'127.0.0.1:5173',origin:'http://127.0.0.1:5173','content-type':'application/json; charset=UTF-8'}};
test('only exact local origins and JSON media types are accepted',()=>{
 assert.equal(localJsonError(req),null);
 for(const type of ['application/jsonp','application/json-extra','text/plain',undefined])assert.equal(localJsonError({...req,headers:{...req.headers,'content-type':type}}).status,415);
 assert.equal(localJsonError({...req,headers:{...req.headers,host:'localhost.evil.test',origin:'http://localhost.evil.test'}}).status,403);
 assert.equal(localJsonError({...req,headers:{...req.headers,origin:'http://localhost:5173'}}).status,403);
 assert.equal(localJsonError({...req,method:'GET'}).status,405);
 assert.equal(localJsonError({...req,socket:{remoteAddress:'192.0.2.1'}}).status,403);
});
test('bounds parallel upstream work and starts in a rolling window',()=>{
 let time=0;const b=createUpstreamBudget({maxConcurrent:2,maxStarts:3,windowMs:100,now:()=>time});
 const a=b.acquire(),c=b.acquire();assert.ok(a&&c);assert.equal(b.acquire(),null);a();a();const d=b.acquire();assert.ok(d);c();d();assert.equal(b.acquire(),null);
 time=99;assert.equal(b.acquire(),null);time=100;const e=b.acquire();assert.ok(e);e();
 time=90;const f=b.acquire();assert.ok(f);f();assert.throws(()=>createUpstreamBudget({maxConcurrent:0,maxStarts:1,windowMs:1}),/Invalid/);
});
