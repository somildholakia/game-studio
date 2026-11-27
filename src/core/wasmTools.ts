/** Capability-only Wasm extension ABI. No linear memory, tables, start functions or WASI. */
export const MAX_WASM_BYTES=32768;
export type WasmTool={format:'game-studio-wasm-tool';version:1;name:string;capabilities:('add-box'|'add-sphere')[];module:string};
export type WasmInput={count:number;spacing:number};
export type WasmCommand={op:'add';kind:'box'|'sphere';patch:{name:string;position:[number,number,number];scale:[number,number,number];role:'decoration'|'solid';color:string}};
export function wasmBytes(encoded:string):Uint8Array<ArrayBuffer>{
 if(typeof encoded!=='string'||encoded.length>Math.ceil(MAX_WASM_BYTES/3)*4||!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded))throw Error('Invalid Wasm module encoding');
 const data=atob(encoded),bytes=Uint8Array.from(data,c=>c.charCodeAt(0));if(bytes.length<8||bytes.length>MAX_WASM_BYTES)throw Error('Invalid Wasm module size');return bytes;
}
export function inspectWasm(bytes:Uint8Array):void{
 if(bytes.length<8||bytes.length>MAX_WASM_BYTES||![0,97,115,109,1,0,0,0].every((n,i)=>bytes[i]===n))throw Error('Invalid WebAssembly header');
 let i=8;
 function uint(){let n=0;for(let shift=0;shift<35;shift+=7){if(i>=bytes.length)throw Error('Truncated Wasm section');const b=bytes[i++];n+=(b&127)*2**shift;if(!(b&128)){if(n>0xffffffff)throw Error('Invalid Wasm section length');return n;}}throw Error('Invalid Wasm section length');}
 while(i<bytes.length){const id=bytes[i++],size=uint(),end=i+size;
 if(end>bytes.length)throw Error('Truncated Wasm section');
 // Custom metadata, function types, imports, functions, globals, exports and code only.
 // Reject tables, memory, data, start, element, tags and unknown proposals.
 if(![0,1,2,3,6,7,10].includes(id))throw Error('Wasm extension uses a forbidden section');
 if(id===1){const count=uint();if(count>64)throw Error('Too many Wasm function types');for(let j=0;j<count;j++){if(i>=end||bytes[i++]!==0x60)throw Error('Only numeric Wasm function types are permitted');const params=uint();if(params>16)throw Error('Too many Wasm parameters');for(let k=0;k<params;k++)if(i>=end||![0x7c,0x7d,0x7e,0x7f].includes(bytes[i++]))throw Error('Only numeric Wasm parameters are permitted');const results=uint();if(results>1)throw Error('Too many Wasm results');for(let k=0;k<results;k++)if(i>=end||![0x7c,0x7d,0x7e,0x7f].includes(bytes[i++]))throw Error('Only numeric Wasm results are permitted');}if(i!==end)throw Error('Invalid Wasm type section');}
 i=end;
 }
}
export function readWasmTool(raw:string):WasmTool{
 if(raw.length>50000)throw Error('Wasm tool manifest exceeds limit');const p=JSON.parse(raw) as WasmTool;
 if(!p||p.format!=='game-studio-wasm-tool'||p.version!==1||typeof p.name!=='string'||!p.name.trim()||p.name.length>100||!Array.isArray(p.capabilities)||p.capabilities.length<1||p.capabilities.length>2||new Set(p.capabilities).size!==p.capabilities.length||!p.capabilities.every(c=>c==='add-box'||c==='add-sphere')||Object.keys(p).some(k=>!['format','version','name','capabilities','module'].includes(k)))throw Error('Invalid Wasm tool manifest');
 inspectWasm(wasmBytes(p.module));return {format:p.format,version:1,name:p.name,capabilities:[...p.capabilities],module:p.module};
}
export function checkWasmInput(input:WasmInput):WasmInput{
 if(!Number.isInteger(input.count)||input.count<1||input.count>32||!Number.isFinite(input.spacing)||input.spacing<.1||input.spacing>100)throw Error('Invalid Wasm tool parameters');return {count:input.count,spacing:input.spacing};
}
export async function executeWasmTool(tool:WasmTool,input:WasmInput):Promise<WasmCommand[]>{
 const safe=readWasmTool(JSON.stringify(tool)),params=checkWasmInput(input),bytes=wasmBytes(safe.module);
 const module=await WebAssembly.compile(bytes);
 const allowed=new Set(['count','spacing',...safe.capabilities.map(c=>c.replace('-','_'))]);
 for(const i of WebAssembly.Module.imports(module))if(i.module!=='studio'||i.kind!=='function'||!allowed.has(i.name))throw Error('Wasm import is not declared or allowed');
 const exports=WebAssembly.Module.exports(module);if(exports.length!==1||exports[0].name!=='run'||exports[0].kind!=='function')throw Error('Wasm must export only run');
 const commands:WasmCommand[]=[];
 function add(kind:'box'|'sphere',x:number,y:number,z:number,sx:number,sy:number,sz:number){
 if(!safe.capabilities.includes(kind==='box'?'add-box':'add-sphere'))throw Error('Missing add capability');
 if(commands.length>=64||![x,y,z].every(n=>Number.isFinite(n)&&Math.abs(n)<=10000)||![sx,sy,sz].every(n=>Number.isFinite(n)&&n>=.01&&n<=100))throw Error('Wasm command budget or coordinate limit exceeded');
 commands.push({op:'add',kind,patch:{name:'Extension '+kind+' '+(commands.length+1),position:[x,y,z],scale:[sx,sy,sz],role:'decoration',color:'#6688bb'}});
 }
 const instance=await WebAssembly.instantiate(module,{studio:{count:()=>params.count,spacing:()=>params.spacing,add_box:(...v:[number,number,number,number,number,number])=>add('box',...v),add_sphere:(...v:[number,number,number,number,number,number])=>add('sphere',...v)}});
 (instance.exports.run as ()=>void)();if(!commands.length)throw Error('Extension returned no commands');return commands;
}
