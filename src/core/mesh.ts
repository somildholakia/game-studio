import type {Vec3} from './project';
export type MeshData={vertices:Vec3[];triangles:[number,number,number][]};
export const MAX_VERTICES=2048,MAX_TRIANGLES=4096;
export function cubeMesh():MeshData{return {vertices:[[-.75,-.75,-.75],[.75,-.75,-.75],[.75,.75,-.75],[-.75,.75,-.75],[-.75,-.75,.75],[.75,-.75,.75],[.75,.75,.75],[-.75,.75,.75]],triangles:[[0,1,2],[0,2,3],[5,4,7],[5,7,6],[4,0,3],[4,3,7],[1,5,6],[1,6,2],[3,2,6],[3,6,7],[4,5,1],[4,1,0]]};}
export function readMesh(raw:unknown):MeshData{
 const m=raw as MeshData;if(!m||!Array.isArray(m.vertices)||m.vertices.length<3||m.vertices.length>MAX_VERTICES||!Array.isArray(m.triangles)||!m.triangles.length||m.triangles.length>MAX_TRIANGLES)throw Error('Invalid mesh size');
 const vertices=m.vertices.map(v=>{if(!Array.isArray(v)||v.length!==3||!v.every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1000))throw Error('Invalid vertex');return [...v] as Vec3;});
 const triangles=m.triangles.map(t=>{if(!Array.isArray(t)||t.length!==3||new Set(t).size!==3||!t.every(n=>Number.isInteger(n)&&n>=0&&n<vertices.length))throw Error('Invalid triangle indices');return [...t] as [number,number,number];});
 return {vertices,triangles};
}
export function deleteVertex(m:MeshData,index:number):MeshData{
 if(!Number.isInteger(index)||index<0||index>=m.vertices.length)throw Error('Invalid vertex index');
 return readMesh({vertices:m.vertices.filter((_,i)=>i!==index),triangles:m.triangles.filter(t=>!t.includes(index)).map(t=>t.map(i=>i>index?i-1:i))});
}
export function subdivideFace(m:MeshData,index:number):MeshData{
 const t=m.triangles[index];if(!t)throw Error('Choose a triangle');
 const [a,b,c]=t.map(i=>m.vertices[i]);const center=a.map((v,i)=>(v+b[i]+c[i])/3);
 const n=m.vertices.length;
 return readMesh({vertices:[...m.vertices,center],triangles:[...m.triangles.slice(0,index),[t[0],t[1],n],[t[1],t[2],n],[t[2],t[0],n],...m.triangles.slice(index+1)]});
}

/** Split every triangle into four, sharing each edge midpoint with neighboring faces.
 * This refines topology without changing the surface shape or face winding. */
export function subdivideMesh(raw:MeshData):MeshData{
 const mesh=readMesh(raw);
 if(mesh.triangles.length*4>MAX_TRIANGLES)throw Error('Subdivision exceeds triangle limit');
 const vertices=[...mesh.vertices],triangles:MeshData['triangles']=[];
 const edges=new Map<string,number>();
 const midpoint=(a:number,b:number):number=>{
  const key=a<b?a+':'+b:b+':'+a;
  const existing=edges.get(key);if(existing!==undefined)return existing;
  if(vertices.length>=MAX_VERTICES)throw Error('Subdivision exceeds vertex limit');
  const u=vertices[a],v=vertices[b],index=vertices.length;
  vertices.push([(u[0]+v[0])/2,(u[1]+v[1])/2,(u[2]+v[2])/2]);
  edges.set(key,index);return index;
 };
 for(const [a,b,c] of mesh.triangles){
  const ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);
  triangles.push([a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]);
 }
 return readMesh({vertices,triangles});
}
