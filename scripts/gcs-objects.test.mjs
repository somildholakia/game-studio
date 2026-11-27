import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {createGcsObjectStore} from '../server/gcs-objects.mjs';
import {createCloudBackupStore} from '../server/cloud-backup-store.mjs';
test('JSON API adapter performs generation CAS and generation-specific media reads over real HTTP',async t=>{
 const data=new Map();let gen=0,gets=0,conflicts=0;const requests=[];
 const server=createServer(async(req,res)=>{
  const u=new URL(req.url,'http://localhost');requests.push(u.pathname);if(req.headers.authorization!=='Bearer synthetic-access-token'){res.writeHead(401);res.end();return;}
  const send=(status,body)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(body));};
  if(req.method==='POST'&&u.pathname==='/upload/storage/v1/b/test-bucket/o'){
   const key=u.searchParams.get('name'),expected=u.searchParams.get('ifGenerationMatch'),old=data.get(key);
   if(expected!==(old?.generation??'0')){conflicts++;send(412,{});return;}
   const chunks=[];for await(const chunk of req)chunks.push(chunk);const bytes=Buffer.concat(chunks),generation=String(++gen);
   // Recheck after streaming request, as a real compare-and-swap store must do.
   if(expected!==(data.get(key)?.generation??'0')){conflicts++;send(412,{});return;}
   data.set(key,{bytes,generation});send(200,{generation,size:String(bytes.length)});return;
  }
  if(req.method==='GET'&&u.pathname.startsWith('/storage/v1/b/test-bucket/o/')){
   const key=decodeURIComponent(u.pathname.slice('/storage/v1/b/test-bucket/o/'.length)),r=data.get(key);if(!r){send(404,{});return;}
   if(u.searchParams.get('alt')==='media'){gets++;if(u.searchParams.get('generation')!==r.generation){send(404,{});return;}res.writeHead(200,{'Content-Length':r.bytes.length});res.end(r.bytes);return;}
   send(200,{generation:r.generation,size:String(r.bytes.length)});return;
  }send(404,{});
 });
 server.listen(0,'127.0.0.1');await once(server,'listening');t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
 const origin='http://127.0.0.1:'+server.address().port;
 const adapter=createGcsObjectStore({bucket:'test-bucket',accessToken:async()=>'synthetic-access-token',fetcher:(url,options)=>{const u=new URL(url);assert.equal(u.origin,'https://storage.googleapis.com');assert.equal(options.redirect,'error');return fetch(origin+u.pathname+u.search,options);}});
 const store=createCloudBackupStore(adapter),first=Buffer.from('{"name":"one"}'),second=Buffer.from('{"name":"two"}');
 const a=await store.append('tenant','game',0,first);await store.append('tenant','game',1,second);assert.deepEqual((await store.read('tenant','game',1)).bytes,first);
 assert.deepEqual(await store.restore('tenant','game',1,2),{revision:3,sha:a.sha});assert.ok(gets>=3);assert.ok(conflicts>=1);
 assert.ok(requests.some(p=>p.includes('studio%2Ftenant%2Findex.json')));assert.equal((await adapter.get('studio/tenant/index.json',32768)).version,String(gen));
 await assert.rejects(adapter.get('studio/tenant/index.json',1),e=>e.status===500);await assert.rejects(adapter.get('../escape',100));
});
