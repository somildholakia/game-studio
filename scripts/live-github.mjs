// Explicit opt-in, synthetic-only live test. Never run with arbitrary repo/token targets.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createGithubMiddleware} from '../server/github-proxy.mjs';
import {writeFile,mkdir} from 'node:fs/promises';
const {GITHUB_REPOSITORY:repository,GITHUB_TOKEN:token,GITHUB_RUN_ID:run,GITHUB_RUN_ATTEMPT:attempt,GITHUB_SHA:sha}=process.env;
assert.ok(process.env.GAME_STUDIO_LIVE_GIT==='1'&&repository==='somildholakia/game-studio'&&token&&/^\d+$/.test(run??'')&&/^\d+$/.test(attempt??'')&&/^[0-9a-f]{40}$/.test(sha??''),'Live Git smoke requires explicit CI opt-in and the Game Studio repository');
const branch='validation/project-save-'+run+'-'+attempt,path='validation/synthetic.game-studio.json';
const endpoint='https://api.github.com/repos/'+repository;
const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'GameStudio-Live-Smoke','Content-Type':'application/json'};
async function api(suffix,method='GET',body){
 const response=await fetch(endpoint+suffix,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(30000),redirect:'error'});
 return {status:response.status,data:response.status===204?null:await response.json()};
}
const middleware=createGithubMiddleware();
const server=createServer((req,res)=>middleware(req,res,()=>{res.writeHead(404);res.end();}));
let created=false;
const report={repository,branch,run,source:sha,checks:[],cleanup:false};
try{
 const createdRef=await api('/git/refs','POST',{ref:'refs/heads/'+branch,sha});
 assert.equal(createdRef.status,201,'Temporary validation branch creation failed');created=true;
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const origin='http://127.0.0.1:'+server.address().port;
 async function call(action,extra={}){
  const response=await fetch(origin+'/api/github/project',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({repository,branch,path,token,action,...extra}),signal:AbortSignal.timeout(40000)});
  return {status:response.status,data:await response.json()};
 }
 const first=JSON.stringify({version:1,name:'Synthetic revision A',entities:[]});
 const second=JSON.stringify({version:1,name:'Synthetic revision B',entities:[]});
 const missing=await call('inspect');assert.equal(missing.status,200);assert.equal(missing.data.exists,false);report.checks.push('missing file');
 const saved=await call('save',{expectedSha:null,project:first});assert.equal(saved.status,200);assert.match(saved.data.sha,/^[a-f0-9]{40}$/);assert.match(saved.data.commit,/^[a-f0-9]{40}$/);report.checks.push('create');report.firstCommit=saved.data.commit;
 const read=await call('inspect');assert.equal(read.status,200);assert.equal(read.data.project,first);assert.equal(read.data.sha,saved.data.sha);report.checks.push('read');
 const updated=await call('save',{expectedSha:read.data.sha,project:second});assert.equal(updated.status,200);assert.notEqual(updated.data.sha,saved.data.sha);report.secondCommit=updated.data.commit;report.checks.push('update');
 const stale=await call('save',{expectedSha:read.data.sha,project:first});assert.equal(stale.status,409);report.checks.push('stale conflict');
 const current=await call('inspect');assert.equal(current.status,200);assert.equal(current.data.project,second);report.checks.push('no lost update');
 const historical=await api('/contents/'+path+'?ref='+encodeURIComponent(saved.data.commit));assert.equal(historical.status,200);assert.equal(Buffer.from(historical.data.content,'base64').toString('utf8'),first);report.checks.push('historical revision');
 const restored=await call('save',{expectedSha:current.data.sha,project:first});assert.equal(restored.status,200);assert.notEqual(restored.data.commit,saved.data.commit);report.restoreCommit=restored.data.commit;
 const reread=await call('inspect');assert.equal(reread.status,200);assert.equal(reread.data.project,first);report.checks.push('restore as new commit');
}finally{
 if(server.listening){await new Promise(resolve=>{server.close(resolve);server.closeAllConnections();});}
 try{if(created){const deleted=await api('/git/refs/heads/'+branch,'DELETE');report.cleanup=deleted.status===204;assert.ok(report.cleanup,'Temporary branch cleanup failed');}}finally{
 await mkdir('reports',{recursive:true});await writeFile('reports/live-github.json',JSON.stringify(report,null,2)+'\n');
 }
}
console.log('Live Git smoke passed: '+report.checks.join(', '));
