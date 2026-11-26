// Portable, bounded, embedded GLB assets. This is a conservative subset, not a full glTF validator.
export const MAX_GLB_BYTES=2*1024*1024;
export const MAX_ASSET_BYTES=3*1024*1024;
export type ModelAsset={id:string;name:string;format:'glb';data:string};
function fail():never {throw Error('Unsupported or malformed GLB: use a self-contained, uncompressed glTF 2.0 binary without extensions.');}
export function validateGlb(bytes:Uint8Array):void {
 if(bytes.length<20||bytes.length>MAX_GLB_BYTES)fail();
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2||v.getUint32(8,true)!==bytes.length)fail();
 const n=v.getUint32(12,true);
 if(n%4!==0||n>bytes.length-20||v.getUint32(16,true)!==0x4e4f534a)fail();
 let json:any;try{json=JSON.parse(new TextDecoder().decode(bytes.subarray(20,20+n)));}catch{fail();}
 if(json?.asset?.version!=='2.0'||json.extensionsUsed?.length||json.extensionsRequired?.length||json.extensions||!Array.isArray(json.meshes)||!json.meshes.length)fail();
 // Reject externally fetched resources and nested extension payloads.
 const queue:unknown[]=[json];let visited=0;
 while(queue.length){const node=queue.pop();if(!node||typeof node!=='object')continue;if(++visited>100000)fail();
 for(const [k,value] of Object.entries(node)){if(k==='uri'||k==='extensions')fail();if(value&&typeof value==='object')queue.push(value);}}
 const offset=20+n;
 if(offset<bytes.length&&(bytes.length-offset<8||v.getUint32(offset+4,true)!==0x004e4942||v.getUint32(offset,true)%4!==0||offset+8+v.getUint32(offset,true)!==bytes.length))fail();
}
export function decodeAsset(data:string):Uint8Array<ArrayBuffer>{
 if(data.length>Math.ceil(MAX_GLB_BYTES/3)*4)fail();
 let raw:string;try{raw=atob(data);}catch{fail();}
 const bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return bytes;
}
export function validateAssets(input:unknown):ModelAsset[]{
 if(input===undefined)return [];
 if(!Array.isArray(input)||input.length>100)throw Error('Invalid model library');
 let total=0;const ids=new Set<string>();
 return input.map((a:any)=>{if(!a||typeof a.id!=='string'||!/^sha256:[a-f0-9]{64}$/.test(a.id)||ids.has(a.id)||typeof a.name!=='string'||a.name.length>200||a.format!=='glb'||typeof a.data!=='string')throw Error('Invalid model asset');
 const bytes=decodeAsset(a.data);total+=bytes.length;if(total>MAX_ASSET_BYTES)throw Error('Embedded model library exceeds 3 MiB');validateGlb(bytes);ids.add(a.id);return {id:a.id,name:a.name,format:'glb',data:a.data};});
}
export async function importGlb(file:File):Promise<ModelAsset>{
 if(!/\.glb$/i.test(file.name)||file.size>MAX_GLB_BYTES)throw Error('Choose a GLB file no larger than 2 MiB.');
 const buffer=await file.arrayBuffer();const bytes=new Uint8Array(buffer);validateGlb(bytes);
 const digest=await crypto.subtle.digest('SHA-256',buffer);
 const id='sha256:'+Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
 let raw='';for(let i=0;i<bytes.length;i+=8192)raw+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return {id,name:file.name.slice(0,200),format:'glb',data:btoa(raw)};
}
