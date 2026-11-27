import {executeWasmTool,type WasmTool,type WasmInput} from './wasmTools';
self.onmessage=async(e:MessageEvent<{tool:WasmTool;input:WasmInput}>)=>{try{const commands=await executeWasmTool(e.data.tool,e.data.input);self.postMessage({ok:true,commands});}catch(err){self.postMessage({ok:false,error:err instanceof Error?err.message:'Extension failed'});}};
