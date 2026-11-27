/** Local development only: exact same-origin JSON request policy and bounded upstream admission. */
export function localJsonError(req){
 if(req.method!=='POST')return {status:405,error:'POST required'};
 const host=req.headers.host;
 if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)||typeof host!=='string'||!/^(?:localhost|127\.0\.0\.1|\[::1\])(?::[0-9]{1,5})?$/.test(host)||req.headers.origin!=='http://'+host)return {status:403,error:'Same-origin local access required'};
 const type=req.headers['content-type'];
 if(typeof type!=='string'||type.split(';',1)[0].trim().toLowerCase()!=='application/json')return {status:415,error:'JSON required'};
 return null;
}
/** No credential storage; bounded timestamps and idempotent release. Not tenant-aware. */
export function createUpstreamBudget({maxConcurrent,maxStarts,windowMs,now=Date.now}){
 if(![maxConcurrent,maxStarts,windowMs].every(n=>Number.isSafeInteger(n)&&n>0))throw Error('Invalid upstream budget');
 let active=0,lastTime=-Infinity;const starts=[];
 return {acquire(){
 const time=Math.max(lastTime,now());if(!Number.isFinite(time))throw Error('Invalid budget clock');lastTime=time;
 while(starts.length&&time-starts[0]>=windowMs)starts.shift();
 if(active>=maxConcurrent||starts.length>=maxStarts)return null;
 starts.push(time);active++;let released=false;
 return ()=>{if(released)return;released=true;active--;};
 }};
}
