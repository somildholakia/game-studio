import {randomBytes} from 'node:crypto';
const TTL=30000,MAX_ROOMS=32,MAX_MEMBERS=8,MAX_BODY=4096;
const position=p=>Array.isArray(p)&&p.length===3&&p.every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1e8);
const fingerprint=p=>typeof p==='string'&&/^[a-f0-9]{1,12}-[a-f0-9]{8}-[a-f0-9]{8}$/.test(p);
const name=p=>typeof p==='string'&&p.trim().length>0&&p.length<=32&&!/[\u0000-\u001f\u007f]/.test(p);
export function createRoomRegistry(now=Date.now){
 const rooms=new Map();
 const fail=(status,error)=>({status,body:{error}});
 const ok=body=>({status:200,body});
 function prune(time){for(const [code,room] of rooms){for(const [id,member] of room.members)if(time-member.seen>=TTL)room.members.delete(id);if(!room.members.size)rooms.delete(code);}}
 function peers(room,member){return [...room.members.values()].filter(m=>m.id!==member.id).map(m=>({id:m.id,name:m.name,position:m.position}));}
 function join(room,code,p,time){if(room.members.size>=MAX_MEMBERS)return fail(409,'Room is full');
 const id=randomBytes(8).toString('hex'),token=randomBytes(24).toString('hex'),member={id,token,name:p.name.trim(),position:[...p.position],seen:time,lastUpdate:time-100,sequence:-1};
 room.members.set(id,member);return ok({code,id,token,peers:peers(room,member)});}
 return {handle(p){
 const time=now();prune(time);
 if(!p||typeof p!=='object'||Array.isArray(p))return fail(400,'Invalid room request');
 if(p.action==='create'||p.action==='join'){
 if(!fingerprint(p.fingerprint)||!name(p.name)||!position(p.position))return fail(400,'Invalid room name, game or position');
 if(p.action==='create'){if(rooms.size>=MAX_ROOMS)return fail(429,'Local room limit reached');let code;do{code=randomBytes(4).toString('hex');}while(rooms.has(code));const room={fingerprint:p.fingerprint,members:new Map()};rooms.set(code,room);return join(room,code,p,time);}
 if(typeof p.code!=='string'||!/^([a-f0-9]{8})$/.test(p.code))return fail(400,'Invalid room code');
 const room=rooms.get(p.code);if(!room)return fail(404,'Room expired or not found');if(room.fingerprint!==p.fingerprint)return fail(409,'Room uses a different level version');
 return join(room,p.code,p,time);
 }
 if(!['update','leave'].includes(p.action)||typeof p.code!=='string'||typeof p.id!=='string'||typeof p.token!=='string')return fail(400,'Invalid room operation');
 const room=rooms.get(p.code),member=room?.members.get(p.id);if(!member||member.token!==p.token)return fail(403,'Room membership expired or invalid');
 if(p.action==='leave'){room.members.delete(p.id);if(!room.members.size)rooms.delete(p.code);return ok({left:true});}
 if(!position(p.position)||!Number.isSafeInteger(p.sequence)||p.sequence<=member.sequence)return fail(400,'Invalid or stale position update');
 if(time-member.lastUpdate<100)return fail(429,'Position updates are too frequent');
 member.sequence=p.sequence;member.position=[...p.position];member.seen=member.lastUpdate=time;return ok({peers:peers(room,member)});
 }};
}
function send(res,status,body){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));}
export function createRoomMiddleware(registry=createRoomRegistry()){
 return (req,res,next)=>{
 if(req.url?.split('?')[0]!=='/api/rooms')return next();
 if(req.method!=='POST')return send(res,405,{error:'POST required'});
 if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)||!req.headers.host||!['localhost','127.0.0.1','[::1]'].includes(req.headers.host.replace(/:\d+$/,''))||req.headers.origin!=='http://'+req.headers.host)return send(res,403,{error:'Same-origin local access required'});
 if(!req.headers['content-type']?.startsWith('application/json'))return send(res,415,{error:'JSON required'});
 void (async()=>{let p;try{const chunks=[];let size=0;for await(const chunk of req){const b=Buffer.from(chunk);size+=b.length;if(size>MAX_BODY)throw Error('limit');chunks.push(b);}p=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return send(res,400,{error:'Invalid or oversized request'});}
 const result=registry.handle(p);send(res,result.status,result.body);})().catch(()=>{if(!res.headersSent)send(res,500,{error:'Local room operation failed'});else res.end();});
 };
}
export const roomMiddleware=createRoomMiddleware();
