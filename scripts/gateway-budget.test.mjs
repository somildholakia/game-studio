import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createServer,request} from 'node:http';
import {createAiMiddleware} from '../server/ai-proxy.mjs';
import {createGithubMiddleware} from '../server/github-proxy.mjs';
import {createUpstreamBudget} from '../server/local-policy.mjs';
function call(middleware,url,input,type='application/json'){
 return new Promise((resolve,reject)=>{
 const req=Readable.from([JSON.stringify(input)]);req.url=url;req.method='POST';req.socket={remoteAddress:'127.0.0.1'};req.headers={host:'127.0.0.1:5173',origin:'http://127.0.0.1:5173','content-type':type};
 let status;const res={headersSent:false,writeHead(s){status=s;this.headersSent=true;},end(body){resolve({status,body:JSON.parse(body)});}};
 middleware(req,res,()=>reject(Error('Not handled')));
 });
}
const aiInput={provider:'openai',model:'test',apiKey:'test-secret',context:'schema',task:'build'};
const githubInput={repository:'owner/repo',branch:'main',path:'world.game-studio.json',action:'inspect',token:'test'};
test('AI bounds parallel calls, rejects invalid media types, and releases slots after errors',async t=>{
 const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});
 let started,finish;const firstStarted=new Promise(r=>{started=r;});let calls=0;
 globalThis.fetch=async()=>{calls++;if(calls===1){started();await new Promise(r=>{finish=r;});throw Error('upstream failed');}return new Response(JSON.stringify({choices:[{message:{content:'{}'}}]}));};
 const m=createAiMiddleware(createUpstreamBudget({maxConcurrent:1,maxStarts:5,windowMs:60000}));
 assert.equal((await call(m,'/api/ai/plan',aiInput,'application/jsonp')).status,415);
 const first=call(m,'/api/ai/plan',aiInput);await firstStarted;
 assert.equal((await call(m,'/api/ai/plan',aiInput)).status,429);assert.equal(calls,1);finish();assert.equal((await first).status,502);
 assert.equal((await call(m,'/api/ai/plan',aiInput)).status,200);assert.equal(calls,2);
});
test('GitHub limits starts, validates before admission and recovers after the time window',async t=>{
 const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});let calls=0,time=0;
 globalThis.fetch=async()=>{calls++;return new Response(null,{status:404});};
 const m=createGithubMiddleware(createUpstreamBudget({maxConcurrent:1,maxStarts:1,windowMs:100,now:()=>time}));
 assert.equal((await call(m,'/api/github/project',{...githubInput,action:'save'})).status,400);assert.equal(calls,0);
 assert.equal((await call(m,'/api/github/project',githubInput)).status,200);
 assert.equal((await call(m,'/api/github/project',githubInput)).status,429);assert.equal(calls,1);
 time=100;assert.equal((await call(m,'/api/github/project',githubInput)).status,200);assert.equal(calls,2);
});

test('actual loopback HTTP requests reject non-JSON and cross-origin requests before upstream',async t=>{
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({choices:[{message:{content:'{}'}}]}));};
 t.after(()=>{globalThis.fetch=original;});
 const middleware=createAiMiddleware();const server=createServer((req,res)=>middleware(req,res,()=>{res.writeHead(404);res.end();}));
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections();}));
 const origin='http://127.0.0.1:'+server.address().port;
 function send(type,header=origin){return new Promise((resolve,reject)=>{const body=JSON.stringify(aiInput);const req=request(origin+'/api/ai/plan',{method:'POST',headers:{'Content-Type':type,'Content-Length':Buffer.byteLength(body),Origin:header}},res=>{let data='';res.setEncoding('utf8');res.on('data',c=>data+=c);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,data:JSON.parse(data)}));});req.on('error',reject);req.end(body);});}
 assert.equal((await send('application/jsonp')).status,415);assert.equal((await send('application/json','https://example.invalid')).status,403);assert.equal(calls,0);
 const ok=await send('application/json; charset=utf-8');assert.equal(ok.status,200);assert.equal(ok.headers['cache-control'],'no-store');assert.equal(ok.headers['x-content-type-options'],'nosniff');assert.equal(calls,1);assert.ok(!JSON.stringify(ok).includes('test-secret'));
});
