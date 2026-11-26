// Portable, bounded, embedded GLB assets. This is a conservative subset, not a full glTF validator.
export const MAX_GLB_BYTES=2*1024*1024;
export const MAX_ASSET_BYTES=3*1024*1024;
export type ModelAsset={id:string;name:string;format:'glb';data:string};
function fail():never {throw Error('Unsupported or malformed GLB: use a self-contained, uncompressed glTF 2.0 binary without extensions.');}
// Bound declared decoded geometry as well as the compressed/envelope byte size.
const MAX_ACCESSOR_ELEMENTS=250_000;
const MAX_DECODED_ACCESSOR_BYTES=16*1024*1024;
function uint(value:unknown):value is number{return typeof value==='number'&&Number.isSafeInteger(value)&&value>=0;}
function validateBinaryDeclarations(json:any,binLength:number):void{
 const buffers=json.buffers??[],views=json.bufferViews??[],accessors=json.accessors??[];
 if(!Array.isArray(buffers)||buffers.length>1||!Array.isArray(views)||views.length>4096||!Array.isArray(accessors)||accessors.length>4096)fail();
 if(buffers.length){
  const size=buffers[0]?.byteLength;
  if(!uint(size)||size===0||size>binLength||binLength-size>3)fail();
 }else if(binLength||views.length)fail();
 for(const view of views){
  const start=view?.byteOffset??0,length=view?.byteLength;
  if(view?.buffer!==0||!uint(start)||!uint(length)||length===0||start>buffers[0].byteLength||length>buffers[0].byteLength-start)fail();
  if(view.byteStride!==undefined&&(!uint(view.byteStride)||view.byteStride<4||view.byteStride>252||view.byteStride%4!==0))fail();
 }
 const components:Record<string,number>={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16};
 const sizes:Record<string,number>={5120:1,5121:1,5122:2,5123:2,5125:4,5126:4};
 let total=0;
 for(const accessor of accessors){
  const count=accessor?.count,type=accessor?.type,component=accessor?.componentType;
  if(typeof type!=='string'||!Object.hasOwn(components,type)||!uint(component)||!Object.hasOwn(sizes,component)||!uint(count)||count===0||count>MAX_ACCESSOR_ELEMENTS)fail();
  // Conservatively budget padded matrices and float conversion by the renderer.
  const decoded=count*components[type]*4;total+=decoded;if(total>MAX_DECODED_ACCESSOR_BYTES)fail();
  const componentBytes=sizes[component];
  const dimension=type.startsWith('MAT')?Number(type.slice(3)):0;
  const width=dimension?Math.ceil(dimension*componentBytes/4)*4*dimension:components[type]*componentBytes;
  const range=(index:unknown,offset:unknown,items:number,itemWidth:number,alignment:number,interleaved:boolean)=>{
   if(!uint(index)||index>=views.length||!uint(offset)||offset%alignment!==0)fail();
   const view=views[index],stride=interleaved?(view.byteStride??itemWidth):itemWidth;
   if((!interleaved&&view.byteStride!==undefined)||stride<itemWidth||stride%alignment!==0||
      ((view.byteOffset??0)+offset)%alignment!==0||offset>view.byteLength||
      (items-1)*stride+itemWidth>view.byteLength-offset)fail();
  };
  if(accessor.bufferView!==undefined)range(accessor.bufferView,accessor.byteOffset??0,count,width,componentBytes,true);
  else if(accessor.byteOffset!==undefined&&accessor.byteOffset!==0)fail();
  if(accessor.sparse!==undefined){
   const sparse=accessor.sparse;
   if(!sparse||!uint(sparse.count)||sparse.count===0||sparse.count>count||!sparse.indices||!sparse.values||![5121,5123,5125].includes(sparse.indices.componentType))fail();
   const indexBytes=sizes[sparse.indices.componentType];
   range(sparse.indices.bufferView,sparse.indices.byteOffset??0,sparse.count,indexBytes,indexBytes,false);
   range(sparse.values.bufferView,sparse.values.byteOffset??0,sparse.count,width,componentBytes,false);
  }
 }
}
// glTF nodes must form disjoint, strict trees. Bound renderer traversal and repeated mesh instances.
function validateSceneGraph(json:any):void{
 const nodes=json.nodes===undefined?[]:json.nodes,scenes=json.scenes===undefined?[]:json.scenes,meshes=json.meshes;
 if(!Array.isArray(nodes)||nodes.length>2048||!Array.isArray(scenes)||scenes.length>64||meshes.length>512)fail();
 const object=(value:unknown):boolean=>!!value&&typeof value==='object'&&!Array.isArray(value);
 const index=(value:unknown,length:number):value is number=>uint(value)&&value<length;
 const parent=new Int32Array(nodes.length).fill(-1),children:number[][]=[];
 let primitiveCount=0,instances=0;
 for(const mesh of meshes){
  if(!object(mesh)||!Array.isArray(mesh.primitives))fail();
  primitiveCount+=mesh.primitives.length;if(primitiveCount>4096)fail();
 }
 for(let i=0;i<nodes.length;i++){
  const node=nodes[i];if(!object(node))fail();
  if(node.mesh!==undefined){if(!index(node.mesh,meshes.length))fail();instances+=meshes[node.mesh].primitives.length;if(instances>4096)fail();}
  const list=node.children===undefined?[]:node.children;
  if(!Array.isArray(list)||list.length>nodes.length)fail();
  for(const child of list){
   if(!index(child,nodes.length)||parent[child]!==-1)fail();
   parent[child]=i;
  }
  children.push(list);
 }
 // Traverse all roots, including nodes outside the selected scene; a cycle has no root.
 const stack:{id:number;depth:number}[]=[];
 for(let i=0;i<nodes.length;i++)if(parent[i]===-1)stack.push({id:i,depth:1});
 let visited=0;
 while(stack.length){const {id,depth}=stack.pop()!;if(depth>64)fail();visited++;for(const child of children[id])stack.push({id:child,depth:depth+1});}
 if(visited!==nodes.length)fail();
 for(const scene of scenes){
  if(!object(scene))fail();
  const roots=scene.nodes===undefined?[]:scene.nodes;
  if(!Array.isArray(roots)||roots.length>nodes.length)fail();
  const seen=new Set<number>();
  for(const root of roots){if(!index(root,nodes.length)||parent[root]!==-1||seen.has(root))fail();seen.add(root);}
 }
 if(json.scene!==undefined&&!index(json.scene,scenes.length))fail();
}
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
 validateSceneGraph(json);
 validateBinaryDeclarations(json,offset<bytes.length?v.getUint32(offset,true):0);
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
