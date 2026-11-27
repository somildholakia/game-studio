import {cornerNormals} from './meshNormals';
import {readMesh} from './mesh';
import {projectUV} from './uv';
import {validateGlb} from './assets';
import type {Entity,Vec3} from './project';
const align=(n:number)=>(n+3)&~3;
function linear(hex:string){return [1,3,5].map(i=>{const c=parseInt(hex.slice(i,i+2),16)/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});}
/** Local-space custom geometry, flat or smooth normals, UVs and solid PBR factors. No external resources. */
export function meshToGlb(e:Entity):Uint8Array<ArrayBuffer>{
 if(e.kind!=='mesh'||!e.mesh)throw Error('Choose a custom mesh');
 const mesh=readMesh(e.mesh),uv=projectUV(mesh,e.uvProjection),shading=cornerNormals(mesh,e.smoothNormals);
 const positions:number[]=[],normals:number[]=[],texcoords:number[]=[];
 for(let i=0;i<mesh.triangles.length;i++){
 const face=mesh.triangles[i];const [a,b,c]=face.map(j=>{const v=mesh.vertices[j];return [v[0],v[1],-v[2]] as Vec3;});
 const u=b.map((n,k)=>n-a[k]),v=c.map((n,k)=>n-a[k]);const normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
 const length=Math.hypot(...normal);if(length<1e-9)continue;
 positions.push(...a,...b,...c);for(let j=0;j<3;j++){const n=shading[i*3+j];normals.push(n[0],n[1],-n[2]);texcoords.push(uv[i*3+j][0],1-uv[i*3+j][1]);}
 }
 if(!positions.length)throw Error('Mesh has no nondegenerate triangles');
 const arrays=[positions,normals,texcoords].map(v=>Float32Array.from(v));
 const length=arrays.reduce((n,a)=>n+a.byteLength,0);
 const bin=new Uint8Array(length),view=new DataView(bin.buffer);
 const bufferViews=arrays.map((a,i)=>{const byteOffset=arrays.slice(0,i).reduce((n,b)=>n+b.byteLength,0);for(let j=0;j<a.length;j++)view.setFloat32(byteOffset+j*4,a[j],true);return {buffer:0,byteOffset,byteLength:a.byteLength,target:34962};});
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
 arrays[0].forEach((v,i)=>{const k=i%3;min[k]=Math.min(min[k],v);max[k]=Math.max(max[k],v);});
 const count=positions.length/3;
 const document={asset:{version:'2.0',generator:'Game Studio'},scene:0,scenes:[{nodes:[0]}],nodes:[{name:e.name,mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0,NORMAL:1,TEXCOORD_0:2},material:0,mode:4}]}],materials:[{pbrMetallicRoughness:{baseColorFactor:[...linear(e.color),1],metallicFactor:e.material?.metallic??0,roughnessFactor:e.material?.roughness??.65},emissiveFactor:linear(e.material?.emissive??'#000000')}],buffers:[{byteLength:length}],bufferViews,accessors:[{bufferView:0,componentType:5126,count,type:'VEC3',min,max},{bufferView:1,componentType:5126,count,type:'VEC3'},{bufferView:2,componentType:5126,count,type:'VEC2'}]};
 const json=new TextEncoder().encode(JSON.stringify(document)),jsonLength=align(json.length),total=12+8+jsonLength+8+align(length);
 const bytes=new Uint8Array(total),header=new DataView(bytes.buffer);
 header.setUint32(0,0x46546c67,true);header.setUint32(4,2,true);header.setUint32(8,total,true);header.setUint32(12,jsonLength,true);header.setUint32(16,0x4e4f534a,true);
 bytes.fill(32,20,20+jsonLength);bytes.set(json,20);const offset=20+jsonLength;
 header.setUint32(offset,align(length),true);header.setUint32(offset+4,0x004e4942,true);bytes.set(bin,offset+8);validateGlb(bytes);return bytes;
}
