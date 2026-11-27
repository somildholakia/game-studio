import {randomBytes} from 'node:crypto';
import {localJsonError} from './local-policy.mjs';
const TTL=30000,MAX_ROOMS=4,MAX_BODY=300000,TICK_MS=1000/60;
const codePattern=/^[a-f0-9]{8}$/;
const name=p=>typeof p==='string'&&p.trim().length>0&&p.length<=32&&!/[\u0000-\u001f\u007f]/.test(p);
const fields={create:['action','name','project','mode'],join:['action','code','name'],input:['action','code','id','token','sequence','input'],start:['action','code','id','token'],snapshot:['action','code','id','token'],leave:['action','code','id','token']};
export function createRaceRegistry(createMatch,now=()=>performance.now()){
 const rooms=new Map();
 const fail=(status,error)=>({status,body:{error}}),ok=body=>({status:200,body});
 function pump(){
  const time=now();
  for(const [code,room] of rooms){
   for(const [id,m] of room.members)if(time-m.seen>=TTL){room.members.delete(id);room.match.remove(id);}
   if(!room.members.size){rooms.delete(code);continue;}
   const elapsed=Math.max(0,time-room.last),count=Math.floor(elapsed/TICK_MS);
   if(count>0){room.match.step(Math.min(8,count));room.last=time-elapsed%TICK_MS;}
  }
 }
 function join(room,code,p,time){
  const id=randomBytes(8).toString('hex'),token=randomBytes(24).toString('hex');
  if(!room.match.add(id,p.name))return fail(409,'Race room is full');
  room.members.set(id,{token,seen:time});return ok({code,id,token,project:room.match.projectJson,snapshot:room.match.snapshot()});
 }
 return {pump,handle(p){
  pump();const time=now();
  if(!p||typeof p!=='object'||Array.isArray(p)||typeof p.action!=='string'||!Object.hasOwn(fields,p.action)||Object.keys(p).some(k=>!fields[p.action].includes(k)))return fail(400,'Invalid race request');
  if(p.action==='create'){
   if(!name(p.name)||typeof p.project!=='string')return fail(400,'Race name and project required');
   if(rooms.size>=MAX_ROOMS)return fail(429,'Local race room limit reached');
   let match;try{match=createMatch(p.project,p.mode);}catch{return fail(400,'Invalid or oversized race project');}
   let code;do{code=randomBytes(4).toString('hex');}while(rooms.has(code));
   const room={match,members:new Map(),last:time};const result=join(room,code,p,time);if(result.status===200)rooms.set(code,room);return result;
  }
  if(typeof p.code!=='string'||!codePattern.test(p.code))return fail(400,'Invalid race code');
  const room=rooms.get(p.code);
  if(p.action==='join'){if(!room)return fail(404,'Race room expired or not found');if(!name(p.name))return fail(400,'Invalid racer name');return join(room,p.code,p,time);}
  const m=room?.members.get(p.id);if(!m||typeof p.token!=='string'||m.token!==p.token)return fail(403,'Race membership expired or invalid');
  if(p.action==='leave'){room.members.delete(p.id);room.match.remove(p.id);if(!room.members.size)rooms.delete(p.code);return ok({left:true});}
  if(p.action==='start'&&!room.match.start(p.id))return fail(409,'Only the host can start a shared race with at least two racers');
  if(p.action==='input'&&room.match.snapshot().phase!=='finished'&&!room.match.input(p.id,p.sequence,p.input))return fail(400,'Invalid or stale race input');
  m.seen=time;return ok({snapshot:room.match.snapshot()});
 }};
}
function send(res,status,body){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));}
export function createRaceMiddleware(loadRegistry){
 let pending=0;
 return (req,res,next)=>{
  if(req.url?.split('?')[0]!=='/api/race')return next();
  const denied=localJsonError(req);if(denied)return send(res,denied.status,{error:denied.error});
  if(pending>=8)return send(res,429,{error:'Local race service busy'});
  pending++;
  void (async()=>{
   let p;try{const chunks=[];let size=0;for await(const chunk of req){const b=Buffer.from(chunk);size+=b.length;if(size>MAX_BODY)throw Error();chunks.push(b);}p=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));}catch{return send(res,400,{error:'Invalid or oversized race request'});}
   const registry=await loadRegistry(),result=registry.handle(p);send(res,result.status,result.body);
  })().catch(()=>{if(!res.headersSent&&!res.destroyed)send(res,500,{error:'Local race operation failed'});else if(!res.destroyed)res.end();}).finally(()=>{pending--;});
 };
}
