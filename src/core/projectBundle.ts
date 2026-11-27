import {parseProject,type Project} from './project';
const MAX=10_000_000,MAX_COMPRESSED=8_000_000,HEADER=48;
const magic=[71,83,84,85,68,73,79,1]; // GSTUDIO + version
async function readBounded(stream:ReadableStream<Uint8Array>,limit:number):Promise<Uint8Array<ArrayBuffer>>{
 const reader=stream.getReader(),parts:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;if(value){size+=value.byteLength;if(size>limit)throw Error('Project bundle exceeds decoded size limit');parts.push(value);}}}catch(e){await reader.cancel().catch(()=>{});throw e;}finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}return bytes;
}
export async function encodeProjectBundle(project:Project):Promise<Uint8Array<ArrayBuffer>>{
 const normalized=parseProject(JSON.stringify(project)),plain=new TextEncoder().encode(JSON.stringify(normalized));if(plain.byteLength>MAX)throw Error('Project exceeds 10 MB');
 const compressed=await readBounded(new Blob([plain]).stream().pipeThrough(new CompressionStream('gzip')),MAX_COMPRESSED);
 const result=new Uint8Array(HEADER+compressed.length),view=new DataView(result.buffer);result.set(magic);view.setUint32(8,plain.length,true);view.setUint32(12,compressed.length,true);
 result.set(new Uint8Array(await crypto.subtle.digest('SHA-256',plain)),16);result.set(compressed,HEADER);return result;
}
export async function decodeProjectBundle(bytes:Uint8Array<ArrayBuffer>):Promise<Project>{
 if(bytes.byteLength<HEADER||bytes.byteLength>MAX_COMPRESSED+HEADER||!magic.every((v,i)=>bytes[i]===v))throw Error('Invalid compressed project header');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),size=view.getUint32(8,true),compressed=view.getUint32(12,true);
 if(!size||size>MAX||compressed!==bytes.byteLength-HEADER)throw Error('Invalid compressed project size');
 const plain=await readBounded(new Blob([bytes.subarray(HEADER)]).stream().pipeThrough(new DecompressionStream('gzip')),size);
 if(plain.length!==size)throw Error('Compressed project length mismatch');
 const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',plain));if(!digest.every((v,i)=>v===bytes[16+i]))throw Error('Compressed project checksum mismatch');
 return parseProject(new TextDecoder('utf-8',{fatal:true}).decode(plain));
}
