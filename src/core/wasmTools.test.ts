import {describe,it,expect} from 'vitest';
import {executeWasmTool,inspectWasm,readWasmTool} from './wasmTools';
import {sampleModule,fixtureTool,infiniteModule} from './wasmToolFixture';
describe('capability-only WebAssembly ABI',()=>{
 it('executes a compiled extension to bounded scene commands',async()=>{const tool=readWasmTool(JSON.stringify(fixtureTool()));expect(await executeWasmTool(tool,{count:1,spacing:2})).toEqual([{op:'add',kind:'box',patch:{name:'Extension box 1',position:[1,2,3],scale:[1,1,1],role:'decoration',color:'#6688bb'}}]);});
 it('rejects undeclared or unknown imports, memory and start sections',async()=>{await expect(executeWasmTool(fixtureTool(sampleModule('add_sphere')),{count:1,spacing:1})).rejects.toThrow(/import/);await expect(executeWasmTool(fixtureTool(sampleModule('fetch')),{count:1,spacing:1})).rejects.toThrow(/import/);for(const id of [4,5,8,9,11,12])expect(()=>inspectWasm(Uint8Array.from([0,97,115,109,1,0,0,0,id,0]))).toThrow(/forbidden/);});
 it('accepts the loop fixture for browser worker timeout testing without running it in process',()=>{expect(WebAssembly.validate(infiniteModule())).toBe(true);expect(()=>inspectWasm(infiniteModule())).not.toThrow();});
});
