import {randomBytes} from 'node:crypto';
import {createServer} from 'node:http';
const safeId=/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;
const validName=s=>typeof s==='string'&&s.trim().length>0&&s.length<=32&&!/[\u0000-\u001f\u007f]/.test(s);
const TTL=30000,MAX_TICK=8,TICK_MS=1000/60,MAX_MATCH_MS=300000;
const fields={join:['action','course'],poll:['action','ticket'],input:['action','ticket','sequence','input'],leave:['action','ticket']};
const fail=(status,error)=>({status,body:{error}}),ok=body=>({status:200,body});
const random=n=>randomBytes(n).toString('hex');
/** One private matchmaking process; only operator-approved shared courses.
 * Authenticated identities, not client identifiers, select queues and membership. */
export function createMatchmaker({createMatch,courses,now=()=>performance.now(),maxTickets=64,maxMatches=16,maxPerTenant=16}){
 if(typeof createMatch!=='function'||!Array.isArray(courses)||courses.length<1||courses.length>16||![maxTickets,maxMatches,maxPerTenant].every(n=>Number.isSafeInteger(n)&&n>0&&n<=256))throw Error('Invalid matchmaking config');
 const catalog=new Map();
 for(const c of courses){if(!c||typeof c.id!=='string'||!safeId.test(c.id)||catalog.has(c.id)||typeof c.project!=='string')throw Error('Invalid course');const match=createMatch(c.project,'shared');catalog.set(c.id,match.projectJson);}
 const members=new Map(),matches=new Map(),queues=new Map();
 const principalKey=p=>JSON.stringify([p.tenant,p.subject]);
 const queueKey=m=>JSON.stringify([m.tenant,m.course]);
 function remove(m){
  members.delete(m.key);const key=queueKey(m),q=queues.get(key);if(q){const at=q.indexOf(m);if(at>=0)q.splice(at,1);if(!q.length)queues.delete(key);}
  if(m.match){const game=matches.get(m.match);if(game){game.match.remove(m.racer);game.members.delete(m);if(!game.members.size)matches.delete(m.match);}}
 }
 function pump(){
  const time=now();
  for(const m of members.values())if(time-m.seen>=TTL)remove(m);
  for(const [id,g] of matches){
   if(time-g.started>=MAX_MATCH_MS){for(const m of [...g.members])remove(m);continue;}
   const elapsed=Math.max(0,time-g.last),count=Math.floor(elapsed/TICK_MS);
   if(count>0){g.match.step(Math.min(MAX_TICK,count));g.last=time-elapsed%TICK_MS;}
   if(!g.members.size)matches.delete(id);
  }
  for(const [key,q] of queues){
   while(q.length>=2&&matches.size<maxMatches){
    const [a,b]=q.splice(0,2);const match=createMatch(catalog.get(a.course),'shared');
    const id=random(16);a.racer=random(8);b.racer=random(8);
    if(!match.add(a.racer,a.name)||!match.add(b.racer,b.name)||!match.start(a.racer))throw Error('Configured race could not start');
    const game={match,members:new Set([a,b]),started:time,last:time};
    matches.set(id,game);a.match=b.match=id;
   }if(!q.length)queues.delete(key);
  }
 }
 function view(m){
  if(!m.match)return ok({phase:'queued',ticket:m.ticket,course:m.course});
  const g=matches.get(m.match);if(!g)return fail(410,'Match expired');
  return ok({phase:'matched',ticket:m.ticket,course:m.course,id:m.racer,project:g.match.projectJson,snapshot:g.match.snapshot()});
 }
 function handle(p,body){
  if(!p||typeof p.tenant!=='string'||!safeId.test(p.tenant)||typeof p.subject!=='string'||!p.subject.length||p.subject.length>255||!validName(p.name))return fail(401,'Authentication required');
  if(!body||typeof body!=='object'||Array.isArray(body)||typeof body.action!=='string'||!Object.hasOwn(fields,body.action)||Object.keys(body).some(k=>!fields[body.action].includes(k)))return fail(400,'Invalid matchmaking request');
  pump();const key=principalKey(p),existing=members.get(key),time=now();
  if(body.action==='join'){
   if(typeof body.course!=='string'||!catalog.has(body.course))return fail(404,'Course not found');
   if(existing){if(existing.course!==body.course)return fail(409,'Leave current queue or match first');existing.seen=time;return view(existing);}
   if(members.size>=maxTickets||[...members.values()].filter(m=>m.tenant===p.tenant).length>=maxPerTenant)return fail(429,'Matchmaking capacity reached');
   const m={key,tenant:p.tenant,name:p.name,course:body.course,ticket:random(24),seen:time,match:null,racer:null};
   members.set(key,m);const qkey=queueKey(m),q=queues.get(qkey)??[];q.push(m);queues.set(qkey,q);pump();return view(m);
  }
  if(!existing||typeof body.ticket!=='string'||existing.ticket!==body.ticket)return fail(404,'Match ticket not found');
  if(body.action==='leave'){remove(existing);pump();return ok({phase:'left'});}
  if(body.action==='input'){
   if(!existing.match)return fail(409,'Match not started');
   const game=matches.get(existing.match);if(!game)return fail(410,'Match expired');
   if(game.match.snapshot().phase!=='finished'&&!game.match.input(existing.racer,body.sequence,body.input))return fail(400,'Invalid or stale movement input');
  }
  existing.seen=time;return view(existing);
 }
 return {pump,handle,counts:()=>({tickets:members.size,matches:matches.size,queues:queues.size})};
}
function send(res,status,body){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));}
/** Private loopback service. HTTPS termination and distributed admission are deployment concerns. */
export function createMatchmakingServer({matchmaker,authenticate,maxConcurrent=16,autoTick=true}){
 if(!Number.isSafeInteger(maxConcurrent)||maxConcurrent<1||maxConcurrent>64)throw Error('Invalid concurrency limit');
 let active=0,timer;
 const server=createServer({requestTimeout:10000,headersTimeout:5000,maxHeaderSize:8192},(req,res)=>{
  if(req.url!=='/v1/matchmaking'||req.method!=='POST'){send(res,404,{error:'Matchmaking endpoint not found'});return;}
  if(active>=maxConcurrent){send(res,429,{error:'Matchmaking busy'});return;}active++;
  void (async()=>{
   const p=await authenticate(req.headers.authorization);if(!p){send(res,401,{error:'Authentication required'});return;}
   if(req.headers['content-type']?.split(';')[0].trim().toLowerCase()!=='application/json'){send(res,415,{error:'JSON required'});return;}
   const length=req.headers['content-length'];if(length!==undefined&&(!/^\d+$/.test(length)||Number(length)>8192)){send(res,413,{error:'Request too large'});return;}
   let body;try{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>8192){send(res,413,{error:'Request too large'});return;}chunks.push(chunk);}body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));}catch{if(!res.destroyed&&!res.headersSent)send(res,400,{error:'Invalid JSON'});return;}
   const result=matchmaker.handle(p,body);send(res,result.status,result.body);
  })().catch(()=>{if(!res.headersSent&&!res.destroyed)send(res,500,{error:'Matchmaking operation failed'});else if(!res.destroyed)res.end();}).finally(()=>{active--;});
 });
 server.maxConnections=128;
 if(autoTick){server.once('listening',()=>{timer=setInterval(()=>matchmaker.pump(),TICK_MS);timer.unref();});server.once('close',()=>clearInterval(timer));}
 return server;
}
