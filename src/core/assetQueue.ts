/** Limit concurrent model decoders; stale queued jobs never begin. Active jobs must
 * check their own validity after decoding to dispose results if the scene changed. */
export function createAssetQueue(concurrency=2){
 if(!Number.isSafeInteger(concurrency)||concurrency<1||concurrency>8)throw Error('Invalid decoder concurrency');
 type Job={valid:()=>boolean;run:()=>Promise<void>;resolve:()=>void;reject:(e:unknown)=>void};
 let closed=false,active=0;const pending:Job[]=[];
 function drain(){
 while(!closed&&active<concurrency&&pending.length){
  const job=pending.shift()!;if(!job.valid()){job.resolve();continue;}
  active++;void Promise.resolve().then(()=>job.valid()?job.run():undefined).then(job.resolve,job.reject).finally(()=>{active--;drain();});
 }
 }
 function prune(){for(let i=pending.length-1;i>=0;i--)if(!pending[i].valid()){const [job]=pending.splice(i,1);job.resolve();}}
 return {enqueue(valid:()=>boolean,run:()=>Promise<void>){if(closed||!valid())return Promise.resolve();prune();return new Promise<void>((resolve,reject)=>{pending.push({valid,run,resolve,reject});drain();});},prune,close(){closed=true;for(const job of pending.splice(0))job.resolve();},stats:()=>({active,pending:pending.length,closed})};
}
