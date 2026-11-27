export type TimingSummary={samples:number;p95Ms:number;maxMs:number};
export type RuntimeProfile={frame:TimingSummary;simulation:TimingSummary;renderSubmit:TimingSummary};
/** A fixed-size frame window. No unbounded performance marks or samples. */
export function createRuntimeProfiler(capacity=180){
 if(!Number.isSafeInteger(capacity)||capacity<1||capacity>1024)throw Error('Invalid profiling capacity');
 const frame=new Float64Array(capacity),simulation=new Float64Array(capacity),render=new Float64Array(capacity);let size=0,next=0;
 function summary(values:Float64Array):TimingSummary{
  const sorted=Array.from(values.subarray(0,size)).sort((a,b)=>a-b);
  return {samples:size,p95Ms:size?Math.round(sorted[Math.ceil(size*.95)-1]*100)/100:0,maxMs:size?Math.round(sorted[size-1]*100)/100:0};
 }
 return {record(frameMs:number,simulationMs:number,renderSubmitMs:number){
  if(![frameMs,simulationMs,renderSubmitMs].every(n=>Number.isFinite(n)&&n>=0)||frameMs===0)return;
  frame[next]=frameMs;simulation[next]=simulationMs;render[next]=renderSubmitMs;next=(next+1)%capacity;size=Math.min(size+1,capacity);
 },snapshot():RuntimeProfile{return {frame:summary(frame),simulation:summary(simulation),renderSubmit:summary(render)};},reset(){size=next=0;}};
}
