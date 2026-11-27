import {performance} from 'node:perf_hooks';
import {localJsonError} from './local-policy.mjs';
const routes=['/api/ai/plan','/api/github/project','/api/rooms','/api/race'];
const limit=256;
const entry=()=>({requests:0,active:0,ok:0,clientErrors:0,serverErrors:0,rateLimited:0,aborted:0,times:[],next:0});
/** Process-local aggregates only. Never retain bodies, URLs, identities or credentials. */
export function createObservability({now=()=>performance.now()}={}){
 const stats=new Map(routes.map(r=>[r,entry()]));
 function snapshot(){
 return {version:1,scope:'local-development',routes:Object.fromEntries([...stats].map(([path,s])=>{
 const sorted=[...s.times].sort((a,b)=>a-b);
 return [path,{requests:s.requests,active:s.active,ok:s.ok,clientErrors:s.clientErrors,serverErrors:s.serverErrors,rateLimited:s.rateLimited,aborted:s.aborted,samples:sorted.length,p95Ms:sorted.length?Math.round(sorted[Math.ceil(sorted.length*.95)-1]*100)/100:null}];
 }))};
 }
 function middleware(req,res,next){
 const path=req.url?.split('?')[0];
 if(path==='/api/local/metrics'){
 const denied=localJsonError(req);
 res.writeHead(denied?.status??200,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
 req.resume();res.end(JSON.stringify(denied?{error:denied.error}:snapshot()));return;
 }
 const s=stats.get(path);if(!s)return next();
 const start=now();s.requests++;s.active++;
 let recorded=false;
 const finish=(aborted)=>{
 if(recorded)return;recorded=true;s.active--;
 if(aborted)s.aborted++;
 else if(res.statusCode>=500)s.serverErrors++;
 else if(res.statusCode>=400){s.clientErrors++;if(res.statusCode===429)s.rateLimited++;}
 else if(res.statusCode>=200&&res.statusCode<300)s.ok++;
 const ms=Math.max(0,now()-start);
 if(Number.isFinite(ms)){s.times[s.next]=ms;s.next=(s.next+1)%limit;}
 };
 res.once('finish',()=>finish(false));res.once('close',()=>finish(!res.writableFinished));next();
 }
 return {middleware,snapshot};
}
