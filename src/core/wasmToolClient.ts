import {readWasmTool,checkWasmInput,type WasmTool,type WasmInput} from './wasmTools';
import {readPlan} from '../ai/plan';
/** Worker gets only a manifest and two numeric parameters, never project data. */
export function runWasmTool(tool:WasmTool,input:WasmInput,signal?:AbortSignal):Promise<string>{
 const safe=readWasmTool(JSON.stringify(tool)),params=checkWasmInput(input);
 return new Promise((resolve,reject)=>{
 if(signal?.aborted){reject(Error('Extension cancelled'));return;}
 const worker=new Worker(new URL('./wasmToolWorker.ts',import.meta.url),{type:'module'});
 let done=false;const abort=()=>finish(Error('Extension cancelled'));
 const timeout=setTimeout(()=>finish(Error('Extension exceeded 1500 ms execution budget')),1500);
 function finish(error?:Error,value?:string){if(done)return;done=true;clearTimeout(timeout);signal?.removeEventListener('abort',abort);worker.terminate();if(error)reject(error);else resolve(value!);}
 signal?.addEventListener('abort',abort,{once:true});
 worker.onerror=()=>finish(Error('Extension worker failed'));
 worker.onmessage=(e:MessageEvent)=>{try{if(!e.data?.ok)throw Error(String(e.data?.error??'Extension failed').slice(0,300));const raw=JSON.stringify({version:1,summary:safe.name,commands:e.data.commands});const plan=readPlan(raw);for(const c of plan.commands){if(c.op!=='add'||!['box','sphere'].includes(c.kind)||!safe.capabilities.includes(c.kind==='box'?'add-box':'add-sphere'))throw Error('Extension exceeded capability');}finish(undefined,raw);}catch(err){finish(err instanceof Error?err:Error('Invalid extension output'));}};
 worker.postMessage({tool:safe,input:params});
 });
}
