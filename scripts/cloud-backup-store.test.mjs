import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudBackupStore,replicateCloudTenant} from '../server/cloud-backup-store.mjs';
import {createBackupServer,createBackupAuthenticator} from '../server/backup-api.mjs';
import {randomBytes,createHash} from 'node:crypto';
import {once} from 'node:events';
function objects(){
 const data=new Map();let seq=0;
 return {data,async get(key,max){const r=data.get(key);if(!r)return null;if(r.bytes.length>max)throw Error('Bound exceeded');return {bytes:Buffer.from(r.bytes),version:r.version};},async put(key,bytes,expected){const r=data.get(key);if((r?.version??null)!==expected)return false;data.set(key,{bytes:Buffer.from(bytes),version:String(++seq)});return true;}};
}
const b=value=>Buffer.from(JSON.stringify(value));
const status=n=>e=>e.status===n;
test('independent service instances share a CAS index, reject conflicting revisions and enforce tenant quotas',async()=>{
 const obj=objects(),a=createCloudBackupStore(obj,{maxProjects:2,maxVersions:3}),other=createCloudBackupStore(obj,{maxProjects:2,maxVersions:3});
 const race=await Promise.allSettled([a.append('one','game',0,b('first')),other.append('one','game',0,b('second'))]);assert.equal(race.filter(r=>r.status==='fulfilled').length,1);assert.equal(race.find(r=>r.status==='rejected').reason.status,409);
 const first=await a.read('one','game',1);assert.deepEqual(await other.list('one','game'),[{revision:1,sha:first.sha}]);
 await Promise.all([a.append('one','game',1,b('edit')),other.append('one','other',0,b('different project'))]);
 assert.deepEqual(await a.restore('one','game',1,2),{revision:3,sha:first.sha});assert.deepEqual((await other.read('one','game',3)).bytes,first.bytes);
 await assert.rejects(a.append('one','game',3,b('more')),status(429));await assert.rejects(a.append('one','third',0,b('third')),status(429));
 assert.deepEqual(await a.list('two','game'),[]);await assert.rejects(a.read('two','game',1),status(404));await other.append('two','game',0,b('private'));
 assert.deepEqual((await a.read('two','game',1)).bytes,b('private'));await assert.rejects(a.list('../one','game'),status(400));
});
test('copies all verified history into an independent store and restores after primary loss',async()=>{
 const primary=objects(),secondary=objects(),replacement=objects(),a=createCloudBackupStore(primary);
 await a.append('tenant','level',0,b({name:'original'}));await a.append('tenant','level',1,b({name:'changed'}));await a.append('other','private',0,b({name:'secret'}));
 const report=await replicateCloudTenant(primary,secondary,'tenant');assert.deepEqual({projects:report.projects,revisions:report.revisions},{projects:1,revisions:2});assert.ok(report.bytes>0);
 primary.data.clear();await replicateCloudTenant(secondary,replacement,'tenant');const recovered=createCloudBackupStore(replacement);
 assert.deepEqual((await recovered.read('tenant','level',1)).bytes,b({name:'original'}));assert.deepEqual((await recovered.read('tenant','level',2)).bytes,b({name:'changed'}));assert.deepEqual(await recovered.list('other','private'),[]);
 await recovered.append('tenant','level',2,b('diverged'));await assert.rejects(replicateCloudTenant(secondary,replacement,'tenant'),status(409));
});
test('corrupted content cannot be read, restored or published to a recovery index',async()=>{
 const primary=objects(),secondary=objects(),a=createCloudBackupStore(primary);
 const r=await a.append('tenant','game',0,b('original'));const key='studio/tenant/game/blobs/'+r.sha+'.json';primary.data.get(key).bytes=b('tampered');
 await assert.rejects(a.read('tenant','game',1),status(500));await assert.rejects(a.restore('tenant','game',1,1),status(500));
 await assert.rejects(replicateCloudTenant(primary,secondary,'tenant'),status(500));assert.deepEqual(await createCloudBackupStore(secondary).list('tenant','game'),[]);
});
test('authenticated HTTP API awaits async storage and preserves tenant and revision preconditions',async t=>{
 const store=createCloudBackupStore(objects()),a=randomBytes(32).toString('hex'),btoken=randomBytes(32).toString('hex');
 const credentials=[a,btoken].map((token,i)=>({tokenHash:createHash('sha256').update(token).digest('hex'),tenant:'tenant'+i,write:true}));
 const server=createBackupServer({store,authenticate:createBackupAuthenticator(credentials)});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
 const base='http://127.0.0.1:'+server.address().port+'/v1/projects/game/revisions';
 const request=(key,method='GET',suffix='',body,head)=>fetch(base+suffix,{method,body,headers:{Authorization:'Bearer '+key,...(body!==undefined?{'Content-Type':'application/json'}:{}),...(head!==undefined?{'If-Match':'"'+head+'"'}:{})}});
 const first=await request(a,'PUT','','{"name":"a"}',0);assert.equal(first.status,201);assert.equal((await first.json()).revision,1);assert.equal((await request(btoken,'GET','/1')).status,404);
 assert.deepEqual((await (await request(a)).json()).revisions.map(r=>r.revision),[1]);assert.equal((await request(a,'PUT','','{}',0)).status,409);
 assert.equal((await request(a,'POST','/1/restore',undefined,1)).status,201);assert.equal(await (await request(a,'GET','/2')).text(),'{"name":"a"}');
});
